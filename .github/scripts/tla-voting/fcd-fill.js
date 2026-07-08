// =============================================================================
// fcd-fill.js — complete the tla-voting backfill from FCD archive harvests
// Lives in: tla-core/.github/scripts/tla-voting/   (next to tla-voting-seed.js)
// =============================================================================
//
// FCD (phoenix-fcd.terra.dev) is a frozen archive: chain genesis → ~2025-01-07
// (height ~13,736,494). The fcd-harvest Action captured the three governance
// contracts into archive/fcd/{tla-gauge,tla-escrow,tla-incentive}/part-*.json.
// This derive step:
//   1. reads those parts (skipping failed txs, code !== 0 — FCD includes
//      failures; LCD tx_search never returned them),
//   2. adapts trimmed txs to the classifier's input shape,
//   3. runs the SAME classifier as seed + Render cron — literally: it
//      require()s tla-voting-seed.js and uses its exports. No third copy.
//   4. merges into tla-voting/events/ under the same laws: dedup by
//      (hash|type|wallet|msg_index), never-shrink, horizons only move DOWN.
//
// What this achieves per stream:
//   votes/locks — extends below the legacy horizon (11.77M / 11.56M) to the
//     contracts' TRUE genesis, and the FCD↔legacy overlap (Aug 2024→Jan 2025)
//     is a free integrity cross-check (identical events dedup silently;
//     disagreement shows up as unexpected count growth in the overlap, logged).
//   bribes/rewards — fills contract genesis → 2025-01-07. A NEW honest gap is
//     recorded: FCD freeze → org capture start (~21.58M, Jun 2026), which
//     remains archive-node-only. Votes/locks have no such gap (legacy covers
//     the middle).
//
// What it does NOT touch: cursor.json and per-stream lastScannedHeight (the
// live Render frontier), and the Jun 15–22 2026 gap (post-freeze).
//
// Heartbeat: publishes runMode 'archive-fill' — the Render cron overwrites it
// within 6h; the fill run is visible in the changelog history either way.
//
// Env: GITHUB_TOKEN, GITHUB_REPO (thealliancedao/tla-core), GITHUB_BRANCH.
// Refuses to run unless every present harvest label has state.complete=true
// (partial archives would poison horizons); labels with no state are skipped
// with a warning so gauge/escrow/incentive can be filled in separate passes.
// =============================================================================

'use strict';

const https = require('https');
const seed = require('./tla-voting-seed.js'); // classifier + merge + rollups (byte-identical source of truth)

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const OUT_DIR       = 'tla-voting/events';
const SCHEMA_VERSION = 3;

const LABELS = { gauge: 'tla-gauge', escrow: 'tla-escrow', incentive: 'tla-incentive' };
const FCD_FREEZE_NOTE = 'FCD index freeze (~2025-01-07, height ~13,736,494) → org capture start; events in this window unknowable without an archive node';

const AGENT = new https.Agent({ keepAlive: true, maxSockets: 4 });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function httpGet(url, t = 60000) {
    return new Promise((res, rej) => {
        const r = https.get(url, { agent: AGENT, headers: { Accept: 'application/json', 'User-Agent': 'tla-voting-fcd-fill/1.0' } }, (x) => {
            let b = ''; x.on('data', c => b += c); x.on('end', () => {
                if (x.statusCode >= 200 && x.statusCode < 300) { try { res(JSON.parse(b)); } catch { rej(new Error('bad JSON')); } }
                else rej(new Error(`HTTP ${x.statusCode}`)); });
        });
        r.on('error', rej); r.setTimeout(t, () => r.destroy(new Error('timeout')));
    });
}
async function tryGetJson(url) { try { return await httpGet(url); } catch { return null; } }
const RAWROOT = (p) => `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${p}?t=${Date.now()}`;

function gh(method, apiPath, body) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'api.github.com', path: apiPath, method, headers: { 'User-Agent': 'tla-voting-fcd-fill', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } };
        if (body) opts.headers['Content-Type'] = 'application/json';
        const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(d)); } catch { resolve(d); } } else reject(new Error(`GitHub ${method}: ${res.statusCode} ${d.slice(0, 200)}`)); }); });
        req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
    });
}
async function publishFile(filePath, contentObj, message) {
    const content = JSON.stringify(contentObj, null, 2);
    if (content.length > 45 * 1024 * 1024) throw new Error(`${filePath} would be ${(content.length / 1048576).toFixed(0)}MB — refusing; split strategy needed`);
    const apiPath = `/repos/${GITHUB_REPO}/contents/${filePath}`;
    let sha = null;
    try { sha = (await gh('GET', apiPath + `?ref=${GITHUB_BRANCH}`)).sha; } catch { /* new */ }
    const body = { message, content: Buffer.from(content).toString('base64'), branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;
    return gh('PUT', apiPath, body);
}

// ----------------------------------------------------------------------------- adapt trimmed FCD txs → classifier input shape
// Classifier expects: { height, timestamp, txhash, events: [{type, attributes}],
// tx: { body: { messages: [{ msg, sender, contract, funds }] } } }.
// Trimmed harvest shape carries exactly those fields, rearranged.
function adaptTx(t) {
    return {
        height: t.height, timestamp: t.timestamp, txhash: t.txhash,
        events: t.events || [],
        tx: { body: { messages: t.messages || [] } },
    };
}

async function loadHarvest(label) {
    const state = await tryGetJson(RAWROOT(`archive/fcd/${label}/state.json`));
    if (!state) { console.warn(`   ⚠ ${label}: no harvest found — skipping this stream's fill`); return null; }
    if (!state.complete) throw new Error(`${label}: harvest incomplete (${state.stop_reason}) — refusing partial fill; finish the harvest first`);
    const txs = [];
    let failed = 0;
    for (let i = 1; i <= state.parts_done; i++) {
        const name = `part-${String(i).padStart(5, '0')}.json`;
        const part = await tryGetJson(RAWROOT(`archive/fcd/${label}/${name}`));
        if (!part) throw new Error(`${label}: ${name} unreadable — aborting (fill must be all-or-nothing per stream)`);
        for (const t of part.txs) { if (t.code) { failed++; continue; } txs.push(adaptTx(t)); }
        await sleep(60);
    }
    txs.sort((a, b) => a.height - b.height || String(a.txhash).localeCompare(String(b.txhash)));
    console.log(`   ${label}: ${txs.length} successful txs loaded (${failed} failed txs skipped), heights ${txs[0]?.height}–${txs[txs.length - 1]?.height}`);
    return { txs, fcdCeiling: txs.length ? txs[txs.length - 1].height : null, fcdFloor: txs.length ? txs[0].height : null };
}

// ----------------------------------------------------------------------------- main
async function run() {
    const startedAt = new Date();
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN missing.');
    console.log(`\n🏺 tla-voting fcd-fill — ${startedAt.toISOString()}\n`);

    // committed streams (never-shrink baselines + prior gaps/horizons)
    const [pv, pl, pb, pr, epochDates] = await Promise.all([
        tryGetJson(RAWROOT(`${OUT_DIR}/vote-events.json`)),
        tryGetJson(RAWROOT(`${OUT_DIR}/lock-events.json`)),
        tryGetJson(RAWROOT(`${OUT_DIR}/bribe-events.json`)),
        tryGetJson(RAWROOT(`${OUT_DIR}/reward-events.json`)),
        tryGetJson(RAWROOT('docs/epoch_1-300_date.json')),
    ]);
    if (!pv || !pl || !pb || !pr) throw new Error('committed tla-voting streams unreachable — fill requires the live baseline');
    const epochOf = seed.makeEpochResolver(epochDates);

    // harvests
    console.log('loading harvests…');
    const [hg, he, hi] = [await loadHarvest(LABELS.gauge), await loadHarvest(LABELS.escrow), await loadHarvest(LABELS.incentive)];
    if (!hg && !he && !hi) throw new Error('no completed harvests found — nothing to fill');

    // classify through the seed's exports (byte-identical classifier)
    const discovered = {};
    const g = hg ? seed.classifyGaugeTxs(hg.txs, discovered) : { voteEvents: [], rewardEvents: [] };
    const e = he ? seed.classifyEscrowTxs(he.txs, discovered) : { lockEvents: [], rewardEvents: [] };
    const i = hi ? seed.classifyIncentiveTxs(hi.txs, discovered) : { bribeEvents: [], rewardEvents: [] };
    console.log(`   classified: votes ${g.voteEvents.length}, locks ${e.lockEvents.length}, bribes ${i.bribeEvents.length}, rewards ${g.rewardEvents.length + e.rewardEvents.length + i.rewardEvents.length}`);

    // overlap integrity check (FCD vs legacy, votes/locks): count FCD-era additions ABOVE the legacy horizon
    const overlapAudit = (label, prior, fresh, legacyHorizon) => {
        const priorKeys = new Set(prior.map(seed.eventKey));
        const newInOverlap = fresh.filter(ev => ev.height >= legacyHorizon && !priorKeys.has(seed.eventKey(ev))).length;
        if (newInOverlap > 0) console.warn(`   🔎 ${label}: ${newInOverlap} FCD events in the legacy-covered range were NOT in the committed stream — sources disagree; review before trusting counts`);
        else console.log(`   ✅ ${label}: FCD↔legacy overlap fully consistent`);
        return newInOverlap;
    };
    const votesOverlapNew = hg ? overlapAudit('votes', pv.events, g.voteEvents, pv.horizonHeight ?? Infinity) : 0;
    const locksOverlapNew = he ? overlapAudit('locks', pl.events, e.lockEvents, pl.horizonHeight ?? Infinity) : 0;

    // merge (append-only, dedup) — never-shrink is structural here
    const vm = seed.mergeEvents(pv.events, g.voteEvents);
    const lm = seed.mergeEvents(pl.events, e.lockEvents);
    const bm = seed.mergeEvents(pb.events, i.bribeEvents);
    const rm = seed.mergeEvents(pr.events, [...g.rewardEvents, ...e.rewardEvents, ...i.rewardEvents]);
    console.log(`   merged: votes ${pv.events.length}→${vm.merged.length} | locks ${pl.events.length}→${lm.merged.length} | bribes ${pb.events.length}→${bm.merged.length} | rewards ${pr.events.length}→${rm.merged.length}`);
    if (vm.merged.length < pv.events.length || lm.merged.length < pl.events.length || bm.merged.length < pb.events.length || rm.merged.length < pr.events.length) {
        throw new Error('shrink detected post-merge — aborting (should be structurally impossible)');
    }

    // horizons move down to true genesis; freeze-gap honesty for streams whose
    // prior horizon sits ABOVE the FCD ceiling (bribes/rewards)
    const minh = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));
    const freezeGap = (priorHorizon, h) => {
        if (!h || priorHorizon == null || h.fcdCeiling == null) return null;
        if (priorHorizon > h.fcdCeiling + 1) return { from_height: h.fcdCeiling + 1, to_height: priorHorizon - 1, detected_at: startedAt.toISOString(), reason: FCD_FREEZE_NOTE };
        return null;
    };
    const addGap = (gaps, g2) => { const all = [...(gaps || [])]; if (g2 && !all.find(x => x.from_height === g2.from_height && x.to_height === g2.to_height)) all.push(g2); return all.sort((a, b) => a.from_height - b.from_height); };

    const streams = {
        'vote-events.json':   { prior: pv, merged: vm.merged, horizon: minh(pv.horizonHeight, hg?.fcdFloor), gaps: addGap(pv.known_gaps, freezeGap(pv.horizonHeight, hg)) },
        'lock-events.json':   { prior: pl, merged: lm.merged, horizon: minh(pl.horizonHeight, he?.fcdFloor), gaps: addGap(pl.known_gaps, freezeGap(pl.horizonHeight, he)) },
        'bribe-events.json':  { prior: pb, merged: bm.merged, horizon: minh(pb.horizonHeight, hi?.fcdFloor), gaps: addGap(pb.known_gaps, freezeGap(pb.horizonHeight, hi)) },
        'reward-events.json': { prior: pr, merged: rm.merged, horizon: minh(pr.horizonHeight, minh(hg?.fcdFloor, minh(he?.fcdFloor, hi?.fcdFloor))), gaps: addGap(pr.known_gaps, freezeGap(pr.horizonHeight, hg || he || hi)) },
    };

    for (const [file, s] of Object.entries(streams)) {
        const out = { ...s.prior, schemaVersion: SCHEMA_VERSION, builtAt: startedAt.toISOString(),
            horizonHeight: s.horizon, count: s.merged.length,
            known_gaps: s.gaps.length ? s.gaps : undefined,
            archive_fill: { source: 'fcd', filled_at: startedAt.toISOString(), fcd_ceiling_note: FCD_FREEZE_NOTE },
            events: s.merged };
        await publishFile(`${OUT_DIR}/${file}`, out, `tla-voting fcd-fill: ${file.replace('.json', '')} ${s.merged.length}`);
        console.log(`   💾 ${file}: ${s.merged.length} events, horizon ${s.horizon}, gaps ${s.gaps.length}`);
    }

    const rollups = seed.buildRollups(vm.merged, lm.merged, bm.merged, rm.merged, epochOf);
    await publishFile(`${OUT_DIR}/rollups.json`, rollups, `tla-voting fcd-fill rollups: ${rollups.wallet_count} wallets`);

    const hb = {
        schemaVersion: SCHEMA_VERSION, cron: 'tla-voting', product: 'events', version: 'fcd-fill-1.0.0',
        capturedAt: startedAt.toISOString(), runId: `tla-voting-fill-${startedAt.getTime().toString(36)}`,
        runMode: 'archive-fill', status: (votesOverlapNew + locksOverlapNew) > 0 ? 'ok-with-source-disagreement' : 'ok',
        counts: { votes: vm.merged.length, locks: lm.merged.length, bribes: bm.merged.length, rewards: rm.merged.length, wallets: rollups.wallet_count,
                  added: { votes: vm.added, locks: lm.added, bribes: bm.added, rewards: rm.added } },
        horizons: Object.fromEntries(Object.entries(streams).map(([f, s]) => [f.replace('-events.json', 's'), s.horizon])),
        overlap_disagreements: { votes: votesOverlapNew, locks: locksOverlapNew },
        discovered_actions: discovered,
        error_count: 0, recent_errors: [],
        note: 'one-time FCD archive fill; Render cron resumes normal heartbeats next cycle',
    };
    await publishFile(`${OUT_DIR}/heartbeat.json`, hb, `tla-voting fcd-fill heartbeat`);

    console.log(`\n✅ fill complete — votes ${vm.merged.length} (+${vm.added}), locks ${lm.merged.length} (+${lm.added}), bribes ${bm.merged.length} (+${bm.added}), rewards ${rm.merged.length} (+${rm.added})`);
    if (Object.keys(discovered).length) console.log(`   discovered_actions: ${JSON.stringify(discovered)}`);
}

if (require.main === module) {
    run().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
}
module.exports = { adaptTx };

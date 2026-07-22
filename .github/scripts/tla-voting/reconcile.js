// =============================================================================
// .github/scripts/tla-voting/reconcile.js — events ≟ live chain state (one-shot)
// =============================================================================
// SPEC-tla-voting-reconcile.md (docs/pending-changes). Self-contained per the
// tla-core one-off convention: workflow in .github/workflows/, script here,
// reads committed event streams from the LOCAL CHECKOUT, queries the chain,
// publishes tla-voting/events/reconciliation.json with the workflow's token.
//
// Purpose: the events heartbeat carries 13 open vote gaps + 10 lock gaps
// (July 8–14). This measures whether events were actually LOST: replay the
// committed vote stream (last event per wallet+gauge = expected allocation)
// and compare against the gauge controller's live user_info.gauge_votes for
// every possible voter (= every lock owner). Locks get count/VP-sum checks
// only (all lock_create events carry token_id:null — identity replay is not
// possible until the classifier captures minted ids; honest limit, recorded).
//
// Transport/publish lifted from harvest-distributions.js (hard-deadline
// httpGet, dual-LCD retry, GET-sha→PUT publish). No silent coercions:
// null ≠ empty; failed wallets land in errors[] and flip status to partial;
// a failed ENUMERATION aborts (an incomplete universe invalidates the
// match-rate — do not publish a number built on a partial walk).
//
// Env: DRY_RUN=1 (report only, publish nothing) · EMIT_REPLAY=1 (print the
// deterministic replay JSON and exit — used to build mock fixtures) ·
// MOCK_FIXTURES=<path> (serve all chain reads from a fixtures file — the
// file-based mock gate; never set in the real workflow).
// =============================================================================
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const LCD_PRIMARY  = process.env.LCD_PRIMARY  || 'https://terra-lcd.publicnode.com';
const LCD_FALLBACK = process.env.LCD_FALLBACK || 'https://terra-rest.publicnode.com';
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const DRY_RUN       = process.env.DRY_RUN === '1';
const EMIT_REPLAY   = process.env.EMIT_REPLAY === '1';
const MOCK_FIXTURES = process.env.MOCK_FIXTURES || null;
const EVENTS_DIR    = process.env.EVENTS_DIR || 'tla-voting/events';

// Literals == platform-crons config/contracts.js (chain-verified 2026-07-13).
const GAUGE_CONTROLLER = 'terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj';
const VOTING_ESCROW    = 'terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg';
const INCENTIVE_MGR    = 'terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh';

const CONCURRENCY = 5;          // publicnode tolerance (house rule ≤5)
const FETCH_RETRIES = 3;
const PACE_MS = 120;
const ALL_TOKENS_PAGE = 50;
const DETAIL_CAP = 50;          // mismatch detail entries kept in the report
const VP_SUM_TOL_PCT = 0.5;     // Σ lock vp vs total_vamp tolerance (timing skew)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- transport: HARD deadline (harvest-distributions lift; flows 1.0.2 port)
function httpGetHard(url, deadlineMs = 40000) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { Accept: 'application/json', 'User-Agent': 'tla-voting-reconcile/1.0' } }, (res) => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                clearTimeout(killer);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(b)); } catch { reject(new Error('bad JSON')); }
                } else {
                    const err = new Error(`HTTP ${res.statusCode} ${b.slice(0, 200)}`);
                    err.statusCode = res.statusCode; err.body = b.slice(0, 300);
                    reject(err);
                }
            });
        });
        const killer = setTimeout(() => req.destroy(new Error(`deadline ${deadlineMs}ms`)), deadlineMs);
        req.on('error', (e) => { clearTimeout(killer); reject(e); });
    });
}

function smartPath(addr, queryObj) {
    const b64 = Buffer.from(JSON.stringify(queryObj)).toString('base64');
    return `/cosmwasm/wasm/v1/contract/${addr}/smart/${encodeURIComponent(b64)}`;
}

// Dual-LCD retry. Returns res.data on success, throws after retries.
// Contract-level refusal (4xx/5xx with a cosmwasm error body) throws with
// .contractError = true so callers can distinguish "asked, contract said no"
// from transient network failure.
async function queryContract(addr, queryObj) {
    let lastErr = null;
    for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
        const base = attempt % 2 === 0 ? LCD_PRIMARY : LCD_FALLBACK;
        try {
            const res = await httpGetHard(base + smartPath(addr, queryObj));
            return res && res.data !== undefined ? res.data : res;
        } catch (e) {
            lastErr = e;
            if (e.statusCode && e.body && /query wasm contract failed|not found|Generic error|ve3_shared/i.test(e.body)) {
                e.contractError = true;
                throw e;
            }
            await sleep(250 * (attempt + 1));
        }
    }
    throw lastErr || new Error('queryContract exhausted retries');
}

// ---- chain access layer — every read goes through here so MOCK_FIXTURES can
// serve the whole surface from a file (the binding mock-run rule).
let FIX = null;
if (MOCK_FIXTURES) {
    FIX = JSON.parse(fs.readFileSync(MOCK_FIXTURES, 'utf8'));
    console.log(`🧪 MOCK_FIXTURES active: ${MOCK_FIXTURES}`);
}
const chain = {
    async numTokens() {
        if (FIX) return FIX.num_tokens;
        const d = await queryContract(VOTING_ESCROW, { num_tokens: {} });
        return Number(d?.count);
    },
    async allTokens() {
        if (FIX) return FIX.tokens.slice();
        const out = [];
        let startAfter;
        for (;;) {
            const q = { all_tokens: { limit: ALL_TOKENS_PAGE, ...(startAfter ? { start_after: startAfter } : {}) } };
            const d = await queryContract(VOTING_ESCROW, q);      // throws on failure — never coerced to []
            const toks = d?.tokens;
            if (!Array.isArray(toks)) throw new Error('all_tokens: unexpected shape');
            if (toks.length === 0) break;                          // genuine end ≠ failure
            out.push(...toks);
            startAfter = toks[toks.length - 1];
            await sleep(PACE_MS);
        }
        return out;
    },
    async lockInfo(tokenId) {
        if (FIX) return FIX.lock_info[tokenId] ?? null;
        return queryContract(VOTING_ESCROW, { lock_info: { token_id: String(tokenId), time: 'current' } });
    },
    async totalVamp() {
        if (FIX) return FIX.total_vamp;
        return queryContract(VOTING_ESCROW, { total_vamp: {} });
    },
    async userInfo(wallet) {
        if (FIX) {
            if (FIX.user_info_fail && FIX.user_info_fail.includes(wallet)) throw new Error('mock: simulated query failure');
            return FIX.user_info[wallet] ?? null;
        }
        return queryContract(GAUGE_CONTROLLER, { user_info: { user: wallet, time: 'next' } });
    },
    async bribesProbe() {
        if (FIX) return FIX.bribes ?? null;
        try { return await queryContract(INCENTIVE_MGR, { bribes: {} }); }
        catch (e) { return { _unavailable: String(e.message).slice(0, 150) }; }
    },
};

// ---- POT_WITHOUT_PLACEMENT watchdog helpers (SPEC-capture-registry-backfill §6)
// Chain-shape-tolerant: the incentive manager's bribes response nests pots in
// buckets/pools whose exact wrapper has shifted before — we care only about
// which denoms hold live amounts, so scan recursively for coin-like objects.
function canonOfInfo(info) {
    if (!info || typeof info !== 'object') return null;
    if (typeof info.native === 'string') return `native:${info.native}`;
    if (typeof info.cw20 === 'string') return `cw20:${info.cw20}`;
    if (typeof info.token === 'string') return `cw20:${info.token}`;
    return null;
}
function scanActivePotDenoms(node, out) {
    if (Array.isArray(node)) { for (const v of node) scanActivePotDenoms(v, out); return out; }
    if (!node || typeof node !== 'object') return out;
    const amt = node.amount;
    if (amt != null && /^\d+$/.test(String(amt)) && BigInt(String(amt)) > 0n) {
        const den = canonOfInfo(node.info) || canonOfInfo(node)
            || (typeof node.denom === 'string'
                ? (node.denom.includes(':') ? node.denom : `native:${node.denom}`) : null);
        if (den) out.set(den, (out.get(den) || 0n) + BigInt(String(amt)));
    }
    for (const v of Object.values(node)) if (v && typeof v === 'object') scanActivePotDenoms(v, out);
    return out;
}
function buildPotWatchdog(bribesChain, bribeEvents) {
    if (!bribesChain || bribesChain._unavailable) {
        return { status: 'skipped — bribes probe unavailable', alerts: [] };
    }
    const active = scanActivePotDenoms(bribesChain, new Map());
    // assumed current epoch = the furthest epoch any captured placement STARTED
    // at; declared in the report so the assumption is auditable, never silent.
    // (First live run 2026-07-22 taught us max epoch_END overshoots: one
    // forward-spanning bribe to e200 made every single-epoch e195 pot look
    // stale. Placements start at-or-near the current epoch; spans reach ahead.)
    let assumedCur = null;
    const byDenom = new Map();   // denom -> { adds, max_span_end }
    for (const ev of bribeEvents) {
        if (ev.type !== 'bribe_add') continue;
        const start = ev.epoch_start ?? null;
        const end = ev.epoch_end ?? ev.epoch_start ?? null;
        if (start != null && (assumedCur == null || start > assumedCur)) assumedCur = start;
        for (const c of ev.coins || []) {
            if (!c?.denom) continue;
            const d = (byDenom.get(c.denom) || { adds: 0, max_span_end: null });
            d.adds++;
            if (end != null && (d.max_span_end == null || end > d.max_span_end)) d.max_span_end = end;
            byDenom.set(c.denom, d);
        }
    }
    const alerts = [];
    let okCount = 0;
    for (const [den, amt] of [...active.entries()].sort()) {
        const seen = byDenom.get(den);
        if (!seen) {
            alerts.push({ alert: 'POT_WITHOUT_PLACEMENT', class: 'never_captured', denom: den, active_amount: amt.toString(), note: 'live pot with ZERO placement events ever captured — walker/classifier bug candidate, inspect before assuming hole-era' });
        } else if (assumedCur != null && (seen.max_span_end == null || seen.max_span_end < assumedCur)) {
            alerts.push({ alert: 'POT_WITHOUT_PLACEMENT', class: 'no_current_placement_event', denom: den, active_amount: amt.toString(), last_captured_span_end: seen.max_span_end, note: 'live pot but no captured placement spans the present — the capture-hole signature; expected until the archive backfill lands, alarming after' });
        } else okCount++;
    }
    return {
        spec: 'SPEC-capture-registry-backfill §6',
        assumed_current_epoch: assumedCur,
        active_pot_denoms: active.size,
        covered: okCount,
        alerts: alerts.slice(0, DETAIL_CAP),
        semantics: 'every denom holding a live pot on chain must have ≥1 captured bribe_add whose span reaches the present; violations classify as never_captured (bug candidate) vs no_current_placement_event (hole signature). Informational v1 — does not flip the verdict.',
    };
}

// ---- bounded-concurrency map that PRESERVES failures (null ≠ empty)
async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let i = 0;
    async function worker() {
        for (;;) {
            const idx = i++;
            if (idx >= items.length) return;
            try { results[idx] = { ok: true, value: await fn(items[idx], idx) }; }
            catch (e) { results[idx] = { ok: false, error: String(e.message || e) }; }
            await sleep(PACE_MS);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

// ---- events: read from the LOCAL checkout (container shape verified
// 2026-07-14: {schemaVersion, …, events:[…]}, height-sorted ascending)
// ---- events: read from the LOCAL checkout. Post-restructure the streams live
// as monthly files ({stream}/YYYY/MM.json); the legacy consolidated
// {stream}-events.json is read if present (pre-restructure checkouts), else
// months are concatenated in-process, height-sorted — same order contract.
function readEvents(name) {
    const p = path.join(EVENTS_DIR, name);
    if (fs.existsSync(p)) {
        const d = JSON.parse(fs.readFileSync(p, 'utf8'));
        const events = Array.isArray(d) ? d : d.events;
        if (!Array.isArray(events)) throw new Error(`${name}: no events array`);
        return events;
    }
    const stream = name.replace('-events.json', 's');   // vote→votes, lock→locks, bribe→bribes
    const dir = path.join(EVENTS_DIR, stream);
    if (!fs.existsSync(dir)) throw new Error(`${name}: neither legacy file nor ${stream}/ monthly layout found under ${EVENTS_DIR}`);
    const events = [];
    for (const y of fs.readdirSync(dir).filter(d => /^\d{4}$/.test(d)).sort()) {
        for (const f of fs.readdirSync(path.join(dir, y)).filter(f => /^\d{2}\.json$/.test(f)).sort()) {
            const d = JSON.parse(fs.readFileSync(path.join(dir, y, f), 'utf8'));
            const evs = Array.isArray(d) ? d : d.events;
            if (!Array.isArray(evs)) throw new Error(`${stream}/${y}/${f}: no events array`);
            events.push(...evs);
        }
    }
    if (!events.length) throw new Error(`${name}: monthly layout ${stream}/ contained no events`);
    events.sort((a, b) => (a.height - b.height) || ((a.msg_index || 0) - (b.msg_index || 0)));
    console.log(`  ${name}: consolidated ${events.length} events from ${stream}/ monthly layout`);
    return events;
}

// ---- vote replay: last event per (wallet,gauge) = expected current allocation.
// Files are height-sorted; iterate in order with (height, msg_index) tie-break.
function replayVotes(voteEvents) {
    const last = new Map(); // `${wallet}|${gauge}` -> {votes, height, tx_hash}
    for (const e of voteEvents) {
        if (e.type !== 'vote') continue;
        const key = `${e.wallet}|${e.gauge}`;
        const prev = last.get(key);
        if (!prev || e.height > prev.height || (e.height === prev.height && (e.msg_index || 0) >= (prev.msg_index || 0))) {
            last.set(key, { votes: e.votes || [], height: e.height, tx_hash: e.tx_hash });
        }
    }
    return last;
}

// Normalize an allocation ([[poolKey,bps]…]) to a plain map, dropping bps<=0.
function normAlloc(votes) {
    const m = {};
    for (const v of (votes || [])) {
        const [k, bps] = v;
        const n = Number(bps) || 0;
        if (n > 0) m[k] = (m[k] || 0) + n;
    }
    return m;
}
function allocEqual(a, b) {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => a[k] === b[k]);
}
function allocDiff(expected, actual) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    const out = [];
    for (const k of keys) {
        const e = expected[k] || 0, a = actual[k] || 0;
        if (e !== a) out.push({ pool: k, events_bps: e, chain_bps: a });
    }
    return out;
}

async function main() {
    const startedAt = new Date();
    console.log(`\n🔎 tla-voting reconcile — ${startedAt.toISOString()}${DRY_RUN ? ' (DRY RUN)' : ''}${FIX ? ' (MOCK)' : ''}\n`);
    if (!GITHUB_TOKEN && !DRY_RUN && !FIX && !EMIT_REPLAY) throw new Error('GITHUB_TOKEN missing (set DRY_RUN=1 to report without publishing)');

    // ---------- deterministic half: read + replay committed streams ----------
    const voteEvents = readEvents('vote-events.json');
    const lockEvents = readEvents('lock-events.json');
    const bribeEvents = readEvents('bribe-events.json');
    const replay = replayVotes(voteEvents);
    const eventWallets = new Set([...replay.keys()].map(k => k.split('|')[0]));
    console.log(`events: votes=${voteEvents.length} (${eventWallets.size} wallets, ${replay.size} wallet×gauge slots) · locks=${lockEvents.length} · bribes=${bribeEvents.length}`);

    if (EMIT_REPLAY) {
        const dump = {};
        for (const [k, v] of replay) dump[k] = v.votes;
        const out = process.env.EMIT_REPLAY_OUT || 'replay-debug.json';
        fs.writeFileSync(out, JSON.stringify({ replay: dump }, null, 1));
        console.log(`replay written → ${out}`);
        return;
    }

    // Lock-event net-count arithmetic (informational — see spec §3.L caveat:
    // all lock_create token_ids are null, so this is a diagnostic number).
    const canon = lockEvents.filter(e => e.canonical === true);
    const cnt = t => canon.filter(e => e.type === t).length;
    const lockArith = {
        formula: 'creates + splits − withdraws − merges_burned (canonical only; migrates/permanents excluded — lifecycle-neutral)',
        creates: cnt('lock_create'), splits: cnt('split'), withdraws: cnt('withdraw'), merges: cnt('merge'),
        net: cnt('lock_create') + cnt('split') - cnt('withdraw') - cnt('merge'),
        caveat: 'lock_create events carry token_id:null (1306/1306) — identity replay impossible until the classifier captures minted ids; count-level only',
    };

    // ---------- chain half ----------
    const errors = [];

    console.log('chain: enumerating escrow locks…');
    const numTokens = await chain.numTokens();                       // abort on failure
    const tokenIds = await chain.allTokens();                        // abort on failure
    if (Number.isFinite(numTokens) && tokenIds.length !== numTokens) {
        // walk incomplete = universe invalid → abort (F2: do not publish a
        // match-rate built on a partial enumeration)
        throw new Error(`all_tokens walk (${tokenIds.length}) != num_tokens (${numTokens}) — enumeration incomplete, aborting`);
    }
    console.log(`  ${tokenIds.length} locks (num_tokens=${numTokens})`);

    const lockRes = await mapLimit(tokenIds, CONCURRENCY, id => chain.lockInfo(id));
    const owners = new Set();
    let vpSum = 0, lockFails = 0;
    lockRes.forEach((r, i) => {
        if (!r.ok || !r.value) { lockFails++; errors.push(`lock_info ${tokenIds[i]}: ${r.ok ? 'null' : r.error}`); return; }
        const li = r.value;
        if (li.owner) owners.add(li.owner);
        vpSum += (parseFloat(li.voting_power) || 0) + (parseFloat(li.fixed_amount) || 0);
    });
    const totalVamp = await chain.totalVamp();
    const tvVp = parseFloat(totalVamp?.vp) || 0;
    const vpDeltaPct = tvVp ? Math.abs(vpSum - tvVp) / tvVp * 100 : null;
    console.log(`  owners=${owners.size} · Σ(lock vp+fixed)=${(vpSum / 1e6).toFixed(2)} vs total_vamp.vp=${(tvVp / 1e6).toFixed(2)} (Δ ${vpDeltaPct?.toFixed(4)}%)`);

    // Voter universe = chain owners ∪ event wallets (spec §3.V)
    const universe = [...new Set([...owners, ...eventWallets])].sort();
    console.log(`chain: user_info for ${universe.length} wallets…`);
    const uiRes = await mapLimit(universe, CONCURRENCY, w => chain.userInfo(w));

    // ---------- compare ----------
    const counts = { MATCH: 0, MISMATCH: 0, CHAIN_ONLY: 0, EVENTS_ONLY: 0 };
    const details = { MISMATCH: [], CHAIN_ONLY: [], EVENTS_ONLY: [] };
    let uiFails = 0;
    const chainSlots = new Map(); // `${wallet}|${gauge}` -> normalized alloc

    universe.forEach((wallet, i) => {
        const r = uiRes[i];
        if (!r.ok) { uiFails++; errors.push(`user_info ${wallet}: ${r.error}`); return; }
        const gv = Array.isArray(r.value?.gauge_votes) ? r.value.gauge_votes : [];
        for (const g of gv) {
            const alloc = normAlloc(g.votes);
            if (Object.keys(alloc).length) chainSlots.set(`${wallet}|${g.gauge}`, alloc);
        }
    });
    const failedWallets = new Set(universe.filter((w, i) => !uiRes[i].ok));

    const allSlots = new Set([...chainSlots.keys(), ...replay.keys()]);
    for (const slot of allSlots) {
        const wallet = slot.split('|')[0];
        if (failedWallets.has(wallet)) continue;                    // unknown, not judged
        const chainAlloc = chainSlots.get(slot);
        const ev = replay.get(slot);
        const evAlloc = ev ? normAlloc(ev.votes) : null;
        const evEmpty = !evAlloc || Object.keys(evAlloc).length === 0;
        if (chainAlloc && !evEmpty) {
            if (allocEqual(chainAlloc, evAlloc)) counts.MATCH++;
            else {
                counts.MISMATCH++;
                if (details.MISMATCH.length < DETAIL_CAP) details.MISMATCH.push({ slot, last_event_height: ev.height, last_event_tx: ev.tx_hash, diff: allocDiff(evAlloc, chainAlloc) });
            }
        } else if (chainAlloc && evEmpty) {
            counts.CHAIN_ONLY++;
            if (details.CHAIN_ONLY.length < DETAIL_CAP) details.CHAIN_ONLY.push({ slot, chain_alloc: chainAlloc, note: ev ? 'events replay to empty' : 'no vote events for wallet+gauge' });
        } else if (!chainAlloc && !evEmpty) {
            counts.EVENTS_ONLY++;
            if (details.EVENTS_ONLY.length < DETAIL_CAP) details.EVENTS_ONLY.push({ slot, last_event_height: ev.height, events_alloc: evAlloc });
        }
    }
    const judged = counts.MATCH + counts.MISMATCH + counts.CHAIN_ONLY + counts.EVENTS_ONLY;
    const matchRate = judged ? +(counts.MATCH / judged * 100).toFixed(2) : null;

    // ---------- bribes baseline (optional, non-fatal) ----------
    const bribesChain = await chain.bribesProbe();
    const bribesBaseline = bribesChain && !bribesChain._unavailable
        ? { chain_shape_keys: Object.keys(bribesChain).slice(0, 8), chain_entries: Array.isArray(bribesChain) ? bribesChain.length : (Array.isArray(bribesChain?.bribes) ? bribesChain.bribes.length : null), event_count: bribeEvents.length, note: 'expected large mismatch = the ~97% tribute-blindness baseline (defect #2)' }
        : { unavailable: bribesChain?._unavailable || 'no data', event_count: bribeEvents.length };
    const potWatchdog = buildPotWatchdog(bribesChain, bribeEvents);

    // ---------- verdict + report ----------
    const lossSignal = counts.MISMATCH + counts.CHAIN_ONLY;
    const status = (uiFails || lockFails) ? 'partial' : 'ok';
    const verdict = lossSignal === 0
        ? 'CLEAN — replayed events match live chain state on every judged slot; the recorded gaps are conservative bookkeeping, no vote-event loss detected. Proceed: monthly restructure → rollup rebuilds.'
        : `LOSSES POSSIBLE — ${counts.MISMATCH} mismatched + ${counts.CHAIN_ONLY} chain-only slots. Inspect details; if confirmed, the walker/capture-registry fix rises above the rollup rebuilds (SPEC-tla-voting-reconcile §6).`;

    const report = {
        schemaVersion: 1,
        module: 'tla-voting', product: 'events', kind: 'reconciliation-report',
        spec: 'docs/pending-changes/SPEC-tla-voting-reconcile.md',
        generatedAt: new Date().toISOString(),
        status,
        votes: { universe_wallets: universe.length, wallets_unjudged_query_failed: uiFails, slots_judged: judged, counts, match_rate_pct: matchRate, details },
        locks: {
            chain_num_tokens: numTokens, lock_info_failures: lockFails, distinct_owners: owners.size,
            vp_sum_vs_total_vamp: { sum_vp_plus_fixed: vpSum, total_vamp_vp: tvVp, delta_pct: vpDeltaPct, tolerance_pct: VP_SUM_TOL_PCT, pass: vpDeltaPct !== null && vpDeltaPct <= VP_SUM_TOL_PCT },
            event_net_count: lockArith,
        },
        bribes_baseline: bribesBaseline,
        pot_watchdog: potWatchdog,
        errors: errors.slice(0, 100),
        verdict,
    };

    console.log('\n================ RECONCILIATION ================');
    console.log(`votes: judged=${judged} MATCH=${counts.MATCH} MISMATCH=${counts.MISMATCH} CHAIN_ONLY=${counts.CHAIN_ONLY} EVENTS_ONLY=${counts.EVENTS_ONLY} → match_rate=${matchRate}%`);
    console.log(`locks: Σvp Δ=${vpDeltaPct?.toFixed(4)}% (tol ${VP_SUM_TOL_PCT}%) · net-count(diag)=${lockArith.net} vs chain ${numTokens}`);
    console.log(`status: ${status} (${errors.length} query errors)`);
    console.log(`pot watchdog: ${potWatchdog.active_pot_denoms ?? 0} active denoms · ${potWatchdog.covered ?? 0} covered · ${potWatchdog.alerts?.length ?? 0} alert(s)`);
    console.log(`verdict: ${verdict}\n`);

    if (DRY_RUN || FIX) { console.log('(not published — DRY_RUN/MOCK)'); if (FIX) fs.writeFileSync('/tmp/reconciliation.mock.json', JSON.stringify(report, null, 2)); return; }
    await publishFile(`${EVENTS_DIR}/reconciliation.json`, report, `tla-voting: reconciliation ${matchRate}% match (${verdict.split(' — ')[0]})`);
    console.log(`published ${EVENTS_DIR}/reconciliation.json`);
}

// publish helper (harvest-distributions lift — kept local, zero coupling)
function githubApiRequest(method, apiPath, body) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'api.github.com', path: apiPath, method, headers: { 'User-Agent': 'tla-voting-reconcile', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } };
        if (body) opts.headers['Content-Type'] = 'application/json';
        const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(d)); } catch { resolve(d); } } else reject(new Error(`GitHub ${method}: ${res.statusCode} ${d.slice(0, 200)}`)); }); });
        req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
    });
}
async function publishFile(filePath, contentObj, message) {
    const content = JSON.stringify(contentObj, null, 2);
    const apiPath = `/repos/${GITHUB_REPO}/contents/${filePath}`;
    for (let attempt = 0; attempt < 3; attempt++) {
        let sha = null;
        try { sha = (await githubApiRequest('GET', apiPath + `?ref=${GITHUB_BRANCH}`)).sha; } catch { /* new file */ }
        const body = { message, content: Buffer.from(content).toString('base64'), branch: GITHUB_BRANCH };
        if (sha) body.sha = sha;
        try { return await githubApiRequest('PUT', apiPath, body); }
        catch (e) { if (/409/.test(String(e.message)) && attempt < 2) { await sleep(800 * (attempt + 1)); continue; } throw e; }
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(`\n❌ ${e.message}`); process.exit(2); });

#!/usr/bin/env node
// =============================================================================
// flows-fill — one-shot derive: merge the FCD-archive LP flow history under
// the live tla-flows event stream.
//
// Runs as a GitHub Action in tla-core (workflow: tla-flows-fill.yml, manual
// dispatch) with the repo checked out — reads archive/fcd/lp-* locally,
// classifies with a BYTE-IDENTICAL copy of the walker's <<FLOWS CLASSIFIER
// v1>> block (diff-verify: see README), and publishes monthly
// tla-flows/events/{YYYY}/{MM}.json via the same read-merge-dedupe-
// never-shrink rules the walker uses. Archive months (…→2025/01) cannot
// collide with walker months (2026/07→), and the index merge is
// read-modify-write with 409-retry, so running while the walker is live is
// safe. Re-runnable: a second run adds nothing (txhash dedupe).
//
// Chain-derived invariants (hard-fail): 32,615 classified flows =
// 15,727 deposits + 4,499 withdraws + 12,389 claims (verified against the
// full archive in the walker's mock suite, 2026-07-08).
//
// Local verification: `node flows-fill.js --dry-run /tmp/out` writes month
// files locally instead of publishing (run from repo root).
// =============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = process.cwd();
const LABELS = ['lp-compounder', 'lp-stable', 'lp-project', 'lp-bluechip', 'lp-single'];
// Host contract for the shared <<FLOWS CLASSIFIER v2>> block: WATCH maps the
// six flow contracts to labels (buckets as 'staking-<gauge>' — flowsGaugeOf
// derives the gauge from that prefix). Values mirror platform-crons
// config/contracts.js (chain-verified) and retained-gap-fill's copy.
const WATCH = {
  'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx': 'compounder',
  'terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq': 'staking-stable',
  'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa': 'staking-project',
  'terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv': 'staking-bluechip',
  'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k': 'staking-single',
  'terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl': 'zapper',
};
const OUT_DIR = 'tla-flows/events';
const GITHUB_REPO = process.env.GITHUB_REPO || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DRY = process.argv[2] === '--dry-run' ? (process.argv[3] || '/tmp/flows-fill-dry') : null;

// CLASSIFIER v2 expectations (2026-07-23): deposits/withdraws unchanged from
// v1; claims 12,389 → 11,522 because v2 correctly rejects the 867 tribute-
// contract take-rate cycles v1 misclassified as member claims (full-corpus
// gate: every drop verified tribute plumbing; those txs live in the voting
// stream as bribe events). v1 totals were 32,615 / claim 12,389.
const EXPECT = { total: 31748, deposit: 15727, withdraw: 4499, claim: 11522 };
const SANITY_CEILING = 14000000; // ~2025-01-25 — no archive event may exceed this

function fail(m) { console.error('INVARIANT FAIL: ' + m); process.exit(1); }
const assert = (c, m) => { if (!c) fail(m); };

// =============================================================================
// SHARED CLASSIFIER — this section must stay BYTE-IDENTICAL with the copies in
// tla-core/.github/scripts/tla-flows/ (flows-fill + retained-gap-fill derives).
// Any drift must show in a plain diff. Marker: <<FLOWS CLASSIFIER v2>>
// =============================================================================
// v2 (2026-07-23, SPEC-portfolio-pnl Phase B / SPEC-capture-registry-backfill):
// additive on the Rev A.3 v1 parser — every v1 field is emitted unchanged.
// New, all evidenced by the 55,199-tx FCD fixture census (attrs present on
// 100% of their action class — nothing inferred):
//   • pool identity: `pool` + `gauge` on deposits/withdraws — amp stake carries
//     `asset`+`gauge`; bucket stake/unstake carry `asset` (gauge from the
//     bucket contract); amp unstake carries it inside `returned` (v1 threw the
//     prefix away). Missing → null, never guessed.
//   • claims measured: `asset/claim_rewards` emits ONE event PER pool with
//     `user`+`assets`+`reward_amount` → per-pool `claims` array; compounder
//     vault cycles emit `ca/claim_rewards_callback` with `claimed` as
//     denom:amount → `claimed_coins`, mechanism 'amplified_vault', user null
//     BY MEANING (the vault claims for everyone; not a wallet flow).
//   • claim detection tightened to watched shapes — v1's loose /claim/i also
//     matched foreign airdrop/vesting `claim` events with no user attr (the
//     1,532 null-user claims in the Phase-A rollup). Foreign claims no longer
//     classify; a legacy /claim/i fallback remains for WATCHED contracts only.
// `amount` stays null + `amount_unit` 'rewards' on claims (v1 consumer compat);
// analysis reads `claims`/`claimed_coins`.

function flowsAttrs(ev) { const o = {}; for (const a of (ev.attributes || [])) if (!(a.key in o)) o[a.key] = a.value; return o; }
function flowsEventsOf(txr) {
  if (Array.isArray(txr.events) && txr.events.length) return txr.events;
  const out = []; for (const log of (txr.logs || [])) for (const e of (log.events || [])) out.push(e); return out;
}
function flowsGaugeOf(label) {
  return (typeof label === 'string' && label.startsWith('staking-')) ? label.slice(8) : null;
}
function flowsParseReturned(returned) {
  // 'cw20:terra1…:AMOUNT' | 'native:ibc/…:AMOUNT' → { pool, amount }
  const s = String(returned || ''); const i = s.lastIndexOf(':');
  if (i <= 0) return { pool: null, amount: s || null };
  return { pool: s.slice(0, i) || null, amount: s.slice(i + 1) || null };
}
function classifyFlowTx(txr) {
  if (Number(txr.code || 0) !== 0) return null;
  const wasmRaw = flowsEventsOf(txr).filter(e => e.type === 'wasm');
  const wasm = wasmRaw.map(flowsAttrs);
  let flow = null;
  for (const w of wasm) {
    const act = w.action;
    if (act === 'asset-compounding/stake')        flow = { type: 'deposit',  mechanism: 'amplified',     user: w.user, amount: w.bond_share_adjusted || w.bond_share, unit: 'amplp', pool: w.asset || null, gauge: w.gauge || null };
    else if (act === 'asset-compounding/unstake') { const r = flowsParseReturned(w.returned); flow = { type: 'withdraw', mechanism: 'amplified', user: w.user, amount: r.amount, unit: 'lp', pool: r.pool, gauge: null }; }
    else if (act === 'asset/stake')               flow = { type: 'deposit',  mechanism: 'non_amplified', user: w.user, amount: w.share, unit: 'shares', pool: w.asset || null, gauge: flowsGaugeOf(WATCH[w._contract_address]) };
    else if (act === 'asset/unstake')             flow = { type: 'withdraw', mechanism: 'non_amplified', user: w.user, amount: w.share, unit: 'shares', pool: w.asset || null, gauge: flowsGaugeOf(WATCH[w._contract_address]) };
    if (flow) break;
  }
  let claims = null, claimedCoins = null;
  if (!flow) {
    // measured wallet claims: one asset/claim_rewards event per pool, on a
    // WATCHED bucket contract, user attr required (census: 100% carry it)
    const cr = wasm.filter(w => w.action === 'asset/claim_rewards' && WATCH[w._contract_address] && w.user);
    if (cr.length) {
      claims = cr.map(w => ({ pool: w.assets || null, reward_amount: w.reward_amount || null, gauge: flowsGaugeOf(WATCH[w._contract_address]) }));
      flow = { type: 'claim', mechanism: 'non_amplified', user: cr[0].user, amount: null, unit: 'rewards', pool: null, gauge: null };
    }
  }
  if (!flow) {
    // compounder vault claim cycle: claimed coins are measured; the vault
    // claims for all depositors, so this is a protocol flow — user null BY
    // MEANING, mechanism says so.
    const cb = wasm.filter(w => w.action === 'ca/claim_rewards_callback' && w.claimed);
    if (cb.length) {
      claimedCoins = cb.map(w => { const r = flowsParseReturned(w.claimed); return { denom: r.pool, amount: r.amount }; });
      flow = { type: 'claim', mechanism: 'amplified_vault', user: null, amount: null, unit: 'rewards', pool: null, gauge: null };
    }
  }
  if (!flow) {
    // legacy fallback — WATCHED contracts only (v2 tightening: foreign
    // airdrop/vesting `claim` events no longer classify)
    const c = wasm.find(w => /claim/i.test(w.action || '') && WATCH[w._contract_address]);
    if (c) flow = { type: 'claim', mechanism: null, user: c.user || c.sender || null, amount: null, unit: 'rewards', pool: null, gauge: null };
  }
  if (!flow) return null;
  const viaZap = wasm.some(w => w.action === 'zapper/create_lp' || w.action === 'zapper/withdraw_lp');
  const cost = flowsExtractCost(wasm);
  const rec = { schemaVersion: 2, txhash: txr.txhash, height: Number(txr.height), timestamp: txr.timestamp,
           type: flow.type, mechanism: flow.mechanism, via_zap: viaZap, user: flow.user || null,
           amount: flow.amount || null, amount_unit: flow.unit, cost,
           pool: flow.pool || null, gauge: flow.gauge || null,
           raw_actions: [...new Set(wasm.map(w => w.action).filter(Boolean))] };
  if (claims) rec.claims = claims;
  if (claimedCoins) rec.claimed_coins = claimedCoins;
  return rec;
}
// Entry/exit cost: collect EVERY swap leg (a non-LUNA exit is multi-hop) plus
// any provide_liquidity slippage (imbalanced "Tokens" deposits). Cross-denom
// legs kept raw — the cron records receipt truth; analysis prices the rollup.
function flowsExtractCost(wasm) {
  const swaps = wasm
    .filter(w => w.action === 'swap' && w.offer_amount !== undefined && w.return_amount !== undefined)
    .map(w => {
      const ret = Number(w.return_amount || 0), spr = Number(w.spread_amount || 0), com = Number(w.commission_amount || 0), d = ret + spr + com;
      return { offer_asset: w.offer_asset, offer_amount: w.offer_amount, ask_asset: w.ask_asset,
               return_amount: w.return_amount, spread_amount: w.spread_amount, commission_amount: w.commission_amount,
               maker_fee_amount: w.maker_fee_amount, leg_cost_pct: d > 0 ? +(100 * (spr + com) / d).toFixed(4) : null };
    });
  const prov = wasm.find(w => w.action === 'provide_liquidity' && w.slippage !== undefined);
  const provide_slippage_pct = prov ? +(100 * Number(prov.slippage)).toFixed(4) : null;
  if (!swaps.length && provide_slippage_pct == null) return null;
  return { swaps, provide_slippage_pct };
}
// ============================================================== <<FLOWS CLASSIFIER v2>> END

// ---------------------------------------------------------------- load + classify (all inputs committed in-repo)
const seen = new Set();
const records = [];
for (const label of LABELS) {
  const dir = path.join(ROOT, 'archive', 'fcd', label);
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
  assert(state.complete === true, `${label} harvest not complete`);
  for (const p of fs.readdirSync(dir).filter(f => /^part-\d+\.json$/.test(f)).sort()) {
    for (const t of JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8')).txs) {
      if (seen.has(t.txhash)) continue; seen.add(t.txhash);
      const rec = classifyFlowTx(t);
      if (rec) records.push(rec);
    }
  }
  console.log(`${label}: loaded (running totals: ${seen.size} unique txs, ${records.length} flows)`);
}
records.sort((a, b) => a.height - b.height || (a.txhash < b.txhash ? -1 : 1));
const byType = {};
for (const r of records) byType[r.type] = (byType[r.type] || 0) + 1;
console.log(`classified ${records.length} flows:`, byType);
assert(records.length === EXPECT.total, `total ${records.length} != ${EXPECT.total}`);
for (const k of ['deposit', 'withdraw', 'claim']) assert(byType[k] === EXPECT[k], `${k} ${byType[k]} != ${EXPECT[k]}`);
const FREEZE = records[records.length - 1].height; // data-derived archive end (per-label drains differ)
assert(FREEZE < SANITY_CEILING, `archive end ${FREEZE} beyond sanity ceiling — inputs changed?`);
console.log(`archive end (data-derived): height ${FREEZE} @ ${records[records.length - 1].timestamp}`);

// ---------------------------------------------------------------- group by month
const monthKey = (ts) => { const [Y, M] = String(ts).slice(0, 7).split('-'); return `${Y}/${M}`; };
const byMonth = {};
for (const r of records) (byMonth[monthKey(r.timestamp)] ||= []).push(r);
const months = Object.keys(byMonth).sort();
console.log(`months: ${months[0]} … ${months[months.length - 1]} (${months.length} files)`);

// ---------------------------------------------------------------- publish plumbing (Action) / dry-run
function ghReq(method, apiPath, body, accept) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'api.github.com', path: apiPath, method, headers: { 'User-Agent': 'tla-flows-fill', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': accept || 'application/vnd.github+json' } };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(d)); } catch { resolve(d); } } else { const e = new Error(`GitHub ${method} ${apiPath}: ${res.statusCode} ${d.slice(0, 160)}`); e.statusCode = res.statusCode; reject(e); } }); });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}
async function getJson(repoPath) { // raw media type — Contents API blanks content >1MB
  try {
    const d = await ghReq('GET', `/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`, null, 'application/vnd.github.raw');
    return { data: typeof d === 'string' ? JSON.parse(d) : d };
  } catch (e) { if (e.statusCode === 404) return { data: null }; throw e; }
}
async function getSha(repoPath) { try { const r = await ghReq('GET', `/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`); return r.sha || null; } catch (e) { if (e.statusCode === 404) return null; throw e; } }
async function putJson(repoPath, obj, msg, pretty) {
  const content = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const sha = await getSha(repoPath).catch(() => null);
    const body = { message: msg, content: Buffer.from(content + '\n').toString('base64'), branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;
    try { return await ghReq('PUT', `/repos/${GITHUB_REPO}/contents/${repoPath}`, body); }
    catch (e) { if (e.statusCode === 409 && attempt < 4) { console.warn(`  409 on ${repoPath}, retrying (${attempt})`); await new Promise(r => setTimeout(r, 500 * attempt)); continue; } throw e; }
  }
}
function mergeMonth(existing, incoming) {
  const byHash = new Map();
  for (const r of existing) byHash.set(r.txhash, r);
  let added = 0;
  let upgraded = 0;
  for (const r of incoming) {
    const prev = byHash.get(r.txhash);
    if (!prev) { byHash.set(r.txhash, r); added++; }
    // schema-upgrade merge (v2 re-fill, 2026-07-23): a HIGHER-schema record for
    // a known tx replaces the old one in place (same tx, richer fields); lower
    // or equal never overwrites — re-runs stay idempotent, count never shrinks.
    else if (Number(r.schemaVersion || 1) > Number(prev.schemaVersion || 1)) { byHash.set(r.txhash, r); upgraded++; }
  }
  return { merged: [...byHash.values()].sort((a, b) => a.height - b.height || (a.txhash < b.txhash ? -1 : 1)), added, upgraded };
}

(async () => {
  if (DRY) {
    fs.mkdirSync(DRY, { recursive: true });
    for (const mk of months) {
      const f = path.join(DRY, mk.replace('/', '-') + '.json');
      fs.writeFileSync(f, JSON.stringify(byMonth[mk]) + '\n');
    }
    const report = { months: months.length, total: records.length, by_type: byType,
      per_month: Object.fromEntries(months.map(m => [m, byMonth[m].length])),
      first: records[0].timestamp, last: records[records.length - 1].timestamp };
    fs.writeFileSync(path.join(DRY, 'report.json'), JSON.stringify(report, null, 2));
    console.log('DRY RUN complete →', DRY);
    return;
  }
  assert(GITHUB_TOKEN, 'GITHUB_TOKEN missing');
  let published = 0;
  for (const mk of months) {
    const repoPath = `${OUT_DIR}/${mk}.json`;
    const { data: existing } = await getJson(repoPath);
    const base = Array.isArray(existing) ? existing : [];
    const { merged, added, upgraded } = mergeMonth(base, byMonth[mk]);
    assert(merged.length >= base.length, `never-shrink violated for ${mk}`);
    if (added === 0 && !upgraded) { console.log(`  ${mk}: already filled (${base.length}) — skip`); continue; }
    await putJson(repoPath, merged, `flows-fill ${mk}: +${added} archive events, ${upgraded || 0} upgraded to v2 (${merged.length} total)`);
    published += added;
    console.log(`  ${mk}: +${added} · ↑${upgraded || 0} → ${merged.length}`);
  }
  // index merge: read live, add fill counts, union months, min first_date, add the honest gap
  const { data: idx0 } = await getJson(`${OUT_DIR}/index.json`);
  const idx = idx0 || { schemaVersion: 2, product: 'tla-flows/events', total_events: 0, by_type: {}, months_present: {}, known_gaps: [] };
  idx.total_events = (idx.total_events || 0) + published;
  for (const k in byType) idx.by_type[k] = (idx.by_type[k] || 0) + (published ? byType[k] : 0);
  for (const mk of months) { const [Y, M] = mk.split('/'); (idx.months_present[Y] ||= []).includes(M) || idx.months_present[Y].push(M); idx.months_present[Y].sort(); }
  const firstDate = records[0].timestamp.slice(0, 10);
  if (!idx.first_date || firstDate < idx.first_date) idx.first_date = firstDate;
  idx.known_gaps = idx.known_gaps || [];
  const GAP_KEY = 'fcd-freeze-to-forward-capture';
  if (published > 0 && !idx.known_gaps.some(g => g.key === GAP_KEY)) {
    idx.known_gaps.push({ key: GAP_KEY, from_height: FREEZE + 1, from_date_approx: records[records.length - 1].timestamp.slice(0, 10),
      to_height: null, to_note: 'until the 17-day retained-history one-shot lands (then: its floor); full close requires archive node (Batch 5)',
      recorded_at: new Date().toISOString(),
      reason: 'FCD frozen archive ends at the freeze; public-node tx index pruned — span recoverable only from archive nodes' });
  }
  idx.updatedAt = new Date().toISOString();
  await putJson(`${OUT_DIR}/index.json`, idx, `flows-fill: index +${published} archive events, gap recorded`, true);
  console.log(`\n✅ flows-fill complete: +${published} events published, index merged, gap recorded honestly`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

#!/usr/bin/env node
// =============================================================================
// flows-fill — one-shot derive: merge the FCD-archive LP flow history under
// the live tla-flows event stream.
//
// Runs as a GitHub Action in tla-core (workflow: tla-flows-fill.yml, manual
// dispatch) with the repo checked out — reads archive/fcd/lp-* locally,
// classifies with a BYTE-IDENTICAL copy of the walker's <<FLOWS CLASSIFIER
// v4>> block (diff-verify: see README), and publishes monthly
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
// v4 keeps v3's primary-flow first-match semantics — record COUNTS are
// invariant across v2→v4 (fields additive). The 31,748 figure is the
// chain-derived truth and the re-run gate.
const EXPECT = { total: 31748, deposit: 15727, withdraw: 4499, claim: 11522 };
const SANITY_CEILING = 14000000; // ~2025-01-25 — no archive event may exceed this

function fail(m) { console.error('INVARIANT FAIL: ' + m); process.exit(1); }
const assert = (c, m) => { if (!c) fail(m); };

// SHARED CLASSIFIER — Marker: <<FLOWS CLASSIFIER v3>>
// v3 (2026-07-31, SPEC-registry-extensions-pnl — evidenced by DeFi_Patriot's
// 8-tx live test matrix, blocks 22,163,785–896, all shapes chainscope-read):
// additive on v2 — every v2 top-level field is emitted UNCHANGED (primary-flow
// selection keeps v2's exact first-match semantics, so the schema-upgrade
// merge replaces v2 records with byte-identical v2 fields + the new ones).
//   • MULTI-FLOW TXS (test tx DCA53591…: non-amp unstake + amp re-stake in ONE
//     tx — v2's one-flow-per-tx dropped the re-stake, silently corrupting
//     position tracking): `flows[]` now carries EVERY stake/unstake flow in
//     event order. Record identity unchanged (one record per tx, txhash key).
//   • AMP RATE FIELDS (test A38C20B3…): asset-compounding/stake carries
//     bond_amount + bond_share + bond_share_adjusted → recorded per flow; the
//     LP↔amplp rate (bond_amount/bond_share) is the measured compounding-yield
//     curve — no pro-rating ever. Unstake has no rate attrs; amplp burned is
//     recovered from the tf_burn event (F051E83A…) → rate = returned/burned.
//   • PROVIDE / WITHDRAW BOTH-SIDES TRUTH (82FBE584…, 29537FA7…): pair
//     provide_liquidity {assets×2, share} and withdraw_liquidity
//     {refund_assets×2, withdrawn_share} in the SAME tx are recorded as
//     `provides[]` / `withdraw_liqs[]` — zap post-value + exit valuation with
//     zero pair-walk dependency.
//   • Repeated-attr events handled (zapper callback_send_results carries TWO
//     `returned` attrs — 29537FA7…): v3 fields parse ALL occurrences; v2's
//     first-occurrence flowsAttrs stays untouched for v2 semantics.
// The legacy classifier copies in tla-core/.github/scripts/tla-flows/
// (flows-fill, retained-gap-fill) are FROZEN at v2 — executed one-shots; any
// future re-run must require() this live module (no-third-copy doctrine).
// =============================================================================

function flowsAttrs(ev) { const o = {}; for (const a of (ev.attributes || [])) if (!(a.key in o)) o[a.key] = a.value; return o; }
function flowsAttrsAll(ev) { const o = {}; for (const a of (ev.attributes || [])) (o[a.key] ||= []).push(a.value); return o; }
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
// '5097943terra10aa3zd…, 124842627uluna' → [{amount,denom}, …] (pair-event coin lists)
function flowsParseCoinList(s) {
  return String(s || '').split(',').map(x => x.trim()).filter(Boolean).map(x => {
    const m = /^(\d+)(.+)$/.exec(x);
    return m ? { amount: m[1], denom: m[2] } : { amount: null, denom: x };
  });
}

function classifyFlowTx(txr) {
  if (Number(txr.code || 0) !== 0) return null;
  const allEvents = flowsEventsOf(txr);
  const wasmRaw = allEvents.filter(e => e.type === 'wasm');
  const wasm = wasmRaw.map(flowsAttrs);
  // v3: collect EVERY stake/unstake flow in event order (v2 kept only the first)
  const flowList = [];
  for (const w of wasm) {
    const act = w.action;
    let f = null;
    if (act === 'asset-compounding/stake')        f = { type: 'deposit',  mechanism: 'amplified',     user: w.user, amount: w.bond_share_adjusted || w.bond_share, unit: 'amplp', pool: w.asset || null, gauge: w.gauge || null,
                                                        bond_amount: w.bond_amount || null, bond_share: w.bond_share || null, bond_share_adjusted: w.bond_share_adjusted || null };
    else if (act === 'asset-compounding/unstake') { const r = flowsParseReturned(w.returned); f = { type: 'withdraw', mechanism: 'amplified', user: w.user, amount: r.amount, unit: 'lp', pool: r.pool, gauge: null, amplp_burned: null }; }
    else if (act === 'asset/stake')               f = { type: 'deposit',  mechanism: 'non_amplified', user: w.user, amount: w.share, unit: 'shares', pool: w.asset || null, gauge: flowsGaugeOf(WATCH[w._contract_address]) };
    else if (act === 'asset/unstake')             f = { type: 'withdraw', mechanism: 'non_amplified', user: w.user, amount: w.share, unit: 'shares', pool: w.asset || null, gauge: flowsGaugeOf(WATCH[w._contract_address]) };
    if (f) flowList.push(f);
  }
  // amp unstake rate leg: pair tf_burn amplp amounts to amplified withdraws in order
  const burns = allEvents.filter(e => e.type === 'tf_burn').map(flowsAttrs)
    .map(a => /^(\d+)(factory\/.+)$/.exec(String(a.amount || ''))).filter(Boolean);
  let bi = 0;
  for (const f of flowList) if (f.mechanism === 'amplified' && f.type === 'withdraw' && bi < burns.length) f.amplp_burned = burns[bi++][1];
  let flow = flowList[0] || null;   // primary = v2's exact first-match
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
  const viaZap = wasm.some(w => w.action === 'zapper/create_lp' || w.action === 'zapper/withdraw_lp' || w.action === 'zapper/zap');
  const cost = flowsExtractCost(wasm);
  // v3: both-sides liquidity truth from pair events riding the same tx
  const provides = wasmRaw.filter(e => flowsAttrs(e).action === 'provide_liquidity')
    .map(e => { const a = flowsAttrs(e); return { pair: a._contract_address || null, assets: flowsParseCoinList(a.assets), share: a.share || null }; });
  const withdrawLiqs = wasmRaw.filter(e => flowsAttrs(e).action === 'withdraw_liquidity')
    .map(e => { const a = flowsAttrs(e); return { pair: a._contract_address || null, refund_assets: flowsParseCoinList(a.refund_assets), share: a.withdrawn_share || null }; });
  // v3: final zapper exit assets (callback_send_result(s) — may repeat `returned`)
  const sendResults = [];
  for (const e of wasmRaw) {
    const all = flowsAttrsAll(e);
    const act = (all.action || [])[0];
    if (act === 'zapper/callback_send_results' || act === 'zapper/callback_send_result') {
      for (const r of (all.returned || all.amount || [])) { const p = flowsParseReturned(r); if (p.amount) sendResults.push({ denom: p.pool, amount: p.amount }); }
    }
  }
  const fee = flowsExtractFee(allEvents);
  const rec = { schemaVersion: 4, txhash: txr.txhash, height: Number(txr.height), timestamp: txr.timestamp,
           type: flow.type, mechanism: flow.mechanism, via_zap: viaZap, user: flow.user || null,
           amount: flow.amount || null, amount_unit: flow.unit, cost,
           pool: flow.pool || null, gauge: flow.gauge || null,
           raw_actions: [...new Set(wasm.map(w => w.action).filter(Boolean))] };
  if (claims) rec.claims = claims;
  if (claimedCoins) rec.claimed_coins = claimedCoins;
  if (flowList.length) rec.flows = flowList;
  if (provides.length) rec.provides = provides;
  if (withdrawLiqs.length) rec.withdraw_liqs = withdrawLiqs;
  if (sendResults.length) rec.zap_out_assets = sendResults;
  if (fee) rec.fee = fee;
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
function flowsExtractFee(allEvents) {
  for (const e of allEvents || []) {
    if (e.type !== 'tx') continue;
    const a = flowsAttrs(e);
    if (!a.fee) continue;
    const c = flowsParseCoinList(a.fee)[0];
    if (c && c.amount) return { amount: c.amount, denom: c.denom, payer: a.fee_payer || null };
  }
  return null;
}
// wallet↔wallet amp-token movements. `watched` = every custody/aux contract
// address; movements touching any of them are pool flows, not transfers.
function classifyTransferTx(txr, watched) {
  if (Number(txr.code || 0) !== 0) return [];
  const allEvents = flowsEventsOf(txr);
  const fee = flowsExtractFee(allEvents);
  const out = [];
  let idx = 0;
  for (const e of allEvents) {
    if (e.type !== 'transfer') continue;
    const all = flowsAttrsAll(e);
    const n = Math.max((all.recipient || []).length, (all.sender || []).length, (all.amount || []).length);
    for (let i = 0; i < n; i++) {
      const from = (all.sender || [])[i] || null, to = (all.recipient || [])[i] || null;
      if (!from || !to) continue;
      if ((watched && (watched.has ? (watched.has(from) || watched.has(to)) : (watched[from] || watched[to])))) continue;
      for (const c of flowsParseCoinList((all.amount || [])[i])) {
        if (!c.amount || !c.denom) continue;
        if (!(c.denom.startsWith('factory/') && c.denom.includes('amplp'))) continue;
        const rec = { schemaVersion: 4, txhash: txr.txhash, height: Number(txr.height), timestamp: txr.timestamp,
                      key: `${txr.txhash}:${idx++}`, type: 'transfer', denom: c.denom, amount: c.amount, from, to };
        if (fee) rec.fee = fee;
        out.push(rec);
      }
    }
  }
  return out;
}
// ============================================================== <<FLOWS CLASSIFIER v4>> END

// ---------------------------------------------------------------- load + classify (all inputs committed in-repo)
const seen = new Set();
const records = [];
const transfers = [];
const WATCHED_SET = new Set(Object.keys(WATCH));
for (const label of LABELS) {
  const dir = path.join(ROOT, 'archive', 'fcd', label);
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
  assert(state.complete === true, `${label} harvest not complete`);
  for (const p of fs.readdirSync(dir).filter(f => /^part-\d+\.json$/.test(f)).sort()) {
    for (const t of JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8')).txs) {
      if (seen.has(t.txhash)) continue; seen.add(t.txhash);
      const rec = classifyFlowTx(t);
      if (rec) records.push(rec);
      transfers.push(...classifyTransferTx(t, WATCHED_SET));
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
// ---- v4 field-completeness census (PLAN-archive-window-walk §5): the gate
// that keeps "captured events but not the costs" from ever recurring.
const census = { deposit: { n: 0, legs: 0, fee: 0 }, withdraw: { n: 0, legs: 0, fee: 0 }, claim: { n: 0, fee: 0, measured: 0 } };
for (const r of records) {
  const c = census[r.type]; if (!c) continue;
  c.n++;
  if (r.fee) c.fee++;
  if (r.type === 'deposit' && r.provides && r.provides.length) c.legs++;
  if (r.type === 'withdraw' && ((r.withdraw_liqs && r.withdraw_liqs.length) || (r.zap_out_assets && r.zap_out_assets.length))) c.legs++;
  if (r.type === 'claim' && (r.claims || r.claimed_coins)) c.measured++;
}
console.log('v4 census:', JSON.stringify(census), `transfers: ${transfers.length}`);
console.log('  (FCD source kept no auth data — fee 0% here is the stated truth, not a bug)');
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
      census, transfers: transfers.length,
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
  // v4 transfers stream — own files, key-based (txhash:idx) merge
  if (transfers.length) {
    const mergeKeyedBy = (existing, incoming) => {
      const byK = new Map(existing.map(r => [r.key, r]));
      let changed = 0;
      for (const r of incoming) { const p = byK.get(r.key); if (!p) { byK.set(r.key, r); changed++; } else if (Number(r.schemaVersion || 1) > Number(p.schemaVersion || 1)) { byK.set(r.key, r); changed++; } }
      return { merged: [...byK.values()].sort((a, b) => a.height - b.height || String(a.key).localeCompare(String(b.key))), changed };
    };
    const tByM = {};
    for (const r of transfers) (tByM[monthKey(r.timestamp)] ||= []).push(r);
    for (const mk of Object.keys(tByM).sort()) {
      const p2 = `tla-flows/transfers/${mk}.json`;
      const { data: ex } = await getJson(p2);
      const base2 = Array.isArray(ex) ? ex : [];
      const { merged, changed } = mergeKeyedBy(base2, tByM[mk]);
      assert(merged.length >= base2.length, `transfers never-shrink violated for ${mk}`);
      if (!changed) { console.log(`  transfers ${mk}: already filled — skip`); continue; }
      await putJson(p2, merged, `flows-fill transfers ${mk}: +${changed} (${merged.length} total)`);
      console.log(`  transfers ${mk}: +${changed} → ${merged.length}`);
    }
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

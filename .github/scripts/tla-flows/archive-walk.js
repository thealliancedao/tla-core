#!/usr/bin/env node
// =============================================================================
// archive-walk — the ACCESS-WINDOW walk runner (PLAN-archive-window-walk).
//
// Walks an EXPLICIT [FROM, TO] height range against an archive RPC
// (secret ARCHIVE_RPC), with three outputs per matched tx:
//   1. RAW ATTRIBUTE ARCHIVE (§0 insurance — walk once, classify forever):
//      tla-flows/raw/{FROM}-{TO}/part-NNNNN.json.gz — write-once parts,
//      every matched tx's full event list, gzipped. Any future classifier
//      oversight becomes a local re-derive, never a lost-access tragedy.
//   2. EVENTS: <<FLOWS CLASSIFIER v4>> records merged into
//      tla-flows/events/{YYYY}/{MM}.json (schema-upgrade-in-place, txhash
//      dedupe, never-shrink — same rules as the walker and flows-fill).
//   3. TRANSFERS: wallet↔wallet amp-token moves →
//      tla-flows/transfers/{YYYY}/{MM}.json (key txhash:idx).
// Plus a FIELD-COMPLETENESS CENSUS gating the run (PLAN §5): coverage
// thresholds fail the job loudly instead of publishing thin data.
//
// Matching: core custody contracts ∪ aux registry addresses (vaults / pairs /
// NFT contracts — their raw txs are archived too) ∪ amp-transfer hits. Only
// core flows + transfers are CLASSIFIED here; raw parts hold everything for
// later classification (NFT payment legs, lock args, LP-cw20 transfers…).
//
// Workflow: tla-flows-archive-walk.yml (manual dispatch; inputs from/to).
// Re-runnable: raw parts are write-once (skipped if present); month merges
// are idempotent by key+schema. Ranges must not overlap previous walks for
// raw-part hygiene — the walk MANIFEST (report.json per range) records
// exactly what was covered.
// =============================================================================
'use strict';
const https = require('https');
const zlib = require('zlib');

// trailing slash in the secret produced '//block?…' → the node 301s and the
// fetcher (correctly) refused to guess — normalize here, and follow same-host
// redirects defensively (2026-08-03 live failure).
const ARCHIVE_RPC   = String(process.env.ARCHIVE_RPC || '').replace(/\/+$/, '');
const FROM          = Number(process.env.WALK_FROM || process.argv[2]);
const FINAL         = Number(process.env.FINAL_HEIGHT || 0);   // self-chain target (0 = single-range mode)
const CHUNK         = Number(process.env.CHUNK_BLOCKS || 450000);
const RUN_BUDGET_MS = Number(process.env.RUN_BUDGET_MIN || 320) * 60000;  // stop-early budget (Actions limit 355m)
const TO_RAW        = process.env.WALK_TO || process.argv[3];
const TO            = TO_RAW ? Number(TO_RAW) : (FINAL ? Math.min(FROM + CHUNK - 1, FINAL) : NaN);
const WORKFLOW_FILE = process.env.WORKFLOW_FILE || 'tla-flows-archive-walk.yml';
const CONC          = Number(process.env.WALK_CONCURRENCY || 6);
const PART_TXS      = Number(process.env.RAW_PART_TXS || 1500);   // txs per raw part (~1-3MB gz)
const GITHUB_REPO   = process.env.GITHUB_REPO || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const OUT_EVENTS    = 'tla-flows/events';
const OUT_TRANSFERS = 'tla-flows/transfers';
const RAW_DIR       = () => `tla-flows/raw/${FROM}-${TO}`;

// census thresholds (PLAN §5) — fail loudly, never publish thin data.
// Values reflect the measured FCD-corpus truth: legs exist on pair-route
// events only; single-side routes carry none BY MEANING.
const CENSUS_MIN = { deposit_legs_pct: 70, withdraw_legs_pct: 60, claim_measured_pct: 95 };

function fail(m) { console.error('FATAL: ' + m); process.exit(1); }
if (!ARCHIVE_RPC) fail('ARCHIVE_RPC missing (repo secret)');
if (!Number.isFinite(FROM) || !Number.isFinite(TO) || FROM > TO) fail('WALK_FROM/WALK_TO/FINAL_HEIGHT invalid');
if (FINAL && TO > FINAL) fail('TO beyond FINAL_HEIGHT');

// custody contracts — mirror platform-crons config (chain-verified)
const WATCH = {
  'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx': 'compounder',
  'terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq': 'staking-stable',
  'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa': 'staking-project',
  'terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv': 'staking-bluechip',
  'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k': 'staking-single',
  'terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl': 'zapper',
};

// ---------------------------------------------------------------- transport
const AGENT = new https.Agent({ keepAlive: true, maxSockets: CONC });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function httpGet(url, t = 25000, hops = 0) {
  return new Promise((res, rej) => {
    const r = https.get(url, { agent: AGENT, headers: { Accept: 'application/json', 'User-Agent': 'tla-archive-walk/1.0' } }, (x) => {
      if (x.statusCode >= 301 && x.statusCode <= 308 && x.headers.location && hops < 3) {
        x.resume(); clearTimeout(dl);
        const next = new URL(x.headers.location, url).toString();
        return httpGet(next, t, hops + 1).then(res, rej);
      }
      let b = ''; x.on('data', c => b += c); x.on('end', () => { clearTimeout(dl);
        if (x.statusCode >= 200 && x.statusCode < 300) { try { res(JSON.parse(b)); } catch { rej(new Error('bad JSON')); } }
        else rej(new Error(`HTTP ${x.statusCode} ${b.slice(0, 100)}`)); });
    });
    r.on('error', (e) => { clearTimeout(dl); rej(e); });
    r.setTimeout(t, () => r.destroy(new Error('idle-timeout')));
    const dl = setTimeout(() => r.destroy(new Error('deadline')), t * 2); if (dl.unref) dl.unref();
  });
}
async function rpc(p, label) {
  let last;
  for (let a = 1; a <= 4; a++) { try { return await httpGet(ARCHIVE_RPC + p); } catch (e) { last = e; await sleep(400 * a); } }
  throw new Error(`${label}: ${last && last.message}`);
}
const crypto = require('crypto');
const txHashOf = (b64) => crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').toUpperCase();
async function getBlock(N) {
  const b = await rpc(`/block?height=${N}`, `block ${N}`);
  return { time: b.result.block.header.time, txsB64: b.result.block.data.txs || [] };
}
async function getBlockResults(N) {
  const r = await rpc(`/block_results?height=${N}`, `results ${N}`);
  return (r.result.txs_results || []).map(t => ({ code: t.code || 0, events: t.events || [] }));
}

// ---------------------------------------------------------------- github
function ghReqOnce(method, apiPath, body, accept) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'api.github.com', path: apiPath, method, headers: { 'User-Agent': 'tla-archive-walk', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': accept || 'application/vnd.github+json' } };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(d)); } catch { resolve(d); } } else { const e = new Error(`GitHub ${method} ${apiPath}: ${res.statusCode} ${String(d).slice(0, 140)}`); e.statusCode = res.statusCode; reject(e); } }); });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}
// HARDENING (2026-08-06, live kill at chunk 17810676: run died on a GitHub
// call right after part-00022 committed — no manifest, chain broken at 52.6%).
// The RPC side already retried (rpc(), 4×); the GitHub side retried nothing
// but 409. This wrapper retries TRANSIENT failures only — network errors
// (no statusCode), 5xx, 429, and 403 secondary-rate-limit — with exponential
// backoff. 4xx semantics (404 for getJson/exists, 409 for putContent's
// sha-conflict loop) pass through UNCHANGED on the first throw.
const GH_TRIES = Number(process.env.GH_TRANSIENT_TRIES || 5);
async function ghReq(method, apiPath, body, accept) {
  let last;
  for (let a = 1; a <= GH_TRIES; a++) {
    try { return await ghReqOnce(method, apiPath, body, accept); }
    catch (e) {
      last = e;
      const sc = e.statusCode;
      const transient = !sc || sc >= 500 || sc === 429 || (sc === 403 && /rate limit/i.test(e.message));
      if (!transient || a === GH_TRIES) throw e;
      const wait = Math.min(60000, 1500 * Math.pow(2, a - 1));
      console.log(`  \u26a0 GitHub transient (${sc || String(e.message).slice(0, 50)}) \u2014 retry ${a}/${GH_TRIES - 1} in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
    }
  }
  throw last;
}
async function getJson(p) { try { const d = await ghReq('GET', `/repos/${GITHUB_REPO}/contents/${p}?ref=${GITHUB_BRANCH}`, null, 'application/vnd.github.raw'); return { data: typeof d === 'string' ? JSON.parse(d) : d }; } catch (e) { if (e.statusCode === 404) return { data: null }; throw e; } }
async function exists(p) { try { await ghReq('GET', `/repos/${GITHUB_REPO}/contents/${p}?ref=${GITHUB_BRANCH}`); return true; } catch (e) { if (e.statusCode === 404) return false; throw e; } }
async function putContent(p, buf, msg) {
  for (let a = 1; a <= 4; a++) {
    let sha = null; try { sha = (await ghReq('GET', `/repos/${GITHUB_REPO}/contents/${p}?ref=${GITHUB_BRANCH}`)).sha || null; } catch {}
    const body = { message: msg, content: Buffer.from(buf).toString('base64'), branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;
    try { return await ghReq('PUT', `/repos/${GITHUB_REPO}/contents/${p}`, body); }
    catch (e) { if (e.statusCode === 409 && a < 4) { await sleep(500 * a); continue; } throw e; }
  }
}
const putJson = (p, obj, msg) => putContent(p, JSON.stringify(obj) + '\n', msg);

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

// ---------------------------------------------------------------- merges (rules identical to walker/flows-fill)
function mergeMonth(existing, incoming) {
  const byHash = new Map(existing.map(r => [r.txhash, r]));
  let added = 0, upgraded = 0;
  for (const r of incoming) {
    const prev = byHash.get(r.txhash);
    if (!prev) { byHash.set(r.txhash, r); added++; }
    else if (Number(r.schemaVersion || 1) > Number(prev.schemaVersion || 1)) { byHash.set(r.txhash, r); upgraded++; }
  }
  return { merged: [...byHash.values()].sort((a, b) => a.height - b.height || (a.txhash < b.txhash ? -1 : 1)), added, upgraded };
}
function mergeKeyedBy(existing, incoming) {
  const byK = new Map(existing.map(r => [r.key, r]));
  let changed = 0;
  for (const r of incoming) { const p = byK.get(r.key); if (!p) { byK.set(r.key, r); changed++; } else if (Number(r.schemaVersion || 1) > Number(p.schemaVersion || 1)) { byK.set(r.key, r); changed++; } }
  return { merged: [...byK.values()].sort((a, b) => a.height - b.height || String(a.key).localeCompare(String(b.key))), changed };
}
const monthKey = (ts) => { const [Y, M] = String(ts).slice(0, 7).split('-'); return `${Y}/${M}`; };

// aux registry → raw-archive watch superset (classification stays core+transfer)
async function loadAuxWatch() {
  try {
    const { data } = await getJson('tla-voting/capture-registry.json');
    const set = new Set();
    for (const c of (data && data.contracts) || []) if (c.address) set.add(c.address);
    console.log(`aux watch superset: ${set.size} registry addresses`);
    return set;
  } catch (e) { console.warn('registry load failed — raw scope = core+transfers only:', e.message); return new Set(); }
}

function touches(events, auxWatch) {
  let core = false, aux = false, transfer = false;
  for (const e of events || []) {
    if (e.type === 'transfer') {
      for (const a of e.attributes || []) if (a.key === 'amount' && a.value && a.value.includes('factory/') && a.value.includes('amplp')) { transfer = true; break; }
      continue;
    }
    if (e.type !== 'wasm') continue;
    for (const a of e.attributes || []) {
      if (a.key !== '_contract_address') continue;
      if (WATCH[a.value]) core = true;
      if (auxWatch.has(a.value)) aux = true;
    }
  }
  return { core, aux, transfer };
}

function nextRange(to, final, chunk) {
  if (!final || to >= final) return null;
  return { from: to + 1, to: Math.min(to + chunk, final) };
}

(async () => {
  console.log(`archive-walk ${FROM} → ${TO} (${TO - FROM + 1} blocks) via [ARCHIVE_RPC]`);
  const auxWatch = await loadAuxWatch();
  const watchedAll = new Set([...Object.keys(WATCH), ...auxWatch]);
  const records = [], transfers = [], raw = [];
  let partN = 0, rawTotal = 0, matched = 0;

  async function flushRaw(final) {
    if (!raw.length || (!final && raw.length < PART_TXS)) return;
    const part = raw.splice(0, raw.length);
    const p = `${RAW_DIR()}/part-${String(partN).padStart(5, '0')}.json.gz`;
    partN++;
    if (await exists(p)) { console.log(`  raw ${p}: exists — write-once, skipping (${part.length} txs dropped as already archived)`); return; }
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(part)), { level: 9 });
    await putContent(p, gz, `archive-walk raw ${FROM}-${TO} part ${partN - 1} (${part.length} txs)`);
    rawTotal += part.length;
    console.log(`  raw ${p}: ${part.length} txs, ${(gz.length / 1048576).toFixed(2)}MB`);
  }

  const inFlight = new Map();
  const launch = (h) => { if (h <= TO && !inFlight.has(h)) inFlight.set(h, getBlock(h)); };
  for (let h = FROM; h < FROM + CONC && h <= TO; h++) launch(h);
  let lastLog = Date.now();
  const t0 = Date.now();
  let processedTo = FROM - 1;
  for (let N = FROM; N <= TO; N++) {
    if (Date.now() - t0 > RUN_BUDGET_MS) { console.log(`⏱ time budget reached at ${N - 1} — stopping early, publishing the walked span, chaining onward`); break; }
    const blk = await inFlight.get(N); inFlight.delete(N); launch(N + CONC);
    if (blk.txsB64.length) {
      const results = await getBlockResults(N);
      for (let i = 0; i < blk.txsB64.length; i++) {
        const res = results[i]; if (!res) continue;
        const t2 = touches(res.events, auxWatch);
        if (!t2.core && !t2.aux && !t2.transfer) continue;
        matched++;
        const txr = { txhash: txHashOf(blk.txsB64[i]), height: N, timestamp: blk.time, code: res.code, events: res.events };
        raw.push({ h: N, x: txr.txhash, t: blk.time, c: res.code, e: res.events });
        if (t2.core) { const rec = classifyFlowTx(txr); if (rec) records.push(rec); }
        if (t2.transfer) transfers.push(...classifyTransferTx(txr, watchedAll));
      }
      await flushRaw(false);
    }
    processedTo = N;
    if (Date.now() - lastLog > 15000) { console.log(`  at ${N} (${TO - N} to go · ${records.length} flows · ${transfers.length} transfers · ${matched} matched)`); lastLog = Date.now(); }
  }
  await flushRaw(true);
  const walkedTo = processedTo;   // = TO when the budget never fired

  // census gate — thresholds fail the run BEFORE any event publish
  const census = { deposit: { n: 0, legs: 0, fee: 0 }, withdraw: { n: 0, legs: 0, fee: 0 }, claim: { n: 0, fee: 0, measured: 0 } };
  for (const r of records) {
    const c = census[r.type]; if (!c) continue;
    c.n++;
    if (r.fee) c.fee++;
    if (r.type === 'deposit' && r.provides && r.provides.length) c.legs++;
    if (r.type === 'withdraw' && ((r.withdraw_liqs && r.withdraw_liqs.length) || (r.zap_out_assets && r.zap_out_assets.length))) c.legs++;
    if (r.type === 'claim' && (r.claims || r.claimed_coins)) c.measured++;
  }
  const pct = (a, b) => b ? +(100 * a / b).toFixed(1) : 100;
  const cd = pct(census.deposit.legs, census.deposit.n), cw = pct(census.withdraw.legs, census.withdraw.n), cc = pct(census.claim.measured, census.claim.n);
  console.log(`census: dep-legs ${cd}% · wdr-legs ${cw}% · clm-measured ${cc}% · fee dep ${pct(census.deposit.fee, census.deposit.n)}%`);
  if (census.deposit.n && cd < CENSUS_MIN.deposit_legs_pct) fail(`census: deposit legs ${cd}% < ${CENSUS_MIN.deposit_legs_pct}% — refusing to publish thin data`);
  if (census.withdraw.n && cw < CENSUS_MIN.withdraw_legs_pct) fail(`census: withdraw legs ${cw}% < ${CENSUS_MIN.withdraw_legs_pct}%`);
  if (census.claim.n && cc < CENSUS_MIN.claim_measured_pct) fail(`census: measured claims ${cc}% < ${CENSUS_MIN.claim_measured_pct}%`);

  // events months (schema-upgrade in place)
  const byM = {};
  for (const r of records) (byM[monthKey(r.timestamp)] ||= []).push(r);
  let added = 0, upgraded = 0;
  for (const mk of Object.keys(byM).sort()) {
    const p = `${OUT_EVENTS}/${mk}.json`;
    const { data: ex } = await getJson(p);
    const base = Array.isArray(ex) ? ex : [];
    const m = mergeMonth(base, byM[mk]);
    if (m.merged.length < base.length) fail(`never-shrink violated for ${mk}`);
    if (!(m.added + m.upgraded)) { console.log(`  events ${mk}: no change`); continue; }
    await putJson(p, m.merged, `archive-walk ${mk}: +${m.added} · ↑${m.upgraded} (${m.merged.length} total)`);
    added += m.added; upgraded += m.upgraded;
    console.log(`  events ${mk}: +${m.added} · ↑${m.upgraded} → ${m.merged.length}`);
  }
  // transfers months
  const tByM = {};
  for (const r of transfers) (tByM[monthKey(r.timestamp)] ||= []).push(r);
  let tAdded = 0;
  for (const mk of Object.keys(tByM).sort()) {
    const p = `${OUT_TRANSFERS}/${mk}.json`;
    const { data: ex } = await getJson(p);
    const base = Array.isArray(ex) ? ex : [];
    const m = mergeKeyedBy(base, tByM[mk]);
    if (m.merged.length < base.length) fail(`transfers never-shrink violated for ${mk}`);
    if (!m.changed) continue;
    await putJson(p, m.merged, `archive-walk transfers ${mk}: +${m.changed} (${m.merged.length} total)`);
    tAdded += m.changed;
    console.log(`  transfers ${mk}: +${m.changed} → ${m.merged.length}`);
  }

  // MANIFEST — the walk's own record of exactly what was covered
  const report = { schemaVersion: 1, kind: 'archive-walk-manifest', from: FROM, to: walkedTo, planned_to: TO, final_height: FINAL || undefined,
    walkedAt: new Date().toISOString(), matched_txs: matched, raw_parts: partN, raw_txs: rawTotal,
    classified: records.length, events_added: added, events_upgraded: upgraded, transfers: tAdded, census };
  await putJson(`${RAW_DIR()}/report.json`, report, `archive-walk manifest ${FROM}-${walkedTo}`);
  console.log(`\n✅ archive-walk complete: ${matched} matched · raw ${rawTotal} txs in ${partN} parts · events +${added}/↑${upgraded} · transfers +${tAdded}`);

  // SELF-CHAIN (one dispatch walks the whole hole): a successful chunk
  // dispatches the next one until FINAL_HEIGHT is reached. A failed chunk
  // stops the chain (census gate included) — re-dispatch from the failure
  // point after diagnosis. Requires workflow permissions: actions: write.
  const nxt = nextRange(walkedTo, FINAL, CHUNK);
  if (nxt) {
    console.log(`self-chain: dispatching next chunk ${nxt.from} → ${nxt.to} (final ${FINAL})`);
    await ghReq('POST', `/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      { ref: GITHUB_BRANCH, inputs: { from_height: String(nxt.from), final_height: String(FINAL) } });
    console.log('self-chain: dispatched.');
  } else if (FINAL) {
    console.log(`🏁 FINAL_HEIGHT ${FINAL} reached — the walk is COMPLETE.`);
  }
})().catch(e => { console.error('FATAL:', e && e.message); process.exit(1); });

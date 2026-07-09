#!/usr/bin/env node
// =============================================================================
// retained-gap-fill — self-resuming harvest of the public-node retained
// window that predates the walker's start: [retention floor → walker start].
//
// TIME-SENSITIVE: the floor advances ~14.4k blocks/day; every idle day loses
// a day of recoverable LP history. Probed 2026-07-09: publicnode floor =
// 21,578,506 (~June 21); walker bootstrapped at 21,729,806 (July 2).
//
// Runs as a GitHub Action (workflow: tla-flows-gap-fill.yml) on a 4-hour
// schedule + manual dispatch. Each run: read its own cursor → walk up to
// BLOCK_BUDGET blocks using the walker's exact primitives (block +
// block_results, SHA-256 txhash, watched-contract gate, BYTE-IDENTICAL
// <<FLOWS CLASSIFIER v1>>) → merge into tla-flows/events months (dedupe,
// never-shrink, 409-retry) → advance cursor. When the target is reached it
// updates the index known_gap (key fcd-freeze-to-forward-capture) to a CLOSED
// right edge = the floor it actually achieved, marks itself done, and every
// later scheduled run exits in seconds (then delete the schedule at leisure).
//
// First run self-calibrates: binary-searches the CURRENT floor (it may have
// advanced past the probed value) and pins target_from there — capture starts
// at the oldest block still alive. Overlap with the walker's first window is
// harmless (txhash dedupe).
// =============================================================================
'use strict';
const https = require('https');
const crypto = require('crypto');

const RPC_PRIMARY  = process.env.RPC_PRIMARY  || 'https://terra-rpc.publicnode.com';
const RPC_FALLBACK = process.env.RPC_FALLBACK || 'https://terra-rpc.polkachu.com';
const GITHUB_REPO = process.env.GITHUB_REPO || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OUT_DIR = 'tla-flows/events';
const STATE_PATH = `${OUT_DIR}/gapfill-state.json`;
const BLOCK_BUDGET = Number(process.env.GAPFILL_BLOCK_BUDGET || 30000);
const CONC = Number(process.env.WALK_CONCURRENCY || 3);
const TARGET_TO_DEFAULT = 21730500;   // walker bootstrap start (21,729,806) + overlap buffer
const PROBED_FLOOR_HINT = 21578506;   // 2026-07-09 probe — calibration seed only

// Six watched contracts — inlined from platform-crons/config/contracts.js
// (Actions checkout of tla-core has no platform-crons; keep in sync via
// address-catalog once the Phase-2 registry lands).
const WATCH = {
  'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx': 'compounder',
  'terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq': 'staking-stable',
  'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa': 'staking-project',
  'terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv': 'staking-bluechip',
  'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k': 'staking-single',
  'terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl': 'zapper',
};

function fail(m){ console.error('FAIL: '+m); process.exit(1); }
const assert = (c,m)=>{ if(!c) fail(m); };
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

const T = { httpGet: realHttpGet, ghReq: realGhReq, now: () => new Date() };
function realHttpGet(url, t = 20000) {
  return new Promise((res, rej) => {
    const r = https.get(url, { headers: { Accept: 'application/json', 'User-Agent': 'tla-flows-gapfill' } }, (x) => {
      let b = ''; x.on('data', c => b += c); x.on('end', () => { clearTimeout(dl);
        if (x.statusCode >= 200 && x.statusCode < 300) { try { res(JSON.parse(b)); } catch { rej(new Error('bad JSON')); } }
        else rej(new Error(`HTTP ${x.statusCode} ${b.slice(0,120)}`)); });
    });
    r.on('error', (e)=>{ clearTimeout(dl); rej(e); });
    r.setTimeout(t, () => r.destroy(new Error('idle-timeout')));
    const dl = setTimeout(() => r.destroy(new Error('deadline')), t*2); if (dl.unref) dl.unref();
  });
}
async function rpcGet(p, label) {
  let last;
  for (let a=1; a<=3; a++) {
    try { return await T.httpGet(RPC_PRIMARY+p); } catch(e){ last=e; }
    try { return await T.httpGet(RPC_FALLBACK+p); } catch(e){ last=e; }
    await sleep(400*a);
  }
  throw new Error(`${label}: RPC failed (${last && last.message})`);
}
const PRUNED = Symbol('pruned');
const isPruned = (x)=>/not available|lowest height|pruned/i.test(String(x && x.message || (x && JSON.stringify(x)) || x));
async function getBlock(N) {
  let r; try { r = await rpcGet(`/block?height=${N}`, `block ${N}`); } catch(e){ if (isPruned(e)) return PRUNED; throw e; }
  if (r.error) { if (isPruned(r.error)) return PRUNED; throw new Error(`block ${N}: ${JSON.stringify(r.error).slice(0,120)}`); }
  if (!r.result || !r.result.block) return PRUNED; // polkachu-style null block
  const b = r.result.block;
  return { time: String(b.header.time).slice(0,19)+'Z', txsB64: b.data.txs || [] };
}
async function getResults(N) {
  const r = await rpcGet(`/block_results?height=${N}`, `results ${N}`);
  if (r.error) throw new Error(`results ${N}: ${JSON.stringify(r.error).slice(0,120)}`);
  return r.result.txs_results || [];
}
const txHashOf = (b64)=>crypto.createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex').toUpperCase();
function touchesWatched(events){ for (const e of events||[]){ if (e.type!=='wasm') continue; for (const a of e.attributes||[]) if (a.key==='_contract_address' && WATCH[a.value]) return true; } return false; }

// =============================================================================
// SHARED CLASSIFIER — this section must stay BYTE-IDENTICAL with the copy in
// tla-core/.github/scripts/tla-flows/ (the flows-fill derive). Any drift must
// show in a plain diff. Marker: <<FLOWS CLASSIFIER v1>>
// =============================================================================
// Rev A.3 parser, verified 42/42 on a live compounder tx_search dump + 8
// hand-captured chainscope variations. Routes on the FIRST flow action so a
// user-facing flow keeps the real user even when the compounder cascades a
// second action under its own address. code!==0 txs are skipped (failed txs
// appear in FCD-sourced fills and on some SDK indexers).

function flowsAttrs(ev) { const o = {}; for (const a of (ev.attributes || [])) if (!(a.key in o)) o[a.key] = a.value; return o; }
function flowsEventsOf(txr) {
  if (Array.isArray(txr.events) && txr.events.length) return txr.events;
  const out = []; for (const log of (txr.logs || [])) for (const e of (log.events || [])) out.push(e); return out;
}
function classifyFlowTx(txr) {
  if (Number(txr.code || 0) !== 0) return null;
  const wasm = flowsEventsOf(txr).filter(e => e.type === 'wasm').map(flowsAttrs);
  let flow = null;
  for (const w of wasm) {
    const act = w.action;
    if (act === 'asset-compounding/stake')        flow = { type: 'deposit',  mechanism: 'amplified',     user: w.user, amount: w.bond_share_adjusted || w.bond_share, unit: 'amplp' };
    else if (act === 'asset-compounding/unstake') flow = { type: 'withdraw', mechanism: 'amplified',     user: w.user, amount: (w.returned || '').split(':').pop(), unit: 'lp' };
    else if (act === 'asset/stake')               flow = { type: 'deposit',  mechanism: 'non_amplified', user: w.user, amount: w.share, unit: 'shares' };
    else if (act === 'asset/unstake')             flow = { type: 'withdraw', mechanism: 'non_amplified', user: w.user, amount: w.share, unit: 'shares' };
    if (flow) break;
  }
  if (!flow) {
    const c = wasm.find(w => /claim/i.test(w.action || ''));
    if (c) flow = { type: 'claim', mechanism: null, user: c.user || c.sender, amount: null, unit: 'rewards' };
  }
  if (!flow) return null;
  const viaZap = wasm.some(w => w.action === 'zapper/create_lp' || w.action === 'zapper/withdraw_lp');
  const cost = flowsExtractCost(wasm);
  return { schemaVersion: 1, txhash: txr.txhash, height: Number(txr.height), timestamp: txr.timestamp,
           type: flow.type, mechanism: flow.mechanism, via_zap: viaZap, user: flow.user || null,
           amount: flow.amount || null, amount_unit: flow.unit, cost,
           raw_actions: [...new Set(wasm.map(w => w.action).filter(Boolean))] };
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
// ============================================================== <<FLOWS CLASSIFIER v1>> END

// ---------------------------------------------------------------- GitHub plumbing (same as flows-fill)
function realGhReq(method, apiPath, body, accept) {
  return new Promise((resolve, reject) => {
    const opts = { hostname:'api.github.com', path:apiPath, method, headers:{ 'User-Agent':'tla-flows-gapfill', 'Authorization':`Bearer ${GITHUB_TOKEN}`, 'Accept': accept||'application/vnd.github+json' } };
    if (body) opts.headers['Content-Type']='application/json';
    const req = https.request(opts, res=>{ let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ if(res.statusCode>=200&&res.statusCode<300){ try{resolve(JSON.parse(d));}catch{resolve(d);} } else { const e=new Error(`GitHub ${method} ${apiPath}: ${res.statusCode} ${d.slice(0,160)}`); e.statusCode=res.statusCode; reject(e);} }); });
    req.on('error',reject); if(body) req.write(JSON.stringify(body)); req.end();
  });
}
// READS use the raw media type — the Contents API returns EMPTY content for
// files >1MB (hit live 2026-07-09 when 2026/06.json crossed it). Raw has no
// size limit. Writes fetch sha via plain GET and never parse content.
async function getJson(p){ try{ const d=await T.ghReq('GET',`/repos/${GITHUB_REPO}/contents/${p}?ref=${GITHUB_BRANCH}`,null,'application/vnd.github.raw'); return { data: typeof d==='string'? JSON.parse(d) : d }; } catch(e){ if(e.statusCode===404) return {data:null}; throw e; } }
async function getSha(p){ try{ const r=await T.ghReq('GET',`/repos/${GITHUB_REPO}/contents/${p}?ref=${GITHUB_BRANCH}`); return r.sha||null; } catch(e){ if(e.statusCode===404) return null; throw e; } }
async function putJson(p,obj,msg,pretty){ const content=(pretty?JSON.stringify(obj,null,2):JSON.stringify(obj))+'\n';
  for(let a=1;a<=4;a++){ const sha=await getSha(p).catch(()=>null); const body={message:msg,content:Buffer.from(content).toString('base64'),branch:GITHUB_BRANCH}; if(sha) body.sha=sha;
    try{ return await T.ghReq('PUT',`/repos/${GITHUB_REPO}/contents/${p}`,body); }catch(e){ if(e.statusCode===409&&a<4){ await sleep(500*a); continue; } throw e; } } }
function mergeMonth(existing, incoming){ const m=new Map(); for(const r of existing) m.set(r.txhash,r); let added=0; for(const r of incoming) if(!m.has(r.txhash)){ m.set(r.txhash,r); added++; } return { merged:[...m.values()].sort((a,b)=>a.height-b.height||(a.txhash<b.txhash?-1:1)), added }; }
const monthKey=(ts)=>{ const [Y,M]=String(ts).slice(0,7).split('-'); return `${Y}/${M}`; };

// Find the true lowest available block. Probes downward exponentially from
// an available anchor (the original calibration only searched upward — it
// stopped at the first available probe and missed deeper fallback-node
// retention, observed live 2026-07-09 when polkachu went 20k+ blocks below
// publicnode's advertised floor).
async function findFloor(seed, ceiling) {
  let anchor;
  if ((await getBlock(seed)) === PRUNED) {
    let lo = seed + 1, hi = ceiling, floor = ceiling;          // upward binary search
    while (lo <= hi) { const mid = Math.floor((lo + hi) / 2);
      if ((await getBlock(mid)) === PRUNED) lo = mid + 1; else { floor = mid; hi = mid - 1; } }
    return floor;
  }
  anchor = seed;
  let step = 20000;
  while (anchor - step >= 1) {                                  // exponential descent
    if ((await getBlock(anchor - step)) === PRUNED) {
      let lo = anchor - step + 1, hi = anchor, floor = anchor;  // binary search the edge
      while (lo <= hi) { const mid = Math.floor((lo + hi) / 2);
        if ((await getBlock(mid)) === PRUNED) lo = mid + 1; else { floor = mid; hi = mid - 1; } }
      return floor;
    }
    anchor -= step; step *= 2;
  }
  return 1;
}

async function main() {
  assert(GITHUB_TOKEN, 'GITHUB_TOKEN missing');
  // ---- state
  let { data: st } = await getJson(STATE_PATH);
  if (st && st.done) {
    if (process.env.GAPFILL_DEEPEN !== '1') { console.log(`gap-fill DONE (floor achieved: ${st.target_from}) — nothing to do (dispatch with deepen=true to probe for deeper retention)`); return; }
    console.log(`DEEPEN: probing below achieved floor ${st.target_from}…`);
    const deeper = await findFloor(st.target_from - 1, st.target_from);
    if (deeper >= st.target_from) { console.log('no deeper history available — floors match, nothing to deepen'); return; }
    console.log(`deeper retention found: ${deeper} (${st.target_from - deeper} more blocks ≈ ${Math.round((st.target_from - deeper)/14400*10)/10} days)`);
    st = { target_from: deeper, target_to: st.target_from - 1, next: deeper, done: false,
           started_at: new Date().toISOString(), runs: 0, events_total: 0,
           deepen_of: st.target_from, prior_events_total: st.events_total };
    await putJson(STATE_PATH, st, `gapfill: DEEPEN extension [${deeper} → ${st.target_to}]`, true);
  }
  if (!st) {
    // first run: calibrate the CURRENT floor by binary search seeded at the probe
    console.log('first run: calibrating current retention floor (bidirectional)…');
    const floor = await findFloor(PROBED_FLOOR_HINT - 20000, TARGET_TO_DEFAULT);
    st = { target_from: floor, target_to: TARGET_TO_DEFAULT, next: floor, done: false, started_at: new Date().toISOString(), runs: 0, events_total: 0 };
    console.log(`calibrated: floor=${floor} (~${Math.round((TARGET_TO_DEFAULT-floor)/14400)} days recoverable) → target [${floor} → ${TARGET_TO_DEFAULT}]`);
    await putJson(STATE_PATH, st, `gapfill: calibrated floor ${floor}`, true);
  }

  // ---- walk this run's slice
  const from = st.next, to = Math.min(st.target_to, from + BLOCK_BUDGET - 1);
  console.log(`walking [${from} → ${to}] (${st.target_to - from + 1} blocks remain overall)`);
  const records = [];
  let N = from; const inFlight = new Map();
  const launch = (h)=>{ if (h<=to && !inFlight.has(h)) inFlight.set(h, getBlock(h)); };
  for (let h=N; h<N+CONC && h<=to; h++) launch(h);
  let lastLog = Date.now();
  while (N <= to) {
    let blk;
    try { blk = await inFlight.get(N); } catch(e){ throw Object.assign(e,{atBlock:N}); }
    inFlight.delete(N);
    if (blk === PRUNED) {
      // the floor moved past us mid-harvest — those blocks are gone; note and skip forward honestly
      console.warn(`  ⚠ block ${N} pruned mid-harvest — floor advanced; recording sub-gap`);
      st.pruned_subgaps = st.pruned_subgaps || [];
      let M = N; while (M <= to && (await getBlock(M)) === PRUNED) M += 1000; // coarse skip
      st.pruned_subgaps.push({ from_height: N, to_height_approx: Math.min(M, to) });
      N = M; for (let h=N; h<N+CONC && h<=to; h++) launch(h);
      continue;
    }
    if (blk.txsB64.length) {
      const results = await getResults(N);
      for (let i=0;i<blk.txsB64.length;i++){ const res=results[i]; if(!res) continue;
        if (!touchesWatched(res.events)) continue;
        const rec = classifyFlowTx({ txhash: txHashOf(blk.txsB64[i]), height: N, timestamp: blk.time, code: res.code||0, events: res.events });
        if (rec) records.push(rec);
      }
    }
    if (Date.now()-lastLog>20000){ console.log(`  at ${N} (${to-N} to go this run, ${records.length} flows)`); lastLog=Date.now(); }
    N++; launch(N+CONC-1);
  }
  records.sort((a,b)=>a.height-b.height||(a.txhash<b.txhash?-1:1));
  console.log(`slice done: ${records.length} flows in [${from}–${to}]`);

  // ---- publish months (merge rules), then state, then (maybe) close the gap
  const byMonth = {}; for (const r of records) (byMonth[monthKey(r.timestamp)] ||= []).push(r);
  let published = 0;
  for (const mk of Object.keys(byMonth).sort()) {
    const p = `${OUT_DIR}/${mk}.json`;
    const { data: existing } = await getJson(p);
    const base = Array.isArray(existing) ? existing : [];
    const { merged, added } = mergeMonth(base, byMonth[mk]);
    assert(merged.length >= base.length, `never-shrink ${mk}`);
    if (!added) { console.log(`  ${mk}: all duplicates — skip`); continue; }
    await putJson(p, merged, `gapfill ${mk}: +${added} (${merged.length} total)`);
    published += added; console.log(`  ${mk}: +${added} → ${merged.length}`);
  }
  // index totals
  if (published) {
    const { data: idx } = await getJson(`${OUT_DIR}/index.json`);
    if (idx) {
      idx.total_events = (idx.total_events||0) + published;
      const bt = {}; for (const r of records) bt[r.type]=(bt[r.type]||0)+1;
      for (const k in bt) idx.by_type[k]=(idx.by_type[k]||0)+bt[k];
      for (const mk of Object.keys(byMonth)) { const [Y,M]=mk.split('/'); (idx.months_present[Y] ||= []).includes(M)||idx.months_present[Y].push(M); idx.months_present[Y].sort(); }
      const f = records[0] && records[0].timestamp.slice(0,10);
      if (f && (!idx.first_date || f < idx.first_date)) { /* fill months predate? no — gap months sit after 2025/01; leave first_date */ }
      idx.updatedAt = new Date().toISOString();
      await putJson(`${OUT_DIR}/index.json`, idx, `gapfill: index +${published}`, true);
    }
  }
  st.next = to + 1; st.runs = (st.runs||0)+1; st.events_total = (st.events_total||0) + published;
  if (st.next > st.target_to) {
    st.done = true; st.finished_at = new Date().toISOString();
    // close the honest gap's right edge in the index
    const { data: idx } = await getJson(`${OUT_DIR}/index.json`);
    if (idx && Array.isArray(idx.known_gaps)) {
      const g = idx.known_gaps.find(x=>x.key==='fcd-freeze-to-forward-capture');
      if (g) { g.to_height = st.target_from - 1; g.to_note = `CLOSED to public-node retention on ${st.finished_at.slice(0,10)}: gap now ends where retained blocks began (${st.target_from}); remaining span requires archive node (Batch 5)`; }
      if (st.pruned_subgaps) idx.known_gaps.push(...st.pruned_subgaps.map(s=>({ ...s, reason:'floor advanced during gap-fill', recorded_at: st.finished_at })));
      idx.updatedAt = new Date().toISOString();
      await putJson(`${OUT_DIR}/index.json`, idx, 'gapfill COMPLETE: gap right edge closed to retention floor', true);
    }
    console.log(`\n🏁 GAP-FILL COMPLETE — ${st.events_total} events recovered from the retained window; remove/disable the schedule at leisure (further runs no-op).`);
  }
  await putJson(STATE_PATH, st, st.done ? 'gapfill: DONE' : `gapfill: cursor → ${st.next}`, true);
  console.log(`✅ run complete: +${published} events · cursor ${st.next}${st.done ? ' · DONE' : ` · ~${Math.ceil((st.target_to-st.next+1)/BLOCK_BUDGET)} runs remain`}`);
}
if (require.main === module) main().catch(e=>{ console.error('FATAL', e.atBlock?`@block ${e.atBlock}`:'', e.message); process.exit(1); });
module.exports = { main, T, classifyFlowTx, touchesWatched, txHashOf, WATCH };

#!/usr/bin/env node
'use strict';
// dex-state-history PROBE — READ-ONLY, one-off (2026-08-26).
//
// Purpose: prove, at a few TLA epoch boundaries, that the archive node answers
// height-parameterized STATE queries for every pool that ever appears in
// tla-flows/events — pair reserves + LP total supply, the asset-compounder's
// LP↔amplp totals (the amplified exchange rate), the 4 TLA staking buckets and
// the 5 LST hubs. The probe writes nothing to the repo; its JSON artifact is
// the fixture for the state-history duty (SPEC-dex-state-history, to follow).
//
// ARCHIVE DISCIPLINE (binding — PLAN-genesis-walk):
//   · endpoint from env only (ARCHIVE_LCD preferred, else ARCHIVE_RPC); never
//     printed — every log line and error message passes through mask().
//   · SERIAL requests with REQ_DELAY_MS spacing (default 150ms) — well under
//     the ≤5-in-flight law; 4 attempts with growing backoff on transient
//     failures (lifted from tla-flows/archive-walk.js rpc()).
//   · heights come from the COMMITTED event corpus (119K height↔time anchors),
//     refined with at most REFINE_MAX block reads per epoch — the archive is
//     never used to search for a height.
//   · public LCD is used ONLY for one immutable fact: the minter (pair) of a
//     cw20 LP token the snapshot doesn't name. Never for state.
//
// Inputs (env): ARCHIVE_LCD | ARCHIVE_RPC (one required), EPOCHS ("100,150,199"),
//   REQ_DELAY_MS (150), REFINE_MAX (8), PUBLIC_LCD (terra-lcd.publicnode.com).
// Output: dex-state-history-probe.json (artifact) + a one-screen summary.

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ARCHIVE_LCD = String(process.env.ARCHIVE_LCD || '').replace(/\/+$/, '');
const ARCHIVE_RPC = String(process.env.ARCHIVE_RPC || '').replace(/\/+$/, '');
const PUBLIC_LCD  = String(process.env.PUBLIC_LCD || 'https://terra-lcd.publicnode.com').replace(/\/+$/, '');
const EPOCHS      = String(process.env.EPOCHS || '100,150,199').split(',').map(s => Number(s.trim())).filter(Number.isFinite);
const REQ_DELAY   = Number(process.env.REQ_DELAY_MS || 150);
const REFINE_MAX  = Number(process.env.REFINE_MAX || 8);
const ROOT        = process.env.CORE_DIR || process.cwd();
const OUT         = process.env.OUT_FILE || 'dex-state-history-probe.json';

// ── Contract set (single source: platform-crons config/contracts.js, copied verbatim) ──
const COMPOUNDER = 'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx';
const DAO_MAIN   = 'terra1sffd4efk2jpdt894r04qwmtjqrrjfc52tmj6vkzjxqhd8qqu2drs3m5vzm'; // any addr works for user_infos totals
const STAKING = {
  stable:   'terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq',
  project:  'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa',
  bluechip: 'terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv',
  single:   'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k',
};
const LST_HUBS = {
  ampLUNA: { hub: 'terra10788fkzah89xrdm27zkj5yvhj9x3494lxawzm5qq3vvxcqz2yzaqyd3enk', query: { exchange_rates: {} }, kind: 'exchange_rates_array' },
  arbLUNA: { hub: 'terra1r9gls56glvuc4jedsvc3uwh6vj95mqm9efc7hnweqxa2nlme5cyqxygy5m', query: { state: {} }, kind: 'state' },
  ampROAR: { hub: 'terra1vklefn7n6cchn0u962w3gaszr4vf52wjvd4y95t2sydwpmpdtszsqvk9wy', query: { state: {} }, kind: 'state' },
  ampCAPA: { hub: 'terra186rpfczl7l2kugdsqqedegl4es4hp624phfc7ddy8my02a4e8lgq5rlx7y', query: { state: {} }, kind: 'state' },
  bLUNA:   { hub: 'terra1l2nd99yze5fszmhl5svyh5fky9wm4nz4etlgnztfu4e8809gd52q04n3ea', query: { state: {} }, kind: 'state' },
};

// ── Masking: the endpoint never reaches a log line ─────────────────────────
const SECRETS = [ARCHIVE_LCD, ARCHIVE_RPC].filter(Boolean).flatMap(s => { try { const u = new URL(s); return [s, u.host]; } catch { return [s]; } });
function mask(s) { s = String(s == null ? '' : s); for (const x of SECRETS) if (x) s = s.split(x).join('[ARCHIVE]'); return s; }
function log(...a) { console.log(...a.map(mask)); }
function fail(m) { console.error('FATAL: ' + mask(m)); process.exit(1); }
if (!ARCHIVE_LCD && !ARCHIVE_RPC) fail('set repo secret ARCHIVE_LCD (cosmos REST, preferred) or ARCHIVE_RPC (Tendermint 26657)');
const TRANSPORT = ARCHIVE_LCD ? 'lcd' : 'rpc';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── HTTP (lifted from archive-walk.js httpGet: redirects, idle + hard deadline) ──
function httpGet(url, headers = {}, t = 25000, hops = 0) {
  return new Promise((res, rej) => {
    const mod = url.startsWith('http:') ? http : https;
    const r = mod.get(url, { headers: { Accept: 'application/json', 'User-Agent': 'tla-dex-state-probe/1.0', ...headers } }, (x) => {
      if (x.statusCode >= 301 && x.statusCode <= 308 && x.headers.location && hops < 3) {
        x.resume(); clearTimeout(dl);
        return httpGet(new URL(x.headers.location, url).toString(), headers, t, hops + 1).then(res, rej);
      }
      let b = ''; x.on('data', c => b += c); x.on('end', () => { clearTimeout(dl);
        if (x.statusCode >= 200 && x.statusCode < 300) { try { res(JSON.parse(b)); } catch { rej(Object.assign(new Error('bad JSON'), { statusCode: x.statusCode })); } }
        else rej(Object.assign(new Error(`HTTP ${x.statusCode} ${b.slice(0, 160)}`), { statusCode: x.statusCode, body: b.slice(0, 400) })); });
    });
    r.on('error', (e) => { clearTimeout(dl); rej(e); });
    r.setTimeout(t, () => r.destroy(new Error('idle-timeout')));
    const dl = setTimeout(() => r.destroy(new Error('deadline')), t * 2); if (dl.unref) dl.unref();
  });
}
const STATS = { archive_requests: 0, archive_retries: 0, public_requests: 0, started: Date.now() };
const BREAKER_MAX = Number(process.env.BREAKER_MAX || 5); let netFailStreak = 0;
function breaker(ok) { if (ok) { netFailStreak = 0; return; } if (++netFailStreak >= BREAKER_MAX) fail(`${BREAKER_MAX} consecutive transport failures — stopping rather than hammering a node that is not answering`); }
async function archiveGet(url, headers) {
  let last;
  for (let a = 1; a <= 4; a++) {
    STATS.archive_requests++;
    try { const r = await httpGet(url, headers); await sleep(REQ_DELAY); return r; }
    catch (e) {
      last = e;
      // Definitive answers are never retried: any 4xx that is not a rate limit, AND a 5xx whose body
      // is the chain answering (cosmos REST wraps wasm errors — "no such contract", "failed to load
      // state" — in HTTP 500). Retrying those only spends the node's patience (probe run #1: 22 absent
      // pools × 4 attempts at epoch 100).
      const sc = e.statusCode;
      const chainAnswer = /codespace|no such contract|not found|failed to load state|version does not exist|Error parsing|unknown variant/i.test(e.body || e.message || '');
      if (sc && sc !== 429 && !(sc === 403 && /rate/i.test(e.message)) && (sc < 500 || chainAnswer)) { e.chainAnswer = chainAnswer || sc < 500; throw e; }
      STATS.archive_retries++; await sleep(400 * a * a);
    }
  }
  throw last;
}

// ── Protobuf (only what abci_query SmartContractState needs) ──────────────
function varint(n) { const o = []; while (n > 127) { o.push((n & 127) | 128); n >>>= 7; } o.push(n); return Buffer.from(o); }
function pbBytes(field, buf) { return Buffer.concat([Buffer.from([(field << 3) | 2]), varint(buf.length), buf]); }
function encodeSmartReq(addr, queryObj) { return Buffer.concat([pbBytes(1, Buffer.from(addr, 'utf8')), pbBytes(2, Buffer.from(JSON.stringify(queryObj), 'utf8'))]); }
function decodeSmartResp(b64) { // QuerySmartContractStateResponse { bytes data = 1 }
  const b = Buffer.from(b64, 'base64'); if (!b.length) return null;
  let i = 0; if (b[i++] !== 0x0a) throw new Error('unexpected proto tag ' + b[0]);
  let len = 0, shift = 0; for (;;) { const c = b[i++]; len |= (c & 127) << shift; if (!(c & 128)) break; shift += 7; }
  return JSON.parse(b.slice(i, i + len).toString('utf8'));
}

// ── Smart query at height — one function, two transports ──────────────────
// Returns { ok:true, data } | { ok:false, class, msg }. Classes:
//   'absent'  — contract did not exist at that height (expected for pools born later)
//   'depth'   — node has no state for that height (archive depth / pruned)
//   'query'   — contract rejected the message (wrong shape for that code version)
//   'net'     — transport failure after retries
async function smartAt(addr, queryObj, height) {
  try {
    if (TRANSPORT === 'lcd') {
      const q = encodeURIComponent(Buffer.from(JSON.stringify(queryObj)).toString('base64'));
      const r = await archiveGet(`${ARCHIVE_LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${q}`, { 'x-cosmos-block-height': String(height) });
      breaker(true); return { ok: true, data: r.data };
    }
    const data = '0x' + encodeSmartReq(addr, queryObj).toString('hex');
    const r = await archiveGet(`${ARCHIVE_RPC}/abci_query?path=${encodeURIComponent('"/cosmwasm.wasm.v1.Query/SmartContractState"')}&data=${data}&height=${height}&prove=false`);
    const resp = r && r.result && r.result.response;
    if (!resp) { breaker(false); return { ok: false, class: 'net', msg: 'no response object' }; }
    breaker(true);
    if (Number(resp.code) !== 0) return { ok: false, ...classify(resp.log || resp.info || `code ${resp.code}`) };
    return { ok: true, data: decodeSmartResp(resp.value) };
  } catch (e) {
    const body = (e.body || e.message || '');
    if (e.chainAnswer) { breaker(true); return { ok: false, ...classify(body) }; }
    breaker(false); return { ok: false, class: 'net', msg: mask(e.message).slice(0, 160) };
  }
}
function classify(text) {
  const t = String(text);
  // depth first: "failed to load state at height N; version does not exist" must never read as a missing contract
  if (/failed to load state|height .*not available|pruned|no version|version does not exist|invalid height|cannot query with height|lowest height|is not available/i.test(t)) return { class: 'depth', msg: t.slice(0, 160) };
  if (/no such contract|contract: not found|not found: contract|unknown contract|contract not found|address .* not found/i.test(t)) return { class: 'absent', msg: t.slice(0, 160) };
  if (/error parsing|unknown variant|missing field|Error parsing into type|query wasm contract failed/i.test(t)) return { class: 'query', msg: t.slice(0, 160) };
  return { class: 'query', msg: t.slice(0, 160) };
}

// ── Block time at height (for boundary refinement) ────────────────────────
async function blockTime(height) {
  if (TRANSPORT === 'lcd') { const r = await archiveGet(`${ARCHIVE_LCD}/cosmos/base/tendermint/v1beta1/blocks/${height}`); return r.block.header.time; }
  const r = await archiveGet(`${ARCHIVE_RPC}/block?height=${height}`); return r.result.block.header.time;
}
const ms = (iso) => Date.parse(iso);

// ── Load committed inputs ─────────────────────────────────────────────────
function rj(p) { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); }
const epochTable = rj('docs/epoch_1-300_date.json');
const snapshot   = rj('member-data/tla-snapshot/current.json');

log('loading tla-flows/events (height↔time anchors + pool set)…');
const anchors = []; const poolSeen = new Map();
const evRoot = path.join(ROOT, 'tla-flows/events');
for (const y of fs.readdirSync(evRoot).filter(d => /^\d{4}$/.test(d)).sort()) {
  for (const f of fs.readdirSync(path.join(evRoot, y)).filter(x => /^\d{2}\.json$/.test(x)).sort()) {
    const arr = JSON.parse(fs.readFileSync(path.join(evRoot, y, f), 'utf8'));
    for (const e of arr) {
      if (e.height && e.timestamp) anchors.push([ms(e.timestamp), Number(e.height)]);
      if (e.pool) { const s = poolSeen.get(e.pool) || { n: 0, first: e.timestamp, last: e.timestamp }; s.n++; if (e.timestamp < s.first) s.first = e.timestamp; if (e.timestamp > s.last) s.last = e.timestamp; poolSeen.set(e.pool, s); }
    }
  }
}
anchors.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
log(`  ${anchors.length} anchors, ${poolSeen.size} distinct pools in events`);

// ── Pool set → what to query ──────────────────────────────────────────────
const lpToPair = new Map();  // cw20 lp → { pair, name, dex, bucket }
const pairMeta = new Map();
for (const p of snapshot.pools || []) {
  if (p.lp_address && p.pool_address) lpToPair.set(p.lp_address, { pair: p.pool_address, name: p.name, dex: p.dex, bucket: p.bucket });
  if (p.pool_address) pairMeta.set(p.pool_address, { name: p.name, dex: p.dex, bucket: p.bucket });
}
async function minterOf(lp) { // immutable fact; public LCD; not the archive
  STATS.public_requests++;
  const q = encodeURIComponent(Buffer.from(JSON.stringify({ minter: {} })).toString('base64'));
  try { const r = await httpGet(`${PUBLIC_LCD}/cosmwasm/wasm/v1/contract/${lp}/smart/${q}`); await sleep(REQ_DELAY); return r.data && r.data.minter || null; }
  catch (e) { return null; }
}
const targets = []; // { key, kind:'pair'|'single', pair, lp, name, dex, bucket, events }
async function buildTargets() {
for (const [key, seen] of poolSeen) {
  const base = { key, events: seen.n, first: seen.first, last: seen.last };
  if (key.startsWith('cw20:')) {
    const lp = key.slice(5); const m = lpToPair.get(lp);
    if (m) targets.push({ ...base, kind: 'pair', lp, pair: m.pair, name: m.name, dex: m.dex, bucket: m.bucket, pair_via: 'snapshot' });
    else { const pair = await minterOf(lp); const pm = pair && pairMeta.get(pair);
      targets.push(pair ? { ...base, kind: 'pair', lp, pair, name: pm ? pm.name : null, dex: pm ? pm.dex : null, bucket: pm ? pm.bucket : null, pair_via: 'lcd_minter' }
                        : { ...base, kind: 'unresolved', lp, pair: null, name: null, dex: null, bucket: null, pair_via: null }); }
  } else if (/^native:factory\/(terra1[0-9a-z]+)\/uLP$/.test(key)) {
    const pair = key.match(/^native:factory\/(terra1[0-9a-z]+)\/uLP$/)[1]; const pm = pairMeta.get(pair);
    targets.push({ ...base, kind: 'pair', lp: key.slice(7), pair, name: pm ? pm.name : null, dex: pm ? pm.dex : 'Skeleton Swap', bucket: pm ? pm.bucket : null, pair_via: 'factory_denom' });
  } else {
    targets.push({ ...base, kind: 'single', lp: key.slice(7), pair: null, name: (snapshot.pools || []).find(p => p.gauge_pool_id === key)?.name || null, dex: null, bucket: null, pair_via: null });
  }
}
targets.sort((a, b) => b.events - a.events);
pairs = targets.filter(t => t.kind === 'pair');
log(`  ${pairs.length} pairs to sample (${pairs.filter(t => t.pair_via === 'lcd_minter').length} resolved via minter), ${targets.filter(t => t.kind === 'single').length} singles, ${targets.filter(t => t.kind === 'unresolved').length} unresolved`);
}
let pairs = [];

// ── Epoch boundary → height ───────────────────────────────────────────────
function bracket(tMs) { // last anchor ≤ t, first anchor > t
  let lo = 0, hi = anchors.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (anchors[m][0] <= tMs) { i = m; lo = m + 1; } else hi = m - 1; }
  return { before: i >= 0 ? anchors[i] : null, after: i + 1 < anchors.length ? anchors[i + 1] : null };
}
async function resolveHeight(epoch) {
  const row = epochTable.find(r => r.epoch === epoch); if (!row) return { epoch, error: 'epoch not in docs/epoch_1-300_date.json' };
  const T = ms(row.start_time); const { before, after } = bracket(T);
  if (!before || !after) return { epoch, start_time: row.start_time, error: 'outside anchor corpus' };
  let lo = [before[1], before[0]], hi = [after[1], after[0]]; let reads = 0; // [height, timeMs]
  // secant-ish refinement: stop when hi-lo ≤ 1 block or reads exhausted; state is taken at lo (the last block ≤ T)
  while (hi[0] - lo[0] > 1 && reads < REFINE_MAX) {
    const frac = (T - lo[1]) / Math.max(1, hi[1] - lo[1]);
    let guess = Math.round(lo[0] + (hi[0] - lo[0]) * Math.min(0.95, Math.max(0.05, frac)));
    if (guess <= lo[0]) guess = lo[0] + 1; if (guess >= hi[0]) guess = hi[0] - 1;
    let t; try { t = ms(await blockTime(guess)); reads++; } catch (e) { return { epoch, start_time: row.start_time, height: lo[0], height_time: new Date(lo[1]).toISOString(), delta_sec: Math.round((T - lo[1]) / 1000), block_reads: reads, note: 'refine aborted: ' + mask(e.message).slice(0, 80) }; }
    if (t <= T) lo = [guess, t]; else hi = [guess, t];
  }
  return { epoch, start_time: row.start_time, height: lo[0], height_time: new Date(lo[1]).toISOString(), delta_sec: Math.round((T - lo[1]) / 1000), block_reads: reads, bracket_blocks: hi[0] - lo[0] };
}

// ── Sample one height ─────────────────────────────────────────────────────
function num(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }
async function sampleHeight(h) {
  const out = { height: h, pairs: {}, compounder: null, staking: {}, lst_hubs: {}, tally: { pair_ok: 0, absent: 0, depth: 0, query: 0, net: 0 } };
  for (const t of pairs) {
    const r = await smartAt(t.pair, { pool: {} }, h);
    if (r.ok) {
      const d = r.data || {};
      out.pairs[t.key] = { ok: true, assets: (d.assets || []).map(a => ({ info: a.info, amount: a.amount })), total_share: d.total_share ?? null, raw_keys: Object.keys(d) };
      out.tally.pair_ok++;
    } else { out.pairs[t.key] = { ok: false, class: r.class, msg: r.msg }; out.tally[r.class] = (out.tally[r.class] || 0) + 1; }
  }
  // asset-compounder: asset_configs (which assets exist at h) → user_infos totals per gauge
  const cfg = await smartAt(COMPOUNDER, { asset_configs: {} }, h);
  if (cfg.ok && Array.isArray(cfg.data)) {
    const byGauge = {}; for (const c of cfg.data) (byGauge[c.gauge] = byGauge[c.gauge] || []).push(c.asset_info);
    const rates = {}; let errs = [];
    for (const [g, infos] of Object.entries(byGauge)) {
      const assets = infos.map(i => [g, i]);
      const r = await smartAt(COMPOUNDER, { user_infos: { addr: DAO_MAIN, assets } }, h);
      if (!r.ok) { errs.push({ gauge: g, class: r.class, msg: r.msg }); continue; }
      for (const e of (r.data || [])) {
        const tl = num(e.total_lp), ta = num(e.total_amplp);
        rates[`${g}|${JSON.stringify(e.asset)}`] = { gauge: g, asset: e.asset, total_lp: e.total_lp ?? null, total_amplp: e.total_amplp ?? null, lp_per_amplp: (tl != null && ta) ? tl / ta : null };
      }
    }
    out.compounder = { ok: true, configs: cfg.data.length, gauges: Object.keys(byGauge), rates, errors: errs, sample_keys: cfg.data[0] ? Object.keys(cfg.data[0]) : [] };
  } else out.compounder = { ok: false, class: cfg.class, msg: cfg.msg };
  for (const [b, addr] of Object.entries(STAKING)) {
    const r = await smartAt(addr, { total_staked_balances: {} }, h);
    out.staking[b] = r.ok ? { ok: true, entries: Array.isArray(r.data) ? r.data.length : null, sample: Array.isArray(r.data) ? r.data[0] : r.data } : { ok: false, class: r.class, msg: r.msg };
  }
  for (const [sym, hub] of Object.entries(LST_HUBS)) {
    const r = await smartAt(hub.hub, hub.query, h);
    if (!r.ok) { out.lst_hubs[sym] = { ok: false, class: r.class, msg: r.msg }; continue; }
    let ratio = null;
    if (hub.kind === 'exchange_rates_array') ratio = num(r.data?.exchange_rates?.[0]?.[1]);
    else if (sym === 'arbLUNA') { const a = num(r.data?.last_exchange_rate), b = num(r.data?.share_exchange_rate); ratio = (a != null && b != null) ? a * b : num(r.data?.exchange_rate); }
    else ratio = num(r.data?.exchange_rate);
    out.lst_hubs[sym] = { ok: true, ratio, raw_keys: Object.keys(r.data || {}) };
  }
  return out;
}

// ── Run ───────────────────────────────────────────────────────────────────
(async () => {
  log(`dex-state-history probe · transport=${TRANSPORT} · epochs=${EPOCHS.join(',')} · spacing=${REQ_DELAY}ms · serial`);
  await buildTargets();
  const report = { schemaVersion: 1, kind: 'probe', ran_at: new Date().toISOString(), transport: TRANSPORT, epochs: [], targets, stats: null };
  for (const ep of EPOCHS) {
    const hr = await resolveHeight(ep);
    if (hr.error) { log(`epoch ${ep}: ${hr.error}`); report.epochs.push(hr); continue; }
    log(`epoch ${ep} starts ${hr.start_time} → height ${hr.height} (block ${hr.height_time}, ${hr.delta_sec}s before boundary, ${hr.block_reads} block reads${hr.note ? ' — ' + hr.note : ''})`);
    const s = await sampleHeight(hr.height);
    const c = s.compounder;
    log(`  pairs ok ${s.tally.pair_ok}/${pairs.length} · absent ${s.tally.absent} · depth ${s.tally.depth} · query ${s.tally.query} · net ${s.tally.net}`);
    log(`  compounder ${c.ok ? `${c.configs} configs, ${Object.keys(c.rates).length} rates` : `${c.class}: ${c.msg}`} · staking ok ${Object.values(s.staking).filter(x => x.ok).length}/4 · hubs ok ${Object.values(s.lst_hubs).filter(x => x.ok).length}/5`);
    for (const [k, v] of Object.entries(s.pairs)) if (!v.ok && v.class !== 'absent') log(`    ✗ ${k.slice(0, 60)} ${v.class}: ${v.msg}`);
    const bornLater = pairs.filter(t => s.pairs[t.key] && s.pairs[t.key].class === 'absent' && t.first > hr.start_time).length;
    if (s.tally.absent) log(`  absent ${s.tally.absent}: ${bornLater} first seen in events after this boundary (expected), ${s.tally.absent - bornLater} seen BEFORE it (look)`);
    report.epochs.push({ ...hr, sample: s });
  }
  STATS.elapsed_sec = Math.round((Date.now() - STATS.started) / 1000);
  report.stats = STATS;
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  const anyDepth = report.epochs.some(e => e.sample && e.sample.tally.depth > 0);
  log(`\nSUMMARY: ${STATS.archive_requests} archive requests (${STATS.archive_retries} retries), ${STATS.public_requests} public minter lookups, ${STATS.elapsed_sec}s`);
  log(anyDepth ? 'VERDICT: archive DEPTH failures seen — read per-epoch tallies before building the duty'
               : 'VERDICT: every non-absent pool answered at every sampled height — the duty can be built on these shapes');
  log(`artifact: ${OUT}`);
})().catch(e => fail(e.stack || e.message));

'use strict';
// dex-state-history — the ONE implementation of archive state sampling.
// probe.js (read-only fixture run) and sample.js (the duty) both require() this;
// nothing here is duplicated elsewhere (no-third-copy law).
//
// ARCHIVE DISCIPLINE (binding — PLAN-genesis-walk):
//   · endpoint from env only; every log line / error passes through mask()
//   · SERIAL requests with REQ_DELAY_MS spacing; 4 attempts with growing backoff
//     on TRANSIENT failures only — a chain answer (absent / depth / bad query),
//     even when the node wraps it in HTTP 500, is never retried
//   · circuit breaker: BREAKER_MAX consecutive transport failures → stop loudly
//   · heights come from the committed event corpus (height↔time anchors), refined
//     with ≤ REFINE_MAX block reads — the archive is never used to search
//   · public LCD only for one immutable fact: a cw20 LP token's minter (pair)

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ms = (iso) => Date.parse(iso);
function num(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }

// ── Masking ────────────────────────────────────────────────────────────────
const SECRETS = [];
function registerSecret(s) { if (!s) return; try { const u = new URL(s); SECRETS.push(s, u.host); } catch { SECRETS.push(s); } }
function mask(s) { s = String(s == null ? '' : s); for (const x of SECRETS) if (x) s = s.split(x).join('[ARCHIVE]'); return s; }
function log(...a) { console.log(...a.map(mask)); }
function fail(m) { console.error('FATAL: ' + mask(m)); process.exit(1); }

// ── HTTP (lifted from tla-flows/archive-walk.js httpGet: redirects, idle + hard deadline) ──
function httpGet(url, headers = {}, t = 25000, hops = 0) {
  return new Promise((res, rej) => {
    const mod = url.startsWith('http:') ? http : https;
    const r = mod.get(url, { headers: { Accept: 'application/json', 'User-Agent': 'tla-dex-state-history/1.0', ...headers } }, (x) => {
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

// ── Error classes ───────────────────────────────────────────────────────────
//   'absent' — contract did not exist at that height (expected for pools born later)
//   'depth'  — node has no state for that height
//   'query'  — contract rejected the message (wrong shape for that code version)
//   'net'    — transport failure after retries (the ONLY class that is retried / resampled)
const CHAIN_ANSWER_RE = /codespace|no such contract|not found|failed to load state|version does not exist|Error parsing|unknown variant|invalid height|lowest height/i;
function classify(text) {
  const t = String(text);
  if (/failed to load state|height .*not available|pruned|no version|version does not exist|invalid height|cannot query with height|lowest height|is not available/i.test(t)) return { class: 'depth', msg: t.slice(0, 160) };
  if (/no such contract|contract: not found|not found: contract|unknown contract|contract not found|address .* not found/i.test(t)) return { class: 'absent', msg: t.slice(0, 160) };
  return { class: 'query', msg: t.slice(0, 160) };
}

// ── The archive client ─────────────────────────────────────────────────────
function makeArchive({ lcd, rpc, reqDelayMs = 150, breakerMax = 5 }) {
  lcd = String(lcd || '').replace(/\/+$/, ''); rpc = String(rpc || '').replace(/\/+$/, '');
  registerSecret(lcd); registerSecret(rpc);
  if (!lcd && !rpc) fail('set repo secret ARCHIVE_LCD (cosmos REST, preferred) or ARCHIVE_RPC (Tendermint 26657)');
  const transport = lcd ? 'lcd' : 'rpc';
  const stats = { archive_requests: 0, archive_retries: 0, started: Date.now() };
  let streak = 0;
  function breaker(ok) { if (ok) { streak = 0; return; } if (++streak >= breakerMax) fail(`${breakerMax} consecutive transport failures — stopping rather than hammering a node that is not answering`); }
  async function get(url, headers) {
    let last;
    for (let a = 1; a <= 4; a++) {
      stats.archive_requests++;
      try { const r = await httpGet(url, headers); await sleep(reqDelayMs); return r; }
      catch (e) {
        last = e; const sc = e.statusCode;
        const chainAnswer = CHAIN_ANSWER_RE.test(e.body || e.message || '');
        if (sc && sc !== 429 && !(sc === 403 && /rate/i.test(e.message)) && (sc < 500 || chainAnswer)) { e.chainAnswer = true; throw e; }
        stats.archive_retries++; await sleep(400 * a * a);
      }
    }
    throw last;
  }
  async function smartAt(addr, queryObj, height) {
    try {
      if (transport === 'lcd') {
        const q = encodeURIComponent(Buffer.from(JSON.stringify(queryObj)).toString('base64'));
        const r = await get(`${lcd}/cosmwasm/wasm/v1/contract/${addr}/smart/${q}`, { 'x-cosmos-block-height': String(height) });
        breaker(true); return { ok: true, data: r.data };
      }
      const data = '0x' + encodeSmartReq(addr, queryObj).toString('hex');
      const r = await get(`${rpc}/abci_query?path=${encodeURIComponent('"/cosmwasm.wasm.v1.Query/SmartContractState"')}&data=${data}&height=${height}&prove=false`);
      const resp = r && r.result && r.result.response;
      if (!resp) { breaker(false); return { ok: false, class: 'net', msg: 'no response object' }; }
      breaker(true);
      if (Number(resp.code) !== 0) return { ok: false, ...classify(resp.log || resp.info || `code ${resp.code}`) };
      return { ok: true, data: decodeSmartResp(resp.value) };
    } catch (e) {
      if (e.chainAnswer) { breaker(true); return { ok: false, ...classify(e.body || e.message || '') }; }
      breaker(false); return { ok: false, class: 'net', msg: mask(e.message).slice(0, 160) };
    }
  }
  async function blockTime(height) {
    if (transport === 'lcd') { const r = await get(`${lcd}/cosmos/base/tendermint/v1beta1/blocks/${height}`); return r.block.header.time; }
    const r = await get(`${rpc}/block?height=${height}`); return r.result.block.header.time;
  }
  return { transport, stats, smartAt, blockTime, reqDelayMs };
}

// ── Committed inputs: epoch table, snapshot, event corpus (anchors + pool set) ──
function loadCorpus(ROOT) {
  const rj = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
  const epochTable = rj('docs/epoch_1-300_date.json');
  const snapshot = rj('member-data/tla-snapshot/current.json');
  const anchors = []; const poolSeen = new Map();
  const evRoot = path.join(ROOT, 'tla-flows/events');
  for (const y of fs.readdirSync(evRoot).filter(d => /^\d{4}$/.test(d)).sort()) {
    for (const f of fs.readdirSync(path.join(evRoot, y)).filter(x => /^\d{2}\.json$/.test(x)).sort()) {
      for (const e of JSON.parse(fs.readFileSync(path.join(evRoot, y, f), 'utf8'))) {
        if (e.height && e.timestamp) anchors.push([ms(e.timestamp), Number(e.height)]);
        if (e.pool) { const s = poolSeen.get(e.pool) || { n: 0, first: e.timestamp, last: e.timestamp }; s.n++; if (e.timestamp < s.first) s.first = e.timestamp; if (e.timestamp > s.last) s.last = e.timestamp; poolSeen.set(e.pool, s); }
      }
    }
  }
  anchors.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { epochTable, snapshot, anchors, poolSeen };
}

// ── Target set: every pool that ever appears in events → what to query ─────
async function buildTargets(corpus, { publicLcd, reqDelayMs = 150, stats = {} }) {
  const lpToPair = new Map(), pairMeta = new Map();
  for (const p of corpus.snapshot.pools || []) {
    if (p.lp_address && p.pool_address) lpToPair.set(p.lp_address, { pair: p.pool_address, name: p.name, dex: p.dex, bucket: p.bucket });
    if (p.pool_address) pairMeta.set(p.pool_address, { name: p.name, dex: p.dex, bucket: p.bucket });
  }
  async function minterOf(lp) { // immutable fact; public LCD; not the archive
    stats.public_requests = (stats.public_requests || 0) + 1;
    const q = encodeURIComponent(Buffer.from(JSON.stringify({ minter: {} })).toString('base64'));
    try { const r = await httpGet(`${publicLcd}/cosmwasm/wasm/v1/contract/${lp}/smart/${q}`); await sleep(reqDelayMs); return r.data && r.data.minter || null; }
    catch { return null; }
  }
  const targets = [];
  for (const [key, seen] of corpus.poolSeen) {
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
      targets.push({ ...base, kind: 'single', lp: key.slice(7), pair: null, name: (corpus.snapshot.pools || []).find(p => p.gauge_pool_id === key)?.name || null, dex: null, bucket: null, pair_via: null });
    }
  }
  targets.sort((a, b) => b.events - a.events);
  return targets;
}

// ── Epoch boundary → height (anchor bracket + ≤ refineMax block reads) ─────
function bracket(anchors, tMs) {
  let lo = 0, hi = anchors.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (anchors[m][0] <= tMs) { i = m; lo = m + 1; } else hi = m - 1; }
  return { before: i >= 0 ? anchors[i] : null, after: i + 1 < anchors.length ? anchors[i + 1] : null };
}
async function resolveHeight(corpus, archive, epoch, refineMax = 8) {
  const row = corpus.epochTable.find(r => r.epoch === epoch); if (!row) return { epoch, error: 'epoch not in docs/epoch_1-300_date.json' };
  const T = ms(row.start_time); const { before, after } = bracket(corpus.anchors, T);
  if (!before || !after) return { epoch, start_time: row.start_time, error: 'outside anchor corpus' };
  let lo = [before[1], before[0]], hi = [after[1], after[0]]; let reads = 0; // [height, timeMs]
  while (hi[0] - lo[0] > 1 && reads < refineMax) {
    const frac = (T - lo[1]) / Math.max(1, hi[1] - lo[1]);
    let guess = Math.round(lo[0] + (hi[0] - lo[0]) * Math.min(0.95, Math.max(0.05, frac)));
    if (guess <= lo[0]) guess = lo[0] + 1; if (guess >= hi[0]) guess = hi[0] - 1;
    let t; try { t = ms(await archive.blockTime(guess)); reads++; }
    catch (e) { return { epoch, start_time: row.start_time, height: lo[0], height_time: new Date(lo[1]).toISOString(), delta_sec: Math.round((T - lo[1]) / 1000), block_reads: reads, bracket_blocks: hi[0] - lo[0], note: 'refine aborted: ' + mask(e.message).slice(0, 80) }; }
    if (t <= T) lo = [guess, t]; else hi = [guess, t];
  }
  return { epoch, start_time: row.start_time, height: lo[0], height_time: new Date(lo[1]).toISOString(), delta_sec: Math.round((T - lo[1]) / 1000), block_reads: reads, bracket_blocks: hi[0] - lo[0] };
}

// ── Asset-info normalisation: chain shapes → the event corpus's pool key form ──
function assetKey(info) {
  if (!info || typeof info !== 'object') return null;
  if (info.token && info.token.contract_addr) return 'cw20:' + info.token.contract_addr;
  if (info.native_token && info.native_token.denom) return 'native:' + info.native_token.denom;
  if (typeof info.native === 'string') return 'native:' + info.native;
  if (typeof info.cw20 === 'string') return 'cw20:' + info.cw20;
  return null;
}

// ── Sample one height ─────────────────────────────────────────────────────
// opts.skipBornLater: pairs whose FIRST event is after `boundaryIso` are not queried
// (their state before any TLA deposit values nothing) — recorded under not_sampled.
async function sampleHeight(archive, targets, h, opts = {}) {
  const pairs = targets.filter(t => t.kind === 'pair');
  const out = { height: h, pairs: {}, not_sampled: {}, compounder: null, staking: {}, lst_hubs: {}, tally: { pair_ok: 0, absent: 0, depth: 0, query: 0, net: 0, shape: 0, skipped: 0 } };
  for (const t of pairs) {
    if (opts.skipBornLater && opts.boundaryIso && t.first > opts.boundaryIso) { out.not_sampled[t.key] = 'born_later_per_events'; out.tally.skipped++; continue; }
    const r = await archive.smartAt(t.pair, { pool: {} }, h);
    if (r.ok) {
      const d = r.data || {};
      const assets = Array.isArray(d.assets) ? d.assets.map(a => ({ denom: assetKey(a.info), amount: a.amount == null ? null : String(a.amount) })) : null;
      const total_share = d.total_share == null ? null : String(d.total_share);
      if (!assets || assets.length < 2 || total_share == null || assets.some(a => !a.denom || a.amount == null)) {
        out.pairs[t.key] = { pair: t.pair, ok: false, class: 'shape', msg: 'pool query answered without assets[2]+total_share: keys=' + Object.keys(d).join(',') }; out.tally.shape++;
      } else { out.pairs[t.key] = { pair: t.pair, ok: true, assets, total_share }; out.tally.pair_ok++; }
    } else { out.pairs[t.key] = { pair: t.pair, ok: false, class: r.class, msg: r.msg }; out.tally[r.class] = (out.tally[r.class] || 0) + 1; }
  }
  // asset-compounder: asset_configs (which assets exist at h) → user_infos totals per gauge = the amplified rate
  const cfg = await archive.smartAt(COMPOUNDER, { asset_configs: {} }, h);
  if (cfg.ok && Array.isArray(cfg.data)) {
    const byGauge = {}; for (const c of cfg.data) (byGauge[c.gauge] = byGauge[c.gauge] || []).push(c.asset_info);
    const rates = []; const errors = [];
    for (const [g, infos] of Object.entries(byGauge)) {
      const r = await archive.smartAt(COMPOUNDER, { user_infos: { addr: DAO_MAIN, assets: infos.map(i => [g, i]) } }, h);
      if (!r.ok) { errors.push({ gauge: g, class: r.class, msg: r.msg }); if (r.class === 'net') out.tally.net++; continue; }
      for (const e of (r.data || [])) {
        const tl = num(e.total_lp), ta = num(e.total_amplp);
        rates.push({ gauge: g, asset: assetKey(e.asset), total_lp: e.total_lp == null ? null : String(e.total_lp), total_amplp: e.total_amplp == null ? null : String(e.total_amplp), lp_per_amplp: (tl != null && ta) ? tl / ta : null });
      }
    }
    out.compounder = { ok: true, configs: cfg.data.length, rates, errors };
  } else { out.compounder = { ok: false, class: cfg.class, msg: cfg.msg }; if (cfg.class === 'net') out.tally.net++; }
  for (const [b, addr] of Object.entries(STAKING)) {
    const r = await archive.smartAt(addr, { total_staked_balances: {} }, h);
    if (r.ok) out.staking[b] = { ok: true, balances: (Array.isArray(r.data) ? r.data : []).map(x => ({ asset: assetKey(x.asset) || (typeof x.asset === 'string' ? x.asset : null), balance: x.balance == null ? null : String(x.balance) })) };
    else { out.staking[b] = { ok: false, class: r.class, msg: r.msg }; if (r.class === 'net') out.tally.net++; }
  }
  for (const [sym, hub] of Object.entries(LST_HUBS)) {
    const r = await archive.smartAt(hub.hub, hub.query, h);
    if (!r.ok) { out.lst_hubs[sym] = { ok: false, class: r.class, msg: r.msg }; if (r.class === 'net') out.tally.net++; continue; }
    let ratio = null;
    if (hub.kind === 'exchange_rates_array') ratio = num(r.data?.exchange_rates?.[0]?.[1]);
    else if (sym === 'arbLUNA') { const a = num(r.data?.last_exchange_rate), b = num(r.data?.share_exchange_rate); ratio = (a != null && b != null) ? a * b : num(r.data?.exchange_rate); }
    else ratio = num(r.data?.exchange_rate);
    out.lst_hubs[sym] = { ok: true, ratio };
  }
  return out;
}

module.exports = { COMPOUNDER, DAO_MAIN, STAKING, LST_HUBS, sleep, ms, num, mask, log, fail, httpGet, classify, makeArchive, loadCorpus, buildTargets, resolveHeight, sampleHeight, assetKey };

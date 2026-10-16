// ── dex-history 1.0 (2026-10-16) — weekly SWAP VOLUME per TLA pool from the archive node, so placements made before the daily
// trading capture (2026-05-12) can be checked. Liquidity is NOT read here: dex-data/state-history already holds every TLA pair's
// reserves at every epoch boundary since E97 (public, chain-read). This adds what it lacks — how much each pair traded each week.
//
// For each pair in dex-data/state-history/index.json and each epoch E in [FROM, TO]: every tx in [height(E), height(E+1)) with a
// swap on that pair (tx_search on the archive RPC, paged), each swap event's offer side summed per denom. Then, with the price
// series (price-history/series/<SYM>.json, the epoch week's average) and the token catalog's decimals:
//   vol_usd  = Σ offer_amount / 10^dec × avg price that week      tvl_usd = reserves at height(E) × price on E's first day
// → dex-data/history/weekly.json  { epochs: {E: {h0, h1, start}}, pairs: {pair: {lp, name, dex, bucket, weeks: {E: [tvl_usd, vol_usd,
//   swaps, complete]}}}, unpriced: {denom: weeks} }. Resumable: (pair, E) cells marked complete are never re-read; the run commits
//   every few minutes and stops cleanly before its budget; the workflow starts the next run while cells are left.
// PUBLIC: pool aggregates only — no wallet, no tx hash, no memo is written or logged (the Action log is public; it prints counts).
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VERSION = 'dex-history-1.0.0';
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const RAW = process.env.RAW_BASE || 'https://raw.githubusercontent.com/thealliancedao';
const FROM = Number(process.env.FROM_EPOCH || 120), TO = Number(process.env.TO_EPOCH || 186);
const CONC = Math.max(1, Number(process.env.CONCURRENCY || 4)); const MAX_MIN = Number(process.env.MAX_MINUTES || 320);
const OUT = process.env.OUT || 'dex-data/history/weekly.json'; const NO_PUSH = !!process.env.NO_PUSH;
const T0 = Date.now(); const minutes = () => (Date.now() - T0) / 60000; const over = () => minutes() > MAX_MIN;
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const UA = 'thealliancedao.com dex-history/1.0';
const stats = { requests: 0, errors: 0, retries: 0, pages: 0, swaps: 0, cells: 0 };
async function getJson(url, tries = 5, timeoutMs = 45000) {
  let last = null;
  for (let i = 0; i < tries; i++) { stats.requests++;
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok && j) return { ok: true, json: j }; last = { ok: false, status: r.status, body: (j && (j.error && (j.error.data || j.error.message))) || t.slice(0, 160) }; if (r.status === 404) break; }
    catch (e) { last = { ok: false, status: 0, body: e.message }; }
    stats.retries++; await sleep(1000 * Math.pow(2, i)); }
  stats.errors++; return last || { ok: false };
}
async function txSearch(q, page, perPage = 100) {
  let last = null;
  for (const rpc of RPCS) { const r = await getJson(`${rpc}/tx_search?query=${encodeURIComponent('"' + q + '"')}&per_page=${perPage}&page=${page}&order_by=%22asc%22`);
    if (r.ok && r.json.result) return { total: Number(r.json.result.total_count), txs: r.json.result.txs || [] }; last = r; }
  return { error: last ? `HTTP ${last.status}: ${String(last.body).replace(/https?:\/\/[^\s"']+/g, '<url>').slice(0, 120)}` : 'no RPC' };
}
const b64dec = (s) => { try { return Buffer.from(s, 'base64').toString('utf8'); } catch { return s; } };
function attrsOf(e) {   // plain or base64 attributes (older CometBFT encodes keys/values)
  const o = {}; for (const a of e.attributes || []) { let k = a.key, v = a.value; if (k && !/^[\w.]+$/.test(k)) { k = b64dec(k); v = v != null ? b64dec(v) : v; } o[k] = v; } return o;
}
const bare = (d) => String(d || '').replace(/^(native|cw20):/, '');
// one (pair, epoch) cell: every swap on the pair in [h0, h1)
async function cell(pair, h0, h1) {
  const byDenom = {}; let swaps = 0, page = 1, seen = 0, total = null;
  while (true) {
    if (over()) return { partial: true };
    const r = await txSearch(`wasm._contract_address='${pair}' AND wasm.action='swap' AND tx.height>=${h0} AND tx.height<${h1}`, page);
    if (r.error) return { error: r.error };
    stats.pages++; total = r.total;
    for (const t of r.txs) { seen++; if (t.tx_result && t.tx_result.code) continue;
      for (const e of (t.tx_result && t.tx_result.events) || []) { if (!/^wasm/.test(e.type)) continue; const a = attrsOf(e);
        if (a._contract_address !== pair || a.action !== 'swap') continue; const d = bare(a.offer_asset); const amt = /^\d+$/.test(a.offer_amount || '') ? BigInt(a.offer_amount) : 0n;
        if (!d || !(amt > 0n)) continue; byDenom[d] = (byDenom[d] || 0n) + amt; swaps++; } }
    if (seen >= total || !r.txs.length) break; page++;
  }
  stats.swaps += swaps;
  return { swaps, byDenom: Object.fromEntries(Object.entries(byDenom).map(([k, v]) => [k, v.toString()])) };
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length && !over()) { const k = i++; await fn(items[k], k); } })); }
function commitPush(msg) {
  if (NO_PUSH) return; const sh = (c) => execSync(c, { stdio: 'pipe' }).toString();
  sh(`git add ${OUT}`); try { sh('git diff --cached --quiet'); return; } catch { }
  sh(`git commit -q -m ${JSON.stringify(msg)}`);
  for (let i = 0; i < 6; i++) { try { sh('git pull -q --rebase origin main'); sh('git push -q origin HEAD:main'); return; } catch (e) { execSync(`sleep ${5 * (i + 1)}`); } }
  console.log('  ⚠ push failed 6 times — progress kept for the next commit');
}
async function main() {
  console.log(`${VERSION} · epochs ${FROM}–${TO} · concurrency ${CONC} · budget ${MAX_MIN} min · RPCs ${RPCS.length}`);
  if (!RPCS.length) { console.log('no ARCHIVE_RPC — stopping'); fs.writeFileSync('dex-history_stop.txt', '1'); process.exitCode = 1; return; }
  const idx = await getJson(`${RAW}/tla-core/main/dex-data/state-history/index.json`, 3, 30000); if (!idx.ok) throw new Error('state-history index unavailable');
  const pairs = (idx.json.pairs || []).filter(p => p.kind === 'pair' && p.pair);
  // epoch heights + reserves from the public state history
  const ep = {}; for (let e = FROM; e <= TO + 1; e++) { const r = await getJson(`${RAW}/tla-core/main/dex-data/state-history/epochs/${e}.json`, 3, 30000); if (r.ok && r.json.height) ep[e] = r.json; }
  const epochs = Object.keys(ep).map(Number).sort((a, b) => a - b);
  // prices + decimals
  const cat = await getJson(`${RAW}/tla-core/main/token-catalog/snapshots/current.json`, 3, 30000);
  let resolve = null; try { const src = await (await fetch(`${RAW}/platform-crons/main/lib/denom-symbol.js`, { signal: AbortSignal.timeout(20000) })).text(); const f = path.join(process.env.RUNNER_TEMP || '/tmp', 'denom-symbol.cjs'); fs.writeFileSync(f, src); resolve = require(f).buildResolver(cat.json); } catch (e) { console.log('resolver unavailable:', e.message); }
  const series = {}; const priceOf = async (sym) => { if (!(sym in series)) { const r = await getJson(`${RAW}/tla-core/main/price-history/series/${encodeURIComponent(sym)}.json`, 2, 20000); series[sym] = r.ok && r.json.daily ? r.json.daily : null; } return series[sym]; };
  const DAY = 86400000; const dayOf = (iso, k) => new Date(Date.parse(iso) + k * DAY).toISOString().slice(0, 10);
  let px = async function (denom, startIso, avgWeek) { const r = resolve ? resolve(denom) : null; if (!r || !r.symbol) return { p: null, dec: r && r.decimals }; const s = await priceOf(r.symbol); if (!s) return { p: null, dec: r.decimals, sym: r.symbol };
    const vals = []; for (let k = 0; k < (avgWeek ? 7 : 1); k++) { const v = s[dayOf(startIso, k)]; if (v != null) vals.push(v); }
    if (!vals.length) for (let k = 1; k <= 14 && !vals.length; k++) { const a = s[dayOf(startIso, -k)], b = s[dayOf(startIso, k)]; if (a != null) vals.push(a); else if (b != null) vals.push(b); }   // a gap: nearest day within two weeks
    return { p: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, dec: r.decimals, sym: r.symbol }; }
  const DOLLAR = /^(USDC(\.[a-z]+)?|USDT|USDt|axlUSDC|axlUSDT|USDC\.n|USDC\.nbl|USDC\.inj)$/;   // a dollar stable before its series starts is $1 (never SOLID / EURe)
  const px0 = px; px = async (denom, startIso, avgWeek) => { const q = await px0(denom, startIso, avgWeek); if (q.p == null && q.sym && DOLLAR.test(q.sym)) return { ...q, p: 1, assumed: true }; return q; };
  // state
  let doc = null; try { doc = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { }
  doc = doc || { schemaVersion: 1, product: 'dex-data/history', epochs: {}, pairs: {}, raw: {}, unpriced: {} };
  doc.raw = doc.raw || {};
  for (let i = 0; i < epochs.length - 1; i++) { const e = epochs[i]; if (epochs[i + 1] !== e + 1) continue; doc.epochs[e] = { h0: ep[e].height, h1: ep[e + 1].height, start: String(ep[e].start_time).slice(0, 10) }; }
  const work = [];
  for (const p of pairs) { doc.pairs[p.pair] = doc.pairs[p.pair] || { key: p.key, lp: p.lp || null, name: p.name, dex: p.dex, bucket: p.bucket, weeks: {} }; Object.assign(doc.pairs[p.pair], { key: p.key, name: p.name, dex: p.dex, bucket: p.bucket });
    for (const e of Object.keys(doc.epochs).map(Number)) { const st = ep[e] && ep[e].pairs && ep[e].pairs[p.key]; if (!st || !st.ok) continue;   // not instantiated / no state that week → nothing traded on it
      if (doc.raw[p.pair + '|' + e] && doc.raw[p.pair + '|' + e].complete) continue; work.push({ p, e, st }); } }
  console.log(`pairs ${pairs.length} · epochs ${Object.keys(doc.epochs).length} · cells to read ${work.length}`);
  let lastCommit = Date.now(), done = 0;
  const price = async (e, rawByDenom, avgWeek) => { let usd = 0, unpriced = []; for (const [d, amt] of Object.entries(rawByDenom)) { const q = await px(d, doc.epochs[e].start, avgWeek); if (q.p == null || q.dec == null) { unpriced.push(d); continue; } usd += Number(BigInt(amt)) / Math.pow(10, q.dec) * q.p; } return { usd, unpriced }; };
  async function writeOut() {
    for (const [k, c] of Object.entries(doc.raw)) { const [pair, e] = k.split('|'); const P = doc.pairs[pair]; if (!P || !doc.epochs[e]) continue;
      const st = ep[e] && ep[e].pairs && ep[e].pairs[P.key]; const res = {}; for (const a of (st && st.assets) || []) res[bare(a.denom)] = a.amount;
      // per-asset price this week: the series, else IMPLIED by the pool's own reserves against the priced side (two-asset pools;
      // equal-value convention — exact for constant-product, close for concentrated) — labeled in the cell
      const ds = Object.keys(res); const q = {}; for (const d of ds) q[d] = await px(d, doc.epochs[e].start, true);
      let implied = 0;
      if (ds.length === 2) { const [a, b] = ds; const va = (x) => Number(BigInt(res[x])) / Math.pow(10, q[x].dec);
        if (q[a].p == null && q[b].p != null && q[a].dec != null && q[b].dec != null && va(a) > 0) { q[a] = { ...q[a], p: va(b) * q[b].p / va(a) }; implied = 1; }
        else if (q[b].p == null && q[a].p != null && q[a].dec != null && q[b].dec != null && va(b) > 0) { q[b] = { ...q[b], p: va(a) * q[a].p / va(b) }; implied = 1; } }
      for (const d of Object.keys(c.byDenom || {})) if (!q[d]) q[d] = await px(d, doc.epochs[e].start, true);
      const val = (map) => { let usd = 0, un = []; for (const [d, amt] of Object.entries(map || {})) { const z = q[d]; if (!z || z.p == null || z.dec == null) { un.push(d); continue; } usd += Number(BigInt(amt)) / Math.pow(10, z.dec) * z.p; } return { usd, unpriced: un }; };
      const tv = val(res), vv = c.byDenom ? val(c.byDenom) : { usd: null, unpriced: [] };
      for (const d of tv.unpriced.concat(vv.unpriced)) doc.unpriced[d] = (doc.unpriced[d] || 0) + 1;
      P.weeks[e] = [Math.round(tv.usd * 100) / 100, vv.usd == null ? null : Math.round(vv.usd * 100) / 100, c.swaps ?? null, c.complete ? 1 : 0, (tv.unpriced.length || vv.unpriced.length) ? 1 : 0, implied]; }
    doc.version = VERSION; doc.generatedAt = new Date().toISOString();
    doc.method = 'weeks[E] = [tvl_usd at height(E) (reserves from dex-data/state-history × that day’s price), vol_usd (Σ swap offer amounts in [height(E), height(E+1)) from the archive node × the week’s average price), swaps, complete (1 = every page read), unpriced (1 = a token had no price — that side is undercounted), reserve_implied (1 = one token priced from the pool’s own reserves against the other)]. Pool aggregates only.';
    doc.columns = ['tvl_usd', 'vol_usd', 'swaps', 'complete', 'unpriced', 'reserve_implied'];
    const cells = Object.values(doc.raw); doc.coverage = { cells: cells.length, complete: cells.filter(c => c.complete).length, epochs: [Math.min(...Object.keys(doc.epochs).map(Number)), Math.max(...Object.keys(doc.epochs).map(Number))] };
    fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(doc) + '\n');
  }
  // biggest weeks last isn't knowable up front; walk newest → oldest so the placements nearest the capture fill first
  work.sort((a, b) => b.e - a.e);
  await pool(work, CONC, async (w) => {
    const E = doc.epochs[w.e]; const r = await cell(w.p.pair, E.h0, E.h1);
    if (r.error) { stats.cells_failed = (stats.cells_failed || 0) + 1; if (stats.cells_failed <= 5) console.log(`  ✗ a cell failed: ${r.error}`); return; }
    if (r.partial) return;
    doc.raw[w.p.pair + '|' + w.e] = { swaps: r.swaps, byDenom: r.byDenom, complete: true }; done++; stats.cells++;
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); await writeOut(); commitPush(`dex-history: +${done} pool-weeks (${VERSION})`); console.log(`  … ${done}/${work.length} cells · ${stats.swaps} swaps · ${minutes().toFixed(0)} min`); }
  });
  await writeOut(); commitPush(`dex-history: +${done} pool-weeks (${VERSION})`);
  const left = work.length - done; fs.writeFileSync('dex-history_left.txt', String(left));
  console.log(`done ${done} · left ${left} · swaps ${stats.swaps} · pages ${stats.pages} · requests ${stats.requests} · errors ${stats.errors} · ${minutes().toFixed(1)} min`);
  if (stats.cells_failed > 50 && done === 0) { fs.writeFileSync('dex-history_stop.txt', '1'); process.exitCode = 1; }
}
main().catch(e => { console.error('FATAL', e.message); process.exitCode = 1; });

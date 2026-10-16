// ── placement-leadup 1.0 (2026-10-16) — what happened in the picked pools BEFORE each bribe proposal was put up.
// For every Phoenix Directive placement (tla-voting/pd-bribes/current.json) and each pool it bribed: the proposal's start height
// (its DAO DAO proposal module, read on chain), then from the archive node every swap and every liquidity add / withdrawal on the
// pool in the LEAD window (the LEAD_DAYS before the proposal opened) vs the BASE window (the BASE_DAYS before that):
//   volume per day lead vs base, distinct traders, top-3 share · liquidity added / withdrawn in the lead window, top adder's share
// and across placements, whether the same wallets show up: a wallet is "repeat" if it was among the largest LEAD traders or liquidity
// adders (top 5) in the picked pools before an EARLIER placement. Share of each placement's lead volume / liquidity added that came
// from repeat wallets, and how many there were.
// OUTPUTS
//   public  → lp-grades/leadup/placements.json — aggregates only: numbers per pool and per placement, counts of wallets. A repeat
//             wallet is named only if it is a catalog ENTITY (a public organisation); individuals are never written.
//   private → tla-archive derived/placement-leadup/<proposal>.json — the wallet-level detail (who, how much), for the owner's own
//             review. Never published. The Action log prints counts only.
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VERSION = 'placement-leadup-1.0.0';
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const RAW = process.env.RAW_BASE || 'https://raw.githubusercontent.com/thealliancedao';
const LEAD_DAYS = Number(process.env.LEAD_DAYS || 14), BASE_DAYS = Number(process.env.BASE_DAYS || 28), TOPN = 5;
const OUT = process.env.OUT || 'lp-grades/leadup/placements.json'; const ARCHIVE_DIR = process.env.ARCHIVE_DIR || ''; const NO_PUSH = !!process.env.NO_PUSH;
const CONC = Math.max(1, Number(process.env.CONCURRENCY || 4));
const PD_PROPOSAL_MODULE = process.env.PD_PROPOSAL_MODULE || 'terra1660g9mle5kfsq8c0p4k4hgr9ujdyr3m48c22cawy0akr98rmwksqehqnup';
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const DAY = 86400000;
const stats = { requests: 0, errors: 0, pages: 0 };
async function getJson(url, tries = 5, timeoutMs = 45000) { let last = null;
  for (let i = 0; i < tries; i++) { stats.requests++; try { const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
    if (r.ok && j) return { ok: true, json: j }; last = { ok: false, status: r.status, body: t.slice(0, 120) }; if (r.status === 404) break; } catch (e) { last = { ok: false, status: 0, body: e.message }; } await sleep(1000 * Math.pow(2, i)); }
  stats.errors++; return last || { ok: false }; }
const b64dec = (s) => { try { return Buffer.from(s, 'base64').toString('utf8'); } catch { return s; } };
const attrsOf = (e) => { const o = {}; for (const a of e.attributes || []) { let k = a.key, v = a.value; if (k && !/^[\w.\-/]+$/.test(k)) { k = b64dec(k); v = v != null ? b64dec(v) : v; } o[k] = v; } return o; };
const bare = (d) => String(d || '').replace(/^(native|cw20):/, '');
async function txAll(q) {   // every tx matching q (paged); null on failure
  const out = []; let page = 1, seen = 0;
  for (;;) { let r = null; for (const rpc of RPCS) { r = await getJson(`${rpc}/tx_search?query=${encodeURIComponent('"' + q + '"')}&per_page=100&page=${page}&order_by=%22asc%22`); if (r.ok && r.json.result) break; }
    if (!r || !r.ok || !r.json.result) return null; stats.pages++; const txs = r.json.result.txs || []; const total = Number(r.json.result.total_count);
    for (const t of txs) out.push(t); seen += txs.length; if (seen >= total || !txs.length) break; page++; if (page > 400) return null; }
  return out;
}
function signerOf(t) { const evs = (t.tx_result && t.tx_result.events) || [];
  for (const e of evs) if (e.type === 'tx') { const a = attrsOf(e); if (a.acc_seq) return String(a.acc_seq).split('/')[0]; }
  for (const e of evs) if (e.type === 'message') { const a = attrsOf(e); if (a.sender) return a.sender; }
  return null; }
const parseAssets = (s) => String(s || '').split(',').map(x => x.trim()).map(x => { const m = x.match(/^(\d+)(.+)$/); return m ? [bare(m[2]), BigInt(m[1])] : null; }).filter(Boolean);
// smart query at latest height via abci (proposal start height)
const varint = (n) => { const b = []; while (n > 127) { b.push((n & 127) | 128); n >>>= 7; } b.push(n); return Buffer.from(b); };
const field = (tag, buf) => Buffer.concat([Buffer.from([tag]), varint(buf.length), buf]);
function readVarint(buf, i) { let x = 0, s = 0; for (;;) { const b = buf[i++]; x += (b & 127) * Math.pow(2, s); if (b < 128) return [x, i]; s += 7; } }
async function smart(contract, query) { const data = Buffer.concat([field(0x0a, Buffer.from(contract)), field(0x12, Buffer.from(JSON.stringify(query)))]).toString('hex');
  for (const rpc of RPCS) { const r = await getJson(`${rpc}/abci_query?path=${encodeURIComponent('"/cosmwasm.wasm.v1.Query/SmartContractState"')}&data=0x${data}`); const resp = r.ok && r.json.result && r.json.result.response; if (!resp || resp.code) continue;
    const v = Buffer.from(resp.value || '', 'base64'); if (!v.length) continue; const [len, j] = readVarint(v, 1); try { return JSON.parse(v.slice(j, j + len).toString('utf8')); } catch { } }
  return null; }

async function main() {
  console.log(`${VERSION} · lead ${LEAD_DAYS}d · base ${BASE_DAYS}d · RPCs ${RPCS.length}`);
  if (!RPCS.length) { process.exitCode = 1; return; }
  const J = async (rel) => { const r = await getJson(`${RAW}/tla-core/main/${rel}`, 3, 60000); return r.ok ? r.json : null; };
  const pd = await J('tla-voting/pd-bribes/current.json'); const series = await J('lp-grades/series/pools.json'); const cat = await J('catalog/snapshots/current.json');
  if (!pd || !series) throw new Error('inputs unavailable');
  const ent = (cat && cat.entities) || {};
  const byGauge = new Map(); for (const p of series.pools) for (const g of p.gauge_pool_ids || []) { byGauge.set(g, p); byGauge.set(bare(g), p); }
  // height ↔ time from the public epoch boundaries (linear between boundaries)
  const bounds = []; for (let e = 96; e <= 400; e++) { const r = await getJson(`${RAW}/tla-core/main/dex-data/state-history/epochs/${e}.json`, 2, 20000); if (!r.ok || !r.json.height) { if (e > 150) break; continue; } bounds.push({ h: r.json.height, t: Date.parse(r.json.height_time || r.json.start_time) }); }
  const hAt = (t) => { for (let i = 1; i < bounds.length; i++) if (t <= bounds[i].t) { const a = bounds[i - 1], b = bounds[i]; return Math.round(a.h + (b.h - a.h) * (t - a.t) / (b.t - a.t)); } const a = bounds[bounds.length - 2], b = bounds[bounds.length - 1]; return Math.round(b.h + (b.h - a.h) * (t - b.t) / (b.t - a.t)); };
  const tAt = (h) => { for (let i = 1; i < bounds.length; i++) if (h <= bounds[i].h) { const a = bounds[i - 1], b = bounds[i]; return a.t + (b.t - a.t) * (h - a.h) / (b.h - a.h); } const a = bounds[bounds.length - 2], b = bounds[bounds.length - 1]; return b.t + (b.t - a.t) * (h - b.h) / (b.h - a.h); };
  // prices (same oracle + decimals as dex-history; dollar stables $1 before their series)
  const tc = await J('token-catalog/snapshots/current.json');
  let resolve = null; try { const src = await (await fetch(`${RAW}/platform-crons/main/lib/denom-symbol.js`, { signal: AbortSignal.timeout(20000) })).text(); const f = path.join(process.env.RUNNER_TEMP || '/tmp', 'denom-symbol.cjs'); fs.writeFileSync(f, src); resolve = require(f).buildResolver(tc); } catch (e) { console.log('resolver unavailable'); }
  const ser = {}; const DOLLAR = /^(USDC(\.[a-z]+)?|USDT|USDt|axlUSDC|axlUSDT|USDC\.n|USDC\.nbl|USDC\.inj)$/;
  const pxAvg = async (denom, t0, t1) => { const r = resolve ? resolve(denom) : null; if (!r || !r.symbol) return null; if (!(r.symbol in ser)) { const q = await J(`price-history/series/${encodeURIComponent(r.symbol)}.json`); ser[r.symbol] = q && q.daily ? q.daily : null; }
    const s = ser[r.symbol]; const v = []; if (s) for (let t = t0; t <= t1; t += DAY) { const k = new Date(t).toISOString().slice(0, 10); if (s[k] != null) v.push(Number(s[k])); }
    const p = v.length ? v.reduce((a, b) => a + b, 0) / v.length : (DOLLAR.test(r.symbol) ? 1 : null); return p == null || r.decimals == null ? null : { p, dec: r.decimals }; };
  const usd = async (pairs, t0, t1, cache) => { let u = 0, un = 0; for (const [d, amt] of pairs) { const k = d + '|' + t0; if (!(k in cache)) cache[k] = await pxAvg(d, t0, t1); const q = cache[k]; if (!q) { un++; continue; } u += Number(amt) / Math.pow(10, q.dec) * q.p; } return { u, un }; };

  const placements = (pd.placements || []).filter(p => (p.legs || []).some(l => l.denom === 'native:uluna')).sort((a, b) => a.proposal_id - b.proposal_id);
  const doc = { schemaVersion: 1, product: 'lp-grades/leadup', version: VERSION, generatedAt: new Date().toISOString(), lead_days: LEAD_DAYS, base_days: BASE_DAYS, top_n: TOPN,
    method: `For each placement: the proposal's start height (its DAO DAO proposal module). LEAD = the ${LEAD_DAYS} days before it opened, BASE = the ${BASE_DAYS} days before that. Per bribed pool, from every swap and liquidity add / withdrawal on chain (archive node): volume per day lead vs base, distinct traders and top-3 share in the lead window, liquidity added / withdrawn in the lead window and the largest adder's share. Repeat wallets: among the ${TOPN} largest lead-window traders or liquidity adders of an EARLIER placement's picks. Aggregates only — individual wallets are counted, never named; organisations (catalog entities) are named.`,
    placements: {} };
  const history = [];   // [{pid, top: Set}] — kept in memory, never written publicly
  const priv = {};
  for (const pl of placements) {
    const prop = await smart(PD_PROPOSAL_MODULE, { proposal: { proposal_id: pl.proposal_id } });
    const startH = prop && prop.proposal && Number(prop.proposal.start_height) || null;
    const execT = Date.parse(pl.executed_at); const openT = startH ? tAt(startH) : execT - 3 * DAY;
    const leadT0 = openT - LEAD_DAYS * DAY, baseT0 = leadT0 - BASE_DAYS * DAY;
    const hOpen = startH || hAt(openT), hLead = hAt(leadT0), hBase = hAt(baseT0);
    const pools = [...new Set(pl.legs.filter(l => l.denom === 'native:uluna').map(l => l.pool_gauge_id))].map(g => byGauge.get(g)).filter(p => p && !p.is_single && /^terra1/.test(p.id));
    const cache = {}; const tr = {}; const lpAdd = {}; const rows = [];
    let i = 0; await Promise.all(Array.from({ length: CONC }, async () => { while (i < pools.length) { const p = pools[i++];
      const win = async (h0, h1, t0, t1, wantWallets) => {
        const sw = await txAll(`wasm._contract_address='${p.id}' AND wasm.action='swap' AND tx.height>=${h0} AND tx.height<${h1}`); if (!sw) return null;
        const per = {}; let vol = 0, un = 0;
        for (const t of sw) { if (t.tx_result && t.tx_result.code) continue; const who = signerOf(t) || 'x';
          for (const e of t.tx_result.events || []) { if (!/^wasm/.test(e.type)) continue; const a = attrsOf(e); if (a._contract_address !== p.id || a.action !== 'swap') continue;
            const d = bare(a.offer_asset); if (!/^\d+$/.test(a.offer_amount || '')) continue; const v = await usd([[d, BigInt(a.offer_amount)]], t0, t1, cache); vol += v.u; un += v.un; per[who] = (per[who] || 0) + v.u; } }
        let add = 0, rem = 0; const adders = {};
        if (wantWallets) { const lpA = await txAll(`wasm._contract_address='${p.id}' AND wasm.action='provide_liquidity' AND tx.height>=${h0} AND tx.height<${h1}`);
          const lpW = await txAll(`wasm._contract_address='${p.id}' AND wasm.action='withdraw_liquidity' AND tx.height>=${h0} AND tx.height<${h1}`);
          const lp = lpA && lpW ? lpA.concat(lpW) : null;
          if (lp) for (const t of lp) { if (t.tx_result && t.tx_result.code) continue; const who = signerOf(t) || 'x';
            for (const e of t.tx_result.events || []) { if (!/^wasm/.test(e.type)) continue; const a = attrsOf(e); if (a._contract_address !== p.id) continue;
              if (a.action === 'provide_liquidity') { const v = await usd(parseAssets(a.assets), t0, t1, cache); add += v.u; adders[who] = (adders[who] || 0) + v.u; }
              else if (a.action === 'withdraw_liquidity') { const v = await usd(parseAssets(a.refund_assets), t0, t1, cache); rem += v.u; } } } }
        return { vol, un, per, add, rem, adders };
      };
      const L = await win(hLead, hOpen, leadT0, openT, true), B = await win(hBase, hLead, baseT0, leadT0, false);
      if (!L || !B) { rows.push({ pool: p.id, name: p.name, error: 'read failed' }); continue; }
      for (const [w, v] of Object.entries(L.per)) tr[w] = (tr[w] || 0) + v; for (const [w, v] of Object.entries(L.adders)) lpAdd[w] = (lpAdd[w] || 0) + v;
      const tops = Object.values(L.per).sort((a, b) => b - a); const ad = Object.values(L.adders).sort((a, b) => b - a);
      rows.push({ pool: p.id, name: p.name, bucket: p.bucket, lead_vol_day: Math.round(L.vol / LEAD_DAYS), base_vol_day: Math.round(B.vol / BASE_DAYS), vol_ratio: B.vol > 0 ? Math.round(L.vol / LEAD_DAYS / (B.vol / BASE_DAYS) * 100) / 100 : null,
        lead_traders: Object.keys(L.per).length, lead_top3_pct: L.vol > 0 ? Math.round(tops.slice(0, 3).reduce((a, b) => a + b, 0) / L.vol * 1000) / 10 : null,
        lp_added: Math.round(L.add), lp_withdrawn: Math.round(L.rem), lp_net: Math.round(L.add - L.rem), lp_adders: Object.keys(L.adders).length, lp_top_adder_pct: L.add > 0 ? Math.round(ad[0] / L.add * 1000) / 10 : null, unpriced: (L.un + B.un) > 0 });
    } }));
    // repeat wallets vs earlier placements
    const topT = Object.entries(tr).sort((a, b) => b[1] - a[1]).slice(0, TOPN).map(x => x[0]); const topA = Object.entries(lpAdd).sort((a, b) => b[1] - a[1]).slice(0, TOPN).map(x => x[0]);
    const top = new Set([...topT, ...topA].filter(w => w !== 'x'));
    const earlier = new Map(); for (const h of history) for (const w of h.top) earlier.set(w, (earlier.get(w) || 0) + 1);
    const totV = Object.values(tr).reduce((a, b) => a + b, 0), totA = Object.values(lpAdd).reduce((a, b) => a + b, 0);
    const repV = Object.entries(tr).filter(([w]) => earlier.has(w)).reduce((a, [, v]) => a + v, 0), repA = Object.entries(lpAdd).filter(([w]) => earlier.has(w)).reduce((a, [, v]) => a + v, 0);
    const repTop = [...top].filter(w => earlier.has(w));
    const named = repTop.filter(w => ent[w]).map(w => ent[w].label);
    const sumL = rows.reduce((a, r) => a + (r.lead_vol_day || 0), 0), sumB = rows.reduce((a, r) => a + (r.base_vol_day || 0), 0);
    doc.placements[pl.proposal_id] = { proposal_id: pl.proposal_id, executed_at: pl.executed_at, opened_at: new Date(openT).toISOString(), open_height: hOpen, start_height_source: startH ? 'proposal module' : 'estimated (3 days before execution)',
      picks: rows.length, picks_vol_ratio: sumB > 0 ? Math.round(sumL / sumB * 100) / 100 : null, lead_vol_day: sumL, base_vol_day: sumB,
      lp_added: rows.reduce((a, r) => a + (r.lp_added || 0), 0), lp_withdrawn: rows.reduce((a, r) => a + (r.lp_withdrawn || 0), 0),
      repeat: { prior_placements: history.length, wallets_in_top: repTop.length, top_size: top.size, lead_vol_pct: totV > 0 ? Math.round(repV / totV * 1000) / 10 : null, lp_added_pct: totA > 0 ? Math.round(repA / totA * 1000) / 10 : null, named_organisations: named,
        most_placements: repTop.length ? Math.max(...repTop.map(w => earlier.get(w))) + 1 : null },
      pools: rows };
    priv[pl.proposal_id] = { proposal_id: pl.proposal_id, opened_at: new Date(openT).toISOString(), top_traders: Object.entries(tr).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w, v]) => ({ wallet: w, usd: Math.round(v), earlier_placements: earlier.get(w) || 0 })),
      top_lp_adders: Object.entries(lpAdd).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w, v]) => ({ wallet: w, usd: Math.round(v), earlier_placements: earlier.get(w) || 0 })) };
    history.push({ pid: pl.proposal_id, top });
    const d = doc.placements[pl.proposal_id]; console.log(`prop ${pl.proposal_id}: ${d.picks} pools · lead/base volume ×${d.picks_vol_ratio} · repeat wallets ${d.repeat.wallets_in_top}/${d.repeat.top_size} (${d.repeat.lead_vol_pct}% of lead volume)`);
  }
  // guard: no individual address in the public file
  const pub = JSON.stringify(doc, null, 1); const leaks = (pub.match(/terra1[0-9a-z]{38,}/g) || []).filter(a => !series.pools.some(p => p.id === a)); if (leaks.length) throw new Error(`refusing to write: ${leaks.length} non-pool addresses in the public file`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, pub);
  if (ARCHIVE_DIR) { const d = path.join(ARCHIVE_DIR, 'derived/placement-leadup'); fs.mkdirSync(d, { recursive: true }); for (const [k, v] of Object.entries(priv)) fs.writeFileSync(path.join(d, `${k}.json`), JSON.stringify(v, null, 1)); }
  console.log(`done · ${Object.keys(doc.placements).length} placements · ${JSON.stringify(stats)}`);
  if (NO_PUSH) return; const sh = (c, cwd) => execSync(c, { stdio: 'pipe', cwd }).toString();
  sh(`git add ${OUT}`); try { sh('git diff --cached --quiet'); } catch { sh(`git commit -q -m ${JSON.stringify(`lp-grades: placement lead-up (${VERSION})`)}`); for (let i = 0; i < 6; i++) { try { sh('git pull -q --rebase origin main'); sh('git push -q origin HEAD:main'); break; } catch { execSync(`sleep ${5 * (i + 1)}`); } } }
  if (ARCHIVE_DIR) { sh('git add derived/placement-leadup', ARCHIVE_DIR); try { sh('git diff --cached --quiet', ARCHIVE_DIR); } catch { sh(`git commit -q -m "placement lead-up detail (${VERSION})"`, ARCHIVE_DIR); for (let i = 0; i < 6; i++) { try { sh('git pull -q --rebase origin main', ARCHIVE_DIR); sh('git push -q origin HEAD:main', ARCHIVE_DIR); break; } catch { execSync(`sleep ${5 * (i + 1)}`); } } } }
}
main().catch(e => { console.error('FATAL', String(e.message).replace(/https?:\/\/[^\s"']+/g, '<url>').replace(/terra1[0-9a-z]{38,}/g, '<addr>')); process.exit(1); });

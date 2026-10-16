// ── vote-history 1.0 (2026-10-16) — Votion's votes per pool per period, read from the archive node at each period's first block,
// so "votes steered by bribes" can be measured for periods before the per-wallet vote harvest (tla-voting/vote-state, from E193).
//
// For each period E in [FROM, TO]: at height(E) + 1 (dex-data/state-history: the last block before E starts, +1 = E's first block),
// the gauge controller's user_info for every Votion vault (votion/snapshots/vaults.json — public contracts) — its voting power for
// period E and its split per gauge in bps → Σ over vaults of vp × bps / 10000 per gauge pool. Totals per pool come from the finalized
// distributions ledger the platform already holds (tla-voting/distributions), not from here.
// A vault whose last vote is stamped after E (re-voted in E's first block) is flagged, never guessed.
// → tla-voting/vote-history/votion.json  { periods: { E: { height, vaults_read, vaults_voting, stale, votion_vp, pools: { gauge_pool_id: vp } } } }
// PUBLIC: aggregates over Votion's public vault contracts only — no other wallet is read, written or logged.
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process';
const VERSION = 'vote-history-1.0.0';
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const RAW = process.env.RAW_BASE || 'https://raw.githubusercontent.com/thealliancedao';
const FROM = Number(process.env.FROM_EPOCH || 120), TO = Number(process.env.TO_EPOCH || 206);
const OUT = process.env.OUT || 'tla-voting/vote-history/votion.json'; const NO_PUSH = !!process.env.NO_PUSH;
const GAUGE = 'terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj';
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const UA = 'thealliancedao.com vote-history/1.0';
const stats = { requests: 0, errors: 0, retries: 0 };
async function getJson(url, tries = 5, timeoutMs = 45000) {
  let last = null;
  for (let i = 0; i < tries; i++) { stats.requests++;
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok && j) return { ok: true, json: j }; last = { ok: false, status: r.status, body: t.slice(0, 160) }; if (r.status === 404) break; }
    catch (e) { last = { ok: false, status: 0, body: e.message }; }
    stats.retries++; await sleep(1000 * Math.pow(2, i)); }
  stats.errors++; return last || { ok: false };
}
// protobuf QuerySmartContractStateRequest { string address = 1; bytes query_data = 2; }
const varint = (n) => { const b = []; while (n > 127) { b.push((n & 127) | 128); n >>>= 7; } b.push(n); return Buffer.from(b); };
const field = (tag, buf) => Buffer.concat([Buffer.from([tag]), varint(buf.length), buf]);
function readVarint(buf, i) { let x = 0, s = 0; for (;;) { const b = buf[i++]; x += (b & 127) * Math.pow(2, s); if (b < 128) return [x, i]; s += 7; } }
async function smartAt(contract, query, height) {
  const data = Buffer.concat([field(0x0a, Buffer.from(contract)), field(0x12, Buffer.from(JSON.stringify(query)))]).toString('hex');
  let last = null;
  for (const rpc of RPCS) {
    const r = await getJson(`${rpc}/abci_query?path=${encodeURIComponent('"/cosmwasm.wasm.v1.Query/SmartContractState"')}&data=0x${data}&height=${height}`);
    if (!r.ok) { last = `HTTP ${r.status}`; continue; }
    const resp = r.json.result && r.json.result.response; if (!resp) { last = 'no response'; continue; }
    if (resp.code) return { error: `code ${resp.code}: ${String(resp.log || '').slice(0, 120)}`, contract_error: true };
    const v = Buffer.from(resp.value || '', 'base64'); if (!v.length) return { error: 'empty value' };
    const [len, j] = readVarint(v, 1); try { return { ok: true, json: JSON.parse(v.slice(j, j + len).toString('utf8')) }; } catch (e) { return { error: 'bad json' }; }
  }
  return { error: last || 'no RPC' };
}
const stampOf = (g) => { for (const f of ['period', 'vote_period', 'last_vote_period']) if (g && g[f] != null && Number.isFinite(Number(g[f]))) return Number(g[f]); return null; };
function allocOf(v) {   // [[id, bps]] | {id: bps} | [{pool/asset, bps/weight}]
  const out = {}; if (Array.isArray(v)) for (const x of v) { if (Array.isArray(x)) out[x[0]] = Number(x[1]); else if (x && typeof x === 'object') { const id = x.pool || x.gauge_pool_id || x.asset || x.id; const w = x.bps ?? x.weight ?? x.amount; if (id != null) out[typeof id === 'string' ? id : JSON.stringify(id)] = Number(w); } }
  else if (v && typeof v === 'object') for (const [k, w] of Object.entries(v)) out[k] = Number(w);
  return out;
}
function commitPush(msg) {
  if (NO_PUSH) return; const sh = (c) => execSync(c, { stdio: 'pipe' }).toString();
  sh(`git add ${OUT}`); try { sh('git diff --cached --quiet'); return; } catch { }
  sh(`git commit -q -m ${JSON.stringify(msg)}`);
  for (let i = 0; i < 6; i++) { try { sh('git pull -q --rebase origin main'); sh('git push -q origin HEAD:main'); return; } catch (e) { execSync(`sleep ${5 * (i + 1)}`); } }
  console.log('  ⚠ push failed 6 times');
}
async function main() {
  console.log(`${VERSION} · periods ${FROM}–${TO} · RPCs ${RPCS.length}`);
  if (!RPCS.length) { console.log('no ARCHIVE_RPC — stopping'); process.exitCode = 1; return; }
  const vd = await getJson(`${RAW}/tla-core/main/votion/snapshots/vaults.json`, 3, 30000); if (!vd.ok) throw new Error('vaults.json unavailable');
  const vaults = (vd.json.vaults || []).map(v => v.address).filter(Boolean); console.log(`vaults: ${vaults.length}`);
  const doc = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { schemaVersion: 1, product: 'tla-voting/vote-history/votion', periods: {} };
  doc.version = VERSION; doc.method = 'At each period’s first block (dex-data/state-history height + 1), user_info(time: {period: E}) on the TLA gauge controller for every Votion vault: VP (fixed + boost) × each gauge vote’s bps / 10000, summed per gauge pool. A vault whose last vote is stamped after E is counted as stale (left out). Totals per pool: tla-voting/distributions. Aggregates over Votion’s public vault contracts only.';
  let done = 0, probeShown = false;
  for (let E = TO; E >= FROM; E--) {
    if (doc.periods[E] && doc.periods[E].complete) continue;
    const st = await getJson(`${RAW}/tla-core/main/dex-data/state-history/epochs/${E}.json`, 3, 30000); if (!st.ok || !st.json.height) { console.log(`E${E}: no height`); continue; }
    const h = st.json.height + 1; const pools = {}; let read = 0, voting = 0, stale = 0, vtot = 0, errs = 0;
    for (const v of vaults) {
      let r = await smartAt(GAUGE, { user_info: { user: v, time: { period: E } } }, h);
      if (r.error && r.contract_error) r = await smartAt(GAUGE, { user_info: { user: v, time: 'current' } }, h);
      if (r.error) { if (/not found|no lock|does not exist|code 18|code 5/i.test(r.error)) { read++; continue; } errs++; if (errs <= 2) console.log(`  E${E} read failed: ${r.error.replace(/terra1\w+/g, '<addr>')}`); continue; }
      read++; const ui = r.json || {};
      if (!probeShown) { probeShown = true; console.log(`  shape: keys ${Object.keys(ui).join(',')} · gauge_votes[0] keys ${Object.keys((ui.gauge_votes || [])[0] || {}).join(',')}`); }
      let vp = 0; try { vp = Number(BigInt(String(ui.fixed_amount ?? '0')) + BigInt(String(ui.voting_power ?? '0'))) / 1e6; } catch { }
      if (!(vp > 0)) continue; let counted = false;
      for (const g of ui.gauge_votes || []) { const s = stampOf(g); if (s != null && s > E) { stale++; continue; }
        for (const [id, bps] of Object.entries(allocOf(g.votes))) { const x = vp * bps / 10000; if (x > 0) { pools[id] = Math.round(((pools[id] || 0) + x) * 100) / 100; vtot += x; counted = true; } } }
      if (counted) voting++;
    }
    doc.periods[E] = { height: h, vaults_read: read, vaults_voting: voting, stale, read_errors: errs, votion_vp: Math.round(vtot * 100) / 100, pools, complete: errs === 0 && read === vaults.length };
    done++; console.log(`E${E}: vaults ${read}/${vaults.length} voting ${voting} stale ${stale} errors ${errs} · ${Object.keys(pools).length} pools`);
    if (done % 15 === 0) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(doc, null, 1)); commitPush(`vote-history: Votion votes, ${done} periods (${VERSION})`); }
  }
  doc.coverage = { periods: Object.keys(doc.periods).length, complete: Object.values(doc.periods).filter(p => p.complete).length, from: FROM, to: TO, generatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(doc, null, 1)); commitPush(`vote-history: Votion votes per pool, ${doc.coverage.complete}/${doc.coverage.periods} periods complete (${VERSION})`);
  console.log(`done · ${JSON.stringify(stats)}`);
}
main().catch(e => { console.error('FATAL', e.message.replace(/https?:\/\/[^\s"']+/g, '<url>')); process.exit(1); });

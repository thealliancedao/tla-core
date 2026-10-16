// ── votion-holders 1.0 (2026-10-16) — every Votion vault depositor since launch, from the archive node. The public LCDs the votion
// cron uses have pruned the early history, so depositors from before their retention window were invisible (25 found). This walks
// each vault's full deposit history (tx_search on ARCHIVE_RPC) and writes the recipients as CANDIDATES to
// votion/archive-holders.json; the votion cron balance-checks every candidate daily (a wallet that left shows zero and drops out —
// nothing is assumed). Same data class as votion/holders-registry.json (already public); the Action log prints counts only.
import fs from 'fs'; import { execSync } from 'child_process';
const VERSION = 'votion-holders-1.0.0';
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const RAW = process.env.RAW_BASE || 'https://raw.githubusercontent.com/thealliancedao';
const OUT = process.env.OUT || 'votion/archive-holders.json'; const NO_PUSH = !!process.env.NO_PUSH;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getJson(url, tries = 5) { let last = null;
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(45000) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
    if (r.ok && j) return { ok: true, json: j }; last = { ok: false, status: r.status }; } catch (e) { last = { ok: false, status: 0 }; } await sleep(1000 * Math.pow(2, i)); }
  return last || { ok: false }; }
const b64dec = (s) => { try { return Buffer.from(s, 'base64').toString('utf8'); } catch { return s; } };
const attrsOf = (e) => { const o = {}; for (const a of e.attributes || []) { let k = a.key, v = a.value; if (k && !/^[\w.\-/]+$/.test(k)) { k = b64dec(k); v = v != null ? b64dec(v) : v; } o[k] = v; } return o; };
async function main() {
  console.log(`${VERSION} · RPCs ${RPCS.length}`); if (!RPCS.length) { process.exitCode = 1; return; }
  const vd = await getJson(`${RAW}/tla-core/main/votion/snapshots/vaults.json`); if (!vd.ok) throw new Error('vaults.json unavailable');
  const doc = { schemaVersion: 1, product: 'votion/archive-holders', version: VERSION, generatedAt: new Date().toISOString(),
    method: 'Every votion-la/deposit on each vault since launch (archive node tx_search), its recipient. Candidates only — the votion cron verifies each by live balance.', vaults: {} };
  for (const v of vd.json.vaults || []) {
    const set = new Set(); let page = 1, seen = 0, total = null, complete = true;
    while (true) {
      let r = null; for (const rpc of RPCS) { r = await getJson(`${rpc}/tx_search?query=${encodeURIComponent(`"wasm._contract_address='${v.address}' AND wasm.action='votion-la/deposit'"`)}&per_page=100&page=${page}&order_by=%22asc%22`); if (r.ok && r.json.result) break; }
      if (!r || !r.ok || !r.json.result) { complete = false; console.log(`  ${v.label}: page ${page} failed`); break; }
      total = Number(r.json.result.total_count); const txs = r.json.result.txs || [];
      for (const t of txs) { seen++; if (t.tx_result && t.tx_result.code) continue;
        for (const e of (t.tx_result && t.tx_result.events) || []) { if (!/^wasm/.test(e.type)) continue; const a = attrsOf(e); if (a._contract_address === v.address && a.action === 'votion-la/deposit' && a.recipient) set.add(a.recipient); } }
      if (seen >= total || !txs.length) break; page++;
    }
    doc.vaults[v.address] = { label: v.label, deposits: total, complete, holders: [...set].sort() };
    console.log(`${v.label}: ${total ?? '?'} deposits · ${set.size} distinct recipients · ${complete ? 'complete' : 'INCOMPLETE'}`);
  }
  doc.totals = { candidates: new Set(Object.values(doc.vaults).flatMap(x => x.holders)).size };
  fs.mkdirSync('votion', { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(doc, null, 1));
  if (NO_PUSH) return; const sh = (c) => execSync(c, { stdio: 'pipe' }).toString();
  sh(`git add ${OUT}`); try { sh('git diff --cached --quiet'); console.log('no change'); return; } catch { }
  sh(`git commit -q -m ${JSON.stringify(`votion: archive holder candidates — ${doc.totals.candidates} (${VERSION})`)}`);
  for (let i = 0; i < 6; i++) { try { sh('git pull -q --rebase origin main'); sh('git push -q origin HEAD:main'); console.log('pushed'); return; } catch { execSync(`sleep ${5 * (i + 1)}`); } }
}
main().catch(e => { console.error('FATAL', e.message.replace(/https?:\/\/[^\s"']+/g, '<url>')); process.exit(1); });

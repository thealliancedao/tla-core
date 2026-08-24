// ── capa-supply: fold the legacy ampcapa-data_2026 snapshots (2026-08-24) ────
// ONE-OFF (workflow_dispatch). The retired personal cron captured the ampCAPA
// DAO members' receipt positions weekly (epochs 181–197) + monthly (Apr–Jul
// 2026). Its `members[].capa` is exactly the org product's `receipt_dao_capa`
// (receipt × ve3 rate × hub rate), so those snapshots fold into:
//   token-catalog/supply/capa/wallets-daily/<date>.json   rows {addr: [null, receipt_dao_capa]}
//   token-catalog/supply/capa/wallets-daily/index.json    day list (src: legacy_fold)
//   token-catalog/supply/capa/index.json                  one row per date: hub_rate + receipt_in_dao, every other field null
// LAWS: prior-verbatim (a date that already has a CAPTURED file/row is never
// touched); never-shrink (refuses to rebuild from a failed read); totals the
// legacy feed never measured stay null — never invented; every folded artefact
// carries `src: "legacy_fold ampcapa-data_2026 <key>"`.
// No third copy: row shapes + merge rules come from the LIVE platform-crons
// module (dual checkout, PLATFORM_CRONS_DIR). DRY_RUN=1 writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PC = process.env.PLATFORM_CRONS_DIR || 'platform-crons';
const S = require(path.resolve(PC, 'token-catalog/capa-supply.js'));
const DRY = process.env.DRY_RUN === '1';
const LEGACY = process.env.LEGACY_BASE || 'https://raw.githubusercontent.com/defipatriot/ampcapa-data_2026/main/snapshots';
const OUT = path.resolve(process.env.OUT_DIR || 'token-catalog/supply/capa');
const DAILY_DIR = path.join(OUT, 'wallets-daily');

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}
// committed file: null = absent (404 / ENOENT), undefined = unreadable (corrupt) — the distinction the merge rules key on
function readCommitted(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return undefined; }
}
const num = (v) => (v == null ? null : Number(v));

(async () => {
  console.log(`capa-supply fold-legacy · ${DRY ? 'DRY RUN' : 'WRITE'} · legacy ${LEGACY}`);
  const idx = await getJson(`${LEGACY}/index.json`);
  if (!idx) throw new Error('legacy index.json missing — nothing to fold');
  const keys = [...(idx.weekly || []).map(k => ['weekly', k]), ...(idx.monthly || []).map(k => ['monthly', k])];
  console.log(`legacy index: ${idx.weekly?.length || 0} weekly + ${idx.monthly?.length || 0} monthly snapshots (dailies are 404 upstream — not folded)`);

  const legacyRows = []; let daysWritten = 0, daysSkipped = 0, unreadable = 0;
  let dailyIndex = readCommitted(path.join(DAILY_DIR, 'index.json'));
  if (dailyIndex === undefined) throw new Error('never-shrink: wallets-daily/index.json unreadable — refusing');
  const seenDates = new Set();
  for (const [kind, key] of keys) {
    const snap = await getJson(`${LEGACY}/${kind}/${key}.json`);
    if (snap && snap.meta && seenDates.has(snap.meta.date)) { console.log(`  · ${kind}/${key}: date ${snap.meta.date} already folded this run (weekly + monthly on the same day) — first wins`); continue; }
    if (snap && snap.meta) seenDates.add(snap.meta.date);
    if (!snap || !snap.meta || !Array.isArray(snap.members)) { unreadable++; console.log(`  ✗ ${kind}/${key}: unreadable/absent upstream — skipped (never invented)`); continue; }
    const date = snap.meta.date, src = `legacy_fold ampcapa-data_2026 ${key}`;
    const hub = num(snap.rates && snap.rates.rateStaking), ve3 = num(snap.rates && snap.rates.rateVe3);
    const rows = {}; let receiptSum = 0, capaSum = 0;
    for (const m of snap.members) { const capa = num(m.capa); if (capa == null) continue; rows[m.address] = [null, Math.round(capa * 1e6) / 1e6]; capaSum += capa; receiptSum += num(m.ampLP) || 0; }
    // guard: the snapshot's own summary must agree with what we fold (the legacy cron computed both)
    const summaryCapa = num(snap.summary && snap.summary.totalCapa);
    const agree = summaryCapa == null ? null : Math.abs(summaryCapa - capaSum) <= Math.max(1, summaryCapa * 1e-4);
    if (agree === false) { console.log(`  ✗ ${key}: Σ members.capa ${capaSum.toFixed(2)} ≠ summary.totalCapa ${summaryCapa} — skipped`); unreadable++; continue; }
    const dailyPath = path.join(DAILY_DIR, `${date}.json`);
    const existing = readCommitted(dailyPath);
    if (existing === undefined) throw new Error(`never-shrink: ${dailyPath} unreadable — refusing`);
    if (existing && existing.src === 'capture') { daysSkipped++; console.log(`  · ${key} → ${date}: captured day exists — untouched (prior-verbatim)`); }
    else {
      const doc = { schemaVersion: 2, module: 'token-catalog', product: 'supply/capa/wallets-daily', date, capturedAt: snap.meta.timestamp, src, status: 'legacy_fold',
        rates: { hub_capa_per_ampcapa: hub, compounder_ampcapa_per_receipt: ve3 }, columns: ['total_capa_equiv', 'receipt_dao_capa'],
        note: 'total_capa_equiv is null: the legacy feed measured only the DAO receipt position (its members[].capa = receipt × ve3 rate × hub rate).',
        row_count: Object.keys(rows).length, rows };
      if (!DRY) { fs.mkdirSync(DAILY_DIR, { recursive: true }); fs.writeFileSync(dailyPath, JSON.stringify(doc)); }
      daysWritten++;
      const di = S.upsertDailyIndex(dailyIndex, date, 'legacy_fold'); dailyIndex = di.doc;
      console.log(`  ✓ ${key} → wallets-daily/${date}.json (${Object.keys(rows).length} members, Σ receipt_dao ${capaSum.toFixed(0)} CAPA, hub ${hub})`);
    }
    legacyRows.push(S.legacyIndexRow({ date, capturedAt: snap.meta.timestamp, hub_rate: hub, receipt_in_dao: receiptSum || null, src }));
  }
  if (!DRY && dailyIndex) fs.writeFileSync(path.join(DAILY_DIR, 'index.json'), JSON.stringify(dailyIndex, null, 2));

  const idxPath = path.join(OUT, 'index.json');
  const existingIdx = readCommitted(idxPath);
  const fold = S.foldIndexRows(existingIdx, legacyRows);   // throws on unreadable (undefined); null = start fresh
  if (!DRY) fs.writeFileSync(idxPath, JSON.stringify(fold.doc, null, 2));
  console.log(`index.json: +${fold.added} legacy rows, ${fold.skipped} dates already had a committed row (untouched) → ${fold.doc.row_count} rows ${fold.doc.date_range.from}→${fold.doc.date_range.to}`);
  console.log(`wallets-daily: ${daysWritten} written, ${daysSkipped} captured days untouched, ${unreadable} legacy files skipped · day index ${dailyIndex ? dailyIndex.day_count : 0} days`);
  fs.writeFileSync('fold-legacy-report.json', JSON.stringify({ ran_at: new Date().toISOString(), dry_run: DRY, daysWritten, daysSkipped, unreadable, index_added: fold.added, index_skipped: fold.skipped, index_rows: fold.doc.row_count }, null, 2));
})().catch(e => { console.error('FOLD FAILED', e); process.exit(1); });

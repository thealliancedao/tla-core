// price-history / reanchor-ratios.mjs — ONE-TIME repair (Milestone A step 3 (i), 2026-09-27).
// Re-anchors price-history/ratios (and the LST USD rows priced as BASE × ratio(interpolated)) on the chain reads that
// dex-data/state-history took at every epoch boundary since E97. The RULE is not here: it is platform-crons
// dex-data/lib/ratio-anchor.js, checked out at run time (the same file dex-data's weekly state-history duty uses to keep
// the series going forward) — one rule, no copy.
// Reads the checkout (tla-core) from disk; writes ONLY the month files whose content changed; the workflow commits.
// Every changed row is labeled in place (repair.was kept, write-once); chain_exact rows and measured USD rows are never
// touched. Idempotent: a second run changes nothing (the report says 0).
//   env: PLATFORM_CRONS_DIR (checkout of thealliancedao/platform-crons) · DRY_RUN=1 (report only) · REPORT=<path>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PC = process.env.PLATFORM_CRONS_DIR || 'platform-crons'; const DRY = process.env.DRY_RUN === '1'; const ROOT = process.env.TLA_CORE_DIR || '.';
const RA = require(path.resolve(PC, 'dex-data/lib/ratio-anchor.js'));
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const epDir = path.join(ROOT, 'dex-data/state-history/epochs');
const epochs = fs.readdirSync(epDir).filter(f => /^\d+\.json$/.test(f)).map(f => J(path.join('dex-data/state-history/epochs', f)));
const anchors = RA.anchorsFrom(epochs);
const loadMonths = (dir) => { const m = new Map(); const base = path.join(ROOT, dir); for (const y of fs.readdirSync(base).filter(x => /^20\d\d$/.test(x))) for (const f of fs.readdirSync(path.join(base, y)).filter(x => /^\d\d\.json$/.test(x))) m.set(`${y}/${f.slice(0, 2)}`, J(path.join(dir, y, f))); return m; };
const ratioMonths = loadMonths('price-history/ratios'), priceMonths = loadMonths('price-history');
const at = new Date().toISOString();
const r = RA.reanchor({ ratioMonths, priceMonths, anchors, opts: { by: 'ratio-reanchor-1.0.0 (' + RA.VERSION + ')', at } });
const write = (dir, k, doc) => { const p = path.join(ROOT, dir, k + '.json'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n'); };
const report = { script: 'reanchor-ratios 1.0.0', lib: RA.VERSION, at, dry_run: DRY, epochs_read: epochs.length, epochs_complete: epochs.filter(e => e.complete).length,
  ratio_months_changed: [...r.changedRatio].sort(), price_months_changed: [...r.changedPrice].sort(), hubs: r.report };
console.log(`reanchor-ratios · ${RA.VERSION} · ${epochs.length} epoch files (${report.epochs_complete} complete) · DRY_RUN=${DRY ? 1 : 0}`);
for (const [h, x] of Object.entries(r.report)) console.log(`  ${h.padEnd(8)} anchors ${x.anchors} (${x.first_anchor}→${x.last_anchor}) · ratio repaired ${x.repaired} (was mean ${x.delta_pct.mean == null ? '—' : x.delta_pct.mean.toFixed(2) + '%'} high, max ${x.delta_pct.max.toFixed(2)}% on ${x.delta_pct.max_day || '—'}) · added ${x.added} · pre-E97 re-interpolated ${x.pre_anchor_reinterpolated} · chain_exact kept ${x.chain_exact_kept} (max Δ ${x.chain_exact_max_abs_delta_pct}%) · USD repaired ${x.usd_repaired} / added ${x.usd_added} / measured kept ${x.usd_kept_measured} / no base ${x.usd_no_base}`);
console.log(`  months changed: ratios ${r.changedRatio.size} · prices ${r.changedPrice.size}`);
for (const [h, x] of Object.entries(r.report)) if (x.chain_exact_kept && x.chain_exact_max_abs_delta_pct > 0.5) { console.error(`✗ ${h}: the chain anchors disagree with the chain_exact archive by ${x.chain_exact_max_abs_delta_pct}% (> 0.5%) — not writing`); process.exit(1); }
if (!DRY) { for (const k of r.changedRatio) write('price-history/ratios', k, ratioMonths.get(k)); for (const k of r.changedPrice) write('price-history', k, priceMonths.get(k)); console.log(`  wrote ${r.changedRatio.size + r.changedPrice.size} month files`); }
fs.writeFileSync(process.env.REPORT || 'reanchor-report.json', JSON.stringify(report, null, 2) + '\n');

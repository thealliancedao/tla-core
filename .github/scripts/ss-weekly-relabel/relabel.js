// =============================================================================
// ss-weekly-relabel — ONE-OFF (2026-08-10, strip #3 deploy-prereq 1b)
// =============================================================================
// The entire legacy SkeletonSwap weekly-avg series is labeled ONE EPOCH AHEAD
// of the canonical epoch registry (docs/epoch_1-300_date.json): the legacy
// weekly job ran after the Monday flip and stamped the RUN-TIME epoch on the
// PRIOR week's data. Gate-proven 2026-08-10 (cron-dex-data-log 1.5.0): e.g.
// legacy "2026-epoch-196.csv" holds Jul 20–26 = canonical epoch 195.
//
// TRUTH RULE: every file's own period_start/period_end columns are the ground
// truth — filenames and label columns are corrected FROM them. This makes the
// script safe against mixed state (the org fold already wrote a CANONICAL
// epoch-197 file; it classifies as 'ok' and is never touched).
//
// THREE HUMAN-GATED PHASES (copy-verify-then-kill doctrine — run in order,
// review the report between each):
//   report → classify every weekly file (ok / mislabeled / anomaly), list
//            daily gap-fill candidates (dates missing from org daily-csv that
//            exist in the legacy repo) and rebuild candidates (canonical
//            epochs with no file but with dailies). WRITES ONLY THE REPORT.
//   apply  → (a) relabel: write each mislabeled file under its canonical name
//            with the period label column corrected — content otherwise
//            VERBATIM, verified row-by-row after push; (b) gap-fill dailies
//            from the legacy repo (byte-verified after push); (c) rebuild
//            missing canonical epochs using the LIVE fold module's own
//            buildWeekly (fetched from platform-crons at runtime — the
//            no-third-copy rule: aggregation math is never reimplemented
//            here). NO DELETIONS in this phase.
//   prune  → delete each mislabeled ORIGINAL, but only after re-verifying its
//            canonical twin exists and matches it row-for-row modulo the label.
//            Refuses loudly otherwise.
//
// Scope guard: only dex-data/skeletonswap/{weekly-avg,daily-csv}/ paths are
// ever written or deleted. Monthly files are untouched (filenames are
// YYYY-MM; their numbers came from the same underlying data either way).
// =============================================================================

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PHASE = (process.env.PHASE || process.argv[2] || 'report').toLowerCase();

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const LEGACY_REPO   = process.env.LEGACY_REPO   || 'defipatriot/ss-pool-data_2026';
const CRONS_REPO    = process.env.CRONS_REPO    || 'thealliancedao/platform-crons';

const WEEKLY_DIR = 'dex-data/skeletonswap/weekly-avg';
const DAILY_DIR  = 'dex-data/skeletonswap/daily-csv';
const REPORT_PATH = 'dex-data/skeletonswap/relabel-report.json';

// Canonical TLA epoch math (matches docs/epoch_1-300_date.json exactly).
const EPOCH_START = Date.parse('2022-10-31T00:00:00Z');
const EPOCH_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const epochOf = (ms) => Math.floor((ms - EPOCH_START) / EPOCH_MS) + 1;
const epochStartMs = (ep) => EPOCH_START + (ep - 1) * EPOCH_MS;
const epochLabel = (ep) => `${new Date(epochStartMs(ep)).getUTCFullYear()}-epoch-${ep}`;
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];

// Earliest sliced daily — nothing before this is reconstructable here.
const DAILY_FLOOR = '2026-01-12';

// SS weekly trust boundary: the legacy cron read the warlock bulk endpoint
// until the 2026-05-18 architecture fix (warlock itself froze 2026-04-16).
// Dailies BEFORE this date are warlock-era and method-tainted — rebuilding
// from them would launder tainted data into canonical-looking files. Weekly
// epochs whose window starts before this stay honestly absent; the raw
// old-schema files are preserved verbatim in legacy-unverified/.
const TRUST_START_MS = Date.parse('2026-05-18T00:00:00Z');
const UNVERIFIED_DIR = `${WEEKLY_DIR}/legacy-unverified`;

// Local-gate escape hatches (production Action never sets these).
const WEEKLY_LIST_FILE = process.env.WEEKLY_LIST_FILE || '';
const DAILY_LIST_FILE  = process.env.DAILY_LIST_FILE  || '';
const DRY_RUN = process.env.DRY_RUN === '1';

// -----------------------------------------------------------------------------
// HTTP
// -----------------------------------------------------------------------------
function httpRequest(url, { method = 'GET', headers = {}, body = null, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      method, hostname: u.hostname, port: u.port || 443, path: u.pathname + (u.search || ''),
      headers: {
        'User-Agent': 'ss-weekly-relabel/1.0',
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers,
      },
      timeout: timeoutMs,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolve(httpRequest(new URL(res.headers.location, url).toString(), { method, headers, body, timeoutMs }));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`timeout ${url}`)));
    if (body) req.write(body);
    req.end();
  });
}

function apiHeaders() {
  return { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' };
}

async function fetchRaw(repo, repoPath) {
  const r = await httpRequest(`https://raw.githubusercontent.com/${repo}/${GITHUB_BRANCH}/${repoPath}?cb=${Date.now()}`);
  return r.status === 200 ? r.body : null;
}

// Post-push verification fetch: a JUST-CREATED file can 404 on the raw CDN for
// several seconds. Retry with backoff and NEVER coerce not-yet-visible (null)
// into empty content — the caller must distinguish 'not visible' from
// 'content mismatch' (silent-coercion doctrine).
async function fetchRawWithRetry(repo, repoPath, { attempts = 8, delayMs = 4000 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    const body = await fetchRaw(repo, repoPath);
    if (body !== null) return body;
    if (i < attempts) {
      console.log(`  … ${repoPath} not visible on raw CDN yet (attempt ${i}/${attempts}) — waiting`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return null;
}

async function listDir(dir) {
  if (dir === WEEKLY_DIR && WEEKLY_LIST_FILE) return fs.readFileSync(WEEKLY_LIST_FILE, 'utf8').trim().split('\n').map(s => path.basename(s.trim()));
  if (dir === DAILY_DIR && DAILY_LIST_FILE) return fs.readFileSync(DAILY_LIST_FILE, 'utf8').trim().split('\n').map(s => path.basename(s.trim()));
  const r = await httpRequest(`https://api.github.com/repos/${GITHUB_REPO}/contents/${dir}?ref=${GITHUB_BRANCH}&per_page=1000`, { headers: apiHeaders() });
  if (r.status !== 200) throw new Error(`listDir ${dir}: HTTP ${r.status} ${r.body.slice(0, 200)}`);
  return JSON.parse(r.body).map(e => e.name);
}

async function getSha(repoPath) {
  const r = await httpRequest(`https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`, { headers: apiHeaders() });
  if (r.status !== 200) return null;
  return JSON.parse(r.body).sha;
}

async function pushFile(repoPath, content, message) {
  if (DRY_RUN) { console.log(`  [dry-run] would push ${repoPath}`); return true; }
  for (let attempt = 1; attempt <= 4; attempt++) {
    const sha = await getSha(repoPath);
    const r = await httpRequest(`https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`, {
      method: 'PUT', headers: apiHeaders(),
      body: JSON.stringify({ message, content: Buffer.from(content).toString('base64'), branch: GITHUB_BRANCH, ...(sha ? { sha } : {}) }),
    });
    if (r.status === 200 || r.status === 201) { console.log(`  ✅ pushed ${repoPath}`); return true; }
    if (r.status === 409 || r.status === 422 || r.status >= 500) {
      await new Promise(res => setTimeout(res, 400 * attempt)); continue;
    }
    throw new Error(`push ${repoPath}: HTTP ${r.status} ${r.body.slice(0, 200)}`);
  }
  throw new Error(`push ${repoPath}: retries exhausted`);
}

async function deleteFile(repoPath, message) {
  if (DRY_RUN) { console.log(`  [dry-run] would DELETE ${repoPath}`); return true; }
  const sha = await getSha(repoPath);
  if (!sha) throw new Error(`delete ${repoPath}: file not found`);
  const r = await httpRequest(`https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`, {
    method: 'DELETE', headers: apiHeaders(),
    body: JSON.stringify({ message, sha, branch: GITHUB_BRANCH }),
  });
  if (r.status !== 200) throw new Error(`delete ${repoPath}: HTTP ${r.status} ${r.body.slice(0, 200)}`);
  console.log(`  🗑  deleted ${repoPath}`);
  return true;
}

// -----------------------------------------------------------------------------
// CSV
// -----------------------------------------------------------------------------
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { header: lines[0] || '', rows: [] };
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').replace(/^"|"$/g, ''); });
    return row;
  });
  return { header: lines[0], rows };
}

// Rows equal modulo the `period` label column (used by relabel-verify + prune-safety).
function rowsMatchModuloLabel(aCsv, bCsv) {
  const A = parseCSV(aCsv), B = parseCSV(bCsv);
  if (A.header !== B.header) return { ok: false, why: 'header mismatch' };
  if (A.rows.length !== B.rows.length) return { ok: false, why: `row count ${A.rows.length} vs ${B.rows.length}` };
  const key = r => r.pool_name;
  const bByPool = Object.fromEntries(B.rows.map(r => [key(r), r]));
  for (const ra of A.rows) {
    const rb = bByPool[key(ra)];
    if (!rb) return { ok: false, why: `pool ${key(ra)} missing` };
    for (const f of Object.keys(ra)) {
      if (f === 'period') continue;
      if (ra[f] !== rb[f]) return { ok: false, why: `${key(ra)}.${f}: '${ra[f]}' vs '${rb[f]}'` };
    }
  }
  return { ok: true };
}

// Rewrite ONLY the period label column (first CSV field) on every data row.
function relabelCsv(content, oldLabel, newLabel) {
  const lines = content.trim().split('\n');
  const out = [lines[0]];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].startsWith(oldLabel + ',')) {
      throw new Error(`row ${i} does not start with expected label '${oldLabel}': ${lines[i].slice(0, 60)}`);
    }
    out.push(newLabel + lines[i].slice(oldLabel.length));
  }
  return out.join('\n') + '\n';
}

// -----------------------------------------------------------------------------
// CLASSIFY — each weekly file against its own period columns (ground truth)
// -----------------------------------------------------------------------------
async function classifyWeeklyFiles() {
  const names = (await listDir(WEEKLY_DIR)).filter(n => n.endsWith('.csv'));
  const entries = [];
  for (const name of names.sort()) {
    const m = name.match(/^(\d{4})-epoch-(\d+)\.csv$/);
    if (!m) { entries.push({ name, class: 'anomaly', why: 'unrecognized filename' }); continue; }
    const nameEpoch = parseInt(m[2], 10);
    const content = await fetchRaw(GITHUB_REPO, `${WEEKLY_DIR}/${name}`);
    if (!content) { entries.push({ name, class: 'anomaly', why: 'unfetchable' }); continue; }
    const { rows } = parseCSV(content);
    const ps = rows[0]?.period_start, pe = rows[0]?.period_end;
    if (!ps) {
      // OLD SCHEMA (pre-metadata): no period bounds, pool_id column, some files
      // carry W-format labels inside epoch-named files (renamed at least once),
      // and the 177–179 era carries frozen identical rows (warlock-stale).
      // True window unknowable + method-tainted → preserve verbatim in
      // legacy-unverified/, never relabel, never counted as coverage.
      const innerLabel = rows[0]?.period || '';
      entries.push({ name, nameEpoch, class: 'unverifiable', innerLabel,
        why: 'old schema — no period bounds; window unknowable; method-tainted era',
        archiveTo: `legacy-unverified/${name}` });
      continue;
    }
    const canonical = epochOf(Date.parse(ps + 'T00:00:00Z'));
    const canonicalFromEnd = pe ? epochOf(Date.parse(pe + 'T00:00:00Z')) : canonical;
    if (canonical !== canonicalFromEnd) {
      entries.push({ name, nameEpoch, period_start: ps, period_end: pe, class: 'anomaly', why: `window spans epochs ${canonical}..${canonicalFromEnd}` });
      continue;
    }
    const cls = nameEpoch === canonical ? 'ok'
      : nameEpoch === canonical + 1 ? 'mislabeled'
      : 'anomaly';
    entries.push({
      name, nameEpoch, period_start: ps, period_end: pe, canonicalEpoch: canonical,
      class: cls,
      ...(cls === 'mislabeled' ? { relabelTo: `${epochLabel(canonical)}.csv`, oldLabel: `${m[1]}-epoch-${nameEpoch}`, newLabel: epochLabel(canonical) } : {}),
      ...(cls === 'anomaly' ? { why: `name epoch ${nameEpoch} vs canonical ${canonical} (offset ≠ +1)` } : {}),
    });
  }
  return entries;
}

// Daily gap-fill candidates: dates from DAILY_FLOOR to yesterday missing in the
// org tree; check which exist in the legacy repo's month backup folders.
async function findDailyGaps() {
  const have = new Set((await listDir(DAILY_DIR)).filter(n => n.endsWith('.csv')).map(n => n.replace('.csv', '')));
  const gaps = [];
  const start = Date.parse(DAILY_FLOOR + 'T00:00:00Z');
  const yesterday = Date.now() - DAY_MS;
  for (let t = start; t <= yesterday; t += DAY_MS) {
    const d = isoDate(t);
    if (have.has(d)) continue;
    const month = MONTH_NAMES[new Date(t).getUTCMonth()];
    const legacyPath = `data/${month}_backup/${d}.csv`;
    const content = await fetchRaw(LEGACY_REPO, legacyPath);
    gaps.push({ date: d, legacyPath, inLegacy: !!content });
  }
  return gaps;
}

// Rebuild candidates: canonical epochs with dailies fully inside the org tree
// but no canonical weekly file (evaluated AFTER relabels are accounted for).
function findRebuildCandidates(weeklyEntries, dailyNames) {
  const dailySet = new Set(dailyNames.map(n => n.replace('.csv', '')));
  const canonicalPresent = new Set();
  for (const e of weeklyEntries) {
    if (e.class === 'ok') canonicalPresent.add(e.canonicalEpoch ?? e.nameEpoch);
    if (e.class === 'mislabeled') canonicalPresent.add(e.canonicalEpoch);
    // 'unverifiable' deliberately does NOT count as coverage.
  }
  const firstEpoch = epochOf(Date.parse(DAILY_FLOOR + 'T00:00:00Z'));
  const lastComplete = epochOf(Date.now()) - 1;
  const out = [];
  for (let ep = firstEpoch; ep <= lastComplete; ep++) {
    if (canonicalPresent.has(ep)) continue;
    if (epochStartMs(ep) < TRUST_START_MS) continue; // pre-trust: honestly absent
    const s = epochStartMs(ep);
    let dayCount = 0;
    for (let d = 0; d < 7; d++) if (dailySet.has(isoDate(s + d * DAY_MS))) dayCount++;
    if (dayCount > 0) out.push({ epoch: ep, label: epochLabel(ep), window: `${isoDate(s)}..${isoDate(s + 6 * DAY_MS)}`, dailiesAvailable: dayCount });
  }
  return out;
}

// Fetch the LIVE fold module from platform-crons and require it (no-third-copy:
// the weekly aggregation math is the production fold's own buildWeekly).
async function loadFoldModule() {
  const src = await fetchRaw(CRONS_REPO, 'dex-data/epochs-skeletonswap.js');
  if (!src) throw new Error('cannot fetch epochs-skeletonswap.js from platform-crons');
  const tmp = path.join(os.tmpdir(), 'epochs-skeletonswap.live.js');
  fs.writeFileSync(tmp, src);
  return require(tmp);
}

// -----------------------------------------------------------------------------
// PHASES
// -----------------------------------------------------------------------------
async function phaseReport() {
  console.log('=== PHASE: report (writes only the report file) ===');
  const weekly = await classifyWeeklyFiles();
  const dailyNames = (await listDir(DAILY_DIR)).filter(n => n.endsWith('.csv'));
  const gaps = await findDailyGaps();
  const rebuilds = findRebuildCandidates(weekly, dailyNames);
  const report = {
    generatedAt: new Date().toISOString(),
    phaseHistory: { report: new Date().toISOString() },
    doctrine: 'period columns are ground truth; filenames/labels corrected from them',
    counts: {
      weeklyFiles: weekly.length,
      ok: weekly.filter(e => e.class === 'ok').length,
      mislabeled: weekly.filter(e => e.class === 'mislabeled').length,
      unverifiable: weekly.filter(e => e.class === 'unverifiable').length,
      anomalies: weekly.filter(e => e.class === 'anomaly').length,
      dailyGaps: gaps.length,
      dailyGapsFillable: gaps.filter(g => g.inLegacy).length,
      rebuildCandidates: rebuilds.length,
    },
    weekly, dailyGaps: gaps, rebuildCandidates: rebuilds,
  };
  console.log(JSON.stringify(report.counts, null, 2));
  for (const e of weekly) console.log(`  ${e.class.padEnd(12)} ${e.name}  ${e.period_start || ''}..${e.period_end || ''}  ${e.relabelTo ? '→ ' + e.relabelTo : (e.archiveTo ? '→ ' + e.archiveTo : (e.why || ''))}`);
  for (const g of gaps) console.log(`  daily-gap  ${g.date}  legacy:${g.inLegacy ? 'YES' : 'no'}`);
  for (const r of rebuilds) console.log(`  rebuild    ${r.label}  (${r.window}, ${r.dailiesAvailable}/7 dailies)`);
  await pushFile(REPORT_PATH, JSON.stringify(report, null, 2), '📋 ss-weekly-relabel report');
  if (report.counts.anomalies > 0) console.log('\n⚠ anomalies present — resolve before apply.');
  console.log('\nHuman gate: review the report, then dispatch phase=apply.');
  return report;
}

async function phaseApply() {
  console.log('=== PHASE: apply (relabel + gap-fill + rebuild; NO deletions) ===');
  const weekly = await classifyWeeklyFiles();
  const anomalies = weekly.filter(e => e.class === 'anomaly');
  if (anomalies.length) throw new Error(`refusing: ${anomalies.length} anomalies unresolved: ${anomalies.map(a => a.name).join(', ')}`);

  // (a) relabel
  for (const e of weekly.filter(x => x.class === 'mislabeled')) {
    const target = `${WEEKLY_DIR}/${e.relabelTo}`;
    const existing = await fetchRaw(GITHUB_REPO, target);
    const original = await fetchRaw(GITHUB_REPO, `${WEEKLY_DIR}/${e.name}`);
    if (!original) throw new Error(`source vanished: ${e.name}`);
    if (existing) {
      const { rows } = parseCSV(existing);
      if (rows[0]?.period_start === e.period_start) { console.log(`  ↷ ${e.relabelTo} already canonical — skip`); continue; }
      throw new Error(`collision: ${e.relabelTo} exists with different window (${rows[0]?.period_start}) — manual review`);
    }
    const relabeled = relabelCsv(original, e.oldLabel, e.newLabel);
    await pushFile(target, relabeled, `🏷 relabel ${e.name} → ${e.relabelTo} (canonical; window ${e.period_start}..${e.period_end})`);
    if (!DRY_RUN) {
      const back = await fetchRawWithRetry(GITHUB_REPO, target);
      if (back === null) throw new Error(`verify failed for ${e.relabelTo}: not visible on raw CDN after retries (push succeeded — re-dispatch apply to resume)`);
      const check = rowsMatchModuloLabel(original, back);
      if (!check.ok) throw new Error(`verify failed for ${e.relabelTo}: ${check.why}`);
      console.log(`  ✔ verified ${e.relabelTo} (rows match original modulo label)`);
    }
  }

  // (a2) archive unverifiable old-schema files verbatim (never-shrink; the
  // original is deleted only in prune, after this copy is byte-verified again)
  for (const e of weekly.filter(x => x.class === 'unverifiable')) {
    const original = await fetchRaw(GITHUB_REPO, `${WEEKLY_DIR}/${e.name}`);
    if (!original) throw new Error(`source vanished: ${e.name}`);
    const target = `${UNVERIFIED_DIR}/${e.name}`;
    const existing = await fetchRaw(GITHUB_REPO, target);
    if (existing === original) { console.log(`  ↷ ${e.name} already archived — skip`); continue; }
    if (existing) throw new Error(`collision: ${target} exists with different content — manual review`);
    await pushFile(target, original, `📦 archive unverifiable ${e.name} (old schema, window unknowable) verbatim`);
    if (!DRY_RUN) {
      const back = await fetchRawWithRetry(GITHUB_REPO, target);
      if (back === null) throw new Error(`byte-verify failed: ${target} not visible on raw CDN after retries (push succeeded — re-dispatch apply to resume)`);
      if (back !== original) throw new Error(`byte-verify failed: ${target} content differs`);
      console.log(`  ✔ byte-verified archive ${target}`);
    }
  }

  // (b) daily gap-fill from legacy (verbatim, byte-verified)
  const gaps = await findDailyGaps();
  for (const g of gaps.filter(x => x.inLegacy)) {
    const content = await fetchRaw(LEGACY_REPO, g.legacyPath);
    if (!content) throw new Error(`legacy daily vanished: ${g.legacyPath}`);
    const target = `${DAILY_DIR}/${g.date}.csv`;
    await pushFile(target, content, `📥 gap-fill daily ${g.date} from legacy (verbatim)`);
    if (!DRY_RUN) {
      const back = await fetchRawWithRetry(GITHUB_REPO, target);
      if (back === null) throw new Error(`byte-verify failed: ${target} not visible on raw CDN after retries (push succeeded — re-dispatch apply to resume)`);
      if (back !== content) throw new Error(`byte-verify failed: ${target} content differs`);
      console.log(`  ✔ byte-verified ${target}`);
    }
  }

  // (c) rebuild missing canonical epochs via the LIVE fold module
  const dailyNames = (await listDir(DAILY_DIR)).filter(n => n.endsWith('.csv'));
  const rebuilds = findRebuildCandidates(await classifyWeeklyFiles(), dailyNames);
  if (rebuilds.length) {
    const fold = await loadFoldModule();
    if (!fold._test?.buildWeekly) throw new Error('fold module lacks _test.buildWeekly');
    for (const r of rebuilds) {
      // buildWeekly(now) aggregates epoch(now)-1 → synthesize now inside epoch r.epoch+1
      const syntheticNow = new Date(epochStartMs(r.epoch + 1) + 12 * 60 * 60 * 1000);
      const wk = await fold._test.buildWeekly(syntheticNow);
      if (wk.epoch !== r.epoch) throw new Error(`rebuild targeting drift: wanted ${r.epoch} got ${wk.epoch}`);
      await pushFile(wk.filename, wk.csv, `🔧 rebuild canonical ${wk.periodStr} from dailies (${wk.meta.snapshots_used}/7)`);
    }
  }
  console.log('\nHuman gate: verify relabeled/gap-filled/rebuilt files, then dispatch phase=prune.');
}

async function phasePrune() {
  console.log('=== PHASE: prune (delete mislabeled originals; twin-verified per file) ===');
  const weekly = await classifyWeeklyFiles();
  const doomed = weekly.filter(e => e.class === 'mislabeled');
  const archived = weekly.filter(e => e.class === 'unverifiable');
  if (!doomed.length && !archived.length) { console.log('nothing to prune — series already canonical.'); return; }
  let pruned = 0;
  for (const e of archived) {
    const original = await fetchRaw(GITHUB_REPO, `${WEEKLY_DIR}/${e.name}`);
    const copy = await fetchRawWithRetry(GITHUB_REPO, `${UNVERIFIED_DIR}/${e.name}`);
    if (!copy) throw new Error(`refusing to prune ${e.name}: archive copy missing (run apply first)`);
    if (copy !== original) throw new Error(`refusing to prune ${e.name}: archive copy differs from original`);
    await deleteFile(`${WEEKLY_DIR}/${e.name}`, `🗑 prune old-schema ${e.name} (byte-verified in legacy-unverified/)`);
    pruned++;
  }
  for (const e of doomed) {
    const original = await fetchRaw(GITHUB_REPO, `${WEEKLY_DIR}/${e.name}`);
    const twin = await fetchRawWithRetry(GITHUB_REPO, `${WEEKLY_DIR}/${e.relabelTo}`);
    if (!twin) throw new Error(`refusing to prune ${e.name}: canonical twin ${e.relabelTo} missing (run apply first)`);
    const check = rowsMatchModuloLabel(original, twin);
    if (!check.ok) throw new Error(`refusing to prune ${e.name}: twin mismatch — ${check.why}`);
    await deleteFile(`${WEEKLY_DIR}/${e.name}`, `🗑 prune mislabeled ${e.name} (canonical twin ${e.relabelTo} verified)`);
    pruned++;
  }
  console.log(`\n✅ pruned ${pruned} mislabeled files — series is canonical.`);
}

// -----------------------------------------------------------------------------
async function main() {
  console.log(`ss-weekly-relabel — phase=${PHASE} repo=${GITHUB_REPO}${DRY_RUN ? ' [DRY RUN]' : ''}`);
  if (PHASE === 'report') return phaseReport();
  if (PHASE === 'apply')  return phaseApply();
  if (PHASE === 'prune')  return phasePrune();
  throw new Error(`unknown phase '${PHASE}' (report|apply|prune)`);
}

module.exports = { main, _test: { epochOf, epochLabel, relabelCsv, rowsMatchModuloLabel, parseCSV, findRebuildCandidates, classifyWeeklyFiles, findDailyGaps, fetchRawWithRetry } };
if (require.main === module) main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('❌', e.message); console.error(e.stack); process.exit(1); });

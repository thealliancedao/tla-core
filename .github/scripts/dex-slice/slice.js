// dex-slice — one-off: copy the legacy dex repos' HISTORY into tla-core's
// org dex-data tree, so the site can be repointed without losing a single
// chart point. Strip #2, step 1 of the reader-cutover migration.
//
//   defipatriot/astroport-pool-data_2026  \u2192 thealliancedao/tla-core dex-data/astroport/...
//   defipatriot/ss-pool-data_2026         \u2192 thealliancedao/tla-core dex-data/skeletonswap/...
//
// SAFETY (same law as fcd-relocate/fcd-compact):
//   \u2022 COPY ONLY — never deletes or modifies the source repos; suspension of
//     the legacy Render services and deletion of the legacy repos are later,
//     human, separate steps taken after reading this run's report.
//   \u2022 VERIFIED — every push confirmed by git blob sha vs fetched source bytes.
//   \u2022 WRITE-ONCE / ORG-WINS — a destination file that already exists is
//     SKIPPED (never overwritten): org-produced data always beats sliced
//     legacy data on collision dates.
//   \u2022 EXPLICIT MAP — only mapped directories are copied. Everything else is
//     recorded in the report as 'unmapped' so nothing can be silently lost
//     when the legacy repo is later deleted; the human reviews that list.
//
// Report: dex-data/slice-report.json in tla-core.

const https = require('https');
const crypto = require('crypto');

const DEST_REPO = process.env.DEST_REPO || 'thealliancedao/tla-core';
const BRANCH = process.env.DEST_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const GH_TRIES = Number(process.env.GH_TRANSIENT_TRIES || 5);

const SOURCES = [
  { repo: 'defipatriot/astroport-pool-data_2026', dex: 'astroport' },
  { repo: 'defipatriot/ss-pool-data_2026', dex: 'skeletonswap' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function fail(m) { console.error('FATAL: ' + m); process.exit(1); }
function blobSha(buf) { return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex'); }

// ---- pure mapping decision (gated directly) ----
// srcPath is repo-relative. Returns {action:'copy',dest} | {action:'skip',reason} | {action:'unmapped'}
function decideMap(dex, srcPath) {
  if (/^data\/heartbeat\.json$/.test(srcPath)) return { action: 'skip', reason: 'live product — org job owns heartbeats' };
  if (/^data\/current[^/]*\.json$/.test(srcPath)) return { action: 'skip', reason: 'live product — org job owns current' };
  if (dex === 'astroport' && /^astroport\/astroport-epoch-\d+\.json$/.test(srcPath))
    return { action: 'copy', dest: `dex-data/astroport/epochs/${srcPath.split('/').pop()}` };
  if (/^data\/daily\/[^/]+$/.test(srcPath))
    return { action: 'copy', dest: `dex-data/${dex}/snapshots/daily/${srcPath.split('/').pop()}` };
  if (dex === 'skeletonswap' && /^data\/weekly-avg\/[^/]+$/.test(srcPath))
    return { action: 'copy', dest: `dex-data/skeletonswap/weekly-avg/${srcPath.split('/').pop()}` };
  if (dex === 'skeletonswap' && /^data\/monthly[^/]*\/[^/]+$/.test(srcPath))
    return { action: 'copy', dest: `dex-data/skeletonswap/monthly/${srcPath.split('/').pop()}` };
  return { action: 'unmapped' };
}

function ghReqOnce(method, host, apiPath, body, accept, rawBuffer) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: host, path: apiPath, method, headers: { 'User-Agent': 'dex-slice', 'Accept': accept || 'application/vnd.github+json' } };
    if (TOKEN && host === 'api.github.com') opts.headers['Authorization'] = `Bearer ${TOKEN}`;
    let payload = null;
    if (body) {
      payload = Buffer.from(JSON.stringify(body));
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = payload.length;   // GitHub drops chunked DELETE/PUT bodies
    }
    const req = https.request(opts, (res) => {
      if (res.statusCode >= 301 && res.statusCode <= 302 && res.headers.location) {
        const u = new URL(res.headers.location);
        return resolve(ghReqOnce(method, u.hostname, u.pathname + u.search, body, accept, rawBuffer));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (rawBuffer) return resolve(buf);
          const d = buf.toString('utf8');
          try { resolve(JSON.parse(d)); } catch { resolve(d); }
        } else {
          const e = new Error(`${method} ${host}${String(apiPath).slice(0, 120)}: ${res.statusCode} ${buf.toString('utf8').slice(0, 140)}`);
          e.statusCode = res.statusCode; reject(e);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function ghReq(method, host, apiPath, body, accept, rawBuffer) {
  let last;
  for (let a = 1; a <= GH_TRIES; a++) {
    try { return await ghReqOnce(method, host, apiPath, body, accept, rawBuffer); }
    catch (e) {
      last = e;
      const sc = e.statusCode;
      const transient = !sc || sc >= 500 || sc === 429 || (sc === 403 && /rate limit/i.test(e.message));
      if (!transient || a === GH_TRIES) throw e;
      const wait = Math.min(60000, 1500 * Math.pow(2, a - 1));
      console.log(`  \u26a0 transient (${sc || String(e.message).slice(0, 50)}) \u2014 retry ${a}/${GH_TRIES - 1} in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
    }
  }
  throw last;
}

const api = (m, p, b) => ghReq(m, 'api.github.com', p, b);
const fetchRaw = (repo, p) => ghReq('GET', 'raw.githubusercontent.com', `/${repo}/main/${encodeURI(p)}`, null, null, true);

async function listDir(repo, p) {
  try { return await api('GET', `/repos/${repo}/contents/${encodeURI(p)}?ref=main&per_page=100`); }
  catch (e) { if (e.statusCode === 404) return null; throw e; }
}

async function destShaOf(p) {
  try { const r = await api('GET', `/repos/${DEST_REPO}/contents/${encodeURI(p)}?ref=${BRANCH}`); return r.sha || null; }
  catch (e) { if (e.statusCode === 404) return null; throw e; }
}

async function putFile(p, buf, msg) {
  const body = { message: msg, content: buf.toString('base64'), branch: BRANCH };
  for (let a = 1; a <= 6; a++) {
    try { return await api('PUT', `/repos/${DEST_REPO}/contents/${encodeURI(p)}`, body); }
    catch (e) {
      if (e.statusCode === 409 && a < 6) { await sleep(1500 * a); continue; }   // walk shares this branch
      throw e;
    }
  }
}

async function main() {
  if (!TOKEN) fail('GITHUB_TOKEN missing');
  const report = { schemaVersion: 1, kind: 'dex-slice-report', dest: DEST_REPO, startedAt: new Date().toISOString(), sources: [], copied: 0, skipped_exists: 0, skipped_live: 0, unmapped: [] };
  console.log(`dex-slice: legacy dex history \u2192 ${DEST_REPO} (copy + verify ONLY)`);

  for (const src of SOURCES) {
    console.log(`\n== ${src.repo} (${src.dex}) ==`);
    const files = [];
    async function walk(p) {
      const entries = await listDir(src.repo, p);
      for (const e of Array.isArray(entries) ? entries : []) {
        if (e.type === 'dir') await walk(e.path);
        else if (e.type === 'file') files.push({ path: e.path, size: e.size, sha: e.sha });
      }
    }
    await walk('');
    files.sort((a, b) => a.path.localeCompare(b.path));
    const s = { repo: src.repo, files: files.length, copied: 0 };
    console.log(`  census: ${files.length} files`);

    for (const f of files) {
      const d = decideMap(src.dex, f.path);
      if (d.action === 'unmapped') { report.unmapped.push(src.repo + '/' + f.path); continue; }
      if (d.action === 'skip') { report.skipped_live++; continue; }
      const existing = await destShaOf(d.dest);
      if (existing) { report.skipped_exists++; continue; }   // ORG WINS — never overwrite
      const buf = await fetchRaw(src.repo, f.path);
      const sha = blobSha(buf);
      if (sha !== f.sha) fail(`${f.path}: fetched sha != listing sha — refusing to push unverified bytes`);
      const res = await putFile(d.dest, buf, `dex-slice: ${d.dest} (from ${src.repo}, sha ${sha.slice(0, 8)})`);
      if (res?.content?.sha !== sha) fail(`${d.dest}: stored sha mismatch — verification failed`);
      s.copied++; report.copied++;
      console.log(`  \u2713 ${f.path} \u2192 ${d.dest}`);
    }
    report.sources.push(s);
  }

  report.finishedAt = new Date().toISOString();
  await putFile('dex-data/slice-report.json', Buffer.from(JSON.stringify(report, null, 1) + '\n'), `dex-slice report: ${report.copied} copied, ${report.skipped_exists} org-wins skips, ${report.unmapped.length} unmapped`);
  console.log(`\n\u2705 slice complete: ${report.copied} copied \u00b7 ${report.skipped_exists} already-in-org (org wins) \u00b7 ${report.skipped_live} live-product skips \u00b7 ${report.unmapped.length} UNMAPPED (review in report before any repo deletion).`);
}

if (require.main === module) main().catch((e) => fail(e.message));
module.exports = { decideMap, blobSha };

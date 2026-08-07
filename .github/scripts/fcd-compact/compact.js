// fcd-compact — one-off, IN-PLACE: gzip the frozen FCD archive parts
// (archive/fcd/**/part-*.json, ~2.24GB uncompressed, 72% of tla-core's
// working tree) inside tla-core itself. No new repos — same folders, same
// filenames + .gz, mirroring how the walk's own raw parts are stored.
// Expected result: ~2.24GB \u2192 roughly ~300MB.
//
// TWO PHASES, human gate between them (PHASE env / workflow input):
//   compress (default) \u2014 for each part-*.json: fetch, gzip(9), VERIFY the
//     gz decompresses back to byte-identical content (git blob sha), then
//     write part-*.json.gz alongside. DELETES NOTHING. Resumable: existing
//     .gz siblings are skipped. Writes archive/fcd/compaction-report.json.
//   prune \u2014 run ONLY after reading the report. For each part-*.json with a
//     .gz sibling: fetch the .gz, decompress, blob-sha must equal the
//     original's sha; only then delete the uncompressed original. Any
//     mismatch fails the run loudly with both files intact.
//
// state.json files stay uncompressed (small, human-readable on purpose).
// NOTE for the two frozen readers (fcd-fill.js, fcd-rederive-bribes.js —
// both already ran to completion): IF ever re-run after pruning, their
// part fetch needs a gunzip step ('.json.gz' + zlib.gunzipSync). Flagged
// on the board; not patched here to keep this change single-purpose.

const https = require('https');
const zlib = require('zlib');
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'thealliancedao/tla-core';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const PHASE = (process.env.PHASE || 'compress').toLowerCase();
const ROOT = 'archive/fcd';
const GH_TRIES = Number(process.env.GH_TRANSIENT_TRIES || 5);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function fail(m) { console.error('FATAL: ' + m); process.exit(1); }

function blobSha(buf) {
  return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

// ---- pure decisions (gated directly) ----
// compress phase: which files get a .gz written?
function decideCompress(name, gzSiblingExists) {
  if (!/^part-.*\.json$/.test(name)) return { action: 'ignore', reason: 'not a part file (state.json etc. stay uncompressed)' };
  if (gzSiblingExists) return { action: 'skip', reason: '.gz sibling already exists — write-once' };
  return { action: 'compress' };
}
// prune phase: may the uncompressed original be deleted?
function decidePrune(name, gzSiblingExists, roundtripShaMatches) {
  if (!/^part-.*\.json$/.test(name)) return { action: 'ignore' };
  if (!gzSiblingExists) return { action: 'fail', reason: 'no .gz sibling — compress phase incomplete; refusing to prune' };
  if (!roundtripShaMatches) return { action: 'fail', reason: '.gz does NOT decompress to byte-identical content — refusing to delete the original' };
  return { action: 'delete' };
}

function ghReqOnce(method, host, apiPath, body, accept, rawBuffer) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: host, path: apiPath, method, headers: { 'User-Agent': 'fcd-compact', 'Accept': accept || 'application/vnd.github+json' } };
    if (TOKEN && host === 'api.github.com') opts.headers['Authorization'] = `Bearer ${TOKEN}`;
    let payload = null;
    if (body) {
      payload = Buffer.from(JSON.stringify(body));
      opts.headers['Content-Type'] = 'application/json';
      // GitHub's API drops CHUNKED request bodies on DELETE (observed live:
      // prune's first DELETE got 422 "message/sha weren't supplied" despite a
      // written body). Explicit Content-Length forces a non-chunked body.
      opts.headers['Content-Length'] = payload.length;
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
const fetchRaw = (p) => ghReq('GET', 'raw.githubusercontent.com', `/${REPO}/${BRANCH}/${encodeURI(p)}`, null, null, true);

async function listDir(p) {
  try { return await api('GET', `/repos/${REPO}/contents/${encodeURI(p)}?ref=${BRANCH}&per_page=100`); }
  catch (e) { if (e.statusCode === 404) return null; throw e; }
}

async function putFile(p, buf, msg) {
  let sha = null;
  try { sha = (await api('GET', `/repos/${REPO}/contents/${encodeURI(p)}?ref=${BRANCH}`)).sha || null; } catch {}
  const body = { message: msg, content: buf.toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;
  for (let a = 1; a <= 4; a++) {
    try { return await api('PUT', `/repos/${REPO}/contents/${encodeURI(p)}`, body); }
    catch (e) { if (e.statusCode === 409 && a < 4) { await sleep(500 * a); continue; } throw e; }
  }
}

async function deleteFile(p, sha, msg) {
  return api('DELETE', `/repos/${REPO}/contents/${encodeURI(p)}`, { message: msg, sha, branch: BRANCH });
}

async function main() {
  if (!TOKEN) fail('GITHUB_TOKEN missing');
  if (!['compress', 'prune'].includes(PHASE)) fail(`PHASE must be compress|prune, got '${PHASE}'`);
  console.log(`fcd-compact: phase=${PHASE} on ${REPO}/${ROOT}${PHASE === 'compress' ? ' (writes .gz siblings, deletes NOTHING)' : ' (deletes originals ONLY where the .gz roundtrip verifies)'}`);

  // recursive census
  const files = [];
  async function walk(p) {
    const entries = await listDir(p);
    if (!entries) fail(`path ${p} not found`);
    for (const e of Array.isArray(entries) ? entries : []) {
      if (e.type === 'dir') await walk(e.path);
      else if (e.type === 'file') files.push({ path: e.path, name: e.name, size: e.size, sha: e.sha, dir: e.path.slice(0, -e.name.length - 1) });
    }
  }
  await walk(ROOT);
  const byPath = new Map(files.map((f) => [f.path, f]));
  const parts = files.filter((f) => /^part-.*\.json$/.test(f.name)).sort((a, b) => a.path.localeCompare(b.path));
  console.log(`census: ${files.length} files, ${(files.reduce((s, f) => s + f.size, 0) / 1048576).toFixed(0)} MB; ${parts.length} uncompressed part files`);

  const report = { schemaVersion: 1, kind: 'fcd-compaction-report', phase: PHASE, startedAt: new Date().toISOString(), done: 0, skipped: 0, in_bytes: 0, out_bytes: 0, files: [] };

  for (const [i, f] of parts.entries()) {
    const gzPath = f.path + '.gz';
    const gzExists = byPath.has(gzPath);

    if (PHASE === 'compress') {
      const d = decideCompress(f.name, gzExists);
      if (d.action === 'skip') { report.skipped++; console.log(`  [${i + 1}/${parts.length}] skip ${f.path} (${d.reason})`); continue; }
      if (d.action !== 'compress') continue;
      const buf = await fetchRaw(f.path);
      if (blobSha(buf) !== f.sha) fail(`${f.path}: fetched sha != listing sha — refusing to compress unverified bytes`);
      const gz = zlib.gzipSync(buf, { level: 9 });
      if (blobSha(zlib.gunzipSync(gz)) !== f.sha) fail(`${f.path}: gz roundtrip mismatch — refusing to write`);
      await putFile(gzPath, gz, `fcd-compact: ${f.name}.gz (${(f.size / 1048576).toFixed(1)}MB \u2192 ${(gz.length / 1048576).toFixed(1)}MB, orig sha ${f.sha.slice(0, 8)})`);
      report.done++; report.in_bytes += buf.length; report.out_bytes += gz.length;
      report.files.push({ path: gzPath, orig_sha: f.sha, orig_bytes: buf.length, gz_bytes: gz.length, verified: 'gz-roundtrip-blob-sha' });
      console.log(`  [${i + 1}/${parts.length}] ${f.path}: ${(buf.length / 1048576).toFixed(1)}MB \u2192 ${(gz.length / 1048576).toFixed(1)}MB \u2713`);
    } else { // prune
      let roundtripOk = false;
      if (gzExists) {
        const gz = await fetchRaw(gzPath);
        roundtripOk = blobSha(zlib.gunzipSync(gz)) === f.sha;
      }
      const d = decidePrune(f.name, gzExists, roundtripOk);
      if (d.action === 'fail') fail(`${f.path}: ${d.reason}`);
      if (d.action !== 'delete') continue;
      await deleteFile(f.path, f.sha, `fcd-compact prune: ${f.name} (verified .gz sibling holds byte-identical content, sha ${f.sha.slice(0, 8)})`);
      report.done++; report.in_bytes += f.size;
      report.files.push({ path: f.path, sha: f.sha, verified: 'gz-roundtrip-blob-sha', pruned: true });
      console.log(`  [${i + 1}/${parts.length}] pruned ${f.path} (verified against .gz) \u2713`);
    }
  }

  report.finishedAt = new Date().toISOString();
  await putFile(`${ROOT}/compaction-report.json`, Buffer.from(JSON.stringify(report, null, 1) + '\n'), `fcd-compact ${PHASE} report: ${report.done} done, ${report.skipped} skipped`);
  if (PHASE === 'compress') {
    console.log(`\u2705 compress complete: ${report.done} parts, ${(report.in_bytes / 1048576).toFixed(0)}MB \u2192 ${(report.out_bytes / 1048576).toFixed(0)}MB, every .gz roundtrip-verified. NOTHING deleted.`);
    console.log('NEXT (human-gated): read archive/fcd/compaction-report.json, then dispatch this workflow again with phase=prune.');
  } else {
    console.log(`\u2705 prune complete: ${report.done} originals removed (${(report.in_bytes / 1048576).toFixed(0)}MB freed from HEAD), each only after its .gz verified byte-identical.`);
  }
}

if (require.main === module) main().catch((e) => fail(e.message));
module.exports = { decideCompress, decidePrune, blobSha };

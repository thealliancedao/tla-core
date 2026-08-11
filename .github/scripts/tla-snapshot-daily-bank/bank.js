// =============================================================================
// tla-snapshot-daily-bank — ONE-OFF (2026-08-10, strip 4b kill prereq)
// =============================================================================
// Copies the legacy tla-snapshot DAILY ARCHIVE (data/daily/*.json) into
// tla-core member-data/tla-snapshot/daily/ — the LAST thing standing between
// us and deleting tla-snapshot-data_2026 outright. Two consumers need it:
//   1. the folded apr-history + pool-status-history rollups (they aggregate
//      the archive; without it the 15-epoch history restarts at zero)
//   2. tla-stats loadLockedInBaseline() (walks back up to 3 days from the
//      epoch boundary)
// Only YYYY-MM-DD.json is banked. dao-dashboard-*.json files in the same
// legacy folder belong to the dao-dashboard producer and are SKIPPED here —
// they migrate with that job's own strip (they'd also break the rollups'
// filename filter).
// Same hardened rules as astro-daily-bank: additive-only, ORG-WINS, blob-sha
// server-verified pushes, contents-API state reads. report → apply.
// =============================================================================

const https = require('https');
const crypto = require('crypto');

const PHASE = (process.env.PHASE || process.argv[2] || 'report').toLowerCase();
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const LEGACY_REPO   = 'defipatriot/tla-snapshot-data_2026';
const LEGACY_DIR    = 'data/daily';
const ORG_DIR       = 'member-data/tla-snapshot/daily';


function httpRequest(url, { method = 'GET', headers = {}, body = null, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      method, hostname: u.hostname, port: 443, path: u.pathname + (u.search || ''),
      headers: {
        'User-Agent': 'tla-snapshot-daily-bank/1.0',
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers,
      },
      timeout: timeoutMs,
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
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
const apiHeaders = () => ({ Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' });

function gitBlobSha1(content) {
  const buf = Buffer.from(content);
  return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

async function listDir(repo, dir) {
  const r = await httpRequest(`https://api.github.com/repos/${repo}/contents/${dir}?ref=main&per_page=1000`, { headers: apiHeaders() });
  if (r.status !== 200) throw new Error(`listDir ${repo}/${dir}: HTTP ${r.status} ${r.body.slice(0, 150)}`);
  return JSON.parse(r.body).map(e => e.name);
}

async function fetchLegacy(name) {
  const r = await httpRequest(`https://raw.githubusercontent.com/${LEGACY_REPO}/main/${LEGACY_DIR}/${name}?cb=${Date.now()}`);
  return r.status === 200 ? r.body : null;
}

async function pushOrg(relName, content) {
  const name = relName;
  const apiPath = `/repos/${GITHUB_REPO}/contents/${ORG_DIR}/${name}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    // additive-only: no sha lookup — if the file exists the PUT 422s and we abort
    // loudly (the plan already excluded existing files; a 422 here means a race).
    const r = await httpRequest(`https://api.github.com${apiPath}`, {
      method: 'PUT', headers: apiHeaders(),
      body: JSON.stringify({ message: `📥 bank legacy tla-snapshot daily ${name} (verbatim)`, content: Buffer.from(content).toString('base64'), branch: GITHUB_BRANCH }),
    });
    if (r.status === 201 || r.status === 200) {
      const storedSha = (() => { try { return JSON.parse(r.body).content.sha; } catch { return null; } })();
      if (storedSha !== gitBlobSha1(content)) throw new Error(`bank ${name}: stored blob sha mismatch — storage verification failed`);
      console.log(`  ✅ banked ${name} (blob sha server-verified)`);
      return true;
    }
    if (r.status === 409 || r.status >= 500) {
      console.log(`  ↻ push retry ${attempt} (HTTP ${r.status}) ${name}`);
      await new Promise(res => setTimeout(res, 500 * attempt + Math.floor(Math.random() * 400)));
      continue;
    }
    throw new Error(`bank ${name}: HTTP ${r.status} ${r.body.slice(0, 200)}`);
  }
  throw new Error(`bank ${name}: retries exhausted`);
}

async function main() {
  console.log(`astro-daily-bank — phase=${PHASE} → ${GITHUB_REPO}/${ORG_DIR}`);
  const legacy = (await listDir(LEGACY_REPO, LEGACY_DIR)).filter(n => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();  // dao-dashboard-*.json deliberately excluded
  const org = new Set(await listDir(GITHUB_REPO, ORG_DIR).catch(() => []));  // empty until the fold's first 23:xx archive
  const plan = legacy.filter(n => !org.has(n));
  const skipped = legacy.filter(n => org.has(n));
  console.log(`legacy dailies: ${legacy.length} (${legacy[0]} .. ${legacy[legacy.length - 1]})`);
  console.log(`already in org (org-wins, untouched): ${skipped.length} ${JSON.stringify(skipped)}`);
  console.log(`to bank: ${plan.length}`);
  if (PHASE === 'report') { console.log('\nHuman gate: review the plan, then dispatch phase=apply.'); return; }
  if (PHASE !== 'apply') throw new Error(`unknown phase '${PHASE}' (report|apply)`);

  let banked = 0, headerRejects = 0;
  for (const name of plan) {
    const content = await fetchLegacy(name);
    if (content === null) throw new Error(`legacy daily vanished: ${name}`);
    // Shape gate: must parse and carry the fields both consumers read.
    let doc;
    try { doc = JSON.parse(content); } catch { console.log(`  ⚠ unparseable, refused: ${name}`); headerRejects++; continue; }
    const okShape = Array.isArray(doc.pools) && doc.pools.length > 0
      && doc.pools.every(p => 'status' in p && p.voting_power && 'name' in p);
    if (!okShape) { console.log(`  ⚠ unexpected shape, refused: ${name}`); headerRejects++; continue; }
    await pushOrg(name, content);
    banked++;
  }
  console.log(`\n✅ banked ${banked}/${plan.length}${headerRejects ? ` — ${headerRejects} UNKNOWN-header refusals need manual review` : ''}`);
  if (headerRejects) process.exitCode = 1;
}

module.exports = { main, _test: { gitBlobSha1 } };
if (require.main === module) main().then(() => process.exit(process.exitCode || 0)).catch(e => { console.error('❌', e.message); process.exit(1); });

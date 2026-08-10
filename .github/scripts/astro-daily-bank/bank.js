// =============================================================================
// astro-daily-bank — ONE-OFF (2026-08-10, step-2 continuity prereq)
// =============================================================================
// Copies the legacy astroport daily CSVs (astroport-pool-data_2026/data/daily/,
// 2026-05-12..2026-08-09, schema verified IDENTICAL to the org fold's writer)
// into tla-core dex-data/astroport/daily-csv/ so the Pools-tab bucket charts
// keep their ~14-day depth after the reader repoint, and history is banked
// before the legacy repo dies (strip combo).
//
// RULES (inherited from ss-weekly-relabel's hardening, cron-dex-data-log):
//   - ADDITIVE ONLY: never overwrites. ORG-WINS: a date already present in the
//     org tree is skipped untouched (org 2026-08-09+ are fold-written).
//   - Every push is server-verified via the contents-API PUT response's git
//     blob sha vs the locally computed sha (no fetch-back reads).
//   - All org-tree state reads via the contents API, never the raw CDN.
//     Legacy reads via raw CDN are fine (settled, static repo).
//   - PHASE=report writes nothing and prints the copy plan; PHASE=apply copies.
//     Retire this workflow (disable + delete) once apply is verified.
// =============================================================================

const https = require('https');
const crypto = require('crypto');

const PHASE = (process.env.PHASE || process.argv[2] || 'report').toLowerCase();
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const LEGACY_REPO   = 'defipatriot/astroport-pool-data_2026';
const LEGACY_DIR    = 'data/daily';
const ORG_DIR       = 'dex-data/astroport/daily-csv';

// The legacy daily series has THREE schema eras (probed 2026-08-10):
//   11-col (2026-05-12..13), 15-col (05-14..16), 20-col (05-17..). The site
//   reader is era-tolerant BY DESIGN (header-keyed parse + field fallbacks:
//   pool_name||pool, tvl_usd??astroport_tvl_usd), so all three bank verbatim
//   into the ONE canonical dated series. Anything NOT matching a pinned known
//   header is refused loudly — unknown shapes never enter the tree.
const KNOWN_HEADERS = new Set([
  'pool,bucket,pool_type,pool_address,astroport_tvl_usd,astroport_day_volume_usd,latest_epoch_avg_liquidity,latest_epoch,deprecated,is_deregistered,fetch_ok',
  'date,time,dex,pool_name,pool_address,tvl_usd,volume_24h_usd,bucket,pool_type,is_amplified,latest_epoch_avg_liquidity,latest_epoch,deprecated,is_deregistered,fetch_ok',
  'date,time,dex,pool_name,pool_address,tvl_usd,volume_24h_usd,bucket,pool_type,is_amplified,latest_epoch_avg_liquidity,latest_epoch,deprecated,is_deregistered,fetch_ok,fees_24h_usd,fee_apr,lp_total_supply,astro_staked_usd,assets_json',
]);

function httpRequest(url, { method = 'GET', headers = {}, body = null, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      method, hostname: u.hostname, port: 443, path: u.pathname + (u.search || ''),
      headers: {
        'User-Agent': 'astro-daily-bank/1.0',
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
      body: JSON.stringify({ message: `📥 bank legacy astroport daily ${name} (verbatim)`, content: Buffer.from(content).toString('base64'), branch: GITHUB_BRANCH }),
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
  const legacy = (await listDir(LEGACY_REPO, LEGACY_DIR)).filter(n => /^\d{4}-\d{2}-\d{2}\.csv$/.test(n)).sort();
  const org = new Set(await listDir(GITHUB_REPO, ORG_DIR).catch(() => []));
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
    const header = content.split('\n')[0].trim();
    if (!KNOWN_HEADERS.has(header)) {
      console.log(`  ⚠ UNKNOWN header shape, refused: ${name}`);
      headerRejects++;
      continue;
    }
    await pushOrg(name, content);
    banked++;
  }
  console.log(`\n✅ banked ${banked}/${plan.length}${headerRejects ? ` — ${headerRejects} UNKNOWN-header refusals need manual review` : ''}`);
  if (headerRejects) process.exitCode = 1;
}

module.exports = { main, _test: { gitBlobSha1, KNOWN_HEADERS } };
if (require.main === module) main().then(() => process.exit(process.exitCode || 0)).catch(e => { console.error('❌', e.message); process.exit(1); });

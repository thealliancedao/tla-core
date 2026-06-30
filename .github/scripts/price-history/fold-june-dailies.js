// =============================================================================
// price-history / fold-june-dailies.js  (one-time transition script)
// =============================================================================
// Folds token-catalog's already-captured daily snapshots (June 26-30 2026) into
// price-history/2026/06.json as RICH days, per SPEC-price-history-format.md.
//
// These 5 days are where token-catalog was already running, so they carry the
// full multi-source price detail. After the backfill seeds June's THIN early
// days, this overlays the 5 RICH days — making June the transition month
// (thin early, rich end). July onward is uniformly rich.
//
// Run ONCE after the backfill. Idempotent (re-running just re-writes the same
// rich days). Reads token-catalog daily files, writes price-history June file.
// =============================================================================

const https = require('https');

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// The captured daily snapshots to fold (token-catalog started archiving 2026-06-26).
const DAILY_DATES = (process.env.FOLD_DATES || '2026-06-26,2026-06-27,2026-06-28,2026-06-29,2026-06-30').split(',');

// denom -> symbol comes from the chain registry (173 tokens, denom-keyed).
// token-catalog stores tokens by denom with NO symbol field, so we resolve names
// from the authoritative registry rather than a hardcoded list.
const CHAIN_REGISTRY_URL = process.env.CHAIN_REGISTRY_URL ||
  'https://raw.githubusercontent.com/defipatriot/tla-chain-registry/main/2026/current.json';

async function loadSymbolMap() {
  const reg = await fetchJson(bust(CHAIN_REGISTRY_URL));
  const toks = reg.tokens || {};
  const map = {};
  for (const [denom, t] of Object.entries(toks)) {
    if (t && t.symbol) map[denom] = t.symbol;
  }
  return map;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'fold-june/1.0' }, timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let d = ''; res.on('data', c => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
const bust = (u) => u + (u.includes('?') ? '&' : '?') + 't=' + Date.now();

// Extract the RICH price entry for one token-catalog token record, per spec.
function richEntry(tokenRec) {
  const p = tokenRec.prices || {};
  const sources = {};
  for (const src of ['tla', 'astroport', 'coingecko', 'skeletonswap']) {
    sources[src] = (p[src] && p[src].usd != null) ? Number(p[src].usd) : null;
  }
  // canonical usd: prefer tla, then astroport, then coingecko, then skeletonswap
  let usd = null, srcName = null;
  for (const src of ['tla', 'astroport', 'coingecko', 'skeletonswap']) {
    if (sources[src] != null) { usd = sources[src]; srcName = src; break; }
  }
  if (usd == null) return null;
  return {
    usd: Number(usd.toFixed(8)),
    src: srcName,
    confidence: tokenRec.price_confidence || null,
    sources,
  };
}

// ---- github (409-retry) ----
function ghApi(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.github.com', path: apiPath, method,
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'fold-june/1.0', Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } },
      (res) => { let d = ''; res.on('data', c => (d += c)); res.on('end', () => { let b = d; try { b = JSON.parse(d); } catch {} resolve({ status: res.statusCode, body: b }); }); });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}
async function readJson(filepath) {
  const r = await ghApi('GET', `/repos/${GITHUB_REPO}/contents/${filepath}?ref=${GITHUB_BRANCH}`);
  if (r.status !== 200 || !r.body.content) return null;
  try { return JSON.parse(Buffer.from(r.body.content, 'base64').toString()); } catch { return null; }
}
async function writeJson(filepath, obj, message, maxAttempts = 5) {
  const content = JSON.stringify(obj, null, 2);
  if (!GITHUB_TOKEN) { const fs = require('fs'), path = require('path'); const lp = `./out/${filepath}`; fs.mkdirSync(path.dirname(lp), { recursive: true }); fs.writeFileSync(lp, content); return true; }
  const apiPath = `/repos/${GITHUB_REPO}/contents/${filepath}`;
  const b64 = Buffer.from(content).toString('base64');
  for (let a = 1; a <= maxAttempts; a++) {
    const ex = await ghApi('GET', `${apiPath}?ref=${GITHUB_BRANCH}`);
    const sha = ex.body && ex.body.sha;
    const put = await ghApi('PUT', apiPath, { message, content: b64, branch: GITHUB_BRANCH, ...(sha ? { sha } : {}) });
    if (put.status === 200 || put.status === 201) return true;
    if (put.status === 409 || put.status === 422) { await new Promise(r => setTimeout(r, 400 * a + Math.random() * 500)); continue; }
    throw new Error(`write ${filepath}: ${put.status}`);
  }
  return false;
}

async function main() {
  console.log(`fold-june-dailies — folding ${DAILY_DATES.length} rich days into price-history/2026/06.json`);
  const symbolByDenom = await loadSymbolMap();
  console.log(`  loaded ${Object.keys(symbolByDenom).length} denom→symbol mappings from registry`);
  const juneFile = 'price-history/2026/06.json';
  const existing = (await readJson(juneFile)) || { meta: { module: 'price-history', format_version: 1 }, days: {} };
  existing.days = existing.days || {};

  let foldedDays = 0, foldedPrices = 0;
  for (const date of DAILY_DATES) {
    const url = bust(`https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/token-catalog/snapshots/daily/${date}.json`);
    let doc;
    try { doc = await fetchJson(url); }
    catch (e) { console.warn(`  ⚠ ${date}: ${e.message} — skipping`); continue; }
    const toks = doc.tokens || [];
    const dayEntry = existing.days[date] || {};
    let n = 0;
    for (const t of toks) {
      const sym = symbolByDenom[t.denom] || null;
      if (!sym) continue; // only fold tokens we can name (majors/LSTs we track)
      const entry = richEntry(t);
      if (entry) { dayEntry[sym] = entry; n++; }
    }
    if (n > 0) { existing.days[date] = dayEntry; foldedDays++; foldedPrices += n; console.log(`  ✓ ${date}: ${n} rich token prices`); }
    else console.warn(`  – ${date}: 0 nameable tokens folded`);
  }

  existing.meta = { module: 'price-history', format_version: 1, ...existing.meta, updated_at: new Date().toISOString(), note: 'June transition: thin early (backfill) + rich end (token-catalog dailies)' };
  await writeJson(juneFile, existing, `price-history: fold ${foldedDays} rich June days`);
  console.log(`done: folded ${foldedDays} days, ${foldedPrices} rich prices into June file`);
}
main().catch(e => { console.error('fatal:', e); process.exit(1); });

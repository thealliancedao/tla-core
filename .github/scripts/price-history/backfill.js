// =============================================================================
// price-backfill / backfill.js
// =============================================================================
// Foundational historical price + LST-ratio backfill. Runs as a GitHub Action
// (workflow_dispatch) with a token picker — pick a token, it backfills that
// token's daily price as far back as data allows, writing month-files to
// tla-core/price-history/.
//
// THREE token classes:
//   1. Liquid majors (LUNA, ATOM, INJ, wBTC, ETH, USDC, USDT, PAXG, ASTRO, ...)
//      → CoinGecko daily price directly (real, liquid, no dead zones).
//   2. LSTs (ampLUNA, arbLUNA, bLUNA, ampCAPA)
//      → price = base_price × ratio. The RATIO is the honest source (avoids
//        CoinGecko's fake straight-line dead zones). Ratio tiers:
//          chain_exact  : from the archived ratio-history (2026-05-13+) / live
//          cg_derived   : LST_usd / base_usd where BOTH are real CoinGecko data
//          interpolated : smooth monotonic interpolation BETWEEN two real
//                         anchors across a dead zone (honest — the ratio is a
//                         smooth accrual curve, and we multiply by base's REAL
//                         daily price, so it still tracks real volatility).
//   3. FUEL → no CoinGecko id; seeded from old fuel OHLC data (separate).
//
// OUTPUT (month-files, days inside, all tokens per day):
//   price-history/<YYYY>/<MM>.json  { "<YYYY-MM-DD>": { "<SYM>": {usd, src}, ... } }
//   price-history/ratios/<YYYY>/<MM>.json  { "<YYYY-MM-DD>": { "<SYM>": {ratio, base, tier}, ... } }
//   price-history/heartbeat.json
//
// Idempotent + merge-safe: reads any existing month-file and merges (never
// clobbers other tokens already written for that day).
// =============================================================================

const https = require('https');

// ---- token registry (cgIds harvested from the proven contract-token-catalog) ----
const TOKENS = {
  // liquid majors — CoinGecko direct
  LUNA:    { cgId: 'terra-luna-2',              class: 'major' },
  ATOM:    { cgId: 'cosmos',                    class: 'major' },
  INJ:     { cgId: 'injective-protocol',        class: 'major' },
  wBTC:    { cgId: 'wrapped-bitcoin',           class: 'major' },
  ETH:     { cgId: 'ethereum',                  class: 'major' },
  USDC:    { cgId: 'usd-coin',                  class: 'major' },
  USDT:    { cgId: 'tether',                     class: 'major' },
  PAXG:    { cgId: 'pax-gold',                  class: 'major' },
  EURe:    { cgId: 'euroe-stablecoin',          class: 'major' },
  ASTRO:   { cgId: 'astroport-fi',              class: 'major' },
  CAPA:    { cgId: 'capapult',                  class: 'major' },
  SOLID:   { cgId: 'solid-2',                   class: 'major' },
  ROAR:    { cgId: 'lion-dao',                  class: 'major' },
  // LSTs — price via base × ratio
  ampLUNA: { cgId: 'eris-amplified-luna',       class: 'lst', base: 'LUNA' },
  arbLUNA: { cgId: 'eris-arbitrage-luna',       class: 'lst', base: 'LUNA' },
  bLUNA:   { cgId: 'backbone-labs-staked-luna', class: 'lst', base: 'LUNA' },
  ampCAPA: { cgId: null,                        class: 'lst', base: 'CAPA' }, // no CG; ratio-only
};

// earliest backfill date — TLA genesis (older than aDAO NFT launch).
const BACKFILL_FROM = process.env.BACKFILL_FROM || '2022-10-31';

// stored exact ratio history (consolidated daily LST exchange rates, 2026-05-13+).
const RATIO_HISTORY_URL = process.env.RATIO_HISTORY_URL ||
  'https://raw.githubusercontent.com/defipatriot/network-and-prices-data_2026/main/data/ratio-history.json';

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const CG_API_KEY    = process.env.COINGECKO_API_KEY || null;
// 'pro' (paid Analyst+, pro-api.coingecko.com) unlocks full history back to 2013.
// 'demo' (free, api.coingecko.com) caps at ~365 days. Default: pro if a key is
// set (the deep backfill needs paid history), else demo/public.
const CG_PLAN = (process.env.COINGECKO_PLAN || (CG_API_KEY ? 'pro' : 'demo')).toLowerCase();

const VERSION = 'price-backfill-1.0.0';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- http ----
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'price-backfill/1.0', Accept: 'application/json', ...headers }, timeout: 40000 }, (res) => {
      let d = ''; res.on('data', c => (d += c));
      res.on('end', () => {
        if (res.statusCode === 429) return reject(new Error('429 rate-limited'));
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0, 160)}`));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

// CoinGecko daily price across [from,to]. Returns Map<YYYY-MM-DD, price>.
// For multi-year ranges CG returns daily granularity (one point/day).
async function cgDailyPrices(cgId, fromMs, toMs) {
  const from = Math.floor(fromMs / 1000), to = Math.ceil(toMs / 1000);
  const base = CG_PLAN === 'pro'
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';
  const url = `${base}/coins/${cgId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
  const headers = {};
  if (CG_API_KEY) headers[CG_PLAN === 'pro' ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = CG_API_KEY;
  let data, tries = 0;
  while (true) {
    try { data = await httpGet(url, headers); break; }
    catch (e) { if (e.message.includes('429') && tries++ < 5) { await sleep(15000); continue; } throw e; }
  }
  if (!data || !Array.isArray(data.prices)) throw new Error('no prices');
  // collapse to one price per UTC day. CG range gives ~daily points already; if
  // finer, we AVERAGE the day's points (true daily average where data allows).
  const byDay = new Map();
  for (const [ts, price] of data.prices) {
    const day = new Date(ts).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(price);
  }
  const out = new Map();
  for (const [day, arr] of byDay) out.set(day, arr.reduce((a, c) => a + c, 0) / arr.length);
  return out;
}

// monotonic interpolation of a ratio between known anchor days.
// anchors: sorted [ [YYYY-MM-DD, ratio], ... ]. Returns ratio for `day`.
function interpRatio(day, anchors) {
  const t = Date.parse(day);
  if (t <= Date.parse(anchors[0][0])) return { ratio: anchors[0][1], tier: 'edge' };
  if (t >= Date.parse(anchors[anchors.length - 1][0])) return { ratio: anchors[anchors.length - 1][1], tier: 'edge' };
  for (let i = 0; i < anchors.length - 1; i++) {
    const [d0, r0] = anchors[i], [d1, r1] = anchors[i + 1];
    const t0 = Date.parse(d0), t1 = Date.parse(d1);
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return { ratio: r0 + (r1 - r0) * f, tier: 'interpolated' };
    }
  }
  return { ratio: anchors[anchors.length - 1][1], tier: 'edge' };
}

// ---- github (409-retry) ----
function ghApi(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.github.com', path: apiPath, method,
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'price-backfill/1.0', Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } },
      (res) => { let d = ''; res.on('data', c => (d += c)); res.on('end', () => { let p = d; try { p = JSON.parse(d); } catch {} resolve({ status: res.statusCode, body: p }); }); });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}
async function readJson(filepath) {
  if (!GITHUB_TOKEN) { try { return JSON.parse(require('fs').readFileSync(`./out/${filepath}`, 'utf8')); } catch { return null; } }
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
    if (put.status === 409 || put.status === 422) { await sleep(400 * a + Math.random() * 500); continue; }
    throw new Error(`write ${filepath}: ${put.status}`);
  }
  return false;
}

// merge a {day -> {SYM -> value}} patch into month-files (never clobber other tokens).
async function mergeIntoMonthFiles(prefix, daySymValues, valueLabel, message) {
  // group by YYYY/MM
  const byMonth = new Map();
  for (const [day, val] of Object.entries(daySymValues)) {
    const [y, m] = day.split('-');
    const key = `${y}/${m}`;
    if (!byMonth.has(key)) byMonth.set(key, {});
    byMonth.get(key)[day] = val;
  }
  let written = 0;
  for (const [ym, days] of byMonth) {
    const filepath = `${prefix}/${ym}.json`;
    const existing = (await readJson(filepath)) || { meta: { module: "price-history", format_version: 1, note: valueLabel }, days: {} };
    existing.days = existing.days || {};
    for (const [day, symVal] of Object.entries(days)) {
      existing.days[day] = { ...(existing.days[day] || {}), ...symVal }; // merge per-token
    }
    existing.meta = { module: "price-history", format_version: 1, ...(existing.meta || {}), updated_at: new Date().toISOString(), note: valueLabel };
    await writeJson(filepath, existing, `${message} ${ym}`);
    written++;
    await sleep(300); // gentle on GitHub
  }
  return written;
}

async function backfillMajor(sym) {
  const cfg = TOKENS[sym];
  const fromMs = Date.parse(BACKFILL_FROM + 'T00:00:00Z');
  console.log(`  ${sym}: CoinGecko ${cfg.cgId}, from ${BACKFILL_FROM}...`);
  const prices = await cgDailyPrices(cfg.cgId, fromMs, Date.now());
  const patch = {};
  for (const [day, usd] of prices) patch[day] = { [sym]: { usd: Number(usd.toFixed(8)), src: 'coingecko' } };
  const n = await mergeIntoMonthFiles('price-history', patch, 'daily avg USD prices', `price-backfill: ${sym}`);
  console.log(`    ${prices.size} days → ${n} month-files`);
  return { sym, days: prices.size };
}

async function backfillLst(sym) {
  const cfg = TOKENS[sym];
  const base = cfg.base;
  const fromMs = Date.parse(BACKFILL_FROM + 'T00:00:00Z');
  console.log(`  ${sym}: LST (base ${base}) — building honest ratio curve...`);

  // base price history (real, liquid)
  const basePrices = await cgDailyPrices(TOKENS[base].cgId, fromMs, Date.now());

  // exact ratio anchors from archive
  const rh = await readJsonUrl(RATIO_HISTORY_URL);
  const exactPts = (rh && rh.tokens && rh.tokens[sym] && rh.tokens[sym].points) ? rh.tokens[sym].points : [];

  // cg-derived ratio anchors (where LST's OWN CG price is real, not dead-zone).
  // The LST's earliest own CG data point is its LAUNCH FLOOR — we never emit a
  // price before the token existed (arbLUNA/ampCAPA launched after genesis).
  const derivedAnchors = [];
  let lstLaunchMs = null;
  if (cfg.cgId) {
    try {
      const lstPrices = await cgDailyPrices(cfg.cgId, fromMs, Date.now());
      const lstDays = [...lstPrices.keys()].sort();
      if (lstDays.length) lstLaunchMs = Date.parse(lstDays[0]);
      for (const [day, lstUsd] of lstPrices) {
        const baseUsd = basePrices.get(day);
        if (baseUsd && lstUsd) derivedAnchors.push([day, lstUsd / baseUsd]);
      }
    } catch (e) { console.warn(`    ⚠ ${sym} CG derive skipped: ${e.message}`); }
  }

  // NOTE: cg-derived in a dead zone is itself fake (straight line). We can't fully
  // auto-detect the dead zone here, so we treat the EXACT archive points as the
  // gold anchors and use cg-derived only as the EARLY anchor(s) before the archive
  // window. The honest output labels each day's tier. (A later refinement can add
  // dead-zone detection; documented as a known limitation.)
  const anchors = [];
  // earliest cg-derived anchor (best-effort early ratio)
  if (derivedAnchors.length) anchors.push(derivedAnchors[0]);
  for (const p of exactPts) anchors.push([p[0], p[1]]);
  anchors.sort((a, b) => Date.parse(a[0]) - Date.parse(b[0]));

  if (!anchors.length) { console.warn(`    ⚠ ${sym}: no ratio anchors — skipping`); return { sym, days: 0, skipped: true }; }

  const exactSet = new Set(exactPts.map(p => p[0]));
  // Honest floor: do NOT fabricate a price before the token's earliest known
  // anchor (the token likely did not exist yet). arbLUNA/ampCAPA launched after
  // genesis, so flat-extrapolating a ratio backward into pre-launch dates would
  // invent prices for a non-existent token. We only emit days on/after the
  // earliest anchor date, and we DROP the 'edge' tier entirely.
  // Launch floor = the later of (earliest ratio anchor, LST's own CG launch date).
  // This guarantees no fabricated pre-launch prices.
  const anchorMs = Date.parse(anchors[0][0]);
  const earliestAnchorMs = lstLaunchMs ? Math.max(anchorMs, lstLaunchMs) : anchorMs;
  const pricePatch = {}, ratioPatch = {};
  let nExact = 0, nInterp = 0, nSkipped = 0;
  for (const [day, baseUsd] of basePrices) {
    if (Date.parse(day) < earliestAnchorMs) { nSkipped++; continue; } // pre-launch: emit nothing
    let ratio, tier;
    if (exactSet.has(day)) { ratio = exactPts.find(p => p[0] === day)[1]; tier = 'chain_exact'; }
    else { const r = interpRatio(day, anchors); ratio = r.ratio; tier = r.tier; }
    if (tier === 'edge') { nSkipped++; continue; } // no extrapolation beyond real anchors
    if (tier === 'chain_exact') nExact++; else nInterp++;
    ratioPatch[day] = { [sym]: { ratio: Number(ratio.toFixed(8)), base, tier } };
    pricePatch[day] = { [sym]: { usd: Number((baseUsd * ratio).toFixed(8)), src: `${base}×ratio(${tier})` } };
  }
  if (nSkipped) console.log(`    (skipped ${nSkipped} pre-launch/edge days — no fabricated prices)`);
  const pN = await mergeIntoMonthFiles('price-history', pricePatch, 'daily avg USD prices', `price-backfill: ${sym} price`);
  const rN = await mergeIntoMonthFiles('price-history/ratios', ratioPatch, 'daily LST ratios', `price-backfill: ${sym} ratio`);
  console.log(`    ${basePrices.size} days (${nExact} exact, ${nInterp} interpolated) → ${pN}+${rN} month-files`);
  return { sym, days: basePrices.size, exact: nExact, interpolated: nInterp };
}

async function readJsonUrl(url) {
  try { return await httpGet(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now()); } catch { return null; }
}

// Remove a token's entries before `beforeDate` from price + ratio month-files.
// Used to clean up fabricated pre-launch entries after fixing the launch floor.
// Only touches the target token (merge-safe: other tokens untouched).
async function purgeBefore(sym, beforeDate) {
  const beforeMs = Date.parse(beforeDate);
  console.log(`  purge: removing ${sym} entries before ${beforeDate}...`);
  let removed = 0;
  for (const prefix of ['price-history', 'price-history/ratios']) {
    // walk months from genesis up to min(beforeDate, now) — never beyond real data
    const start = new Date(Date.parse(BACKFILL_FROM + 'T00:00:00Z'));
    const end = new Date(Math.min(beforeMs, Date.now()));
    for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++) {
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}/${String(m).padStart(2, '0')}`;
        const filepath = `${prefix}/${ym}.json`;
        const doc = await readJson(filepath);
        if (!doc || !doc.days) continue;
        let changed = false;
        for (const day of Object.keys(doc.days)) {
          if (Date.parse(day) < beforeMs && doc.days[day] && doc.days[day][sym]) {
            delete doc.days[day][sym];
            removed++; changed = true;
            if (Object.keys(doc.days[day]).length === 0) delete doc.days[day];
          }
        }
        if (changed) {
          doc.meta = { ...(doc.meta || {}), updated_at: new Date().toISOString() };
          await writeJson(filepath, doc, `price-history: purge ${sym} pre-${beforeDate} ${ym}`);
          await sleep(300);
        }
      }
    }
  }
  console.log(`  purge done: removed ${removed} ${sym} entries before ${beforeDate}`);
  return removed;
}

// Backfill every token in dependency order. Bases (LUNA, CAPA) before their
// derivatives (ampLUNA/arbLUNA/bLUNA, ampCAPA). For LSTs, the launch-floor logic
// in backfillLst prevents new pre-launch fabrication; we also purge any stale
// pre-launch entries left by earlier (pre-fix) runs so the result is fully clean.
async function runAll() {
  console.log(`${VERSION} — RUN_ALL: backfilling all ${Object.keys(TOKENS).length} tokens`);
  // dependency order: bases first, then LSTs
  const order = [
    // liquid majors (bases + independents)
    'LUNA', 'CAPA', 'ATOM', 'INJ', 'wBTC', 'ETH', 'USDC', 'USDT', 'PAXG', 'EURe', 'ASTRO', 'SOLID', 'ROAR',
    // LSTs (depend on a base being present)
    'ampLUNA', 'arbLUNA', 'bLUNA', 'ampCAPA',
  ];
  const results = [];
  for (const sym of order) {
    if (!TOKENS[sym]) continue;
    const cfg = TOKENS[sym];
    try {
      let r;
      if (cfg.class === 'major') {
        r = await backfillMajor(sym);
      } else {
        // LST: first purge any stale pre-launch entries from earlier runs, then
        // backfill with the honest launch floor. purge boundary = genesis..a wide
        // pre-launch window; backfillLst then writes only from real launch forward.
        // We purge everything before 2025-01-01 as a safe LST pre-launch sweep,
        // BUT only remove entries the new floor wouldn't re-create. Simplest robust
        // approach: purge the token entirely, then re-backfill clean.
        await purgeBefore(sym, '2099-01-01'); // remove ALL existing entries for this token
        r = await backfillLst(sym);
      }
      results.push(r);
      await sleep(500);
    } catch (e) {
      console.error(`  ✗ ${sym}: ${e.message}`);
      results.push({ sym, error: e.message });
    }
  }
  await writeJson('price-history/heartbeat.json', {
    version: VERSION, generated_at: new Date().toISOString(),
    last_token: 'ALL', last_result: { op: 'run_all', tokens: results.length, results },
  }, 'price-history: run_all heartbeat');
  console.log(`RUN_ALL done: ${results.length} tokens`);
}

async function main() {
  // RUN_ALL mode: backfill every token in dependency order (bases first), and
  // self-clean LST pre-launch fabrication as we go. One run = full clean foundation.
  if ((process.env.RUN_ALL || '').toLowerCase() === 'true') {
    return runAll();
  }
  const target = (process.env.TOKEN || 'LUNA').trim();
  const purgeBeforeDate = process.env.PURGE_BEFORE || null;
  if (purgeBeforeDate) {
    console.log(`${VERSION} — PURGE mode: ${target} before ${purgeBeforeDate}`);
    const removed = await purgeBefore(target, purgeBeforeDate);
    await writeJson('price-history/heartbeat.json', {
      version: VERSION, generated_at: new Date().toISOString(),
      last_token: target, last_result: { op: 'purge', before: purgeBeforeDate, removed },
    }, `price-history: purge heartbeat (${target})`);
    console.log(`purge complete: ${removed} entries removed`);
    return;
  }
  console.log(`${VERSION} — backfill token: ${target} (from ${BACKFILL_FROM})`);
  if (!TOKENS[target]) { console.error(`unknown token '${target}'. Known: ${Object.keys(TOKENS).join(', ')}`); process.exit(1); }
  const cfg = TOKENS[target];
  let result;
  if (cfg.class === 'major') result = await backfillMajor(target);
  else result = await backfillLst(target);
  await writeJson('price-history/heartbeat.json', {
    version: VERSION, generated_at: new Date().toISOString(), last_token: target, last_result: result,
  }, `price-backfill: heartbeat (${target})`);
  console.log(`done: ${JSON.stringify(result)}`);
}
main().catch(e => { console.error('fatal:', e); process.exit(1); });

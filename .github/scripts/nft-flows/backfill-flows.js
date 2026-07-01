// =============================================================================
// NFT Flows — SLIM BACKFILL (one-time GitHub Action)
// =============================================================================
// Seeds flows/YYYY/MM.json month-files with the past data we ALREADY have, so
// the forward flows cron stacks rich capture on top of slim history from July 1.
//
// Sources (both already in tla-core/nfts/adao/snapshots/):
//   • sales-enriched.json (1,259 sales, back to 2023-12) → per-day 'sale' events
//   • floor-history.json  (daily per-tier floors, 2026-06-11+) → per-day floor summary
//
// Output: flows/YYYY/MM.json (SAME shape the cron's rollup produces), with each
// day tagged tier:'historical' / source:'backfill-slim' so it's honest about
// being reconstructed-from-scrapes, not live-captured. When the archive window
// comes, these upgrade to chain-exact — same structure.
//
// ONE-TIME: run via workflow_dispatch. Idempotent (re-runnable — overwrites the
// slim days; never touches live-captured days once forward capture starts,
// because those live in the same files but the backfill only writes historical
// dates < the forward-start cutoff).
// =============================================================================

const https = require('https');

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const SNAP = 'nfts/adao/snapshots';
const FLOWS = 'nfts/adao/flows';
// Do not seed on/after this date — forward capture owns it (avoid clobbering live).
const FORWARD_CUTOFF = process.env.FORWARD_CUTOFF || '2026-07-01';

const RAW = (p) => `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${p}?t=${Date.now()}`;

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'nft-flows-backfill/1.0' }, timeout: 60000 }, (res) => {
      if (res.statusCode === 404) { res.resume(); return resolve(null); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} ${url}`)); }
      let d = ''; res.on('data', c => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
function githubApiRequest(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'api.github.com', path: apiPath, method,
      headers: { 'User-Agent': 'nft-flows-backfill/1.0', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = https.request(opts, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => { let parsed = data; try { parsed = JSON.parse(data); } catch {} resolve({ status: res.statusCode, body: parsed, raw: data }); });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
async function publishFile(filePath, content, message, maxAttempts = 5) {
  const apiPath = `/repos/${GITHUB_REPO}/contents/${filePath}`;
  const b64 = Buffer.from(content).toString('base64');
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let sha = null;
    const getRes = await githubApiRequest('GET', apiPath + `?ref=${GITHUB_BRANCH}`);
    if (getRes.status >= 200 && getRes.status < 300) sha = getRes.body && getRes.body.sha;
    const body = { message, content: b64, branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;
    const putRes = await githubApiRequest('PUT', apiPath, body);
    if (putRes.status >= 200 && putRes.status < 300) return putRes.body;
    if (putRes.status === 409 || putRes.status === 422) {
      lastErr = new Error(`PUT ${filePath}: ${putRes.status} (conflict ${attempt}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, 300 * attempt + Math.floor(Math.random() * 400)));
      continue;
    }
    throw new Error(`PUT ${filePath}: ${putRes.status} ${String(putRes.raw).slice(0, 200)}`);
  }
  throw lastErr || new Error(`PUT ${filePath}: failed after ${maxAttempts} attempts`);
}

// Map an enriched sale → a slim 'sale' event (the same shape the cron emits).
function saleToEvent(s) {
  return {
    time: s.timestamp,
    type: 'sale',
    token_id: String(s.token_id),
    from: s.seller || null,
    to: s.buyer || null,
    price_luna: s.luna_equiv != null ? Number(s.luna_equiv) : (s.amount != null ? Number(s.amount) : null),
    price_usd: s.notional_usd != null ? Number(s.notional_usd) : null,
    denom: s.denom || null,
    denom_symbol: s.denom_symbol || null,
    marketplace: s.marketplace || null,
    tx_hash: s.tx_hash || null,
    block: s.block || null,
    source: 'backfill-slim',
  };
}

async function run() {
  console.log(`🛠  NFT Flows SLIM BACKFILL — cutoff ${FORWARD_CUTOFF} — ${new Date().toISOString()}\n`);

  const sales = await httpGetJson(RAW(`${SNAP}/sales-enriched.json`));
  const floorHist = await httpGetJson(RAW(`${SNAP}/floor-history.json`));
  const saleArr = (sales && sales.sales) || [];
  const floorRows = (floorHist && floorHist.rows) || [];
  console.log(`  sources: ${saleArr.length} sales, ${floorRows.length} floor rows`);

  // index floor rows by date for summary enrichment
  const floorByDate = {};
  for (const r of floorRows) if (r.date) floorByDate[r.date] = r;

  // group sales by day, building day-entries per month
  const months = {}; // "YYYY/MM" → { days: { "YYYY-MM-DD": entry } }
  let seeded = 0, skipped = 0;
  const byDay = {};
  for (const s of saleArr) {
    const ts = s.timestamp || '';
    const date = ts.slice(0, 10);
    if (!date) continue;
    if (date >= FORWARD_CUTOFF) { skipped++; continue; } // forward capture owns it
    (byDay[date] = byDay[date] || []).push(s);
  }

  for (const [date, daySales] of Object.entries(byDay)) {
    const [y, m] = date.split('-');
    const mk = `${y}/${m}`;
    months[mk] = months[mk] || { meta: { module: 'nft-flows', format_version: 1, note: 'slim backfill (sales + floor)' }, days: {} };

    const events = daySales.map(saleToEvent).sort((a, b) => (a.time < b.time ? -1 : 1));
    const volLuna = events.reduce((s, e) => s + (Number(e.price_luna) || 0), 0);
    const volUsd  = events.reduce((s, e) => s + (Number(e.price_usd)  || 0), 0);
    const fr = floorByDate[date];

    months[mk].days[date] = {
      events,
      summary: {
        event_count: events.length,
        sales_count: events.length,
        sales_volume_luna: volLuna || null,
        sales_volume_usd: volUsd || null,
        unique_tokens_traded: new Set(events.map(e => e.token_id)).size,
        floor_by_tier: fr ? fr.per_tier : null,        // only present from 2026-06-11
        backing_per_nft_usd: fr ? fr.backing_per_nft_usd : null,
      },
      tier: 'historical',
      source: 'backfill-slim',
    };
    seeded++;
  }

  // also seed floor-only days that had no sales (so the floor history is present)
  for (const r of floorRows) {
    const date = r.date;
    if (!date || date >= FORWARD_CUTOFF) continue;
    const [y, m] = date.split('-');
    const mk = `${y}/${m}`;
    months[mk] = months[mk] || { meta: { module: 'nft-flows', format_version: 1, note: 'slim backfill (sales + floor)' }, days: {} };
    if (!months[mk].days[date]) {
      months[mk].days[date] = {
        events: [],
        summary: { event_count: 0, sales_count: 0, floor_by_tier: r.per_tier, backing_per_nft_usd: r.backing_per_nft_usd },
        tier: 'historical', source: 'backfill-slim',
      };
      seeded++;
    }
  }

  console.log(`  built ${Object.keys(months).length} month-files, ${seeded} day-entries (skipped ${skipped} sales ≥ cutoff)\n`);

  if (!GITHUB_TOKEN) {
    console.log('  (no GITHUB_TOKEN — dry run, nothing published)');
    for (const [mk, doc] of Object.entries(months)) console.log(`    would write ${FLOWS}/${mk}.json (${Object.keys(doc.days).length} days)`);
    return;
  }

  // publish each month-file (merge-safe: read existing, keep any non-historical days)
  for (const [mk, doc] of Object.entries(months)) {
    const fp = `${FLOWS}/${mk}.json`;
    let existing = null;
    try { existing = await httpGetJson(RAW(fp)); } catch {}
    if (existing && existing.days) {
      // preserve any day already present that ISN'T a slim backfill (live-captured wins)
      for (const [d, entry] of Object.entries(existing.days)) {
        if (entry.source !== 'backfill-slim') doc.days[d] = entry;
      }
    }
    doc.meta.updated_at = new Date().toISOString();
    await publishFile(fp, JSON.stringify(doc, null, 2), `nft-flows slim backfill — ${mk} (${Object.keys(doc.days).length} days)`);
    console.log(`  ✓ ${fp} (${Object.keys(doc.days).length} days)`);
  }
  console.log(`\n✅ Slim backfill complete — ${Object.keys(months).length} month-files seeded.`);
}

run().catch(e => { console.error('FATAL', e); process.exit(1); });

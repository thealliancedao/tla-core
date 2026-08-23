// =============================================================================
// recover-batch-sales.js — ONE-OFF: append the 64 batch-settle sales the retired
// pipeline dropped (multi-settle txs recorded one sale per TX, not per settle).
// =============================================================================
// No-third-copy: derives the sales with the LIVE production classifier and
// appends them with the LIVE production enricher — both downloaded from
// platform-crons main at run time, never re-implemented here.
//
// Idempotent: appendEnrichedSales dedupes on (tx_hash, token_id); a re-run adds 0.
// Every recovered row carries repair:'batch-settle-recovery' (labeled, never silent).
// Publishes via the enricher's own GitHub path (GITHUB_TOKEN from the workflow).
// =============================================================================
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), https = require('https');

const PC_RAW = 'https://raw.githubusercontent.com/thealliancedao/platform-crons/main';
const ARCH = path.join(process.cwd(), 'archive/fcd/adao-collection');
const SNAP = path.join(process.cwd(), 'nfts/adao/snapshots');
const NFT = 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';
const BBL = 'terra1ej4cv98e9g2zjefr5auf2nwtq4xl3dm7x0qml58yna2ml2hk595s7gccs9';

function httpGetText(url) {
  return new Promise((resolve, reject) => {
    https.get(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(),
      { headers: { 'User-Agent': 'recover-batch-sales/1.0' }, timeout: 30000 }, (res) => {
        if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} ${url}`)); }
        let d = ''; res.on('data', c => (d += c)); res.on('end', () => resolve(d));
      }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
async function requireLive(repoPath) {
  const code = await httpGetText(`${PC_RAW}/${repoPath}`);
  const local = path.join('/tmp/live-pc', repoPath);
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, code);
  return local;
}

(async () => {
  // 1) live production code
  const axPath = await requireLive('tla-flows/lib/aux-classifiers.js');
  const mhPath = await requireLive('nfts/adao/market-history.js');
  const AX = require(axPath);
  const MH = require(mhPath);
  console.log('live code loaded: aux-classifiers + market-history (platform-crons main)');

  // 2) registry roles for BBL (registry-first, not hardcoded)
  const reg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tla-voting/capture-registry.json')));
  const bblEntry = reg.contracts.find(c => c.address === BBL);
  if (!bblEntry) throw new Error('BBL not in capture-registry — refusing');
  const MARKETS = { [BBL]: { label: bblEntry.label, fee_wallet: bblEntry.fee_wallet || null, royalty_recipients: bblEntry.royalty_recipients || [] } };
  const CONTRACTS = { [NFT]: 'ADAO NFT collection' };

  // 3) derive all FCD-era sales via the live classifier; keep those missing from enriched
  const enr = JSON.parse(fs.readFileSync(path.join(SNAP, 'sales-enriched.json')));
  const have = new Set(enr.sales.map(s => `${s.tx_hash}|${s.token_id}`));
  const missing = [];
  for (const p of fs.readdirSync(ARCH).filter(f => f.endsWith('.json.gz')).sort()) {
    const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ARCH, p))));
    for (const tx of d.txs) {
      if (tx.code) continue;
      for (const r of AX.classifyNftTx(tx, CONTRACTS, MARKETS)) {
        if (r.action === 'sale' && !have.has(`${r.txhash}|${r.token_id}`)) missing.push(r);
      }
    }
  }
  console.log(`FCD-era sales missing from enriched: ${missing.length}`);
  if (!missing.length) { console.log('nothing to recover — done'); return; }
  const bad = missing.filter(r => r.resolution === 'ambiguous' || r.legs_consistent === false);
  if (bad.length) throw new Error(`${bad.length} recovered sale(s) ambiguous/inconsistent — refusing (investigate first)`);

  // 4) day-of pricing inputs from THIS checkout (committed truth)
  const luna = JSON.parse(fs.readFileSync(path.join(SNAP, 'luna-usd-daily.json')));
  const bluna = JSON.parse(fs.readFileSync(path.join(SNAP, 'bluna-usd-daily.json')));
  const priceMonths = {};
  for (const r of missing) {
    const k = r.timestamp.slice(0, 7);
    if (!priceMonths[k]) {
      const f = path.join(process.cwd(), 'price-history', k.slice(0, 4), k.slice(5, 7) + '.json');
      priceMonths[k] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : null;
    }
  }

  // 5) append with the LIVE enricher (all its laws: dedupe, prior-verbatim, never-shrink, repair labels)
  const res = MH.appendEnrichedSales(enr, missing, luna, bluna, priceMonths, {});
  console.log(`appended ${res.added} (dup ${res.skippedDup}, ambiguous ${res.skippedAmbiguous}, unpriced ${res.unpriced}) → ${res.total}`);
  if (res.unpriced) throw new Error(`${res.unpriced} recovered sale(s) unpriced — refusing (fill the price day first)`);

  // 6) write into the checkout; the workflow commits (standard one-off pattern)
  fs.writeFileSync(path.join(SNAP, 'sales-enriched.json'), JSON.stringify(enr, null, 1));
  console.log(`wrote nfts/adao/snapshots/sales-enriched.json (${res.total} sales)`);
})().catch(e => { console.error('recover-batch-sales failed:', e.message); process.exit(1); });

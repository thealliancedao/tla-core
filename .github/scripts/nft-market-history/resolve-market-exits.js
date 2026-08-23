// =============================================================================
// resolve-market-exits.js — ONE-OFF: sale-vs-delist truth for every marketplace
// exit between the last enriched sale (2026-06-12) and classifyNftTx v2's
// deployment (2026-08-23). The walker recorded these as bare v1 transfers;
// the owner's own Atrium purchase (tx 995038E5…, #6192, 49.99 SOLID) proved at
// least one is a sale the record is missing.
// =============================================================================
// What it does:
//   1. scans nfts/adao/transfers/2026/{06..08}.json for exits FROM a registry
//      marketplace after CUTOFF — collects unique txhashes
//   2. fetches each raw tx from the LCD, ARCHIVES the responses verbatim into
//      archive/lcd/market-exits/ (capture truth: re-derives never need the LCD)
//   3. classifies with the LIVE classifyNftTx v2 (downloaded from platform-crons
//      main — no third copy), registry-driven marketplace roles
//   4. mergeKeyed the v2 records INTO the same transfers month files (v1 records
//      untouched — new keys only), commits via the workflow
// sales-enriched is NOT touched here: the next warm's market-history pass is the
// single append author and will pick the new sale records up automatically.
// Idempotent: mergeKeyed adds nothing on re-run.
// =============================================================================
'use strict';
const fs = require('fs'), path = require('path'), https = require('https');

const PC_RAW = 'https://raw.githubusercontent.com/thealliancedao/platform-crons/main';
const LCDS = ['https://terra-lcd.publicnode.com', 'https://terra-rest.publicnode.com'];
const CUTOFF = '2026-06-12T02:45:01Z';          // last enriched sale — resolve everything after
const NFT = 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';
const TRANSFERS = path.join(process.cwd(), 'nfts/adao/transfers');
const ARCHIVE = path.join(process.cwd(), 'archive/lcd/market-exits');

function httpGetText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'resolve-market-exits/1.0' }, timeout: 45000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} ${url}`)); }
      let d = ''; res.on('data', c => (d += c)); res.on('end', () => resolve(d));
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function fetchTx(hash) {
  let lastErr;
  for (const lcd of LCDS) for (let a = 1; a <= 3; a++) {
    try { return JSON.parse(await httpGetText(`${lcd}/cosmos/tx/v1beta1/txs/${hash}`)); }
    catch (e) { lastErr = e; await sleep(400 * a); }
  }
  throw lastErr;
}
// SDK event attrs are plain strings on phoenix; decode defensively if a
// response arrives base64-keyed (older gateways) — verified, never guessed.
function normEvents(events) {
  const looksB64 = (s) => typeof s === 'string' && /^[A-Za-z0-9+/=]+$/.test(s) && s.length % 4 === 0 && !/^[a-z_]+$/.test(s);
  return (events || []).map(ev => {
    const attrs = (ev.attributes || []).map(a => {
      if (looksB64(a.key)) {
        try {
          const k = Buffer.from(a.key, 'base64').toString('utf8');
          const v = a.value != null ? Buffer.from(a.value, 'base64').toString('utf8') : a.value;
          if (/^[\x20-\x7e]+$/.test(k)) return { key: k, value: v };
        } catch { /* keep raw */ }
      }
      return { key: a.key, value: a.value };
    });
    return { type: ev.type, attributes: attrs };
  });
}

(async () => {
  // live classifier + registry roles
  const code = await httpGetText(`${PC_RAW}/tla-flows/lib/aux-classifiers.js?t=${Date.now()}`);
  const local = '/tmp/aux-classifiers.js'; fs.writeFileSync(local, code);
  const AX = require(local);
  const reg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tla-voting/capture-registry.json')));
  const MARKETS = {}, names = {};
  for (const c of reg.contracts) if ((c.streams || []).includes('nft_marketplace')) {
    MARKETS[c.address] = { label: c.label, fee_wallet: c.fee_wallet || null, royalty_recipients: c.royalty_recipients || [] };
    names[c.address] = c.label;
  }
  if (!Object.keys(MARKETS).length) throw new Error('no nft_marketplace entries in registry — refusing');
  const CONTRACTS = { [NFT]: 'ADAO NFT collection' };

  // exits since cutoff, from the committed transfers product
  const months = ['06', '07', '08'].map(m => `2026/${m}`);
  const hashes = new Set(); const monthDocs = {};
  for (const m of months) {
    const f = path.join(TRANSFERS, m + '.json');
    const doc = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : [];
    monthDocs[m] = doc;
    for (const r of doc) {
      if (Number(r.schemaVersion) !== 1) continue;
      if ((r.action === 'transfer_nft' || r.action === 'send_nft') && MARKETS[r.from] && r.timestamp > CUTOFF) hashes.add(r.txhash);
      // entries too — lists get their v2 records as well
      if ((r.action === 'transfer_nft' || r.action === 'send_nft') && MARKETS[r.to] && r.timestamp > CUTOFF) hashes.add(r.txhash);
    }
  }
  console.log(`marketplace-touching txs since ${CUTOFF}: ${hashes.size}`);
  if (!hashes.size) { console.log('nothing to resolve — done'); return; }

  // fetch + archive + classify
  fs.mkdirSync(ARCHIVE, { recursive: true });
  const archive = []; const byMonth = {};
  let sales = 0, cancels = 0, lists = 0, ambiguous = 0, failed = 0;
  for (const h of [...hashes].sort()) {
    let resp;
    try { resp = await fetchTx(h); } catch (e) { console.warn(`  ✗ ${h.slice(0, 10)} fetch failed: ${e.message}`); failed++; continue; }
    const tr = resp.tx_response;
    const txr = { txhash: tr.txhash, height: Number(tr.height), timestamp: tr.timestamp, code: Number(tr.code || 0), events: normEvents(tr.events) };
    archive.push({ txhash: tr.txhash, height: tr.height, timestamp: tr.timestamp, code: tr.code, events: txr.events });
    const recs = AX.classifyNftTx(txr, CONTRACTS, MARKETS).filter(r => Number(r.schemaVersion) >= 2);
    for (const r of recs) {
      if (r.action === 'sale') { sales++; if (r.resolution === 'ambiguous') ambiguous++;
        console.log(`  SALE  ${r.timestamp.slice(0, 10)} #${r.token_id} ${String(names[r.contract] || '').split(' ')[0]} gross ${r.gross_amount} ${String(r.denom || '').slice(-6)} buyer …${(r.buyer || '').slice(-6)} [${r.resolution}]`); }
      if (r.action === 'cancel') cancels++;
      if (r.action === 'list') lists++;
      const mk = r.timestamp.slice(0, 7).replace('-', '/');
      (byMonth[mk] = byMonth[mk] || []).push(r);
    }
    await sleep(250);   // BATCH_CONCURRENCY doctrine: gentle on public LCDs
  }
  console.log(`resolved: ${sales} sales (${ambiguous} ambiguous), ${cancels} cancels, ${lists} lists · ${failed} fetch failures`);
  if (failed) throw new Error(`${failed} tx fetches failed — refusing partial resolution (re-run)`);

  fs.writeFileSync(path.join(ARCHIVE, `exits-${CUTOFF.slice(0, 10)}-to-v2-deploy.json`),
    JSON.stringify({ schemaVersion: 1, capturedAt: new Date().toISOString(), source: 'LCD /cosmos/tx/v1beta1/txs (one-off resolve-market-exits)', cutoff: CUTOFF, count: archive.length, txs: archive }, null, 1));
  console.log(`archived ${archive.length} raw txs → archive/lcd/market-exits/`);

  // merge v2 records into the month files (v1 untouched — new keys only)
  for (const [mk, recs] of Object.entries(byMonth)) {
    const f = path.join(TRANSFERS, mk + '.json');
    const existing = monthDocs[mk] || (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : []);
    const before = existing.length;
    const { merged, added, upgraded } = AX.mergeKeyed(existing, recs);
    if (merged.length < before) throw new Error(`transfers/${mk} would SHRINK — refusing`);
    fs.writeFileSync(f, JSON.stringify(merged, null, 1));
    console.log(`  transfers/${mk}: +${added} v2 records (${upgraded} upgraded) → ${merged.length}`);
  }
  console.log('done — next warm/full market-history pass appends the sales to sales-enriched');
})().catch(e => { console.error('resolve-market-exits failed:', e.message); process.exit(1); });

#!/usr/bin/env node
// =============================================================================
// build-coingecko-index.js  —  CoinGecko terra-2 verification index builder
//
// Run by a MANUAL GitHub Action (workflow_dispatch) in tla-core, on demand only.
// Pulls CoinGecko's full coin list (with per-chain contract addresses) and
// extracts the terra-2 address -> coingecko_id map. This committed index is what
// the token-catalog cron reads to VERIFY claimed coingecko_ids (Stage 2.1) —
// the cron never calls CoinGecko's coin list itself, keeping it fast and
// rate-limit-independent.
//
// First run doubles as the empirical test: if CoinGecko blocks GitHub's runner
// IP, this fails LOUDLY (non-zero exit, red Action) so we know to add a key.
//
// Auth: optional. If COINGECKO_API_KEY is set (a free CoinGecko Demo key),
// it's sent as x-cg-demo-api-key — which authenticates datacenter IPs that the
// anonymous endpoint may block. Absent → tries anonymous (may work, may 403).
// =============================================================================

const fs = require('fs');
const path = require('path');

const LIST_URL = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
const OUT_PATH = path.join('docs', 'curated', 'coingecko-terra2-index.json');
const API_KEY = process.env.COINGECKO_API_KEY || null;

// CoinGecko keys the platform either way across their data; accept both.
const TERRA2_KEYS = ['terra-2', 'terra2'];

async function main() {
  const headers = { 'accept': 'application/json' };
  if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY;

  console.log(`→ Fetching CoinGecko coin list (${API_KEY ? 'with Demo key' : 'anonymous'})...`);
  let resp;
  try {
    resp = await fetch(LIST_URL, { headers });
  } catch (e) {
    console.error(`✗ Network error reaching CoinGecko: ${e.message}`);
    process.exit(1);
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error(`✗ CoinGecko returned HTTP ${resp.status}.`);
    if (resp.status === 429) console.error('  → Rate limited. Add a free CoinGecko Demo key as the COINGECKO_API_KEY secret.');
    else if (resp.status === 403) console.error('  → Forbidden (likely datacenter-IP block). Add a free CoinGecko Demo key as the COINGECKO_API_KEY secret.');
    console.error('  body (first 300):', body.slice(0, 300));
    process.exit(1);   // fail LOUD — this is the empirical access test
  }

  const coins = await resp.json();
  if (!Array.isArray(coins)) {
    console.error('✗ Unexpected response shape (expected an array of coins).');
    process.exit(1);
  }
  console.log(`✓ Received ${coins.length} coins.`);

  // Extract terra-2 contract address -> coingecko_id
  const byAddress = {};
  let terra2Count = 0;
  for (const c of coins) {
    const platforms = c.platforms || {};
    for (const k of TERRA2_KEYS) {
      const addr = platforms[k];
      if (addr && typeof addr === 'string') {
        byAddress[addr.toLowerCase()] = c.id;
        terra2Count++;
      }
    }
  }
  console.log(`✓ Extracted ${terra2Count} terra-2 contract mappings.`);

  const out = {
    _meta: {
      generated_at: new Date().toISOString(),
      source: 'coingecko coins/list?include_platform=true',
      total_coins: coins.length,
      terra2_entries: terra2Count,
      api_key_used: !!API_KEY,
      note: 'address (lowercased) -> coingecko_id. Used by token-catalog Stage 2.1 to verify claimed coingecko_ids. terra-2 indexes cw20 contract addresses; IBC/native denoms are verified via bridge provenance instead.',
    },
    by_address: byAddress,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ Wrote ${OUT_PATH} (${terra2Count} entries).`);
}

main().catch(e => { console.error('✗ Unexpected error:', e); process.exit(1); });

// ── Mint-recoverability probe (v2 — diagnostic) ──────────────────────────────
// v1 hit HTTP 500 on the RPCs — that's the server rejecting the QUERY, not
// pruning. v2 prints the actual error body, tries multiple RPC hosts, multiple
// tx_search encodings, and a REST/LCD fallback, so we learn what the nodes
// actually accept. Reads only. Writes nothing.

const NFT_CONTRACT = process.env.NFT_CONTRACT
  || 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';

// A wider set of endpoints. Tendermint tx_search lives on the RPC port.
const RPCS = [
  'https://terra-rpc.publicnode.com',
  'https://terra-rpc.polkachu.com',
  'https://terra2-rpc.cosmos-apis.com',
  'https://rpc-terra2.ecostake.com',
  'https://terra-rpc.stakely.io',
];
// LCD/REST hosts expose Cosmos tx service (different path + param style).
const LCDS = [
  'https://terra-lcd.publicnode.com',
  'https://terra-rest.publicnode.com',
  'https://terra-api.polkachu.com',
];

async function getText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

// --- Style 1: Tendermint RPC tx_search (query as a single quoted string) ------
async function rpcTxSearch(rpc, innerQuery) {
  // Note: the whole query must be wrapped in double-quotes, THEN url-encoded.
  const q = encodeURIComponent(`"${innerQuery}"`);
  const url = `${rpc}/tx_search?query=${q}&per_page=3&order_by=%22asc%22`;
  return getText(url);
}

// --- Style 2: Cosmos REST tx service (events= repeated params) ----------------
async function lcdTxsByEvents(lcd, event) {
  // /cosmos/tx/v1beta1/txs?events=<event>&order_by=ORDER_BY_ASC&pagination.limit=3
  const url = `${lcd}/cosmos/tx/v1beta1/txs?query=${encodeURIComponent(event)}`
            + `&order_by=ORDER_BY_ASC&pagination.limit=3`;
  return getText(url);
}

const INNER_MINT = `wasm._contract_address='${NFT_CONTRACT}' AND wasm.action='mint'`;
const INNER_ANY  = `wasm._contract_address='${NFT_CONTRACT}'`;

(async () => {
  console.log('🔍 Mint probe v2 (diagnostic)');
  console.log(`   contract: ${NFT_CONTRACT}\n`);

  console.log('══ STYLE 1: Tendermint RPC /tx_search ══');
  for (const rpc of RPCS) {
    for (const [label, inner] of [['mint', INNER_MINT], ['any', INNER_ANY]]) {
      try {
        const { ok, status, body } = await rpcTxSearch(rpc, inner);
        if (ok) {
          let total = '?';
          try { total = JSON.parse(body)?.result?.total_count ?? '?'; } catch {}
          console.log(`  ✓ ${rpc} [${label}] → HTTP ${status}, total_count=${total}`);
          if (label === 'any' && total !== '0' && total !== '?') {
            // show earliest tx structure
            try {
              const first = JSON.parse(body)?.result?.txs?.[0];
              console.log(`     earliest height ${first?.height}, hash ${first?.hash?.slice(0,10)}…`);
            } catch {}
          }
        } else {
          console.log(`  ✗ ${rpc} [${label}] → HTTP ${status}: ${body.slice(0,160)}`);
        }
      } catch (e) {
        console.log(`  ✗ ${rpc} [${label}] → ${e.message}`);
      }
    }
  }

  console.log('\n══ STYLE 2: Cosmos REST /cosmos/tx/v1beta1/txs ══');
  for (const lcd of LCDS) {
    for (const [label, inner] of [['mint', INNER_MINT], ['any', INNER_ANY]]) {
      try {
        const { ok, status, body } = await lcdTxsByEvents(lcd, inner);
        if (ok) {
          let n = '?';
          try { const j = JSON.parse(body); n = (j.txs?.length ?? j.tx_responses?.length ?? '?') + ` (total ${j.total ?? j.pagination?.total ?? '?'})`; } catch {}
          console.log(`  ✓ ${lcd} [${label}] → HTTP ${status}, txs=${n}`);
        } else {
          console.log(`  ✗ ${lcd} [${label}] → HTTP ${status}: ${body.slice(0,160)}`);
        }
      } catch (e) {
        console.log(`  ✗ ${lcd} [${label}] → ${e.message}`);
      }
    }
  }

  console.log('\n══ READING THIS ══');
  console.log('  • Any line with total_count / txs > 0 → mints reachable via THAT endpoint+style.');
  console.log('  • HTTP 500 with an error body → the body tells us what the node rejected (fixable).');
  console.log('  • HTTP 501/404 "not implemented" → that node disabled tx indexing; try another.');
  console.log('  • The winning endpoint+style is what the real backfill will use.');
})();

// ── Mint probe v5 — find the BBL launchpad + your mint txs ────────────────────
// Reframe: mints were RANDOM (BBL Candy Machine) on a LAUNCHPAD contract, paid
// in LUNA — NOT on the NFT contract. To recover per-NFT cost basis we need the
// launchpad contract + its mint txs. Camron's wallet minted many, so his txs in
// the mint windows (Feb–Jun 2024) reveal the launchpad address + msg shape.
//
// This probes Camron's wallet for txs that (a) sent LUNA and (b) received NFTs,
// in the mint date windows, and reports which CONTRACT was involved.

const WALLET = process.env.MINT_WALLET || 'terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw';
const NFT_CONTRACT = 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';

// stakely retained deepest history in v3/v4 — lead with it.
const RPCS = [
  ['stakely',   'https://terra-rpc.stakely.io'],
  ['polkachu',  'https://terra-rpc.polkachu.com'],
  ['publicnode','https://terra-rpc.publicnode.com'],
];

async function txSearch(rpc, innerQuery, page, perPage, order) {
  const q = encodeURIComponent(`"${innerQuery}"`);
  const url = `${rpc}/tx_search?query=${q}&page=${page}&per_page=${perPage}&order_by=%22${order}%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0,100)}`);
  return JSON.parse(body);
}

function wasmEvents(tx) {
  return (tx?.tx_result?.events||[]).filter(e => e.type === 'wasm').map(e => {
    const r = {}; for (const a of (e.attributes||[])) r[a.key] = a.value; return r;
  });
}
function lunaSpent(tx) {
  const out = [];
  for (const e of (tx?.tx_result?.events||[])) {
    if (e.type === 'coin_spent') for (const a of (e.attributes||[]))
      if (a.key === 'spender' && a.value === WALLET) out.push('spender-match');
  }
  return out.length>0;
}

(async () => {
  console.log('🔍 Mint probe v5 — find the BBL launchpad via wallet mint txs');
  console.log(`   wallet: ${WALLET}\n`);

  // Query: all txs where this wallet received an NFT mint/transfer from the collection.
  // Two angles: (A) txs signed by the wallet that touch a launchpad; (B) txs where the
  // NFT contract minted to this wallet.
  const QUERIES = [
    // NFTs minted TO this wallet (recipient on the nft contract)
    `wasm._contract_address='${NFT_CONTRACT}' AND wasm.action='mint' AND wasm.owner='${WALLET}'`,
    `wasm._contract_address='${NFT_CONTRACT}' AND wasm.action='mint' AND wasm.recipient='${WALLET}'`,
    // any tx SIGNED by this wallet that transferred LUNA (message.sender)
    `message.sender='${WALLET}' AND transfer.amount CONTAINS 'uluna'`,
    // broadest: any tx involving this wallet, earliest first
    `message.sender='${WALLET}'`,
  ];

  for (const [label, rpc] of RPCS) {
    console.log(`── ${label} ──`);
    for (const q of QUERIES) {
      try {
        const r = await txSearch(rpc, q, 1, 5, 'asc');
        const total = Number(r?.result?.total_count ?? 0);
        console.log(`  [${total}] ${q.slice(0,70)}…`);
        if (total > 0) {
          const t = r.result.txs[0];
          // what contracts does this tx touch?
          const contracts = [...new Set(wasmEvents(t).map(w => w._contract_address).filter(Boolean))];
          console.log(`      earliest height ${t.height}, contracts touched: ${JSON.stringify(contracts).slice(0,300)}`);
          // show actions
          const actions = [...new Set(wasmEvents(t).map(w => w.action).filter(Boolean))];
          console.log(`      actions: ${JSON.stringify(actions)}`);
        }
      } catch (e) {
        console.log(`  ✗ ${q.slice(0,40)}… → ${e.message}`);
      }
    }
    console.log();
  }

  console.log('══ WHAT WE WANT ══');
  console.log('  • A query with total>0 whose "contracts touched" includes a NON-nft address');
  console.log('    → that address is the BBL LAUNCHPAD. That + LUNA amount = per-NFT cost basis.');
  console.log('  • Then the real backfill queries that launchpad for ALL mint txs, all wallets.');
})();

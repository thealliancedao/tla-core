// ── Mint-recoverability probe ────────────────────────────────────────────────
// Answers, before we commit to a mint-backfill:
//   1. What mechanism minted the NFTs? (mint msg / launchpad / airdrop)
//   2. Do the mint events survive on queryable public RPCs? (retention)
//   3. What data does a mint event carry? (token_id, recipient, timestamp)
// Reads only. Writes nothing. Prints findings to the Actions log.

const NFT_CONTRACT = process.env.NFT_CONTRACT
  || 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';

// Retention varies by node — probe several public RPCs.
const RPCS = [
  'https://terra-rpc.publicnode.com',
  'https://terra-rpc.polkachu.com',
  'https://rpc-terra2.keplr.app',
];

async function txSearch(rpc, query, page = 1, perPage = 5) {
  const url = `${rpc}/tx_search?query=${encodeURIComponent(query)}`
            + `&page=${page}&per_page=${perPage}&order_by=%22asc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Different mint mechanisms emit different events — try the common ones.
const QUERIES = [
  `wasm._contract_address='${NFT_CONTRACT}' AND wasm.action='mint'`,
  `wasm._contract_address='${NFT_CONTRACT}' AND wasm.action='mint_nft'`,
  `wasm._contract_address='${NFT_CONTRACT}'`,  // broadest: what ARE the earliest txs?
];

(async () => {
  console.log('🔍 Mint-recoverability probe');
  console.log(`   contract: ${NFT_CONTRACT}\n`);

  let anyReachable = false;
  for (const rpc of RPCS) {
    console.log(`── RPC: ${rpc} ──`);
    let reachable = false;
    for (const q of QUERIES) {
      try {
        const r = await txSearch(rpc, q);
        reachable = true; anyReachable = true;
        const total = Number(r?.result?.total_count ?? 0);
        const first = r?.result?.txs?.[0];
        console.log(`  query: ${q.slice(0, 64)}…`);
        console.log(`    → total_count: ${total}`);
        if (first) {
          console.log(`    → earliest tx height: ${first.height}, hash: ${first.hash?.slice(0,12)}…`);
          const logs = first.tx_result?.log;
          if (logs) {
            try {
              const parsed = JSON.parse(logs);
              const wasmEv = parsed?.[0]?.events?.find(e => e.type === 'wasm');
              if (wasmEv) {
                const attrs = {};
                for (const a of wasmEv.attributes) attrs[a.key] = a.value;
                console.log(`    → first-tx wasm attrs: ${JSON.stringify(attrs).slice(0, 240)}`);
              }
            } catch { /* log not JSON */ }
          }
        }
      } catch (e) {
        console.log(`  query "${q.slice(0,40)}…" failed: ${e.message}`);
      }
    }
    if (reachable) { console.log(`  ✓ this RPC responds\n`); break; }
    console.log(`  ✗ unreachable/pruned\n`);
  }

  console.log('══ VERDICT GUIDE ══');
  console.log('  • mint/mint_nft total_count > 0  → mints ARE recoverable; build the backfill');
  console.log('  • mint queries empty but broad query works → different action name;');
  console.log('    read the earliest-tx wasm attrs above to find the real mint message');
  console.log('  • all queries fail on all RPCs → nodes pruned; not reachable this way');
  if (!anyReachable) process.exitCode = 1;
})();

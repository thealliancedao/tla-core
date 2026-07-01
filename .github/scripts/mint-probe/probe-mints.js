// ── Mint probe v3 — what ARE these txs, and how deep does history go? ─────────
// v2 found: nodes answer (HTTP 200), but "any" query = only 19-27 txs total,
// and action='mint' = 0. Either (a) these RPCs only retain a recent window, or
// (b) the mint action has a different name. v3 settles it: dump the ACTIONS and
// HEIGHTS present, and try an ARCHIVE endpoint that should hold full history.

const NFT_CONTRACT = process.env.NFT_CONTRACT
  || 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';

// Include known archive endpoints (retain full history, unlike pruned nodes).
const RPCS = [
  ['publicnode',      'https://terra-rpc.publicnode.com'],
  ['polkachu',        'https://terra-rpc.polkachu.com'],
  ['stakely',         'https://terra-rpc.stakely.io'],
  ['polkachu-ARCHIVE','https://terra-rpc.polkachu.com'],   // polkachu offers archive on same host for some chains
  ['numia/allthatnode','https://terra2-mainnet-rpc.allthatnode.com:26657'],
];

async function txSearch(rpc, innerQuery, page = 1, perPage = 30, order = 'asc') {
  const q = encodeURIComponent(`"${innerQuery}"`);
  const url = `${rpc}/tx_search?query=${q}&page=${page}&per_page=${perPage}&order_by=%22${order}%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0,120)}`);
  return JSON.parse(body);
}

const INNER_ANY = `wasm._contract_address='${NFT_CONTRACT}'`;

function actionsOf(tx) {
  // pull wasm.action attrs from a tx's events
  const acts = new Set();
  const ev = tx?.tx_result?.events || [];
  for (const e of ev) {
    if (e.type === 'wasm') {
      for (const a of (e.attributes||[])) {
        // v0.37+ returns plain strings; older base64. Handle both.
        let k=a.key, v=a.value;
        try { if (!/^[a-z_]+$/i.test(k)) k = Buffer.from(k,'base64').toString(); } catch{}
        try { v = /[^ -~]/.test(v) ? v : (Buffer.from(v,'base64').toString().match(/[ -~]/)?v:v); } catch{}
        if (k === 'action') acts.add(a.value);
      }
    }
  }
  return [...acts];
}

(async () => {
  console.log('🔍 Mint probe v3 — action census + archive reach');
  console.log(`   contract: ${NFT_CONTRACT}\n`);

  for (const [label, rpc] of RPCS) {
    console.log(`── ${label} (${rpc}) ──`);
    try {
      // earliest first
      const asc = await txSearch(rpc, INNER_ANY, 1, 30, 'asc');
      const total = Number(asc?.result?.total_count ?? 0);
      const txs = asc?.result?.txs || [];
      const heights = txs.map(t => Number(t.height));
      const minH = heights.length ? Math.min(...heights) : null;
      console.log(`  total_count=${total}, earliest height in page=${minH}`);
      // census of actions across the earliest page
      const actionCount = {};
      for (const t of txs) {
        for (const a of actionsOf(t)) actionCount[a] = (actionCount[a]||0)+1;
      }
      console.log(`  actions seen (earliest page): ${JSON.stringify(actionCount)}`);
      // also grab the very first tx's full action list explicitly
      if (txs[0]) {
        console.log(`  FIRST tx height ${txs[0].height}: actions=${JSON.stringify(actionsOf(txs[0]))}`);
      }
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
    }
    console.log();
  }

  console.log('══ READING THIS ══');
  console.log('  • If earliest height is LOW (~1-2M) and total is THOUSANDS → full history,');
  console.log('    and the action census shows the real mint action name to backfill.');
  console.log('  • If earliest height stays HIGH (~21M) and total is small (~27) on every');
  console.log('    node → these are all pruned to a recent window; need a true archive node.');
  console.log('  • The action census tells us if mint is named mint / mint_nft / something else.');
})();

// ── Mint probe v6 — read Camron's ACTUAL txs in the mint window ───────────────
// v5 proved stakely holds Camron's full history (2,297 txs back to height
// ~12.3M) — deep enough to cover the Feb–Jun 2024 mints. But mint-specific
// queries returned 0 → wrong query shape, NOT missing data. So stop guessing:
// pull his txs and DUMP what's actually there in the mint window. The BBL mint
// txs will reveal themselves — contract, action, LUNA amount, token_id.

const WALLET = process.env.MINT_WALLET || 'terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw';
const NFT_CONTRACT = 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';
const RPC = process.env.RPC || 'https://terra-rpc.stakely.io'; // deepest in v5

async function txSearch(innerQuery, page, perPage, order) {
  const q = encodeURIComponent(`"${innerQuery}"`);
  const url = `${RPC}/tx_search?query=${q}&page=${page}&per_page=${perPage}&order_by=%22${order}%22`;
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
function lunaAmounts(tx) {
  const s = new Set();
  for (const e of (tx?.tx_result?.events||[])) {
    if (['coin_spent','coin_received','transfer'].includes(e.type))
      for (const a of (e.attributes||[]))
        if (a.key==='amount' && /uluna/.test(a.value||'')) s.add(a.value);
  }
  return [...s];
}
// Mint window: Feb 2024 ≈ block ~12.3M-13M, Jun 2024 ≈ ~13.5-14M (Terra2 ~1.5s blocks)
const WINDOW_MIN = 11000000, WINDOW_MAX = 15000000;

(async () => {
  console.log('🔍 Mint probe v6 — dump wallet txs in the mint window');
  console.log(`   wallet: ${WALLET}\n   rpc: ${RPC}\n`);

  const all = `message.sender='${WALLET}'`;
  // page through ascending, collect txs in the mint-window height range
  let page = 1, seen = 0, inWindow = [];
  while (page <= 25) {
    let r;
    try { r = await txSearch(all, page, 100, 'asc'); }
    catch (e) { console.log(`  page ${page} error: ${e.message}`); break; }
    const txs = r?.result?.txs || [];
    if (txs.length === 0) break;
    for (const t of txs) {
      const h = Number(t.height);
      seen++;
      if (h >= WINDOW_MIN && h <= WINDOW_MAX) inWindow.push(t);
    }
    const total = Number(r?.result?.total_count ?? 0);
    if (page * 100 >= total) break;
    page++;
  }
  console.log(`  scanned ${seen} txs; ${inWindow.length} fall in mint-window heights ${WINDOW_MIN}-${WINDOW_MAX}\n`);

  // Show txs that touch NFT contract OR move LUNA — the mint candidates
  let shown = 0;
  for (const t of inWindow) {
    const evs = wasmEvents(t);
    const contracts = [...new Set(evs.map(w => w._contract_address).filter(Boolean))];
    const actions = [...new Set(evs.map(w => w.action).filter(Boolean))];
    const luna = lunaAmounts(t);
    const touchesNft = contracts.includes(NFT_CONTRACT);
    const hasNftAction = actions.some(a => /mint|transfer_nft|send_nft/.test(a));
    if (touchesNft || hasNftAction || luna.length) {
      if (shown++ >= 12) break;
      console.log(`  h${t.height} ${t.hash?.slice(0,10)}…`);
      console.log(`    contracts: ${JSON.stringify(contracts).slice(0,260)}`);
      console.log(`    actions:   ${JSON.stringify(actions)}`);
      console.log(`    luna:      ${JSON.stringify(luna)}`);
      // if a token_id appears, surface it
      const tokenIds = [...new Set(evs.map(w => w.token_id).filter(Boolean))];
      if (tokenIds.length) console.log(`    token_ids: ${JSON.stringify(tokenIds)}`);
    }
  }
  if (!shown) console.log('  (no NFT/LUNA txs in window — widen WINDOW range or wallet had no mints here)');

  console.log('\n══ WHAT TO LOOK FOR ══');
  console.log('  • a tx with LUNA out + an NFT contract that is NOT terra1phr9… = the LAUNCHPAD mint');
  console.log('  • note its contract address + action name + the uluna amount → that is the mint cost');
})();

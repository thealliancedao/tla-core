// ── Mint probe v7 — fixed paging + correct window + honest depth report ───────
// v6 had TWO bugs: (1) paging broke after ~1 page ("scanned 9"), (2) window
// heights were too high (11-15M) — the real Feb–Jun 2024 mints are ~9-10.6M.
// v7: page properly through ALL of Camron's txs, report the TRUE earliest height
// reached, and dump any txs in the corrected mint window (8.5M–11M) touching
// LUNA or an NFT contract.

const WALLET = process.env.MINT_WALLET || 'terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw';
const NFT_CONTRACT = 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';
const RPC = process.env.RPC || 'https://terra-rpc.stakely.io';

// Corrected mint window (Feb–Jun 2024 ≈ blocks 9.1M–10.6M; pad generously).
const WIN_MIN = Number(process.env.WIN_MIN || 8500000);
const WIN_MAX = Number(process.env.WIN_MAX || 11000000);

async function txSearch(innerQuery, page, perPage, order) {
  const q = encodeURIComponent(`"${innerQuery}"`);
  const url = `${RPC}/tx_search?query=${q}&page=${page}&per_page=${perPage}&order_by=%22${order}%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0,100)}`);
  return JSON.parse(body);
}
function wasmEvents(tx) {
  return (tx?.tx_result?.events||[]).filter(e => e.type==='wasm').map(e => {
    const r={}; for (const a of (e.attributes||[])) r[a.key]=a.value; return r;
  });
}
function lunaAmounts(tx) {
  const s=new Set();
  for (const e of (tx?.tx_result?.events||[]))
    if (['coin_spent','coin_received','transfer'].includes(e.type))
      for (const a of (e.attributes||[]))
        if (a.key==='amount' && /uluna/.test(a.value||'')) s.add(a.value);
  return [...s];
}

(async () => {
  console.log('🔍 Mint probe v7 — fixed paging + correct window');
  console.log(`   wallet: ${WALLET}`);
  console.log(`   rpc: ${RPC}   window: ${WIN_MIN}-${WIN_MAX}\n`);

  const query = `message.sender='${WALLET}'`;
  // First: how many total, and what's the true earliest height (asc page 1)?
  const head = await txSearch(query, 1, 1, 'asc');
  const total = Number(head?.result?.total_count ?? 0);
  const earliestTx = head?.result?.txs?.[0];
  console.log(`  total txs for wallet on this node: ${total}`);
  console.log(`  TRUE earliest height on this node: ${earliestTx?.height}`);
  if (Number(earliestTx?.height) > WIN_MAX) {
    console.log(`  ⚠ earliest (${earliestTx?.height}) is ABOVE the mint window — this node does`);
    console.log(`     NOT retain the mint-era txs. Need a deeper archive. (Reporting anyway.)`);
  }
  console.log();

  // Page properly: ascending, 100/page, until we pass total or exit the window.
  const perPage = 100;
  const pages = Math.min(60, Math.ceil(total / perPage));
  let scanned = 0, inWindow = [], minH = Infinity, maxH = 0;
  for (let page = 1; page <= pages; page++) {
    let r;
    try { r = await txSearch(query, page, perPage, 'asc'); }
    catch (e) { console.log(`  page ${page}: ${e.message}`); break; }
    const txs = r?.result?.txs || [];
    if (!txs.length) break;
    for (const t of txs) {
      const h = Number(t.height); scanned++;
      if (h < minH) minH = h; if (h > maxH) maxH = h;
      if (h >= WIN_MIN && h <= WIN_MAX) inWindow.push(t);
    }
    // once we're past the window on the high side, stop early
    if (Number(txs[txs.length-1].height) > WIN_MAX && inWindow.length) break;
  }
  console.log(`  scanned ${scanned} txs (heights ${minH}–${maxH}); ${inWindow.length} in mint window\n`);

  let shown = 0;
  for (const t of inWindow) {
    const evs = wasmEvents(t);
    const contracts=[...new Set(evs.map(w=>w._contract_address).filter(Boolean))];
    const actions=[...new Set(evs.map(w=>w.action).filter(Boolean))];
    const luna=lunaAmounts(t);
    const tokenIds=[...new Set(evs.map(w=>w.token_id).filter(Boolean))];
    if (contracts.length || luna.length) {
      if (shown++ >= 15) break;
      console.log(`  h${t.height} ${t.hash?.slice(0,10)}…`);
      console.log(`    contracts: ${JSON.stringify(contracts).slice(0,260)}`);
      console.log(`    actions:   ${JSON.stringify(actions)}`);
      console.log(`    luna:      ${JSON.stringify(luna)}`);
      if (tokenIds.length) console.log(`    token_ids: ${JSON.stringify(tokenIds).slice(0,200)}`);
    }
  }
  if (!shown) console.log('  (no NFT/LUNA txs in the window on this node)');

  console.log('\n══ READING ══');
  console.log('  • TRUE earliest height ABOVE ~10.6M → this node pruned the mint era; try another archive.');
  console.log('  • a windowed tx with LUNA out + a non-terra1phr9 contract = the BBL LAUNCHPAD mint.');
})();

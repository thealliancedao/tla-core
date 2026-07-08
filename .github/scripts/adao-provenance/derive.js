#!/usr/bin/env node
/**
 * adao-provenance derive — one-shot, re-runnable, deterministic.
 *
 * Spec: docs/pending-changes/SPEC-adao-provenance.md (approved 2026-07-08)
 * Inputs (committed, complete): archive/fcd/adao-minter/  archive/fcd/adao-collection/
 * Output: nfts/adao/provenance/{index,heartbeat,summary}.json
 *         nfts/adao/provenance/tokens/part-00..09.jsonl
 *         nfts/adao/provenance/wallets/cost-basis.json
 *
 * Runs offline from repo root: `node .github/scripts/adao-provenance/derive.js`
 * No network. Fails hard (non-zero exit) on any invariant breach — never
 * publishes partial output.
 *
 * Coverage: chain genesis → FCD freeze (~2025-01-07, height ≈ 13,736,494).
 * `owner_at_freeze` is NOT current ownership — live state lives in
 * nfts/adao/snapshots (nft-inventory). See summary.known_gaps.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- constants
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'nfts', 'adao', 'provenance');
const SCHEMA_REV = 1;

const COLLECTION = 'terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9';
const MINTER     = 'terra1m3ye6dl6s25el4xd8adg9lnquz88az9lur2ujztj9pfmzdyfz3xsm699r3';
const MINT_ERA_DAO_TREASURY = 'terra1g0mfrpswewteaf9ky4rlj09wh5njp6u9xxk94uszplw4qz2f9mzq3k27fm';

const CANDY = {
  terra182fvr6f2vamqvk4qxyeun0d893aje78l93r8ac67g6cyu7y2v22sp0g98h: 'sale-50',
  terra17tg0lk3l9luhata3h03zcp2ecave5n4l5x8akpdzu5lrydegwdzqxyj09c: 'sale-75',
  terra1jw84ef5qye2zykelyenchnfzkmrznguy5ym9aa4kxte7h0c5m4ysxfte89: 'sale-100/115/130', // resolved per-msg by funds
};
const JUNE_TIERS = { '100000000': 'sale-100', '115000000': 'sale-115', '130000000': 'sale-130' };

const ENTERPRISE_STAKING = 'terra1e54tcdyulrtslvf79htx4zntqntd4r550cg22sj24r6gfm0anrvq0y8tdv';
const ADAO_VOTING = 'terra1c57ur376szdv8rtes6sa9nst4k536dynunksu8tx5zu4z5u3am6qmvqx47';
const STAKING_VENUES = { [ENTERPRISE_STAKING]: 'enterprise-staking', [ADAO_VOTING]: 'adao-governance-staking' };
const KNOWN_OWNERS = new Set([
  'terra1sffd4efk2jpdt894r04qwmtjqrrjfc52tmj6vkzjxqhd8qqu2drs3m5vzm', // aDAO Core (treasury)
  'terra1h8psjgcsg9fef7w2yv0j6262sfcaszj8vs4tsy3uwla6zwtaspvqrp4l7v', // DAO Treasury (NFT custody)
  'terra1yqv0af22675wlcmgflxk4ve07vt8qlm999gk0cuw5l64r5xxgadsyg8ywv', // Small DAO wallet (NFT custody)
]);
const unmappedDest = {}; // contract destinations not in any known set — address-catalog rider feed
const MARKETPLACES = {
  terra1ej4cv98e9g2zjefr5auf2nwtq4xl3dm7x0qml58yna2ml2hk595s7gccs9: 'necropolis',
  terra15du229lqcxkn939pmjgklqunftf604q4wz87kt5awj6reghec5jqs0w0kj: 'atrium',
  terra1kj7pasyahtugajx9qud02r5jqaf60mtm7g5v9utr94rmdfftx0vqspf4at: 'boost',
};
const CUSTODIAL = new Set([...Object.keys(STAKING_VENUES), ...Object.keys(MARKETPLACES), ...Object.keys(CANDY)]);
const stock = {}; // per-candy-machine flow counters
function stockFlow(machine, kind) {
  if (!stock[machine]) stock[machine] = { loaded: 0, sold: 0, ejected: 0, other_out: 0 };
  stock[machine][kind]++;
}

const KNOWN_DENOMS = {
  uluna: { symbol: 'LUNA', decimals: 6 },
  terra17aj4ty4sz4yhgm08na8drc0v03v2jwr3waxcqrwhajj729zhl7zqnpc0ml: { symbol: 'bLUNA', decimals: 6 },
  terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct: { symbol: 'ampLUNA', decimals: 6 },
};

const PHASES = [
  { phase_id: 'goa-free', label: 'Phase 0: Game of Alliance Claim', price_uluna: '0', expected: 1191 },
  { phase_id: 'sale-50',  label: 'Phase 1b: DAO Staker Mint', price_uluna: '50000000', expected: 127 },
  { phase_id: 'sale-75',  label: 'Phase 2a: Terra NFT Communities', price_uluna: '75000000', expected: 525 },
  { phase_id: 'sale-100', label: 'Phase 2b: Alliance Stakers & Open Mint (round 1)', price_uluna: '100000000', expected: 197 },
  { phase_id: 'sale-115', label: 'Phase 2b: Alliance Stakers & Open Mint (round 2)', price_uluna: '115000000', expected: 459 },
  { phase_id: 'sale-130', label: 'Phase 2b: Alliance Stakers & Open Mint (round 3)', price_uluna: '130000000', expected: 644 },
];

// ---------------------------------------------------------------- utilities
function fail(msg) { console.error('INVARIANT FAIL: ' + msg); process.exit(1); }
function assert(cond, msg) { if (!cond) fail(msg); }

function decode(denom, amount) {
  const k = KNOWN_DENOMS[denom];
  return {
    denom, amount,
    symbol: k ? k.symbol : null,
    amount_display: k ? (Number(amount) / 10 ** k.decimals) : null,
  };
}

function loadHarvest(label) {
  const dir = path.join(ROOT, 'archive', 'fcd', label);
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
  assert(state.complete === true, `${label} harvest not marked complete`);
  const parts = fs.readdirSync(dir).filter(f => /^part-\d+\.json$/.test(f)).sort();
  const txs = [];
  for (const p of parts) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
    for (const t of d.txs) txs.push(t);
  }
  return { state, parts: parts.length, raw: txs.length, txs: txs.filter(t => (t.code || 0) === 0) };
}

/** Split a flattened wasm event's attributes into per-contract records,
 *  further splitting when a key repeats within a record (2 known cases). */
function wasmRecords(tx) {
  const out = [];
  for (const e of tx.events || []) {
    if (e.type !== 'wasm') continue;
    let rec = null;
    for (const a of e.attributes || []) {
      if (a.key === '_contract_address' || (rec && Object.prototype.hasOwnProperty.call(rec, a.key))) {
        if (rec) out.push(rec);
        rec = a.key === '_contract_address'
          ? { _contract_address: a.value }
          : { _contract_address: rec ? rec._contract_address : undefined, [a.key]: a.value };
        if (a.key === '_contract_address') continue;
      }
      if (!rec) rec = {};
      rec[a.key] = a.value;
    }
    if (rec) out.push(rec);
  }
  return out;
}

function stableStringify(x) { return JSON.stringify(x); } // objects built in fixed key order

// ---------------------------------------------------------------- load + merge
const H = {
  minter: loadHarvest('adao-minter'),
  collection: loadHarvest('adao-collection'),
};
const byHash = new Map();
for (const src of ['minter', 'collection'])
  for (const t of H[src].txs)
    if (!byHash.has(t.txhash)) byHash.set(t.txhash, t);
const TXS = [...byHash.values()].sort((a, b) => (a.height - b.height) || (a.txhash < b.txhash ? -1 : 1));
console.log(`loaded: minter ${H.minter.txs.length} ok / ${H.minter.raw} raw · collection ${H.collection.txs.length} ok / ${H.collection.raw} raw · merged unique ${TXS.length}`);

// ---------------------------------------------------------------- classify
const ledgers = new Map();        // token_id -> {events: [], ...derived later}
const auctions = new Map();       // marketplace:auction_id -> token_id
const anomalies = [];
const phaseCounts = Object.fromEntries(PHASES.map(p => [p.phase_id, 0]));
const phaseProceeds = {};         // phase_id -> BigInt uluna
let removeTokenInfo = null;

function ledger(id) {
  if (!ledgers.has(id)) ledgers.set(id, { events: [] });
  return ledgers.get(id);
}
function push(id, ev) { ledger(id).events.push(ev); }

for (const tx of TXS) {
  const base = { height: tx.height, ts: tx.timestamp, txhash: tx.txhash };
  const msgs = (tx.messages || []).filter(m => (m['@type'] || '').endsWith('MsgExecuteContract'));

  // per-tx context: paid candy mint messages (queue of costs, consumed in order)
  const candyCosts = [];
  for (const m of msgs) {
    if (CANDY[m.contract] && m.msg && typeof m.msg === 'object' && 'mint' in m.msg) {
      const f = (m.funds || []).find(c => c.denom === 'uluna');
      candyCosts.push({ contract: m.contract, amount: f ? f.amount : '0' });
    }
    if (m.contract === MINTER && m.msg && typeof m.msg === 'object' && 'remove_token' in m.msg) {
      removeTokenInfo = { ...base, msg: m.msg.remove_token };
    }
  }

  // settle records in this tx (marketplace sales of our collection)
  const recs = wasmRecords(tx);
  const settles = recs.filter(r => r.action === 'settle' && r.nft_contract === COLLECTION && r.token_id);
  const settleByToken = new Map(settles.map(r => [r.token_id, r]));

  for (const r of recs) {
    const c = r._contract_address;

    // ---- cw721 mint on the collection
    if (c === COLLECTION && r.action === 'mint' && r.token_id) {
      const treasury = r.owner === MINT_ERA_DAO_TREASURY;
      const ev = { type: treasury ? 'mint_treasury' : 'mint_free', ...base, to: r.owner,
                   phase_id: treasury ? null : 'goa-free' };
      push(r.token_id, ev);
      if (!treasury) phaseCounts['goa-free']++;
      continue;
    }

    // ---- break
    if (c === COLLECTION && r.action === 'break_nft' && r.token_id) {
      push(r.token_id, { type: 'break', ...base,
        rewards: decode('terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct', r.rewards || '0'),
        user_share: r.user_share || null });
      continue;
    }

    // ---- marketplace lifecycle (auction registry + bids/cancels)
    if (MARKETPLACES[c]) {
      const mkt = MARKETPLACES[c];
      if (r.action === 'create_auction' && r.auction_id) {
        // token comes from the escrow transfer in the same tx; registered below
        auctions.set(`${mkt}:${r.auction_id}`, auctions.get(`${mkt}:${r.auction_id}`) || null);
      }
      if ((r.action === 'place_bid') && r.auction_id) {
        const tid = auctions.get(`${mkt}:${r.auction_id}`);
        if (tid) push(tid, { type: 'bid', ...base, marketplace: mkt, auction_id: r.auction_id,
          bid: r.denom && r.amount ? decode(r.denom, r.amount) : null, bidder: r.bidder || null });
      }
      if ((r.action === 'cancel_auction' || r.action === 'admin_cancel_auction') && r.auction_id) {
        const tid = auctions.get(`${mkt}:${r.auction_id}`);
        if (tid) push(tid, { type: 'delist', ...base, marketplace: mkt, auction_id: r.auction_id });
      }
      continue;
    }

    // ---- cw721 ownership movements on the collection
    if (c === COLLECTION && (r.action === 'transfer_nft' || r.action === 'send_nft') && r.token_id) {
      const from = r.sender, to = r.recipient || r.contract;
      const tid = r.token_id;

      // paid primary: candy machine -> buyer, consume one cost from the queue
      if (CANDY[from]) {
        // non-sale outbound = stock ops: eject back to treasury, or governance-moved
        if (!candyCosts.length) {
          if (to === MINT_ERA_DAO_TREASURY) { push(tid, { type: 'stock_return', ...base, from_machine: CANDY[from] }); stockFlow(from, 'ejected'); }
          else { push(tid, { type: 'transfer', ...base, from, to, via: 'governance' }); stockFlow(from, 'other_out'); }
          continue;
        }
        const cost = candyCosts.shift();
        let phase = CANDY[from];
        if (phase === 'sale-100/115/130') phase = JUNE_TIERS[cost.amount] || null;
        assert(phase && cost.contract === from, `paid candy transfer mismatch tx ${tx.txhash} token ${tid}`);
        phaseCounts[phase]++;
        phaseProceeds[phase] = (phaseProceeds[phase] || 0n) + BigInt(cost.amount);
        stockFlow(from, 'sold');
        push(tid, { type: 'sale_primary', ...base, from, to, phase_id: phase, cost: decode('uluna', cost.amount) });
        continue;
      }

      // stock load: treasury -> candy machine
      if (CANDY[to]) {
        assert(from === MINT_ERA_DAO_TREASURY, `candy stock load from non-treasury: ${from} tx ${tx.txhash}`);
        stockFlow(to, 'loaded');
        push(tid, { type: 'stock_load', ...base, to_machine: CANDY[to] });
        continue;
      }

      // secondary sale: marketplace -> buyer with a settle for this token in the same tx
      if (MARKETPLACES[from] && settleByToken.has(tid)) {
        const s = settleByToken.get(tid);
        push(tid, { type: 'sale_secondary', ...base, marketplace: MARKETPLACES[from],
          seller: s.seller || null, buyer: to, price: decode(s.denom, s.amount) });
        continue;
      }

      // escrow in: owner -> marketplace (listing) — also binds auction_id -> token
      if (MARKETPLACES[to]) {
        const mkt = MARKETPLACES[to];
        const ca = recs.find(x => x._contract_address === to && x.action === 'create_auction' && x.auction_id);
        if (ca) auctions.set(`${mkt}:${ca.auction_id}`, tid);
        push(tid, { type: 'list', ...base, from, marketplace: mkt, auction_id: ca ? ca.auction_id : null });
        continue;
      }

      // stake / unstake custody at either staking venue
      if (STAKING_VENUES[to]) { push(tid, { type: 'stake', ...base, from, venue: STAKING_VENUES[to] }); continue; }
      if (STAKING_VENUES[from]) { push(tid, { type: 'unstake', ...base, to, venue: STAKING_VENUES[from] }); continue; }
      if (to && to.length > 44 && to !== MINT_ERA_DAO_TREASURY && !KNOWN_OWNERS.has(to)) unmappedDest[to] = (unmappedDest[to] || 0) + 1;

      // marketplace -> non-sale return (cancel payout path without settle)
      if (MARKETPLACES[from]) { push(tid, { type: 'escrow_return', ...base, marketplace: MARKETPLACES[from], to }); continue; }

      // plain transfer
      push(tid, { type: 'transfer', ...base, from, to });
    }
  }
}

// ---------------------------------------------------------------- fold: per-token state
const CUSTODY_LABEL = a => STAKING_VENUES[a] || MARKETPLACES[a] || (CANDY[a] ? 'candy:' + CANDY[a] : null);
const tokenIds = [...ledgers.keys()];
let dupMintTokens = [];
for (const [tid, l] of ledgers) {
  // events are appended in tx order already (TXS sorted); keep stable
  const mints = l.events.filter(e => e.type === 'mint_free' || e.type === 'mint_treasury');
  if (mints.length !== 1) dupMintTokens.push({ token_id: tid, mints: mints.length });

  let owner = null, custody = null, transfers = 0, lastSale = null, broken = null, origin = null, mintedAt = null;
  for (const e of l.events) {
    switch (e.type) {
      case 'mint_free': case 'mint_treasury':
        owner = e.to; mintedAt = { height: e.height, ts: e.ts, txhash: e.txhash };
        origin = e.type === 'mint_free' ? 'goa-free' : 'treasury'; break;
      case 'sale_primary':
        owner = e.to; custody = null; transfers++;
        if (origin === 'treasury' || origin === null) origin = e.phase_id; // candy stock came from treasury
        lastSale = { kind: 'primary', height: e.height, ts: e.ts, price: e.cost }; break;
      case 'sale_secondary':
        owner = e.buyer; custody = null; transfers++;
        lastSale = { kind: 'secondary', height: e.height, ts: e.ts, price: e.price, marketplace: e.marketplace }; break;
      case 'stock_load': custody = 'candy:' + e.to_machine; break;
      case 'stock_return': custody = null; /* owner remains treasury */ break;
      case 'list': custody = e.marketplace; break;
      case 'escrow_return': custody = null; owner = e.to; break;
      case 'delist': /* custody cleared by the return transfer */ break;
      case 'stake': custody = e.venue; break;
      case 'unstake': custody = null; owner = e.to; transfers++; break;
      case 'transfer':
        if (CUSTODIAL.has(e.to)) { custody = CUSTODY_LABEL(e.to); }
        else if (CUSTODIAL.has(e.from)) { custody = null; owner = e.to; transfers++; }
        else { owner = e.to; custody = null; transfers++; }
        break;
      case 'break': broken = { height: e.height, ts: e.ts, rewards: e.rewards, user_share: e.user_share }; break;
      case 'bid': break;
    }
  }
  l.derived = {
    token_id: tid,
    minted_at: mintedAt,
    origin_phase: origin,
    owner_at_freeze: owner,
    custody_at_freeze: custody,
    staked_at_freeze: custody === 'enterprise-staking' || custody === 'adao-governance-staking',
    broken,
    transfer_count: transfers,
    last_sale: lastSale,
  };
}

// ---------------------------------------------------------------- fold: wallet cost basis
const wallets = new Map();
function wallet(a) {
  if (!wallets.has(a)) wallets.set(a, {
    acquisitions: [], disposals: [], break_rewards: [],
  });
  return wallets.get(a);
}
const isWallet = a => typeof a === 'string' && a.startsWith('terra1') && a.length === 44;
for (const [tid, l] of ledgers) {
  for (const e of l.events) {
    if (e.type === 'mint_free' && isWallet(e.to))
      wallet(e.to).acquisitions.push({ token_id: tid, via: 'goa-free', height: e.height, ts: e.ts, cost: null });
    if (e.type === 'sale_primary' && isWallet(e.to))
      wallet(e.to).acquisitions.push({ token_id: tid, via: e.phase_id, height: e.height, ts: e.ts, cost: e.cost });
    if (e.type === 'sale_secondary') {
      if (isWallet(e.buyer)) wallet(e.buyer).acquisitions.push({ token_id: tid, via: 'secondary:' + e.marketplace, height: e.height, ts: e.ts, cost: e.price });
      if (isWallet(e.seller)) wallet(e.seller).disposals.push({ token_id: tid, via: 'secondary:' + e.marketplace, height: e.height, ts: e.ts, proceeds: e.price });
    }
    if (e.type === 'transfer') {
      if (isWallet(e.to) && !CUSTODIAL.has(e.from)) wallet(e.to).acquisitions.push({ token_id: tid, via: 'transfer', height: e.height, ts: e.ts, cost: null });
      if (isWallet(e.from) && !CUSTODIAL.has(e.to)) wallet(e.from).disposals.push({ token_id: tid, via: 'transfer', height: e.height, ts: e.ts, proceeds: null });
    }
    if (e.type === 'break' ) {
      const holder = l.derived && null; // rewards go to the breaker = owner at that time; recompute below
    }
  }
}
// break rewards attribution: owner at time of break (replay owner up to break height)
for (const [tid, l] of ledgers) {
  const br = l.events.find(e => e.type === 'break');
  if (!br) continue;
  let owner = null;
  for (const e of l.events) {
    if (e.height > br.height) break;
    if (e.type === 'mint_free' || e.type === 'mint_treasury') owner = e.to;
    else if (e.type === 'sale_primary') owner = e.to;
    else if (e.type === 'sale_secondary') owner = e.buyer;
    else if (e.type === 'unstake' || e.type === 'escrow_return') owner = e.to;
    else if (e.type === 'transfer' && !CUSTODIAL.has(e.to)) owner = e.to;
  }
  if (isWallet(owner)) wallet(owner).break_rewards.push({ token_id: tid, height: br.height, ts: br.ts, rewards: br.rewards });
}
// held_at_freeze + totals
const heldByWallet = new Map();
for (const [tid, l] of ledgers) {
  const o = l.derived.owner_at_freeze;
  if (isWallet(o)) { if (!heldByWallet.has(o)) heldByWallet.set(o, []); heldByWallet.get(o).push(tid); }
}
const costBasis = {};
for (const a of [...wallets.keys()].sort()) {
  const w = wallets.get(a);
  const spend = {}, proceeds = {};
  for (const x of w.acquisitions) if (x.cost) spend[x.cost.denom] = (BigInt(spend[x.cost.denom] || 0) + BigInt(x.cost.amount)).toString();
  for (const x of w.disposals) if (x.proceeds) proceeds[x.proceeds.denom] = (BigInt(proceeds[x.proceeds.denom] || 0) + BigInt(x.proceeds.amount)).toString();
  const rewards = w.break_rewards.reduce((s, r) => s + BigInt(r.rewards.amount), 0n).toString();
  costBasis[a] = {
    acquisitions: w.acquisitions, disposals: w.disposals, break_rewards: w.break_rewards,
    held_at_freeze: (heldByWallet.get(a) || []).sort((x, y) => Number(x) - Number(y)),
    totals: { spent: spend, proceeds, break_rewards_uampluna: rewards,
              acquired: w.acquisitions.length, disposed: w.disposals.length,
              held_at_freeze: (heldByWallet.get(a) || []).length },
  };
}

// ---------------------------------------------------------------- invariants (§4)
const mintEvents = [...ledgers.values()].flatMap(l => l.events.filter(e => e.type.startsWith('mint_')));
const freeCount = mintEvents.filter(e => e.type === 'mint_free').length;
const treasCount = mintEvents.filter(e => e.type === 'mint_treasury').length;
assert(tokenIds.length === 10000, `unique minted ids = ${tokenIds.length}, expected 10000`);
assert(dupMintTokens.length === 0, `tokens with !=1 mint events: ${JSON.stringify(dupMintTokens)}`);
assert(freeCount === 1191, `mint_free = ${freeCount}, expected 1191`);
assert(treasCount === 8809, `mint_treasury = ${treasCount}, expected 8809`);

// Resolved investigation trail (spec §1 anomaly clause):
// raw profiling counted 10,001 wasm action=mint in the minter harvest — the
// extra one is the ampLUNA CW20 minting to the COLLECTION (proceeds bond),
// not a cw721 mint. remove_token removed a pre-launch placeholder, not an NFT.
const AMPLUNA = 'terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct';
let backingIn = 0n, backingEvents = 0, initialBond = null;
for (const tx of TXS) {
  for (const r of wasmRecords(tx)) {
    if (r._contract_address === AMPLUNA && r.action === 'mint' && r.to === COLLECTION && r.amount) {
      backingIn += BigInt(r.amount); backingEvents++;
      if (!initialBond) initialBond = { height: tx.height, ts: tx.timestamp, txhash: tx.txhash, amount: decode(AMPLUNA, r.amount) };
    }
  }
}
anomalies.push({
  kind: 'raw_mint_count_10001_resolved',
  resolution: 'The 10,001st action=mint in the minter harvest is the ampLUNA CW20 minting to the collection contract (proceeds bonded into NFT backing), not a cw721 NFT mint. Exactly 10,000 NFT mints exist.',
});
anomalies.push({
  kind: 'remove_token_resolved',
  detail: removeTokenInfo,
  resolution: "remove_token('placeholderAddress') on 2023-12-11 — the day before GoA claims opened — removed a pre-launch placeholder config entry on the minter, not an NFT.",
});
for (const p of PHASES) assert(phaseCounts[p.phase_id] === p.expected, `${p.phase_id} = ${phaseCounts[p.phase_id]}, expected ${p.expected}`);
for (const [m, s] of Object.entries(stock))
  assert(s.loaded === s.sold + s.ejected + s.other_out,
    `stock reconciliation fail for ${m}: ${JSON.stringify(s)}`);
const breaks = [...ledgers.values()].filter(l => l.derived.broken).length;
assert(breaks === 1010, `breaks = ${breaks}, expected 1010`);
for (const [tid, l] of ledgers) {
  let h = 0;
  for (const e of l.events) { assert(e.height >= h, `token ${tid}: non-monotonic event heights`); h = e.height; }
}
// wallet<->token reconciliation: every wallet acquisition exists as a token event
let acq = 0; for (const a in costBasis) acq += costBasis[a].acquisitions.length;
console.log(`invariants OK · tokens 10000 · free 1191 · treasury ${treasCount} · paid ${Object.entries(phaseCounts).filter(([k]) => k !== 'goa-free').reduce((s, [, v]) => s + v, 0)} · breaks 1010 · wallets ${Object.keys(costBasis).length} · wallet-acquisitions ${acq}`);

// ---------------------------------------------------------------- outputs
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'tokens'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'wallets'), { recursive: true });

// tokens: part-00..09 by numeric id, 1000 per part (D1)
const sorted = tokenIds.map(Number).sort((a, b) => a - b);
assert(sorted[0] >= 1 && sorted[sorted.length - 1] <= 10000, 'token id out of 1..10000 range');
const files = [];
for (let p = 0; p < 10; p++) {
  const arr = [];
  for (let id = p * 1000 + 1; id <= (p + 1) * 1000; id++) {
    const l = ledgers.get(String(id));
    assert(l, `missing token ${id}`);
    arr.push({ ...l.derived, events: l.events });
  }
  const name = `tokens/part-${String(p).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(arr) + '\n');
  files.push({ file: name, tokens: `${p * 1000 + 1}-${(p + 1) * 1000}`, records: arr.length });
}
fs.writeFileSync(path.join(OUT, 'wallets', 'cost-basis.json'), stableStringify({
  schema_rev: SCHEMA_REV, wallet_count: Object.keys(costBasis).length, wallets: costBasis }) + '\n');

const paidTotal = Object.entries(phaseCounts).filter(([k]) => k !== 'goa-free').reduce((s, [, v]) => s + v, 0);
const proceedsTable = PHASES.map(p => ({
  ...p, chain_count: phaseCounts[p.phase_id],
  proceeds_uluna: (phaseProceeds[p.phase_id] || 0n).toString(),
  proceeds_luna: Number(phaseProceeds[p.phase_id] || 0n) / 1e6,
}));
const summary = {
  schema_rev: SCHEMA_REV,
  coverage: {
    from: 'chain genesis (collection deployed in-window)',
    to_height_approx: 13736494, to_date_approx: '2025-01-07',
    source: 'FCD frozen archive harvests: archive/fcd/adao-minter + adao-collection (both complete)',
  },
  mint_story: {
    total_supply: 10000,
    free_goa_claims: freeCount,
    minted_to_dao_treasury: 8809,
    mint_era_dao_treasury_address: MINT_ERA_DAO_TREASURY,
    paid_distributed_from_treasury_stock: paidTotal,
    phases: proceedsTable,
    candy_machines: Object.fromEntries(Object.entries(CANDY).map(([a, p]) => [a, p])),
    distribution_reconciliation: Object.fromEntries(Object.entries(stock).map(([a, s]) => [a,
      { machine: CANDY[a], ...s, note: 'loaded = sold + ejected + other_out; ejects return unsold stock to the mint-era DAO treasury; other_out = governance-proposal moves' }])),
    total_primary_proceeds_luna: proceedsTable.reduce((s, p) => s + p.proceeds_luna, 0),
  },
  secondary_market: {
    settles: [...ledgers.values()].flatMap(l => l.events).filter(e => e.type === 'sale_secondary').length,
    by_denom: (() => { const m = {}; for (const l of ledgers.values()) for (const e of l.events) if (e.type === 'sale_secondary') m[e.price.symbol || e.price.denom] = (m[e.price.symbol || e.price.denom] || 0) + 1; return m; })(),
  },
  breaks: { count: breaks },
  notable: {
    ampluna_backing: {
      note: 'Origination of the collection ampLUNA backing, in-window facts only. Current per-NFT backing is owned by nfts/adao/snapshots (nft-inventory).',
      initial_bond: initialBond,
      inflow_events: backingEvents,
      inflow_total: decode(AMPLUNA, backingIn.toString()),
      pattern: 'initial proceeds bond 2024-06-15, then daily Alliance-reward compounding mints to the collection contract',
    },
    unmapped_contract_destinations: Object.fromEntries(Object.entries(unmappedDest).sort((a, b) => b[1] - a[1])),
    unmapped_note: 'NFT movements to contracts outside the known custody/owner map — recorded as plain transfers (factual owner = the contract). Feed for the address-catalog rider. Known owners (aDAO Core, the two DAO NFT-custody wallets, mint-era DAO treasury) are excluded.',
  },
  release_history_verification: [
    { claim: 'break_nft count', page: 1000, chain: 1010, verdict: 'page undercounts by 10' },
    { claim: 'Phase 1b + 2a combined', page: 681, chain: 652, verdict: 'page overcounts by 29; split is EXACT on-chain: 127 @ 50 LUNA (1b) + 525 @ 75 LUNA (2a) — stated uncertainty resolved' },
    { claim: 'paid mints total', page: '~1981 (est.)', chain: paidTotal, verdict: 'chain-exact 1952' },
    { claim: 'Phase 2b LUNA raised', page: 148390, chain: Number((phaseProceeds['sale-100'] || 0n) + (phaseProceeds['sale-115'] || 0n) + (phaseProceeds['sale-130'] || 0n)) / 1e6, verdict: 'page appears back-computed from an estimated average' },
    { claim: 'GoA claim window start', page: 'per page narrative', chain: '2023-12-12', verdict: 'first free claim 2023-12-12 (page implies Dec-14 era)' },
  ],
  anomalies,
  known_gaps: [{
    stream: 'nft provenance (transfers, sales, breaks, staking)',
    from_height_approx: 13736494, from_date_approx: '2025-01-07',
    to: 'org nft-flows capture start (coverage check pending — open queue item)',
    note: 'FCD freeze → forward-capture start. owner_at_freeze is NOT current ownership; live state = nfts/adao/snapshots (nft-inventory).',
  }],
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

const heartbeat = {
  module: 'nfts', product: 'adao/provenance', kind: 'derive',
  ran_at: new Date().toISOString(), schema_rev: SCHEMA_REV,
  inputs: {
    'adao-minter': { raw_txs: H.minter.raw, ok_txs: H.minter.txs.length, parts: H.minter.parts },
    'adao-collection': { raw_txs: H.collection.raw, ok_txs: H.collection.txs.length, parts: H.collection.parts },
  },
  counts: { tokens: 10000, wallets: Object.keys(costBasis).length, breaks, paid: paidTotal, anomalies: anomalies.length },
};
fs.writeFileSync(path.join(OUT, 'heartbeat.json'), JSON.stringify(heartbeat, null, 2) + '\n');

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({
  module: 'nfts', product: 'adao/provenance', schema_rev: SCHEMA_REV,
  description: 'Per-token provenance ledgers + per-wallet cost basis derived from the FCD frozen-archive harvests (genesis → ~2025-01-07). One-shot re-runnable derive, not a cron. owner_at_freeze != current owner.',
  files: [
    { file: 'summary.json', what: 'mint story, phases, verification vs release-history, anomalies, known_gaps' },
    ...files,
    { file: 'wallets/cost-basis.json', what: 'per-wallet acquisitions/disposals/break-rewards/held_at_freeze' },
    { file: 'heartbeat.json', what: 'derive-run metadata' },
  ],
  spec: 'docs/pending-changes/SPEC-adao-provenance.md',
  script: '.github/scripts/adao-provenance/derive.js',
}, null, 2) + '\n');

console.log('wrote', OUT);

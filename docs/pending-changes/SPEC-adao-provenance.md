# SPEC — adao-provenance derive (one-shot, re-runnable)

**Status:** DRAFT — awaiting approval (2026-07-08)
**Script:** `.github/scripts/adao-provenance/derive.js`
**Output:** `thealliancedao/tla-core/nfts/adao/provenance/`
**Inputs:** `archive/fcd/adao-minter/` (1,644 txs) + `archive/fcd/adao-collection/`
(12,730 txs) — both COMPLETE (genesis → FCD freeze ~2025-01-07), committed in-repo.

This is a **derive**, not a cron: it reads only committed archive files, so it
runs (and is verified) fully offline in the sandbox against the real data —
end-to-end, before delivery. Re-runnable and idempotent; deterministic output.

## 0. Defaults locked for this build (veto before build, not after)

- D1 — Token ledgers ship as sharded JSONL: `tokens/part-NN.jsonl`, 1,000
  tokens per part by numeric token_id (part-00 = ids 1–1000 … part-09), one
  ledger object per line. No per-token files (10,000 tiny files is repo abuse).
- D2 — Wallet cost basis is a single `wallets/cost-basis.json` (1,631 distinct
  wallet parties in the archive window — fits comfortably).
- D3 — Marketplace events (create_auction / place_bid / settle / cancel) and
  staking (stake to Enterprise) ARE folded into per-token ledgers — they are
  provenance. Bids without settle are ledger-recorded but never a transfer.
- D4 — Current owner / current state is **NOT** produced here. One thing, one
  place: live state belongs to `nfts/adao/snapshots` (nft-inventory). This
  product ends at the FCD freeze and says so; `owner_at_freeze` is the final
  state field.
- D5 — Failed txs (`code≠0`) filtered at load (FCD returns them).
- D6 — Amounts kept as micro-denom strings + decoded `{amount_display, symbol}`
  using the known-token registry (uluna=LUNA, `terra17aj4ty…`=bLUNA). Unknown
  denoms pass through raw with `symbol:null` — no guessing.

## 1. Canonical event rules (chain-verified 2026-07-08)

The two harvests jointly contain **exactly 10,000 unique token_ids** with cw721
`mint` events on the collection contract. Verified mechanics:

- **Supply creation** = cw721 `mint` on the collection
  (`terra1phr9fn…`). All 10,000 originate from the minter
  (`terra1m3ye6…`): 1,191 free GoA claims (zero funds, 2023-12-12 →
  2024-01-12) + 8,809 → DAO treasury via `send_to_dao` (176 batch txs; count
  from events, msgs lie about batch size).
- **Paid acquisition** = candy-machine `mint` exec + LUNA funds →
  cw721 **`transfer_nft`** candy→buyer (NOT a cw721 mint). Phase map is fully
  determined by (contract, funds) — no time-window heuristics:

  | phase_id | label (from release-history.html) | contract | uluna | window (UTC) | n |
  |---|---|---|---|---|---|
  | `goa-free` | Phase 0: Game of Alliance Claim | minter direct | 0 | 2023-12-12 → 2024-01-12 | 1,191 |
  | `sale-50` | Phase 1b: DAO Staker Mint | `terra182fvr6f2vamqvk…` | 50000000 | 2024-02-20 → 2024-03-04 | 127 |
  | `sale-75` | Phase 2a: Terra NFT Communities | `terra17tg0lk3l9luhat…` | 75000000 | 2024-02-28 → 2024-03-18 | 525 |
  | `sale-100` | Phase 2b: Alliance Stakers & Open Mint (round 1) | `terra1jw84ef5qye2zyk…` | 100000000 | 2024-06-01 → 2024-06-02 | 197 |
  | `sale-115` | Phase 2b (round 2) | same | 115000000 | 2024-06-02 → 2024-06-03 | 459 |
  | `sale-130` | Phase 2b (round 3) | same | 130000000 | 2024-06-04 → 2024-06-05 | 644 |

  Labels confirmed against `aDAO-links-site/release-history.html` (2026-07-08):
  price points match phases 1:1 (1b=50, 2a=75, 2b=100/115/130 three rounds).
  Chain-exact corrections the derive will formalize in the verification table:
  - **1b/2a combined: page says 681 with "exact split uncertain" → chain says
    652, split EXACT: 127 @ 50 LUNA (1b) + 525 @ 75 LUNA (2a).** The page's
    stated uncertainty is resolved, and its combined total corrected.
  - Paid total ~1,981 (est.) → **1,952** chain-exact.
  - Phase 2b LUNA raised: page says 148,390 (≈ est. count × ~114 avg) → chain
    computes 197×100 + 459×115 + 644×130 = **156,205 LUNA** (avg 120.2).
    Derive recomputes all per-phase proceeds from funds, not estimates.
- **Secondary sale** = marketplace `settle` with
  `nft_contract = collection`: carries `token_id, denom, amount, seller`;
  buyer = the `transfer_nft` recipient in the same tx. 1,151 settles in-window
  (1,107 LUNA, 44 bLUNA). Marketplace identity from `_contract_address`
  (Necropolis / Atrium / Boost per the known-address table).
- **Break** = `break_nft` on the collection: `token_id, rewards (uampLUNA),
  user_share`. 1,010 in-window — the chain-exact number that corrects
  release-history's 1,000.
- **Stake / unstake** = `stake` events + `send_nft` to Enterprise staking
  (`terra1e54tcd…`) — ledger events, owner unchanged (custodial).
- **Plain transfer** = any other cw721 `transfer_nft` / `send_nft` — zero-cost
  ownership change (gift/wallet-move/unknown).
- **Anomaly resolution (mandatory):** minter shows 10,001 raw `mint` events
  for 10,000 unique ids alongside one `remove_token` msg. The derive must
  identify the duplicate/removed id and record the resolution explicitly in
  `summary.json.anomalies` — never silently dedupe.

## 2. Derivation pipeline

1. Load both harvests, filter `code≠0`, dedupe by txhash (harvests overlap:
   minter txs also touch the collection), sort by (height, tx order).
2. Classify every wasm event per §1 into typed ledger events:
   `mint_free | mint_treasury | sale_primary | sale_secondary | transfer |
   stake | unstake | list | bid | delist | break`.
   Every event carries `{height, timestamp, txhash, token_id, from, to,
   funds:{denom, amount}|null, marketplace|phase_id|null}`.
3. Fold into per-token ledgers (chronological event array +
   `{minted_at, origin_phase, owner_at_freeze, broken:{bool, at, rewards},
   staked_at_freeze, transfer_count, last_sale}`).
4. Fold into per-wallet cost basis: per wallet, acquisitions (event, token_id,
   cost) / disposals (event, token_id, proceeds) / `held_at_freeze` /
   totals per denom. Strictly factual attribution: treasury address = aDAO,
   candy machines = distribution contracts, personal wallets = individuals.
5. Emit `summary.json`: the full mint story (phase table above, chain-exact),
   proceeds per phase, break count, release-history verification table
   (`page_claim` vs `chain_exact` vs `verdict`), anomalies, coverage.
6. Emit `known_gaps`: this product covers genesis → FCD freeze
   (~2025-01-07, height ≈13,736,494). Marketplace/transfer events
   Jan-2025 → nft-flows capture start are ABSENT here (archive-node residue;
   coverage check vs org nft-flows is a separate open queue item). Never
   present `owner_at_freeze` as current owner.

## 3. Output layout (storage design: module/product/files)

```
nfts/adao/provenance/
  index.json          # product manifest: files, counts, coverage, schema rev
  heartbeat.json      # derive-run metadata (ran_at, input digests, counts)
  summary.json        # mint story + verification + anomalies + known_gaps
  tokens/part-00.jsonl … part-09.jsonl
  wallets/cost-basis.json
```

`index.json` + heartbeat per TLA-CORE-STORAGE-DESIGN. No cursor.json — this is
a bounded derive, not a stream.

## 4. Verification (before declaring ready)

- Hard invariants, assert-fail if broken: unique minted ids = 10,000;
  free (1,191) + treasury (8,809) = 10,000; paid = 1,952 partitioned exactly
  by the phase table; breaks = 1,010; every ledger event's token_id ∈ minted
  set; per-token event order monotonic in height; wallet ledger debits/credits
  reconcile against token ledgers (every acquisition has a matching disposal
  or origin).
- Spot-check 3 tokens end-to-end against raw archive txs (one GoA, one paid,
  one broken-with-secondary-sale).
- Full run on the real committed archives in the sandbox — output diffable,
  deterministic across two runs.

## 5. Downstream (not this build)

- `release-history.html` correction from `summary.json` (break 1,010, paid
  1,952, GoA opened Dec-12) — separate site change, after this lands.
- nft-flows coverage check (queue item 6) will decide whether the
  Jan-2025→capture-start marketplace gap needs the archive-node list.
- address-catalog rider: candy-machine + proceeds-wallet identities feed the
  WHO registry.

## 6. As-built addendum (2026-07-08) — deviations discovered during verification

The derive was run end-to-end on the real committed archives (all §4
invariants pass; deterministic across runs). Three chain realities the
original §1 didn't model, now built in:

1. **Candy machines are custodial with a full stock lifecycle.** Treasury
   loaded 352 / 1,000 / 1,300 NFTs into the three machines; unsold stock was
   `eject`ed back (225 / 473 / 0) and 2 NFTs moved out of the 75-machine by
   governance proposals. `loaded = sold + ejected + other_out` holds exactly
   per machine and is enforced as a hard invariant. New ledger event types:
   `stock_load`, `stock_return`. Treasury remains beneficial owner during
   candy custody.
2. **Two staking venues, not one.** Enterprise staking (3,176 stake events)
   AND the ADAO voting contract `terra1c57ur…` (1,180 governance stakes).
   Both are custodial; stake/unstake events carry a `venue` field. At the
   FCD freeze: 1,180 governance-staked, 552 Enterprise-staked, 39 in
   Necropolis escrow.
3. **The §1 anomaly clause resolved to two non-anomalies** (recorded in
   `summary.anomalies` as resolved investigations): the "10,001st mint" is
   the ampLUNA CW20 minting to the collection (the proceeds bond — initial
   128,854.67 ampLUNA on 2024-06-15, then daily reward-compounding mints;
   378,608.81 ampLUNA total inflow in-window, 202 events, recorded in
   `summary.notable.ampluna_backing`); and `remove_token('placeholderAddress')`
   on 2023-12-11 removed a pre-launch placeholder config entry, not an NFT.
   Exactly 10,000 cw721 mints exist.

Also produced for the address-catalog rider:
`summary.notable.unmapped_contract_destinations` (8 contracts receiving NFTs
that aren't in the known custody/owner map, largest = `terra1vvwcx…` × 22) and
the mint-era DAO treasury address `terra1g0mfr…` (recipient of all 8,809
treasury mints — predates the current aDAO Core address).

# SPEC — Member portfolio: vAMP locks P&L (Milestone A, step 4)

Status: **L1 built, run and gated 2026-09-27** (§3, derive committed e4a4058). **L2 built and run** (§4: 4,178 reads, creates 2,104/2,104, conservation 464/464; classify 1.2.1 migrate fix → a ~610-point top-up run). L3 is designed, not built. Owner ask: "can we do the credia and the locks design."
Sits beside `SPEC-portfolio-coverage.md` (what is and is not tracked) and `SPEC-rewards-planner.md` (uses the lock value).

## 1. What the member sees

The portfolio page gets one card per lock the wallet holds now, plus closed locks in the history:

- **Now:** asset + amount (e.g. 1,240 ampLUNA), LUNA underlying, USD value, voting power, permanent / unlock week.
- **Basis:** what went in and when: deposits, splits in, merges, a migration, or a transfer in with no price.
- **P&L two ways:** USD (value now − USD basis) and LUNA (underlying now − LUNA basis). For a permanent LST lock the LUNA
  P&L is the LST's appreciation, which is the lock's real return. The USD P&L also carries the LUNA price.
- **Rewards on the lock** (bribes, vote rewards) stay in the existing claims leg of build-pnl v3. They are linked here and
  never counted twice.
- **Tier** on every lock (see §5), shown as a small label beside the P&L, the same way `repair.was` is shown elsewhere.

## 2. What exists: the tla-locks NFT ledger (nft-collections/tla-locks/ledger)

These figures were measured on a fresh checkout. The ledger is the right base: it is per token, it has lineage, and
every lock-state row carries the escrow's own `lock` block (fixed_power, voting_power, lock_end).

| | rows |
|---|---|
| all records (2024-08-27 → now) | 16,803 |
| superseded (kept, labelled `superseded_by` by classify-1.1.6 re-derives) | 2,124 |
| **live rows (the only ones a reader may use)** | **14,679** |
| tokens seen / burned or withdrawn / alive | 2,526 / 2,022 / ≈593 |
| creator wallets | 231 |

Live rows by kind, with what each one carries:

| kind | rows | amount recorded | token_id missing |
|---|---|---|---|
| lock_create | 2,104 | **0** | 0 |
| lock_add (deposit_for / extend_lock_amount) | 7,719 | 7,719 | **1,698** (all fcd-era, 2024-08 → 2025-01) |
| lock_withdraw | 188 | 188 | 0 |
| lock_merge | 1,834 | n/a (lineage + fixed_power) | 0 |
| lock_split | 369 | none (lineage + fixed_power) | 0 |
| lock_migrate | 153 | amount_before + into | 0 |
| lock_permanent / unpermanent / extend | 1,420 / 273 / 235 | n/a | **100%** |
| lock_transfer | 268 | none (no sales on this collection; 62 list / 43 delist, 0 sale) | 0 |

Earlier measurement (tla-flows lock events alone, 2026-09-26): 1 of 205 member locks reconciled within 2% of
`lock_info` now. The ledger is better, but it is not enough on its own either:

- **fixed_power is not an amount source.** Over 5,959 single-asset add groups, Δfixed_power ÷ (amount × day ratio) is
  within 2% on only 1,461 (24.5%) if fixed_power is taken as fixed at entry. If the lock is re-marked at each touch,
  2,262 (38%) are within 2%. The mode is exactly 1.00, so the unit is LUNA-equivalent. But the escrow values LSTs at its
  own rate and refreshes it on its own schedule, which the day-level ratio does not follow. **Rule:** fixed_power is used
  only *within one tx* (split shares, where the rate is identical). It is never used across time.
- **Token ids are recoverable** without new data:
  - permanent / unpermanent / extend: the id sits in the sibling `wasm-metadata_changed` event with the same `msg_index`
    (checked on tx FDD98A53…, h 22641183: `ve/lock_permanent` → metadata_changed `token_id 1739`). classify.js reads
    only the `wasm` event's own attributes.
  - fcd-era adds: the archived message body carries the id. The cw20 `send` inner msg is
    `{"extend_lock_amount":{"token_id":"23"}}` (tx 48FD3A2D…, archive/fcd/escrow).
- **Create amounts are recoverable**: the tx that creates a lock carries the cw20 send / native funds leg into the
  escrow. classify.js attaches that leg for `deposit_for` but not for `create_lock`.
- **Votion vaults hold locks**, not members. The top lock recipients are Votion arbLUNA-MAX (`terra13aae4f…`, 41
  transfers in) and Votion ampLUNA-MAX (`terra1v7aw9e…`, 43), plus `terra1lsasu5…` (53) and `terra1yu2wca…` (22,
  unlabelled). A member's exposure there is a vault share (vToken), which is a separate mechanism (§7).

## 3. L1: ledger fixes (platform-crons nfts/nft-flows classify 1.2.0 + re-derive)

1. `ve/lock_permanent|unlock_permanent|extend_lock_time`: when the wasm event has no `token_id`, take it from the
   `wasm-metadata_changed` event with the **same msg_index** (and exactly one id there; otherwise leave it null and
   label it).
2. `ve/deposit_for`: take the metadata_changed event of the **same msg_index**. Today it takes the first one in the tx.
   The measurement found no live add in a multi-lock tx today, but the rule is wrong and a batch tx would break it.
3. `ve/create_lock`: attach `price` from the same leg rule as deposit_for (cw20 send amount, or native funds into the
   escrow). Inside a migrate or split it stays the child (no price), as now.
4. fcd-era rows: decode the archived msg body (`send.msg` base64 → `extend_lock_amount.token_id`,
   `create_lock{…}`, `split_lock{token_id, amount}`) when events lack the id.
5. Re-derive through the existing supersede path. Old rows are kept with `superseded_by` / `superseded_reason:
   "classify-1.2.0: token id from metadata_changed"`, so nothing is rewritten silently.

**Gate (real ledger + raw):** 0 lock-kind rows with a null token_id where the raw has one id; ≥99% of creates carry
an amount; every superseded pair differs only in the fields named in its reason; row counts by kind are unchanged
apart from supersedes.

**L1 built (2026-09-27): classify 1.2.0 + derive 1.3.0.** Measured on a full local derive: every archive, tla-flows/raw
included, at the workflow's 4 GB heap, 912 parts, 1.15M txs, about 3.5 min.

| | before | after |
|---|---|---|
| lock_create with the amount locked | 0 / 2,104 | **2,104 / 2,104** (repaired in place) |
| token-less lock_add | 1,698 | **16** |
| token-less lock_permanent / unpermanent / extend | 1,420 / 273 / 235 | **1 / 0 / 1** |
| rows superseded (labelled `classify-1.2.0: token_id -→n` / `msg_index n→n`) | | 3,829 |
| deposits recovered (two locks in one msg, the second had been lost as a duplicate key) | | 4 |
| permanents recovered (two in one msg, same reason) | | 8 |
| deposits re-priced (IBC-proxy msg: the first leg was a gauge rebase), `repair.was` kept | | 2 |

Checks on the result (`gate-locks-l1.mjs`, 9/9):
- every recovered id (3,626) names a lock that exists at that height: 3,614 were seen before, 12 predate the archive, 0
  are already gone;
- every recovered-id deposit (1,692) raises that lock's fixed_power;
- a second derive run changes nothing.

On the unfixed ledger the same gate passes only 3/9. The msg_index supersedes are forward rows the Render stream wrote
before it had classifier 1.1.6; derive 1.3 now re-reads `raw/forward/`.

Found while doing it:
- **Gauge rebases compound into locks.** `gauge/claim_rebase{token_id}` sends the rebase into the lock as a
  `deposit_for`: 642 lock_add rows have `from` = the gauge. That is income to the lock, not the owner's deposit, and it
  is the main reason Δfixed_power runs ahead of recorded deposits. L3 books these adds as a separate *rebase* leg, not as
  basis.
- **`terra1yu2wca…` is an IBC execute-proxy** (a Migaloo account driving TLA locks over IBC). Its msgs name no lock id
  anywhere in the tx: those are the 16 remaining token-less adds, and they stay null (not guessed). For §7 it counts as
  an owner, not a custodian.
- The remaining permanent/extend rows (1 + 1) are the same IBC-proxy txs.

## 4. L2: anchors — `lock_info` at height (one-time Action, then forward)

The venue's contract is the source. `lock_info{token_id}` returns `asset{info, amount}`, `underlying_amount` (the
escrow's LUNA value at lock or restamp), `fixed_amount`, `voting_power`, `coefficient`, `start`, `end`. We already read
it for "now" in capture-engine (tla-participants, hourly).

- **Action `locks-anchor`** (nft-collections): an archive LCD with the `x-cosmos-block-height` header, the same reader
  pattern as ally-positions/backfill.js. It reads each lock at the heights where an owner's basis starts or ends:
  - create (h),
  - transfer in/out (h),
  - split parent and child (h−1 and h),
  - migrate (h−1 and h),
  - any row §3 could not resolve (h−1 and h).

  Estimate: ≈2,104 + 268 + 2×369 + 2×153 ≈ **3,400 reads**, plus ≈593 "now" reads. Output:
  `tla-locks/ledger/anchors/<shard>.json` rows `{token_id, height, side: before|after, asset, amount, underlying,
  fixed_amount, read_at}`. The Action is resumable by shard and idempotent: a row present at (token, height, side) is
  never re-read.
- **Forward:** the nft-flows forward duty reads `lock_info` at head for any lock that had a lock-kind row in the run.
  State now equals state after the event when no later tx touched it; otherwise the row is left to the daily Action
  pass. This is cheap: tens of reads a day.
- A lock burned by merge, withdraw or migrate cannot be read after its burn height. Reads go at h−1 for "before", and
  the "after" comes from the survivor.

**L2 built (2026-09-27): `nft-collections/.github/scripts/locks-anchor/anchor.js` 1.0.0 + workflow `locks-anchor`.**
- **Reading method:** the archive RPC (secret ARCHIVE_RPC, already used by nft-flows-walk), `abci_query`
  SmartContractState at height. No LCD secret is needed.
- **Plan on the rebuilt ledger: 4,262 points.**
  - create 2,104
  - transfer 268
  - split parent 738, split child 369
  - migrate from 153, migrate to 153
  - now 593

  Of these, 84 are skipped because the lock is gone within its own block (the Votion same-block merge). That leaves
  ≈4,180 reads, about 35 min at 2 rps.
- **Output:** `tla-locks/ledger/anchors/<shard>.json` + `index.json`, write-once per (token, height, side). A node error at
  a height is stored as an answer. A transport failure is not stored and is retried on the next run.
- **Mock gate** (`mock-anchor.mjs`, 8/8): protobuf, run-mode guard, ≤ 4 rps sequential, backoff, budget stop, resume
  (third run asks 0), a dead node stops after 5 calls, and the post-run gate runs.
- **Post-run gate** (`gate-locks-l2.mjs`):
  - A2: the create block's asset = the recorded payment (amount and denom);
  - A3: splits conserve (parent before = after + Σ children, per parent per block);
  - A4: a migrate's old asset = the ledger's `amount_before`;
  - coverage and honesty checks.

  The workflow commits the answers *before* the gate, so a disagreement is examined without paying for the reads again.

**L2 first run (2026-09-27, 35 min, 2 rps):** 4,178 reads, 0 errors, 0 retries.
- **A2:** 2,104/2,104 creates. The escrow's asset at the create block equals the recorded payment, to the last unit.
- **Found:** classify 1.2.0 named the *burned* lock as a migrate's new lock. All 153 migrates pointed back at their own
  old id; the burn repeats `token_id`, and the migration tool emits a split's create_lock first.
- **Fixed:** classify 1.2.1 names the next create_lock after the migrate. Derive 1.3.1 supersedes the 155 re-keyed rows
  (`token_id a→b`). Lock births are now complete: 0 "created before the archive" (was 12).
- **Live locks:** now 451, which matches the escrow's CW721 count of 443 plus new locks since. The first run's 593 counted
  migrated-away ids.
- **A3 (per lock per block):** 464/464 blocks conserve: before = after + Σ split children + migrated out. That covers 311
  splits, 58 split+migrate blocks and 95 migrates.
- **A4:** reads each migrate's new lock on the next run, about 610 points (155 new locks + 451 "now" at the new head).

## 5. L3: the model (tla-flows pnl duty → `mechanism: 'lock'`)

A new `lib/pnl-locks.js` sits beside `pnl-positions.js`. It follows read → fold → drop: ledger months one at a time,
and anchors by shard.

- **Lock chain:** for each token, live rows are sorted by (height, msg_index) and carry the state after each row
  (asset amount).
- **Holding episodes:** (owner, token, from_h, to_h), from the by-wallet replay rules already in the ledger (acquire /
  release). Votion vaults and other registry contracts are *custodians*, not owners (§7).
- **Basis legs (per episode):**

| leg | USD basis | LUNA basis | amount source |
|---|---|---|---|
| create / add by the owner | amount × USD price of the day | escrow `underlying_amount` Δ (anchor) or amount × ratio of the day | the row's price (after L1) |
| split child in | parent basis × child share | same share | fixed_power share **inside the split tx** |
| merge (survivor) | Σ basis of merged locks | Σ | lineage |
| migrate | carried (the old asset's basis moves to the new one, as build-pnl v3 migrations do) | carried | migrate block + anchors |
| transfer in, no price | value at receipt (amount × price that day) | amount × ratio that day | anchor at h |
| withdraw | realized: amount out valued that day − released basis | same in LUNA | the row's price |
| transfer out | realized at value on the day | | anchor at h |

- **Value now:** the "now" anchor (`lock_info` at head, same as tla-participants) × LST USD. LUNA = amount × ratio now.
  Prices come from price-history, whose ratios are chain-anchored since the re-anchor.
- **Reconcile per lock:** rebuilt amount (Σ legs) against the anchor amount at the end of each episode.

**Honesty tiers (one per lock, shown on the card):**

| tier | rule | shown |
|---|---|---|
| `exact` | every leg has an amount and the rebuilt amount = the anchor within 0.5% | P&L plain |
| `anchored` | an anchor disagrees with the rebuild; the gap is booked as one labelled leg `unexplained_in` / `_out` at the anchor height, valued that day | P&L with "includes X ampLUNA not traced to a deposit" |
| `received` | the episode began with a transfer in and no price | P&L "since you received it" |
| `unknown` | no anchor and the rebuild failed | value now only; P&L blank (blank beats phantom) |

**Output:** rows join the v3 positions file (`mechanism: 'lock'`, `pool: 'tla-locks'`, `token_id`, tier, legs as rows).
The member curve gets the lock value at each state-history epoch from the anchors bracketing it. portfolio-pnl.js
renders a lock row type; the page needs no other change.

## 6. Gates (all on real data, binding before any commit)

- G1 L1 re-derive: 0 resolvable null ids; creates with amount ≥99%; supersede reasons exact.
- G2 anchors: every (token, height, side) planned is present or listed as `unreadable` with the LCD reason; a second
  run reads 0.
- G3 chain: for every lock alive now, the rebuilt amount vs `lock_info` now. The target is ≥90% `exact` for locks
  created after 2025-01 (the raw era). Every miss is tiered, none dropped.
- G4 conservation: Σ basis across all episodes of a lock = Σ deposits − Σ withdrawn basis (USD and LUNA) to 1e-9.
- G5 merge/split: basis conserved across lineage edges (children sum to the parent within 1e-9).
- G6 custodians: no Votion vault, Atrium venue or escrow address is ever an owner in the output.
- G7 P&L two ways: USD P&L − LUNA P&L × LUNA now = the LUNA-price leg, shown per lock.
- G8 memory: the fold stays under 200 MB on the full ledger (Render heap ≈256 MB).

## 7. Out of this step (named, not dropped)

- **Votion depositors:** the member holds vTokens (factory shares) of a vault that holds locks. The share of the vault
  equals vToken balance ÷ supply × the vault's locks (anchored like any lock). The basis is the member's deposits into the
  vault. This needs a Votion deposit/withdraw ledger; tla-core votion data holds the vault state but not per-member legs.
  It is the next step after this one.
- **`terra1lsasu5…` (53 transfers in) is a wallet**: it signs its own txs (acc_seq on FDD98A53…), so it is an owner. **`terra1yu2wca…` (22) is
  an IBC execute-proxy** (a Migaloo account). It is an owner too, but its msgs never name the lock (§3 L1 result). Neither is a custodian for G6.
- Lock marketplace sales: none exist on this collection today. If a venue lists tla-locks, a `sale` row becomes a
  priced basis leg, and the rule is already in the table above.

## 8. Order and cost

1. **L1** classify 1.2.0 + re-derive (platform-crons + a one-time run on nft-collections): about one session, gated.
2. **L2** `locks-anchor` Action (nft-collections), ≈4k archive reads, resumable. Then the forward read in nft-flows.
3. **L3** `pnl-locks.js` inside the pnl duty + a portfolio-pnl lock row + the gate set above.
4. Votion shares (§7), then the rewards planner reads the lock value for its "loan / savings" math.

Backfill note: L1 and L2 are the backfill. After them, the forward path (nft-flows rows + the head read) keeps the
locks current with no owner input.

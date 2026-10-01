# Deep Walk + probes — changelog (tla-core GitHub Actions: deep-walk.yml, credia-probe.yml, solid-probe.yml)

The one-time deep-history backfill (SPEC-deep-history §8) and the protocol probes that proved what to read. Actions run in tla-core
(public; unlimited minutes) and write RAW data to the PRIVATE repo `thealliancedao/tla-archive` (secrets in tla-core: ARCHIVE_RPC,
ARCHIVE_LCD, ARCHIVE_REPO_TOKEN — fine-grained, tla-archive only — and FLOW_KEY for the HMAC dedup key). Only aggregates with no wallets
(contracts-seen.json, protocol-labels.json) and later compact derived products are published here. Newest on top, UTC.

---

## CLOSED — 2026-10-01 — the backfill is complete; nothing left that only the node can give

The audit after walk 1.9 (docs/deep-history/audit.json) has one gap left — **[medium] prices**, computed from saved pools in the derive, not
read from the node. Everything the archive node can serve is in the archive; everything it cannot is named and rebuilt from events.

| Layer | Final | Notes |
|---|---|---|
| layer1 — every tx of every cohort wallet | **634,811 txs**, 1,159/1,159 wallets, 0 failed searches | +29,063 from 16 more keys (1.8): fungible_token_packet.sender 23,122 (IBC acks / refunds), wasm.job_owner 3,300, wasm.sender 2,634; 4 keys the node's query parser rejects (`wasm-erishub/…`, `wasm-steakhub/…` — "offset 12: invalid input") dropped; the audit's missed-tx sample is 0 on every key |
| layer2 — weekly DEX / Credia / Solid / DAO voting | ~66.9K reads, missing 0 | 2023-10-23 → now; earlier weeks events-only |
| layer2b — weekly TLA + LST state (1.8) | **4,660 weeks**, 37/37 targets, missing 0 | v2 hub 2580 · v3 buckets / gauges / vAMP / compounder / connectors · 5 LST hubs · CAPA gov + staking · Lion DAO LP staking; 402 pre-floor weeks events-only |
| layer2c — price pools (1.9) | 24 pools, 817 monthly rows | 6 DEX factories listed 1,047 pairs; only 24 hold any of the 319 tokens nothing prices — the rest have **no market** |
| layer3 — monthly bank / staking | 44,324 checkpoints, missing 0 | 3,688 delegation reads the node fails on ("invalid denom") marked unreadable → rebuilt from delegate / undelegate events |
| flows | 1,569,460 changes · 94.9 % exact vs layer3 (native) · cw20 sample 99.3 % | the drift is balance moving outside txs (unbonding credits at end-block, the 2022 genesis airdrop) — classes in audit.json; the derive anchors on layer3 |

Node floors (measured 2026-10-01): bank / staking state from block 4,063,817 (2023-03-13), contract state from 7,316,497 (2023-10-23).
Next: the derive (unbonding credits from undelegate events, genesis anchors, monthly re-anchor on layer3, delegations from events, prices
from pools incl. layer2c, "received — no cost" for transfers in), then public per-wallet summaries (§8b), then the page-edit round.

---

## walk.mjs 1.9 — 2026-10-01 — closeout: settle without re-walking; price pools
- The 1.8 run (5 h 18 m) left 1,616 "failed" items, all deterministic: 4 search keys the node rejects (each retried 5× with backoff on all
  1,159 wallets — most of the 5 h), 300 contract reads below the real floor (1.8 measured the floor on a 2024 bucket and read back to
  2023-03), 3,688 delegation reads the node fails on. Re-running would have repeated all three.
- 1.9: a query the node rejects is never retried (`REJECTED_Q`); a key that failed on ≥ 95 % of wallets in the record, or fails the same way
  on two wallets now, is dropped with the node's message; a key a wallet already searched in full is not searched again (1,159 settled
  with zero searches); the contract floor is measured on the earliest-starting busy pair, and when a sample starts after the state floor
  the layer-2 measurement is used; a state read that fails deterministically is marked unreadable (per height after 3 wallets).
- New **layer2c**: pools for held tokens nothing prices — found through the factories that instantiated the cohort's pairs
  (contract_info.creator, `{pairs:{start_after,limit}}`), reserves at the first weekly boundary of each month from the contract floor.
- Audit: layer 2b / 2c counted as covered; "TLA / LST state missing" now means layer 2b does not hold it (1.8's rule matched protocol
  labels and would have kept firing on ampLUNA / bLUNA token contracts); dropped keys and unreadable delegations reported.
- Mode `closeout` (gapfill runs it too). Gate mock-audit 30/30, incl. C0–C6: the OLD 1.8 gapfill run against a node that behaves like the
  archive node reproduces production's failures, then 1.9 settles them with no re-walk; a second closeout has nothing to do.
- The live run: **4 m 14 s**, closeout DONE — nothing left.

## walk.mjs 1.8 — 2026-09-30 — gapfill
- What the 1.7 audit found missing, in one run: layer1b (16 more search keys, new txs only), layer2b (TLA / LST / CAPA / Lion DAO state
  weekly), layer3b (missing delegations), then flows + audit. Run #18: +29,063 txs, 4,660 weekly state reads; left the three deterministic
  failures settled by 1.9. Mock 23/23 at the time.

## walk.mjs 1.7 — 2026-09-30 — audit
- Mode `audit`: every layer checked against what was expected and why anything is missing, the flows drift classified per wallet × denom,
  a cw20 sample against the chain, a layer-1 key sample, the busiest contracts layer 2 never read (with their query API), price coverage of
  everything held → archive/audit/<day>.json + a counts-only docs/deep-history/audit.json (guarded: no cohort wallet). Mock 16/16.

---

## RESULT — 2026-09-30 — the backfill is done

| Layer | Result | Coverage |
|---|---|---|
| cohort | 1,159 wallets (aDAO holders any state 802 · Pixel Lions staked incl. Enterprise 506 · Burning Lion holders 7 · auto-max TLA lock with VP > 100K 32; overlaps counted once) | cut 2026-09-29 |
| layer1 — every tx of every cohort wallet | 605,041 txs, 0 failed searches, 31 min; memos never stored | 2022 → now |
| inventory | 4,601 contracts · 532 code ids · 38 message types → docs/deep-history/contracts-seen.json; labels for 108 codes = 95.6 % of activity → protocol-labels.json | — |
| layer2 — weekly protocol state (486 DEX pairs, Credia, Solid ×3, DAO voting ×6) | ~66.9K of ~75.7K weekly reads saved | **2023-10-23 → now** |
| layer3 — monthly bank / delegations / unbonding per wallet | 44,324 checkpoints, 0 failed, 26 min | **2023-04-03 → now** |
| flows — every native + cw20 balance change rebuilt from layer1 | 1,569,362 changes; 466,571 of 491,860 checks against layer3 exact (**94.9 %**) | 2022 → now |

**What the archive node keeps (measured 2026-09-30):** the full TX history; bank/staking state from block **4,063,549** (spring 2023);
contract (wasm) state from block **7,324,381** (week of 2023-10-23). Below the state floor a read answers "failed to load state at
height N … version does not exist … pruned"; below the contract floor a smart query answers "panic: unknown request" (LCD: "codespace
undefined code 111222: panic") — that message does NOT mean the contract lacks the query. Older protocol state and balances are rebuilt
from layer-1 events and marked "events only". The node may not last — plan as if it can vanish; layer 1 (the irreplaceable part) is saved.

Next: classify the 5.1 % flows drift (balance moving outside tx events — staking rewards paid at begin-block, vesting, refunds, fee edge
cases), re-anchor balances monthly on layer3, net deposits under the §8b privacy rules, weekly position values, Credia/Solid history from
events, public per-wallet summaries, then ONE page-edit round.

---

## walk.mjs 1.6 — 2026-09-30 — contract reads get their own floor
- The 1.5 run found bank state from block 4,063,538 but every older contract read answered "panic: unknown request". 1.6 measures a
  separate **contract-state floor** (binary search to ~50,000 blocks on the earliest-starting contract that answers at the newest week) and
  prints a 7-point spread across that contract's history (2023-03 ✗, 2023-10 ✗, 2024-05 ✓ … 2026-09 ✓). "unknown request" is a failure,
  never "the contract doesn't support it". The wrong 1.5 marks are cleared on the first 1.6 run.
- The 1.6 run: floor 7,324,381 (2023-10-23); all 8,846 remaining reads were older → ALL DONE. A mock with the REAL inventory showed the full
  job is ~75.7K reads — so **run #6 (2026-09-29, 3 h 49 m) had already saved ~66.9K**; runs #7–#9 had only been retrying the 8,846 reads this
  node cannot serve. (An earlier note said #6–#9 read nothing — wrong: only #9's log had been seen.)

## walk.mjs 1.5 — 2026-09-30 — the state floor
- Each state mode measures the lowest block whose state the node still has (bank read, binary search to ~2,000 blocks), skips older reads
  (reported, never retried, not counted as "left"), tries up to 8 of the busiest contracts for the route test, never retries pruned answers.
- Wrong turn: it read "unknown request" as "this contract doesn't answer this question" and skipped whole contracts after 3 refusals
  (the run saved nothing). Fixed in 1.6.

## walk.mjs 1.4 — 2026-09-30 — reads through the archive RPC, fail fast, say why
- Trigger: run #9's log — 8,846 reads, 0 ok, every read failing instantly and retried 4× (≈ 10 s each = the whole 195-minute budget). The
  log said only "failed".
- State reads go through the archive RPC `abci_query` (protobuf via cosmjs-types — the route layer 1 proved) with the LCD as fallback; a
  **route test** before reading (both routes, recent + old height, each answer printed with URLs masked); a run **stops red with no next run**
  when no route answers or 150 reads fail in a row (`<mode>_stop.txt`, read by the chain step); the top failure messages are printed.
- The first 1.4 run stopped in ~1 minute and printed the real reason: "version does not exist … pruned" at block 1.83M on both routes.

## walk.mjs 1.3 — 2026-09-29 — layer3 + flows
- `layer3`: monthly bank balances, delegations and unbonding per cohort wallet from the month before its first tx → archive/layer3/.
  Resumable, chains itself like layer2.
- `flows`: no chain reads — every native (coin_spent / coin_received) and cw20 (transfer / send / *_from / mint / burn) balance change per
  wallet rebuilt from layer 1, fees tagged `fee`, counterparty matched by denom + amount (the mock caught a fee tagged with the swap next to
  it), weekly balances (BigInt), checked against the layer3 checkpoints → archive/derived/flows/ + `_report.json` (agreement %, drift by denom).

## walk.mjs 1.2 — 2026-09-29 — layer2 (protocol state per week)
- Weekly boundaries = Mondays 00:00 UTC (the TLA epoch calendar, epoch 1 = 2022-10-31, extended back to 2022-05-30): heights from
  dex-data/state-history for epochs 97+, a block-time search for older weeks → archive/layer2/heights.json (227 boundaries).
- Targets from the inventory: every DEX pair the cohort traded or provided on (13 pair code ids: Astroport, the 2022 Terraswap-era pairs,
  URA, SkeletonSwap, Phoenix, the usdc.inj transmuter…) `{pool:{}}`, Credia `{metrics:{}}`, Solid market / oracle / overseer, DAO voting
  totals. Resumable per target × week; a run that ends with reads left starts the next itself (`chain` input, default 4; the input was
  missing from the first form — fixed the same evening).

## walk.mjs 1.1 — 2026-09-29 — inventory
- Every contract any cohort wallet touched (txs, wallets, top actions, first/last height, label / code id / admin, our registry name),
  message types, IBC channels, denoms → `docs/deep-history/contracts-seen.json` (aggregate, NO wallets — committed to tla-core). Owner
  labelled the unknown codes: URA DEX = 2961 (dead; he wants its data), Knowhere = 136 (old marketplace), 1723 = the 2022 Terraswap-era
  pairs; 402 / 2580 / 793 unknown → `docs/deep-history/protocol-labels.json`. The push once hit "cannot lock ref 'refs/heads/main'" (a race
  with the bots' commits) — the pull-rebase-push retry handled it.

## walk.mjs 1.0 — 2026-09-29 — timing, cohort, layer1
- `timing` (tx_search 0.44 pages/s at ×1, 1.67 at ×8; smart-at-height ~1.5/s at ×8 — it measured speed, NOT what state the node keeps;
  lesson: step 0 must also find the state floors), `cohort` (public products only), `layer1` (every tx under 20 wallet-valued attribute
  keys, deduplicated by hash, decoded with cosmjs-types; the tx MEMO and signer data are dropped before anything is written; gzip parts per
  wallet; resumable; commits every 8 min; `shards`, `limit_wallets`; clean stop at the budget). Logs print counts only.

## credia-probe 1.1 — 2026-09-29
- 1.0 would have paged every ampLUNA holder; 1.1 fetches Credia's own history first and runs the census only on Credia's lists.
- Ran 53 min → docs/fixtures/2026-09-29/credia-probe.json: `portfolios` returns ALL 183 positions in 8 pages; 12,995 portfolio txs (8,000
  read), 127 wallets, 51 liquidator txs; every event carries the position's full snapshot → Credia's history needs no archive state reads.
  The "Credia take rate funds the gauge tributes" hypothesis is NOT supported (the add_bribe seen beside Credia events is TLA's own weekly
  take distribution).

## solid-probe 1.3 → 1.4 — 2026-09-28
- 1.3: one wallet + the contract set (21 contracts registered). 1.4: the full census — 219 collateral rows, 551 borrower rows, 202 wallets
  with a loan; the protocol's limit reproduced within 1 % on 114/114 priced positions; liquidation vocabulary proven (custody
  `liquidate_collateral {borrower, amount}`, queue `execute_bid {collateral_amount, repay_amount}`, market `repay_stable {borrower}`),
  **1,655 liquidations on chain**, 190/190 samples tie borrower + collateral + SOLID repaid; 59 wallets still owe SOLID with no collateral.

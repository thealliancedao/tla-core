# SPEC: portfolio coverage (every place a member's money can sit: what we have, what's missing)

Status: **AUDIT 2026-09-27**, built from a fresh pull of every repo plus the owner's phoenix.money HAR of the Lion DAO wallets
(fixture: `docs/fixtures/2026-09-27/phoenix-money-liondao-portfolio.json`). Nothing here is assumed; every count was read from
main on the day.
Owner: capture (platform-crons) → derive (tla-flows/pnl.js) → site (member-portfolio, the app).
Rides with: SPEC-portfolio-pnl, SPEC-portfolio-roundtrip-pnl, SPEC-portfolio-epoch-ledger, SPEC-registry-extensions-pnl.
Adds: SPEC-rewards-planner (the "what to do with my claim" tool).

## 1. The question

A member portfolio has to show two things for every place a wallet can hold value:
- **NOW:** the current position, read hourly.
- **THEN:** the history of every way in and out, back to TLA genesis, so P&L can be computed both ways (USD and LUNA).

phoenix.money is the reference members already trust. It covers 11 "dapps": balances · cw20 · tla · tla-compounder ·
tla-locks · votion · creda · solidcapa · pdt · astroport · skeleton-swap. We need every one of those (except pdt, which is
Phoenix Directive's own treasury) plus the things phoenix doesn't show: NFTs, native staking, bribes/rebase claims, and
DAO token staking.

## 2. The matrix

Legend: ✅ have it · 🟡 partial (limits stated) · ❌ none.
NOW = a current reader for **members**. The Lion DAO roster is a separate job: ally-positions covers more for its 5 wallets.

| Where the money sits | NOW (members) | THEN (history stream) | Era covered | Gap / note |
|---|---|---|---|---|
| **TLA LP, staked (non-amp)** | ✅ participants `lp_positions` | ✅ tla-flows/events v4: deposit/withdraw with `provides`, `withdraw_liqs`, `zap_out_assets` | 2024-08 → now, every month (123,148 events) | index.json still lists the FCD→forward "known gap", but the 2025 months are full. Verify, then retire the entry |
| **TLA compounder (amp)** | ✅ participants | ✅ same stream, `mechanism: amplified_vault` | same | Rate curve: state-history compounder per epoch (E97→) ✅ |
| **TLA locks (VP NFTs)** | ✅ participants `locks` | ✅ tla-voting/events/locks: create/extend/merge/split/transfer/permanent/withdraw | 2024-08 → now | Lock cost basis = LST at lock × the re-anchored ratio (step (i)) |
| **TLA LP rewards (zLUNA)** | ✅ `pending_rewards` **per pool** | ✅ claim events: `claims[]` per gauge with `reward_amount`; vault claims carry `claimed_coins` | 2024-08 → now | Unvalued in pnl.js today (Phase A). A claim spanning several pools in one gauge gives one amount: split by pending share (method stated) |
| **Bribes** | 🟡 `pending_bribes` | ✅ tla-voting/events/rewards `claim_bribes` (coins) | 2024-09 → now | **Bug:** USDC.n bribes carry the raw IBC hash as the symbol, so they're unpriced (member-data + ally-positions). Fix upstream |
| **Rebase** | ✅ `pending_rebase` | ✅ `claim_rebase` | 2024-09 → now | none |
| **Votion vaults** | 🟡 votion snapshots/holders (vault-level + registry) | 🟡 votion/events | **2025-02 (1 event), then 2025-08 → now** | Genesis vs. capture gap unverified (queued since 09-13). Not in participants |
| **Wallet balances (native)** | 🟡 participants carries **LUNA + zLUNA only** | ❌ no bank-transfer stream | — | phoenix shows USDC.inj, wstETH, USDt, rSWTH, ampROAR… A member page needs every denom priced from the catalog |
| **cw20 balances** | ❌ members (ally-positions reads **2 known cw20s**) | ❌ | — | ROAR, ampLUNA (cw20), bLUNA, CAPA, SOLID… Read from the token-catalog's cw20 list, not a hand list |
| **LST hubs (bond/unbond, unbonding queue)** | ❌ (only as balances) | ❌ | — | Ratios ✅ (re-anchored). Unbonding claims are money in flight, and nothing shows them |
| **Astroport / SkeletonSwap LP outside TLA** | ❌ members (ally-positions counts DEX LP as balances) | 🟡 dex-liquidity/events provide/withdraw on the **26 TLA-relevant pairs** | 2025-01 → now | 2024 (FCD era) pairs never walked. Non-TLA pairs (e.g. MOAR-ROAR) not captured |
| **Creda (Credia) money market** | ❌ members · 🟡 ally-positions: collateral only | ❌ (leverage stream queued since 08-26) | markets + rates ✅ (dex-data/credia) | ally-positions reads Ryan's Credia at **$8,337 vs phoenix $10,191**: it misses the LUNA-ampLUNA **ampLP-as-collateral** leg ($1,870). **Debt:** "portfolio response has no borrows array", so the debt shape is unknown and borrows/health are unread |
| **Solid / Capapult CDP** (collateral, minted SOLID, LTV, liquidations) | ❌ | ❌ | — | **Discovered 2026-09-28** (solid-probe 1.3): all 21 contracts registered (config `SOLID`, known_contracts, queries.md §19); reader next — collateral via overseer `collaterals`, debt via market `borrower_info`. Open: oracle unit, liquidation events. (Was: the CDP contracts weren't in known_contracts. SOLID cw20 = `terra10aa3zdkrc7jwuf8ekl3zq7e7m42vmzqehcmu74e4egc7xkm5kr2s0muyst` (its minter is the way in). CAPA supply product ✅ |
| **Native staking (delegations + staking rewards)** | ❌ members · ✅ ally-positions | ❌ | — | Rewards history = withdraw_delegator_reward events (bank). Needs a stream |
| **DAO token staking** (ROAR staking, DAODAO cw20 stake, reward distributors) | ❌ members · ✅ ally-positions (Lion DAO) | ❌ | — | pixeLions distributor `pl_rewards` ✅ for the DAO only |
| **NFTs: aDAO / Pixel Lions / TLA Locks** | ✅ by-wallet ledgers (nft-collections `ledger/by-wallet`, 34 shards each) + DAODAO stake summary | ✅ ledgers (mint → list → sale → stake → unstake → transfer) | aDAO from FCD genesis (provenance) + forward; PL / Locks from their backfills | Mint payment leg ✅ for aDAO FCD era; USD at time from price-history. Burning Lions has **no by-wallet ledger** yet (sales ledger queued). BBL bid-account balances not captured (queued) |
| **PDT (Phoenix Directive treasury)** | n/a for members | n/a | — | PD's own product; out of member scope |

### What the numbers say (Lion DAO, the one wallet set with a reference)
- **Ours today:** $231,344 (ally-positions 09:20Z). **Phoenix (HAR):** $233,161. Δ **−0.8 %**.
- The section split still reconciles against the 09-21 fixture. Swap the reference to the 09-27 fixture in ally-positions.
- The missing leg we can name is Credia's ampLP collateral (~$1,870).

### What the numbers say (members)
- **participants** (hourly, 205 wallets): TLA-only: LPs, locks, pending rewards/bribes/rebase, LUNA + zLUNA balances.
- **tla-flows/pnl** (weekly, 768 wallets): history for TLA flows; values zap inputs and fees only (Phase A).

## 3. What "powered" means (the bar for the announcement)

A member page is **complete** when, for every row of §2, it shows either the number or an honest "not captured: why". Never
a silent zero. Built in this order, each a closed step:

**P0: history we already hold → P&L (Milestone A step 3, in progress).** No capture needed.
- (i) ratio re-anchor ✅ delivered.
- (ii) build-pnl v3: TLA LP + compounder + locks + claims + bribes + rebase, valued both ways; round trips + attribution.
- (iii) member-portfolio rebuild on it, plus NFTs from the by-wallet ledgers.

**P1: NOW for every venue (public LCD, no archive needed).** One reader, folded into member-data (the job that already
walks the 205 participants hourly), sharing the ally-positions engine: never a second copy. Covers:
- every native denom + every catalog cw20
- Votion vault shares
- Credia: collateral incl. ampLP, **and borrows/health**
- delegations + pending staking rewards
- LST unbonding queue
- non-TLA DEX LP
- Solid CDP (after discovery)

Gate #0 vs phoenix on the Lion DAO wallets (the 09-27 fixture) before a member ever sees it.

**P2: THEN for the new venues.**
- **Forward** capture starts the day P1 ships (tla-flows / tla-voting pattern: walker + classifier; the aux-classifiers
  module takes new families):
  - Credia: supply / withdraw / borrow / repay / liquidate
  - Solid: deposit collateral / withdraw / mint / repay / liquidation
  - staking: delegate / undelegate / withdraw rewards
  - LST: bond / unbond / withdraw
- **Backfill** depends on the archive:
  - FCD archive: anything before 2025-01-07, any time.
  - 2025-01 → ~3 weeks ago: **only an archive node.** Public nodes keep ~2–3 weeks.
  - Without archive access, those venues start their history at the forward-capture date, stated on the page, and P&L for
    them is "from <date>".

**P3: whole-wallet flows (optional; decide scope).** Bank + cw20 transfers in/out would let the page say "you brought $X
into Terra and it's worth $Y". Without them, P&L is **protocol-scope**: what went into TLA/Votion/Credia/Solid/NFTs vs what
came out. Recommend protocol-scope for the announcement; wallet-scope later.

## 4. Decisions for the owner
1. **Archive node:** is the access used for state-history still live? If yes, P2 backfills Credia/Solid/staking history in the
   same walk-once pass. If not, they start at forward capture (honestly labeled).
2. **Scope:** protocol-scope P&L for the announcement (recommended) vs whole-wallet.
3. **Solid discovery:** point me at the Capapult contracts if you have them (app.solidcapa.com). Otherwise we find them from
   the SOLID cw20 minter.

## 5. Found while auditing (small, queued)
- `tla-flows/events/index.json` `known_gaps` still names the 2025-01→2026-06 hole though every month is present. Verify
  heights, then label the entry resolved (never delete).
- Bribe symbol = raw IBC hash for USDC.n (member-data participants/positions + ally-positions), so those bribes are unpriced.
- ally-positions reconciliation reference → the 09-27 fixture; Credia ampLP collateral leg; Credia borrow shape.
- `participants` wallet_balances: LUNA + zLUNA only.

# SPEC — the member portfolio's Solid section (Capapult CDP)

Status: DRAFT 2026-09-28 — owner asked: "build the Solid part of the member portfolio: how much the user has supplied as collateral,
the liquidation risk, how much SOLID they have borrowed, and any P&L aspects we need to record". Contracts, query shapes and events are
in `docs/queries.md` §19 and `platform-crons/config/contracts.js` `SOLID` (found by solid-probe 1.3, fixture
`docs/fixtures/2026-09-28/solid-probe.json`).

**Status 2026-09-30: the card is LIVE (member-portfolio 4.1 → 4.1.2, platform-crons lib/solid-reader 1.0.1, member-data 1.6.0 — Solid for
28 members).** Resolved since the draft: the oracle unit (USD = raw × price / 1e6 — wBTC 828.44 × 100 = $82,844, the catalog's $60.5K is
stale); the census (probe 1.4: 219 collateral rows, 551 borrower rows, 202 with a loan; limit reproduced within 1 % on 114/114); the
liquidation vocabulary (custody liquidate_collateral → queue execute_bid → market repay_stable; 1,655 liquidations; 190/190 samples tie);
wrapper decimals (wBTC 8 / wETH 18 though token_info says 6); the band `debt_no_collateral` (59 wallets, 29 from one mass liquidation at
22,730,546) reads "SOLID still owed · no collateral left". Still open: per-wallet queue bids, borrow/repay fee attributes (0.5 % mint fee
seen), wrapper bond/redeem events, interest (none observed). The Solid HISTORY / P&L (section below) comes from events in the deep-history
derive — the cohort's txs are already in the private archive (SPEC-deep-history §0).

## What a member sees (page: member-portfolio, a "Solid" card beside Credia)

| Line | Source | Notes |
|---|---|---|
| Collateral LOCKED per token (amount, USD) | overseer `collaterals{borrower}` | only locked collateral backs the loan |
| Collateral deposited but NOT locked | custody `borrower{address}` (balance) − locked | shown as "in Solid, not backing anything — withdrawable" (the idle-LP lesson, again) |
| SOLID borrowed (debt) | market `borrower_info{borrower}.loan_amount` | SOLID priced from the catalog (≈ $0.99), labelled |
| Borrow limit | overseer `borrow_limit{borrower}` | in SOLID, computed by Solid from ITS oracle × max_ltv |
| **Health** = borrow_limit ÷ loan | the two contract answers | the protocol's own view — no oracle unit needed. < 1.0 = liquidatable. Bands: ≥ 1.5 safe · 1.2–1.5 watch · < 1.2 at risk |
| Liquidation price (single-collateral case) | price_now × loan ÷ borrow_limit | the price at which health hits 1.0. Multi-collateral: "a 1 − 1/health fall across the collateral". Price_now = the catalog price, LABELLED; never Solid's oracle until its unit is proven |
| Max LTV per collateral | overseer `whitelist` | ampLUNA/bLUNA/LunaX 0.5 · wETH/wBTC 0.75 · wSOL/wBNB 0.65 · USDC 0.95 |

Portfolio totals: net Solid = collateral USD − debt USD (like Credia's net). Deposited-not-locked counts as collateral held.
A wallet with no Solid position gets no card (not "$0").

## Capture (platform-crons)
- **member-data 1.5.0 `attachSolid`** — like `attachCredia`, but CHEAP: two paged censuses per run instead of per-wallet queries —
  overseer `all_collaterals{start_after,limit:30}` and market `borrower_infos{start_after,limit:30}` (+ custody `borrowers` for the
  deposited-not-locked part). Joined per wallet onto every captured portfolio → `portfolio.solid{collateral[], deposited_unlocked[],
  debt_solid, borrow_limit, health, source}`; `summary.solid_collateral_usd / solid_debt_usd / solid_health`. A failed read →
  `solid.error`, never 0. The same totals rule as custody: in `total_portfolio_value_usd` as net, flagged, never added twice.
- Names/decimals from the token catalog; the three Solid cw20 wrappers map to their IBC originals (config `SOLID.custodies[].wraps`) for
  price.
- Gate `mock-run-solid.js` on real answers: the probe fixture's single-page answers + a recorded census page (take one with the next run).

## History and P&L (the part "we need to try and record")
- **Events stream** `solid/events/<yyyy>/<mm>.json`: custody deposit_collateral / withdraw_collateral, overseer lock / unlock,
  market borrow_stable (borrow_amount, **mint_fee**) / repay_stable, and liquidations. Forward: the tla-flows walker already reads every
  block — add the SOLID contract set to its watch list. Backfill: a GitHub Action with ARCHIVE_RPC `tx_search` per contract (the
  locks-anchor pattern: resumable, chunked by month, commits per chunk).
- **P&L per wallet (both lenses, USD and LUNA)**:
  - SOLID borrowed vs repaid (the loan's own cash flow) and **mint fees paid** (Solid charges a fee on mint; no interest was seen — confirm);
  - collateral in / out valued at the event day (the same price series the rest of the portfolio uses);
  - **liquidations**: collateral lost × its price that day vs debt cleared — the realised loss. Vocabulary NOT yet known: no liquidation
    was in the probe window → first task: find one real liquidation tx (liquidation queue `execute_bid` / overseer `liquidate_collateral`)
    and record its events in queries.md;
  - what the borrowed SOLID was used for is out of scope (it leaves Solid).
- **Daily series** for the deep-history cohort (SPEC-deep-history): collateral, debt, health per day from the archive at height.

## Open items (resolve before numbers go on the page) — items 1, 2 and 4 RESOLVED 2026-09-28 (see Status)
1. **Oracle unit** (resolved): oracle v2 read wBTC 828.44 (`uusd` base) vs the catalog's WBTC.axl ≈ $60.5K. Health does not need it (borrow_limit is
   Solid's own number); any liquidation PRICE we print uses the catalog, labelled.
2. **Liquidation events** — see above.
3. **Interest**: none observed; mint_fee on borrow. Confirm from the market config / docs before calling the loan interest-free.
4. **Census** — the probe's discovery used its 40-minute budget, so no paged census ran. The reader pages them itself; first run logs counts.

## Verification (the owner's own txs are the fixture)
Owner test wallet at the probe: collaterals bLUNA 92 raw + ampLUNA 202,649 raw locked; loan 12,122 raw SOLID; borrow_limit 12,243 →
health 1.01 (test dust — the page must still say "at risk" for it, which is correct for those numbers).

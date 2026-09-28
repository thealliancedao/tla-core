# HANDOVER — Member Portfolio (Milestone A step 3), in progress · 2026-09-28

For the next chat. Read with PROJECT_KNOWLEDGE.md and CHANGES_PENDING.md (top: OPEN LEDGER 2026-09-28). The milestone is NOT closed:
the owner wants the page fully built out first, then one deep backfill (SPEC-deep-history), then the docs bulk.

## Where the page is (member-portfolio 3.8, lib/portfolio-pnl.js 1.5.0 — delivered 2026-09-28, commit owed/just made)
- **Wallet balances**: every cw20 read live (catalog + registry known_cw20s); tickers + real decimals (lib/denoms.js); dust < $2 folded;
  unpriced listed; **LP tokens sitting in the wallet** warned + valued (no TLA rewards); **illiquid** holdings (pyROAR: $4.7K on paper,
  pool $272, ≈ $132 fetchable) shown apart and kept out of the new **Liquid total**; amplified receipts noted as in TLA.
- **Other Cosmos chains**: derived siblings + manual links per wallet; **addresses found in the wallet's own IBC transfers** offered
  (never auto-linked). NOT verified against a live LCD from the session — owner to confirm it finds his osmo/cosmos addresses.
- **LP positions**: the live table + a separate cyan **"STAKED IN A DAO"** panel (ampCAPA in the ampCAPA DAO — feed at once, live read
  replaces it). One custody list feeds the panel, LP tile, banner, "what you hold", the P&L — never added twice.
- **P&L (build-pnl v3)**: story in USD + LUNA; positions by bucket with in / out / open / P&L incl. rewards / APR earned (blank when a trip
  is unpriced — never inflated) / LP since entry (take-rate top-up, amp compounding); all-LPs total; the ledger's open lots **reconciled with
  the hourly chain read**: custody → counted at the live value (P&L only on the part with a cost); moved → "⚠ not in this wallet · sent to
  <registry name> <address> on <day>" and out of Open now.
- **Votion**: the per-position story (USD in → now, LUNA price / LST staking / Votion compounding legs, real vs advertised APR) —
  votion/holder-pnl/current.json appears after org-votion 1.5.1's first run (the 20 h gate was missed by 0.6 s; now 19.5 h + build-on-first).
- **Vote allocations**: will-earn vs could-earn (lib/vote-market.js), simulate links.
- **NFTs**: aDAO + Pixel Lions against what was paid, floor marks, round trips.
- **Trends**: portfolio $ now includes DAO-staked receipts on every day (archive days before capture-engine 1.2 filled from the CAPA supply
  history × CAPA that day).

## Crons delivered this session (platform-crons)
capture-engine 1.2 (custody in every total; config CUSTODIANS + SOLID) · member-data 1.4.0 · ally-positions 1.5.3 (rebuild) ·
tla-flows pnl 1.2.4 / pnl-positions 1.3.0 (not_held, held_in, moves[] named) · org-votion 1.5.1 · credia in participants (1.3.0) ·
nft-flows classify 1.2.1 + derive 1.3.1 · locks-anchor. tla-core: known_contracts +24 (Solid, ampCAPA DAO), queries.md §19 Solid,
the solid-probe fixture, SPEC-portfolio-coverage Solid row.

## Gates (all on real data at delivery)
gate-portfolio-pnl 77/77 (76/76 on main's older build) · gate-ampcapa-whales 54/54 · mock-run-pnl-v3 25/25 · mock-run-custody 6/6 ·
votion mock-run 53/53 · mock-run-holder-pnl 7/7 · mock-run-trusted 18/19 (Skip-router drift — fails identically on main).
Pre-existing reds (not this work): ally-positions mock 4 fixture checks; tla-alerts calibration pool_apr_move 12.8/month > 12.

## Next (the owner's order)
1. **Solid section** — SPEC-portfolio-solid.md (collateral locked / deposited-not-locked, SOLID debt, health = borrow_limit ÷ loan,
   liquidation price, P&L from events incl. mint fees + liquidations). First find one real liquidation tx.
2. **Anything else the page needs** before the backfill (owner walks the page): TLA "price vs position" story, trends + leaderboard
   (named-only vs addresses — owner decision), rewards planner v1, xASTRO decimals, USDC.n bribe symbol.
3. **Deep history — moved UP (archive node may be lost)** — SPEC-deep-history.md (owner answers in §6): the eligibility product, then the
   RAW capture of every chain answer per cohort wallet per epoch (§8) while the node exists, then derive the series; leaderboards (§7);
   clickable weekly chart points (§9).
4. Small: page `CONFIG.trackStart` → the first archived file (2026-08-11) until 06-13 → 08-10 is recovered.
5. Docs bulk + new chat at the milestone close.

## Owner facts learned (2026-09-28)
- ampCAPA: deposit → amplify → stake the ampLP receipt in the ampCAPA DAO (3.36M receipts ≈ 7.68M CAPA ≈ $9.7K) — still his position.
- wBTC.osmo-wBTC.axl receipt (121,654 units) sent 2026-03-06 to **GMC BTC Backing Treasury** `terra1jd2tam4svukk7pg8fv0dkj7zgwes9yw5c2h3wm0gkjcwdth2mpfsxxw6zd`
  (confirmed by the owner from its DAO config: Galactic Mining Club sub-DAO, admin = GMC DAO (old), veto = GMC Council, 3-member multisig) —
  the owner sent it while trying to build an alliance with GMC. Registered in known_contracts; the moved row now reads "sent to GMC BTC
  Backing Treasury".
- **GMC watch (owner: "could be an important ally — track their backing in TLA and how it performs; they like BTC-BTC pools so they are
  not exposed to the take rate; make sure no backing sits in an inactive pool")** — as of 2026-09-28: 8 TLA locks (~$105, 3,753 VP);
  backing in TLA = **0.3971 wBTC.creda.a, amplified, single gauge — ACTIVE (≈ $33.1K)**; nothing in an inactive pool. It is a participant
  (lock holder), so the portfolio page already works for it: `member-portfolio.html?wallet=terra1jd2tam…6zd`. History: weekly deposits
  of wBTC-based receipts (#25 wBTC.osmo-wBTC.axl, #47 WBTC.axl-WBTC.osmo, #63 wBTC.creda.a) from `terra1tt48s9jppy83xlkrdkcwpw5a26643z8saqs7qj`
  2025-01 → 2026-04 (not one of the 3 multisig members; unlabelled); 12.9M #25 units went back to it 2026-03-17. The P&L build still shows
  $27K "open" in wBTC.osmo-wBTC.axl until pnl 1.2.3+ runs (the hourly read has no such position → not held).
  Queue: a GMC card (ally watch) — backing in TLA by pool, gauge status + take-rate exposure alert, performance over time; GMC as a
  tenant/ally later if the alliance happens.
- **Engine bug found through GMC (fixed, capture-engine 1.2.1):** single-asset cw20 gauges (wBTC.creda.a) were looked up only by LP address
  → "unknown, $0" for every holder (7 rows in the hourly read); and a single priced by symbol assumed 6 decimals (wBTC.creda.a has 8 —
  it would have read 100×). Now found by gauge id and priced decimals-free from the pool row. Gate member-data/mock-run-singles.js 5/5.
- **Price disagreement to settle:** the price feed has WBTC $82,923 and wBTC.creda.a ≈ $83.2K, the token catalog WBTC.axl $60,517 — two
  wBTC variants 37% apart. One of them is wrong; check before any BTC P&L is published.
- Owner-supplied DAOs added to known_contracts 2026-09-28: Galactic Mining Club DAO (current `terra1mn4vhsg6…jlxkv`, old
  `terra1yglrzqw4…rjm7`), GMC Council `terra1rgnew3fr…u559r`, Galactic Punks DAO `terra1wyng69gn…a8mat6`.
- Votion (owner): arbLUNA $973.93 → $753.13 (LUNA price −$629, staking +$123, Votion +$285; LUNA 6,754 → 14,751; real APR 56.1% vs 63.9%).

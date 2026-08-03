# Member Portfolio Changelog

This is the change history for `member-portfolio.html` (per-member portfolio tracker).
Newest revisions on top. Times are UTC.

---

## Rev 2.0 — 2026-08-03 (staged on test.html — the P1+P2 portfolio rebuild)

Full-page rebuild toward the awe-factor brief ("this is people's money"),
staged on `test.html` (free since the TLA Stats T3 promotion); promotes to
`member-portfolio.html` when approved. Gate: **85/85** fixture-derived
assertions (new page surface = new baseline suite in the session workspace).

- **Net-worth banner — the full splice, one number.** TLA (locks+LP+wallet)
  + Votion (per-holder feed) + aDAO NFTs at sales floors, with a clickable
  composition bar (segments scroll to their section), 1d/7d/30d change chips
  from the daily archive (TLA slice only — labeled, since Votion/NFTs have no
  archive yet), a 30-day sparkline, and the unpriced-assets honesty chip.
  Votion and the NFT scan resolve async and the banner updates in place.
- **"Your position over time" trend engine.** Sampled real days from the
  registered-member daily archive (since 2026-06-13): metric toggle
  (Portfolio $ / VP / LP / Locked), 14d/30d/all ranges, tracking-began marker
  on "all", dots are captured days, never interpolated. Per-wallet slim
  records cached in sessionStorage; ≤17 fetches per range.
- **Tiles v2.** Six tiles now cover the whole splice (VP · Locked · LP ·
  Votion · NFTs · Claimable), each with an async 7d delta vs the archive and
  a whole-tile drill into a full-history modal chart. Wallet folded into the
  banner composition (still itemized in Balances).
- **Claimable goes live-math (R2).** `total_pending_bribes_usd` is the
  proven-broken cron field — replaced by your VP share of each voted pool's
  live pot valued via the org token catalog (same replacement tla-stats made
  in T2.6). Feed value only as a labeled fallback. Tile, alert, and Income
  card all use it; live figure $61.12 vs the feed's $37.68 on the fixture
  wallet at gate time.
- **Income card (new).** Every income stream, measured: claimable now, LP
  yield claimed (pnl Phase B: 1,695.73 LUNA ≈ $585.39 at claim-day prices on
  the fixture), lifetime **bribe income** joined from the voting rollups
  ($3.6K / 105 paid claims on the fixture — first time surfaced per-member),
  income rate = measured ÷ months active, per-epoch accrual by pool, and the
  coverage-hole lower-bound statement.
- **LP table:** 30d per-pool value sparkline column (async from the archive).
- **Locks:** the decay picture made visual — per-lock live-VP bars against
  the dashed adjusted-potential outline (the gap IS the reclaimable), plus an
  unlock-cliff chip strip for non-auto-max locks.
- **Vote allocations:** each vote shows "earning ≈ $X/ep" — your live share
  of that pool's bribe pot, tooltip with share % and pot size.
- **Modal/drill system + tooltip pass** across every new surface; old
  bottom "Trends" honesty card folded into the chart's footer.

- **Votion layer re-pointed to the ORG feed** (`tla-core/votion/snapshots/`),
  retiring this page's read of the personal `votion-positions-data_2026`
  repo. The org feed is strictly better: hub-rate LST pricing per
  AUDIT-eris-apr-pricing (per-row price-source tag rendered), the corrected
  VP definition (fixed + boost — DP implied VP 159.5K vs the old feed's
  143.5K undercount), per-vault `holder_discovery_complete` honesty, and a
  **daily archive already running since 2026-07-16** — so the Votion card
  gains a 30d sparkline and the Votion tile a full-history drill, both from
  org dailies. Vault labels derived from the factory vdenom
  ({duration}/{vtoken}).

**P1.1 — same-day feedback round (Camron):**
- **TLA-wide VP rank**: identity now ranks across ALL lock holders from the
  org member-data snapshot (fixture wallet: #4 of 203 — the old "#1" was the
  registered subset only), with a tap-to-open **peer ladder** modal: top
  ranks + your ±4 neighbors, self-highlighted, registered names shown,
  Votion vault whales labeled.
- **ampCAPA governance position** re-attributed into LP Positions via a live
  chain read (same DAODAO voting-module + ve3 rate chain as tla-stats T3 /
  ampcapa-tool) — tagged "gov · live", excluded from summary tiles, renders
  only when the chain confirms a balance.
- **Native LUNA staking** row in Wallet Balances (live delegations read,
  validator count, valued via catalog).
- **Wallet balances v2**: live bank scan merged with the feed's cw20 set;
  same-token reads reconciled (never summed); zLUNA receipts + sub-$0.10
  dust collapsed into one line with a hover itemization; unpriced on-chain
  denoms counted, not guessed.
- **Income projection**: "if you reclaimed your +X VP" — the live pot math
  re-run at display VP + gap, with the added VP included in each pool's
  denominator (the share never pretends the pool stays the same size).
- **Income "Lifetime avg" relabel** (was "Income rate"): a wallet that
  farmed big through 2024 and holds $2 today still shows its true historical
  average — the label now says so explicitly ("reflects PAST position sizes,
  not today's"), with a recent-rate view queued behind the monthly-buckets
  derive. Sub-cent accrual rows filtered.
- **Trend paging**: 12w range added; ◀ earlier / later ▶ window paging —
  ready to walk into the epoch-ledger history when that derive lands.

Known limits, stated on-page: the TLA daily archive covers registered members
only (others get honest empty trends); NFT value carries no daily archive
yet; Votion history begins 2026-07-16 (org archive start — earlier days are
permanently missing); income figures are lower bounds until the archive-gap
backfill.

## Rev 1.3 — 2026-07-31

- **APR cell rebuilt as the Non-Amp / Amp pair** (e.g. "72% / ≈103%", the
  figure matching the position type highlighted): Amp APY = weekly
  auto-compounding of the base reward APR — reconciles to Eris's boosted
  display within ±5%, labeled an estimate in the hover with the derivation.
- **Next-epoch estimate line** ("next ep ≈65%/≈93%", green/red) when the pool's
  committed vote shift vs the last payout is material — chain votes only,
  gauge-total drift ignored, caveats in the hover. Inputs (distributions
  last-payout VP + pool-status current VP) joined into the page load.

## Rev 1.2 — 2026-07-23

- **LP reward APR v1 (SPEC-lp-apr):** the column showed dex-side APR only
  (≈5%) while TLA emissions — the dominant yield — were absent. Now shows the
  chain-distributions reward APR (emissions ÷ pool staked) with the dex-side
  component in the hover; interim "Dex APR†" label retired.
- **xASTRO valued:** positions the feed can't price get a render-time value
  from the org token catalog (balance × catalog USD), asterisked with source +
  capture time; deliberately excluded from summary tiles until the org
  positions migration prices it at the source.
- **Claimed-yield line** on Lifetime Cost & Activity (P&L Phase B): lifetime
  claims valued as LUNA at claim-day prices, with the unmeasured-claims
  residual stated. Footer reads its phase from the rollup.

## Rev 1.1 — 2026-07-21 and earlier

- Votion positions card live end-to-end (cron v1.1.0 discovery fix); LP
  positions, wallet balances, locks, NFT holdings; measured/unvalued badges
  per the honesty doctrine. (Pre-changelog era summarized.)

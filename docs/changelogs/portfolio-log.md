# Member Portfolio Changelog

This is the change history for `member-portfolio.html` (per-member portfolio tracker).
Newest revisions on top. Times are UTC.

---

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

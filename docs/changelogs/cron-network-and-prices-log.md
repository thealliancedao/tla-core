# cron: network-and-prices — changelog

> Log created 2026-08-21 (this cron family previously had no entry file in the
> single changelog home).

## 2026-08-21 — F1: outage carry-forward (AUDIT-price-artifact-2026-08 §4)
- New `applyCarryForward`: tokens whose `final_price_usd` would land null
  (CoinGecko/Astroport outage) now carry the prior run's final, flagged
  `stale:true` with `final_source: carried_forward(<orig>)` and a preserved
  `stale_since` across chained carries — capped at 7 days, then honest null
  (`expired` counted and logged). Closes the silent-null path that invited
  downstream Stage-3 phantoms (audit Class A: 14 outage days).
- Gate 12/12 (shared harness with tla-snapshot F1): outage simulation carried
  all 8 CG-sourced tokens from the real current.json; 9-day-old prior expired
  to null; non-null finals untouched; stale_since not clock-reset.

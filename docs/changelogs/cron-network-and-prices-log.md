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

## 2026-08-21 — F2-forward: FUEL + dATOM proper feed entries
- TOKEN_REGISTRY +FUEL (astroport-only; owner-sourced: Astroport DEX is the
  only venue pricing it, ~$22K TVL pool — thin but the only market) and
  +DATOM (cgId `drop-staked-atom`, owner-verified, plus phoenix-1 IBC denom).
  Denoms taken from our own astroport cron snapshot (IBC traces verbatim).
- WHALE intentionally ABSENT from the registry: abandoned per owner —
  its pools stay honest-null permanently.
- Gate 5/5 incl. real Astroport series-shape contract; null cgId safe in
  bulk-id builder (`filter(Boolean)` pre-existing).
- Observed live: CoinGecko 429-throttling on the Render IP is now routine —
  carry-forward had nothing to carry this run because prior finals for
  cg-only tokens were already null (pre-F1 outage). Expect stATOM/dATOM to
  populate as CG windows succeed, then carry across throttled runs.

# Agent Data Map — question → product → recipe
_Read by the TLA Help agent (corpus) and by humans. When a question type below
matches, follow the recipe — do not answer from general knowledge alone, and do
not say "no historical data" until the mapped product has been read._

## Per-pool history questions ("why did X's APR/TVL/votes change?")
Recipe (the xASTRO case, 2026-08-19, is the worked example):
1. `read_product` path `member-data/tla-snapshot/apr-history.json` with `key:"<pool>"`
   → that pool's `apr_pct_avg` per epoch (16 epochs).
2. Same with `member-data/tla-snapshot/pool-status-history.json` → `staked_usd`,
   `vp_human`, `bucket_pct` per epoch.
3. Decompose: APR ≈ rewards ÷ staked. If staked ROSE while APR fell, the drop is
   capital inflow (often healthy). If `vp_human`/`bucket_pct` fell, allocation
   declined. Say which — with the numbers.
   Worked example: xASTRO E192→E199: staked $7.3K→$16.5K (+125%), VP 0.76M→0.70M
   (−8%) → APR 82%→28% is mostly denominator growth, partly allocation drift.
4. Basis caveat: our `apr_pct_avg` is the platform basis; Eris UI uses another
   convention. Levels differ, trend shapes agree — say so when the asker quotes
   an Eris number.

## Wrong-object guard
Single-asset sinks (xASTRO, ampCAPA, ampROAR-ROAR) ≠ their trading pairs
(LUNA-ASTRO etc.). Pair TVL/fees say nothing about the sink. Match on the exact
pool `name` via `key`.

## TLA-wide per-epoch ("how has TVL / pool count moved?")
`member-data/tla-snapshot/epoch-band-history.json` — active_pools (Astro+SS),
tla_tvl_usd, luna_price_usd per epoch, E184→now. Semantics match the site band.

## NFT staked/held counts over time
`nfts/adao/snapshots/state-history/{yyyy}/{mm}.json` — daily
daodao_staked_count, enterprise_staked_count, treasury_held_count to 2025-01
(derived era is source-labeled `derived:transfers-replay`; every count traces to
transactions).

## Rewards / distributions per epoch
`tla-voting/distributions/history.json` (NOT under events/) — gauge payouts per
period, entries to period 96.

## Prices
Live: `network-and-prices/daily/<date>.json` (15-day retention;
`luna_market.usd_price`). Deeper daily LUNA: tla-snapshot dailies
`totals.rewards.luna_price_used` since 2026-05-13. Token spot incl. SOLID:
`token-catalog/snapshots/current.json` (tokens keyed by denom; venue prices
carry `.usd`).

## Votion
`votion/snapshots/current.json` + `votion/history/`. Rankings only with shown
arithmetic (rule 11) — vault sizes vs aDAO's VP are different magnitudes;
compute, never assume.

## When the map has no route
Say plainly what was checked and what does not exist yet (e.g. per-pool APR
before E184, member-count history). Never substitute an adjacent object.

## Pricing-artifact cautions (F3, AUDIT-price-artifact-2026-08)
- If an LST-pair implied price ratio reads ≈1.0 (e.g. bLUNA ≈ LUNA) or a
  token's price sits far off its neighboring days, SUSPECT A PRICING
  ARTIFACT: say so plainly and point to the audit — do not narrate the
  broken number as fact.
- `price_source` values beginning `f2_repair:` mark corrected historical
  entries; the original value and evidence live in that file's
  `_price_corrections` block. Quote the corrected value; cite the block if
  asked what changed.
- Repetition is NOT a taint signal: legitimate prices repeat (stLUNA to 9
  decimals; EURE served flat at 1.14; ATOM revisits cents). Taint is
  identified by SOURCE MECHANICS (pool-derivation from non-xyk pools) and
  value-band violations only.
- FUEL/dATOM/WHALE history before 2026-08-21 is chronically mispriced
  (Class D, repair pending F2b); WHALE stays null permanently (abandoned).

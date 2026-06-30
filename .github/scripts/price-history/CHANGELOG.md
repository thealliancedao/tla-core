# price-backfill — changelog

## 1.0.0 — 2026-06-29 — historical price + ratio foundation

- GitHub Action (workflow_dispatch) with a token-picker dropdown; one token per run.
- Majors: CoinGecko daily price direct. LSTs (ampLUNA/arbLUNA/bLUNA/ampCAPA):
  price = base × ratio, avoiding CoinGecko's dead-zone straight-line fakes.
- Ratio tiers: chain_exact (archived 2026-05-13+ / live forward) vs interpolated
  (smooth monotonic between real anchors across dead zones). Each day labeled.
  Honest: pre-archive ratios are estimates, bounded by real anchors, far better
  than CoinGecko's fake line, but flagged as interpolated.
- Month-file output (price-history/YYYY/MM.json + ratios/), idempotent merge-safe
  (per-token merge — backfilling one token never clobbers another for that day).
- cgIds harvested from the proven contract-token-catalog (no manual gathering).
- Validated: ratio interpolation produces smooth bounded curve through dead zone;
  month-grouping correct.

Known limitations / TODO:
- Dead-zone auto-detection on CoinGecko's own LST price isn't done; we anchor on
  the exact archive + earliest cg-derived point and interpolate between. A future
  refinement could detect flat-line segments and exclude them as anchors.
- FUEL: no CoinGecko id; seed from old fuel OHLC data (separate, not yet wired).
- Daily values are CoinGecko daily points (one/day for multi-year ranges); true
  intraday multi-point averaging only where finer data is available.

# price-backfill — changelog

## reanchor-ratios 1.0.0 — 2026-09-27 — one-time: LST ratios onto the chain reads

- `reanchor-ratios.mjs` + workflow `ratio-reanchor.yml` (dispatch, dry_run default ON). Re-anchors every `interpolated` ratio
  row and the LST USD rows priced on them from dex-data/state-history's chain reads (E97 → latest), fills the ratio days frozen
  since 2026-07-16, adds arbLUNA / ampCAPA / ampROAR days inside the anchored span. The rule is platform-crons
  `dex-data/lib/ratio-anchor.js` (checked out at run time — the forward writer uses the same file).
- Dry run on the 2026-09-27 checkout: ampLUNA 618 repaired (mean +7.5 %, max +10.6 % on 2024-11-10) + 537 pre-E97
  re-interpolated; bLUNA 618 (+3.8 %, max +5.5 %) + 173; arbLUNA 218 (−0.8 %); USD rows repaired 2,164 / added 1,304;
  43 ratio + 41 price month files; a second run changes 0. Refuses to write if the chain disagrees with chain_exact by > 0.5 %.


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

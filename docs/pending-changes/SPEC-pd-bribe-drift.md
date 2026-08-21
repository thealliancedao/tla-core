# SPEC — PD Bribe Drift ("placed then vs. now")

**Status:** DRAFT for owner review · opened 2026-08-21 (owner request)
**Thesis (owner's framing):** Phoenix Directive places bribes in large batches
spanning several epochs, selected on volume/liquidity ("trade efficiency") *at
placement time*. Because PD is the largest single briber (our record: 21
placements, 469,175.27 LUNA all-time), its placements steer Votion's
re-optimization and therefore a large share of vote weight — centralized VP
influence in effect, whatever the intent. By the tail of a multi-epoch bribe
window, the pool that earned the bribe may look nothing like it did at
placement. This page makes that drift visible and measurable.

## What the page shows

Per PD placement (one card/row each):
1. **Placement snapshot** — epoch placed, pools bribed, per-pool amount &
   denom, window (start→end period), per-period taper (`per_period` from
   runway/bribe-state — linear bribes shrink before their end date).
2. **"Why then" panel** — the pool's trade-efficiency picture AT the placement
   epoch: volume, depth, staked_usd, utilization (vol/depth), exit-slippage
   grade component, and (for placements ≥ E199) the composed LP grade from
   `lp-grades/epochs/<E>.json`.
3. **"What now" panel** — same metrics at the current epoch, side by side,
   with deltas. Headline: **drift score** = signed % change in utilization and
   depth since placement (the two inputs PD's own stated criteria weigh).
4. **Consequence strip** — VP the pool drew per epoch across the window
   (pool-status vp_human series) and gauge payouts received
   (distributions/history) — did the bribe keep buying what it bought at
   placement?
5. **Concentration lens (page-level)** — PD's share of total active bribe
   value per epoch vs all other bribers (briber-board data), stated as
   measured shares with shown arithmetic (rule 11 discipline; "centralized"
   is the reader's conclusion to draw, the page shows the numbers).

## Data feasibility (all from existing products — no new capture)

| Need | Source | Coverage |
|---|---|---|
| PD placements, legs, amounts | pd-bribes stream (cron v1.2.0, 20/20 matched) | all 21 placements; per-pool attribution pending capture-registry phase 2 for Feb-25→Jun-26 gaps |
| Window & taper | tla-voting/bribe-state (runway probe, per_period) | current + probed forward |
| Volume/depth per epoch | dex-data daily CSVs → epoch aggregation | 2026-05-12 (≈E184) forward |
| staked_usd, vp_human per epoch | tla-snapshot matrices | E184+ (⚠ price-artifact epochs excluded until AUDIT-price-artifact F2 repair lands — drift math must not run on tainted USD rows) |
| Composed grade at placement | lp-grades/epochs/<E>.json | **E199 forward only** (archive just began). E184–E198: component-level drift (vol/depth/staked) with an honest "grade not archived then" note. Pre-E184: hole era — placement snapshot marked unavailable, never reconstructed |
| Gauge payouts | tla-voting/distributions/history.json | to period 96+ |

## Honesty rules specific to this page
- Placement-time numbers are *the record as captured then*, never back-modeled.
- Where the placement predates a series, the panel says so — a blank beats a
  reconstruction.
- Drift is descriptive, not evaluative: the page never says PD "should"
  rebalance; it shows what changed since their stated criteria were measured.
- PD attribution stays factual per the identity rules (registry-first,
  pattern ≠ identity).

## Dependencies / order
1. AUDIT-price-artifact **F2 repair** (clean USD rows) — blocks drift math.
2. FOUNDATIONS: founding doc SOURCED (2026-08-21, owner-found link) — mandate,
   funding, and the 20% charter cap are now quotable. Still open: the
   placement-criteria post (volume/liquidity basis) — "Why then" panel labels
   criteria "stated, source pending" until found.
3. lp-grades epoch archive accumulating (started E199) — grade-vs-grade drift
   ripens automatically each week.
4. Then build: aggregation script → page (drift cards + concentration lens),
   gated on the E200 placement batch if one lands, else on prop-250's window.

## Open questions for owner
- Page home: standalone `pd-directive.html` (SPEC-pd-directive-watch exists —
  merge into it?) or a tab on tla-stats?
- Drift score definition: utilization+depth only (PD's stated criteria), or
  include grade delta where available?
- Show PD wallet labels per the existing attribution registry only, or also
  the "current bribes" funder labels from runway?

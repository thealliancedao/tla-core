# SPEC — retained-gap-fill (time-sensitive one-shot: public-node retained window)

**Status:** BUILT + mock-verified 2026-07-09 (all checks passed on real FCD
txs remapped into the target window).
**Script:** `.github/scripts/tla-flows/retained-gap-fill.js` · **Workflow:**
`tla-flows-gap-fill.yml` (manual dispatch + 4-hour schedule until done).

## Why time-sensitive
Public nodes retain ~17 days of blocks; the floor advances ~14.4k blocks/day.
Probed 2026-07-09: publicnode floor 21,578,506 (~Jun-21); the walker started
at 21,729,806 (Jul-2). The ~151k-block span between them is recoverable ONLY
until the floor overtakes it. The harvest consumes ~180k blocks/day vs the
floor's 14.4k/day — it outruns the pruning 12× once started, so START IT ON
COMMIT.

## Mechanics
Walker primitives (block + block_results, SHA-256 txhash, watched-contract
gate) + BYTE-IDENTICAL `<<FLOWS CLASSIFIER v1>>` (diff-verified; inlined
WATCH addresses verified against `platform-crons/config/contracts.js`).
First run binary-searches the CURRENT floor and pins `target_from` there
(state: `tla-flows/events/gapfill-state.json`). Each run walks up to
`GAPFILL_BLOCK_BUDGET` (30,000) blocks oldest-first, merges months under the
walker's rules (txhash dedupe · never-shrink · 409-retry), merges index
totals, advances its cursor. If the floor overtakes un-walked blocks
mid-harvest, the pruned sub-span is recorded honestly and skipped. On
completion it CLOSES the `fcd-freeze-to-forward-capture` gap's right edge to
the achieved floor, marks state `done`, and all later scheduled runs exit in
seconds (delete the schedule at leisure). Overlap with the walker's first
window is dedupe-absorbed. Re-runnable, resumable, no PAT (Actions token).

## Verified (mock, real data)
Exact-floor calibration · multi-run budget resume to completion · captured ==
direct classification · index merge exact · gap edge closed to floor−1 ·
post-done no-op.

## Expected production shape
~151k blocks ÷ 30k/run ≈ 5–6 runs ≈ ~24h on the 4h schedule (each run ~2–3h,
within Actions' 6h limit). Result: tla-flows continuous from ~Jun-21 → future;
remaining gap = Jan-2025 → ~Jun-21 2026, archive-node territory (Batch 5).

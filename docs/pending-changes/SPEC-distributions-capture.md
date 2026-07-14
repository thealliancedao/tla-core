# SPEC — Gauge distributions: history harvest + forward capture

Status: **✅ BUILT & SHIPPED 2026-07-14** · Owner: tla-voting module
Harvest committed: **floor certificate period 96** (period 95 = empty
pre-genesis state), **98 periods (96→193), zero gaps, zero invariant
violations** at `tla-core/tla-voting/distributions/history.json`. Forward
capture live in `org-tla-voting` 1.1.0 (shared `<<DISTRIBUTIONS CORE v1>>`
block, byte-identical with the harvester — diff-verify after any change).
First live forward test = the Sunday 2026-07-19 epoch flip appending period 194.
Home: `tla-core/docs/pending-changes/` (moved 2026-07-14 per SPEC-docs-consolidation).
Discovery: probe session 2026-07-13 — **the gauge controller retains full
per-period distribution history in queryable contract state.**

## 1. What this is

`distributions{time:{period:P}}` on the asset gauge
(`terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj`) returns,
for ALL four gauges in one call: `total_gauge_vp` + per-pool
`{asset, distribution (fraction), total_vp}` — the **finalized payout split**
for period P. Probes confirmed period 190 AND **period 120 (~Feb 2025, deep
inside the events dead zone)** answer instantly from a normal public LCD.

This is the payout ledger, the de-facto whitelist (pools absent from
distributions earn nothing regardless of votes — "wasted VP"), and the
canonical historical per-pool VP/pct record. **No block scanning. No archive
node. ~1 query per period.**

Epoch mechanics (locked in, cite in code): votes during epoch N tally live in
`gauge_infos(time:"next")`; at the flip they freeze into
`distributions(period N)`; rewards for N pay during N+1. Canonical epoch
numbering: contract `period` == the UI epoch number (1-indexed, matches
`epoch_1-300_date.json`).

## 2. One-shot harvest (fcd-harvest style, re-runnable)

- Walk `{"distributions":{"time":{"period":P}}}` from current period downward
  until the contract errors or returns empty — **findFloor discovers genesis,
  never assume it** (expected ≈ 96–97 given the 2024-08-27 launch, but the
  script proves it).
- Store verbatim per period; retry-with-backoff across both LCDs
  (publicnode + polkachu); NO silent coercions — a failed period is recorded
  in `known_gaps`, never written empty.
- Deterministic, idempotent: re-run produces byte-identical output (past
  periods are immutable contract state).

## 3. Storage (✅ DECIDED single-file 2026-07-14 — Deviation Register row updated)

```
tla-voting/distributions/history.json   ← array, one entry per period × gauge,
                                          verbatim contract shape + capturedAt
tla-voting/distributions/index.json     ← period range, count, known_gaps,
                                          floor-certificate (first valid period)
tla-voting/distributions/heartbeat.json
```
Single-file rationale: ~100 periods × 4 gauges ≈ small (<2 MB for years);
weekly cadence; not tx events — this is period-keyed contract state
(DERIVE-of-state), so monthly event partitions don't apply. **Decision:
single-file accepted (Camron, 2026-07-14) and registered in
TLA-CORE-STORAGE-DESIGN §7.** The harvester's monthly-conformance flag remains
in the code, unused.

## 4. Forward capture

`org-tla-voting` (already 6-hourly) gains a distributions step: after each
epoch boundary, query the just-finalized period, append if absent, update
heartbeat. Self-healing: on every run, verify `last_captured_period ==
current_period - 1`; if behind, backfill the miss (state is retained — lateness
is free). Uses the shared authenticated-API state-read transport (never raw
CDN), and inherits the 40s hard-deadline httpGet (note: the deadline-fix port
to org-tla-voting is queued — land it in the same patch).

## 5. Consumers unblocked

- `pool-status-history` / `vp-attribution` historical rebuild: exact per-pool
  pct + VP per epoch from genesis (replaces the skewed boost-only history).
- Whitelist truth: pools voted-but-undistributed → `wasted VP` metric
  (~3M VP sits there today in bluechip alone).
- tla-stats: per-pool distribution share timeline; epoch shift simulator's
  historical baseline; bribe-$/VP denominators per epoch.
- Cross-validation invariant for the events streams: Σ(vote-events + lock
  state) recomputed per epoch ≟ distributions — the reconciliation section
  org-tla-voting already has queued gets its ground truth for free.

## 6. Acceptance

- Floor certificate written (deepest valid period + first error text).
- Period 193 harvest output == the probe JSON captured 2026-07-13 (committed
  as fixture).
- Spot-check 3 historical periods against pool-status-history epochs: dist
  fraction vs recorded pct — differences must equal the known boost-only skew.
- Fractions per gauge sum to 1.0 ± 1e-9 for every period (hard invariant;
  violation = do-not-publish).

# Changelog — lp-grades cron

## lp-grades-2.0.0 — 2026-08-25 — five-lens v2 grade per pool (v2.js), alongside v1

Per pool `v2`: lenses {purpose (declared, D1 table), work, efficiency,
durability, governance} with parts, composite, letter (A≥75 B≥60 C≥45 D≥30),
confidence (firm/provisional/thin by missing parts), streak (epochs at ≥C,
v1-backfilled where the archive has no v2), pair_class, why, raw inputs.
Measured parts are percentiles among active pools; null-vs-0. Reads
votion/optimization (Votion VP per pool + Votion's rate), bribe-state runway
(pots for the voted period), pd-bribes/fit (PD share of pot), pool-status
history (price-neutral retention). Names fall back token-catalog → register →
id (the Credia wBTC gauge). Gate mock-run-v2.js 8/8. First live run: 32
graded, A3 B10 C12 D6 F1, Votion rate $18/1M VP.


## 2026-08-19 — 1.0.0 built + gated (design session)
- **SPEC-lp-grading.md written** — unifies the two grading generations (legacy
  tla-registry confusion_score = Component B; interim tla-stats page grade =
  Components A+C) into the Layer-3 routing oracle per MISSION.md. Legacy
  confusion-score model preserved verbatim in spec §10 → cron-scripts safe to
  delete. C is an OVERLAY on the A×B quality grade (D2), bucket-aware.
- **grading_config.json** created (docs/curated) — the entire rubric in one
  versioned file: weights, curves, thresholds, grade boundaries, caps,
  confidence gates, states, 10 lenses incl. default "Best for the chain" and
  the depositor "Healthy to enter". Cron reads it at run start, HALTS on
  invalid/non-normalized weights, echoes version+sha into every output.
- **lp-grades 1.0.0** (platform-crons/lp-grades) built as a composer-not-fetcher
  over org products only. Gated end-to-end on real production data (75 pools):
  grades, states, overlay, medians all verified by reading the output.
- **Gate-taught rule banked:** null-by-DESIGN renormalizes (SS volume, singles)
  but null-by-MISSING-DATA does not grade — the first gate run showed inactive
  pools outranking measured actives on B-only "quality"; fixed same-session.
- Verified in gate: confidence tiers honest against the real epoch-198 capture
  gap (flagship pools correctly provisional at 0.528 sample ratio); inactive
  ampLUNA-LUNA correctly carries a firm D from its own pre-deactivation window
  data; write-once epoch archive untouched on re-run; config sum-check halt
  fires on a corrupted config.
- **SkeletonSwap ruling measured + recorded:** liquidity LIVE (chain reserves,
  daily, fingerprint-fresh), volume absent-by-honesty (no trustworthy source
  anywhere). SS pools grade on everything except utilization. Owner outreach
  queued: ask SS to expose per-pool volume in the API their own UI reads.

## 2026-08-19 — 1.0.1 — rubric echo carries the advisor block
- Config 0.2.0: new `advisor` block — vote allocator parameters (chunk_bps 1000
  per the TLA 10%-chunk law, min_quality 40, max_per_pool_bps 5000
  diversification cap) and bribe-planner parameters (presets, $25 unit,
  min-effective-pot merge, max 4 splits). The cron echoes `rubric.advisor`
  into the product so the page's advisor is driven entirely by the public
  config.
- No compute changes; grades identical to 1.0.0 for the same inputs.

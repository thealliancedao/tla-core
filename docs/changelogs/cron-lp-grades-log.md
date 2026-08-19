# Changelog — lp-grades cron

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

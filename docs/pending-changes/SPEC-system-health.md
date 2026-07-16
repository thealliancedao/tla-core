# SPEC-system-health — invariant monitors (defect register #10)

**Status:** specified 2026-07-15, pending approval.
**Owner:** NEW cron `platform-crons/system-health/` (own domain, own folder —
the org convention). **Layer 3, chain-free:** reads ONLY committed tla-core
files via the raw API; a bug here costs a recompute, never touches capture.
**Writes:** `tla-core/system-health/current.json` + `history/{YYYY}/{MM}.json`
(monthly appends, storage doctrine) + `heartbeat.json`.

## Why
Every defect in the July-14 register was found by MANUAL cross-checking. The
monitors make those cross-checks permanent: each invariant is a check the
platform runs against itself every cycle, with violations DECLARED in a
committed file the Trust & Data tab can render. Honest data needs an immune
system, not an audit calendar.

## Locked defaults

- **D1 — inputs (all committed, no chain):** member-data daily snapshot,
  token-catalog current.json, dex-data per-DEX current.json + index.json,
  tla-voting heartbeat + distributions/history.json + bribe-state index,
  every product's heartbeat.json.
- **D2 — the invariant set (v1):**
  1. `bucket_vp_consistency` — member-data vp_voting_per_bucket vs
     token-catalog per-pool total_vp sums per bucket (like-for-like: same
     epoch stamp only; skip + declare when stamps differ).
  2. `staked_le_depth` — per pool where both sides exist: staked value <=
     pool depth (the impossible-LUNA-SOLID case). Sources: token-catalog
     staked side vs dex-data tvl/reserves side, joined on pair.
  3. `distribution_fractions_sum` — gauge distribution_pct over active pools
     sums to 1.0 +/- 0.001 per bucket (token-catalog).
  4. `tribute_stream_coverage` — surface tla-voting's bribe_capture
     mean/per-denom coverage (consume, don't recompute) + alarm ONLY on a
     DROP for direct-bribe denominators.
  5. `bucket_label_agreement` — dex-data bucket vs token-catalog bucket per
     joined pair (the check that found tonight's 3 mislabels, now permanent).
  6. `heartbeat_freshness` — every org product's heartbeat age vs its
     declared cadence; stale = violation.
  7. `identity_resolution` — count of unresolved pools/tokens in
     token-catalog (the 3 singles today) — a shrinking number, tracked.
- **D3 — verdict shape:** per invariant `{status: ok|violation|skipped,
  detail, measured, expected, as_of}`; top-level `status` = worst member;
  violations carry enough detail to file straight into CHANGES_PENDING.
- **D4 — no repair, ever:** monitors REPORT. They never write to any other
  product, never suppress, never round a violation away.
- **D5 — cadence:** hourly Render (`org-system-health`), cheap (~15 raw
  reads, zero chain queries).
- **D6 — mock gate (binding):** crafted-fixture violations for every
  invariant + the all-ok pass + like-for-like skip + missing-input honesty
  (absent product = skipped + declared, never a crash).

## Addendum (2026-07-15 audit, pre-approval)
- INV-1 like-for-like = same DAY, not just same epoch (member-data vs
  catalog ran 21.6h apart within epoch 194; intra-week VP drift confounds).
- INV-6 freshness uses product-appropriate signals: price-history = latest
  day key in the current month file (its heartbeat belongs to the one-off
  backfill); one-off products (nfts provenance) carry a kind marker and are
  exempt; skip-runs that don't stamp (distributions) get cadence-aware
  expectations via a per-product cadence + timestamp-field map.
- INV-5 is already proven live: dex-data 1.1.0's resolver caught the
  token-catalog SS LUNA-SOLID stale-bucket entry the same night it shipped.

## Non-goals (v1)
No paging/alerting integration (the committed file IS the alert surface).
No chain queries. No auto-filing of CHANGES_PENDING rows.

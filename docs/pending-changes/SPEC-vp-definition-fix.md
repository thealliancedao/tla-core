# SPEC — VP definition fix (fixed_amount + voting_power)

Status: **✅ SHIPPED 2026-07-14 — live-verified** · Owner: capture layer
Live proof: member-data 1.1.0 Render run — canonical Total TLA VP
27,973,049.25 = TLA UI, 4/4 outputs published, status ok.
Home: `tla-core/docs/pending-changes/` (moved 2026-07-14 per SPEC-docs-consolidation).
Evidence session: 2026-07-13 (TLA UI paste + 4 chain probes, all reconciled)

## 1. The defect

Every VP figure the platform publishes is the **boost component only**
(`voting_power` = underlying_at_lock × coefficient). The vAMP escrow's actual
voting power is **`vp = fixed_amount + voting_power`** (fixed = underlying × 1),
and **the money follows `vp`**: the gauge controller's `distributions` query —
the record rewards are actually paid against — carries fixed+boost totals.

Consequences today: all absolute VP ~11% low (exact factor per lock =
`(coeff+1)/coeff`, so max-locks +11.1%, 1-week locks +100%); bucket
percentages skewed wherever lock mixes differ (LUNA-stLUNA was 26% off);
canonical "Total TLA VP ≈ 24M (max bucket)" is wrong — canonical total is
`total_vamp.vp` (~27.96M, matches TLA UI header).

## 2. Evidence (chain-confirmed 2026-07-13, keep with the code)

- `voting_escrow terra1uqhj…l62zg` → `{total_vamp:{}}` returns
  `{fixed: 3007423707566, voting_power: 24956216696464, vp: 27963640404030}`
  — vp = fixed + voting_power **by the contract's own definition**, = UI 27.96M.
- `asset_gauge terra1hfks…msd3lj` → `gauge_infos{gauge,time:"next"}` returns
  **per-pool `voting_power`, `fixed_amount`, `slope`** — we have been receiving
  fixed_amount in every response and discarding it.
- `distributions{}` per-pool `total_vp` ≈ gauge_infos boost+fixed (residual =
  votes between period flip and query — verified against our own vote-events).
- Predictive test, 9/9 project pools vs same-time UI paste, including the
  discriminating case: **LUNA-stLUNA boost+fixed = 315.17K = UI to 5 sig figs**
  (boost-only was 249.4K; a ×10/9 scalar would also fail this pool).
- User level: `user_info` voting_power 1,179,504.21 + fixed 131,056.04
  = 1,310,560.25 = UI "1.31M VP".
- ❌ The comment in `lib/capture-engine.js` (~line 1038) claiming
  "voting_power … is the actual VP that determines vote weights" is **FALSE**
  — rewrite it citing this spec. `display_voting_power_human` (fixed×10) is
  only coincidentally correct for coeff-9 locks — **retire the field**.

## 3. Changes — ORG ONLY (scope amended 2026-07-13, Camron's call)

Personal repos (`cron-scripts` tla-snapshot / tla-locks / capture-engine) are
**NOT patched** — they are retiring and "the old one doesn't matter." The org
is the single home of the fix; any future org component touching VP is born
on this definition. Consequence accepted: the live site (which still reads
personal tla-snapshot) shows boost-only VP until the org replacement lands —
the tla-snapshot REPLACE-CHECK rises in priority accordingly.

**Patched (platform-crons, shipped as vp-definition-fix 2026-07-14):**
- `lib/capture-engine.js` — portfolio.voting total = boost+fixed with explicit
  components; per-lock `fixed_amount_human` + `vp_total_human`; projection
  moves to total basis (adjusted = underlying_now × (coeff+1)); false comment
  rewritten; `display_voting_power_human` RETIRED; summary exposes
  `vp_boost_human`.
- `member-data/lib/vp.js` — held VP = boost+fixed; doctrine header corrected;
  `canonical_total_vp` renamed `max_bucket_vp` (reference only).
- `member-data/index.js` (v1.1.0) — queries escrow `total_vamp`; publishes
  `system.total_tla_vp {fixed, voting_power, vp, vp_human}` as CANONICAL;
  `max_bucket_vp_reference` kept as sanity check; per-lock census entries +
  the held-vs-locks cross-check move to total basis.
- `member-data/README.md` — schema line updated.

**Mock evidence (2026-07-14, 11/11 assertions):** real fixtures (probe P3/P4
user_info + total_vamp verbatim); Part A ran fetchMemberPortfolio +
computeMemberSummary (total = 1,310,560.252656 exact; projection =
underlying×10 exact; display field absent); Part B ran the FULL member-data
main loop under a stubbed chain lib — 4/4 outputs published, canonical total
27,963,640.404, cross-check total-basis exact.

## 4. Acceptance test (run at deploy)

Timestamp-matched pair: `gauge_infos{gauge:"bluechip",time:"next"}` vs TLA UI
bluechip tab screenshot (≤2 min apart). Pass = every listed pool's
vp_total matches UI display rounding; ghost pools (wstETH-SS, wBTC.osmo-*)
present in gauge_infos but absent from distributions are labeled
`unlisted_no_distribution`, not mixed into listed-pool pct math.
Second check after next epoch flip: distribution fractions × bucket rewards ≈
actual reward deltas per pool.

## 5. Doctrine updates riding this fix

- PROJECT_KNOWLEDGE "Total TLA VP = max bucket ≈ 24M": replace with
  `total_vamp.vp` (fixed+boost, ~28M). Bucket tallies remain per-gauge facts.
- Bucket-tally-vs-total comparisons are only valid **like-for-like by period**
  (a period-N freeze may legally exceed the current total_vamp).
- New metric available free: per-pool + system `slope` (VP decay forecasting)
  and `voting power factor` (vp/fixed) — capture, expose later.

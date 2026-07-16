# cron-votion — changelog

Owner: `platform-crons/votion/` (Render job `org-votion`, hourly at :20).
Writes `tla-core/votion/`. Spec: SPEC-votion-capture.md (G2 from
UI-DATA-READINESS — the data-loss-clock gap).

# Rev 1 — 2026-07-16 — 1.0.0 BUILT: vaults hourly + positions daily — mock-gated 28/28, DEPLOY PENDING PROBE VALIDATION

**What:** Branches A + B of SPEC-votion-capture (Branch C optimizer = v1.1;
old `votion` cron keeps covering NEXT on Sundays until then).

**Branch A (hourly):** vault discovery via code_id 3677 (seed fallback,
declared in meta.discovery_source), `{state:{}}` staked + vdenom supply →
exchange rate, escrow lock_info → **VP = fixed_amount + voting_power**
(correcting the old cron's boost-only read — the platform-wide undercount
class), gauge `user_info` per vault → **per-pool Votion NOW rollup from
chain** (votion_vp_now_per_pool in vaults.json — replaces the API-derived
number). History: one point per run to `votion/history/{YYYY}/{MM}.json`
(monthly arrays, never-shrink) — the realized-compounding-APY series.

**Branch B (daily, ≥20h trigger):** incremental holder discovery
(`holders-registry.json`: grow-only sets + per-vault tx totals; cursor
advances ONLY on complete walks; publicnode tx_search DESC paging, null ≠
empty), per-holder by_denom balance × rate → underlying LST, USD via
token-catalog price priority (tla → coingecko → astroport → skeletonswap)
with per-row `underlying_usd_price_source` (arbLUNA transparency lesson),
implied VP = share × vault VP. Writes current.json + **snapshots/daily/**
(the archive). Balance-read failure ≠ zero: recorded, holder retained, run
partial. No names (address-catalog joins downstream).

**Gate 28/28:** full-run happy path (VP composition, rate, NOW rollup math,
price tagging incl. coingecko fallback, exited-holder drop-but-retain),
hourly skip of fresh positions, incremental delta walk (1 page/vault
verified by request counting), paging failure → partial + cursor frozen +
sibling vault intact, listing failure → seed fallback declared / zero
vaults → error, missing price → USD honestly null, balance failure ≠ zero.

**Probe validation (2026-07-16, results in):** the gauge user_info probe
caught exactly what it was for — the REAL shape is
`gauge_votes:[{gauge,period,votes:[[pool_id,bps]]}]`, which NONE of the
three tolerated variants matched (the NOW rollup would have been silently
empty). Parser rewritten to the probe-verified shape (bucket carried per
vote); fixtures replaced with real shapes (string lock_id, real vdenom
paths, real user_info payload). Two probe bonuses adopted: user_info's own
fixed_amount+voting_power as a tagged VP fallback when escrow lock_info
fails, and vault labels derived from the vdenom path ('max/vampluna').
Re-gated 30/30.

**Deploy:** Render cron `org-votion`, hourly `20 * * * *`, env GITHUB_TOKEN
(rw tla-core). DEPLOY-READY. First live run creates votion/; parallel-run vs
old votion-positions current.json before retiring the old cron + its data
repo. Expected first-run sanity: 6 vaults; ampLUNA-MAX ≈ 53.5K ampLUNA
staked, VP ≈ 1.172M (fixed 117K + boost 1.055M), NOW rollup spread over ~7
pools across 4 buckets (per the probe's live votes).

**system-health 1.0.1 (same commit):** FRESHNESS_MAP gains dex-credia (6h),
votion-vaults (6h via vaults_at), votion-positions (30h via positions_at) —
closing the queued credia follow-up. Gate 33/33.

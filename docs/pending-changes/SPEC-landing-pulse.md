# SPEC — Landing Pulse (index.html recent-changes tile + 30-point chart)

Status: DRAFT for approval · Author: Claude + Camron · 2026-08-04
Owner page: `defipatriot/aDAO-links-site/index.html` · Changelog: `docs/changelogs/index-log.md`
Doctrine anchors: mixed-granularity honesty rule · dashboard tiles = LIVE feeds
where live exists, cron products for history · rev-footer law (Camron
2026-08-03) applies to index.html from this delivery forward.

## Purpose

The landing page answers "what happened lately?" at a glance: a
recent-changes tile (windowed deltas) plus a 30-point chart with
back-paging. This is the community-facing pulse for the announcement — it
must be impressive AND honest about what we measure daily vs per-epoch.

## Feed availability (VERIFIED against tla-core, 2026-08-04)

| metric | native granularity | source (all committed products) |
|---|---|---|
| TLA TVL | **daily** (since 2026-06-24, unbroken incl. 08-04) | `dex-data/{astroport,skeletonswap}/snapshots/daily/*.json` — sum TLA-relevant pools |
| Votion TVL + VP | **daily** (since ~2026-07-15) | `votion/snapshots/daily/*.json` (totals + vaults) |
| Renewed/locked VP | **daily** | `member-data/snapshots/daily/*.json` diffs (locks), cross-checkable vs flows events |
| Prices context | **daily** (starts 2026-08-04 EOD) | `network-and-prices/daily/*.json` (org home) |
| Rewards distributed | **epoch** | `tla-voting/distributions/history.json` |
| Total TLA VP | **epoch** (max-bucket canonical) | `tla-voting/distributions/` vote-state at flip |
| Bribes / unique voters / active pools | **epoch** | `tla-voting/events/bribes/YYYY/MM.json` + distributions |

Resolved from the original sketch: **no cron rider needed for v1** — votion
dailies now exist, so only Total VP remains epoch-native, and it STAYS
epoch-native rather than gaining a rider (no new layers; the honest label is
better than a synthetic daily).

## Honesty rules (binding)

1. Every metric is labeled with its native granularity; epoch metrics NEVER
   render as daily lines. The chart x-axis adapts: daily metrics use dates,
   epoch metrics use epoch numbers.
2. No interpolation, no forward-fill across gaps. A missing day renders as a
   gap with a hover note.
3. Window math for epoch metrics = epochs whose FLIP falls inside the window
   ("2 epochs in the last 14d"), never prorated.
4. Capture-window jitter is disclosed, not repaired. Known instance:
   `dex-data/astroport/snapshots/daily/2026-08-02.json` was captured 06:01
   UTC (pre-outage run filled the date slot; normal slot ~23:00). DECISION
   (Camron delegation, 2026-08-04): accepted as-is — real captures beat
   reconstructed ones; the tile tolerates ±day-fraction jitter and the file
   meta carries `generated_at` for anyone who cares.

## UI

**Tile** (top of index.html, above the fold): window pills 24h · 48h ·
7d · 14d · 30d (default **48h**). Rows: TLA TVL Δ ($ and %), Votion VP Δ,
VP renewed (locks Δ), rewards distributed (epoch-count-labeled), bribes
posted (idem), unique voters (latest epoch vs prior). Each row: value,
delta arrow, granularity chip (`daily` gray / `epoch N–M` amber), whole-row
hover shows the two endpoint readings + capture timestamps.

**Chart**: one metric at a time (selector mirrors tile rows), 30 points per
page, back-paging ‹ › through history to the stream's first capture. Daily
streams page by 30 days; epoch streams by 30 epochs. Sparkline-grade
rendering consistent with the tla-stats hero band; sessionStorage cache
under the `adao_live:` convention.

**Data plumbing**: static raw.githubusercontent fetches of committed
products only (this is a history feature — cron products ARE the source of
truth; no LCD calls). Fetch plan per page-load: 2 dex dailies × endpoints
window, votion dailies, distributions/history.json, current-month +
prior-month bribe events. Lazy: chart pages beyond the first fetch on
demand.

**Rev footer**: index.html gains `REV`/`REV_DATE` constants + `#page-rev`
per the rev-footer law; `docs/changelogs/index-log.md` gets the entry.

## Gate (delivery vehicle)

Mock gate on committed real files (pinned at build time): TVL Δ between two
named daily files asserts the exact dollar figure; votion VP Δ likewise;
epoch-window count asserts the exact epochs captured by a 14d window ending
at a pinned date; the 08-02 jitter file renders with its real
`generated_at`; gap-day renders as gap (assert no interpolated point);
granularity chips assert per-row. Specific values in specific cells — no
"some % renders" assertions.

## Out of scope (parked explicitly)

- Cron rider for daily Total VP (v2 candidate, only if epoch labeling
  proves confusing in practice)
- Per-pool pulse drill-downs (belongs to PD Watch / tla-stats)
- price-history integration beyond context labels

## Build sequence on approval

1. index.html Rev bump: tile + chart + rev footer (one delivery, full
   replacement file, gate first)
2. index-log.md entry (same delivery)
3. Announcement copy can cite the tile once the walk backfill completes —
   the pulse is the natural "here's what we built" landing view.

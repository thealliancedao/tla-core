# cron-member-data — changelog

---

## 2026-08-10 — 2.0.0 — HOURLY orchestrator + tla-snapshot FOLD (strip 4b, org-pure)

org-member-data becomes the VP layer's fold absorber in practice: the Render
job switches to HOURLY; the daily census is clock-gated to MEMBER_CENSUS_HOUR
(default 02:xx UTC — set to the old schedule's hour) and the tla-snapshot
fold runs every invocation (kill-switch TLA_SNAPSHOT=0; census and fold
failures isolated from each other).

tla-snapshot fold = the legacy 1,744-line cron VERBATIM with only: (a) input
swaps to org products — bribes-current → tla-voting/bribe-state month
harvests (latest harvest's buckets == on-chain active-bribe shape, adapter),
bribes-history → tla-voting/pd-bribes placements' legs (count adapter),
astroport → dex-data/astroport/epochs, skeletonswap →
dex-data/skeletonswap/rolling; votion stays on its ALIVE mid-fleet source by
rule (inputs migrate with their own strip; the site reads that product
directly today); (b) publish → member-data/tla-snapshot/{current.json,
daily/<date>.json, heartbeat.json}, same output contract as legacy
data/tla-snapshot.json so the page only moves one URL (tla-stats Rev T3.5).

**Gate 22/22 — the headline: NAME CROSS-REF HEALED** (org fold: 6 unnamed
pools vs the live legacy snapshot's 65/67 — the leaderboard-tiles outage
root-caused 2026-08-10). Status/pct parity 67/67 + bucket VPs exact on
stubbed-identical chain state; org bribes/pd/votion joins live; output field
set ⊇ legacy's. Documented stub gaps (staked balances + pool reserves not
stubbed): verify POST-DEPLOY by diffing live org current.json vs live legacy
tla-snapshot.json on staked_in_tla_usd / lp_health / rewards during the
parallel-run window, then kill.

**SUPERSEDES 4a (pool-status/history.js):** the audit (Camron's "check we
don't already have this") found the fold's snapshot contains EVERY field
history.js emits — same gauge queries, same 1% rule, same resolver — while
history.js contains nothing the fold lacks. Two org jobs classifying the same
pools = two sources of truth. No page reads dex-data/pool-status/* (built
2026-08-10, never consumed) → remnant on arrival per pages-define-need.
ACTION: delete platform-crons/dex-data/history.js + its index.js tail hook
(deliverable in this paste); the tla-core dex-data/pool-status/ tree written
by its brief deployment is likewise remnant — delete at step 7. If a dated
pool-status SERIES is ever needed, derive it from
member-data/tla-snapshot/daily/ rather than re-capturing.

KILL SEQUENCE once org verified + page green: suspend legacy tla-snapshot
Render job → (dao-dashboard stays alive until ITS fold — separate item) →
archive tla-snapshot-data_2026 after quiet period → step-7 deletes.
apr-history / pool-status-history / daily-archive page URLs remain
legacy-STATIC files (crons frozen with the job; replacements = 4a
pool-status forward series + the APR emitter item).

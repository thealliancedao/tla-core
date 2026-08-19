# cron-member-data — changelog

---

## 2026-08-19 — 4.0.1 — publisher hardening across all folds

**All three publishers were single-shot** and one died mid-run on a 409
("is at <sha> but expected <sha>"): twelve org jobs write to tla-core, so main
advances between the sha read and the PUT. tla-snapshot's was worst — it
silently returned `false` on a race, so a LOST WRITE looked like a successful
run. All now retry 5× with a FRESH sha per attempt and jittered backoff.

Also fixed: tla-participants' daily archive wrote to a ROOT
`data/daily/<date>.json` in tla-core (one publish line missed in the fold), and
three console lines printed `data/…` while publishing correctly — misleading
during exactly the audit that caught it. **The run log is not the truth; the
tree is.**

## 2026-08-11 — 4.0.0 — dao-dashboard FOLDED: the last legacy producer is dead

The final cron writing to `defipatriot/tla-snapshot-data_2026` is now org-side.
Verbatim logic (706 lines); only edits: inputs swapped to org products
(legacy tla-snapshot.json -> the org fold's own `member-data/tla-snapshot/
current.json`; Staking APR csv -> `docs/staking-apr.csv`, byte-identical),
publish -> `member-data/dao-dashboard/{current.json, daily/<date>.json}`,
branch-race retry added to its single-shot publisher, and `module.exports
{main}` so it runs inside org-member-data hourly (after tla-snapshot, which
it consumes; isolated, `DAO_DASHBOARD=0` disables).

Output contract UNCHANGED (`{meta, dashboard, token_prices}` with treasury,
tla_deposits, unclaimed_rewards, vote_rewards, rebase, alliances) — the three
consumer pages each moved one URL, no parsing changes.

Site: index (Rev 3.77), dao_treasury, dao_tla_deposits repointed. The daily
archive path changed shape too — legacy wrote `data/daily/dao-dashboard-
DATE.json` (prefixed, shared folder); org writes `daily/DATE.json` in its own
tree, so index gained a `DD_DAILY_BASE` constant rather than reusing the
tla-snapshot daily base.

**With this, `tla-snapshot-data_2026` has no remaining producers or readers.**
After one verified org run + a page check, suspend the legacy dao-dashboard
Render job (if any survives) and DELETE the repo. Remaining site references to
legacy repos are dead epoch-end fallbacks (`tla-data-epoch-N-end`,
`tla-ext-epoch-N-end`) that already fail gracefully, plus one image link.

## 2026-08-11 — 3.0.2 — P1 folds LIVE; stray participants daily path fixed

First successful org run (19:39–19:40 UTC): tla-participants captured
**203/203 portfolios, 0 per-member errors**; adao-positions captured
**155/155 members + treasury + council**, published weekly/epoch-198 and the
daily archive. Verified in the tree: positions {current, members, heartbeat,
weekly/epoch-198, daily/2026-08-11} and participants {current, participants,
heartbeat} all 200.

Two path defects found by auditing the run log against the tree (the log is
not the truth — the tree is):
1. **tla-participants daily archive wrote to a ROOT `data/daily/<date>.json`**
   in tla-core (one publish line was missed in the fold). Now
   `member-data/participants/daily/<date>.json`. **Delete the stray
   `data/daily/2026-08-11.json` and the empty `data/` folder from tla-core.**
2. Three console lines printed `data/…` while publishing to the correct org
   paths — cosmetic but misleading during exactly this kind of audit. Fixed.

Gate 4/4: zero publishes to root `data/`, all participant publishes under
member-data/participants, positions under member-data/positions, log strings
match real paths.

Data notes from the run (not defects): 442 locks → 203 unique holders; PFPK
55/44 names resolved; zluna→LUNA 1.476946; 6 at-risk LP positions across 17
members; `bribes-history: 0 bribe providers from 0 records` — the org
pd-bribes derive returns placements, and participants' provider discovery
expects a different shape; participant set is unaffected (lock holders ∪
providers = 203 either way) but the provider leg is currently a no-op —
queued for the pd-bribes adapter pass.

## 2026-08-11 — 3.0.1 — shared capture-engine repointed (P1 first-run fix)

First org run of the P1 folds failed identically in both modules:
`network-and-prices.json required — aborting`. Cause: the SHARED
`lib/capture-engine.js` in platform-crons still pointed at
`defipatriot/network-and-prices-data_2026` — a repo that is now **deleted
(404)** — and at the frozen legacy `tla-snapshot-data_2026`. The folds
themselves were fine: the run showed org catalog roster 155 aDAO members,
DAO DAO indexer 155, PFPK 44 names, 442 locks → 203 unique holders, all
before the shared loader aborted.

Fix (org repo, no dying-repo edits): both constants → org products —
`network-and-prices/current.json` (verified: carries `token_prices` 27 +
`lst_ratios`, the only two fields the engine reads) and
`member-data/tla-snapshot/current.json` (the fold's own output; the legacy
copy is frozen and its repo is slated for deletion).

Gate 4/4: zero defipatriot URLs remain in the engine; both org products live
and carrying the exact consumed fields.

LESSON: a shared lib in the ORG repo can still carry legacy URLs. When a
legacy data repo is deleted, grep `platform-crons/lib/` too — not just the
cron modules and the site.

## 2026-08-11 — 3.0.0 — P1: adao-positions + tla-participants FOLDED (frozen-source emergency)

Both legacy jobs were FAILING and their products FROZEN since 2026-08-09 while
six live site files still read them — including `lib/adao-live-data.js`, which
every page loads. The site was presenting 2-day-old portfolio data as current.

Folded verbatim into member-data (the VP/member absorber), running hourly in
the same orchestrator, participants BEFORE positions (positions consumes the
participant discovery), each isolated with kill-switches ADAO_POSITIONS=0 /
TLA_PARTICIPANTS=0.

Input swaps (the only non-verbatim edits):
- member roster: `adao_json_storage/members.csv` → **org address-catalog**
  (slug adao). The catalog already held 155/157 of them — the CSV was a
  duplicate identity layer. Output shape kept identical so downstream is
  untouched. (2 catalog-missing addresses queued for the curated input.)
- pd-bribes history: `bribes-data_2026` → `tla-voting/pd-bribes/current.json`
- self-reads (cached members, last-good current, heartbeat) → org paths

Products: `member-data/positions/{current,members,heartbeat}.json` +
`weekly/epoch-{n}.json` + `daily/{date}.json`;
`member-data/participants/{current,participants,heartbeat}.json`.

Site: 21 reader lines repointed across index (3.74), tla-stats (T3.8),
test.html, slippage.html, member-portfolio.html, lib/adao-live-data.js —
**zero frozen-source references remain site-wide**.

Gate 11/11: both modules load in the real repo layout (capture-engine +
config resolve from member-data/); publish paths org-only; self-reads org;
roster from catalog with no members.csv fetch; zero live legacy URLs;
orchestrator ordering + isolation.

KILL after first successful org run + page check: suspend Render
`adao-positions` and `tla-participants`; archive both data repos.

## 2026-08-10 — 2.1.0 — rollups folded + daily archive bank (repo-DELETION prereqs)

Killing the legacy job needs everything it PRODUCES to exist in org, not just
the snapshot. Audit of tla-snapshot-data_2026 found the two rollups are NOT
frozen (regenerating hourly) and the daily archive feeds both them and the
page's epoch-boundary baseline. Folded in the same paste:
- apr-history-rollup.js + pool-status-history-rollup.js — verbatim; only
  repo→tla-core, daily dir→member-data/tla-snapshot/daily, OUT_PATH→
  member-data/tla-snapshot/{apr-history,pool-status-history}.json, exports.
  Orchestrator runs them AFTER the snapshot fold and only when the daily
  archive was written (23:xx UTC) or FORCE_ROLLUPS=1 — their input only
  changes once a day. Kill-switch ROLLUPS=0; skipped if the snapshot failed.
- tla-snapshot-daily-bank one-off (.github/scripts + workflow): banks the 90
  dated daily archives (2026-05-13..08-10) into member-data/tla-snapshot/
  daily/ so the 15-epoch rollup history carries over unbroken. Filter proven
  on the real listing: 90 dated kept, all 60 dao-dashboard-*.json dropped.
  Additive-only, org-wins, blob-sha verified. Gate 5/5.

Site: ALL tla-snapshot-family readers repointed — tla-stats (Rev T3.6, 5
URLs), index (Rev 3.72, heartbeat ×2 + dated-daily base), test.html,
member-portfolio.html, lib/adao-live-data.js.

⚠ **REPO DELETION IS BLOCKED BY dao-dashboard, NOT by tla-snapshot.** The
same legacy repo hosts a SECOND producer (dao-dashboard.json + daily/
dao-dashboard-*.json) written by the separate dao-dashboard Render job, read
by index.html ×2, dao_treasury.html ×2, dao_tla_deposits.html ×2. After this
paste the tla-snapshot job + its Render job can be suspended and its products
are fully org-side, but the REPO must stay until dao-dashboard is folded too
(next item). Suspending tla-snapshot alone is safe — dao-dashboard writes its
own files and doesn't read tla-snapshot's.

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

**SUPERSEDES 4a (pool-status/history.js):** the audit (the owner's "check we
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

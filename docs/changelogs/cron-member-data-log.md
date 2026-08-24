# cron-member-data — changelog

## 2026-08-24 — dao-dashboard 1.5 — `last_claims` from tla-flows (the index popup's labels were hardcoded)

`dashboard.last_claims = {deposit, vote, rebase, locks}` each `{date, txhash,
height}` or null, derived from the treasury's `claim` executions in
tla-flows (18-month window): deposit ⇐ `asset/claim_rewards`, vote ⇐
`bribe/claim_bribes`, rebase ⇐ `gauge/claim_rebase`, locks ⇐ `ve/deposit_for`;
latest per mechanism; other wallets, `user:null` vault claims and non-claim
DAO events ignored. Isolated (a flows read failure marks status partial,
never blocks). Gate `mock-run-last-claims.js` on the seven real executions
2025-06 → 2026-07: 7/7.


## v1.4.0 — 2026-08-24 — LP-position denominator fix (reconciliation finding)

The CAPA supply probe caught `member-data/positions` publishing 119,157 CAPA
underlying for the treasury's non-amplified CAPA-LUNA LP while the redeemable
claim is 109,459 — 8.9% high. Root cause in `lib/capture-engine.js` Step 1:
`user_pct_of_pool` was user SHARES ÷ TLA-bucket total SHARES, then multiplied
against the WHOLE pool's reserves and, for USD, against `staked_in_tla_usd` —
three quantities on two different denominators.

Now: `user_pct_of_pool` = redeemable LP `amount` ÷ `lp_health.total_share`
(LP over LP), with the old shares ratio kept as `user_pct_of_tla_bucket` for
reward math; USD pairs `depth_usd` with the pool pct (or, where no `lp_health`
exists, the bucket pct with `staked_in_tla_usd`, labeled via `usd_basis`).
New `pct_basis` field names the math on every position.

Gate: `gate-engine-lp.js` requires the LIVE engine (no-third-copy) with network
stubbed to the real treasury fixture — 6/6, including "old 119,157 nowhere".

Consumers that will shift on next publish: dao_tla_deposits.html (position USD
+ underlying sums) and member-portfolio.html (position USD) — non-amp LP rows
move down up to ~9%. That is the correction, not a regression; re-run the
treasury/deposits reconciliation after one publish cycle.

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

## 2026-08-21 — tla-snapshot F1: price-artifact forward fix (AUDIT-price-artifact-2026-08 §4)
- **Stage-3 pool-type guard (permanent):** `registerPoolReserves` now takes the
  pool's dex_subtype and REFUSES concentrated, stable, and unknown-type pools —
  reserves≠price by design (Astroport's own PCL/stableswap docs; the arbLUNA
  lesson). Only xyk reserves may feed derivation. SkeletonSwap subtype-null
  pools are refused pending per-pool type confirmation (FOUNDATIONS open item).
  Refusals logged loudly per pool.
- **Stage 3.5 prev-daily carry:** on full feed miss, yesterday's price is
  carried as last resort — feed-grade prior sources ONLY (`pool_derived`
  priors are never carried, so tainted concentrated derivations cannot
  propagate; verified in gate vs the actually-tainted 2026-08-20 daily).
  Source `prev_daily:<date>(<orig>)`, `stale:true`.
- Gate 12/12 on real production fixtures incl. Class-A incident replay
  (stLUNA CG-outage): phantom path eliminated; tainted prior → honest null;
  clean prior → flagged stale carry. Effect on dailies: non-xyk-derived
  symbols (FUEL/WHALE/dATOM…) now resolve null instead of phantom until
  proper feed entries land (F2 round) — honest blank beats manufactured price.

## 2026-08-21 — tla-snapshot F1.1: live-fire fixes
- Pass-2 stats reset restored `prev_daily` counter (live log showed
  "undefined prev-daily carry" — the reset literal predated F1).
- Refusal log deduped: each non-xyk pool now logs once, not once per
  enrichment pass (first live run printed 74 lines for ~40 unique pools).
- Verified from first production F1 run: guard refusing correctly,
  honest nulls where phantoms used to be, INJ/SWTH/WETH still deriving
  from legitimate xyk pools.

## 2026-08-21 — F2 Phase A: historical price repair (Classes A+B+C)
- 29 dailies repaired, 142 corrections (A:84 outage phantoms, B:2 bLUNA
  parity, C:56 EURE frozen window), gate 8/8, zero skips. Amounts untouched —
  price layer only; totals delta-adjusted; every file carries a
  `_price_corrections` audit block; run report published beside the data.
- Gate findings folded back into the audit doc: ATOM was never frozen
  (CG cent-rounding revisits 2.04) — claim corrected, ATOM untouched; and
  legitimate prices DO repeat, so detection uses source mechanics + value
  bands, never repetition. Two-phase taint-set design prevents a poisoned
  value from sourcing a repair (caught live: 07-22 near-corruption).
- Deferred: F2b Class-D chronic (FUEL via astroport daily-csv, dATOM via CG
  history, WHALE null forever) and Phase B rollup re-runs (matrix rows
  E187/189/193–196/199 still infected until re-derived).

## 2026-08-21 — F2 Phase B: rollups re-derived over repaired dailies
- apr-history, pool-status-history, and epoch-band-history regenerated by the
  LIVE production modules (rollups run in their own --daily local mode; band
  via the existing epoch-band-backfill one-off with LOCAL_DATA_DIR) — the
  no-third-copy rule held: zero reimplemented logic.
- Surgical confirmation: pool-status changes land on exactly the audit's
  infected epochs (E187/189/193–196/199); apr-history additionally touches
  E190/191/197 where repaired days shifted in-epoch averages; band matrix
  11 leaf changes. Invariant violations: 0 live → 0 regenerated.
- This closes AUDIT-price-artifact-2026-08 Phases F1→F2-B. Remaining: F2b
  chronic trio (FUEL via astroport daily-csv, dATOM via drop-staked-atom
  history, WHALE null forever) and F3 agent/docs cautions.

## 2026-08-21 — F2b: Class-D chronic trio repaired + F2-A APR reconcile + rollups re-derived
- **FUEL** (100 dailies): priced from `docs/pending-changes/F2B-fuel-price-series.json`
  (astroport LUNA-FUEL `assets_json`, the token's only market). 5 gap days
  (05-13..16, 08-02) bridged by nearest clean fixture day, tagged
  `f2_repair:nearest_clean_fixture(...)`. Pool-derived FUEL had run ~6% low.
- **WHALE** (400 legs, 4 pools): `price_usd`/`usd_value` null — abandoned,
  no trusted feed (owner). Stays null forever.
- **dATOM** (200 legs, 2 pools): null. The CG `drop-staked-atom` 100-day
  history was pulled, ratioed day-by-day against the dailies' `direct` ATOM,
  and REJECTED at gate: par-proxy 05-14..05-28 (ratio ≈1.00), identity flips
  05-29/06-19/06-27, then pinned $2.62±1% for seven weeks while ATOM moved
  $1.60→$1.22→$1.50. Repairing from it would replace a phantom with a
  phantom (the 07-22 lesson). Evidence: `F2B-datom-cg-series-REJECTED.json`.
  Forward consequence: registry `cg:drop-staked-atom` feeds the same frozen
  number into current.json — queued for chain-exact Drop-hub-rate × ATOM
  (bLUNA method). Owner: "not that popular or supported; revisit if needed."
- **Null semantics mirror the live F1 cron exactly** (verified against
  today's current.json LUNA-WHALE): unpriced side → usd_value null,
  total_pool_usd = priced side only, ratio [null,100], staked/APR re-derived.
  ⚠ This means a half-valued pool ⇒ staked halves, APR doubles (ATOM-dATOM
  E184 3,659%→7,318%; LUNA-WHALE already 2.8M%→5.6M%). Consistent with the
  cron, but the cron's rule is not factual → **F1.2 queued: one unpriced
  side ⇒ total/staked/APR null**, then a one-line re-annotate pass here.
  Exposure today $142 + $9 + $0.
- **F2-A gap found by the gate, fixed here:** F2-A repaired
  `staked_in_tla_usd` on 128 legs / 29 days but left `rewards.approx_apr_pct`
  computed from the phantom staked. `apr-history-rollup.js` reads that field
  directly (L181), so Phase-B's apr-history still averaged phantom-era APRs
  on the very pools the audit was opened about. Reconciled to the live
  formula (`annual_emissions_usd / staked × 100`), each leg annotated as a
  companion `_price_corrections` entry (`field: approx_apr_pct`, method
  `apr_reconciled_to_repaired_staked`). Example 05-31 LUNA-stLUNA 26.26%→43.47%.
- **Gate 15 invariant classes, 0 fails, 100/100 files:** non-price layer
  byte-identical to main (JS-repr-exact writer — Python's default float repr
  would have churned ~200 unrelated bytes/file), amounts + depth_usd
  untouched, lp_health/staked/APR arithmetic self-consistent, totals and
  bucket TVL = Σ pools, prior A/B/C entries verbatim, correction count =
  pool_derived legs. Net TLA TVL delta over the period +$7,121.
- **Rollups re-derived via LIVE modules** (Phase-B recipe, no-third-copy):
  baseline run over unrepaired dailies reproduced main byte-for-byte
  (ex generatedAt) — the 32/133 `_invariants` entries (corpse candidates,
  SS staked>depth) pre-exist on main, delta 0. apr-history: 14 pools moved,
  all 16 epochs (FUEL ≤2pt/epoch; stLUNA E193 38.9→50.1%; bLUNA-LUNA E189
  45.5→43.8%). pool-status: same pools, staked/px/source fields.
  epoch-band: 16 tla_tvl leaves (≤$1.3K) + 3 luna_price leaves on E197–199
  from the n&p daily feed having moved since this morning's derive (not F2b).
- Report: `f2-repair-report.json` now scope A+B+C+D+APR, 970 corrections.
  Closes AUDIT-price-artifact-2026-08 Class D. Not touched: current.json,
  heartbeat.json (cron-owned).

## 2026-08-21 — tla-snapshot F1.2: unpriced side ⇒ null pool value (not half)
- `buildLpHealth`: if ANY side of an LP has no price, `total_pool_usd` is null
  and `balance_ratio_pct` is [null,null]. Previously the priced side alone was
  summed, so the pool carried half its value → `staked_in_tla_usd` halved →
  `approx_apr_pct` doubled (F2b finding; LUNA-WHALE 4.5M% APR). Downstream is
  unchanged code: null total → staked null → APR null → excluded from TVL.
- Pass-2 refresh still keys on null `usd_value`; Stage-3 derivation reads
  `_basics` (amounts), not the total — xyk derivation unaffected.
- Replay gate over today's live current.json (67 pools): 59 fully-priced pools
  produce byte-identical lp_health; 6 unpriced pools go honest-null (4 were
  half-valued: LUNA-WHALE, LUNA-wSOL, LUNA-wSOL.wh, one unnamed SS pool — ~$12
  staked total leaves TVL). 0 fails. LCD is walled from the sandbox, so
  live-fire verification = compare first post-deploy current.json.
- Follow-up (queued): re-annotate the 600 WHALE/dATOM null legs in history to
  the same semantics so dailies match forward capture.

# SPEC — tla-voting capture fix (state harvest + walker transport + monthly restructure)

**Status:** DEPLOYED + HEAL VERIFIED 2026-07-15 (same day as approval).
Restructure executed live (commit 4b9823c: 62 month files, byte-identity all
four streams, monoliths deleted, index → schemaVersion 4). org-tla-voting
2.0.0 live on the hourly schedule; first run: cursor migrated from the 1.x
min-frontier (21,905,081), walker + dedup proven on real chain ground, and
the FIRST HARVEST HEALED the Rev 4 misses — period 193, 203 wallets, 0
pending: aDAO's prop-39 re-vote (841,486.80 VP × 4 gauges, stamped 193), the
5.97M-VP whale's dropped project vote back-attributed (stamped 191), both
Votion vaults on the books (arbLUNA-MAX 6.47M VP — the largest voter in TLA).
vote_capture {MATCH 625, MISMATCH 8, CHAIN_ONLY 28, EVENTS_ONLY 0} — the
MISMATCH/CHAIN_ONLY sets match the reconciliation exactly. The period-stamp
field is PINNED: it is `period` (queries.md Q-AssetGauge-UserInfo).
**Interpretation law: CHAIN_ONLY ≈ 28 is the PERMANENT HEALTHY BASELINE** —
contract-path voters never have events (that's why vote-state exists); the
alarm signal is GROWTH beyond the known contract-voter set, not nonzero.
Remaining watches: catch-up backlog clears over ~5 hourly runs; Sunday
2026-07-19 flip should self-append period 194 to BOTH distributions and
vote-state. Defaults §0 stand as locked and shipped.
**Trigger:** the 2026-07-14 reconciliation verdict — **LOSSES, triple-verified**
(changelog Rev 4; report `tla-voting/events/reconciliation.json`: MATCH 727 ·
MISMATCH 8 · CHAIN_ONLY 28 · EVENTS_ONLY 4, match_rate 94.78%). Routing per
`SPEC-tla-voting-reconcile.md` §6: the capture fix rises above the rollup
rebuilds — don't build rollups on a leaking, mis-attributing stream.
**Owner:** tla-voting module. Forward code `platform-crons/tla-voting/`;
one-shots in `tla-core/.github/scripts/tla-voting/` + workflows in
`tla-core/.github/workflows/` (REPO PLACEMENT MAP — binding).
**Reads first:** `SPEC-tla-voting.md` (module contract), changelog Rev 4
(evidence), `SPEC-tla-flows-walker.md` (transport doctrine),
`TLA-CORE-STORAGE-DESIGN.md` (layout + Deviation Register).

---

## 0. Defaults locked for this build (veto before build, not after)

| # | Decision | Default |
|---|---|---|
| D1 | Completeness + attribution layer | **Per-period STATE HARVEST**, new product `tla-voting/vote-state/` |
| D2 | vote-state storage | Monthly `{YYYY}/{MM}.json` arrays of per-(period, wallet) records + `heartbeat.json` + `index.json` (distributions-style product, managed by the forward cron) |
| D3 | Harvest cadence | Once per period, on the first cron run after the epoch flip (same trigger pattern as the distributions step) |
| D4 | Harvest universe | Enumerated fresh every harvest: escrow `all_tokens` → `lock_info` owners ∪ wallets present in vote-events. **Never a hardcoded voter list** |
| D5 | Events transport | tx_search pager **replaced by the Rev C block-walker** (lifted from `platform-crons/tla-flows`), watched-contract gate = the 3 governance contracts. Classifier untouched |
| D6 | Cron schedule | `0 */6 * * *` → **hourly `0 * * * *`**; `MAX_BLOCKS_PER_RUN` 2,000 (≈3.2 h of chain — headroom over the ~620-block hourly window), partial progress commits per walker D8 |
| D7 | Events layout | Per-stream monthly partitions: `events/{votes,locks,bribes,rewards}/{YYYY}/{MM}.json` (the monthly restructure rides this touch; Deviation Register row for stream subfolders) |
| D8 | Heal of the ~9 missed votes | The **first harvest IS the heal** — retained chain state + period stamps back-attribute the misses. NO archive node |
| D9 | Lock token_id defect | Classifier promotion: pair `ve/deposit_for` with `wasm-metadata_changed{token_id}` (chain-confirmed feasible, Rev 4). Applied forward + optional FCD re-derive for history |
| D10 | Reconciliation | Folds into the cron permanently: each harvest computes events-vs-state coverage → heartbeat `vote_capture` section; `reconciliation.json` stays the detail artifact |
| D11 | Cron version | All of the above ships as **org-tla-voting 2.0.0** in one rev (transport + monthly writes + harvest all touch `index.js`; shipping separately triples the mock/deploy cycles) |

---

## 1. What broke (from Rev 4 — do not re-derive)

Three loss classes, all proven:

1. **Declared-gap losses** — 7 of 8 mismatches are user re-votes lost in the
   honest June 15–22 prune window (period ~190). Small, declared.
2. **Silent loss inside claimed coverage** — wallet `terra1xn7dl78…`'s
   period-191 project vote (a new ~5.97M-VP whale, ~21% of system) dropped in
   a window where the pager captured 42 events and recorded no gap. **The
   tx_search pager loses events even where it claims coverage.**
3. **Systematic blindness to contract-path votes** — 7 voting contracts hold
   live allocations: 3 Votion vote-aggregator vaults (code_id 3677;
   arbLUNA-MAX = the single biggest TLA lock, ampLUNA-MAX = second), 3 DAO DAO
   DAOs (one confirmed = **aDAO itself**, `terra1sffd4…` — the council's
   prop-39 re-vote @ 841,486.80 VP × 4 gauges is invisible to aDAO's own
   analytics), 1 Polytone proxy voting cross-chain. 4 have zero event
   footprint; 3 are mis-attributed to the triggering signer.

Plus the **lock token_id defect**: all 1,306 `lock_create` events carry
`token_id: null` (65/325 withdraws too) — per-token identity replay impossible.

**The decisive design fact (prop-39 tx dump):** the gauge's `gauge/vote` wasm
event emits ONLY `{action, vp}` — no user, no allocation. Wrapped votes
**cannot** be attributed from events; the information is not emitted on chain.
Therefore no event-layer fix, however good, can be complete. The completeness
and attribution layer must read **state**.

**What is already sound:** the VP invariant is perfect (Σ locks =
`total_vamp.vp` = 27,975,687.10, Δ 0.0000%); distributions capture is
complete (floor 96, zero gaps); money math is trustworthy. This fix repairs
the who-voted-what ledger only.

---

## 2. Architecture — two layers, one truth

**Layer A — vote-state (NEW: completeness + attribution, per period).**
Chain state is self-timestamping: the gauge stamps each `gauge_votes` entry
with its vote PERIOD (probe-discovered, now doctrine). Enumerate every lock
owner, query `user_info` for each, record the full allocation with stamps.
Any entry stamped P = that actor voted in P. Catches Votion vaults, DAO DAO
executions, Polytone, wrapped paths, and silent tx-index drops **by
construction** — it never watches transactions at all, and the gauge cannot
forget. ~250 `user_info` queries per week. Perfect attribution: the queried
address IS the voter.

**Layer B — events (EXISTING: the fine-grained tx layer for direct votes).**
Heights, hashes, timestamps, msg detail — everything state can't give.
Transport moves to the block-walker (§4) so forward capture stops leaking;
scope and classifier unchanged. Events are detail; state is truth. Where they
disagree, state wins.

**Dynamism requirements (binding — new voters are a data point, not an
incident):**
- The voter universe is enumerated fresh every harvest (D4). No list of
  voters, vaults, or DAOs is ever hardcoded in this cron.
- Contract voters are captured identically to wallets. Identity/labels
  (Votion code_id-3677 family as one voter class, DAO DAO, Polytone) live in
  address-catalog (Layer-2 doctrine, SPEC-tla-voting §2) — analytics rider
  already queued in CHANGES_PENDING.
- Gauges are parsed as returned by `user_info`, never filtered to a known set.
- Unknown ≠ dropped, unchanged from the module contract.

---

## 3. vote-state product design

### Path & files (per TLA-CORE-STORAGE-DESIGN)
```
tla-voting/
└── vote-state/
    ├── heartbeat.json      (standard shape + harvest stats)
    ├── index.json          (periods_present, months_present, wallet counts)
    └── {YYYY}/{MM}.json    (JSON array; dedup key = (period, wallet))
```

### Harvest procedure (rides org-tla-voting, once per period)
1. Trigger: first run where `current_period > last_harvested_period`
   (distributions-step pattern). Mid-week runs log `vote-state: skipped`.
2. Universe: escrow `num_tokens` → `all_tokens` walk (resilient pager, F1) →
   `lock_info` per token → distinct owners; ∪ event-wallets with a live
   allocation history. (~1 + ~15 pages + ~433 + ~250 ≈ 700 paced queries —
   proven Action-scale by reconcile.js; concurrency ≤5.)
3. Per wallet: gauge `{user_info:{user, time:'next'}}` → record.
4. Publish month file (merge, dedup (period, wallet), never-shrink within
   covered range) → index → heartbeat. Errors: null ≠ empty; a failed wallet
   lands in `errors[]`, flips status `partial`, and is retried next run
   (harvest is idempotent per period).

### Record schema (v1)
```json
{ "period": 194, "wallet": "terra1…",
  "vp": { "fixed": "…", "boost": "…", "total": "…" },
  "gauge_votes": [
    { "gauge": "project", "period_stamp": 191,
      "votes": [["cw20:terra1…", 5000], …],
      "post_flip_change": false } ],
  "voted_this_period": false,
  "capturedAt": "…", "source": "state-harvest" }
```
- `voted_this_period` = any entry stamped == harvested period.
- `post_flip_change: true` flags entries stamped > the harvested period (the
  wallet re-voted between the flip and the harvest — the period-final
  allocation for that gauge was overwritten before we read it; recorded
  honestly, never guessed).
- Wallets with zero allocations are recorded as `gauge_votes: []` (lock
  holders who never voted — a real cohort the analytics want).

### Timing honesty
`user_info` returns CURRENT state; stamps carry only the LAST vote period per
gauge. Consequences, stated plainly:
- Harvest early in each period → the previous period's final allocations are
  intact except for immediate re-voters (flagged per above).
- A missed harvest degrades gracefully, not freely: allocations unchanged
  since are recovered with true stamps; anything overwritten in between is
  gone. Missed periods are recorded in `known_gaps` — same honesty law.
- **Pre-harvest history cannot be reconstructed** beyond each actor's
  last-vote stamp at first capture. The first harvest records what is
  recoverable (§5); deeper per-period wrapped-voter history is honestly out
  of reach forever (the chain never emitted it).

### Heartbeat additions (D10 — reconcile folds in)
`vote_state: { last_harvested_period, wallets, voted_count, errors }` and
`vote_capture: { match_rate_pct, mismatch, chain_only, events_only }` — the
events-vs-state comparison computed at each harvest (replay last-event-per-
(wallet,gauge) vs the fresh state, reconcile.js logic lifted). This is the
permanent invariant the reconcile spec promised. `EVENTS_ONLY`/`CHAIN_ONLY`
counts trending nonzero = capture regression alarm via system-health.

---

## 4. Events transport — block-walker (Rev C lift)

Per the walker doctrine (`SPEC-tla-flows-walker.md` §0): backfill engines on
forward schedules leak — proven twice now (tla-flows deploy stall; Finding 2).
The written justification requirement is hereby satisfied in reverse: there is
none for keeping tx_search.

- **Lift the Rev C walker shell** from `platform-crons/tla-flows` (D1–D10
  there: RPC transport + fallback, `/block` + `/block_results` pairing,
  SHA-256 txhash, empty-block skip, height-ordered commits, budget with
  catching-up notes, cursor schema 2, pruned-block binary-search →
  `known_gaps` with exact bounds).
- **Watched-contract gate** = gauge controller, voting escrow, incentive
  manager (from the module's existing contract constants).
- **Classifier untouched** — the existing typed events + `event:*` passthrough
  + `discovered_actions` all keep working; only the transport that feeds it
  changes. Diff-verify the classifier block against the seed's export after
  the touch anyway (standing rule).
- **What is deleted from the cron:** the resilient ASC pager and all tx_search
  paths. They remain in the seed script — index scanning is backfill-only
  tooling, where it belongs.
- **Schedule:** hourly (D6). Steady state ≈620 blocks/run; budget 2,000
  absorbs multi-hour outages; longer outages catch up across runs. Interim
  cost note: tla-flows and tla-voting both walking blocks duplicates transport
  work — accepted, and dissolves into the Phase-2 capture registry (single
  walker, registry routing, this cron becomes a consumer; nothing built here
  is throwaway).
- Cursor migration: read the existing per-contract tx_search cursor once,
  start the walk at `min(last_heights) + 1`. First-run lookback rules from
  the walker spec apply if cursors are unreadable — but this cron **never
  seeds** (existing rule stands).

### Classifier promotion riding along (D9 — lock token_id)
`lock_create` (and the affected withdraws): extract `token_id` by pairing the
`ve/deposit_for` action with the tx's `wasm-metadata_changed{token_id}` event
(chain-confirmed feasible, Rev 4). Forward events carry ids from 2.0.0 on.
**Optional follow-up (separate one-shot, not gating):** re-run the FCD derive
with the promoted classifier over `archive/fcd/tla-escrow` to backfill ids for
the genesis→Jan-2025 creates — classifier promotion + recompute, no
re-backfill, exactly as the module contract designed (SPEC-tla-voting §8).
Queue it on approval; the retained-window creates between FCD and 2.0.0 stay
null (honest).

---

## 5. First harvest = the heal

The 8 MISMATCH + 28 CHAIN_ONLY slots (the ~9 missed user re-votes + all 7
contract voters) are healed by the first harvest: retained chain state carries
their true allocations, and the period stamps back-attribute WHEN (the
key-swap re-votes pin to ~190; the whale's project vote to 191; aDAO's
prop-39 to its execution period). No archive node, no block scanning.

Rollup join contract (consumed by build #2, the rollup rebuilds — defined
here, built there):
- From `vote-state` start: state is attribution ground truth per period;
  events attach tx detail to direct votes (match on wallet+gauge+period).
- Before `vote-state` start: events remain best-effort, labeled as such; the
  first harvest's stamps extend attribution backward exactly as far as
  last-vote stamps allow, no further.
- EVENTS_ONLY slots (events show an allocation, chain empty) resolve via VP
  expiry/withdrawal semantics at rollup time — report, don't over-conclude
  (reconcile spec rule carries over).

---

## 6. Events monthly restructure (rider — MUST land before Batch-3 site wiring)

Per-stream monoliths (`reward-events.json` already 16.6 MB) →
`events/{stream}/{YYYY}/{MM}.json` (D7), each a JSON array in chain order,
month resolved from event timestamp. Zero consumers today = cheapest it will
ever be.

- **One-shot restructure script** (`.github/scripts/tla-voting/
  restructure-events.js` + workflow): reads the four monoliths from the local
  checkout, splits by month, verifies **count identity + tx_hash-set identity
  per stream** before publishing, writes the new tree + updated `index.json`
  (`months_present` per stream), deletes the monoliths in the same commit.
  Container metadata (horizons, scan_complete, known_gaps) lives on in
  heartbeat/index — single source, no duplication into month files.
- **Touches:** org-tla-voting write paths (part of 2.0.0); the seed and
  fcd-fill write paths (updated same pass so a future re-run doesn't resurrect
  monoliths); classifier block diff-verified after (standing rule).
- **Deviation Register row** (TLA-CORE-STORAGE-DESIGN §7): stream subfolders
  within one event product (`events/{stream}/{YYYY}/{MM}.json` vs the plain
  `{YYYY}/{MM}.json` convention) — justified by four streams with independent
  horizons/gaps sharing one product. Register the row the day this is
  approved.
- `rollups.json` and `reconciliation.json` stay where they are (derived/report
  artifacts, not event data).

---

## 7. Reliability (F-checklist mapping)

- **F1** — all_tokens walk uses the proven resilient pager; walker replaces
  tx_search pagination entirely on the events side.
- **F2** — null ≠ [] everywhere: failed `user_info` → `errors[]` + `partial`,
  never an empty record; failed block fetch → no cursor advance.
- **F3** — never-shrink on month-file merges (both products) within covered
  range; restructure aborts on any count/hash-set mismatch.
- **F7** — heartbeat honesty: `partial` on any incomplete harvest or walk;
  `vote_capture.match_rate_pct` is the standing alarm.
- **F8** — per-stream horizons + `known_gaps` unchanged; vote-state gets its
  own `known_gaps` for missed periods; pruned blocks recorded with exact
  bounds (walker D10).

Chain cost/run: hourly walk ≈620 `/block` + a fraction `/block_results`;
weekly harvest ≈700 paced LCD queries. Both within proven envelopes.

---

## 8. Mock gate (binding — before any commit/deploy)

File-based mock runs, stubbed network + publish (main-loop-change law):

1. **Walker:** drive the real run() on stubbed transport — (a) a real retained
   block containing a known direct gauge vote → exactly one typed event,
   txhash matches chain; (b) gate blocks a foreign contract's action; (c)
   budget split across runs, nothing lost, cursor at exact edges; (d) crash
   rewind idempotent; (e) pruned window → exact-bounds gap + cursor jump;
   (f) `deposit_for` + `metadata_changed` fixture → `lock_create` carries
   `token_id`.
2. **Harvest:** fixtures built FROM the real reconciliation universe; assert
   record schema, `voted_this_period` derivation, `post_flip_change` flag,
   (period,wallet) dedup, never-shrink, one stubbed null query → `errors[]` +
   `partial`; `vote_capture` counts reproduce the reconcile classes on a
   mutated fixture (MISMATCH/CHAIN_ONLY/EVENTS_ONLY each forced once).
3. **Restructure:** run the split against the four REAL committed monoliths
   locally; assert Σ monthly == monolith counts and tx_hash sets identical
   per stream; spot-check month boundaries (first/last event of a month).

---

## 9. Build order & verification

1. **Approve this spec** (Camron). Register the §6 deviation row same day.
2. **Restructure one-shot** — mock 3 → dispatch → verify tree + index; seed +
   fcd-fill write paths updated in the same delivery.
3. **org-tla-voting 2.0.0** — walker transport + monthly writes + vote-state
   harvest + token_id promotion + heartbeat sections. Mocks 1–2 → deploy →
   verify banner 2.0.0, first walk advances cursor, `distributions:` step
   unaffected.
4. **First harvest** (next period boundary after deploy, or force-run) — THE
   HEAL. Verify: the 7 contract voters present with true allocations;
   `terra1xn7dl78…` project vote present, stamped 191; aDAO (`terra1sffd4…`)
   present @ ~841k VP × 4 gauges; `vote_capture` classes now fully explained
   (CHAIN_ONLY → 0 against state).
5. **Watch items:** next epoch flip appends period N+1 to vote-state on its
   own (self-heal check `last_harvested_period == current_period`);
   `vote_capture.match_rate_pct` in heartbeat; system-health picks up the new
   product heartbeat (MONITORED entry rider).
6. **Then the approved order resumes:** rollup rebuilds (build #2, on clean
   attribution) → tribute rework (build #3, sharing the state-side
   completeness principle — active-bribes state vs the event stream).
7. Optional non-gating follow-up: FCD re-derive for historical lock
   token_ids (§4).

---

## 10. What this powers / honest limits

Powers (beyond SPEC-tla-voting §7): complete per-period voter ledger incl.
aggregators, DAOs, cross-chain actors; wasted-VP and whale-tracking on true
data; Votion-family voter-class analytics (with address-catalog labels);
"who moved this pool's VP this epoch" — the exact question the LUNA-SOLID
investigation had to answer by hand; a standing capture-integrity alarm.

Cannot power, permanently and honestly: per-period wrapped-voter history
before the first harvest (the chain never emitted it; stamps recover only
each actor's last vote); tx-level detail inside the June 15–22 prune window
(archive-node target, unchanged); intra-period vote sequences for actors who
re-vote within one period (state is last-write; events cover direct voters).

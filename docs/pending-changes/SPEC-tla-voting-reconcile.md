# SPEC — tla-voting reconciliation diagnostic (events ≟ live chain state)

**Status:** ✅ BUILT + MOCK-VERIFIED 2026-07-14 (same session as approval —
investigation, spec, build, and the binding mock gate all done in one pass).
**Mock evidence:** replay ran against the REAL committed vote-events.json
(8,315 events → 747 wallet×gauge slots, 739 non-empty, 214 wallets). Fault
run: fixtures built FROM the real replay, then 1 allocation mutated (+123
bps), 1 wallet's chain state dropped, 1 wallet's query failed, 1 chain-only
voter injected → **10/10 assertions**: counts exactly
{MATCH 731, MISMATCH 1, CHAIN_ONLY 1, EVENTS_ONLY 4}, match_rate 99.19%
computed correctly, status `partial`, the injected diff surfaced in detail,
verdict routed LOSSES. Clean run (no faults): 739/739 MATCH, 100%, status
ok, verdict CLEAN. **Next: Camron dispatches the Action**
(`tla-voting-reconcile.yml`, dry_run=1 first if preferred) — the verdict
gates §6.
**Owner:** tla-voting module · one-shot Action first, core designed to fold
into org-tla-voting as a permanent heartbeat section later.

## 1. Why (what triggered this)

The events heartbeat carries **13 open vote gaps + 10 lock gaps**, most
accrued July 8–14 during normal forward operation (reason: "public-node
tx-index prune: coverage resumes above prior frontier"). Summed, the July
vote gaps span ~66k blocks — the majority of that week is unconfirmed
coverage. Two readings: (a) publicnode's index is spotty and events were
lost, or (b) the pager's frontier bookkeeping records conservative holes
while little was missed (+45 votes/+27 locks that week is a plausible true
rate). **This diagnostic decides which** — and its verdict gates whether
tla-voting needs the block-walker/capture-registry treatment (the tla-flows
Rev C doctrine: backfill engines on forward schedules leak) before the
rollup rebuilds proceed.

## 2. Chain-verified facts the build stands on (read 2026-07-14, do not re-derive)

- **Vote events** (`tla-voting/events/vote-events.json`, container
  `{schemaVersion, builtAt, contract, lastScannedHeight, horizonHeight,
  scan_complete, events:[…]}`): each event =
  `{type:'vote', wallet, gauge, votes:[[poolKey,bps]…], height, timestamp,
  tx_hash, msg_index}`. 8,315 events, 215 distinct wallets, height-sorted.
  **A vote event carries the wallet's FULL allocation for that gauge**
  (bps sum to 10000) → last-event-per-(wallet,gauge) replay = expected
  current chain state. Allocations change ONLY via vote msgs → any
  replay-vs-chain mismatch means a missed event (or replay bug).
- **Chain comparison query (verified in production by member-data 1.1.0):**
  gauge controller `{user_info:{user, time:'next'}}` returns
  `gauge_votes: [{gauge, votes:[[poolKey, weight_bps]…]}]` — directly
  comparable. Parse exactly as `member-data/lib/vp.js` does.
- **Voter universe from chain:** every voter must hold a lock → escrow
  `all_tokens` walk → `lock_info` per token → distinct owners (~250 per
  heartbeat) = the complete possible voter set. A chain owner with a live
  gauge allocation and ZERO vote events = definite gap loss.
- **Lock events:** ALL 1,306 `lock_create` events carry `token_id: null`
  (65 of 325 withdraws too) → per-token identity replay is NOT possible for
  creates. merge/split/migrate/transfer carry ids. canonical: 11,986 true /
  1,626 false (sum canonical===true only). Height-sorted.
  → Locks get COUNT + VP-SUM checks only (honest limit), and a classifier
  refinement is queued: capture the minted token_id from the tx's wasm
  events on create (then identity replay becomes possible).

## 3. The checks

**V — votes (the teeth).** For each wallet in (chain lock-owners ∪ event
wallets): fetch `user_info{user, time:'next'}`; normalize both sides to
poolKey→bps maps (drop zero-bps); compare per gauge. Classes:
- `MATCH`
- `MISMATCH` (both sides have data, allocations differ) — likely missed event
- `CHAIN_ONLY` (chain allocation, no event history for wallet+gauge) —
  strongest gap-loss evidence
- `EVENTS_ONLY` (events show allocation, chain empty) — report, don't
  over-conclude (VP expiry/withdrawal semantics)
Publish `match_rate_pct` + per-class counts + detail list (capped 50,
each: wallet, gauge, last_event_height, diff summary).

**L — locks (informational, honest limits stated).**
- Chain `num_tokens` + full `lock_info` enumeration → Σ(voting_power +
  fixed_amount) vs `total_vamp` (chain-vs-chain sanity; must match ~exactly).
- Event net-count arithmetic (creates + splits − withdraws − merges-burned ±
  migrates) reported WITH the formula and the null-token_id caveat — a
  diagnostic number, not a pass/fail.

**B — bribes (baseline for the tribute rework).** Chain-side active bribes
(probe `{bribes:{…}}` on the incentive manager — shape unverified, treat as
optional/non-fatal, record 'unavailable' honestly if it errors) vs the 172
bribe events. Expected huge mismatch = the ~97%-blindness number, measured.

## 4. Build shape (placement map — binding)

- Script: `tla-core/.github/scripts/tla-voting/reconcile.js` — SELF-CONTAINED,
  Node 18+ builtins only. **Lift verbatim from
  `harvest-distributions.js`:** `httpGetHard` (40s hard deadline),
  `queryContract` (dual-LCD alternate + backoff, FETCH_RETRIES 3, PACE_MS),
  `githubApiRequest`/`publishFile` (GET sha → PUT, 409-retry). Concurrency
  ≤5. NO silent coercions — null ≠ empty; a failed wallet lands in an
  `errors[]` list and flips status `partial`.
- Workflow: `tla-core/.github/workflows/tla-voting-reconcile.yml` —
  workflow_dispatch, own-repo checkout (events files read from the LOCAL
  checkout — free, no API reads), `${{ github.token }}`,
  `permissions: contents: write`, zero secrets, `DRY_RUN=1` input option.
- Output: commit `tla-voting/events/reconciliation.json`
  `{schemaVersion:1, generatedAt, votes:{…}, locks:{…}, bribes:{…},
  errors, status, verdict}` (report artifact — overwrite is fine, it is not
  append data) + a loud log summary. When the section later folds into
  org-tla-voting, `match_rate_pct` goes into the heartbeat and this file
  stays as the detail artifact.
- Chain cost: ~1 num_tokens + ~15 all_tokens pages + ~433 lock_info +
  ~250 user_info + total_vamp ≈ 700 paced queries — fine for an Action.

## 5. Mock gate (binding — before any dispatch)

File-based mock run: the replay half runs against the REAL committed
vote-events.json (deterministic); chain side stubbed with fixtures
constructed FROM the replay output, then 2 wallets mutated to force one
MISMATCH and one CHAIN_ONLY; assert all four classes + match_rate compute
correctly + a stubbed null query flips status partial. Only then commit +
dispatch.

## 6. Verdict → next action (decided in advance)

- **match_rate ≈ 100%** (mismatches explainable): gaps are bookkeeping-
  conservative, no data lost → proceed straight to the events monthly
  restructure, then rollup rebuilds, per the approved order.
- **Real losses found**: the walker/capture-registry fix for tla-voting
  rises above the rollup rebuilds (don't build rollups on a leaking stream);
  scope it as a rider on the Phase-2 capture-registry spec.
Either way: queue the lock-create token_id classifier refinement.

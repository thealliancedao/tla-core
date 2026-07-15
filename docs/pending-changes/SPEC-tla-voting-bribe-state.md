# SPEC — tla-voting bribe-state (build #3): tribute capture rework

**Status:** APPROVED 2026-07-15 · BUILT same day (org-tla-voting 2.2.0,
mock-gated 96/96 on real fixtures — changelog Rev 7) · deploy pending.
Every chain fact below was probe- or FCD-verified 2026-07-15 — see
CHANGES_PENDING item 3 and queries.md Q-IncentiveManager-Bribes.
Build note: D6's briber resolves via each add_bribe event's OWN msg_index →
that message's target (first-msg fallback) — the fixture tx itself carries
two events from two DIFFERENT tribute contracts, so a flat first-msg read
would mis-attribute the second (attribution law). briber_source stays
'msg_target'.
**Ships as:** org-tla-voting **2.2.0** (one rev: bribe-state harvest +
classifier v6 + bribe_capture invariant). NO new crons, NO new Actions.
**Playbook:** the capture fix, third run — state layer for completeness,
events for attribution, state wins.

---

## 0. Locked defaults

- **D1 — the state source (CHAIN-PINNED):** incentive manager
  `{ "bribes": { "period": { "period": N } } }` → `{ buckets: [ { gauge,
  asset(pool), assets: [{info, amount}…] }…] }`. The `period` field is the
  ve3 Time enum (`current|next|last|{time}|{period}`) — NEVER a bare number
  (serde-json-wasm fallback error; cost four probes). `{bribes:{}}` =
  current. **Retention proven to period 100** (12 pools, Sept-2024 era).
- **D2 — genesis walk, in-cron, budgeted:** new product
  `tla-voting/bribe-state/`. First runs walk DOWN from the current period
  with `BRIBE_WALK_BUDGET` (default 30) periods per hourly run until the
  floor; a period returning an error/empty at the bottom sets
  `index.floor_period` honestly (expect ~96, the distributions floor — but
  record what the chain says, not what we expect). Caught up in ~4 runs.
  Cursor: `index.walked_down_to` + `index.last_harvested_period`.
- **D3 — forward cadence:** one harvest per period, same trigger as
  vote-state (distributions head advanced past `last_harvested_period`).
  Piggybacks the existing run; no schedule change.
- **D4 — storage:** monthly files `bribe-state/{YYYY}/{MM}.json` keyed by
  the PERIOD'S epoch end date (from `docs/epoch_1-300_date.json`) — history
  lands in its historical months (unlike vote-state's capturedAt-month,
  which has no backfill; deviation noted here deliberately). Dedup key =
  `period`; never-shrink; plus `index.json` + `heartbeat.json`.
- **D5 — record shape (verbatim insurance):**
  `{ schemaVersion: 1, period, harvested_at, source: 'state-harvest',
     buckets: <chain response VERBATIM> }`. No derived fields in the
  record — totals/USD live in rollups (Layer 3, recomputable).
- **D6 — classifier v6 (attribution layer, surgical):** when a
  manager-touching tx produced NO bribe event from top-level msgs, promote
  the manager's own `wasm {action:'bribe/add_bribe', added:'<denom>:<amt>',
  start, end}` events: type `bribe_add`, `via:'wasm_event'`,
  `briber: <the initiating contract>` (the tx's first msg target;
  `briber_source:'msg_target'`), coins from `added`, `epoch_start`/`epoch_end`
  from start/end, **`pool: null` allowed** (the take-rate add_bribe is
  bucket-aggregated). Pool pairing from same-tx
  `asset/track_bribes_callback {asset, bribe}` ONLY when a single
  unambiguous candidate matches denom+amount; ambiguity stays null
  (honest). FCD census stakes: 2,793 add_bribe events vs 173 captured; 751
  contract-initiated FCD-era txs currently invisible by construction.
- **D7 — bribe_capture invariant (heartbeat):** on each forward harvest,
  event-derived per-period bribe sums vs state buckets → coverage % per
  period. This is a COVERAGE metric, not an alarm — events are structurally
  partial (that's why state exists); the alarm is coverage DROPPING for
  direct-bribe denominators.
- **D8 — queued riders (non-gating):** FCD re-derive with v6 for the 751
  genesis→Jan-2025 contract-initiated txs (attribution-only — state already
  has their totals) · rollups `bribers` section upgrade to consume
  bribe-state (build #3.5, after this ships) — at which point the
  `bribers_coverage_note` blind-spot label finally comes OFF.
- **D9 — mock gate (binding):** R8 walk-down budget/floor/cursor over a
  stubbed chain; R9 forward harvest + dedup + never-shrink + epoch-month
  routing; R10 classifier v6 on REAL FCD tx 69D072693314 (two add_bribe
  events → two bribe events, briber = tribute contract, ASTRO amounts
  226225967 + 447102559, pool null or paired) + regression: direct-bribe
  classification unchanged on the T1 sample; R11 bribe_capture coverage
  math on a crafted period; R12 verbatim-retention (record.buckets deep-
  equals the stubbed chain response).

## 1. Why (one paragraph)

The committed bribe stream holds 173 events; the manager's own books hold
thousands — the take-rate tribute flow (four bucket contracts calling
add_bribe internally) is invisible to message-level classification by
construction, and the 2025-01→2026-06 capture hole swallowed everything
else. The manager retains its complete per-period, per-pool, per-denom
ledger and answers for period 100 today: ~100 queries recover the entire
tribute history of TLA, including the hole, from state — the same move that
healed the vote record. Events remain the who-paid layer; v6 makes them see
the contract-initiated 97%.

## 2. Build mechanics

`lib/bribe-state.js` (vote-state's structure: injected publishFile/
apiGetJson, CH-stubbed chain access via the same queryContract lift, PACE
150ms / CONC ≤5). Wired into run() after vote-state; failures abort this
step only. Classifier v6 = surgical block edit (banner v5→v6 + one
extractor + one hook in classifyIncentiveTxs), fidelity machine-verified as
always. Heartbeat gains `bribe_state` + `bribe_capture` sections. VERSION
2.2.0; README + changelog Rev 7 ride the delivery.

## 3. Post-deploy verify

Walk-down completes across ~4 hourly runs → `floor_period` recorded; spot
period 100 record deep-equals today's probe paste; forward: the next flip
appends the new period; a known take-rate tx's v6 event carries the tribute
contract as briber; rollups build #3.5 then consumes bribe-state and the
blind-spot label retires.

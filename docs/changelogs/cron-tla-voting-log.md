# cron-tla-voting — changelog

## org-tla-voting-2.5.0 — 2026-08-25 — pd-bribe-fit duty

`lib/pd-bribe-fit.js`: for every verified PD batch, allocation per gauge vs
every active Astroport TLA pool's rank by trading efficiency (vol ÷ liq,
weekly-avg) and by volume at the epoch before the window and per epoch
through it; qualified-not-bribed; VP / bucket share / payout share per epoch.
Publishes `pd-bribes/fit/current.json` + write-once `fit/batches/<prop>.json`.
Gate mock-run-pd-fit.js 10/10 (prop 250: 56% to top-half, PAXG-WBTC 16/19;
prop 253: 72%; LUNA-WBTC #3→#9 drift). First run: 21 batches.


---

## 2026-08-09 — E2 COMPLETE (§10 gate 7/7) + registry-backfill terminal-state fixes

Walk reached final height 21,481,530 a day early; registry confirmed already
at full depth from prior E2 passes. Four fixes shipped to
registry-backfill.js while closing: (1) staged-livelock — done=true entries
now satisfy the staged counter (16 zero-window hops observed before fix);
(2) attributed_total fixtures support window_to (pd-prop-247 frozen at its
2026-08-02 measurement, 389,721.856283, after the gate correctly caught a NEW
41,298.31-LUNA PD placement executed 09:29Z the same morning — capture and
pd-bribes agreed to the microLUNA, 469,175.268802 all-time / 21 placements);
(3) gate failure writes status 'halt' (workflow stops — deterministic
failures no longer self-chain); (4) success writes 'complete' (no victory-lap
re-dispatch). Final gate: both 2025-08-26 bribes VERBATIM, prop-250 = 11 legs
38,155.099199, prop-247 = 178 events exact, solid-june + flows-v3 ×3 OK.
Lesson recorded: workflow runs pin the commit AT DISPATCH — after code fixes,
cancel all queued Bot successors and dispatch fresh.
Voting event capture: votes, locks, bribes, rewards.
Seed: `tla-core/.github/scripts/tla-voting/` (Action) · Forward: `platform-crons/tla-voting/` (Render `org-tla-voting`)
Spec: `docs/pending-changes/SPEC-tla-voting.md`

---

# Rev 12 — 2026-08-02 — E1 GRANTED: DEEP WALK LAUNCHED (full depth, community archive endpoint) — completeness review closed first

**The hole is draining.** A community node operator granted archive access
(endpoint held in repo secrets ONLY, per their preference — never committed;
`ARCHIVE_LCD`/`ARCHIVE_RPC`, walk rate set via new `req_delay_ms` workflow
input). First contact confirmed live: action-filtered queries SUPPORTED (all
64 pair walks GO) and the manager pulling real txs from block 13,736,598 —
Jan 2025, data no public node has served in a year. Early tallies mid-walk:
6,540 bribes / 10,016 rewards / 2,410 votes and climbing; self-chain doing
the rest unattended.

**Pre-launch completeness review (walk-once discipline, DeFi_Patriot-driven):**
project-lens + cautious-investor-lens audit against docs/ecosystem-knowledge
found three gaps — (A) **historical STATE sampler** (hub exchange-rate
history for correct LST USD-at-time cost basis; TVL/VP/APY curves to
genesis) — gated on archive-STATE support, probe via preflight `state_depth`
during the access window; partially mitigated already: pair-swap samples
give a market-implied LST↔LUNA ratio series through the hole automatically;
(B) **27 SkeletonSwap tla_relevant pairs** — ADDED to the registry pre-walk
(81 entries total), riding the same pass full-depth, classifier defensive on
the Astroport-family fork shapes; (C) **Credia leverage layer** (accepts TLA
ampLP collateral → borrow/repay/liquidation history = the risk signal) —
scoped, next build. Optional D (DAODAO governance events) parked.

**Final shakedown before first contact:** full-depth E2E on the EXACT
dispatch bytes (81-entry registry, mock at the corrected 11-leg PD) ran to
`✅ BACKFILL COMPLETE` — all 8 fixtures green, §10 pair recovered VERBATIM
with fee_funds doctrine intact, pair-block guard proven. Every historical
bug class re-verified fixed in one pass. Zero code changes were needed
against the live node.

---

# Rev 11 — 2026-08-01 — STAGED HARVEST COMPLETE 54/54 (Polkachu, free): walker era + hole tail recovered; PD corrected to chain truth; deep remainder honestly parked

**E1 resolved without archive access, without asking anyone** — the staged
multi-source doctrine, again: preflight's new capability matrix + index-floor
BISECT measured Polkachu's free tx-event index to block **21,294,875**
(~Jun 2 2026), and staged mode (`WALK_FLOOR`) harvested everything above it.
Transport saga en route (each fix permanent): redirect-following (TFL fronts
301), 6-check capability matrix incl. §10-hash depth probe, lenient dialect
probe, adaptive page-size (Polkachu's 10MB gRPC cap on event-heavy zapper
pages), 10-attempt jittered push retry + every-3rd-window checkpoints (the
hourly crons' publish races), per-entry error containment + **self-chaining
workflow** (re-dispatches itself until the pass completes — kick once).
A starscream (Chainscope GraphQL) alternate transport was also built and
live-probe-verified (gate 9 on a real captured response) — held in reserve,
unused without their blessing.

**Harvested (all committed, all merge-law-verified):** bribes 3,014→3,464 ·
+63 votes / +59 locks / +214 rewards · the recorded Jun-15→22 prune gaps
HEALED (62 votes recovered inside) · **flows fully at v3** (4,246 records:
walker era re-classified + the Jul-23→v3-flip v2 seam of 776 records sealed
in a follow-up staged pass; all 3 test-tx flows_record fixtures VERBATIM) ·
NEW STREAMS BORN: dex-liquidity 5,319 both-sides records on 22 pairs ·
reserve-implied price series 509 daily samples / 47 days · votion 164 events
with 27 vtoken↔LST rate samples · 38 NFT transfers · Solid ×3 1M-CAPA June
fixtures byte-exact.

**CORRECTION (chain truth, DeFi_Patriot chainscope-recounted):** PD prop 250
(tx 402AE7B1…) = **ELEVEN add_bribe legs, gross 38,155.099199 LUNA**. The
previously "locked" 10 / 34,763.534826-net figure (incl. in Rev 9's fixture
description) was a manual tally that collapsed the two identical
3,391.564373 legs; collision-aware promotion is what kept them both.
Fixtures amended to truth. PD lands on the bribe board at the next rollup
rebuild. Prop 247 executed BELOW the staged floor — deep-remainder item.

**Honestly open (machine-recorded per registry entry as staged_floor_done
with done:false):** the deep remainder 13,736,597→21,294,875 (Jan 2025→Jun
2026) — §10's two bribes, prop 247, pre-June Votion history. Paths: Eris ask
pending (they run phoenix-rpc.erisprotocol.com — probe queued) · sovereign
node spec queued (tx-index-only sync, state pruning hard — no true archive
needed). §10 fixtures evaluate on eventual FULL-depth completion.

---

# Rev 10 — 2026-07-31 — E2 EXTENSIONS BUILT: full-picture P&L capture (flows v3 · Votion · pairs · NFT provenance · tax-grade cost basis) — gated 8/8

**SPEC-registry-extensions-pnl v2 executed.** The E2 walk now recovers the
COMPLETE member picture in the same archive pass (walk-once):

- **<<FLOWS CLASSIFIER v3>>** (org-tla-flows-3.0.0): multi-flow txs captured
  (`flows[]` — the v2 one-flow-per-tx bug DeFi_Patriot's live 8-tx test
  matrix exposed on tx DCA53591: a bucket→vault migration whose amp re-stake
  v2 silently dropped); amp LP↔amplp rate fields (bond_amount/bond_share/
  adjusted on stake, tf_burn-derived on unstake) = the MEASURED
  compounding-yield curve, no pro-rating ever; pair provide/withdraw
  both-sides truth + zapper exit assets riding the same tx. Every v2
  top-level field byte-preserved; schema-upgrade re-walk repairs all
  committed records in place. Legacy fill-script copies FROZEN at v2 (noted).
- **aux-classifiers.js** (tla-flows/lib, one home): classifyVotionTx v1
  (defensive raw-capture — the archive leg of SPEC-votion-capture),
  classifyPairLiquidityTx (provide/withdraw + swap price samples → daily
  reserve-implied series, CAPA/SOLID price-hole fill), classifyNftTx
  (extends the EXECUTED adao-provenance past the FCD freeze + lock NFTs on
  the escrow corpus), shared mergeKeyed law.
- **Registry v2: 54 entries** (+6 Votion vaults, +37 tla_relevant Astroport
  pairs [action-filter-gated, preflight-probed], +ADAO collection; escrow
  gains nft_transfers). New homes: votion/events, dex-liquidity/events,
  nfts/adao/transfers, price-history/reserve-implied — all monthly arrays,
  mergeKeyed (schema-upgrade + never-shrink).
- **Fixtures v2 (8):** §10 pair + PD ×2 + Solid + THREE flows_record
  post-walk asserts from the live test matrix (multi-flow, provide
  both-sides, amp burn + refund).
- **Gates 8/8** on real committed data + real-tx crafted shapes; basis labels
  and version-agnostic self-gates included.
- **Queued from this arc:** walker WATCH forward rider (adopts
  aux-classifiers — decided, small build), tax-prep CSV export + "My TLA
  Report" + hold-LUNA benchmark (spec §6b/6c), zap-route simulator (has a
  measured ground-truth pair now).

---

# Rev 9 — 2026-07-31 — E2 BUILT: registry archive backfill (registry-backfill.js) — gated + E2E-mock-verified, awaiting E1 endpoint

**The hole-closing job exists.** `tla-core/.github/scripts/tla-voting/registry-backfill.js`
+ workflow `tla-voting-registry-backfill.yml` (SPEC-capture-registry-backfill
§§2–8, §10): registry-driven archive walk of all 10 capture-registry
contracts, recovering bribes+votes+locks+rewards+flows(v2) in one pass via
the LIVE platform-crons classifiers (dual checkout, no third copy — the
fcd-rederive precedent). Deploy-ready TODAY: no archive endpoint → clean
"E1 pending" exit; set secret `ARCHIVE_LCD` when E1 lands, then
preflight → walk.

- **Targets (recorded into the registry as `target_height`/`target_basis`):**
  voting entries walk to the committed voting cursor — full walker-era
  re-derive at v6.1, dedup-safe, covering the hole AND the pre-v6.1 stretch
  where governance bribes were walked but never promoted (PD props 250/247
  live there — this is what puts PD on the bribe board). Flows entries walk
  to the derived v2-deploy head (earliest schemaVersion≥2 record above the
  hole). Floors honor per-stream `known_gaps` left edges (the bribes gap
  starts 1,214 blocks BELOW the registry floor — honored).
- **Resumable:** per-window git checkpoint commits (cursor + months + report);
  TIME_BUDGET_MIN clean stop; once `done:true`, done (extensions = registry
  edit + re-run). Gap-floor lowering applies once (`walk_floor_applied`).
- **§10 completion gate:** `tla-voting/backfill-fixtures.json` — DeFi_Patriot's
  two hole-era bribes asserted VERBATIM (full hashes, exact coins/pool/span,
  fee_funds doctrine: the 10-LUNA fee must stay OUT of coins), PD prop 250
  (10 events, 34,763,534,826 uluna, dao_attr), prop 247 (37,912.49 LUNA
  attributed total), Solid ×3 1M-CAPA June 2026. Any miss fails the job loud.
- **Census rider:** `unknown_manager_wasm` histogram over the whole archive
  corpus lands in `tla-voting/backfill-report.json` — the §5/E0c refund-event
  enumeration comes free with the walk; classifier learns it → re-run
  backfills refunds (idempotence makes that safe).
- **Gated:** MODE=gate 4/4 on real committed data (PD self-gate, flows-v2
  self-gate, real-month re-merge idempotence + prior-verbatim on 844-event
  2024/11 and 10,341-record flows 2024/12, fixture-matcher mutation test) ·
  full E2E walk against a mock archive LCD: all 5 fixtures recovered
  VERBATIM into the real committed tree, 2026/07's 203 prior events
  byte-identical, index recount 3,014→3,033, second run adds 0.

**Also this Rev:** spec §10 COMMITTED (delivered 07-30 but fell off the
commit checklist — caught by the end-of-session commit audit; the fixtures
now live in both the spec and the machine-readable gate file).

---

# Rev 8 — 2026-07-15 — 2.3.0 BUILT: rollups schema 5 (build #3.5) — the blind spot becomes a number. Mock-gated 108/108, DEPLOY PENDING

**Build #3.5 lands the same evening as build #3** (2.2.0's first live run
confirmed clean at 22:49Z — forward grabbed period 193, walk banked 30 down
to 163). Deploy: commit the 2.3.0 folder over 2.2.0 — code-only, no
restructure, no schedule/env change. Rollups rebuild after harvests, so
schema 5 first materializes on Sunday's flip — by then the walk-down will
have certified the floor, so the ledger self-activates with full history
behind it (grace path covers the gap if not: a declared `awaiting` status,
never a failure).

**What schema 5 is — `bribe_ledger` joins the two sources by what each can
know:**
- **state** — the manager's verbatim per-period, per-denom totals from
  bribe-state (complete back to the floor). Canonicalized locally
  (canonicalOfInfo — a 6-line mirror of normalizeAssetId; duplicated to
  avoid a circular require, rollups is required BY index.js).
- **attributed** — event-derived amounts (direct bribes + v6 promoted).
  Events remain the ONLY per-briber source: the chain ledger knows pools
  and amounts, not who paid.
- **unattributed** — state − attributed per period per denom, clamped ≥ 0
  with any surplus DECLARED (`event_surplus`), never negated away.
- **THE NO-DIVISION LAW (Rev 7, now load-bearing):** an event spanning
  multiple epochs counts in FULL toward `lifetime` sums only — never split
  across per-period rows (bribe_capture's linear split stays a heartbeat
  coverage metric, not ledger math). Single-period events for periods the
  harvest hasn't reached (ahead of head or below floor) land in
  `events_outside_state` — declared, never skewing a remainder.
- **`bribers[]` gains `via` counts** (msg vs wasm_event) — the direct/
  promoted split visible per briber.
- **`bribers_coverage_note` RETIRED** — the "~97% blind" label is replaced
  by measured remainders that shrink as v6 captures forward. Schema bumped
  4→5 because a field left the file; nothing consumes rollups yet, so the
  bump is free today and honest forever.
- `sources` gains `bribe_state_through_period` + `bribe_state_floor`.

**Mock gate 108/108:** R7 rewritten for schema 5 (note gone, via counts) +
R13a inside the full real-fixture build (period-194 state 200M / attributed
180M / unattributed 20M measured; state-only denom fully unattributed —
canonicalOfInfo token branch; spanning event in lifetime FULL, absent from
per-period rows; ahead-of-head event → events_outside_state) + R13 edges
(absent index → awaiting grace; duplicate period record ignored; surplus
clamped to 0 with event_surplus 50 declared, lifetime mirrors). All 96 prior
assertions green.

**Post-deploy verify:** Sunday's flip rebuilds rollups → rollups.json shows
schemaVersion 5, bribe_ledger.floor_period matches the certificate,
period-193/194 rows carry state totals with the week's direct bribes
attributed. The v6-promoted take-rate events should surface as
`via.wasm_event` counts under the four tribute contracts. Queued (D8,
unchanged): FCD re-derive for the 751 historical contract-initiated txs —
when it lands, historical unattributed remainders shrink retroactively on
the next rollup rebuild; nothing else to touch.

---

# Rev 7 — 2026-07-15 — 2.2.0 BUILT: bribe-state harvest + classifier v6 + lock-state rider — mock-gated 96/96, DEPLOY PENDING

**Build #3 (SPEC-tla-voting-bribe-state, approved 2026-07-15) is BUILT and
mock-gated — 96/96 on real fixtures.** Deploy is trivial: commit the 2.2.0
folder (no restructure, no schedule change, no new env required —
`BRIBE_WALK_BUDGET` defaults to 30). The walk-down self-starts on the first
hourly run and reaches the floor in ~4 runs; the Sunday 2026-07-19 flip
becomes a QUADRUPLE self-heal test: distributions appends 194 → vote-state
harvests 194 (now retaining lock state) → rollups rebuilds → bribe-state
forward-harvests 194 with its first bribe_capture.

**Why (the one paragraph):** the committed bribe stream holds 173 events; the
manager's own books hold thousands — the take-rate tribute flow (four bucket
contracts calling add_bribe internally) is invisible to message-level
classification BY CONSTRUCTION (FCD census: 2,793 add_bribe events vs 173
captured; 751 FCD-era txs contract-initiated), and the 2025-01→2026-06
capture hole swallowed everything else. The manager retains its complete
per-period, per-pool, per-denom ledger — retention PROVEN to period 100 —
so ~100 queries recover the entire tribute history of TLA, hole included.
The capture-fix playbook, third run: state for completeness, events for
attribution, state wins.

**What 2.2.0 is:**
- **`bribe-state/` product** (`lib/bribe-state.js`, vote-state's structure —
  injected publishFile/apiGetJson, CH-stubbed chain access, PACE 150ms):
  - **D1 query (CHAIN-PINNED):** `{bribes:{period:{period:N}}}` — the ve3
    Time enum, NEVER a bare number (queries.md Q-IncentiveManager-Bribes).
  - **D2 walk-down:** budgeted in-cron genesis capture (`BRIBE_WALK_BUDGET`
    30/run, hourly) from the current period until the floor CERTIFIES —
    FLOOR_CONFIRM=3 consecutive floor-shaped responses (the distributions
    register rule; transient failures never masquerade as the floor;
    same-run confirm probes, no cross-run counter state). Cursor:
    `walked_down_to` + `last_harvested_period`; floor recorded as the chain
    says it, never presumed (expect ≈96).
  - **D3 forward:** one harvest per period on the distributions-head
    trigger, self-healing across missed flips (retained state = lateness
    free).
  - **D4 storage:** monthly `{YYYY}/{MM}.json` keyed by the PERIOD'S EPOCH
    END DATE (docs/epoch_1-300_date.json) — history lands in its historical
    months (deliberate, documented deviation from vote-state's
    capturedAt-month, which has no backfill). Dedup on period; never-shrink;
    corrupt months refused, cursor fields HELD.
  - **D5 record:** `{schemaVersion, period, harvested_at, source, buckets:
    <chain VERBATIM>}` — machine-verified in the gate (R12: byte-equal
    buckets, EXACTLY the five fields, zero derived).
  - **D7 bribe_capture:** event-derived per-period sums (linear apportion
    across each event's native epoch range — the coverage metric ONLY;
    streams/rollups never divide raw amounts) vs state buckets → per-denom
    coverage % + mean, in both heartbeats. A COVERAGE metric, not an alarm.
- **`<<CLASSIFIER v6>>`** = v5 + the contract-bribe promotion (fidelity
  machine-verified: banner + extractors + one bracketed hook only). When a
  manager-touching tx produced NO bribe event from top-level msgs, the
  manager's own `bribe/add_bribe` wasm events are promoted (`via:
  'wasm_event'`, coins from `added`, epoch range from start/end). **Briber
  resolved via each event's OWN msg_index → that message's target**
  (msg_index is a property on FCD-trimmed events, an attribute on live LCD
  events; first-msg-target fallback) — one precision refinement inside D6's
  "initiating contract" intent, forced by the fixture itself: tx
  `69D072693314…` carries TWO add_bribe events from TWO different tribute
  contracts (msg 1 → terra1v399…, msg 3 → terra1awq…); a flat first-msg
  attribution would have been factually wrong for the second (attribution
  law: strictly factual). `briber_source:'msg_target'` either way. Pool
  pairing from same-tx `track_bribes_callback` only on a single unambiguous
  denom+amount match — the add is bucket-aggregated, ambiguity stays null
  (the real fixture pairs nothing: 226225967/447102559 vs callback
  82285371/176842225 — aggregates ≠ per-pool legs; state has the truth).
  Direct bribes never reach the hook — v3–v5 behavior unchanged (T1 parity
  + explicit regression both green).
- **Lock-state retention rider** (CHANGES_PENDING item 3, folded in free):
  vote-state's enumeration already pays for `lock_info` on all ~433 locks
  weekly — 2.2.0 retains the analytic fields as ONE record per period in
  `vote-state/locks/{YYYY}/{MM}.json` (per lock: end VERBATIM
  permanent|{period}, underlying_amount, asset, amount, start, coefficient,
  slope, voting_power, fixed_amount). Unlocks: avg lock duration,
  permanent-vs-timed split, per-lock sizes, LST composition of total VP.
  Soft-fail (surfaces as heartbeat `partial`, never blocks the harvest);
  full harvests only. The gate caught a real ordering bug here pre-delivery
  (snapshot built before the enumeration-abort check — T13 flagged it,
  fixed, re-gated).
- **Harness fix:** mock-run's committed-fixture reader now reads the MONTHLY
  stream layout (the old monolith `vote-events.json` reader predated the
  2.0.0 restructure and could no longer run against the live repo).

**Mock gate (96/96):** all 2.0.0/2.1.0 tests (T1–T13, R1–R7) still green +
R8 walk-down budget/floor-confirm/cursor across 4 runs + R9 forward
self-heal/dedup/epoch-END-month routing (period 195→2026/07, 196-197→
2026/08; period-100 spot-check against the real epoch table → 2024/09) +
corrupt-month refusal with cursor HELD + R10 classifier v6 on the REAL FCD
take-rate tx (two promoted events, exact amounts, per-event tribute-contract
bribers, pool null; crafted pairing + ambiguity cases; direct-bribe
regression zero-promoted) + R11 coverage math exact (80% / 0% blind-spot /
events-only listed / mean 40%) + R12 verbatim retention + T10 lock-rider
asserts (verbatim end shapes, dedup, index/heartbeat surfacing).

**Post-deploy verify (spec §3):** walk-down completes across ~4 hourly runs
→ `floor_period` recorded (expect 96 — but trust the certificate); spot the
period-100 record against today's probe paste (deep-equal buckets); Sunday
flip appends period 194 forward with a first bribe_capture; a known
take-rate tx's v6 event carries the tribute contract as briber; then build
#3.5 (rollups `bribers` consumes bribe-state) retires the
`bribers_coverage_note` blind-spot label. Queued riders (D8, non-gating):
FCD re-derive with v6 for the 751 genesis→Jan-2025 contract-initiated txs
(attribution-only — state already has their totals).

---

# Rev 6 — 2026-07-15 — 2.1.0 SHIPPED: rollups schema 4 + classifier v5 — DEPLOYED + VERIFIED same day

**LIVE VERIFICATION (2026-07-15T16:11, FORCE_ROLLUPS first build):** 262
voters (203 state + 59 event-only historical — the union working), 14
bribers, built on period 193. Committed rollups.json verified: **Votion
arbLUNA-MAX ranked #1 (6.47M VP, visibility none)** — a wallet schema 3
couldn't see; whale #2 (6.18M, full); a third contract-path voter #3
(2.28M, none); aDAO rank 7 with 4 stamped gauges. Three-number model live:
top claimer shows $3,541.14 usd_at_claim vs $250.80 at-build (60,797 ASTRO:
$2,196 when claimed → $17 today) — the sold-vs-held story no other surface
can tell. Zero-claim honesty platform-wide: 1,816 claim txs, 1,082 paid.
1,177 unpriced entries (early-era CAPA/ROAR claims before price-history
coverage) tracked in `unpriced[]` — NOT counted as $0 income; they price
themselves when the price backfill extends (rider queued). FORCE_ROLLUPS
env removed post-verify; harvest runs own the rebuild. Sunday 2026-07-19 is
now a TRIPLE self-heal test: distributions appends 194 → vote-state
harvests 194 → rollups rebuilds on both.

**Build #2 (SPEC-tla-voting-rollups, approved same day) is BUILT and
mock-gated — 63/63 on real fixtures.** Deploy is trivial: commit the 2.1.0
folder (no restructure, no schedule change); first rollup build via
`FORCE_ROLLUPS=1` env + trigger run (then remove the env), or wait for the
Sunday-flip harvest.

**What 2.1.0 is:**
- **rollups.json schema 4** (`lib/rollups.js`, rebuilt on harvest runs): the
  HONEST MERGE — voters from vote-state ∪ events, state wins,
  `events_visibility: full|none` flags contract-path voters (the Votion
  vaults finally rank; arbLUNA-MAX is #1 by VP). Per voter: stamped state,
  event vote detail, canonical-only lock net-by-denom, and the
  **three-number claims model** (DeFi Patriot, D4): raw amount / `usd_at_claim`
  ("if sold when claimed", priced per-claim from price-history) /
  `usd_at_build` (fallback; the site computes live today-value as amount ×
  current price). Pending recipe pinned: live earned = claims.totals +
  `user_claimable` + `user_pending_rebase` (display-side).
- **Honesty ledger IN the file:** `claim_coverage` declares the
  2025-01-08→2026-06-14 reward-capture hole (archive backfill queued);
  `bribers_coverage_note` declares the ~97% tribute blind spot (build #3);
  `claim_tx_count` vs `paid_claim_count` splits real zero-claims (chain
  fact: 99% of FCD-era claim_rebase txs paid nothing); unjoinable denoms →
  `unpriced[]`, never dropped. Pots RETIRED to distributions/history.json —
  one truth per fact.
- **`<<CLASSIFIER v5>>`** = v4 + the rebase-income promotion (fidelity
  machine-verified: banner + one rewritten push only). The gauge's own
  `gauge/claim_rebase` wasm event carries `rebase_amount` + `user` — proven
  by a LIVE probe (tx 9B2DD008…, Votion vault compound, 13,966,383 ampLUNA;
  trimmed real fixture ships at `fixtures/compound_probe.json`). compound
  events get coins at the GAUGE boundary (pre-swap, pre-wrapper-fee);
  claim_rebase gets the same backstop; true zero-claims stay null.
  Forward-only; historical compound fill queued (non-gating).
- **Discoveries banked along the way:** vote events carry no epoch field in
  the monthly era (rollup derives it from timestamps via the epoch resolver);
  lock events carry `asset` (denom string) + `amount` (number) separately;
  withdraws carry amount only — denom is the escrow underlying (ampLUNA,
  system constant).

**Mock gate (63/63):** all 2.0.0 tests (T1–T13) still green + R5 classifier
v5 on the REAL probe tx (13,966,383 filled, `coins_source: gauge_event`; v4
token_id 748 regression clean; zero-claim stays null) + R1–R4/R6/R7 rollups
on the REAL committed vote-state month (Votion #1 with visibility none, aDAO
4-gauge state present, three-number math exact, hole declared,
canonical-only sums, pots retired, briber label present).

**Post-deploy verify (spec §5):** FORCE_ROLLUPS build → 205+ voters (union >
state-only), Votion arbLUNA-MAX #1; spot a wallet's claimed totals vs an
independent sum over committed streams; then confirm the Sunday harvest run
rebuilds naturally.

---

# Rev 5 — 2026-07-15 — 2.0.0 SHIPPED: walker transport, vote-state harvest, classifier v4 — DEPLOYED + HEAL VERIFIED same day

**LIVE VERIFICATION (2026-07-15, first run on the hourly schedule):** cursor
migrated from the 1.x min-frontier (21,905,081); walker re-covered old gauge
ground and the dedup absorbed it (1 gated tx → 8 reward events → zero added —
crash-rewind idempotence proven on real chain data); distributions up to date;
**first harvest = the heal: period 193 — 433 locks, 203 owners, 203 wallets,
19 voted, 0 pending.** Committed `vote-state/2026/07.json` verified: aDAO
(terra1sffd4…) 841,486.80 VP × 4 gauges stamped 193 (the prop-39 re-vote,
matching the Rev 4 tx dump exactly); the 5.97M-VP whale's silently-dropped
project vote BACK-ATTRIBUTED stamped 191; Votion arbLUNA-MAX 6.47M VP (the
single largest voter in TLA) + ampLUNA-MAX 1.18M VP, full 4-gauge allocations.
vote_capture {MATCH 625, MISMATCH 8, CHAIN_ONLY 28, EVENTS_ONLY 0}, match_rate
94.55% — MISMATCH/CHAIN_ONLY identical to the Rev 4 reconciliation.
Σ vp.total 28.03M vs system ~27.98M (measurement drift; VP law holds).
**Period-stamp field PINNED: it is `period`** (raw entries `{gauge, period,
votes}`) — recorded in queries.md; the pre-deploy probe became unnecessary.
**Interpretation law: CHAIN_ONLY ≈ 28 is the permanent healthy baseline**
(contract-path voters never have events); the alarm is growth beyond the
known contract-voter set. Watches: catch-up clears over ~5 hourly runs;
Sunday 2026-07-19 flip must self-append period 194 to BOTH distributions and
vote-state (double self-heal test).

**The capture fix (SPEC-tla-voting-capture-fix, approved same day) is BUILT and
mock-gated — 44/44 assertions on REAL fixtures.** Deploy rides the one-sitting
cutover: suspend Render → dispatch tla-voting-restructure (committed 2026-07-15,
mock-passed against the real monoliths: 62 month files, byte-identity all four
streams) → push platform-crons 2.0.0 → schedule `0 */6 * * *` → `0 * * * *` →
resume.

**What 2.0.0 is:**
- **Walker transport** (Rev C lift from tla-flows): walk blocks → gate on the
  3 governance contracts → fetch gated txs DECODED BY HASH from the LCD (hours
  old at most, provably existing) → the classifiers' input shape unchanged.
  Cursor schema 4 (`last_block`; 1.x per-contract cursor auto-migrates via
  min-frontier). Pruned ranges → exact-bounds `known_gaps_walker`. The tx_search
  pager is deleted from the cron (backfill tooling only, per walker doctrine).
- **Monthly per-stream writes** — the cron REFUSES the monolith layout (index
  schemaVersion ≥ 4 required), making the deploy sequencing self-enforcing.
- **vote-state harvest** (`lib/vote-state.js`, product
  `tla-voting/vote-state/`): once per period, enumerate lock owners fresh ∪
  wallets_seen → `user_info` each → records with period stamps,
  `voted_this_period`, `post_flip_change`, `vp.total = fixed + boost`, and
  `raw_gauge_votes` VERBATIM (stamp-field insurance — the stamp's exact field
  name still needs one browser probe to pin; parser is tolerant meanwhile).
  Completion mode: failed wallets → `pending_wallets`, period advances only
  when clean. Enumeration failure aborts the harvest whole. **The first live
  harvest IS the heal** of the Rev 4 misses (whale vote period 191, aDAO's
  prop-39 re-vote, the Votion vaults, Polytone — all captured with stamps).
- **`<<CLASSIFIER v4>>`** = v3 verbatim + lock token_id promotion (fidelity
  machine-verified: only banner/marker lines differ). Fills null token_ids from
  the escrow's own wasm events — CW721 `mint` on creates (a BETTER source than
  the Rev 4 metadata_changed note; chain-proven on FCD tx 09A186D9… →
  token_id 542), metadata events on deposit_for/extends; owner-matched,
  ambiguity stays null. **Mock result on the real FCD sample: all 89
  committed-null creates fill, field parity 89/89 otherwise.** v4's sole live
  home is the cron (seed/fcd-fill layout-guarded, keep v3).
- **`vote_capture` invariant** in the heartbeat (the reconcile §4 fold-in):
  events replay vs the same user_info results → 4-class counts + match_rate,
  every harvest. CHAIN_ONLY/EVENTS_ONLY trending nonzero = capture regression
  alarm.
- **rollups.json FROZEN** — mis-attributed by exactly the contract-path actors;
  build #2 (rollup rebuilds) recomputes on events + vote-state.

**Mock gate (binding, passed 2026-07-15):** T1 classifier parity 25/25 votes +
10/10 bribes vs committed events · T2 token_id 89/89 · T3 walker e2e incl.
crash-rewind idempotence · T4 budget split, nothing lost · T5 decode-fail holds
cursor then heals · T6 pruned exact-bounds · T7 corrupt month refused · T8 1.x
cursor migration · T9 monolith-layout refusal · T10–T13 vote-state harvest /
pending completion / vote_capture classes / enumeration abort.

**Post-deploy verify (spec §9):** first walk advances the migrated cursor;
first harvest lands `vote-state/{YYYY}/{MM}.json` with the 7 contract voters
present (aDAO terra1sffd4… @ ~841k VP × 4 gauges, the 5.97M-VP whale's project
vote stamped 191); heartbeat `vote_capture` explains all prior CHAIN_ONLY
slots; probe pins the period-stamp field name (queue item); Sunday flip
self-appends period 194 to BOTH distributions and vote-state.

---

# Rev 4 — 2026-07-14 (late) — reconciliation verdict: losses confirmed, capture engine indicted, actors identified

**The diagnostic ran clean** (status ok, 0 query errors, 238-wallet universe,
767 slots judged): MATCH 727 · MISMATCH 8 · CHAIN_ONLY 28 · EVENTS_ONLY 4 →
match_rate 94.78%. Report: `tla-voting/events/reconciliation.json`. The VP
invariant is PERFECT: Σ(lock vp+fixed) over all 433 locks = `total_vamp.vp`
= 27,975,687.10 exactly (Δ 0.0000%). Money math is sound; the who-voted-what
ledger is not. Every claim below was then verified from independent angles
(committed data + retained chain state + browser probes) before acceptance.

**Finding 1 — declared-gap losses (real, honest, small).** 7 of 8 mismatches
are single-leg key-swaps (same bps, old pool key → new pool key). Verified
NOT a gauge-side remap: the old keys are still live on chain in up to 134
MATCHED slots — allocations only move via vote txs, so these were user
re-votes we missed. Chain self-timestamping (the gauge stamps each
gauge_votes entry with its vote PERIOD — discovered via probes, now doctrine)
pins them to period ~190, the declared June 15–22 prune window. Camera off,
and it said so.

**Finding 2 — SILENT loss in a claimed-covered window (proven, material).**
Wallet `terra1xn7dl78…` voted stable AND project in period 191 (chain-stamped).
We captured its stable vote (h 21,672,945, Jun 28) — inside a window where
the pager captured 42 events and claimed coverage — and never captured its
project vote. No gap recorded. The pager loses events even where it claims
coverage. Materiality: this wallet went 0 → **~5.97M VP** (5.375M boost +
0.597M fixed) between periods 189→191 — a brand-new ~21%-of-system whale,
and the silently-dropped vote governs its entire project-bucket allocation.

**Finding 3 — systematic blindness to contract-path votes (the big one).**
7 voting CONTRACTS hold live gauge allocations; 4 have zero footprint in
8,315 captured events (truly invisible), 3 appear mis-attributed to the
triggering signer (fingerprint-proven: e.g. wallet terra1alqg9… carries
allocations identical at 4/4 gauges to contract terra13aae4…). Identified
via contract_info probes:
- **VOTION vote-aggregator vaults** (code 3677; on-chain labels arbluna-max
  / arbluna-1wk / ampluna-max name the Eris LSTs they hold, but the vaults
  are Votion's — already in curated/known_contracts.json): **arbLUNA-MAX is
  the single BIGGEST TLA lock holder (lock_id 748) and ampLUNA-MAX the
  second-biggest.** The two largest voters in the system are invisible.
- **DAO DAO DAOs** (×3): treasury locks voted via governance proposal
  execution — one CONFIRMED ON CHAIN as aDAO ITSELF (`terra1sffd4…`; the
  `dao` attribute in props 38 & 39 executed 2026-07-07 by a council member,
  txs E0F3F7C9…ADD20 block 21,804,659 and 52497512…FA2BE block 21,804,790).
  Prop 39 = the council's re-vote: 4× `gauge/vote` @ **841,486.80 VP** per
  gauge. Prop 38 revealed aDAO's locks (token_id 600 = 733,084 VP boost +
  81,454 fixed; token_id 711) and a periods-186–192 bribe sweep (13,446
  ASTRO + 2,491 LUNA + 5,387 CAPA + 10.75M ROAR + 137.8 ampLUNA rebase) —
  all contract-path, all invisible to current capture. aDAO's own treasury
  vote is missing from aDAO's own analytics. First-party confirmation.
- **A Polytone proxy** (cataloged: "ROAR/WHALE IBC bridge"): an
  Osmosis-side Lion DAO / White Whale ecosystem entity voting TLA gauges
  cross-chain via IBC.
Same defect family as tribute blindness (defect #2): the classifier reads
top-level msgs/signers, not wasm-event actors. These are exactly the
aggregation/DAO/cross-chain actors the attribution products exist to measure.

**Verdict routing (SPEC-tla-voting-reconcile §6): LOSSES → the capture fix
rises above the rollup rebuilds.** DECISIVE design fact from the prop-39 tx
dump: the gauge's `gauge/vote` wasm event carries ONLY {action, vp} — **no
user, no allocation**. Wrapped votes therefore CANNOT be attributed from
events at all; the information is not emitted. Fix architecture (to be
specced): (a) events stay the fine-grained tx layer for direct votes
(heights/hashes); (b) the COMPLETENESS + ATTRIBUTION layer is a per-period
STATE HARVEST — enumerate lock owners → `user_info` → any gauge entry
stamped with period P voted in P (the period-stamp discovery). ~250
queries/week, catches contracts, wrapped paths, and silent misses, perfect
attribution, no archive node. The ~9 missed votes heal the same way.
Bonus confirmed feasible: `ve/deposit_for` pairs with
`wasm-metadata_changed{token_id}` → the lock classifier CAN extract token
ids (fixes the 1,306-null-create defect).

**Addresses:** all 7 already cataloged in `docs/curated/known_contracts.json`
(Votion arbLUNA-MAX `terra13aae4…`, arbLUNA-1wk `terra16xzky…`, ampLUNA-MAX
`terra1v7aw9…`, Polytone/ROAR-WHALE `terra1nmnrcr…`, DAO DAO ×3). Full forms
in reconciliation.json. Registry also lists sibling Votion vaults (3mo/1wk
tiers) — the fix's attribution layer should treat the whole code_id-3677
family as one voter class.

---

# Rev 3 — 2026-07-13/14 — distributions product born (payout ledger to genesis) + 1.1.0 forward capture

**🔍 Context: the VP-definition audit** (2026-07-13, LUNA-SOLID investigation →
full capture-layer audit; SPEC-vp-definition-fix). While proving the
`vp = fixed + voting_power` law against the TLA UI, probes confirmed **the
gauge controller retains full per-period distribution history in queryable
contract state** — period 120, deep inside the events dead zone, answered
instantly from a public LCD. No block scanning, no archive node: ~1 query per
period. SPEC-distributions-capture written + approved same day.

**One-shot harvest EXECUTED 2026-07-14**
(`tla-core/.github/scripts/tla-voting/harvest-distributions.js` +
`tla-voting-distributions.yml`): walked `distributions{time:{period:P}}`
downward with findFloor — **floor certificate period 96** (period 95 = empty
pre-genesis state, matching the 2024-08-27 launch). Committed
`tla-voting/distributions/history.json`: **98 periods (96→193), zero gaps,
zero invariant violations** (fractions per gauge sum to 1.0 ± 1e-9, hard
invariant). Verbatim contract shape + capturedAt per entry; deterministic,
idempotent, retry-with-backoff across both LCDs, failures → `known_gaps`
never written empty.

**Storage layout DECIDED: single `history.json`** (period-keyed contract
state, ~4 gauge entries/week, <2 MB over years — not tx events).
Registered as an accepted deviation: TLA-CORE-STORAGE-DESIGN §7 row flipped
PENDING → DECIDED. Product README still owed (queued in CHANGES_PENDING).

**Forward capture shipped — cron 1.1.0** (`platform-crons/tla-voting/`):
- New `lib/distributions.js` carrying the **`<<DISTRIBUTIONS CORE v1>>`**
  marked block, byte-identical with the harvester script (diff-verified
  2026-07-14; re-verify after ANY change — the flows-classifier rule).
- After each epoch boundary, queries the just-finalized period, appends if
  absent. **Self-healing:** every run verifies `last_captured_period ==
  current_period − 1`; if behind, backfills the miss (state is retained —
  lateness is free). Mid-week runs log `distributions: skipped (up to date)`.
- Heartbeat gains `distributions_head` (193 at ship).
- **Rode along: the 40s hard-deadline `httpGet` port** — closes the latent
  idle-timeout-only tarpit hang shared with tla-flows Rev B.

**Verify (watch items):** next Render run logs 1.1.0 + a `distributions:`
line, heartbeat `distributions_head: 193`; the Sunday 2026-07-19 flip is the
first live append (period 194).

**Unblocked:** exact per-pool pct/VP history from genesis for the rollup
rebuilds (replaces the boost-only skewed history); whitelist truth /
wasted-VP metric; cross-validation ground truth for the event streams
(Σ vote-events + lock state ≟ distributions per epoch).

---

# Rev 2 — 2026-07-08 — FCD archive discovered; backfill completed to contract genesis

**🏛 Discovery: `phoenix-fcd.terra.dev` is a FROZEN ARCHIVE** — tx index covers
chain genesis → **~2025-01-07 (height ~13,736,494)**, then stopped. Found via a
Mintscan HAR while chasing aDAO mint history. Pagination
`/v1/txs?account=X&limit=100&offset=<next>`; sits behind Cloudflare
(429/1015 rate limits → ~1.1s/page + 65s+ cooldowns required).

**Harvester built** (`.github/scripts/fcd-harvest/` + `fcd-harvest.yml`):
trimmed raw txs (msgs + wasm/coin events + hash/height/ts, ~22% of raw) into
`archive/fcd/<label>/part-NNNNN.json` + `state.json`. Resumable (25-page
checkpoints), 409-retry publishing, pause-not-fail on rate limits,
publish-then-consume flush. **Failed txs (code≠0) ARE captured — derive steps
must filter.** Hardening history: v1 crashed on Cloudflare 429; v2 crashed on a
GitHub 409 branch race; v3 survived both but a patch deleted a `const txs` line
(caught by its own pause path). **Binding lesson: main-loop changes require a
file-based mock run, not just syntax + unit tests.**

**10 harvests COMPLETE (~84k txs):** adao-minter 1,644 · adao-collection
12,730 · tla-escrow 2,652 · tla-gauge 5,559 · tla-incentive 1,870 ·
lp-compounder 6,055 · lp-stable 9,866 · lp-project 14,562 · lp-bluechip
11,647 · lp-single 13,069. Governance contracts all born within ~160 blocks
(11,558,887–11,559,045 = TLA launch 2024-08-27); compounder (12,598,626) and
single bucket (12,399,246) deployed later.

**fcd-fill executed** (`.github/scripts/tla-voting/fcd-fill.js` — requires the
seed's exported classifier, no third copy). Streams now reach TRUE GENESIS:
- votes 5,900 → **8,270** (+2,370 — the first two weeks of TLA voting the
  public-node floor had cut off), horizon 11,767,657 → **11,558,887**
- locks 11,586 → **13,585**, horizon → **11,558,979**
- bribes 1 → **172** (complete launch→Jan-2025 bribe history), horizon → **11,559,045**
- rewards 398 → **6,038** (+5,640 distributions/claims Aug-2024→Jan-2025)

**Gap ledger (archive-node residue, all that remains):**
- votes 21,480,159→21,588,037 / locks 21,478,268→21,586,261 (≈2026-06-15→22)
- bribes/rewards 13,736,595→21,578,980 (FCD freeze → org capture start,
  ≈Jan-2025→Jun-2026) — recorded as `known_gaps` on the streams
Coverage note: the frozen `defipatriot/tla-history-data_2026` remains the sole
source for votes/locks **Jan-2025→Jun-15-2026** (FCD ends where it begins to
matter); keep frozen.

**Open from this rev:** flows-fill (LP harvests → tla-flows classifier, blocked
on tla-flows deploy) · read the fill run's Actions log for the FCD↔legacy
overlap verdict (built-in consistency audit, unread) · per-msg distribution-pot
splitting still a refinement candidate.

# Rev 1.1 — 2026-07-08 — module renamed history → tla-voting (pre-deploy)

Name wasn't descriptive. Data path `tla-core/tla-voting/events/`, seed
`.github/scripts/tla-voting/tla-voting-seed.js` + `tla-voting-backfill.yml`,
forward cron `platform-crons/tla-voting/` (Render `org-tla-voting`). Seed gained a one-time
prior-read fallback from the old paths (`voting/events`, `history/events`) so the rename is lossless (retention
floor slides daily; a from-scratch re-scan would have dropped the earliest
reward/bribe events). After the seed publishes `tla-voting/events`, delete the old
`tla-core/history/` folder (and `voting/` if present).

# Rev 1 — 2026-07-08 — seed complete, forward cron shipped

**Seed (Action, v3.3) ran clean 2026-07-07:** votes 5,900 · locks 11,586 ·
bribes 1 · rewards 398 · 250 wallet rollups · status ok.

- **Coverage:** votes/locks continuous 2024-08-27 → now (horizons 11,767,657 /
  11,559,131 preserved via legacy bootstrap from the frozen
  `defipatriot/tla-history-data_2026` capture). Bribes/rewards start at the
  current public-node floor (~21.58M) — no legacy equivalent exists.
- **Chain-confirmed at seed:** incentive-manager `add_bribe` shape
  (`bribe.amount/info` = the bribe; `for_info` = target pool;
  `distribution.func` = native epoch range; msg `funds` = 10-LUNA anti-spam
  fee, stored separately as `fee_funds`). First captured bribe: 203.198978
  SOLID → project gauge pool, epochs 193–200 linear.
- **Reward stream verified:** 272 distribution msgs + 70 claim_bribes +
  18 claim_rebase + 38 compound = 398 exactly; claim amounts parsed from real
  coin-transfer events (e.g. 4.288927 ampLUNA claim_rebase).

**⚠ Major finding — public-node tx-index retention collapsed to ~1 week**
(was: reachable to Aug 2024 on 2026-06-15). Consequences, all handled:
- The frozen personal repo is now the **irreplaceable sole source** of
  Aug-2024→Jun-2026 governance events. Frozen, never deleted.
- Real hole recorded honestly in `known_gaps`: votes 21,480,159→21,588,037,
  locks 21,478,268→21,586,261 (≈ 2026-06-15→22). **Archive-node target**,
  alongside the pre-Aug-2024 era (Batch 5).
- Forward-cron outage tolerance is now days, not weeks — heartbeat monitoring
  mandatory; any future hole is gap-recorded, never papered over.

**Known data caveat:** distribution pot events are tx-gross
(`coins_basis: 'gross_coin_received'`) — a tx batching multiple distribute
msgs carries the same tx-gross coins on each. Never sum pots across
distribution types. Per-msg splitting = refinement candidate.

**Forward cron (org-tla-voting 1.0.0):** self-contained
`platform-crons/tla-voting/`, classifier byte-identical with seed (md5-verified),
never seeds (aborts if priors unreachable), cursor/frontier advance only on
complete scans, change-only stream publishing. Schedule `0 */6 * * *`.

**Still open (this migration):** address-catalog attribution rider (briber
identities + wrapper namespaces); per-msg pot splitting; retire the old repo
only after site verification (Batches 3–4) — and even then keep it frozen as
the legacy-era source.

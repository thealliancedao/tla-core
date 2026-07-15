# cron-tla-voting — changelog

Voting event capture: votes, locks, bribes, rewards.
Seed: `tla-core/.github/scripts/tla-voting/` (Action) · Forward: `platform-crons/tla-voting/` (Render `org-tla-voting`)
Spec: `docs/pending-changes/SPEC-tla-voting.md`

---

# Rev 6 — 2026-07-15 — 2.1.0 built + mock-passed: rollups schema 4 + classifier v5 (deploy = one commit)

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
  **three-number claims model** (Camron, D4): raw amount / `usd_at_claim`
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
  `dao` attribute in props 38 & 39 executed 2026-07-07 from Camron's wallet,
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

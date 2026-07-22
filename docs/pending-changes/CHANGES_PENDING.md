# Changes Pending — TLA Stats platform work queue

> **Home: `tla-core/docs/pending-changes/` — SINGLE HOME since 2026-07-14**
> (moved from `website-adao-core` per SPEC-docs-consolidation; the old copy is
> deleted — never update it). This is the platform-wide work queue: capture
> layer, org crons, AND site work. See `website-adao-core/PROJECT_KNOWLEDGE.md`
> "Tracking responsibilities" for what goes here vs. there.
> Older completed items have been pruned — they live in changelog files
> (`docs/changelogs/*`, `website-adao-core/index-log.md`, etc.) instead.

Last cleared: **2026-06-07** (post NFT inventory Rev B deploy). Rev 0.16 catalog Phase 0 items previously cleared 2026-06-06.

---

## 🔴 2026-07-22 (late) — GAP SURVEY: the hole is the story · SPEC-capture-registry-backfill DRAFTED

- **Full per-token bribe-attribution survey run (committed data):** 12 tokens
  show the same hole-era gap Camron spotted in CAPA — LUNA 1.0%, CAPA 5.7%
  (18.8M CAPA ≈ $20K unattributed), ASTRO 20.2%, ROAR 22.4%, ampLUNA/USDC
  ~57%, five ibc tokens at 0%. SOLID/WHALE/ampROAR/MOAR ~100% complete. The
  ledger has been measuring the missing mass all along; boards honestly show
  only the attributed slice.
- **Walker verified NOT the culprit (working conclusion):** live window has 3
  payers, zero CAPA placements, yet a live 100K-CAPA pot on ampCAPA — bribes
  span epochs (fixture: DeFi_Patriot's July add covers e193→e200), so
  hole-era placements still burn in current state. §6 watchdog makes this
  self-verifying forward.
- **NEW defect class found: OVER-attribution** — ibc/517E…D84E at 114.3%,
  ibc/…AC5E at 120.0% (attributed > measured flow). Hypothesis: bribe
  withdrawals not netted in briber attribution. E0 fix + gate `attributed ≤
  state` per token (spec §5).
- **Votes reconcile corroborates:** 8 MISMATCH + 28 CHAIN_ONLY slots; its own
  verdict says the capture-registry fix outranks rollup rebuilds. Locks
  reconcile: perfect (Σvp+fixed = total vAMP, delta 0).
- **SPEC-capture-registry-backfill.md DRAFTED (this folder) — P0.** One
  archive pass over heights 13,737,811→21,481,530 via contract-scoped
  tx_search (registry file, resumable cursors, production classifiers,
  idempotent merge), recovering bribes+votes+locks+flows(v2) at once,
  walk-once doctrine. E0 items need NO archive: over-attribution netting fix,
  POT_WITHOUT_PLACEMENT watchdog, flows classifier v2 forward. **E1 blocks on
  Camron: choose archive-node access** (rented archive RPC recommended).
- Awaiting from Camron: rough dates (or txhashes) of his wBTC/ATOM-pool
  bribes — 2025 ⇒ hole (backfill recovers); pre-2025-01-07 ⇒ FCD-era
  classifier miss, chased separately in E0.

---

## 🔶 2026-07-22 — Portfolio Arc: P&L spec drafted · VP audit resolved · bribe-board findings

- **SPEC-portfolio-pnl DRAFTED + Phase A BUILT & GATED same session (deploy =
  commit `.github/scripts/tla-flows/build-pnl.js` + `tla-flows-pnl.yml`, then
  Actions → Run workflow).** Gate on real data: 553 wallets / 36,243 events,
  fixture wallet hand-reconciled, idempotent, honesty assertions pass; DAO
  fees $5,727.90 + zap inputs $642,531.39 usd@event; 1,532 null-user claims
  counted honestly. Phase A is a pure derive from committed data (zero chain
  access): zap cost basis + lifetime slippage/fee ledger (measured), event
  timeline, per-wallet coverage bands. Structural findings baked into the
  phasing: flow events carry NO pool identity and claims carry NO amounts
  (14,265/14,265 `amount:null`; rewards stream `coins:null` too) — both are
  classifier enrichments (Phase B, `<<FLOWS CLASSIFIER v1>>`→`v2`,
  byte-identity discipline) with a ⚠ time-sensitive walker-era re-read
  (public-node tx retention; recommend: ship enrichment forward soon, fold
  the backfill re-read into the Phase-2 registry one-pass).
- **VP audit RESOLVED — no new fix needed; it's the accepted org-only scope.**
  member-portfolio tile (1.31M) vs banner (1.18M→1.20M) traced: tile =
  personal-feed `display_voting_power_human` (fixed×10, coincidentally right
  for all-auto-max wallets), banner = boost-only `current_vp_human`. Canonical
  Σ(boost+fixed) per lock = 1,310,560.38 verified from raw lock fields.
  SPEC-vp-definition-fix already SHIPPED org-side 07-14 (org engine total
  basis, `display_voting_power_human` RETIRED, member-data 1.1.0 canonical);
  the page still reads retiring personal feeds — that's the documented
  accepted consequence. Queue: **org positions-capture migration** (org
  successor to adao-positions/tla-participants on the patched org engine, full
  portfolio shape: locks/LP/rewards/prices — member-data 1.1.0 covers VP only)
  → repoint member-portfolio.html. Optional interim: page-side Σ(raw
  boost+fixed) transform, zero old-repo investment.
- **DeFi_Patriot bribes "$262.82" EXPLAINED — two independent known causes:**
  (1) capture hole 2025-01-08→2026-06-14 (rollup claim_coverage documents it;
  Phase-2/archive backfill queued); (2) CoinGecko CAPA price hole **May-2024→
  Aug/Sep-2025** (verified across the whole price-history archive: CAPA priced
  2023-10→2024-04, dark, resumes 2025-08/09; SOLID starts 2025-09). His 110K
  CAPA (epochs 109/112) is captured but $0 at placement; only the SOLID
  bribes (e193/194) price. Same hole = the whole answer to "Solid Protocol
  unpriced" (all 11 events in it). Rollup already carries `usd_at_build`
  (him: $379.45, Solid: $568.04).
- **Bribe-board polish queue (org data, site-only unless noted):**
  1. [ ] "at today's prices" fallback: board shows `usd_at_build` (clearly
     marked) when `usd_at_placement` is 0/unpriced — honest, no fake history.
  2. [ ] Tooltip on the four "TLA gauge tribute contract" entries: protocol
     plumbing (take-rate/ASTRO recyclers firing every epoch), not people.
  3. [ ] Per-briber click-through modal: bribe timeline + USD-per-epoch chart
     — data already in rollup `bribers[].by_epoch`, zero capture work.
  4. [ ] (own spec, if wanted) CAPA placement-price backfill for the hole,
     derived from on-chain Astroport pool reserves — estimate-class, so it
     would be labeled as derived, per pricing doctrine.

---

## ✅ 2026-07-20/21 — SITE GO-LIVE · GitHub-outage health check · votion-positions v1.1

- **GO-LIVE (aDAO-links-site):** test.html → **tla-stats.html** (nav was built
  with data-page="tla-stats"), test2.html → **member-portfolio.html**; prior
  stats page preserved as tla-stats-legacy.html (holds the Epoch Bribes
  all-time deep-dive pending re-home). Boards: chunked expanders (top 5 →
  +10/click) on all seven; OG/Newcomers tiebreak = smallest held lock token
  id; Top Bribers banner is MEASURED from bribe_ledger (LUNA attributed
  share — auto-updates on rollup rebuild). Vercel page views were already
  site-wide; custom events added (board_expand, bribe_board_mode,
  portfolio_view/save — surface on Pro). Details: website-adao-core
  tla-log.md Rev 5.2–5.4.
- **Sunday rollup rebuild VERIFIED (07-20 02:09):** 2,837 attributed bribe
  events (was 173), 17 bribers, wallets.json labels live on the board. LUNA
  attributed share correctly still ~1% — the recovered tributes bribe in
  ASTRO/pool tokens; PD's 72,676 LUNA stays honestly unattributed (both PD
  txs sit in capture gaps: prop 247 pre-forward-capture, prop 250 in the
  21.81–21.91M prune window) until the registry backfill or PD's next bribe.
- **2026-07-20 GitHub API outage (~00:00–01:00 UTC):** 503s at the publish
  step killed 10 crons in one hour — capture succeeded everywhere, only the
  final PUT died. Hourly crons self-healed; address-catalog + adao-positions
  re-run manually. HARDENING QUEUED: 3-attempt backoff retry on GitHub 5xx
  in the shared publish helpers (would have turned ten failure emails into
  zero). Corrected diagnosis on the volume tile: the astroport epoch-roller
  was HEALTHY all along — the page-side epoch-boundary fallback was missing
  on the NEW stats page (fixed in go-live).
- **votion-positions v1.1.0 SHIPPED & LIVE-VERIFIED (cron-scripts repo):**
  tx_search discovery ran on public-node ~2–3wk tx retention → historical
  depositors invisible while `complete:true` asserted. Fix: org
  address-catalog ∪ deposit-events candidate universe, one bank/balances
  sweep (all 6 vdenoms/call), MEASURED completeness (supply_coverage_pct),
  real total_tvl_usd + discovered_holders_usd, schema 2 + discovery meta.
  Gate 14/14 on the Eris fixture; first run: 18 holders (was 2), TVL
  $35,105. The catalog-sweep design is what org-votion-positions inherits
  at migration. Member-portfolio Votion card live with coverage honesty
  guard ("absence isn't proof of absence" below 90%).
- **Portfolio Arc — REMAINING QUEUE:** (1) VP model audit — tile 1.31M vs
  banner 1.18M→1.20M on one screen; (2) APR convention + price-source audit
  (Eris arbLUNA ~$0.12 vs our hub-ratio ~$0.055); (3) SPEC-portfolio-pnl
  (flows × price-history join — both feeds exist); (4) design pass. Plus:
  SPEC-landing-pulse, 5xx retry hardening, old/new cron-pair retirement
  ledger (address-catalog, nft-inventory×3, votion pair, astroport-snapshot
  vs org-dex-data — retire after duty ports per parallel-run doctrine).

---

## ✅ 2026-07-18 — v6.1 BUILT & GATED: governance-executed bribes captured · FCD re-derive READY

Every line verified against real chainscope pastes or a full local run this session.

- **v6.1 (org-tla-voting 2.3.1) — BUILT, mock gate 116/116, DEPLOY PENDING
  (commit the tla-voting folder; no schedule/env change).** The PD fixture
  exposed a REAL silent-drop bug in deployed v6: all ten `add_bribe` events
  in a governance-executed tx share `msg_index 0` → identical dedup keys →
  **9/10 bribes silently collapsed** (26,284 of 34,763 LUNA lost from the
  fixture alone). Fix: collision-aware promoted msg_index — unique keys ONLY
  when 2+ promoted bribes share an index; single-add take-rate events keep
  byte-identical keys (parity proven old-vs-new; no historical dupes on
  re-walk). Gate additions: R10b (8 assertions on the verbatim fixture) +
  stale schema-5 assertion reconciled to schema 6 (briber board) + the
  cosmetic "schema 5" log string fixed.
- **Attribution rule SETTLED (dynamic by construction — DeFi_Patriot's
  requirement):** promoted bribes attribute to the wasm `dao` attribute's
  DAO core when EXACTLY ONE distinct dao appears in the tx
  (`briber_source: 'dao_attr'` — the DAO's own funds pay, coin_spent proves
  it); zero or 2+ → msg_target fallback, unlabeled. A new DAO bribing
  through a shared proposal-module pattern surfaces as its OWN unknown
  address — it can never be absorbed into another protocol's total.
  PD therefore attributes to the DAO core `terra1k8ug6dk…4lppjg`, NOT the
  proposal module `terra1660g9…ehqnup`.
- **Fixture corrections (chain-exact, supersede the 07-17 note):** tx
  `402AE7B1…AAAA7` net added = **34,763.534826 LUNA** (not 33,517; gross
  34,863.53 minus ten 10-LUNA fees). SECOND confirmed governance fixture:
  proposal 247, tx `1CA243A3…AF1E` (2026-06-13), ten bribes,
  **37,912.492 LUNA net**, epochs 189–192. Combined: **72,676 LUNA of PD
  bribes** that deployed v6 would have recorded as 18,764.
- **FCD re-derive (D8) — SCRIPT + WORKFLOW DELIVERED, run pending:**
  `.github/scripts/tla-voting/fcd-rederive-bribes.js` +
  `tla-voting-fcd-rederive.yml`. Dual-checkout design: require()s the LIVE
  platform-crons classifier (no third copy) and SELF-GATES on the PD
  fixture (aborts on any pre-2.3.1 checkout → run AFTER the 2.3.1 deploy).
  Local run against real production data: **2,640 contract-initiated bribes
  recovered** (2024-09: +428 · 2024-10: +701 · 2024-11: +812 ·
  2024-12: +622 · 2025-01: +77), all 191 prior events byte-preserved,
  second run adds 0 (idempotent). Top recovered bribers = the four gauge
  tribute contracts + Lion DAO (23) + Solid `…dd7s3t` (11). Bribes-stream
  event history then reaches TLA genesis for the FCD era; rollups absorb on
  next rebuild.
- **Astroport-candidate contracts RESOLVED (07-17 open item):**
  `…qswspq` / `…gw3lpa` (+ `…lf4arv`, `…w6e23k`) are the four gauge
  tribute contracts — `distribute_take_rate` sweeps fees to the PD DAO,
  `distribute_bribes` recycles accumulated ASTRO into the manager. The
  "pool:null arg shape" was this class; NOT an Astroport team wallet.
- **Solid Protocol = TWO wallets (both entered in wallets.json):**
  `…dd7s3t` — FCD-era direct briber (e.g. 61,350 CAPA → ampCAPA,
  2025-01-02) AND the CAPA token contract's feeshare withdraw address
  (deployer-tied evidence); `…s0yhw0` — current wallet, three 1M-CAPA
  bribes across all three buckets 2026-06-21 (chainscope-verified), sitting
  in the events hole so absent from committed events until the registry
  pass. The two txs' feeshare events paying `…dd7s3t` link the wallets.
- **Backfill doctrine REAFFIRMED for the 2025-01→2026-06 hole:** per-period
  TOTALS are already state-side (bribe-state walk); per-briber attribution
  in the hole stays gated on the Phase-2 capture-registry one-pass (bundle
  everything, walk once). Fuel: still zero direct bribes found — stays
  honestly blank.
- **Deploy checklist:** (1) commit platform-crons tla-voting 2.3.1 →
  Render picks up hourly; (2) run the fcd-rederive workflow (dry-run flag
  available); (3) next rollups rebuild extends the briber board to genesis
  for the FCD era; (4) board banner broadening ("contract-initiated
  bribes") rides the board-page commit — still pending the Rev 4 files.

---

## ✅ 2026-07-17 — briber board data layer LIVE · override layer wired in · denom identity 100%

Every line verified against production output or the committed rollup that day.

- **Briber leaderboard — rollups schema 6: SHIPPED & LIVE.** org-tla-voting
  (lib/rollups.js) first build 23:03Z: `schemaVersion: 6`, 16 bribers,
  Σ 173 bribe events / 18 withdraws, `bribers_order` present, DeFi_Patriot
  SOLID row $262.82 at placement = mock exactly. Spec:
  `SPEC-tla-voting-briber-board.md` (this folder — rev 2, schema 6).
  Labels join `docs/curated/wallets.json`; DGN display from PROBES record.
  Known stale log string: index.js line ~1089 still prints "schema 5" —
  cosmetic, fix with next tla-voting commit.
- **token-catalog 1.5.0 — curated override layer APPLIED (was write-only).**
  Stage 2b reads `docs/curated/token_overrides.json` per the stage-2
  per-field model: `discovered` untouched, `override` + `effective` added.
  First run: 23 applied, 20 previously unnamed tokens identified. Also fixes
  the silent claims-pricing gap (rollups buildTokenMap now reads `effective`).
- **Denom identity: 17/17 IBC traces run, 14/14 matched existing overrides**
  (chain-exact reconciliation of the curated layer). INJ + stATOM entries
  added (trace-verified); decimals added to 16 entries (convention-derived,
  noted). DGN (`udgn`, channel-582) = the only bribe-only token; named via
  `PROBES-denom-traces.md`, honestly unpriced.
- **price-history: RUN_ALL backfill complete (17 tokens).** CAPA reaches only
  ~2025-03 (CG listing start) — pre-listing CAPA bribes stay unpriced.
  DECIDED: no ampWHALE/bWHALE backfill — White Whale deprecated, tokens
  worthless; their 91 bribe events stay named + unpriced-at-placement by
  design, usd_at_build reads ~zero (true).
- **Board surfaces SHIPPED (evening).** test.html Community card = "Top
  Bribers" (all-time, schema-6, registry-first names, Earners view kept behind
  toggle); tla-stats.html Epoch Bribes modal gained the sortable deep-dive
  board (optional commit — re-homes into the restructure later). Details:
  website-adao-core `tla-log.md` Rev 4.
- **PD BRIBES ARE CONTRACT-INITIATED — build #3 fixture captured.** Chainscope
  tx `402AE7B14451C9C46612DBD5342FC722A8562B2900AB35973081082B66FAAAA7`
  (2026-07-09): executor `terra14p3mc04s7jcaxvvetlzehvhx9gdx6w4nm3zzw3` runs
  proposal 250; DAO treasury
  `terra1k8ug6dkzntczfzn76wsh24tdjmx944yj6mk063wum7n20cwd7lxq4lppjg` makes TEN
  add_bribe calls in one tx — 33,517 LUNA, epochs 193–196, ten pools,
  10-LUNA fee each. NONE appear in the direct events stream (no top-level
  briber). Confirms the governance-execution bribe pattern alongside take-rate
  tributes; Phoenix Directive is therefore ABSENT from the current board by
  capture limitation, not by fact. Board banners state the direct-only
  universe. Resolution path: build #3 parses wasm add_bribe events + execute
  chain for attribution; this tx is the acceptance fixture.
- **Briber identity status:** Lion DAO `terra1ksk66l…z8ru04` CONFIRMED
  (DeFi_Patriot) → wallets.json entry added. Solid Protocol candidate
  `terra1t380w5…dd7s3t` strongly corroborated (bulk-CAPA multi-pool pattern
  matches DeFi_Patriot's description exactly) — awaiting explicit
  confirmation before labeling. The two single-pool LUNA wallets
  (`…szrpnz`, `…ecsx24`) are NOT PD (see above) — unidentified individuals.
  Two new Astroport-candidate CONTRACTS began ASTRO bribes 07-16/17
  (`terra1v399cx…qswspq`, `terra1awq6t7…gw3lpa`, pool:null arg shape —
  classifier quirk to check in build #3) — unconfirmed. Fuel DAO: zero
  direct bribes exist; any Fuel incentives flow via non-direct routes.
- **Site (aDAO-links-site): Atrium links fixed (3 places), DAO custody wallets
  pinned on Holder Leaderboard (broken sum = 1,000 = Props 64–69 exactly),
  rewards-tile sparklines restored (+ Vote added), fetchAllSnapshots
  promise-memoized + per-source date floors, tla-ext walkback cached,
  DAO Members chart icon removed (no daily source — honest gap).

## ✅ 2026-07-14 — VP fix LIVE · distributions ledger COMPLETE · docs consolidated

Every line below verified against chain or production output that day.

- **Build 1 — VP definition fix: SHIPPED & LIVE.** member-data 1.1.0 Render run:
  canonical `system.total_tla_vp` = **27,973,049.25** = TLA UI exactly, 4/4
  outputs published, status ok. Spec updated to SHIPPED:
  `SPEC-vp-definition-fix.md` (this folder).
- **Build 2 — distributions harvest + forward capture: SHIPPED.** One-shot
  harvest committed at `tla-core/tla-voting/distributions/history.json`:
  **floor certificate period 96** (95 = empty pre-genesis), **98 periods
  (96→193), zero gaps, zero invariant violations**. Storage layout **DECIDED:
  single `history.json`** (Deviation Register §7 row flipped to DECIDED).
  Forward capture live in `org-tla-voting` **1.1.0** via the shared
  `<<DISTRIBUTIONS CORE v1>>` block (byte-identical platform-crons lib ↔
  tla-core harvester script — diff-verify after ANY change).
- **Tarpit closed:** the 40s hard-deadline `httpGet` fix is ported into
  org-tla-voting 1.1.0 (the item further down is flipped DONE).
- **VP mechanics derived & documented** (multiplier = 1 + 9×wk/104, stamping,
  slope, dormant locks) → now canonical in
  `docs/ecosystem-knowledge/eris-protocol.md` + `.facts.json` (`vamp.*` facts).
- **queries.md updated + moved to `docs/`** — distributions / gauge_infos /
  user_info / lock_info / total_vamp blocks now carry the verified shapes.
- **Docs consolidation EXECUTED** (SPEC-docs-consolidation, this folder) —
  data/capture-layer docs live ONLY here; website-adao-core keeps site-runtime
  logs + bootstrap docs + website-feature specs.

### 👀 Zero-effort watch items (self-resolving — glance when convenient)
- **[ ] Next scheduled org-tla-voting Render run:** log shows **1.1.0** + a
  `distributions:` line (`skipped (up to date)` expected mid-week); heartbeat
  gains `distributions_head: 193`.
- **[ ] Sunday 2026-07-19 epoch flip:** first live test of forward capture —
  period **194** should append on its own; self-heal check is
  `last_captured_period == current_period − 1`.

### 🆕 Queue additions (from the 2026-07-14 session)
- **[ ] member-data per-lock census** — the cron already queries all 433 locks
  every run but publishes aggregates only; emit per-lock detail (token_id,
  coefficient, multiplier, slope, end_period, vp components, stale-gap) so
  non-max multipliers + **dormant locks** ("expired-but-unwithdrawn — wake up
  your VP") are answerable org-side for all wallets. Cheap: data already in
  hand each run.
- **[ ] Distributions product README** — `tla-core/tla-voting/distributions/`
  needs its product README per storage doctrine (layout: single history.json,
  DECIDED; document the floor certificate + forward self-heal).
- **[ ] Credia ecosystem-knowledge pair** — the 6-byte stray placeholder file
  `docs/ecosystem-knowledge/credia` was deleted 2026-07-14; write the real
  `credia.md` + `credia.facts.json` pair (Eris-built money market; mints
  wBTC.creda.a — directly relevant to defect #3, the missing 2.69M-VP pool).
- **[ ] Spec retirement pass after the 2026-07-19 epoch flip** — once the
  period-194 forward append + the SPEC-vp §4 second check (distribution
  fractions × bucket rewards ≈ reward deltas) both pass and the distributions
  README exists: SPEC-vp-definition-fix + SPEC-distributions-capture become
  retirable (durable content → ecosystem-knowledge + queries.md + the product
  README, already done); SPEC-tla-flows-gap-fill retirable now (complete,
  facts live in known_gaps). Completed one-shots retire; git history keeps them.

### ▶ Next up (order RESET by the reconciliation verdict, 2026-07-14 late)
**Reconciliation diagnostic: ✅ EXECUTED 2026-07-14 22:20 UTC — verdict
LOSSES, triple-verified.** Full story: changelog Rev 4; raw report:
`tla-voting/events/reconciliation.json`. Decomposition: (1) declared-gap
losses real but small (~7 key-swap re-votes, period ~190, June window —
honest); (2) ≥1 PROVEN SILENT loss in a claimed-covered window (a new
~5.97M-VP whale's project vote, period 191 — the pager cannot be trusted
even where it records no gap); (3) systematic blindness to contract-path
votes — 7 voting contracts identified: VOTION vote-aggregator vaults
(arbLUNA-MAX = BIGGEST TLA lock holder, ampLUNA-MAX = 2nd, + arbLUNA-1wk),
3 DAO DAO DAOs (one CONFIRMED on chain as aDAO itself, terra1sffd4… — the
council's prop-39 re-vote, 4× gauge/vote @ 841,486.80 VP, 2026-07-07, is
among the invisible; aDAO locks = token_id 600 + 711), 1 Polytone proxy
(ROAR/WHALE Osmosis entity voting cross-chain).
VP invariant PERFECT (Σ locks = total_vamp = 27,975,687.10, Δ 0.0000%).

**New build order (§6 routing applied):**
1. ✅✅ **tla-voting capture fix — DEPLOYED + HEAL VERIFIED 2026-07-15**
   (spec'd, built, mock-gated 44/44, restructured, deployed, and healed in
   ONE DAY. Changelog Rev 5 carries the full story + live verification.)
   Cutover executed:
   - [x] suspend `org-tla-voting` on Render
   - [x] dispatch `tla-voting-restructure` (dry_run clean, then real —
         commit 4b9823c, 62 month files, identity verified, byte-checked
         post-commit)
   - [x] push platform-crons `tla-voting/` 2.0.0 (byte-verified post-commit)
   - [x] schedule `0 */6 * * *` → `0 * * * *` (D6)
   - [x] first run: banner 2.0.0, cursor migrated from min-frontier
         21,905,081, walker + live dedup proof (1 gated tx → 8 rewards →
         zero added), status ok, catch-up in progress
   - [x] FIRST HARVEST = THE HEAL: period 193, 203 wallets, 19 voted, 0
         pending. aDAO 841,486.80 VP × 4 stamped 193; whale's project vote
         back-attributed stamped 191; Votion arbLUNA-MAX 6.47M VP (largest
         voter in TLA) + ampLUNA-MAX 1.18M captured. vote_capture
         {625/8/28/0} — matches the reconciliation exactly.
   - [x] ~~probe: pin the period-stamp field~~ **RESOLVED BY THE HARVEST
         ITSELF** — the field is `period` (recorded in queries.md
         Q-AssetGauge-UserInfo; no probe needed)
   - [x] system-health MONITORED entry for `tla-voting/vote-state/heartbeat.json`
         (done 2026-07-16: FRESHNESS_MAP covers vote-state, bribe-state,
         distributions at 216h weekly cadence)
   **Interpretation law (encode in build #2 analytics): CHAIN_ONLY ≈ 28 is
   the PERMANENT HEALTHY BASELINE** — contract-path voters never have
   events; the alarm is GROWTH beyond the known contract-voter set.
   **Watches (passive):** catch-up clears over ~5 hourly runs (self-noted in
   heartbeat) · Sunday 2026-07-19 flip = double self-heal test — period 194
   must self-append to BOTH distributions AND vote-state.
2. ✅✅ **rollup rebuilds (build #2) — DEPLOYED + VERIFIED 2026-07-15**
   (spec'd, built, mock-gated 63/63, deployed, and verified live in ONE
   sitting — changelog Rev 6 carries the verification). FORCE_ROLLUPS first
   build: 262 voters, Votion arbLUNA-MAX #1 by VP with visibility none, aDAO
   rank 7, three-number claims live (top claimer $3,541 when-claimed vs $251
   at-build), 1,816/1,082 claim-tx/paid split, env removed post-verify.
   Harvest runs own the rebuild from here (Sunday = triple self-heal test:
   distributions + vote-state + rollups).
   Queue riders: historical compound-amount fill (pre-2.1.0 events,
   non-gating) · **price-history early-era backfill** (1,177 unpriced claim
   entries — mostly CAPA/ROAR before coverage; they self-price on the next
   rollup rebuild once the price series extends) · site feature: claims
   dashboard on the three-number model + live pending recipe
   (rollups.pending_recipe).
3. ✅ **tribute/bribe capture rework (build #3) — SPEC APPROVED + BUILT
   2026-07-15 evening (org-tla-voting 2.2.0), mock-gated 96/96 on real
   fixtures incl. the take-rate tx 69D072693314 — DEPLOY PENDING (commit
   the 2.2.0 folder; no restructure, no schedule/env change; walk-down
   self-starts, floor in ~4 hourly runs). Changelog Rev 7 carries the full
   story. The lock-state retention rider RODE ALONG (vote-state/locks/
   {YYYY}/{MM}.json — one per-period record, end/underlying/asset/VP per
   lock). Post-deploy: verify floor certificate (expect 96, trust the
   chain), spot period 100 vs the probe paste, Sunday flip = QUADRUPLE
   self-heal (distributions + vote-state + rollups + bribe-state), ✅ build #3.5 BUILT same evening (2.3.0, rollups schema 5
   bribe_ledger — mock-gated 108/108, changelog Rev 8, deploy pending):
   blind-spot label RETIRED, unattributed remainder now MEASURED per
   period/denom. Sole remaining rider (D8, queued, non-gating): FCD
   re-derive with v6 for the 751 contract-initiated txs — attribution-only;
   when it lands, historical remainders shrink on the next rollup rebuild.**
   Original evidence (all probe/FCD-verified 2026-07-15):
   - The incentive manager's `{bribes:{period}}` query is THE authoritative
     per-period tribute ledger (queries.md Q-IncentiveManager-Bribes,
     CHAIN-PINNED: `{bribes:{period:{period:N}}}` — the field is the ve3
     Time enum, never a bare number; `{bribes:{}}` = current). State layer =
     bribe-state harvest walking periods — recovers the take-rate tributes
     the event stream is blind to, INCLUDING the 2025-01→2026-06 hole.
     **Retention PROVEN: period 100 returns full buckets (12 pools,
     Sept-2024 era). The walk is green-lit — start at the distributions
     floor (96), record the true floor honestly if lower periods error.**
   - FCD census: 2,793 `bribe/add_bribe` wasm events on the manager vs 173
     committed bribe events; 751 FCD-era txs are contract-initiated (no
     top-level msg — invisible to the current classifier by construction).
   - The manager's `bribe/add_bribe` event carries `added: <denom:amount>`,
     `start`, `end` — but NO pool and NO briber. The take-rate anatomy: four
     tribute contracts (one per gauge bucket) emit
     `asset/track_bribes_callback {asset: <pool>, bribe: <denom:amount>}`
     per pool before the aggregated add_bribe. Briber/pool attribution is
     event-side (classifier v6); completeness is state-side.
   - Design shape (the capture-fix playbook): bribe-state product (period
     walk + weekly forward) + classifier v6 event promotion; events remain
     the who-paid layer, state the what/where/when truth.
   **SPEC-tla-voting-bribe-state.md: approved + BUILT (see the ✅ header
   above) — locked defaults D1–D9 all honored; mock gate R8–R12 green.**
   **Analytics riders (banked 2026-07-15 evening, ride 2.2.0 or later):**
   - ✅ Lock-state retention — SHIPPED in 2.2.0 (rode along as planned):
     per-period record in vote-state/locks/{YYYY}/{MM}.json retaining end
     (verbatim permanent|{period}), underlying_amount, asset, amount,
     start, coefficient, slope, voting_power, fixed_amount per lock.
     Avg-duration / permanent-split / sizes / LST-composition analytics
     are now pure Layer-3 reads.
   - Emissions curve (Layer-3 chart, data COMPLETE today): rebase pot per
     period from distributions/history.json in RAW ampLUNA — answers
     whether the two-year emissions ramp has flattened, immune to USD
     noise. Companion: take-rate + bribe pots per period per denom.
   - Total-locked curve (Layer-3, data COMPLETE to genesis): cumulative
     canonical lock ins minus withdraws from the lock stream = total locked
     ampLUNA over the entire life of TLA; big inflow/outflow events visible.
   - PROBE: gauge_infos historical projection — does the gauge answer
     gauge_infos with time:{period:N} like its sibling queries? If yes:
     per-pool VP-weight history walk → the ATOM-LUNA / INJ-LUNA APR decline
     decomposes fully into emissions vs vote-weights vs depositor dilution
     (LP flows already committed since Aug 2024). If no: forward-only via
     vote-state.
   - Known thin spot (accepted): TVL/APR snapshots (dex-data) reach back
     only to late June 2026; accumulates daily forward, no backfill exists.
   Queue riders from the build: FCD re-derive with classifier v4 for
   genesis→Jan-2025 lock token_ids (monthly-aware fill — lift v4 FROM THE
   CRON; non-gating) · seed modernization to monthly layout on archive-node
   day (both seed + fcd-fill are layout-guarded off meanwhile).
   Original design brief (for the record): DESIGN FACT (prop-39 tx dump):
   the gauge/vote wasm event emits ONLY {action, vp} — no user, no
   allocation — so wrapped votes CANNOT be attributed from events; the fix's
   completeness+attribution layer must be a per-period STATE HARVEST
   (enumerate owners → user_info → period-stamp identifies who voted that
   period; ~250 queries/week; catches Votion vaults, DAO DAO, Polytone,
   silent misses). Events stay the fine-grained tx layer for direct votes
   (walker transport, no tx_search trust). Heal the ~9 missed votes the
   same way (NO archive node). Lock token_id capture confirmed feasible via
   ve/deposit_for + wasm-metadata_changed pairing. Events monthly
   restructure rides this same touch ({YYYY}/{MM}.json, Deviation Register
   row). Votion has 6 live vaults (MAX tiers dominate: 216,898 arbLUNA /
   53,445 ampLUNA; vaults answer {state:{}}) — capture the whole
   code_id-3677 family.
2. Rollup rebuilds (pool-status-history, vp-attribution org-side) — ONLY
   after 1; the current stream mis-attributes exactly the actors these
   products measure.
3. Tribute capture rework (#2) — shares the wasm-event attribution core
   from 1.
Also queued from findings: the 7 voter contracts are ALREADY in
curated/known_contracts.json — queue item is to surface them as a VOTER
class in analytics (whole code_id-3677 Votion family) once attribution
lands; lock_create token_id classifier refinement (all 1,306 creates carry
null).
✅ Watch item 1 PASSED (org-tla-voting-1.1.0, distributions_head 193).
Remaining: the Sunday 2026-07-19 flip (period 194 self-append).

---

## 🔬 Capture-layer accuracy audit (2026-07-13) — VP definition, distributions, tribute gap

Trigger: LUNA-SOLID investigation (bribe → 7× VP rotation → liquidity followed)
surfaced a UI/data mismatch; full audit against a same-day TLA UI paste + 4
chain probes followed. Specs (this folder): `SPEC-vp-definition-fix.md` (✅
SHIPPED 2026-07-14), `SPEC-distributions-capture.md` (✅ SHIPPED 2026-07-14).
**Every VP surface we publish was affected; reward-dollar figures were NOT
(they already read distributions).**

### ✅ Established this session (chain-confirmed)
- **vAMP VP = `fixed_amount + voting_power`** — we publish boost-only, ~11% low
  everywhere, worse for short-lock pools (stLUNA was 26% off). Verified 9/9
  pools vs UI incl. 5-sig-fig match on the discriminating case; money follows
  it (distributions). Canonical total = `total_vamp.vp` ≈ 27.96M (the old
  "max bucket ≈ 24M" convention retires — PROJECT_KNOWLEDGE edit queued).
- **Gauge controller retains FULL per-period distribution history** in
  queryable state — period 120 (deep in the events dead zone) answers from a
  public LCD. Payout ledger back to gauge genesis = ~100 cheap queries, **no
  block scanning**. Epoch mechanics locked: gauge_infos(next) = live tally →
  freezes to distributions(period N) at flip → pays during N+1.
- **DeFi Patriot's LUNA-SOLID bribe captured byte-perfect** (203.2 SOLID linear
  193→200 = 25.4/epoch ✓ UI $25.83). Vote events match UI per-wallet exactly.

### 🐞 Defect register (owning cron → fix vehicle)
1. ✅ **VP definition** — FIXED org-side 2026-07-14 (SPEC-vp-definition-fix):
   capture-engine + member-data on `fixed + voting_power`; false comment
   rewritten; `display_voting_power_human` retired. Personal crons (tla-snapshot
   / tla-locks) NOT patched — retiring; the live site shows boost-only VP until
   the tla-snapshot REPLACE-CHECK lands (its priority rose accordingly).
2. **Tribute capture ~97% blind** — ~$925/epoch of live incentives on ~19
   pools vs 1 captured event (DeFi Patriot's). Cause: recurring tributes are
   contract-initiated `add_bribe` (asset take-rate callbacks), invisible to
   top-level-msg parsing in org-tla-voting. Fix = wasm **event**-level parse
   keyed on the manager address. History: pre-2025 via FCD re-harvest (event
   filters); retained-window partial recovery; 2025→Jun-2026 joins known_gaps.
   **Block-scale work GATED on the Phase-2 capture registry** (one pass,
   everything: tributes + flows pool-identity + whatever else the hunt finds).
3. **wBTC.creda.a — REFRAMED 2026-07-15:** org discovery was never broken —
   the pool IS captured (token-catalog, 2.675M VP, gauge_status active),
   just identity-unresolved because the Credia adapter is a placeholder.
   Probe list written (PROBES-credia.md): it + the other 2 unresolved
   singles + Credia adapter sources. DeFi Patriot runs probes → curated identity
   overrides + dexes/credia.js build (dex-data 1.2.0).
4. **Ghost/stray gauge votes** in bucket denominators (wstETH-SS,
   wBTC.osmo-*, cross-bucket USDC-USDT strays; ~3M VP earns nothing).
   Distributions = the whitelist; pct math moves to it; expose "wasted VP".
5. **Name-resolution failures** — 4 raw-id pools (one proven = ampROAR-ROAR
   Astroport); display-name parity (bLUNA-LUNA↔LUNA-boneLUNA,
   LUNA-WBTC↔LUNA-wBTC.atom, PAXG-WBTC↔PAXG-wBTC.atom). Historical LP
   addresses from period-120 data need catalog resolution too.
6. **Depth stale/inconsistent** — LUNA-SOLID depth $10.5k < staked $12.5k in
   one snapshot (impossible); several pools ±20-35% vs UI; singles depth=0
   (UI shows staked-asset depth). One source, one timestamp, invariant
   `staked ≤ depth` added to run self-checks.
7. **vp-attribution ordering hazard — REFRAMED 2026-07-15 (audit):** the
   defect lives in the RETIRING personal-repo cron (vp-attribution is not an
   org module). The org layer already supersedes it: tla-voting vote-state
   harvests per-wallet votes AT the flip from retained chain state (no
   staleness window), and rollups schema 5 voters consume that. Dies with
   the personal-repo retirement — no org build needed. (Original evidence:
   DeFi Patriot's 1.18M vote binned as other_vp at e193.)
8. ✅ **dex-data bucket labels — FIXED 2026-07-15 evening (dex-data 1.1.0,
   mock-gated 31/31, deploy pending).** Cross-check vs token-catalog gauge
   truth found THREE Astroport mislabels (LUNA-SOLID stable→project,
   USDC-USDT bluechip→single, LUNA-WHALE null→project) + SkeletonSwap
   labeling nothing (27 gauge pools bucket:null). Root cause: buckets from
   `total_staked_balances` MEMBERSHIP, not gauge classification. Fix:
   lib/bucket-truth.js — `whitelisted_asset_details` on the 4 bucket
   contracts + LP-minter pair resolution, shared by both adapters;
   ambiguity/dewhitelisted flags declared; truth failure → null + errors,
   never a staked-membership guess. dex-data CHANGELOG 1.1.0 carries it.
9. **tla-flows records lack pool identity** (bucket inferable only via
   raw_actions/zap legs — bit us in this analysis) — classifier enrichment;
   rides the capture-registry block pass for history.
10. **Invariant monitors → system-health**: BUILT 2026-07-16 — 1.0.0,
    mock-gated 33/33 + real-data dry run (see
    changelogs/cron-system-health-log.md Rev 1). DEPLOY PENDING: new Render
    cron `org-system-health` (hourly, env GITHUB_TOKEN rw tla-core). Day-one
    dry run already flags #4 (13.71% bluechip VP drift) and finding A (SS
    LUNA-SOLID label) — the monitors work. INV-4 baseline arrives with the
    first post-flip run.

### 🔥 Build order (approved 2026-07-13; spec → approval → build → mock, one at a time)
1. ✅ VP definition fix (SPEC-vp-definition-fix) — **SHIPPED 2026-07-14**,
   live-verified (member-data 1.1.0, canonical 27,973,049.25 = UI).
2. ✅ Distributions harvest + forward capture (SPEC-distributions-capture) —
   **SHIPPED 2026-07-14** (floor 96, 98 periods, zero gaps; forward in
   org-tla-voting 1.1.0). Unblocks the exact history rebuild.
3. **[ ] NEXT:** Rollup rebuilds (pool-status-history, vp-attribution) from
   corrected sources + ordering fix (#7).
4. Tribute event-level capture rework (#2) — forward first; history waits on
   the capture-registry gate.
5. Discovery + naming (#3, #5), depth unification (#6), labels (#8),
   invariant monitors (#10).

### 📒 Found-by-building ledger additions
- Bribe-market reflexivity observed live: the LUNA-SOLID bribe's own success
  diluted its $/VP 87% in one epoch → Votion optimizer dropped it while LP
  staking APR spiked → liquidity migrating in (first: $4.2k USDC-SOLID →
  LUNA-SOLID rotation Jul-13, outside TLA farm contracts — by-design
  coverage note for the flows README). Feature seeds: epoch shift simulator,
  shift feed, wasted-VP detector, biggest-supporters view (tag Votion lock
  contracts in address catalog), freshness timestamps à la Votion.

---

## ⛏ Mined from retired docs (2026-07-14 — SYSTEM-AUDIT-AND-OPS + CRON-FIXES-BRIEF)

Both files walked line-by-line against current truth per SPEC-docs-consolidation
rules; everything below is what SURVIVED. The rest was superseded (fixes to
retiring personal crons, contract mapping now built into the org capture layer,
pricing thinking superseded by PRICING-DOCTRINE, the pre-org NestJS/Postgres
backend plan) and retires with the files — git history keeps them. Chain-query
knowledge that would otherwise die (ve3-connector-alliance) was rescued into
`docs/queries.md` §18.

### Ops (small, real)
- **[ ] Nov-2026 token rollover — legacy crons only.** All `*-data_2026` commit
  tokens expire end-2026; tla-core already runs on one no-expiration token
  (solved). A legacy cron retired before November needs nothing — retirement IS
  the rollover plan. For any still alive in November: new token + Render env
  update, checklist per cron (a missed token = silent capture failure; the
  system-health heartbeat monitor is the safety net).
- **[ ] Dead personal repos — safe to delete now** (0 live references, verified
  2026-06-14): `astroport_json_storage`, `archive-storage`, `nft-tracker`,
  `transaction-tracker`, `adao_nft-tx_2025`. ⚠ NOT `aDAO-Image-Planets-Empty` —
  the 2026-07-09 source audit found **59 live site refs**; stays BLOCKED until
  those migrate (SOURCE-AUDIT-DRAFT §A).
- **[ ] Schedule registry for platform-crons** — Render is the only place org
  cron schedules exist (fragile). Add a small `SCHEDULES.md` in platform-crons
  mirroring Render as the source of truth; fold the dependency rule in
  (foundation data before its consumers).
- **[ ] Retire-or-keep decision: old admin pages** `tla_tool.html` /
  `tla-tool_ext.html` (the deprecated manual-capture flow, replaced by crons).
  DeFi Patriot's call; if kept, label clearly as legacy.

### Feature seeds (still valid, data now exists or is queued)
- **[ ] APR breakdown — "gross − 10% take − 8% compound fee = realized", all
  chain-sourced.** Flagship trust feature. Verification gates before shipping
  (all still open): (1) confirm gauge distributions emissions are pre- or
  post-take; (2) add Astroport base yield to the gross side (realized
  `exchange_rates.apr` includes it — the reconciliation didn't close without
  it); (3) pin the USD price source; (4) ship per pool ONLY on reconciliation
  vs realized — a non-reconciling pool shows a data-health flag, not a number.
- **[ ] Fee-stack transparency content** (rides the Trust & Data tab of the
  tla-stats restructure): non-compounding = 10% take; amplified = 10% take + 8%
  compounder fee ≈ 18% on the reward stream; the 8% buys daily auto-compounding
  (APR→APY), no claim gas, fewer taxable events — net-yield edge mainly on
  higher-APR pools. Neutral framing; fee is documented by Eris, not hidden.
- **[ ] Price/oracle-health panel** — per token, every feed side by side
  (our derived, Astroport, Eris backend, CoinGecko) with divergence vs median,
  freshness, and green/amber/red parity. User trust feature + our own canary
  (real divergences already caught: ASTRO 9×, KUJI 18×, MARS 146× in the Eris
  feed). Merges the standing-canary idea in the price-audit note below.
- **[ ] amplp holdings + transfer helper tool** — amplp are transferable
  tokenfactory denoms (send an LP position wallet-to-wallet without
  unstaking). Per-vault balance, USD, denom-for-Keplr, "$X → base units" send
  helper, and the underlying-token decomposition via the pair `share{}` query.
  ⚠ DECIMALS GOTCHA: most vaults are 6-decimals but BTC-style are 8 — read
  decimals from source, never hardcode 6 (100× send error otherwise).
- **[ ] "Control of TLA" concentration panel** — per-holder VP concentration
  (top-1/5/10 share, Nakamoto/HHI) from the lock census. HONESTY RULE:
  multi-wallet clustering cannot be proven on-chain — label per-wallet, never
  imply wallet count = distinct people.
- **[ ] Bribe-source → Votion-swing attribution + contributor leaderboard +
  batch-staleness gap** — decompose Votion's VP swing by briber (PD / Solid /
  Astroport / aDAO / individuals) as a centralization-health signal; a
  $-contributed leaderboard; and per-epoch bribe-efficiency drift for batch
  bribes (added 4 epochs at once, graded at add-time — show the gap as a
  re-optimize nudge). Data: tla-voting bribe stream × Votion allocations.
  Attribution law applies (personal wallets = the individual, never aDAO).
- DAO-arb bot (DeFi Patriot's intent: treasury-funded arb supporting TLA pairs) —
  recorded verdict stands: a SEPARATE, later, governance-approved project with
  realistic edge analysis first; the dashboard ships the informational versions
  (slippage, zap-impact, alerts) which are already in the restructure spec.


## 📜 Backfill audit — pass two DONE 2026-07-16 (BACKFILL-AUDIT.md)

Full history inventory + anomaly hunt + per-chart merge design committed as
docs/pending-changes/BACKFILL-AUDIT.md. Headlines: price-history is pristine
(1,355 gapless days); the bribes/rewards/flows event streams share a
16-17-month pruned-window hole (2025-02→2026-05) that is STRUCTURAL (post-FCD,
pre-org-cron) and fully covered at period granularity by bribe-state +
distributions (both complete 96→193) — chart rule recorded; epoch-series
history floors at ~epoch 184 by construction. Work item RESOLVED 2026-07-16 the provenance-clean way:
**price pre-history via the PAID pipeline.** An import from old
luna-usd-daily was prepared, then rejected on provenance grounds before
commit — correctly — even though values proved identical to 8 decimals on
61 overlap days (same CoinGecko series). Instead the committed Price
Backfill Action ran with backfill_from=2022-05-28: series now 1,512 gapless
days from phoenix genesis, one pipeline, one provenance. Post-run
verification caught a REAL regression: the backfill's per-DAY merge replaced
21 live-era LUNA entries (2026-06-26→07-16) carrying the daily cron's
multi-source/confidence records — value drift vs CG daily-avg mean 2.2%,
max 8.8%. Fixed same day: (1) corrected 2026/06+07 month files restoring
the rich entries (genesis additions preserved); (2) backfill.js 1.0.1 —
merge guard that NEVER downgrades a rich multi-source token record to a
single-source value; (3) the daily cron self-healed forward on its own
(2026-07-17 already rich). luna-usd-daily/bluna-usd-daily site fetches
re-point at Batch-3 (G13), then the old files retire. The flip-review checklist gains
BACKFILL-AUDIT §5 (rollups overlap-diff vs old 184→193 epoch files, period
194 in all three state products, first tribute events, INV-4 armed, votion
rate monotonicity). Token identity: PAXG + wstETH voucher decimals RESOLVED
= 18 (solved from Credia supply math with wBTC/LUNA as controls; overrides
updated — that item retires).

## 🗳 votion module — G2 BUILT 2026-07-16 (org-votion 1.0.0, mock 28/28)

UI-DATA-READINESS G2 (the data-loss clock). Branches A+B built per
SPEC-votion-capture; Branch C (Eris optimizer NEXT) = v1.1, old votion cron
covers Sundays meanwhile. Probes ANSWERED 2026-07-16 — user_info
shape corrected (parser rewritten to the real
gauge_votes[{gauge,period,votes:[[id,bps]]}] shape), re-gated 30/30.
DEPLOY-READY: Render cron org-votion, hourly :20, env GITHUB_TOKEN. After
first live runs: parallel-run vs old votion-positions output, then retire
old cron + votion-positions-data_2026. Pools-tab "Votion Now" re-points to
votion/snapshots/vaults.json votion_vp_now_per_pool during Batch-3.

## 🔎 Credia deep dive — probes answered, knowledge base + identities landed (2026-07-16)

All PROBES-credia items answered (probe file marked ANSWERED; results live in
`ecosystem-knowledge/credia.facts.json` + `credia.md` and
`curated/token_overrides.json`). Findings that create or touch work items:

1. **Credia is a lending protocol, not a dex.** Whole market state = one smart
   query `{"metrics":{}}` on the Portfolio contract
   (terra1y6hfmr3lxxj6srduhlfz96x7sga2984pr757a0nrfuqxa9rqxapqcjv4zz). The
   `dexes/credia.js` adapter models lending MARKETS normalized to the common
   pool shape (`pool_type: "lending_market"`, tvl = supplied USD, lending
   truth under `raw`). BUILT 2026-07-16 — dex-data 1.2.0, mock gate 39/39
   (changelogs/cron-dex-data-log.md Rev 1). Deploys with the next org-dex-data
   run (no Render changes needed — adapter registry already listed credia).
   FOLLOW-UPS: (a) DONE 2026-07-16 — system-health 1.0.1 FRESHNESS_MAP
   covers dex-credia + votion (vaults 6h / positions 30h); (b) system-health
   INV2/INV5 iterate all enabled dexes and pick credia up automatically —
   INV2 skips it (no staked_liquidity_usd field), INV5 joins any
   gauge-labeled markets.
2. **Take-rate tribute lead (for the tribute/bribe rework):** the three TLA
   ampLP collateral markets (gauge pools 32/46/52) carry `take_rate {fixed:
   0.02}` — the only Credia markets that do (~$150K ampLP posted). HYPOTHESIS,
   explicitly unconfirmed: this feeds the contract-initiated add_bribe
   tributes. Test mechanically against bribe_capture sender addresses once
   post-flip data accumulates (first capture 2026-07-19). If confirmed, Credia
   becomes a named briber for bribe-source attribution.
3. **Identities closed (5):** vcawbtc = gauge wBTC.creda.a (the 2.69M-VP
   single), xASTRO, arbLUNA, PAXG, wstETH — all chain-verified, now in
   token_overrides.json. PAXG/wstETH decimals left null pending voucher-level
   verification — do NOT guess before pricing math.
4. **ampROAR-ROAR resolution:** the dewhitelisted gauge mystery entry is the
   DRAINED Astroport xyk pair contract (reserves + total_share = 0), not a
   token. Catalog must handle gauge assets registered by pair address — fold
   into the token-catalog stale-bucket/multi-bucket fix (finding A) touch.
5. **wBTC.creda.a depth/pricing note:** vcawbtc is a receipt token — its value
   derives from supplied wBTC in the Credia market, not from any swap pool.
   Depth/slippage semantics differ from LP pools; flag for the depth
   unification work (#6).

## Audit findings — 2026-07-15 late-night deep dive (post 1.1.0/2.3.0 deploys)

**Verified clean:** dex-data 1.1.0 live output — Astroport 37/37 gauge pools
labeled, ZERO mismatches vs token-catalog truth, all three former mislabels
corrected in committed data, ambiguity + dewhitelisted flags flowing; SS 27
gauge pools now labeled. tla-voting bribe-state — 61 CONTIGUOUS periods
(133→193), zero D5 field violations, epoch-end month routing landing history
in its 2025 months (the bribe capture hole is filling from state as the walk
descends); floor certification expected within ~2 hourly runs. Distribution
fractions sum to exactly 1.0 in all four buckets (INV-3 passes live).

**New defects found (filed, in priority order):**

A. **token-catalog: no multi-bucket handling in gauge discovery.** The chain
   can list one asset under MULTIPLE bucket contracts' whitelisted_asset_
   details (live example: the SS LUNA-SOLID factory LP is whitelisted:true
   under PROJECT and dewhitelisted under STABLE tonight). The catalog carries
   only a single stale entry (bucket stable, dewhitelisted) — dex-data 1.1.0's
   resolver caught the disagreement (bucket_label_agreement in action, before
   the monitor even exists). Fix: port dex-data's resolveBucket semantics
   (whitelisted wins, canonical order, ambiguity DECLARED) into token-catalog
   discovery. Small; rides the next token-catalog rev.

B. **member-data vp_voting_per_bucket includes ghost/stray votes.** Epoch-194
   like-for-like: bluechip member-data 27.67M vs sum of ACTIVE catalog pools
   23.88M — ≈3.79M ghost VP in the bucket figure (single shows ≈1.76M). This
   is defect #4's surface inside member-data: bucket denominators must come
   from the distributions whitelist, with the remainder EXPOSED as wasted_vp,
   not blended in. (Timing caveat: member-data ran 21.6h before the catalog;
   magnitudes are approximate, direction is not.) Rides defect #4's build.

C. **price-history heartbeat is a fossil.** heartbeat.json (356h stale)
   belongs to the one-off backfill tool; the DATA is current — token-catalog
   appends daily rows (2026-07-15 present). Fix: system-health reads the
   latest day key as the freshness signal for this product; optionally
   token-catalog stamps the heartbeat on append.

D. **Heartbeat conventions are inconsistent** across products: mixed
   timestamp fields (updatedAt / capturedAt / ran_at / generated_at) and
   skip-runs that don't stamp (distributions reads 30.4h old after an
   'up to date' skip; address-catalog 46.6h on its own cadence). Not data
   defects — but SPEC-system-health D2.6 needs a per-product cadence + field
   map, and one-off products (provenance) need a kind marker exempting them.

**Spec addendum queued for SPEC-system-health (pre-approval):** INV-1
like-for-like must be same-DAY not just same-epoch (the 21.6h skew above);
INV-6 freshness uses product-appropriate signals per finding C/D.

### Riders on already-queued builds
- Discovery/naming build (#5): also tag migrated-away pool corpses
  (same name+dex, dead gauge after a curve-type migration) —
  `is_migrated_legacy` / `current_canonical_gauge_for_pair` flag so the active
  pool per pair is explicit, not inferred from VP size.
- Invariant monitors (#10): add the gauge-identity invariants — within one
  snapshot a `gauge_pool_id` appears in exactly one bucket, and a
  `name+dex+bucket` has at most one active gauge (warn, never silently emit).

---

## 🏛 tla-voting migration + FCD archive breakthrough (2026-07-07/08)

Full story: `tla-core/docs/changelogs/cron-tla-voting-log.md` (Rev 1–2) and the
FCD section in PROJECT_KNOWLEDGE. Summary + resulting queue:

### ✅ Done (2026-07-07/08)
- **tla-voting migrated end-to-end** — seed + `org-tla-voting` Render cron
  (6-hourly) live at `thealliancedao/tla-core/tla-voting/events/`; old
  history/voting names purged from both org repos.
- **FCD frozen archive discovered** (genesis→~2025-01-07) + harvester built;
  **10 harvests complete (~84k txs)**: minter, collection, 3× governance,
  5× LP custody.
- **fcd-fill executed** — tla-voting streams at TRUE genesis (2024-08-27):
  votes 8,270 · locks 13,585 · bribes 172 · rewards 6,038. Residual gaps
  recorded honestly (votes/locks Jun-15→22; bribes/rewards Jan-25→Jun-26).
- **aDAO mint story chain-verified** (1,191 free GoA + 8,809→treasury =
  10,000 exact; break_nft = 1,010 not 1,000) — see MINT-TEMPLATE.md.

### 🔥 P1 — the queue (in build order, one at a time)
1. **Provenance ledger derive** → `tla-core/nfts/adao/provenance/` (script
   `.github/scripts/adao-provenance/`): per-token mint→transfers→state,
   per-wallet cost basis, the exact 1b/2a split, release-history verification
   (then correct `release-history.html` from chain-exact numbers).
2. **tla-flows deploy review + deploy** — code `cron-scripts/tla-flows/`
   Rev A.3; check vs org conventions + resolve nfts-flows name collision.
   RETENTION CLOCK: the permanent LP hole grows weekly until deployed.
3. **flows-fill derive** — LP harvests (55,199 txs, `archive/fcd/lp-*`)
   through the flows classifier (fcd-fill pattern).
4. **SPEC-tla-stats-restructure.md** — agreed design: global member LENS
   (selector currently Overview-only), hook landing (epoch clock, money
   board, activity ticker, leaderboard teaser, wallet-lookup CTA), tab remap
   (Member Stats → My Portfolio; Docs → Trust & Data w/ coverage map),
   slippage 3 surfaces (pool grades / on-off-ramp tool = Zap-Out Optimizer /
   personal exit-cost via lens). Rides the Batch-3 source re-pointing —
   **tla-stats.html currently consumes 23 personal-repo sources, zero org data.**
5. **votion-positions migration** (Votion users' portfolios incomplete
   without it) · **reconciliation section in org-tla-voting** (events ≟ live
   escrow state, match-rate in heartbeat) · **address-catalog rider**
   (bribers — 172 events give the real list — + wrapper namespaces).
6. Docs/wiring: health monitor → tla-voting heartbeat; read the fcd-fill
   Actions log for the FCD↔legacy overlap verdict (UNREAD).

### 🌊 tla-flows walker + capture-layer queue (added 2026-07-08, post-deploy-night)
Context: the Rev B tx_search engine stalled on its first live runs (backfill
species on a forward schedule — doctrine now in SPEC-tla-flows-walker §0).
Rev C block-walker built + mock-verified same night.
- ✅ DONE: Rev C walker committed; org-tla-flows resumed (verify banner 2.0.0).
- **[ ] 17-day retained-history catch-up** — one-shot tx_search harvest
  (fcd-harvest style, slow is fine) of the ~17 days public nodes retain,
  merged under the same tla-flows month files. Pairs with flows-fill.
- **[ ] Phase-2: platform capture layer (DeFi Patriot's design)** — promote the
  walker to the single chain-reader: a registry file (addresses + message
  patterns → destination bucket, config/contracts.js-style) routing matched
  txs into per-domain captures; nft-flows and eventually tla-voting become
  consumers instead of running their own scanners. Spec before build.
- **[ ] Live activity feed (site product)** — websocket subscription showing
  TLA activity live, walker as its reconnect/catch-up spine. After Phase-2.
- ✅ DONE 2026-07-14: hard-deadline (40s) httpGet fix ported to org-tla-voting
  (shipped inside 1.1.0 with the distributions step) — the latent tarpit hang
  it shared with tla-flows Rev B is closed.

### 🧭 Storage-conformance queue (added 2026-07-08 — from the settled-convention audit)
Canonical convention + full Deviation Register: `TLA-CORE-STORAGE-DESIGN.md`
(corrected 2026-07-08: events = monthly `{YYYY}/{MM}.json` JSON arrays; the
daily-jsonl plan is superseded). Ratified in-session with DeFi Patriot.
- ✅ DONE 2026-07-08: `nfts/adao/provenance/tokens/` re-derived `.jsonl` →
  `part-NN.json` JSON arrays (delete the 10 old `.jsonl` files on commit).
- **[ ] tla-voting events restructure** — per-stream single files
  (`reward-events.json` already 16.6 MB, growing) → monthly `{YYYY}/{MM}.json`
  per stream. **MUST land before Batch-3 site wiring** — zero consumers today
  makes this the cheapest it will ever be. Touches: org-tla-voting cron + seed
  + fcd-fill (shared `<<CLASSIFIER v3>>` block — diff-verify after).
- **[ ] index.json conformance sweep** — add the standard manifest to:
  `price-history/`, `nfts/adao/flows/`, `nfts/adao/snapshots/`,
  `dex-data/{astroport,skeletonswap}/snapshots/`. Each owning cron writes its
  own; one small PR-sized change per cron, batchable.
- Process rule (binding, all sessions): any new deviation discovered gets a
  Deviation Register row + an item here THE SAME DAY. No silent drift.

### ⚠ Org→personal dependency audit (2026-07-08) — cut before ANY personal-repo deletion
Verified: NO org cron writes to personal repos. Four org READS exist:
- ✅ Acceptable (one-time seed bridges, inert): tla-voting-seed legacy bootstrap
  (self-disabled) · price-history backfill Actions (executed).
- 🔥 **capture-engine.js** (required by org address-catalog + token-catalog)
  hardcodes fetches of `tla-snapshot-data_2026` + `network-and-prices-data_2026`
  — known June interim ("dissolves later"). TRACE whether the org crons still
  exercise those paths; dissolve or repoint. Until then those two repos are
  NOT deletable.
- 🟢 org nfts/adao reads `defipatriot/nft-metadata/adao-rarity-intended.json`
  (static curated file, not cron output) — migrate to `tla-core/docs/curated/`
  before touching nft-metadata.
- 📋 `fuel/` — **disposition DECIDED (2026-07-08): absorb, don't migrate.**
  Fuel = hourly FUEL-token price/TVL/volume + daily OHLC (since 2026-04-13);
  the price exists nowhere else (thin market, priced from its pool). Plan:
  (1) fold the daily OHLC series into `price-history` as FUEL's seed (the
  June-dailies fold pattern); (2) archive the raw hourlies losslessly under
  org `archive/`; (3) add FUEL to token-catalog's tracked set + price-history
  forward capture (pool/denom/source = read `cron-scripts/fuel/` first);
  (4) THEN suspend the fuel cron — after tracing both readers (site reads
  `fuel-data_2026`, a separate repo — the cron may write two places). No
  standalone fuel cron going forward.

### 🗑 Retire board addition — personal `defipatriot/tla-core` writers
Four legacy Render crons still write to the June-interim personal tla-core:
`fuel` (fuel/snapshots), price cron (prices/), address-catalog v1 (catalog/),
contract-token-catalog (contracts/) — all superseded by org rebuilds. Retire
after verifying nothing still reads them (system-health MONITORED paths,
site fetches). ⚠ Two repos named `tla-core` — always check the OWNER before
destructive ops.

---

## 🏗 tla-core migration — foundation crons (active, 2026-06-25)

> ⭐ 2026-07-08 note: the P1s below concern the PERSONAL-repo interim crons —
> since superseded by org rebuilds (see retire board above). Kept for context.

The unified-repo migration is underway. `fuel/` was the pilot; this session added
the first who/what/price modules + the history engine. **Full audit + handoff:
`TLA-CORE-STATUS.md` (read it first for tla-core work).**

### ✅ Done this session
- **tier-builder** (`lib/tier-builder.js`) — history cascade engine, unit-proven.
- **address-catalog** — WHO registry, LIVE (`tla-core/catalog/`), 389 addresses, self-contained.
- **contract-token-catalog** — WHAT registry, LIVE (`tla-core/contracts/`); ampLP denom
  per-pool matching fixed. (Reads tla-snapshot — interim; dissolves later.)
- **price cron** — token prices, LIVE (`tla-core/prices/`), token-only after the
  LP/ampLP correction (see below).
- **docs centralized** — epoch schedule + Staking APR.csv → `tla-core/docs/`.

### 🔥 P1 — Realign the 3 new crons to the settled storage layout
They write `catalog/current.json` (module/files) — **missing the `product` level
and `index.json`** that `TLA-CORE-STORAGE-DESIGN.md` requires (see `fuel/` as the
reference: `fuel/snapshots/…`). Fix: `{module}/{product}/` + `index.json` + full
heartbeat schema. Update `system-health.js` MONITORED paths to match. Low-risk, mechanical.

### 🔥 P1 — Build the self-contained domain crons (lift code, don't repoint)
The goal is to DELETE old crons + repos, not feed off them. Build, run parallel
with the old, prove identical, then retire. One at a time. **Sandbox can't reach
Terra RPC — lift the proven functions, DeFi Patriot verifies on Render.**
- **[ ] `token-catalog`** (rename of price-cron) — absorb network-and-prices
  (pricing + ratios, Pricing-Doctrine intact) + tla-registry token identity
  (logos 1/token + 2/pair, decimals, categories). Retire network-and-prices repo.
- **[ ] `DEX-Data`** — absorb tla-snapshot (lp_health/amp_lp/buckets) + astroport +
  skeletonswap; pools, reserves, **share-based LP/ampLP position valuation**, the
  slippage-simulator data. Retire those repos.
- **[ ] address-catalog** — absorb tla-registry's address side (known_contracts,
  wallets, protocols, directory). Then retire tla-registry + interim contract-token-catalog.

### ⚠ Correction logged — LP/ampLP are NOT per-unit priced
The platform values LP/ampLP positions by SHARE FRACTION (`staked/total × pool_usd`,
the adao-positions method that matches Eris's $7,593.66), NOT amount × price.
`tla-snapshot.amp_lp.shares` is inconsistent across pools and cannot be a divisor.
→ token prices live in `token-catalog`; LP/ampLP valuation lives in the positions module.


---

## 🛡 Systemwide reliability audit (2026-06-09)

Triggered by finding that `nft-inventory.js` had been *silently* dropping DAODAO unstakes for months (a publicnode pagination quirk: `pagination.offset` is ignored, only `page` is honored). That one bug exposed a recurring **failure-class** pattern. Every cron was walked through the checklist below. The common root across all findings: **code that couldn't distinguish "query failed" (null) from "no data" ([]/end-of-list)**, which silently produces incomplete data that can reach permanent archives.

### Failure-class checklist (run this against any new cron)
- **F1 — Pagination truncation.** `pagination.offset` (ignored by publicnode → use `page`), `page`-cap, or a `start_after` loop that stops early.
- **F2 — Silent null-coercion.** `r || []` / `Array.isArray(r) ? r : []` right after a query that returns `null` on rate-limit → empty masquerades as "no data."
- **F3 — Overwrite-with-partial.** A snapshot clobbers last-good with fewer/empty records on a bad run (worst when it reaches a permanent archive).
- **F4 — Corrupt-vs-absent input.** A `try/catch` that treats a *corrupt* file like a *missing* one → silently drops a whole source.
- **F5 — Staleness / schema drift.** Static reference data going stale (oracle), or an upstream field rename silently zeroing a parser.
- **F6 — Required-vs-optional misclassification.** A source that should be fatal treated as optional → partial publishes marked `ok`.
- **F7 — Heartbeat honesty.** Does `status` actually flip to `partial`/`error` on failure, or always say `ok`? If it lies, the health widget never alerts.
- **F8 — Epoch/time boundary.** Off-by-one epoch, UTC flip, missed end-of-epoch window → irreversible wrong-epoch capture.

### Fixes shipped this pass
- **[x] `cron-scripts/nft-inventory/nft-inventory.js`** — F1: `buildTxSearchUrl`/`fetchDaodaoTxs` now page-based `ORDER_BY_DESC` (was ignored `pagination.offset`). Captures all unstakes; `reconciled` flag will read true.
- **[x] `cron-scripts/tla-snapshot/tla-snapshot.js`** — **F2+F3 (critical):** added a completeness gate after the 9 core chain queries (`gauge_infos × 4`, `total_staked_balances × 4`, `distributions`). A `null` (failure) now aborts the run (exit 2, no publish) instead of `|| []`-coercing a whole bucket to empty and freezing it into the permanent daily archive.
- **[x] `cron-scripts/chain/tla-registry/tla-registry.js`** — **F2 (high):** `list_stakers` + `all_tokens` enumeration loops now distinguish `null` (failure) from `[]` (genuine end); a mid-walk failure records to a module `ENUMERATION_FAILURES` registry → status `partial` (+ surfaced in snapshot). No more silently-truncated catalog.
- **[x] `cron-scripts/tla-vp-holders/tla-vp-holders.js`** — F2: same `all_tokens` truncation fix → `ENUM_INCOMPLETE` → status `partial`.
- **[x] `cron-scripts/bribes-history/bribes-history.js`** — F2+F7: proposal-walk truncation fix; **added a `partial` status it never had** (`PROPOSALS_INCOMPLETE`).
- **[x] `cron-scripts/adao-positions/adao-positions.js`** — F7: run status now escalates to `partial` when any member portfolio has `_errors` (was only treasury/council), + `members_with_errors` in heartbeat stats.
- **[x] `nft-inventory-data_2026/{nft-provenance,bbl-sales,atrium-sales}-backfill.js`** — **F3 (critical):** never-shrink publish guard. History is append-only; a sweep producing fewer records than committed = incomplete → abort (exit 1), don't overwrite.
- **[x] `nft-inventory-data_2026/nft-analytics-builder.js`** — **F1 fix #5 (F4):** boost/atrium/bluna inputs now distinguish corrupt (throw) from absent (skip). **F5:** extends LUNA + bLUNA oracles to "now" via live `network-and-prices` prices, so post-oracle sales price live instead of stale last-known (best-effort; falls back to static oracle).

### Clean bill
- **`network-and-prices`** — the model cron (per-source `.ok` flags, `stuck/partial/ok` escalation, fingerprint staleness detector). Propagate its fingerprint approach to others over time.
- **`astroport`, `votion`, `skeletonswap`** — single-fetch / concurrency-worker patterns, no enumeration loop to truncate. (`skeletonswap`'s `while(true)` is a parallel-map worker, not pagination.)

### Remaining (flagged-not-silent — polish, not landmines)
1. **[ ] F5 follow-up:** the static `luna-usd-daily.json` / `bluna-usd-daily.json` only get *live-extended* at build time now; consider a tiny daily appender so the on-disk oracle itself grows (the in-memory extension covers correctness today).
2. **[ ] `network-and-prices` carry-forward:** on dual-oracle failure for a token it writes `final_price_usd: null` (overwriting last-good). Already flagged `partial` + dashboard caches, so visible. Fix: add `fetchPreviousSnapshot()` and carry forward last-good with a `stale: true` flag. *Touches the linchpin — test carefully.*
3. **[ ] `astroport` / `votion` partial status:** both are throw-based all-or-nothing; `astroport` can partially succeed (liq ok, vol fail via `fetchOk`) but status stays `ok`. Minor F7 — add a `partial` branch.
4. **[ ] `marketplace-stats` (Pixel-Lions, parked):** `fetchBblActivityPages` catch does `warn + break` (silent truncation of the activity feed). Tier 3, daily-refresh, no permanent archive. Fix with the same flag-to-`errors` pattern when Pixel-Lions work resumes.

---

## 🎯 TLA Stats expansion — clean next steps (planned 2026-06-12, build pending)

Discovery is complete for the whole TLA-Stats data-capture expansion. Nothing below is built yet; all of it is documented in `cron-scripts/README.md` "Project status & roadmap" and `PROJECT_KNOWLEDGE.md` "TLA Stats — product pillars & planned capture expansion." Recommended build order:

### 🔥 P0 — One-field Render fix (do anytime, unblocks Portfolio Tracker history)
- **[ ] Switch `adao-positions` Render schedule `0 1 * * 1` → `0 1 * * *`.** The code already expects daily; the schedule was never changed, so no daily P&L history accumulates. Every week unswitched is permanently lost forward-history. (No code change — Render dashboard only.)

### 🔥 P1 — Extract the shared capture engine (keystone, do before ally crons)
- **[ ] Extract `lib/capture-engine.js`** from `adao-positions.js` — the per-address position-capture logic (LP positions, rewards, voting, locks, bribes, balances, summary). All planned member crons import it, so "fix once, all benefit." Tradeoff accepted: the new crons depend on it, but independent discovery/output/scheduling keep them isolated otherwise.

### 🟢 P2 — Member-expansion crons (separate cron per source; build after the engine)
Each its own repo + heartbeat + schedule so allies can't break aDAO and can be paused independently. Membership always live-queried (never a hardcoded CSV).
- **[ ] `tla-participants`** (highest value — catches non-governance liquidity providers): all TLA-lock holders (CW721 enumeration of veLUNA `terra1uqhj8…`, confirmed enumerable, 431 locks) ∪ all bribe providers (read from `bribes-data_2026`).
- **[ ] `pixellions-positions`**: Pixel Lions registered members. DAO core `terra1c690mdrwdetnr09zfk3tf9xz9jhrgd9wpjyf3tuccj74ql09eqmq6sh7en`.
- **[ ] `liondao-positions`**: Lion DAO registered members. DAO core `terra1tkersa2mqwy2h8exj799qx2xrhdu0dkymk9psp6v0k4kz4tkxucssgluec`.
- **[ ] Widen `adao-positions`** to include unknown (unnamed) members (one-line filter change — currently named-only).

### 🟢 P2 — `tla-locks` cron (its own big cron; full schema mapped, see PROJECT_KNOWLEDGE)
The highest-value *new* capture — stale-VP-gap + unlock-cliff metrics exist nowhere else in the ecosystem. Forward-tracking, so clock-start has urgency. Captures per-lock asset/underlying/stamped-ratio/VP/slope/coefficient/window/permanent-flag/owner; system totals in one `total_vamp` call; derives auto-max status, weeks-to-unlock, stale-VP upside (via config oracles), participation order, per-member rollups, Boost-listing cross-ref, and voter-behavior metrics (churn + votes-on-dead-LPs from the gauge controller).

### 🔲 P3 — TLA Stats page (`tla-stats.html`) — the four pillars UI
Once the capture above accumulates: **Portfolio Tracker**, **LP Performance & Health Scoring**, **Bribes Tracking**, **Vote Intelligence**. Bribes/Vote-Intelligence are buildable soonest (multi-epoch bribes + snapshot data already has depth); Portfolio Tracker needs the accumulation runway. `tla-stats.html` is ~7,000 lines of polished rendering — data-layer changes only, never restructure the render code.

---

## 🛠 Active / next round

### ✅ DONE — Dashboard data-source migration (`index.html` `fetchTlaData`) — shipped Rev 3.51–3.54 (2026-06-11/12)
**Resolved via the dao-dashboard cron** (a cleaner solution than the per-source adapter originally specced below). The new `dao-dashboard` cron assembles the DAO aggregates server-side into a legacy-compatible `{meta, dashboard}` shape, so `fetchTlaData` simply reads that one file (live-primary, 26h fresh-gated) with the legacy epoch walk-back as fallback. The Unclaimed Rewards / TLA Deposits / Lion tiles are now hourly-fresh instead of frozen at epoch 185. Deep-dive pages (`dao_treasury.html`, `dao_tla_deposits.html`) migrated the same way. Also shipped in this arc: cron-first instant paint (~9s→3-5s load), deving.zone fully eliminated from index, chart history revived past 185, heartbeat false-stale fix. Full detail in `index-log.md` Revs 3.51–3.54 and `cron-scripts/dao-dashboard/README.md`. The original per-source adapter plan is retained below for reference but is superseded.

<details><summary>(superseded) original per-source adapter plan</summary>

**Identified 2026-06-09.** The DAO Unclaimed Rewards + DAO TLA Deposits tiles are stuck (`--` / spinner). Root cause: `fetchTlaData()` (index.html ~line 9836) still reads the **dead** monolithic `tla_json_storage/main/tla-data-epoch-{N}-end.json` (404 for epochs ≥186). That old file bundled pools + DAO treasury + locks + balances + ratios in one blob; the **new architecture split it across 4 crons**, so this is a *routing* migration, not a URL swap.

**Old `tlaData.*` field → new source mapping (confirmed against live data 2026-06-09):**
| Old field(s) | New source | New path |
|---|---|---|
| `tlaData.pools`, `tlaData.vote.pools` | tla-snapshot cron | `tla-snapshot-data_2026/data/tla-snapshot.json` → `pools[]` / `buckets{}` / `totals{}` / `epoch{}` |
| `tlaData.dao`, `tlaData.locks(.individual_locks)`, `tlaData.totalDeposit`, `tlaData.tokenBalances` | adao-positions cron | `adao-positions-data_2026/data/current.json` → `treasury.{locks, lp_positions, wallet_balances, summary}` |
| `tlaData.vote` (rewards) | adao-positions + tla-snapshot | `treasury.{pending_rewards, pending_rebase, pending_bribes}` and/or `tla-snapshot totals.rewards` / `buckets[].rewards` |
| `tlaData.lstRatios`, `tlaData.ampRatios`, `tlaData.tokenPricesAtSnapshot` | network-and-prices cron | `network-and-prices-data_2026/data/network-and-prices.json` → `lst_ratios{}` / `token_prices{}` |
| `tlaData.snapshotDate` | any | new `capturedAt` |
| `tlaData.meta` (staleness) | rebuild | from heartbeat `dataFreshness` / `capturedAt` — **date-based now, not epoch-based** |
| `tlaData.dashboard(.alliances)` | TBD | needs an archived `tla-data-epoch-N-end.json` to confirm exact semantics, or reverse-engineer from consumers |

**Recommended approach (lowest risk):** rewrite `fetchTlaData()` as an **adapter** that fetches the 3 new sources and assembles an object matching the old `tlaData` contract, so the **12 consumer call sites stay unchanged** (lines 7159, 8272, 8546, 9330, 9836, 10065, 10307, 10483, 11134, 11229, 11297, 11385). Field mapping lives in one place.

**Hard requirements (per DeFi Patriot, 2026-06-09):**
- **Remove the old fallback entirely** — delete the `tla_json_storage` epoch walk, the `tla-ext_json_storage` reads (`fetchTlaExtData`, ~line 9883), and the `epoch_1-300_date.json` ref (~line 9807).
- **Work-as-intended-or-error:** if a new source is unavailable, the tile shows an **error state** — never a stale snapshot or a silent default.
- Also retire the v3-format fallback block (~line 5020-5024).

**Caveats:** untestable from the sandbox (browser code in a 914 KB / 15k-line file). Test in-browser after. Obtain one archived `tla-data-epoch-N-end.json` if possible to nail `dashboard`/`dao` field semantics exactly. Per project rule, `index.html` data-layer changes only — don't touch render logic.

</details>

### ✅ DONE — NFT Explorer repoint (`nft-explorer-app.js`) — shipped 2026-06-09/10
deving.zone fully removed; explorer reads `data/v2/nfts.json` + canonical rarity files only, with hard-fail integrity gates (10,000-record check, owner-resolution check, no fallbacks). Details in the Rev 2 section below and `explorer-log.md`.



### 🔥 P1 — NFT Explorer page migration (Rev 2)
**Identified 2026-06-06. Rev B cron foundation shipped 2026-06-07. Explorer migration SHIPPED 2026-06-09/10 (items 1–7); item 8 (pending-claims surfacing) remains — per-record flag now carried through the merge, UI not yet built.** The `nft-inventory` cron Rev B now produces a full chain-of-truth replacement for `deving.zone/nfts/alliance_daos.json` (which has confirmed bugs: 16 missing DAODAO stakers, 54 undercounted, DAODAO contract itself listed as a 384-NFT user, no Atrium awareness, no Boost seller resolution). The explorer page still reads from deving.zone — Rev 2 swaps the data source.

**Affected file:** `nft-explorer-app.js` (237 KB main page logic)

**Changes needed:**
1. **[x]** Swap `STATUS_DATA_URL` from `deving.zone/nfts/alliance_daos.json` → our cron's `nfts.json` raw URL
2. **[x]** Adapt `mergeNftData()` to handle Rev B records[] format (schema v2) with new fields: `real_owner`, `listing{...}`, classification flags
3. **[x]** Replace dead `MEMBERS_CSV_URL` (`adao_json_storage/main/members.csv` — repo dead since 2026-05-17) with our cron's `summary.json` (richer data — per-staker counts + voting_power_pct)
4. **[x]** Add marketplace badges with prices: "Listed: 2,200 bLUNA ($1,875)" — BBL/Atrium/Boost icons
5. **[x]** Add backing display tile: collection-wide treasury value ($1.65M today) + per-NFT share (88.20 ampLUNA) + boost-mechanic story ("share grew +12.3% since launch as 1,093 NFTs broke")
6. **[x]** Add AbortController timeouts on all `.json()` fetches (deving.zone-hang lesson — same fix applied to `index.html` below)
7. **[x]** Add new badges/filters: "DAO Treasury" (898 broken), "Atrium Listed" (1), distinguish "Enterprise Staked" (403 real) vs "Enterprise DAO Broken" (100 gov)
8. **[ ]** Surface pending claims from `summary.daodao_pending_claim` (cron ships this as of Rev B.3): a global "N NFTs unstaked & pending claim" stat, and a per-wallet "You have N NFTs ready to claim" nudge when a viewed/connected address appears in `claimable[]`. Show `reconciled: false` defensively (render count, treat per-wallet detail as best-effort).

Estimate: 4-6 hrs. Verify cron data has run cleanly for 24+ hours first. Don't ship Rev 2 same-day as Rev B.

### 🟢 P2 — NFT Explorer Analytics tab: investor-grade expansion (spec'd 2026-06-10)
**Context.** Goal: stats an investor in a stock/token would expect, applied to the collection. The wishlist originally lived only in chat — this section is now canonical.

**Shipped 2026-06-10 (client-side, live data only):**
- **Supply screener** — the collection read like a token: Max 10,000 · Circulating (minted) 4,172 · Staked/DAO-controlled 3,049 (1,632 DAODAO + 14 pending + 403 Enterprise + 1,000 DAO broken) · Free float 1,054 + 48 listed; stacked supply bar.
- **Governance concentration** — Nakamoto coefficient (currently **4** wallets > 50% of staked VP), top-1/5/10 VP shares (19.9% / 57.9% / 68.1%), 157 stakers. VP = DAODAO-staked NFTs; broken keep VP.
- **Floor by tier** — Broken / Unbroken (base) / Phoenix rows: listed count, **listing floor** vs **sales floor** (median of recent tier sales, USD-at-sale) and the **spread** between them. Backing reference shown. Caveat noted in-UI: sales classified by *current* broken state. NOTE: the panel surfaced an apparent −84% base spread on day one, which turned out to be a cron-side ghost listing (see brief item 5) — real base floor ≈ $101 / spread ≈ −6%. Panel self-corrects when the resolver fix lands; the panel catching this is the point.
- **Floor-history chart (complete)** — sales bars (low->high + median) x 12W/12M x Broken/Base/Phoenix with ‹older/newer› paging through full Dec-2023->now history; historical cheapest-listing **USD-range band + mid line** from `listing-history.json` + daily oracles (stablecoin-denominated asks render flat — correctly); **LUNA price overlay** (own scale, toggleable); legend; tier classification **exact via `broken-at.json`** (109 previously mislabeled sales reclassified). Defensive liveness filter on open listing segments (ghost 14765).
- **Mark price & Market cap** — per-tier mark = mid(sales floor, listing floor); Mark column in Floor-by-tier; hero = Market cap (Σ tier mark × circulating) + FDV + Mark(base) + volume + highest sale ("Value today" removed).
- **Click-to-explain** — Market cap, Mark, Volume, Backing/NFT, Total backing, Supply, Nakamoto open methodology modals with live numbers substituted into the formulas. Nakamoto shows a 1–20+ zone scale with label.
- **Buyers/sellers** — 12-month ownership-trajectory line per trader (holdings reconstructed from marketplace trades), desktop-only center column; behaviour blurbs retained.
- Cache-busted asset URLs (`?v=5.x`, bump per release). Listing-floor overlay (incl. USD drift of standing listings) is the cron-side follow-up (listing backfill, brief item 0).
- Earlier this pass: matching-traits tooltip; analytics thumbnails moved to CDN-primary + IPFS-fallback (ipfs.io rate-limiting fix).

**Floor methodology — SETTLED:** sales floor = median of recent sales within the tier (Phoenix segmented out so trait skew can't pollute base), displayed *against* the listing floor as a spread rather than picking one "true" number. This unblocks per-wallet cost-basis P&L.

**Remaining (explorer-side, data already live):**
1. **[ ]** Pending-claims surfacing (migration item 8): global "N unstaked & pending claim" stat + per-wallet "ready to claim" nudge (`pending-claims.json` + per-record flag shipped; flag now carried through merge).
2. **[ ]** Per-wallet cost-basis P&L in Wallet tab: paid (from `sales-enriched` buys) vs backing vs tier sales-floor; "no basis" for non-marketplace acquisitions. Unblocked by floor methodology above.
3. **[ ]** Per-NFT provenance drill-down on card/modal (`nft-provenance.json` is 13 MB — fetch per-token on demand, never wholesale).
4. **[ ]** Backing growth story on the backing tile ("per-NFT share grew +X% since launch as 1,093 NFTs broke").

**Cron-side: ✅ ALL DONE 2026-06-11** — floor-history.json (daily per-tier listing+sales floors, DOM, bids), listing-first-seen.json, broken-at.json (1,093/1,093 break timestamps), listing-history.json (3,264 listings w/ outcomes 1,252 sold / 1,958 delisted / 54 active), BBL resolver fixes, and forward-fill in the incremental. Explorer can now: classify Broken-tier sales by `sale_ts` vs `broken_at` (remove the interim warning), chart real floor history, show DOM, upgrade `sales_tiering`.


### 🔥 P1 — Rarity system overhaul: explorer wiring + DAO proposal (spec'd 2026-06-10)
**Context.** Full investigation done 2026-06-10 in the NFT *Inventory* chat (this section is the handoff to the explorer chat). Rarity worked out from `all_nfts_metadata.json` + the HashLips design and reconciled against BBL's live marketplace API (HAR capture). Page + data files are shipped; what remains is the explorer wiring, an explorer bug fix, and the proposal.

**Two ranking systems — both canonical files live in `defipatriot/nft-metadata`:**
| | Intended (design) | BBL (marketplace) |
|---|---|---|
| File | ✅ `adao-rarity-intended.json` (committed) | ✅ `adao-rarity-bbl.json` (committed; built 2026-06-10 19:02 UTC, 1.28 MB) |
| Method | **Object trait alone defines the grade** (40 objects ↔ 40 grades, 1:1; metadata `Rarity` attribute = that grade). Grade order follows HashLips **planned weights**, not realized counts: Phoenix Rising planned 12 → Grade 40 apex (ranks #1–25) even though 25 minted vs Saber's 6. Grades laid end-to-end apex-first → 1–10,000 `intended_rank`; **within a grade tokens are equal-rarity by design**, ordered by token id as a lucky-draw tiebreaker (lower mint id = lower number; the grade is the rarity, not the within-grade slot). Planet/Inhabitant are flat by design (~500/value), Light/Weather are scene — **none are rarity factors** | Generic inverse-frequency sum over **every** attribute — including the derived `Rarity` tier (Object effectively double-counted) and the `broken`/`rewards` status. Result: realized-count order (Saber #1–6 above Phoenix #48–66) plus atmosphere leakage — the six `Weather: Lightning strike` tokens (common weapons) rank BBL #7–12 but intended #3,022–7,476 |
| Broken NFTs | All 10,000 ranked (grade is broken-agnostic) | Most broken NFTs come back unranked (`bbl_rank:null`); a small number still slip through with a rank — not fully consistent. Our cron faithfully records what BBL serves |
| Spot-check | #9068 (Phoenix) = grade 40, rank **24** | #9068 = rank **68** |

**BBL Action — DONE.** Weekly GitHub Action (`bbl-rarity.yml`) in `nft-metadata`, `bbl-rarity.js` 218 lines committed. Verified against the user's BBL text dump: **38/38 sample ranks match exactly** (incl. #242=1, #9068=68, #3937=443, #3021=444). File is 8,931 ranked + 1,069 unranked = 10,000. Hard-floor 8,500 captured + auto-fill BBL-unreturned tokens as `bbl_rank:null` (handles BBL's null-block pagination instability — confirmed: 411 broken correctly unranked + 658 unreturned-filled + 24 broken-but-ranked-by-BBL = 1,093 broken NFTs total, matches `nft-inventory` truth). 5 structural self-checks before any write (id universe, rank uniqueness, sums). Commit-on-change only → quiet weeks = no commit → file `built` date = "last time BBL ranks moved." Deliberately isolated: if BBL dies, delete the workflow + js + drop the toggle; zero blast radius.

**Rarity page — DONE.** `rarity-explained.html` shipped 2026-06-10 (replaces site-root page). Covers HashLips + planned weights, layer roles, designed grade ladder w/ planned-vs-actual, intended-rank construction including the lucky-draw within-grade framing, BBL divergences (apex inversion + weather example + broken-handling differs) with no hard-coded counts that'll age, full per-trait scoreboards (Object/Weather/Light/Planet/Inhabitant with planned where applicable), and a "Trait matches — the home system" section (P+I: 967, P+I+O: 80 — these are the *correct* numbers; see explorer bug below). References block links HashLips repo, the Terra-money Notion rarity doc, and both canonical JSONs.

**🐛 Explorer bug found while reviewing the rarity wiring (must fix before/with the wiring):** `nft-explorer-app.js` lines 166 and 180 (`PLANET_INHABITANT_MAP` and `PLANET_OBJECTS_MAP`) use the key `'Pampa'`. The metadata's Planet base name is `'Pampas'` (Pampas North / Pampas South). The strip-North/South regex returns `'Pampas'`, the lookup misses, and ~1,000 Pampas-planet NFTs are silently excluded from every matching-trait check. Symptom: explorer shows P+I=**864** instead of **967** and P+I+O=**74** instead of **80**. Two-character fix in two places — change both `'Pampa'` keys to `'Pampas'`. Verified by re-running both maps against the metadata; this is the *only* discrepancy — every other planet base, all 10 inhabitant species, and all object spellings reconcile exactly.

**Explorer changes — ✅ SHIPPED 2026-06-10** (staged on `nft-explorer-test.html`, promoted same day; verified live: Pampa fix bumped P+I 864→967 / P+I+O 74→80; #9068 = Rank 24 Intended / 68 BBL; 1,069 BBL-unranked render "Unranked"):
1. **[x]** Load both rarity files (`raw.githubusercontent.com/defipatriot/nft-metadata/main/adao-rarity-{intended,bbl}.json`); join to records by `token_id`.
2. **[x]** **Rank-system toggle** `BBL Rank / Intended Rank`, switching every rank shown. Display style: `Rarity 40, Rank 24` for Intended; `Rarity 40, Rank 68` for BBL — the grade stays visible in both; the *rank* is what switches. BBL + broken (`bbl_rank:null`) → render "Unranked," not 0 / blank.
3. **[x]** Small disclaimer line near the toggle when BBL is active: *"BBL ranks mirrored from BackBone Labs · last changed {file `built` date} · BBL leaves most broken NFTs unranked."*
4. **[x]** Display-option toggles — defaults ON: **Rank, Planet, Inhabitant, Object**; defaults OFF/hidden: **Weather, Light, Rarity** (the old `40/1`-style line is retired from the default card view).
5. **[x]** Filter dropdowns: still 4; **replace the Rarity dropdown with Rank** — filters by the 1–40 grade under the hood (a 10,000-option exact-rank dropdown is impractical; user-confirmed intent).
6. **[x]** **Sort By**: `Ranking, Rarity, ID`, default **Ranking High→Low** (best rank first, honoring the active toggle).
7. **[x]** Footer: **remove "Sorting Explained" and "Snapshot Tool" entirely.** Remaining: **Rarity Explained** (now a link to `rarity-explained.html`, not a modal) + **Badges Explained**.
8. **[x]** The explorer's internal sub-rank computation (rarityClass + Weather/Light tie-break, source of the old `40/1` display) is superseded — ranks come only from the canonical JSONs.
9. **[x]** Fix the `Pampa`→`Pampas` typo above (lines 166 + 180).

**DAO proposal (separate task, evidence-ready):** adopt Intended as the collection's official grading; ask Atrium to grade by it (file is open + verifiable at `raw.githubusercontent.com/defipatriot/nft-metadata/main/adao-rarity-intended.json`). Evidence ready: HashLips design intent (Object-only, planned weights, Phoenix apex), three named BBL divergences (apex inversion, weather leakage, inconsistent broken handling), the explorer toggle as the both-worlds bridge, full per-trait scoreboards already on the rarity page.

---

### ✅ DONE (2026-06-15) — TLA history backfill (votes + locks) + price + ratio layers
Completed in one session. The lock-lifecycle target below (vAMP Minter / voting-escrow CW721) was folded into a combined **gauge-vote + escrow-lock** backfill.
- **`tla-history-data_2026`** — `tla-history-backfill.js` (Action, one-time + forward-maintain) seeded **5,858 votes / 11,520 locks** to genesis, both `clean-end`. Lock lifecycle captured: create / extend_amount / extend_time / merge / split / migrate / withdraw / (un)lock_permanent / transfer, incl. cw20 send-hook locks + Votion/arb/launch-nft wrapper events. Events carry **`canonical`** (filter wrapper dupes for VP math). `tla-history-annotate.js` retro-tagged the seed (schema v2). Resilient ASC pager ported from the nft backfills. Per-cron README is current.
- **`price-history-data_2026`** — `price-history-backfill.js` (Action, one-time) → 23 tokens × ~365d CoinGecko USD. DONE + validated. **Orphan cleanup pending:** the dead archive-node `ratio-history-backfill.*` + `ratio-history-probe.*` were committed here during exploration — safe to delete (ratio history lives in network-and-prices, not here).
- **`network-and-prices`** — ratio-history forward-capture folded in (end-of-day append) + `ratio-history-consolidate.js` (in network-and-prices-data_2026) recovered ~34 days. 6 LSTs. Closes ampCAPA/ampROAR USD.

See PROJECT_KNOWLEDGE.md "Backfill data layers" for the full status. **Next: wire the Portfolio P&L + Vote Intelligence UIs to these feeds.**

---

### ~~🔥 P1 — TLA Lock NFT backfill~~ ✅ DONE 2026-06-15 (see above)
Same playbook as the aDAO events backfill, new subject: **TLA Lock NFTs** (vAMP Minter CW721 `terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg`). Lifecycle to reconstruct: member **lock creation, merges, unlock starts, unlock completions**, plus **Boost marketplace activity for lock NFTs** (the Boost sweep machinery already exists). First step is browser-probe the lock contract's event/action names (create/merge/unlock) exactly like the `break_nft`/`create_auction` probes — then the sweep script reuses `bbl-sales-backfill.js`'s pager + the events-backfill patterns. Start this in a FRESH chat with: fetch CHANGES_PENDING + cron-scripts/README.md registry section first.

### 🔥 P1 — Switch adao-positions Render schedule from weekly to daily
**Identified 2026-05-17. Confirmed still pending 2026-06-06.** The cron is currently scheduled `0 1 * * 1` (Mondays only). For the Portfolio Tracker dashboard to accumulate meaningful position history, it needs to run **daily**. The cron code now produces a `data/daily/{YYYY-MM-DD}.json` archive on every run — that file overwrites within a day, so daily cadence gives one snapshot per calendar day.

Two changes required:
1. **[ ] Update Render cron expression**: `0 1 * * 1` → `0 1 * * *` (manual click in Render dashboard)
2. **[x] Update `next_expected_run_at` constant in `adao-positions.js`** — done 2026-05-17, now `25 * 60 * 60 * 1000` (25 hours)

Ship both together. If only the Render click happens, the heartbeat is wrong; if only the code change is deployed, the dashboard flags the cron stale every 25 hours.

Without the Render change, letting things run for weeks produces 0 weeks of Portfolio Tracker history. **Top priority — should ship before any other accumulated-data work.**

---

### 🔥 P1 — Migrate `index.html` off retired admin-tool storage repos
**Identified 2026-06-05 during deving.zone outage investigation.** The page still reads from old admin-tool storage repos (`tla_json_storage`, `tla-ext_json_storage`) that stopped publishing on **2026-05-17**. The page silently falls back to epoch 185 (now 3+ weeks stale) labeled "STALE - N epochs old" in the console but renders without obvious warning to users.

Affected fetches in `index.html`:
- `fetchTlaData()` — `tla_json_storage/main/tla-data-epoch-N-end.json` (last write epoch 185)
- `fetchTlaExtData()` — `tla-ext_json_storage/main/tla-ext-epoch-N-end.json` (last write epoch 185)

The data now lives across multiple `_2026` repos with different schemas. Field mapping documented in catalog-log.md (Rev 0.15 deep-dive).

**Path forward:** Hybrid approach — `fetchTlaExtData` has a clean 1:1 mapping to `network-and-prices-data_2026/data/network-and-prices.json` (do this first, 1-2 hrs). `fetchTlaData` needs multi-source composition (do as separate larger pass, 4-6 hrs).

**Why P1 now:** every passing day the stale data drifts further. Member-facing tiles (TLA Deposits, Locks, treasury balances) become wrong.

---

### 🟢 P2 — Add timeout / AbortController to all `await response.json()` calls in `index.html`
**Identified 2026-06-05** during deving.zone outage. When deving.zone returned 200 OK headers but stalled mid-body, `fetch().catch()` didn't fire (it only handles network errors), `response.json()` hung forever waiting for body end, and the page appeared blank/spinning with no JS error.

**Fix pattern:**
```js
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
fetch(url, { signal: controller.signal })
  .finally(() => clearTimeout(timeoutId))
const data = await response.json().catch(() => null);
```

Apply to all four primary fetches (`onChainStatsUrl`, `contractUrl`, `ampLunaRateUrl`, `priceUrl`) and any other `.json()` in the page. Without this, any third-party endpoint hiccup blanks the page silently.

---

### 🟢 P2 — Filter LCD 500 responses on "no new proposal" as not-an-error
**Identified 2026-06-05.** The `checkForLiveProposals` loop in `index.html` queries `terra1va3tny5...` for proposals 38, 39, 40, 41, 42 to detect new ones. The contract throws 500 when proposal doesn't exist — which is the **normal case** (no new proposals). The page logs these as errors, generating ~5 console errors per page load even when nothing is wrong.

**Fix:** Treat HTTP 500 with a "proposal does not exist" error body as "no new proposal" (not an error). Stop the loop on first 500 (proposals are sequential).

---

### 🟢 P2 — Migrate `index.html` inline live-data code to `aDAOLive` library
**Identified 2026-05-28 (Rev 3.47).** The shared library `lib/adao-live-data.js` is now the canonical source for live RPC fetching, but `index.html` still has its own inline copies of `fetchLiveTlaDeposits`, `queryChain`, `fetchTlaSharedCatalog`, `fetchLiveTlaDepositsFromChain`, etc. They coexist (both work) but the duplication will drift. Migrate incrementally — when touching one of these code paths for another reason, swap it for the library call.

Bonus: removes ~300 lines from `index.html`, helping cold-start parse time slightly.

### 🟢 P2 — Migrate `dao_treasury.html` inline live-balance code to `aDAOLive.getDaoTreasury()`
**Identified 2026-05-28.** `dao_treasury.html` already pulled live wallet balances correctly before the library existed (it was the first page to use this pattern). Now that `aDAOLive.getDaoTreasury()` does the same thing with consistent caching across pages, migrate. The library was tested to return identical values ($13,912.14 across 9 priced tokens) against the page's own code at deploy time, so this is a safe drop-in.

### 🟢 P2 — Fix TLA Deposits modal inside `index.html` to show live per-pool data
**Identified 2026-05-28.** The TLA Deposits modal (drill-down from the tile) still shows snapshot per-pool data. With `aDAOLive.getDaoTlaDeposits()` already returning live per-position data (16 positions including bluechip + single-asset), the modal can show real-time per-pool breakdowns. Estimated ~80 lines to wire up.

### 🟢 P2 — Enterprise Staked chart shows 403→503 jump in history
**Identified 2026-05-24 (Rev 3.43).** The Enterprise Staked tile now correctly shows 403 (excluding 100 DAO-controlled broken NFTs), but historical chart data captured before the filter was applied shows the unfiltered 503 count. Cron-side fix needed in the source data — either backfill the historical archive files with the corrected counts, or have the dashboard apply the same filter when rendering historical points.

### 🟡 P2 — APR outliers for stable pairs (USDC-USDT, USDC-EURe)
**Discovered 2026-05-17 audit.** These two pools show APR ~5× higher than Eris's number for the same pool. Specific to stable pools — non-stable pools are internally consistent. Likely tied to stable-pair price normalization in the `tla-snapshot` cron's APR formula. Needs investigation.

### 🟡 P2 — Null-dex unnamed pool inflates Astroport count by 1
**Discovered 2026-05-17 audit.** `tla-snapshot` cron has one entry with `name: "cw20:terra1hqq6..."` and `dex: null`. The normalizer defaults null dex to "Astroport" (`p.dex || 'Astroport'`), making this pool count toward the Astroport total. Real fix is cron-side: either classify or skip the unnamed pool. Cosmetic but indicates a classification gap.

### 🟡 P2 — IBC denom resolution gap in network-and-prices
**Discovered 2026-05-17 audit.** The LUNA-USDC bribe asset (`ibc/8D8A7F7253615E5F76CB6252A1E1BD921D5EDB7BBAAF8913FB1C77FF125D9995`) is not in the 27-token `network-and-prices` index. Eris prices this bribe at $12.93 but our resolver returns $0. Fix: add explicit IBC-denom → symbol mapping for known TLA-relevant denoms in the `network-and-prices` cron.

Note: Rev 3.48 added native-denom lookups including this IBC hash → ASTRO in the vote-rewards capture path inside `index.html` as a local workaround. Cron-side fix would let other consumers benefit too.

### 🟢 P2 — CoinGecko bulk fetch failing in `network-and-prices-data_2026`
**Identified 2026-06-05.** The `network-and-prices` cron heartbeat reports `coingecko_bulk.ok = false` causing overall `status = partial`. Astroport prices are filling the gap so user-facing data still works, but CG bulk is failing systematically (rate-limited 429s observed in the cron log). Investigation needed in the `network-and-prices` cron code.

### 🟢 P2 — TLA Chain Registry catalog: acquisition guide curation pass
**Identified 2026-06-02 audit. Still pending.** Council members (especially the owner) have first-hand verified routes for tokens they actually hold. Several tokens in TLA still have `auto_suggested` or `route_known_unverified` guides where a council member could provide a verified route.

Drafts captured in `catalog-log.md` Rev 0.10 narrative:
- **ATOM** — standard Keplr IBC from Cosmos Hub. Verified by owner 2026-06-02 (deposit test).
- **USDC** — Swapped.com → Keplr Noble → IBC to Terra. Verified by owner 2026-06-02.
- **wBTC.atom** — Skip.go bridge from Ethereum WBTC (Eureka path). Route_known_unverified.
- **PAXG** — same Skip.go pattern from Ethereum. Route_known_unverified.
- **wBTC.creda.a** — Creda Finance minting on Terra (not a bridge). Unverified.
- **USDt** — auto-suggested guide will show "Kava-suspected" from bridge data.
- **EURe** — owner noted "truly don't know how you get it"; auto-derived shows source-chain hint.

Effort: low per token (a JSON entry). High clarity benefit — users deposit into the wrong variant if they pick the wrong bridge.

### 🟢 P2 — TLA Chain Registry catalog: Eris CG-ID outreach
**Identified 2026-06-02 audit. Still pending.** 3 tokens have `coingecko_match = "mismatched"` where Eris's `/prices` claims a CoinGecko ID that doesn't actually match the token on CG's terra-2 platform list. These produce wrong USD prices on any consumer that trusts Eris's claim directly.

User-side: ping Eris team, ask them to correct the mappings in their backend. Catalog-side: already handled (Stage 7c flags as mismatched, downstream consumers can skip).

### 🟢 P2 — TLA Chain Registry catalog: fill council member curation candidates
**Identified 2026-06-05 (Rev 0.15).** 125 TLA member wallets have no curated label and no PFPK profile name. Top 30 by VP templatized in `tla-chain-registry/curated/curation-candidates.json` (drop-in compatible with `wallets.json`).

User action: open the file, fill in `label` fields for addresses you recognize, merge into `wallets.json` under the `wallets` key, push. Next cron run picks them up.

Biggest unnamed wallet: 5.4M VP (`terra13aae4futz6jk...`) — significant council member.

### 🟢 P3 — NFT Inventory cron — Rev C: tier architecture (hot/warm/cold split)
**Identified 2026-06-07 during Rev B design. Stage 1 SHIPPED as Rev C.1 (2026-06-07).** Rev B ran a single hourly full scan. Rev C splits into:
- **Hot** (every 15 min): user-held + marketplace + recently-unstaked (~1,100 NFTs)
- **Warm** (daily): hot ∪ staked (DAODAO + Enterprise, ~3,200 NFTs)
- **Cold/full** (weekly Mon 02:00): all 10k, full reconcile, rebuilds `hot-set.json`

**Stage 1 (Rev C.1) — DONE:** mode infrastructure via `RUN_MODE` env, `hot-set.json` membership file, scoped per-NFT fetch + `mergeRecords` onto the last full base, full-scan fallback. One script / three Render jobs. Default `full` = unchanged behavior. Deploy steps in cron README "Deployment (tiered modes)". Mode only changes per-NFT scope; Phases 3-7 identical, so output is always a complete 10k picture.

**Stage 2 — TODO (activity deltas):** each hot run diffs against the previous hot snapshot and appends what moved (transfers, list/delist, stake/unstake/claim, sales) to the day's activity log. This is what powers traffic/volume charts (net first-vs-last endpoint diffs would miss intra-day churn — must accumulate per-run deltas).

**Stage 3 — TODO (rollups):** finalize each daily file as opening snapshot + closing snapshot + accumulated activity; then aggregate daily→weekly (`weekly/<YYYY-Www>.json`)→monthly (`monthly/<YYYY-MM>.json`)→yearly (`yearly/<YYYY>.json`). Higher periods are rollups of the dailies, NOT fresh endpoint diffs. Forward-only (no backfill — LCDs prune).

Achieves ~50% query reduction vs the old full-every-hour, 4× freshness on hot data. Manual promotion to hot via `tla-chain-registry/curated/nft-overrides.json` when the DAO releases NFTs via prop; weekly cold reconcile is the safety net (max 7-day drift). **Page (Rev 2) reads the merged `nfts.json` regardless of which tier produced each record — schema is identical.**

### 🟢 P3 — NFT Inventory cron — Rev D: daily yield timeline
**Identified 2026-06-07.** Parse `update_rewards_callback` events from chain transaction history → exact daily ampLUNA inflows + 7d/30d/all-time rolling averages + annualized APR calculation. Pattern decoded from txn `70757515D0FEBE07DABC2013CAC9217514C16AE252AA54BF5E395A9885215B18` on 2026-04-25.

Daily inflow ~809 ampLUNA today (90% of 899 ampLUNA produced by Alliance staking → 10% goes to DAO main wallet). Per-NFT daily yield = `daily_inflow / unbroken_count` = ~0.091 ampLUNA today.

Rev B's `data/daily/{YYYY-MM-DD}.json` snapshot already captures the substrate — Rev D adds the txn-history parser and surfaces timeline charts on the explorer page.

### 🟢 P3 — NFT Inventory cron — Rev E: pending-unstake tracking
**Identified 2026-06-07. DAODAO half SHIPPED as Rev B.3 (2026-06-07).** DAODAO pending-claim tracking is live: count is chain-truth (`custody − total_power_at_height`), per-wallet attribution tracked forward via `unstake`/`claim_nfts` tx-search, persisted in `data/v2/pending-claims.json`, self-reconciling. Note the original `claims{address}` idea was superseded — that query is per-address only and misses full-unstakers (zero VP, zero in-wallet), so we use the historical event diff instead. **Remaining:** (a) explorer-side "ready to claim" nudge — see P1 item 8 below; (b) Enterprise NFT staking pending-unstake tracking (if Enterprise exposes a claim queue — not yet investigated; lower value, far fewer unstakes there).

### 🟢 P3 — NFT Inventory cron — Rev F: marketplace offers + bid history
**Identified 2026-06-07.** BBL `collection_offers_by_contract` (collection-wide buy offers), Atrium `offers_by_nft` + `collection_offers_for_collection`, BBL `bid_history_by_auction_id` (per-auction bid timeline). Surface buyer demand + live auction bid feed.

### 🟢 P3 — Generic multi-collection NFT inventory cron (Rev G future direction)
**Identified 2026-06-07.** The nft-inventory architecture (all_tokens enum → per-NFT info → marketplace integration) is collection-agnostic. Rev G could parameterize the cron to track any cw721 on Terra — including the other 7 Terra collections on BBL (Skeleton Punks, pixeLions, Galactic Punks, SoulReapers, Burning Lion Festival, Origin Enigma, Scandalous Birds). One cron writes per-collection JSON files; any future explorer page can read whichever collection it cares about. Same chain-of-truth pattern applied broadly.

Out of scope for current TLA work — note for future direction. Lion DAO collections (pixeLions, Burning Lion Festival) noted as candidates if/when there's user demand for an "ecosystem NFT catalog" page.

### 🟢 P3 — SS API migration
**Identified 2026-05-04.** The SS API migrated to `/api/pools` ~May 4. The cron already handles the new endpoint but `test.html` temporarily hides SS lines (legacy display logic). Cleanup: re-enable SS lines in `test.html` once verified, or remove if no longer needed.

---

## 🆕 New ideas / not yet prioritized

### 🔥 P1 — Deploy `tla-flows` (LP-flow event capture) to Render  ⚠ STILL NOT DEPLOYED (2026-06-25)
**Confirmed 2026-06-25: no `flows/` data exists in tla-core (all paths 404).** The
cron was built + locally verified but the Render deploy never landed data. This
**blocks verifying 24hr position change from the test txs** (the `terra1n28…` zap
test) — there's no captured event data to compare against. Next: confirm the Render
service exists, points at tla-core with the flows output path, runs, and commits.
Built + locally verified 2026-06-24 (parser 42/42 on real data; `tx_search` + cost capture confirmed live on the free LCD). Code `cron-scripts/tla-flows/`; writes the **new `tla-core` repo, `flows/` module**. Wire a 15-min Render cron (`node tla-flows.js`, `TLA_OUT_DIR`→tla-core checkout `flows/`, commit step as fuel). Once running it accumulates exact claim timing + entry/exit slippage/fees forward. Backfill = the same loop from a genesis start height (deep history needs an archive node — public LCDs prune). See `tla-flows/README.md` + PROJECT_KNOWLEDGE "TLA LP-flow event capture".

> ✅ **Storage layout SETTLED (2026-06-24) — deploy unblocked.** The `tla-core`
> module→product→files convention is finalized in
> `website-adao-core/TLA-CORE-STORAGE-DESIGN.md`. Decision: the paths `tla-flows`
> already writes — `flows/events/{heartbeat,index,cursor}.json` + `2026/MM/DD.jsonl`
> — are **correct as-is; no cron output-path change needed.** Deploy the current code.

### 🟢 P2 — Tools spec'd on the flow data (build after capture is accumulating)
Specs to be fleshed out from real captured data:
- **Net-P&L waterfall (per position):** deposits − withdrawals + claimed yield − entry slippage − exit slippage ± IL ± price. The "what did I actually make, after all costs" number — closes out the realized-APR work. Runs off `tla-flows` + `adao-positions` daily + ratio/price history.
- **Realized-APR audit:** advertised (`approx_apr_pct`) vs realized per pool; the per-pool delta = the compounder's reward fee. Band tightens once `tla-flows` exact claim timing replaces daily-snapshot granularity. (See the realized-APR correction in PROJECT_KNOWLEDGE — APR-vs-APY, bribes-are-separate.)
- **DAO slippage/fee ledger:** total zap slippage + swap fees members have paid entering/exiting — a transparency number from `cost.swaps` / `cost.provide_slippage_pct`.
- **Zap-Out Optimizer (live, prospective — distinct from the capture):** for a position, simulate exit to each withdraw-token (LUNA/ampLUNA/bLUNA/ASTRO/USDC/SOLID/CAPA/WHALEs/ROAR) via Astroport `simulate`/`reverse_simulation` at current reserves; rank by total slippage → cheapest exit + arb signal (a non-pool exit is multi-hop, much costlier — proven: LUNA 0.05% vs USDC 0.43%). `tla-flows` realized costs calibrate the simulator's predictions.

**Boundary marker:** bribes/votes are a SEPARATE stream (`tla-history` + `pending_bribes`), to VOTERS not LP depositors — deliberately out of LP-flow scope. Don't "find" a phantom gap there.

### 🔍 PRICE AUDIT — hub-ratio vs market pricing for "calculated-eris" LSTs (flagged 2026-06-14)
Discovered while validating the Votion cron against Votion's own UI: our
`network-and-prices` cron prices 5 LSTs by **hub-ratio** ("calculated-eris"):
**ampLUNA, arbLUNA, bLUNA, ampCAPA, ampROAR**. Everything else is market-priced
(Astroport/CoinGecko) and fine. Hub-ratio pricing is only accurate for CLEAN
staking derivatives; it breaks for STRATEGY tokens whose market value lags their
theoretical backing.
- **ampLUNA** — clean staking. Validated vs Votion: ~1.5% match. ✅ OK
- **bLUNA** — clean liquid-staking (Backbone). Likely OK, spot-check recommended.
- **arbLUNA** — arbitrage strategy. **CONFIRMED ~14% HIGH** (hub $0.1516 vs market
  ~$0.133). Biggest TLA lock asset (~15M VP), so this matters. Has a LUNA-arbLUNA
  Astroport pool for a market reference.
- **ampCAPA** — amp strategy on CAPA. **UNVERIFIED** — could have the same gap.
  ampCAPA single pool / LUNA-CAPA refs available to check.
- **ampROAR** — amp strategy on ROAR. **UNVERIFIED** — could have the same gap.
  ampROAR-ROAR pool available to check.

**Audit task:** for each of the 5, compare hub-ratio price vs its Astroport
market price. Where they diverge (strategy tokens), `network-and-prices` should
**prefer the market price** as `final_price_usd` (it already does market pricing
for most tokens — these 5 just fall back to hub-ratio). Fixing at the SOURCE
corrects everywhere downstream at once: tla-locks stale-VP, member portfolios,
treasury, Votion. **Until fixed, any USD figure including arbLUNA/ampCAPA/ampROAR
may be overstated.** Interim: Votion tags `underlying_usd_price_source` so the UI
can show our feed + a market feed side-by-side. Full detail in
`NOTE-arbLUNA-pricing-gap.md`.

**Standing canary idea:** periodically cross-check our prices against an
independent feed (CoinGecko / Astroport market) — mismatched prices are how users
get misled, and we only caught arbLUNA by validating against an external UI.



### Phase 1+ direction (post Phase 0 lock-in)

After Rev 0.16 locked in Phase 0, four directions for next phase:

- **A. TLA Stats migration** — evolve existing 7,000-line `tla-stats.html` Rev 3.51 to consume catalog data via `aDAOLive.getTlaCatalog()`. Big effort but biggest user impact.
- **B. Member Stats `dao-tla.html`** — net-new page using catalog as foundation. Per-member VP, positions, voting patterns, P&L. Fresh build, no legacy.
- **C. `index.html` migration** — close the tech debt from the deving.zone investigation (also overlaps with P1 above).
- **D. Portfolio Tracker** — depends on adao-positions daily archive being in place (P1 above), then time-series + P&L.

User to choose direction at next session start.

### Hardening: third-party endpoint resilience
The deving.zone outage exposed how a single third-party JSON endpoint hanging mid-body can blank the entire page. Pattern in P2 above (AbortController on `.json()`) is the immediate fix. Broader hardening could include:
- Cached fallback for `deving.zone/nfts/alliance_daos.json` (we have 157-member CSV)
- Service worker or `<noscript>` fallback page
- Surface "feature degraded" banner instead of blank when key endpoints fail

---

## ✅ Recently shipped (last 30 days, summarized — full detail in changelogs)

- **NFT events backfill + forward-fill (2026-06-11)**: One-time sweep (`nft-events-backfill.js` + Action in the data repo) reconstructed `data/v2/broken-at.json` — **1,093/1,093 break timestamps, zero missing** (breaks are executed on the NFT contract, so capture is frontend-agnostic: Atrium-UI and Boost-UI breaks verified) — and `data/v2/listing-history.json` — **3,264 listings** back to Dec 2023 (BBL 3,121 / Boost 122 / Atrium 21) with derived outcomes **1,252 sold / 1,958 delisted / 54 active / 0 unknown** (sold = sales-enriched match, token-strict; delisted = provenance exit timestamp; no cancel-event needed). Forward-fill folded into the 6-hour incremental Action with per-stream watermarks (new breaks append; new creates append; active listings auto-close to sold/delisted). Same parsers serve both callers — one implementation, no drift.
- **NFT Inventory floor-history + first-seen + bids (2026-06-11)**: `data/v2/floor-history.json` — daily per-tier (broken/base/phoenix) row: listed count, listing floor, sales floor (median of last 5/10/3 enriched sales by `notional_usd`, n recorded), avg days-on-market, per-NFT backing USD, active bids. Same-date upsert, prior dates immutable, never-shrink guard. `data/v2/listing-first-seen.json` — DOM accrual from 2026-06-11 (Atrium `created_at` heights preserved for future precision upgrade). Full/warm runs only.
- **BBL listing-resolver fixes (2026-06-10/11)**: (1) Phantom listing excluded — chain-live-but-not-buyable auction 14765 set a fake $17.59 floor; warlock (BBL's own API) is now the liveness oracle: chain-only auctions excluded + warned, warlock-down ⇒ unfiltered + warned, never blanked. (2) Completeness — the contract's `auction_by_contract` cursor skips entries (mid-range holes, root cause unknown); 6 live listings recovered directly from warlock (`source:'warlock_recovered'`, denom/price byte-identical to chain). Verified live: 35/35 listings, base floor self-corrected to ~$102. Heartbeat canary: `listing_resolver_warnings`.
- **Data & pipeline registry + hardcode audit (2026-06-11)**: new section in `cron-scripts/README.md` — every producer → outputs → consumers with status labels, cleanup actions (stale `nft-inventory.js` orphan in the data repo; frozen pre-v2 `data/nfts.json`), and a classified hardcode inventory (IMMUTABLE / CONFIG / ASSUMPTION / STALE-PRONE with canaries). Rule it encodes: **one fact, one producer** — e.g. wallet names are owned solely by `adao-positions` (`members.json` via pfpk). Read it before building any new capture.

- **Rarity foundation (2026-06-10)**: Canonical rarity data + page shipped (explorer wiring still pending — see P1 above). `nft-metadata` repo now holds `adao-rarity-intended.json` (all 10k tokens: object/grade/planned+actual counts/intended_rank/percentile; #9068 = grade 40 rank 24) plus `bbl-rarity.js` + weekly GitHub Action producing `adao-rarity-bbl.json` (mirrors BBL's published ranks; commit-on-change only; broken NFTs faithfully `null`). `rarity-explained.html` Rev 2.0 rewritten around design intent (HashLips planned weights; Object-only grading; Phoenix apex; BBL weather-leakage example with real tokens). Key findings preserved in the P1 spec above.
- **NFT Inventory — staked-NFT staker resolution (2026-06-09/10)**: DAODAO + Enterprise stakes now resolve `real_owner` to the actual staker per token (phantom-whale fix — staking contracts no longer appear as top holders). DAODAO via `staked_nfts{address}` per staker (157, sums to 1,632 = exactly the DAODAO UI); Enterprise via `user_stake{user,limit}` per member with `total_user_stake` completeness check. `daodao_pending_claim` per-record flag (29 = chain truth; 15 untracked inferred pending, custody = active + pending definitionally); 81 Enterprise legacy stakes unattributable (abandoned contract, no reverse lookup) → flagged `enterprise_unattributed`, label "Enterprise (legacy, unattributed)". `dao_members_count` corrected 746 → **157** (DAODAO governance only; Enterprise ≠ DAO membership) with new `non_custody_holders_count` (746) for "anyone holding." Hard errors (query failure/truncation) flip status `partial`; known-incomplete-upstream stragglers are warnings, status stays `ok`. Verified live: error_count 0, classification sums to 10,000. Detail in cron README.
- **NFT Inventory Rev C.1 (2026-06-07)**: Tiered run modes, stage 1. `RUN_MODE` env (`full` default / `warm` / `hot`) scopes the per-NFT fetch only; Phases 3-7 run identically so output is always a complete 10k `nfts.json`. Full (weekly) rebuilds `hot-set.json`; warm (daily) re-fetches hot ∪ staked; hot (15 min) re-fetches the hot set — both merge fresh records onto the last full base, with full-scan fallback if base/hot-set unreadable. One script, three Render jobs (deploy steps in cron README). Merge/derive unit-tested; live cadence verified on Render. Stages 2 (activity deltas) + 3 (daily→weekly→monthly→yearly rollups) still to come. Gets 15-min fresh active data + ~50% query reduction.
- **NFT Inventory Rev B.7 (2026-06-07)**: Atrium listings schema-drift fix. `listings_by_collection` started 500'ing (`unknown field collection` — contract renamed the field). `fetchAtriumListings` now self-resolves the collection field name by probing common CosmWasm conventions (`collection_addr`, `nft_contract`, etc.), memoizes the winner, and logs the contract's full valid-field list if none match. No regression (Atrium NFTs already classified by ownership; this restores price/seller detail). Confirm via the `ℹ Atrium collection field resolved to '…'` log line on the Render run. This was the last known cron-side error — all three marketplaces + pricing + pending-claims now clean.
- **NFT Inventory Rev B.6 (2026-06-07)**: DAODAO pending-claim tx-search fix. LCD started rejecting the query (`400 "specify tx.height with strict equality"`) because it carried a `tx.height>` range; dropped the height term from the query and moved height filtering client-side in `fetchDaodaoTxs`. Restores forward per-wallet attribution tracking (count was always chain-truth; only the "who" was frozen). Parsers/reducer unchanged; logic re-verified (genesis replay → [1319,3605,6847,7123], incremental no-op, forward claim removal). Confirmed live: `lastScannedHeight` advanced 21353559 → 21355202. Detail in cron README.
- **NFT Inventory Rev B.5 (2026-06-07)**: USD pricing fix — it had been silently skipping (both sister-cron URLs 404'd, and the parser assumed a schema that didn't match). Corrected URLs (`…/data/network-and-prices.json`, `…/2026/current.json`) and rewrote `fetchPriceData` to the real schema: LUNA from `token_prices.LUNA.final_price_usd`, ampLUNA from `token_prices.ampLUNA.final_price_usd` (fallback `lst_ratios.ampLUNA.ratio × luna`), joining registry catalog (address→symbol+decimals) with `token_prices` (symbol→price). Verified live: LUNA $0.0512, ampLUNA $0.1103 → `treasury_value_usd` ≈ $86.8K, `per_nft_value_usd` ≈ $9.74 (were null). Marketplace listing USD now resolves. Detail in cron README "Rev history".
- **NFT Inventory Rev B.4 (2026-06-07)**: Marketplace pagination hardening. Fixed log-spam (`⚠ NFT #X listed on BOTH BBL and BBL` repeated to the page cap) that surfaced once BBL active listings crossed 30 (now 43) and pagination began re-fetching the same window. All three marketplace fetchers now de-dupe by listing id and break the page loop when a page brings nothing new; merge warning now fires only on genuine cross-marketplace conflicts. Data was always correct (one listing kept per token, classification sums to 10000) — fix removes noise + ~100 wasted queries/run. Marketplace data layer only; classification/pending-claim logic untouched. Detail in cron README "Rev history".

- **NFT Inventory Rev B.3 (2026-06-07)**: DAODAO pending-claim tracking. Surfaces NFTs unstaked from DAODAO but not yet claimed (7-day queue, or forgotten indefinitely). Count is chain-truth (`daodao_staked` custody − `total_power_at_height` active stake = 1,661 − 1,657 = 4); per-wallet attribution tracked forward via `unstake`/`claim_nfts` tx-search, persisted in `data/v2/pending-claims.json`, reconciled every run (heartbeat `daodao_pending_reconciled`). Seeded once with 4 verified legacy forgotten-claims (tokens 1319, 3605, 6847, 7123); self-maintaining thereafter. Verified end-to-end against full chain history before deploy. Inline in `nft-inventory.js` (+~196 lines, additive). New `summary.daodao_pending_claim` block. Explorer "ready to claim" nudge is the page-side follow-up (P1 item 8).

- **NFT Inventory Rev B (2026-06-07)**: Schema v2 + chain-of-truth replacement for deving.zone. Treasury/Enterprise classification fixed (898 treasury + 403 real Enterprise stakes + 100 DAO-controlled Enterprise broken). All 3 marketplaces (BBL 43 + Atrium 1 + Boost 4) with seller resolution. Backing data (ampLUNA balance + per-NFT share). Sister cron price integration for USD conversion. Daily snapshots for future timeline work. ~250 lines new code in `cron-scripts/nft-inventory/nft-inventory.js`, schema v1→v2 with backward-compat aliases preserved so existing dashboard JS keeps working during Rev 2 migration window. Detail in `cron-scripts/nft-inventory/README.md` "Rev history". Page-side migration (Rev 2) deferred to next session — see P1 above.
- **Rev 0.16 (2026-06-06)**: Phase 0 lock-in — 5 polish fixes (Eris not labeled DEX, pair_type normalization, definitional failure detection, SS source synthesis, expanded fingerprint)
- **Rev 0.15 (2026-06-06)**: contract_info via cw2 raw storage (fixes Rev 0.14 error spam), SS indexer correction, avatar capture defensive ungating, curation candidates file
- **Rev 0.14 (2026-06-05)**: Pool architecture surfacing — all 75 pools get architecture object (contract, version, pair_type, dex)
- **Rev 0.13 (2026-06-05)**: Wallet names + avatars — 668/668 wallets have meaningful labels (PFPK names + synthesized DAO-membership labels)
- **Rev 0.12.x (2026-06-05)**: Token logos (3-layer system) + curated URL audit + CDN cache bypass via SHA-pinned URLs
- **Rev 0.11 (2026-06-05)**: amplp classification fix — 65 amplps fully classified with bucket inheritance
- **Rev 0.10 (2026-06-02)**: 10 systemic catalog fixes (self-referential vault detection, Stage 5/6/7 cascade, source coverage transparency)

Phase 0 LOCKED IN as of 2026-06-06 after Rev 0.16 deploy.

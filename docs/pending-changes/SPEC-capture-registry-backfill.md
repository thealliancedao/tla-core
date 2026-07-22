# SPEC — capture-registry archive backfill (close the hole, one pass)

Status: **DRAFT — for approval** · Priority: **P0 for data integrity** (the
weekly reconcile's own verdict: "LOSSES POSSIBLE … the walker/capture-registry
fix rises above the rollup rebuilds")
Home: `tla-core/docs/pending-changes/`
Evidence session: 2026-07-22 — every number below re-measured from committed
data that day; nothing assumed.

## 1. Why (the survey)

One structural gap explains almost every "where are my bribes" report: the
**capture hole, heights 13,737,811 → 21,481,530 (≈7.74M blocks, Feb 2025 →
Jun 14 2026)** between the FCD-archive era and the live block-walker. The
bribe ledger measures total flow independently of attribution, so the gap is
quantified per token, not vague:

| token | lifetime flow | attributed | % | class |
|---|---|---|---|---|
| LUNA | 402,208 | 4,062 | 1.0% | GAP |
| CAPA | 19,921,233 | 1,131,939 | 5.7% | GAP |
| ASTRO | 2,271,898 | 458,865 | 20.2% | GAP |
| ROAR | 19.24B | 4.30B | 22.4% | GAP |
| ibc/B3F6…4787 | 1,978,352 | 1,121,583 | 56.7% | GAP |
| ampLUNA | 167 | 96 | 57.6% | GAP |
| USDC | 1,583 | 923 | 58.3% | GAP |
| ibc/4B44…84CB | 918,000 | 0 | 0% | GAP |
| ibc/B71F…869A | 40,927 | 0 | 0% | GAP |
| +3 small ibc | — | 0 | 0% | GAP |
| SOLID · WHALE · ampROAR · MOAR · ibc/792A | — | — | ~100% | complete |
| **ibc/517E…D84E** | 4,754,643 | 5,435,919 | **114.3%** | **OVER-ATTRIBUTED** |
| **ibc/…AC5E…86CC** | 64,605 | 77,526 | **120.0%** | **OVER-ATTRIBUTED** |

Corroborating findings, same session:
- The live-capture window (2026-06-16 → now) contains exactly **three bribe
  payers** (two tribute contracts + DeFi_Patriot) and **zero CAPA placement
  events** — while the on-chain state shows a live 100K-CAPA pot on ampCAPA.
  Bribes span epochs (a July placement in the stream covers e193→e200), so
  hole-era placements keep burning in current state: invisible payers, visible
  pots. Working conclusion: hole, not walker bug — §6 watchdog makes that
  distinction self-verifying forward.
- Votes reconcile: 8 MISMATCH + 28 CHAIN_ONLY slots (94.78% match) — vote
  events the chain shows but the stream lacks. Locks reconcile: perfect
  (VP sum = total vAMP, delta 0).
- Flows: the same hole bounds the P&L waterfall
  (SPEC-portfolio-pnl §2/§4 Phase D).

## 2. Goal

ONE archive pass that recovers every stream at once — walk-once doctrine:
1. **Bribes**: placements + withdrawals in the hole → attribution to ~100%.
2. **Votes**: the 36 lost/mismatched slots + all hole-era vote_cast events.
3. **Locks**: hole-era create/extend/merge events (reconcile is clean today,
   but capture them anyway — VP-stamping history and SPEC-landing-pulse's
   renewed-VP series want them).
4. **Flows**: deposits/withdraws/claims in the hole **with the Phase-B
   enrichments already applied** (pool identity + claim amounts,
   `<<FLOWS CLASSIFIER v2>>`) so the hole is filled at v2 quality and never
   re-walked.
5. **Named-wallet verification**: PD's two known txs; Solid `…s0yhw0`'s June
   CAPA placements; DeFi_Patriot's wBTC/ATOM-pool bribes (dates from Camron —
   if they predate 2025-01-07 they're an FCD-era classifier miss instead and
   get chased by txhash in E0).

## 3. Registry (what gets scanned — the "capture registry")

Contract-scoped, not block-scoped. One JSON registry file
(`tla-voting/capture-registry.json`, committed, versioned) listing every
contract whose events feed a stream:

| contract | streams |
|---|---|
| TLA Incentive Manager `…w0auzas9037wh` | bribes (add/withdraw/claim) |
| TLA Gauge Controller `…l77fmmzeep0xmq24l2smsd3lj` | votes |
| vAMP Escrow `…rzkamq3l62zg` | locks |
| 4× gauge tribute contracts | bribes (tribute route) |
| Eris amp-LP hubs (per flows classifier v2 list) | flows |
| PD DAO core `terra1k8ug6dk…4lppjg` + shared proposal module | dao_attr context txs |

Registry entries carry: address, streams, classifier version, height cursor.
Adding a contract later = append + run the same job; the registry IS the
"what have we ever scanned" ledger.

## 4. Method — targeted, resumable, idempotent

**Not** a 7.74M-block walk. Archive **tx_search by event**
(`wasm._contract_address='<registry addr>'`, height-ranged, paginated ~100/pg)
per registry contract across the hole. Orders of magnitude cheaper: total tx
count across these contracts for 17 months is thousands, not millions.

- **Access (decision item E1, Camron):** requires an archive node with tx
  index over heights 13.74M–21.48M. publicnode prunes; the frozen FCD ends at
  the hole's left edge. Options: rented archive RPC (days, cheapest), a
  synced-from-snapshot self-run archive, or a data-lake provider. The job is
  transport-agnostic: it needs `tx_search` + `block` at historical heights,
  BATCH_CONCURRENCY ≤5 as ever.
- **Resumable:** per-contract height cursor committed after every page
  (GitHub-outage-proof, same discipline as the walker).
- **Classifiers:** the SAME production classifiers the walker runs (org-tla-
  voting 2.3.1 rules: collision-aware promoted msg_index, dynamic dao_attr,
  shared-DAODAO never labeled) + flows classifier v2. No parallel logic —
  byte-identity discipline where code is shared.
- **Merge:** dedupe key `(tx_hash, promoted msg_index, type)`; month files
  merged in-place, sorted by height; second run adds 0 (fcd-rederive
  idempotence pattern). Mock gate on real fixtures (PD txs as permanent
  assertions) before any commit, as always.

## 5. Over-attribution anomaly (separate defect, fix first)

Two tokens attribute MORE than measured flow (114%, 120%). Hypothesis:
briber attribution sums `bribe_add` without netting `bribe_withdraw`
(briber entries already carry `withdraw_event_count`), while the state
ledger nets naturally. E0 task: reproduce per-token from the event stream;
if confirmed, rollup builder nets withdrawals per briber per token and the
gate asserts attributed ≤ state flow (+ε) for every token. Independent of
archive access — do it before the backfill so post-merge gates are trustable.

## 6. Watchdog (ship first, no archive needed)

Weekly reconcile addition: for each active-pot token on chain, require ≥1
placement event within the pot's epoch span in the stream; violations surface
in `system-health` as `POT_WITHOUT_PLACEMENT`. Expected initially: the known
hole-era pots (annotated as such via a hole-span allowlist). Then: silence =
capture verified; a new alert = walker bug caught by the system instead of by
a user's memory. This converts today's "Camron notices missing bribes" into a
monitored invariant.

## 7. Acceptance gates (before the backfill is called done)

- Ledger attribution ≥99% for every token with ≥1,000 units lifetime flow;
  **no token >100%+ε** (post-§5).
- Votes reconcile: MISMATCH + CHAIN_ONLY → 0 on the next weekly run.
- Named fixtures found & attributed: PD ×2, Solid `s0yhw0` June CAPA,
  DeFi_Patriot wBTC/ATOM bribes (chain-exact amounts hand-checked vs his
  recollection/txhashes).
- Flows: hole-era events carry v2 fields; `build-pnl.js` coverage bands show
  the gap CLOSED; per-wallet event counts strictly ≥ pre-backfill.
- Idempotence: re-run of the merge adds 0 events.
- Boards: bribe-board banner coverage % recomputes to ≥99% LUNA; hole chip on
  member-portfolio flips green — no page code changes required anywhere
  (data-layer promise of every consumer holds).

## 8. Execution order

- **E0 (now, no archive):** §5 anomaly reproduction + rollup netting fix ·
  §6 watchdog · flows classifier v2 (forward) — all gateable on committed
  data + walker.
- **E1 (Camron):** pick archive access; drop endpoint in Render env.
- **E2:** registry job runs (Action or Render one-off; long-running →
  resumable either way), cursors advancing per contract.
- **E3:** merge → mock gate → rollup + P&L rebuilds → §7 gates.
- **E4:** nothing — every board and card lights up from data alone.

## 9. Non-goals

- No re-pricing of hole-era CAPA (price hole is a separate, optional spec).
- No speculative attribution: events only, dao_attr rules only — a bribe with
  no on-chain payer stays unattributed even post-backfill, honestly.

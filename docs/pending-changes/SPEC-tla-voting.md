# SPEC — `tla-voting` (voting event capture: votes, locks, bribes, rewards)

> **Status:** specified 2026-07-07, approved for build. Supersedes
> `website-adao-core/SPEC-tla-history-backfill.md` (2026-06-13) — that spec's
> engine was BUILT and chain-proven in `defipatriot/tla-history-data_2026`
> (seed 2026-06-15: 5,858 votes / 11,520 locks, clean-end). This spec ports it
> to the org pattern and widens scope to the full P&L / power-user dataset.
>
> Read `SPEC-platform-doctrine.md` first. This cron follows the
> Action-seeds / Render-forwards pattern proven by nft-flows and price-history.

---

## 0. Defaults locked for this build (veto before seed, not after)

| Decision | Default |
|---|---|
| tla-core module path | `tla-voting/events/` (module `tla-voting`, product `events`) |
| File shape | Monolithic per-stream JSON (proven engine shape; ~20k events total, no need for JSONL day-partition) |
| Seed | GitHub Action in `tla-core/.github/` (one-time; builds files as if the cron ran all along) |
| Forward | Render cron `org-tla-voting` in `platform-crons/tla-voting/` (shares the seed's classifier byte-identical) |
| Old repo | `defipatriot/tla-history-data_2026` parallel-runs untouched until org data verified via the site, then joins the retire pile |

---

## 1. One-contract-one-owner (doctrine — applies platform-wide)

**Every contract has exactly one owning event-cron.** No cron ever scans
another cron's contract; no event is ever captured twice.

| Contract | Owner |
|---|---|
| Gauge controller `terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj` | **tla-voting** |
| Voting escrow / vAMP minter `terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg` | **tla-voting** |
| Incentive manager `terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh` | **tla-voting** |
| Compounder + 4 bucket staking + zapper (6 LP custody contracts) | **tla-flows** (LP deposits/withdraws/emission-claims + zap costs; built 6/24, deploy pending) |
| State reads (VP held/directed, claimable bribes) | member-data / bribes-history — snapshots, not events; no conflict |

The word "claim" appears in both event crons but never collides: tla-flows
captures **emission claims by LP depositors** (its contracts); tla-history
captures **rebase claims by lockers** and **bribe claims by voters** (its
contracts). Boundary is the contract, always.

---

## 2. Three-layer architecture (modularity / resilience)

Third-party influences — PD, Solid, Astroport, Votion, arb vaults, future
Credia — are NOT separate capture targets. They act *through* the three TLA
contracts and appear inside events this cron already captures. Isolation is
therefore by layer, not by folder:

**Layer 1 — capture core (one, stable, influence-agnostic).**
Scans the three contracts, records everything. Recognized actions become
typed events; unrecognized actions become thin `event:<namespace>/<action>`
entries with the raw decoded msg retained, and are tallied in
`heartbeat.discovered_actions`. **Unknown ≠ dropped.** Proven: `votion-la/*`,
`arb/*`, `launch-nft/*`, `ca/*` all landed in the 6/15 seed without being
pre-known. A new or changed third party degrades to counted+kept, never
breaks the canonical streams, and can be promoted to a typed event later by
a classifier update + rollup recompute — **no re-backfill**.

**Layer 2 — attribution (config, lives in address-catalog, NOT here).**
Briber address → identity (PD multisig
`terra1k8ug6dkzntczfzn76wsh24tdjmx944yj6mk063wum7n20cwd7lxq4lppjg`, Solid,
Astroport, aDAO treasury) and wrapper namespace → platform (`votion-la` →
Votion, `arb` → arb vault). Adding Credia = catalog entries + one namespace
mapping. This cron emits raw addresses/namespaces only; it never hardcodes
identities. **Rider on this build: extend address-catalog with a
`bribers` + `wrapper-namespaces` section.**

**Layer 3 — rollups (recomputable forever).**
Per-wallet and per-briber derived views. A bug here costs a recompute of
derived files, never touches the event streams.

---

## 3. Streams and schemas (all events carry amounts + denoms — hard rule)

Every event: `{ type, wallet, height, timestamp, tx_hash, ... }`. Every
amount is `{ amount, denom }` raw (integer string + canonical
`native:`/`cw20:`/`ibc:` id); pricing happens downstream via price-history.
Epoch resolved from `docs/epoch_1-300_date.json` (1-indexed).

### `vote-events.json` (gauge) — chain-confirmed 6/15
`{ type:'vote', wallet, gauge:<bucket>, votes:[[assetId, bps]], epoch, ... }`

### `lock-events.json` (escrow) — chain-confirmed 6/15
Types: `lock_create`, `lock_extend_amount`, `lock_extend_time`, `merge`,
`split`, `migrate`, `lock_permanent`, `unlock_permanent`, `lock_transfer`,
`withdraw`, plus namespaced wrapper `event:*`. Carries `token_id`, asset
`{amount, denom}`, `lock_seconds` where applicable, and
**`canonical: true|false`** (wrapper-layer views of the same deposit are
kept but flagged; VP/lock-delta math filters `canonical === true` —
~9,906 / 11,520 in the current seed).

### `bribe-events.json` (incentive manager) — NEW, probe required
`{ type:'bribe_add', briber, pool/bucket, {amount, denom}, epoch, ... }`
plus whatever the sample probe discovers (withdrawals, config). **The
incentive manager has never been scanned — action keys unknown. The first
Action run is `mode=sample` across all three contracts; the bribe map is
confirmed against real txs before the full seed (doctrine §6: verify against
real data).** This stream is the raw material for bribe-source attribution
(VP swing by briber — the centralization-health signal).

### `reward-events.json` — NEW (promoted from counted-only)
Two sections, one file (both live on this cron's contracts):
- **Wallet claims:** `claim_rebase` (escrow, ~4,086 txs), `claim_bribes`
  (gauge/incentive mgr), Votion `compound` (escrow, ~795) — with claimed
  `{amount, denom}[]` parsed from the tx **events** (coin transfers), not
  just the msg. This is the income line of true P&L.
- **Protocol distributions:** `distribute_take_rate` (~7,092),
  `distribute_rebase` (~7,089), `distribute_bribes` (~2,951) — per-epoch
  pots with amounts. Pot × a wallet's VP-fraction (member-data influence)
  reconstructs *earned-vs-claimed* per epoch — the closest possible
  substitute for pruned pending-rewards history.

### `rollups.json` (derived, layer 3)
Per-wallet: vote count/changes/churn, first/last-vote epoch, pools_voted,
lock timeline (canonical-only sums), first_lock_ts, claimed totals by denom.
Per-briber: totals per epoch per pool. Copy-trading ranks come later from
these + address-catalog labels (so treasuries/contracts never top a
"wallets to mimic" board).

---

## 4. Output layout (tla-core)

```
tla-voting/
└── events/
    ├── index.json           (product index — required)
    ├── heartbeat.json       (tla-core standard shape + discovered_actions + per-stream horizons)
    ├── cursor.json          (lastScannedHeight per contract; Action writes, Render advances)
    ├── vote-events.json
    ├── lock-events.json
    ├── bribe-events.json
    ├── reward-events.json
    └── rollups.json
```

Seed code: `tla-core/.github/scripts/tla-voting/` +
`.github/workflows/tla-voting-backfill.yml` (template: `flows-backfill.yml`;
inputs: mode sample|full, LCDs, pager knobs — carried over from the proven
workflow). Forward code: `platform-crons/tla-voting/` (README + package.json +
cron js; env `GITHUB_TOKEN` scoped to tla-core; schedule `0 */6 * * *`).
Changelog: `tla-core/docs/changelogs/cron-tla-voting-log.md`.

Classifier is **byte-identical** between seed script and Render cron
(different repos — duplication accepted for a run-once seed, same as
nft-flows; any drift must be visible in diff).

---

## 5. Reliability (F-checklist, carried from the proven engine)

- **F1** publicnode ignores `pagination.offset` → resilient ASC pager
  (reprobe page 1, walk by height), hard page ceiling.
- **F2** null ≠ [] on every page — failed page retries/fallback-LCD, else
  partial; never silently "no data".
- **F3** never-shrink — merged count below committed aborts publish…
  **amended for archive (see §6):** growth strictly *below* a stream's
  `horizonHeight` is legitimate; shrink *within* the already-covered range
  still aborts.
- **F7** heartbeat honesty — `partial`/`error` on any incomplete scan;
  `lastScannedHeight` advances only on a complete scan.
- **F8** honest horizon — per-stream `horizonHeight` recorded ("history from
  height H", never a false genesis). Current floors: votes 11,767,657
  (2024-08-27), locks 11,559,131; bribes TBD at seed.

---

## 6. Archive-deepening hooks (Batch 5 designed-in now)

When the archive-node window arrives, deep history is **a re-run of the same
seed Action**, not new code:
- Workflow inputs `ARCHIVE_LCD` + `FLOOR_OVERRIDE` — point at the archive
  endpoint, scan below the recorded horizons, append downward.
- Dedup is by `tx_hash` (already is) so overlap with existing coverage is
  harmless.
- Never-shrink amended per §5/F3.
- Streams and rollups make no assumption that the earliest event is origin.

Target on that day: TLA genesis (2022-10-31) → 11.56M, completing lock
timelines, launch-era votes, early bribes → full-tenure true P&L.

---

## 7. What this powers (feature → stream)

| Site feature | Feeds from |
|---|---|
| Member Stats portfolio (dao-tla.html): full lock/vote timeline per wallet | lock + vote events |
| True P&L: cost basis + income + exits (events×price-history back to Aug-2024; exact from 2026-06-13 fwd) | lock + reward events + price-history + adao-positions |
| Earned-vs-claimed per epoch | reward-events distributions × member-data influence |
| Bribe ROI per pool ($/VP), "where does my vote earn most" | bribe-events + member-data |
| Bribe-source attribution / centralization health (PD vs Solid vs Astroport vs aDAO) | bribe-events + address-catalog |
| Vote Intelligence: churn, stale votes, votes on inactive pools | vote-events + token-catalog/dex-data |
| "Your vote may be stale" nudge | last-vote ts vs pool/bribe changes since |
| Power-user ranking → follow/mimic (future) | all streams + address-catalog labels |
| Ecosystem growth: locked VP over time, entry-path share (Votion vs direct) | lock events (canonical + wrapper namespaces) |

**Honestly cannot power:** pre-Aug-2024 anything (Batch 5); exact point-in-
time position USD before 2026-06-13 (event-based approximation via
price-history instead); LP-layer flows/costs (tla-flows' job — still
undeployed; full P&L eventually needs both siblings live).

---

## 8. Build order & verification

1. **Sample probe** — Action `mode=sample`, all three contracts, writes
   nothing. Confirms the incentive-manager action map + re-confirms
   votes/locks. Camron reviews the printed map.
2. **Full seed** — writes `history/events/`. Verify vs old repo: votes
   ≥ 5,858, locks ≥ 11,520, identical on overlap; bribe + reward streams
   sanity-checked against known txs (e.g. a recent PD bribe, a known
   claim_rebase).
3. **Render cron** — deploy `org-tla-history`, confirm it advances the
   cursor from where the seed stopped and heartbeat lands in the monitor.
4. **Address-catalog rider** — bribers + wrapper namespaces committed.
5. Old repo parallel-runs until site verification (Batches 3–4), then
   retire `tla-history-data_2026` (the old personal repo keeps its name) (frozen not deleted).

**Accepted risk:** we will probably discover wants we missed. The lossless
core makes that cheap — unrecognized actions are counted + kept with raw
msgs, so later scope becomes classifier promotion + rollup recompute, and
in the worst case the append-only, dedup-by-hash seed is safely re-runnable.
Build now, learn from real data, extend without rework.


---

## 9. Rename note (2026-07-08)

Module renamed `history` → `tla-voting` before Render deploy (name was not
descriptive). Scope unchanged: this cron is ONLY the event log of the three
voting contracts — the act of voting, the VP lifecycle, vote incentives, vote
proceeds. Positions/valuations = adao-positions; LP flows = tla-flows; VP
state = member-data. The seed carries a one-time prior-read fallback from the
old paths (`voting/events`, `history/events`) so the rename was lossless;
delete `tla-core/history/` (and `voting/` if present) after
`tla-voting/events` is published.

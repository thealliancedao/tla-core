# cron-tla-voting — changelog

Voting event capture: votes, locks, bribes, rewards.
Seed: `tla-core/.github/scripts/tla-voting/` (Action) · Forward: `platform-crons/tla-voting/` (Render `org-tla-voting`)
Spec: `docs/pending-changes/SPEC-tla-voting.md`

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

# cron-tla-voting — changelog

Voting event capture: votes, locks, bribes, rewards.
Seed: `tla-core/.github/scripts/tla-voting/` (Action) · Forward: `platform-crons/tla-voting/` (Render `org-tla-voting`)
Spec: `docs/pending-changes/SPEC-tla-voting.md`

---

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

# cron-dao-governance — changelog

---

## 1.1.0 — 2026-08-22 — chain-first module resolution (Lion DAO was capturing aDAO's proposals)

**Bug:** `lion-dao/governance/registry.json` was a copy of aDAO's registry
(`dao:"alliancedao"`, 2026-01-07) with Lion entries appended; the cron took the
FIRST registry contract answering `proposal_count` — AllianceDAO's module — so
lion-dao/proposals.json held aDAO's 39 proposals and the live Lion DAO #24 was
missing. Pixel Lions had no registry and was skipped (stale since January).
**Fix:** `findProposalModule(registry, dao)` now finds this DAO's *Core* entry
(name matches the folder, or the sole core), asks the core on chain for its
`proposal_modules`, keeps Enabled ones, verifies `proposal_count`. Registry
names route; the chain decides. Fallback orders registry candidates by folder
match and refuses another DAO's module when a core exists. Logs a registry-
drift warning when `registry.dao` ≠ folder. Mock gate: Lion via core (count
24, not aDAO's module), aDAO unchanged, fallback safe, core-only registry
(Pixel Lions) resolves from chain — 4/4.
**Registries (dao-originations):** lion-dao dao/daoName corrected (aDAO entries
kept for trust-grading of aDAO targets); pixel-lions minimal registry created
(core + voting module from the address-catalog config). Next 6h run rewrites
lion-dao and pixel-lions proposals.json; dao.html reads those files, so the
DAO page's Lions/Allies tabs go live from chain without manual updates.
Also 1.1.0: each proposal now carries `startHeight`, `expiration`
({at_time_iso}|{at_height}|{never}) and `live` straight from the chain object —
the site merges DAOs chronologically and shows time left on live proposals.
Note: `proposals.json` carries `exportedAt` but no heartbeat and system-health
does not watch this cron — queued.

## 2026-08-11 — 1.0.0 — NEW CRON: chain-derived DAO governance capture

Replaces the hand-exported governance corpus (`defipatriot/adao_json_storage`,
last export 2026-05-22) with automatic capture. Registry-driven: DAOs are
discovered by listing folders in `dao-originations`; each DAO's proposal module
is read from its own `registry.json` and self-verified with `proposal_count`.
Writes `<dao>/governance/proposals.json` + `history/<yyyy>/<mm>.json` in the
EXACT shape `dao_governance_tool.html` already renders — no page rendering
changes, only fresher data.

**Three-way split (SPEC-dao-governance-capture):** proposals → this cron;
members → org address-catalog (verified already holding adao 155, liondao 70,
pixellions 76 — 155/157 migrated aDAO members already present, so member CSVs
are duplicates and get deleted); registry → stays hand-curated per DAO, owned
by that DAO's people. Voter names are JOINED from the org catalog at capture
time; this cron never stores its own member list.

**Trust join:** proposal msgs are decoded; targets present in that DAO's
registry are `trusted`, everything else `not_yet_verified` — surfaced, never
hidden. New proposals auto-triage against vetted knowledge.

**Gate 21/21 against the REAL 37-proposal vetted corpus** — the mapper
reproduces id/title/status/votes/turnout/percentages/quorum/totalPower/voters
exactly. THREE legacy defects found and deliberately corrected:
1. **Vetoed** proposals: legacy emitted `outcome:"unknown"` + empty reason (no
   veto branch). Now classified as rejected with an explicit reason.
2. **thresholdReached**: legacy divided yes by ALL votes INCLUDING abstain, so
   three abstain-heavy proposals displayed "threshold not reached" despite
   having EXECUTED on chain. dao-proposal-single excludes abstain from the pass
   threshold; we use yes/(yes+no). The audit tool has been showing a
   self-contradicting verdict on those proposals.
3. **id casing** mixed within one file (a1..a9 vs A31..A37) — normalized.
Quorum-miss reason strings (with percentages) reproduce verbatim.

⚠ **CHAIN SHAPE UNVERIFIED AT BUILD TIME** — the build sandbox has no chain
egress, so field names follow the dao-proposal-single standard and the gate
exercises the mapper via responses reconstructed from the corpus. RUN ORDER
ON FIRST DEPLOY: `PROBE=1` (dump raw + mapped, writes nothing) → review →
`VERIFY=1` (diff all against the migrated corpus, writes nothing) → then
normal. Kill-switch `DAO_GOVERNANCE=0`. Cadence 6h.

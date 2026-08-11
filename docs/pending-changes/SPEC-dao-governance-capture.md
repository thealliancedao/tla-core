# SPEC-dao-governance-capture — stop hand-maintaining governance data

Status: DRAFT (2026-08-11) — architecture decided, build pending.
Context: `dao-originations` was populated 2026-08-11 by migrating the curated
corpus out of `defipatriot/adao_json_storage`. That migration preserved weeks
of vetting work, but the files were HAND-EXPORTED. This spec makes the
machine-derivable parts automatic and leaves only the genuinely human part
manual.

## The three-way split (verified, not assumed)

| Layer | Source of truth | Verified finding | Verdict |
|---|---|---|---|
| **Members** | org `catalog/snapshots/current.json` | Already carries them, keyed by slug: `adao 155`, `liondao 70`, `pixellions 76`, `tla_locks 203` (504 rows / 389 unique). **155 of the 157 migrated aDAO members are already in the org catalog.** | ❌ **DROP `members.csv` from the tenant repo** — it is a duplicate of an earlier org layer. Readers switch to the catalog (filter by slug). The 2 missing addresses get diffed once, then the CSV is deleted. |
| **Proposals** | chain (per-DAO proposal module) | The mechanism ALREADY EXISTS in `index.html:checkForLiveProposals()` — LCD smart query `{proposal:{proposal_id:i}}` against `terra1va3tny…etanj2`, walking ids past the last known one. That contract IS in the vetted registry (`AllianceDAO Proposal Module`, validActions propose/vote/execute). | ✅ **AUTOMATE** — an org cron replaces the manual export entirely. |
| **Registry** | human judgement | The trust layer: which addresses, actions and messages are *vetted*. No chain query can produce it. | ✋ **STAYS CURATED**, per DAO, owned by that DAO's people. This is the ONLY manual file. |

## Cron: `dao-governance` (new module in platform-crons)

**Registry-driven by construction** (platform doctrine — no hardcoded DAO
enumeration): the cron lists folders in `dao-originations`, reads each
`<dao>/governance/registry.json`, and finds the contract whose `type` is `dao`
and whose `validActions` include `propose`. That contract is the DAO's
proposal module. A DAO is onboarded by adding a folder — nothing else changes.

**Per DAO, each run:**
1. `{proposal_count:{}}` (or walk ids until a gap) → target range.
2. For each id: `{proposal:{proposal_id:i}}` → title, description, status,
   proposer, msgs, votes, thresholds, expiration.
3. Emit `<dao>/governance/proposals.json` in the SHAPE THE AUDIT TOOL ALREADY
   CONSUMES (`{dao, daoName, exportedAt, proposals:{<id>:{…}}}`) so
   `dao_governance_tool.html` needs no rendering changes — only its
   `exportedAt` stops being months old.
4. Append `<dao>/governance/history/<yyyy>/<mm>.json` for the series layer.

**BUILD STEP 0 (must run where chain is reachable — the sandbox is
GitHub-only):** probe the proposal module and record the exact response shape,
then write the chain→tool field map. Do NOT guess this mapping; a wrong
`votes`/`threshold` map silently produces wrong quorum math on a page whose
whole purpose is trust.

**Trust join (the audit tool's real value):** each proposal's `msgs` carry
target addresses. The tool marks a message *trusted* when its target appears
in that DAO's `registry.json` with the matching `validAction`; otherwise
**not-yet-verified** — surfaced, never hidden. This is what makes the registry
worth maintaining: new proposals automatically get triaged against vetted
knowledge, and anything new shows up as needing a human look.

**Ownership rule (Camron, 2026-08-11):** aDAO's registry is audited by us.
Other collections (Lion-DAO, Pixel-Lions) maintain their OWN registry file in
their own folder — we don't know their contracts well enough to vouch for
them. The tool renders whatever trust data each DAO's registry provides; an
un-maintained registry simply yields more "not yet verified" rows, which is
honest rather than wrong.

## Feed integration (index news)
`checkForLiveProposals()` currently fetches the legacy props JSON to learn the
max known id, then probes ids past it. After this cron ships it reads the org
`proposals.json` instead — same logic, fresher baseline. Later: the feed can
render richer cards (proposer, turnout, quorum, trusted/unverified message
count) because the cron captures those fields already.

## Definition of done
- [ ] Step 0 chain-shape probe + field map recorded here
- [ ] cron built, mock-gated against the migrated corpus (37 aDAO proposals
      are a real fixture: the cron's output for ids 1..37 must reproduce their
      titles/statuses/vote tallies)
- [ ] `proposals.json` regenerating for all three DAOs; `exportedAt` fresh
- [ ] `members.csv` deleted from tenant repos; readers on org catalog by slug
- [ ] index feed baseline repointed
- [ ] registry.json remains the only hand-edited governance file

# SPEC — Docs consolidation: absorb website-adao-core into tla-core/docs

**Status:** ✅ **EXECUTED 2026-07-14** (dedicated session, per the rules below).
Every disposition in §3 was carried out as a content merge: 5 straight MOVEs
(CHANGES_PENDING updated to the 2026-07-14 state; STORAGE-DESIGN §7
distributions row flipped to DECIDED; both shipped SPECs' statuses updated),
queries.md moved to `docs/` + updated with the 2026-07-13/14 query knowledge
(distributions / gauge_infos / user_info / lock_info / total_vamp; §18
connector-alliance rescued from CRON-FIXES-BRIEF), PRICING-DOCTRINE merged into
`ecosystem-knowledge/` (arbLUNA note's lesson folded in), VP-mechanics merged
into `eris-protocol.md` + `.facts.json` (`vamp.*` facts), and both MINE passes
completed — survivors ported to CHANGES_PENDING §"Mined from retired docs",
everything superseded retired (git history keeps it). Deletion checklist for
website-adao-core delivered with the commit package; PK placement map +
CLAUDE_PROJECT_INSTRUCTIONS repointed to the new homes.
Originally mapped 2026-07-14 (Camron's process, codified below). **This was a
content merge, not a file move.** A blind copy was packaged and withdrawn on
2026-07-14 after Camron caught it; the skim then proved him right (three
would-be contradictions listed in §4).

## 1. The rules (Camron, 2026-07-14 — binding)

1. First fully understand the org repo's docs structure — what exists, how
   it's organized — BEFORE touching anything.
2. Walk the old repo looking for content NOT already in the org.
3. For each piece: find the existing org home and MERGE the content in
   (overwrite/absorb). Only create a new file when no home exists AND it
   makes sense. Expect mostly EDITS to existing org files, few new files.
4. The old repo is full of ideas we proved wrong or replaced. Absorb what
   adds value; NEVER import anything that conflicts with what we've since
   solved. Superseded ideas retire (git history keeps them) — they do not move.
5. Careful and thought-through, not copy-paste.

## 2. Org docs structure (mapped 2026-07-14 — the homes)

```
tla-core/docs/
  README.md            — charter: "static reference data the crons read"
  epoch_1-300_date.json, staking-apr.csv
  curated/             — hand-maintained registry (known_contracts, protocols,
                         token_overrides, wallets, categories, acquisition…)
  ecosystem-knowledge/ — grounding reference, {protocol}.md + {protocol}.facts.json
                         pairs; "how the ecosystem actually works," 3 readers
  changelogs/          — per-cron logs (cron-address-catalog-log etc.)
  pending-changes/     — SPECs + work queues (SPEC-platform-doctrine,
                         SPEC-tla-voting, SPEC-tla-flows-*, cron-tla-voting-log…)
```

## 3. Disposition table (every website-adao-core doc)

| Old file | Disposition | Org home / rationale |
|---|---|---|
| CHANGES_PENDING.md | **MOVE (updated 2026-07-14 version)** | `pending-changes/` — becomes the platform work queue; header notes the new home |
| TLA-CORE-STORAGE-DESIGN.md | **MOVE (+§7 register row → DECIDED single-file)** | `pending-changes/` beside SPEC-platform-doctrine |
| SPEC-vp-definition-fix.md (amended) | **MOVE** | `pending-changes/` — org capture spec |
| SPEC-distributions-capture.md | **MOVE** | `pending-changes/` |
| SOURCE-AUDIT-DRAFT.md | **MOVE** | `pending-changes/` — the live Batch-3 site→org repointing contract |
| queries.md (1,186 ln) | **MOVE then UPDATE** | `docs/` root (fits the static-reference charter exactly); update pass adds distributions / total_vamp / user_info / lock_info knowledge from 2026-07-13/14 |
| PRICING-DOCTRINE.md | **MERGE** | `ecosystem-knowledge/` — canonical settled doctrine; keep as its own .md, derive a facts.json later |
| SYSTEM-AUDIT-AND-OPS.md (359 ln) | **MINE then RETIRE** | Extract: Nov token-rollover checklist + still-open cleanup-hitlist items → CHANGES_PENDING queue; cron/repo dependency map is largely superseded by the migration itself — verify each row before carrying |
| CRON-FIXES-BRIEF.md (678 ln) | **MINE then RETIRE** | Fixes for the RETIRING personal crons; walk it once, port only items still true of org crons or the site → CHANGES_PENDING; the rest is history |
| TLA-CORE-STATUS.md | **RETIRE** | Point-in-time handoff (Jun-25), stale; surviving facts belong in module READMEs, most already are |
| NOTE-arbLUNA-pricing-gap.md | **RETIRE** | Resolved; its lesson lives inside PRICING-DOCTRINE |
| SPEC-tla-history-backfill.md | **RETIRE (superseded)** | Built differently and better: tla-voting seed + FCD fill + distributions harvest. Moving it would present a dead plan as live |
| SPEC-known-address-registry.md | **RETIRE (superseded)** | Implemented as address-catalog + docs/curated/. Done. |
| PROJECT_KNOWLEDGE, CLAUDE_PROJECT_INSTRUCTIONS | **STAY** | Chat-bootstrap docs — website-adao-core by design |
| MISSION, PROJECT-DIRECTION, PROJECT-STATUS, CHANGELOG, SESSION-CLOSEOUT, epoch json | **STAY** | Project-level / site-level |
| index-log.md + all per-page \*-log.md | **STAY** | LIVE SITE fetches these at runtime — repoint only with the Batch-3 site pass |
| SPEC-ai-assistant, SPEC-portfolio-tracker, SPEC-nft-onboarding-blueprint | **STAY** | Website-feature specs |
| VP-mechanics learnings (2026-07-14: multiplier = 1+9×wk/104, stamping, slope, dormant locks) | **MERGE (new content)** | `ecosystem-knowledge/eris-protocol.md` + `.facts.json` — has no old-repo file; born org-side |

## 4. Contradictions the blind copy would have shipped (why the rules exist)

1. SPEC-tla-history-backfill "NOT built" → its goal was achieved by other means.
2. SPEC-known-address-registry "NOT built" → it WAS built (address-catalog + curated/).
3. CRON-FIXES-BRIEF prescribes fixes to crons we are deleting.

## 5. Execution (one dedicated session)

Order: straight MOVEs (5) → queries.md move+update → PRICING-DOCTRINE +
VP-mechanics merges into ecosystem-knowledge → the two MINE passes (read
against current truth, port survivors to CHANGES_PENDING) → delete ALL moved
+ retired files from website-adao-core → update the PK placement map to the
final split. Completion = every data-layer doc has exactly one home; the old
repo holds only STAY-column files.

After this executes: data/capture-layer docs update ONLY in tla-core/docs;
website-adao-core is website + bootstrap only.

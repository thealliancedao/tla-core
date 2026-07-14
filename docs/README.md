# docs — the platform's documentation home

**Since 2026-07-14 (SPEC-docs-consolidation) this is the SINGLE HOME for all
data/capture-layer documentation.** `defipatriot/website-adao-core` keeps only
site-runtime logs (`*-log.md` the live site fetches), chat-bootstrap docs
(PROJECT_KNOWLEDGE, project instructions), and website-feature specs.

## Map

- **`pending-changes/`** — SPECs + the platform work queue.
  - `CHANGES_PENDING.md` — **the work queue.** Read this first every session.
  - `SPEC-*.md` — one spec per build. Status line at the top of each tells you
    if it's a live contract, shipped, or executed. Completed one-shots retire
    (deleted; git history keeps them) once their durable facts live in a
    changelog / product README.
  - `TLA-CORE-STORAGE-DESIGN.md` — the storage convention (module → product →
    files) + the Deviation Register (§7). Check the register before any
    conformance work.
  - `SOURCE-AUDIT-DRAFT.md` — the Batch-3 site→org repointing contract (draft).
- **`changelogs/`** — per-cron session logs (`cron-<name>-log.md`), newest
  first. Note: `tla-flows` and `member-data` keep their rev history in their
  `platform-crons/<module>/README.md` "Recent changes" section instead — one
  fact, one home; don't create a second log here.
- **`ecosystem-knowledge/`** — grounding reference: `{topic}.md` +
  `{topic}.facts.json` pairs ("how the ecosystem actually works", citable by
  humans, builders, and agents). Schema + rules in its own `README.md`.
  Includes `PRICING-DOCTRINE.md` (canonical pricing rules).
- **`curated/`** — hand-maintained registry the crons read: known contracts,
  protocols, token overrides, wallets, categories, acquisition guides.
- **`queries.md`** — every on-chain query we know: input shape, output shape,
  gotchas. The single source of truth for "what can we ask the chain about
  TLA." New query discoveries get appended here, always.
- **Static reference data** (the folder's original charter, still true):
  - `epoch_1-300_date.json` — canonical TLA epoch schedule (1-indexed,
    epoch number → date). Crons use this for epoch timing.
  - `staking-apr.csv` — historical staking APR reference.
  - `tla-docs-content.json` — content for the site's TLA docs page.

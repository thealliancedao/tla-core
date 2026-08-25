# docs / ecosystem-knowledge — changelog

## Rev 2.0 — 2026-08-25 — docs hub rebuilt

tla-docs.html rewritten: the curated TLA guide (13 sections + glossary from
tla-core/docs/tla-docs-content.json — the old page fetched a moved file) plus
the knowledge base (ecosystem-knowledge/*.md rendered from markdown, grouped:
how to read this site · the alliance · protocols on the rails · history &
verification), sidebar with search across all docs, hash deep links, source
link on every doc, shared chrome. Promoted from Test 2 to a Live tile on
Tools. Gate `gate-docs.mjs` 5/5.


## 2026-08-24 — one-off Action `fuel-boost-dao-probe` (read-only)

`.github/scripts/fuel-supply/boost-dao-probe.mjs` + `workflows/fuel-boost-dao-probe.yml`.
The owner wants Boost DAO members' FUEL positions on the FUEL whales panel;
Boost DAO staking + treasury live on NEUTRON (core
`neutron1ej43fvrmw40dg6xj40mmh822a8xz98rt5ad2p9tj2tgtgxw0zalsvvzm43`,
owner-supplied; the DAODAO treasury page shows 42.44M FUEL there). Same
path CAPA took — probe → SPEC → duty: reads core `dump_state` (name /
voting_module / proposal_modules), voting-module shapes (`info`, `denom`,
`total_power_at_height`, paginated `list_stakers`, `claims` sample), bank
balances of core + module, and supply/trace of every FUEL-looking denom so
the Terra IBC supply on fuel-tool reconciles to the Neutron native supply.
Tries three public Neutron LCDs (first that answers wins; inputs override).
Writes nothing. Offline control-flow gate: 35-staker pagination, Σ ==
total_power, denom discovery. OWNER: trigger when Neutron LCDs are up, paste
the log; then SPEC-fuel-supply-map (Terra IBC + Neutron native + Boost
stakers + treasury, sum-guarded like CAPA) → duty in org-token-catalog →
fuel-tool whales section "Boost DAO stakers (Neutron)".


## 2026-08-24 — one-off Action `capa-supply-fold-legacy` (+ script)

`.github/scripts/capa-supply/fold-legacy.mjs` + `workflows/capa-supply-fold-legacy.yml`
(workflow_dispatch, `dry_run` default true, dual-checkout of platform-crons so
row shapes + merge rules come from the LIVE capa-supply module). Folds the
retired ampcapa-data_2026 weeklies (epochs 181–197) + monthlies into
`supply/capa/wallets-daily/<date>.json`, `wallets-daily/index.json` and
`supply/capa/index.json` rows, every artefact `src: legacy_fold …`. Laws in
code: prior-verbatim (captured days/rows never touched), never-shrink
(unreadable committed file → refuse), per-snapshot guard Σ members.capa ==
summary.totalCapa, weekly+monthly on the same day → first wins, dailies 404
upstream → not folded (never invented). Proven locally against the real
legacy feed: 20 index rows added (2026-04-19 → 08-09), 19 daily files, re-run
adds 0, a simulated captured day left untouched. OWNER: run with dry_run,
read the log, run again with dry_run unchecked, then retire the Render job
(checklist in CHANGES_PENDING).


## 2026-08-21 — Foundations arc (primary-source intake, session delivery)
- NEW `ecosystem-knowledge/FOUNDATIONS-SOURCES.md` — primary-source registry:
  verified / thin / owner-intake ledger. Astroport pool-type + fee flows
  verified from official docs (incl. fees→bribes two-layer finding).
- NEW `ecosystem-knowledge/AUDITS.md` — audit registry: SCV PublicReports +
  Oak Security enumerated (~55 relevant reports; ve3 gauge audit, Phoenix
  Treasury audit, both aDAO NFT audits, DAO DAO ×6, Astroport ×22, Alliance
  module audit). Absence finding: Solid/Votion/SkeletonSwap/Credia unaudited
  at both firms as of 2026-08-21.
- NEW `ecosystem-knowledge/phoenix-directive.md` — full PD chapter: founding
  doc, 8-article catalog, GitHub org, treasury contract source + deployed
  address (prop #4822), PoL program w/ multisig + pool ownership, take-rate
  two-layer distinction, 20% charter cap.
- UPDATED `ecosystem-knowledge/phoenix-directive.facts.json` — +10 sourced
  facts (verbatim-preserved priors).
- NEW `ecosystem-knowledge/terra-depeg-and-fork.md` — sourced depeg/rebirth
  chapter (Nansen, NBER w31160, prop 1623, genesis docs; SOLID-vs-UST
  contrast; archived Agora registered).
- NEW `governance/props/luna-seed-2026-08-21.json` — 122 gov props verbatim
  (owner HAR); TLA/PD founding arc chain-verified (#4813→#4847).
- NEW specs in pending-changes: SPEC-governance-props (capture + docs page +
  news feed incl. Forum tab), SPEC-pd-bribe-drift, SPEC-lp-grades-rework;
  plus AUDIT-price-artifact-2026-08 (platform pricing-artifact root cause).

## 2026-08-21 (later) — Solid + Votion chapters (owner mega-intake)
- REWRITTEN `solid-protocol.md` (was 12 lines): full CDP mechanics from
  whitepaper v2 (LSD collateral, LTV, liquidation queue, mint-fee model),
  **audit status = NONE per Solid's own Terms** (first-party close of the
  hunt), Atrium marketplace incl. the two platform-relevant findings:
  Alliance NFTs trade there, and **TLA Locks (veLUNA) are a listed
  collection** — lock ownership can change hands; lock tracking must not
  assume minting wallet still owns a lock.
- NEW `votion.md`: docs-sourced advisor scope (LA + Hydro, Eris-hosted
  docs) + vault channel; optimizer algorithm/cadence/fees explicitly
  UNPUBLISHED — Bribe Planner response model stays labeled as a model.
- facts appended: solid ×4, votion ×3. AUDITS.md + FOUNDATIONS-SOURCES.md
  updated (Solid closed, Votion boundary set).

## 2026-08-21 (late) — F3: pricing-artifact cautions into agent docs
- DATA-MAP: artifact-suspicion rule (LST ratio ≈1.0 / off-neighbor prices),
  `f2_repair:` + `_price_corrections` reading guide, repetition-is-not-taint
  lesson, Class-D chronic warning. PRICING-DOCTRINE: reserve≠price
  enforcement note, identifier-drift family (E11/E12), loud-absence and
  labeled-repair principles. Closes AUDIT-price-artifact-2026-08 F1→F3.

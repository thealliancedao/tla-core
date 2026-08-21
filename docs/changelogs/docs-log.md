# docs / ecosystem-knowledge — changelog

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
- NEW `governance/props/seed-2026-08-21.json` — 122 gov props verbatim
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

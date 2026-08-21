# AUDITS — Security Audit Registry (opened 2026-08-21)

> Every security audit covering protocols TLA Stats tracks, with verified
> links. Source: SCV-Security/PublicReports (owner-provided, enumerated via
> blobless clone 2026-08-21 — sizes are repo blob sizes, links verified from
> the live tree). Base: `https://github.com/SCV-Security/PublicReports/blob/main/`
> — append the path; raw download swaps `blob/main` for `raw/main`.
> Related SCV audit-target forks: [astroport-core](https://github.com/SCV-Security/astroport-core) ·
> [capa-money-market](https://github.com/SCV-Security/capa-money-market) ·
> [core](https://github.com/SCV-Security/core).

## The gauge war itself (highest load-bearing)
- **ERIS — Contracts ve3 — Audit Report v1.0** (886KB) —
  `Eris Protocol/ERIS - Contracts ve3 - Audit Report v1.0.pdf`
  The ve(3,3) system: voting escrow (vAMP), gauges, bribes — the machinery
  behind our gauge controller / vAMP minter / incentive manager tracking.
  Code: https://github.com/erisprotocol/contracts-ve3
- **Eris — Phoenix Treasury Contract — Audit v1.0** (543KB) —
  `Eris Protocol/Eris Protocol - Pheonix Treasury Contract - Audit Report v1.0.pdf` *(sic "Pheonix")*
  **The PD treasury was built by Eris** — contract `phoenix-treasury` in the
  same contracts-ve3 repo; audited at commits `911ec9f2…` and `2c397031…`.
  Scope (verbatim topics): virtual-token staking via Alliance, DCA + OTC
  swaps, milestone/vesting payments, veto capabilities delaying payments and
  enforcing spending limits, basic on-chain price oracles. Findings profile:
  2 observations (clawback concerns, DCA consistency) + 2 technical (DCA
  sandwich susceptibility, error message) — no unresolved criticals reported.
  Open probe: the DEPLOYED address on phoenix-1 (audit is pre-deployment).

## Eris Protocol (TLA hub stack)
- amp-compounder v1.0 (3.6MB) — `Eris Protocol/Eris Protocol - amp-compounder - Audit Report v1.0.pdf` — the ampLP compounder our APR formula prices (take rate!)
- Amplified Staking v1.0 (350KB) — `Eris Protocol/Eris Protocol - Amplified Staking - Audit Report v1.0.pdf` — the ampLUNA hub
- Ampz v1.0 (3.0MB) — `Eris Protocol/Eris Protocol - Ampz Contract - Audit Report v1.0.pdf`
- Tokenfactory v1.0 (3.3MB) — `Eris Protocol/Eris Protocol - Tokenfactory Contract - Audit Report v1.0.pdf`

## Alliance / aDAO NFT
- Alliance DAO — NFT Collection Contract v1.0 (613KB) — `Alliance/Alliance DAO - NFT Collection Contract - Audit Report v1.0.pdf` (the site-footer audit)
- TerraForm Labs — Alliance NFT Collection v1.0 (709KB) — `Alliance/TerraForm Labs - Alliance NFT Collection - Audit Report v1.0.pdf` (second, TFL-commissioned audit of the collection)
- **x/alliance module audit** — alliance-audit-v1.0.pdf (3.2MB) at
  https://github.com/terra-money/alliance/blob/main/audit/alliance-audit-v1.0.pdf
  (mirrored in the PD fork; captured 2026-08-21)
- Collection source: https://github.com/phoenix-directive/alliance-nft-collection

## Astroport
- **Concentrated Liquidity Pool v1.0** (2.4MB) — `Astroport/Astroport - Concentrated Liquidity Pool - Audit Report v1.0.pdf` — the PCL audit; primary source behind our reserves≠price doctrine

## Enterprise DAO (staking venue, 403 aDAO NFTs)
- TerraForm Labs — Enterprise DAO v1.0 (1.7MB) — `Enterprise DAO/TerraForm Labs - Enterprise DAO - Audit Report v1.0.pdf`
- Contracts: https://github.com/phoenix-directive/enterprise-contracts

## BackBone Labs (bLUNA / marketplace)
- Fee Split v1.0 (3.4MB) — `BackBone Labs/BackBone Labs - Fee Split - Audit Report v1.0.pdf`
- Necropolis Contracts v1.0 (776KB) — `BackBone Labs/BackBone Labs - Necropolis Contracts - Audit Report 1.0.pdf`

## Capapult (CAPA / ampCAPA)
- CAPA Token Contracts v1.0 (3.7MB) · Money Market v1.0 (4.0MB) · Money Market
  & Private Token Retainer v2.0 (3.4MB) · Oracle Contract v1.0 (621KB) — all
  under `Capapult/`

## Phoenix Directive (chain stewardship)
- Terra Core Cosmos-SDK v1.0 (772KB) — `Phoenix Directive/Phoenix Directive - Terra Core Cosmos-SDK - Audit Report v1.0.pdf`

## Terra chain
- Core v2 Audit Test v1.0 (348KB) · Airdrop Contracts v1.0 (356KB) ·
  Community Pool Vesting v1.0 (800KB) · Inscription Bridge v1.0 (744KB) —
  all under `Terra/`

## Adjacent (tracked marketplaces / misc)
- NFTswitch Contracts v1.0 (415KB) + Fee Split v1.0 (2.4MB) — `NFTswitch/`
- Phoenix Finance — Core Contract Test 0.2 (433KB) — `Phoenix Finance/`
  (distinct protocol from Phoenix Directive — do not conflate)

## NOT covered by SCV or Oak
**Solid Protocol — CONFIRMED UNAUDITED, first-party** (2026-08-21): Solid's
own Terms of Use state "The Protocol's smart contracts have not been
formally audited by a third-party security firm." Hunt closed; re-open only
if they announce one. Solid's Atrium marketplace carries an **internal**
6-pass audit only (AUDIT.md in solid-online/atrium-marketplace — 29/29
invariants, no critical/high, two medium admin-trust findings).
**Votion · SkeletonSwap · Credia** — no report at SCV or Oak (both sets
enumerated 2026-08-21); status unknown. Each chapter states the dated
absence until a report surfaces.

## Oak Security set (owner-provided 2026-08-21, second auditor)
Base: `https://github.com/oak-security/audit-reports/blob/main/` + path.
- **DAO DAO — 6 audits, 2022–2024** (`DAO DAO/`): v1 (2022-06), v2 (2023-02),
  Vesting & Payroll Factory, Updates (2023-10), Veto (2024-01), Rewards
  Distributor + staked-voting bundle (2024-11) — **first audit coverage for
  our primary NFT-staking venue** (1,631 aDAO NFTs).
- **Astroport — 21 audits, 2021–2025** (`Astroport/`): full timeline incl.
  Core, Governance, vxASTRO (2022 + 2024 updates), **Concentrated Liquidity
  Pool (2023-03 — second PCL audit, different firm than SCV's)**,
  **Incentives (2024-01 — the generator paying our sink pools)**, Maker &
  Vesting updates, Tokenfactory LP tokens, Fee Sharing (2024-10), Hub
  Neutron migration, PCL orderbook integrations.
- **Eris Protocol** (`Eris Protocol/`): 2023-02 audit — second-firm coverage
  alongside the SCV set.
- **Skip** (`Skip/`): Protocol-Owned Builder (2023-07) + Swap Contracts
  (2023-08) — the swap/routing rails for moving assets into Terra (owner
  note: key on-ramp when we need assets in).
- **Historical (Terra Classic era, kept as context for the depeg chapter):**
  Anchor Liquidation Queue (2021-10) · Terra Liquidity Bootstrapping Pool
  (2021-12). See ecosystem-knowledge/terra-depeg-and-fork.md.
- Oak set also checked for **Solid / Votion / SkeletonSwap / Credia: absent**
  — the no-audit-found status now covers BOTH major Cosmos audit firms
  (SCV + Oak, checked 2026-08-21).

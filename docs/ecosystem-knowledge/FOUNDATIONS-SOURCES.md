# FOUNDATIONS — Primary-Source Registry (opened 2026-08-21)

**Purpose:** every mechanism claim the platform or its help agent makes must trace
to a primary source — official docs, contract repos, audits, or governance
proposals — not to "data we believe to be true." This file is the ledger: what is
verified (with links and dates), what is thin, and what the owner is sourcing.
Chapters in `ecosystem-knowledge/` cite into this registry; the agent corpus
reads both.

## A. Verified against primary sources

### Astroport — pool types & fee flows (verified 2026-08-21, this session)
- **Fees** — https://docs.astroport.fi/docs/learn/astro-tokenomics/fees :
  constant-product (xyk) pools charge **0.30%** — 0.2% (⅔) to LPs (accrues into
  reserves), **0.1% (⅓) maker fee to the Astral Assembly, used to buy ASTRO
  which goes to the xASTRO staking pool**. Stableswap pools charge **0.05%**,
  split 50% LPs / 50% maker→xASTRO (25% on Osmosis outpost).
- **PCL pools** — https://docs.astroport.fi/docs/learn/astro-pools/passive-concentrated-liquidity-pools/curve-vs-astroport-pcl-models
  and https://blog.astroport.fi/post/astroport-unleashes-first-passive-concentrated-liquidity-pcl-pool-on-terra :
  liquidity concentrates around an **internal EMA oracle price** with a
  repegging algorithm; **fees are dynamic** (rise with volatility); **admin fees
  are sent instantly to the Maker contract** (unlike Curve, where they stay in
  the pool). ⇒ Formal confirmation of PRICING-DOCTRINE: a PCL pool's reserve
  ratio is NOT its price.
- **Stableswap invariant** — https://docs.astroport.fi/astroport/smart-contracts/swap-pairs/stableswap-pool :
  4A(Rx+Ry)+D amplification around 1:1. Same conclusion: reserves ≠ price.
- **Factory / maker_fee_bps mechanics** — https://docs.astroport.fi/astroport/smart-contracts/astroport-factory
  and https://github.com/astroport-fi/astroport-core/tree/main/contracts/factory :
  per-pair `total_fee_bps` / `maker_fee_bps`; governance-adjustable; custom pool
  types possible. Long-tail xyk variant with LP-heavy fee split:
  https://blog.astroport.fi/post/new-fee-structure-for-long-tail-pools-live-now
- **⇒ Fee-recycling finding (completed 2026-08-21):** Astroport's CORE
  mechanics do not recycle fees into bribes — the protocol fee loop ends at
  xASTRO stakers. BUT a real fees→bribes loop DOES exist as a **program
  commitment**: under the PoL proposal (prop #4844 / forum thread), the
  Astroport TEAM committed 50% of its Terra-pool revenue share as Astro Wars
  bribes, proportional to each pool's fees. Both layers sourced; attribute
  the loop to the commitment, not to DEX mechanics. Also registered:
  **forum.phoenix.money** (PD Discourse — the live governance discussion
  venue, successor to Commonwealth/Agora; JSON API at /latest.json makes it
  a news-feed capture candidate — see SPEC-governance-props).

### Already-verified chapters (pre-existing, keep verification cadence)
- **Eris Protocol** — eris-protocol.md, 13 sources, verified 2026-06-26.
  amp-compounder, vAMP, take rate; APR formula independently re-verified
  2026-08 (AUDIT-eris-apr-pricing).
- **Credia** — credia.md, verified 2026-07-16 vs docs.creda.finance + repo.
- **BackBone Labs / SkeletonSwap** — verified 2026-06-26; bLUNA hub `{state:{}}`
  rate confirmed again 2026-08-21 via ratio-history during the pricing audit.
- **Terra chain / governance basics** — https://docs.terra.money/learn/protocol/


### Phoenix Directive — founding document (verified 2026-08-21, full text)
- **Source:** https://medium.com/@PhoenixDirective/the-phoenix-directive-81abeddab404
  (Phoenix Foundation, 2024-06-29) · forum canonical:
  https://commonwealth.im/terra/discussion/23826-the-phoenix-directive
- Establishes: BORG structure (Governance / Think Tank / Task Forces /
  Stewardship Team [0xPhilipp, MBaejir, Evan_Phoen1x] / Treasury); funding =
  virtual token staked via Alliance module at 10% initial reward weight,
  rewards claimed to treasury; spend vetoes (>$50k Think-Tank 3d, >$150k
  governance 10d); governance kill-switch by delisting; liquidity-war
  participation **self-capped at max 20% of total voting power** (verbatim);
  mandate includes "incentivizing liquidity" (charter basis of the bribe
  program). Chapter: ecosystem-knowledge/phoenix-directive.md.
- **Also verified 2026-08-21:** "Structured Liquidity in Practice" (2026-04-14)
  — PD's system doctrine: allocation philosophy ("liquidity continuously
  positioned where it is most effective"), take-rate→chain-owned-liquidity
  claim, Votion mechanism description ("auto-compounding bribes into LUNA
  lock positions"), five-layer ecosystem map. Full 8-article catalog with
  URLs now in the phoenix-directive.md chapter.
- Still needed: granular placement formula (unpublished so far — next reads:
  Strategy & Roadmap 2025-02, both treasury reports), treasury **contract
  address** (likely in a treasury report), post-2024 structural updates.

## B. Thin — needs sourcing (owner is gathering; verify then fold in)

| Topic | Current state | What we need |
|---|---|---|
| **Phoenix Directive** | founding doc VERIFIED (see §A) | placement-criteria post · treasury contract address |
| **Solid Protocol** | **CLOSED 2026-08-21**: whitepaper v2 read in full, chapter rewritten, facts extracted; audit status = NONE per Solid's own Terms (first-party) | re-verify if an audit is announced |
| **TLA / Alliance Hub** | module repo + README verified; **alliance-audit-v1.0.pdf CAPTURED** (3.2MB, live at terra-money/alliance + PD fork); official docs site registered (docs.alliance.terra.money) | docs-site deep read; Eris Alliance-Hub repo; hub-funding governance prop; take-rate two-layer on-chain probe |
| **aDAO NFT contract** | audit link known (SCV) + **collection SOURCE repo found**: github.com/phoenix-directive/alliance-nft-collection | SCV Security audit PDF: https://github.com/SCV-Security/PublicReports/blob/b819ec669f81e603caca261931e2a4aaca1cddf7/Alliance/Alliance%20DAO%20-%20NFT%20Collection%20Contract%20-%20Audit%20Report%20v1.0.pdf — fold key findings into a chapter |
| **Votion** | **docs repo read in full 2026-08-21** (erisprotocol/votion-docs — user-facing only); chapter written | optimizer algorithm/cadence/fees remain UNPUBLISHED — permanent honesty boundary unless Eris publishes |
| **Boost DAO** | facts.json, 0 URLs | Any primary source |
| **SkeletonSwap pool types** | "typically XYK" asserted | Confirm per-pool (stable vs volatile) from warlock backend or repo — feeds the Stage-3 pricing guard (AUDIT-price-artifact §4 F1) |

## C. Owner-provided source intake (append as received)
- **2026-08-21 · SCV-Security/PublicReports (owner-provided)** — enumerated in
  full; 24 relevant reports registered in ecosystem-knowledge/AUDITS.md,
  including the ve3 gauge-system audit, the Eris-built Phoenix Treasury audit
  (repo+commits captured), both aDAO NFT collection audits, Astroport PCL,
  Enterprise DAO, BBL, Capapult, PD chain-core, Terra core. Confirmed absent:
  Solid, Votion, SkeletonSwap, Credia.
- **2026-08-21 · oak-security/audit-reports (owner-provided)** — enumerated;
  31 relevant reports registered in AUDITS.md: DAO DAO ×6 (venue now
  covered), Astroport ×21 (full 2021–2025 timeline incl. second PCL audit +
  the Incentives generator), Eris second-firm coverage, Skip ×2, plus two
  Classic-era historical artifacts feeding the depeg chapter. Solid/Votion/
  SkeletonSwap/Credia absent from Oak too — no-audit-found now spans both
  major firms.
- **2026-08-21 · classic-agora.terra.money (owner HAR)** — identified as the
  archived ORIGINAL Agora (read-only): full 2021–22 discussion record incl.
  revival-plan era; airdrop-calculation-logic thread registered into the
  depeg chapter's source shelf. Captured page itself was Classic-era General
  chatter — archive value is the deep history, not the surface.
- **2026-08-21 · Depeg & rebirth chapter sourced** —
  ecosystem-knowledge/terra-depeg-and-fork.md: Nansen forensics, NBER w31160,
  prop-1623 timeline, genesis docs; includes the SOLID-vs-UST design
  contrast and yield-provenance framing (posted rate vs cleared rate).
- **2026-08-21 · Chainscope governance HAR (owner-provided)** — 122 props
  extracted verbatim to governance-props-seed.json; TLA/PD founding arc now
  on-chain-verified (#4813→#4816→#4817→#4822→#4823→#4844→#4847); PD treasury
  DEPLOYED address found (prop #4822); TLA's three alliance vt contracts +
  weekly reward-growth config captured; module take_rate=0 at creation for
  all. Spec: SPEC-governance-props.md.
- **2026-08-21 · Solid mega-intake (owner-provided)** — whitepaper v2 (full),
  app Terms/Privacy, Atrium marketplace pages, solid-online GitHub org,
  erisprotocol/votion-docs. Solid + Votion chapters written; audit hunt
  CLOSED (Solid unaudited, first-party). Platform flag: Atrium trades the
  Alliance NFT collection AND lists TLA Locks (veLUNA) — vAMP locks are
  tradeable, lock ownership can change hands.
- (pending) SkeletonSwap per-pool types · Boost DAO primary source. Each gets: link/copy archived, claims extracted into
  the relevant facts.json with `source:` fields, chapter updated, corpus wired.

## D. Rules
1. A mechanism claim without a primary source is labeled `unverified:` in
   facts files and never stated flatly by the agent.
2. Verification dates are per-chapter; re-verify anything load-bearing that is
   >6 months old before the public announcement.
3. When a primary source contradicts our folklore (see Astroport fee-recycling
   above), the source wins and the correction is logged here.

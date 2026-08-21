# Solid Protocol (Capapult)

> Fact source-of-truth: `solid-protocol.facts.json` (schema in `README.md`).
> **Whitepaper v2:** https://www.solidcapa.com/whitepaper-v2.pdf (authors
> sp1k3, 0x7183, Daniel) · **App/docs:** https://app.solidcapa.com/docs ·
> **Learn:** https://www.solidcapa.com/learn/ · **GitHub:**
> https://github.com/solid-online · **Verified:** 2026-08-21 (whitepaper full
> read + app Terms/Privacy + Atrium pages, all owner-provided).

Capapult is the protocol; **SOLID** is its overcollateralized, soft-pegged
CDP stablecoin on phoenix-1; **CAPA** is the governance token. This is the
post-depeg answer to "Terra needs a stable": collateral-backed, not
confidence-backed (see terra-depeg-and-fork.md §SOLID-vs-UST).

## CDP mechanics (whitepaper v2)
- Deposit collateral into a per-asset **Custody** contract → mint SOLID from
  the **Market** contract → a collateralized debt position. **LSD-only
  collateral initially** (whitepaper list: LunaX, ampLuna, bLuna, Steak) —
  the collateral itself compounds while locked, and yield accrues to the
  borrower (you get back the same LSD units, worth more underlying).
- **LTV_max initially 0.5** per collateral, governance-tunable. Exceed it →
  liquidation, which can be **partial** (down to a safe LTV).
- **Liquidation queue:** liquidators lock SOLID and bid a **premium 0–30%**
  (discount on seized collateral); lowest premiums fill first; liquidated
  collateral buys SOLID that is **burnt**; a **1% liquidator fee** goes to
  the trigger address.
- **Oracles:** price feeds valid for **60 seconds**; on stale oracle the
  liquidation queue **disables bid executions** until fresh data.
- **Mint fee** (known at open, independent of duration):
  `M(x) = Rbase + (1−x)/2·100` when SOLID < $1, else `Rbase` (initially
  0.5%). Below-peg opens get progressively pricier — a supply brake.
  Fee split: **80% to CAPA stakers** as SOLID rewards, 20% oracles + team
  (tunable).
- **Peg mechanism is market-driven arbitrage** around the CDP loop (buy
  cheap SOLID to repay debt / mint rich SOLID to sell) — collateralized like
  DAI, NOT seigniorage like UST. Removes the death-spiral coupling; keeps
  CDP risks (collateral crash, oracle fault, liquidation cascade).

## Audit status — first-party disclosure `[solid.audit_status]`
Solid's own Terms of Use (app.solidcapa.com, updated 2026-04-15) state:
**"The Protocol's smart contracts have not been formally audited by a
third-party security firm."** This closes our hunt: no SCV report, no Oak
report (both sets enumerated 2026-08-21), and no third firm — by the
protocol's own admission. Our pages state it plainly and neutrally.

## Atrium — Solid's NFT marketplace (atrium.markets) `[solid.atrium]`
Curated Terra2 NFT marketplace powered by Solid: 5% fee (0% for Cosmic-tier
CAPA Crystal holders), fees split ~2/3 marketplace treasury + ~1/3 CAPA
pool, atomic settlement, admin-set royalties ≤15%, admin pause. Security
posture: **internal 6-pass audit only** (AUDIT.md in
github.com/solid-online/atrium-marketplace; 29/29 invariants, no
critical/high, two medium admin-trust findings) — not third-party.
Geo-blocked (browse-only/redirect): US · CA · UK · AU · NZ · JP · SG.
**Directly relevant to TLA Stats:**
- **Alliance NFTs (the aDAO collection) trade there** — a live secondary
  venue for the collection we track (BBL no longer alone).
- **"TLA Locks (veLUNA)" is a listed collection** (0 sales at capture) —
  vAMP lock positions are tradeable NFTs, meaning lock ownership can change
  hands; lock-tracking must not assume the minting wallet still owns a lock.
- Volume display caution: the site showed "307.0M SOLID" and "307.00 SOLID"
  for the same collection in different components — capture from chain, not
  from marketplace UI copy.

## CAPA distribution (whitepaper)
10% staker airdrop · 20% lockdrop (7-day, 20% immediate / 80% + LP program
at 6 months) · 15% team (4-year linear vest) · 10% SOLID LP providers ·
35% governance pool · 5% LUNA stakers over 5 years · 5% CAPA stakers over
4 years.

## Solid ↔ ecosystem links already sourced elsewhere
- PoL proposal Appendix SOLID: up to $500K LUNA-ampLUNA LP at 20% LTV to
  mint ≤100,000 SOLID for OTC via Ignite once the LP lists as collateral
  (phoenix-directive.md).
- solid-online org: `contracts-terra` (fork of larry0x/steak — the "Steak"
  LST lineage from the collateral list), `contracts-dao-lst`,
  `contracts-tokenfactory`, plus forks incl. alliance-nft-collection and
  votion-docs.

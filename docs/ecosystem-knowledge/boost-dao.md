# Boost DAO — what FUEL is, and how it touches TLA

> Paired with `boost-dao.facts.json`. Written 2026-08-24 from Boost DAO's own
> published terms/disclosures (boostdao.io, last updated 2024-12-17) and the
> on-chain facts the platform captures. The litepaper lives at
> https://medium.com/@boost.dao/boost-dao-litepaper-82944a73bc80 and the code at
> https://github.com/BOOSTDAO.

## What it is
Boost DAO operates a launchpad ("Ignite") **built on Neutron**, with parts of its
stream mechanics derived from StreamSwap (their attribution notice details the
modifications). Platform tokens named in their own disclosures: **$FUEL, $BOOST,
$YIELD**, plus staked variants in the DAO. Their smart contracts are
**closed-source pending an external audit** (their statement), terms are governed
by BVI law, and the platform is not offered in Restricted Territories (US, UK,
and others per their §5.5).

For aDAO members Boost matters twice over: **BoostDAO Ignite is one of the two
venues that support breaking an AllianceDAO NFT** (with Atrium), and Boost's
video guides are the walkthroughs the tutorials page links.

## FUEL on Terra
FUEL reaches Terra over IBC
(`ibc/4B44…B3961`, origin `factory/neutron1z12…/fuel`, decimals 6). The
**LUNA-FUEL Astroport pool** is a TLA gauge pool (project bucket, concentrated
type — xyk-only pricing law still applies: FUEL's price comes from token-catalog
pricing, not this pool's reserve ratio). The platform prices FUEL daily via
token-catalog Stage 3 into `price-history/<yyyy>/<mm>.json` and tracks the
pool's TVL/volume in `dex-data/astroport`.

## What the agent must NOT claim
- FUEL/BOOST/YIELD tokenomics, supply, or distribution — not captured; the
  litepaper is the source and it is not in this corpus verbatim.
- Boost DAO staking positions — they live on **Neutron**, which the platform
  does not capture. The FUEL whale view on fuel-tool.html is Terra IBC balances
  only, and says so.
- Anything implying the contracts are audited or open-source today.

## Where the numbers live
`price-history` (FUEL.usd daily), `dex-data/astroport` (LUNA-FUEL TVL/volume),
`member-data/tla-snapshot` pools row (staked-in-TLA, gauge VP),
`votion/optimization` (optimizer plans touching FUEL-LUNA).

# SPEC — NFT Collection Onboarding Blueprint (2026-06-15)

## Goal
A structured intake so a NEW NFT collection / community can join the platform
(explorer, history tracking, backfills, portfolio, grading) — turning onboarding
from archaeology into config. Serves the mission: "when others ask to be added,
say absolutely."

## The blueprint (what a collection fills out)
### Identity
- Collection name, ticker/short name, chain (phoenix-1 / other)
- Primary NFT contract address(es); collection size (total supply)
- Logo / banner assets, brand colors

### Technical
- Metadata source + format (on-chain / IPFS / API; schema sample)
- Traits structure (trait types + values; rarity source if any)
- Staking contracts (DAODAO / Enterprise / custom — addresses + type)
- Marketplace(s) where listed (BBL/Atrium/Boost/other — how to query)
- Any "broken/unbroken"-style state mechanic (like aDAO NFT breaking)
- Backing/treasury mechanic (if NFTs back an asset like ampLUNA)

### Governance / TLA (if applicable)
- Is the collection a TLA participant? DAO contract, gauge, VP source
- Token(s) the community cares about (for pricing — tier + ratio source)

### Desired features (checklist)
- [ ] NFT explorer  [ ] holder/ownership resolution  [ ] history tracking
- [ ] backfill (how far back)  [ ] portfolio tracker  [ ] LP grading
- [ ] marketplace floor/listings  [ ] custom dashboards

### Story / presentation
- Collection lore / description (what to show users)
- Collection-specific feature requests (anything unique they want shown)

## How they submit
- **Option A (recommended):** a form on the site → fills a structured JSON →
  submits as a GitHub issue/PR to a `collection-onboarding` repo. Tracked,
  diffable, DeFi Patriot reviews + ingests.
- **Option B:** a downloadable markdown/JSON template they fill and send.
- **Bonus:** the AI assistant (SPEC-ai-assistant.md) can walk them through filling
  it out.

## Why it matters
Productizes the aDAO build. Each new collection becomes: (1) one onboarding config,
(2) curated registry entries, (3) they appear in the tools. The capture engine +
registry + assembler already parameterize by address/community, so the plumbing is
mostly reusable.

## Status
Spec'd. No backend needed for the form-as-template version (pure win). The
form→GitHub-submission version needs a tiny serverless function (same infra as the
AI assistant, if built).

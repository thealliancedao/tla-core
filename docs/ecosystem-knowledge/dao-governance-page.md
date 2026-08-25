# The DAO page — governance boards, grades, titles and the quick audit

> Plain-language corpus for the help bot (2026-08-25). Describes thealliancedao.com/dao.html exactly as it
> computes things; the data is the dao-governance product in the `thealliancedao/dao-originations` repo.

## What the page shows
Three governance views for the same three DAOs — **aDAO** (Alliance DAO), **Lion DAO** and **PixelLions** —
plus the **Allies** view that folds the partner DAOs into one grade. Every proposal is listed with its status,
votes, quorum, on-chain actions and, since 2026-08-25, a **quick audit** (below). Every voter is listed on a
leaderboard with a grade, a tier, a title and their vote history as dots.

## Grades
- **aDAO grade** = proposals the wallet voted on ÷ all aDAO proposals, as a percentage.
- **Lion DAO grade** and **PixelLions grade** = the same, on that DAO's own proposals.
- **Ally grade** (the "Both" view, the default on the Partner board, and the number the Allies view uses)
  = the average of the Lion DAO grade and the PixelLions grade. A member of one DAO only therefore has an
  Ally grade of at most 50%.

## Tiers (by grade)
👑 Legendary 100% · 💎 Diamond ≥ 90% · 🥇 Gold ≥ 75% · 🥈 Silver ≥ 50% · 🥉 Bronze ≥ 25% · 👤 Inactive below.

## Titles (earned, in this order)
🌟 Perfect Record (100%) · 🔥 On Fire (current streak ≥ 10) · ⚡ Streak Master (best streak ≥ 15) ·
🛡️ The Skeptic (more No than Yes, ≥ 10 votes) · ✨ The Optimist (Yes > 3× No, ≥ 10 votes) ·
🚀 OG Member (voted on ≥ 4 of the first proposals) · 📈 Rising Star (≥ 4 of the latest, grade < 50%) ·
💪 Dedicated ≥ 90% · 🎯 Consistent ≥ 75% · 👍 Active ≥ 50%.

## Streaks
A streak counts consecutive proposals (newest backwards) the wallet voted on; "current streak" stops at the
first miss, "best streak" is the longest run ever. The vote dots (green yes · yellow no · blue abstain ·
grey no vote) show the whole history; the last 20 are shown inline.

## Governance concentration (NFT Explorer)
Nakamoto coefficient = the number of wallets whose staked NFTs together pass 50% of staked voting power
(DAODAO-staked only; Enterprise stakes carry no vote). 1 staked NFT = 1 vote; broken NFTs keep their vote.

## Quick audit (on every proposal card)
The same engine as the home page's proposal audit, shared as one library: every counterparty address in the
proposal's messages is named from the registries (trust register, member catalog, live pools, token catalog,
curated contract register) or flagged as unknown — that flag is the part to check; amounts are shown in human
units in the token being moved; the proposal's **precedent** is its message shape (contracts, actions,
addresses, denoms with amounts stripped) compared with that DAO's past proposals — a match only says this
pattern was voted before and how that vote went, never that it is safe; and the **decoded messages** view shows
the raw JSON with every address named inline. "Pass" means every counterparty is known, not that the
proposal is wise.

## Where the data lives (dao-originations repo, readable via read_product with the `dao-originations/` prefix)
- `dao-originations/adao/governance/proposals.json` — every aDAO proposal: title, description, status,
  proposer, votes, voters, decodedActions, rawMsgs, treasuryImpact.
- `dao-originations/lion-dao/governance/proposals.json`, `dao-originations/pixel-lions/governance/proposals.json` — same shape.
- `dao-originations/<dao>/governance/members.csv` — registered names per wallet.
Member images come from DAODAO profiles over IPFS; when a gateway refuses, the tier icon shows instead.

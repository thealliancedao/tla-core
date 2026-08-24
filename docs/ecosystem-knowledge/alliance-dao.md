# The Alliance DAO (aDAO) — how the NFT earns, and what "break" means

> Paired with `alliance-dao.facts.json` (the source of truth — every claim here cites a
> fact id). Written 2026-08-23 so the help agent can answer the questions ally.html
> raises from receipts instead of memory. The mechanics below were decoded from a real
> claim transaction and are re-checked against the live products named in each fact.

## What it is `[adao.collection.supply]`

A 10,000-NFT collection on Terra. The NFT contract
(`terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9`) is not just a
registry of pictures: it holds a staked position and pays that position's rewards
through to holders. Live counts (unbroken, broken, unminted, in DAO custody, listed
per marketplace) are in `nfts/adao/snapshots/summary.json`.

## Where the rewards come from `[adao.rewards.source]`

Terra's **Alliance module** lets governance admit non-LUNA assets that then earn a
share of LUNA staking rewards. aDAO's "Ally" asset was admitted that way, so the NFT
contract's stake is rewarded alongside ordinary delegations. The asset is "Ally"
(`factory/terra1phr9…/AllianceNFT`), admitted by Terra gov prop #4801 (passed
2024-02-23) with `reward_weight` **0.008**, `take_rate` 0, pinned (no decay)
`[adao.ally.reward_weight]`. The forum draft said 0.003; the community pushed it to
0.008 before it went on chain. Quote the weight; the percentage of all LUNA staking
rewards it yields depends on every other alliance weight at the time, so only give a
percentage computed from a live `/terra/alliances` read.

## The daily cycle — four steps, one transaction

1. **Claim** `[adao.rewards.daily_claim]` — around 00:50 UTC each day, Eris's
   auto-compound bot calls `alliance_claim_rewards` on the NFT contract. All accrued
   LUNA rewards are claimed at once.
2. **Bond** `[adao.rewards.bond_to_ampluna]` — every claimed LUNA is bonded into the
   Eris hub in the same transaction. Rewards arrive as **ampLUNA**, which keeps
   compounding on its own.
3. **90% to holders** `[adao.rewards.split_90_10]` — stays in the NFT contract as the
   backing shared by every *unbroken* NFT.
4. **10% to the DAO** `[adao.rewards.split_90_10]` — sent to the DAO main wallet as
   operating funds. This is the *treasury cut*. It is **not** the TLA 10% take rate on
   gauge rewards — two mechanisms, same number, never say "take rate" unqualified.

Worked example from the decoded tx (2026-04-25): 1,874 LUNA claimed → 899 ampLUNA
minted → 809 to the holders pool + 89 to the DAO wallet.

## Backing per NFT `[adao.backing.per_nft]`

Backing per unbroken NFT = contract ampLUNA balance ÷ unbroken count. The contract's
per-token `rewards{}` query agrees for unbroken tokens but is wrong for broken ones,
so every page uses the collection-wide division. The daily history (ampLUNA per NFT,
hub exchange rate, LUNA-equivalent backing) is `nfts/adao/snapshots/backing-history.json`
`rows[]`; the site's "daily gain" is the latest two rows' `backingInLuna` difference.

## Breaking `[adao.break.mechanics]` `[adao.break.venues]` `[adao.break.last_nft_standing]`

A holder can **break** an NFT once. The NFT's share of the backing is paid out and
that NFT stops accruing. The holder keeps the NFT and any governance voting power it
carries, and broken NFTs still trade. Breaking is offered on BoostDAO Ignite and on
Atrium.

Because the daily claim does not shrink when NFTs break, the same 90% inflow is
divided among fewer NFTs over time — per-NFT daily yield rises. This is the "last NFT
standing" effect the ally.html calculator projects.

## Governance and TLA `[adao.governance.homes]` `[adao.tla.locks]`

aDAO governs on DAODAO — a main DAO with an NFT-staking voting module, plus a
smaller Council DAO. In TLA terms aDAO is **one** entity (the treasury wallet's locks:
max-duration ampLUNA and max-duration arbLUNA), not the sum of its members.

## Caveat the site always shows `[adao.rewards.not_guaranteed]`

The Alliance rewards are a grant from Terra governance and can be changed or removed
by a future proposal. Every projection on ally.html is derived from the recorded
backing series, not a promise.

## Open items (do not answer from memory)

- Ally asset `reward_weight` and the resulting reward share — to be read from
  `/terra/alliances` and recorded as a fact.
- Per-holder cost basis for NFTs (BBL payment legs) — genesis-walk stream, not yet captured.

## How the collection was distributed `[adao.history.*]`

Rewarded the **Game of Alliance** testnet (2023-02-09 → 03-02). Launched 2023-12-12;
one-month free claim to 2024-01-12: **1,191 claimed**, **8,809** minted to the
mint-era treasury (Enterprise DAO `terra1g0mfr…`) `[adao.history.game_of_alliance]`.
The **Growth Proposal** then planned the release `[adao.history.growth_proposal]`;
what happened on chain is exact `[adao.history.mint_story]`:

| phase | window | price | sold | loaded → returned |
|---|---|---|---|---|
| 1b DAO stakers | 2024-02-20 → 03-04 | 50 LUNA | **127** | 352 → 225 back |
| 2a Terra NFT communities | 2024-02-28 → 03-18 | 75 LUNA | **525** | 1,000 → 473 back (+2 gov) |
| 2b Alliance stakers & open | 2024-06-01 → 06-05 | 100 / 115 / 130 | **197 / 459 / 644** | 1,300 → sold out |

Paid mints 1,952; primary proceeds **201,930 LUNA**. Two security allocations went to
the council multisig and were broken on receipt: **462** (Feb 2024) + **538** (Jun
2024, props 64–69) `[adao.history.multisig_breaks]`. Contracts and audit:
github.com/terra-money/alliance-nft-collection. Source of truth for all of this:
`nfts/adao/provenance` (FCD archive, complete to 2025-01-07); the site's
release-history page is gated against it.


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
contract's stake is rewarded alongside ordinary delegations. The size of that share
is set by the asset's `reward_weight` on chain; we have not recorded the number yet,
so the agent must not quote a percentage for "share of all staking rewards".

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

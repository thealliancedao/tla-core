# BackBone Labs

> Fact source-of-truth: `backbonelabs.facts.json` (schema in `README.md`).
> **Official site:** https://backbonelabs.io · **Docs:** https://docs.backbonelabs.io · **Verified:** 2026-06-26

BackBone Labs builds **bLUNA** (a LUNA liquid-staking token) and the **BackBone (BBL) Marketplace**
on Terra. They also host the **warlock DEX backend** that powers SkeletonSwap data.

## bLUNA — a clean LST `[backbone.bluna.is_lst]` `[backbone.bluna.clean_lst]`
bLUNA is a LUNA liquid-staking token with an on-chain hub. We query its rate via `{state:{}}`
(returns `exchange_rate`) and price it as LUNA × ratio. In our data bLUNA behaves as a **clean
staking derivative** — market price tracks redemption value tightly (~0.002% in observed runs),
unlike a strategy LST such as arbLUNA. The current ratio binds live `[backbone.bluna.hub_ratio]`.

> **Source note:** the bLUNA hub query is proven in our cron (it matched legacy network-and-prices
> to 10 decimals), but the BackBone docs site was unreachable from our build environment, so the
> mechanism facts are flagged `needs_source` until the canonical doc URL/section is confirmed.

## BBL Marketplace `[backbone.marketplace]`
An NFT marketplace used across the aDAO ecosystem; BBL rarity ranks feed our NFT pipeline.

## warlock backend `[backbone.warlock_backend]`
`dex.warlock.backbonelabs.io` is the data source our token-catalog uses for SkeletonSwap pool
reserves and pair-implied pricing.

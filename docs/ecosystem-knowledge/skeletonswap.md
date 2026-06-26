# Skeleton Swap

> Fact source-of-truth: `skeletonswap.facts.json` (schema in `README.md`).
> **Site:** https://skeleton.swap · **Data:** dex.warlock.backbonelabs.io · **Verified:** 2026-06-26

A Terra DEX hosting some TLA pools (typically XYK). We read its pools from the **warlock backend**
`[skeletonswap.data_source]` and price tokens with the **anchor method** `[skeletonswap.pricing_method]`:
`price = (reserve_anchor / reserve_token) × anchor_price`, valid because SS pools are constant-product.

Two hard-won rules live here:
- **Dust-pool floor `[skeletonswap.dust_pool_floor]`** — a pool with ~$0.16 of liquidity once
  manufactured a $43k wBTC price. We skip pools below $500 TVL so empty pools can't produce fake
  prices. (The naive tvl/2 method is also wrong — it gives one token two prices; the anchor method
  validated 7/8 within 3%.)
- **Liquidity split `[skeletonswap.liquidity_split]`** — the same pair can exist on BOTH Astroport
  and SkeletonSwap, splitting liquidity, so a token can have multiple pool-implied prices. We track
  pools per-DEX.

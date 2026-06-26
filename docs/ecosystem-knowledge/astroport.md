# Astroport

> Grounding reference for how Astroport's pools behave, so our DEX-derived prices and
> LP valuations reflect the real mechanism. **Fact source-of-truth:** `astroport.facts.json`
> (schema in `README.md`). Prose explains; the facts file is what an agent cites.
> Mechanism is sourced here; live values (pool prices, reserves) come from the cron.

**Official docs:** https://docs.astroport.fi/
**GitHub:** https://github.com/astroport-fi
**Last source-verified:** 2026-06-26

Astroport is the primary AMM DEX on Terra phoenix-1 and the home of the LP pools TLA
incentivizes. Three pool types matter for our pricing, and **the pool type decides
whether a reserve-ratio price is even valid** — getting this wrong silently produces
bad numbers, so it's worth understanding properly.

---

## Constant-Product (XYK) pools `[astroport.xyk.mechanism]`

**Source:** https://docs.astroport.fi/docs/learn/astro-pools/constant-product-pools

Reserves obey Rx·Ry=k. Liquidity is spread across the entire price range, so the pool
can trade at any price — good for volatile pairs. The spot price of one token in the
other **is** the reserve ratio.

**Why this matters for us `[astroport.xyk.pricing_valid]`:** for XYK pools our anchor
method is valid — `price_token = (reserve_anchor / reserve_token) × anchor_price`. We
validated this empirically: it landed within 0.1–2.5% of known prices on XYK
anchor/anchor pools. This is the method behind our SkeletonSwap pair-implied pricing too.

---

## Stableswap pools `[astroport.stableswap.mechanism]`

**Source:** https://docs.astroport.fi/docs/learn/astro-pools/stableswap-pools

Stableswap uses an amplified invariant (parameter A) that bends the curve toward
constant-price near a 1:1 rate, giving low slippage for stable pairs.

**Why this matters for us `[astroport.stableswap.pricing_invalid]` — important:** in a
stableswap pool the reserve ratio is **not** the price ratio. The amplified curve
deliberately holds price near 1:1 even when reserves are unequal. So reserve-ratio
pricing gives wrong answers for stableswap pools and must be skipped. We confirmed
this — a USDC/USDt stableswap pool produced a 5.3% error under reserve-ratio pricing —
and our token-catalog cron skips any pool whose type contains "stable".

---

## Passive Concentrated Liquidity (PCL) pools `[astroport.pcl.mechanism]`

**Source:** https://docs.astroport.fi/docs/learn/astro-pools/passive-concentrated-liquidity-pools/how-pcl-pools-work

PCL clusters liquidity around a **Price Scale** and tracks an internal **Price Oracle**
— an exponential moving average of recent trades (parameter `ema_half_time`). As
volatility widens the gap between Scale and Oracle, the pool **raises fees** and pays
them to LPs as IL compensation `[astroport.pcl.fees_dynamic]`.

**Re-pegging `[astroport.pcl.repeg]`:** the pool re-adjusts its Price Scale toward the
Oracle only when accrued fees cover at least half the potential IL from re-pegging.
Until it can justify a re-peg, it offers slightly worse execution than a plain XYK pool.

**Why this matters for us `[astroport.pcl.price_lag]` — the subtle one:** because a PCL
pool's price follows an EMA and only re-pegs when fee-justified, its instantaneous
reserve ratio can **lag the true spot price** during fast moves. So a PCL pool-derived
price is a *weaker* spot read than an XYK one. When a pool-implied price disagrees with
TLA/CoinGecko, a PCL pool can legitimately be the one that's lagging — the disagreement
may be the pool, not the other sources. This is exactly why we treat pool prices as one
source among several and surface divergence rather than trusting any single feed.

---

## Impermanent loss & tail risk

**Source:** https://docs.astroport.fi/docs/learn/astro-pools/passive-concentrated-liquidity-pools/tail-risks

- **PCL `[astroport.pcl.il_profile]`:** reduces IL for moves *within* its range, but on
  a tail event (price far outside the range) IL and slippage can be severe as liquidity
  becomes scarce there. Re-pegging mitigates but never eliminates IL — LPs stay exposed
  to unrealized IL accrued before a re-peg.
- **XYK `[astroport.xyk.il_profile]`:** spreads liquidity and IL risk evenly across all
  prices. More exposed to routine IL than in-range PCL, but degrades more gracefully in
  extreme moves (liquidity never fully runs out).

This is the honest grounding for any LP-health or IL framing we present: the pool type
sets the IL profile, and neither type eliminates IL.

---

## A known data quirk `[astroport.token_price_quirk]`

Astroport's `tokens.byChain` API sometimes misprices derivative assets — we observed it
returning bLUNA at roughly LUNA's price (~44% below TLA's bLUNA price) instead of
applying bLUNA's redemption ratio. We verified this is Astroport's own data (correct
denom key), not our parsing. We **report it as one source and let cross-source
divergence flag it** — never silently correct or hide a source's number. This is the
multi-source design earning its keep: a reader sees the disagreement and its size, and
knows not to price bLUNA off Astroport's API alone.

---

## Quick reference — pool type → can we use reserve-ratio pricing?

| Pool type | Reserve ratio = price? | Our handling |
|---|---|---|
| XYK (constant product) | Yes | anchor-method pricing valid |
| Stableswap | No (amplified near 1:1) | skip — reserve ratio ≠ price |
| PCL | Approximately, but can lag (EMA oracle) | usable but weaker; treat as one source, expect lag |

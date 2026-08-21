# PRICING DOCTRINE — how TLA Stats prices every asset (canonical)

> **Home:** `tla-core/docs/ecosystem-knowledge/` (moved from `website-adao-core`
> 2026-07-14 per SPEC-docs-consolidation). Kept as its own doctrine `.md`; a
> paired `pricing-doctrine.facts.json` (per the folder's schema in `README.md`)
> is future work — derive it from these rules, don't restate them elsewhere.
> The arbLUNA lesson that started this (the hub-ratio was RIGHT; the thin pool
> + Votion UI were the misleading reads) is folded in below —
> `NOTE-arbLUNA-pricing-gap.md` retired with it.

**Settled 2026-06-14** after the arbLUNA investigation. This is the rule. When in
doubt about any price, follow this.

## The core principle
**Match the source to the asset's liquidity.** A price feed is only as good as the
asset's market depth on that feed.

### Tier 1 — Big, liquid assets → trust the market aggregator
LUNA, wBTC, USDC, ATOM, ETH, major stables/L1s. These have many CEX listings and
deep feeds, so **CoinGecko (or Astroport market) is reliable and used directly.**
CoinGecko is motivated and able to keep these correct at all times.

### Tier 2 — Small / derivative tokens → DERIVE from first principles
arbLUNA, ampLUNA, bLUNA, ampCAPA, ampROAR, xASTRO — Eris LSTs and small-cap
ecosystem tokens. **Do NOT trust a direct CoinGecko or single-pool price for these:**
- CoinGecko depends on Eris↔CoinGecko integration that can break, and CoinGecko
  isn't motivated to keep small-caps fresh → stale risk.
- A single Astroport pool can be thin / stale / manipulated → outlier risk
  (proven: the arbLUNA pool read 14% low, the bLUNA pool read 76% low).

**Instead, build the price from two rock-solid inputs:**
```
derived_price = (Tier-1 base price from CoinGecko)  ×  (ratio read DIRECTLY from chain)
```
e.g. `arbLUNA = LUNA_price(CoinGecko) × eris_ratio(on-chain)`.
Both inputs are trustworthy: a big-liquid price CoinGecko nails, and a ratio that
is chain truth. No dependence on any feed caring about the small token. This is
the most accurate AND most robust path — fewest things that can break.

**Verified:** arbLUNA derived = $0.1553 vs CoinGecko direct $0.1523 = 1.6% (match).
The derived method tracks reality without depending on CoinGecko's small-cap feed.

## The cross-check (guard, never override)
We still read the single-pool "market" price and record it + the spread, purely as
a **data-quality signal**. If a pool diverges hugely from the derived price (bLUNA
pool was 76% off) that flags the POOL as suspect — it does NOT change our price.
A thin/broken pool can never override a chain-derived price.

## Hard rules
1. Tier-2 token price = CoinGecko base × on-chain ratio. Always.
2. Never flip a Tier-2 final price to a single-pool reading.
3. CoinGecko direct is for Tier-1 (deep) assets only.
4. Surface divergence as a pool-health flag, not a price change.
5. The lesson that started this: **"market" is not automatically right — match the
   source to the asset's liquidity.**

## Current state (2026-06-14, verified live)
All Tier-2 LSTs use `calculated-eris` (LUNA × chain ratio) as final. ampCAPA/ampROAR
are hub-only (no reliable cross-check exists; that's fine — derived is best-available).

## Pattern notes from the 2026-08 price-artifact audit (F3)
- **Reserve ratio ≠ price by design** for concentrated (EMA-oracle) and
  stable (1:1-target) pools — now enforced in code (tla-snapshot Stage-3
  guard). Only constant-product (xyk) reserves may imply a price.
- **Identifier drift after migrations** is a recurring failure family:
  E11 (EURe priced from the wrong CG coin) and E12 (ASTRO priced from the
  legacy pre-Neutron cw20). Registry addresses must be re-verified against
  chain reality after any token migration; a future token-catalog sweep
  should test every registry identifier.
- **Absence must be loud**: a token silently missing from a feed is an
  invitation to derive fiction. Feeds now carry prior values forward flagged
  `stale`/`carried_forward`, capped at 7 days, then an honest null.
- **Repairs are labeled, never silent**: historical corrections carry
  `f2_repair:` sources and in-file `_price_corrections` audit blocks —
  write-once honored by annotation, not overwrite-and-forget.

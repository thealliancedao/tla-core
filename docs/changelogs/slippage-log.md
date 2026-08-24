# Trade Cost Simulator Changelog

## Rev 3.0 — 2026-08-24 — Trade Planner: from → to routes, split, size ladder, limit solve, wallet balances, context, warnings, recipe

Owner walk: "it doesn't pick up liquid tokens in my wallet and doesn't help me
simulate a variety of situations" — and the page is one of the most used. The
primitives were all here (USD-sided pool universe, exact xyk execution-price
impact, two-hop routing) but only reachable through the zap planner. Rev 3.0
puts a planner in front of them:
- **FROM → TO** chips (the wallet's holdings first, with $ values, when a wallet
  is picked in the header — live bank + cw20 reads; balance buttons 25/50/100%).
- **Routes** ranked by what you keep: direct, two hops through ANY
  intermediate, and a **split** across the two best paths (5% steps) shown only
  when it beats both. Per leg: pool, DEX, sold-side depth, impact; totals:
  impact, fees (0.3%/leg, ASSUMED and labeled), net kept in $ and in TO units.
- **Size ladder** ($20 → $5,000 + the current size) re-planned per rung, an
  "in 4 trades" column (assumes recovery — labeled), and **largest single trade
  under 0.5 / 1 / 3 / 5%** solved by bisection (floored: the size named is
  never over the limit).
- **Market context** per token, context not advice: 7d/30d change and position
  in its 90-day range from committed price-history; the route's pools' 24h
  volume vs their 6-day average and TVL vs 7 days ago from dex-data rolling
  products; a peg line for stables (implied price in each xyk pool vs $1).
- **Warnings**: over-limit (with the largest size that isn't), thin leg
  (<$5K sold-side), SS unverified, curved bound, single-source price, stale
  reserves (>2h).
- **How to do it**: ordered swaps with token amounts, DEX links, a slippage-
  tolerance hint per leg, and the capture time to re-check against.
- Deep links `?from=&to=` (`?token=` = TO) — fuel-tool 2.4 links in.
Everything below the planner (zap planner, arb radar, single-pool "where to
sell") is unchanged. Gate `gate-slippage-planner.mjs` 20/20 on the committed
reserves: CAPA→ASTRO $150 = via LUNA, ≤3.00% impact, 3.58% with fees; the
1%-limit solve found $19 (fees alone are 0.6% on two legs, so 0.5% is
impossible → $0); FUEL context lines; SOLID peg line; split only when it
wins; wallet chips; deep link.


This is the change history for `slippage.html` (the public trade-cost
simulator + zap planner). Newest revisions on top. Times are UTC.

**Rev-footer law (DeFi_Patriot 2026-08-03):** every revision bumps `REV` /
`REV_DATE` at the top of the page script, and the footer renders them via
`#page-rev` — the live page always tells you which rev it is without
opening this log. Bump both constants on every change, no matter how
small.

---

## Rev 2.1 — 2026-08-21 — unified chrome

Site header replaces the page's own links; header picker is the zap planner's
wallet (inline box hidden). URL/remembered wallet loads the planner on arrival.

## Rev 2.0 — 2026-08-03 — SIMULATOR-V2: zap planner port · wallet selector · rev footer

**Zap planner** ported from `tla-stats.html` T2.7 into its natural home,
adapted to this page's pool model — and thereby upgraded: routes now use
the page's **full captured-pool universe** (every Astroport + SkeletonSwap
pool with both sides priced and ≥$200 depth; 52 pools at build time), not
just TLA-snapshot pools. `no TLA route` cells become the rarer
`no captured route`. Math is the identical port: constant-product impact,
best-of direct pool vs two-hop via LUNA with the winning route named on
hover, withdrawal-shrink on the exited pool before any same-pool swap,
"≤" bound convention on concentrated/stable legs. Zap-out: 25/50/75/100%
fraction, LUNA/USDC/SOLID targets + extra-target dropdown, dollars-lost
under every cell. Zap-in: source selector, amount follows the page's own
trade-size control live, grow-to-N× multiplier mode (1.25–5×, held pools
only, per-pool add shown), held pools starred first.

**Wallet selector** (name or terra1 address, datalist-assisted): merged
roster per the tla-stats law — aDAO members (rich objects) first, then
remaining TLA participants, deduped by wallet, aDAO wins (329 wallets at
build time). `?wallet=` deep link supported for cross-page handoff.
**Member feeds lazy-load** (~3.4 MB combined) only on first selector touch
or deep link — the walletless page stays exactly as light as Rev 1, and
the "no wallet needed" promise in the hero copy still holds.

**Position→pool matching**: name + dex match with symbol-set fallback for
reversed names; same-name pools on different dexes resolve to the
position's dex (live case: USDC-SOLID exists on both Astroport and
SkeletonSwap); same-name/same-dex collisions resolve to the deepest pool.

**Honesty notes shipped in-panel**: routes may use any captured pool;
mispriced tokens skew position *size*, not impact % (price-mark audit
queued separately); planner ignores fees, the Eris zapper's own routing,
and same-block competition — planning numbers, not quotes.

**Architecture for the gate**: fetch separated from state-building
(`ingestMarket` / `ingestMembers`) so the delivery gate feeds real fixture
files through the exact production code paths — no third copy.
`window.__zapTest` hook exposes the live functions (harmless in prod).

**Gate 24/24 on live production fixtures** (feeds pulled fresh at build):
pool-universe count exact vs independent calc; LUNA-SOLID reserve exact;
merged-roster count exact; fixture wallet resolves by address AND name;
5 aggregated positions with xASTRO=$1,155.61 and LUNA-ASTRO=$311.37 to
1e-9; cross-dex USDC-SOLID resolves to the Astroport pool; xyk formula
spot value 8.667991% on a pinned cell; concentrated pool carries
curved=true, xyk carries false; bestRoute matches an independent
brute-force to 1e-9 with a real pool named in the leg; zap-out 25%→LUNA
finite with direct-received leg; xASTRO unroutable is chain-truth
(zero captured pools carry it); exclude-pool shrink raises routed cost;
2× multiplier adds exactly 1× the held position; rev constants match the
footer markup and this log's path is referenced in code.

## Rev 1.x — 2026-08-02/03 — initial page + Arb Radar

Initial public simulator: token chips ordered by liquidity, log slider
$10–$1M, per-pool impact ranking with A–F grades and crown, xyk exact
formula with "≤" bound on concentrated/stable, SkeletonSwap unverified
labeling, dust pools <$200 hidden. Arb Radar added 2026-08-03: xyk-only
cross-pool divergences, exact optimum size/profit after 0.3%×2 fees,
quiet-state largest-gap reading. (Pre-dates this changelog; detail lives
in tla-log.md Rev T3.3 where the radar was cross-ported.)

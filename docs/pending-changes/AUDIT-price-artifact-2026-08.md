# AUDIT — Pricing Artifacts in the Snapshot Pipeline (2026-08)

**Status:** ROOT CAUSE ESTABLISHED · forward fix in build · historical repair pending
**Discovered:** 2026-08-21, during the help-agent verification battery (T1, bLUNA-LUNA).
The agent quoted "bLUNA fell to $0.053 on June 14" from the record; side-by-side
checking showed the record itself was wrong. This document is the complete evidence
trail: what is wrong, how we know, why it happened, what it affects, and how it is
being fixed. Every claim below is reproducible from files in this repo.

---

## 1. Summary

The tla-snapshot daily capture resolves token USD prices in three stages:
**(1) direct** — `network-and-prices/current.json` `final_price_usd`;
**(2) LST ratio** — hub exchange rate × base price;
**(3) pool-derived** — the pool's own reserve ratio × the paired asset's price.

Four distinct fault classes were found. None corrupt chain-truth amounts —
token amounts, VP, and lock data are unaffected. All faults live in the **USD
pricing layer** and propagate into `staked_in_tla_usd`, `total_pool_usd`,
`tla_tvl_usd`, and the derived epoch matrices (apr-history, pool-status-history,
epoch-band-history).

| Class | What | Days affected | Materiality |
|---|---|---|---|
| A | CG-outage → Stage 3 derives from **concentrated/stable pool reserves** (ratio ≠ price by design) | 14 days | Huge % errors on tiny pools (stLUNA 4.7× over, stATOM 1.7× over, WBNB 0.45×); INJ only ~3–4% off (its pool tracks price) |
| B | Bad value **inside** the direct feed: bLUNA served at LUNA parity | 1 day (2026-06-14) | bLUNA-LUNA staked understated −38% that day (~$13K); infected matrix E189; quoted by the help agent |
| C | **Stale repeated** upstream price served as `direct` | EURe ≈13 days (07-23→08-07); ATOM pinned 2.04 (May 13–~26) | **The material one:** EURe $0.5128 vs real ~$1.14–1.17 on $397K staked → TVL band understated ~$100K/day (~5–6%) for ~2 weeks (matrix E195–E196) |
| D | **Chronic** Stage-3 pricing for tokens never in the feed (FUEL, WHALE, SOL, dATOM, rSWTH — all 100 dailies) | every day | dATOM ~2.3× over (pool staked $142 — negligible $); FUEL from a concentrated pool on an $18K pool (error % unknown, needs external price); WHALE/SOL/rSWTH dust |

## 2. Evidence (all reproducible from this repo)

### 2.1 The tell that opened it
`member-data/tla-snapshot/pool-status-history.json`, bLUNA-LUNA:

| Epoch | bLUNA px | LUNA px | ratio | staked_usd |
|---|---|---|---|---|
| E188 | 0.0908 | 0.0516 | **1.761** | $43,509 |
| **E189** | **0.05259433** | **0.052595** | **1.000** | **$34,651** |
| E190 | 0.0913 | 0.0516 | **1.770** | $43,633 |

An LST hub ratio cannot fall 43% for one week and snap back. Ratio-corrected
E189 staked ≈ **$48K**, fitting its neighbors; the recorded V-dip is artifact.

### 2.2 The chain-exact disproof (Class B)
`network-and-prices/ratio-history.json` (append-only, chain-exact) shows the
bLUNA hub ratio on 2026-06-14 was **1.7673039713685297** — the hub never
blinked. Correct bLUNA that day = 0.052595 × 1.7673 = **$0.09295**. The daily
(`member-data/tla-snapshot/daily/2026-06-14.json`) recorded $0.05259 as
`direct` — the hourly feed served a bad value. That hourly feed is
retention-expired (15-day window), so the exact upstream path is
unrecoverable; the correction value, however, is proven by the chain record.

### 2.3 The recurring mechanism (Class A)
`daily/2026-08-19.json` vs `daily/2026-08-20.json`, same tokens:

| Token | 08-19 (clean) | 08-20 (fault) |
|---|---|---|
| stLUNA | $0.07699 `direct` | $0.40227 `pool_derived:LUNA-stLUNA(LUNA)` |
| stATOM | $2.909 `direct` | $4.873 `pool_derived:ATOM-stATOM(ATOM)` |
| WBNB | $631.35 `direct` | $268.56 `pool_derived:LUNA-wBNB.wh(LUNA)` |

`network-and-prices/current.json` shows these are exactly the
**CoinGecko-sourced** tokens (`STLUNA: coingecko`, `WBNB: coingecko`). When a
CG fetch fails or is partial, those keys **vanish** from `token_prices`;
Stages 1–2 miss; Stage 3 derives from pool reserves. The source pools are
**concentrated (PCL)** pools, whose reserve ratios deviate from price by
design — the exact trap already documented for the canary in
network-and-prices ("reserve ratio deviates from price BY DESIGN; reading one
as a market price manufactures phantom divergences", the arbLUNA lesson).
The lesson was encoded in the canary but never propagated into the snapshot's
resolver.

Fault days (pool_derived rows appear for the CG set):
2026-05-31, 06-15, 06-16, 06-26, 07-06, 07-07, 07-11, 07-12, 07-19, 07-24,
07-27, 08-08, 08-17, 08-20. Matrix epochs whose representative day landed on
one: **E187, E193, E194, E199** (E199 = current — the fault is live).

### 2.4 The stale-value fingerprint (Class C)
EURe recorded **$0.5128071587576233 — identical to 16 decimals — across
~13 dailies** (2026-07-23, 07-25–07-26, 07-28–08-07), served as `direct`,
between clean days at $1.14–1.17. Real prices never repeat to full precision.
Affected staked: USDC-EURe (~$271K) + LUNA-EURe (~$127K) ≈ **$397K ≈ 21% of
TLA TVL**, mispriced on the EURe leg by ~55% → band TVL understated roughly
$100K/day across the window; matrix rows E195–E196 carry it. ATOM pinned at
exactly 2.04 across 2026-05-13→~26 is the same class, small impact.

### 2.5 Chronic Stage-3 tokens (Class D)
Present in **all 100 dailies**: FUEL ← LUNA-FUEL (**concentrated**),
WHALE ← LUNA-WHALE (**concentrated**, $0 staked), dATOM ← ATOM-dATOM
(**concentrated**; derived dATOM ≈ 2.8–2.9× ATOM vs a plausible ~1.15–1.25×
for a two-year staking derivative → chronically ~2.3× overpriced; pool staked
$142), SOL ← LUNA-wSOL (SS, subtype unknown; value ~$17.7 vs market ~sane),
rSWTH ← SWTH-rSWTH (**xyk** — legitimate). Material exposure: LUNA-FUEL
($18K staked) is the only chronic pool with meaningful money; FUEL's true
error needs an external price check (see §5).

## 3. Root cause, plainly

1. **The direct feed can silently lose tokens** (CG outage → key absent), and
   the resolver treats absence as "go derive it from anything."
2. **Stage 3 does not know pool types.** It guards against circular
   derivation but not against concentrated/stable pools, where reserve ratio
   ≠ price by design. The platform already learned this lesson (arbLUNA
   canary, 2026-06) — in a different module.
3. **No staleness tripwire** existed: a price frozen to 16 decimals for 13
   days sailed through as `direct`.
4. Five tokens were never added to the price feed at all, making Stage 3
   their permanent path (acceptable only for xyk sources; not for FUEL/WHALE/
   dATOM).

## 4. Fix plan (staged, one change at a time, each gated)

**F1 — capture-side (platform-crons, in build now):**
- network-and-prices: when a previously-present token is missing from this
  run's sources, **carry the previous published price** labeled
  `carried:<orig-source>:<since-date>` — never silently drop a key. Add an
  exact-repeat detector: identical `final_price_usd` across runs for a
  non-stable token raises an advisory `stale_flag` (findings, not faults).
- tla-snapshot resolver: Stage 3 refuses **concentrated** and **stable**
  pools; xyk allowed (labeled as today); SS pools of unknown subtype allowed
  with `:unverified-amm` suffix. A price that would now resolve nowhere falls
  to `prev-daily carry` (yesterday's resolved price, honestly labeled)
  before going null — blanks remain the last resort per doctrine.
- Proper feed entries for FUEL and dATOM (astroport tRPC / CG id), removing
  their dependence on Stage 3 entirely.

**F2 — historical repair (tla-core one-off action, after F1):**
Amounts are chain truth; only the price layer is re-derived. Per affected
daily: bLUNA 06-14 from **ratio-history × LUNA** (chain-exact); Class-A/C
tokens from **nearest-clean-day ratio-carry** (derivative pairs) or
nearest-clean-day price (CG tokens), then recompute `usd_value`,
`total_pool_usd`, `staked_in_tla_usd`, totals. Every corrected file keeps a
`_price_corrections` block: original value, corrected value, method,
evidence pointer. Then re-run the three rollups (apr-history, pool-status,
epoch-band) via dual-checkout of the live cron modules (no-third-copy rule).
Nothing is silently overwritten; the audit trail lives inside the files.

**F3 — agent + docs:** DATA-MAP caution (an LST-pair px ratio ≈1.0 or far
off its neighbors = suspect a pricing artifact; say so, don't narrate it);
pattern note in PRICING-DOCTRINE.

## 5. External verification requested (owner)

To lock the correction targets and close Class D sizing, current market
prices (CoinGecko or venue UI) for: **FUEL**, **dATOM** (Drop), **WHALE**,
and confirmations for **stLUNA** (~$0.077?) and **stATOM** (~$2.91?) — plus
a sanity check that **EUR/USD ≈ 1.14–1.17** through late July (Class C
correction basis). Screenshots or numbers both fine; they go in §7.

## 6. What was NOT affected

Token amounts, VP series, lock records, NFT counts, bribe/distribution event
streams, DAODAO/Enterprise history — all chain-truth captures, untouched.
APR figures for pools with clean pricing are unaffected. The Eris APR
formula and LST catalog pricing (ampLUNA/arbLUNA path) were independently
verified during this audit via ratio-history and are correct.

## 7. Verification ledger (append as fixes land)

- 2026-08-21 · Root cause established; this document opened. Evidence §2
  reproduced against tla-core@main pulled 2026-08-21.
- (pending) F1 shipped + gated · (pending) F2 corrections applied, before/
  after table here · (pending) owner external price confirmations · (pending)
  matrices re-derived, band deltas recorded.

---
*Found because an innocent question ("why did bLUNA-LUNA's APR climb?") was
graded against independently computed ground truth. A data product reporting
a finding is that product working.*

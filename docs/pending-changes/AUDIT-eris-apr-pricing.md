# AUDIT — Eris APR & LST pricing conventions (arbLUNA discrepancy RESOLVED)

Date: 2026-08-01 · Source: Eris webapp bundle + query decode (HAR capture by
DeFi_Patriot; 15 JS bundles, all contract queries decoded) · Status:
**FORMULA VALIDATED 2026-08-02 (§Validation) — product-level pending 1.3.1 +
astroport recovery** · 2026-08-02: gauge LP APR logic CONFIRMED FROM SOURCE
(Philipp shared `getLiquidityIncentives` + the APR composition verbatim),
folded in as §Gauge-LP-APR, implemented as dex-data eris-apr (1.3.0/1.3.1),
and reconciled against Eris's live screen same-day — see §Validation.
ERRATA same date: the "amp hub ≈1.34" figure below was the STALE ratio the
broken pipeline was applying, not the amp hub's truth — chain + catalog both
read amp ≈2.25, arb ≈2.99 (details in the corrected root-cause paragraph).

## The discrepancy

Portfolio Arc open item: Eris UI shows arbLUNA ≈ $0.12 while our pipeline
shows ≈ $0.055 (~2.2× understatement, directly hitting DeFi_Patriot's own
Votion arbLUNA position and all arb-side TVL).

## Root cause (confirmed from their code)

Eris prices **every LST as `base price × that LST's OWN hub exchange rate`**.
Their bundle maps each LST token to a rate-source sigil:

```
{ [arbluna]: "? terra-luna-2",   // ? = ARB hub exchange rate
  [ampluna]: "* terra-luna-2",   // * = AMP hub exchange rate
  [boneluna]: "~ terra-luna-2" } // ~ = bLUNA (Backbone) rate
// price = coingeckoPrice("terra-luna-2") × getExchangeRateFromCombination(sigil)
```

The arb (slow-burn) vault has compounded since 2022 — its hub rate is ≈ **2.99**
(chain-read 2026-08-02: 2.9922; Eris UI price $0.1238 = LUNA $0.0414 × 2.99 ✓).
[CORRECTED 2026-08-02] The amp hub's true rate is ≈ **2.25** (chain 2.2477;
token-catalog independently 2.2308) — the "≈1.34" in the original audit was
the STALE ratio the legacy network-and-prices feed carried, i.e. the wrong
value the old pipeline applied, not the amp hub's reading. The observed
understatement: arbLUNA priced at the stale 1.34 instead of its own 2.99 →
0.055/0.12 ≈ 1.34/2.99. Anywhere else that stale 1.34-era ratio was applied
to ampLUNA is ALSO understated (~1.68×) — surfaced positions revalue upward
under the hub fix. Additionally, our Votion snapshots carry
ONLY the vtoken→LST rates (1.03–1.53) and never the LST→LUNA hub rates, so a
Votion position's correct USD chain is **three links** and we compute two:

```
vtoken_USD = LUNA_USD × LST_hub_rate × vtoken_vault_rate
```

## APR convention (their displayed numbers are APY)

Their LST/vault contracts expose `{"exchange_rates":{"limit":14}}` — a
14-sample rate history from which the contract returns a measured DAILY rate.
The UI then **compounds it over 365.25 periods** and displays that:

```js
// verbatim from main.<hash>.js
F = OB(365.25 * apr * 100, 365.25) / 100      // compound conversion
text = "~ " + (100*F).toFixed(2)               // ← the number users see (APY)
normalPerYear = 365.25 * apr                   // simple APR (kept, not shown)
```

Amplified vaults use the same mechanism (compounder rate history). So Eris
numbers are daily-compounded APY; anywhere we show simple annualization our
figures read systematically lower for the same underlying yield. Our v3
capture already records the historical rate curve (bond_amount/bond_share per
event), so historical realized APY is derivable from our own data.

## Gauge LP APR (CONFIRMED FROM SOURCE — Philipp, 2026-08-02)

Eris shared the actual code (`getLiquidityIncentives` + the APR composition).
This section is the implementation contract for the published `eris_apr_pct`
— replicate the mixed convention EXACTLY, do not "clean it up".

**Stage 1 — chain inputs (both height-parameterizable for history):**
- `/terra/alliances` — per-alliance `reward_weight`, `denom`,
  `reward_start_time`, `last_reward_change_time`, `reward_change_interval`
- `/cosmos/mint/v1beta1/annual_provisions` — yearly LUNA emission

**Stage 2 — per-gauge incentive pot:**

```
totalReward   = Σ reward_weight over ACTIVE alliances only
                (active = reward_start_time < now)  + 1   // +1 = regular staking
allianceAsset = alliances.find(denom == gauge.alliance_connector_vt)
rewardPct     = allianceAsset.reward_weight / totalReward   // 0 if not yet active
rewardsPerYear  = annual_provisions × rewardPct
rewardsPerEpoch = rewardsPerYear / 365 × 7                  // plain 365, not 365.25
rewardsUpdate   = last_reward_change_time + reward_change_interval
                                    // next expected weight change (startup ramps)
```

**Stage 3 — per-pool APR:**

```
incentivesLpPerYear = rewardsPerYear × assetDistribution.distribution
                                    // distribution = pool's share of gauge votes
                                    //   = our captured vote outcomes
incentivesUsd = incentivesLpPerYear / decimals.factor × LUNA_USD
tvl           = pool.price × totalStaked            // TLA-STAKED TVL ONLY
                                    // (pool.tvl = full DEX depth is kept
                                    //  separately but NOT the APR denominator)
incentiveApr  = incentivesUsd / tvl
                // edge cases verbatim: tvl==0 && incentives==0 → 0
                //                      tvl==0                  → Infinity
```

**Stage 4 — displayed figure (verbatim composition):**

```
apy   = aprToApy(incentiveApr × 0.92 × 100) / 100 + tradingApr − yearly_take_rate
total = incentiveApr − yearly_take_rate + tradingApr      // linear variant, kept
```

- **0.92 = Eris's 8% cut on incentives**, silently netted inside the displayed
  number (investor-lens finding — never stated in their UI; ours says so in
  the tooltip).
- **Mixed convention by their design:** incentive leg COMPOUNDED (aprToApy,
  daily per the §APY section), trading-fee leg and take-rate deduction LINEAR.
  Replicate as-is so our number reconciles to their screen; publish the
  linear `total` alongside for the APR-labeled variant.
- `yearly_take_rate` comes from the LP config; `tradingApr` from their pool
  service — WE substitute our own dex-data fee APR for that leg (state the
  substitution in the figure's provenance).
- **Historical claimed APR fully reconstructable from our own capture:**
  distribution shares = tla-voting vote outcomes/distributions; staked TVL =
  our snapshots; the two Stage-1 endpoints ride the during-access-window
  state sampler, height-parameterized (already queued).

## Prescribed fixes (implementation queued — next session)

1. **votion-positions cron** (`defipatriot/cron-scripts`): query each LST's
   hub `exchange_rate` (amp hub, arb hub) alongside existing vault rates;
   `tvl = staked × vtoken_rate × hub_rate × LUNA_USD`. Publish `hub_rate`
   per vault in snapshots so downstream consumers stop guessing.
2. **Portfolio/site price layer** (wherever LST prices are composed — NOT in
   member-portfolio.html itself; it consumes priced data): arbLUNA gets its
   own hub rate. Convention rule: *every LST = LUNA × its own hub rate; never
   borrow another LST's rate.*
3. **APR display convention**: adopt daily-compounded, LABELED "APY", to
   match what members see on Eris (or show both APR/APY). Decision:
   DeFi_Patriot leans match-Eris.
4. **`eris_apr_pct` published from the CRON, not computed on pages**
   (2026-08-02, DeFi_Patriot's call): implement §Gauge-LP-APR in the org
   capture layer (dex-data or token-catalog stage — decide at build),
   validate against BOTH ground-truth tables (SPEC-lp-apr §7 4-pool +
   CRON-FIXES-BRIEF §2.10 19-pool, same-day-capture tolerance stated),
   publish per-pool `eris_apr_pct` + `eris_apy_pct` (linear `total` and
   compounded `apy` per Stage 4), then re-point every page APR surface to
   the published figures and RETIRE all page-side APR math (tla-stats
   `_aprOf` estimates, member-portfolio Rev 1.3 weekly-compound estimate).
   Backfill order: fix historical series first, then the cron, then trigger
   runs so pages read corrected data.

## Validation — 2026-08-02 (formula-level PASS)

First live eris-apr run (chain inputs all parsed: provisions 95.87M LUNA/yr,
totalReward 1.398, TLA weights stable 0.10 / project·bluechip·single 0.05,
28 gauge distribution entries) reconciled against Eris's liquidity-hub screen
captured the SAME DAY (DeFi_Patriot screenshots, 11 pools):

- **Rewards column reproduced to the dollar:** our
  `rewards_per_year × distribution × LUNA_USD` = their displayed "Rewards $"
  — EURe $135,010 vs $135,010; LUNA-USDC $118,416 vs $118,410; LUNA-CAPA and
  USDC-SOLID both $27,091 vs $27,090 (the two 0.1910 project entries).
- **Both conventions match:** their dotted % = our `eris_apr_pct` (linear
  total), their flame = our `eris_apy_pct` (compounded display). Per-pool Δ
  is IDENTICAL across both conventions (0.00–1.83 pp) — i.e. the entire
  residual is the trading-fee leg (our stated substitution). Near-zero-fee
  pools match to ±0.06 pp: LUNA-USDC(SS) Δ0.00, FUEL −0.01, ROAR +0.01,
  stLUNA −0.00, CAPA +0.06. Fee-bearing pools' Δ (EURe 0.36, USDC 1.28,
  ASTRO 1.83) = that pool's trading APR.
- Convention key for all consumers: **dotted = APR (linear), flame = APY.**

**Product-level completion (before pages consume):** 1.3.1 deployed (catalog
LUNA/single fallback) + astroport adapter recovery (pair TVL + fee_apr legs)
→ published `eris_apr_pct`/`eris_apy_pct` spot-checked once against the
screen → clear `meta.validation`. The formula itself needs no further proof.

## Bonus findings from the same capture

- `phoenix-rpc.erisprotocol.com` — Eris runs their OWN Terra node (probe its
  depth: preflight `archive_rpc=` that URL + `archive_lcd=` the -lcd sibling
  guess; may hold the deep remainder).
- Their gauge/VP queries (`total_vamp`, `gauge_infos`, `distributions`,
  `total_staked_balances`) are byte-identical to our capture layer's — their
  `total_vamp.vp` matched our canonical Total-VP model exactly (29.27M vAMP
  at capture).

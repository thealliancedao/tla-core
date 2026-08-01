# AUDIT — Eris APR & LST pricing conventions (arbLUNA discrepancy RESOLVED)

Date: 2026-08-01 · Source: Eris webapp bundle + query decode (HAR capture by
DeFi_Patriot; 15 JS bundles, all contract queries decoded) · Status: **audit
CLOSED — fixes prescribed, implementation queued**

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

The arb (slow-burn) vault has compounded since 2022 — its hub rate is ≈ **2.9**,
vs ampLUNA's ≈ 1.34. Our number implies we price arbLUNA with the amp-class
rate (0.12 / 0.055 ≈ 2.9 / 1.34). Additionally, our Votion snapshots carry
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

## Bonus findings from the same capture

- `phoenix-rpc.erisprotocol.com` — Eris runs their OWN Terra node (probe its
  depth: preflight `archive_rpc=` that URL + `archive_lcd=` the -lcd sibling
  guess; may hold the deep remainder).
- Their gauge/VP queries (`total_vamp`, `gauge_infos`, `distributions`,
  `total_staked_balances`) are byte-identical to our capture layer's — their
  `total_vamp.vp` matched our canonical Total-VP model exactly (29.27M vAMP
  at capture).

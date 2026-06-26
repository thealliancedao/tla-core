# Eris Protocol

> Grounding reference for how Eris products behave on-chain, so our pricing and
> catalog logic reflects the real mechanism — not an assumption. Every non-obvious
> claim links to its source. **Mechanism = sourced prose here. Live values (ratios,
> prices, the current redemption gap) come from the cron at render time — never
> hardcoded here**, because they change. If a number can move, it does not live in
> this file; only the *reason* it moves does.

> **Fact source-of-truth:** the citable, machine-readable version of every claim here
> lives in `eris-protocol.facts.json` (see `README.md` for the schema). Prose explains;
> the facts file is authoritative and is what an on-site agent cites. Fact `id`s are
> referenced inline as `[id]`.

**Official docs:** https://docs.erisprotocol.com/
**GitHub:** https://github.com/erisprotocol
**Last source-verified:** 2026-06-26

Eris Protocol is Terra's liquid-staking and vault platform — the team behind the
Alliance Liquidity Hub that underlies TLA. Their model is "RealYield, no platform
token": value accrues into the `amp[TOKEN]` itself rather than a governance coin.
Source: https://docs.erisprotocol.com/vision/

---

## ampLUNA — the clean liquid-staking token (Amplifier)

**Source:** https://docs.erisprotocol.com/products/amplifier/

Deposit LUNA into the Amplifier, receive `ampLUNA`. Eris stakes the LUNA with
whitelisted validators, harvests rewards daily, swaps any non-LUNA rewards back to
LUNA, and restakes — so the underlying LUNA per ampLUNA grows every day. ampLUNA is
"a kind of receipt, with which you can claim your deposit + auto-compounded rewards
back."

**Why this matters for our pricing:**
- ampLUNA's hub exchange rate = accumulated LUNA per receipt token. It only ever
  rises (daily compounding), driven by staking yield alone.
- Because it's plain staking yield, the **redemption price (LUNA × hub ratio)
  tracks the market price tightly** — ampLUNA is the textbook "clean staking
  derivative." When our cron shows ampLUNA market ≈ redemption (sub-1% gap), that's
  expected and correct. A *transient* larger gap is almost always snapshot timing,
  not a real divergence (we confirmed this: an 8% reading vanished to 0.5% one run
  later — pure timing).
- **Fees:** Deposit 0%, Performance 5% to Protocol Treasury, Withdrawal 0%.
  Source: https://docs.erisprotocol.com/products/amplifier/#fees

---

## arbLUNA — the arbitrage vault (NOT plain staking)

**Source:** https://docs.erisprotocol.com/products/arb-vault/

This is the single most important entry for understanding our "weird" LST numbers.

arbLUNA is **not** a staking receipt like ampLUNA. It is an **arbitrage vault**.
When someone wants instant access to the LUNA underlying an LST, they swap on a DEX
instead of waiting out the 21–24 day unbond — and that instant access "usually costs
around 1–2% premium." The Arb Vault systematically captures that premium: it holds
LUNA, executes only profitable LST arbitrage each ~21–25 day cycle, and compounds
the profit back into the token. Its value grows "only through swaps and market
inefficiencies at the right time" — no minted token, no incentives.
Source: https://docs.erisprotocol.com/products/arb-vault/ (Sneak Peak, Performance model)

**Why arbLUNA's hub ratio is higher and behaves differently:**
Its exchange rate reflects *accumulated arbitrage profit*, not staking yield. So it
is a **strategy LST** — its redemption value is real (the hub ratio is on-chain
truth), but the path to realizing that value is gated, which is the key point below.

**Why the liquid market price can sit BELOW redemption value:**
Redeeming arbLUNA → LUNA is not instant. Per the docs:
- The normal unbond is **25 days** for LUNA.
  Source: https://docs.erisprotocol.com/products/arb-vault/ (Withdrawals)
- You *can* exit immediately, but for a **5% markup fee**, which drops linearly to
  zero as the position reaches its unlock time.
  Source: https://docs.erisprotocol.com/products/arb-vault/ (Withdrawals)
- The vault also deliberately targets keeping ~3/4 of capital unbonding for
  efficiency, so idle instantly-withdrawable liquidity is limited by design.
  Source: https://docs.erisprotocol.com/products/arb-vault/ (Dynamic execution)

So the liquid market price of arbLUNA reflects a **time-lock / instant-exit cost**:
a holder who wants LUNA now either waits 25 days or pays up to 5%. The market prices
that friction in, which is why arbLUNA can trade at a discount to its theoretical
redemption value. **This is expected behavior, not a depeg and not a data error.**

**How our data must present this (live, never hardcoded):**
- The *mechanism above* is permanent and sourced.
- The *size* of the gap is a live measurement from the token-catalog cron
  (`lst.market_vs_redemption_pct`) and changes constantly. Show the **current** gap
  and, as snapshot history accrues, its **observed range over time**. Do not write a
  specific percentage into this file — it would be stale immediately.
- A gap within normal range = healthy friction pricing. A gap far outside the
  historical range = worth review (thin pool, or a genuine event). The cron's review
  threshold exists for exactly this.

**Fees:** Deposit 0%, Performance 5% to holders + 5% Treasury (10% total — higher
because arbitrage needs complex bots), Withdrawal 0.5% (shared with ampLUNA holders).
Source: https://docs.erisprotocol.com/products/arb-vault/#fees

**APY is not fixed or predictable** — it depends on how often arbitrage opportunities
appear and their size. Eris publishes an illustrative table (e.g. a 1% opportunity
every 21 days ≈ 18.9% APY; 2% ≈ 41%). It "can't be calculated in advance."
Source: https://docs.erisprotocol.com/products/arb-vault/ (Performance model / APY Calculation)

---

## ampLP — amplified LP positions (Amp Compounder)

**Source:** https://docs.erisprotocol.com/products/amp-compounder/

Deposit an Astroport LP (or zap in any supported asset) into the Amp Compounder,
receive an `ampLP` token. A controller bot claims pool rewards daily, takes the
performance fee, and restakes the rest into the LP — so the managed LP grows while
**no new ampLP are minted.** Result: "each day the conversion rate between ampLP to
LP increases."
Source: https://docs.erisprotocol.com/products/amp-compounder/ (Controller)

**Why this matters for our pricing — critical:**
ampLP is **NOT** valued as `amount × per-unit price`. Its value is its **share of the
underlying LP**, and that share grows daily via the rising ampLP→LP conversion rate.
The correct valuation is the LP-conversion-rate × the LP's intrinsic value
(reserves-based), exactly as our LP/ampLP valuation doctrine already holds. The
per-unit-price model is provably wrong for ampLP because the token's whole design is
"fixed supply, rising backing." This Eris doc is the authoritative source for that
rule.

**Fees:** Deposit 0%, Performance 2.5% to amp[TOKEN] holders + 2.5% Treasury (5%
total), Withdrawal 0%.
Source: https://docs.erisprotocol.com/products/amp-compounder/#fees

---

## Other Eris products (context, not yet pricing-relevant)

- **Amp Extractor** — splits yield from principal; lets holders donate yield. Not
  currently in our pricing path. Source: https://docs.erisprotocol.com/products/amp-extractor/
- **Amp Governance / vAMP** — vote-escrowed ampLUNA for governance (this is the
  VOTING_ESCROW / vAMP minter in our contracts). Source: https://docs.erisprotocol.com/products/amp-governance/
- **Alliance Liquidity Hub** — the TLA primitive itself. Source: https://docs.erisprotocol.com/products/liquidity-hub/

---

## Quick reference — what each Eris token does to a price

| Token | Mechanism | Ratio source | Market vs redemption |
|---|---|---|---|
| ampLUNA | Auto-compounding staking receipt | staking yield (rises daily) | tracks tightly (clean) |
| arbLUNA | Arbitrage-capture vault | accumulated arb profit | can trade below (25-day lock / 5% instant-exit) |
| ampLP | Auto-compounding LP wrapper | LP share grows daily, fixed supply | value by LP-conversion rate, not per-unit |

**The doctrine this file grounds:** the hub exchange rate is robust on-chain truth
(redemption value). The market/pool price is a weaker read that can legitimately
differ — and for arbLUNA, *should* differ, because of the withdrawal friction
documented above. Our job is to show both honestly and explain the gap with the
mechanism, while pulling the live size of the gap from the cron.

# Terra Liquidity Alliance (TLA)

> **This is the core of the mission.** TLA is what TLA Stats exists to track. Fact
> source-of-truth: `terra-liquidity-alliance.facts.json` (schema in `README.md`).
> Mechanism facts are sourced to the Eris **Alliance Liquidity Hub** doc; behaviour /
> practice facts to our own verified research (PROJECT_KNOWLEDGE). Live values (VP,
> totals) come from the cron.

**Official docs:** https://docs.erisprotocol.com/products/liquidity-hub/
**Operated by:** Eris Protocol · **Last source-verified:** 2026-06-26

---

## What TLA is `[tla.what]`

The Alliance Liquidity Hub (TLA) is Terra's central liquidity-incentive engine. It is
a **ve(3,3)-style system**, but with a crucial twist: instead of minting a token for
emissions, it **converts the chain's staking rewards into liquidity incentives**. The
result is a positive feedback loop — staking yield becomes deeper liquidity, and the
Community Pool accumulates permanent chain-owned liquidity along the way.

Weekly **epochs** end Sunday 23:59 UTC `[tla.epochs]`. Everything — votes, incentives,
distributions — is organized per epoch.

---

## The five participants (the whole loop)

The Eris doc frames TLA around five stakeholders, and understanding the loop is the
key to understanding every number we compute:

1. **Voters `[tla.voters_locks]`** lock LUNA / ampLUNA / bLUNA into **NFT-based locks**
   (CW721). Lock time sets voting power: 1 week = 1×, max 2 years = 10×. Locks can be
   auto-max-locked to hold VP at 10×, and can serve as collateral.
2. **Liquidity Providers** stake LPs and earn LP rewards; **voters decide** how much
   reward each LP group gets, via gauge voting `[tla.gauge_voting]`.
3. **Projects** get liquidity for their LPs by either acquiring LUNA/LSTs to vote, or
   **bribing voters** to vote for their pools.
4. **The Chain** redirects staking rewards toward liquidity via a take rate, shifting
   Terra from overspending on staking to building liquidity `[tla.take_rate_pol]`.
5. **Traders** get deeper pools and lower slippage.

### VP uses the LST redemption rate `[tla.vp_uses_redemption_rate]` — important for us
Voting power always counts the **underlying LUNA** as its base. For LUNA, VP = lock
amount. For an LST, VP = lock_amount × **LST redemption rate** — so locking with LSTs
yields more VP. This means the **hub redemption rates we compute in token-catalog are
not just price inputs — they literally size voting power.** Our LST work feeds TLA's
governance math directly.

---

## The three reward streams (don't conflate them)

This is the distinction that caused us a real bug once, now locked in:

1. **Liquidity incentives `[tla.reward.liquidity_incentives]`** — chain staking rewards
   converted to **z-assets** and distributed to **LPs**, allocation decided by voters.
   This is LP emissions (`pending_rewards`).
2. **Voting incentives / bribes `[tla.reward.voting_incentives]`** — each epoch projects
   add incentives so voters vote for their LPs. These go to **VOTERS** (`pending_bribes`),
   a **separate stream**. Phoenix Directive is a regular briber.
3. **Rebase `[tla.reward.rebase]`** — extra rewards to voters based on their locked LUNA;
   the yield the z-assets generate via liquid staking flows back to voters.

> **Bribes go to voters, NOT to LP depositors `[tla.bribes_to_voters_not_lps]`.** An
> early pass misread realized ~86% vs advertised ~50% as "bribes paid on top of LP
> yield." That was wrong. Bribes are a separate voter stream. Like-for-like, **TLA pays
> ≈ what it advertises, marginally under** (amp ~59% vs ~63%; non-amp ~49% vs ~51%) —
> the small drag is the compounder's reward fee, not bribe leakage. Keep these streams
> separate in any yield calculation.

---

## The four buckets `[tla.buckets]`

Pools are grouped into four buckets, each with its **own** reward allocation: **Stable,
Project, Bluechip, Single.** Each user's VP allocates **once per bucket** (4 buckets).

> **Counting gotcha `[tla.vp_canonical]`:** because VP allocates per-bucket, naively
> pool-summing VP inflates it 4×. Use **max bucket VP** as the canonical "Total TLA VP"
> (this matches the Eris UI). Also: lock events carry a `canonical` flag — wrapper-layer
> events (`votion-la/*`, `arb/*`, etc.) duplicate a canonical `ve/*` twin, so VP/lock
> math must filter `canonical === true`.

---

## Staking LPs into TLA `[tla.deposit_variants]`

Four deposit variants — **Zap** (any token, auto-swapped), **Tokens** (the pool's own),
**LP** (existing LP), **Staked** (transfer an Astroport-staked LP directly). Rewards
claim in ampLUNA, bLUNA, or LUNA.

**Amplified vs non-amplified `[tla.amplified_vs_not]`:** an LP can be staked amplified
(auto-compounding via the Eris Amp Compounder → ampLP) or not. Amplified realized yield
is an **APY** (it compounds) vs the advertised **APR** — a like-for-like comparison
must account for that, which was the source of the early misread above.

---

## How aDAO plugs in `[tla.adao_ally_yield]`

aDAO NFTs hold an "Ally" token earning ~0.72% LUNA staking rewards via Terra Alliance,
boosted ~40% via Eris ampLUNA conversion, with a 10% take rate to the DAO Treasury.
That's the aDAO-specific on-ramp into the TLA economy.

---

## The success metric that matters `[tla.amplp_success_metric]`

Per the DAO's strategy, the TLA success metric is **ampLP token COUNT growth per
epoch** — gain ampLP each epoch, don't lose it. USD value fluctuates with the market;
what matters is the underlying ampLP count rising. **Dashboards should surface count
growth, not just a USD figure.** This is a mission-level framing decision, not a
display preference.

---

## Contracts `[tla.contracts]`

Core phoenix-1 contracts — Gauge Controller (voting), Voting Escrow / vAMP minter
(locks + VP), Incentive Manager (bribes), four staking buckets — are the structural
source of truth in `platform-crons/config/contracts.js`. They were originally
discovered via HAR capture of the Eris liquidity-hub Vote tab (May 2026).

Current canonical Total TLA VP binds live `[tla.total_vp]`.

---

## Why this file matters

Every product TLA Stats builds — Portfolio Tracker, LP Health, Bribes Tracking, Vote
Intelligence — is measuring some part of the loop above. When a cron or page is
confusing, the question is almost always "which part of this loop am I looking at, and
which reward stream?" The answer is here, sourced. Getting the streams and the VP
counting right is the difference between honest data and a confident wrong number.

---

## Sources & how to verify `[tla.source.ve3_repo]` `[tla.audit.scv_ve3]` `[tla.audit.oak_hub]`

We want anyone to verify TLA's mechanism themselves, from primary sources — not take
our word for it. In order of authority:

1. **Contract source code** — `github.com/erisprotocol/contracts-ve3` (the TLA ve3
   contracts: `asset-staking`, `voting-escrow`, `global-config`). The on-chain truth.
2. **Independent audits Eris commissioned** (public):
   - **SCV Security — ERIS Contracts ve3** (1 Aug 2024): the TLA contracts directly.
     The auditor's own scope describes asset-staking as distributing rewards "through
     take rates and bribes" and voting-escrow as boosting governance power by lock
     duration via an NFT collection — independently corroborating the mechanism above.
   - **Oak Security — Eris Protocol** (15 Feb 2023): the Amplified Staking **Hub**
     contract (`contracts/hub`) — the exchange-rate mechanism our cron queries for LST
     redemption pricing.
3. **Eris product docs** — https://docs.erisprotocol.com/products/liquidity-hub/ (the
   user-facing mechanism description).

> **What is sourced vs. what is ours.** Everything in the sections above describing
> *how TLA works* is sourced to Eris docs, the contract code, or the audits — marked in
> the facts file as `source_type: "doc"`, with links to verify. Statements about *how
> we measure or interpret* TLA (e.g. "use max bucket VP as canonical total", "ampLP
> count is the success metric", the realized-APR correction) are **our own conclusions**,
> marked `source_type: "self"`. We keep the two separate on purpose: we use officially
> sourced data, and where we draw a conclusion from it, we say so — so readers can check
> the source and judge our reasoning independently.

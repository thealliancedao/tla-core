# Credia Finance — what it is and why TLA Stats cares

> Paired with `credia.facts.json` (the source of truth — every claim here cites a
> fact `id`; if they disagree, the facts file wins). Docs verified against
> https://docs.creda.finance and the creda-docs GitHub repo, 2026-07-16.

## The one-sentence version

Credia is a Cosmos-native **lending protocol** on Terra phoenix-1 — Aave-style
supply/borrow with over-collateralization, not a swap dex
(`credia.protocol_type`). It matters to TLA Stats for three reasons: it accepts
**TLA ampLP tokens as collateral and charges a take rate on them**
(`credia.take_rate.tla_amplp_observed`), its **receipt token vcawbtc is a TLA
gauge entry** (wBTC.creda.a, `credia.receipt_tokens`), and its whole market
state is readable in **one smart query** (`credia.query.metrics`).

## How the protocol works

Four CosmWasm contracts (`credia.contracts.*`): **Portfolio** holds all lending
logic — supply, borrow, repay, withdraw, liquidations, health tracking;
**Oracle** aggregates multi-source prices with EMA smoothing, deviation limits,
and circuit breakers, categorized Major/Stable/LongTail/LP
(`credia.oracle.design`); **Global Config** is the registry/governance hub;
**Liquidator** executes flashloan liquidations.

Interest is utilization-driven on piecewise curves, with Supply APY ≈ Borrow
APY × Utilization × (1 − Reserve Factor), accrued continuously through growing
indices over constant "virtual amounts" (`credia.interest_model`) — which is
why the GraphQL API returns `vamount`s that must be multiplied by the market's
current index to get real balances.

Risk guardrails are the standard modern set (`credia.risk.*`): health factor
(collateral × liquidation threshold / debt; liquidatable under 1.0),
**Isolation Mode** for risky collateral (no mixed collateral, whitelisted
borrows, per-asset + total USD caps), and **EMode** for correlated groups
(docs example: LUNA group at 93% LTV vs 70% standalone).

## The data surfaces

Three ways to read Credia, in order of authority:

1. **Chain — the metrics query** (`credia.query.metrics`). One smart query
   `{"metrics":{}}` on the Portfolio contract returns platform totals plus
   every market's price, supplied/borrowed/collateral, utilization, APYs,
   LTV/liquidation params, caps, isolation config, take rate, and the
   proxy/vproxy receipt-token addresses. This is what the app itself uses
   (`credia.frontend.chain_access`) and what the TLA Stats credia adapter
   captures — via our standard LCD endpoints, not the Eris RPC the frontend
   happens to use.
2. **GraphQL API** (`credia.api.graphql`) — indexer-backed: per-address
   portfolios, typed transaction history with full liquidation records, and
   `marketHistories` time series (rates, utilization, totals per denom). An
   off-chain database; useful (especially for rate history we didn't capture
   ourselves), but chain state stays authoritative.
3. **Docs** — https://docs.creda.finance, source-available at
   github.com/credafinance/creda-docs.

## Why TLA Stats cares

**The take-rate connection.** Credia lists the three TLA ampLP factory tokens
(gauge pools 32/project, 46/bluechip, 52/single) as collateral markets — the
only Credia markets carrying a take rate: `{fixed: 0.02}`, 2% annually on
supplied ampLP, roughly $150K posted at observation
(`credia.take_rate.tla_amplp_observed`, mechanism in
`credia.take_rate.mechanism`). Our **hypothesis — explicitly unconfirmed** —
is that this take rate feeds the contract-initiated `add_bribe` tributes the
old event capture was blind to (`credia.take_rate.tribute_hypothesis`). The
test is mechanical: compare captured add_bribe sender addresses against
Credia's contracts once bribe_capture data accumulates (first capture at the
2026-07-19 epoch flip).

**The receipt token on the gauge.** Every Credia market deploys a per-asset
cw20 proxy; receipts use the `vca` prefix (`credia.receipt_tokens`).
`vcawbtc` — the receipt for supplied wBTC — is the TLA gauge's wBTC.creda.a
single-asset entry (2.69M VP), which is how a lending protocol's deposit
receipt ends up needing identity, pricing, and depth treatment in our catalog.

**Identities resolved in the 2026-07-16 probe batch** (`credia.identity.*`,
`credia.related.amproar_pair_resolution`): arbLUNA (ERIS Arbitrage LUNA, a
Tier-2 hub-ratio asset per PRICING-DOCTRINE), PAXG from Ethereum, wstETH and
xASTRO from Neutron over channel-229 — and the dewhitelisted gauge mystery
entry turned out to be the **drained ampROAR-ROAR Astroport pair contract**,
not a token at all.

## Boundaries we keep

Credia's oracle prices appear in the metrics payload and are recorded in the
adapter's `raw` as *Credia's view* — TLA Stats pricing follows
PRICING-DOCTRINE.md, never a lending protocol's internal oracle
(`credia.oracle.design` notes). Observed values in the facts file are dated
snapshots, not live bindings; current numbers come from dex-data/credia
snapshots once the adapter ships.

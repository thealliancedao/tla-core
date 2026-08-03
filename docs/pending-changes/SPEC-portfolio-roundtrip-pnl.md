# SPEC — round-trip P&L + market-vs-TLA attribution (P&L Phase C, concrete)

Status: **SPEC 2026-08-03 — blocked on classifier v4 re-walk (ARCHIVE-WINDOW
DEPENDENT, see §5)** · Owner: capture layer first, then derive, then site

## 1. What Camron asked for (the contract)

Per LP, per round trip: what went in and its value THAT day; what came out
and its value THAT day; the delta. Sum the trips per pool; sum the pools.
Then add: non-amplified redemptions, and how much amplified APR offset
losses / boosted gains. Cover EVERY way in and out. End state: a defensible
"here's your total P&L" and the attribution story — the red is the crypto
market, and TLA rewards softened it, shown with numbers.

## 2. The blocking fact (verified against raw events 2026-08-03)

schemaVersion-3 events record LP/share units, zap swap legs, and raw_action
names — but NOT the underlying token amounts of a direct provide (both
sides) or a withdraw's refund assets. Those amounts exist in the chain tx
logs (`provide_liquidity` emits the provided assets; `withdraw_liquidity`
emits `refund_assets`; zap-out emits the exit swap legs) — the classifier
simply doesn't capture them. Without them, entries beyond zaps and ALL
exits are unvalued, which is exactly the hole Camron is pointing at
($3,358 "measured in" vs a reality far larger).

## 3. Classifier v4 — fields to add (then re-walk)

Per event, capture the TOKEN LEGS:
- `legs_in`:  [{denom, amount}] — assets the user handed over (direct
  provide both sides; zap offer leg already exists in cost.swaps; keep both)
- `legs_out`: [{denom, amount}] — refund_assets on withdraw; zap-out ask
  legs; any dust refunds on provide
- LP-token TRANSFERS (cw20 `transfer` / bank send of LP or amp tokens
  between wallets) as first-class `transfer_in`/`transfer_out` events —
  positions can move wallets without touching the pool; today that path is
  invisible and it is one of the "ways in and out" that must be covered
- amp stake/unstake migrations (already visible as paired flows) keep both
  legs so unit ledgers reconcile

Prior-verbatim law: v4 events go to the SAME month files via merge-on-key;
existing events gain fields, never lose them. Two-run byte-identity gate +
per-event leg spot-checks against chainscope pastes (one FCD-era, one
hole-era, one walker-era tx).

## 3b. Path matrix + lot semantics (Camron 2026-08-03 — "cover as much as possible")

- **Partial exits**: FIFO lots consume PROPORTIONALLY — pulling 25% three
  months in closes 25% of the oldest lot(s) at that day's exit value; the
  rest stays open at original cost. No trip is "all or nothing".
- **Non-amp ⇄ amplified migrations are SEGMENT BOUNDARIES, not exits.**
  The migration tx carries both legs (withdraw shares + deposit amplp,
  same tx — verified in the raw events), and the underlying never left the
  pool. Each mechanism segment gets its own economics: non-amp segments
  accrue pulled rewards and take-rate exposure; amplified segments accrue
  compounding (unit-rate growth via the state sampler). Position-level
  P&L chains the segments; per-mechanism P&L reads them separately — both
  views from one ledger, no phantom exit gain at the boundary.
- **Enumerated in/out paths (all must classify):** zap in · direct
  double-sided provide · single-sided provide w/ optimal-swap · zap out ·
  direct withdraw (refund both sides) · non-amp ⇄ amp migration ·
  LP/amp-token TRANSFER between wallets (in AND out) · third-party zap
  routers · amp compounding growth (no tx — state-derived) · gauge
  stake/unstake of the same units (no economic flow — must NOT create
  trips). Unclassifiable paths land in a counted `unmapped` bucket,
  never silently dropped.

## 4. The derive (extends build-pnl v2 — no third copy)

With legs present, per wallet × pool (units segregated as today):
- ENTRY ledger: Σ legs_in valued at price-history(event day) — Tier M
- EXIT ledger:  Σ legs_out valued at event day — Tier M
- ROUND TRIPS: FIFO-match unit lots per (pool|unit); each closed trip gets
  in-USD, out-USD, delta; open lots remain as current position at cost
- REWARDS attribution: pool-attributed claims (exists) + bribe income
  (voting rollups) + amplified compounding = unit-rate growth, which needs
  the STATE SAMPLER's LP-per-amplp rate history (§5) — until then the
  amplified-APR line is claims-only, labeled
- ATTRIBUTION DECOMPOSITION per trip (the "not TLA's fault" proof):
    market_effect = entry basket revalued at exit-day prices − entry value
    lp_effect     = exit basket − entry basket, both at exit-day prices
                    (impermanent loss + trading fees, net)
    tla_rewards   = claims + bribes attributed to the holding window
    trip_net      = market_effect + lp_effect + tla_rewards (must reconcile
                    to out−in+rewards exactly; gate-asserted)
  Rendered as: "market moved you −$X · LP mechanics ±$Y · TLA paid +$Z."
- Outputs: extend ledger/{addr}.json with `trips` + `open_lots` +
  `attribution`; story card gains the true net; the whole-life chart gains
  a real value curve once the state sampler lands.

## 5. ⚡ SEQUENCING — THE ARCHIVE WINDOW DECIDES THE CALENDAR

The FCD era (2024-08→2025-01) re-walks from the frozen FCD archive any
time. The hole era (2025-01→2026-06) re-walks ONLY through the community
archive endpoint. **If that grant is still live, classifier v4 + re-walk
and the historical STATE SAMPLER (pool reserves + LP supply + amp
exchange rates + hub rates, per epoch) are the next two builds, in that
order, before anything else** — every week of access is the difference
between Tier-M truth and permanent Tier-blank. If the grant has lapsed,
v4 still ships (FCD + forward capture) and the hole era's exits stay
honestly blank until access returns.

## 6. Acceptance

Fixture wallet: three hand-reconciled round trips (one per era) against
chainscope, legs and prices shown; Σ(trips)+open_lots+rewards reconciles
to the wallet's full flow history to the cent; attribution identity holds
per trip; determinism; every unvalued leg counted, never bridged.

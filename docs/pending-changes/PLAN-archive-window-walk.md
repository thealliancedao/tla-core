# PLAN — the archive-window walk (master checklist, one pass, no regrets)

Status: 2026-08-03 · Access CONFIRMED LIVE · This document is the walk's
contract: nothing starts until Camron blesses the field list, and nothing
re-walks twice for a forgotten field.

## 0. THE INSURANCE POLICY (headline recommendation)

**Archive the RAW wasm attributes of every matched tx, alongside the
classified events.** Month-sharded, gzipped, own tree (`raw-archive/`).
This is the structural answer to "we can only think of so much": the
archive walk happens ONCE while access lives; classification can happen
FOREVER after. Every oversight of the "captured events but not the costs"
class becomes a local re-derive instead of a lost-access tragedy. Estimated
tens of MB gzipped per month — well inside repo limits, sharded. If we do
only one thing from this plan, it is this.

## 1. Confirmed gaps the walk must close (verified against live data today)

| # | Stream | Gap (verified) | Fix in walk |
|---|--------|----------------|-------------|
| 1 | tla-flows | provides/withdraws carry NO token legs; exits unvaluable | classifier v4 `legs_in`/`legs_out` (SPEC-portfolio-roundtrip-pnl §3) |
| 2 | tla-flows | LP/amp token transfers between wallets invisible | v4 `transfer_in/out` events |
| 3 | tla-flows | 4,949 claims have user=null | resolve recipient from the coin-transfer leg |
| 4 | tla-flows | tx GAS never captured — a real user cost | per-event `fee: {amount, denom}` from auth_info |
| 5 | tla-voting/locks | some legs `args_unknown:true` (amounts missing); NO lock-exit (post-unlock withdraw) events; NO lock-NFT transfer events in the type census | lock classifier v2: full arg decode + exit + transfer_nft legs — locks are capital in/out and tradeable NFTs; both are P&L paths AND the "TLA lock NFTs" ally collection. **CONFIRMED REAL (Camron 2026-08-03): lock NFTs list AND sell on Boost + Atrium ("Liquidity Alliance Lock #N", historical Boost sales on record, Camron personally bought an early low-number lock from another user and helped Atrium test their lock listings) — so the walk captures lock-NFT marketplace SALE + payment legs on both venues, same classifyNftTx v2 machinery as the ADAO collection.** |
| 6 | tla-voting | PD's own bribe txs sit in known capture gaps; claim_coverage has a hole | voting-events gap backfill through the hole era, same walk |
| 7 | nfts | mint/sale PAYMENT legs uncaptured for the walker era | classifyNftTx v2 + ADAO collection re-walk (mint USD cost for every token in circulation — Camron Q1) |
| 8 | prices | WHALE/CAPA-era legs unpriced (CoinGecko holes) | state sampler doubles as an implied-price oracle: sampled pool reserves give a stated-method price for ANY pool-listed token at any sampled height |

## 2. Historical STATE sampler — full scope (one sampler, many consumers)

Per epoch (finer where cheap): pair reserves + LP total supply (37 Astro +
27 SS + any added) · amp exchange rates (LP-per-amplp — amplified
compounding attribution) · Eris hub rates (LST cost bases) · Votion vault
vdenom supplies + rates (pre-2026-07-16 votion history becomes derivable
from vault flows × rates) · `/terra/alliances` reward_weights +
`annual_provisions` (historical APR reconstruction, formula already
confirmed) · gauge staked-in-TLA totals per pool (share histories).
Probe `state_depth` first; record the sampling manifest (which heights
answered) as data.

## 3. Optional streams (cheap while walking — Camron may strike)

- aDAO treasury operational bank sends (grants/payments) → a treasury-flows
  stream completing the treasury P&L profile beyond DeFi positions.
- Escrow/rewards distribution legs to NFT stakers (partially captured
  already — verify field completeness, same census method).

## 4. Pixel Lions — DEFERRED from this walk (Camron 2026-08-03)

PL is STRUCK from this walk's scope. It gets its OWN dedicated backfill
AFTER the main backfills complete, with an independent window that runs
DEEPER than the TLA window (PL predates TLA on phoenix) — kept separate so
nothing in the main walk is put at risk. Classic-era (pre-migration)
history is on another chain and is not recoverable by any phoenix walk;
completeness claims stop at the migration boundary, honestly. Inclusion in
the platform is the commitment.

## 4b. Lock-exit LIVE EXPERIMENT (Camron, runs in parallel)

Nobody on the team has actually withdrawn a matured lock — the exit
mechanics are unverified. Camron starts a ~1-week test lock NOW; at
maturity he withdraws it, and that tx becomes the classifier's lock-exit
fixture (exact contract, action names, and asset legs from a controlled,
known-answer transaction). The v4 lock classifier's exit path is written
against speculation only until this fixture lands — the experiment turns
it into Tier-M certainty.

## 5. Correctness safeguards (how we know we "got it right")

- **Field-completeness census as a GATE**: per event type, the walk report
  asserts coverage rates (e.g. ≥99% of deposits carry legs_in; every
  withdraw carries legs_out; args_unknown rate per lock type ≈ 0) —
  thresholds fail the run, not a human eyeball.
- Prior-verbatim merge-on-key; two-run byte determinism; never-shrink.
- Walk MANIFEST committed as data: exact height ranges walked per stream.
- Parallel-run: v3 events untouched until v4 output reconciles to v3 on
  every shared field.
- Per-era spot checks (FCD / hole / walker) against chainscope pastes for
  every NEW field, on the fixture wallet.
- The raw-attribute archive (§0) backstops everything above.

# HANDOVER — the Vote Market milestone (2026-09-26 → 27)

_Descriptive handover for a fresh chat (the rule: a milestone's findings live in files, not in a chat). Read with CHANGES_PENDING's
OPEN LEDGER 2026-09-27._

## What the owner asked for
"Build a powerful simulation tool so you can plan how to participate in bribes or voting in TLA": an overview of where $ does the most
(lenses: underdogs, liquidity, volume, projects without PD support…), a simulator ("I have 2M votes on LUNA-ROAR — move them to
LUNA-SOLID and bribe it $100: how does Votion move, what do I get, what happens to the bucket's APRs, what do I get if nothing changes"),
a Votion-style optimizer for the user's VP; read-only with or without an address; big readable numbers, little text; very clear that
the numbers are estimates if everything else stays the same; Reset everywhere; a phone version; an app tab with three sub-tools; the
TLA Stats tile as the overview with the simulator one tap away; the help bot able to do all of it.

## Where it lives
| Piece | File | Rev |
|---|---|---|
| Engine (the ONE model) | `aDAO-links-site/lib/vote-market.js` | 1.3.0 |
| Simulator page | `aDAO-links-site/vote-market.html` | VM1.7 |
| TLA Stats tile | `aDAO-links-site/lib/vote-market-tile.js` (mounted in `tla-stats.html` #bounty-board-card) | 1.1.1 · T6.13.3 |
| App tab | `aDAO-links-site/app.html` (`TABS.vmkt`, `vVmkt`, sub-tabs where/plan/best) | 2.1.1 |
| Bot tool | `platform-crons/help-agent/lib/vote-market-tool.js` + `server.js` rule 16 | 1.0.0 · v1.16.0 |
| Votion's move rule | `tla-core/votion/backtest/move-rule.json` + `backtest-move-rule.py` | 1.0.0 |
| Gates | `gate-vote-market.mjs` (site, 94 checks) · `gate-vote-market-tool.mjs` (bot, 18) | |

## The model (so nobody re-derives it)
- **Payout**: pot × a ÷ (V + a) for a voter with a votes on a pool with V others' votes; paid only when the pool holds ≥ 1% of its
  bucket's votes. **Emissions**: the bucket's weekly budget split among its active pools by vote share; APR = weekly × 52.18 ÷
  staked_in_tla_usd × 100 (MIN_TVL $1,000).
- **Pots** = the round being VOTED: Votion's `opt.bribes` period list (captured) or LIVE from the incentive manager
  `terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh` `bribes{period}`. The snapshot's `active_now` is the PRIOR round —
  using it was the first bug.
- **Votion**: two vaults (ampluna-max, arbluna-max) each maximize Σ pot·a/(V+a) per bucket — solved exactly by water-fill. Its VP
  units are ×k (≈ 1.11–1.12) real VP per bucket — divide. Its own view of a pot is `votionPotUsd`; payouts use `potUsd`.
  Two pools funded in its list but absent from its options are "excluded"; pools it was not offered are "untested".
- **Move rule** (fitted, 27,196/27,196): a vault re-votes a bucket only when gain > $0.05 AND split deviation > 5%; otherwise it keeps
  its current votes exactly. Base case uses Votion's PUBLISHED flag; a plan forces a vault to move when the change flips the computed
  flag (`flippedByChange`, `gainFromChange`). Casts ~2.6 h before the Sunday 23:59 UTC deadline (21:20 UTC).
- **Breakdown**: You pay − comes back (your share of that pot, only if your votes are on it) ± elsewhere (dilution from Votion's new
  votes and the pool you left, or a GAIN when Votion leaves your pools) = real cost = bribe − (your bribes after − before).
- **Best split** iterates the water-fill with Votion reacting, skips winding-down pools, drops pools under the line.
- **Wind-down**: curated alert `usdc-noble-winddown` (`docs/curated/alerts.json`, deadline 2026-10-31, snapshot 2027-01-12) stamped
  into lp-grades pool alerts; fallback by the catalog underlying denom `ibc/2C962DAB…80FDB`. 11 pools; never recommended.

## Findings
- The Votion "back-test gap" (40–55 pp between our solve and its plan) is Votion's own solver landing short of its objective (flat
  objective, many near-optimal splits), not a model error — which is why the move RULE, not the split, is what we predict.
- Votion casts BEFORE the last capture of a round, so "did it move" must be detected across the whole series, not the last capture.
- The old TLA Stats tile disagreed with the planner: pots $1.1K vs $1,250 (dropped unpriced tokens), Votion's moves in raw units (−4.34M
  vs −3.88M), "casts in" = the deadline. Fixed by running the tile on the engine.
- votion.io is an unrelated smart-home company; Votion is votion.money (links fixed in the docs).
- lp-grades does not grade every gauge — ungraded gauges get the wind-down flag only through the catalog fallback (upstream gap).

## How it was verified
Engine checks on real products (E1–E12: units, pots, conservation, the solver vs Votion's plan, payouts, scenario, best split, lenses,
names, wind-down, the move rule); the page in jsdom (P1–P5) and in Chromium at 390 px and desktop (screenshots in the chat); the tile
(T1–T9, deep links into the simulator); the app in Chromium at 390 px (all three sub-tabs, no wallet and with DeFi_Patriot); the bot
tool against the engine (X0–X17) and live on GitHub data.

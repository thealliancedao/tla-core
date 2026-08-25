# SPEC — LP Grades v2: "What is a vote worth?" (ground-zero redesign)

**Status:** DRAFT for owner decision · 2026-08-25 · supersedes SPEC-lp-grades-rework
and folds SPEC-pd-bribe-drift + SPEC-pd-directive-watch into one tab design.
**Owner brief:** the aDAO Vote Advisor must become a flagship tool — where the DAO
sees how to do better and where others look to do better; a PD bribe tracker that
puts PD's stated criteria on paper against ALL pools and shows drift through each
window; and a fresh look at whether we grade LPs the right way at all.

---

## 0. What tonight taught us that changes the design

These are measured facts from the platform's own products, not opinions:

1. **Votion is mechanical and reproducible.** Its worksheet (captured verbatim)
   shows reward = bribe × a/(V+a), objective = max Σ with the vault's VP as
   budget; our exact solve lands 1–6% above its own 1–4-iteration heuristic;
   hysteresis ~4% / ~$1. It re-optimizes every ~15 min and casts at `voteBefore`.
   → **Votion's votes are predictable given the pots.** ~28% of the electorate
   can be modeled, not guessed.
2. **A pot only exists for Votion if it is funded for the period being voted.**
   The three CAPA gauges dropped out of its option set because their pots were
   funded for p199 only. → Bribe "runway" is not a nicety; it is the difference
   between being in the market and not.
3. **69–78% of every LUNA reward claimed via TLA is recompounded by the Eris
   amplifier** (tla-flows pressure v1.0, E197–199); ~25% goes to wallets; in-tx
   swaps ≈ 0. Net token pressure from TLA flows: ampLUNA is the token being
   *sold* (~$13K/epoch), LUNA/USDC net bought. → The emissions engine mostly
   feeds itself; "does liquidity stay" is answerable from data.
4. **PD's allocation does not follow its stated criterion.** PD's own proposal
   titles say *"vote incentives based on trading efficiency + volume"*. Measured
   against ALL Astroport TLA pools at placement (weekly-avg products):
   - prop 250 (pays E193–196): 56% of PD LUNA went to pools in the top half by
     trading efficiency (vol÷liq); PAXG-WBTC ranked 16 of 19 ($462 of volume on
     $163K of liquidity) and still received 8.9%; LUNA-arbLUNA ranked 15th and
     was bribed.
   - prop 253 (pays E197–200): 72% to top-half pools; PAXG-WBTC 16th again,
     now the 3rd-largest allocation (1,441 LUNA/epoch, 15%).
   - In BOTH windows, LUNA-USDC, LUNA-USDT, LUNA-EURe and LUNA-SOLID sat in the
     top-11 by efficiency at placement AND at window end — and were never bribed.
   - The allocation pattern reads as **bucket policy** (bluechip + PD's chosen
     single gauges get most; the stable bucket gets nothing), not the pool-level
     efficiency ranking the titles describe.
   - **Drift is real inside the 4-epoch windows:** LUNA-WBTC was #3 at placement
     of 250 and #9 for the rest of the window; USDC-USDT went #14 → #4; LUNA-ASTRO
     was #1–2 throughout and got 5% of the money.
   Stated descriptively — the page shows the arithmetic; readers conclude.
5. **The 4th "single" gauge Votion weighs is `wBTC.creda.a`** (Credia's wBTC
   receipt, `terra1jjvy4…tswhrcpc`): PD bribes it 960 LUNA/epoch, Votion prices
   it at $47, and our TLA snapshot omits the gauge (Credia market not captured).
   Capture gap, now named.

## 1. What the wider ecosystem learned (research, applied to TLA)

- **Performance-based emissions beat size-based.** Newer designs tie rewards to
  pool *utilization* (volume actually facilitated) rather than raw deposits;
  ve-gauge systems (Curve → Velodrome/Aerodrome/Ramses) let locked voters route
  emissions, and bribe markets clear at a $/vote rate that mercenary VP follows.
  TLA is exactly this: a ve-style gauge with Votion as the mercenary layer.
- **Rented liquidity leaves when the campaign ends.** The lifecycle is
  documented everywhere: announce → inflow → yields compress → end → TVL exits →
  organic level shows. **Retention is the test**, not TVL at peak.
- **Protocol-owned liquidity is the durable form.** Olympus-style bonding,
  Berachain-style PoL, and — in TLA's own words (PD "Structured Liquidity") —
  the take rate "ensures permanent chain-owned liquidity grows". The amplifier's
  ampLP take is the plausible POL engine. → POL share per pool is a durability
  signal we can measure (amp positions vs plain).
- **Which pairs are worth owning:** stable-stable and correlated pairs (LST/base)
  carry near-zero IL, so incentives buy durable depth cheaply and the liquidity
  is sticky; volatile pairs need fees ≥ IL to hold LPs; concentrated pools need
  far less capital per unit of depth (up to 10–20× for stables), so "TVL" is a
  poor proxy for depth — **depth at ±2% is the honest liquidity number**.
- **For the chain itself** the valuable pools are the ones traders actually
  need: the native asset's stable pair (LUNA-USDC/USDT), the LST-base pairs that
  keep LSTs liquid (LUNA-ampLUNA/arbLUNA), and the bridge assets (wBTC, ATOM,
  INJ, PAXG) — in that order of chain-level importance.

## 2. Grading v2 — five lenses, every number on chain, config-driven

The current rubric (0.2.0-draft) grades trading quality with a support-gap
overlay. It answers "is this a good pool?" It does not answer "what is a vote
worth here?" Version 2 grades **the value of a vote to TLA**, from five lenses.
Each lens is a 0–100 score with its own "why" line; the composite uses weights
from `grading_config.json` (published, versioned, DAO-prop-sourced where weighty).

| Lens | Question | Measured from | Notes |
|---|---|---|---|
| **L1 Purpose** | What does the chain need this pool for? | declared table: pair class (native-stable / LST-correlated / bluechip bridge / project / stable-stable) with strategic weight; bucket weights are the chain's own statement (stable 40%…) | The one declared input; sourced to the TLA proposal + PD doctrine; DAO-prop for changes |
| **L2 Work** | Does it facilitate trades? | utilization vol÷TVL (4-epoch, time-weighted), depth at ±2% (planner engine), fee yield | = today's Component A; the ±2% depth replaces TVL as the liquidity number |
| **L3 Efficiency** | What do emissions buy here? | emissions $ per $ volume; emissions $ per $ depth; both vs bucket median | "cost of a dollar of trading" |
| **L4 Durability** | Does liquidity stay? | price-neutral liquidity retention 4/8 epochs vs emissions received (growth flows); amp (POL-like) share of TLA stake; IL class; exit slippage; top-3 LP concentration | "would it survive the campaign ending?" — the research's real test |
| **L5 Governance** | Who holds the votes, and why? | mercenary share (Votion + bribe-steered VP ÷ pool VP); bribe $/1M VP vs Votion's rate; threshold cushion; PD dependence (share of pot from PD) | a pool 90% Votion-voted on a PD pot is one placement away from inactive |

**Honesty states** carry over: null-vs-0 per metric, `ungradeable` when a lens has
no trustworthy source (Credia, SS volume), confidence on every grade. **Lenses as
views**: DAO voter (L1+L4+L5 heavy), LP depositor (L2+L3+L4), briber (L2+L5).
The letter grade is one weighting; the five bars are the truth.

## 3. aDAO Vote Advisor v2 — the flagship

**What it is:** an optimizer for the treasury's ~841.5K VP that recommends an
allocation, explains every move, projects its effect, and hands the council the
exact proposal message. Not a diff of two allocations.

**Doctrine (owner, 2026-08-25 — binding, stated on the tile):** aDAO's votes
are cast rarely, by proposal, so they have to be **earned**:
- An existing pool earns aDAO votes with **at least four epochs of solid
  performance** on the lenses (L2 work, L4 durability) — one good week is not
  a case. The Advisor shows the streak beside every recommendation.
- A **new** pool, or an **inactive / unsupported** one (no pot, nobody bribing
  it, a project that cannot afford to), can earn votes on a stated reason —
  the "greater good" case. That reason is declared on the recommendation
  (e.g. "no other support; durable pair; keeps a partner's liquidity alive"),
  and the council's ally-support flag is the same mechanism made explicit.
- **Bribes are never a factor.** Not an objective, not a tiebreak. What aDAO's
  VP happens to earn in bribes is reported after the fact as a bonus line,
  outside the optimizer.
- **Recommend seldom.** A change is proposed only when it is material and
  earned; hysteresis is a feature, because every recommendation costs the DAO
  a proposal and a discussion.

**Objective (config weights, all shown):** maximize *system value per VP*, where
value per VP on a pool = L1–L5 composite × marginal emissions steered per VP
(diminishing: a/(V+a), the same math Votion uses), **eligibility gated by the
doctrine above (4-epoch streak, or a declared reason)**, with three adjustments:
1. **Threshold rescues first.** A good pool within 1–2% of its bucket gets the
   VP that keeps it earning before any other move (Threshold Watch already
   computes "+N VP to reach 2%").
2. **Don't duplicate Votion.** Votion's published plan is an input: VP Votion is
   already bringing counts as covered; aDAO's VP goes where the mercenary layer
   will *not* be (durable pools with no pot, or pots not funded next period).
3. **Hysteresis.** Recommend a change only if the projected gain clears a
   threshold — the same discipline Votion applies — so the council is not asked
   to re-vote every week for noise.
Constraints: 10% chunks per bucket, bucket VP known, max N moves per proposal.

**What the tile shows (per bucket):** NOW vs RECOMMENDED as two stacked bars on
10% gridlines; shift chips with reasons generated from the lens that drove them
("+20% LUNA-ROAR — durability 0.9, no pot, 1.4% cushion: votes buy retention");
a projection strip (emissions redirected $/wk, pools kept above 1%, mercenary
share before → after; aDAO's bribe capture shown separately as a **bonus line,
never an input**); a **what-if
sandbox** (drag any pool's chunk, everything re-projects live, including
Votion's response via the reproduced optimizer); **compare to Votion**
(same VP, Votion's objective → the mercenary allocation, side by side with the
system-value one — the clearest picture of *why the DAO votes differently*);
and **the proposal message**: the exact DAODAO `vote` JSON for the gauge
controller, copy button, plus a one-paragraph rationale generated from the chips.
**Track record** (from E201 on): each recommendation archived with the epoch's
outcome — adopted / partially / not, and what happened to the pools — so the
tool earns credibility the way the rest of the platform does: by being checked.

## 4. PD Bribe Tracker — "what they said, what they did, what changed"

One card per PD batch (props 244/247/250/253 …), plus a page-level lens:
1. **Stated criterion** — quoted from the proposal title/text ("trading
   efficiency + volume"), source-linked.
2. **Allocation vs criterion, ALL pools** — the table prototyped above: PD's
   share per pool beside each pool's rank by trading efficiency and by volume at
   placement, across every active Astroport TLA pool (SS/Credia marked
   ungradeable); the "qualified but not bribed" list; share of LUNA to top-half
   pools. Descriptive; the reader concludes.
3. **Drift** — a rank heatmap per bribed pool across the window (E-placement →
   E-end) on the stated criterion; "if re-evaluated at epoch k under the stated
   rule" allocation vs the fixed placement.
4. **Consequence** — VP and emissions the bribe bought per epoch (pool-status
   VP series + distributions); Votion's share of the votes it bought (the
   reproduced optimizer tells us how much of each pot Votion captured).
5. **Concentration lens** — PD's share of all funded pots per period; PD's share
   of Votion's optimizer inputs (the pots Votion sees are mostly PD's); PD's
   direct VP; the charter's own 20% ceiling quoted verbatim beside the numbers.
Rules: placement-time numbers are the record as captured then; a blank beats a
reconstruction; no "should" anywhere on the page.

## 5. Capture gaps to close (in order)
1. `wBTC.creda.a` gauge in the TLA snapshot (Credia market) — Votion and PD both
   act on it; we are blind to it.
2. Per-pool LP holder concentration (dex-liquidity events → top-3 share) for L4.
3. Daily write-once copy of Votion's optimizer payload (option set + hysteresis
   as a time series) — also the back-test source for the Advisor's Votion model.
4. SS volume (L2 for Skeleton pools stays ungradeable until then).
5. lp-grades epoch archive keeps accruing from E199 (drift-of-grade ripens).

## 6. Build order (three sessions, each gated, each shippable alone)
- **S1 — PD Bribe Tracker.** Data exists today. Cron duty `pd-bribe-fit` in
  tla-voting (per batch: allocation vs rankings across all pools at placement
  and per epoch; consequence series) → product `tla-voting/pd-bribes/fit/`;
  tab section with the cards. Evidence first — it changes the conversation.
- **S2 — Grading v2.** `grading_config.json` (lenses, weights, purpose table),
  lp-grades cron computes the five lenses + composite + confidence; tab shows
  lens bars per pool with "why" lines; views (voter / depositor / briber).
- **S3 — Vote Advisor v2.** Optimizer (page-side, on the products + the
  reproduced Votion model), NOW/RECOMMENDED bars, reason chips, projection
  strip, what-if sandbox, compare-to-Votion, proposal-message export, track
  record archive (cron writes the recommendation per epoch, write-once).

## 7. Owner decisions needed before S2/S3
- **D1 — DECIDED (owner):** native-stable 1.0 · LST-correlated 0.9 · bluechip
  bridge 0.7 · stable-stable 0.6 · project 0.5, adjustable by DAO prop.
- **D2 — DECIDED (owner):** votes are earned (≥4 epochs of solid performance,
  or a declared greater-good reason for new / inactive / unsupported pools);
  bribes are never a factor (bonus line only); recommend seldom.
- **D3 — DECIDED (owner):** the tracker lives in the LP Grades tab — the
  place for deciding how to vote. (Built: S1, 2026-08-25.)
- **D4 — DECIDED (owner):** record every recommendation and outcome from E201;
  whether to surface it publicly is decided later, with data in hand.

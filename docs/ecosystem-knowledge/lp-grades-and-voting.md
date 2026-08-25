# How we grade pools, and how the DAO decides where to vote

> Plain-language guide to the LP Grades tab on thealliancedao.com/tla-stats.html.
> Everything here is computed from on-chain data the platform captures; nothing is
> an opinion typed in by hand except the one table we say is declared. Updated
> 2026-08-25 (grading v2, Vote Advisor v2, PD Bribe Tracker v1).

## The one-sentence version

A vote in the Terra Liquidity Alliance steers LUNA emissions to a pool. We grade
every pool on **what a vote there is worth to Terra**, and the DAO only moves its
votes to pools that have **earned** it — four straight epochs of solid grades — or
that the council names for a stated reason. Bribes never enter the decision.

## What a grade means

Each active pool gets a letter, A to F, made of five lenses. Every measured lens
scores a pool **against the other active pools that epoch** (100 = best of the
field, 0 = worst), so the letters spread across the field instead of everyone
landing on C. The mix of five lenses is fixed and published:

| Lens | Weight | The question | What is inside it |
|---|---|---|---|
| **Purpose** | 20% | What does the chain need this kind of pool for? | A declared table by pair type: LUNA–stablecoin 1.0 · LUNA–LST (ampLUNA, arbLUNA, bLUNA…) 0.9 · bluechip bridges (wBTC, ATOM, INJ, PAXG) 0.7 · stable–stable 0.6 · project tokens and single assets 0.5. The only hand-set input; changeable by DAO proposal. |
| **Work** | 25% | Does it facilitate trades? | Utilization (weekly volume ÷ liquidity), depth, exit slippage. |
| **Efficiency** | 15% | What do emissions buy here? | Emissions per dollar traded and per dollar staked — cheaper ranks higher. |
| **Durability** | 25% | Does liquidity stay? | Price-neutral retention over four epochs (the pool's tokens counted at today's prices, so price moves don't fake growth), amplified/compounded share, impermanent-loss exposure by pair type, asset durability. |
| **Governance** | 15% | Who holds the votes, and why? | Votion's share of the pool's votes (votes that move for money), the pool's bribe rate vs Votion's going rate, cushion above the 1% line, share of its bribe pot that comes from PD. Less dependence ranks higher. |

Letter bands on the weighted composite: **A ≥ 75 · B ≥ 60 · C ≥ 45 · D ≥ 30 · F below.**
A number with no trustworthy source is **null**, never zero — it is left out of its
lens and the pool's confidence drops (firm → provisional → thin). Skeleton Swap
volume and the Credia market are not captured yet, so those pools carry blanks
where the data would be, and say so.

**Streak** = consecutive epochs at C or better. It is the "earned" counter.

## How the DAO decides where to vote (the Vote Advisor)

aDAO votes rarely — every change is a proposal and a discussion — so its votes have
to be earned. The Advisor's rule, in order:

1. **An existing pool earns aDAO votes with four consecutive epochs at C or better.**
   One good week is not a case; the streak is shown beside every pool.
2. **A new, inactive or unsupported pool** (no bribe pot, nobody backing it, a project
   that cannot afford to) can earn votes only through **a reason the council declares**
   — printed on the recommendation. Supporting a struggling ally is that mechanism.
3. **Bribes are never a factor.** Not an objective, not a tiebreak. What aDAO's votes
   happen to earn is reported afterwards as a bonus, outside the math.
4. **Recommend seldom.** A change becomes a proposal only when it is at least 10%
   more system value than what we vote today **and** every pool it points at has
   earned it. Otherwise the verdict is "hold" and it says why.

How "system value" is scored, chunk by chunk (TLA votes move in 10% chunks per
bucket): the pool's five-lens composite × 1.5 if the pool is a good one sliding
toward the 1% line (rescue first) × (1 − 0.7 × the share Votion already plans to
bring — don't duplicate the mercenary layer) × diminishing returns as our own share
of the pool grows; no pool takes more than 50% of a bucket's votes. Every bucket
card shows **NOW** (how the treasury votes today) and **THE LENSES SAY** (what the
rule recommends), the shifts with their reasons, and the LUNA emissions the change
would redirect. When a bucket is proposable, the exact on-chain vote message for
the gauge controller is generated for the council.

## Who else votes, and why it matters

About 28% of all TLA voting power sits in **Votion** vaults, which move mechanically
to wherever bribes pay best per vote. The platform reproduces Votion's optimizer
from its own published worksheet (reward = bribe × your votes ÷ (gauge votes +
your votes); maximize the sum), so the Overview's Vote Market can show what a
bribe would move. Two facts follow: a bribe only exists for Votion if its pot is
funded for the period being voted, and Votion re-optimizes about every 15 minutes
until it casts. LP-voted pools (holders protecting their own emissions) sit below
Votion's rate by design — they are not for sale.

## The PD Bribe Tracker — what they said, what they did, what changed

The Phoenix Directive is the largest briber on the rails it stewards. Its own
proposal titles state the criterion — *"vote incentives based on trading efficiency
+ volume"*. The tracker takes that criterion literally and applies it to **every**
active Astroport TLA pool at the epoch before each placement: each bribed pool's
share of PD's LUNA beside its rank by trading efficiency (weekly volume ÷ average
liquidity), the whole field with the pools that outranked a bribed pool and got
nothing, and a rank heatmap through the paid window (placements are fixed for four
epochs; pools drift inside them). Placement-time numbers are the record as captured
then — never rebuilt. The page draws no conclusion; it shows the arithmetic beside
the stated rule. Pools outside the Astroport series (Skeleton, single-asset, Credia)
are shown with their LUNA and no rank.

## What is declared vs measured (so you know what to argue with)

- **Declared:** the Purpose table; the lens weights; the letter bands; the 4-epoch
  streak; the 10% material threshold; council reasons. All published, all
  changeable by DAO proposal.
- **Measured:** everything else — from the TLA snapshot, dex-data, the Votion
  product, bribe-state, distributions, tla-flows. Each row can be opened to its
  numbers.
- **Not captured yet (and labeled):** Skeleton Swap volume, the Credia market,
  per-pool LP-holder concentration, a daily Votion per-pool history.

## Where the numbers live

`lp-grades/snapshots/current.json` (v2 per pool: lenses, composite, letter, streak,
confidence, raw inputs) · `lp-grades/epochs/<E>.json` (write-once history) ·
`tla-voting/pd-bribes/fit/current.json` (the tracker) · `votion/optimization` (the
optimizer's worksheet) · `tla-voting/bribe-state/runway.json` (pots per period).

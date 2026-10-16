# How the LP Scorecard grades pools, and how to read a bribe against the field

> Plain-language guide to the LP Grades tab on theadao.com/tla-stats.html — now the
> **LP Scorecard**. Everything here is computed from on-chain and DEX data the platform
> captures; the only hand-set inputs are in one public config file. Updated 2026-10-15
> (LP Scorecard 1.0 — replaces grading v2's tab view, the aDAO Vote Advisor and the PD
> Bribe Tracker).

## The one-sentence version

A vote in the Terra Liquidity Alliance steers LUNA emissions to a pool, and a bribe
steers votes. The scorecard grades **every TLA pool on facts anyone can check** —
real trading, depth, sticky liquidity, what incentives cost per dollar traded — so
voters, projects, DAOs and bribers can all see which pools earned support, over any
time window, and check any bribe placement against the whole field.

## Who it is for

Everyone who decides where votes or bribes go: individual voters, projects defending
their pools, DAOs (aDAO included), and bribers such as the Phoenix Directive. It is a
shared yardstick, not anyone's voting instructions. aDAO's own votes are decided by
council proposal, separately.

## What a grade means

Pick a **window** (24h, 7d, 30d, 90d — averages of the days before the as-of date) and
a **lens**. Pools are shown **bucket by bucket** (stable, project, bluechip, single), and
each measured number is turned into a **percentile among the pools in the same bucket**
(100 = best in the bucket) — emissions are split per bucket, so a stable pool competes
with stable pools, not project pools. The lens mixes the percentiles with published
weights (config `rank_within: "bucket"`; `"all"` would grade one field):

| Metric | What it is |
|---|---|
| **Vol ÷ Liq** | average daily volume ÷ average liquidity — how hard each dollar works. Pools under the depth floor ($10K) are not ranked on it: a tiny pool can look "efficient" without carrying a real trade. |
| **Volume** | average daily volume (USD). |
| **Liquidity** | average liquidity (USD). |
| **Fees** | average daily swap fees — what LPs earn from trading. |
| **Sticky liquidity** | price-neutral retention: the window's starting token amounts valued at end prices vs the end amounts, so price moves do not fake growth or flight. |
| **Cost per $ traded** | estimated LUNA emissions + bribes per epoch ÷ weekly volume. Lower = votes buy more trading. |
| **Votes share** | share of the bucket's votes — used (lower ranks higher) only by lenses looking for under-supported pools. |
| **Purpose** | declared, by pair type: LUNA–stable 1.0 · LUNA–LST 0.9 · bluechip bridge 0.7 · stable–stable 0.6 · project 0.5 · single 0.5. |

**Lenses** (each a weight set, some with a filter): **All-round** (default) ·
**Workhorses** (most trading) · **Efficient** (trading per $ of liquidity and per $ of
incentives, above the depth floor) · **Quality assets** (purpose, depth, stickiness) ·
**Underdogs** (real work, ≤5% of their bucket's votes) · **New pools** (captured for
under 28 days — early data).

Letters on the lens composite: **A ≥ 75 · B ≥ 60 · C ≥ 45 · D ≥ 30 · F below.** A
number with no source is left out and its weight shared by the rest — never counted as
zero. A pool missing more than half of a lens is listed under "not graded — why".

**Stability chips:** every row shows the pool's rank in its bucket on the same lens in all four
windows at the same date — a grade that holds in every window is not a lucky week.

**This epoch's bribes:** the Bribes column shows the pots placed for the as-of epoch,
split Phoenix Directive / everyone else. PD-bribed pools carry a purple "PD bribed" mark;
a pool (over the $10K depth floor) that ranks above a PD-bribed pool in its bucket on the
current lens, with no PD bribe, carries an amber "ranks above a PD pick" mark. Each bucket
header counts both.

**As of:** any past epoch end can be chosen, and the whole table re-grades as it would
have looked then.

## The Bribe Scorecard — a placement against the field

For any bribe placement the facts can check (currently the Phoenix Directive's
proposals, decoded from the proposals themselves and verified against chain events):

1. **Closest match.** On the day before the proposal executed, each candidate ranking
   (Vol ÷ Liq, Volume, Liquidity, Fees, All-round — each pool's standing within its
   bucket) × each window (24h…90d) is compared with where the LUNA went — a rank correlation (1.00 = the allocation followed that
   ranking exactly, 0 = no relation). The criterion named in the proposal title is
   marked "stated". The closest match is shown beside it.
2. **Where the LUNA went** — each bribed pool's LUNA per epoch beside its rank, and the
   whole field on the chosen ranking, with pools that ranked above a bribed pool and
   received nothing marked (within the same bucket).
3. **Through the window** — each bribed pool's rank at the end of every epoch, from the
   one before the window through 1–4 epochs after it.
4. **What changed** — liquidity, volume, vol ÷ liq and votes share before the
   placement vs the last week of the window vs N epochs after, each compared with the
   unbribed pools' median move over the same dates (so market-wide swings are netted
   out).

5. **A declared formula, checked.** Any formula put in the config (`bribe_check.formulas`) becomes a
   criterion and gets its own panel: each gauge's placed LUNA re-split in proportion to the formula's
   score, beside what was actually placed, with the share of LUNA placed differently. The current entry
   is a formula reported for the Phoenix Directive (0.75 × volume + 0.25 × volume ÷ TVL, min-max
   normalized within each gauge) — not published by PD and labeled unverified.

6. **Sizing — does the amount follow the work?** Among the pools a placement picked, each pool's share
   of the LUNA beside its share of a metric (volume, fees, liquidity, grade, or a declared formula):
   the weight (share of LUNA ÷ share of the metric, 1× = sized to it), LUNA per $1K of daily volume,
   and the bucket split (PD LUNA vs the bucket's volume and emission shares).

Pools that had no trading history when a placement was made (brand-new pools,
single-asset gauges) are listed and left out of the correlation — not counted against
it. The scorecard measures; it does not judge, and reasons it cannot see (a launch, a
migration, an ally) are not visible in it.

## Sharing and tracking

- **Links:** `tla-stats.html?prop=262#grades` opens that placement's scorecard; add `&sec=sizing` (or `record`,
  `summary`, `formula`, `steer`) to land on a panel; `?win=30d&lens=workhorses&asof=2026-09-20&bucket=stable#grades`
  reopens a table view. Every panel has a "copy link" button.
- **In brief:** each placement opens with a generated, numbers-only paragraph — selection match, sizing vs volume,
  bucket split, most over-weighted pick, and the PD-steered share of votes during its paid window.
- **Track record:** one table of every placement the data can check; it grows each epoch.
- **Votes steered per epoch:** measured from the vote harvest — Votion's votes on each pool credited to funders by
  pot share, as a share of all TLA votes — beside the PD charter's 20% line.
- **The numbers as data:** `lp-grades/scorecard/bribes.json` (placement summaries + steered history); the help bot
  reads it.

## One config file — change it, and past and future re-grade

Every weight, lens, band, window, floor and the emissions calibration live in
`tla-core/docs/curated/grading_config.json` → `scorecard`. The page and the lp-grades
cron run the **same code** (`lib/lp-scorecard.js`) on the **same raw facts**
(`lp-grades/series/pools.json`), so editing the config re-grades every view on the page
— past dates included — on the next load, and the cron's next run re-grades its
history file. No re-capture is needed: the facts are kept, the grades are derived.

- **Declared (argue with these):** purpose table, lens weights, letter bands, depth
  floor ($10K), new-pool age (28 days), bucket emission shares. Changeable by DAO
  proposal.
- **Estimated, and labeled:** emissions per pool (annual TLA LUNA ÷ 52 × bucket share ×
  the pool's share of its bucket's active votes); non-LUNA bribe tokens at today's price.
- **Measured:** everything else.
- **Not captured, and labeled:** SkeletonSwap volume (its API mostly does not provide
  it — SkeletonSwap pools show liquidity and stickiness but are usually not graded),
  trading on single-asset gauges, the Credia market.

## Who else votes, and why it matters

About 28% of TLA voting power sits in **Votion** vaults, which move mechanically to
wherever bribes pay best per vote (the Overview's Vote Market reproduces its
optimizer). A bribe only exists for Votion if its pot is funded for the period being
voted, which is why a large briber's placements shape a large share of the vote.

## Where the numbers live

`lp-grades/series/pools.json` (facts: daily per pool by address, per-epoch votes,
amounts, bribes, PD legs) · `lp-grades/scorecard/current.json` (every lens, default
window, latest day) · `lp-grades/scorecard/history.json` (default lens re-graded at
every completed epoch under the current config) · `docs/curated/grading_config.json`
(the rubric) · `lp-grades/snapshots/current.json` (the older five-lens grade, still
published for the Pools tab).

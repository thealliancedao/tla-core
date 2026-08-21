# SPEC — LP Grades Tab Rework (Rev for rubric 0.2.x era)

**Status:** DRAFT for owner approval · opened 2026-08-21 (owner feedback with screenshots)
**Scope guard:** this tab lives inside tla-stats.html (~7K lines, rendering
normally frozen). Owner has explicitly requested this rework — changes stay
scoped to the LP Grades tab's blocks only, count==1 anchors, one block at a
time, gated per block.

## 1. aDAO Vote Advisor — redesign

**Problem (owner):** dense label/value rows; no *why*; doesn't read as a
recommendation, reads as a diff.

**Design:** per bucket, a before→after visual, not text rows:
- Two horizontal stacked bars per bucket: **NOW** allocation vs **RUBRIC**
  allocation, same pool colors, 10% gridlines (TLA votes move in 10% chunks —
  keep that constraint visible).
- Between them, shift chips (+40% LUNA-ROAR …) each carrying a **reason tag**
  pulled from the rubric factors, e.g.:
  `+40% LUNA-ROAR — grade C, underpaid 1.9× (votes buy retention here)`
  `−50% LUNA-SOLID — grade D: utilization 0.4× median, trend red`
  The reason is generated from the same score components the row bars already
  encode (D/U/B/T/Tr) — no new data, just surfaced.
- A one-line **process header** above the tile: "How this works: rubric scores
  every pool on system benefit (methodology ↗) → we compare the treasury's
  current 10%-chunk allocation → shifts shown are the smallest set of chunk
  moves that reaches the rubric's allocation." The *why-at-all*: "Votes are
  the treasury's only continuously renewable resource; this tile keeps them
  where they strengthen TLA most."
- Keep an "apply as text" copy button (the old compact text) for council use.

## 2. Bribe Planner v2 — from "cheapest votes" to "right votes"

**Problem (owner, confirmed):** current planner optimizes $-per-vote →
zero-competition pots → surfaces D/F pools, contradicting the page's own
thesis; equal $25 splits ignore the auction dynamics; ignores existing pots
(projects + PD); doesn't model Votion's response.

**New objective (default): system benefit per dollar.**
- **Eligibility filter:** pools graded C or better, OR flagged
  underpaid-workhorse — never D/F (a toggle "show all pools incl. low-grade"
  exists for exploration, clearly labeled "not recommended targets").
- **Competition awareness:** each candidate shows its existing pot state from
  bribe-state/runway: total remaining, per-epoch taper, epochs left, and
  **funder labels** (Solid, PD, unattributed) — so the planner naturally
  surfaces *quality pools nobody is bribing yet* (owner's ask: find the good
  places that don't get support).
- **Votion response model (assumptions shown in an ⓘ box, not hidden):**
  Votion allocates its responsive VP (~ measured vault lock VP, live number)
  toward the best bribe-per-VP. Model: market clearing rate
  `r = Σ(active per-epoch bribe value) / (responsive VP)` → estimated votes
  attracted by adding $B to pool p in an epoch ≈ `B / r`, capped by the pool's
  headroom, and **step-function honest**: below the marginal rate of the
  currently-best pot, small bribes may attract ~0 votes (the "your $25 on top
  of someone's $100 flips the whole pot" effect the owner described — the
  model shows the flip threshold per pool: "adding ≥ $X makes this pool the
  top $/VP target").
  All figures labeled *modeled, mechanics-only* — this is a planning lens,
  not a prediction (participation-protocol compliant).
- **Allocation:** greedy marginal allocation across eligible pools (uneven by
  design), showing per-pool: amount, modeled votes, flip threshold, existing
  competition, and *system reason* (grade + underpaid ratio).
- **Output line:** "$100 → $62 USDC-EURe (A-side underpaid, no pot), $38
  LUNA-ampLUNA (underpaid 1.5×, Solid pot expires E200)" — each with reason.

## 3. Grade visibility & context (quick wins)
- **Grade filter chips:** A · B · C · D · F · Inactive — additive with the
  existing category tabs (owner: "toggle to see the A and B grades too").
  NOTE current epoch has no A/B (31 graded, best C) — chips show counts so an
  empty A chip is honest, not broken.
- **Why-this-grade line:** each row's expansion gets one generated sentence
  naming its two strongest and two weakest factors with values ("C: deep
  ($290K) and balanced, but utilization 0.6× median and trend flat") — same
  data as the score bars, in words. Methodology link stays.

## 4. PD strip — top of page
A compact strip ABOVE the LP Grades tile (placement per owner): PD's active
placements at a glance — pools, per-epoch amount, epochs left, and a drift
chip per pool (placement-epoch utilization vs now, once SPEC-pd-bribe-drift
math unblocks post-F2). Links to the full PD drift page when built. Until F2
lands, the strip ships with placement + runway facts only (all clean data),
drift chips marked "pending data repair".

## Dependencies & order
1. §3 chips + why-line (pure frontend on existing data) — first, low risk.
2. §1 advisor redesign — second.
3. §2 planner v2 — needs a small shared lib for the Votion response model
   (unit-gated with fixtures from runway + votion snapshots).
4. §4 strip facts-only now; drift chips after AUDIT-price-artifact F2.

## Open items for owner sign-off
- Default planner budget presets stay ($25–$100 + custom)?
- Flip-threshold display: per-pool "$X to become top target" — comfortable
  showing that, or too actionable? (It is mechanics from public data; the
  participation-protocol line still applies.)
- Advisor: keep recommending across ALL buckets even where rubric ≈ now
  (show "no change recommended" explicitly)?

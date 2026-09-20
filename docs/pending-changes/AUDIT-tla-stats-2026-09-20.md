# AUDIT — TLA Stats page: second look at everything (2026-09-20 late)

Owner's brief: "before we do any changes let's go over all the docs, pending changes, changelogs — anything we can get history
from — to see why or how we built this, keep in mind we may have been wrong in the past and may have learned something new."
Sources read: docs/changelogs/tla-log.md (Rev 1.14 → T3.20, 2026-05-08 → 2026-08-25), the tla-voting / votion / vp / lp-apr /
bribe-runway specs, AUDIT-eris-apr-pricing.md (Aug 1–4 + the Sep 10 addendum), CHANGES_PENDING ledgers 2026-08 → 09-20, the
owner's 2026-09-20 screenshots of tla-stats, Votion (pages + HAR) and Eris (LP list + Vote page), our products
(dex-data/eris-apr, votion/optimization, member-data/tla-snapshot, dex-data/astroport/epochs). Nothing changed on any repo by
this audit. Method: for each section, (1) the ruling that created it, (2) what we believed then, (3) what we know now, (4) keep /
change / retire.

## 0. The one-line verdict
The DATA LAYER is right where it was validated and drifted where it was not re-validated. The PAGE is confusing for reasons that
are almost all vocabulary. Two products disagree about the same quantity (APR) on one page — the only "two-sources" violation
found. Nothing found argues for tearing sections down; several things argue for one rewrite of names, one cron re-validation,
and one honest label on the Vote Market.

## 1. Tiles (Active Pools · TVL · Rewards · Bribes · Avg APR ×2) and their history popups
- Created: Rev 4–5 (2026-07-17/20, go-live) as the page's hero numbers; history modal Rev 5; T5.3 (2026-08-20) added
  `member-data/tla-snapshot/epoch-band-history.json` — 16 epochs BACKFILLED from snapshot matrices for the four band metrics
  (active pools ×3, TLA TVL) "gated vs the live tile at E199: 28 pools / A20+S8 / $1.83M".
- Believed then: the live prev/current pair is authoritative; the band backfill is deeper history; other metrics get history
  "as epochs are tracked" (the modal literally says so).
- Known now: `store.previousEpochData` is set only to null (tla-stats.html ~3338; the setter is gone), so no tile has a previous
  point; the band product ends at E199 and nobody extends it; meanwhile `dex-data/astroport/epochs/astroport-epoch-184…203.json`
  (20 epochs, the same shape as `store.data`) sit on main unread by the modal. Epoch-band-history duplicated a series the epoch
  files already carried — a second copy (law: one canonical file per series).
- CORRECTED on inspection (same day, before any change): the astroport-epoch files are Astroport pool snapshots (TVL, volume,
  fees) — NOT the tiles' shape (no votes, bribes, APR); the sentence above about "twenty epochs of the same shape" was wrong.
  The honest per-epoch series is `member-data/tla-snapshot/daily/` (130 files, 2026-05-13 → 09-19, every epoch E184–E203):
  `totals.tla_tvl_usd`, `active_pools_count`, per-pool dex/status (→ Astro / Skeleton counts), `rewards.luna_price_used` — the
  SAME basis as the TVL / pools tiles (the band product was gated against them at E199). But the daily `rewards` is the May
  calibration MODEL (weekly_emissions_usd $16.2K on 09-19) while the Rewards tile shows the eris-apr chain read ($19.7K); the
  daily per-pool APR is `approx_apr_pct` (one series), not the tile's non-amp / amplified pair; bribes per epoch live in the
  bribe-state harvests. Wiring the popups to the dailies as-is would put a history in one basis under a live point in another.
- Do (three gated steps, cron first): (1) extend the tla-snapshot daily fold to stamp the tiles' own basis per day — eris-apr
  weekly rewards $, TVL-weighted non-amp / amplified APR, bribe total from bribe-state — beside the model fields (labeled);
  (2) a new `member-data/tla-snapshot/epoch-history.json` rollup in the apr-history-rollup pattern (last daily of each epoch =
  the epoch's reading, plus the epoch average), mock-gated on the real 130 files; (3) the modal reads it for every tile,
  restore the previous-epoch point the same way, retire the band copy. TVL and the three pool counts can ship on step 2 alone
  (their basis already matches); rewards / APR / bribes wait for step 1. No page-only patch.

## 2. VP — "Total", "voting", "all TLA VP"
- Created: SPEC-vp-definition-fix (SHIPPED 2026-07-14): canonical VP = fixed_amount + voting_power (boost); T5 (2026-08-20)
  "canonical VP everywhere"; the VP tile audit CLOSED as "definitional: display VP = fixed×10 vs actual decayed".
- Believed then: one VP number, used everywhere.
- Known now: two honest numbers exist and both are needed — Eris Total Voting Power 32.08M (every lock's VP) vs the VP that
  VOTED (ours 28.66–28.99M at lock-in, Eris live per bucket 29.2–31.9M). The page calls the voting figure "all TLA VP" — the
  word is wrong, the number is right. Bucket totals legitimately differ (VP is used partially per bucket; Eris's own vary by
  2.7M) — the 2026-09-20 batch-2 note claiming they must be identical was WRONG and is withdrawn. Utilization Leaders (all 100 %)
  is the inverse of the useful fact (idle VP).
- Do: one vocabulary — "total VP" (Eris's 32.08M) · "voting VP" (what is on gauges) · "idle VP" (the difference); say which one
  every tile and header uses. Keep the definition; fix the names.

## 3. Epoch vs period vocabulary
- Created: the capture layer speaks Eris's `period` (the vote round: period 203 casts at its end and sets emissions for the
  next epoch); the page speaks `epoch` (the emission week). Rev T3.2 (08-03) "PD split epoch-flip fix" and the Monday-boundary
  work (dex-data 1.4.0, state-history) hardened the flip.
- Known now: sections disagree on the page today — Vote Market "Epoch 203 · live", Vote Breakdown "203 locked-in / 204 planned",
  Bribe Runway "period 202" (stale), liquidity "E184–E203", Pool Health "E202 → E203". Eris's own page reads "Current voting
  round ends in ~4 h · For Epoch 203". Our mapping is right (period N votes → epoch N+1 emissions); our WORDS are not one set.
- Do: one rule written once and reused: "voting round 203 (ends Sun 23:59Z) → emissions epoch 204". Every section says which
  side of the flip its number sits on. Bribe Runway's "period 202" is a bug (one period behind).

## 4. Eris APR (dex-data eris-apr) and the page's APR numbers
- Created: AUDIT-eris-apr-pricing (08-01 → 08-04): the formula taken from Eris's bundle and from Philipp verbatim
  (incentives = provisions × weight/totalReward × distribution; tvl = TLA-staked only; apy = aprToApy(0.92·inc) + trading − take;
  total = inc − take + trading); VALIDATED 08-02 per pool to 0.00–1.83 pp, "the entire residual is the trading-fee leg" (our
  dex-data fee_apr substitution). Sep-10 addendum re-confirmed the composition byte-for-byte and pinned the trading leg per
  pool kind. Convention key: dotted = APR (linear), flame = APY.
- Believed then: "the formula itself needs no further proof"; product-level spot-check once, then clear meta.validation.
- Known now (2026-09-20 18:02Z product vs the owner's Eris screenshots ~19:50Z): (a) our `incentives_usd_per_year` is
  UNIFORMLY −14.8 % vs Eris's "Rewards $" on all 10 pools compared — one input moved (provisions, the alliance weight set /
  totalReward, or the LUNA price basis), not the formula; (b) staked TVL +1.3–2.6 % (price/timing, fine); (c) the product's
  `eris_apr_pct` / `eris_apy_pct` sit 25–59 % below Eris's dotted/flame — far beyond the −14.8 % of (a), so the trading or
  take-rate legs are off too; (d) the page's Top-by-APR leaderboard does NOT read this product — its numbers match Eris within
  ±4 % on 11 of 15 pools (LUNA-FUEL 345.5 vs 334.5) while the product says 235.2 for the same pool. TWO APR SOURCES ON ONE
  PAGE, and the one that matches Eris is not the one we documented. The four "off" leaderboard pools (USDC.n, USDT, INJ,
  SOLID; −12 to −29 %) are therefore a question about the leaderboard's source, not the eris-apr product.
- What we may have been wrong about: "validated once, then trust" — Eris's inputs move (a new alliance changes totalReward; a
  frozen hub still reports; their /prices basis differs from ours by 1–2 %). The Aug audit itself said "standing canary" for
  prices; APR never got one.
- Do: (1) find the leaderboard's APR source and name it; (2) re-run the Aug-2 validation as a GATE the cron keeps: reproduce
  Eris's Rewards $ per pool from provisions × weight × distribution × LUNA (screenshots as fixture, HAR when the owner can
  capture one on the phone); the uniform −14.8 % will fall out of stage 2 (weights/provisions) in one look; (3) one APR source
  on the page, the product; (4) publish `meta.validation` with the per-pool Δ so the tile can show its own error.

## 5. Bribes — pots, "funded for the period", Bribe Runway, Top Bribers
- Created: SPEC-tla-voting-bribe-state (07-15, tribute capture rework, "state truth from the bribe manager"); period-keyed
  funding ("owner catch 2026-08-24: a pot is live only for the periods it is funded for; a pot funded through 199 is not an
  option for 200"); SPEC-bribe-runway (07-30, "how long each pot lasts and who funds it"); briber board (rollups schema 6).
- Believed then: bribe state is harvested once per epoch at the boundary (a mid-epoch bribe is invisible until the flip — noted
  2026-09-11 as a capture gap, live capture queued).
- Known now: 14 of 15 pots match Eris within 0.4–1.2 % (price). LUNA-EURe: Eris $9.99 for THIS round vs ours "not funded for
  p203 (through p206)" — the period-key rule or the pot's start period; check the manager's fields before the round closes.
  Eris shows a bribe-rate RANGE per pool where we show one $/1M VP. Top Bribers lists Astroport take-rate distributions
  ($18.4K stable etc.) — right by the rewalk ruling, but a reader sees a "briber" that chose nothing.
- Do: keep the period-key rule (it was a real catch) but gate it on the LUNA-EURe case; label take-rate rows; consider the
  range. The live/hourly bribe capture stays queued (it is the real fix for "invisible until the flip").

## 6. Vote Market
- Created: T3.19 (2026-08-24) "Vote Market v3 (Votion's optimizer reproduced), live pots, reward f…"; the page text: "we solve
  that objective exactly … Votion's own solver stops 1–2 % short of the optimum, so this is where it is aiming".
- Believed then: an exact solve of Votion's objective predicts Votion's allocation.
- Known now (owner's HAR 2026-09-20): the OBJECTIVE is exactly right (bribe × x ÷ (V + x), V excludes the vault's own votes —
  reproduces Votion's own $ to the cent); Votion's solver is 0–8 % below the optimum (bluechip 7.9 %); the objective is FLAT so
  allocations differ by up to 40 pp between two near-optimal splits; and Votion applies a change only when
  `diff.isWorthChanging` (gain > $0 on the 8 buckets seen). Our cron already stores diff/newVoted and honours the flag for
  `planned_vp` (Movers, Breakdown, "Votion's next move" — correct). The "+$X → Votion votes" column re-solves from scratch,
  ignores the threshold, and reports splits Votion would not produce.
- What we were wrong about: not the model — the CLAIM. "Where the VP comes from" is not predictable from any optimizer on a
  flat objective; "whether Votion moves at all" is.
- Do: keep the column as "our model's projection (exact optimum)"; add "crosses Votion's threshold?" from their rule; show the
  per-bucket back-test error beside "how it's estimated"; capture one HAR per epoch as the fixture. The T3.19 "reproduced"
  wording comes out.

## 7. Movers this epoch · Vote Breakdown by Pool
- Created: owner 2026-08-25 ("three numbers per pool — what USERS moved since lock-in, what VOTION PLANS, the PROJECTED total").
- Known now: right in principle; the epoch-204 "planned" view is the one comparable to Eris live; between Votion's cast and
  the flip the on-chain delta contains the cast while "plans" may still show it (double count for those hours) — the baseline
  should notice "Votion has cast". Ours (locked-in) vs Eris live per bucket differ by the users' moves the panel already
  shows — consistent.
- Do: keep; add the "has cast" state; one epoch vocabulary (§3).

## 8. Liquidity ("Is TLA liquidity growing?") · Pool Health
- Created: Rev 6.0–6.1 (07-30/31) real-vs-headline liquidity (price-neutral series), Pool Health T3.3 (liveness pass, arb
  radar), "where the rewards go" (compounded / swapped / to wallet) from tla-flows pressure.
- Known now: three names for one base ($1.93M "staked" · $2.01M TVL tile · Pool Health sums), each within 2–4 % of Eris's
  $1.97M once price/timing is allowed — right numbers, unlabeled bases. Real-vs-headline is the honest signal and stays.
- Do: one name per number with its basis on the label; keep the panels.

## 9. Leaderboards · Runway · Newcomers · OG
- Created: rollups schema 4–6 (07-15/17), T3.1 Unlock Runway (08-03), T5 pending-withdrawal board (08-20).
- Known now: consistent with the auto-max electorate (0.05 % unlocking in 8 weeks); pending withdrawals ($1.5K, 66 locks) is
  the useful list; Utilization at 100 % everywhere says nothing; #1 voter terra1lsas…f7y2 is the lock-farming bot (720 dust
  locks this month merged into #2500).
- Do: drawer, not a section; invert Utilization to idle VP; mark bot wallets as such when the gate allows.

## 10. Lessons to carry (added to LAWS at the next docs bulk)
- Validated once is not validated: a reconciliation that mattered becomes a GATE the cron keeps, with its Δ published.
- One quantity, one source, on one page — the APR had two.
- Names are data: a right number under three names reads as three numbers.
- A flat objective predicts the value, not the argmax — say which one the page is projecting.
- Compare ratios between pools before levels when the price is moving; capture both sides in the same minute when you can.

## 11. Order of work (next chat, opener 0)
1. Vocabulary pass (epoch/period, total/voting/idle VP, one name per liquidity number, Bribe Runway period) — labels only.
2. Tile history: daily-fold basis stamp → epoch-history rollup → modal (three gated steps; TVL + pool counts first).
3. APR: name the leaderboard's source; re-validate eris-apr against Eris's Rewards $ (the −14.8 % input), make it a gate; one
   source on the page.
4. LUNA-EURe pot period check (before the next round if possible).
5. Vote Market column honesty (threshold + back-test error), keep the solver.
6. Then the three-question restructure (what's happening · where should my VP/bribe go · is TLA healthy).

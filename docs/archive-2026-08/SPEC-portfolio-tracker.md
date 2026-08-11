# SPEC — Unified Portfolio Tracker & Position Companion (master audit)

**Status:** drafted 2026-06-14. The product-design north star for TLA Stats'
user-facing layer. Consolidates scattered prior thinking (CHANGES_PENDING,
CRON-FIXES-BRIEF, PROJECT_KNOWLEDGE) + this session's capture work into ONE plan.

---

## The vision (in the user's words)

Not a dashboard — a **personal Terra position companion**. A user saves their
address (READ-ONLY, no wallet connect), opens the app, and sees their whole
Terra position spliced together — **NFTs + TLA (locks/LP) + Votion** — with:
1. **Where they stand** — holdings, USD, VP, in plain terms.
2. **How they're trending** — daily / epoch / monthly / yearly growth, decay curves.
3. **What to do about it** — warnings (inactive LP, stale VP, lock unlocking soon),
   "here's how to do better" nudges.
4. Eventually: **saved address** (read-only, persists per device) + **push
   notifications** (PWA / "add to home screen").

Two audiences, both served by the same data, different emphasis:
- **Basic investor:** "Am I up or down? Is anything wrong? What should I do?"
- **DeFi power user:** VP efficiency, take-rate exposure, APR accuracy, decay
  modelling, bribe-yield attribution.

---

## LAYER 1 — What we capture TODAY (the raw material)

| Source cron | Per-address data | Daily history? |
|---|---|---|
| `adao-positions` | LP positions (pool, share%, USD, APR, underlying tokens, active/inactive, take-exposure), locks (asset, VP, end, auto-max, weeks-to-unlock), votes, pending rewards/rebase/bribes, wallet balances, VP spread, tenure | ✅ daily (registered) |
| `tla-locks` | system + per-holder lock intelligence (stale-VP gap, unlock cliff, decay) | ✅ daily (summary) |
| `votion-positions` | per-vault holdings: vtoken, underlying LST, USD, share%, implied VP | ⚠️ live-only (no daily yet) |
| `adao-allies` | ally members' full TLA positions (same shape as adao-positions) | ❌ live-only |
| `tla-participants` | full electorate holdings | ❌ live-only |
| `nft-inventory` | per-wallet NFTs, broken/unbroken, staking, marketplace, backing USD, rarity | ✅ daily snapshots + floor-history |

**Key gap already visible:** Votion, allies, participants are **live-only** — no
daily archive, so NO time-series for them yet. If the portfolio tracker shows
"your Votion growth over time," we must START daily-archiving Votion NOW.

---

## LAYER 2 — What the user needs → do we have it?

Legend: ✅ have it · 🔶 derivable from what we capture · ⏳ needs time to accumulate
· 🔁 backfillable (tx_search) · ❌ missing/blocked

### A. "Where do I stand right now" (snapshot — basic investor)
| Need | Status |
|---|---|
| Total portfolio USD (NFT + TLA + Votion combined) | 🔶 splice 3 sources by address — NOT yet combined anywhere |
| My NFTs (count, broken/unbroken, backing USD, est. value) | ✅ nft-inventory |
| My LP positions (which pools, USD, share) | ✅ adao-positions |
| My locks (amount, VP, unlock date) | ✅ adao-positions + tla-locks |
| My Votion positions (underlying, USD, implied VP) | ✅ votion-positions |
| My total VP (direct locks + Votion implied) | 🔶 sum lock VP + Votion implied VP — not yet combined |
| My pending/claimable (rewards, rebase, bribes) | ✅ adao-positions |

### B. "How am I trending" (time-series — both audiences)
| Need | Status |
|---|---|
| Daily USD value of my position | ⏳ adao-positions daily started ~2026-06-13; Votion/allies NOT archiving yet |
| Epoch-over-epoch growth | ⏳ needs epoch-boundary snapshots accumulating |
| Monthly / yearly growth | ⏳ needs months/years of daily archives |
| Realized APR (actual rewards ÷ position over time) | 🔶⏳ derivable once daily history exists |
| Avg APR per epoch/month/year | ⏳ same |
| Position decay curve (VP decaying toward unlock) | ✅ tla-locks already computes decay projection |
| Token-price decay vs position decay (separate the two) | 🔶 have prices + VP; need to chart both |
| **Past** position history (before tracking started) | ❌ valuations NOT backfillable (pruned). Events 🔁 backfillable |

### C. "What should I do" (intelligence/alerts — the differentiator)
| Alert / nudge | Status |
|---|---|
| LP went inactive (below VP threshold, losing emissions) | ✅ adao-positions has `status: inactive` + take-exposure |
| Stale VP — relock to reclaim | ✅ adao-positions VP spread + tla-locks stale-VP gap |
| Lock unlocking soon (N weeks out) | ✅ adao-positions weeks_to_unlock + tla-locks cliff |
| NFT ready to claim (DAODAO pending-claim) | ✅ nft-inventory pending-claim (page nudge already noted) |
| Unclaimed rewards/bribes piling up | ✅ adao-positions pending_* |
| Voting on a dead/inactive LP (wasted VP) | 🔁 needs vote-history backfill + current pool status |
| APR dropped / pool depth collapsing | 🔶⏳ needs pool-status history |
| Price-feed divergence on my assets (trust warning) | 🔶 CRON-FIXES-BRIEF price-parity spec exists (arbLUNA case proves need) |

### D. Power-user analytics
| Need | Status |
|---|---|
| VP efficiency (VP per $ locked) | 🔶 have VP + USD per lock |
| Take-rate exposure ($ at risk in inactive pools) | ✅ adao-positions inactive_take_exposure_usd |
| Bribe-yield attribution (which bribes boosted my Votion) | 🔶🔁 Votion compound txs + bribes-history |
| APR accuracy (advertised vs realized) | 🔶⏳ have advertised (Eris) + can derive realized from history |
| Whale/contract identity (is that holder Votion/treasury?) | 🔶 known-address-registry spec |

---

## LAYER 3 — "CAPTURE NOW OR LOSE FOREVER" (urgent — accumulation clock)

These are forward-only. Every day we DON'T snapshot them is a permanently missing
data point in future charts. **Highest-priority actionable items:**

1. **Daily-archive Votion** (`votion-positions`) — add `data/daily/YYYY-MM-DD.json`
   (per-vault staked, exchange rate, holder positions). Currently live-only.
   Without this, "Votion growth over time" can never be shown for the period we
   wait. *Cheap add, do first.*
2. **Daily-archive allies + participants** — same reasoning if their members are
   in the portfolio tracker. (allies = registered members → likely yes.)
3. **Epoch-boundary snapshots** — a snapshot at each epoch close (finalized votes,
   settled bribes) for clean epoch-over-epoch deltas. CRON-FIXES-BRIEF already
   specs per-pool boundary capture (total_vp / votion_vp / adao_vp / member_vp).
4. **Per-address realized-rewards ledger** — to compute realized APR, we need to
   record rewards *claimed/accrued* each period forward (the claim events are also
   🔁 backfillable via tx_search).

---

## LAYER 4 — Backfill (recover the past where possible)

Per SPEC-tla-history-backfill.md: **events** (votes, lock create/relock/merge,
deposits, claims, Votion deposits) are 🔁 backfillable to genesis via tx_search.
**Valuations** (what a position was worth on a past date) are ❌ gone (pruned).
So past *token flows* and *behavior* are recoverable; past *USD marks* are not
(except where we have day-matched prices: LUNA/ampLUNA/bLUNA have daily oracle
history; arbLUNA/others partial).

This means a NEW user who saves their address can immediately see their **deposit/
flow history** (backfilled) even though their **daily-USD chart** only starts from
when tracking began. Worth designing the UI to make that distinction honest.

---

## LAYER 5 — The unified portfolio data shape (what the page consumes)

A per-address splice (computed page-side or by a small "portfolio-assembler" cron)
joining all sources by address:

```
portfolio[address] = {
  identity: { name (PFPK), is_member, is_ally, known_entity_label },
  nfts:    { count, unbroken, broken, backing_usd, est_value, pending_claim, listed },
  tla:     { lp_positions[], locks[], votes[], pending[], vp_direct, take_exposure },
  votion:  { vaults[]: { lst, underlying, usd, implied_vp, strategy } },
  totals:  { portfolio_usd, vp_total (direct+votion implied), pending_usd },
  trends:  { daily[], epoch[], monthly[], yearly[] }  // from accumulating archives
  alerts:  [ { type, severity, message, action } ]    // derived each run
}
```

The **alerts array** is the companion's brain — derived from current state each
run: inactive-LP, stale-VP, unlock-soon, ready-to-claim, price-divergence.

---

## SEQUENCING (recommended)

**Now (cheap, urgent — protect accumulation):**
- [ ] Add daily archive to `votion-positions` (+ allies/participants if in tracker)
- [ ] Confirm adao-positions daily is accumulating cleanly (it is, since ~06-13)
- [ ] Decide epoch-boundary snapshot mechanism

**Near-term (the page, against data that exists now):**
- [ ] Portfolio-assembler: splice NFT+TLA+Votion by address → unified shape
- [ ] Snapshot tiles (where-I-stand) — works TODAY, no history needed
- [ ] Alerts layer (inactive LP, stale VP, unlock-soon, ready-to-claim) — works
      TODAY from current state, no history needed. **High value, low dependency.**

**As history accumulates (weeks→months):**
- [ ] Trend charts (daily/epoch/monthly/yearly growth, decay curves)
- [ ] Realized vs advertised APR

**Backfill track (parallel, recovers past behavior):**
- [ ] Vote/lock/deposit/Votion history backfill (events) → flow history + vote intel

**Foundation tasks feeding all of the above:**
- [ ] Known-address registry (label whales/contracts) — SPEC exists
- [ ] arbLUNA + strategy-LST market pricing fix — CHANGES_PENDING price-audit
- [ ] Price-parity / feed-divergence guard — CRON-FIXES-BRIEF spec

---

## DESIGN PRINCIPLES (carry from project ethos)
- **Honest about data limits** — show "history from <date>" not a fake full curve;
  flag prices that may be stale/divergent rather than a confident-wrong number.
- **Read-only, save-don't-connect** — no wallet connection; save address locally
  (per device). Lowest-risk way to get the "open app → see my stuff" experience.
- **Two-audience framing** — a plain-language summary up top, power-user depth
  below / on toggle. Don't overwhelm the basic investor; don't starve the degen.
- **Alerts are the moat** — "what should I do" is what no other Terra tool does.
  Prioritize the alert layer; it works from current state with zero accumulation.
- **SkeletonSwap data is NOT trustworthy** (upstream frozen ~30d) — label any
  SS-derived figure "unverified," never use for scoring.

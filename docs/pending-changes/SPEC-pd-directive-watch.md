# SPEC — PD Directive Watch (pd-bribes product + accountability page)

Status: DRAFT (Camron 2026-08-02) · Owner: capture derive in `platform-crons/tla-flows`
(or rider on tla-voting rollups), page in `aDAO-links-site` · Spec-first per doctrine —
no code before this is committed and the plan is approved.

## Why

Phoenix Directive commits large multi-epoch LUNA bribes to Astroport pools and
states the allocation follows **volume and liquidity** — but never publishes the
inputs, the split rationale, or any retrospective. We hold every input: the
chain-exact placements (11-leg prop 250 verified against chainscope leg-for-leg,
net 38,155.099199 LUNA, spread e193–e196), per-epoch pool volume + liquidity +
TLA-staked series, and vote outcomes. That makes PD's allocation **checkable** —
respectfully, with measured data, in aDAO's stated balancing-force role. Best
case it nudges PD toward publishing their own process (or delegating input to
the community); at minimum the community finally sees how much PD supports LPs
and where the allocation ages badly.

Framing rule: neutral and factual. We never claim to know PD's formula — we
show their STATED basis (volume/liquidity) next to their measured allocation
and let the drift speak. "Inference, labeled as inference."

## Data product first: `tla-voting/pd-bribes` (org)

The page consumes a derived product, never raw events. This product ALSO
replaces the legacy hand-maintained `tla_pd_bribes.json` (observed failure:
coverage ended e188 while PD funds ~41% of e196's bribes — the epoch-bribes
popup showed PD $0.00 for eight epochs). One derive kills that file forever
and feeds board + popup + page from one home.

Per placement (from captured `add_bribe` events attributed to PD's DAO core
via the `dao_attr` rule):
- `prop_id`, `tx_hash`, `height`, `executed_at`
- legs: `pool_gauge_id` (joined from the decoded submessage payload — the
  wasm attrs carry only amount/start/end), `net_luna`, `gross_luna`
  (net + 10-LUNA feeshare skim per leg), `start_epoch`, `end_epoch`
- derived per leg: `luna_per_epoch = net / (end − start + 1)` — the events
  carry the spread natively, so per-epoch attribution is exact, not modeled

Rollups:
- `by_epoch`: epoch → pool → PD luna (exact) — the popup's split source
- `by_pool`: lifetime PD support per pool (LUNA + USD-at-placement)
- `totals`: all-time PD LUNA, prop count, first/last

Dependency: staged→ledger promotion + rollup rebuild (prop 247/250 heights are
already walked — slice_done above the hole top). Forward captures attribute
automatically from here on.

## Page: `pd-watch.html` (own page, linked from tla-stats)

Four views, built in this order:

**1. Allocation vs stated basis.** For each prop: snapshot the pools' volume +
liquidity (+ TLA-staked) in the epochs immediately before execution, rank them,
and set PD's actual LUNA split beside that ranking. Scatter (bribe share vs
volume/liq share) + an over/under table ("got 22% of PD LUNA on 6% of
volume"). Honest axis note: correlation vs their stated inputs — not their
formula.

**2. Drift.** PD allocations are frozen at prop time but run 4+ epochs. Re-rank
the same pools each covered epoch with live metrics and show where the frozen
split diverges from what the same basis would allocate today. A per-epoch
"staleness score" (rank-distance between frozen split and live ranking) makes
aging allocations visible — the argument for shorter ranges or mid-range
rebalance.

**3. History of support.** Cumulative PD LUNA per pool over time, prop
timeline, per-epoch PD share of total bribes (the ~41%-of-e196 class of fact),
USD at placement vs today. This is also the goodwill view — the record of how
much PD has actually put behind LPs.

**4. SS parity.** PD bribes Astroport only. Apply the same volume/liquidity
ranking across BOTH DEXes and surface SkeletonSwap pools that meet or beat
bribed Astro pools on the stated basis — an "unbribed but qualifying" list.
(Gated on SS volume data returning — the /api/pools cron migration.)

Later (phase 3): efficiency joins — LUNA of bribe per VP attracted per pool
(vote-state shift over the covered range), i.e. did the bribe move votes.

## Honesty constraints

- PD's formula is unpublished: every comparison is against their STATED basis,
  labeled. No implied claim of their internal process.
- USD for live epochs = live LUNA price; placement USD frozen at placement.
- Metrics gaps render blank with reasons (SS volume currently absent).
- No estimates where the product lacks data; the page consumes the product only.

## Sequencing

1. Promotion + rollup rebuild (already the next data task) → PD on the Top
   Bribers board.
2. `pd-bribes` derive + popup/board re-home → legacy file frozen with its repo.
3. `pd-watch.html` views 1–3; view 4 lands with SS volume; phase-3 joins last.

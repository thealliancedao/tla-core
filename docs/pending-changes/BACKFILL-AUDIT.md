# BACKFILL-AUDIT — what history we hold, its anomalies, and how past + present merge (2026-07-16)

**Purpose (pass two of the pre-UI-week review):** inventory every historical
series the platform holds (org + old repos the site still reads), hunt
anomalies in the backfills, and design how past and present merge in the
site's charts so UI week inherits one coherent timeline per surface.

**Method:** full tla-core file inventory (streamed listing incl. bulk dirs) +
scripted coverage/gap/sanity checks on every history-bearing module, plus the
old-repo chart files (apr-history, pool-status-history, luna-usd-daily,
listing-history) pulled fresh. All numbers below are measured, not assumed.

**Post-Sunday addendum required:** rollups schema-5 first materialization +
the first distributions/vote-state/bribe-state self-heal outputs are part of
what this audit covers — re-run §5's checks on them after the flip review.

---

## 1. Inventory — what we hold (measured 2026-07-16)

| Series | Coverage | Completeness |
|---|---|---|
| price-history days | **2022-10-31 → today, 1,355 days** | **ZERO gaps**; per-token multi-source w/ confidence; no absurd values; no day under confidence 50 |
| price-history ratios | 2022 → 2026 (monthly files, daily LST ratios) | migrated from old ratio-history ✓ |
| tla-voting events/locks | 2024-08-27 → today, 13,612 events, 24 monthly files | **no missing months** |
| tla-voting events/votes | 2024-08-27 → today, 8,316 events, 24 files | **no missing months** |
| tla-voting events/bribes | 180 events | **HOLE: 2025-02 → 2026-06 missing** (see §2) |
| tla-voting events/rewards | 6,244 events | **HOLE: 2025-02 → 2026-05 missing** (see §2) |
| tla-voting bribe-state | periods **96 → 193, all 98 present** | complete to chain floor (certified) |
| tla-voting distributions | periods **96 → 193, all 98 present** | complete (per-gauge payouts) |
| tla-voting vote-state | 203/203 wallets, period 193, 0 pending | monthly state files begin 2026-07 (product born July; deep lock history lives in events/locks) |
| tla-flows events | 35,637 events | months: 2024-08→2025-01 + 2026-06→07 (**same hole class as bribes**, §2); gapfill-state shows targeted block-range fills DONE |
| member-data daily | 2026-06-29 → today, 18 files | complete since birth |
| nfts floor-history | 35 daily rows since 2026-06-11 | complete since birth; **self-declared caveat** (§3) |
| nfts state-history / listing-first-seen / sales-enriched / pending-claims / hot-set | present, single-file products | sales-enriched ~1MB (full sales record) |
| votion history | day 1 (born today) | hourly points accumulating |
| archive/fcd | 176 raw FCD backfill files | the frozen-archive source material, retained ✓ |
| OLD apr-history | epochs **184 → 194 only** (11) | keyed by gauge_pool_id (post-fix); built June from retained dailies |
| OLD pool-status-history | epochs **184 → 194 only** (11) | same |
| OLD luna-usd-daily | **2022-05-28 →** (phoenix genesis) | ~5 months EARLIER than org price-history starts |
| OLD listing-history | counts product since NFT-cron birth | different product from org listing-first-seen |

---

## 2. THE anomaly — and why it's already covered

**The bribes and rewards event streams (and tla-flows) share a 16–17 month
hole: 2025-02 through 2026-05/06.** This is not a bug and not fixable: the
window starts EXACTLY where the FCD frozen archive ends (~2025-01-07) and
ends where the org crons' forward capture begins (2026-06). Public LCDs
prune tx history, so tx-derived event streams can never recover that window
— the same pruned-window truth votion hit today, seen at platform scale.

**Why locks and votes don't have the hole:** they were reconstructed
state-based (contract queries retain full history), not tx-harvested.

**Why the hole doesn't hurt the UI:** the state-walk products cover the same
ground at period granularity, completely — bribe-state 96→193 (all 98
periods, chain-certified floor) covers the bribes hole; distributions 96→193
(all 98) covers the rewards hole. **Chart rule that falls out: any
epoch/period-granularity surface (bribe boards, payout history, APR series)
draws from the state-walk products; the event streams serve tx-level detail
(activity tickers, per-tx drill-downs) only within their covered windows —
and the UI should say so** (a simple "tx-level detail available from
2024-08→2025-01 and 2026-06→" note beats silently thin charts).

Post-flip, tributes (contract-initiated bribes) begin capture — the forward
bribes stream becomes materially more complete than the backfill era ever
was; worth a "capture quality improved 2026-07-19" annotation on any bribe
time-series.

---

## 3. Smaller findings

1. **Epoch-series history is shallow by construction.** apr-history and
   pool-status-history cover epochs 184→194 only — they were derived in June
   from retained daily snapshots; deeper epoch averages never existed. The
   rollups schema-5 rebuild inherits roughly this floor. UI consequence:
   epoch-trend charts start ~epoch 184 (May 2026); design charts to a
   variable-start axis rather than assuming deep history. (Deep-past
   reconstruction is possible from the gauge controller's retained per-period
   history for VP/distributions — but NOT for liquidity/volume/APR, which
   were never on chain. Accept the floor.)
2. **price-history can gain 5 months of pre-history.** luna-usd-daily
   (source: coingecko per its meta) starts 2022-05-28 — phoenix genesis —
   vs org 2022-10-31. One-time import of 2022-05-28→10-30 LUNA (+ bLUNA from
   its sibling file) into price-history, marked src:'coingecko-import',
   single-source confidence. Small, clean, worth doing before the old repo
   dies. **→ CHANGES_PENDING item.**
3. **floor-history's honest caveat stands:** sales-floor tiers use each
   token's CURRENT broken flag until broken-at.json lands, and
   days-on-market accrues from 2026-06-11 deploy. Any UI using
   avg_days_on_market should carry that footnote until ~90 days of accrual;
   the broken-at backfill remains queued in the NFT module.
4. **vote-state monthly files begin 2026-07** — correct (product born July;
   the deep history question is answered by events/locks, complete to
   genesis). No action; noted so nobody mistakes it for a hole.
5. **listing-history (old) ≠ listing-first-seen (org)** — the old file is a
   listings-count time series since the old cron's birth; org state-history
   supersedes it going forward but doesn't contain its past. If any UI chart
   wants listed-count history pre-2026-06, one-time import the old counts
   into a state-history seed; otherwise let it retire with the repo.
   Decision at Batch-3 when the NFT pages are touched.

---

## 4. Merge design — one timeline per chart surface

The doctrine: **org data is the spine; old data either (a) retires because
org strictly supersedes it, (b) gets a one-time import where it holds unique
past, or (c) keeps running until its org replacement exists (per
UI-DATA-READINESS).** Per chart family:

- **Price charts (any token, any page):** price-history alone. 1,355 gapless
  days; luna-usd-daily retires after the §3.2 pre-history import.
  bluna/luna-usd-daily site fetches re-point here (G13).
- **LST ratio charts:** price-history/ratios alone (migration already done).
- **Epoch/pool trend charts (Pools tab, Overview):** rollups schema-5 (from
  Sunday) as the spine, seeded/back-checked against old
  apr-history/pool-status-history 184→193 — both keyed by gauge_pool_id, so
  the join is direct. Verify after Sunday that rollups reproduce the old
  files' overlapping epochs within tolerance (a one-screen diff — add to the
  flip-review checklist), then old files retire. Charts declare the ~184
  start (§3.1).
- **Bribe/tribute boards + payout history:** bribe-state + distributions
  (complete 96→193) + tributes forward. Event-stream bribes used only for
  tx-level drill-down inside covered windows (§2). The frozen-USD
  tla_pd_bribes stays as curated prop-context color only.
- **VP / member history:** member-data daily (born 06-29) forward; deeper
  per-wallet lock history reconstructable on demand from events/locks
  (complete to 2024-08). The member-lens "VP over time" chart therefore has
  two honest resolutions: daily since June, event-reconstructed before.
- **Activity tickers / tx feeds:** tla-flows + tla-voting events, windowed
  per §2 with the coverage note.
- **NFT charts:** org nfts suite alone (floor-history since 06-11 w/ caveat,
  sales-enriched full-history for sales charts); listing-count pre-history
  per §3.5 decision.
- **Votion charts:** votion/history from today; the realized-APY series
  becomes derivable after a few weeks of hourly points. No past exists —
  charts start at birth, honestly.

---

## 5. Post-Sunday addendum checklist (run these after the flip review)

1. Rollups schema-5: materialized? apr-history in scope (G5)? Overlap-diff
   vs old 184→193 files within tolerance?
2. distributions/vote-state/bribe-state: period 194 present in all three;
   bribe-state gained tribute records; vote-state lock retention proof.
3. events/bribes 2026-07: first contract-initiated tribute events present
   (the "97% blind" era formally ends — annotate per §2).
4. system-health INV-4: armed with baseline.
5. votion history: ~72 hourly points by Monday, rates monotone-ish (vault
   rates should only grow via compounding — a DROP is an anomaly worth a
   look).

---

## 6. Action items distilled

- **Now-ish:** §3.2 price pre-history import (small one-time script, org
  Action per placement map); flip-review checklist gains §5.
- **Batch-3 (page-by-page):** G13 re-points per §4; §3.5 listing-count
  decision; §2 coverage notes on tx-level surfaces.
- **Standing:** broken-at backfill (NFT module, already queued) unlocks
  floor-history's tier accuracy retroactively.

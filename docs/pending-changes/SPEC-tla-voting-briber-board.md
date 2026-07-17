# SPEC — tla-voting briber board (rollups schema 5)

**Status:** DRAFT 2026-07-17 — pending approval. No code exists.
**Depends on:** SPEC-tla-voting-rollups (schema 4, DEPLOYED 2026-07-15);
price-history (deployed, 2022→now); token-catalog stage-2 override for two
unnamed bribe denoms (NON-GATING — unnamed denoms flow to `unpriced[]`).
**Ships as:** org-tla-voting **2.2.0** — rollup builder enrichment only. No
new crons, no new Actions, no new output files.

---

## 0. Locked defaults

- **D1 — universe: direct bribes, stated plainly.** Source = `events/bribes/`
  `bribe_add` records only (173 at spec date; genesis-complete 2024-08-28 →
  now; 16 bribers; zero records missing `briber`). Contract-initiated
  take-rate tributes stay EXCLUDED until build #3 — the existing
  `bribers_coverage_note` is retained verbatim and the site board must render
  a universe banner ("direct incentives only — automated take-rate tributes
  not yet included"). Once build #3 lands, tribute flow enters as separate
  labeled entities; it never silently merges into direct-briber totals.
- **D2 — gross placed, from the add tx (DeFi Patriot, 2026-07-17).** Bribe
  value = `coins[]` on the `bribe_add` event. `fee_funds` (the 10-LUNA add
  fee) is never counted as bribe value. `withdraw_bribes` events surface as
  `withdraw_event_count` per briber ONLY — amounts are not in the capture
  (`coins:null`), so no net math is attempted. Fill rider (non-gating):
  derive withdrawn amounts from those txs' transfer events if/when wanted.
- **D3 — three-number model, reused from schema-4 D4.** Per briber and per
  breakdown row: raw amounts (+ `amount_display` via catalog decimals),
  **`usd_at_placement`** (Σ per-bribe amount × price on the bribe's tx date —
  immutable), **`usd_at_build`** (amount × price at rollup build — fallback).
  Live today-value stays DISPLAY-side (site × current price). No third USD
  number is stored.
- **D4 — price join = schema-4 D5 verbatim.** `price-history/{YYYY}/{MM}.json`
  `days[date][SYMBOL].usd`, nearest prior day within 7, else nearest after
  within 7, else unpriced. Denom→symbol+decimals from token-catalog
  `current.json`; denoms the catalog can't name land in `unpriced[]` with raw
  amounts — never dropped, never guessed. Same-token-multiple-denoms (e.g. a
  second ASTRO IBC path, if the probes confirm one) merge at symbol level via
  the catalog's `variation_of` mechanism — the rollup never hardcodes merges.
- **D5 — labels are the WHO layer's job.** Briber display names come from
  address-catalog; the rollup stores `briber` (address) + `label` (nullable
  join). Missing label → site shows short address. Per the public-output
  framing: labels are descriptive protocol/treasury names only — no motive,
  no politics, nothing attributive in committed files.
- **D6 — output: rollups.json schemaVersion 5, merged (DeFi Patriot,
  2026-07-17 — no new artifact).** The existing `bribers[]` entries are
  enriched in place:

  ```json
  "bribers": [ {
    "briber": "terra1…", "label": null,
    "bribe_count": 98, "withdraw_event_count": 4,
    "first_bribe": "2024-08-28", "last_bribe": "2026-07-14",
    "totals": {
      "usd_at_placement": 0.0, "usd_at_build": 0.0,
      "by_token": { "ROAR": { "amount": "…", "amount_display": 0.0,
                              "usd_at_placement": 0.0, "usd_at_build": 0.0 } },
      "unpriced": [ { "denom": "ibc/517E…", "amount": "…", "bribe_count": 72 } ]
    },
    "by_pool": { "<pool-key>": { "bribe_count": 0, "by_token": { … } } },
    "by_epoch": { … }   // retained from schema 4, unchanged
  } ],
  "bribers_order": [ "terra1…" ],   // usd_at_placement desc; all-unpriced
                                    // bribers ranked last by bribe_count,
                                    // flagged — never ranked by invented USD
  "bribers_coverage_note": "…"      // retained until build #3 closes it
  ```

- **D7 — cadence & recompute:** unchanged from schema-4 D2 — full recompute
  on harvest runs, Layer 3, no incremental state.

## 1. Why (one paragraph)

The community asked "who provides the bribes?" and the answer already sits in
committed truth: every direct `add_bribe` since day one carries its briber,
tokens, pool, and epoch window, and price-history can value each at placement.
Schema 4 stopped at counts and raw per-epoch coins; schema 5 turns that into
a rankable, priced, labeled ledger — and doubles as the centralization-health
surface (one address is 98 of 173 direct bribes at spec date; the board shows
that without a word of commentary).

## 2. Probes (browser, paste results back — feed token-catalog overrides)

Two bribe denoms (and one minor) have `no_discovered_symbol` in the catalog.
LCD denom-trace on any public node:

```
/ibc/apps/transfer/v1/denom_traces/517E13F14A1245D4DE8CF467ADD4DA0058974CDCC880FA6AE536DBCA1D16D84E   (72 of 173 bribes)
/ibc/apps/transfer/v1/denom_traces/B3F639855EE7478750CC8F82072307ED6E131A8EFF20345E1D136B50C4E5EC36   (19 bribes)
/ibc/apps/transfer/v1/denom_traces/B2AA4C3CD19954859C3B537EC07057B7D2DE64BE0FBA7B2CA4F8D1067BCC63FE   (7 bribes; not in catalog — also feed discovery)
```

Results (base denom + channel path) go into the token-catalog override layer,
not into this rollup. Until then those amounts ride in `unpriced[]` honestly.

## 3. Site surfacing (separate ship, not this rev)

Rankings tab of restructured tla-stats: full board, expandable per-pool rows,
universe banner (D1), at-placement / at-build / live toggle. Hook landing
page: bribe money board teaser (top 3 + all-time total + link). Later pivot:
per-pool "who bribes this pool" from the same `by_pool` data.

## 4. v2 rider — claimer earnings board (NOT this spec)

"How much each wallet has made from bribes" = the voters' claims side.
Schema 4 already stores per-wallet `usd_at_claim`; the board is display work
— but it is GATED on the claims hole (2025-01-08 → 2026-06-14 archive-node
backfill, queued). Build nothing there until the hole closes or the board
would silently understate earnings for anyone active in that window.

## 5. Verify (parallel-run before any consumer)

1. Σ `bribers[].bribe_count` = events index bribe count (173 at spec date);
   Σ withdraw flags = 18.
2. Spot-check DeFi Patriot's 5 bribes — the 2026-07-14 SOLID add must show
   52.568180 SOLID, epochs 194–195, priced from the 07-14 SOLID daily; the
   10-LUNA fee must NOT appear in any total.
3. Hand-compute `usd_at_placement` for one 2024-era bribe (ROAR or ASTRO)
   against price-history and match the rollup to the cent.
4. Ordering: every all-unpriced briber sits below every priced one; no NaN /
   invented USD anywhere in the file.
5. Existing schema-4 consumers unaffected: voters/pots/claims sections
   byte-identical inputs → identical outputs.

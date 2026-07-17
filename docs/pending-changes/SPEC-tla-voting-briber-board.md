# SPEC — tla-voting briber board (rollups schema 6)

**Status:** DRAFT 2026-07-17 rev 2 — pending approval. No board code exists.
Rev 2 aligns with what main already implements: `lib/rollups.js` is at
**ROLLUPS_SCHEMA = 5** with the `bribe_ledger` (#3.5 rider), which measures
state-vs-events completeness and retires the "~97% blind" coverage note.
This spec is therefore **schema 6**, building on that machinery.
**Depends on:**
1. **GATING — override merge:** the token-catalog cron never reads
   `docs/curated/token_overrides.json` (verified 2026-07-17: no fetch in
   `platform-crons/token-catalog/token-catalog.js`), so the curated identity
   layer is write-only and `buildTokenMap` (rollups.js) cannot name the 16
   override-identified IBC denoms — including bWHALE (72 bribe events) and
   ampWHALE (19). This ALSO leaves any claims paid in those denoms unpriced
   in the deployed schema-5 rollup today. Fix belongs catalog-side per
   one-truth-per-fact: apply override blocks at build time into the
   published snapshot (per the stage-2 per-field model), consumers keep
   reading the catalog. Own change, own verify, ships first.
2. SPEC-tla-voting-rollups schema 4/5 (deployed); price-history (2022→now);
   PROBES-denom-traces (COMPLETE — all 17 denoms identified, 14/14 override
   match).
**Ships as:** token-catalog override-merge rev first, then org-tla-voting
**2.2.0** — rollup builder enrichment only. No new crons, no new output files.

---

## 0. Locked defaults

- **D1 — universe: direct bribes, measured not disclaimed.** Source =
  `events/bribes/` `bribe_add` records (173 at spec date; genesis-complete
  2024-08-28 → now; 16 bribers; zero records missing `briber`). The board's
  universe banner sources its numbers from the schema-5 `bribe_ledger`
  (state totals vs event attribution) — e.g. "attributable direct bribes
  cover X% of total bribe value; the remainder is contract-initiated flow
  the state ledger sees but no event attributes." Measured share, no static
  note. Unattributed flow never silently merges into per-briber totals.
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
- **D4 — price join: reuse the deployed machinery.** `makePriceLookup`
  (priceOn / latestPrice, 7-day nearest) and `buildTokenMap` from
  `lib/rollups.js` — no new join code. Requires dependency #1 so the token
  map carries override-identified symbols. Denoms the merged catalog still
  can't name land in `unpriced[]` with raw amounts — never dropped, never
  guessed. `unpriced[]` entries MAY carry a `display` field when a committed
  trace record exists in PROBES-denom-traces (DGN: 7 events, named,
  unpriced — no price series, no ratio path). Same-token-multiple-denoms
  merge at symbol level via the catalog's `variation_of` — the rollup never
  hardcodes merges.
- **D5 — labels are the WHO layer's job.** Briber display names come from
  address-catalog; the rollup stores `briber` (address) + `label` (nullable
  join). Missing label → site shows short address. Per the public-output
  framing: labels are descriptive protocol/treasury names only — no motive,
  no politics, nothing attributive in committed files.
- **D6 — output: rollups.json schemaVersion 6, merged (DeFi Patriot,
  2026-07-17 — no new artifact).** The existing `bribers[]` entries (today:
  event_count, via, by_epoch) are enriched in place:

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
  "bribers_order": [ "terra1…" ]    // usd_at_placement desc; all-unpriced
                                    // bribers ranked last by bribe_count,
                                    // flagged — never ranked by invented USD
  ```

  (`via` counts are retained from schema 5; `bribe_ledger` continues to carry
  the measured attribution share — no coverage note anywhere.)

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

## 2. Probes — DONE (see PROBES-denom-traces.md, 2026-07-17)

All 17 IBC denoms traced. 14/14 matched existing overrides (chain-exact
reconciliation of the curated layer); INJ + stATOM entries added same day;
DGN identified (`udgn`, channel-582) as the only bribe-only, unpriceable
token. With dependency #1 shipped, expected pricing coverage: 166 of 173
events fully priceable, 7 DGN events named-but-unpriced.

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

0. Dependency #1 first, own verify: rebuilt catalog snapshot names all 16
   override-identified denoms; a mock `buildTokenMap` over it resolves
   bWHALE/ampWHALE/FUEL; existing consumers unaffected.
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

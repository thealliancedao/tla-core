# SPEC — Alert Center (index.html default window; replaces Ecosystem Pulse and the launch popup)

Status: DRAFT for approval · Author: Claude + DeFi_Patriot · 2026-09-17
Supersedes SPEC-landing-pulse.md (the Pulse tile is retired). Sibling: SPEC-mobile-app.md (Today tab shares the rules).

## Purpose (owner, 2026-09-17, verbatim intent)

The site is where people come to be alerted early to things happening across Terra and the big protocols. The
Pulse section is not read and not trusted; it goes away. In its place, the FIRST thing on the home page is a
grid of tiles that answers one question at a glance — "is anything happening that I should look at?" — and
opens into the detail when the answer is yes. Green when nothing needs attention; amber, pulsing, when
something does. No launch popup: the grid is the default window.

## Tiles (v1 set — six; the owner's sketch had five, TLA VP/APR moves get their own)

| Tile | Counters (each a number; tile is amber if any > 0) |
|---|---|
| Ecosystem | TLA · Projects · PD · Assets |
| Props | Live · Veto lock · Executed |
| TLA | VP moves · APR moves · Bribes / locks |
| NFTs aDAO | Marketplace · Staking · P2P |
| NFTs Pixel Lions | Marketplace · Staking · P2P |
| NFTs TLA Locks | Marketplace · Locks · P2P |

Each counter counts EVENTS IN THE WINDOW, not lifetime state. Window = "since you last looked" (marker stored
on the device, the app's marker) with a 24h / 7d toggle for anyone without a marker. Props are the exception:
Live and Veto lock are STATE counts (open now), Executed is in-window.

States: **green** — every counter 0 (label "Nothing needs your attention across Terra right now"; the tile still
shows its counters as 0 so quiet is visibly measured, not assumed). **amber, pulsing** — any counter > 0.
**red, steady** — only for events on the SELECTED ADDRESS (an NFT of yours unstaked, an offer on your listing,
your lock unlocked): red is "this is about you", never "this is big". Red beats amber.

Click a tile → expanded panel, one tab per counter, rows in the Today-tab grammar: `label · one value · time
ago · link`. The link goes where the thing is acted on (explorer card, DAODAO prop, Eris lock page, Astroport
pool, BBL/Atrium listing — or the explorer for a chain-only listing). Nothing is explained in the tile; the
panel reports, the linked page explains.

## Rules table — what counts, from which product, at what threshold

Every row is derived from a product that exists today unless marked GAP. Thresholds are the owner's to set;
proposed defaults below. Every threshold is a named constant in one place (`lib/alert-center.js`
`RULES`) and every row carries `rule`, `source` and the raw value that tripped it — a reader can always see
why a tile is amber.

**Ecosystem**
- TLA: gauge added / removed / bucket changed / take-rate changed (tla-voting registry + vote-state diff,
  epoch over epoch); epoch flip in window (informational, counts once).
- Projects: a watched project's contract set changes (address-catalog diff) — GAP until address-catalog
  publishes a diff; v1 counts 0 honestly.
- PD: directive / PD bribe drift events (SPEC-pd-directive-watch) — GAP; v1 counts 0.
- Assets: entries in the curated `catalog/asset-alerts.json` whose status is `migrating | winding_down |
  watch` — ALWAYS counted while active (a migration is an alert until its deadline passes). First entry:
  USDC.n → USDC.inj (Circle wind-down; mint stop 2026-10-13, CCTP step-down from 10-31, end 2027-01-12).
  The panel lists the affected TLA gauges with their VP share and staked USD (epoch 203: four Astroport
  gauges, 36.5% of graded VP, ~$830K staked).

**Props** (dao-governance + governance/props): Live = status voting; Veto lock = passed, in timelock;
Executed = executed in window. Signal-only props count but are labeled.

**TLA**
- VP moves: a bucket or gauge whose VP moved ≥ 5% of its own VP epoch-over-epoch (tla-voting vote-state) or
  ≥ 5% in 24h (member-data.system.vp_voting_per_bucket daily) — default 5%.
- APR moves: eris-apr per-gauge APR moved ≥ 5 percentage points or ≥ 25% relative in 24h — default both.
- Bribes / locks: bribes added in window (tla-voting bribe-state — mid-epoch capture is a known GAP; counts at
  the boundary until live capture lands); locks unlocked in window (member-data locks for the selected address
  → red; collection-wide count → amber).

**NFTs (per collection: aDAO · Pixel Lions · TLA Locks; sources: nft-collections/<slug>/ledger + inventory
snapshots + floor-history)**
- Marketplace: sales; new listings that SET A NEW FLOOR (listing price < prior floor); floor drop ≥ 10% in
  24h (floor-history per tier); chain-only listings (inventory `source:'chain_only'`, C.6) — any; offers
  placed — GAP (no product captures offers; queued capture item in nft-inventory).
- Staking: stakes, unstakes, Enterprise unstakes, breaks; MASS unstake = ≥ 5 NFTs or ≥ 1% of staked supply
  unstaked in 24h (one row, "mass", not five); pending-claims for the selected address → red.
- P2P: transfers not through a venue (ledger `transfer` with neither side a venue contract); NFT switch and
  Boost-venue sales (SPEC-activity-feed §2f, §2c); MASS transfer = ≥ 5 from one wallet in 24h.
- TLA Locks: "Locks" replaces Staking: merges, lock adjustments, ampLUNA ↔ arbLUNA conversions, withdrawals.

## Architecture — compose on the page, no new cron

- `lib/alert-center.js` (site lib, like tile-feed.js): `buildAlerts(products, {since, window, address})` →
  `{ tiles: [{key, state, counters: [{key, n, rows}]}], generatedFrom }`. Pure function over already-loaded
  products; index.html and app.html both call it. The rules table above IS this file's `RULES`.
- Inputs are the products index already fetches (ledger months, inventory summary/nfts, floor-history,
  governance index, tla-voting vote-state/bribe-state, eris-apr, member-data) plus ONE new curated file:
  `tla-core/catalog/asset-alerts.json` — hand-edited: `{denom, symbol, status, headline, dates{}, replacement,
  source_url, note}`. lp-grades and votion read the same file (see "Asset wind-down" below).
- "Since you last looked": device marker (localStorage / app storage), set when the panel closes; the app's
  existing marker is the same key.
- No page grows: the alert center takes the Pulse section's slot and the launch popup's job. Live Activity
  stays as the detail feed; the alert panel's NFT rows link into it.
- Doctrine as applied: blank beats phantom — a counter whose source is a GAP renders 0 with a "not captured
  yet" note in the panel, never a guessed number; every row carries its source and raw value; thresholds are
  named constants, never literals scattered in render code.

## Asset wind-down (the mechanism that does not exist today)

`catalog/asset-alerts.json` is the curated folder. lp-grades reads it and stamps every pool holding a listed
asset with `alert: {status, headline, deadline}`; the grade is NOT changed (the rubric stays honest about
yield) but the pool is excluded from any "recommended" set and rendered with a "winding down · migrate by
<date>" pill on new-here / ally / tla-stats / Votion pages. Votion's vault optimisation reads the same field
and skips flagged pools. When the asset's deadline passes, the entry flips to `retired` and the pool rows say
so until the gauge is removed.

## Gates

jsdom on real fixtures, relations not literals: (1) with an empty asset-alerts file and a fixture window that
holds no events, every tile is green and every counter renders "0"; (2) with the real ledger month, each NFT
counter equals the count the rules table derives from the same fixture; (3) a staged asset-alerts entry
turns Ecosystem amber, lists the exact gauges lp-grades flags, and those gauges disappear from the recommended
set on new-here; (4) the selected-address red state fires only on that address's rows; (5) closing the panel
sets the marker and re-render yields green.

## Build phases (one delivery each, in this order)

0. **Asset registry + wind-down**: `catalog/asset-alerts.json` (USDC.n entry), lp-grades `alert` field, votion
   skip, pills on new-here / ally / tla-stats. Date-bound (Oct 31) — ships before the rest.
1. **Alert center v1**: `lib/alert-center.js` + index grid with Ecosystem·Assets, Props, NFTs aDAO (everything
   already captured); Pulse removed; launch popup retired; marker; gates 1–2, 5.
2. **TLA + the other collections**: VP/APR/bribe rules, Pixel Lions and TLA Locks tiles, Ecosystem·TLA.
3. **Capture gaps**: offers (nft-inventory), mid-epoch bribes (tla-voting live capture), Projects/PD diffs.
   Each closes a "0 · not captured yet" note.

## Open decisions for the owner

- Tile set: six as above, or fold TLA into Ecosystem (five, as sketched)?
- Thresholds: floor drop 10% · mass unstake 5 / 1% · mass transfer 5 · VP move 5% · APR 5 pts / 25%.
- Red state reserved for the selected address only — agreed?
- Phase 0 ahead of crons (c) bLUNA USD, (d) heap sweep and B.2 — agreed?

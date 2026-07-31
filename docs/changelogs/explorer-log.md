# NFT Explorer Changelog

This is the change history for `nft-explorer-index.html` (the NFT browse / search page).
Newest revisions on top. Times are UTC.

---

## Rev 6.1 — 2026-07-17
### What changed (nft-explorer-app.js)
- **aDAO custody wallets pinned on the Holder Leaderboard** (community request):
  four DAO wallets render as labeled, unranked informational rows above the
  human rankings — DAO Unminted 5,828 · DAO Broken 898 · DAO Broken Enterprise
  100 · DAO Multisig Vetoer 2. Broken sum = 1,000, matching the Props 64–69
  modal exactly. Human ranks unchanged.
- **Honest-attribution guard:** the old Enterprise contract also custodies ~81
  user stakes the inventory cron cannot attribute (`enterprise_unattributed`);
  those stay excluded from the board entirely rather than being mislabeled as
  DAO-owned. Known attribution gap, cron-side, recorded here.
- **Label added:** multisig vetoer wallet now in SYSTEM_WALLET_LABELS.

## Rev 6.0 — 2026-06-11
### What changed
- **Deep-linkable tabs:** `?view=analytics|wallet` opens that tab directly (collection = clean URL); tab switches pushState so back/forward navigates tabs; filter changes preserve the active tab in the URL. Enables direct links from the dashboard and external posts.
- **Per-tab analytics:** tab switches register as SPA navigations with Vercel Web Analytics and fire an `explorer_tab` custom event.
- **Cache-busted assets:** app JS + CSS loaded with `?v=6.0`, bumped each release — fixes the "committed but the page didn't change" class of problem permanently.

## Rev 5.9 — 2026-06-11
### What changed
- Buyers/sellers trajectory charts moved into a fixed-width center column (badge stacked below); column hidden on mobile so rows stay clean on phones.
- Right-edge chart labels (today's listing floor / LUNA price) de-collided — sorted, min 11px apart, clamped in-plot, dark halo stroke for legibility over lines.
- Floor-history legend made readable: larger representative swatches, lighter text, wider spacing.
- Cache-busting versioned asset URLs introduced (`?v=5.x` on app JS + CSS), bumped each release — fixes "committed but page didn't change."

## Rev 5.8 — 2026-06-11
### What changed
- **Floor-history chart completed:** historical listing floor upgraded from a mid-line to a translucent **USD-range band** per period (cheapest listing sampled at overlap start/mid/end via daily oracles — a LUNA-denominated ask swings in USD, a SOLID-denominated ask stays flat, both render honestly); **legend row** added (sales range / median / listing band+mid / today's floor / LUNA / no-sales tick); stale "overlay arrives later" footnote removed; **LUNA price overlay** (own scale, right-edge label, toggleable) so floor moves read against the token's USD move.
- **Top buyers/sellers:** sparkline replaced with a 12-month **ownership-trajectory line** (holdings level reconstructed as current holdings minus later net marketplace trades; green/amber/red by year net; hover any point for the month's estimated holdings).
- **Click-to-explain:** Market cap, Mark price, All-time volume, Backing/NFT, Total backing, Supply, and Nakamoto coefficient are now clickable (ⓘ) — each opens a methodology modal with the live numbers substituted into the formula (e.g. mcap = Σ tier mark × circulating; volume = token amount × USD price on sale date from daily oracles).

## Rev 5.7 — 2026-06-11
### What changed
- **Wired the new cron deliverables:** `broken-at.json` (exact sale-time tier classification — Broken-view warning replaced with "tiers exact via on-chain break timestamps"; mid-2025 pre-break sales reclassified to base), `listing-history.json` + daily LUNA/bLUNA oracles (historical listing-floor step-line on the floor-history chart, valued at period-midpoint token prices; SOLID treated as $1).
- **Floor-history chart paging:** ‹ older / newer › buttons step 12-period windows through the full Dec-2023→now history (monthly + weekly).
- **Mark price & market cap:** per-tier mark = midpoint of sales floor & listing floor (market-maker mid); Mark column added to Floor-by-tier; hero rebuilt — Market cap (Σ tier mark × circulating supply) headline with FDV subline, Mark (base), all-time volume, highest sale. "Value today" stat removed.
- Total backing tile now whole-number USD; Nakamoto coefficient shows a zone scale (1–3 highly concentrated / 4–7 concentrated / 8–15 moderate / 16+ distributed) with marker + label; top buyers/sellers rows carry a 12-month net-position sparkline (green/amber/red by year net, marketplace trades only); Biggest sales is now a top-10 thumbnail grid.
- View toggle (Collection | Analytics | Wallet) restyled from a centered pill block to left-aligned underline page-tabs so it no longer reads as a second nav bar.
- Defensive liveness filter: open-ended listing-history segments only count if the token is currently listed (guards the band against the residual ghost 14765 in the backfill — flagged to cron).

## Rev 5.6 — 2026-06-10
### What changed
- **Investor panels on Analytics tab**: Supply screener (Max 10,000 / Circulating 4,172 / Staked+DAO-controlled 3,049 / free float, stacked supply bar); Governance concentration (Nakamoto coefficient — currently 4 — top-1/5/10 VP shares from `summary.daodao_stakers`); Floor by tier (Broken / Base / Phoenix: listing floor vs sales floor with spread, backing reference).
- **Floor-history chart**: sales-derived, 12W/12M × tier selectors; per-period low→high bar with median dash, gray tick for empty periods; dashed reference line at today's listing floor per tier; explicit warning on the Broken view (sales classified by current broken state pending `broken-at.json`).
- Day-one catch: the Floor-by-tier panel surfaced a phantom $17.59 base listing floor — traced to a BBL listing-resolver bug cron-side (ghost auction 14765 + 6 missing live listings; verified vs warlock). Real base floor ≈ $101 / spread ≈ −6%. Panel self-corrects when the resolver fix ships. Atrium $1.02 broken floor verified real (relist after a bot-test round trip).

## Rev 5.5 — 2026-06-10
### What changed
- Matching-traits control: hover tooltip explaining P+I / P+I+O home-system matches (tooltip support added to the shared filter-item builder).
- Analytics most-traded thumbnails: switched from direct ipfs.io (rate-limited on bursts → random blanks) to the gallery-card pattern — Cloudflare CDN primary, IPFS gateway onerror fallback.

## Rev 5.4 — 2026-06-10
### What changed
- **Rarity wired to canonical files** (`adao-rarity-intended.json` + `adao-rarity-bbl.json`, hard-fail gates, join by token_id). Intended/BBL rank toggle (sessionStorage), BBL disclaimer with live `built` date, card line → "Rarity 40, Rank 24" / "Unranked", rank-aware Sort By (Ranking best-first default; legacy URL sort values mapped), Rarity filter dropdown relabeled "Rank" (still 1–40 grade), internal sub-rank computation removed, Pampa→Pampas fix (P+I 864→967, P+I+O 74→80), footer: Sorting Explained + Snapshot Tool removed, Rarity Explained → link to rarity-explained.html.
- Staged on `nft-explorer-test.html` + `nft-explorer-app-test.js`, then promoted.

## Rev 5.3 — 2026-06-10
### What changed
- Analytics feedback round: volume chart Linear/Log toggle (default Log — early-2024 peak was crushing recent months); royalties tile now leads with current USD ($-when-received as sub-line); highest sale added to hero + Biggest Sales card; buyer/seller leaderboards enriched with current-holdings behavior line (accumulating / selling / exited); Flip P&L collapsed to a one-line trading-character summary; Atrium column added to holder leaderboard (9-col grid) and selected-wallet stats.

## Rev 5.2 — 2026-06-10
### What changed
- **Analytics tab added** (Collection | Analytics | Wallet): all-time volume hero with monthly sparkline, backing/royalties/listed tiles, volume-over-time chart, top buyers/sellers, most-traded NFTs (thumbnails), biggest sales, sale frequency, paid-in split. Data: `data/v2/nft-analytics.json` + `summary.json` + `sales-enriched.json` only; tab-scoped hard-fail error state. Hand-rolled inline SVG charts, no new CDN deps.
- `SYSTEM_ADDRESSES` set (4 DAO wallets + DAODAO/BBL/Atrium/Boost contracts): excluded from holder leaderboard; wallet view shows amber "DAO / system wallet — not an individual holder" banner.

## Rev 5.1 — 2026-06-10
### What changed
- Holders dropdown: DAO wallets labeled — DAO Unminted (…5vzm), DAO Broken (…4l7v), DAO Broken Enterprise (…8tdv); small …8ywv left unlabeled by design. Address-map lookup only.

## Rev 5.0 — 2026-06-09
### What changed
- **Chain-of-truth migration**: STATUS_DATA_URL → `nft-inventory-data_2026/data/v2/nfts.json`; `mergeNftData` rewritten for the v2 `records[]` schema (real_owner, listing object, corrected classification — Enterprise badge now the ~403 real stakes, not the 898 treasury NFTs); deving.zone removed from all paths incl. the admin snapshot button.
- **Hard-fail integrity gates** (good data or no data): throws on missing/short feeds (<10,000 records), on any NFT failing owner resolution, and on a missing `records[]` — no legacy fallback, no placeholder rendering.
- Cron-side phantom-whale fix consumed: staked NFTs attribute to real stakers; dropdown/leaderboard stake weights correct.

## Rev 4.13 — 2026-05-08

Cleanup pass after first user review of the unified chrome rollout.

### What changed
- Removed duplicate logo row — the second aDAO logo + Terra logo from the original header are gone (the shared header above already provides them)
- **Map view removed entirely** — the Collection / Wallet / Map toggle is now Collection / Wallet only. Map view was deemed too complex for the value it provided. The `<canvas id="space-canvas">` and `<div id="map-view">` containers were removed; the JS handlers in `nft-explorer-app.js` still reference these but are null-safe so no errors
- Fixed changelog modal — was fetching from `/main/logs/explorer-log.md` (404), now fetches from `/main/explorer-log.md` to match where the file actually lives in `website-adao-core`

---

## Rev 4.12 — 2026-05-08

Initial entry — page brought into the unified site chrome system.

### What changed
- Added unified site header (logo + 5-tab top nav + Terra logo)
- Added mobile bottom tab bar (Home / NFTs / Lore / TLA / DAO) with NFTs tab highlighted as active
- Added unified footer with Rev number + Changelog link (this changelog)
- Original page-specific controls preserved (Collection / Wallet / Map view toggles)

### Earlier history (untracked)
This page has been through multiple iterations of NFT browsing UX, filtering, search, wallet view, galaxy map view, badge system, and rank/rarity displays. Starting point of formal changelog tracking is rev 4.12 — guesstimate based on rough development scope to date.

Going forward, each meaningful change to this page will get its own entry here.

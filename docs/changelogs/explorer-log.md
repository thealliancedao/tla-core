# NFT Explorer Changelog

## 2026-08-24 — release-history 1.6 — every phase number chain-exact from provenance; estimates retired

Owner walk: the page was "pieced together from sales-bot data and roundabout
guesses". The genesis walk (nfts/adao/provenance, FCD archive complete to
2025-01-07) had already reconciled every candy machine (loaded = sold +
returned + governance moves) and even carried a `release_history_verification`
block against this page. Applied: Phase 1b **127 sold** at 50 LUNA (page said
"181–385 est."; 352 loaded, 225 returned), Phase 2a **525** at 75 (page
"296–500 est."; 1,000 loaded, 473 returned, 2 gov moves), Phase 2b rounds
**197 / 459 / 644** (page had no counts) = **156,205 LUNA** (page 148,390,
back-computed from a guessed ~114 average; true weighted average 120.16),
windows corrected (1b to Mar 4, 2a to Mar 18, round 3 Jun 4–5). USD is now
each token's own mint-day LUNA price (no gaps in luna-usd-daily): 1b
$32.59–$41.55 avg $34.24 · 2a $52.82–$89.90 avg $54.62 (the "$1.60 LUNA"
spike was a memory; max was $1.20) · 2b avg $78.79; hero mint-cost range
$33–$90 (was $32–$120). The ROI constants follow. The "681 combined /
split uncertain" note is replaced by where the numbers come from. Multisig
462 + 538 = 1,000 and breaks 462 (Feb) + 539 (Jun) confirmed on chain. Gate
+M1–M7: the page's numbers must equal `provenance/summary.json:mint_story`
(12/12). Knowledge base: five sourced facts (Ally reward_weight 0.008 from
gov prop #4801, GoA/claim history, Growth Proposal plan, chain mint story,
multisig breaks) + a distribution section in alliance-dao.md — the
"reward_weight not recorded" gap closed; the help bot can now answer it.


## 2026-08-24 — release-history 1.5 — floor from the org market product; hardcoded $43 phantom removed

The page read the GitHub API of `defipatriot/tla_json_storage` (retired, 403)
for the NFT floor and, on failure, used a hardcoded $43 "Estimate" in the
floor tile, the ROI comparison and the backing insight — a phantom on a public
page. Now: `nfts/adao/snapshots/floor-history.json` latest row, base tier
(listing floor for the tile, sales floor with its sample size for the market
line); unavailable → "—" and the insight text drops the comparison instead of
inventing one. Gate `gate-release-history.mjs` 5/5.


This is the change history for `nft-explorer-index.html` (the NFT browse / search page).
Newest revisions on top. Times are UTC.

---

## Rev 4.30 — 2026-08-23 — MILESTONE: the Explorer walk is complete

Round-number close on the full arc (4.20→4.27 in one day): field-contract
repair, legacy strip (~762 dead lines), Wallet tab (UNCLAIMED + VP% + backing),
holders dropdown + shareable filter URLs, hero sentence, owner rework, perf
part 1+2 (16.3MB → 442KB first paint with parallel-run fallback). Capture side:
Atrium vocabulary fixture-locked, custody honest (C.6), market-history with the
unresolved-exit sentinel, three lost sales recovered, gap register standing.
Every number on the page is gated against the products that produce it.

## Rev 4.27 — 2026-08-23 — perf part 2: the page boots on 442KB

The explorer now paints from explorer-bundle.json — 442KB instead of the 16.3MB
it loaded before. The gallery, all filters, ranks, status badges, listing
prices and the amount counter render immediately from the bundle; owners,
listing detail and grades hydrate from the full products in the background
(the leaderboard and holders dropdown fill in seconds later, with an honest
"holders loading…" in the gap — never a fake "0 holders").

Parallel-run by construction: ANY bundle problem — missing file, schema drift,
thin metadata join — falls straight through to the original full boot,
untouched. The bundle earns trust before the fallback is ever considered for
removal.

Gate proves all three paths with a latch: the full products are HELD BACK while
the test asserts the page painted from the bundle alone (20 cards, counter at
10,000, leaderboard deliberately empty), then released to assert hydration
completes; a second jsdom instance 404s the bundle and asserts the old boot
still renders gallery + leaderboard.

This closes the NFT Explorer walk — capture layer, page, and performance.

## Rev 4.26 — 2026-08-23 — rank tiles sized + perf quick wins (page side of the bundle next)

Rank System buttons regained their proper size (the 4.25 move dropped the width
constraint — they collapsed to text width). Insights beacons added to the three
bare pages (help, system-health, transparency-hub). Preview-tile hover guarded
against re-setting the same image src (the HAR's 33 duplicate PNG requests).

Cron side of the perf bundle shipped in platform-crons: explorer-bundle.json —
all 10,000 tokens' traits, grade, both ranks, status and listing USD in 437KB
(vs the 16.3MB the page loads today), reconciled to summary.json or it refuses
to publish. The page swap (boot on the bundle, hydrate the rest in the
background, BBL grade detail lazy) is the next delivery, after the product
lands and verifies on a warm run.

## Rev 4.25 — 2026-08-23 — owner-driven rework: holders dropdown, layout, pill copy

Live verification feedback, applied same-day:

**Share button removed** — the URL alone is the share mechanism (owner-verified
it round-trips); a button duplicating copy-the-URL was clutter.

**Holders moved into the top row as a dropdown.** The panel tile is gone;
between Search-by-ID and Amount there's now a scrollable dropdown — names with
counts, sorted by holdings, live against the current filters ("155 holders of
selection" for Staked→DAO, rows summing to exactly 1,631; "All holders (N)"
when unfiltered). Click a holder → the unified header selects them.

**Rank System moved down** to where the panel used to sit, below Display
Options — it's a display mode, not a search input, and the top row is for
searching.

**Copy on the header pill** (lib/address-picker.js — every page gets this):
with a wallet selected, a copy icon sits right on the pill — no need to open
the full finder. Feedback verifies WHAT was copied: the icon flips to a check
and the tooltip shows the short address for 1.6s.

Gate reworked for the new layout: Share absent, rank buttons outside the top
row, dropdown label + row-sum exact (1,631), URL round-trip intact, pill copy
wiring asserted.
## Rev 4.24 — 2026-08-23 — the tab reads itself (hero sentence) + filter counts labeled

**Hero sentence.** The Analytics tab now opens with one line written FROM the
data, per the page doctrine (hero number → sentence from data): sales all-time
with at-sale dollars, minted of 10,000, listed now with ask-side liquidity, and
the last sale with honest recency — "last sale 1d ago (#6192 · 50 SOLID)" today,
and it will say "312d ago" just as plainly in a quiet market. Never a static
caption; empty products drop their clause instead of faking one.

**Filter counts labeled.** The bare integers floating above the status sliders
("1631" hovering over Ent–DAO) read as noise. They now render as "1,631 match"
— locale-formatted, hover-explained (matches at this slider position within the
current filters), and blank at zero.

Gate: hero facts asserted against the live enriched tail (recency check adapts
to the real last sale), and the staked filter's count must read "1,631 match"
exactly.

## Rev 4.23 — 2026-08-23 — the sales-flyer pair: holders of this selection + Share view

**Holders of this selection.** The old Holders dropdown (hidden in Rev 4.16)
reborn as a live panel: narrow the collection with any filter and the panel
shows exactly who holds the result and how many each — "1,631 NFTs across 155
holders" for Staked→DAO, chips sorted by count, "+N more" expands. Click a
holder and the unified header selects them (every page follows). Hidden when no
filter narrows the set — the full-collection answer is the Wallet-tab
leaderboard, not a duplicate.

**Share view.** The URL has quietly carried the whole filter state since the
deep-link work — now it's discoverable: one button refreshes the URL and copies
it. Any filtered view, rank system included (`ranks=bbl` now serialized too),
reopens exactly from the link — filters, sliders, trait picks, sort. Built for
sales flyers and "look at these" links.

Gate: UI-driven — toggles the Staked→DAO filter exactly as a user would, then
asserts the panel appears, the summary counts 1,631, expanded chips sum to
1,631 exactly, and the URL carries `staked=true&staked_pos=2`.

## Rev 4.22 — 2026-08-23 — Wallet tab: the 17 stop being invisible

**UNCLAIMED column.** Seventeen NFTs sit unstaked in DAODAO custody with their
claims never completed — attributed to their real owners since C.6, but fitting
none of the board's columns, so they either vanished from their owners' rows or
broke the row totals. New column between Enterprise and Broken, amber, with a
hover explaining the state. (The 2 contract-held unattributed tokens stay off
the board by the same precedent as the 81 Enterprise-unattributed — visible in
the Supply screener, never mislabeled as someone's holding.)

**VP % column.** Every DAODAO staker's share of staked voting power, straight
from the stakers product, sortable — the holder board doubles as a governance
view. Blank (—) for non-stakers, never zero-faked.

**Backing on the wallet view.** Searching a wallet now shows what its unbroken
NFTs still carry: count × per-NFT ampLUNA and the product-computed USD, live
from the summary feed. Broken NFTs excluded (their backing was already
redeemed) — consistent with the corrected badge key.

All three are enrichment, not gates: if the summary feed ever fails, the page
loads with blanks in those spots rather than blocking.

Page gate extended and rebased onto the REAL page markup (jsdom parses
nft-explorer-index.html, initializeExplorer runs end-to-end): sort-click drives
the new columns — Unclaimed sums to the pending 17, VP% sort surfaces the true
top staker, backing line math asserted exactly.

## Rev 4.21 — 2026-08-23 — legacy strip (the page sheds its dead weight)

**One footer, one changelog.** The page carried TWO footers: the lib footer
(rev, live changelog from tla-core, health dot) and a stale hand-copied one
frozen at Rev 4.13 with its own changelog modal — including a credit to a data
source this page stopped using months ago. The duplicate footer, its modal, its
~90 lines of modal JS and orphaned CSS are gone; the slim page footer keeps the
page-specific links (Rarity Explained, Badges Explained, NFT Contract, Audit).

**~760 lines of unreachable Snapshot Tool removed.** Its trigger button no
longer existed in the page; it also re-downloaded the 6.5MB inventory a second
time and fetched a retired epoch file. The org products it duplicated are the
canonical source.

**Badge key tells the truth about BROKEN.** The old text said broken NFTs are
"eligible for rewards" — exactly backwards. Now: backing already claimed, NFT
and vote stay with the owner, excluded from future backing. Atrium added to the
key (text badge until a logo asset lands).

**The header VIEWING pill drives the Wallet tab.** Picking a wallet anywhere
loads it in the wallet search; opening the Wallet tab with a selection loads it;
clicking a leaderboard row selects in the header so every other page follows.
Dead cloudflare-ipfs.com fallback replaced with ipfs.io.

Page gate re-run green on live products (1,326 sales incl. the 3 recovered
Atrium sales, royalties tile live at 14,845 LUNA).

## Rev 4.20 — 2026-08-23 — Analytics tells the truth again (field-contract repair)

The capture layer was fixed first (classifyNftTx v2, market-history maintenance,
the 64 recovered batch-settle sales — see platform-crons changelogs); this rev
makes the page read what the products actually write:

**Four dead panels revived by field truth.** Volume over time read
`monthly.notional_usd`/`count` (product writes `usd`/`sales`) — blank chart.
Leaderboards read `x.notional_usd`/`x.count` — every row "$—". Most-traded read
a USD field the product never carried — now shows LUNA-equiv, labeled, never a
fake dollar. Trading character promised a realized-P&L the product never
computed — the line now states what IS computed (flips, % of sales, median
hold); P&L arrives with the portfolio cost-basis feature, not before.

**Royalties tile**: the old product field summed raw micro-units ACROSS payment
denoms (uluna + ubLUNA + …) — a unit-mixing number. analytics.js now publishes
denom-correct `royalty_luna` / `royalty_usd_today` / `royalty_by_denom` (each
sale priced through its own day); the tile reads those and shows an honest
"awaiting next warm capture" until they land.

**Conservative mark**: tier mark = the LOWER of sales floor and ask, matching
the site-wide 2026-08-03 policy (index.html) — the midpoint overstated whenever
asks sat above sales. One market cap across the site again.

**Governance concentration is DAODAO-only**: "2,034 NFTs staked" mixed 403
Enterprise stakes (no DAODAO vote) into a card titled DAODAO VP — now 1,631,
summed from the stakers themselves, and says so.

**Supply screener knows the new custody bucket**: pending + custody-unattributed
render as "Unclaimed (custody)" (currently 17+2=19) instead of the 2 leaking
into Free float. Spread colour un-inverted: a deep-negative spread (cheapest ask
far below what trades) is seller capitulation — red, not green.

**Gate (permanent): gate-explorer-analytics.mjs** — runs the real page script in
jsdom against the real committed products and asserts specific values in
specific cells (663 flips, $27.6K top buyer, 1,631 DAODAO, 17+2 unclaimed,
min-mark anchor, no phantom P&L). Requires `npm i jsdom`.

## Rev 4.16 — 2026-08-21 — unified chrome

Header + picker from the libs. Search-by-Address / Last-4 / Holders sections
(desktop, mobile, Wallet tab) hidden — the header picker drives the Collection
filter and the Wallet lookup (runs when the Wallet tab is active or opened).
Collection · Analytics · Wallet now on `SiteHeader.subnav`, synced with
`?view=`; the old view-tab buttons are hidden receivers for switchView().

## Rev 4.14 — 2026-08-20 — shared footer mounted

The explorer now renders the standard site footer (rev · changelog · System
Health) from lib/site-footer.js — previously its own footer with no health
dot. Cross-page consistency per the owner's audit.

## Rev 6.2 — 2026-08-19 — Atrium everywhere, listing prices, and the listings showcase

**Atrium was captured by the cron but invisible in the UI.** The Listed filter
offered only Boost/Both/BBL, so ~17 live Atrium listings could not be seen. An
audit found **11 more places** it was missing: card badge stack (an
Atrium-only listing produced NO badges), detail view (said "In Wallet"), wallet
stats and wallet Listed filter, map holder stats, system name map, snapshot
tool stats, status filter count. All now driven by one `MARKETPLACES` registry,
so a fourth marketplace cannot be missed piecemeal again.

**Marketplace chips replace the 3-position slider.** A slider cannot express
three venues, and cannot express "BBL + Boost but not Atrium" at all. Chips
toggle independently, show live counts, hide a marketplace with zero listings,
and refuse to let the user switch them all off (which would silently show
nothing).

**Listing prices now render** — the cron had captured `price_display`,
`price_token_symbol` and `price_usd` all along and nothing consumed them. Cards
show e.g. `2,500 bLUNA` with `$191.53`. Price sorting sorts on **USD**, not raw
amount: 125 SOLID vs 2,500 bLUNA is meaningless numerically. Unlisted NFTs sort
LAST in both directions rather than masquerading as $0, and the one
marketplace-owned listing with no ask says "No price set", not "$0".

**Listings showcase (new).** Pick up to 10 listed NFTs and export a
social-ready PNG: adaptive grid (1×1 → 5×2), art, id, marketplace, real ask +
USD, and a footer total that only sums listings which HAVE a USD price and says
so when some do not. Built on the existing `generateShareImage` foundation
(same canvas, same blob download that already works on mobile).

**Post options** — rank/rarity, days listed, vs floor, marketplace, full link.
- **vs floor is TIER-AWARE**: measured against the NFT's OWN tier floor
  (broken / unbroken / Phoenix). This matters enormously — the broken floor is
  $9.80 while the unbroken floor is $73.52, so a blended comparison was wildly
  wrong. If a tier has no other listing (Phoenix: zero today) the line is
  omitted rather than borrowing another tier's number.
- **Days listed uses CHAIN TRUTH.** First implementation used
  listing-first-seen, which records when the CRON first observed a listing —
  that series began 2026-08-17, so every tile showed an identical "2d+".
  `listing-history.json` carries `create_tx`, `from_height` and a real
  `from_ts` per listing; the OPEN segment (to_ts null) is the live listing.
  **64 of 65 match, with real ages up to 705 days.** Rendered as years/months
  past 60 days ("1.9yr listed"). Listings created after the backfill's
  2026-08-04 build fall back to first-seen and keep a "+" lower-bound marker.

**Logo fixed in BOTH post generators.** Each had independently-written sizing
that constrained WIDTH only, so the tall aDAO arrow computed a height larger
than the header band and rendered clipped/bleeding. Both now fit by whichever
axis binds first, with margin inside the band, and share one `POST_LOGO_URL`
(the site header logo).

**Other:** + picker moved to bottom-right (top-left is the eye, top-right the
badges) and the eye now hides the price pill and picker too — it exists to show
the ART with nothing on it. Status filters open by default. Atrium URLs
corrected to the real format (`atrium.markets/atrium/<contract>/<id>`); the
earlier guess would have 404'd.

⚠ **STAR MAP IS DEAD CODE.** `nft-explorer-index.html` defines only
collection / analytics / wallet — the map view was removed in Rev 4.13. ~750
lines (L3855–L4604) remain unreachable, with live functions interleaved.
Deliberately NOT removed here: it needs its own focused pass with browser
verification, not an untested deletion.

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

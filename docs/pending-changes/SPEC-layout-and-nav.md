# SPEC — Layout & navigation settlement (bug hunt → deep links → nav rethink)
_Status: DRAFT 2026-08-22. Owner direction: "make it easy and comfortable to
use, not something you need massive time to figure out." Sequence: A then B,
then decide C with the owner before building._

## A. Bug hunt + layout optimisation (first session)
Method, per page, desktop AND mobile (375px), in this order: index, tla-stats
(all 6 tabs), member-portfolio, nft-explorer (3 views), dao (3 DAOs × 2 tabs),
adao-lore, slippage, help, transparency-hub, then the 12 secondary pages.
Checklist each: header/picker/ticker/tab-tile/footer present and identical;
tab tile is the FIRST tile; active tab right after deep link + back/forward;
no page-level header/footer/bottom-bar remnants; content column max-w-7xl;
16px base; no horizontal scroll on mobile; bottom bar pinned, help bubble
above it; picker selection flows to the page's receiver; console clean.
Output: one table (page × check) in this spec, fixes shipped per page, gated.
Known suspects: index mobile spacing under ticker; tla-stats epoch slot on
mobile (hidden — decide: show compact); explorer Wallet view header; slippage
narrow column vs 7xl; lore canvas under bottom bar; secondary pages' own
sub-navs (tools/tutorials) not yet on `subnav`.

## B. Deep links — every view shareable / bookmarkable
Contract: URL = page + `?view=<tab>` + `&wallet=<addr>` + `#<section-id>`.
- `SiteHeader.subnav` writes `?view=` on tab select and reads it on load
  (explorer already does; extend to tla-stats hash tabs, dao DAO/Members|Props,
  portfolio, hub).
- Every tile/section gets a stable `id` and a small "link" affordance (copy
  URL to clipboard, explorer-style verify card) — lib helper
  `SiteHeader.linkable(el, label)`.
- Picker keeps `?wallet=` (done). Saved wallet + add-to-home-screen (done).
- A `routes.json` product (tla-core/docs/site/routes.json): page → views →
  sections → what data lives there, with the canonical URL pattern. Built
  by hand once, then the bot reads it (C) and the typography/nav rethink
  uses it as the sitemap.

## C. Nav rethink (decide with owner after A+B)
Options to weigh, not decided:
1. Keep 5 top tabs; add a "Find" mega-menu (from routes.json) — every
   section one click, searchable (the picker's finder pattern).
2. Regroup: Home · Explore (NFTs+Lore) · TLA (Stats+Portfolio+Slippage+Docs) ·
   Govern (DAO+proposals+audit) · Help — fewer, task-named tabs.
3. Left rail on desktop (sections), bottom bar on mobile (same 5) — common
   in dashboards; biggest change to pages.
Whichever: the lib renders it; pages do not change. Mobile first-class.

## D. Bot routes users to the data (after B)
Help agent reads routes.json: "where can I see X?" → the exact URL (with
`?wallet=` filled from the pinned wallet) + one line on what the view shows.
Rule: only link routes that exist in routes.json; never invent a URL.

## E. Then: tiles — LP Grades, aDAO recommendations, slippage (separate specs).

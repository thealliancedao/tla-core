# SPEC — Unified header, global address picker, uniform footer
_Status: DRAFT for owner sign-off · 2026-08-21 · build only after the
questions in §7 are answered. Owner's intent (verbatim spirit): "make all the
core pages look and function the same so it's familiar and comforting to use."_

## 1. Goal
One chrome on every core page: the **index header** (logo · Home · NFT Explorer
· aDAO Lore · TLA Stats · DAO · globe) everywhere, the **TLA Stats page theme**
everywhere, one **footer** (already `lib/site-footer.js`) with a Help link
added, and a **global address picker** in the header that drives every page
with per-address data. System Health (transparency-hub) and Help get the same
header so there is always a way back.

Precedent: `lib/site-footer.js` (2026-08-12) — one lib, mounted per page, no
build step. This spec does the same for the header: `lib/site-header.js` +
`lib/address-picker.js`.

## 2. Pages in scope (core)
index · nft-explorer-index · adao-lore · tla-stats · dao · member-portfolio ·
slippage · transparency-hub · help. (tools / tutorials / docs pages: phase 2,
header only.)

Per-page address consumers today (each with its own picker/URL param):
- tla-stats: `#member-selector` (View member) → `?wallet=`/localStorage
- member-portfolio: `?wallet=` + localStorage
- nft-explorer-index: Search by Address / Last-4 / Holders dropdown
- slippage: Zap planner "name or terra1…"
- dao: member search
- help drawer: wallet picker chip (localStorage)

## 3. Header (`lib/site-header.js`)
- Markup = index header, theme tokens = tla-stats (dark #0b0d12 base, cyan
  accent, mono numerics). Active tab highlighted from `data-page`.
- Right slot: the **address picker** (compact pill: avatar/NFT image · name or
  `terra1…x77ulw` · ▾). Left of the globe.
- Mobile: tabs collapse to a row of icons; picker becomes a search icon that
  opens the full panel.
- Mount: `<div id="site-header"></div>` + `SiteHeader.mount({page:'tla-stats'})`.
  Pages keep their own sub-nav (tla-stats tabs, explorer Collection/Analytics/
  Wallet) below it.

## 4. Address picker (`lib/address-picker.js`)
### 4.1 Roster (one merged list, built once per session, sessionStorage)
Same law as tla-stats/slippage `ingestMembers`: aDAO members (positions
product, rich) → TLA participants (participants product) → Lion DAO names /
Pixel Lions / named lockers (address-catalog) → Votion vault addresses. Dedupe
by wallet; richest record wins. Each entry: wallet, display name(s), groups
(aDAO / Lion DAO / Pixel Lions / Ally / TLA locker / Votion), nft_count,
staked_nft_count, tla_vp, tla_deposits_usd, vp_potential_gain, nft_image_url.
Registry-first and uniform: no wallet is named unless the catalog names it.

### 4.2 Typeahead (compact mode)
- Case-insensitive prefix match on ANY registered name token: `d` → DeFi…,
  `de` → DeFi…, `defi` → DeFi_Patriot. Then substring match. Names with
  multiple aliases match on each.
- `terra…` → address prefix match across the roster; a full pasted address
  that is NOT in the roster is accepted as-is (unnamed) and passed through.
- **Last-4 lookup** (explorer parity): the `Last 4` mode matches the final
  four characters typed either **left→right** (`7ulw`) or **right→left**
  (`wlu7`) — same two toggles as the explorer. Tie → list all matches.
- Results expand under the pill as you type (max 8, then "show all N").
- Enter / click selects. Esc clears. `/` focuses the picker from anywhere.

### 4.3 Expanded panel ("powerful mode")
- Tabs by group: All · aDAO · Lion DAO · Pixel Lions · Allies · TLA lockers ·
  Votion. Counts in tab labels.
- Sorts: Most NFTs · Most staked NFTs · Most TLA VP · Most TLA deposits ·
  Most VP potential if adjusted · Name A–Z · Recently active. Sort is sticky
  (localStorage).
- Rows: avatar · name · group chips · the sorted metric in mono · secondary
  metric. Click = select and close. Scrollable, virtualised above 200 rows.
- "Copy address" and "open on chain" affordances per row (existing chip
  pattern from the help drawer).

### 4.4 Selection contract (how pages consume it)
- Single source of truth: `localStorage['tla:selected_wallet']` +
  `?wallet=` in the URL (URL wins on load, then is written to storage).
- Picker dispatches `window.dispatchEvent(new CustomEvent('tla:wallet', {detail:{wallet,name}}))`.
  Each page subscribes and calls its existing "load this wallet" path.
  tla-stats keeps `#member-selector` as the receiver (hidden) — its 7K-line
  rendering is not touched; the header simply sets the select's value and
  fires `change`.
- Pages with no per-address view ignore the event; the pill still shows the
  selection (continuity).
- Clear (×) on the pill → storage removed, pages return to TLA-wide/default.

## 5. Footer
`lib/site-footer.js` already unifies rev · changelog · health dot. Add:
**Help** link (→ help.html) and mount it on transparency-hub, help, slippage
(currently 0 footers). Quick-links row identical everywhere.

## 6. Build order (one step per delivery, each gated on the live site)
1. `lib/site-header.js` (no picker) on transparency-hub + help — the two pages
   with no way back. Zero risk to data pages.
2. `lib/address-picker.js` compact mode + roster + selection contract, mounted
   on member-portfolio (smallest consumer) — gate: URL/localStorage/event
   round-trip, last-4 both directions, name prefix case-insensitivity.
3. tla-stats: header + picker wired to `#member-selector` (receiver only).
   Gate: selecting in the header = selecting in the old dropdown, pixel-same
   downstream; old dropdown hidden not removed.
4. nft-explorer, dao, slippage: header + subscribe.
5. Expanded panel + sorts.
6. index + adao-lore header swap (theme unification), footer Help link.
Each step: tla-log/explorer-log/dao-log entries per existing changelog homes.

## 7. Owner sign-off questions
1. **Theme**: "TLA Stats theme" = its dark base + cyan accents + mono numbers.
   index's header currently sits on a lighter gradient — confirm the header
   adopts tla-stats colours on index too (so index looks a bit darker).
2. **Picker roster scope**: include Votion vault addresses and unnamed TLA
   lockers (address-only rows) in the expanded list, or named wallets only
   with "paste any address" for the rest?
3. **Default selection**: none (TLA-wide) on every visit, or remember the
   last selected wallet across sessions (localStorage) — current
   member-portfolio remembers; tla-stats does not.
4. **Explorer search boxes**: replace the explorer's own Search/Last-4 boxes
   with the header picker, or keep both (header drives, page box stays as a
   local filter)?
5. **Metric definitions for sorts**: "Most TLA VP" = positions
   `voting.total_voting_power_human`; "Most VP potential" = product's
   potential-gain field; "Most staked NFTs" = DAODAO+Enterprise per wallet
   (needs nft-inventory join). Confirm, or name others ("Most LP value",
   "Longest locker", "Governance participation %").

## 8. Non-goals
No build step, no framework, no change to any data product. The 7K-line
tla-stats rendering stays untouched (header mounts above it; picker talks to
the existing select). No new cron.

## 9. Uniform chrome (owner direction, 2026-08-21 evening) — STATUS
Goal restated: "make all these pages look and feel uniform and navigation feel
the same no matter where you land."

### Shipped in libs (every core page inherits)
- Header = logo · 5 tabs · globe; logo height = tab height (3.25rem).
- Address row under the tabs: VIEWING label · picker · hint. Picker mounted on
  index, explorer, tla-stats, member-portfolio, slippage, dao, lore, help, hub.
- CoinGecko marquee rendered by the header lib on every page (index's own
  strip retired); `ticker:false` opt-out exists, unused.
- `SiteHeader.subnav(items, {right, onSelect})`: the ONE in-page tab component
  — TLA Stats tab look (icon · label · optional badge, cyan underline), sits
  directly under the header, right slot for status (epoch countdown, Open
  DAODAO). DAO page Members/Proposals moved onto it (tiles retired, hidden
  receivers keep switchTab() working).
- Help drawer wallet row = selected chip or "Choose an address" → finder.
- Entities come from `catalog.entities` (curated wallets.json via catalog
  cron 1.2.0) — no labels in page code.

### Shipped later the same evening (all gated)
- tla-stats tabs above tiles + title row retired (T3.13); explorer, hub,
  member-portfolio tab strips on `subnav`; index refresh strip in the slot.

### Remaining (next session)
1. **tla-stats**: move its tab strip (Overview · Member Portfolio · LP Grades
   · LP Stats · TLA Stats · Docs) ABOVE the six info tiles by rendering it via
   `SiteHeader.subnav` with the epoch countdown in the right slot; hide the
   in-page strip as receiver (same pattern as the DAO page). Remove the
   "Terra Liquidity Alliance Tracker / Eris TLA" title row into the sub-nav
   right slot or drop it (owner circled it as redundant).
2. **nft-explorer**: Collection · Analytics · Wallet onto `subnav`.
3. **member-portfolio / slippage / transparency-hub / help**: their local
   tab rows onto `subnav` (hub: Updates · Docs · System Health · Endpoints).
4. **index**: retire the "Last refresh: page load · Refresh" strip into the
   sub-nav right slot (owner circled it), keep the mobile bottom bar.
5. Typography pass: one scale — Outfit 1rem/700 tabs, .78rem mono status,
   .72rem uppercase labels — audit each page's own header-adjacent text.
6. Roster: Enterprise stakers as a catalog slug (owner's roster definition).
7. Arb radar grouping key by denom (WETH vs WETH.axl) — queued from tla-log.

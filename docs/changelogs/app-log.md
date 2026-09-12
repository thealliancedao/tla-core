# Ally app (app.html) Changelog

Newest on top, UTC times, one entry per delivery. Spec: `docs/pending-changes/SPEC-mobile-app.md`.

## 2.0.1 — 2026-09-12 · owner phone walk of 2.0 (screenshots = truth)
- FIXED: the 2.0 stylesheet closed before the v2 rules (a `</style>` line rode along in the v1 CSS slice), so ledger rows and the window row rendered stacked, unstyled. Rows are one line again.
- FIXED: the NFTs feed showed the owner's Pixel Lions bids/transfers under aDAO — the tla-flows aux stream watches the registry superset (marketplaces included) and its bid/sale records carry no `nft_contract`, while token ids overlap across collections. Activity now keeps only records whose `nft_contract` or `contract` is the aDAO collection; bare marketplace records are dropped, never guessed. Gate on the live 2026/09 file: PL #1234/#1576 absent, aDAO #4729 delist present.
- Listings section folds live aux `list`/`cancel` records that listing-history has not caught up on (price `—` when the stream has none).
- Settings (Me) reachable from a gear in the top bar even when Me is not one of the five tabs (a migrated v1 custom tab set kept Today · Market · Vote · TLA · NFTs).
- Gate 73/73.

## NEXT for the app (2026-09-12, banked): read adao/ledger from nft-collections instead of tla-core/nfts/adao/transfers (then the tla-flows aux NFT stream retires); Vote tab bucket rows wrap; escrowed-balance rows (BBL bid account, Atrium offers); tab decision.

## 2.0.2 — 2026-09-12 · theme variables restored
- The v1 CSS slice also began with the literal `<style>` tag, so the stylesheet opened with `<style> :root{…}` — an
  invalid selector — and the whole `:root` variable block was dropped: white body, black text, unstyled cards, in 2.0
  and 2.0.1 alike. Fixed; gate asserts the first rule is `:root` with `--bg:#0a0b0f` (77/77). Owner Safari screenshots
  confirmed 2.0.1 rows/sections; 2.0.2 restores the dark theme.

## 2.0.1 — 2026-09-12 · stylesheet fix + collection guard (owner phone screenshots)
- **v2 CSS was dead on device**: the v1 CSS slice used to assemble 2.0 carried its closing `</style>`, so every v2 rule
  (ledger rows, section headers, window row) sat outside the stylesheet as inert text — Today rendered as stacked
  blocks. Fixed; the gate now asserts computed styles (`.lg` is a flex row, `.sec` uppercase, 183 rules parsed), which
  2.0's gate never checked.
- **NFTs showed Pixel Lions under aDAO**: the tla-flows aux stream is collection-blind (it watches the registry
  superset incl. the marketplaces) and its `bid` records carry no `nft_contract`; the owner's PL test bids (#1234, #899,
  #1576, #1787) rendered as aDAO "bid" transfers. activity() now keeps only records provably on the aDAO collection
  (`nft_contract` or `contract` = aDAO); bids without a collection are excluded everywhere. Forward capture should add
  `nft_contract` to bid records (auction_id → create_auction) when platform-crons vendors the nft-flows classifier.
- Gate 75/75 on committed products incl. the September aux file.
- Still open from the screenshots: Vote tab bucket rows wrap (v1 layout); tab set on the owner's device is the migrated
  v1 set (Today · Market · Vote · TLA · NFTs) — pick the five in Me. Desktop-feel mobile reflow of index.html incl. the
  chart popups is a separate track (DECISION 2026-09-12: desktop untouched · mobile browser = desktop look fitted to the
  phone · the app = purpose-built).

## 2.0 — 2026-09-11 · Today v2 + NFTs v2 to the brief; tabs merged to the proposal
- **Today = the ledger.** One-line rows (icon · label · mono value · chevron), zero rows never render, a 24h · 7d · 14d window at the top reshapes every row, detail lives in bottom sheets. Sections: Needs you (tab badge = rows that need you) → Your position → TLA → Market. Rows: rewards claimable (sheet: deposit rewards by pool · rebase · vote rewards · LUNA staking · DAO staking — the last two labeled *not captured yet*, null not zero), locks unlocked, Votion locks unlocked (the TLA locks of vaults the wallet holds vtokens in), props in voting / veto lock / passed-not-executed / executed (counted by voting close inside the window — the capture carries no execution time), NFTs claimable, NFT unstaked (security, NEW marker vs the device snapshot), DAODAO stake fell / NFT count fell, your LPs gone active/inactive, inactive LPs, backing added to YOUR unbroken NFTs (Δ ampLUNA per NFT × unbroken count, valued at today's ampLUNA), your LPs' APR with Δ, your NFTs sold/listed/delisted/staked/unstaked/transferred/broken, avg deposit APR with Δ, LPs gone active/inactive (TLA-wide), big TLA shifts (±20% & ±$2K staked, or ±10 pp APR on a $5K+ pool), bribes added (LIVE, from `tla-voting/events/bribes/` — not the per-epoch harvest), TLA liquidity Δ, floor Δ, new listings (listing-first-seen), delisted, sales, backing/NFT Δ, LUNA (24h/7d from prices; 14d from luna-usd-daily), DAO value Δ, biggest token moves.
- Window-start state comes from the daily products (`member-data/tla-snapshot/daily`, `member-data/dao-dashboard/daily`) at the window-start date, falling back one or two days on a gap — every sheet names the capture it compares against.
- **NFTs = movement per collection.** Switcher aDAO · Pixel Lions · TLA Locks (remembered on device; the two others render an honest "not captured yet"). Window-aware sections, newest first, thumbnails: Sales (who → who with names, Δ vs that token's prior sale), Transfers, Stake changes (unstaked with days-to-unlock, claimable, staked with the staker's total + % of DAO VP), Listings (new / removed / price), Broken. "Your NFTs" by BBL rank (Warlock = rank oracle; intended rank as fallback), three shown → all; `nfts.json` (7 MB) hydrates only on that tap, never on first paint.
- **Tabs**: default set = the proposal — Today · NFTs · TLA (your position + locks + LPs + vote optimizer + pools) · DAO (proposals across the three DAOs + treasury) · Me (wallet · totals · default window · badge DAO · five-tab picker · help). Vote / Market / Portfolio stay pickable. v1 tab names saved on a device migrate (home→today, nft→nfts, more→me; the v1 default set becomes the v2 default set).
- Fixed from v1: `nftSheet` read flags from bundle column 9 and rank from 10 — swapped (fields: `bbl_rank`=9, `flags`=10; `model()` had it right). `propStatus` matched "Vetoed" as veto-timelock. REV/REV_DATE now render to `#page-rev` (rev footer law).
- Gate: `gate-app.mjs` (new; v1's gate was never committed) — jsdom on the committed products, expected values computed independently from the same fixtures: 70/70 (2026-09-11 18:xx UTC): claimable $5.19, lock #1319 (E197), badge = need rows, bribes $6,046 (7d) / $2 (24h) from 118 / 14 events, sales 0 (7d) / 1 (14d), new listings 1 (14d), your NFTs #3444 / #8897 / #2762 by rank of 296, nfts.json not fetched before the tap, Pixel Lions honest empty state, prefs migration.
- Capture findings folded in: bribe adds ARE captured live by `tla-voting/events/bribes` (last add 15:59 UTC today) — only `bribe-state` / `tla-snapshot pools[].bribes.active_now` (what the optimizer values) is per-epoch; `nfts/adao/transfers/2026/09.json` is absent because nothing has moved (tla-flows 15-min walk healthy, `aux.nft: 0`, no errors, dex sibling has 1,696 September events) — absent ≠ failed, the NFTs tab says so.

## 1.0 — 2026-09-11 (overnight) · position companion — REJECTED as "still a desktop page"; 0.x data-cards build rejected the same morning. Kept from v1: model/me/picker/sheets, vote optimizer, security alerts, activity ledger, venue tiers.

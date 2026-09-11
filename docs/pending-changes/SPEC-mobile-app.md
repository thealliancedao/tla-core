# SPEC — Ally, the Alliance DAO phone app (v2 brief, 2026-09-11 morning — owner direction)

## What it is
A read-only companion that REPORTS, not explains: for the selected wallet, what happened in a window, what needs
you, what changed — as rows with one number each, zeros hidden, detail one tap away. Built from scratch for the
phone on the org products (app.html; installed via manifests; install.html explains). Desktop and the mobile-browser
site stay separate (three versions — see the 09-11 decision).

## Visual rules (owner, 2026-09-11)
Left-aligned. A row is one line: icon · label · value (mono, right) · chevron. No prose in rows — detail lives in
the bottom sheet. Zero rows are hidden. The first screen fits top-to-bottom without scrolling. One accent (cyan),
semantic green/red/amber/purple. Looks and behaves like a consumer app (Robinhood/Coinbase hierarchy), not the site.

## TODAY — the ledger (first tab, badge = things that need you)
Window control at the top: 24h · 7d · 14d — reshapes EVERY row. Rows (hide when zero), tap → breakdown sheet:
- Rewards claimable $ → sheet: deposit rewards · rebase · vote rewards (bribes) · LUNA staking rewards · DAO
  staking rewards by DAO (aDAO / Lion DAO / Pixel Lions)
- Locks unlocked (yours) · Votion locks unlocked
- Props in voting · Props in veto lock · Props executed (window)
- NFTs available to claim (unstake queue released) · NFT unstaked (security) · LUNA unstaked
- Avg deposit APR · your LPs' APR · LPs gone active / inactive · large liquidity or APR shifts in TLA
- Bribes added in TLA (window)
- Floor Δ · New listings · Backing added to YOUR unbroken NFTs (window)
- Your NFTs: delisted · staked · unstaked · transferred · broken (window)
Then: what changed (market rows with deltas), biggest token moves. Everything reshapes with the window.

## NFTs — how NFTs moved, per collection
Collection switcher: aDAO (default) · Pixel Lions · TLA Locks — default remembered on the device.
Sections (window-aware, newest first, thumbnails): Sales (token + USD, who → who with names, Δ vs that token's
previous sale) · Transfers (who → who) · Stake changes (unstaked with days-to-unlock countdown; unlocked & claimable;
staked with new total staked and % of DAO VP) · Listings (new / removed / price changes) · Broken.
"Your NFTs" by rank (highest first), three shown, expandable. Tap any token → NFT sheet (image, traits, rank,
listing, sales history).

## Tabs (proposal — owner to decide)
Today · NFTs · TLA (your position + vote optimizer + pools) · DAO (proposals across the three DAOs + treasuries)
· Me (wallet, settings, totals). Portfolio / TLA / Vote overlapped in v1 — merge, don't duplicate.

## Vote optimizer (kept from v1 — owner-confirmed model)
Per bucket: what you earn "if you do nothing" + total; every other bribed pool with a better USD outcome, valued
with YOUR VP added to that pool's denominator (2M into a 20M pool splits 22M, not 20M); % of VP used per bucket;
VP missed by not re-setting LST locks (locks[].projection). Matches Eris to the dollar where bribes are captured.

## Security alerts (kept from v1)
NFT unstaked under your wallet (pending-claims: token, address, unstaked_at, release_at — the 7-day queue is the
reaction window); DAODAO stake count fell; NFT count fell. Offers on your listed NFTs: WANTED, needs capture.

## Data readiness — what is ready vs needs a cron
READY: participants (rewards, locks, LPs, VP, votes), votion positions, dao-originations proposals (open / veto
timelock / executed), pending-claims, tla-snapshot + dailies (APR, liquidity, pool status diffs), floor-history,
listing-history, backing-history, sales-enriched, explorer-bundle (listings, rank, tiers: broken flag, grade 40 =
Phoenix), transfers ledger (aDAO, to Aug), known_contracts (staking / marketplace types).
NEEDS A CRON (queued, in priority order):
1. Live/hourly bribe capture in tla-voting (bribes posted mid-epoch are invisible until the epoch closes; Eris
   shows them live — e.g. FUEL on LUNA-FUEL, 2026-09-11).
2. nfts/adao/transfers has no 2026-09 file (tla-flows NFT aux stream) — restore.
3. Per-wallet LUNA delegation capture: staking rewards to claim, undelegations (LUNA unstaked).
4. DAO staking rewards per wallet per DAO (aDAO / Lion / PL).
5. Marketplace OFFERS on listed tokens (nft-inventory phase 4 addition; check BBL warlock offers endpoint).
6. Activity ledgers for Pixel Lions and TLA Locks (transfer streams like aDAO's).
7. explorer-bundle rides the nft-inventory warm run (was frozen 08-23 → refreshed after the analytics fix).

## Build order (next session)
1. Today v2 to this spec (rows, window control, breakdown sheets) — owner phone screenshots as the test.
2. NFTs v2 (collection switcher, sections, your NFTs by rank).
3. Tab merge per owner decision. 4. Crons 1–2, then 3–6 as they unblock rows.

## History
v0 (data cards) rejected 2026-09-11; v1 (position companion: Today / Portfolio / Market / Vote / TLA / NFTs /
More, onboarding, sheets, sparklines, pull-to-refresh, activity feed, venue tiers, vote optimizer, security alerts)
shipped through the night with 55/55 gate; owner verdict: "still a desktop page" — hence v2 above.

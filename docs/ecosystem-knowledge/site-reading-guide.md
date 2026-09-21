# Reading the site — what it shows, why, and how to report a problem (2026-09-20)

_Read by the TLA Help agent (corpus) and by humans. Written after the 2026-09-20 rework of the home page's Live Activity and the
TLA Stats fixes (T6.1–T6.6). Every claim here is what the page actually does; the gaps are listed as gaps. When a member asks
"why does it say X" or "is this right", the answer is on this page — quote it, and point to the report path at the end._

## 1. Home page — Live Activity (index 4.37)

**What a row is.** One act, not one contract event. The crons fold the on-chain ledger into episodes: a wallet delisting and
relisting the same NFT within 24 hours is ONE "Price changed 5,000 → 4,200 LUNA (−16%)" row; thirty unstakes by one wallet in
an hour are ONE "Unstaked 30 NFTs" row with the first five ids and "+25 more"; a TLA lock's merge/split/migrate/auto-max verbs
in one transaction are ONE "Restructured N locks" row. Source: `nft-collections/<collection>/ledger/activity.json`, rebuilt hourly.

**Three tiers.** Amber ("featured") = Enterprise unstakes, DAODAO stakes, breaks (backing claimed — a positive event), mints,
listings UNDER their class floor, a wallet's first TLA lock, a lock listed or sold (with its backing), big locks/unlocks
(≥ 100k VP), sales ≥ $500, mass moves (≥ 10 tokens). Grey ("quiet") = lock housekeeping, small lock top-ups, dust locks,
legacy Enterprise stakes. Everything else is normal.

**The deal filter (on by default).** Listings priced more than 25% over their class floor on the collection you are viewing
(10% on the other collections) are hidden; the chip says how many. "Deal filter off" reveals them. Classes: aDAO base /
broken / Phoenix, Pixel Lions base / Rank 1 — the floor is the class's own floor on that day (from floor-history). A class
with no floor (PL 1/1s, tiny collections) hides nothing. Listings under their class floor are featured, not hidden.

**Chips.** 24h / 7d / 30d; All collections on by default (aDAO · Lion DAO · TLA Locks); type chips; "Lock housekeeping" is
OFF by default because merge/split/migrate/auto-max and small top-ups mean nothing to a reader — a big top-up (≥ $1,000
added) still shows. "Backing added" (the DAO's routine deposits) is not in the feed at all.

**Things members may ask about.**
- "Why don't I see the Boost listings that showed before?" — Those four rows (#8149 at 50,000 LUNA etc.) were phantoms: the
  old feed re-announced them every time Boost's API blinked. On chain they were listed in Dec 2025 / Apr 2026. The feed
  now reads the ledger, so a listing shows once, when it happened.
- "Who is terra1lsas…f7y2 making 51 locks at a time?" — Real and automated: ~720 locks of exactly 0.1 ampLUNA a month, each
  merged into its permanent lock #2500 (6.96M VP). Why it routes 0.1 ampLUNA through a fresh lock the chain does not say.
  Filed as housekeeping (hidden by default).
- "The dot next to a row?" — "since you last looked" (stored in your browser only).
- Thresholds (25/10%, 100k VP, $1,000, $500, 10 tokens) live in `tla-core/docs/curated/alert-thresholds.json` → `live_activity`.

## 2. Home page — All Current Listings, marketplace tiles, the banner

- **Class filter + sort.** Per collection: aDAO Base / Phoenix (Unbroken / Broken / Both as before), Pixel Lions Base / 1/1
  (= Rank 1), TLA Locks ampLUNA / arbLUNA / bLUNA × Auto-max / Under max / Unlocking (from the lock's own ledger rows; a lock
  whose rows are not loaded yet matches "All" only). Sort flips USD low→high / high→low.
- **All-Time Volume on the tiles** is OUR record (every sale the chain shows), shown two ways: "at sale time" (USD at each
  sale's oracle day) and "now" (the same token amounts at today's prices). BBL's tile also shows BBL's own number beside
  it: ours 1,286 sales / $154.7K at sale time vs BBL's UI 1,221 / 256,905 bLUNA. The 65 extra rows are 2024 sales the chain
  shows that BBL's count does not carry; USD within 1%. Boost's "$0.00" was Boost's number, not a missing one.
- **Source pill grammar** on every tile: "floor & listings from <venue> live · volume & sales from our ledger".
- **The alerts banner** shows Ecosystem · Props only. NFT activity lives in Live Activity now.

## 3. Supporting the site (two ways)

- The builder's wallet `terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw`, memo **thanks_defi**.
- An ally treasury, memo **thanks_adao** (one memo for every DAO — the address says which treasury): Alliance DAO treasury
  `terra1sffd4efk2jpdt894r04qwmtjqrrjfc52tmj6vkzjxqhd8qqu2drs3m5vzm`, Lion DAO treasury
  `terra1tkersa2mqwy2h8exj799qx2xrhdu0dkymk9psp6v0k4kz4tkxucssgluec`, Pixel Lions DAO treasury
  `terra1c690mdrwdetnr09zfk3tf9xz9jhrgd9wpjyf3tuccj74ql09eqmq6sh7en`.
- Gifts are walked from the chain by memo (hourly, write-once) and shown on supporters.html (#allies for the treasuries).
  A gift to the right treasury with the wrong memo is not counted. Registry: `tla-core/docs/curated/supporters.json`.

## 4. TLA Stats — one vocabulary (T6.1)

- **Voting round N** (ends Sunday 23:59Z) sets the emissions of **epoch N+1**. The Vote Market chip says "Voting round 203 ·
  live"; the Breakdown's tabs say "203 (locked-in) / 204 (planned)". Eris's own page says "Current voting round … For Epoch
  203" — same thing, their words.
- **Total VP** = every lock (Eris's "Total Voting Power", 32.08M on 2026-09-20). **Voting VP** = the VP actually on gauges
  at lock-in (28.99M that day). **Idle VP** = the difference. The page's percentages are "of voting VP"; it never says
  "all TLA VP" for that number any more. Per-bucket totals legitimately differ (VP is used partially per bucket).
- **Three names, one number.** The TLA TVL tile (live eris-apr gauge sum, today's LUNA), the liquidity chart's "TLA holds
  $X staked" (that chart's headline series) and Pool Health's per-pool sums are the same base on different price/timing
  — each label now says which. Eris's LP list summed to $1.97M when ours read $1.93–2.01M.
- **Dotted % on Eris = linear APR; flame = compounded APY.** Our "Avg APR" tiles are TVL-weighted across active pools
  (Eris's simple mean reads higher).
- **Bribe Runway** says "state as of period N": its product is the boundary harvest and can sit one round behind the Vote
  Market's live view until Monday's harvest.

## 5. TLA Stats — the tile popups (T6.2/T6.3)

History = the LAST daily reading of each epoch, from `member-data/tla-snapshot/epoch-history.json` (a nightly rollup of the
daily archive, one basis); the top row is live. Pools / TVL / Rewards / voting VP go back to E184; APR from E196 (the
eris-apr dailies begin 2026-08-02 — nothing invented before); Bribes show only the epochs the oracle can price at that
day's prices (E185–E187, E200 onward) — thirteen epochs are missing because the price oracle has no USDC.n row before
2026-08-31. That is a known gap, not a bug in the pots. The old history counted pools and TVL without the three single-asset
gauges; it is no longer mixed in.

## 6. TLA Stats — APR (T6.4, dex-data 1.4.3)

- Our APR/APY per pool is Eris's own formula (taken from their code, validated per pool in August). The emissions are
  priced at the LIVE LUNA price now (they had been priced at a once-a-day price; on a 19% LUNA day that read −14.8% vs
  Eris on every pool). The Top-by-APR line names the price it is on and the time.
- **Four pools read lower than Eris on APY** — LUNA-USDC.n, LUNA-USDT, LUNA-INJ, LUNA-SOLID (−12 to −30%) — with rewards
  identical to Eris. The difference is the trading-fee leg: Eris's pool service is not public, so ours is a substitute.
  Labeled on the page; closing it needs Eris's fee source. Eleven pools sit within 0–5%.

## 7. TLA Stats — pots and the Vote Market (T6.5, T6.6)

- **"Not funded" vs unpriced.** A pot that holds tokens is funded even if a price is missing. The LUNA-EURe pot ($10 of
  USDC.n for each of periods 202–206) showed "not funded" for hours because two of our products named the same token
  differently (USDC.n vs USDC). Fixed: live pots price through the token catalog's own price when the feed lacks the symbol.
- **What "+$X → Votion votes" means.** Our exact solve of Votion's objective (bribe × votes ÷ (gauge votes + votes)) with
  your $X added — a projection of HOW MUCH VP your dollars move, NOT of which pools Votion pulls from: the objective is
  flat, many splits are near-optimal, and Votion's own solver lands 0–8% below the optimum. The header chip "model vs
  Votion's plan ±N pp" is that back-test. Each row shows **Votion's rule today**: it re-votes a bucket only when its own
  re-solve gains more than $0 (its published isWorthChanging flag) — a small add has to flip a "holds" before any VP moves.
- **Movers / Breakdown.** Users = live on-chain VP minus the locked-in baseline (Votion's vaults do not move on chain until
  they cast); Votion = its published plan minus its current votes; projected = both. Between Votion casting (end of the
  round) and the epoch flip, both can show the same move for a few hours.

## 8. Known gaps (say them plainly)

1. Four pools' trading-fee leg under Eris (§6). 2. Bribes history missing for 13 epochs until the oracle backfills USDC.n
(§5). 3. Bribe Runway one round behind until each Monday harvest (§4). 4. network-and-prices keys stables "USDC" while the
catalog says "USDC.n" — bridged on the page, to be fixed at the source. 5. Marketplace offers/bids are not captured yet — the
feed says so rather than showing an empty toggle. 6. A venue-only bid event on BBL can be filed under the wrong collection
(one known case: pixeLion #826's buy-now appeared as an aDAO bid) — being fixed in the classifier.

## 9. How to report a problem — and what to include

The fastest path: **Telegram @DeFi_Patriot** (https://t.me/DeFi_Patriot) or the Alliance group (https://t.me/The_AllianceDAO);
also **@DeFi_Patriot on X**. Code and data are public: https://github.com/thealliancedao (site: aDAO-links-site, data:
tla-core / nft-collections, crons: platform-crons) — an issue there works too.

What makes a report actionable (the bot can draft it from these): **which page and section** (e.g. "TLA Stats › Vote Market"),
**the number you saw and the number you expected** (and where the expected one comes from — an Eris or Votion screenshot with
the time), **the time in UTC** (prices move; a screenshot an hour apart can differ by 15% on a volatile day), **the wallet /
token / pool** involved, and **a screenshot**. Every tile and row on the site names its basis (which product, which price,
which epoch); quoting that label is the single most useful line.

If the bot is asked "is this number right?": answer from the basis on the label and this page; if the label and the
member's source differ by price or timing, say so; if the difference is one of the gaps in §8, say which; otherwise say it
is not on record and offer the report path.

# Lion DAO Changelog

Every page under `/liondao/` (footer page key `liondao-*`, lib/site-footer.js 3.8) and the tenant home engine `lib/home-tiles.js`.
Newest on top, one entry per delivery. Earlier history (home v1 → 3.3, the twelve pages, 2026-09-21 → 09-23) is in
docs/pending-changes/CHANGES_PENDING.md (OPEN LEDGERs 2026-09-21 late → 2026-09-23) and the two HANDOVER-liondao-* files.

## home 3.9 · home-tiles 1.9.0 · mint 1.2 — 2026-09-26 — trends, Burning Lions in the marketplace

- **Trends** (owner: "make sure trends are enabled so users can pull them up"): a chart button on every tile whose number has a kept
  series — prices (network-and-prices, `history/markets.json`, ROAR20's hourly capture), supplies and stakes (`history/daily.json`), the
  DAO's value by section (`positions/daily`), floors (each collection's floor-history), holder counts. 7d / 30d / 90d / All, hover, the
  change over the range and the source; a series still filling says how many days it has.
- **Burning Lions in the marketplace** (1.8.0): listings join All Current Listings as their own class (inventory `nfts.json`), venue cards
  show a Burning Lions floor row, a listing opens the right collection in the explorer; holders count REAL owners (a listed lion belongs to
  its seller, not to BBL).
- The pixeLions market total no longer adds a market cap to a volume.
- mint 1.2: Burning Lions media from the mirrored index (gif as img, mp4/webm as video).

## home 3.8 · home-tiles 1.7.0 — 2026-09-26 — fact rows on every market card

- Owner: "market cap, TVL, how much money kills a zero; for NFTs market cap, the mark, last sale vs floor — keep the tiles uniform."
  Tokens: market cap · TVL (its DEX pools) · kill a zero (the buy that takes the price 10× in constant-product pools ≈ 1.08 × TVL).
  NFTs: market cap (floor × minted) · mark (midpoint of floor and last sale) · last sale (USD then, when, vs today's floor). A row with
  no source says why on hover.

## home 3.6 / 3.7 · home-tiles 1.6.1 → 1.6.3 — 2026-09-25 / 26 — ROAR20 and Burning Lions in the header

- ROAR20's market from the hourly server-side capture (`roar20/market.json`, the Raydium pool on chain); the browser's DexScreener read
  is only an override. ROAR20 + Burning Lions logos.
- Burning Lions card: minted of stated and holders live, then its floor and 24h from its own inventory once floor-history has rows.
- pyROAR 24h from the daily market series.

## supply 2.0 · whales 2.0 · ecosystem 2.0 · rarity 1.0 · mint 1.1 · home 3.4 / 3.5 · home-tiles 1.6.0 — 2026-09-25 / 26

- **supply 2.0** (owner: "show the whales and the ROAR supply in a way it's all in one place"): one page, four questions — where every
  ROAR of the 1T sits (one bar, every colour named) · who holds the vote (ROAR staked = VP, the DAO's member list) · who holds the most
  ROAR everywhere it can sit (staked · liquid · ampROAR · TLA-amp LP · plain LP) · what is held for others (custody). whales.html 2.0
  forwards to `supply.html#holders`.
- **ecosystem 2.0** (owner: "Lion DAO at the center … a big-picture view"): Lion DAO + ROAR in the middle; pixeLions, pyROAR, ROAR20 and
  Burning Lions around it with the same five lines each and how each ties to Lion DAO; what Lion DAO owns; the page for every question;
  every address the registry knows. Same loader and derive() as the home, so they never disagree.
- **rarity 1.0**: pixeLions trait classes (counts from traits-reference.json, summing to 5,000), BBL's rank per lion, the 1/1s; the tiers
  are this page's share bands, named as such; lore has its slot.
- **mint 1.1**: the Burning Lions join the mint history — each lion's holder, the ROAR they burned, and Lion DAO's match.
- **home-tiles 1.6.0**: the MARKETS strip under the hero (ROAR · pyROAR · ROAR20 · pixeLions · Burning Lions); unclaimed split TLA
  deposit · TLA vote · validator; Credia · Votion; pixeLions staked DAODAO + Enterprise with the 7-day change; readable supply bars;
  Live Activity shows the ally's own collections only.

## whales 1.1 — 2026-09-25 — custody off the board

- holders.js 1.2.0 takes the staking module, the ampROAR hub, the pairs and the LP incentives contract out of the ranking and the sums —
  they hold ROAR for others; listed on their own below the board.

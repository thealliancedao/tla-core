# Lion DAO — ecosystem knowledge

Last reviewed 2026-09-26. For the help agent and anyone new. Every address here comes from
`docs/curated/tenants.json` (tenant `liondao`); every figure names the product it comes from. A number that
moves (price, supply, holders) must be read from its product, not from this page.

## What Lion DAO is

Lion DAO is an ally of thealliancedao.com (tenant `liondao`, home page `/liondao/`). Its site is liondao.money.
It governs on DAODAO: the core and treasury is `terra1tkersa2mqwy2h8exj799qx2xrhdu0dkymk9psp6v0k4kz4tkxucssgluec`
("LD DAODAO"). It also runs a validator, **🦁 The Lion DAO** (`terravaloper1pet430t7ykswxuyhh56d4gk6rt7qgu9as6a5r0`).
Its community calls itself "the pride".

The ecosystem has five parts:

| Part | What it is | Chain |
|---|---|---|
| ROAR | Lion DAO's token (cw20) | Terra |
| pyROAR | "Burnt ROAR": the receipt of the 2023–24 ROAR burn festival | Terra |
| ROAR20 | "Official memecoin of @TheLionDAO", launched on pump.fun | Solana |
| pixeLions | 5,000 pixel-art NFTs with their own DAODAO DAO (pixeLions DAO) | Terra |
| Burning Lions | one-of-one NFTs raffled to the festival's burners | Terra |

## ROAR

- **Contract:** cw20 `terra1lxx40s29qvkrcj8fsa3yzyehy7w50umdvvnls2r830rys6lu2zns63eelv`.
- **Supply:** 1 trillion minted. Burns lower the supply; there is no minting back.
  - The live total supply is in `history/daily.json` (`roar_supply`). A drop in that series is a burn.
  - It stood at 893.21B at the end of 2026-09-25.
- **Staking:** holders stake ROAR in Lion DAO's cw20 staking module, `terra1xuqh84yz35h70p3ppt76dz5kgwwtwmsv34pg0gw6ld4ntptgjcrqe2e70t`.
  - Stakers earn ROAR from the rewards distributor, `terra1zug2ur6d5ls7vgzwkh0m2002jrallfehpsadpltjqr3vhgvp6lnq90rj3w`.
  - The staked total per day is `roar_staked` in `history/daily.json`.
- **ampROAR:** Eris Protocol's liquid-staked ROAR. The hub is `terra1vklefn7n6cchn0u962w3gaszr4vf52wjvd4y95t2sydwpmpdtszsqvk9wy`; one ampROAR redeems for more than one ROAR, at the hub's exchange rate.
- **Pools** (the registered pairs):
  - LUNA-ROAR (Astroport): `terra189v2ewgfx5wdhje6geefdtxefeemujplk8qw2wx3x5hdswn95l8qf4n2r0`
  - ROAR-ampROAR (Astroport): `terra1tkj3j48d0xrh932szzsap3w8htfv3gmj2zld06an2kp90xzq5kzqvtjwfl`
  - ampROAR-ROAR (SkeletonSwap, ex-White Whale): `terra1d8ap3zyd6tfnruuuwvs0t927lr4zwptruhulfwnxjpqzudvyn8usfgl8ze`
- **Price:** `network-and-prices` (the TLA pool), which also keeps a short 4-hourly series.
- **Whales:** `lion-dao/roar/holders.json` counts every wallet's ROAR, whether staked, liquid, held as ampROAR (at the hub rate) or in LP.
  - Contracts that hold ROAR for other people (the staking module, LP pairs) are custody, never whales.

## pyROAR and the Burning Lion Festival

- **Contract:** pyROAR cw20 `terra1pez3qw6pa24a06wee404yy5mp37j57n3s9zjkdfjeapwqf78dntql0ngsy`. Its total supply is 109,690,675,868.39 and it is frozen.
- **The festival:** a year-long ROAR burn competition.
  - It started 2023-09-30 and ran through 2024-09; the final prize draw was 2024-10-04.
  - The community sent ROAR to the festival receiver, `terra17c6ts8grcfrgquhj3haclg44le8s7qkx6l2yx33acguxhpf000xqhnl3je` (Lion DAO's Enterprise treasury), and it was burned from there.
- **The match:** each month Lion DAO burned 10× what the community burned, capped at 8B ROAR a month. It opened with a 4B treasury burn.
- **What Lion DAO reported** (as of 2024-10-04): the community burned 10B ROAR and Lion DAO burned 107B, from 224 participants.
- **How pyROAR was minted, 1:1:**
  - A burner received pyROAR for their own burn.
  - Every ROAR staker received a share of the pyROAR for Lion DAO's treasury burns.
  - **So a pyROAR balance is not the ROAR that wallet burned.** Per-wallet own burns need a contribution walk that is not built yet.
- **Where to read it:**
  - The frozen ledger: `lion-dao/burn/holders.json`. Its largest holders include contracts, which are labelled.
  - The pyROAR/ROAR pair: `terra1tfygnnp00grk33e0qtz7q5p3nvjkt2eeftefavum2jdq09kpunwqe0z7p3`.
  - pyROAR's USD price is that pair's ratio × ROAR's price. It is kept daily in `lion-dao/history/markets.json`.

## ROAR20 (Solana)

- **Mint:** `3Egc6tdNcKZEfb4XDMPAktbrrpxSdyCtxxsoT3Rbpump`.
- **Supply:** 1B minted with the mint authority revoked. Burns have lowered the live supply to about 975.6M; read `roar20/holders.json` → `token.supply`.
- **Where it trades:** it graduated from pump.fun into a **Raydium AMM v4 pool**, `BnrDeofGKUH8kkMAV5dkXWbSe3pRmK5dtMsCygF12j25`.
  - Liquidity is thin, so DexScreener, GeckoTerminal and Jupiter show no usable price.
  - The platform reads the pool's reserves on chain every hour: `roar20/market.json` (price, market cap, liquidity, source) and `roar20/market-history.json` (hourly).
- **Largest "holder":** the Raydium vault authority `5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1`. Its ROAR20 (roughly 73%) is the pool's liquidity, not a wallet's.
- **Holders:** `roar20/holders.json` (from Helius, walked daily).

## pixeLions

- **Collection:** 5,000 tokens, contract `terra17z7fpaa8kah698xn5tarrcucvualdy4wsztkfc404g3garucpu6qmxp50g`.
- **Launch:** minted 2023-06 through the BBL launchpad at 10 LUNA each. The primary sales are on `/liondao/mint.html`.
- **Its DAO:** pixeLions DAO on DAODAO (`terra1c690mdrwdetnr09zfk3tf9xz9jhrgd9wpjyf3tuccj74ql09eqmq6sh7en`).
  - Its voting module is `terra127dehd2d6t7ynnezkxkre2w83ze0t7lmghpu6vn4y5mfmwfj5x9qqdh4sz`; staked lions are its voting power.
  - Legacy Enterprise staking also still holds lions.
- **Staking rewards:** the DAODAO rewards distributor `terra1krewrx5uye0ux786w9jd2qx4wqz5pz2y5mqxw2k58p4xjhnw5lfqm450m7` pays stakers in ROAR (distribution 1) and DROGO (distribution 2).
- **Venues:** BBL, Atrium and Boost.
- **Rarity:** BBL's statistical rank only ("Rank N · top X%"; ties share a rank). There are no grades.
- **Products:** `nft-collections/pixel-lions/` holds summary, floor-history, nfts, sales-enriched, ledger/activity and rarity.
  - Staked per day is `pixelions_staked` in `history/daily.json`.

## Burning Lions

- **Contract:** `terra1cfk54jzu6wsr7c7eqhvs3znkkuxc7pvr7awdvheg7szvnlmduvus95a0q0` ("pixeLions: Burning Lion Festival", symbol PYRO). The minter is the Enterprise treasury.
- **Supply:** 7 are minted of the 12 the pride stated. The other 5 are not on this contract; Lion DAO has not yet confirmed whether they were ever minted.
- **The seven:**

  | # | Name | Notes |
  |---|---|---|
  | 1 | Smokey | |
  | 2 | Hellfire | the image is a marketplace's cached copy; the IPFS original is unreachable |
  | 3 | Ice and Fire | |
  | 4 | Chapter 11 | |
  | 5 | Year of the Dragon | |
  | 6 | unknown | its metadata is unreachable on IPFS |
  | 7 | Blaze | the only animated one |

- **Traits on the site:** Name and Animated (Yes/No). They are 1/1s, so there is no rarity rank.
- **Media:** mirrored into `nft-collections/burning-lions/images/`, with the index in `metadata/metadata.json`.
- **Inventory:** `snapshots/nfts.json` and `summary.json` hold listings and real owners (a listed lion belongs to its seller). The daily floor is in `snapshots/floor-history.json`.
- **Sales history:** not built yet (no nft-flows ledger for this collection). Sales, volume and last-sale figures read as not captured.
- **How they were won:** raffled to festival burners, weighted by each burner's own contribution. Original winners (each token's first transfer) are not captured yet.

## The DAO's positions (treasury, TLA, Credia, Votion, validator)

- **The roster:** `positions/current.json` (hourly) covers the roster wallets in `tenants.json` (`wallets`):
  - LD DAODAO (treasury)
  - LionDAO ops
  - pixeLions ops
  - the pixeLions multisig
  - the validator's account
- **What it holds:** balances, TLA positions (staked, compounder, locks, pending rewards), Credia collateral, Votion, and the delegations/commission.
- **Totals:** `known_usd` is the known value. The daily series is `positions/daily/index.json`.

## Trends (what history exists)

| Series | Product | Since |
|---|---|---|
| ROAR supply, ROAR staked, pyROAR supply, pixeLions staked, validator rank / LUNA / commission | `history/daily.json` | 2023-09 (weekly samples early on, daily from 2026-09-19) |
| Prices (ROAR, pyROAR, ROAR20), holder counts, Burning Lions minted / holders | `history/markets.json` | 2026-09-26 |
| ROAR20 price, hourly | `roar20/market-history.json` | 2026-09-26 |
| The DAO's value by section | `positions/daily/index.json` | 2026-09-22 |
| NFT floors | `nft-collections/<slug>/snapshots/floor-history.json` | per collection |

## Words the site uses

- **the pride:** the Lion DAO community.
- **Kill a zero:** the USD of net buying that takes a token's price 10× in its constant-product pools, about 1.08 × the pool's TVL. It ignores fees and sellers.
- **Mark (NFT):** the midpoint of today's floor and the last sale.
- **Coming:** no source exists for that number yet. It is never an estimate.

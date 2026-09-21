# HANDOVER — Lion DAO home v2: products → pages → the home in aDAO's shape (2026-09-21 late)

Read with PROJECT_KNOWLEDGE.md + CHANGES_PENDING.md (top). Supersedes the page part of HANDOVER-liondao-positions-2026-09-21.md;
its §A–§D (the brief, the four wallets, phoenix.money, the questions) still hold.

## A. Where we are (verified live 2026-09-21 ~23:30Z)

- **Roster registered** — tenants.json `liondao.wallets` (4 wallets, roles), `validator` (operator + the CORRECT account
  `terra1pet430t7ykswxuyhh56d4gk6rt7qgu9as43fnu` — a bech32 re-encode; the prefix-swapped string was rejected by the LCD),
  `staking` (ROAR cw20, ROAR staking module `terra1xuqh84…`, ROAR rewards distributor, `pl_rewards_distributor: null`),
  `burn` (festival receiver = the Enterprise core `terra17c6ts8g…`, reported figures with the tweets as source,
  **pyROAR = `terra1pez3qw6pa24a06wee404yy5mp37j57n3s9zjkdfjeapwqf78dntql0ngsy`**, initial supply 1T), `roar20` (pump.fun mint
  `3Egc6…pump`, DexScreener), `home: /liondao/`, `gate0_reference` (the phoenix.money fixture). trusted-addresses carries Lew, Ryan,
  the validator account.
- **ally-positions 1.0.2 LIVE** — `platform-crons/ally-positions/` (tenant-agnostic; `TENANT=liondao`), Render
  `org-ally-positions-liondao` hourly at :20 → `dao-originations/lion-dao/positions/{current,heartbeat}.json` + `daily/` (first
  archive 2026-09-21). Per wallet: the capture-engine (TLA amp/non-amp, locks, pending, compounder receipts), every bank denom +
  every catalog cw20 by catalog symbol (unpriced rows kept with a reason), delegations (+ own-validator mark), validator
  commission as a 5th row, Votion rows, pixeLions held/staked; Credia = null "reader not built". Roll-up by role + DAO, every
  basis labeled; `reconciliation` publishes ours vs phoenix.money per wallet every run.
  **Gate #0: ours $188,105 vs theirs $189,983 = −1.0 %**, the whole gap in three labeled rows: Credia on Ryan (no reader),
  wBTC.atom on Lew (feed keys WBTC, catalog says wBTC.atom — `catalog_symbol_drift`; fix upstream in network-and-prices), one
  compounder receipt on Lew (`factory/terra1zly98…`, the amplifier from the deploy prop — needs the compounder-rate reader).
  Facts from the runs: none of the four wallets delegates LUNA; msig holds 19 pixeLions, treasury 5, Lew 1, none staked.
- **Lion DAO home v1 LIVE at /liondao/** — `liondao/index.html` + `liondao/home.json` + `lib/home-tiles.js 1.0.2`,
  site-header 1.12.0 (tenant homes: logo → the ally's home; dropdown on a home page goes to the chosen ally's home; index.html
  under a Lion DAO pref redirects to /liondao/), vercel.json `/liondao` → the folder. Gate 60/60. **Owner's verdict: under-
  delivered** — see §B.
- **ROAR facts** (LCD, 2026-09-21): total supply 893,210,193,782 (1T minted → 106.79B gone, vs 117B reported: 10.2B gap —
  either ROAR still held unburned or the mint wasn't exactly 1T; the cw20 `minter` query settles it). Enterprise core migrated
  to v2 (`enterprise_treasury_api`; asset whitelist = 47 cw20s incl. pyROAR, "xxx" 10-dec token `terra10se906…`).
- **ROAR20 facts** (launch tx 4a5Kb…, 2024-11-20): 1B minted once, mint authority revoked, metadata immutable, no freeze
  authority; creator `roar20.sol` = `AtxwsiKx…vuPB` bought 337,228,571 (33.7 %) for 13.75 SOL in the create tx.
  Sources: Solana RPC (`getTokenSupply`, `getTokenLargestAccounts`; full holders via Helius `getProgramAccounts` — key set on
  the Render service), DexScreener token endpoint, pump.fun `frontend-api-v3` (`coins/top-holders-v2/<mint>`,
  `token-holders/<mint>/count`, unauthenticated), Solscan api-v2 (needs key — skip).

## B. The page upgrades (the owner's words: "way under delivered", "same places as aDAO, themed", "tiles open full pages")

**Rule for v2:** the Lion DAO home has aDAO's sections in aDAO's places — info tiles 5×2 → two status bars → DAO Unclaimed
Rewards (three panels: TLA · Validator · pixeLions rewards) → four tiles + total value bar → four tiles → analytics strip →
four tiles → marketplaces EXACTLY as index.html has them (BBL · Boost · Atrium tiles, then Live Activity, All Listings, Top
Sales in their current positions) → footer. Only theme, words and data change. Every tile opens a PAGE with charts, trends and
balances the way aDAO's do (dao_treasury.html, dao_tla_deposits.html) — no popups/sheets. Pages live in `liondao/`, mirror the
aDAO page they correspond to (same modal/history-tile idiom, Chart.js), read the products below, and say why when a number
is Unknown. Wording in Lion DAO's voice (LFR, the pride) — in home.json / the page, never in the engines.

| Slot (aDAO) | Lion DAO tile | Opens (liondao/…) | Reads |
|---|---|---|---|
| ALLY Rewards (big) | Lion DAO Ecosystem | `ecosystem.html` — validator rank history + delegators, ROAR supply/market (CoinGecko labeled), staked ROAR + Nakamoto, burn festival (reported vs measured) + top burners, Burning Lions, ROAR20 | validator tracker · supply map · burn ledger · roar20 |
| Tutorials | ROAR Supply Tool | `roar-tool.html` — the ampCAPA tool shape: where every ROAR sits, whales, "could move" vs committed | supply map |
| Tools | Lore | placeholder page (Lion DAO writes it) | — |
| Rarity Info | Rarity | placeholder page (Lion DAO supplies) | — |
| NFT Releases | Mint history | `release-history.html` mirror — PL (+ BL when onboarded): minters, price then, DAO proceeds, what happened next | primary-sales (exists) + by-wallet |
| Official Links | Ecosystem links | link list Lion DAO maintains (placeholder until they hand it over) | tenants.json links |
| Alliances | Alliance with aDAO | `alliance.html` — both sides then vs now (alliance ledger) | alliance ledger (to build) |
| DAO Links ▾ | DAO links | menu: DAODAO Lion DAO / PL DAO, TLA positions per roster wallet (member-portfolio), phoenix.money, the roster | tenants.json |
| Contract ▾ | Contracts | menu: chainscope links | tenants.json + known_contracts |
| Mint Status / Broken Status | ROAR supply bar / pixeLions holder bar | (inline) | supply map · summary.json |
| DAO Unclaimed Rewards | TLA · Validator · pixeLions rewards | `dao_unclaimed.html` mirror with claim history | ally-positions |
| DAODAO Staked / Enterprise / Members / Broken-Held | Treasury ROAR · TLA positions · Validator · ROAR price | `dao_treasury.html` mirror (balances by wallet, What Changed, trends) · `dao_tla_deposits.html` mirror for the roster · `validator.html` (delegators leaderboard, commission stream, aDAO's 10k marked) | ally-positions daily · validator tracker |
| DAO TOTAL VALUE strip | Lion DAO total value | (inline: known parts, remainder labeled) | ally-positions rollup |
| Treasury / TLA Deposits / TLA VP / Unminted backing | pixeLions row: staked, the pride, floor, staking APR | explorer / `pl_staking.html` (APR after the distributor is read) | nft-collections · distributor (unknown) |
| NFT COLLECTION ANALYTICS strip | pixeLions market | explorer analytics | nft-analytics |
| Backing / Floor / Avg gain row | Burning Lions row: supply, festival burn (reported vs measured), top burner, ROAR20 | `burn.html` (pyROAR leaderboard, the 12 lions, the owner's row) · `roar20.html` | burn ledger · roar20 |
| BBL / Boost / Atrium tiles | same venues, PL floors; class chips Base · 1 of 1 · Burning Lions | explorer | summary.json |
| Live Activity / All Listings / Top Sales | same, liondao default | explorer | activity.json · bundle · sales-enriched |

## C. Products still to build (order — each one gated, one ZIP per repo)

1. **Burn ledger** (duty in ally-positions, `lion-dao/burn/`): pyROAR `all_accounts` + `balance` walk (frozen contract, ~250
   rows) → leaderboard with names from the roster + trust register; ROAR `minter` query → settles the 1T question; measured
   burn = initial − live supply, reported beside it.
2. **Validator tracker** (duty, `lion-dao/validator/`): rank by bonded tokens (daily series), delegators (paged
   `/validators/{v}/delegations`) leaderboard, commission rate + accrued, aDAO's 10k marked; daily archive.
3. **ROAR20** (duty, `lion-dao/roar20/`): RPC supply + top-20 + creator balance (Helius for the full list), DexScreener price /
   liquidity / graduation, pump.fun holder count — each labeled; daily.
4. **ROAR supply map** (token-catalog duty on the capa pattern, `tla-core/token-catalog/supply/roar/`): liquid / hub (ampROAR) /
   TLA LPs amp + non-amp / non-TLA DEX LPs / DAO treasuries / burned / unattributed, sum-guarded; whale rows with "could move".
5. **Compounder-rate reader** (ally-positions): price `factory/<compounder>/…` receipts by the compounder's own exchange rate
   (Lew's 197M-unit row, the phoenix "$0" five).
6. **Credia reader** (ally-positions): collateral AND debt per wallet (PROBES-credia.md has the contract notes).
7. **network-and-prices**: key wBTC.atom / wSOL.wh etc. by the catalog symbol (the same move as item 1 for the stables) — that
   is what prices Lew's wBTC, not a page bridge.
8. **Alliance ledger** (curated `alliances.json` legs + a product valuing each leg then/now two ways) → alliances.html "at work".
9. **PL staking APR** — after the pixeLions distributor contract is found (PL DAO's DAODAO Rewards tab).
Then the pages (§B) as the products land, then the home re-laid to aDAO's shape reading all of it.

## D. Registrations owed (docs bulk)
CRON-FLEET.md + lib/cron-registry.js + system-health FRESHNESS_MAP: `org-ally-positions-liondao` (hourly :20,
dao-originations/lion-dao/positions/heartbeat.json). Helius key = `HELIUS_API_KEY` on that service.

## E. Open questions for the Lion DAO council
pixeLions rewards distributor address · will they keep a balance-sheet JSON + lore / rarity / links somewhere we can read ·
does the 10.2B burn gap surprise them (ROAR unburned in the treasury?) · Burning Lions contract + the 12 winners.

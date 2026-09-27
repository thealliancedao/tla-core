# HANDOVER — Lion DAO milestone close, 2026-09-26

Written at the close of the chat that ran 2026-09-23 → 2026-09-26, so a fresh chat can pick up without it. Read with
PROJECT_KNOWLEDGE (opener 0) and the top of CHANGES_PENDING (OPEN LEDGER 2026-09-26). Everything here is on main unless marked.
The ecosystem facts for the help agent and newcomers are in `docs/ecosystem-knowledge/LION-DAO.md`; this file is about the BUILD.

---------------------------------------------------------------------------------------------------------------------------------
## A. What shipped, by repo

### aDAO-links-site (Vercel)
| File | Rev | What it does now |
|---|---|---|
| `liondao/index.html` + `liondao/home.json` | 3.9 | Lion DAO home. Sections in aDAO's order; MARKETS strip; fact rows; trend buttons; Burning Lions in the market section. |
| `lib/home-tiles.js` | 1.9.0 | The tenant home engine (derive + render + the trend engine). All words in home.json, all literals in tenants.json. |
| `liondao/supply.html` | 2.0 | ROAR supply map + whale tracker + who holds the vote + custody, one page. |
| `liondao/whales.html` | 2.0 | Forwarder to `supply.html#holders` (old links keep working). |
| `liondao/ecosystem.html` | 2.0 | The ecosystem map (Lion DAO centre; pixeLions / pyROAR / ROAR20 / Burning Lions around it; every address below). |
| `liondao/rarity.html` | 1.0 | pixeLions trait classes (counts from traits-reference.json), BBL rank, the 1/1s; lore slot. |
| `liondao/mint.html` | 1.2 | Mint history: pixeLions primary sales + the Burning Lions (holder, ROAR burned, Lion DAO's match); mirrored media. |
| `lib/collection-context.js` | 1.2.0 | `?collection=` / `opts.collection`; token_uri media (assets.image / animation / media_kind); traits derived from `from:`. |
| `nft-explorer-app.js` (v=8.2) + `nft-explorer-index.html` | 4.54 | Burning Lions: hero switcher, "1 of 1", no rank sorts, lite Analytics when nft-analytics is 404. |
| `lib/alert-center.js` | 2.1.0 | Props-only home window; every prop card decodes its own messages. |
| `index.html` | 4.40 | Props window (09-25); live prop cards carry quorum / threshold / full text (09-26). |
| `dao.html` | 1.11 | Opens on Lions on the Lion DAO tenant; stats cards draw the chosen view. |
| `lib/site-header.js` | 1.13.0 | Ally theme sets --t-accent(2); Home tabs + logo go straight to the selected ally's home (no aDAO flash). |
| `tla-stats.html` | T6.10 | T6.8 pool names · T6.9 past-epoch votes + overflow fix · T6.10 Pools tab vote charts. |
| `lib/site-footer.js` | 3.8 (this close) | `liondao-*` pages link `docs/changelogs/liondao-log.md`. |
| `assets/images/burning-lions-logo.png`, `assets/token-logos/ROAR20_LOGO.png`, `pyROAR_LOGO.png` | — | Logos. |

### platform-crons (Render)
| File | Ver | Runs in | Notes |
|---|---|---|---|
| `ally-positions/index.js` | 1.4.0 | org-ally-positions-liondao, hourly :20 | calls roar20-market then history-forward after positions; each duty's failure never fails the run. |
| `ally-positions/roar20-market.js` | 1.2.0 | same | ROAR20 price from the Raydium AMM v4 pool on chain (see C.1). `ROAR20_MARKET=off` disables. |
| `ally-positions/history-forward.js` | 1.0.2 | same | keeps `history/daily.json` going + today's row of `history/markets.json`. `HISTORY_FORWARD=off` disables. |
| `ally-positions/holders.js` | 1.4.0 | same, as the ≥ 20 h duty | custody rules; ROAR20 `known_owners`. |
| `nfts/nft-inventory/index.js` | Rev D.3 | org-nft-inventory-liondao, every 15 min | a collection with no staking module / no rarity (Burning Lions) → listings + real owners + market history only. |
| `help-agent/server.js` | 1.15.0 on main; **1.15.1 delivered, NOT committed** | tla-help-agent | rule 15 Lion DAO map; LION-DAO.md in the corpus; 1.15.1 = question-log flush every 2 min / 10 questions + on SIGTERM. |

### nft-collections
- `burning-lions/collection.json` — supply 7, stated_supply 12, `images.mode: token_uri`, media_index, proxies; traits
  `Name` (from name) + `Animated` (from animated); features.explorer + trait_filters true, analytics false (no sales ledger yet).
- `.github/scripts/mirror-images/mirror.js` 1.2.1 + `.github/workflows/mirror-images.yml` — token_uri mode (nft_info → gateways →
  metadata → image / animation_url; bytes sniffed; APNG found by walking chunks; proxy fallback). Wrote `images/{1,2,3,4,5}.png`,
  `images/7.gif`, `metadata/tokens/<id>.json`, `metadata/metadata.json` (tokens[] with image_file / kind / sources), `mirror-report.json`.
- The inventory writes `burning-lions/snapshots/{nfts,summary,floor-history}.json` + `claims/history.json`.

### tla-core
- `docs/curated/tenants.json` — liondao.collections [pixel-lions, burning-lions]; burning_lions.onboarded true;
  roar20.known_owners {`5Q544…pge4j1`: label "Raydium AMM v4 pool (vault authority)", kind program, program `675kPX9…`}; pyroar_pair + note.
- `docs/curated/trusted-addresses.json` — the CAPA community pool entry.
- `docs/ecosystem-knowledge/LION-DAO.md` — the ecosystem knowledge (help agent corpus key `lion-dao`).

### dao-originations/lion-dao (products)
`positions/{current,heartbeat}.json` + `daily/` (hourly) · `burn/holders.json` · `roar20/holders.json` · `roar/holders.json` (daily duty) ·
`roar20/market.json` + `roar20/market-history.json` (hourly) · `history/daily.json` (daily, since 2023-09-01) · `history/markets.json`
(daily, since 2026-09-26) · `governance/{proposals.json, members.csv}` (dao-governance cron).

---------------------------------------------------------------------------------------------------------------------------------
## B. How the home reads (the trend engine and the fact rows)

**Trend sources** (home-tiles 1.9.0 `openTrend(source)`; a tile gets a chart button only when its number has one of these):
- `nap:<SYM>` — network-and-prices' own series (ROAR, LUNA).
- `daily:<field>` — `history/daily.json` (roar_supply, roar_staked, pyroar_supply, pixelions_staked, validator rank / tokens / commission).
- `markets:<field>` — `history/markets.json` (roar_usd, pyroar_usd, roar20_usd, roar20_market_cap_usd, holder counts, bl_minted, bl_holders).
- `positions:<path>` — `positions/daily/index.json` (known_usd, by_section).
- `roar20:` — `roar20/market-history.json` (hourly).
- `floor:<slug>` — `nft-collections/<slug>/snapshots/floor-history.json`.
The modal is `class="ht ht-modal-ov"` (the `ht` class is what carries the CSS variables — without it the tabs were invisible). A series
with fewer points than the range says how many days it has; nothing is interpolated.

**Fact rows** (1.7.0), same three rows on every card:
- Tokens: market cap (price × live supply) · TVL (its DEX pools, both sides) · **kill a zero** = the USD of net buying that takes the price
  10× in a constant-product pool = (√10 − 1) × the quote side ≈ 2.162 × (TVL ÷ 2) ≈ **1.081 × TVL**; ignores fees and sellers.
- NFTs: market cap (floor × minted) · mark (midpoint of floor and last sale) · last sale (USD at the sale, when, vs today's floor).
- A row with no source shows why on hover (`reason_key`). The pixeLions total no longer adds a market cap to a volume (`total.sum=false`).

**Burning Lions on the home** (1.8.0): listings from the inventory's `nfts.json` join All Current Listings as class `burning-lions`
(classOf 'collection' rule); venue cards show a Burning Lions floor row; holders = distinct `real_owner` (a lion listed on BBL belongs to
its seller).

---------------------------------------------------------------------------------------------------------------------------------
## C. The products, in detail

### C.1 ROAR20 market (roar20-market.js 1.2.0)
Every API failed on the owner's first run (DexScreener "no pairs", GeckoTerminal $0, Jupiter null, pump.fun 530). ROAR20 graduated to a
**Raydium AMM v4** pool. The module finds it with `getProgramAccounts` on program `675kPX9…` (dataSize 752, memcmp the mint at offset 400
or 432, dataSlice 336/128 for the vault keys), reads both vault balances, prices SOL via Jupiter then CoinGecko, and computes
price = SOL reserve ÷ token reserve × SOL/USD; market cap = price × `getTokenSupply`. If no pool is found it falls back to the pump.fun
bonding curve account. Output: `roar20/market.json` {price_usd, market_cap_usd, liquidity_usd, source} + one row per hour in
`market-history.json`. Env: `HELIUS_API_KEY` / `HELIUS_RPC` / `SOLANA_RPC`.

### C.2 History forward (history-forward.js 1.0.2)
Each hourly run: (1) `history/daily.json` — for every closed UTC day not yet in the file, read state AT HEIGHT on the public node
(backfill.js's readers) **newest day first** (the public node prunes; old gaps are left for the archive Action, never interpolated); if
the node no longer serves the height, the 23:xx UTC run writes the day from latest state, labeled. (2) `history/markets.json` — rewrites
TODAY's row (the last run of the day is the row that stays): ROAR / LUNA from network-and-prices, pyROAR = the pair's ratio × ROAR, the
pair's depth, ROAR20 from roar20/market, holder counts from the three holder products, `bl_minted` (cw721 num_tokens), `bl_holders`
(distinct real owners from the inventory). Every figure names its source in `row.sources` or its reason in `row.reasons`.
**Archive gaps:** GitHub Action `liondao-backfill.yml` (platform-crons, workflow_dispatch only; inputs from / to / step_days — the
default step is 7, use **1** for daily), backfill.js 1.1.0 courtesy rules.

### C.3 Holders (holders.js 1.4.0)
1.2.0 custody (staking module, ampROAR hub, pairs, LP incentives hold ROAR FOR others — ranking them counted it twice, top 10 = 124 % of
supply) · 1.3.0 a CONTRACT is never ranked unless it is an owner (DAO core, treasury, multisig); ve3-asset-staking (92B ROAR of LP for TLA
stakers), distributors, bridge escrows, hubs and the token contract move to custody with their reason · 1.4.0 ROAR20 owners named in
`tenants.json roar20.known_owners` take the registry's kind (the Raydium authority is a pool).

### C.4 Burning Lions inventory (nft-inventory Rev D.3)
No staking module → Phase 5 and pending claims skipped; no rarity → market-history only; RUN_MODE=warm writes floor-history. If the
service ever refuses the collection, it is running old code → Manual Deploy (happened once).

---------------------------------------------------------------------------------------------------------------------------------
## D. TLA Stats T6.8 → T6.10

- **T6.8** (09-25, "is the Vote Market working?"): every pool is named once before anything keys on names — a raw-address pool takes
  Votion's plan title or the catalog's underlyings (raw kept as `name_raw`); a non-active twin gauge (LUNA-WBTC dewhitelisted) is "(old)".
- **T6.9** (09-26, a visitor asked "can you view TLA voting for previous epochs?"): Vote Breakdown → "Past epochs…" select
  (`#epoch-past-select`, filled from `pool-status-history.json` once it loads) shows every pool's VP at the last reading of that epoch, the
  ghost = the epoch before; the who-voted legend reads "live only". `openPastVote(epoch, bucket)` jumps there from a drill-down. Overflow:
  `_lockedOf` mirrors the ghost's logic and is in `_largest`; lock width clamped to 100 %; a label inside when the bar ends past 50 %;
  plot `overflow-x: clip`. Drill-down chart points answer on hover.
- **T6.10** (09-26): the Pools tab's per-bucket chart has a view select — **Votes (VP)** (default) · **Vote share %** · Liquidity & volume.
  Vote views: one line per pool in the bucket that had votes in any of the last 13 epochs (`VOTE_CHART_EPOCHS`), from
  `pool-status-history.json` (`vp_human`, `bucket_pct`; migration corpses skipped; duplicate name+dex folded to the better-covered row; same
  pair on two DEXes suffixed). Tier select = latest share: all / ≥ 5 % / 1–5 % / < 1 %. Share view draws the dashed 1 % line. Tooltip sorted
  by value, inactive flagged; click → `openPastVote`. The open epoch is labeled "(so far)". Also fixed: legend hover dimmed to an invalid
  colour (`'$&#26'` → `'$&26'`).

---------------------------------------------------------------------------------------------------------------------------------
## E. The chatbot (help-agent)

1.15.0 on main: SYSTEM rule 15 = the Lion DAO data map (which product answers which question, with paths); corpus source `lion-dao` =
LION-DAO.md; `read_product` accepts `key` (address / owner / wallet / id / day / date; map keys by digits, "31" → a31); key fields include
holders, proposals, days, rows, points, records, tenants; an object file is compacted field by field (header counts survive);
`source_url` names the repo the file really came from; NFT tools list burning-lions. NOTE: backticks inside the SYSTEM_RULES template
literal break the file — use quotes.
**Recent questions:** `tla-core/help-agent/questions/<yyyy-mm>.json` (QUESTION_LOG=1 + GITHUB_TOKEN on the service). 1.15.1 flushes every
2 min or 10 questions and on shutdown; before it, the batch waited 10 min / 25 questions and a redeploy dropped it.

---------------------------------------------------------------------------------------------------------------------------------
## F. Verification done at close

- Every file delivered this milestone byte-compared to main (see the ledger's AUDIT); only help-agent 1.15.1 is not committed.
- Products read live at close: roar20/market.json (capturedAt 2026-09-26T13:20Z, source "Solana (pool on chain)"), history/daily.json
  (167 days, last 2026-09-25), history/markets.json (1 row, 2026-09-26), roar/holders.json (1,803 ranked + 4 custody), Burning Lions
  summary (7 tokens).
- T6.10 in Chromium on the live products: PROJECT 20 lines E192–E204, BLUECHIP 21, SINGLE 21; the Liquidity view still builds (STABLE 3
  Astroport LPs); no page errors.
- Not done: the jsdom gates for the Lion DAO home/pages (last at 3.3) — queue item 1.

## G. Open (the ledger's QUEUE is authoritative)
BL #6 file · help-agent 1.15.1 commit · root mint.html delete · gates · BL sales ledger + original winners · pyROAR pair / ROAR20 volume ·
per-wallet own burns · per-voter past votes · stakers in the address catalog · pd-treasury · alliance ledger.

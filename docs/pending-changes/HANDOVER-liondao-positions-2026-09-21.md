# HANDOVER — Lion DAO positions, ROAR supply map, validator tracker, Pixel Lions staking APR (2026-09-21)

Written at the close of the 2026-09-21 chat (TLA queue items 1 + 2 landed and verified live). This is the brief for the
next chat, named from PROJECT_KNOWLEDGE opener 0. Everything the owner handed over is persisted under
`docs/fixtures/2026-09-21/` — read this file first, the fixtures second, then the "what we already have" section before
designing anything: most of the capture already exists as engines.

## §A — What the owner handed over (verbatim, 2026-09-21 ~01:30Z)

> "figure out the locations we can track their positions — this is a good start. this is the loaded portfolio for LION DAO
> defi positions, plus info from one of the council members on their positions."

**The four Lion DAO wallets** (from the council member; the same four the phoenix.money "LionDAO" portfolio is built on —
`fixtures/2026-09-21/phoenix-money-portfolio-config.json`, portfolio id `portfolio_1767834922906`, created 2026-01-08):

| Role (owner's words) | Address | Already in our registries? |
|---|---|---|
| pixeLions Terra ops wallet (Lew) | `terra1tgvlyhnqyxgwuw07h986jtnjhkcz72es3u33a9` | NO |
| pixeLions ⍺ msig | `terra1xgg9cf94ws2mawr6lyrdvmyxt48xkwgp8gvtsrcg2yktqvk8w2rqxflq06` | member-data/participants (has TLA locks #163, #727; VP 69,181), unnamed |
| LionDAO ops wallet (Ryan) | `terra1ksk66lcvzwaanc47nvn3athj4yzcpay8z8ru04` | docs/curated/wallets.json ("Lion DAO", bribe-funding wallet, 11 bribes 2024) · member-data/participants (named LionDAO; LP positions ampCAPA + ampROAR-ROAR; locks #258/#346/#439/#517/#1103/#434) |
| LD DAODAO (Lion DAO core / treasury) | `terra1tkersa2mqwy2h8exj799qx2xrhdu0dkymk9psp6v0k4kz4tkxucssgluec` | known_contracts.json · tenants.json liondao · PROJECT_KNOWLEDGE key addresses |

Owner's notes on them: "within those two ops wallets we have positions in Eris LA as both locks and LP position; bulk of USDC is
in msig. Lew also is holding $1,600 USDC on Kraken I think and about $300 in a position on Kraken as well — need to double
check with him on this" (off-chain — a curated line at most, never a product number).

**Lion DAO's validator**: `terravaloper1pet430t7ykswxuyhh56d4gk6rt7qgu9as6a5r0` (moniker "🦁 The Lion DAO"; the aDAO treasury
delegates 10,000 LUNA to it — dao-dashboard's lion scan reads it every hour).

**Token identities** (from the token-catalog + the phoenix.money response):
ROAR cw20 `terra1lxx40s29qvkrcj8fsa3yzyehy7w50umdvvnls2r830rys6lu2zns63eelv` · ampROAR tokenfactory
`factory/terra1vklefn7n6cchn0u962w3gaszr4vf52wjvd4y95t2sydwpmpdtszsqvk9wy/ampROAR` (1 ampROAR = 1.192562 ROAR at
2026-09-21 01:18Z, network-and-prices `lst_ratios.ampROAR`) · ampROAR-ROAR LP (SkeletonSwap) gauge
`native:factory/terra1d8ap3zyd6tfnruuuwvs0t927lr4zwptruhulfwnxjpqzudvyn8usfgl8ze/uLP` (SINGLE bucket) · its compounder
receipt `factory/terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx/61/single/amplp` · LUNA-ROAR (Astroport,
PROJECT bucket) · two non-TLA Astroport ROAR pairs the wallets hold LP in: `terra10se906awphtccf4vd83m0ulpmpt9v4msuakmpy0pwvmtxmup3kdq25rayn`-ROAR
and `terra1pez3qw6pa24a06wee404yy5mp37j57n3s9zjkdfjeapwqf78dntql0ngsy`-ROAR (identify the counter-tokens first; MOAR
`factory/terra1dndhtdr…/MOAR` appears beside ROAR on SkeletonSwap).

## §B — The phoenix.money portfolio, transcribed (the reference UI for gate #0)

Source: `fixtures/2026-09-21/phoenix-money-liondao-portfolio.json` = the backend's full JSON (`POST
backend.phoenix.money/portfolio`, captured 2026-09-21T01:26:03Z, LUNA ≈ $0.0550) — every position with denom, amount,
USD, type and underlying assets. The three screenshots are the same data as the owner saw it. **Total $189,983.45.**

| Wallet | Total | What is there |
|---|---|---|
| pixeLion Ops (Lew) | $868.09 | wBTC.atom 0.0048 ($393) · LUNA 41.9 · ROAR 67.1M ($21.6) · bLUNA 121.8 · compounder ampROAR-ROAR AMPLP 197.07M receipts = 1.367B ROAR ($439) |
| pixeLions ⍺ msig | $6,177.58 | **USDC.n 3,756.6 ($3,756 — "bulk of USDC")** · ampROAR 3.393B = 4.046B ROAR ($1,300) · ROAR 1.831B ($588) · bLUNA 296.5 · ampLUNA 1.19 · SS ampROAR-ROAR LP 0.6 · **TLA locks** #163 bLUNA 2,698.7 ($263) + #727 ampLUNA 1,880 ($242), both permanent |
| LionDAO Ops (Ryan) | $86,816.71 | **balances $36.8k**: USDC.inj 19,349 ($19,345) · wstETH 2.875 ($9,636) · USDt 6,740 ($6,738) · ampROAR 1.617B = 1.929B ROAR ($619) · rSWTH 173k · LUNA 1,084 · WHALE / SWTH / ampWHALE / bWHALE dust-value · **cw20 $8.3k**: ROAR 19.342B ($6,212) · ampLUNA 16,027.5 ($2,065) · CAPA 14,790 · SOLID 16.2 · **TLA staked $10.9k**: ampROAR-ROAR LP (S) 14.334B ($10,251) · ampCAPA 370,818 ($685) · **TLA locks $6.5k**: #517 arbLUNA 13,361.6 ($2,279) · #258 ampLUNA 13,797 ($1,778) · #346 ampLUNA 9,686.8 ($1,248) · #439 ampLUNA 7,985.2 ($1,029) · #1103 ampLUNA 1,586 ($204) · #434 stLUNA 1 — all permanent · **compounder $14.0k**: LUNA-ampLUNA-ampLP 22,216 ($7,903) · ampROAR-ROAR LP (S) 2.737B ($6,083) · five receipts phoenix.money could NOT price (ATOM-LUNA AMPLP 5,004.8 · ROAR-LUNA AMPLP 8.13M · bLUNA-LUNA LP (S) 6,972.7 · USDt-LUNA AMPLP 6,537.7 · LUNA-INJ AMPLP 396.47M — shown $0, type "default") · **Credia $10.2k**: ampLUNA collateral 33,988.7 ($4,380) · wBTC.atom collateral 0.0415 ($3,396) · LUNA-ampLUNA-ampLP collateral 5,364.9 ($1,908) · arbLUNA collateral 3,048.7 ($520) · Astroport LP dust |
| LD DAODAO | $96,121.06 | **ROAR 298.564B ($95,893 — 93 % of all ROAR shown)** · wBTC.atom 0.0027 ($224) · LUNA 13 · Astroport ROAR pair LP dust |

Underlying totals across the four: ROAR 378.03B · LUNA-equivalent 434,835 · CAPA 424,743 · USDC.inj 19,349 · USDt 6,740 ·
USDC.n 3,757 · wstETH 2.875 · wBTC.atom 0.049 (+ WHALE-family, SWTH/rSWTH, zLUNA receipts, dust ibc denoms).

**What phoenix.money does NOT show (our product must, or say why not):** LUNA delegations (the DAODAO's 10,000 LUNA on the
Lion DAO validator is absent from "balances"); Credia borrows (only collateral shown — the loop's debt side is missing, so
"$10,204" is gross, not net); Votion vaults (dapp listed, nothing returned — verify on chain); the five unpriced compounder
receipts; Enterprise / DAODAO NFT stakes (pixeLions staked in the membership contract are Lion DAO positions too); pending
rewards (TLA deposit/vote/rebase, PL NFT rewards). **The venue's UI is not the oracle; the contract is** — phoenix.money's
numbers are the side-by-side, never an input.

## §C — What we ALREADY have (do not rebuild)

- `platform-crons/lib/portfolio-assembler.js` + `lib/capture-engine.js` — the per-wallet capture every positions cron uses:
  TLA staked LP (amp / non-amp, post-take), locks (VP, boost, fixed, per-bucket votes), pending rewards, Credia, wallet
  balances, LST hub ratios. `member-data/tla-participants.js` runs it for every lock holder (205 today, incl. Ryan's wallet
  and the PL msig); `member-data/adao-positions.js` runs it for the aDAO roster + treasury + council. → A Lion DAO positions
  product is **the same engine on a curated roster** (crons per ALLY: one `org-member-data-liondao` service, or a duty in
  org-member-data keyed by tenants.json — the owner decides; the 2026-09-18 rule is "one service per cron family per ally").
- `docs/curated/tenants.json` liondao block (collections, daos, services, theme) — the ally registry; `docs/curated/wallets.json`
  (Ryan's wallet already curated as "Lion DAO"); `docs/curated/trusted-addresses.json` (names). The four wallets + roles go
  into tenants.json `liondao.wallets` (role, label, "counts_as": treasury / ops / msig) — curated upstream, once.
- `token-catalog/supply/capa` (capa-supply.js v2.1) — THE pattern for a token supply map: every custody form, two levels,
  sum-to-supply guards, rates from live contracts at capture, `*_unattributed` remainders published never dropped, per-wallet
  rows + whale scan; site `ampcapa-tool.html` + `gate-ampcapa-whales.mjs`. `token-catalog/supply/fuel` is the second instance
  (FUEL on Neutron + Terra IBC). → **ROAR supply map = a third instance of the same duty**, not a new cron.
- `dex-data` pool captures (Astroport + SkeletonSwap assets by denom), `member-data/tla-snapshot` (TLA staked per pool,
  compounder configs — 65 amplified pools), `network-and-prices` (ampROAR ratio, prices), `nft-collections/pixel-lions`
  (inventory, ledger, by-wallet shards, staked-in-Enterprise counts — 676 held by the contract: 552 attributed / 124 not).
- dao-dashboard's lion scan (validator delegation of the aDAO treasury) — the LCD pattern for delegations.

## §D — The asks, sized

1. **Lion DAO positions (the milestone).** Roster = the four wallets (+ any the council adds via tenants.json). Product:
   `member-data/liondao/positions/current.json` (or `dao-originations/lion-dao/positions/` — decide by the "where is Lion DAO"
   rule: three answers only — nft-collections/<collection>, tenants.json block, its own Render services). Per wallet: balances
   (native + cw20 + tokenfactory, denom → catalog symbol, priced by the feed, unpriced labeled), TLA staked (amp / non-amp,
   post-take), locks, compounder receipts priced through the compounder's own rates (the five phoenix.money left at $0 must
   price or say why), Credia collateral AND debt (net), Votion vaults, LUNA delegations (validator, amount, rewards), NFT
   stakes (pixeLions in Enterprise / DAODAO), pending rewards. Roll-up per role and for the DAO. Gate #0: side-by-side vs
   `fixtures/2026-09-21/phoenix-money-liondao-portfolio.json` — every position they show we show (within price noise), plus
   the ones they don't, each labeled. History: daily archive from day one (the treasury "What changed" framework: market
   movement / organic growth / DAO actions).
2. **ROAR supply map + whale tracker (the ampCAPA pattern).** Buckets the owner named: large wallets and projects holding ROAR;
   aDAO's staked ROAR pointed out; ROAR locked in ampROAR (hub state) + the large ampROAR holders with the converted ROAR
   amount; ROAR in TLA LPs (non-amp and amplified, post-take); ROAR in DEX LPs outside TLA (the two Astroport pairs above,
   MOAR-ROAR on SS, any other pool holding the cw20 — enumerate by the ROAR contract's `all_accounts` + pool registries);
   burned ROAR and the top burners (cw20 `burn` reduces `total_supply`; burners = tx events `wasm.action=burn` on the ROAR
   contract, walkable by height — Burning Lions drawings burned ROAR in windows; the owner will dig for the address set).
   Guard: total_supply = liquid + hub + LPs(TLA) + LPs(non-TLA) + DAO/treasury + unattributed; publish the remainder.
   Site: a `roar-tool.html` on the Lion DAO tenant, the ampcapa-tool shape (supply bars, whale table with names from the
   roster, aDAO / Lion DAO / PL DAO rows marked).
3. **Validator tracker.** Delegators of `terravaloper1pet430t…` (LCD `/cosmos/staking/v1beta1/validators/{v}/delegations`,
   paged), amounts, names from trusted-addresses / roster, a leaderboard; the DAO's own delegation marked; history daily
   (count + total + top-N). Cheap; fold into the Lion DAO positions cron as a duty.
4. **Pixel Lions staking APR.** Target = 5B ROAR/year to staked NFTs, split by staked count → per-NFT ROAR/year = 5B ÷
   staked; APR needs a value basis: at the collection's base floor in ROAR-equivalent or USD (BBL floor × LUNA price) — show
   BOTH bases labeled ("5B ROAR/yr ÷ 676 staked = 7.4M ROAR per NFT per year ≈ $X at today's ROAR; floor $Y → Z % APR at
   floor"); read the actual distributor contract before trusting "5B" (measure the contract, don't trust its docs). Where the
   rewards contract lives is not known yet — first step is finding it (Lion DAO / PL council).

## §E — Order (the owner: "let's get right into figuring out the locations we can track their positions")

1. Register the four wallets in tenants.json (roles) + trusted-addresses (labels) — one curated commit.
2. Positions product on the existing engine (§D.1), gated against the phoenix.money fixture; daily archive on.
3. ROAR supply map v1 (collection level, sum-guarded) as a token-catalog duty; whale rows v2.
4. Validator tracker duty.
5. PL staking APR — after the distributor contract is found.
6. Lion DAO Home / DAO page reads all of it (Milestone 2 as previously planned: the tenant home on lib/live-activity.js +
   these products).
Each step: fresh pull + gate + one ZIP per repo; docs bulk at the milestone; no aDAO change.

## §F — Open questions for the council (ask before building §D.4 and the Kraken line)
- The PL NFT rewards distributor: contract address, the 5B/yr rule (fixed? epoch-based?), claim mechanics.
- Kraken holdings (Lew): off-chain, curated line only, with "unverified" until he confirms.
- Which other addresses count as Lion DAO / Pixel Lions (bribe wallets, older ops wallets) — the registry line is the switch.

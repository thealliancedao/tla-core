# The cron fleet — what runs, when, what it feeds

> Source of truth for the **19 Render jobs** (14 console-verified 2026-08-25; +3 per-collection ledger crons
> 2026-09-12, owner screenshots; +org-nft-inventory-liondao 2026-09-18; +org-ally-positions-liondao 2026-09-21). All build from `thealliancedao/platform-crons` (root directory = the job folder,
> `npm install`, `node <entry>`), auto-deploy on commit, region Oregon. TLA jobs publish into `thealliancedao/tla-core`;
> everything aDAO/NFT publishes into `thealliancedao/nft-collections/<slug>/` (aDAO migrated 2026-09-13; tla-core is
> TLA data only). **tla-core has ZERO scheduled GitHub Actions since 2026-09-13** — every schedule is on Render; Actions are one-time.
> Freshness is judged in two places from these cadences — the page-side `aDAO-links-site/lib/cron-registry.js` and the
> `org-system-health` FRESHNESS_MAP — so **when a schedule or a job changes in the console, change it here and in
> BOTH registries the same day** (the registration checklist is at the bottom).

## The jobs

| Job (Render) | Folder · entry | Schedule (UTC) | Produces | Feeds |
|---|---|---|---|---|
| org-tla-voting | `tla-voting/` · index.js | hourly `0 * * * *` | vote/lock/bribe/reward event streams, distributions, vote-state, bribe-state + runway (pots per period), pd-bribes, pd-bribe-fit | Vote Market, Threshold Watch, PD Bribe Tracker, lp-grades governance lens |
| nap-org | `network-and-prices/` · index.js (3.1.0: stables keyed by the catalog symbol USDC.n / USDt / EURe; canary anchored by denom; `catalog_symbol_drift` published) | hourly `5 * * * *` | token prices, LST ratios, ratio history | every $ on the site (pricing doctrine), lp-grades, participants |
| org-system-health | `system-health/` · index.js (1.0.9: INV 8 nft_listings_reconcile — ledger-open listings == inventory listings per venue/token per collection in tenants.json; PL inventory freshness row · 1.0.8: fresh-but-failed heartbeat = violation, hb_status on every row, price-history writer heartbeat watched) | hourly `10 * * * *` | fleet heartbeat roll-up, guards (1.0.5: reads the nft-collections heartbeats too) | system-health page, footer freshness |
| org-votion | `votion/` · index.js | hourly `20 * * * *` | vault snapshots, holders, optimization worksheet (option set, plan, hysteresis), history, **yields** (1.4.0: vault/LST/native APR+APY from `exchange_rates`) | Vote Market (reproduced optimizer), Movers, Voting Leaders, lp-grades governance lens |
| org-dex-data | `dex-data/` · index.js (1.4.4: SS pool assets priced by denom first; 1.4.3 eris-apr at the live LUNA; 1.4.2) | hourly `1 * * * *` (moved from :31 on 2026-09-14 so the Monday boundary sample is ~60 s after 00:00; member-data at :45 now reads a 44-min-old pool snapshot) | Astroport + SkeletonSwap snapshots, daily CSVs, rolling 6-day, epoch aggregates, weekly-avg, Eris APR, Credia snapshot · Credia rate history (1.3.2) · **state-history duty (1.4.0, 2026-09-13): the epoch-boundary pool-state sample, one epoch a week on the first run after Mon 00:00, PUBLIC LCD (archive = backfill knob only), folded from the retired dex-state-history Action** | Pools charts, LP Grades work/efficiency lenses, PD tracker (weekly-avg), Top-by-APR, portfolio value curve (state-history) |
| org-member-data | `member-data/` · index.js (1.2.1: stables named by the catalog symbol; dao-dashboard 1.8) | hourly `45 * * * *` | tla-snapshot (pools, VP, bribes, rewards model), participants (204 lock holders), positions (155 members + treasury), dao-dashboard, apr-history + pool-status-history rollups; census at 02:xx | every tla-stats tab, index tiles, Advisor, LP Grades v2 inputs |
| org-tla-flows | `tla-flows/` · index.js (3.4.1 — pnl folds event months one at a time) | every 15 min `2,17,32,47 * * * *` | TLA flow events (claims, zaps, provides), pressure ledger (reward fates, token pressure); aux streams (votion, dex-liquidity, price samples → tla-core; **aDAO transfers → nft-collections/adao/transfers** via NFT_AUX_REPO/NFT_AUX_ROOT, 3.3.0) · **P&L rollup duty (3.4.0, 2026-09-13): weekly, first run at/after Mon 03:30 UTC, writes only changed files, folded from the retired tla-flows-pnl Action** | "Where the rewards go", dao-dashboard last_claims, NFT market history (transfers), member-portfolio P&L |
| org-nft-adao-daily (renamed from org-nft-flows 2026-09-12) | `nfts/nft-inventory/` (engine folder, moved from nfts/adao 2026-09-18) · flows.js · env `GITHUB_REPO=thealliancedao/nft-collections`, `NFT_ROOT=adao` | every 15 min `7,22,37,52 * * * *` | aDAO **daily state-diff** of nfts.json → `nft-collections/adao/flows/` — NOT the on-chain ledger; aDAO-only until folded into the engine | index NFT strip, help agent |
| org-nft-inventory | `nfts/nft-inventory/` (index.js Rev D.2: BBL completeness from cw721 ownership, limit 100 / stuck cursor named, per-auction completion; market-history 1.6.0 sourced from the ledger + seeds a new collection; analytics/compact-bundle/market-history run on warm/full) · **run-ally.js** (ALLY=adao → tenants.json → one `index.js` process per collection with COLLECTION=<slug>; index.js Rev D.1.2 chains analytics 1.1.1, market-history 1.5.0, compact-bundle 1.3.0) · env `ALLY=adao`, `GITHUB_REPO=thealliancedao/nft-collections`, no NFT_ROOT (the slug is the root) | every 15 min `12,27,42,57 * * * *` (hot; warm ≥23:30; full Sundays) | → `nft-collections/adao/snapshots/` + `adao/claims/`: nfts.json, summary, backing, listings, claims, floor/listing history, sales-enriched, analytics, explorer bundle | NFT Explorer, index NFT tiles, app, member-portfolio |
| **org-nft-inventory-liondao** (2026-09-18; PL market-history SEEDED 2026-09-19 03:14Z, explorer feed 03:2xZ) | `nfts/nft-inventory/` · run-ally.js · env `ALLY=liondao` (tenants.json: pixel-lions; burning-lions when onboarded), `GITHUB_REPO=thealliancedao/nft-collections`, no NFT_ROOT | every 15 min `9,24,39,54 * * * *` | → `nft-collections/pixel-lions/snapshots/` + `pixel-lions/claims/` (same products; backing null, no tiers) | explorer (manifest-driven, queued), app NFT tab |
| **org-nft-flows-adao** | `nfts/nft-flows/` · index.js (1.5.1 — bodies at walk time, by-token + by-wallet shards; classify.js 1.1.6), env `COLLECTION=adao` | hourly `4 * * * *` | on-chain event ledger → `nft-collections/adao/{ledger,ledger/by-token,ledger/by-wallet,raw/forward,nft-flows/heartbeat.json}` (block cursor) | app NFTs tab (next), explorer per collection (queued) |
| **org-nft-flows-pixel-lions** | `nfts/nft-flows/` · index.js, env `COLLECTION=pixel-lions` | hourly `24 * * * *` | same, `nft-collections/pixel-lions/` | same |
| **org-nft-flows-tla-locks** | `nfts/nft-flows/` · index.js, env `COLLECTION=tla-locks` | hourly `44 * * * *` | same, `nft-collections/tla-locks/` (lock lineage) | same |
| **org-ally-positions-liondao** (2026-09-21) | `ally-positions/` · index.js (1.1.1 — 2026-09-22: price by denom, receipts labeled + unpriced, Credia reader, per-section reconciliation, `daily/index.json` series never-shrink) · env `TENANT=liondao`, `GITHUB_REPO=thealliancedao/dao-originations`, own fine-grained PAT (dao-originations Contents write), `HELIUS_API_KEY` (for the ROAR20 duty, not built yet) | hourly `20 * * * *` | per roster wallet (tenants.json `liondao.wallets`): capture-engine TLA amp/non-amp + locks + pending + compounder receipts, every bank denom + catalog cw20 by catalog symbol (unpriced rows kept with a reason), delegations, the validator account's commission, Votion rows, pixeLions held/staked; roll-up by role + DAO; `reconciliation` = ours vs the phoenix.money fixture EVERY run (gate #0 published in the product) → `dao-originations/lion-dao/positions/{current,heartbeat}.json` + `daily/YYYY-MM-DD.json`. Duties queued in the same folder (crons per ally, one engine): burn ledger `lion-dao/burn/`, validator tracker `lion-dao/validator/`, ROAR20 `lion-dao/roar20/`, compounder-rate + Credia readers | Lion DAO home /liondao/ + its dao_treasury / dao_tla_deposits / dao_unclaimed / validator / burn / roar20 pages (HANDOVER-liondao-home-v2) |
| **ally-holders-liondao** (2026-09-22, a DUTY of org-ally-positions-liondao since index.js 1.2.2 — no service of its own) | `ally-positions/holders.js` (1.1.0) · runs at the end of an hourly positions run when `lion-dao/holders-heartbeat.json` is missing or ≥ 20 h old (`HOLDERS_EVERY_H`; `HOLDERS=off` disables) · env `HELIUS_API_KEY` on the positions service · mock-holders.js 32/32 | inside the hourly job, ~daily | THREE products: pyROAR (cw20 `all_accounts` walked whole + `balance`, kinds by roster / receiver / trust register / the chain for the top 60 with the chain's contract labels, EXACT supply gate) → `lion-dao/burn/holders.json`; ROAR20 (Helius DAS `getTokenAccounts` folded to owners, `getTokenSupply`, program-owned vs wallet by `getMultipleAccounts`) → `lion-dao/roar20/holders.json`; **ROAR whales** (per wallet: staked = `list_stakers` walked whole with an exact gate vs the module total · liquid = cw20 walked whole · ampROAR = bank `denom_owners` × the hub's `state.exchange_rate` · TLA-amp LP ≈ from participants · plain LP = each `roar_pools` pair's LP token holders × the pool's ROAR · total; a failed source leaves its column null for everyone) → `lion-dao/roar/holders.json`. Each + daily write-once. Heartbeat `lion-dao/holders-heartbeat.json`; a product with one failed read is not written. Registered: system-health 1.0.11 (R10, 30 h) · cron-registry `ally-holders-liondao`. |
| org-token-catalog | `token-catalog/` · token-catalog.js (writes price-history/heartbeat.json each run; fuel-supply probes the chain-registry Neutron REST list — publicnode is dead) | every 6 h `35 */6 * * *` | token catalog (symbols, decimals, identities), CAPA + FUEL supply maps, wallets-daily | every name and decimal on the site, ampCAPA / FUEL tools |
| org-dao-governance | `dao-governance/` · index.js | every 6 h `25 */6 * * *` | aDAO / Lion DAO / PixelLions proposals + members (into dao-originations) | DAO page, quick audit, help bot governance products |
| org-lp-grades | `lp-grades/` · lp-grades.js | daily `15 23 * * *` | v1 + v2 five-lens grades, write-once epoch archive | LP Grades tab, Vote Advisor, Pools tab letters |
| org-address-catalog | `address-catalog/` · address-catalog.js | daily `0 1 * * *` | trusted address register, catalog snapshots | audit resolvers, Voting Leaders names, quick audit |
| tla-help-agent | `help-agent/` · server.js (v1.14.0: nft_wallet / nft_token tools on the nft-flows shards; requires `../nfts/nft-flows/lib/by-wallet.js` from the same checkout) | web service (always on) | the help bot (corpus = tla-core docs; products via read_product) | every page's Help launcher |

The three `org-nft-flows-<slug>` jobs: one service per collection, env `COLLECTION` is the ONLY thing that differs —
the 2026-09-12 lesson is that a duplicated service inherits the source service's env, so two of the three ran for a
day as `adao` (three crons taking turns on one cursor) and, because they were in no registry, nothing went red.
The log line `org-nft-flows-<slug> · cursor … · watch N` is the check: the slug must match the service name.
Minutes :04/:24/:44 sit on nothing else in the map; each steady-state run is ~10 s / ~60 blocks (budget 4,000).

## GitHub Actions in tla-core — one-time only (2026-09-13)
No workflow in tla-core carries a `schedule:` any more. The last four were folded or deleted 2026-09-13: dex-state-history
→ org-dex-data 1.4.2 duty (public LCD forward — LIVE at the first run after the boundary, labeled sample_mode/boundary_height/delta_sec, because public nodes are pruned; `ARCHIVE_LCD` + `EPOCH_FROM`/`EPOCH_TO` on the service = a backfill run,
then removed); tla-flows-pnl → org-tla-flows 3.4.1 duty (month-at-a-time — 3.4.0 OOM'd at 256 MB); tla-flows-walk-supervisor and tla-flows-gap-fill deleted (the
archive walk completed at 21,481,530). What remains under `.github/` is dispatch-only (harvests, walks, fills, one-off
repairs). LAW: the archive node is for history the public endpoints cannot see — no scheduled job depends on it.

## Registration checklist — every time a job is added, renamed, or rescheduled
1. This file (row + the minute map below).
2. `aDAO-links-site/lib/cron-registry.js` — one entry (key, sourceUrl = its heartbeat, tsPath, job, cadence preset).
3. `platform-crons/system-health/index.js` FRESHNESS_MAP — one row (`repo:` when it publishes outside tla-core).
4. The job's own heartbeat must carry a timestamp the two registries read (`ran_at` / `capturedAt`).
A job in the console but in none of these is invisible; the only thing that catches it is a human reading logs.
5. A heartbeat that is FRESH but says `status: failed` is also invisible to the freshness rules (tla-locks, 2026-09-13:
   every hourly run failed for 13 h with a fresh heartbeat) — system-health rule queued (CHANGES_PENDING).

## Why the 23:00 run failed (2026-08-25) and the stagger that fixes it
At the top of every hour **four jobs commit to tla-core in the same minute**: tla-voting (:00), and the three
`*/15` jobs (tla-flows, nft-flows, nft-inventory) which all fire at :00. member-data also runs at :00 and its
participants publish lost the branch race four times in a row (GitHub 409 "is at … but expected …" = the
branch head moved between read and write). The module is isolated, so the rest of the run published; the
publishers now retry 8× with longer jitter. The real fix is not to pile jobs on the same minute.

**The schedule (dependency-ordered inside the hour) — LANDED 2026-09-10 (audit), the ledger rows added 2026-09-12:**

| minute | job | why here |
|---|---|---|
| :00 | org-tla-voting | chain events + pots first; everything downstream reads bribe-state |
| :05 | nap-org | prices next; member-data and lp-grades price from it |
| :10 | org-system-health | reads the heartbeats the :00/:05 jobs just wrote |
| :20 | org-votion | Votion re-optimizes every ~15 min; :20 gives a fresh worksheet before member-data |
| (inside :20, ~daily) | ally-holders-liondao duty | the positions run that finds the holders heartbeat ≥ 20 h old walks the pyROAR ledger, the ROAR20 owners and the ROAR whales (the cw20 walk is the long one) before it ends |
| :20 | org-ally-positions-liondao | shares votion's minute but publishes to a DIFFERENT repo (dao-originations), so no branch race; reads nap-org's :05 prices and the :01 dex-data snapshot |
| :30 | org-dex-data | pool snapshots BEFORE the TLA snapshot that cross-references them (today it runs at :00, so the snapshot reads the previous hour's) |
| :45 | org-member-data | reads dex-data (:30), votion (:20), prices (:05), bribe-state (:00) — all fresh; and no neighbour commits at :45 |
| 2,17,32,47 | org-tla-flows | keep 15-min; offset so the three fast jobs never share a minute |
| 7,22,37,52 | org-nft-adao-daily | " |
| 12,27,42,57 | org-nft-inventory | " |
| :04 · :24 · :44 | org-nft-flows-adao · -pixel-lions · -tla-locks | hourly ledgers (2026-09-12); free minutes, never beside tla-flows' RPC walks |
| 35 */6 | org-token-catalog | off the hour |
| 25 */6 | org-dao-governance | off the hour; proposals change slowly — 6 h is right, 2 h if a vote is live and the page must show it sooner |
| 23:15 daily | org-lp-grades | unchanged; after member-data's 22:45 run |
| 01:00 daily | org-address-catalog | unchanged |

**Cadence judgement (more vs less):**
- **Right as they are:** tla-voting hourly (the auction needs the pots hourly; the page reads the manager live in between), nap hourly (tiles are live RPC; the hourly is the committed reference price), tla-flows / nft 15-min (event walkers are cheap and the market is live), lp-grades daily (grades are epoch-level; more often would just churn the streak), address-catalog daily.
- **Could be lighter:** member-data's **participants** module (204 portfolios every hour) — the leaderboards would be identical on a 6-hourly cadence; gate it by hour like the census. **positions** (155 members) is fine hourly because the member tiles read it.
- **Could be heavier:** org-votion to every 30 min in the last day before `voteBefore` (the option set can change as pots get funded); org-dao-governance to 2 h while a proposal is open. Neither is needed for correctness — the pages already read the live sources for the numbers that matter in-period.
- **Watch:** tla-snapshot logged "votion: no recent file found" at 23:00 even though org-votion ran at 22:20 — check what file/tolerance it looks for (a 40-minute-old capture should count as recent).

## Housekeeping
- All jobs run on Render tokens that expire end-2026 (Nov rollover checklist in CHANGES_PENDING). tla-core itself uses a no-expiry token; nap-org and tla-help-agent carry their own.
- Never ship a `.github/` folder in platform-crons; GitHub-Action one-offs live in tla-core (nft-collections carries its own one-time workflows: fcd-harvest · nft-flows-walk · nft-flows-derive · nft-flows-forward · import-from-tla-core).
- The `org-nft-flows-<slug>` tokens need write on `nft-collections` only; `GITHUB_REPO=thealliancedao/nft-collections`.


## Week-one law (2026-09-14/15)
Render crons run on a ~256 MB heap. A duty folded from an Action never holds every month of a series; read → fold → drop.
Every folded duty's mock runs under `node --max-old-space-size=200` on the real months — the cap is part of the gate.
A fresh heartbeat is not a healthy job (system-health 1.0.7+). Public nodes are pruned: read boundaries live, never the past.


## Per-ally rule (2026-09-18)
Crons are per ALLY, not per collection — see tla-core/docs/curated/tenants.json and nfts/nft-inventory/run-ally.js.
Positions likewise (2026-09-21): `ally-positions/` is ONE tenant-agnostic engine; a Render service per ally (`org-ally-positions-<ally>`,
env `TENANT=<ally>`) publishing into `dao-originations/<ally-folder>/positions/`. New per-ally duties (burn ledger, validator tracker,
ROAR20, readers) are folded into this engine, never new services. 2026-09-22/23: `holders.js` is the second entry point of the same folder, run as a DUTY by index.js when its heartbeat is
≥ 20 h old (owner: one job per ally — the separate daily service was never created); `backfill.js` is a one-shot GitHub Action
(`.github/workflows/liondao-backfill.yml`, workflow_dispatch ONLY, secrets ARCHIVE_LCD + DAOO_TOKEN; backfill.js 1.1.0: sequential ≤ RPS (ceiling 4), backoff on 429/5xx, stop after 5 refusals, MAX_REQUESTS / MAX_MINUTES caps, RUN_MODE=manual required, the run's out/ kept as an artifact — the archive is a courtesy) that reads STATE AT HEIGHT from an
archive LCD (pyROAR + ROAR supply, ROAR staked, pixeLions staked, the validator's rank/tokens/commission — the last block of every UTC
day) into `lion-dao/history/daily.json`, never-shrink; a height the node no longer serves is skipped, never interpolated. FIRST RUN 2026-09-22: 160 weekly days 2023-09-01→2026-09-18, 3,197 requests in 26.7 min at 1.99 rps, 0 retries, published (49f8533).
Series (2026-09-22): the engine writes `positions/daily/<date>.json` (one archive per day, write-once) AND `positions/daily/index.json`
(one row per archived day: known_usd, by_section, validator commission — merged never-shrink, never rebuilt from a failed read). The
pages' Trend and What Changed read the index and open two archived days; depth is the archive, the page is its renderer.

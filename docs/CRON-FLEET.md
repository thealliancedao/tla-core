# The cron fleet — what runs, when, what it feeds

> Source of truth for the **17 Render jobs** (14 console-verified 2026-08-25; +3 per-collection ledger crons
> 2026-09-12, owner screenshots). All build from `thealliancedao/platform-crons` (root directory = the job folder,
> `npm install`, `node <entry>`), auto-deploy on commit, region Oregon. Most jobs publish into
> `thealliancedao/tla-core`; the three `org-nft-flows-<slug>` jobs publish into `thealliancedao/nft-collections/<slug>/`.
> Freshness is judged in two places from these cadences — the page-side `aDAO-links-site/lib/cron-registry.js` and the
> `org-system-health` FRESHNESS_MAP — so **when a schedule or a job changes in the console, change it here and in
> BOTH registries the same day** (the registration checklist is at the bottom).

## The jobs

| Job (Render) | Folder · entry | Schedule (UTC) | Produces | Feeds |
|---|---|---|---|---|
| org-tla-voting | `tla-voting/` · index.js | hourly `0 * * * *` | vote/lock/bribe/reward event streams, distributions, vote-state, bribe-state + runway (pots per period), pd-bribes, pd-bribe-fit | Vote Market, Threshold Watch, PD Bribe Tracker, lp-grades governance lens |
| nap-org | `network-and-prices/` · index.js | hourly `5 * * * *` | token prices, LST ratios, ratio history | every $ on the site (pricing doctrine), lp-grades, participants |
| org-system-health | `system-health/` · index.js | hourly `10 * * * *` | fleet heartbeat roll-up, guards (1.0.5: reads the nft-collections heartbeats too) | system-health page, footer freshness |
| org-votion | `votion/` · index.js | hourly `20 * * * *` | vault snapshots, holders, optimization worksheet (option set, plan, hysteresis), history, **yields** (1.4.0: vault/LST/native APR+APY from `exchange_rates`) | Vote Market (reproduced optimizer), Movers, Voting Leaders, lp-grades governance lens |
| org-dex-data | `dex-data/` · index.js | hourly `31 * * * *` | Astroport + SkeletonSwap snapshots, daily CSVs, rolling 6-day, epoch aggregates, weekly-avg, Eris APR, Credia snapshot · Credia rate history (1.3.2: indexer hourly points, grow-only monthly + 7-day ranges in credia/rates/) | Pools charts, LP Grades work/efficiency lenses, PD tracker (weekly-avg), Top-by-APR |
| org-member-data | `member-data/` · index.js | hourly `45 * * * *` | tla-snapshot (pools, VP, bribes, rewards model), participants (204 lock holders), positions (155 members + treasury), dao-dashboard, apr-history + pool-status-history rollups; census at 02:xx | every tla-stats tab, index tiles, Advisor, LP Grades v2 inputs |
| org-tla-flows | `tla-flows/` · index.js | every 15 min `2,17,32,47 * * * *` | TLA flow events (claims, zaps, provides), pressure ledger (reward fates, token pressure); aux streams (votion, dex-liquidity, **nfts/adao/transfers**, price samples) | "Where the rewards go", dao-dashboard last_claims, NFT market history (transfers) |
| org-nft-adao-daily (was org-nft-flows — rename pending in the console, 2026-09-12) | `nfts/adao/` · flows.js | every 15 min `7,22,37,52 * * * *` | aDAO **daily state-diff** of nfts.json (`nfts/adao/flows/`) — NOT the on-chain ledger | index NFT strip, help agent |
| org-nft-inventory | `nfts/adao/` · index.js (chains analytics.js, market-history.js, compact-bundle.js) | every 15 min `12,27,42,57 * * * *` (hot); warm ≥23:30; full Sundays | nfts.json, summary, backing, listings, claims, floor/listing history, sales-enriched, analytics, explorer bundle | NFT Explorer, index NFT tiles, app, member-portfolio |
| **org-nft-flows-adao** | `nfts/nft-flows/` · index.js, env `COLLECTION=adao` | hourly `4 * * * *` | on-chain event ledger → `nft-collections/adao/{ledger,raw/forward,nft-flows/heartbeat.json}` (block cursor) | app NFTs tab (next), explorer per collection (queued) |
| **org-nft-flows-pixel-lions** | `nfts/nft-flows/` · index.js, env `COLLECTION=pixel-lions` | hourly `24 * * * *` | same, `nft-collections/pixel-lions/` | same |
| **org-nft-flows-tla-locks** | `nfts/nft-flows/` · index.js, env `COLLECTION=tla-locks` | hourly `44 * * * *` | same, `nft-collections/tla-locks/` (lock lineage) | same |
| org-token-catalog | `token-catalog/` · token-catalog.js | every 6 h `35 */6 * * *` | token catalog (symbols, decimals, identities), CAPA + FUEL supply maps, wallets-daily | every name and decimal on the site, ampCAPA / FUEL tools |
| org-dao-governance | `dao-governance/` · index.js | every 6 h `25 */6 * * *` | aDAO / Lion DAO / PixelLions proposals + members (into dao-originations) | DAO page, quick audit, help bot governance products |
| org-lp-grades | `lp-grades/` · lp-grades.js | daily `15 23 * * *` | v1 + v2 five-lens grades, write-once epoch archive | LP Grades tab, Vote Advisor, Pools tab letters |
| org-address-catalog | `address-catalog/` · address-catalog.js | daily `0 1 * * *` | trusted address register, catalog snapshots | audit resolvers, Voting Leaders names, quick audit |
| tla-help-agent | `help-agent/` · server.js | web service (always on) | the help bot (corpus = tla-core docs; products via read_product) | every page's Help launcher |

The three `org-nft-flows-<slug>` jobs: one service per collection, env `COLLECTION` is the ONLY thing that differs —
the 2026-09-12 lesson is that a duplicated service inherits the source service's env, so two of the three ran for a
day as `adao` (three crons taking turns on one cursor) and, because they were in no registry, nothing went red.
The log line `org-nft-flows-<slug> · cursor … · watch N` is the check: the slug must match the service name.
Minutes :04/:24/:44 sit on nothing else in the map; each steady-state run is ~10 s / ~60 blocks (budget 4,000).

## Scheduled work still in GitHub Actions (tla-core) — doctrine says Render
| workflow | schedule | disposition (2026-09-12 audit) |
|---|---|---|
| dex-state-history | Mon 02:50 | real weekly work → move to Render (needs the archive-LCD secret as a Render env) |
| tla-flows-pnl | Mon 03:30 | real weekly work → move to Render |
| tla-flows-walk-supervisor | every 2 h | supervises the archive walk, which completed at 21,481,530 → retire |
| tla-flows-gap-fill | every 4 h | "until done, then exits in seconds"; tla-flows is at head → retire (keep `deepen` as dispatch-only if wanted) |

## Registration checklist — every time a job is added, renamed, or rescheduled
1. This file (row + the minute map below).
2. `aDAO-links-site/lib/cron-registry.js` — one entry (key, sourceUrl = its heartbeat, tsPath, job, cadence preset).
3. `platform-crons/system-health/index.js` FRESHNESS_MAP — one row (`repo:` when it publishes outside tla-core).
4. The job's own heartbeat must carry a timestamp the two registries read (`ran_at` / `capturedAt`).
A job in the console but in none of these is invisible; the only thing that catches it is a human reading logs.

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

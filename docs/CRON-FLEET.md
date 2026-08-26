# The cron fleet — what runs, when, what it feeds

> Source of truth for the 14 Render jobs (console-verified 2026-08-25, owner screenshots). All build from
> `thealliancedao/platform-crons` (root directory = the job folder, `npm install`, `node <entry>`), auto-deploy
> on commit, region Oregon. Every job publishes into `thealliancedao/tla-core`; the page-side
> `lib/cron-registry.js` judges freshness from these cadences. When a schedule changes in the console,
> change it here and in cron-registry.js the same day.

## The jobs

| Job (Render) | Folder · entry | Schedule (UTC) | Produces | Feeds |
|---|---|---|---|---|
| org-tla-voting | `tla-voting/` · index.js | hourly `0 * * * *` | vote/lock/bribe/reward event streams, distributions, vote-state, bribe-state + runway (pots per period), pd-bribes, pd-bribe-fit | Vote Market, Threshold Watch, PD Bribe Tracker, lp-grades governance lens |
| org-member-data | `member-data/` · index.js | hourly `0 * * * *` | tla-snapshot (pools, VP, bribes, rewards model), participants (204 lock holders), positions (155 members + treasury), dao-dashboard, apr-history + pool-status-history rollups; census at 02:xx | every tla-stats tab, index tiles, Advisor, LP Grades v2 inputs |
| nap-org | `network-and-prices/` · index.js | hourly `5 * * * *` | token prices, LST ratios, ratio history | every $ on the site (pricing doctrine), lp-grades, participants |
| org-system-health | `system-health/` · index.js | hourly `10 * * * *` | fleet heartbeat roll-up, guards | system-health page, footer freshness |
| org-votion | `votion/` · index.js | hourly `20 * * * *` | vault snapshots, holders, optimization worksheet (option set, plan, hysteresis), history | Vote Market (reproduced optimizer), Movers, Voting Leaders, lp-grades governance lens |
| org-dex-data | `dex-data/` · index.js | hourly `0 * * * *` | Astroport + SkeletonSwap snapshots, daily CSVs, rolling 6-day, epoch aggregates, weekly-avg, Eris APR, Credia snapshot | Pools charts, LP Grades work/efficiency lenses, PD tracker (weekly-avg), Top-by-APR |
| org-tla-flows | `tla-flows/` · index.js | every 15 min `*/15 * * * *` | TLA flow events (claims, zaps, provides), pressure ledger (reward fates, token pressure) | "Where the rewards go", dao-dashboard last_claims |
| org-nft-flows | `nfts/adao/` · flows.js | every 15 min `*/15 * * * *` | NFT transfers / sales / listing lifecycle, market history | NFT Explorer analytics, floor history, release history |
| org-nft-inventory | `nfts/adao/` · (inventory entry) | every 15 min `*/15 * * * *` | nfts.json, summary, backing, listings, claims, explorer bundle | NFT Explorer, index NFT tiles |
| org-token-catalog | `token-catalog/` · token-catalog.js | every 6 h `0 */6 * * *` | token catalog (symbols, decimals, identities), CAPA + FUEL supply maps, wallets-daily | every name and decimal on the site, ampCAPA / FUEL tools |
| org-dao-governance | `dao-governance/` · index.js | every 6 h `0 */6 * * *` | aDAO / Lion DAO / PixelLions proposals + members (into dao-originations) | DAO page, quick audit, help bot governance products |
| org-lp-grades | `lp-grades/` · lp-grades.js | daily `15 23 * * *` | v1 + v2 five-lens grades, write-once epoch archive | LP Grades tab, Vote Advisor, Pools tab letters |
| org-address-catalog | `address-catalog/` · address-catalog.js | daily `0 1 * * *` | trusted address register, catalog snapshots | audit resolvers, Voting Leaders names, quick audit |
| tla-help-agent | `help-agent/` · server.js | web service (always on) | the help bot (corpus = tla-core docs; products via read_product) | every page's Help launcher |

## Why the 23:00 run failed (2026-08-25) and the stagger that fixes it
At the top of every hour **four jobs commit to tla-core in the same minute**: tla-voting (:00), and the three
`*/15` jobs (tla-flows, nft-flows, nft-inventory) which all fire at :00. member-data also runs at :00 and its
participants publish lost the branch race four times in a row (GitHub 409 "is at … but expected …" = the
branch head moved between read and write). The module is isolated, so the rest of the run published; the
publishers now retry 8× with longer jitter. The real fix is not to pile jobs on the same minute.

**Recommended schedule (dependency-ordered inside the hour):**

| minute | job | why here |
|---|---|---|
| :00 | org-tla-voting | chain events + pots first; everything downstream reads bribe-state |
| :05 | nap-org | prices next; member-data and lp-grades price from it |
| :10 | org-system-health | reads the heartbeats the :00/:05 jobs just wrote |
| :20 | org-votion | Votion re-optimizes every ~15 min; :20 gives a fresh worksheet before member-data |
| :30 | org-dex-data | pool snapshots BEFORE the TLA snapshot that cross-references them (today it runs at :00, so the snapshot reads the previous hour's) |
| :45 | org-member-data | reads dex-data (:30), votion (:20), prices (:05), bribe-state (:00) — all fresh; and no neighbour commits at :45 |
| 2,17,32,47 | org-tla-flows | keep 15-min; offset so the three fast jobs never share a minute |
| 7,22,37,52 | org-nft-flows | " |
| 12,27,42,57 | org-nft-inventory | " |
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
- Never ship a `.github/` folder in platform-crons; GitHub-Action one-offs live in tla-core.

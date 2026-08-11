> **⚠ CHANGELOGS MOVED (2026-07-31):** all per-page changelogs (`index-log.md`,
> `tla-log.md`, etc.) now live in `thealliancedao/tla-core/docs/changelogs/`.
> The copies in THIS repo are frozen/abandoned — read and append ONLY in the
> org repo. Site pages already fetch from the new location.

# aDAO Website Project Knowledge

> **Canonical context document.** Loaded at the start of every chat session so Claude can pick up where we left off without the user re-explaining anything.
> 
> **For Claude:** This file is yours to maintain. See "Tracking responsibilities" below — you are expected to update this file proactively as the project evolves, not only when explicitly asked.

---

## ⭐ Tracking responsibilities — for Claude

The user has explicitly stated they will forget things and lose track. **Claude is the primary record-keeper.** Don't wait for the user to say "remember this" — when any of the triggers below fire during a conversation, prepare an updated copy of this file (or `CHANGES_PENDING.md`) at the same time as the actual work being done.

### When to update PROJECT_KNOWLEDGE.md (this file)

| Trigger | Add it to | Why |
|---|---|---|
| User states a preference as a rule (e.g. "always do X", "I never want Y") | "Design principles" section | These are persistent, not one-off |
| We discover a non-obvious bug root cause | "Critical CSS gotchas" or new gotcha section | Prevents repeat debugging |
| New external dependency added (CDN, API, data source) | "External dependencies" section | Recovery + audit |
| New CSS class pattern or naming convention established | "Class system" section | Code consistency across pages |
| A page is added or removed from the site | "Current pages" table + "Pages removed" list | Sitemap accuracy |
| New repo touched (image hosting, data storage, etc.) | "Storage / data repos" section | Future Claude needs full inventory |
| User mentions ecosystem entity by name (project, tool, person) | "Key entities" section | Avoid confusion with similar-named things |
| A device/browser is tested or fails | "Tested environments" section | Honest compatibility tracking |
| Naming collision discovered (e.g. our project vs. similar-named other) | "Naming clarification" section | SEO + comms accuracy |
| User clarifies a workflow constraint (e.g. file naming on download) | "Working conventions" section | Smooth handoffs |
| Admin-tool bug found or fixed (data-capture, snapshot tools) | "Critical data-capture gotcha" section | Prevent regression; admin tools don't have a changelog footer so this doc is the only record |
| Catalog cron bug root-caused (`tla-registry` cron, `tla-catalog.html`, or schema/curation files) | "TLA Chain Registry catalog system" section ⟶ "Critical catalog gotchas" subsection, AND prepend a Rev entry in `catalog-log.md` | Catalog bug class lessons are easy to forget; document the **why** not just the fix |
| New on-chain query method discovered, or new contract address surfaced for future queries | `thealliancedao/tla-core/docs/queries.md` (moved 2026-07-14) — add a Q-{Contract}-{Method} block with human label, input shape, output shape, and what it powers | This is the build foundation for the future query tool — don't lose method discoveries |
| Catalog-related curated file changes (`token_overrides.json`, `acquisition_guides.json`, `known_contracts.json`, etc.) | `catalog-log.md` Rev entry | Curation changes are not code changes but DO affect the catalog output — track them so future audits can correlate "this token's display changed because we added an override" |

### When to update CHANGES_PENDING.md

| Trigger | Add it to | Why |
|---|---|---|
| User mentions a feature in passing as "we should do this someday" | "Future projects" section | Don't lose ideas |
| We notice tech debt while working on something else | "Low priority / cleanup" section | Track without derailing current work |
| User asks an open question we don't answer immediately | "Open questions" section | Resume the discussion later |
| A bug found but not fixed in current session | "Active / next round" with priority | Visible queue |
| External task identified (e.g. "submit to Search Console") | Top of "Active / next round" if blocking | Visible queue |

### Rev numbers — single source of truth

Rev numbers live in 3 places and they MUST stay in sync:

1. **The "Current pages" table in this file** — canonical at-a-glance reference. Future Claude reads this on startup. **This is the source of truth.**
2. **Page footer** (`Rev X.Y · Changelog` in the HTML) — what users see
3. **`<page>-log.md` in `website-adao-core`** — full revision history

Whenever Claude bumps a rev on any page, all three update in the same push:

| Trigger | Action |
|---|---|
| User-visible change to any page is shipped | Bump rev in HTML footer, prepend new entry to that page's log file, AND update this table |
| Doc-only changes (this file, CHANGES_PENDING.md) | Do NOT bump any rev |
| New page added to the site | Add row to the table with starting rev (usually 1.0) and create its log file |

If a page doesn't have a rev/changelog footer yet (the cross-page rollout is still in progress), it shows `—` in the rev column. Bump it the first time we touch that page after adding the chrome.

### How to know if something is "trackable"

If the answer to ANY of these is yes, it goes in a doc:
- "Will the next Claude need to know this if I forget to mention it?"
- "Is this a decision rather than just an implementation detail?"
- "Could this surprise someone who doesn't know the history?"
- "Did the user use words like 'always', 'never', 'prefer', 'remember', 'note', 'important', 'careful'?"

When in doubt, add it. Over-documentation is fine; lost context is not.

---

## 🗺 REPO PLACEMENT MAP — BINDING (added 2026-07-14 after two misplacement incidents)

Every file has exactly one home. Violating this map caused two failed deliveries
on 2026-07-14 (Claude packaged a workflow beside its script instead of following
the established split; DeFi Patriot's understanding was correct both times). Check the
target repo's existing tree BEFORE packaging any deliverable.

| What | Where | Never |
|---|---|---|
| Render job code (crons + their libs) | `thealliancedao/platform-crons/<job>/` | no `.github/` folder ever ships here |
| GitHub-Action one-off scripts | `thealliancedao/tla-core/.github/scripts/<module>/<script>.js` — SELF-CONTAINED (fcd-fill / flows-fill / seed pattern) | never cross-repo checkout; never left in platform-crons |
| Workflows for those one-offs | `thealliancedao/tla-core/.github/workflows/<module>-<task>.yml` — own-repo checkout, `${{ github.token }}` + `permissions: contents: write`, zero secrets | |
| Data products | `thealliancedao/tla-core/<module>/<product>/` | code never lives at data paths |
| Data/capture-layer docs (SPECs, CHANGES_PENDING, storage design, audits, doctrine) | `thealliancedao/tla-core/docs/pending-changes/` — SINGLE HOME since 2026-07-14 | never update the old website-adao-core copies (deleted) |
| Website-runtime + bootstrap docs (per-page `*-log.md` the site fetches, PROJECT_KNOWLEDGE, project instructions, MISSION/DIRECTION/STATUS, website-feature SPECs) | `defipatriot/website-adao-core/` | |
| Personal repos (`cron-scripts`, data_2026 repos) | RETIRING — zero further investment, never patched (DeFi Patriot's call 2026-07-14) | |

Shared logic between a Render job and a one-off script: byte-identical marked
block (`<<NAME vN>>` … `<<NAME vN END>>`), diff-verified after ANY change —
the flows-classifier rule. Current instances: `<<FLOWS CLASSIFIER v1>>`,
`<<DISTRIBUTIONS CORE v1>>` (platform-crons/tla-voting/lib/distributions.js ↔
tla-core/.github/scripts/tla-voting/harvest-distributions.js).

---

## 📌 State addendum — 2026-07-21 (July arc)

- **Site LIVE at canonical URLs:** `tla-stats.html` (was test.html) and
  `member-portfolio.html` (was test2.html); legacy stats preserved as
  `tla-stats-legacy.html`. Vercel page views site-wide + custom events
  (board_expand, bribe_board_mode, portfolio_view/save; Pro to surface).
- **Voting capture:** org-tla-voting **2.3.1** (v6.1): governance-executed
  bribes captured (collision-aware msg_index; dynamic `dao_attr` attribution
  — exactly one dao attr → that DAO core is the briber, else msg_target; a
  new DAO can never be absorbed into another's label). Gate 116/116 on the
  PD fixtures (prop 250 = 34,763.53 LUNA net; prop 247 = 37,912.49). FCD
  re-derive recovered 2,640 contract-initiated bribes to genesis. PD's LUNA
  stays honestly unattributed (capture gaps) until registry backfill.
- **votion-positions v1.1.0** (cron-scripts): discovery = org address-catalog
  ∪ deposit-events, one balances sweep, MEASURED completeness
  (`supply_coverage_pct`), real `total_tvl_usd` + `discovered_holders_usd`,
  schema 2. Hard-won facts: public LCD tx_search retention ~2–3 weeks;
  `denom_owners` NOT served by publicnode or phoenix-lcd.
- **Ops doctrine additions:** crons must not die on a single GitHub 5xx at
  publish (retry hardening queued — the 07-20 outage killed 10 crons at the
  PUT while capture succeeded everywhere). Old/new cron pairs co-running;
  retire per parallel-run doctrine only after duty ports (epoch-aggregation
  → org stack is the prerequisite for retiring astroport-snapshot).
- **Portfolio Arc queue:** VP model audit (tile 1.31M vs banner 1.18M→1.20M),
  APR convention + price-source audit (Eris arbLUNA ~$0.12 vs hub-ratio
  ~$0.055), SPEC-portfolio-pnl (flows × price-history), design pass.

---

## Project basics

- **Owner:** defipatriot — council member of The Alliance DAO (aDAO)
- **Main repo (deployed code only):** `github.com/defipatriot/aDAO-links-site` — HTML, CSS, JS, sitemap, manifest. **Never put docs/notes here** — Vercel only deploys what's in this repo, so keep it focused on what's actually rendered to users.
- **Image hosting repo:** `github.com/defipatriot/aDAO-Image-Files` (favicons, logos, OG images, collection PFPs — referenced via raw.githubusercontent.com URLs)
- **Docs repo:** `github.com/defipatriot/website-adao-core` — `PROJECT_KNOWLEDGE.md`, all changelog `*-log.md` files, website-feature SPECs, plus `sitemap.xml`, `robots.txt`, `site.webmanifest`, etc. Everything lives at the **root** of the repo — no subdirectories. **Since 2026-07-14 this repo holds ONLY site-runtime + bootstrap docs** — the platform work queue (`CHANGES_PENDING.md`), `queries.md`, storage design, and all data/capture-layer SPECs live in `thealliancedao/tla-core/docs/` (see the REPO PLACEMENT MAP above). Edits here don't trigger Vercel redeploys.
- **Live URL (canonical):** `thealliancedao.com`
- **Live URL (alias, 308 redirects):** `theadao.com`
- **Vercel fallback URL:** `a-dao-links-site.vercel.app` (still works, useful for testing)
- **Deployment:** Vercel (auto-deploys on push to `main`)
- **Stack:** Static HTML + Tailwind CSS (CDN) + vanilla JS. No build step. Each `.html` file is self-contained.

### Repo size facts (rough)
- `index.html` ≈ 12,400 lines / ~700 KB — the main dashboard, by far the largest file
- `tla_tool.html` ≈ 621 KB — TLA admin tool
- `tla-tool_ext.html` ≈ 433 KB — TLA extensions tool
- `tla-stats.html` ≈ 377 KB — public TLA dashboard
- `dao_governance_tool.html` ≈ 268 KB
- All other pages are <150 KB

These large files matter when considering refactors (file size affects parse time + Vercel cold-start cost) and when planning a static-site-generator migration.

---

## ⭐ Design principles (user preferences as rules)

These came from explicit user statements across multiple sessions. Treat them as project-wide rules unless the user overrides for a specific case.

### 1. Honest data over false positives
**The user prefers blank tiles, error indicators, or spinners over showing stale/fallback data that might be wrong.** Quote: *"I would rather they all just be blank so people dont get wrong idea with the data... if it has data in it I may think its working."*

In practice:
- No hardcoded fallback values that mask broken fetches
- No "snapshot N stale" yellow text — replace with spinner
- Treasury totals only shown if ALL assets successfully priced
- Use green pulse dot for live, spinner for loading. No red dots, no em-dashes.
- Exception: LST ratios (`bLUNA || 1.6048` etc.) are kept because they drift slowly and the fallback is less misleading than the alternative. This is tech debt to revisit.

### 2. Clean over busy
User has repeatedly rejected denser UIs in favor of cleaner ones. Quote: *"makes it to busy."*

In practice:
- Footer = condensed link row, not a multi-column site map
- App install info = button + popup, not always-visible block
- Mobile tile titles = uniform short labels, not full descriptive names
- New UI elements should justify their visual weight

### 3. Mobile-first treatment, but desktop must still feel rich
The user tests primarily on iPhone. Desktop should look professional and use the extra space (e.g. ALLY Rewards as a tall hero tile on desktop), but mobile is the constraint that drives layout decisions.

### 4. Progressive enhancement, not progressive degradation
PWA shortcuts, install prompts, default-page selectors — all are bonus features for users who installed the app, but the site fully works without them. Never block core functionality on PWA-mode being detected.

### 5. Minimum required ceremony
- No build step
- No external libraries beyond what's needed
- No frameworks "just in case"
- Inline solutions when they're <50 lines (the markdown changelog parser is a good example — 30 lines, no library)

---

## What aDAO is

10,000-NFT collection on Terra blockchain, backed by LUNA staking rewards.

- **Supply breakdown:** 3,172 public / 5,828 unminted DAO Treasury / 1,000 broken (multisig security via Props 64-69)
- **Yield mechanics:** NFT contract holds an "Ally" token earning ~0.72% LUNA staking rewards via Terra Alliance, +40% boost via Eris Protocol ampLUNA conversion. 10% take rate to DAO Treasury.
- **Holder action:** "Break" an NFT for ~$12 backing (one-time, irreversible). Broken NFTs keep governance VP but stop accruing.
- **"Last NFT Standing" dynamic** as breaks accumulate — fewer claiming NFTs = more rewards per remaining NFT, since LUNA inflation continues regardless.

### Key entities

- **Main DAO** + **Council DAO** (~6 members) on DAODAO
- **Eris** — council member. Builds the entire **Eris Protocol** stack:
  - **Eris Protocol** — hosts TLA, the LST infrastructure
  - LSTs: **ampLUNA**, **arbLUNA**, **ampCAPA**, **ampROAR**
  - **Creda Finance** — money market built by Eris
  - **Votion** — vote aggregator built by Eris (lets users delegate voting)
- **Capa Protocol** — partnership in works (stablecoin issuer, possibly new NFT marketplace). Will eventually need lore integration.
- **TLA = Terra Liquidity Alliance** — ve(3,3) system, weekly epochs ending **Sunday 23:59 UTC**. Reward distribution mechanism.
- **TLA pool positions are dual-typed.** Each pool position consists of a **non-amplified deposit** (white in TLA UI) AND an **amplified deposit** (orange). The DAO holds both side-by-side at roughly 50/50 because:
  - Non-amplified earns rewards in claimable form, but is slowly eaten by the 10% TLA take-rate
  - Amplified (ampLP token) compounds in place via Eris Amp Compounder — outpaces the take-rate
  - Together: claimable rewards stream from non-amp side + principal preservation from amp side
- **TLA success metric: ampLP token count growth per epoch.** Per the DAO's strategy, the goal is each epoch to gain ampLP tokens not lose them. USD value can fluctuate freely with market conditions; what matters is the underlying ampLP count is increasing. This is the right thing to surface on dashboards rather than a USD figure.

### Lore framework
10 post-human tribes scattered across the galaxy via "The Lattice". Designed to be flexible for absorbing partner DAOs:
- **Lion DAO** → became "Canyon-Clans of Ozara North" (precedent for how partnerships fit lore)

### Storage / data repos

#### Legacy / manual-snapshot repos (still in use)
- `defipatriot/tla_json_storage` — Holds `tla_config.json` (site scoring weights) and `epoch_1-300_date.json` (canonical epoch schedule — **the 1-indexed source of truth** for epoch numbers). Older per-epoch v3 JSONs from manual `tla_tool.html` captures also live here but are no longer actively updated.
- `defipatriot/tla-ext_json_storage` — Historical TLA data from `tla-tool_ext.html`. Contains `tla_ext_historical_2025.json` and `tla_ext_historical_2026.json` (per-LP epoch averages for liquidity + volume, used by trend charts), plus `tla_pd_bribes.json` (master PD bribes file).
- `defipatriot/adao_json_storage` — Legacy aDAO snapshots from manual captures. Members CSV fallback lives here.
- `defipatriot/aDAO-Image-Files` — favicons, logos, OG images, collection PFPs.
- `defipatriot/website-adao-core` — project docs + changelogs (this repo).

#### Cron-produced data repos (active 2026 — written automatically by Render crons)
**16 production crons live and writing on schedule.** Cron source code lives in `defipatriot/cron-scripts` (one folder per cron). Each writes to its own `*-data_2026` data repo. Status verified 2026-06-13 (added the member-expansion + lock-capture layer: tla-participants, adao-allies, tla-locks, plus the shared `lib/capture-engine.js`).

| Data repo | Source cron | Schedule | Main output file |
|---|---|---|---|
| `defipatriot/tla-snapshot-data_2026` | `tla-snapshot` | Hourly :40 (+ daily archive at 23:xx) | `data/tla-snapshot.json` + `data/daily/{YYYY-MM-DD}.json` archive — the unified per-epoch snapshot consumed by `tla-stats.html` |
| `defipatriot/network-and-prices-data_2026` | `network-and-prices` | Hourly :40 | `data/network-and-prices.json` — LUNA + 27 token prices, LST ratios. Known gap: some IBC denoms (e.g. LUNA-USDC bribe `ibc/8D8A7F...`) not indexed. |
| `defipatriot/adao-positions-data_2026` | `adao-positions` | **Should be daily 01:00** (currently weekly Mon — needs Render schedule update for Portfolio Tracker history; see CHANGES_PENDING) | `data/current.json` + `data/daily/{YYYY-MM-DD}.json` (added 2026-05-17) + `data/weekly/epoch-{N}.json` archive |
| `defipatriot/astroport-pool-data_2026` | `astroport` | Daily 23:50 | `astroport/astroport-epoch-{N}.json` + `data/daily/{YYYY-MM-DD}.csv` (20 columns as of 2026-05-17, includes fees/reserves/LP-supply/staked-liquidity/assets_json for LP health scoring) |
| `defipatriot/ss-pool-data_2026` | `skeletonswap-lp_data` | Daily 23:45 ⚠ | `data/{month}_backup/{YYYY-MM-DD}.csv` + weekly avg. **Upstream source unreliable** — BackBone aggregator returning cached data for ~30 days as of 2026-05-17. Don't use for scoring; see cron-scripts/skeletonswap-lp_data/README.md "Data quality warning" for full audit. |
| `defipatriot/bribes-data_2026` | `bribes-history` | Daily 23:35 | `data/current-state.json` + `data/by-epoch/epoch-{N}.json` + `data/pd-bribes-history.json` |
| `defipatriot/votion-data_2026` | `votion` | Weekly Sun 23:55 | `votion/votion-epoch-{N}.json` (next-epoch optimization) |
| `defipatriot/nft-inventory-data_2026` | `nft-inventory` | Hourly :30 | **Schema v2 (Rev B, 2026-06-07).** `data/nfts.json` (full 10K inventory, per-NFT records with `real_owner`, marketplace `listing{...}`, 10 classification flags) + `data/summary.json` (aggregate counts + `daodao_stakers[]` + `enterprise_stakers[]` + `marketplaces` stats + `backing` ampLUNA data) + `data/heartbeat.json` + `data/daily/{YYYY-MM-DD}.json` snapshots. Replaces `deving.zone/nfts/alliance_daos.json` (third-party feed with confirmed bugs). |
| `defipatriot/marketplace-data_2026` | `marketplace-stats` | Hourly :15 | BBL + Boost listings, floor prices, sales history (per-year files), activity feed |
| `defipatriot/tla-chain-registry` | `tla-registry` (catalog) | Daily 01:00 | `2026/current.json` + `2026/heartbeat.json` — catalog of every TLA-gauged LP + underlyings + amplps, with cross-source name/CG/bridge reconciliation. See **"TLA Chain Registry catalog system"** section below for full architecture. |

#### Notes on data repo numbering quirks
- **Votion uses NEXT-epoch convention** — `votion-epoch-185.json` is captured during epoch 184, contains optimization data FOR upcoming epoch 185. This matches Eris's Votion UI convention.
- **All other epoch-named cron outputs use CURRENT-epoch convention** — `astroport-epoch-185.json` was captured during epoch 185.
- **Epoch off-by-one fix shipped** (resolved 2026-05-15). All crons now compute `epochIndex + 1` to match the canonical 1-indexed `epoch_1-300_date.json`. Verified live: today (2026-05-17) the crons correctly report epoch 185. Note: epoch-184 archive files exist but no epoch-185 archive files until the next nightly run — one-epoch gap accepted, not back-filled.

#### ⭐ Unified repo migration — `tla-core` (started 2026-06-24)

The `*-data_2026` one-repo-per-cron model is being superseded by a single unified
**`defipatriot/tla-core`** repo, structured **module → product → files**. Full
convention in `thealliancedao/tla-core/docs/pending-changes/TLA-CORE-STORAGE-DESIGN.md`
(moved there 2026-07-14). In brief:
- **module** = the cron/domain (mirrors `cron-scripts/{module}/`): `fuel`, `flows`, …
- **product** = the data shape: `snapshots/` (state-at-a-time) or `events/`
  (append-only stream). A module may have more than one.
- **files:** `heartbeat.json` + `index.json` always; `cursor.json` for event
  products; `current.json`/`daily/`/`hourly/` for snapshots; year partitions
  (**`{YYYY}/{MM}.json` monthly JSON arrays for events** — corrected 2026-07-08
  to the settled org practice of nfts/adao/flows + price-history;
  `{YYYY}/{rollup}/{YYYY}.csv` for snapshots). Anything still saying daily
  jsonl predates this correction; TLA-CORE-STORAGE-DESIGN.md (incl. its new
  Deviation Register) is canonical.
- **Year rollover = a new folder, never a new repo** — the whole point. 2027 is
  `{module}/{product}/2027/`, no new repo, no token juggling.
- **Pilot modules:** `fuel/snapshots/` (live, hourly — the snapshot reference) and
  `flows/events/` (tla-flows, deploy pending — the event reference).
- **⭐ UPDATE 2026-07-08 — the migration moved to the GitHub ORG.** Canonical
  repos are now **`thealliancedao/tla-core`** (data) and
  **`thealliancedao/platform-crons`** (cron code). The personal
  **`defipatriot/tla-core`** is the June-25 INTERIM build and is still being
  written by four legacy Render crons — `fuel` (fuel/snapshots), the price cron
  (prices/), address-catalog v1 (catalog/), contract-token-catalog
  (contracts/) — all since superseded by org rebuilds (org address-catalog,
  org token-catalog which absorbed network-and-prices). **They are on the
  retire board (CHANGES_PENDING); two repos named `tla-core` is a
  deletion-by-accident hazard — always check the owner before destructive ops.**
- **First event module fully migrated: `tla-voting`** (2026-07-07/08) — votes,
  locks, bribes, rewards at `thealliancedao/tla-core/tla-voting/events/`;
  Render cron `org-tla-voting` 6-hourly; backfilled to contract genesis
  2024-08-27 (see the FCD section below). Spec:
  `tla-core/docs/pending-changes/SPEC-tla-voting.md`; changelog:
  `tla-core/docs/changelogs/cron-tla-voting-log.md`.
- **Migration is opportunistic + by value** — fold a `*-data_2026` repo in only
  when its cron is being touched anyway or the year-folder benefit is worth it; run
  parallel, prove, freeze-then-delete the legacy repo. Order + checklist in the
  storage-design doc. When a module lands here, repoint its `system-health.js`
  `MONITORED` entry to the `tla-core/{module}/{product}/heartbeat.json` path.

### Key on-chain contract addresses (Terra phoenix-1)
Originally discovered May 10 2026 via HAR capture of the Eris liquidity-hub UI for the on-chain Vote tab fetcher. Now used by the live `tla-snapshot`, `adao-positions`, and `bribes-history` crons.

| Role | Address |
|---|---|
| TLA Gauge Controller | `terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj` |
| TLA Incentive Manager (bribes) | `terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh` |
| vAMP Minter (total VP) | `terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg` |
| LUNA-FUEL Astroport pool | `terra10yfnsqn20rzlnlzkeva5255q27zp6ws9te9uuql9e0lacfcze7zsffjct5` (used by `fetchFuelPriceFromChain`) |
| Votion (arbLUNA Max) | `terra13aae4futz6jk7hmdv0gwm2xs6p4nxv4xwz5tc0c2vt4960u4j6jqpqmye9` (only one captured so far; others unknown) |
| aDAO Core (treasury) | `terra1sffd4efk2jpdt894r04qwmtjqrrjfc52tmj6vkzjxqhd8qqu2drs3m5vzm` |
| ADAO Voting Contract | `terra1c57ur376szdv8rtes6sa9nst4k536dynunksu8tx5zu4z5u3am6qmvqx47` |
| TLA Asset Compounder | `terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx` |
| Global Config | `terra1hwxg6s732eparz3ys7sa4t5f64ngpd2w8syrca6z7ckv3fs9uqnsvrpcqa` |
| PD DAO multisig (briber) | `terra1k8ug6dkzntczfzn76wsh24tdjmx944yj6mk063wum7n20cwd7lxq4lppjg` |
| zLUNA Hub | `terra1u72y7gppxrsncctvgfyqduv3md6pgq77pqhz9rxgwl3dqgye00cq7vmf8u` |
| aDAO NFT Collection | `terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9` (added 2026-06-07 for Rev B) |
| DAO Treasury (NFT custody) | `terra1h8psjgcsg9fef7w2yv0j6262sfcaszj8vs4tsy3uwla6zwtaspvqrp4l7v` — holds 898 broken NFTs for DAO governance. **Not** the same as "Enterprise" — see Rev B notes. |
| Enterprise NFT Staking | `terra1e54tcdyulrtslvf79htx4zntqntd4r550cg22sj24r6gfm0anrvq0y8tdv` — 503 NFTs (100 DAO-controlled broken + 403 real user stakes) |
| Small DAO Wallet (NFT custody) | `terra1yqv0af22675wlcmgflxk4ve07vt8qlm999gk0cuw5l64r5xxgadsyg8ywv` — 2 broken NFTs for DAO governance |
| BBL Marketplace (Necropolis) | `terra1ej4cv98e9g2zjefr5auf2nwtq4xl3dm7x0qml58yna2ml2hk595s7gccs9` — bbl-necropolis-marketplace v2.2.2 |
| Atrium Marketplace | `terra15du229lqcxkn939pmjgklqunftf604q4wz87kt5awj6reghec5jqs0w0kj` — atrium-marketplace v1.6.0-rc1 |
| Boost Marketplace | `terra1kj7pasyahtugajx9qud02r5jqaf60mtm7g5v9utr94rmdfftx0vqspf4at` — launch-nft v1.4.0 (launch-nft-permissionless) |
| ampLUNA CW20 | `terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct` — Eris LST. Backs aDAO NFT collection. |

---

## TLA cron infrastructure — built 2026-05-12 through 2026-05-14, audited 2026-05-17

Replaces the manual `tla_tool.html` + `tla-tool_ext.html` capture flow. **9 production crons run on Render**, write to GitHub data repos automatically. The (now-deleted) `DESIGN_tla_full_cron_automation.md` design doc described the original plan; this is the as-built record.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ 5 TLA PRODUCER CRONS — fetch raw data, write per-cron _2026 repos│
├──────────────────────────────────────────────────────────────────┤
│ network-and-prices    hourly :40   token prices + LST ratios     │
│ astroport             daily 23:50  pool TVL/volume/fees/reserves │
│                                    (20-col CSV as of 2026-05-17) │
│ skeletonswap-lp_data  daily 23:45  SS pool data ⚠ source frozen  │
│ bribes-history        daily 23:35  current bribes + epoch archives│
│ votion                weekly Sun   next-epoch optimization data  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 1 AGGREGATOR CRON — consumes all 5 producers + chain queries     │
├──────────────────────────────────────────────────────────────────┤
│ tla-snapshot          hourly :40   unified snapshot for website  │
│                       (+ daily archive at 23:xx)                 │
│   - Reads from all 5 producer _2026 repos                        │
│   - Adds rewards math (Alliance weights, APR per pool)           │
│   - Outputs data/tla-snapshot.json (170 KB, 67 pools)            │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 1 INDEPENDENT CRON — DAO member portfolios                       │
├──────────────────────────────────────────────────────────────────┤
│ adao-positions   currently weekly Mon ⚠ should be daily          │
│                  → daily archive at data/daily/{YYYY-MM-DD}.json │
│                  → 46 member + treasury portfolios               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 2 NFT-SIDE CRONS — separate from TLA, support the NFT pages      │
├──────────────────────────────────────────────────────────────────┤
│ nft-inventory     hourly :30   10K NFTs + 3 marketplaces +       │
│                                Enterprise + DAODAO + backing     │
│ marketplace-stats hourly :15   BBL+Boost listings, sales, floor  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ WEBSITE consumes via raw.githubusercontent.com (no API server)   │
├──────────────────────────────────────────────────────────────────┤
│ tla-stats.html ← tla-snapshot.json + network-and-prices.json +   │
│                  adao-positions/current.json + historical files  │
│ dao-tla.html   ← adao-positions/current.json members array        │
│                  (page not yet built — Pass 2 → likely promoted  │
│                  to header-level Portfolio Tracker per 2026-05-17│
│                  strategic discussion)                            │
└──────────────────────────────────────────────────────────────────┘
```

### Design principles for this infrastructure
- **Independent systems** — one cron failing doesn't break the dashboard. Each writes to its own repo so partial-data renders are possible.
- **Same filenames on each run** — `current.json`, `tla-snapshot.json`, etc. always overwrite. Epoch archives accumulate alongside.
- **Render free tier** — cron jobs run as Node.js services, push to GitHub via PAT.
- **No API server in front** — website fetches data via `raw.githubusercontent.com` direct URLs.
- **Adao-positions treasury = "aDAO" at TLA-wide level.** Individual member breakdowns live in a separate page (`dao-tla.html`, not yet built). The treasury wallet (`terra1sffd4ef...`) is the single canonical aDAO voting entity. Each user's VP allocates once per bucket (4 buckets), so pool-summed VP inflates 4× per user. **⭐ Canonical "Total TLA VP" = the escrow's `total_vamp.vp` (fixed + boost, ~28M — matches the TLA UI header). The old max-bucket convention (~24M) was boost-only and RETIRED 2026-07-14 (SPEC-vp-definition-fix); max-bucket VP is kept only as a sanity reference.** Bucket-tally-vs-total comparisons are valid only like-for-like by period.

### Pool uniqueness — critical for any code reading TLA data
- `pool_name` alone collides across DEXes (LUNA-USDC on both Astroport and Skeleton)
- `name + dex` can also collide within Astroport (two LUNA-WBTC pools in BLUECHIP with different `gauge_pool_id`)
- **`gauge_pool_id` is the truly unique key** (e.g. `cw20:terra1wdz...`)
- Snapshot exposes it as `gauge_pool_id`; member-vote data exposes it as `pool_gauge_id` — same values, different field names
- Any code keying on pool name alone will eventually hit collisions. Always key on `gauge_pool_id`.

### Key value reconciliation (verified 2026-05-14 — ⚠ VP rows are boost-only, pre the 2026-07-14 VP-definition fix; canonical Total TLA VP is now `total_vamp.vp` ≈ 28M)
| Metric | Value | Cross-check |
|---|---|---|
| Total TLA VP | 24.11M | matches Eris UI |
| Votion VP | 6.90M | matches votion.money lockup data exactly |
| aDAO VP (treasury) | 757K | matches Eris UI |
| Treasury LP USD | $6,669 | matches Eris ±$103 |
| Treasury pending rewards | $453.38 | matches Eris ±$11 |
| Treasury pending bribes | $443.13 | matches Eris ±$23 |

### Audit findings — 2026-05-17

Full per-cron audit performed. Most data is reliable. Two real issues found and addressed:

| Finding | Severity | Resolution |
|---|---|---|
| Bribes resolver bug in `tla-stats.html` — looked up cw20 prices at `entry.address`; actual schema nests at `entry.prices.{source}.address`. All CAPA, ROAR bribes priced as $0. | 🔴 Critical | **Fixed** in dashboard. Global Epoch Bribes tile: $820 → ~$1,300 (more accurate). Member bribes tile correctly captures CAPA bribes. |
| `adao-positions` had no daily snapshot persistence (only weekly per-epoch). | 🔴 Critical | **Fixed** in cron code (`data/daily/{YYYY-MM-DD}.json` archive added). Render schedule must also change from weekly to daily for Portfolio Tracker history to accumulate. |
| `astroport` cron missing fee/reserves/LP-supply fields. | 🟡 Important | **Fixed** in cron. CSV is now 20 columns including `fees_24h_usd`, `fee_apr`, `lp_total_supply`, `astro_staked_usd`, `assets_json`. |
| Skeleton Swap upstream API frozen ~30 days (BackBone aggregator returning cached data). 50% effective coverage, not 75%. | 🔴 Critical | **Documented** (skeletonswap-lp_data/README.md "Data quality warning"). Keep capturing best-effort. **Don't use for scoring.** Label "unverified" wherever surfaced. |
| APR for stable pairs (USDC-USDT, USDC-EURe) 5× too high vs Eris. | 🟡 Real bug | Undiagnosed. Specific to stable pools. Tracked in CHANGES_PENDING. |
| Unnamed pool with `dex: null` inflates Astroport count by 1. | 🟢 Cosmetic | Tracked in CHANGES_PENDING. |
| LUNA-arbLUNA appears twice in snapshot with different `gauge_pool_id`. | 🟢 Cosmetic | Dashboard now keys on `gauge_pool_id` correctly. |

**Methodology vs bug:** the cron's pool APR uses `annual_emissions_usd / staked_in_tla_usd` while Eris uses `annual_emissions_usd / depth_usd`. Our denominator is smaller → our APR reads higher. Both correct, measuring different things. To match Eris exactly, change the formula in `tla-snapshot` cron — one-line change. Tracked in CHANGES_PENDING.

### Cron deployment
- All code in `defipatriot/cron-scripts` GitHub repo
- Each cron has its own subdirectory deployed as a separate Render cron job
- Render builds via `npm install` in the cron's folder, runs via `npm run snapshot` (or equivalent)
- Required env vars per cron: `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`
- Tokens have write scope to that cron's data repo only

### Per-cron documentation
Each cron has its own `README.md` in its folder. Recent changes are tracked in a "Recent changes" section at the end of each cron's README. The top-level `cron-scripts/README.md` has a "Project status & roadmap" section covering cross-cutting context (strategic direction, data trust, prioritized roadmap). The dashboard (`tla-stats.html`) has its own changelog in `website-adao-core/tla-log.md` (following the per-page log convention: `index-log.md`, `tla-log.md`, `lore-log.md`, `explorer-log.md`, `dao-log.md`, plus `catalog-log.md` for the TLA Chain Registry catalog system).

---

## TLA Stats — product pillars & capture layer (capture BUILT 2026-06-13; pillars next)

This is the "what makes TLA Stats different from the official Eris UI" work. Four pillars: **Portfolio Tracker** (member position time-series + P&L), **LP Performance & Health Scoring**, **Bribes Tracking**, **Vote Intelligence**. History splits two ways: **events** (votes, locks) are **backfilled to genesis** via tx_search (like the NFT provenance pipeline); **valuations** (USD/ratios) are **forward-only** because public LCDs prune and — confirmed 2026-06-15 — **no free Terra phoenix-1 archive node serves historical state** (surveyed TFL, publicnode, polkachu: all pruned or dead). (The old SPEC-tla-history-backfill.md is RETIRED 2026-07-14 — its goal was achieved differently and better: tla-voting seed + FCD fill + the distributions harvest.)

### ✅ Backfill data layers — ALL THREE COMPLETE (2026-06-15)
Three one-time backfills now feed the Portfolio P&L + Vote Intelligence UIs. All verified live:
- **Price history** → `price-history-data_2026/2026/data/daily-prices.json` — CoinGecko daily USD, **23 tokens × ~365 days** (7,913 points), 4 unavailable (stLUNA + the 3 no-feed amp tokens). LST CG prices cross-validated to within ~1% of true on-chain rates. Keyless-safe (365-day window, auto step-down). `coverage.json` + `heartbeat.json` alongside.
- **TLA history** → `tla-history-data_2026/2026/data/` — gauge votes + escrow lock lifecycle, tx_search-seeded to genesis. **5,858 vote events** (213 voters) + **11,520 lock events**, both `scan_complete`/`clean-end`. Lock events carry **`canonical`** (9,906 true / 1,614 false): wrapper-layer events (`votion-la/*`, `arb/*`, `launch-nft/*`, `ca/*`) duplicate a canonical `ve/*` twin — **VP/lock-delta math must filter `canonical === true`**. `vote-events.json`, `lock-events.json`, `rollups.json` (249 wallets), `heartbeat.json`. Resilient ASC pager (ported from nft backfills). Forward-maintain wired; classifier writes `canonical` natively (schema v2).
- **Ratio history** → `network-and-prices-data_2026/data/ratio-history.json` — daily LST exchange rates for **6 LSTs** (ampLUNA/arbLUNA/bLUNA/ampCAPA/ampROAR/xASTRO). Since no archive node exists, this is **forward-capture folded into `network-and-prices`** (appends each end-of-day from rates it already fetches) + a one-time consolidator that recovered history from existing `data/daily/*.json` archives (reach ≈ daily-archive start, currently ~34 days back to 2026-05-13). Unblocks ampCAPA/ampROAR USD: `LST_USD(day) = base_USD(day) × rate(day)`, joined to daily-prices.json. Grows one point/day automatically.

**Next:** point the UIs at these three layers (Portfolio Tracker P&L, Vote Intelligence). No more data-capture work blocks them.

**As of 2026-06-13 the entire capture layer is BUILT and LIVE.** All four pillars now have their raw data feeds. The remaining work is the `tla-stats.html` page UI consuming them.

### ✅ adao-positions — daily + widened to ALL members (2026-06-13)
Schedule switched to daily (`0 1 * * *`) — daily P&L history now accumulating. Widened from 45 named members to **all 156 DAO members** (named + unknown): current.json captures everyone (`is_registered`-tagged, DAO-wide totals); daily/weekly archives are registered-only (unknowns counted live, no retained history — decided). This surfaced **~510K VP (21%) that was previously invisible** (55 of 111 unknown wallets have real TLA positions). Per member it captures: LP positions (per-pool share %, shares, USD, APR, underlying-token decomposition), pending rewards, voting allocations, pending rebase, vAMP locks, pending bribes, wallet balances, plus a computed summary now including first-participation tenure, VP spread, and inactive-take exposure (engine v1.1).

### Member-expansion architecture — ✅ BUILT (2026-06-13)
The keystone refactor is done: **`lib/capture-engine.js`** holds the DAO-agnostic per-address TLA position capture (extracted verbatim from `adao-positions.js` — verified identical output before building on it). Every member cron imports it: feed it an address-shaped object, get back the full TLA portfolio (LP, locks, voting, rewards, tenure, VP spread). This is what makes the whole expansion cheap — one tested core, reused everywhere. `lib/ally-capture.js` builds on it for ally discovery.

Built crons (all live):
- **`adao-positions`** — widened to all 156 members (above).
- **`tla-participants`** — lock holders (CW721 enum: 431 locks → 202 holders) ∪ bribe providers (bribes-data read; today just PD). ~203 participants, **26.8M VP — the full TLA electorate**. The top 2 holders are *contracts* (63-char addrs, possibly Votion vote-aggregation) with 5.5M+5.2M VP — more than all named aDAO members combined. Live-only retention. Captures ALL (overlap with aDAO intentional; consumers dedupe by address via source tags).
- **`adao-allies`** — Pixel Lions (NFT-staked, 77 registered of 291) + Lion DAO (cw20-staked, 69 registered of 283), **bundled in ONE cron** with per-ally isolation. Future ally = one `ALLIES` array entry.
- **`tla-locks`** — system + per-holder lock intelligence (own section below).

**Engine reusability proven:** tla-participants and adao-allies discover members completely differently (lock enumeration vs DAODAO topStakers) yet produce identical rich position data through the same engine — zero new capture logic. That was the whole point of the extraction.

**⚠️ Ally discovery gotcha:** the DAODAO `topStakers` formula depends on the voting-module contract TYPE (query its `{info:{}}`): cw721-staked→`daoVotingCw721Staked`, cw20-staked→`daoVotingCw20Staked`, token-staked→`daoVotingTokenStaked`. **Lion DAO is cw20-staked** (ROAR is a cw20) — the wrong formula returns 0 stakers silently (empty, not an error). `ally-capture.js` maps stakeType→formula explicitly.

**PFPK name registry (live):** `pfpk.daodao.zone/bech32/{hexAddress}` → `{name}` (non-null = registered). bech32→hex in the engine (`bech32AddressToHex`). Reflects next run — no snapshot.

### TLA Locks (veLUNA) — ✅ BUILT & LIVE (`tla-locks`, 2026-06-13)
Its own cron — the highest-value capture; stale-VP-gap + unlock-cliff metrics exist nowhere else (not even Eris). **First live run (epoch 189):** system VP 26.86M (fixed 2.88M + decaying 23.98M); **stale-VP gap 3.49M VP unclaimed system-wide (≈13% of all VP)** — arbLUNA 1.75M, ampLUNA 1.49M, bLUNA 221K; 277 auto-max locks = 94% of VP vs 154 decaying; no unlock cliff for 6mo (95% of decaying VP is 26w+ out); decay 26.86M now → 25.62M in 52w; per-asset VP arbLUNA 15.1M / ampLUNA 7.78M / bLUNA 757K / LUNA 287K / stLUNA 22.9K. Cross-check passes (per-lock VP sum = decaying total). Lock-asset symbol map (hardcoded, confirmed via token_info): `native:uluna`=LUNA, `cw20:terra1ecgaz…`=ampLUNA, `cw20:terra17aj4ty…`=bLUNA, `cw20:terra1se7rvue…`=arbLUNA, `native:ibc/08095CED…`=stLUNA. **Lesson: stale-VP math keys the LST ratio off the symbol — raw-address symbols default ratio→1 and undercount the gap (269K→3.49M once symbols resolved).** Schema reference retained below.

**Contract:** `terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg` (name "Vote Escrowed LUNA" / veLUNA). It's a standard CW721, **enumerable** (verified: `num_tokens` → 431; `all_tokens{limit,start_after}` works; token_ids sort lexicographically as strings — follow the cursor, don't assume numeric sequence).

**`lock_info{token_id, time}` returns everything in one call:** `owner`, `asset.info` (LST contract — ampLUNA/bLUNA/arbLUNA-ibc/native LUNA), `asset.amount`, `underlying_amount` (**ratio frozen at lock time**), `coefficient` (VP multiplier tier), `start`/`end` periods, `slope` (exact VP decay per week), `voting_power`, `fixed_amount`. `time` accepts `current`/`next`/`last`/`period`.

**Derivations confirmed against live data:**
- **System totals = ONE call:** `total_vamp` → `{fixed (non-decaying floor), voting_power (decaying part), vp (total)}`. Decay *projection* via `total_vamp{time:{period:N}}` (NOT `at_period` — rejected variant).
- **Auto-max-lock (no extra query):** `end=="permanent"` && `slope==0` = auto-max ON; `end=={period:N}` && `slope>0` = decaying, N = unlock period.
- **Stale-VP gap (the unique metric):** VP is stamped at lock-time ratio; if the LST ratio rose since, the holder's true VP is higher than stamped until they touch the lock. Compute "VP if re-stamped today" = `amount × current_ratio × coefficient` vs frozen `underlying`. Asset oracles are in the lock contract's `config.deposit_assets[].config.exchange_rate.contract`.
- **Participation order = free:** ascending `token_id` is the lock order (NFT #1 = first participant); `start` period dates it.
- **Per-member rollups:** group by owner → total VP, stale-VP upside, personal unlock cliff, first-participation date.
- **Marketplace cross-ref:** locks are listable on Boost (already in the marketplace pipeline) → discounted-VP-for-sale flagging.
- **Voter behavior (rides along, from gauge controller `user_info.gauge_votes`):** vote-change frequency (diff between runs) + voting-on-inactive/abandoned-LPs.

### TLA LP-flow event capture — `tla-flows` (BUILT + locally verified 2026-06-24; Render deploy pending)

The **LP-flow sibling to `tla-history`**. Where `tla-history` backfills *votes + locks* events to genesis, `tla-flows` captures the **LP deposit / withdraw / claim** event stream — the two things neither the daily `adao-positions` snapshots nor the vote/lock backfill can recover after the fact: the **exact intra-day moment of each claim** and each deposit/withdraw's **zap slippage + swap fees**. Code: `cron-scripts/tla-flows/`. Output: the unified `tla-core` repo — **corrected 2026-07-08: `tla-flows/events/{heartbeat,index,cursor}.json` + monthly `{YYYY}/{MM}.json` JSON arrays** (module renamed `flows`→`tla-flows` resolving the nfts/adao collision; the daily-jsonl plan is superseded — TLA-CORE-STORAGE-DESIGN.md is canonical).

**Why event-capture, not snapshot-diff:** a daily snapshot says a position changed between days, not *when* or at what cost. Realized-APR needs the claim *timestamp* to close the accrual band; cost analysis needs the *receipt* (slippage lives in-receipt, no external price needed). Both are gone by the next snapshot.

**Capture design (resumable — completeness from a cursor, not from being always-on):** watches **6 shared contracts** (one compounder = all amplified; four bucket staking contracts = all non-amp; the zapper) — share custody is centralized, so six catch every pool; a new pool in an existing bucket needs no change. Each run: read cursor → `tx_search [cursor, head]` per contract → classify (dedupe by txhash) → append events → **advance cursor LAST** → heartbeat. Crash re-reads the unmoved window; any query error returns without advancing (fail-safe). The same loop from a genesis start height **is** the backfill. No npm deps (Node 18+ built-ins). First run self-bootstraps `head − lookback`.

**⚠️ `tx_search` gotcha (cost real time):** publicnode's LCD **400s on `AND tx.height>=N`** in the query string. Fix: query by contract only (`wasm._contract_address='X'`), bound the window client-side, paginate to last page. Public nodes are pruned (compounder returned ~42 total), so per-contract result sets stay small.

**Parser — verified against REAL on-chain data (not fixtures):** routes on the wasm `action` — `asset-compounding/stake|unstake` → deposit|withdraw / **amplified**; `asset/stake|unstake` → deposit|withdraw / **non-amplified**; `/claim/` → claim. `via_zap` when a `zapper/create_lp|withdraw_lp` is present. Reads `tx_response.events[]` (flat per-event shape) and takes the FIRST flow action, so a user-facing flow keeps the real user even when the compounder cascades a second action under its own address. **Verified 42/42 on a live compounder `tx_search` dump + 8 hand-captured chainscope variations** (zap & tokens deposits amp/non-amp, send-stake, withdraw-to-LP, withdraw-zap-to-LUNA, withdraw-zap-to-USDC multi-hop). The **arbLUNA Arbitrage Vault** deposit is correctly **skipped** — it mints arbLUNA (a precursor), not a TLA pool flow.

**Cost capture (`cost` field, Rev A.3):** entry/exit slippage for **both** deposits and withdrawals. Collects **every swap leg** (a withdraw zapped to a non-pool token is multi-hop — e.g. arbLUNA→LUNA→USDC) with `spread_amount`/`commission_amount`/`leg_cost_pct`, **plus** `provide_liquidity.slippage` for imbalanced "Tokens" deposits (the cost hides there, not in a swap event). Cross-denom legs kept raw — the cron records receipt truth; the analysis layer prices the single-number rollup. Real proof: same position exited to **LUNA = 0.05%** vs to **USDC = 0.43%** (the extra hop); an imbalanced Tokens deposit = **1.05%**.

**⚠️ Realized-APR correction — a prior wrong assumption, now fixed (preserve):** an early DAO-wide pass showed realized ≈86% vs advertised ≈50% and was wrongly read as "bribes paid on top." **Bribes go to VOTERS (`pending_bribes`), NOT LP depositors (`pending_rewards` = emissions)** — a *separate stream*, out of LP-flow scope by design. The gap was two artifacts: (1) **APR-vs-APY** — advertised is APR, amplified realized is APY because the compounder auto-compounds; like-for-like the amp pool runs marginally UNDER advertised, and that ≈−3pt drag **is the compounder's reward fee** (the signal we wanted); (2) a **claim-day double-count bug** in the non-amp rollup. Corrected (APR basis, sanity-gated): amp ~59% vs ~63% advertised; non-amp ~49% vs ~51%. **TLA pays ≈ what it advertises, marginally under — no excess, no bribe leakage into LP yield.** The wide non-amp band is daily-snapshot claim-timing granularity — exactly what `tla-flows`' exact claim capture collapses.

**Wallet universe = a label, not a gate.** `tla-flows` captures *every* depositor automatically (it watches contracts, not a wallet list). Tracked-cohort tagging — decided **aDAO NFT stakers** — is applied downstream as a label on the flow data (join to `nft-inventory` / the registry), not as a capture filter. Cheaper and complete vs enumerating wallets.

**Backfill horizon (honest):** flows recover as far back as nodes retain; public LCDs prune, so deep history needs an archive endpoint — mark the horizon, don't fake it. Exact intra-day *timing* exists only forward from when `tla-flows` starts (old daily snapshots hold end-of-day state only). Going forward, timing + costs + fees are all captured cleanly.

**⭐ UPDATE 2026-07-08 — deploy urgency ELEVATED + deep history BANKED.** Public
nodes pruned the tx index to ~1 week (see FCD section below), so the permanent
LP-events hole is *Jan-2025 → whenever tla-flows starts capturing* — its right
edge grows a week for every week undeployed. The left side is done: the FCD
harvest captured all five custody contracts genesis→Jan-2025 (55,199 txs, in
`thealliancedao/tla-core/archive/fcd/lp-*`); a `flows-fill` derive (same
pattern as tla-voting's fcd-fill: trimmed-tx adapter → the flows classifier)
merges them once the cron is deployed. Deploy review must check Rev A.3
against the org conventions (heartbeat standard, module naming — note
`nfts/adao/flows.js` is the *NFT-marketplace* flows, a different thing;
resolve the name collision, likely `tla-flows/`).

---

## 🏛 FCD frozen archive + deep-history harvests (discovered 2026-07-08)

**The single biggest data unlock of the project.** Terra's FCD indexer at
**`phoenix-fcd.terra.dev`** is a frozen archive: its tx index covers **chain
genesis → ~2025-01-07 (height ~13,736,494)** and stopped there (TFL wind-down).
Found via a Mintscan HAR while chasing aDAO mint history. This mostly replaced
the "wait for a dev's archive node" plan.

**Mechanics (hard-won):** `/v1/txs?account=<addr>&limit=100&offset=<next>`,
newest→oldest, `next` = the offset cursor. Behind Cloudflare — **429 / error
1015** rate limits: ~1.1s/page pacing + 65s+ cooldowns required. Returns
FAILED txs too (`code≠0`) — every consumer must filter. Msgs arrive
pre-decoded; shape is drop-in compatible with the tla-voting classifier via a
thin adapter.

**Harvester:** `thealliancedao/tla-core/.github/scripts/fcd-harvest/` +
`fcd-harvest.yml` (presets incl. `lp-batch`). Trimmed txs → `archive/fcd/
<label>/part-NNNNN.json` + `state.json`; resumable checkpoints, 409-retry
publishing, pause-not-fail. **10 harvests COMPLETE (~84k txs):** adao-minter
1,644 · adao-collection 12,730 · tla-escrow 2,652 · tla-gauge 5,559 ·
tla-incentive 1,870 · lp-compounder 6,055 · lp-stable 9,866 · lp-project
14,562 · lp-bluechip 11,647 · lp-single 13,069.

**What it settled:**
- **TLA governance genesis = launch (2024-08-27):** all three governance
  contracts deployed within ~160 blocks (11,558,887–11,559,045). No
  pre-launch era exists. `fcd-fill` extended tla-voting to true genesis
  (votes 8,270 · locks 13,585 · bribes 172 · rewards 6,038).
- **The aDAO mint story, chain-verified:** minter
  `terra1m3ye6dl6s25el4xd8adg9lnquz88az9lur2ujztj9pfmzdyfz3xsm699r3` (confirmed
  via cw721 `minter` query). **Phase 0 (GoA) = 1,191 FREE claims** (zero
  funds, 1/wallet, 2023-12-14→2024-01-12), **8,809 → DAO treasury**
  (count from `try_send_to_dao_treasury` events — msgs say `send_to_dao:50`
  but often sent fewer; trust events). **1,191 + 8,809 = 10,000 exact.**
  Paid phases went via candy machines (~1,952 paid mint msgs vs
  release-history's est. 1,981; the 681-NFT 1b/2a split resolves by
  time-windowing paid mints + LUNA funds). First release-history correction:
  **break_nft = 1,010** (page says 1,000). Full template + template history:
  `tla-core/.github/scripts/mint-probe/MINT-TEMPLATE.md`. (The Feb-2024
  50-LUNA mint tx that started this chase was **Galactic Mining Club**, not
  aDAO — collection `terra1q2hjgq5…skk7shc`.)
- **LP deposit history banked** for the flows-fill (see tla-flows update).

**⚠ Public-node retention collapse (same day):** public LCD tx indexes now
retain **~1 week** (were reaching Aug-2024 on 6/15). Cron outages > a few
days = permanent loss; the health monitor is load-bearing; every hole is
recorded in `known_gaps` with precise resume heights.

**Archive-node residue (ALL that still needs a true archive node):**
votes/locks 2026-06-15→22 · bribes/rewards Jan-2025→Jun-2026 · LP-flow events
Jan-2025→tla-flows-start · possibly NFT marketplace events Jan-2025→nft-flows
start (UNVERIFIED — check org nft-flows coverage vs the collection harvest).

**Attribution law (reaffirmed 2026-07-08):** strictly factual — treasury
address = aDAO, protocol multisigs = their protocols, **personal member
wallets = the individual** (e.g. DeFi Patriot's 203.198978-SOLID bribe, epochs
193–200, is HIS, never aDAO's). No affiliation-based folding, ever.

---

## TLA Chain Registry catalog system — the data foundation

**Started 2026-05-XX. Audited heavily 2026-06-02 (Rev 0.10) and locked in 2026-06-06 (Rev 0.16, Phase 0 complete).** This is the 10th cron, named `tla-registry`. Unlike the other 9 crons which collect different aspects of TLA activity for the dashboards, this cron's job is to produce a **canonical registry** of every TLA-relevant token, LP, amplp, and contract — with cross-source reconciliation, on-chain verification, and explicit trust signals.

### 🔒 Phase 0 status — LOCKED IN (2026-06-06)

After 8 revs in 4 days (0.10 → 0.16), the data foundation is complete:

- **173 tokens**, all with `headline_name`, source coverage transparency
- **75 pools**, 72 with full on-chain architecture (contract name, version, pair_type, dex)
- **65 amplps**, all classified with bucket inheritance + wraps_lp link
- **668 wallets**, all with `headline_name` (curated label > PFPK profile name > "{DAO} member" synthesized)
- **43 wallets** with PFPK NFT avatars rendered as card icons
- **AllianceDAO 100% coverage**: 157/157 addresses captured, 45/46 names match (1 is TNS-only)
- **Cross-DEX verified**: 17/17 same-named pairs (Astroport vs SS variants) have identical on-chain underlyings
- **Source coverage transparency**: cosmos_chain_registry / eris / astroport / skeletonswap / coingecko all fetched_ok per run
- **Architecture from cw2 raw storage**: Rev 0.15 fix — `/raw/contract_info` works on contracts that don't expose `{contract_info: {}}` as a smart query (which is most Astroport / WW pair contracts)
- **SS source synthesis**: tokens in SS pools per on-chain truth but missing from SS API metadata (USDC, ATOM, dATOM) get synthesized `sources.skeletonswap` entries with `_synthesized: true` marker

Subsequent phases build on this without further data-layer changes:
- Phase 1: TLA Stats migration (`tla-stats.html` consumes catalog)
- Phase 2: Member Stats (`dao-tla.html` — new)
- Phase 3: Portfolio Tracker
- Phase 4-7: LP Health, Bribes, Vote Intelligence, mobile/SEO pass

### Scope & north star

**The catalog is a TLA-only verification tool.** Its job is to surface everything in TLA's gauge (active or inactive or dewhitelisted) plus underlyings + amplps, with the metadata users need to participate safely. Out of scope: the wider DEX ecosystem, random Terra tokens, pools not in TLA's gauge.

**`tla-catalog.html` is a verification surface, not the destination.** The page exists to make data problems visible. The real user-facing pages (`dao-tla.html` Member Stats, the future Portfolio Tracker, Vote Intelligence, Bribes panels) will consume the catalog data through proper UIs. For now: get the data right.

**Honest data over false positives.** Identical principle to Design Principle #1 — applied to catalog. No silent fallbacks, no faking upstream gaps, no hiding source disagreement. When sources conflict, surface it. When data is missing, say it's missing.

### Data flow

```
External sources (parallel, isolated)
  ├─ chain-registry (cosmos/chain-registry terra2/assetlist.json)
  ├─ Eris /prices  (backend.erisprotocol.com/prices)
  ├─ Astroport /api/pools?chainId=phoenix-1
  ├─ SS /api/pools/phoenix-1  (dex.warlock.backbonelabs.io)
  └─ CoinGecko /coins/list?include_platform=true
                          │
                          ▼
On-chain queries (Terra LCD, retry+fallback)
  ├─ global-config.all_addresses  — get the address book
  ├─ asset-gauge {distributions, config, last_distribution_period}
  ├─ voting-escrow {num_tokens, all_tokens, lock_info}
  ├─ asset-compounder {asset_configs}  — amplp factory state
  ├─ ASSET_STAKING__{bucket} {whitelisted_asset_details}  — per-bucket LPs
  ├─ For each LP: {minter} → {pair}  — resolve underlyings
  └─ For each amplp: {minter} → {pair}  — resolve underlying LPs' underlyings
                          │
                          ▼
Reconciliation + verification stages
  ├─ Stage 5b dedup (no double-counting)
  ├─ Stage 5c synthesize missing amplps  (Eris doesn't price all 65)
  ├─ Stage 6 cascade is_amplp_underlying to correct layer
  ├─ Stage 7b hardcoded override (boneLUNA + future cases)
  ├─ Stage 7c CG verification: terra-2 platform + bridge-trace fallback
  ├─ Stage 8b auto-suggest acquisition guide from bridge data
  ├─ Scope filter (TLA-only) — drops out-of-scope addresses
  └─ source_coverage block (per-source asset counts for tooltips)
                          │
                          ▼
Output to defipatriot/tla-chain-registry
  ├─ 2026/current.json     — the canonical catalog (~500 KB)
  ├─ 2026/heartbeat.json   — cron status + last-run metadata
  └─ 2026/daily/{YYYY-MM-DD}.json  — daily archives (planned)
                          │
                          ▼
Consumer pages
  ├─ tla-catalog.html  — verification surface (Phase 0)
  ├─ tla-stats.html    — already consumes via aDAOLive.getTlaCatalog()
  └─ Future: dao-tla.html, Portfolio Tracker, Vote Intelligence
```

### Cross-source naming reconciliation

Every token in the catalog tracks what each source says about it separately:

```json
"sources": {
  "eris":                  { "display": "boneLUNA", "_display_original": "bLUNA", "_display_overridden": true, "coingecko_id": "backbone-labs-staked-luna", "decimals": 6, "price_usd": "1.84" },
  "astroport":             { "symbol": "bLUNA", "name": "Backbone Labs", "decimals": 6 },
  "skeletonswap":          { "symbol": "bLUNA", "name": "...", "logo_url": "..." } | null,
  "cosmos_chain_registry": { "symbol": "bLUNA", "name": "...", "logo_uri": "..." } | null,
  "coingecko":             { "cg_id": "backbone-labs-staked-luna", "symbol": "bluna", "name": "...", "platform": "terra-2" }
}
```

When sources disagree (different display names, different CG IDs, different decimals), the catalog surfaces the disagreement rather than picking a winner silently. The Cross-source naming panel on the page shows each source's claim side-by-side.

### CG verification methodology

CoinGecko's mapping table has well-known holes. Eris's `/prices` sometimes claims a CG ID that's wrong (3 mismatches caught in the 2026-06-02 audit; consistently flagged in every cron run since — see `catalog-log.md` Rev 0.10). Stage 7c independently verifies every claimed CG ID against CG's own `terra-2` platform index, AND adds a bridge-trace fallback for tokens CG indexes by source chain (e.g., PAXG → `pax-gold` is keyed at the Ethereum address `0x45804880...`; we follow `bridge.all_traces` to find it). Mismatches are surfaced in `coingecko_match` field per token.

Per-token CG match status:

| Status | Meaning |
|---|---|
| `verified` | Eris's claim matches CG's terra-2 listing for this address |
| `verified_via_bridge` | Eris had no claim or wrong claim; we found the right CG ID by tracing the bridge path |
| `discovered` | Eris had no claim; we found a terra-2 listing for this address |
| `mismatch` | Eris claimed an ID; CG actually maps this address to a different ID — both surfaced |
| `unverified_no_terra_addr` | Eris's claim refers to a CG ID that doesn't have a terra-2 platform entry |
| `hardcoded_override` | Manual override (currently just `bLUNA → backbone-labs-staked-luna`) |
| `no_mapping` | No source provided a CG ID; not found by terra-2 or bridge lookup |

### Critical catalog gotchas — DON'T REPEAT

#### Trust the chain, not API labels (verified 2026-06-02)
SS's `/api/pools/phoenix-1` JSON has misleading denom labels for some IBC tokens — claims `ibc/C3988DBA...` for "ATOM on Dungeon" in pools that actually hold `ibc/27394FB0...`. The on-chain `pair{}` query bypasses the API and returns truth.

**Verification:** user deposited standard-IBC ATOM into BOTH Astroport and SS LUNA-ATOM LPs. Both accepted. Followup `pair{}` queries on 17 same-named pairs across DEXes returned identical underlying addresses in every case. There's ONE ATOM token on Terra. SS's API just labels it weirdly.

**Lesson:** never trust an API `denom` field when the contract is the authority. Use the dual-LCD query pattern (see `queries.md` Pattern B + Pattern D). When sources disagree, the chain wins.

#### Self-referential vault detection (verified 2026-06-02)
Eris's single-asset compounder vaults (ampCAPA at `factory/terra186rpf.../ampCAPA`, and any future similar) respond to `pair{}` as if they were 2-asset LPs, returning `asset_infos = [input_asset, self]`. Without intervention, `lp_to_underlyings` ends up with self-references that double-count into `tla_pools_count` and cascade `is_amplp_underlying` to the wrong layer.

**Fix:** scope phase detects `lpAddr ∈ underlyings`, strips the self-reference, and tags entry `_is_vault: true`. Defense-in-depth in Stage 5b dedup and Stage 6 cascade.

**Lesson:** any contract that responds to `pair{}` should be checked for the self-reference pattern before assuming it's a real LP.

#### `(S)` suffix on pool names means Skeleton Swap (not single, not stable)
TLA's gauge whitelists separate pool entries for Astroport-frontend AND SS-frontend pools of the same trading pair (because they're different on-chain contracts with separate liquidity, fees, votes). The catalog distinguishes via the `(S)` suffix on the SS variant.

- `ATOM-LUNA LP` → Astroport pool at `terra19xrvvkq...`
- `ATOM-LUNA LP (S)` → SS pool at `terra1adp223mw...`

These are DIFFERENT contracts. The `(S)` is the indicator. Bucket (single/stable/project/bluechip) is a separate field.

**Future UX win:** rename `(S)` to `(Skeleton Swap)` in display labels. Cryptic abbreviation isn't user-friendly.

#### Skeleton Swap is White Whale code, operated by Backbone Labs
SS pool contracts return `{ contract: "white_whale-pool", version: "1.3.8" }` from the contract-info query. After WW shut down, Backbone Labs took over the pool contracts and built SS as a new frontend on top of the existing infrastructure. Pool addresses are stable (no migration). This explains: (a) why SS pools have a different LP-token-derivation pattern than Astroport (`factory/{pair_addr}/uLP` vs cw20), (b) why config queries return a different shape, and (c) why SS's API has some legacy/inherited metadata quirks.

**Lesson:** never assume "this DEX" means "this protocol team" — the operational layer (frontend, API, governance) can detach from the contract layer (deployed code, addresses).

#### Synthesize records for amplps Eris doesn't price (Stage 5c)
`asset_compounder.asset_configs` returns 65 amplp vaults. Eris's `/prices` only publishes prices for 54 of them. The 11 missing ones are amplps wrapping legacy/inactive LPs (arbLUNA-LUNA, WHALE-bWHALE, WETH.wh-wstETH, etc.). Without intervention, the catalog only shows 54 amplps and silently drops 11.

**Fix:** Stage 5c synthesizes minimal records from `amplp_mappings` data so all 65 appear, priced as `null` (honest data). Page filter still works correctly because the synthesized records have correct `is_wrapped_by_amplp` / `subtype` fields.

**Lesson:** when two sources have related but non-overlapping records (`asset_configs` knows about 65 amplps; `/prices` knows about 54), preserve the union, not the intersection.

#### Headline-name recompute can clobber overrides (verified 2026-06-02)
Hardcoded overrides (e.g., `bLUNA → boneLUNA` in Stage 7b) need to propagate to BOTH the headline_name field AND `sources.eris.display`, OR a later stage that recomputes headline_name from `sources.eris.display` will undo the override silently.

**Fix:** override now writes to `sources.eris.display`, preserves the original as `sources.eris._display_original`, sets `_display_overridden: true` for page-side transparency.

**Lesson:** when a stage sets a field that downstream stages might recompute, set ALL the contributing source fields too, and mark the override explicitly so page rendering can show provenance.

### Curated files (live in `tla-chain-registry/curated/`)

These accompany the cron's automated reconciliation with manual curation. **Important: they live in the data repo (`tla-chain-registry/curated/`), NOT in `website-adao-core/`.** The cron reads them from the same repo it writes the output to, so they're versioned alongside the catalog they affect.

| File | Purpose |
|---|---|
| `categories.json` | Token category taxonomy (token / lp_token / amplp_token / contract) |
| `wallets.json` | Council member + institutional wallet labels |
| `protocols.json` | Protocol metadata (Eris, Astroport, BBL/Skeleton Swap, Capapult, etc.) |
| `known_contracts.json` | Labeled contract addresses for the catalog's contracts tab |
| `token_overrides.json` | Per-token corrections (display name, subtype, notes, variant-trap warnings). **Skip stubs** (keys not matching real chain addresses) are filtered by `isRealAddress()` check in Stage 7 |
| `acquisition_guides.json` | Per-token "how to acquire" routes — `verified: true/false` flag distinguishes confirmed routes from `route_known_unverified` drafts |

Each file has a top-level `_meta` block with its schema, plus an optional `_curation_queue` section at the bottom listing known TODOs. Underscore-prefixed entries (like `_example_wBTCatom_disabled`) are ignored by the cron — remove the underscore to activate.

**Two-tier override system** (intentional, both have a place):
- `token_overrides.json` (curated) — normal address-keyed display/subtype/warning corrections
- `HARDCODED_OVERRIDES` (in cron code, Stage 7b) — special-case overrides for situations the cron must enforce regardless of curated data (the boneLUNA naming dispute is the canonical example — it also propagates `_display_overridden: true` and preserves the original raw value for transparency, which isn't expressible via the curated file format)

### Phase 0 → Phase 1+ — what comes next

The catalog (Phase 0) is the data foundation. Future builds depend on it:

- **Phase 1: TLA Stats** — already shipping; will increasingly consume catalog data via `aDAOLive.getTlaCatalog()`
- **Phase 2: Member Stats (`dao-tla.html`)** — surface the 46 named TLA members' positions
- **Phase 3: Portfolio Tracker** — time-series + P&L using catalog + `adao-positions` daily archive
- **Phase 4: LP Health Scoring** — multi-epoch ungameable metrics using catalog as the "what LPs exist" registry
- **Phase 5: Bribes Tracking** — surface bribes-history cron data through catalog-aware UI
- **Phase 6: Vote Intelligence** — recommendation engine; key differentiator vs Eris UI
- **Phase 7: Mobile + SEO pass** — across all user-facing pages
- **Phase 8: Composability / API** — speculative; expose catalog as queryable JSON

Detailed phase definitions live in `CHANGES_PENDING.md` under "Catalog roadmap (Phase 1+)".

### Reading order for catalog work

A future Claude session asked to work on catalog should read (in order):

1. **PROJECT_KNOWLEDGE.md** — this file. Get the lay of the land.
2. **catalog-log.md** — latest Rev entries. What changed recently, why.
3. **queries.md** — what we ask the chain and what comes back.
4. **CHANGES_PENDING.md** — search for "catalog" — what's pending.

That's ~30 minutes to fully reload context. The 2026-06-02 audit night taught us that without persistent documentation, sessions lose 80% of their working context on every chat-hop and end up re-litigating decisions and chasing already-found bugs. **Don't let that happen again.**

---

## tla-core unified migration — foundation crons & doctrines (2026-06-25)

The migration from ~18 crons + `*-data_2026` repos into ONE `tla-core` repo with
module folders. **Canonical layout + migration philosophy live in
`tla-core/docs/pending-changes/TLA-CORE-STORAGE-DESIGN.md` (moved 2026-07-14);
live status + the retire board live in
`tla-core/docs/pending-changes/CHANGES_PENDING.md`.** (The old
`TLA-CORE-STATUS.md` June-25 handoff is RETIRED — superseded by the org
rebuilds; don't look for it.)

### Storage layout is `module / product / files` (don't forget the product level)
`tla-core/{module}/{product}/` with `heartbeat.json` + `index.json` ALWAYS, plus
`current.json`/`daily/`/`hourly/`/year-rollups (snapshot) or `cursor.json` +
monthly `{YYYY}/{MM}.json` JSON arrays (event — corrected 2026-07-08; daily
jsonl superseded). `fuel/` = reference snapshot module, `nfts/adao/flows/` =
reference event layout (org-tla-voting = reliability reference). **Known defect (2026-06-25):** address-catalog / contract-
token-catalog / price-cron were built FLAT (`catalog/current.json`) — missing the
product level + index.json. Realign to match fuel before treating them as final.

### Migrate by LIFTING CODE into self-contained domain crons — not repointing
The goal is to DELETE old crons + repos, so the new cron must query the chain
ITSELF (no reading old output). Target foundation set:
- **address-catalog** = WHO (members/entities + contracts/wallets/protocols/directory).
- **token-catalog** = WHAT each token is + worth (network-and-prices pricing/ratios
  + tla-registry token identity: logos, decimals, categories).
- **DEX-Data** = pools/reserves/LP-ampLP/slippage/position-valuation (tla-snapshot +
  astroport + skeletonswap).
Then delete network-and-prices, tla-snapshot, tla-registry, astroport, skeletonswap,
the interim contract-token-catalog. Build ONE at a time, run parallel with the old,
prove identical, then unplug. (Repointing output keeps the old cron alive — only
kills the data repo; lifting code is what actually consolidates.)

### tla-chain-registry is a LIVE comprehensive registry (overlaps the catalog)
Cron `tla-registry` → `defipatriot/tla-chain-registry/2026/current.json`, updated
daily. 173 tokens with logos + decimals + categories + coingecko_id, plus
pools/contracts/directory/buckets and curated overrides. Its token identity +
logos are what `token-catalog` should absorb (logo source priority: curated →
cosmos-chain-registry → skeletonswap; 36/173 have logos, rest letter-circle;
pairs = the two underlyings' logos overlapped). DON'T duplicate or repoint it — lift it.

### LP / ampLP value by SHARE FRACTION — never a per-unit price (hard rule)
Proven 2026-06-25 against TLA UI ground-truth ($7,593.66 treasury deposit): a
per-unit ampLP price is the WRONG model (was 1.7×–3.9× low, varying per pool).
The platform (verified `adao-positions`, matches Eris) values every LP/ampLP
position as `staked_shares / total_shares × pool_usd`, read from the staking
contract's `all_staked_balances`. `tla-snapshot.amp_lp.shares` is inconsistent
across pools (80 quadrillion for ampROAR vs 717 for SOLID) and CANNOT be a divisor.
→ Token prices are clean and live in the price layer; LP/ampLP valuation belongs
in the positions module, per wallet.

### ampLP denoms are per-pool; match by asset_configs address overlap
`factory/<compounder>/<N>/<bucket>/amplp` — the `<N>` is a per-pool config index
(multiple per bucket), NOT bucket-keyed. `asset_configs` lists every amplified
pool; each entry references its pool's Astroport pair address. Match each pool to
its own amplified denom by address overlap (compounder
`terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx`). 65 configs /
67 pools — nearly all pools ARE amplified-capable; `amp_lp.ratio_type:'non-amplified'`
describes the displayed ratio basis, NOT "no amplified vault."

### Token rollover — SOLVED for tla-core
DeFi Patriot made one no-expiration commit token, plugged into ALL tla-core crons. No
Nov-2026 rollover needed for tla-core crons (the old `*-data_2026` ones still have
the end-2026 expiry until retired).

## NFT Collection economic model — the chain-of-truth picture

**Built up 2026-06-06/07 during NFT inventory Rev B work.** This section consolidates everything we know about how the aDAO NFT collection actually works on-chain — distinguishing what's true from what the previous data feed (deving.zone) claimed.

### NFT counts breakdown (verified live 2026-06-06)

```
10,000 total
├─ 5,828 unminted    — at DAO main wallet (terra1sffd4efk...), all unbroken
├─   898 treasury    — at DAO Treasury (terra1h8psjg...rp4l7v), all broken (DAO gov)
├─     2 dao_8ywv    — at small DAO wallet (terra1yqv0af...g8ywv), broken
├─   100 enterprise_dao_broken — at Enterprise NFT staking, broken (DAO gov via stake)
├─   403 enterprise_staked     — at Enterprise NFT staking, unbroken (real user stakes)
├─ 1,661 daodao_staked         — at DAODAO staking contract (per indexer attribution)
├─    43 bbl_listed
├─     1 atrium_listed
├─     4 boost_listed
└─ ~1,060 user_held — individual wallets, liquid
```

### DAODAO: custody vs active stake vs pending claims (Rev B.3, 2026-06-07)

The `daodao_staked` count (1,661) is **cw721 custody** — NFTs the DAODAO staking contract physically owns. That is NOT the same as actively-staked voting power:

```
1,661  custody (daodao_staked_count, what the cron counts by owner)
  -  1,657  actively staked  (total_power_at_height = the number DAODAO's UI shows)
  =      4  pending claims   (unstaked, sitting in the 7-day claim queue or forgotten)
```

When someone unstakes, voting power is removed immediately but the NFT stays in the contract for a 7-day `claim_duration`; they must call `claim_nfts {}` to get it back. If they never do, it sits there indefinitely — a "forgotten claim." So custody persistently runs a little above active stake. The 4 current ones are verified legacy forgotten-claims: tokens **6847 + 7123** (wallet `terra1...ct4anrc`, unstaked 2026-01-24), **3605** (`terra1...enfnplr`, 2025-10-11), **1319** (`terra1...wy3a6k`, re-unstaked 2026-03-15 — unstaked twice, claimed once).

The cron tracks this forward (`data/v2/pending-claims.json`, `summary.daodao_pending_claim` block, heartbeat `daodao_pending_claim` + `daodao_pending_reconciled`). **Count is always chain-truth** (`custody − total_power`); per-wallet attribution is best-effort from `unstake`/`claim_nfts` event tracking and self-reconciles every run. Key lessons: (a) you can't find claimants by scanning current members/holders — a full unstaker is invisible from current state; the claimant universe is the historical "ever unstaked, never claimed" set; (b) `claim_nfts` messages are empty `{}` — the returned token_ids live in `transfer_nft` events; (c) apply events in block order so re-unstaked tokens (1319) resolve correctly. This powers a future "you have NFTs ready to claim" nudge on the explorer page.

### The Treasury vs Enterprise confusion (CORRECTED)

**Prior to Rev B**, the nft-inventory cron and the dashboard both used `terra1h8psjg...rp4l7v` and called it "Enterprise." This was wrong:
- `terra1h8psjg...rp4l7v` is the **DAO Treasury contract** — holds 898 broken NFTs for DAO governance leverage. Not actually Enterprise framework.
- `terra1e54tcdyulrtslvf79htx4zntqntd4r550cg22sj24r6gfm0anrvq0y8tdv` is the **real Enterprise NFT staking contract** — has 503 NFTs (100 DAO-controlled broken + 403 real user stakes) and exposes per-staker enumeration via `members{}`.

Rev B fixes this. Backward-compat aliases preserve old field names so the existing dashboard JS keeps working during the Rev 2 page migration window. The "Enterprise Staked = 403" tile in the dashboard is CORRECT — it had been filtering down to the right number even though the field name was misleading.

### Daily yield mechanism (decoded 2026-06-07)

The collection is a continuous yield-generating asset via the Alliance staking module:

1. NFT contract continuously stakes its LUNA in the Alliance module across ~49 validators
2. **Once per day** (~00:50 UTC), Eris's auto-compound bot (`terra1gtuvt6eh4m67tvd2dnfqhgks9ec6ff08c5vlup`) triggers `alliance_claim_rewards` on the NFT contract
3. The NFT contract claims all Alliance rewards (typically ~1,800 LUNA aggregated across validators)
4. ALL claimed LUNA is auto-bonded to Eris Staking Hub → ampLUNA minted (~900 ampLUNA at current rate)
5. **90% of the new ampLUNA stays in NFT contract** for unbroken holder rewards
6. **10% is sent to the DAO main wallet** as operating funds

Decoded from txn `70757515D0FEBE07DABC2013CAC9217514C16AE252AA54BF5E395A9885215B18` (Eris auto-compound, 2026-04-25): 1,874 LUNA claimed → 899 ampLUNA minted → 809 to holders pool + 89 to DAO main wallet.

### Per-NFT backing math (verified)

```
Treasury balance (NFT contract's ampLUNA): 785,796.78
Unbroken NFTs:                             8,907
Per-NFT share: 785,796.78 / 8,907 =        88.22 ampLUNA  (matches rewards query 88.20 — rounding diff)
```

The `rewards{token_id}` query MATCHES this collection-wide formula for unbroken NFTs. But it LIES for broken NFTs — see gotcha below. Always use `treasury_balance / unbroken_count` for backing display.

### The boost mechanic

As NFTs break and claim their share:
- Treasury balance decreases by the per-NFT share (~88 ampLUNA)
- Unbroken count decreases by 1
- New per-NFT share = `(treasury - share) / (unbroken - 1)` — approximately the same as before (boost is gradual)
- BUT all FUTURE daily inflow (~809 ampLUNA/day) is now divided among fewer unbroken NFTs → per-NFT daily yield grows

Verified trajectory:
- At launch (10,000 unbroken): per-NFT daily yield ~0.081 ampLUNA
- Today (8,907 unbroken): per-NFT daily yield ~0.091 ampLUNA (+12.3%)
- If 1,000 more break (7,907): per-NFT daily yield ~0.102 ampLUNA (+12.6% from today)

This is the "break to boost everyone else" mechanic — confirmed working correctly on-chain.

### deving.zone is broken — chain truth is better

Verified bugs in `deving.zone/nfts/alliance_daos.json` (the feed the current explorer page still uses):
- DAODAO staking contract itself listed as a 384-NFT "staker" → inflates total counts
- 16 real DAODAO stakers missing entirely
- 54 DAODAO stakers undercounted (e.g. council member DeFi_Patriot: should be 291, deving.zone shows 238)
- 1,320 owner mismatches (BBL contract shown as owner instead of resolving seller)
- No Atrium awareness at all
- Boost owners not resolved (shows contract instead of seller)

The Rev B cron is better than deving.zone in every dimension. **Rev 2 (page migration) swaps the data source** — tracked in CHANGES_PENDING.md as P1.

### Rewards query gotcha (audit-verified intentional behavior)

The contract's `rewards{token_id}` query returns non-zero amounts for already-broken NFTs that can't actually claim again (verified: three broken NFTs returned 88.20, 27.91, 49.39 ampLUNA — different values). Per `break_nft` docs: "you can only claim once."

The audit (SCV-Security 2023-11-24, 8 findings, no rewards-related bugs) doesn't flag this. The query is informational/historical — computed as a per-NFT share without checking broken state. The actual `break_nft` execute message has separate logic that blocks re-claims.

**Implication for UI:** Don't display raw per-NFT rewards values on the explorer page. Show collection-wide `treasury_balance / unbroken_count` instead (88.20 ampLUNA today). Same value, but reliable.

### Marketplace coverage (3 marketplaces, all chain-of-truth)

| Marketplace | Address | Read query | Active aDAO listings (2026-06-06) |
|---|---|---|---|
| BBL Necropolis | `terra1ej4cv98e...gccs9` | `auction_by_contract` | 43 |
| Atrium | `terra15du229l...0w0kj` | `listings_by_collection` | 1 |
| Boost | `terra1kj7pasy...spf4at` | `launches` (filter !cancelled && !done) | 4 |

All three expose seller via contract state — no transaction-history walks needed to resolve real owner. Boost's `launches` returns ALL collections + ALL history (active + cancelled + done) so must be client-side filtered.

**BBL royalty insight:** every BBL sale of an aDAO NFT pays a 5% royalty back to the DAO main wallet (`creator_address` field in auction response). Worth surfacing as transparency / revenue stream.

### Other Terra NFT collections (BBL backend discovery)

Off-chain reference from BBL's backend API (`https://warlock.backbonelabs.io/api/v1/dapps/necropolis/collections`, captured via HAR 2026-06-06). 8 Terra phoenix-1 collections total on BBL:

| Collection | Contract | Supply | Floor (bLUNA) |
|---|---|---|---|
| AllianceDAO NFT | `terra1phr9fngj...w3apw9` | 10,000 | 1,150 |
| Skeleton Punks | `terra1x7rf4nqu...sjxrvl7` | 5,064 | 165 |
| Scandalous Birds | `terra1dad37a4...fsmccv92` | 200 | 0 (no listings) |
| pixeLions | `terra17z7fpaa...qmxp50g` | 5,000 | 78 |
| Galactic Punks | `terra16ds898j...szs8kp2` | 5,782 | 4,500 |
| SoulReapers | `terra1d36lwl0...snrh0te` | 5,064 | 9 |
| Burning Lion Festival | `terra1cfk54jz...vus95a0q0` | 12 | 30,000 |
| Origin Enigma | `terra1avg745y...syypdup` | 3,000 | 10 |

Both Lion DAO collections (pixeLions, Burning Lion Festival) identified. pixeLions matches the `terra17z7fpaa...` contract that appeared with 10 active launches in our Boost data. Out of TLA scope but noted for potential ecosystem catalog work (CHANGES_PENDING Rev G).

---

## Naming clarification — important for SEO and comms

There is an unrelated organization called "Alliance" / "Alliance DAO" that ranks first on Google when searching `the alliance dao`:

- **Alliance** at `alliance.xyz` — a Web3/AI startup accelerator (formerly "DeFi Alliance")
- Runs `@alliancedao` on X (Twitter) — has 690+ followers, says "Moved to @Alliance"
- Founded 2020, supported projects like Tensor, Kamino, Pump.fun

**This is NOT us.** We're "The Alliance DAO" — a Terra blockchain NFT project at `thealliancedao.com`.

This affects SEO strategy (we likely can't outrank them for the bare query) and any time we describe the project to outsiders. Use full phrase "The Alliance DAO" or shorter "aDAO" — not "Alliance DAO" alone, which is ambiguous.

---

## Current pages (in active use)

Each page has a target rev number for the changelog system rollout. See "Cross-page consistency" rollout in `CHANGES_PENDING.md` for status. **Note:** the rev numbers below were assigned by the user as starting points based on rough recollection of how much work each page has had — they are estimates, not exact commit counts.

| Display name | File | Current rev | Notes |
|---|---|---|---|
| (Home) | `index.html` | 3.50 | The main dashboard, ~12.6k lines. Has the changelog system. Live RPC tile architecture matured 3.38–3.48. Snapshot-staleness modal disabled in Rev 3.49 (replaced by cron-status footer widget). Legacy snapshot infra audit + cleanup in Rev 3.50 (-18 KB dead code, staking APR migrated to cron). |
| NFT Explorer | `nft-explorer-index.html` | 4.13 | Top nav tab. ✅ Cross-page chrome added in Rev 3.22. Map view removed in Rev 4.13. |
| aDAO Lore | `adao-lore.html` | 2.9 | Top nav tab. ✅ Renamed from `planet-map.html` in Rev 3.22. ✅ Cross-page chrome added. |
| TLA Stats | `tla-stats.html` | 2.1 | Top nav tab. ✅ Rebuilt 2026-05-14 to consume continuous cron data sources. Member Data overlay + bribes resolver fix in Rev 2.1 (2026-05-17). |
| DAO | `dao.html` | 1.6 | Top nav tab. ✅ Renamed from `dao_governance.html` in Rev 3.22. ✅ Cross-page chrome added. |
| ALLY Rewards | `ally.html` | 3.4 | Top info-card tile. ✅ Cross-page chrome added in Rev 3.24. Duplicate header cleaned in Rev 3.25. |
| Tutorials | `tutorials.html` | 1.5 | Top info-card tile. ✅ Cross-page chrome added in Rev 3.24. Duplicate header cleaned in Rev 3.25. |
| Tools | `tools.html` | 1.4 | Top info-card tile (hub for fuel-tool, ampcapa-tool, tla_tool). ✅ Cross-page chrome added in Rev 3.24. Old in-page nav removed in Rev 3.25. |
| Rarity Info | `rarity-explained.html` | 1.3 | Top info-card tile. ✅ Cross-page chrome added in Rev 3.24. Duplicate header cleaned in Rev 3.25. |
| NFT Releases | `release-history.html` | 1.4 | Top info-card tile. ✅ Cross-page chrome added in Rev 3.24. Duplicate header cleaned in Rev 3.25. |
| Official Links | `links.html` | 1.4 | Top info-card tile. ✅ Cross-page chrome added in Rev 3.24. Duplicate header cleaned in Rev 3.25. |
| Alliances | `alliances.html` | 1.4 | Top info-card tile. ✅ Cross-page chrome added in Rev 3.24. Duplicate header cleaned in Rev 3.25. |
| DAO TLA Deposits | `dao_tla_deposits.html` | 1.2 | Linked from DAO Links dropdown tile. ✅ Cross-page chrome added in Rev 3.24. Rev 1.1 added live overlay via `aDAOLive` library (2026-05-28). Rev 1.2 fixed compare anchor + chart extends to live. |
| DAO Treasury | `dao_treasury.html` | 3.1 | Linked from DAO Links dropdown tile. ✅ Cross-page chrome added in Rev 3.24. Rev 3.0 (2026-05-28) — full unified-view rebuild (removed 4-tab structure, added token pills + Amount/USD toggle). Rev 3.1 (2026-05-29) — 3-bucket "What Changed" framework (Market / Organic / DAO Actions). |
| Fuel Tool | `fuel-tool.html` | 1.3 | Linked from Tools page. ✅ Renamed from `fuel_tracker.html` in Rev 3.22. ✅ Cross-page chrome added in Rev 3.24. |
| ampCapa Tool | `ampcapa-tool.html` | 1.3 | Linked from Tools page. ✅ Renamed from `capa_lp_converter.html` in Rev 3.22. ✅ Cross-page chrome added in Rev 3.24. |
| TLA Docs | `tla-docs.html` | 1.3 | Linked from TLA Stats. ✅ Cross-page chrome added in Rev 3.24. Title block cleaned in Rev 3.25. |
| TLA Catalog | `tla-catalog.html` | 0.10 | **Verification surface** for the TLA Chain Registry catalog data. Renders cross-source token/LP/amplp reconciliation with CG verification badges + take-rate panels + cron-status footer. Not a destination — exists to make data problems visible. Detailed history in `catalog-log.md`. Phase 0 = catalog data correctness; real user-facing tools (Portfolio, Vote Intelligence, Bribes) come after. |
| _Admin: TLA Tool_ | `tla_tool.html` | — | Internal admin (manual TLA snapshots). Favicon + analytics only — chrome intentionally skipped (admin context). |
| _Admin: TLA Tool Ext_ | `tla-tool_ext.html` | — | Internal admin extension. Favicon + analytics only — chrome intentionally skipped. |
| _Admin: DAO Gov Tool_ | `dao_governance_tool.html` | — | Internal governance audit tool. Favicon + analytics only — chrome intentionally skipped. |
| _Planned: Member Stats_ | `dao-tla.html` | — | **NOT YET BUILT.** Pass 2 of the TLA infrastructure rebuild. Per-member portfolio panels (locks, votes, rewards, bribes claim status) for the 46 named DAO members. Data already collected in `adao-positions/current.json`. Link from `tla-stats.html` tab strip already in place. |

### Admin / dev pages (not in user-facing changelog rollout)
| File | Purpose |
|---|---|
| `tla_tool.html` | TLA admin tool (data collection) |
| `tla-tool_ext.html` | TLA extensions tool |
| `dao_governance_tool.html` | DAO governance tool |

**Rev-bump convention for admin tools:** these intentionally have NO `Rev / Changelog` footer chrome (the public 5-tab nav would be misleading context). When fixing bugs in admin tools, **don't bump a rev** — there's nothing to bump. Document the change in `CHANGES_PENDING.md` (under a "Recent admin-tool fixes" section if needed) and in this doc's "Critical data-capture gotcha" section if the bug class is recurrent. The `index-log.md` is for user-visible changes only.

### Pages removed
`graphs.html`, `news.html`, `rampt.html`, `on-ramp.html`, `off-ramp.html`, `alliance-dao-docs.html`, `test-page.html` — all deleted from repo.

### Notable removed-page history
- **`alliance-dao-docs.html`** — the user noted this had on-chain address fetching logic that may be useful future reference. The user has the file saved separately. If we need the address-fetching pattern in the future, ask the user for it.

---

## External dependencies (CDN-loaded, no local fallback)

If any of these CDNs go down, the site breaks. Worth knowing for incident response.

| Resource | Source | Used for |
|---|---|---|
| **Tailwind CSS** | `cdn.tailwindcss.com` | All styling utilities |
| **Font Awesome** | `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/` | All icons |
| **Inter font** | `fonts.googleapis.com` | Body font |
| **Chart.js** | `cdn.jsdelivr.net/npm/chart.js` | All charts |
| **Chart.js date adapter** | `cdn.jsdelivr.net/npm/chartjs-adapter-date-fns` | Date axis on charts |
| **CoinGecko widget** | `widgets.coingecko.com/gecko-coin-price-marquee-widget.js` | Top price ticker |
| **Vercel Insights** | `/_vercel/insights/script.js` | Analytics |
| **Image assets** | `raw.githubusercontent.com/defipatriot/aDAO-Image-Files/main/` | Favicons, logos, OG images |

### Live data sources
- **Terra LCD** endpoints (chain queries)
- **Backbone Labs (BBL)** marketplace API (NFT listings)
- **Boost** marketplace (NFT listings)
- **CoinGecko** (token prices)
- **Custom JSON snapshots** in the 3 storage repos above

---

## Tested environments — what we know works

**These are the ONLY environments verified working.** Anything else should be considered untested until confirmed. Update this table proactively whenever a new device/browser is tested.

| Environment | Status |
|---|---|
| Desktop Chrome | ✅ Tested, working |
| iPhone 16 (standard size) Chrome browser | ✅ Tested, working |
| iPhone 16 PWA (added to home screen, default browser is Chrome) | ✅ Tested, working |
| iPad portrait (640–768px width) | ⚠️ NOT tested — known awkward gap (sees desktop nav at small viewport) |
| iPad landscape | ⚠️ NOT tested |
| Android phones | ⚠️ NOT tested |
| Safari (iOS or macOS) | ⚠️ NOT tested |
| Firefox | ⚠️ NOT tested |
| Smaller iPhones (SE, mini) | ⚠️ NOT tested |
| Larger iPhones (Pro Max) | ⚠️ NOT tested |

When discussing compatibility, default to "this works in tested environments only" — don't claim cross-device support without actual testing.

---

## PWA update rules

Tracked here so we don't break installed PWAs accidentally.

### ✅ Updates automatically (no user action needed)
- HTML / CSS / JS changes — picked up on next app launch
- Icon image changes (replacing same filename in `aDAO-Image-Files` repo)
- `description`, `theme_color`, `background_color` in `site.webmanifest`
- New shortcuts added/removed in `site.webmanifest`
- Content updates anywhere

### ⚠️ May require user to reinstall to take effect
- Changing `start_url` in `site.webmanifest`
- Changing `scope` in `site.webmanifest`
- Changing `display` mode (e.g., `standalone` → `fullscreen`)
- Changing `name` or `short_name`
- Changing the manifest path or filename

**Rule of thumb:** structural changes to manifest = potential reinstall. Content/icon changes = automatic.

If we ever need to change one of the structural fields, plan to communicate to users they should remove and re-add the home screen icon.

---

## Site architecture conventions

### Class system

- `.stat-card` — base for all data tiles (DAO Treasury, Avg Daily Gain, etc.). Has `display: flex; flex-direction: column; justify-content: space-between`.
- `.stat-card-link` — same as stat-card but for `<a>` tags (clickable). Hover gets cyan glow.
- `.info-card` — also has `.stat-card`. Navigation tiles in the top grid (ALLY Rewards / Tutorials / etc.). Uses `align-items: center` + `text-align: center`.
- `.info-card-tall` — modifier on ALLY Rewards info-card. Spans 2 rows on desktop (`grid-row: span 2`).
- `.info-card-dropdown` — also has `.info-card`. Tiles that open a modal (DAO Links / Contract).
- `.mobile-bottom-nav` — fixed-position bottom nav, only shown on mobile (`≤767px`).
- `.show-only-on-mobile` / `.hide-on-mobile` — display utility classes for responsive content.

### Color palette (cyan/teal theme)
- Primary cyan: `#22d3ee` (text + active states)
- Light cyan: `#67e8f9` (hover + emphasized)
- Teal accent: `#2dd4bf` (icons, secondary)
- LUNA orange: `#ff7e1d` (TLA Locks branding)
- Bg: `#0a0b0f`

### Mobile breakpoints
- `≤640px` — main mobile breakpoint (most overrides live here)
- `≤380px` — small phones (extra tightening)
- `≤767px` — bottom tab bar visible up to this width
- `≥768px` — desktop top nav becomes visible (Tailwind `md:`)

### Critical CSS gotcha — DON'T REPEAT
- `.stat-card h3` mobile rule has `white-space: nowrap; text-overflow: ellipsis` for data tile titles.
- Info-cards inherit this (they're also `.stat-card`), causing text truncation with "..." instead of wrapping.
- **Fix already in place:** the rule is now scoped as `.stat-card:not(.info-card):not(.info-card-dropdown) h3` so info-card titles wrap normally.
- **General lesson:** when a CSS rule isn't applying despite `!important`, check whether a *more specific or later-defined* selector with equal specificity is winning the cascade. Don't pile on more `!important` — fix the selector.

### Critical data-capture gotcha — Vote tab parser hardcoded DEXes/tokens (May 9 2026)
- `parseVoteTab()` (the Vote-tab paste parser that builds `store.lpRegistry`) had hardcoded DEX names `{Astroport, Skeleton Swap, WhiteWhale}` and a hardcoded list of single-sided tokens `['ampCAPA', 'xASTRO']`. When TLA added a new DEX (Creda, hosting `wBTC.creda.a` as a single-sided pool in May 2026), every Creda entry was silently dropped from the registry — and all the downstream consequences (no ampLP balance lookup, no asset metadata entry, missing from snapshot exports) flowed from that single deletion.
- **Fix shipped May 9 2026:** rewrote `parseVoteTab` to detect entries by SHAPE rather than by name lookup. A pool entry is anything that's:
  1. A line that passes `looksLikePoolName()` (has letters, isn't a reserved UI label, isn't a numeric/value line)
  2. Followed within 6 lines by a `VP <amount>  <pct>%` line
  3. With a DEX name (any capitalized word that isn't reserved) somewhere between them
- Verified against the user's epoch-184 paste: captures `wBTC.creda.a|Creda` correctly. Adapts automatically to new DEXes and new single-sided tokens going forward — no code change required.
- **General principle:** when a parser fails because the input has new entries it doesn't know about, the right fix is to make the parser describe *what entries look like* (structurally) rather than enumerate *which entries are allowed* (by name). The enumerated approach guarantees future regressions.

### Critical data-capture gotcha — Astroport D90 dateRange deprecated (May 9 2026)
**Root cause finally identified.** Astroport's TRPC charts endpoint silently dropped `"D90"` as a valid `dateRange` enum value sometime before May 2026. It now returns a Zod validation error: `{"received": "D90", "code": "invalid_enum_value"}`. The endpoint itself works fine — `D7` and `D30` still return real time-series data for active pool addresses.

**Why it manifested as "all-zero exports":**
1. `runFullAstroWorkflow()` fetches all three ranges in sequence: D7 → D30 → D90, saving each into `astroMultiRangeData.{D7,D30,D90}`.
2. D7 and D30 capture real data (~42-45 points per pool for active pools).
3. D90 fetches all error out — but the per-pool entries still get written to `astroMultiRangeData.D90` with `epochs: {}` and `latestLiquidity: 0`.
4. The export builder used `astroMultiRangeData.D90 || astroAutoData.epochData` — `||` doesn't fall through because D90 is a populated (zero-filled) object.
5. Every export read D90 → all zeros, even though D7+D30 had everything.

**Fix shipped May 9 2026 (tla-tool_ext.html):** Added `selectBestAstroRange()` helper that walks D90 → D30 → D7 and returns the first range with at least one entry having non-zero `latestLiquidity` or non-empty `epochs`. Five call sites updated. Astroport error truncation increased from 80 to 200 chars so the schema-validation message is readable next time something else changes upstream.

**Pool-not-found errors are EXPECTED** for deprecated duplicate pool addresses (e.g. `terra16a45v4...` for LUNA-USDC). The dedup logic correctly flags these. They count as "failed" in the new error reporting, but functionally aren't a problem — the active pool address gets the data. Could improve the categorization to suppress these from the failures dialog later.

### Critical data-capture gotcha — Votion API HTTP 500 is INTERMITTENT, not broken
- Eris's Votion backend (`backend.erisprotocol.com/votion/.../optimization`) returns HTTP 500 from origin on a meaningful fraction of calls — but NOT all of them. The page itself succeeds because it retries automatically.
- **Confirmed via HAR capture (May 10 2026):** the same `/optimization` URL that failed multiple times during our captures returned HTTP 200 with full data when the actual app loaded. Same URL, same backend, same data shape we already know how to parse. Not a new architecture, not a different host.
- The `phoenix-rpc.erisprotocol.com` requests we saw in the page's network log alongside `/optimization` are *additional* contract reads for the live `staked` amount shown at the top — not a replacement for the optimization endpoint.
- **Fix shipped May 10 2026:** Added retry-with-backoff (3 attempts, 0/2s/4s waits), per-run failed-proxy memory (don't re-test 4xx-failing proxies between lockups in the same run), 500ms stagger between lockups (Eris's backend handles serial calls better than rapid burst). Inline progress shows which lockup is being fetched + retry status. 5xx errors trigger retries; 4xx errors blacklist the proxy for the run (since it's the proxy at fault, not the origin).
- **Smart proxy ordering:** the cached `workingProxy` (last successful one) is tried first, then untested proxies, then last-known-failed proxies as a last-resort fallback. So in a 6-lockup run, after the first lockup figures out which proxy works, the other 5 use that proxy directly without re-testing the broken ones.

### Critical data-capture gotcha — `epoch: "unknown"` in workflow exports
- The May 9 2026 Astroport and Skeleton workflow exports both have `meta.epoch: "unknown"` and per-pool `currentEpoch.epoch: "unknown"` despite `live-epoch-info` resolving correctly at page load. Skeleton even picked old hardcoded epochs (168, 169) for its 4-epoch averaging instead of the actual current epoch (~184).
- **Where to look first:** the export-builder code that writes the JSON should be reading `store.liveEpochInfo?.currentEpoch` like the rest of the tool does. If it's reading a stale or non-populated field, the export gets `"unknown"`.
- **Until fixed:** rename downloaded files manually before push (`astroport-epoch-184-2026-05-09.json` not `epoch-unknown`), and the Skeleton 4-epoch-avg numbers should be considered suspect for any epoch where `historicalEpochsLoaded` doesn't include the actual current epoch.

### Critical data-capture gotcha — A recorded address that yields zero is suspect, not empty (Jun 12 2026)

The legacy dashboard recorded the Lion DAO validator as `terravaloper1dce…`. Every delegation lookup against it returned nothing, so the Lion alliance tile showed 0 LUNA staked — looking like an honest "no stake." It was wrong: the DAO main wallet HAS a 10,000 LUNA delegation, to `terravaloper1pet430t7ykswxuyhh56d4gk6rt7qgu9as6a5r0` ("🦁 The Lion DAO"). The recorded address was simply wrong (rotated or mistranscribed). **Lesson: when a hardcoded contract/validator address produces a zero/empty result, suspect the address before concluding "no data." Resolve dynamically (by moniker, by enumeration) and emit a diagnostic scan so a zero is one-glance diagnosable.** The dao-dashboard cron now finds Lion by moniker (`/lion/i`) across candidate wallets and emits `delegation_scan`. (HAR from DAODAO's own treasury page — which read the stake fine via RPC ABCI — was how we proved the stake existed.)

### Critical data-capture gotcha — Silent coercion hides cron query failures (May 26 2026)

**Root cause of "adao-positions cron dropped 6 of DAO's 16 LP positions for weeks before anyone noticed."**

The cron's `queryContract` function returned `null` on transient LCD failures (rate-limiting from publicnode under 15-way concurrent load = ~255 in-flight queries per batch). Downstream code did:

```js
.then(r => ({ bucket, entries: Array.isArray(r) ? r : [] }))
```

`Array.isArray(null) === false`, so `null` got silently coerced to `[]`. No error recorded, no `_errors` push, nothing logged. Output looked legitimate — just had fewer positions than reality. For the DAO this meant the entire bluechip bucket (3 amp positions) plus 3 of 6 project amp positions vanished from cron output every single run.

Detection took ~3 weeks because:
- The cron output was still being written successfully (just incomplete)
- The dashboard tile read cron data and showed "$6,340" — a plausible value
- No one noticed until cross-referencing against Eris UI's $9,751 for the same wallet

**Pattern to recognize**: any expression of the form `Array.isArray(r) ? r : []` or `r || []` where `r` came from a network call. These collapse "query failed" into "no data" without distinguishing the two.

**Fix (adao-positions v1.3.0, shipped Rev 3.45):**
1. **Retry with backoff** in `queryContract` — 2× primary attempts with 200-500 ms jittered backoff, then fallback endpoint, then `null`
2. **Distinguish null from empty** — `entries: null` (failed) vs `entries: []` (genuinely empty), propagate as different states
3. **Surface to `_errors`** — failures push to `portfolio._errors` so they appear in output
4. **Lower concurrency** — `BATCH_CONCURRENCY` from 15 → 5. 5-way × 17 queries/member = ~85 concurrent peak, well within publicnode tolerance

**General principle for crons:** any silent coercion of a network result is a latent bug. Always preserve the distinction between "we asked and got nothing back" and "we asked and the answer was empty." Push failures to a structured error list in the output so partial-data states are detectable downstream.

### TLA pool valuation paths (matches cron + library logic)

When valuing a DAO position against a pool from `tla-snapshot.json`, the resolver path depends on the position's asset shape:

- **Cw20 LP tokens** → `poolByLpAddr[cw20.toLowerCase()]`
- **Native / factory tokens** → `poolByGaugeId["native:" + denom]`
- **Single-asset pools** (ampCAPA, xASTRO, ampROAR-ROAR) — have `lp_address: null`:
  1. Try `tokenPrices[poolName].final_price_usd` from `network-and-prices.json` (most accurate)
  2. Fallback to `lp_health.asset_0.price_usd` from snapshot
  3. Last resort: compounder share fallback `staked_in_tla_usd × (userLp / totalLp)`

Schema gotchas to remember:
- `asset_configs[].gauge` IS the bucket name (`'single'`, `'stable'`, `'project'`, `'bluechip'`) — not a contract address
- `user_claimable` (bribe manager) returns `{ start, end, buckets }` — NOT an array. Iterating directly throws.
- `treasury.lp_positions[].estimated_position_usd` is the correct USD field (NOT `usd_value` at root)
- `pool.gauge_pool_id` and member-vote `pool_gauge_id` carry the same values — different field names
- `treasury.wallet_balances[].symbol` is matched on `/zluna/i` to find unredeemed reward tokens (any zluna-suffixed factory denom counts)

### Treasury "What Changed" 3-bucket framework

Documented in `dao_treasury.html` Rev 3.1 (2026-05-29). When showing how the treasury value changed over a window:

```
Net Change = Market Movement + Organic Growth + DAO Actions
```

- **Market Movement** — price impact on starting holdings (sum of `oldAmount × (newPrice − oldPrice)`)
- **Organic Growth** — yield, rewards, slippage (`positionChange − propActionsUsd`)
- **DAO Actions** — sum of executed props' actual treasury impact (`Σ calcPropImpactUsd(prop.netByToken)` for props in the window)

Without splitting DAO Actions out, a "Deposit into TLA" prop deploying LUNA looks identical to losing money. The 3-bucket attribution makes intent legible. `isReceiptToken` filters zLUNA / amp-LP / LP shares from prop impact valuation so a deposit shows only the LUNA outflow, not the offsetting amp-LP token inflow.

Implementation in `dao_treasury.html`: `getActualTreasuryImpact(prop)` returns per-token net flows; `calcPropImpactUsd(netByToken)` values them in current USD. Default compare window = most recent snapshot → Live.

### Modals
- Standard pattern: `<div id="xModal" class="modal fixed inset-0 hidden">` + `<div class="modal-content scale-95">`.
- Open: remove `hidden`, set opacity/scale on next animation frame.
- Close: reverse opacity/scale, then add `hidden` after 200ms.
- Click outside, Escape key, X button all close.

### Markdown changelog system
- Each page footer has Rev number + "Changelog" link.
- Modal fetches the relevant markdown log file from `website-adao-core` repo on open.
- Inline markdown parser handles `# / ## / ### / ####` headings, `-` lists, `**bold**`, `*italic*`, `` `code` `` inline.
- Updates: bump rev in HTML AND prepend a new `## Rev x.y — date` block to the relevant log file.

**Simplified log file scope** — only the **5 top-level navigation destinations** get their own dedicated log files. All other pages display `index-log.md` since most site changes happen on the homepage anyway. **Exception**: the TLA Chain Registry catalog system has its own log (`catalog-log.md`) because it tracks both a page AND its producer cron, and Phase 0 is substantial enough to deserve a dedicated history.

| Page | Log file fetched | Notes |
|---|---|---|
| Home (`index.html`) | `index-log.md` | All-purpose site changelog |
| NFT Explorer | `explorer-log.md` | Tracks NFT Explorer-specific changes |
| aDAO Lore | `lore-log.md` | Tracks Lore page changes |
| TLA Stats | `tla-log.md` | Tracks TLA Stats changes |
| DAO | `dao-log.md` | Tracks DAO landing page changes |
| TLA Catalog (`tla-catalog.html`) | `catalog-log.md` | Tracks catalog page + `tla-registry` cron changes together |
| All other pages (ALLY, Tutorials, Tools, Rarity, NFT Releases, Official Links, Alliances, DAO Treasury, DAO TLA Deposits, Fuel Tracker, Capa Converter, TLA Docs, etc.) | `index-log.md` | Show the site-wide changelog |

This keeps the log surface manageable — 5 log files instead of 17+ — while still letting users see what's been worked on recently across the whole site.

**Naming convention reminder:** log files live at the root of the `website-adao-core` repo as `<short-name>-log.md` — NOT in any subdirectory. Use the short navigation label, not the full page filename (e.g. `explorer-log.md`, not `nft-explorer-index-log.md`).

### Shared live-data library (`lib/adao-live-data.js`)

Introduced in Rev 3.47 (2026-05-28). Single source of truth for live TLA / treasury / unclaimed-rewards fetching across the dashboard suite. Exposes `window.aDAOLive` with composite getters that follow **live RPC primary → cron fallback → snapshot last-resort** for each metric.

**Why this exists:** the same fetch logic was duplicated across `index.html`, `dao_tla_deposits.html`, and `dao_treasury.html` — including the cron-vs-live-vs-snapshot resolution, the LP valuation paths (cw20 vs native vs single-asset), and the bank balance enumeration. Three copies that drifted out of sync. Library consolidates them.

**Public API:**
- `aDAOLive.getDaoTlaDeposits()` → composite LP positions + rewards + bribes + zLUNA
- `aDAOLive.getDaoTreasury()` → wallet balances priced via CoinGecko
- `aDAOLive.getDaoUnclaimedRewards()` → deposit + rebase + vote rewards
- `aDAOLive.getTlaCatalog()` → pools, amp configs, token prices
- `aDAOLive.queryChain(addr, msg)`, `aDAOLive.bankBalances(wallet)`, `aDAOLive.cw20Balance(...)` — primitives for one-off needs
- `aDAOLive.getCron(name)` — raw cron data passthrough when needed
- `aDAOLive.clearCache(pattern?)` — selective cache invalidation
- Constants: `DAO_MAIN_WALLET`, `TLA_STAKING_BY_BUCKET`, `TLA_ASSET_COMPOUNDER`, `ZLUNA_CONNECTORS`, `denomMap`

**Caching:** layered in-memory `Map` + `sessionStorage` (keyed `adao_live:`). Survives navigation between pages within a tab. TTL 5 min for live LP capture + catalog, 1 min for unclaimed rewards. Second page load is effectively instant.

**Architecture rule:** dashboard tiles should be LIVE feeds (RPC primary), cron is fallback + historical capture only. Never tie tile freshness to cron's hourly cadence. New tile work goes through `aDAOLive`. The cron is correctly positioned as historical capture + resilience, not the data source for current state.

**Migration status:** `index.html` and `dao_treasury.html` still have inline live-data code that should migrate to `aDAOLive` incrementally. New work uses the library; legacy paths get migrated when touched. Tracked in `CHANGES_PENDING.md`.

### dao-dashboard cron — the rewards/treasury/deposits aggregate layer (Rev 3.53, 2026-06-12)

The legacy "TLA Admin Core v3" epoch cron died after epoch 185 (last file 2026-05-17). It fed `index.html`'s Unclaimed Rewards (Deposit/Vote/Rebase), TLA Deposits, and Lion alliance tiles — which then froze at epoch-185 values. The **`dao-dashboard` cron** (in `cron-scripts/`, chained into the tla-snapshot Render job) is its successor: it ports the `aDAOLive` query logic server-side and writes `tla-snapshot-data_2026/data/dao-dashboard.json` in a **legacy-v3-compatible `{meta, dashboard}` shape** so every consumer works unchanged.

- Consumers read it **live-primary, 26h fresh-gated**: `index.html` `fetchTlaData`, `dao_treasury.html` `fetchCurrentTlaData`, `dao_tla_deposits.html` `loadData` all try it first, fall back to the legacy epoch walk-back (with its staleness pill) if absent/stale. A stuck emitter degrades gracefully — never hand-edit `generated_at` to "fix" a run.
- Emits: `treasury` (main-wallet balances, legacy `[{token,amount,price,usd}]`), `unclaimed_rewards`, `vote_rewards{by_token,periods}`, `rebase`, `tla_deposits{total_usd,tokens,positions[]}`, `alliances.lion_dao`, plus `token_prices`. Amounts are the durable fields; consumers recompute USD live.
- **Self-archives** the first run each UTC day to `data/daily/dao-dashboard-YYYY-MM-DD.json` — this is what gives the dashboard chart modals + deep-dive pages TLA-metric history past the epoch-185 cliff.

### Cron-first instant paint (Rev 3.54, 2026-06-12) — the load-time pattern

`index.html` opens with `paintFromCron()` BEFORE the live path: two fast static fetches (v2 `summary.json` + `network-and-prices.json`) fill headline tiles in <1s, then `fetchLiveOnChainData` lands real-time values on top. Cut cold load ~9s → 3-5s. **The pattern, reusable for any page:** (1) freshness-gate the cron data (skip paint if >2h stale, let spinners wait for live); (2) every paint setter is **spinner-guarded** (only writes if the tile still shows a spinner) so cron paint can never clobber live data regardless of race order; (3) seed the gecko-shaped price cache from the cron so price-dependent components work before CoinGecko answers; (4) stamp "Data as of HH:MM (pipeline) — refreshing live…". Note even the "stale" first paint is ≤15 min old (v2 hot cron) — fresher than most dashboards' live data.

### Idempotent-fill pattern for race-prone async sections (Rev 3.52/3.54)

Several `index.html` sections (marketplace tier floors, analytics-strip market cap) compute from data that arrives via *multiple* independent async paths (the v2 module, the BBL/Boost caches, the 10k-NFT array stash) finishing in any order. The activity feed kicks the v2 module off before the caches populate, so a one-shot fill runs against empty data and never retries. **Fix pattern:** extract the computation into an idempotent function called from *every* completion point, guarding to skip inputs not yet ready. Two instances of this bug were found and fixed this way — audit the v2 module for a third when next touched.

### Cross-page consistency requirements
**Every user-facing page should look and feel like `index.html`.** This is a hard requirement — pages should be visually indistinguishable from each other except for body content. Specifically:

- **Header** — same logo + tagline + Terra logo as index
- **Top nav tabs (desktop)** — Home + NFT Explorer + aDAO Lore + TLA Stats + DAO (5 tabs total). Currently index has 4 (no Home tab); rolling this out adds the Home tab everywhere.
- **Mobile bottom nav** — Home + NFTs + Lore + TLA + DAO (already 5 tabs)
- **Active page highlighting** — both top nav and bottom nav should highlight the current page in cyan
- **Footer** — same condensed link row + Rev number + Changelog link
- **Color palette** — same cyan/teal theme (`#22d3ee`, `#67e8f9`, `#2dd4bf`)
- **Modal patterns** — DAO Links dropdown, Contract dropdown, App install info, Changelog — all available across pages

**Implementation note:** This is currently per-page duplicated code. A static site generator (Astro/Eleventy) would make this dramatically easier — see "Future projects" in CHANGES_PENDING. Until then, each page needs the shared HTML/CSS/JS copied in. When updating shared elements, every page must be updated.

---

## Data flow patterns

### Staleness handling (important — see Design Principle #1)
- Tiles either show **live data** (green pulse dot) or a **spinner**.
- No more red snapshot dots, em-dashes, or "stale data" text.
- TLA freshness uses `getTlaDataMeta().isStale` (epoch-based, more accurate than date-based).
- Treasury tile only displays a number when ALL assets successfully priced — partial sums mislead.

### Hardcoded fallbacks (LST ratios — known tech debt)
- `bLUNA || 1.6048`, `ampLUNA || 1.9015`, `arbLUNA || 2.6873` still in code in ~10 places.
- These ratios drift slowly (weekly), so the fallback is less misleading than for other data — but still violates Design Principle #1.
- **Open question:** keep or remove? Currently kept.

---

## PWA setup

- `site.webmanifest` defines app name, scope, icons, shortcuts.
- 3 quick-launch shortcuts: NFT Explorer, TLA Stats, DAO Governance.
- PWA mode detection script in `<head>` adds `pwa-mode` class to `<body>`.
- `.pwa-only` CSS class shows/hides UI only in installed-app mode (e.g., default-page selector).
- App install instructions in modal accessed via "App" footer link.
- Default-page preference stored in `localStorage` as `aDAO_default_page`.

### Mobile bottom tab bar
- Currently only on `index.html`.
- Uses fixed-position `<nav class="mobile-bottom-nav">` with 5 tabs: Home / NFTs / Lore / TLA / DAO.
- `env(safe-area-inset-bottom)` for iPhone home indicator clearance.
- Auto-detects active page from filename via inline script.
- **TODO:** add to all other pages so it persists across navigation.

---

## SEO situation — current state and what we know

Searching "the alliance dao" in Google does NOT surface our site (`thealliancedao.com`). Top results are unrelated `alliance.xyz` (the startup accelerator). See "Naming clarification" above.

### What we've already done
- Canonical URL meta tag on `index.html`
- Full Open Graph + Twitter Card meta tags on `index.html`
- `robots: index, follow`
- `theme-color`
- Improved meta description (~150 chars)
- `sitemap.xml` cleaned up — dead pages removed, active pages added with priorities
- 308 redirects from all alt domains to `www.thealliancedao.com`

### What we still need (next SEO project)
- Submit sitemap to Google Search Console — without this, Google won't reliably discover/recrawl
- Verify domain ownership in Search Console
- Apply meta tags to other 18 pages (currently only `index.html` has them)
- Add structured data (`Organization` and/or `WebSite` JSON-LD) so Google understands what we are
- Build backlinks — biggest SEO factor we can't control purely via code
- Wait. Even with everything right, Google can take weeks to months to reindex

### Key constraint
We're competing for "the alliance dao" against `alliance.xyz`, which has 5+ years of history, backlinks, and brand association. Realistic outcome: rank well for "thealliancedao", "aDAO Terra", "alliance dao terra" — niche queries where we're clearly the right answer. Probably can't outrank `alliance.xyz` for the bare query.

---

## Deployment / Vercel

- 308 permanent redirects on all 4 domain variants (`theadao.com`, `www.theadao.com`, `thealliancedao.com` → `www.thealliancedao.com`).
- Auto-deploy on push to `main` — every commit goes live within ~30 seconds.
- **Cron jobs run on Vercel** (defined in `vercel.json` pointing to serverless function endpoints). When building new scheduled tasks (TLA data collection, etc.), default to Vercel cron — don't suggest GitHub Actions unless there's a specific reason.
- One known leftover task: delete duplicate Vercel project `a-dao-links-site` (keep `a-dao-links-site-t6nu`).

---

## Reliability principles (added 2026-06-09 after systemwide audit)

A publicnode pagination quirk silently dropped data in `nft-inventory` for months before it was caught. The lesson generalized into a failure-class checklist (**F1–F8**) now kept in `cron-scripts/README.md` → "Reliability audit & failure-class checklist." Run it against every new or modified cron.

Core principles:
- **Distinguish "query failed" (`null`) from "no data" (`[]`).** Collapsing the two (`r || []`) produces silent incomplete data that can reach permanent archives.
- **Failures must surface in heartbeat `status`** (`partial`/`error`/`stuck`) — never green-light a quiet failure. `network-and-prices` is the model (per-source `.ok` + fingerprint staleness detector).
- **Append-only data (history, daily/weekly archives) is never overwritten with a smaller result** — guard before publish.
- **Work-as-intended-or-error:** consumers (incl. the dashboard) must show an error state, never a stale/default fallback, when a source is unavailable.

Full audit record + the 8 shipped fixes: `CHANGES_PENDING.md` → "Systemwide reliability audit."

## Working conventions for future chats

### Always start a coding session with
```
cd /home/claude/aDAO-links-site
git fetch && git reset --hard origin/main
```
Otherwise local copy goes out of sync with whatever was pushed since last chat.

### Push workflow (user-side)
- User downloads the file Claude exports
- User pushes via GitHub web upload (manual)
- Claude doesn't push; user is the final commit author

### File handoff caveat
When the user downloads a file with the same name multiple times in a session, the browser renames them `index (1).html`, `index (2).html`, etc. The user has to know which is the latest and rename appropriately before uploading to GitHub. **When generating multiple iterations in a session, mention which file is the final one to push.**

### Exported files MUST use the exact destination filename (NO path-encoding, NO suffixes)
Claude exports edited files to `/mnt/user-data/outputs/` for the user to download and upload via the GitHub web UI. The exported file **must have the same name as the file it replaces** — e.g. `nft-inventory.js`, `README.md`, `queries.md` — so the user can match it 1:1 to the file being overwritten without guessing. **Do NOT** rename to path-encoded forms like `cron-scripts__nft-inventory__nft-inventory.js`, and do NOT add `_v2`/`_final` suffixes. If two files in one export would collide on name (e.g. two different `README.md`), export them in separate `present_files` batches or state the destination explicitly for each — do not solve the collision by mangling the filename. State the destination repo/path in the chat text instead.

### Recap files at start of new chat
Fetch these raw URLs to load context. ⚠ **Since 2026-07-14 (SPEC-docs-consolidation) the data/capture-layer docs live in `thealliancedao/tla-core/docs/` — NOT here:**
- `https://raw.githubusercontent.com/defipatriot/website-adao-core/main/PROJECT_KNOWLEDGE.md`
- `https://raw.githubusercontent.com/thealliancedao/tla-core/main/docs/pending-changes/CHANGES_PENDING.md` — the platform work queue (moved 2026-07-14)
- `https://raw.githubusercontent.com/defipatriot/website-adao-core/main/index-log.md`
- `https://raw.githubusercontent.com/defipatriot/website-adao-core/main/tla-log.md` (if working on TLA stats)
- `https://raw.githubusercontent.com/defipatriot/website-adao-core/main/catalog-log.md` (if working on the TLA catalog / `tla-registry` cron)
- `https://raw.githubusercontent.com/thealliancedao/tla-core/main/docs/queries.md` (any time on-chain queries are involved — moved 2026-07-14)

If working on cron-side code, also pull:
- The relevant cron's source from `defipatriot/cron-scripts` (e.g. `tla-snapshot/tla-snapshot.js`, `chain/tla-registry/tla-registry.js`)
- The latest output JSON for that cron to verify schema (e.g. `tla-snapshot-data_2026/main/data/tla-snapshot.json`, `tla-chain-registry/main/2026/current.json`)

---

## Cold-start recovery checklist

If a future Claude session has zero memory and the user is in trouble, here's the minimum to get back up to speed:

1. **Fetch all three doc files** (URLs above)
2. **Clone the repo:** `git clone https://github.com/defipatriot/aDAO-links-site /home/claude/aDAO-links-site`
3. **Read the latest changelog** to see what was last shipped
4. **Read CHANGES_PENDING** to see what's queued
5. **Confirm with user** what they want to work on, then proceed

The docs are the source of truth. If the docs disagree with the code, trust the code and update the docs. If the docs disagree with the user, trust the user and update the docs.

---

## Mental model: what kind of work happens here

This is an **iterative, screenshot-driven UI project**. Pattern:
1. User pushes to GitHub
2. User screenshots what's wrong on mobile/desktop
3. Claude diagnoses + edits
4. User pushes the new version
5. Repeat

Don't over-engineer. Don't add CSS that wasn't asked for. **When user reports something broken, find the actual cause** (often a CSS specificity conflict from layered prior fixes) rather than adding more `!important` overrides on top.

---

## Questions Claude should ask itself before responding

- **Is there context I should have but might be missing?** Search the transcript or past chats first.
- **Is there a design principle that applies here?** Check section above.
- **Will this change affect installed PWAs?** Check PWA update rules.
- **Will this change need to propagate to other pages?** Check Current pages table.
- **Is this something I should add to the docs?** Check Tracking responsibilities at top of file.
- **Does this overlap with a Pending item?** Check `CHANGES_PENDING.md`.

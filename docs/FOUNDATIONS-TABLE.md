# FOUNDATIONS TABLE — page → products → cadence → freshness (opened 2026-09-10)

**What this is.** The owner's "foundations pass": before mobile, prove that every page reads something that is
written when it should be, and that the page-side registry (`lib/cron-registry.js`, the one freshness judge every
page uses) agrees with the Render schedule (`docs/CRON-FLEET.md`). Built from the site source (every product path
each page fetches), the fleet registry, and live heartbeats on 2026-09-10 21:xx UTC.

## Mismatches found and fixed in this commit

| # | Finding | Fix |
|---|---|---|
| 1 | **NFT analytics + market-history dead since 2026-08-23.** `runWithAnalytics` read `result.runMode` but `captureSnapshot()` returned nothing → both tails skipped on every auto-escalated warm/full run. Every NFT sales/volume figure on the site (analytics, dao-dashboard `nft.sales_total`, the NFT-market popup bars) is frozen at 08-23. | nfts/adao/index.js returns `{ runMode: effectiveMode }`; gate 7/7 incl. the reproduced regression. First warm run after commit rebuilds analytics + sales-enriched. |
| 2 | **Credia market row DROPPED from tla-snapshot** (67/68): the gauge entry is a cw20 receipt token with no `minter{}`, so `resolvePoolId` failed and `enrichPool` returned null → wBTC.creda.a ($80.7K staked, active) absent from every tla-stats tab. | member-data 1.1.2: cw20 without minter → `token_info` → cw20-single; named from the org catalog (`wBTC.creda.a`); staked/depth from the org credia snapshot (receipt ratio × market TVL = $80,538 vs Eris $80.72K). Gate 8/8. |
| 3 | Registry judged **tla-voting as 15-min** (job is hourly → "late" most of every hour) and **nft-flows as daily** (job is 15-min → a dead walker took 2 days to go red). | cron-registry.js: tla-voting HOURLY, nft-flows FAST. |
| 4 | Three products pages read had **no registry entry**: eris-apr and credia (a dead module inside org-dex-data was invisible — the astroport epochs heartbeat stays green), member census (daily snapshots read by 5 pages). | cron-registry.js: `eris-apr`, `credia`, `member-census` added (23 entries). |
| 5 | nap mock gate **red since 08-21** (provenance layer vs undeclared F2b edits) and two legacy-repo reads. | nap 3.0.3 (committed earlier today). |
| 6 | eris-apr `meta.validation` still "pending reconciliation"; Credia row named by placeholder. | dex-data 1.3.5. |

## Still open (carried on the OPEN LEDGER)

- `dex-data/pool-status` — last write 2026-08-11, retired cron, zero readers → delete the folder (owner; data has no consumer).
- `price-history/ratios/` frozen 2026-07-16 vs live `network-and-prices/ratio-history.json` — fold/retire inside the ratio re-anchor (Milestone A step 3).
- `tla-flows/pnl` is a manual Action (last 09-07) — pages show `builtAt`; becomes scheduled with build-pnl v3.
- `dex-liquidity/events` (tla-flows aux stream) has no 2026-09 file — check whether the aux capture is writing or the stream is empty.
- system-health `bucket_vp_consistency` violation (bluechip 12.2%) — known #4.
- supporters has no heartbeat by design (writes on change) — the page shows last change; acceptable.

## Product families → job · schedule · registry entry · heartbeat

| Product family | Job (Render) | Schedule | Registry entry | Heartbeat / timestamp | Note |
|---|---|---|---|---|---|
| `member-data/tla-snapshot` | org-member-data | hourly :45 | tla-snapshot | member-data/tla-snapshot/heartbeat.json |  |
| `member-data/participants` | org-member-data | hourly :45 | tla-participants | member-data/participants/heartbeat.json |  |
| `member-data/positions` | org-member-data | hourly :45 | adao-positions | member-data/positions/heartbeat.json |  |
| `member-data/dao-dashboard` | org-member-data | hourly :45 | dao-dashboard | member-data/dao-dashboard/current.json (meta.generated_at) |  |
| `member-data/snapshots` | org-member-data | daily 02:45 (census) | member-census (NEW) | member-data/snapshots/heartbeat.json |  |
| `member-data/supporters` | org-member-data | hourly :45, writes only on change | — (no heartbeat by design) | product generated_at = last change | page shows the gift list; freshness = last change, not last run |
| `network-and-prices` | nap-org | hourly :05 | network-and-prices | network-and-prices/heartbeat.json | also writes price-history daily rows + ratio-history (23:xx) |
| `price-history` | nap-org (daily rows) · price-backfill Action (history) | daily via nap | — via network-and-prices | price-history/<yyyy>/<mm>.json meta | price-history/heartbeat.json is the one-off backfill (07-17) — not a freshness signal |
| `tla-voting/events` | org-tla-voting | hourly :00 | tla-voting (was 15 min → HOURLY) | tla-voting/events/heartbeat.json |  |
| `tla-voting/events/rollups` | org-tla-voting | hourly (rebuilt on harvest) | — via tla-voting | same |  |
| `tla-voting/bribe-state` | org-tla-voting | per PERIOD (E close) + runway.json hourly | — derived | tla-voting/bribe-state/heartbeat.json | a period-old heartbeat is NORMAL; judge the job by events |
| `tla-voting/distributions` | org-tla-voting | per period | — derived | …/distributions/heartbeat.json | same |
| `tla-voting/pd-bribes` | org-tla-voting | per period | — derived | …/pd-bribes/heartbeat.json | same |
| `tla-flows/pnl` | GitHub Action tla-flows-pnl (manual) | on demand (last 2026-09-07) | — manual | tla-flows/pnl/heartbeat.json builtAt | pages show builtAt; step 3 makes this an Action on a schedule |
| `tla-flows/pressure` | org-tla-flows | 15 min (rides the walker) | — via tla-flows | tla-flows/pressure/current.json | no heartbeat file; judged by tla-flows events |
| `dex-data/astroport` | org-dex-data | hourly :31 | astroport | dex-data/astroport/epochs/heartbeat.json |  |
| `dex-data/skeletonswap` | org-dex-data | hourly :31 | skeletonswap | dex-data/skeletonswap/rolling/heartbeat.json |  |
| `dex-data/eris-apr` | org-dex-data | hourly :31 | eris-apr (NEW) | dex-data/eris-apr/heartbeat.json | was invisible — astroport heartbeat stayed green if this module died |
| `dex-data/credia` | org-dex-data | hourly :31 | credia (NEW) | dex-data/credia/snapshots/heartbeat.json |  |
| `nfts/adao/snapshots` | org-nft-inventory | 15 min :42 (hot) · warm daily · full weekly | nft-inventory | nfts/adao/snapshots/heartbeat.json | analytics + market-history ride warm/full — BROKEN since 08-23, fixed this commit |
| `nfts/adao/flows` | org-nft-flows | 15 min :52 | nft-flows (was daily → 15 MIN) | nfts/adao/flows/heartbeat.json |  |
| `nfts/adao/claims` | org-nft-inventory | with inventory | — via nft-inventory | nfts/adao/claims/* |  |
| `nfts/adao/provenance` | Action one-off | — | — | provenance/heartbeat.json ran_at 07-08 | history product, not live |
| `nfts/adao/transfers` | org-tla-flows (aux stream) | 15 min | — via tla-flows | nfts/adao/transfers/* |  |
| `token-catalog/snapshots` | org-token-catalog | 6h :35 | token-catalog | token-catalog/snapshots/heartbeat.json |  |
| `token-catalog/supply` | org-token-catalog | 6h :35 | capa-supply / fuel-supply | supply/*/current.json capturedAt |  |
| `catalog/trusted` | org-address-catalog | daily 01:00 | — via address-catalog | catalog/trusted/current.json meta.generated_at |  |
| `catalog/snapshots` | org-address-catalog | daily 01:00 | address-catalog | catalog/snapshots/heartbeat.json |  |
| `votion/snapshots` | org-votion | hourly :20 | votion | votion/heartbeat.json |  |
| `votion/optimization` | org-votion | hourly :20 | — via votion | votion/optimization/current.json |  |
| `votion/yields` | org-votion | hourly :20 | — via votion | votion/yields/current.json |  |
| `lp-grades` | org-lp-grades | daily 23:15 | lp-grades | lp-grades/snapshots/heartbeat.json |  |
| `system-health` | org-system-health | hourly :10 | system-health | system-health/current.json |  |
| `help-agent` | tla-help-agent (web service) | always on | — | service health |  |
| `docs/curated` | owner-edited | on commit | — static | — | trust register, overrides |
| `docs/changelogs` | Claude/owner on delivery | on commit | — static | — |  |
| `docs/epoch_1-300_date.json` | static | — | — static | — |  |
| `docs/tla-docs-content.json` | owner/Claude | on commit | — static | — |  |
| `docs/archive` | frozen | never | — static | — | legacy-registry snapshot for the two In-Development tools |
| `governance` | org-dao-governance | 6h :25 | dao-governance | dao-originations/heartbeat.json |  |
| `dao-originations (org repo)` | org-dao-governance | 6h :25 | dao-governance | dao-originations/heartbeat.json |  |

## Pages → product families read

| Page | Families |
|---|---|
| address-catalog.html | `catalog/trusted`, `docs/curated` |
| ally.html | `nfts/adao/snapshots` |
| ampcapa-tool.html | `catalog/trusted`, `docs/changelogs`, `token-catalog/supply` |
| dao.html | `catalog/snapshots`, `dao-originations (org repo)`, `governance` |
| dao_governance_tool.html | `dao-originations (org repo)`, `governance` |
| dao_tla_deposits.html | `dao-originations (org repo)`, `dex-data/astroport`, `dex-data/skeletonswap`, `governance`, `member-data/dao-dashboard`, `member-data/positions` |
| dao_treasury.html | `dao-originations (org repo)`, `governance`, `member-data/dao-dashboard`, `nfts/adao/claims`, `token-catalog/snapshots` |
| fuel-tool.html | `catalog/trusted`, `dex-data/astroport`, `docs/changelogs`, `member-data/tla-snapshot`, `price-history`, `tla-voting/bribe-state`, `token-catalog/supply`, `votion/optimization` |
| help.html | `help-agent` |
| index.html | `dao-originations (org repo)`, `dex-data/astroport`, `dex-data/skeletonswap`, `docs/changelogs`, `docs/curated`, `docs/epoch_1-300_date.json`, `governance`, `member-data/dao-dashboard`, `member-data/positions`, `member-data/snapshots`, `member-data/tla-snapshot`, `network-and-prices`, `nfts/adao/flows`, `nfts/adao/snapshots`, `nfts/adao/transfers`, `price-history`, `tla-voting/bribe-state`, `tla-voting/distributions`, `tla-voting/events`, `token-catalog/snapshots`, `votion/optimization`, `votion/snapshots` |
| member-portfolio.html | `docs/epoch_1-300_date.json`, `member-data/participants`, `member-data/positions`, `member-data/snapshots`, `member-data/tla-snapshot`, `nfts/adao/snapshots`, `tla-flows/pnl`, `tla-voting/distributions`, `tla-voting/events`, `tla-voting/events/rollups`, `token-catalog/snapshots`, `votion/snapshots` |
| new-here-tla.html | `dex-data/credia`, `dex-data/eris-apr`, `member-data/participants`, `member-data/snapshots`, `member-data/tla-snapshot`, `token-catalog/snapshots`, `votion/optimization`, `votion/snapshots`, `votion/yields` |
| new-here.html | `member-data/dao-dashboard`, `network-and-prices`, `nfts/adao/snapshots` |
| release-history.html | `nfts/adao/snapshots` |
| slippage.html | `dex-data/astroport`, `dex-data/skeletonswap`, `docs/changelogs`, `member-data/participants`, `member-data/positions`, `price-history`, `token-catalog/snapshots` |
| supporters.html | `catalog/trusted`, `member-data/supporters`, `network-and-prices`, `token-catalog/snapshots` |
| system-health.html | `system-health` |
| test.html | `docs/epoch_1-300_date.json`, `member-data/participants`, `member-data/positions`, `member-data/snapshots`, `member-data/tla-snapshot`, `nfts/adao/snapshots`, `tla-flows/pnl`, `tla-voting/distributions`, `tla-voting/events`, `tla-voting/events/rollups`, `token-catalog/snapshots`, `votion/snapshots` |
| tla-catalog-edit.html | `docs/curated`, `governance` |
| tla-catalog.html | `docs/archive`, `docs/curated`, `governance` |
| tla-chain-queries.html | `docs/archive` |
| tla-docs.html | `docs/tla-docs-content.json` |
| tla-stats.html | `dex-data/astroport`, `dex-data/eris-apr`, `dex-data/skeletonswap`, `docs/curated`, `docs/epoch_1-300_date.json`, `docs/tla-docs-content.json`, `governance`, `lp-grades`, `member-data/participants`, `member-data/positions`, `member-data/snapshots`, `member-data/tla-snapshot`, `network-and-prices`, `nfts/adao/snapshots`, `tla-flows/pressure`, `tla-voting/bribe-state`, `tla-voting/distributions`, `tla-voting/events`, `tla-voting/events/rollups`, `tla-voting/pd-bribes`, `token-catalog/snapshots`, `votion/optimization`, `votion/snapshots` |
| transparency-hub.html | `docs/changelogs`, `lp-grades`, `system-health` |
| verify.html | `catalog/trusted`, `docs/curated`, `member-data/positions`, `nfts/adao/provenance`, `nfts/adao/snapshots`, `system-health`, `token-catalog/supply` |
| nft-explorer-app.js | `dao-originations (org repo)`, `governance`, `nfts/adao/snapshots` |

Families with **no page reader** (inputs to other products or retired): `tla-voting/vote-state` (→ rollups), `tla-voting/pd-bribe-fit` (→ lp-grades), `tla-flows/events` (→ pnl, pressure), `dex-data/state-history` (→ build-pnl), `dex-data/pool-status` (retired), `votion/history`, `votion/events`, `dex-liquidity` (aux stream).

# AUDIT — page walk, mechanical pass (2026-08-24 late)

Method: every page booted in jsdom against the COMMITTED products (fresh
tla-core tarball), recording uncaught errors, every URL fetched, first-paint
weight of tla-core reads, 404s; plus source greps for personal-repo reads and
legacy inline chrome (changelogModal / mobile-bottom-nav markup). What this
pass CANNOT judge: story-shaped presentation and bot behaviour — those two of
the five checks need eyes on the live site (owner, when back on a machine
where Eris works).

| page | html KB | fetches | first-paint core | dead reads | legacy chrome | shared chrome | this batch | queued |
|---|---:|---:|---:|---|---|---|---|---|
| adao-lore | 104 | 0 | 0.0 MB | — | YES | no footer |  |  |
| address-catalog | 12 | 1 | 0.3 MB | — | — | header+footer |  |  |
| alliances | 27 | 0 | 0.0 MB | — | YES | header+footer |  |  |
| ally | 33 | 5 | 0.1 MB | — | — | header+footer |  |  |
| ampcapa-tool | 161 | 8 | 0.0 MB | — | YES | no header/footer |  |  |
| dao | 168 | 2 | 0.0 MB | credit link → retired repo → FIXED | YES | header+footer | 1.10: source credit → tla-core |  |
| dao_governance_tool | 263 | 6 | 0.0 MB | — | — | no header/footer |  |  |
| dao_tla_deposits | 93 | 31 | 1.3 MB | — | YES | header+footer |  |  |
| dao_treasury | 163 | 28 | 0.5 MB | — | YES | header+footer |  |  |
| fuel-tool | 53 | 47 | 9.4 MB | — | YES | no header/footer | 2.5: bars from daily CSV (9.4→1.9 MB) |  |
| help | 34 | 0 | 0.0 MB | — | — | header+footer |  |  |
| index | 1060 | 121 | 32.6 MB | link → defipatriot/aDAO-Image-Files (404) → FIXED | YES | header+footer | 4.03: dead image-repo link → site assets | 33 MB / 121 fetches — index-perf slim series (core item 4) |
| links | 18 | 0 | 0.0 MB | — | — | header+footer |  |  |
| member-portfolio | 170 | 12 | 5.5 MB | — | — | header+footer |  | 5.5 MB — same feeds (index-perf scope) |
| nft-explorer-index | 53 | 0 | 0.0 MB | — | YES | header+footer |  |  |
| rarity-explained | 42 | 0 | 0.0 MB | — | — | header+footer |  |  |
| release-history | 73 | 4 | 0.0 MB | api.github.com defipatriot/tla_json_storage (403) → FIXED | YES | header+footer | 1.5: floor from org product; $43 phantom removed |  |
| slippage | 52 | 3 | 0.5 MB | — | — | header+footer |  |  |
| system-health | 15 | 1 | 0.0 MB | — | — | no header |  |  |
| tla-catalog-edit | 38 | 1 | 0.0 MB | — | YES | no header/footer |  |  |
| tla-catalog | 120 | 1 | 0.0 MB | defipatriot/tla-chain-registry (legacy, alive) | YES | header+footer |  | reads defipatriot/tla-chain-registry (alive, legacy) — repoint blocked on identity fold (core item 3) |
| tla-chain-queries | 96 | 1 | 0.0 MB | defipatriot/tla-chain-registry (legacy, alive) | YES | header+footer |  | same as tla-catalog |
| tla-docs | 41 | 2 | 0.0 MB | — | YES | header+footer |  |  |
| tla-stats | 857 | 40 | 9.7 MB | credit link → retired repo → FIXED | YES | header+footer | T3.18: source credit → tla-core | 9.5 MB — participants 2.3 MB, voting rollups 1.5 MB (index-perf scope) |
| tools | 21 | 5 | 0.0 MB | — | — | header+footer |  | probes test-2…5.html (404s) by design — leave |
| transparency-hub | 29 | 5 | 0.5 MB | — | — | header+footer |  |  |
| tutorials | 9 | 0 | 0.0 MB | — | — | header+footer |  |  |

## Findings fixed in this batch
- **release-history 1.5** — floor price read the GitHub API of a retired personal repo (403 for weeks) and fell back to a HARDCODED $43 'Estimate' used in ROI lines: a phantom. Now reads `nfts/adao/snapshots/floor-history.json` (base-tier listing floor $49.98 on 08-23; sales floor for the market line); unavailable → dash. Gate 5/5.
- **fuel-tool 2.5** — 30 daily JSON snapshots (276 KB each) loaded for one pool's volume bars: 8.1 MB. Daily CSVs carry the same columns at 19 KB. First paint 9.4 → 1.86 MB. Gate 14/14.
- **index 4.03 / dao 1.10 / tla-stats T3.18** — links to retired personal repos (one 404, two alive-but-retired) replaced by the sources the pages actually read.

## Batch 4 (queued) — legacy chrome strip: 15 pages still carry the inline changelog modal + mobile bottom nav
adao-lore, alliances, ampcapa-tool, dao, dao_tla_deposits, dao_treasury, fuel-tool, index, nft-explorer-index, release-history, tla-catalog-edit, tla-catalog, tla-chain-queries, tla-docs, tla-stats.
Five of them have NO shared header/footer mounted (adao-lore footer; ampcapa-tool, fuel-tool, tla-catalog-edit, dao_governance_tool header+footer; system-health header) — for those the order is: mount shared chrome → strip inline. PROJECT_KNOWLEDGE recorded 'stripped from 4 pages (INDEX still carries its copy)'; the count is 15, not 1. Each page needs a look on the live site after the strip (visual), so this is an owner-present batch.

## Load-weight ledger (core reads at first paint)
index 33 MB (121 fetches) · tla-stats 9.5 MB · fuel-tool 1.9 MB (was 9.4) · member-portfolio 5.5 MB · dao_tla_deposits 1.4 MB · everything else < 0.6 MB. The three heavy pages share the same cause — whole-history products read to draw a tile — and the same fix: the slim daily row-series cron (core item 4). Not patched page-by-page on purpose.

## Benign / by design
index probes today's `member-data/tla-snapshot/daily/<today>.json` before the capture exists (one 404 per load until ~17:00 UTC) — cosmetic, note for the index walk. tools.html probes test-2…5.html for dynamic tiles (404s) — intended.

## Not judged here (needs the live site)
Story-shaped presentation (hero → sentence → what changed → detail) and help-bot behaviour on each page. Owner walk when back on a machine where Eris resolves; suggested order: index, tla-stats, dao, member-portfolio (the four heavy, high-traffic ones).

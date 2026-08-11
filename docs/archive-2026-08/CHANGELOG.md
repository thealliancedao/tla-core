# CHANGELOG — TLA Stats

Format: each component has a **Rev**. Within a rev, every download→commit→test
cycle is `.1`, `.2`, `.3` capturing what was **found / fixed / verified**. A
**milestone** = a Rev jump (e.g. Rev 1 → Rev 2), summarizing the why + the
verification across all the steps between.

Discipline: don't update continuously. Finish the work, THEN before moving on,
package the changelog and commit. The Updates tab on the Transparency Hub reads
this file.

Entry tags for the feed: [MILESTONE] surfaces prominently; [STEP] is detail;
[FIX], [VERIFIED], [LIVE] annotate.

---

## tla-core Foundation Crons — Rev 1 (2026-06-25) [MILESTONE] [LIVE]
The first foundation modules of the unified `tla-core` migration — who / what /
price + the history engine. Took tla-core from "fuel only" to a working data
foundation. Includes a major pricing correction (LP/ampLP cannot be per-unit priced).

- **1.1 — tier-builder** [STEP] Built `lib/tier-builder.js`, the boundary-based
  history cascade (raw→hourly→daily→epoch→monthly→yearly + epoch-end freeze).
  Pure logic, unit-proven vs a simulated clock. Not a cron.
- **1.2 — address-catalog** [STEP] [LIVE] The WHO registry: config-driven `TRACKED`
  array, discovers members by stakeType, resolves PFPK names, applies retention.
  [VERIFIED] 389 addresses (adao 156, tla_locks 203, pixellions 77, liondao 69).
  Writes `tla-core/catalog/`. Self-contained (queries chain directly).
- **1.3 — contract-token-catalog** [STEP] [LIVE] The WHAT/HOW registry (pools,
  tokens, ratio hubs, contracts w/ verified queries). [FIX] [VERIFIED] ampLP denom
  matching corrected from bucket-keyed to per-pool via `asset_configs` address
  overlap — 59 distinct denoms across 61 pools. (Reads tla-snapshot — NOT yet
  self-contained; slated to dissolve into token-catalog + DEX-Data.)
- **1.4 — price cron** [STEP] [LIVE] Consolidates network-and-prices into one
  token→price table + tier-builder history. 27 tokens, 6 ratios. `tla-core/prices/`.
- **1.5 — pricing correction** [FIX] [VERIFIED] Briefly added LP/ampLP per-unit
  prices, then REMOVED them: the TLA UI ground-truth ($7,593.66 treasury deposit)
  proved per-unit pricing is the WRONG model — LP/ampLP value by SHARE FRACTION
  (`staked/total × pool_usd`), not amount×price. `amp_lp.shares` is inconsistent
  across pools and unusable as a divisor. Price layer is token-only (correct);
  LP/ampLP position valuation belongs in the positions module. Honest data over
  false positives.
- **1.6 — docs centralized** [STEP] Moved epoch schedule (`epoch_1-300_date.json`)
  + `Staking APR.csv` into `tla-core/docs/`. Wrote `tla-core/docs/TLA-CORE-STATUS.md`
  — the migration audit/handoff (single grounded reference for the pipeline).

## System Health Monitor — Rev 1 (2026-06-15) [MILESTONE] [LIVE]
The operational face of the platform: reads every cron's heartbeat, evaluates
freshness/status/errors, surfaces it on a page. Went from "no visibility" to a
live health dashboard.

- **1.1 — build** [STEP] Created `system-health.js` (reads all heartbeats, scores
  confidence) + the page. Found: heartbeats already carry rich freshness/stuck
  signals to use.
- **1.2 — error surfacing** [STEP] Added `lib/error-reporter.js` — sanitizes errors
  (strips tokens/creds/paths) so failures can be shown safely. [VERIFIED]
  adversarial test caught a JWT leak, fixed it, re-tested clean. Wired into
  votion-positions as the template.
- **1.3 — path corrections** [FIX] [VERIFIED] A real NFT-inventory run revealed the
  monitor was reading the wrong heartbeat path (`data/` vs `data/v2/`), causing a
  false "8 days stale" alarm. Audited ALL cron heartbeat paths against production,
  corrected nft-inventory→data/v2, fuel→snapshots. Re-ran: 92% confidence, 15
  systems healthy. [LIVE] published to system-health-data_2026.

## Pricing Doctrine — Rev 1 (2026-06-14) [MILESTONE] [VERIFIED]
Settled how every asset is priced after the arbLUNA investigation.
- **1.1** [STEP] Detected arbLUNA hub-ratio vs single-pool gap (~14%).
- **1.2** [FIX] Initially concluded hub was wrong — then CoinGecko ground-truth
  ($0.1523 vs our $0.1548 = 1.6%) proved the HUB was right and the thin Astroport
  pool was the liar. [VERIFIED] Kept hub-ratio as final; thin pool can flag but
  never override. Doctrine: match the source to the asset's liquidity — big assets
  use CoinGecko, small/derivative tokens use base-price × on-chain ratio.

## Votion Capture — Rev 1 (2026-06-14) [MILESTONE] [LIVE]
Per-user Votion vault holdings — made invisible VP visible.
- **1.1–1.3** [STEP] Cracked the vault architecture from chain + HAR; built
  capture (6 vaults, holder discovery via deposit events, value via vdenom × rate).
  [VERIFIED] all 6 vaults' staked match Votion UI byte-for-byte. [LIVE]
- **1.4** [STEP] Added daily archive (accumulation clock for time-series).

## Data Layer — Rev 1 (ongoing) [LIVE]
Daily archives added to votion-positions, adao-allies, tla-participants
(2026-06-14) — time-series accumulation started. Registry updated to 45 known
contracts (Votion vaults labeled).

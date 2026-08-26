# SPEC — dex-state-history (per-epoch pool state to genesis, from the archive node)

Status: **BUILT & GATED 2026-08-26 — first live run pending (owner dispatch)** ·
Owner: capture layer (tla-core GitHub Action, archive-window build) · Consumers:
build-pnl v3 (value curve, amplified-rate history, LP unit → token decomposition),
member-portfolio rebuild.
Home: `tla-core/docs/pending-changes/` · Origin: Portfolio P&L milestone opener
2026-08-26 — the ledger's own note: "value_curve NOT present — no pool state
exists before dex-data (2026-06-26); the archive state sampler upgrades this tier".

## 1. Goal

For every TLA epoch START boundary since the event corpus begins (epoch 97,
2024-09) record the chain state a portfolio needs to value LP units held at that
moment: pair reserves + LP total supply (unit → tokens), the asset-compounder's
LP↔amplp totals (the amplified exchange rate), the 4 staking-bucket totals, and
the 5 LST hub ratios. One pass, every consumer.

## 2. Evidence (probe #1, 2026-08-26, real archive)

LCD transport. Epoch 100 (2024-09-23): 45/67 pairs answered, the other 22 (and
the compounder itself) `no such contract` — born later, expected. Epoch 150
(2025-09-08): 64/67 (LUNA-FUEL, LUNA-PAXG, PAXG-WBTC born later); compounder 58
assets with rates. Epoch 199: 67/67, 65 rates. Hubs 5/5 at every height; staking
3/4 → 4/4. Zero `depth` failures anywhere — the node holds state back to at
least September 2024. Heights placed 2–4 s before each boundary in 2–4 block
reads (anchor bracket from 118,963 event height↔time pairs, then secant refine).

## 3. Product — `dex-data/state-history/`

- `epochs/<epoch>.json` — one file per boundary, **write-once**; written as
  `complete:true` only when the sample had zero transport failures. Per pair:
  `{pair, ok, assets:[{denom, amount}], total_share}` or an honest class
  (`absent` not instantiated at height · `depth` node lacks state · `query`
  message rejected · `shape` answered without assets+total_share). Denoms are
  normalised to the event corpus's key form (`cw20:<addr>` / `native:<denom>`)
  so joins to `tla-flows/events` and the ledger are direct. `compounder.rates[]`
  = `{gauge, asset, total_lp, total_amplp, lp_per_amplp}`. `staking.<bucket>.
  balances[]`, `lst_hubs.<sym>.ratio`. `not_sampled` lists pairs whose first
  TLA flow event is after the boundary (their state values nothing; not queried).
- `index.json` — epoch coverage (per-epoch tallies) + the **pair registry**
  (`key → pair, name, dex, bucket, pair_via, first/last event`) — the LP→pair
  map every consumer reuses.
- `cursor.json` (resume) · `heartbeat.json` (`status ok|partial`).

## 4. Archive discipline (binding, implemented in `lib.js`)

Serial requests, 150 ms spacing (≈70 reads per epoch, ≈2 h for the whole span);
chain answers (incl. the node's HTTP-500-wrapped wasm errors) are never retried;
transient failures 4 attempts with growing backoff; breaker on 5 consecutive
transport failures; endpoint masked in every log line and artifact; heights
resolved from the committed corpus, never by searching the node; the public LCD
is touched only for a cw20 LP's immutable `minter`. Checkpoint commits every 8
epochs; clean stop at the time budget — re-dispatch resumes. Shares the
`archive-node` concurrency group.

## 5. Files

`.github/scripts/dex-state-history/lib.js` (the one implementation) ·
`sample.js` (duty) · `probe.js` (read-only fixture run, now a wrapper over lib) ·
`.github/workflows/dex-state-history.yml` (dispatch + Mondays 02:50 for the new
boundary) · `dex-state-history-probe.yml`.

## 6. Gates (mock archive returning the real node's shapes incl. HTTP-500 wasm errors)

Full span 97→200 sampled (104 files, ≈71 reads/epoch); born-later law asserted at
4 epochs (queried ⇔ first event ≤ boundary); second run 0 archive requests
(write-once); budget stop at epoch 107 → re-dispatch resumed to 200; a dropped
connection on one pair → epoch `complete:false`, exit 2, cursor `incomplete
[150]`, heartbeat `partial`, resampled to complete next run; checkpoint commits
land on a bare remote; probe output unchanged through lib; no endpoint in any
log or artifact.

## 7. VERIFY on the first live run

1. `index.json` epoch_span `[97, 200]`, `epochs_incomplete: []`.
2. Epoch 100: `absent` count == number of pairs with first event ≤ boundary that
   did not exist yet (probe said 22 of 67 asked; the duty asks fewer because
   born-later pairs are skipped — expect absent ≈ 0–3, all with a pre-boundary
   event on a pool that migrated contracts).
3. Spot-check one pair at epoch 150 against the probe artifact (same height →
   byte-equal reserves/total_share).
4. `compounder.rates` count rises monotonically across epochs; `lp_per_amplp`
   ≥ 1 and non-decreasing per asset (compounding only grows it — a DROP is an
   anomaly worth a look).
5. Hub ratios vs `price-history/ratios/<yyyy>/<mm>.json` at the boundary date:
   agree to the 4th decimal (chain_exact both sides).

## 8. Next (consumer)

build-pnl v3: value curve per wallet × epoch (units × reserves/total_share ×
price-history), amplified rate curve (compounder rates + per-event bond ratios),
FIFO round trips, attribution — SPEC-portfolio-roundtrip-pnl §4.

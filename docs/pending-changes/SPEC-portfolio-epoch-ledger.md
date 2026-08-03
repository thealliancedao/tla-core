# SPEC — portfolio-epoch-ledger (per-member epoch-by-epoch history to genesis)

Status: **BUILT & GATED 2026-08-03 — deploy pending commit** (builder gate
22/22 on the real repo data incl. epoch-level hand-reconciliation; page
deep-history mode gate inside the portfolio suite 97/97) ·
Owner: capture layer (GitHub Action derive) + site (trend paging surface)

**As built (v1):** extends `build-pnl.js` (v2) — same event pass, second
output `tla-flows/pnl/ledger/` (index + per-wallet epoch files, 754 files /
9.4MB, epochs 96→197). Per epoch: flow counts, segregated LP-unit deltas
per pool per unit (amplp vs shares never mixed — 519 wallets carry
cross-unit flags, recorded not clamped), and the SAME Tier-M USD legs the
rollup carries (identical valuation calls — Σ epoch legs == rollup wallet
totals asserted exactly). Rollup output byte-identical old-vs-new (minus
builtAt). Value curve absent by design until the archive state sampler
(§ below unchanged). No workflow change: the existing tla-flows-pnl Action
already commits all of `tla-flows/pnl/`.
Home: `tla-core/docs/pending-changes/`

## 1. Goal (in Camron's words)

"Build profiles for each member we track, go back to the first epoch in TLA;
at the start of every epoch take all the inflows and outflows to figure out
how much is in that wallet, find the value and amounts broken down, then
repeat every week until today — a deep history you can visualize on a trend."

Concretely: for every tracked wallet, an **epoch-indexed series** of
positions (LP units per pool, locks) and their valuation, from TLA genesis
(epoch 96, 2024-08) to now — feeding the portfolio trend chart's page-back
buttons all the way to each wallet's first deposit.

## 2. Why this is now POSSIBLE (verified 2026-08-03)

- `tla-flows/events` covers **2024-08 → now including the former 18-month
  hole** (deep-walk landed: 2025 months carry 9–20MB of real events; fixture
  wallet has 97 events in 5 sampled 2025 months alone). Cumulative
  deposit − withdraw per wallet per pool is computable at every epoch
  boundary.
- `price-history` — daily USD to genesis for the major tokens (CAPA/SOLID
  CoinGecko hole known; tier rules below).
- Pool state for LP-unit → underlying decomposition: dex-data daily
  (forward), epoch capture files, and the registry-backfill pair streams
  (37 Astroport + 27 SkeletonSwap) for the hole era.

## 3. Method (pnl-doctrine tiers, nothing silent)

Per wallet × epoch: fold flow events to cumulative LP units per pool
(prior-verbatim; claims don't change units). Decompose units → tokens via
the nearest captured pool state for that epoch (source + distance stated).
Value tokens at price-history for the epoch-boundary date. Tiers exactly as
SPEC-portfolio-pnl D3: **M** measured · **D** derived-with-stated-method
(unit decomposition via captured reserves) · **blank** where a pool state or
price doesn't exist for that era — rendered as a gap band, never bridged.

## 4. Storage & surface

`tla-flows/ledger/` — `index.json` + per-wallet or sharded epoch series
(decide on size; 555 wallets × ~100 epochs × per-pool rows). Surface: the
portfolio trend card's ◀ earlier paging (already built, P1.1) simply keeps
paging past 2026-06-13 into ledger data, with the source switching stated
on-chart; P3 activity timeline reads the same product.

## 5. Sequencing & acceptance

Build AFTER the pnl rollup rebuild confirms the hole-era events are sound
(same inputs). GitHub Action one-off per the repo placement map:
`tla-core/.github/scripts/tla-flows/build-ledger.js` + workflow. Gate:
fixture wallet epoch series hand-reconciled at 3 epochs (one FCD-era, one
hole-era, one walker-era) against raw events + a chainscope paste; two runs
byte-identical; every blank tier counted and reconciled to totals.
Plan + approval before code (one-contract-one-owner).

# Agent Data Map — question → product → recipe
_Read by the TLA Help agent (corpus) and by humans. When a question type below
matches, follow the recipe — do not answer from general knowledge alone, and do
not say "no historical data" until the mapped product has been read._

## Per-pool history questions ("why did X's APR/TVL/votes change?")
Recipe (the xASTRO case, 2026-08-19, is the worked example):
1. `read_product` path `member-data/tla-snapshot/apr-history.json` with `key:"<pool>"`
   → that pool's `apr_pct_avg` per epoch (16 epochs).
2. Same with `member-data/tla-snapshot/pool-status-history.json` → `staked_usd`,
   `vp_human`, `bucket_pct` per epoch.
3. Decompose: APR ≈ rewards ÷ staked. If staked ROSE while APR fell, the drop is
   capital inflow (often healthy). If `vp_human`/`bucket_pct` fell, allocation
   declined. Say which — with the numbers.
   Worked example (pool-status `staked_usd`, last capture per epoch): xASTRO
   E192→E199: staked $8.4K→$16.5K (+97%), VP 0.75M→0.70M (−6%), LUNA
   $0.0496→$0.0460 (−7%) → APR 82%→28%. Mostly denominator growth, with
   allocation drift and LUNA price each shaving the USD reward. (The $7.3K
   figure is E191, not E192 — corrected 2026-08-21.)
   Always name the field: apr-history `staked_usd_avg` (epoch mean) vs
   pool-status `staked_usd` (last capture) differ by up to ~15% in thin pools.
4. Basis caveat: our `apr_pct_avg` is the platform basis; Eris UI uses another
   convention. Levels differ, trend shapes agree — say so when the asker quotes
   an Eris number.

## Wrong-object guard
Single-asset sinks (xASTRO, ampCAPA, ampROAR-ROAR) ≠ their trading pairs
(LUNA-ASTRO etc.). Pair TVL/fees say nothing about the sink. Match on the exact
pool `name` via `key`.

## TLA-wide per-epoch ("how has TVL / pool count moved?")
`member-data/tla-snapshot/epoch-band-history.json` — active_pools (Astro+SS),
tla_tvl_usd, luna_price_usd per epoch, E184→now. Semantics match the site band.

## NFT staked/held counts over time
`nfts/adao/snapshots/state-history/{yyyy}/{mm}.json` — daily
daodao_staked_count, enterprise_staked_count, treasury_held_count to 2025-01
(derived era is source-labeled `derived:transfers-replay`; every count traces to
transactions).

## Rewards / distributions per epoch
`tla-voting/distributions/history.json` (NOT under events/) — gauge payouts per
period. `entries` runs from period 96 (oldest) to the CURRENT settled period;
"latest" = max(period) over entries, never a positional read (T10 miss,
2026-08-21: the agent reported period 97 as latest).

## Prices
Live: `network-and-prices/daily/<date>.json` (15-day retention;
`luna_market.usd_price`). Deeper daily LUNA: tla-snapshot dailies
`totals.rewards.luna_price_used` since 2026-05-13. Token spot incl. SOLID:
`token-catalog/snapshots/current.json` (tokens keyed by denom; venue prices
carry `.usd`).

## CAPA custody ("where does CAPA sit?", "who are the CAPA whales?")
`token-catalog/supply/capa/current.json` — the collection map: level 1
(`capa.liquid_derived` / `gov_staked_direct` / `in_hub` / `in_lp.astro|ss`)
sums to `capa.total_supply`; level 2 (`ampcapa.liquid` / `tla_nonamp` /
`tla_amp_via_compounder`) sums to `ampcapa.total_supply`. Trust `status` +
`guard_failures` before quoting; the hub STAKES its CAPA in Solid gov, so
`gov_contract_balance` CONTAINS `gov_hub_portion` — never add them.
`token-catalog/supply/capa/wallets.json` — per-address rows (`rows[]`, each
with `capa_equiv.<form>` across 13 forms + `raw` units + `total_capa_equiv`),
published ≥ `floor_capa_equiv` (10,000); the excluded remainder is summed in
`tail_below_floor` so rows + tail + `role:"bucket"` rows reconcile to the
buckets (`sum_guards`, 13 of them, each vs the owning contract's own total).
`kind:"contract"` is chain-structural (32-byte address); `role:"bucket"` marks
ONLY the structural contracts (gov, hub, pair, compounder, DAO module,
Incentives) whose holdings ARE the other rows — a DAODAO core such as the
aDAO treasury is `kind:"contract", role:null` and is a holder. A `null` form
= that enumeration did not complete this run (`columns_unknown`), never 0.
`unattributed.*` names what no per-wallet read can attribute (LP staked
directly on Astroport, gov balance beyond shares, unbonding not swept).
History: `token-catalog/supply/capa/index.json` rows (one per UTC day) +
`daily/<date>.json`. Per-wallet history ("how has X's DAO position moved?"):
`supply/capa/wallets-daily/<date>.json` `rows[addr] = [total_capa_equiv,
receipt_dao_capa]` (pick days from `wallets-daily/index.json`; `src:
legacy_fold` days are weekly-resolution folds of the retired ampcapa-data_2026
feed with total null; index rows with `status: legacy_fold` carry only
hub_rate + receipt_in_dao — say so when quoting them).

## FUEL custody ("where is FUEL?", "who stakes in Boost DAO?")
FUEL is a NEUTRON token (`factory/neutron1zl2…uruxm/fuel`); Terra holds the
IBC voucher `ibc/4B44…3961`. `token-catalog/supply/fuel/current.json`:
`neutron.native_supply` = `boost_staked` + `boost_unbonding` + `boost_treasury`
+ `bridged_to_terra` (the ICS-20 escrow) + `liquid_derived`; `terra.ibc_supply`
== Σ Terra holders and ≈ the escrow (cross-chain guard). Boost DAO core
`neutron1ej43fv…vvzm43`, voting module `neutron19740eh…sdpy2`. Per-wallet:
`supply/fuel/wallets.json` rows carry `chain` (neutron|terra) and
`fuel.{liquid, boost_staked, boost_unbonding}`; `role:"bucket"` = treasury,
voting module, escrow, DEX pairs, TLA incentive manager (not holders). Read
`status` + `sum_guards` (5) first; null = unknown this run.

## Votion
`votion/snapshots/current.json` + `votion/history/`. Rankings only with shown
arithmetic (rule 11) — vault sizes vs aDAO's VP are different magnitudes;
compute, never assume.

## When the map has no route
Say plainly what was checked and what does not exist yet (e.g. per-pool APR
before E184, member-count history). Never substitute an adjacent object.

## Pricing-artifact cautions (F3, AUDIT-price-artifact-2026-08)
- If an LST-pair implied price ratio reads ≈1.0 (e.g. bLUNA ≈ LUNA) or a
  token's price sits far off its neighboring days, SUSPECT A PRICING
  ARTIFACT: say so plainly and point to the audit — do not narrate the
  broken number as fact.
- `price_source` values beginning `f2_repair:` mark corrected historical
  entries; the original value and evidence live in that file's
  `_price_corrections` block. Quote the corrected value; cite the block if
  asked what changed.
- Repetition is NOT a taint signal: legitimate prices repeat (stLUNA to 9
  decimals; EURE served flat at 1.14; ATOM revisits cents). Taint is
  identified by SOURCE MECHANICS (pool-derivation from non-xyk pools) and
  value-band violations only.
- FUEL/dATOM/WHALE history: repaired in F2b (2026-08-21). FUEL is priced from
  its astroport daily-csv series; WHALE and dATOM are null in history (WHALE
  abandoned; dATOM's CG history failed the gate — Drop Protocol is winding
  down and dATOM trades decoupled from ATOM). Forward: dATOM prices from the
  Astroport Neutron market; WHALE stays null. A pool with one unpriced side
  has null total/staked/APR (F1.2) — honest blank, not half a pool.

## Arb radar / unlisted pools
Pools with no `dex` and no catalog name that appear in divergence output are
migration corpses (drained pair contracts still in the gauge set, e.g. the
old ampROAR-ROAR Astroport pair). Not tradeable; a spread against one is an
artifact. "best ~$X → ~$Y net" = trade size → net profit.

---

## Coverage & gap register — NFT market data (2026-08-23)

Written down so limits live in a document, not in memory. Every entry is either
guarded by an automated invariant or queued with its closing mechanism.

**Guarded by the unresolved-exit sentinel** (market-history ≥1.1.0, warm/full,
window `SENTINEL_WINDOW_DAYS`=60): every NFT that leaves a registry marketplace
did so as a sale or a delist — no third thing. Any v1 exit record with no v2
sale/cancel record for the same tx raises a heartbeat warning
(`stats.unresolved_exits` + tx list in market-history-heartbeat.json) and a loud
log line. This is the invariant that would have caught the 2026-08-21 Atrium
sale of #6192 the same day instead of by owner luck two days later.

**Known seams (open, queued):**
- **FCD→walker seam, 2025-01-07 → 2025-01-09 (~2 days).** The frozen FCD
  archive ends ~Jan 7 2025; forward transfers begin 2025-01-09T10:40:30Z
  (height 13,769,850). Transfer-level custody history only — sales were
  captured independently by the old pipeline through 2026-06. Closable via the
  frozen-but-queryable FCD (paginate the NFT contract past the archive tail).
  Archive-window queue.
- **Unattributed custody tokens 6847 / 7123.** In DAODAO custody, chain claims
  exist, unstaker not among 488 known addresses — original unstake txs predate
  the tracker seed. Archive-window queue.

**Known limits by construction (documented, not bugs):**
- **OTC / P2P sales are invisible as sales.** classifyNftTx v2 rides registry
  marketplaces only; a payment + transfer_nft between two wallets in one tx
  records as a plain transfer. Any heuristic here is a rule that can break —
  if ever addressed, it flags `possible_p2p_sale` for human review and never
  auto-enriches.
- **Vocabulary lock status:** BBL settle/create/cancel — fixture-locked (FCD
  suite, 11,582 txs). Atrium buy_nft — fixture-locked (real sale 995038E5…,
  gate G6); Atrium cancel/list — generic path, `auction_id` may be absent on
  cancels (listing-history falls back to token match). Boost — generic
  money-movement path only, never exercised on a real Boost sale; first real
  fixture locks it. Anything unresolvable → `resolution:'ambiguous'`, loudly
  warned, never guessed.
- **Pre-org enriched rows (1,221) carry `marketplace: null`** — old-pipeline
  provenance predating venue labeling. Values chain-derived and trusted;
  venue attribution for them is an archive re-derive, not a correction.
- **`spot_luna_usd` / `value_today_usd` on enriched** are frozen at the last
  full rebuild (June 2026): recomputing mutates committed rows, which the
  prior-verbatim law forbids. The live-mark path is a P&L-feature design
  decision, tracked in CHANGES_PENDING.


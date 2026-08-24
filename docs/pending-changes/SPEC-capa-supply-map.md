# SPEC — CAPA supply map (every form CAPA can be held in)
Status: DRAFT v2 2026-08-24 · owner-approved direction (keep the ampCAPA tool, org-source it)
Gate: probe v2 run 2026-08-24T04:03Z (artifact 9506487143) — shapes confirmed, fixture values below.

## Why
The ampCAPA Dashboard (tools → ampcapa-tool.html) is the only place that shows
how CAPA supply is split across custody forms. Its feed (`defipatriot/ampcapa-data_2026`,
cron dead since 2026-08-10) captured four forms. The owner listed nine. This spec
defines the product that captures all nine in the org, with a guard that the
buckets sum to supply — the NFT classification-sum pattern applied to a token.

## Home (no new cron)
Duty inside **org-token-catalog** (the module that already owns pools, denoms and
the ve3 asset registry). Product path: `token-catalog/supply/capa/current.json`
(+ `daily/<date>.json`, `index.json` row series). New path because no org file
holds a supply map today; everything that must move with a new product:
- `docs/agent/DATA-MAP.md` — add the product + field semantics
- `system-health` registry (+ the 33/33 mock gate → 34) and site `lib/cron-registry.js`
- help-agent DATA-MAP/`read_product` allow-list (server.js)
- `docs/REPO-CATALOG.md` writer→readers table
- `docs/changelogs/cron-token-catalog-log.md` entry at delivery
- `docs/ecosystem-knowledge/solid-protocol.facts.json` — add `capa.supply.forms` fact

## Buckets (two levels)
Level 1 — CAPA (cw20 `terra1t4p3u…rfdhar`, decimals 6):
| id | form | read |
|---|---|---|
| `capa.liquid` | CAPA in wallets | cw20 `all_accounts` page walk (+ `balance`) |
| `capa.gov_staked` | CAPA staked in Solid governance `terra1sf66…e0cnm` | per wallet `staker{address}` → use `balance` (share × rate incl. accrued); total = `state{}.total_share` × (balance/share) — ~175.5M CAPA, the largest bucket |
| `capa.in_hub` | CAPA bonded into the ampCAPA hub `terra186rp…rlx7y` | hub `state{}` total CAPA; parent of Level 2 |
| `capa.in_lp.astro.nonamp` | CAPA-LUNA LP (Astroport) staked plain in TLA project bucket | ve3 asset-staking `terra1awq6…3lpa` shares × CAPA-per-LP |
| `capa.in_lp.astro.amp` | same LP amplified | receipt denom `…/42/project/amplp` supply × amplp→LP rate × CAPA-per-LP |
| `capa.in_lp.ss.nonamp` / `.amp` | SkeletonSwap CAPA-LUNA LP (`…/uLP`), plain / amplified (`…/43/project/amplp`) | same pattern, SS pool reserves |
| `capa.in_lp.liquid` | LP tokens held, not staked | LP `balance` / bank by_denom |

Level 2 — ampCAPA (`factory/…/ampCAPA`), must sum to `capa.in_hub` via the hub rate:
| id | form | read |
|---|---|---|
| `ampcapa.liquid` | ampCAPA in wallets | bank `denom_owners` |
| `ampcapa.tla.nonamp` | ampCAPA in TLA single bucket, plain | ve3 asset-staking `terra1qdz5…e23k` shares |
| `ampcapa.tla.amp.held` | amplified receipt `…/44/single/amplp` held in wallet | bank by_denom / denom_owners |
| `ampcapa.tla.amp.dao` | that receipt staked in the ampCAPA DAO voting module `terra1juj3…dr0mt` | `voting_power_at_height{address}` (`staked_balance*` unsupported → 500); total `total_power_at_height{}` (15.49M receipts) |
| `ampcapa.tla.amp.dao_unbonding` | receipt in the DAO's unstake queue | `claims{address}` — probe: owner 357,206 releasing 2026-08-25; without this the Level-2 sum does not close |

## Reads confirmed by probe v2
- TLA staking per wallet: `all_staked_balances{address}` on each bucket contract (cw20 asset = non-amp LP; compounder factory denom = amplified) — identical to org capture-engine.js:520. `amount` = redeemable LP after take; `shares` = share units.
- SkeletonSwap CAPA-LUNA pool `pool{}`: CAPA reserve 162,829; LP supply 27,035.8.
- Astroport CAPA-LUNA: CAPA reserve 23,590,137; LP supply ~3,968,000 → 5.945 CAPA/LP at probe time.
- Hub `state{}`: 142,142,977 ampCAPA × 1.10554 = 157,144,426 CAPA in hub. Compounder receipts: ampCAPA 22,345,491 · astroLP 109,373 · ssLP 1,148.

## RECONCILIATION REQUIRED before the map trusts LP underlying (gate #0 item)
Treasury non-amp CAPA-LUNA: probe and `member-data/positions` agree on raw LP 18,411.23 / shares 21,923.49, but positions publishes 119,157 CAPA underlying vs reserve÷supply 109,462 (8.9% apart, one hour apart). Find which CAPA-per-LP derivation is right (cw20 `token_info.total_supply` vs pair `pool{}.total_share`; `amount` vs `shares`) and fix the loser. Until then the map publishes LP buckets as `status:"unreconciled"`.

## Guards (publish-blocking)
- `sum(level1) == capa.total_supply` within 0.01% → else `status: "partial"` and the
  unexplained remainder published as `capa.unattributed` (never silently dropped).
- `sum(level2) × hub_rate == capa.in_hub` within 0.01% → same treatment.
- Any bucket whose query failed is `null`, not 0; product `status` reflects it.
- Rates from live contracts at capture (hub `state`, compounder
  `amplp_exchange_rates`), never constants.

## Per-wallet rows
Same buckets per address for the wallets the page needs (DAO members from the
ampCAPA DAO + Solid gov stakers + top holders), so the tool's tables read one file.

## Fold of the legacy feed
`ampcapa-data_2026` weekly epochs 181–197 (members: ampLP/ampCAPA/CAPA/vpPct;
rates) → `index.json` rows as deeper history after a converter; rates also →
`price-history/ratios/2026` if absent. Legacy cron retires per parallel-run law.

## Fixture (probe v2 values, 2026-08-24T04:03Z)
Owner: gov `balance` 1,141,021.59 / `share` 1,140,715.28; DAO power 3,214,853.997 + claim 357,205.9996; everything else 0.
Treasury: liquid CAPA 5,387.458905; ampCAPA liquid 0; receipt held ampCAPA 198,310.643 (dao-dashboard's "ampCAPA 405,805" is this × ~2.046 — relabel there); receipt astroLP 3,821.188; non-amp CAPA-LUNA LP 18,411.23; gov 0; DAO 0.
Owner wallet holds gov-staked CAPA + receipt-in-DAO; treasury holds liquid CAPA,
liquid ampCAPA, both LP forms, and amplified single. Non-amp single has no known
holder (pool-level total proves the read). Probe output = the gate values.

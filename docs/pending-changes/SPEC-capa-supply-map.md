# SPEC — CAPA supply map (every form CAPA can be held in)
Status: DRAFT 2026-08-24 · owner-approved direction (keep the ampCAPA tool, org-source it)
Gate before code: `.github/workflows/capa-supply-probe.yml` run log + artifact.

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
| `capa.gov_staked` | CAPA staked in Solid governance `terra1sf66…e0cnm` | shape learned by probe (`staker`/`staked_balance`/…) |
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
| `ampcapa.tla.amp.dao` | that receipt staked in the ampCAPA DAO voting module `terra1juj3…dr0mt` | `voting_power_at_height` (shape confirmed by probe) |

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

## Fixture
Owner wallet holds gov-staked CAPA + receipt-in-DAO; treasury holds liquid CAPA,
liquid ampCAPA, both LP forms, and amplified single. Non-amp single has no known
holder (pool-level total proves the read). Probe output = the gate values.

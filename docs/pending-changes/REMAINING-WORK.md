# REMAINING WORK — after the dao-dashboard fold (2026-08-12)

## DELETE NOW — zero references, zero producers
`defipatriot/tla-snapshot-data_2026` — the dao-dashboard fold was its last
producer AND its last reader. Verified: 0 references site-wide.

## The complete remaining legacy surface (4 categories)

### A. LINK TEXT ONLY — cosmetic, no data flows through them
| File | Ref |
|---|---|
| index.html:2891 | `aDAO-Image-Files` href |
| dao.html:684 | `adao_json_storage` "Data from" credit — now inaccurate, point at dao-originations |
| tla-stats.html:2389 | href to `tla_json_storage/tla_metadata.json` |
| fuel-tool.html:402 | href to `defipatriot/tla-core/tree/main/fuel` (repo already deleted) |

### B. DEAD FALLBACKS — already fail gracefully
| File | Ref |
|---|---|
| index.html:10097 | `tla-data-epoch-N-end.json` walk-back |
| index.html:10150 | `tla-ext-epoch-N-end.json` walk-back |
| dao_treasury.html:551 / dao_tla_deposits.html:385 | `tla_json_storage` epoch bases |
| release-history.html:738 | GitHub API listing of `tla_json_storage` |

dao-dashboard is the PRIMARY path in every one of these; the legacy walk-back
only runs if it is stale, and each returns null cleanly. Safe to delete the
repos — optionally strip the readers later.

### C. ALREADY BROKEN — decide: rebuild or retire
| Page | Why |
|---|---|
| fuel-tool.html | Reads `defipatriot/tla-core/main/fuel/snapshots` — **that path 404s today** (personal tla-core is gone) and there is no org fuel tree. The page is already broken. |
| ampcapa-tool.html | Reads `ampcapa-data_2026/snapshots`; that cron is dead. |

Both are single-purpose tools. Retiring costs nothing; rebuilding means a new
org cron each. Recommend retiring unless actively used.

### D. REAL ADAPTER STILL NEEDED — 2 pages
`tla-catalog.html` + `tla-chain-queries.html` read
`tla-chain-registry/2026/current.json`.

**This is not a rename — it is a different domain.** The pages consume
`tokens`, `wallets_catalog`, `contracts_catalog`, `amplp_mappings`,
`source_coverage`, `scope`, `capturedAt` — a TOKEN / CONTRACT / LP catalog.
Org `catalog/snapshots/current.json` is an ADDRESS / MEMBER registry
(`addresses` 504, `by_address` 389, `slugs`, `counts`). The org equivalent of
the token half is `token-catalog/snapshots/current.json` (tokens keyed by
address) plus `docs/curated/*`; `amplp_mappings` (65 entries) has no obvious
org home yet.

WARNING: the legacy registry is STILL FRESH (24h old) — something is still
writing it. Find that producer before deleting `tla-chain-registry`, then
either fold it or build the adapter from token-catalog + curated.

## DONE THIS SESSION
`system-health.html` now reads the org invariants model. Adapter maps
`{invariants, meta}` onto the page's `{overall, counts, attention, systems}`
contract with no rendering changes: violation→down, skipped→info (a skipped
check is not a failure), confidence = ok / (ok + violations), skipped excluded.
Verified against live org data: 7 systems, 67% confidence, both known
violations surfaced in the attention strip.

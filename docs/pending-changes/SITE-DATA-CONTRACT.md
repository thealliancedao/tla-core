# SITE-DATA-CONTRACT — what the site needs, where it comes from, what happens to each producer

Built 2026-08-11 by extracting EVERY `raw.githubusercontent` source from all
26 site files and inverting it to producer→pages. This is the contract: the
strip is finished when every row below is org-side or deleted. Work is driven
by THIS, not by the cron fleet.

**Decision rule per producer (in order):**
1. Does org already have it? → **REPOINT** the page. No port.
2. Does no page need it? → **DELETE** the producer. No port.
3. Needed, not in org → read the legacy method. **Can we do it better?**
   → yes: build it right in org. → no: copy verbatim into an org job.
   Either way the legacy job dies immediately after.

## Producer → pages → verdict

| Producer (legacy) | Pages | What it serves | Org has it? | VERDICT |
|---|---|---|---|---|
| **adao_json_storage** | dao, dao_governance_tool, dao_tla_deposits, dao_treasury, index, nft-explorer | adao_props.json, alliancedao_registry.json, liondao_proposals.json, lion_dao_members.csv | ❌ | AUDIT — hand-maintained JSON, likely belongs in `dao-originations` tenant repo (governance) + `docs/curated` |
| **adao-positions-data_2026** | index, **lib/adao-live-data.js**, member-portfolio, slippage, test, tla-stats | data/current.json, members.json, daily/, weekly/, heartbeat | ❌ (org member-data = VP layer only) | 🔴 **FROZEN 2026-08-09 + job FAILING — live site serving stale.** Fix or replace FIRST |
| **nft-inventory-data_2026** | ally, index, **lib/adao-live-data.js**, nft-explorer-app.js, tla-stats | data/nfts.json, data/v2/* (bluna-usd-daily, broken-at, daily/) | ⚠️ org `nfts/adao/*` EXISTS but paths differ (probed filenames 404) | MAP org tree → repoint if shape matches; else port the gaps |
| **tla-participants-data_2026** | member-portfolio, slippage, test, tla-stats | data/current.json, heartbeat | ❌ | 🔴 **FROZEN 2026-08-09 + FAILING** — same urgency as positions |
| **tla-snapshot-data_2026 (dao-dashboard half)** | dao_tla_deposits, dao_treasury, index | dao-dashboard.json, daily/dao-dashboard-* | ❌ | PORT (4c) — treasury/deposits/rewards/rebase/Lion-scan; method-audit first |
| **tla_json_storage** | index, nft-explorer, tla-stats | epoch_1-300_date.json, tla_known_tokens.json, tla_docs.json, tla-data-epoch-* | ✅ `docs/epoch_1-300_date.json`, `token-catalog/`, `docs/tla-docs-content.json` | **REPOINT** (mostly) — verify tla-data-epoch-* has an org equivalent |
| **adao-allies-data_2026** | member-portfolio, test, tla-stats | data/current.json, heartbeat | ❌ | ALIVE (writing 08-11). Audit method → port or rebuild |
| **tla-chain-registry** | tla-catalog, tla-catalog-edit, tla-chain-queries | 2026/current.json, curated/ | ✅ `catalog/snapshots/current.json` + `docs/curated/` | **REPOINT** |
| **backing-data_2026** | ally, index | snapshots/daily, snapshots/index.json | ❌ | AUDIT — is the backing chart still wanted? |
| **bribes-data_2026** | index, tla-stats | data/current-state.json, heartbeat | ✅ `tla-voting/bribe-state/<yyyy>/<mm>.json` (verified 200) | **REPOINT** (shape adapter needed — month file is a harvest list) |
| **marketplace-data_2026** | index, tla-stats | data/heartbeat.json | ❌ | AUDIT — heartbeat only; may be a health tile with no real consumer |
| **tla-ext_json_storage** | index, tla-stats | tla_ext_historical_2025/2026.json, tla_pd_bribes, Staking, tla-ext-epoch-* | ⚠️ partial: `tla-voting/pd-bribes/current.json` replaces pd_bribes; `docs/staking-apr.csv` | **REPOINT** the covered parts; audit the historical files |
| **votion-data_2026** | index, tla-stats | votion/votion-epoch-*, heartbeat | ✅ `votion/snapshots/current.json` (200) | **REPOINT** — verify epoch files exist org-side |
| **system-health-data_2026** | system-health | data/system-health.json | ✅ `system-health/current.json` | **REPOINT** |
| **ampcapa-data_2026** | ampcapa-tool | snapshots/ | ❌ | AUDIT — single-page tool; port or retire the tool |
| **fuel-data_2026** | tla-stats | snapshots/index.json | ⚠️ `defipatriot/tla-core/fuel/snapshots` used by fuel-tool (note: PERSONAL tla-core, not org) | CONSOLIDATE both fuel sources into org |
| **defipatriot/tla-core** | fuel-tool | fuel/snapshots | ❌ personal repo shadowing the org name | MOVE to org tla-core |
| **defipatriot/aDAO-links-site** | tla-docs | tla_docs_content.json | ✅ file exists in the ORG site repo | **REPOINT** (self-reference to the dead personal site repo) |

## ⚠ CORRECTION 2026-08-11 (shape-checked, not assumed)
Three of the six "repoint-only" claims above were WRONG — the org product
exists but its SCHEMA DIFFERS, so a blind repoint would have fed pages a
shape they can't parse (exactly the contradicting-data failure we're
avoiding). Verified by fetching both sides:
- **tla-chain-registry `2026/current.json`** → org `catalog/snapshots/current.json`
  is a different schema (`addresses/by_address/slugs/counts` vs
  `amplp_mappings/buckets/categories/contracts`). **ADAPTER NEEDED.**
- **system-health-data** → org `system-health/current.json` is
  `{invariants, meta}`; the page expects
  `{attention, counts, endpoints, overall, confidence_pct…}`. **ADAPTER NEEDED**
  (or the page moves to the invariants model).
- **votion-data epoch files** → NO org equivalent (`votion/epochs/*`,
  `votion/snapshots/epochs/*` all 404). Org votion has `snapshots/current.json`
  only. **PORT/EMIT NEEDED** for the per-epoch series.
- **bribes-data `current-state.json`** → org `tla-voting/bribe-state/<yy>/<mm>.json`
  is a harvest LIST, not a current-state object. **ADAPTER NEEDED** (the same
  adapter already written inside the tla-snapshot fold — reuse it).

**SHIPPED 2026-08-11 (verified drop-in, live-fetched 200 each):**
- `docs/curated/*` ← tla-chain-registry/curated (org copies are a SUPERSET:
  token_overrides 15.5K vs 10K, wallets 8K vs 2.2K) — tla-catalog.html,
  tla-catalog-edit.html (incl. the GitHub edit target, so future curation
  commits land in the org repo)
- `docs/epoch_1-300_date.json` ← tla_json_storage (byte-identical JSON,
  300 entries, same keys) — index.html, nft-explorer-app.js, tla-stats.html
- `tla_docs_content.json` ← org site repo (self-reference to the dead
  personal site repo) — tla-docs.html
Revs: tla-stats T3.7, index 3.73.

**METHOD RULE ADDED:** never repoint on the basis of "org has this domain".
Fetch both sides and compare shapes first; a matching domain with a different
schema is a PORT/ADAPTER, not a repoint.

## SWEEP 2 — 2026-08-11: curated governance migrated to the tenant repo
**Principle applied (Camron):** legacy MACHINE data is method-tainted and not
worth auditing — discard and re-derive from org crons. What must be preserved
is the CURATED knowledge: vetted addresses, trusted proposals/messages,
queries. `adao_json_storage` is exactly that, and it fed 6 pages.

Migrated verbatim into `thealliancedao/dao-originations` per its own README
layout (`<dao>/governance/`), populating the previously-empty tenant repo:
- **aDAO**: registry.json (44 vetted contracts + validActions + lpPools),
  proposals.json (37), members.csv (157)
- **Lion-DAO**: registry.json (49), proposals.json (17), members.csv (345)
- **Pixel-Lions**: proposals.json (10), members.csv (291)
Each folder carries a README declaring provenance + known staleness.

**Two defects fixed on migration:**
1. `dao_governance_tool.html` fetched `liondao_props.json` and
   `pixelions_props.json` — **both 404** (real files were `*_proposals.json`).
   The Lion-DAO and Pixel-Lions tabs have been silently broken; now repointed
   to real files.
2. Lion-DAO + Pixel-Lions proposals were **double-encoded JSON** (a string
   containing JSON). Normalized on migration; content verified identical.

**Known staleness (queued, not hidden):** aDAO proposals.json was exported
2026-05-22 — the vetted STRUCTURE is preserved, but the live corpus should be
re-derived from chain into the same shape.

Remaining `adao_json_storage` readers (index, dao, nft-explorer-app,
dao_treasury, dao_tla_deposits) fetch other files from that repo — next sweep.

## Immediate reads of this table
- **6 producers are REPOINT-ONLY** (tla-chain-registry, bribes-data, votion-data,
  system-health-data, tla_json_storage, aDAO-links-site self-ref) — no porting,
  just URL changes. That is the fastest, safest progress available and it
  removes 6 repos from the site's surface.
- **2 producers are actively FROZEN while live pages read them** (adao-positions,
  tla-participants) — the only true emergency on the board.
- **NFT is the biggest unmapped surface**: nft-inventory-data_2026 feeds 5 files
  including the explorer; org `nfts/adao/` exists but its real paths must be
  enumerated before anything is decided.
- Only ~4 producers look like genuine PORTS (dao-dashboard, adao-positions
  replacement, allies, ampcapa/backing if the pages survive).

## Cadence + summary layer (the architecture answer)
The site is static (Vercel, no backend) — pages can only fetch files, so
summaries must exist. The problem was never summaries; it was that EVERY
legacy cron invented its own summary in its own repo with its own schema, so
the same number is computed several ways and they disagree. Target:
- org crons write **current.json** (15-min cadence where it matters)
- one **rollup** per domain writes day/week/month series in ONE schema
- pages read current.json for "now" and the rollup for charts — nothing else

## Still-planned features (from pending-changes specs) that this must serve
SPEC-landing-pulse (recent-changes tile + 30-point chart), SPEC-portfolio-pnl
(rebase two-leg law), SPEC-lp-apr, SPEC-tla-voting-briber-board,
SPEC-pd-directive-watch, SPEC-adao-docs. Each needs a row in the rollup
schema BEFORE it is built, so we stop inventing per-feature summary files.

## Order of work (proposed)
1. **Emergency**: adao-positions + tla-participants (frozen, live readers).
2. **Repoint sweep**: the 6 repoint-only producers in one paste — 6 repos off
   the board, zero new code.
3. **NFT mapping**: enumerate org `nfts/adao/`, then repoint or port.
4. **Ports**: dao-dashboard (4c), allies, remaining gaps.
5. **Rollup schema**: one summary layer, retire per-cron summaries.
6. Delete every legacy repo + Render job in one sweep.

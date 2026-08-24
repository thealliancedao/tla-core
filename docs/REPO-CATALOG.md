# REPO-CATALOG — what is where, why, who writes it, who reads it
Built 2026-08-09 from ACTUAL READS (not memory); tenant repos reconciled same
day. Maintenance law: every structural change updates this file in the same
paste. Claude's visibility is FETCH-ONLY — read this + CHANGES_PENDING at
session start; list dirs, never assume.

## The five org repos (the permanent platform)
| Repo | Role |
|---|---|
| tla-core | ALL shared TLA data (live+history) + docs + one-off Actions |
| platform-crons | org Render job code (the only running code, target) — tenant-agnostic: a cron takes a tenant ID and writes to that tenant's repo |
| aDAO-links-site | site: pages, lib/, /assets (self-hosted, migrated 2026-08-09) |
| nft-collections | per-COLLECTION NFT tenant data (one folder per collection) |
| dao-originations | per-DAO governance + treasury tenant data (one folder per DAO) |

## Migration-era repos (NOT part of the five — dying/undecided)
| Repo | Status |
|---|---|
| website-adao-core (defipatriot) | chat-bootstrap (PROJECT_KNOWLEDGE) + site-runtime logs — migrate/retire decision pending |
| cron-scripts (defipatriot) | DYING: legacy fleet; strips empty it → archive |
| defipatriot data repos | deletion pile per strip combo; see CHANGES_PENDING NEXT ACTIONS |

## Tenant repos — contents AS READ 2026-08-09
**nft-collections** — layout law (README): `<collection>/{metadata, rarity,
lore, cron-outputs}`; adding a collection = add a folder, nothing else
restructures. Current: `adao/metadata/all_nfts_metadata.json` +
`adao/rarity/{adao-rarity-bbl, adao-rarity-intended}.json` (static reference,
hand/one-off written — no cron writes here yet). Placeholders named:
Pixel-Lions, TLA-Locks. NOTE: aDAO NFT CRON outputs still write
tla-core/nfts/adao (org-nft-inventory/flows) — moving them here is a future
tenant-split decision, not assumed.
**dao-originations** — layout law (README): `<dao>/{treasury, positions,
governance}`. Currently README-only. aDAO = reference tenant; Lion-DAO
placeholder. No writers yet.

## ORG RENDER CRON CATALOG (module headers + observed heartbeat cadence)
| Job (Render) | Purpose (its own header) | Writes (tla-core) | Observed cadence* |
|---|---|---|---|
| org-address-catalog | "the platform's single who-do-we-track registry" | catalog/snapshots | daily |
| org-dex-data | per-DEX snapshot orchestrator (astroport 276p, ss 34p, credia, eris-apr) + FOLDED epochs-astroport (epoch/rolling/weekly/daily-csv; kill-switch EPOCHS_ASTROPORT=0) | dex-data/* | ~15min–hourly commits; epoch products daily |
| org-member-data | "the VP layer (Option A): owns the COMPLETE voting-power picture" — FOLD ABSORBER for tla-locks/participants/vp-holders/adao-positions/allies | member-data/snapshots | daily |
| nap-org | canonical pricing + PHASE 6.5 price canary | network-and-prices/* | hourly |
| org-nft-inventory / org-nft-flows | ADAO NFT inventory + flow capture | nfts/adao/* | minutes (fast heartbeat) |
| org-system-health | monitors org products (33/33 mock-gated per SPEC-system-health) | system-health/* | ~5–10min |
| org-tla-flows | "TLA LP flow event capture… forward cron. Rev C: BLOCK-WALKER engine" (+ gap-fill action 2h) | tla-flows events/index | ~continuous |
| org-tla-voting | "2.2.0 … votes, locks, bribes, rewards — WALKER TRANSPORT" (SPEC-tla-voting-capture-fix) | tla-voting/* incl. pd-bribes derive | ~15min |
| org-token-catalog | "STAGE 1: DISCOVERY (the WORTH layer's foundation)" | token-catalog/snapshots (+price-history — VERIFY vs price-backfill action) | ~5h |
| org-votion | vault + holder capture (SPEC-votion-capture; live 1.2.0 LST hub-rate pricing) | votion/* | hourly; epoch products weekly |
*cadence = observed commit frequency 2026-08-09; VERIFY exact Render schedules before editing any job.

Mid-fleet Render: NONE LEFT (owner console 2026-08-24 — 14 org jobs only;
ampCAPA Snapshot / votion-epoch-snapshot / votion-positions already deleted;
their data superseded by capa-supply v2.1 + fold Action and org-votion).
Fleet = org-* + nap-org + tla-help-agent, nothing else.

## tla-core root data dirs (writer → readers)
archive/fcd (FROZEN gz corpus; no writer) · catalog/snapshots
(org-address-catalog) · dex-data (org-dex-data + fold; SS series legacy until
SS fold) · dex-liquidity/events (E2 pair walks) · member-data
(org-member-data) · network-and-prices (nap-org → site + all crons, cutover ✓)
· nfts/adao (org-nft-*) · price-history (token-catalog / price-backfill —
VERIFY split) · system-health (org-system-health) · tla-flows (walk COMPLETE
raw/ + forward events) · tla-voting (org-tla-voting + E2 registry;
pd-bribes/current.json REPLACES hand tla_pd_bribes) · token-catalog
(org-token-catalog; replaces tla_known_tokens + shadow contracts/ — tokens
keyed BY ADDRESS; + supply/capa/{current,wallets,index}.json + daily/ — the
CAPA custody map, v2 2026-08-24 → readers: ampcapa-tool.html, help-agent
`capa_supply`/`capa_wallets`, system-health `capa-supply` row) · votion (org-votion; VERIFY fully covers legacy
votion-positions → then close that item)

## docs/ — contents AS READ 2026-08-09
**changelogs/** — one log per page AND per cron. SWEEP LAW: entry for every
touched subject at each delivery; enumerate this dir at session end. Files:
README, catalog-log, cron-{address-catalog, dex-data, system-health,
tla-voting, token-catalog, votion}-log, dao-log, explorer-log, index-log,
lore-log, portfolio-log, slippage-log, tla-log.

**curated/** — HAND-MAINTAINED cron INPUTS (all carry _meta; several carry
_curation_queue): known_contracts{contracts} labeled addresses ·
protocols{protocols} directory · token_overrides{tokens} identity overrides
(merged on read over cron discovery) · wallets{wallets} ·
scoring_weights{price,identity} · categories{categories,protocols,flags} ·
acquisition_guides{tokens} · curation-candidates{wallets} ·
coingecko-terra2-index{by_address}. NOT data; never cron-written. Any
json_storage registry replacement must reconcile HERE first.

**ecosystem-knowledge/** — doctrine home: PRICING-DOCTRINE.md + per-protocol
{md + facts.json}: astroport, backbonelabs, boost-dao, credia, eris-protocol,
phoenix-directive, skeletonswap, solid-protocol, terra-liquidity-alliance,
tla-stats-system, votion. Retired audits' conclusions fold here.

**docs root** — ⚠ TWINS CONFIRMED (json_storage replacements ALREADY here,
2mo old): epoch_1-300_date.json (300 epochs, start_time + rewards fields,
genesis 2022-10-31) · staking-apr.csv (date,value since 2022-05-29) ·
tla-docs-content.json {version,sections,glossary} · queries.md (on-chain
query reference — label/input/output for every relevant query; READ BEFORE
writing any new chain query). ⇒ json_storage step largely collapses to PAGE
REPOINTS onto these + a freshness/emitter decision per file.

## pending-changes/ SPEC STATUS BOARD (each file's own status line, 2026-08-09)
**✅ EXECUTED / SHIPPED / DEPLOYED — retirement sweep (verify, then delete):**
adao-provenance · distributions-capture · tla-flows-fill · tla-flows-walker ·
tla-voting-bribe-state · tla-voting-capture-fix · tla-voting-reconcile ·
tla-voting-rollups · vp-definition-fix · system-health (built, live) ·
registry-extensions-pnl (v2 built + gated) · PROBES-credia / PROBES-votion
(answered) · PLAN-archive-window-walk (walk complete) ·
capture-registry-backfill (E2 done) · BACKFILL-AUDIT (superseded).
**⚠ BUILT & GATED — DEPLOY PENDING COMMIT (lost-deliverable risk: files came
from dead chats; LOCATE or REBUILD next session):** SPEC-bribe-runway (v1
gated 9/9, 2026-07-30) · SPEC-portfolio-epoch-ledger (2026-08-03) ·
SPEC-portfolio-pnl Phase A (2026-07-22; Phases B–D open).
**DRAFT / OPEN (the real queue):** landing-pulse · lp-apr ·
pd-directive-watch · adao-docs · votion-capture (approval) ·
tla-voting-briber-board · portfolio-roundtrip-pnl (was blocked on the walk —
NOW UNBLOCKED) · capture-registry Phase-2 extensions.
**LIVE REFERENCE (keep):** TLA-CORE-STORAGE-DESIGN · SPEC-platform-doctrine ·
SPEC-price-history-format · SPEC-token-catalog (staged table) ·
SOURCE-AUDIT-DRAFT · UI-DATA-READINESS (G-gates; G5 apr/pool-status epoch
series → satisfied by the dex-extension plan) · SPEC-grading-and-dex-data
(OLD grading system, Camron-flagged remnant — retire after confirming no live
citation) · CHANGES_PENDING (the queue).

## SITE SHARED LIBS (added 2026-08-12 — read before touching any page)
| File | Role |
|---|---|
| `lib/cron-registry.js` | **Single source of truth for platform health.** All 17 org products: schedule, heartbeat path, owning Render job, what it powers. index, tla-stats and transparency-hub ALL derive from it. Adding a cron = one entry here. |
| `lib/site-footer.js` | One footer for every page (socials, links, rev + changelog, live health dot linking to the transparency hub). |
| `lib/adao-live-data.js` | Live chain reads shared across pages (`window.aDAOLive`). |

**Law:** never hardcode a cron list in a page again. Both duplicate registries
(index + tla-stats) drifted until healthy jobs rendered red; they are now
derived. Freshness and FINDINGS are separate — a product reporting
`status:"violation"` is that job working, and must not turn a dot red.

## Search guidance
who writes → grep platform-crons for the path; heartbeat runIds name writers.
who reads → grep aDAO-links-site + cron-scripts (reader map = migration list).
pending vs done → the spec's own status line + CHANGES_PENDING top.
why → ecosystem-knowledge + the subject's changelog entry.
chain queries → docs/queries.md FIRST.
new dir or doc → check this catalog + docs/README for an existing home first.
tenant repos → nft-collections + dao-originations own per-tenant data; adding
a tenant = add a folder per the repo's README layout, nothing else restructures.

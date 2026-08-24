# CHANGES_PENDING — session queue & state
SHIPPED 2026-08-24 (late session, two deliveries) — capa-supply v2.0 → v2.1 +
ampcapa-tool 2.1 → 2.2 + fold Action:
- v2.0 FIRST LIVE RUN VERIFIED 18:09Z: ok, 13/13 sum guards to the digit,
  4,923 holders / 215 published / tail 4,708 = 2.12M CAPA, claims 483/0,
  148 KB; owner row exactly as the fixture predicted (gov 1,141,022 · receipt
  in DAO 7,275,285 · unbonding 808,365); `gov_balance_beyond_shares` =
  200,000.000 exactly = a live Solid poll deposit. Floor stays 10K.
- v2.1: compact per-wallet daily `supply/capa/wallets-daily/<date>.json` +
  day index (never-shrink; capture never demoted to legacy); exports
  legacyIndexRow / foldIndexRows / upsertDailyIndex. Gate 66/66.
- tla-core one-off Action `capa-supply-fold-legacy.yml` (+ script): folds the
  retired ampcapa-data_2026 weeklies 181–197 + monthlies under prior-verbatim
  / never-shrink / labeled `legacy_fold`; proven locally on the real feed
  (+20 index rows, 19 days, idempotent, captured day untouched).
- ampcapa-tool 2.2: members-tab Δ periods read wallets-daily (badge names the
  comparison day, "(legacy weekly)" when folded, null → NEW never a number);
  ZERO reads of the personal repo remain; whale rows show VERIFIED labels
  from catalog/trusted. Gate 41/41.
VERIFY ON ARRIVAL: (1) next org-token-catalog run logs
`wallets-daily/2026-08-2x.json (N rows) + index (1 days)`; (2) run the fold
Action dry_run=true → log ends "+20 legacy rows … 21 rows 2026-04-19→2026-08-2x
· wallets-daily: 19 written" (dates ≠ the captured day); then dry_run=false →
commit lands wallets-daily/*.json + index.json; (3) ampcapa-tool → DAO
Members → 24H badge "24H vs <yesterday>" once two captured days exist, 7D/30D
badges "(legacy weekly)" until the org series is 7/30 days deep; deltas
non-blank for members present on the comparison day; (4) CAPA Whales rows for
the PD DAO core / Solid contracts now carry their verified labels.
RENDER FLEET = ORG ONLY (owner console 2026-08-24, screenshot): 14 jobs —
org-token-catalog, org-system-health, tla-help-agent, org-nft-flows,
org-nft-inventory, org-tla-flows, org-member-data, org-votion,
org-dao-governance, org-address-catalog, nap-org, org-lp-grades,
org-tla-voting, org-dex-data. The ampCAPA Snapshot job, the votion pair and
every other mid-fleet/legacy job are ALREADY GONE — the "retire the job"
step and the standing "Render parallel pairs" housekeeping item are CLOSED.
Only step left for the legacy feed: after the fold Action commits, ARCHIVE
(not delete) `defipatriot/ampcapa-data_2026` — nothing reads it (zero site
refs), and its weeklies are the fold's provenance.
NEXT-SESSION OPENER (proposed): "Read PROJECT_KNOWLEDGE and CHANGES_PENDING,
then do the LP/ampLP identity fold + amplp_mappings duty (unblocks
Catalog/Chain-Queries repoints)." — or FUEL route helper (below).
QUEUED from v2 (remaining): index perf slim row-series can reuse the
wallets-daily compact pattern; ampcapa-tool page-walk items untouched by this
arc (legacy chrome footer, Rev string lived in inline HTML — now correct).
FUEL TOOL QUEUE (owner 2026-08-24): (a) buy/sell route helper — best execution
FUEL vs USDC/LUNA/SOLID; first step is a preset deep-link into slippage.html
(?token=FUEL) which already prices routes from live reserves, then an inline
mini-widget; (b) large-selloff watch — needs a trade-events stream for the
LUNA-FUEL pool (dex trades are not captured today; candidate source: warlock /
astroport tRPC swaps) — capture question before page work.

(Consolidated 2026-08-23 end-of-session. THE authoritative "where are we" now
lives in PROJECT_KNOWLEDGE.md — read that first; this file carries the
detailed per-item state below it.)

PAGE-WALK BATCH 1 (2026-08-23, later session) — shipped: footer v3.2 / header
picker slot / index 4.01 / ally 3.5 / tools 1.5 / links 1.5 / tutorials 1.6 /
help-agent corpus +alliance-dao. Full entry: changelogs/index-log.md.
NEW QUEUE ITEMS from the walk:
- CRON (perf, biggest lever on index load): publish slim daily row series
  (`index.json` rows, backing-history pattern) for tla-snapshot, astroport
  daily, skeletonswap daily, network-and-prices daily, and a bribes-by-day
  aggregate — so the pulse/TLA charts read 5 files instead of ~165 (28 MB).
  Pages repoint after parity.
- CRON: network-and-prices/daily/2026-08-11.json missing — same 08-11 hole.
- SITE: pulse module has no standalone jsdom gate — build one (fixtures:
  astro/ss/votion/member/snap daily + catalog) before the next pulse change.
- TOOLS FOLD (owner 2026-08-24: keep all tools, org-sourced):
  · FUEL tool → price: price-history/<yyyy>/<mm>.json days[date].FUEL.usd (32
    sparse days since 2025-12-28) + network-and-prices/current.json FUEL block;
    TVL/volume: dex-data/astroport daily pool row for FUEL-LUNA (tool's history
    expects {date, avgTvlUsd, …}). Legacy hourly history (defipatriot/tla-core)
    is 404 — org series IS the history from here.
  · TLA Catalog / Chain Queries → token-catalog + catalog/trusted +
    docs/curated/known_contracts.json (+5 PD contracts to fold); needs
    `amplp_mappings` published in token-catalog current.json (org-token-catalog
    duty, from ve3 asset_configs{}) — DATA-MAP, system-health gate, help-agent
    map follow.
  · ampCAPA tool → NEW duty "CAPA supply map": SPEC-capa-supply-map.md written;
    gate = capa-supply-probe Action run (owner to trigger, paste log). Then the
    duty in org-token-catalog, then the tool repoint, then legacy fold + retire.
  · DONE 2026-08-24: known_contracts.json +5 PD contracts (fold step 1).

- CRON: backing-history.json hole 2026-08-11→08-19 (migrated series ends 08-10,
  org-nft-daily starts 08-20); fill from state-history or archive, and fix the
  stale date_range/missing_dates metadata the publisher writes.
- ALLY: read Ally asset reward_weight from /terra/alliances, record as
  alliance-dao.facts.json `adao.rewards.share`, restore a rewards-share tile.
- SITE: pick canonical font (Inter vs Outfit) — index/ally vs dao/tla-stats/libs.
- SITE: index.html still carries the orphaned chrome (changelogModal,
  mobile-bottom-nav, SHARED CHROME SCRIPT) — strip in its own walk.
- SITE: address-catalog.html missing Vercel analytics tag.
- ASSETS owed: Atrium logo, Votion logo (footer banner + links page lettermarks).
- TOOLS: purpose review of Trade Cost Simulator / TLA Catalog / Chain Queries /
  Catalog Edit — fold into Help/Docs or retire.
- Vision (ally): "yesterday's claim" strip derived from the backing rows +
  backing sparkline; deferred until the series hole is filled.

CONSOLIDATION 2026-08-23 (end of the Explorer + multi-collection session):
- MILESTONE REVS SHIPPED: index 4.00, nft-explorer 4.30, treasury 3.1,
  tla-deposits 3.1 — audit arcs closed at round numbers; changelog entries in
  index-log/dao-log/explorer-log.
- DEEP AUDIT RESULT: repos clean. Deleted earlier tonight: tla-core
  collections/ (superseded), catalog/collection.json (mis-upload). Remaining
  owner-decision items (NOT deleted): site test.html (Member Portfolio TEST
  P1 — still linked from index+tools; delete the page AND both links together
  or keep); tools.html carries the retired 2023 footer (fold into a future
  page-walk); Render parallel cron pairs (owner console); legacy
  sales-history.json fold (queued).
- pixeLions: sweep green (5,000 metadata + ranks, anchors exact on main),
  validate-collection PASS — data layer COMPLETE. Open: royalty bps, Lion DAO
  consent, classic-era contract address.
- HUB VISION recorded in SPEC-collection-registry.md ("The Hub" section):
  COLLECTION pill in the unified header, page context mapping, feature-flag
  gating, per-collection branding block (theming after function).
- NEXT SESSIONS in priority order: (1) registry wiring / hub, (2) genesis
  walk (time-sensitive), (3) pre-announcement gate #0, (4) portfolio P&L,
  (5) housekeeping batch. Openers in PROJECT_KNOWLEDGE.


Explorer audit findings (full list in chat + explorer-log.md): Analytics tab inputs
frozen at 2026-06-12 — sales-enriched/listing-history have NO org maintainer (duty
never ported from the retired data-repo Action); luna-usd-daily frozen 2026-06-08;
field drift blanks four panels (monthly.notional_usd/count vs usd/sales,
flips.flip_count/realized_pnl_usd vs count/luna, royalties.to_dao_usd_* absent,
royalty total in uluna); 19 unbucketed tokens = DAODAO custody unattributed
(incl. legacy 4: 1319/3605/6847/7123); governance concentration mixes Enterprise
(2,034) into "DAODAO VP" (should be 1,631); explorer mark still midpoint vs
index.html conservative min (two market caps); dual footer w/ false deving.zone
credit (Rev 4.13 inline); dead snapshot tool ~700 lines; cloudflare-ipfs.com
fallback (defunct gateway); badge key says broken="eligible for rewards"
(backwards, contradicts its own Backing explainer); address-picker loaded but
never read (Wallet tab doesn't follow VIEWING); 16.2 MB first paint.

SHIPPED (this delivery, gated):
- platform-crons: aux-classifiers.js classifyNftTx v2 (sale/list/cancel/bid,
  order-segmented batch settles, buyer==fee-wallet edge, legs_consistent flag),
  tla-flows/index.js registry parse `nft_marketplace` + markets pass-through,
  NEW mock-run-nft-v2.js (BINDING gate: FCD 11,582 txs; 1,151/2,793/1,602/0/0;
  v1 parity; 1,087/1,087 enriched gross+seller+buyer).
- tla-core: capture-registry.json +3 marketplaces (BBL role-evidenced;
  Atrium/Boost generic until fixture).
- v2 corrects history: old pipeline dropped 64 batch-settle sales, misattributed
  13 fee/royalty/net (legs don't sum to gross; v2's do exactly).

VERIFY ON ARRIVAL:
1. Both repos: mock-run-nft-v2.js passes (TLA_CORE_DIR=<tla-core> node ...).
2. Next Render tla-flows run logs "3 marketplaces watched" and walks clean.
3. First real marketplace event lands in nfts/adao/transfers/2026/08.json as a
   v2 record (list/cancel likeliest; sale when one happens).
4. C.5 STILL UNRESOLVED from 08-22: warm ran but committed products show
   pending 0 / classification 9981 — the 19 stay unbucketed until walk task 2.

SHIPPED LATER SAME DAY — TASK 2 (custody bucket + the REAL 9981 root cause):
- Root cause was NOT just a missing bucket: `daodaoCustodyCount` filtered on the
  daodao_staked FLAG, which carries flipped-false from base on hot/warm — custody
  read 1631, chain count 0, tracker "reconciled", C.5 sweep never re-fired.
  Now counts RAW chain ownership (owner == staking contract): 1650 every mode.
- New bucket `daodao_custody_unattributed` (third custody state: unstaked,
  window expired, never claimed — incl. legacy 1319/3605/6847/7123). Resolution
  strands land there; claims tracker promotes attributable ones to pending
  (real unstaker as real_owner); left-custody clears. Held token never no-bucket.
- nfts/adao C.6: index.js + CHANGELOG + NEW mock-run-custody.js (BINDING gate,
  real committed poisoned base, 4 scenarios W/H/T/E, all sum 10,000).
- VERIFY: next warm/full logs custody 1650 / chain 19; sweep re-fires; summary
  daodao_custody_unattributed_count + daodao_pending_claim_count sum to 19;
  "Classification sums correctly to 10000"; Analytics Supply bar gains the
  bucket only after walk task 4 (page reads flags — no page change shipped yet).

SHIPPED SAME DAY — TASK 3 (market-history: the ported duty, Analytics un-frozen):
- NEW platform-crons nfts/adao/market-history.js in the warm/full pass: forward-
  fills luna/bluna-usd-daily from org price-history (June 9 → yesterday, ~75
  days), appends v2 sales to sales-enriched, maintains listing-history
  (open/close, all-ever-seen dedupe). Laws in code: prior rows byte-verbatim
  (throws), never-shrink (throws), ambiguous never enriched, no fabricated
  price days, repairs labeled.
- flows.js delisting→sale upgrade at rollup (chain truth wins, labeled).
- tla-core one-off Action `nft-recover-batch-sales` (workflow_dispatch):
  appends the 64 REAL batch-settle sales the old pipeline dropped — live
  classifier + live enricher, registry roles, idempotent, repair-labeled.
- Gate: mock-run-market-history.js (G1–G5, real committed products, fixture
  self-derived). VERIFY ON ARRIVAL: (1) gate passes locally; (2) run the
  one-off Action once → sales-enriched 1,259 → 1,323; (3) next warm logs
  "luna-usd-daily: +N days" reaching yesterday and market-history heartbeat
  lands; (4) NEXT analytics pass shows 1,323 sales and floor history gains
  the missing months. Analytics numbers move only after (2)+(3) land — same-run
  analytics reads pre-maintenance committed inputs by design.

DECISION FINAL — COLLECTION ARCHITECTURE, settled (owner + audit 2026-08-23):
- Partner data: nft-collections/<slug>/ (collection.json + metadata/ rarity/
  lore/ per that repo's own convention) and dao-originations/<slug>/ for the
  DAO side. Partners touch ONLY their folders. Nobody forks anything.
- Our switch: tla-core/catalog/collection-registry.json (owner: no new single-file
  folder — catalog/ is the existing home for registries, beside
  trusted/current.json). Enabling an entry = crons capture the folder, site
  lights the selector + shifts the dynamic pages.
- NAMING (2026-08-23 final): the switch is catalog/collection-registry.json —
  renamed from collections.json after a one-letter collision with the per-
  collection collection.json caused a mis-upload. Registry = switch (ours, in
  catalog/); collection.json = a collection's config (theirs, in
  nft-collections/<slug>/). CLEANUP DONE: tla-core/collections/ deleted;
  ALSO delete tla-core/catalog/collection.json (the aDAO config uploaded to
  the wrong repo — its home is nft-collections/adao/).
- CLEANUP (done earlier): delete tla-core/collections/ (registry.json committed there under
  the superseded plan — remove the folder via web UI; nothing reads it yet).
- Products stay in tla-core/nfts/<slug>/snapshots/ (internal machinery).

PIXEL LIONS GOVERNANCE CORRECTED + HISTORY BACKFILL QUEUED (2026-08-23):
pixeLions have their OWN DAODAO DAO (est. Oct 2024, 291 members, 2,930/5,000
staked 58.54%, 1-second unstaking, "formerly of Enterprise" = legacy-
Enterprise history like aDAO's). Council (5 members, equal 20%) shipped to
dao-originations/pixel-lions/governance/council.json; collection.json
governance rewritten (own DAO + Lion DAO as parent). STILL NEEDED from owner:
the pixeLions DAO core address (copy from its daodao.zone URL) + the DAODAO
NFT-staking module address (its contract list).

BACKFILL — YES, and it is DURING-ARCHIVE-ACCESS priority: pixel-lions needs
its own sales/transfers/staking history for explorer-grade parity. The infra
EXISTS and parameterizes: (1) FCD frozen archive covers genesis→Jan 7 2025 —
the same walk that built aDAO's corpus, pointed at the pixelions contract;
(2) archive node covers Jan 2025→now while access lasts (TIME-SENSITIVE);
(3) forward capture = add the pixelions contract + its venues to the
tla-flows capture set (BBL sale vocabulary ALREADY fixture-locked from aDAO —
same warlock/necropolis contract terra1ej4cv98…7gccs9). Products land at
tla-core/nfts/pixel-lions/snapshots/ mirroring aDAO's shape. Build order:
forward capture first (stops the bleeding), then archive-era walk, then FCD
era. This is a full session: "Read PROJECT_KNOWLEDGE and CHANGES_PENDING,
then build the pixel-lions history backfill (forward capture + archive walk)."

PIXEL LIONS — ALL DATA SOURCES RESOLVED (2026-08-23, full BBL HAR): warlock
necropolis API serves rank/top_percent/rarity/traits per token (125 pages x
40); images ipfs CID bafybeihgr… ({id}.png — BBL uses a TOKENED realityflux
gateway, we use public ipfs.io with the same CID); metadata token_uri CID
bafybeia4wio… ({id}.json). Trait counts in the API match the owner-transcribed
traits-reference EXACTLY (240 cross-checks on the captured page-1 payload).
NO rank reverse-engineering needed — warlock IS the rank oracle; the owner's
72 transcribed anchors + 2 API-confirmed (#1→4760, #2→3348) become the sweep's
refusal gate. SHIPPED to nft-collections: filled collection.json, bbl-rank-
anchors.json, traits-reference.json, and .github/{workflows,scripts}/
sweep-pixel-lions — a one-off Action (repo-local, default token, no new
credentials) that mirrors metadata.json + rarity.json with four refusal gates
(supply 5000, exact trait-count reconciliation, 74 anchors, rank range).
PLACEMENT NOTE for owner approval: collection-data sweep Actions live IN
nft-collections (the repo they write) — extends the tla-core-only Action law.
OWNER: commit the zip, run the sweep-pixel-lions Action, send the log.
Remaining after sweep: BBL royalty bps, DAODAO-staking confirmation, Lion DAO
consent — then pixel-lions is wiring-ready.

PIXEL LIONS PILOT SEEDED (2026-08-23): nft-collections/pixel-lions/ —
collection.json (contract terra17z7fpaa…xp50g from the BBL HAR; supply 5,000
PROVEN by trait-count sums, six independent confirmations; 6 traits; Lion DAO
core terra1tkersa2…gluec from dao-originations/lion-dao registry; BBL
marketplace; backing null; portfolio/wallet-tracking OFF pending Lion DAO
consent) + metadata/traits-reference.json (all 127 trait values with counts,
transcribed from owner screenshots, every trait sums to exactly 5,000 — the
validation target future metadata must reconcile against). Switch updated:
pixel-lions entry enabled:false. TO FLIP ENABLED, still needed: per-token
metadata file (chain nft_info sweep or team file), rarity method choice
(statistical-from-counts computable today, or team's intended list), image
CDN pattern (HAR truncated at 100KB before any image request — re-export
complete or paste one image URL), staking-contract confirmation, BBL royalty
bps. Then the registry-wiring session makes crons+site actually read it.

FOOTER V3.1 (lib): This-project column made uniform — five identical
icon+label rows (repo/Changelog/System Health/Contact/App), rev+date+page
moved to the bottom bar (single page-rev id). Honest wording per owner:
"no tracking" claim REMOVED; blurb now "No wallet connection, no accounts —
just public on-chain data"; legal section retitled "No wallet, no accounts"
and discloses that wallet holdings shown are public on-chain data and hosting
collects anonymous aggregate page metrics. Escape normalization + 9-check
gate green.

FOOTER V3 (lib, all pages — supersedes v2's layout, owner: full redesign):
structured grid replaces the centered rows — brand column (wordmark, one-liner,
Telegram/X/GitHub) + Site / Ecosystem (9 stacked links) / This-project columns
(org repo, Changelog+Rev, System-Health dot, Contact, App when enabled), then
the four-protection row (not-financial-advice / data-as-is-third-party /
no-wallet-no-tracking / open-source-open-door), then a bottom bar (© year ·
community-built · page slug). Health/rev/changelog/App wiring contracts all
preserved. V3 gate green (10 checks incl. old-layout-absent assertion).
VERIFY: any page footer → new column layout; health dot still lights; on
narrow screens columns stack.

SHIPPED — PICKER DISPLAY (lib, all pages): header hint text removed; selected
wallet shows "Name - terra1…full" on desktop (pill widens to 44em ≥768px) and
"Name - …7ulw" on mobile; unnamed = full address desktop / terra1hr8…7ulw
mobile; re-renders on resize across the breakpoint. Gated both widths.
VERIFY: select yourself → desktop pill reads "DeFi_Patriot - terra1hr8…x77ulw"
(full string); shrink the window → flips to "DeFi_Patriot - …7ulw".

SHIPPED — INDEX FIXES + FOOTER V2 + COLLECTION SPEC (2026-08-23 late):
- index (Rev 3.99): VP Locked / VP potential change-rows no longer dash — the
  member daily publishes late so today's file 404s; nearest-3 fallback added
  (same fix the headline tile already had). Votion realized/combined-APY chip
  DROPPED from both vault rows (owner: numbers not trustworthy; forward APR +
  TVL + link remain).
- lib/site-footer.js v2 (EVERY page): ecosystem row (Eris TLA, Astroport,
  Solid→solidcapa.com, Atrium→atrium.markets, Boost, BBL, Votion,
  Terra→phoenix.money, DAODAO) + four-section legal/community block (not
  financial advice / third-party data / no wallet, no tracking / open source
  open door with github.com/thealliancedao). index + tla-stats bespoke footers
  RETIRED (incl. tla-stats' literal \u-escape disclaimer bug and index's
  frozen Rev 3.70 tag); both now mount the lib footer (index passes
  appInfo:true to keep the App/PWA button — its modal JS was already
  DOMContentLoaded + guarded). Footer render gate green (9 venues, 4 sections,
  repo link, no literal escapes, App button conditional).
- NEW SPEC-collection-registry.md + collections/registry.json +
  collections/adao/collection.json seed: the plug-in-a-collection contract
  (identity/traits/rarity/images/backing/governance/marketplaces/feature
  flags), cron + site discovery model, onboarding flow, build order. aDAO seed
  uses ONLY known-true values; unknowns are explicit TODOs, never invented.
  BINDING for new page work: build against the registry shape (step 2 shim:
  lib/collection-config.js returning the aDAO entry — zero behavior change).
- VERIFY: index → VP rows show deltas; Votion rows have no realized-APY chip;
  scroll to footer on index + tla-stats → new legal block, ecosystem links,
  App button on index only; read the SPEC and answer its three owner questions.
- QUEUED from this pass: index page-walk (orphaned changelogModal div + JS,
  guarded but dead); tla-stats T-rev history fold into lib changelog link.

SHIPPED — PERF PART 2 (explorer Rev 4.27, FINAL explorer item): bundle-first
boot (442KB paints gallery/filters/ranks/status/prices immediately; owners/
grades hydrate in background; "holders loading…" honest gap state); parallel-
run fallback to the untouched full boot on ANY bundle problem. Gate: latch
proves paint-before-hydrate + hydration completion + 404-fallback in a second
jsdom instance. THE EXPLORER WALK IS COMPLETE.
VERIFY: hard-refresh the live page with DevTools Network open — first paint
arrives on explorer-bundle.json (~442KB) before nfts.json/metadata finish;
leaderboard fills in a beat later; block explorer-bundle.json in DevTools and
refresh → page still boots the old way.
NEXT UP (pick any): pre-announcement gate #0 (side-by-side reconciliation),
portfolio P&L, during-archive-access queue (STATE sampler / 6847+7123 /
FCD seam / BBL payment legs / Credia), warlock one-off for the 3 Jun-12 exits,
Render cron-pair retirements, Nov token rollover checklist.

SHIPPED — PERF BUNDLE PART 1 (explorer Rev 4.26 + platform-crons compact-bundle
1.0.0): rank tiles sized (w-72, px-4); insights on help/system-health/
transparency-hub; preview hover dedupe guard. CRON: NEW compact-bundle.js in
warm/full (runs last) → nfts/adao/snapshots/explorer-bundle.json, 437KB
dict-encoded first-paint product, refuses on summary mismatch; gated on real
inputs (10,000 rows, #6192 round-trip, 1,631/17+2/5,828 reconciled, ranks
match, refusal proven).
VERIFY: commit both, trigger warm (or wait for auto) → log shows
"=== compact-bundle === ... 437 KB" and explorer-bundle.json lands (~440KB).
NEXT (fresh session): page boot swap onto the bundle + background hydrate +
lazy BBL detail — opening line: "Read PROJECT_KNOWLEDGE and CHANGES_PENDING,
then wire the explorer onto explorer-bundle.json (perf part 2)."

SHIPPED — OWNER REWORK (explorer Rev 4.25): Share button removed (URL is the
mechanism); holders panel → top-row scrollable dropdown (names+counts, live vs
filters, click → header select) between Search-by-ID and Amount; Rank System
relocated below Display Options; lib/address-picker.js gains a pill copy
button (all pages) with flip-to-check + short-address tooltip verification.
Gate reworked and green (dropdown sums 1,631 exact).
VERIFY: top row = ID | Holders | Amount | Sort | Reset; rank toggle below
Display Options; dropdown scrolls with counts; pill shows copy icon when a
wallet is selected, click → check + "Copied terra…xxxx".
REMAINING on explorer: perf bundle (fresh session).

SHIPPED — TASK 6 (explorer Rev 4.24): Analytics hero sentence (written from
the products: sales/at-sale USD, minted/10,000, listed+ask-side, last-sale
recency honest — currently "1d ago #6192 50 SOLID"); status-filter counts now
"N match" labeled/locale-formatted instead of bare floating integers. Gated.
VERIFY: Analytics opens with the sentence; slider counts read "1,631 match".
REMAINING on explorer: perf bundle (cron compact metadata 16.3MB→~1MB first
paint, BBL ranks lazy, image-request dedupe, insights on help/system-health/
transparency-hub) — next delivery.

SHIPPED — FEATURES (explorer Rev 4.23): filtered-holders panel (live group-by
of the FILTERED set, chips → header select, hidden when nothing narrows) +
Share view button (URL already carried full filter state; now discoverable,
ranks=bbl serialized + restored). Gate is UI-driven: real toggle+slider events,
panel sums to 1,631 exactly for Staked→DAO, URL round-trips.
VERIFY: filter anything → panel appears with counts; Share view → paste the
link in a new tab → identical view; chip click → header pill updates.
NEXT: analytics hero + filter-count cleanup, then perf bundle (cron).

SHIPPED — WALLET TAB (explorer Rev 4.22): UNCLAIMED + VP% columns (grid 9→11
cols), backing line on wallet search (unbroken × per_nft_ampluna, USD from
per_nft_value_usd — product fields, no re-derivation), all non-blocking
enrichment from summary.json fetched at boot. The 2 contract-held unattributed
stay off the board (Enterprise-unattributed precedent). Gate rebased onto real
page markup, end-to-end init, sort-click assertions (17 exact, top staker
19.87% @ …5309, backing math exact).
VERIFY: Wallet tab shows Unclaimed and VP % columns; sort by each; DeFi_Patriot
row shows VP%; search a wallet → backing line under the title.
NEXT: filtered-holders panel + shareable filter URLs, hero, perf bundle.

SHIPPED — TASK 5 LEGACY STRIP (explorer Rev 4.21):
- Dual footer + stale changelog modal + JS + CSS stripped (lib footer owns rev/
  changelog/health); false deving.zone credit gone with it; page links folded
  into the slim page footer. ~760-line unreachable Snapshot Tool removed (incl.
  its second 6.5MB nfts.json download). Badge key: BROKEN wording corrected
  (was "eligible for rewards" — backwards), Atrium entry added. Dead
  cloudflare-ipfs fallback → ipfs.io. Header picker now drives the Wallet tab
  (tla:wallet listener, wallet-view entry hook, leaderboard row → select).
- Page gate green on live products (1,326 sales, royalties 14,845 LUNA).
- VERIFY: single footer at page bottom (Rev 4.21, changelog opens from lib);
  badge key correct; pick a wallet in the header → Wallet tab shows it;
  click a leaderboard row → header pill updates.
- NEXT in finishing build: wallet columns (UNCLAIMED + VP%), filtered-holders
  panel, shareable filter URLs, analytics hero, perf bundle.

SHIPPED — UNRESOLVED-EXIT SENTINEL + COVERAGE GAP REGISTER (the "never again"):
- market-history 1.1.0: every marketplace exit must resolve to sale or cancel —
  any v1 exit (trailing 60d, registry-driven venue set) with no v2 record for
  the same tx raises loud log warns + heartbeat stats.unresolved_exits with the
  tx list. Currently flags 10 in Aug alone — the resolve-market-exits Action
  clears them. Gate G6 on the REAL committed 2026/08 month (flags pre-resolve,
  clears post-resolve, shape-aware both ways).
- docs/agent/DATA-MAP.md: coverage & gap register appended (in the help-bot
  corpus, so the bot can answer coverage questions honestly): FCD→walker seam
  2025-01-07→09 (~2d, transfer-level only, archive-queue), tokens 6847/7123
  attribution (archive-queue), OTC/P2P invisibility by construction, vocab
  lock status (BBL+Atrium-sale locked; Atrium-cancel/Boost generic), frozen
  spot semantics.
- VERIFY: next warm after the resolve Action → "✓ sentinel: every marketplace
  exit … resolves"; before it → the ⚠⚠ SENTINEL block listing the pending 10.

CORRECTION + SHIPPED — ATRIUM SALES WERE MISSED (owner caught it):
- "No sales since June 12" was WRONG — the audit's spot-check filtered exits
  from BBL only. Owner's own Atrium buy (995038E5…, 2026-08-21, #6192, 49.99
  SOLID, listing 549) proved it; 36 marketplace-exit txs Jun-12→v2-deploy need
  sale-vs-delist resolution (several Aug 19–21 Atrium exits to the owner's
  wallet are likely more buys).
- SHIPPED: Atrium `buy_nft` vocabulary fixture-locked in classifyNftTx v2 (attr
  normalization price/listing_id→amount/auction_id; gate G6 on the real tx;
  zero FCD-suite regression). tla-core one-off Action `nft-resolve-market-exits`
  (workflow_dispatch): LCD-fetches all 36, archives raw responses under
  archive/lcd/market-exits/, merges v2 records into transfers months; next warm
  appends the sales (single-writer law). Registry: Atrium fixture-locked note +
  GOVERNANCE FLAG: Atrium sale paid 0 royalty to DAO (BBL enforces 5%).
- VERIFY: (1) run the Action — log lists each SALE line with gross/denom/buyer;
  (2) trigger/await warm — sales-enriched grows past 1,323 and Floor history
  26-08 (and possibly 26-07) gains bars; (3) royalties/volume tiles restate.

SHIPPED SAME DAY — TASK 4 (page field-contract repair, explorer Rev 4.20):
- Four dead Analytics panels revived (volume chart usd/sales, leaderboards,
  most-traded LUNA-equiv, trading line without phantom P&L); royalties made
  denom-correct at the SOURCE (analytics.js: royalty_luna / royalty_usd_today /
  royalty_by_denom — old field mixed uluna+ubLUNA micro-units) with the tile
  honest-blank until next warm; conservative min-mark (site-wide policy, one
  mcap again); governance DAODAO-only 1,631; Unclaimed (custody) 17+2 in Supply
  (the 2 no longer leak into Free float); spread colour un-inverted.
- NEW page gate gate-explorer-analytics.mjs (jsdom + real committed products,
  specific values in specific cells). VERIFY ON ARRIVAL: (1) Analytics volume
  chart has bars & buyer rows show $ values; (2) trading line reads
  "663 flips (held ≤30d) · 50.1% ..."; (3) governance card says 1,631 DAODAO
  only; (4) Supply shows Unclaimed (custody) 19; (5) royalties tile shows
  "awaiting next warm capture" until the next warm, then LUNA+USD; (6) mark/mcap
  dropped vs yesterday (conservative min — expected, not a bug).
- NOTED, deliberately unfixed: enriched spot_luna_usd/value_today_usd frozen at
  June builtAt — recomputing mutates committed rows (prior-verbatim conflict);
  belongs to the P&L feature's live-mark design. sales-history.json (1,221 rows,
  a third legacy sales file feeding two analytics lines) → fold-into-enriched
  candidate, task 5/6 audit.

NEXT (order): 2) ~~19-token bucket~~ DONE → 3) ~~market-history port~~ DONE → 4) ~~page field fixes~~ DONE → 
3) flows.js delisting→sale upgrade + sales-enriched/listing-history/
luna-usd-daily forward-fill (merge INTO org path; two-phase, prior-verbatim) →
4) page field-drift fixes (four panels + uluna royalty + conservative mark +
DAODAO-only governance + spread colour) → 5) legacy strip (dual footer,
snapshot tool, gateway, badge key, picker wiring) → 6) Analytics hero sentence →
7) compact bundle (16.2 MB → ~1 MB). Open item: tla-flows mock scenarios B/C
fail pristine in a fresh env (harness env dependency) — suite is BINDING, fix.

## 2026-08-22 (late) — PAGE-BY-PAGE WALK STARTED: Home · DAO · TLA Stats · Treasury · TLA Deposits

Owner's doctrine for this arc (binding): **walk every page for (1) old-repo code, (2)
formatting, (3) improvement — present the data the way someone would want to SEE it,
(4) chat-bot functionality, (5) load speed.** Design pages as a story (hero number →
one plain sentence written from the data → what changed and WHY → detail). Never a
tile that can read "$0" when something moved; every comparison row must reconcile.
Merge legacy data INTO the org path (same path, deeper history) — never a side file.

Shipped today (all gated; owner byte-verifies on commit):
- index.html 3.80→3.98 + lib 1.4.0: pulse opens by default; epoch pill (#199,
  local/UTC); TLA staked from gauge product (30/31, SS incl.); tokens-vs-prices
  split on every TVL row (exact on DEX TVL); 6+6 rows; Votion realized APY
  (matches votion.money: 59.3/58.96); governance alert modal + Live/Pending ·
  Past views + per-DAO history; Quick audit = precedent check + action ledger
  (pass / needs-verification / unknown-verify) + Request-verification;
  dead-repo reads removed (defipatriot/* zero requests); perf 113 MB → ~40 MB.
- lib: width law 1400/1550/1750 + Outfit + mesh on every page; ticker above a
  sticky bar, only on Home + TLA Stats; logos 4.5em; footer health fetched once.
- DAO 1.9 (proposal_count gate, IPFS gateway rotation daodao→dweb→ipfs.io),
  TLA Stats participants dedupe, lore planets 24 MB → 1.6 MB, manifest icons.
- dao_treasury 3.0 + dao_tla_deposits 3.0: hero story, tokens-vs-dollars INDEX
  chart (default), reconciling change cards, non/≥amp APR, Protocol Income
  (claims ledger), proposals with impact from the cron corpus (was 0 of 24).
- Crons: dao-governance 1.2.0b (anchor-gov CAPA, x/gov LUNA, veto_timelock
  object fix, DAO_ONLY), address-catalog 1.3.0 (catalog/trusted product),
  help-agent 1.11.1 (trust tier, final text turn), votion 1.3.0 (yield +
  realized_7d/30d), nfts/adao 6b (daily claim ledger, 60 rows) + C.5 (nft_claims
  state sweep), dao-dashboard 1.4 (daily-index.json; 10 migrated epoch-end rows
  live in daily/ as ordinary files).
- tla-core: docs/curated/trusted-addresses.json (trust register, 16 seeded,
  1 needs-verification: Skip router), catalog/trusted/current.json (414),
  nfts/adao/claims/history.json (60 claims since 2026-06-23), dao-originations
  capapult + terra registries.

### VERIFY ON ARRIVAL
1. daily-index.json committed at member-data/dao-dashboard/ (NOT inside daily/);
   old daily/index.json deleted; cron 1.4 appended today's date.
2. NFT warm/full run: `nft_claims sweep: 19 open claims … — reconciled` (C.5);
   hot runs still report 0/0 + classification 9981 (hot-mode bucket gap — queued).
3. votion cron ran with 1.3.0 → deposits/pulse rows read `yield.realized_7d`.
4. Treasury & deposits pages: hero sentence reads from data; change cards
   reconcile to the headline; Index chart shows both lines (dollars null for
   days with no day-of price — never today's price).

### NEXT SESSION — continue the walk, same five checks per page
1. NFT Explorer (26 MB across 4 overlapping NFT files → one bundle, cron-side;
   Atrium capture for pixeLions/TLA Locks; 19 stranded tokens in hot mode).
2. aDAO Lore (BNB logo 404; lib mesh now) · Member Portfolio · LP Grades ·
   LP Stats · Transparency Hub (→ becomes the Help/Docs hub: docs + sources +
   audits registry + address catalog; Docs tab leaves TLA Stats; bot corpus
   = the hub; bot answers "where can I see X" from routes.json).
3. Feed cron (X links + Medium + forum.phoenix.money) for the News tile.
4. Amplified APR capture (Eris; the old admin tool had apr.amplified per pool).
5. Home: "View Full Library" link to deleted repo; atom.png / logo_stamp 404s;
   tla-tile.js not loaded; avg-daily-gain tile from claims ledger (ampluna_to_
   backing ÷ unbroken) instead of backing deltas.
6. Explorer/Home second perf pass (listing-history 1.8 MB, sales-enriched 1 MB,
   rarity 1.9 MB lazy below the fold). Vercel insights script.js 'bind' error
   is theirs.

## 2026-08-22 — END OF ARC: announced to Lion DAO; next = layout & nav settlement

Shipped today (all byte-verified on main): DAO page live from chain for all 3
DAOs (cron 1.1.1 coreAddress, Lions/Allies boards real, live props, Copy /
Audit in Help), help agent v1.10.0 (registry-backed prop audit with verify
links, generic deep walk + unresolved block, period strings, question log
ON), drawer wide toggle, help-bubble session ×, mobile bar pinned, backing
history C.6 (hub rate; 2 rows repaired), explorer tab tile, secondary pages
on the lib chrome, catalog 1.2.0 entities (14).

### NEXT SESSION — in this order (see SPEC-layout-and-nav.md)
1. **Bug hunt + layout optimisation, every page, desktop + mobile** (§A).
   Start with the page×check table; fix per page; gate; ship.
2. **Deep links** (§B): `?view=` everywhere, section ids + link affordance,
   `routes.json` sitemap product.
3. **Nav rethink** (§C): present the three options with mock screenshots;
   owner decides; lib renders.
4. **Bot routes to data** (§D) from routes.json.
5. Tiles: LP Grades, aDAO recommendations, slippage.
Carry-overs (unchanged): typography pass · Enterprise-staker slug · arb
grouping by denom · null-leg re-annotation · perf (lazy ticker, roster in
localStorage 24h) · system-health watches dao-governance · spec sign-offs.
Verify on arrival: question log count; dao-governance next run (Lion 24 /
Pixel 12, live ids); backing-history row for 2026-08-22 uses hub rate.

## 2026-08-21 (late night) — UNIFIED CHROME MILESTONE SHIPPED

Header/picker/ticker/sub-nav on every core page (see index-log milestone entry
+ per-page logs). Catalog cron 1.2.0 (`entities`) shipped — first daily run
publishes the 14 curated entities. Spec §9 updated.

### NEXT (fresh session)
1. Verify on phone: tla-stats sub-nav + epoch slot, explorer tabs, DAO tabs,
   picker row on every page; catalog 1.2.0 first run → `entities` count 14.
2. Typography pass (spec §9.5): audit header-adjacent text per page.
3. Roster: Enterprise stakers as a catalog slug (owner's roster definition).
4. Arb strip: group by denom (WETH vs WETH.axl); quiet-state wording.
5. Re-annotate 600 WHALE/dATOM null legs to F1.2 semantics.
6. Spec sign-offs still pending: SPEC-governance-props, SPEC-lp-grades-rework.

## 2026-08-21 (night) — bot audit T2–T10 DONE; arb strip fixed; SPEC-unified-header drafted

- Battery graded 6 pass / 2 partial / 1 fail; agent v1.8.1 rule 13 + DATA-MAP
  patches shipped (help-log). tla-stats Rev T5.4 (tla-log).
- **NEW SPEC awaiting owner sign-off: `SPEC-unified-header.md`** — one header +
  footer across all core pages, global address picker (typeahead, last-4
  lookup, sorts), header on transparency-hub + help. Build only after sign-off.
- Queued small: arb grouping key by denom (WETH vs WETH.axl); strip quiet-state
  wording ("below round-trip cost" is wrong when profit<$1 is depth-limited).
- Verify next cron runs: F1.2 nulls in tla-snapshot current.json; DATOM
  match_quality in network-and-prices current.json.

## 2026-08-21 (late) — F2b SHIPPED; audit Class D closed

See cron-member-data-log.md F2b entry. Price audit now closed F1→F3 + F2b.

### FORWARD CAPTURE QUEUE (owner priority: correct-from-source, dynamic)
1. ~~F1.2 tla-snapshot~~ **SHIPPED** (see cron-member-data-log). Verify on first
   post-deploy current.json: LUNA-WHALE / wSOL pools staked=null, apr=null.
   Then: re-annotate the 600 WHALE/dATOM null legs in history to F1.2 semantics.
2. ~~dATOM from source~~ **SHIPPED** (see cron-network-and-prices-log): Neutron
   market via existing Astroport metrics; no env needed. Verify first run:
   `token_prices.DATOM.match_quality` == direct_match (cg_only ⇒ denom wrong,
   price still right). Drop wind-down noted; dATOM decoupled from ATOM.
3. Registry identifier-drift sweep (E11/E12 family).
4. Then: bot audit T2–T10, SPEC sign-offs, SPEC-pd-bribe-drift (now unblocked).

## 2026-08-21 — FOUNDATIONS ARC + SESSION DELIVERY (data-dump digest; commit set staged)

**Committed in this delivery (see docs-log.md + help-log.md):** help rework
(help.html Rev 1.4, drawer full-screen sheet, server v1.7.0 triage modes,
battery), foundations docs (FOUNDATIONS-SOURCES, AUDITS, phoenix-directive
chapter + facts, terra-depeg-and-fork), governance seed (122 props verbatim),
three new specs, AUDIT-price-artifact-2026-08.

### CHAIN-TRUTH FACTS LOCKED THIS SESSION
- PD treasury deployed: terra16st8yf…qye0me5 (prop #4822; rw 0.14 fixed —
  founding doc said 10%; chain wins). Built by Eris in contracts-ve3,
  SCV-audited (commits in facts file).
- TLA founding arc on-chain: #4813→#4816→#4817 (3× MsgCreateAlliance,
  604800s reward-growth interval = weekly cadence in chain config)→#4822→
  #4823→#4844 (PoL 30M LUNA)→#4847 (WBTC removal).
- x/alliance take_rate = 0 at creation on all TLA + PD virtual tokens; the
  TLA-context "take rate" = Eris hub ampLP yearly_take_rate. NEVER say "the
  take rate" unqualified. (2 MsgUpdateAlliance props unchecked.)
- Fees→bribes: NOT core Astroport (maker→xASTRO); IS a program commitment
  (Astroport team 50% of Terra revenue share → Astro Wars bribes, per PoL
  thread).
- PoL multisig owns 100% of USDC-ampLUNA PCL + 80.8% of LUNA-ampLUNA PCL —
  label as community POL in dashboards, not member liquidity.
- Solid/Votion/SkeletonSwap/Credia: NO audit at SCV or Oak (2026-08-21).
  Solid audit awaited from owner.

### OPEN QUEUE (priority order proposed)
1. **F1 forward price fix** (AUDIT-price-artifact §4) — build next; no owner
   input needed. F2 historical repair AFTER owner supplies FUEL/dATOM/WHALE
   spot prices (+ stLUNA≈$0.077, stATOM≈$2.91 confirms).
2. **Foundations intake build**: facts extraction for remaining chapters,
   wire new .md files into help-agent CORPUS_SOURCES, queued reads (WBTC
   forum thread → #4847 context; 2 PD treasury reports; 2 MsgUpdateAlliance
   props; Agora airdrop-logic thread; alliance + alliance-nft-collection
   repo deep reads).
3. **SPEC-governance-props build**: GitHub Action (chain props + forum
   /latest.json server-side; forum has NO CORS — browser polling impossible),
   docs catalog page w/ TLA-lineage badges, index news Forum tab.
   3 owner sign-off questions in spec.
4. **SPEC-lp-grades-rework**: awaiting owner sign-off (3 questions; esp.
   flip-threshold display comfort). Build order §3 chips → §1 advisor →
   §2 planner v2 → §4 PD strip (facts-only until F2).
5. **SPEC-pd-bribe-drift**: blocked on F2 (no drift math on tainted USD).
6. Battery T2–T10 grading as owner pastes; then rules/DATA-MAP patch round
   (LST-ratio≈1.0 tripwire caution + worked-example fix).
7. Announcement draft + epoch-band phase 2 (original item 3, untouched).

## 2026-08-09 — 🎯 PRIORITY LOCK (owner): FULL ORG MIGRATION TO DONE, then announcement

**Definition of done (owner, verbatim intent):** (1) org repos are the ONLY
repos with anything in them; personal repos fully DELETED. (2) changelogs +
system-health rows point only at real org jobs. (3) old Render jobs DELETED
(suspend is not done). (4) org repos audited clean — completed specs/one-off
workflows retired (walk, supervisor, fcd-compact, dex-slice, registry-backfill
all = finished scaffolding). (5) SOAK: jobs run untouched for days; audit that
history accrues as designed. (6) THEN announcement prep — one shot; every
number people will scrutinize verified (gate #0) before it ships.

### STATE OF THE WORLD (end of 2026-08-09 mega-session — all VERIFIED, not believed)
- **E2 COMPLETE, §10 gate 7/7.** Walk finished (final height 21,481,530).
  Fixtures: both 2025-08-26 bribes VERBATIM; pd-prop-250 = 11 legs
  38,155.099199; pd-prop-247 windowed (window_to 2026-08-03T00:00:00Z) = 178
  events 389,721.856283 exact; solid-june + flows-v3 ×3 OK. Gate initially
  failed because PD placed a NEW 41,298.31-LUNA bribe 2026-08-09 09:29Z —
  capture caught it same-day; pd-bribes now 21 placements, 469,175.268802
  all-time (store agrees to the microLUNA). Open-ended all-time fixtures can
  never stay locked → window them (evaluator supports window_to).
- **registry-backfill.js — four fixes ALL COMMITTED:** (a) staged-livelock:
  sliceDone treats done=true as slice-complete; (b) window_to filter in
  attributed_total; (c) gate-failure writes status 'halt' (yml stops on halt) —
  deterministic failures no longer self-chain; (d) success writes 'complete' —
  no victory-lap loops. Every outcome terminates. Ghost-run lesson: Bot
  successors pin the commit AT DISPATCH TIME — after fixing code, cancel ALL
  queued Bot runs and dispatch fresh.
- **epochs-astroport FOLD LIVE + PARITY GRANTED.** Legacy astroport-snapshot
  ported whole into platform-crons/dex-data/epochs-astroport.js (roller is
  STATELESS — epoch = floor((now−2022-10-31)/7d)+1; per-pool epochs rebuild
  from charts D30 each run). Runs as isolated tail of org-dex-data (kill-switch
  EPOCHS_ASTROPORT=0). First org run: 61 TLA-relevant pools, 36 charts, all six
  products into dex-data/astroport/{epochs,daily-csv,rolling,weekly-avg}.
  Parity vs legacy epoch-197: 36/36 pools, identical schemas/fields; 2 TVL
  outliers resolved IN ORG'S FAVOR by independent cross-check (org arbLUNA
  $19,655 exact-matches core snapshot; legacy LUNA-WBTC $38 vs real ~$108K —
  LEGACY CAPTURE BUG, org is MORE correct). Kill license BANKED; sequencing
  law: repoint readers → suspend writer → archive → delete. Legacy cron stays
  running until the reader repoint lands (site still reads legacy epoch files).
- **Site = org.** Repo TRANSFERRED to thealliancedao (raw URLs auto-redirect);
  Vercel reconnected + deploy-proven. Assets consolidated: 92 files verified
  byte-identical under /assets/{images,planets,token-logos,nft-metadata};
  GRAND REPOINT v1 LIVE: 244 swaps across 26 files → root-absolute /assets/
  paths (incl. the jsDelivr metadata URL). Punch list (pre-broken BEFORE the
  repoint, unchanged): BNB logo.png, logo_stamp_primary.png, atom.png,
  astro.png.
- **Archived (5):** network-and-prices-data_2026 (+ its Render service
  suspended), aDAO-Image-Files, aDAO-Image-Planets-Empty, token_logo,
  nft-metadata. Pricing cutover 13 files byte-verified live (site + 9 crons on
  tla-core/network-and-prices).
- **Earlier this week, all closed:** FCD compaction 2,241→113MB
  (166/166 total-verified vs pre-compaction snapshot); dex-slice 292 history
  files banked (only 3 READMEs unmapped); walk transient-hardening +
  walk-supervisor (auto-heal) shipped and battle-tested.
- **curated/ upload DELIBERATELY REJECTED** (old-data-suspect doctrine): the 3
  json_storage repos stay alive until each consumer is repointed/replaced —
  see replacement map below. NEVER migrate their contents.

### DOCTRINES LOCKED THIS SESSION (binding)
- **One canonical file per series:** deep history MERGED INTO the org file,
  forward capture APPENDS to it, site reads exactly that. Never old+new+live
  side-by-side.
- **Old data is suspect:** keep-merge ONLY machine-captured series whose
  method survived; DISCARD + re-derive from the E2 store anything
  method-tainted. Ruled: apr-history = DISCARD (pre-2026-08-02 APR math wrong
  by construction — correct Eris formula obtained that day); pool-status
  history = DISCARD/re-derive; aggregator products (tla-snapshot.json,
  dao-dashboard.json) = DISCARD, no replacement file (site composes live +
  atomic org products).
- **Pages define need:** anything no page/spec consumes is remnant — dies
  unported. The reader-repoint pass IS the needs audit.
- **Strip combo (proven):** fold → parity → repoint → suspend → archive →
  delete. Never out of order.

### NEXT ACTIONS (rewritten 2026-08-19 — cleanup, not migration)

**Read `SESSION-STATE.md` first** — full context, the 13 laws, and every open
item with its evidence.

1. **Confirm `org-address-catalog` goes green on its next daily run.** Its
   publisher retry is committed; it was dying on a 409 at heartbeat.json (the
   last file it writes), which is why its data was NEWER than its heartbeat.

2. **Delete the 10 unreferenced personal repos** (list in SESSION-STATE B).
   Nothing reads them; everything irreplaceable was migrated first.

3. **Delete `tla_json_storage` + `tla-ext_json_storage`.** Only DEAD fallbacks
   reference them — epoch-end walk-backs that already return null cleanly, with
   dao-dashboard as the primary path. Strip the readers afterwards if desired.

4. **tla-chain-registry — the LAST real migration task.** tla-catalog.html and
   tla-chain-queries.html need a TOKEN/CONTRACT/LP catalog; org `catalog/` is an
   ADDRESS/MEMBER registry. Different domain = ADAPTER, not repoint. Token half
   maps to `token-catalog` + `docs/curated`; `amplp_mappings` (65) has no org
   home yet. ⚠ the legacy file was still fresh (~24h) — find its producer first.

5. **Decide: rebuild or retire** — `fuel-tool.html` (already broken; its data
   path 404s) and `ampcapa-tool.html` (its cron is dead).

6. **Name-in-git-history decision** (SESSION-STATE D): accept, `git filter-repo`
   + force-push, or recreate. Current files are clean.

7. **Then the fun stuff**: SPEC-landing-pulse, SPEC-portfolio-pnl, per-pool
   bribe attribution, and the announcement gate.

## 2026-08-04 — SESSION: NEXT-SESSION LIST CLEARED · pricing in org repo · EURE fixed

**All five items from the 08-03 NEXT SESSION list are DONE:**
① byte-verify sweep ✅ (both 08-03 pastes landed byte-identical)
② **simulator-v2 SHIPPED** — slippage.html Rev 2.0 (gate 24/24 live fixtures):
zap planner ported from tla-stats T2.7 with full-captured-universe routing
upgrade, wallet selector + ?wallet= deep link, lazy member feeds, rev-footer
law established (REV consts → #page-rev; new changelog home
docs/changelogs/slippage-log.md). ③ **price-mark audit CLOSED** — does not
reproduce; all deep xyk references within ±2%; concentrated-pool trap named
as doctrine (AUDIT-eris-apr-pricing.md §2026-08-03/04). ④ astro 08-02 daily:
ACCEPTED as-is (06:01 window, disclosed not repaired — see
SPEC-landing-pulse honesty rules). ⑤ astro daily cron confirmed resumed
(08-04 captured on dex-data-1.3.1).

**Pricing now lives in the ORG stack** (repo law: defipatriot pricing repos
are inspiration-only): `platform-crons/network-and-prices` **3.0.1** deployed
on Render (hourly :01), publishing to `tla-core/network-and-prices/`.
Provenance-gated port (byte-identical to legacy + 16 declared edits, gate
25/25) + PHASE 6.5 PRICE CANARY (xyk-implied cross-check, concentrated
excluded by doctrine, SS refs unverified, never flips finals).
**EURE INCIDENT closed same-day**: registry cgId pointed at EUROe (wrong
coin, collapsed, $0.51 stale); flagged_mismatch resolver demoted the correct
Astroport price and shipped $0.5128 as final (~2.24× understatement
platform-wide). Fixed 3.0.1 → cgId 'monerium-eur-money-2' (CG migration
trap: '-old' slug kept the clean API id). Verified in production 17:01 UTC:
EURE $1.15, direct_match, delta −0.17%. Census of all 27 tokens: EURE was
the only identity error; 12 direct_match self-verifying, 6 calculated
immune, WETH/WBNB sibling-verified ≈1.00, STATOM/STLUNA ratios plausible,
INJ canary-covered hourly. **OSMO ($0.0283) + SWTH ($0.000153) need a
30-second manual CG eyeball (owner)** — only two tokens with zero watchers.

**PENDING (in order):**
1. **Parallel-run cutover** (network-and-prices): tonight 23:xx run must show
   `↪ ratio-history migrated from legacy repo` + daily archive; ~08-05 run
   the README comparison (EURE will differ from legacy = the fix, not
   drift); then repoint 5 consumers (capture-engine.js ~L59, nfts/adao,
   portfolio-assembler, tla-stats CONFIG.networkPricesUrl, nft-inventory
   URLs), retire legacy Render job, strip the 2 LEGACY_REPO_RAW fallbacks.
2. **SPEC-landing-pulse** (this delivery, sibling file) — awaiting DeFi_Patriot
   approval, then build index.html tile+chart per spec.
3. **network-and-prices v3.1** (parked until cutover done): sibling
   consistency checks (WETH≈ETH, WBNB≈BNB, STATOM/ATOM + STLUNA/LUNA ratio
   bands) + resolver doctrine (delta >50% → hold last-good + loud flag, no
   auto-pick — identity-or-death, not staleness). Legacy hand-listed LST
   market-address warnings (arbLUNA/bLUNA "single-pool") retire with the
   legacy divergence block at the same time.
4. Walk continues self-chaining (chunk 2 stacking at last check); PD stays
   absent from bribers board until gap backfill completes or its next bribe.
5. Standing queue unchanged below: SPEC-portfolio-pnl, classifyNftTx v2,
   historical STATE sampler, Credia stream, VP tile audit, cron retire pass,
   November token rollover, publish-retry hardening, dao-tla Member Stats.

---

## 🚀 2026-08-03 (EVENING) — build sprint landed · walk chaining · announcement track

SHIPPED + VERIFIED live (codeload): member-portfolio (P1.6 live claimable
+ P1.7 live repricing — promoted to production, TEST labels stripped),
slippage.html (Arb Radar), tla-stats (arb strip + esc fix + PD flip fix
CONFIRMED live in console: LUNA-ampLUNA PD=$87.24). PENDING one paste:
tla-stats votion-fallback revision. Walk self-chains (~450k/chunk,
time-budget adaptive, endpoint leak fixed + logs scrubbed).

FOUND VIA HAR/console sweep: astro daily cron down 08-02/03 (Astroport
outage per the owner, self-heals; the two missed dailies recoverable later
from Astroport charts history — queued gap-fill); votion flip-day 404
(fixed site-side); "PD Rankings: 0 pools" console line (cosmetic legacy
section — investigate); July-20 astro epoch fallback confirmed ALREADY
LIVE (stale pending-item cleared).

ANNOUNCEMENT GATE (owner): walk completes (~4-5 days) → final
tla-flows-pnl fold + FORCE_ROLLUPS re-home of gap-recovered PD txs +
stale known_gaps closure → QA pass → announce.

NEXT SESSION: ① byte-verify sweep ② SIMULATOR-V2 build (planner port
into slippage.html: wallet selector, zap in/out + multiplier, radar
already in) ③ price-mark audit (SOLID $1 mark, arbLUNA $0.12 vs $0.055 —
radar is immune, tiles are not) ④ daily-CSV gap-fill for 08-02/03 ⑤
verify astro cron resumed (data/daily/2026-08-04.csv exists). Parallel:
test lock matures ~08-10 → exit fixture → lock classifier v2; VERSION
bump rides next platform-crons batch; PL walk after mains.

## 🚀 2026-08-03 (V4) — CLASSIFIER V4 BUILT · archive-walk runner · all gates green

<<FLOWS CLASSIFIER v4>> (additive on v3): `fee` {amount,denom,payer} from
tx-level events; `classifyTransferTx` — wallet↔wallet amp-token moves →
NEW stream `tla-flows/transfers/{YYYY}/{MM}.json` (key txhash:idx). THREE
byte-identical copies (platform-crons walker · flows-fill · NEW
archive-walk.js) — diff-verify per scripts README. NEW
`tla-flows-archive-walk.yml`: explicit [from,to] range against secret
ARCHIVE_RPC, RAW ATTRIBUTE ARCHIVE (`tla-flows/raw/{from}-{to}/part-*.json.gz`,
write-once) + census gate (dep-legs ≥70%, wdr-legs ≥60%, measured-claims
≥95% — thresholds fail the run before publishing thin data) + per-range
manifest.

GATES: classifier 12/12 · flows-fill v4 FULL-CORPUS dry-run EXACT
(31,748 = 15,727/4,499/11,522; 2024 legs 84.5%/76.7% recovered; DP
spot-check: 2024-09 deposit 19D166F0 carries both provide legs) · walk
logic 9/9. Measured: FCD fee blank forever (no auth data archived); FCD
wallet-transfers unrecoverable from the contract-scoped corpus.

**RUN ORDER (the deep backfill):**
1. platform-crons: commit `tla-flows/index.js` (forward cron gains fee+transfers)
2. tla-core: commit flows-fill.js + archive-walk.js + workflow + docs (this ZIP)
3. Dispatch `tla-flows-fill` — re-run upgrades ALL 2024 events in place
   with legs (idempotent, EXPECT-gated, ~minutes)
4. Dispatch `tla-flows-archive-walk` over the hole in CHUNKS of ~400–500k
   blocks (13,737,811 → 21,481,530 ≈ 7.74M blocks ≈ 16 sequential runs —
   dispatch the next chunk when one finishes; write-once raw parts make
   overlaps harmless but keep ranges clean)
5. After walks: re-dispatch `tla-flows-pnl` (ledger/rollup re-derive picks
   up legs + fees platform-wide)
6. Parallel: 1-week test lock matures → lock-exit fixture → lock
   classifier v2 next build; PL deferred walk after mains; state sampler
   next session.

## 🚀 2026-08-03 (FINAL) — WALK PLAN LOCKED · commit set minimized · clock starts

DeFi_Patriot blessed the walk. Final scope adjustments: **lock-NFT marketplace
sales CONFIRMED real** (Boost + Atrium venues, historical sales, the owner's
own early-number purchase) → in scope with payment legs; **lock-exit live
experiment** started (1-week test lock → matured-withdraw tx becomes the
classifier fixture); **Pixel Lions DEFERRED** to its own deeper-window
backfill after the main walk.

State verified live at packaging time: tla-stats.html (T3.1) ✓ committed ·
index.html (floor fixes) ✓ committed · build-pnl v2 ✓ committed · **ledger
PUBLISHED (754 wallet files, index 200)** ✓ · tla-log/index-log/epoch-
ledger spec ✓ committed. Remaining commit set: `test.html` (site) + the
four docs in this ZIP (portfolio-log, this file, roundtrip SPEC, walk
PLAN).

**Next session opener: classifier v4 per PLAN-archive-window-walk.md** —
raw-attribute archive first-class, field-completeness census as the gate.

## ✅ 2026-08-03 (2) — MEMBER-PORTFOLIO P1+P2+P1.1 REBUILD staged (gate 84/84) + Votion layer moved to the ORG feed

**Session record.** Full survey (SPEC-portfolio-tracker, SPEC-portfolio-pnl,
UI-DATA-READINESS, portfolio-log, live-feed verification) → approved plan →
built. New portfolio staged on `test.html` (free since the T3 promotion;
promotes to `member-portfolio.html` on approval). Full feature record in
portfolio-log **Rev 2.0**: net-worth splice banner, daily-archive trend
engine, tiles v2 with drills, live-math Claimable (R2 — broken cron field
replaced), Income card (LP yield + lifetime bribe income + measured rate),
LP 30d sparklines, lock-decay visuals + cliff strip, votes earning-per-epoch,
**Votion re-pointed to `tla-core/votion/snapshots/` with trend + drill from
the org daily archive (running since 2026-07-16)**.

**Wrong-repo catch (recorded per doctrine).** A votion daily-archive rider
was first drafted against the retired `defipatriot/cron-scripts`
votion-positions cron — caught by DeFi_Patriot, discarded. Root cause: the "Votion
daily forfeit" urgency came from the stale 2026-07-16 UI-DATA-READINESS G2
entry plus a 404 on the OLD personal feed's daily path; org-votion has in
fact been daily-archiving since 2026-07-16. Lesson reinforced: **check the
org tree first — G-status in old audit docs is not current truth, and
personal repos receive nothing new, ever.**

**Committing now (this delivery):**
- `defipatriot/aDAO-links-site` → `test.html` (portfolio TEST P1, gate 108/108)
- `defipatriot/aDAO-links-site` → `index.html` (tier-floor label fix)
- `defipatriot/aDAO-links-site` → `tla-stats.html` (**Rev T3.1**: staging
  badge removed + Unlock Runway card — full T3 suite re-run on the edited
  live file, 104/104)
- this docs ZIP (also carries the 2026-08-03 T3 entries — the previous docs
  ZIP was never committed; this one supersedes it)

**Retire candidate:** the personal `votion-positions` cron on Render — the
portfolio page was its last site consumer; org-votion covers the capture
(better VP math, hub-rate pricing, daily archive). Retire per parallel-run
doctrine once DeFi_Patriot confirms no other consumer remains.

**Still reading personal feeds — org successors DON'T exist yet** (kept
alive per parallel-run doctrine; migrations are their own queued builds):
participants / adao-positions current + daily (G1 position-layer extension of
member-data), allies (G8), tla-snapshot (G5 pool-status/apr rollups).

**✅ DONE 2026-08-03: `tla-flows-pnl` rebuild ran (DeFi_Patriot dispatched).**
754 wallets / 116,499 events (was 555 / 36,243); DAO-wide fees $35,898,
zap inputs $2.23M, claimed yield 15.6M LUNA ≈ $2.45M usd@event. Fixture
wallet: 320/132/105 events, fees $128.56 (was $36.55), 7,707.7 LUNA
claimed. The "my true costs are missing" gap is substantially closed;
remaining: exit valuation (Phase C), 4,949 user-null claims, unpriced legs.

**[HOUSEKEEPING — capture layer] `tla-flows/events/index.json` known_gaps
is stale:** the 2026-07-09 gap record still claims 2025-01→2026-06 needs an
archive node, but months_read is unbroken through the span (deep walk
landed). Update or close-out the record on the next org-tla-flows touch so
downstream consumers don't repeat the false claim — the portfolio page no
longer trusts it (it derives coverage from months_read), but the record
itself should tell the truth too.

**(superseded) ⚡ prior ACTION text: re-run the `tla-flows-pnl` workflow.** The
rollup's builtAt is 2026-07-27 — BEFORE the deep walk filled the 18-month
hole. The 2025 event months now hold 9–20MB each (fixture wallet: 97 events
in 5 sampled 2025 months). A manual dispatch of the existing Action rebuilds
Lifetime Cost & Activity with the hole-era deposits/withdraws/claims — this
is most of the "my true costs are missing" gap, zero code needed. (Remaining
after rebuild: withdraw/exit valuation = pnl Phase C; direct non-zap deposit
costs = classifier limitation, stated on-card.)

**✅ BUILT (this delivery): SPEC-portfolio-epoch-ledger v1** — build-pnl
v2 in this ZIP (`.github/scripts/tla-flows/build-pnl.js`): same pass,
second output `tla-flows/pnl/ledger/` (754 per-wallet epoch files, e96→197).
Builder gate 22/22 on real repo data (rollup byte-invariance, determinism,
DP June-2025 epoch hand-reconciliation, Σ-epoch==rollup exact). Page
deep-history mode in test.html (gate 97/97). **Deploy order: commit this
ZIP first, dispatch `tla-flows-pnl` (no yml change — it already commits
all of tla-flows/pnl/), THEN the page's deep mode lights up** (it 404s
gracefully until the ledger publishes). Upgrade path unchanged: archive
state sampler adds the per-epoch VALUE tier in place.

**(spec text below predates the build)** SPEC-portfolio-epoch-ledger:
per-member epoch-by-epoch position + value reconstruction to TLA genesis
from the now-complete flow capture — feeds the trend chart's page-back
buttons and the P3 timeline. Build after the pnl rebuild proves the
hole-era events; plan+approval before code.

**NFT-floor finding (resolved page-side, no capture work needed):** Atrium
listings were ALWAYS captured (summary.marketplaces.atrium, listing_floor
in floor-history) — the overvaluation was a VALUATION POLICY bug (sales
floor used while live listings sat lower). Portfolio now marks at the
conservative floor; index.html tier-floor labels clarified. Any page
valuing NFTs from sales_floor_usd alone should adopt the same min() policy
on next touch.

**Verify on screen (live chain reads, stubbed in gates):** sibling-chain
balances + pending rewards (cosmos.directory rests), native staking
pending, ampCAPA gov row — if the derived sibling addresses come up empty
for wallets known to hold ATOM, that's the coin-type-330 derivation caveat:
use the new "link address" affordance.

**Floor-consumer audit complete (DeFi_Patriot 2026-08-03)** — table in
index-log. Two further fixes shipped in index.html: the headline Unbroken
Floor tile (was BBL-only — now the lowest non-broken listing across
BBL+Boost+Atrium) and the NFT mcap mark (midpoint → conservative min).
Remaining queued: wire the dormant backing-vs-floor chart floor layer to
org floor-history; live member-portfolio.html retires on promotion.

**PRE-WALK COMPLETENESS SWEEP DONE (owner: "make sure we get it all") —
master checklist committed as `PLAN-archive-window-walk.md`.** The sweep
found the events-without-costs disease in FOUR more places (lock legs with
args_unknown + missing lock exits/transfers; user-null claims; gas never
captured; NFT payment legs) and sets the structural insurance: **archive
the RAW wasm attributes of every matched tx during the walk** — walk once,
classify forever; future oversights become local re-derives, not lost-
access tragedies. Field-completeness census thresholds gate the walk
itself. Pixel Lions doctrine recorded: phoenix-era scope only (Classic-era
history is on another chain — stated, not chased).

**✅ ARCHIVE ACCESS CONFIRMED LIVE (DeFi_Patriot 2026-08-03). Build order for
the access window — in priority, each gated before the next:**
1. **Classifier v4 + full re-walk** (SPEC-portfolio-roundtrip-pnl §3 —
   token legs on every provide/withdraw/zap-out + LP-transfer events).
   Unlocks true round-trip P&L to genesis.
2. **Historical STATE sampler** — per-epoch pool reserves + LP supply +
   amp exchange rates + hub rates. Unlocks the value curve, amplified-
   compounding attribution, and LST cost bases.
3. **classifyNftTx v2 + ADAO collection re-walk** — capture the PAYMENT
   legs (mint price, sale price, denom, payer). Answers "mint USD cost for
   every NFT in circulation": today we have sales/listing history and
   FCD-era provenance pricing, but hole-era mint payments were captured
   WITHOUT the payment leg — the v2 walk closes that permanently.
4. **Ally collections onboarding** (Pixel Lions + TLA lock NFTs) — the
   capture registry is already multi-collection by design; each ally is a
   registry entry + a collection walk (+ a floors source where a
   marketplace lists them). Walk them while the archive lives; supporting
   those who support us is the point.

**aDAO treasury profile (DeFi_Patriot Q3): viewable NOW** — the treasury's full
position record was already captured (feed: "aDAO Treasury",
terra1sffd…3m5vzm, ~$13K) but the portfolio page never surfaced it; fixed
this delivery (merged into the registry + a welcome-screen chip). Note the
UNMINTED 5,828 sit with the mint wallet, not the treasury — an "unminted
tier" line for DAO-wallet views is queued alongside the round-trip work.

**(answered) prior decision flag:** The round-trip P&L DeFi_Patriot specced (SPEC-portfolio-roundtrip-pnl,
in this ZIP) is blocked on a classifier-v4 re-walk: verified against raw
events — provides and withdrawals carry NO underlying token amounts today
(units + action names only), so exits and direct entries are unvaluable
until the re-walk captures the token legs the chain logs already contain.
FCD era re-walks anytime; the hole era re-walks ONLY while the archive
grant lives. If it's live: v4 re-walk + state sampler are the next two
builds, ahead of everything. If lapsed: v4 ships anyway (FCD + forward),
hole-era exits stay honestly blank until access returns.

**"Up or down overall?" — the real answer needs two derives (queued in
priority order):** (1) **archive STATE sampler** (the access-window build)
→ per-epoch pool state → the ledger's VALUE tier lights up in place → the
whole-life chart gains the actual position-value curve; (2) **P&L Phase C**
(exit valuation + direct-deposit costs) → a true measured net P&L number
for the story card. Both consume products that already exist after this
session; nothing captured today blocks them.

**Queue adds / carries:**
- [PENDING] **R3 — pnl builder monthly buckets** (per-wallet per-month event
  counts + claimed USD): unlocks the P3 activity timeline + income curve
  without page-side 9MB event fetches. GitHub Action derive extension.
- [PENDING] Portfolio P3: activity timeline + heatmap (needs R3), NFT
  floor-trend mini from floor-history, full by_pool P&L render.
- [WATCH] LP APR "next ep ≈0%" lines on flip day (Rev 1.3 vote-shift feature
  reading transition-state feeds) — verify on epoch day 2+; if persistent,
  guard the projection when distributions/pool-status disagree on period.

## ✅ 2026-08-03 — LOWER-HALF REBUILD: test.html Rev T3 (six review items, one cumulative build, gate 99/99)

**Session-start verifications all green:** pd-bribes heartbeat ok 20/20 verified /
0 unmatched / 427,876.955482 LUNA · price-history 2026/08 latest day-row **36
tokens incl. FUEL + ATOM** (token-catalog effective-first fix's first daily run
confirmed working) · live test.html = T2.6. **Epoch flipped 196→197 at
2026-08-03T00:00Z mid-session** — day-1 fallbacks engaged for review.

**test.html Rev T2.6→T3 (cumulative, staged, pending the owner's live review):**
Pool Health reorg (DEX tags Astro-blue/Skeleton-orange on all rows incl. member
mode, chip diet → funder tags to hover+drill, sticky column header, bucket
net-flow figures) · **waterfall shift view** (ghost outline at locked-in size +
green/red hatched delta, total-shift labels, tooltip decomposition = cast-vote
drift + Votion planned — an identity, both measured; bucket shift-summary line
with top-3 movers) · **ampCAPA gov fix** (live DAODAO voting-module read per
selected wallet, ampcapa-tool contract chain: balance × ve3 rate → ampCAPA ×
hub-ratio price; re-attributes the false "withdrawn" row ONLY on chain-confirmed
balance; purple "staked in ampCAPA Gov · still TLA" chip) · **growth tile v2**
(per-epoch real-flow bars, 4/8/all window toggle, LUNA-family vs
everything-else split cards, Base-retained % gauge) · **zap planner** (member
zap-out 25/50/75/100% → LUNA/USDC/SOLID/+dropdown; zap-in mode; direct-vs-two-
hop-via-LUNA routing from live reserves, routes named on hover, same-pool
reserve shrink on exit, honest "no TLA route" for unroutable legs; simulator
card collapsed by default) · **footer refresh** (disclaimer one-liner +
expander, credits → thealliancedao/tla-core, PD Watch "soon" slot).

**Gate 99/99** (jsdom + real committed fixtures, fixture-derived assertions,
DeFi_Patriot acceptance wallet for member flows). HONESTY: the T2.6 98-suite
was session-local and lost with that sandbox — suite reconstructed to the same
surfaces + T3 coverage; extend-never-reset resumes from 99. ampCAPA LCD leg is
stubbed in-gate (schema-exact per ampcapa-tool queries) — **live verification =
DeFi_Patriot selects an affected wallet** (current fixture pair shows six wallets with
an ampCAPA row and ~zero receipt balance: Rebel_Defi et al.).

### QUEUED (new this session)
- [ ] **Boundary-snapshot rider:** stamp per-pool aDAO + per-member VP at
  lock-in (epoch boundary) so the waterfall's member/aDAO shift decomposition
  becomes exact instead of honestly-absent.
- [ ] **adao-positions cron rider:** capture each member's ampCAPA gov-module
  receipt balance (list_stakers sweep) so the page's live read gains a cron
  fallback + the archives carry the position.
- [ ] **Rankings-tab retirement** — the owner's call, not taken unilaterally.
- [ ] Parked ideas (offered, untriaged): VP-composition stacked epoch chart ·
  epoch clock ribbon · Bribe-ROI ($/VP) column on Pool Health · full zap matrix
  on slippage.html.
- [ ] Promotion: test.html → tla-stats.html after live review.

---

## ✅ 2026-08-02 (3) — EVENING: BRIBER BOARD T1→T2.6 · ROLLUP REBUILD (PD #1) · FUEL PRICED · pd-bribes PRODUCT LIVE 20/20

**Rollup rebuild (FORCE_ROLLUPS) cashed the whole capture arc at once:** 17→**32
bribers**, 2,924→**10,002 attributed events**. Phoenix Directive lands **rank #1**
(189 events, **427,876.96 LUNA**, $36.6K at placement, 2025-04→2026-07); Solid's
current wallet on (15 events, $15.8K); DeFi_Patriot's hole-era fixtures merged
(walk had already descended past h17.13M). The T1 amber backfill note
**self-removed** — 0/19 tokens with ledger gaps, its designed retirement.
LUNA attribution computes **104.6%** (spanning-vs-floor overlap) — cap-and-explain
queued. `rollups.js` shipped `by_epoch.n` (total event count incl. pool-null
governance legs) so PD's modal epoch chart renders its real history.

**test.html Rev T1→T2.6 (cumulative, gate 98/98, staged for promotion):**
volume board All/Astro/SS + APR Amp/Non toggles · utilization stale-gap tiebreak ·
briber label scheme (registered handles bold sky, protocol labels bold orange) ·
tribute-bucket names · clickable briber rows → deep-dive modal · boardExpander
collapse everywhere + three Pool-Tops expanders · hero band v2 (merged Active
Pools, NEW TLA TVL tile, sparklines from poolStatusHistory, movers diverging
bars, stale/take-rate mini bars, freshness chips, uniform label/value/sub/pill
tiles, whole-tile drills) · **three-mode bribers card**: Bribers / **Earned**
(all-time claimed per wallet from rollup `voters[].claims`, valued at claim date
— lower bound per `claim_coverage`) / **Pending** (renamed) · **Pending mode now
computes live vote-share × pots per member** (the tile's math, shared fn) —
AUDIT FINDING: `adao-positions summary.total_pending_bribes_usd` is BROKEN
(11/155 wallets nonzero, max $26.62 vs $960 live pots, values unstable between
loads); page no longer consumes it — **cron field fix-or-retire QUEUED**.

**FUEL arc:** all "missing" FUEL bribers were captured all along — three unnamed
wallets, spanning placements (main: ONE 900K-FUEL tx 2026-03-10 spanning
e176→e200 = 36K/epoch, runway ends e200). Identity labels deliberately NOT
added (pattern ≠ identity; wallets.json untouched). **price-history FUEL
points committed** at true capture dates only: e165/166/167/169 contemporaneous
captures ($0.00392/$0.00429/$0.00452/$0.00374) + reserve-implied 2026-03-10
$0.00272878 (dex-liquidity provide ratio × LUNA coingecko; corroborated by
e177 manual $0.00292). Oct-2025 wallet stays honestly unpriced. Post-rebuild:
main FUEL wallet **$2,545.88 → rank 6**. The fuel-tool's today's-ratio estimate
series was REJECTED as a source (the stale-ratio sin).

**token-catalog forward-append fix (deployed):** daily price-history append read
`discovered.symbol` only — **20 PRICED tokens silently dropped daily** (ATOM,
stLUNA, stATOM, INJ, xASTRO, wBTC variants, FUEL…). Effective-first now (the
buildTokenMap convention). **VERIFY next daily run: Aug day-row token count
~16 → ~35+.**

**pd-bribes product v1.0.0→v1.2.0 (SPEC-pd-directive-watch data layer) — DEPLOY
VERIFIED:** heartbeat `status: ok`, **20/20 proposals verified, 0 unmatched
either side, 427,876.955482 LUNA, zero flags** — every PD proposal ever
executed (ids 141→250) matched to its captured chain execution. The two honest
failures were the diagnosis: v1.0 flags revealed the ve3 AddBribe schema
(`bribe`/`gauge`/`for_info`/`distribution`), v1.1 matched amounts to the digit
but read denom None → **ve3 AssetInfo is cw-asset dialect** (`{native:"uluna"}`
/ `{cw20:addr}`), both dialects now parsed. Design: match by (denom|net)
multiset ONLY; **spans come from the matched chain events** (`distribution`
stays opaque, never decoded); msg net cross-checks funds−fee; 10-LUNA fee
excluded everywhere; executed-but-uncaptured proposals flagged never merged.
Product replaces `tla_pd_bribes.json` permanently — page T2.6 consumes it
gid-keyed (no name matching), stale note self-retired, PD modal By-pool filled
("from proposal-state derive"). Proposal titles carry PD's stated basis
verbatim ("vote incentives based on trading efficiency + volume") — Watch-page
epigraph material.

**Doctrine recorded:** (1) honest-failure heartbeats self-diagnose — refusing to
publish garbage twice handed us the fix both times; (2) DAO proposal-module
STATE is a permanent archive-free source for governance-executed payloads;
(3) capture runs ahead of presentation — every "where's X?" tonight (PD, his
bribes, FUEL, Solid) was already in tla-core awaiting render; (4) effective-first
symbols everywhere (append had diverged from buildTokenMap); (5) when designed
behavior changes, gate truths update WITH the cause asserted (note
self-removal gated as gaps==0 && !note). NOTE: PROJECT_KNOWLEDGE.md referenced
by session doctrine does not exist in tla-core — session grounding is THIS
file + changelogs + specs.

**Queue (this session's adds):** adao-positions `total_pending_bribes_usd`
fix-or-retire · bribe_ledger >100% cap-and-explain · freeze/retire legacy
`tla_pd_bribes.json` (unreachable fallback now) · price-history append token
count verify (next daily) · **NEXT SESSION: tla-stats LOWER HALF build** (then
test.html→live promotion after the owner's review) · PD Watch page views 1–4
(spec committed, product live, view 4 gated on SS /api/pools).

## ✅ 2026-08-02 (2) — APR/PRICING REPAIRS DEPLOYED & FORMULA-VALIDATED · R3a QUEUED

**Shipped + live-verified:** org-votion **1.2.0** (LST hub-rate three-link
pricing, gate 48/48; first run clean: arb hub 2.9922 / amp hub 2.2477, zero
fallback, corrected holder USD lands on the next daily Branch-B pass) ·
dex-data **1.3.1** (eris-apr rider per AUDIT §Gauge-LP-APR, gates 59/59 then
64/64 with the token-catalog price fallback; live: all 28 chain-input shapes
parsed first try, 2/28 singles fully priced through the Astroport outage).
Personal votion-positions patch RETRACTED pre-commit (retiring doctrine;
org Branch B is the successor — recorded in cron-votion-log Rev 2).

**RECONCILIATION: FORMULA PASS (audit §Validation).** Eleven pools vs Eris's
live screen same-day: our gauge math reproduces their "Rewards $" column TO
THE DOLLAR; dotted % = our `eris_apr_pct`, flame = our `eris_apy_pct`;
near-zero-fee pools match ±0.06pp, residual = the stated trading-fee
substitution exactly. ERRATA folded in: the "amp ≈1.34" was the STALE legacy
ratio (true amp ≈2.25 — ampLUNA positions were ALSO ~1.68× understated).

**Waiting on Astroport only:** their tRPC broke 06:01→10:02 (org pulled 276
pools fine at 06:01 — outage is theirs, not blocking). Hourly cadence
self-heals; first green run prints 28/28 → product-level spot-check → clear
`meta.validation` → R4 page repoint becomes legal.

**Queued from this arc:**
- [ ] **R3a — realized-APR history derive (SUPERSEDES the provisions-model
  path for covered spans):** historical APR from CAPTURED tla-voting
  distributions (actual per-pool pots per epoch × price-at-epoch ÷
  staked-at-epoch), take/cut/convention layers per the validated formula →
  org `apr-history` product; pages repoint, personal apr-history.json
  freezes. Pure derive, no archive dependency. State-sampler still covers:
  displayed-figure reconstruction where inputs varied + hub-rate history for
  LST cost basis (check `last_reward_change_time` first — may chain-prove
  weights constant, turning that leg measured-for-free).
- [ ] Registry curation: `terra1kye343…a2ue88` "Eris ampLUNA Hub" label is
  the MISLABEL (real hub = `terra10788fkzah…`, cross-validated by catalog
  ratio 2.2308) — fix in known_contracts.json next touch.
- [ ] Changelog-home inconsistency: dex-data has BOTH in-folder CHANGELOG.md
  (richer, used) and docs/changelogs/cron-dex-data-log.md — pick one home,
  deprecation-note the other (one fact, one home).
- [ ] R4 (site batch): APR surfaces repoint to published
  `eris_apr_pct`/`eris_apy_pct` (labeled APR/APY per the dotted/flame
  convention), page-side APR math retired; member-portfolio Votion card
  repoints to `votion/snapshots/current.json` under parallel-run, then the
  personal votion cron retires on Render.

---

## 🚀 2026-08-02 — DEEP WALK RUNNING (E1 granted; endpoint in secrets only) + completeness review closed

Rev 12 has full detail. Live now: full-depth walk (13.74M→head) on a granted
community archive endpoint, self-chaining unattended; action filters ✓ (64
pair walks GO incl. the 27 SS pairs added pre-walk — registry at 81 entries).
Pre-launch: investor/project completeness review closed (state-sampler
spec'd pending `state_depth` probe; Credia leverage stream scoped; SS in);
full-depth E2E shakedown on exact bytes → ✅ COMPLETE, 8/8 fixtures.
**On walk completion:** verify §10 verbatim + prop-247 real hash + early
Votion entries; then E3 unblocked on a COMPLETE record. **During access
window:** probe state_depth; build state sampler + Credia if green.

---

## ✅ 2026-08-01 — STAGED HARVEST 54/54 COMPLETE + AUDITS CLOSED (session wrap)

Full detail: cron-tla-voting-log Rev 11. Headlines: free-fleet staged harvest
recovered the walker era + hole tail (Jun 2 2026→head) across all 54 registry
entries — flows fully v3 (test-tx fixtures VERBATIM, seam sealed), 4 new
streams born (dex-liquidity/prices/votion/NFT), June prune gaps healed, PD
prop 250 corrected to chain truth (11 legs / 38,155.10 gross — old 34,763.53
figure RETIRED). Eris APR/pricing audit CLOSED → `AUDIT-eris-apr-pricing.md`
(arbLUNA 2.2× understatement root-caused: missing LST hub-rate link; Eris
shows APY not APR). Deep remainder (Jan 2025→Jun 2026) honestly open in the
registry; Eris archive ask sent (they run their own phoenix node — preflight
probe of phoenix-lcd/rpc.erisprotocol.com queued for the owner's machine).

**Next-session queue (priority order):** (1) walker WATCH rider — new streams
are frozen-forward at walk head, free retention window ticking; (2)
arbLUNA/APY fix per the audit doc (fresh pulls: votion cron + site price
layer); (3) census persistence fix (rides #1's batch); (4)
hole-reconciliation derive (edge-delta chips + deep-walk verification
harness); (5) E3: rollups over new data → build-pnl → portfolio card v2
(two-lens) → tax export → site update. Sunday's rollup flip puts PD's
38,155.10 on the board automatically.

---

## 🔧 2026-07-31 (3) — E2 EXTENSIONS: FULL-PICTURE P&L CAPTURE BUILT & GATED 8/8 (SPEC-registry-extensions-pnl v2)

Portfolio audit → approved extensions → live 8-tx test matrix (owner:
blocks 22,163,785–896) → built. Batch: **platform-crons** flows v3
(multi-flow fix + amp rate curve + both-sides liquidity) + aux-classifiers
(Votion/pairs/NFT + mergeKeyed); **tla-core** registry v2 (54 entries),
E2 job routing + action-filter probe, fixtures v2 (8), spec v2 (Votion =
archive leg of SPEC-votion-capture; NFT = adao-provenance hole-fill; tax-prep
CSV export named; forward capture DECIDED as walker WATCH rider). Deploy:
commit both batches (platform-crons folder deploy restarts org-tla-flows at
3.0.0 — forward captures v3 immediately); E2 walk unchanged otherwise.
Open: walker WATCH rider build; Votion vault attr fixtures (optional live
test pair); census persistence fix (tla-voting cron) still queued.

---

## 🔧 2026-07-31 (2) — E2 REGISTRY BACKFILL JOB BUILT & GATED (deploy-ready; walk awaits E1 endpoint)

**Commit-audit catch first:** spec §10 (DeFi_Patriot's two hole-era bribe
fixtures, delivered 07-30) was never committed — main's spec ended at §9.
Fixed in this batch: §10 appended to `SPEC-capture-registry-backfill.md` AND
mirrored machine-readable in `tla-voting/backfill-fixtures.json` (the job's
completion gate; registry stays cursors-only).

**Built (this batch, all in tla-core):**
- `.github/scripts/tla-voting/registry-backfill.js` — the E2 archive walk.
  Dual checkout, require()s LIVE platform-crons classifiers (no third copy).
  Modes: preflight (capability probe) / walk (DRY_RUN supported) / gate
  (offline self-tests). Voting entries target the committed voting cursor
  (full walker-era re-derive at v6.1 → recovers PD props 250/247 from the
  pre-promotion stretch); flows entries target the derived v2-deploy head.
  Floors honor stream known_gaps left edges. Per-window git checkpoints;
  TIME_BUDGET_MIN clean stop; done-stays-done. Census histogram →
  `tla-voting/backfill-report.json` (§5/E0c refund enumeration rides free).
- `.github/workflows/tla-voting-registry-backfill.yml` — dispatch with
  mode/dry_run/endpoint/window/budget/head-override inputs; secrets fallback
  `ARCHIVE_LCD`/`ARCHIVE_RPC`.
- `tla-voting/backfill-fixtures.json` — 5 completion-gate fixtures: his two
  bribes VERBATIM (exact coins/pool/span + fee_funds-out-of-coins doctrine
  assert), PD prop 250 (10 events / 34,763,534,826 uluna / dao_attr),
  prop 247 (37,912.49 LUNA attributed), Solid ×3 1M-CAPA June 2026.

**Gates:** MODE=gate 4/4 on real committed data · full E2E walk vs mock
archive LCD — all 5 fixtures recovered verbatim into the real tree, 2026/07's
203 committed events byte-identical, index 3,014→3,033, re-run adds 0.

**Deploy steps:** (1) commit this batch; (2) `mode=preflight` dispatchable
anytime (clean "E1 pending" without endpoint); (3) when E1 lands: set repo
secret `ARCHIVE_LCD` → preflight → walk `dry_run=1` → walk, re-dispatch until
COMPLETE (§10 gate runs itself); (4) E3: rollup + P&L rebuilds, spec §7 gates.

---

## ✅ 2026-07-31 — CHANGELOGS MIGRATED TO ORG REPO (single home)

All seven per-page site changelogs now live in `tla-core/docs/changelogs/`
(README maps file→page). tla-log gained Rev 6.0/6.1; portfolio-log.md created.
All 17 site pages repointed to the new raw URLs (tla-stats repoint built on the
staged v3 file, regated 49/49). Old-repo (`website-adao-core`) copies
ABANDONED — deprecation notes committed there. **Doctrine: changelog entries
append in docs/changelogs/ at each delivery, not batched at chat end.**

---

## ✅ 2026-07-30/31 — BRIBE RUNWAY + FUNDERS + POOL HEALTH v3 + VOTION INTENTION LAYER (all deployed)

**Capture (platform-crons):**
- `tla-voting/lib/bribe-runway.js` + wiring — hourly forward probe of the
  manager's FUTURE pots (head→+26 until empty) → `tla-voting/bribe-state/runway.json`.
  v1.1 funders overlay: per-pool payer tags from ATTRIBUTED events spanning the
  present — classes dex (4 bucket addrs) / pd / project (registry subtype) /
  user; `has_unattributed` whenever pots exceed events. Chain-verified: the owner's
  LUNA-SOLID = [user · thru e200] `has_unattributed:false` (first fully
  accounted pool); a 2nd bribe of his surfaced (52.57 SOLID e194→195).
  Incident: `readBribeEvents` was try-local → hoisted (one failed run, isolated).
- `votion/index.js` Branch C — Votion optimizer capture (first-party API,
  verbatim) per vault slug + cross-lockup AGGREGATE (planned respects
  isWorthChanging skips; NEW/EXIT notes). All 6 lockups captured once env set;
  live story: +510K VP into ampCAPA before 2026-08-02, PAXG-wBTC −72% exit.
  ⚠ OPEN: `VOTION_OPT_SLUGS` env still not reaching the publishing service
  (old/new votion pair on Render — verify which one).

**tla-stats.html (single file, many revs, gate 49/49):**
- Runway chips (thresholds ≤1 red / 2–4 amber / 5+ green) + funder-class tags
  + "+unattributed"; runway COLUMN colored + click→drill.
- Pool Health v3: ALL pools per bucket; sort toolbar w/ tooltips (staked /
  inflows / outflows / windowed trend / APR / runway / risk); 4/8/12-epoch
  window drives charts+trend+net-flow+sorts+verdicts; column header row;
  row mid-chart (compact, label-overlap fixed); staked ±% vs last epoch;
  plain-English generated VERDICT per drill; who's-paying block; 3-layer
  VOTE SHIFT (casted / Votion planned / total projected); VOTION'S PLAN panel;
  2-column drill layout; dot-color tooltips; composition preface.
- Top Bribers: loud 1%-coverage banner naming absent payers; tribute tooltip
  states these ARE the Astroport take-rate flow.
- APR: 3-layer bug fixed — figure lives on `store.tlaPools.apr_non_amp`
  (vote-pools array never had it); next-ep vote-shift estimate line added.

**member-portfolio.html:** APR cell = Non-Amp / ≈Amp (weekly-compound estimate,
within ±5% of Eris boosted) + next-ep estimate line; xASTRO catalog valuation;
claims-yield line; phase-aware footer. All committed.

**APR CONVENTION (the recurring fight) — status:** SPEC-lp-apr §7 has the
evidence table (ours = emissions ÷ TLA-staked; Eris lower, per-depth+fees; no
held denominator fits all pools — matches CRON-FIXES-BRIEF §2.10's June
conclusion). Backend endpoint disproven live (5 NestJS 404s pasted by DeFi_Patriot)
⇒ client-side computation confirmed. **Fix path (needs no user input): fetch
liquidity-hub HTML server-side → bundle URL → extract Eris's formula from
their own JS → implement vs mapped contracts → validate vs BOTH ground-truth
tables (§2.10 19-pool + §7 4-pool) → publish `eris_apr_pct`.** Interim:
tooltips state our definition explicitly. Session opener: "eris apr".

**Process:** page gates must assert SPECIFIC values in SPECIFIC cells — a
generic "some % renders" stayed green through a broken APR; the owner's
screenshots were the detector twice. End-of-session commit audit remains
doctrine (caught the never-committed chips page).

---

# Changes Pending — TLA Stats platform work queue

> **Home: `tla-core/docs/pending-changes/` — SINGLE HOME since 2026-07-14**
> (moved from `website-adao-core` per SPEC-docs-consolidation; the old copy is
> deleted — never update it). This is the platform-wide work queue: capture
> layer, org crons, AND site work. See `website-adao-core/PROJECT_KNOWLEDGE.md`
> "Tracking responsibilities" for what goes here vs. there.
> Older completed items have been pruned — they live in changelog files
> (`docs/changelogs/*`, `website-adao-core/index-log.md`, etc.) instead.

Last cleared: **2026-06-07** (post NFT inventory Rev B deploy). Rev 0.16 catalog Phase 0 items previously cleared 2026-06-06.

---

## 🔴 2026-07-23 — INCIDENT: flows walker pasted into the tla-voting slot (caught by commit audit)

- **What happened:** during a pencil-paste, a tla-flows `index.js` landed in
  `platform-crons/tla-voting/index.js`, overwriting the voting walker AND the
  wasm census. **Voting forward capture down since 2026-07-22 23:02** (~5h;
  flows unaffected and healthy). No data lost: the walker resumes from its
  committed cursor (22,031,980) well within block retention IF restored
  promptly.
- **Restore shipped (`platform-crons-RESTORE-voting.zip`):**
  `tla-voting/index.js` = the pre-incident walker + census (census gate 6/6,
  syntax OK) and `tla-flows/mock-run.js` = scenario-G update (was also missing
  on main; full flows mock suite ALL GREEN against the live v2 walker).
  ⚠ Paste each file into its EXACT folder — the incident was a folder mixup.
- **Post-restore verify:** next hourly voting run → heartbeat capturedAt
  fresh, cursor advancing, gap window self-healed; then watch
  `unknown_manager_wasm` appear (the census finally live).
- Process note: the commit audit (fingerprint check across all repos) caught
  this within hours — worth running at the end of any heavy paste session.

---

## 🔶 2026-07-23 — SPEC-lp-apr (queued, evidence in hand): the LP APR column omits TLA rewards

- **Diagnosis (the owner's screenshots + dex-data verify):** card shows 5% / —
  where Eris shows 71.23% base / 100.30% boosted / 68.40% single. The feed's
  `pool_apr_pct` is DEX-side only (LUNA-ASTRO fee_apr on-chain: 0.85%; the
  TLA reward emissions — the dominant yield — are absent; single-side pools
  have no dex APR at all, hence —).
- **Shipped now:** column relabeled **"Dex APR†"** with a tooltip stating
  exactly what's excluded — the number no longer implies total yield.
- **The model to build (all inputs org-side already):** per-pool reward APR =
  latest-epoch distribution coins (tla-voting distributions harvest) × catalog
  USD × 52.14 ÷ `staked_in_tla_usd` (snapshot); amplified positions show the
  boosted figure (amp multiplier), non-amp the base. Conventions to fix in
  the spec: base-vs-boosted display, TVL denominator, price source + capture
  time, epoch annualization. **Acceptance fixture: DeFi_Patriot's LUNA-ASTRO
  must reconcile to Eris's displayed 71.23% / 100.30%, xASTRO to 68.40%**
  (same-day capture tolerance stated). Also shipped this batch: xASTRO
  render-time catalog valuation (asterisked, excluded from tiles until the
  org positions migration) + phase-aware P&L footer.

---

## ✅ 2026-07-23 — P&L PHASE B SHIPPED: the yield leg is measured

- **build-pnl.js Phase B** (deploy = commit + Run `tla-flows-pnl` workflow):
  wallet claims valued as LUNA at claim-day price — reward denom EVIDENCED by
  the vault-claim census (4,484/4,484 native:uluna) and GUARDED at build (any
  non-LUNA vault denom aborts publish rather than mispricing). Per-wallet
  `claimed_yield` + `by_pool` (deposit/withdraw/claim counts + claim USD per
  pool); claims block reconciles records vs pool-entries exactly
  (measured_records + v1_unmeasured == count, asserted per wallet).
- **Gate on real committed data:** DAO claimed yield **$567,984 / 1,197,236
  LUNA** valued; fixture DeFi_Patriot: 56/59 records measured → 147 pool
  entries → **1,469.36 LUNA ≈ $575.15**; idempotent (2 runs byte-identical
  sans builtAt); v1-era remainder honestly labeled until E2.
- **member-portfolio.html claims line upgraded** (data-layer, 1-line block):
  shows measured yield + unmeasured residual when Phase-B fields present;
  v1-honest fallback otherwise (safe against a pre-rebuild rollup).

---

## ✅ 2026-07-23 — FCD ERA UPGRADED TO v2 ON MAIN (↑31,748) — verified

- **Re-fill EXECUTED & BYTE-VERIFIED:** ↑204/↑4,879/↑6,028/↑8,228/↑10,155/
  ↑2,254 across 2024/08→2025/01; committed months confirmed: 100% of v2
  deposits/withdraws carry `pool` (+`gauge`), claim arrays live with per-pool
  `reward_amount`, vault cycles carry `claimed_coins`, ZERO v1-field
  integrity regressions. Fixture: DeFi_Patriot's 2024-09-01 deposit pooled;
  2024-09-03 claim shows per-pool amounts. Month totals unchanged
  (upgrade-in-place; the non-↑ remainder = gap-fill-era records untouched,
  correct).
- **Three latent defects flushed & fixed on the way (each with the general
  fix, counted anchors, and a real-data gate — logged for the pattern):**
  (1) publish guards in all 3 homes only checked `added` → now
  `added||upgraded`; (2) flows-fill lacked the classifier's host `WATCH` map
  (only home without it; now defined + documented as the shared block's host
  contract; fill scripts are now EXECUTED in gates, not just syntax-checked);
  (3) flows-fill's mergeMonth return omitted `upgraded` (replace pattern
  unasserted — the exact `count==1` doctrine violation, thrice tonight;
  real-live-month merge gate added: 296 base + 204 incoming → ↑204).
- **EXPECT invariant updated to v2 truth** (31,748 / claims 11,522; the −867
  = tribute plumbing correctly excluded, verified per-drop).
- **Remaining for full v2 coverage:** walker era Jun-16→v2-deploy stays v1 —
  E2 re-derives it (registry `e2_note`); forward capture is v2 from deploy.
  Phase-B P&L rollup legs (claims valuation, per-pool cost basis) now have
  their data — next build session.

---

## ✅ 2026-07-23 — SCHEMA-UPGRADE MERGE shipped (v2 re-fill unblocked) · corrected re-fill path

- **retained-gap-fill "nothing to do" diagnosed:** its cursor says the window
  is harvested — at v1. AND `mergeMonth` was skip-on-txhash, so ANY re-fill
  would add 0 and leave v1 in place. **FIXED in all three classifier homes:**
  higher `schemaVersion` for a known tx replaces in place; lower/equal never
  overwrites (idempotent, never-shrink preserved); `upgraded` count returned.
  Gates: merge unit 5/5 · full flows mock suite 38 ✅ / 0 ❌.
- **Corrected re-fill path:** (1) commit this batch; (2) dispatch the FCD
  flows fill workflow (`tla-flows-fill`) — the frozen archive re-derives the
  whole FCD era at v2 and the upgrade merge swaps records in place (expect a
  large `upgraded` count, `added` ≈ 0); (3) the walker-era v1 stretch
  (Jun-16 → v2 deploy) is NOT Action-re-walkable (block retention) — folded
  into E2 instead: registry flows entries now carry an `e2_note` extending
  their walk to the v2-deploy head. retained-gap-fill itself needs no state
  surgery — its deepen probe duty is unchanged.

---

## ✅ 2026-07-23 — FLOWS CLASSIFIER v2 SHIPPED (pool identity + claim amounts) · tribute=bucket identity resolved

- **`<<FLOWS CLASSIFIER v2>>` built, gated, delivered** — installed
  byte-identical in ALL THREE homes (platform-crons/tla-flows/index.js,
  tla-core/.github/scripts/tla-flows/flows-fill.js + retained-gap-fill.js;
  count==1 literal anchors, cross-diffed). Additive: every v1 field unchanged;
  new per-record `pool` + `gauge`; claims measured (`claims` array of
  {pool, reward_amount, gauge} from asset/claim_rewards — one event per pool;
  `claimed_coins` denom:amount on compounder vault cycles, mechanism
  'amplified_vault', user null BY MEANING). All fields evidenced by a
  55,199-tx FCD attribute census — 100% attr presence per class, nothing
  inferred.
- **v1's null-user/foreign-claim defect FIXED at the classifier:** loose
  /claim/i matched foreign vesting `claim` events (no user attr → the 1,532
  null-user claims) AND misclassified 867 tribute-contract take-rate cycles
  as member claims. v2 restricts to watched shapes; tribute plumbing stays in
  the voting stream where it's already captured as bribes.
- **Gates:** binding mock-run ALL GREEN (38 ✅ 0 ❌; scenario G updated —
  v2 asserts defense-in-depth classifier rejection, replacing the obsolete
  v1-defect-proving assert) · full-corpus parity gate 32,777 txs: pool on
  100% of 15,727 deposits + 4,499 withdraws, gauge 100% of deposits,
  parityFail=0 on all v1 fields, 10,253 wallet claims with per-pool amounts,
  1,269 vault cycles with coins, 867 drops all verified tribute plumbing.
- **IDENTITY RESOLVED: the four gauge tribute contracts ARE the four
  asset-staking buckets** (addresses byte-equal in config) — one contract per
  bucket stakes LPs and recycles take-rate as bribes. Registry updated:
  labels amended, tribute entries carry streams [bribes, flows], compounder +
  zapper added, TODO_FLOWS_HUBS removed.
- **Deploy:** platform-crons (index.js + mock-run.js) → Render forward runs
  capture v2 immediately; tla-core (.github twins + registry). Then re-run
  `tla-flows-retained-gap-fill` once so the retained window re-fills at v2
  quality (⚠ the time-sensitive item — do this promptly). P&L Phase-B rollup
  legs (claims valuation) unblock after the first v2 data lands.

---

## ✅ 2026-07-23 — Watchdog LIVE: first report analyzed · reconcile un-broke · calibration fix

- **Reconcile Action was silently dead since the monthly restructure** (it read
  pre-restructure `*-events.json` consolidated files — ENOENT; the committed
  reconciliation.json was stale). FIXED: `readEvents` consolidates the monthly
  layout in-process (height-sorted, legacy fallback kept). First fresh run
  2026-07-22T23:21: votes 728 MATCH / 8 MISMATCH / 27 CHAIN_ONLY (94.92%) —
  confirms vote losses fresh; locks Δ 0.0000% perfect.
- **First live pot_watchdog report — every alert dispositioned:** CAPA 300K
  (his 3×100K exactly), USDC, LUNA(span e147) = clean hole signatures ✓.
  ASTRO flagged = CALIBRATION ARTIFACT (assumed_current used max epoch_END;
  one e193→e200 spanning bribe overshot it, staling single-epoch e195 pots) —
  FIXED: max epoch_START, mock re-gated 4/4, ASTRO clears next run.
  `ibc/4B44…3961` never_captured 36K live: INSPECTED — state flow starts
  p154 (deep hole) → hole-era first placement spanning forward; walker
  exonerated; E2 recovers payer; watchdog keeps watching for post-e195 pots.
- Deploy: replace `.github/scripts/tla-voting/reconcile.js` (this batch),
  re-run workflow → expected: 4 alerts, all hole-dispositioned, ASTRO covered.

---

## ✅ 2026-07-23 — E0c: unknown-manager-wasm CENSUS shipped (chain-truth over source-hunt)

- **Refund-event discovery redesigned:** the ve3 contract source is not
  publicly locatable (org pages truncated/robots-blocked, name probes + crates
  search exhausted — session evidence). Better path shipped instead:
  **platform-crons/tla-voting `index.js` now censuses every incentive-manager
  wasm `action` the classifier doesn't process** (known set:
  `bribe/add_bribe`, `asset/track_bribes_callback`) — per-action counts +
  first-sample with full attributes into the heartbeat
  (`unknown_manager_wasm`). One epoch rollover hands us the refund/rollover
  event's REAL shape from live traffic; every future unknown event class
  surfaces the same way. Observational only — zero stream events produced,
  capture cannot be corrupted.
- **Gates:** binding mock-run parity 115/1 IDENTICAL to unpatched baseline
  (the 1 failure is PRE-EXISTING fixture drift: "union grew past state-only
  (205 > 406)" — message reads inverted; investigate before next classifier
  deploy — new queue item) + targeted census gate 6/6 (unknown counted &
  sampled once, known skipped, other-contract skipped, tx anchor kept).
- **Deploy:** replace `platform-crons/tla-voting/index.js`; Render picks it up
  next forward run. After the next Wednesday epoch rollover, read
  `tla-voting/events/heartbeat.json → unknown_manager_wasm` — the refund
  action name + attributes will be sitting there; then: add to
  BRIBE_ACTION_KEYS/known-set, extend §5 gate, fold into E2 registry pass.
- [ ] NEW: mock-run fixture drift (the pre-existing 115/1) — fix the union
  assert or refresh fixtures; gate must be 116/116 before any further
  classifier deploy beyond this observational patch.

---

## ✅ 2026-07-22 (night) — E0 EXECUTED: watchdog built & gated · over-attribution DIAGNOSED · registry committed

- **POT_WITHOUT_PLACEMENT watchdog BUILT & MOCK-GATED 6/6** — `reconcile.js`
  patched (shape-tolerant recursive pot scanner; per-denom classes:
  `never_captured` = walker-bug candidate vs `no_current_placement_event` =
  hole signature; `assumed_current_epoch` declared, informational v1, verdict
  untouched). Gate: real committed streams + crafted 3-case chain mock (SOLID
  covered / CAPA hole / fake never-seen) — all classified correctly. NOTE for
  ops: the reconcile Action consolidates monthly streams into
  vote-/lock-/bribe-events.json before running — unchanged, gate reproduced it.
- **Over-attribution DIAGNOSED, hypothesis history closed:** NOT withdraw
  netting (zero withdraws both tokens), NOT span-beyond-harvest (harvest
  walked to p96, spans end e148/e117), NOT duplication (5 distinct txs).
  Confirmed by elimination: **state = distributed, events = placed** — the
  surplus is placed-but-never-distributed and `event_surplus` already
  declares it. Real gap: refund/expiry/rollover is a MISSING EVENT CLASS
  (stream vocabulary is only bribe_add + withdraw_bribes). E0c: enumerate
  manager-emitted events from ve3 contract source → extend classifier →
  backfill refunds in the same E2 pass. Spec §5/§7 rewritten to match.
- **`tla-voting/capture-registry.json` COMMITTED** — 9 entries (manager,
  controller, escrow, 4 tribute contracts, PD core, flows-hubs placeholder
  blocked on classifier v2), cursors at hole floor 13,737,811.
- Still blocking: **E1 archive access (owner)** + his wBTC/ATOM bribe dates.
  Next build: E0c contract-source event enumeration + flows classifier v2,
  then the E2 job itself (transport-agnostic, plug in the endpoint).

---

## 🔴 2026-07-22 (late) — GAP SURVEY: the hole is the story · SPEC-capture-registry-backfill DRAFTED

- **Full per-token bribe-attribution survey run (committed data):** 12 tokens
  show the same hole-era gap DeFi_Patriot spotted in CAPA — LUNA 1.0%, CAPA 5.7%
  (18.8M CAPA ≈ $20K unattributed), ASTRO 20.2%, ROAR 22.4%, ampLUNA/USDC
  ~57%, five ibc tokens at 0%. SOLID/WHALE/ampROAR/MOAR ~100% complete. The
  ledger has been measuring the missing mass all along; boards honestly show
  only the attributed slice.
- **Walker verified NOT the culprit (working conclusion):** live window has 3
  payers, zero CAPA placements, yet a live 100K-CAPA pot on ampCAPA — bribes
  span epochs (fixture: DeFi_Patriot's July add covers e193→e200), so
  hole-era placements still burn in current state. §6 watchdog makes this
  self-verifying forward.
- **NEW defect class found: OVER-attribution** — ibc/517E…D84E at 114.3%,
  ibc/…AC5E at 120.0% (attributed > measured flow). Hypothesis: bribe
  withdrawals not netted in briber attribution. E0 fix + gate `attributed ≤
  state` per token (spec §5).
- **Votes reconcile corroborates:** 8 MISMATCH + 28 CHAIN_ONLY slots; its own
  verdict says the capture-registry fix outranks rollup rebuilds. Locks
  reconcile: perfect (Σvp+fixed = total vAMP, delta 0).
- **SPEC-capture-registry-backfill.md DRAFTED (this folder) — P0.** One
  archive pass over heights 13,737,811→21,481,530 via contract-scoped
  tx_search (registry file, resumable cursors, production classifiers,
  idempotent merge), recovering bribes+votes+locks+flows(v2) at once,
  walk-once doctrine. E0 items need NO archive: over-attribution netting fix,
  POT_WITHOUT_PLACEMENT watchdog, flows classifier v2 forward. **E1 blocks on
  DeFi_Patriot: choose archive-node access** (rented archive RPC recommended).
- Awaiting from DeFi_Patriot: rough dates (or txhashes) of his wBTC/ATOM-pool
  bribes — 2025 ⇒ hole (backfill recovers); pre-2025-01-07 ⇒ FCD-era
  classifier miss, chased separately in E0.

---

## 🔶 2026-07-22 — Portfolio Arc: P&L spec drafted · VP audit resolved · bribe-board findings

- **SPEC-portfolio-pnl DRAFTED + Phase A BUILT & GATED same session (deploy =
  commit `.github/scripts/tla-flows/build-pnl.js` + `tla-flows-pnl.yml`, then
  Actions → Run workflow).** Gate on real data: 553 wallets / 36,243 events,
  fixture wallet hand-reconciled, idempotent, honesty assertions pass; DAO
  fees $5,727.90 + zap inputs $642,531.39 usd@event; 1,532 null-user claims
  counted honestly. Phase A is a pure derive from committed data (zero chain
  access): zap cost basis + lifetime slippage/fee ledger (measured), event
  timeline, per-wallet coverage bands. Structural findings baked into the
  phasing: flow events carry NO pool identity and claims carry NO amounts
  (14,265/14,265 `amount:null`; rewards stream `coins:null` too) — both are
  classifier enrichments (Phase B, `<<FLOWS CLASSIFIER v1>>`→`v2`,
  byte-identity discipline) with a ⚠ time-sensitive walker-era re-read
  (public-node tx retention; recommend: ship enrichment forward soon, fold
  the backfill re-read into the Phase-2 registry one-pass).
- **VP audit RESOLVED — no new fix needed; it's the accepted org-only scope.**
  member-portfolio tile (1.31M) vs banner (1.18M→1.20M) traced: tile =
  personal-feed `display_voting_power_human` (fixed×10, coincidentally right
  for all-auto-max wallets), banner = boost-only `current_vp_human`. Canonical
  Σ(boost+fixed) per lock = 1,310,560.38 verified from raw lock fields.
  SPEC-vp-definition-fix already SHIPPED org-side 07-14 (org engine total
  basis, `display_voting_power_human` RETIRED, member-data 1.1.0 canonical);
  the page still reads retiring personal feeds — that's the documented
  accepted consequence. Queue: **org positions-capture migration** (org
  successor to adao-positions/tla-participants on the patched org engine, full
  portfolio shape: locks/LP/rewards/prices — member-data 1.1.0 covers VP only)
  → repoint member-portfolio.html. Optional interim: page-side Σ(raw
  boost+fixed) transform, zero old-repo investment.
- **DeFi_Patriot bribes "$262.82" EXPLAINED — two independent known causes:**
  (1) capture hole 2025-01-08→2026-06-14 (rollup claim_coverage documents it;
  Phase-2/archive backfill queued); (2) CoinGecko CAPA price hole **May-2024→
  Aug/Sep-2025** (verified across the whole price-history archive: CAPA priced
  2023-10→2024-04, dark, resumes 2025-08/09; SOLID starts 2025-09). His 110K
  CAPA (epochs 109/112) is captured but $0 at placement; only the SOLID
  bribes (e193/194) price. Same hole = the whole answer to "Solid Protocol
  unpriced" (all 11 events in it). Rollup already carries `usd_at_build`
  (him: $379.45, Solid: $568.04).
- **Bribe-board polish queue (org data, site-only unless noted):**
  1. [ ] "at today's prices" fallback: board shows `usd_at_build` (clearly
     marked) when `usd_at_placement` is 0/unpriced — honest, no fake history.
  2. [ ] Tooltip on the four "TLA gauge tribute contract" entries: protocol
     plumbing (take-rate/ASTRO recyclers firing every epoch), not people.
  3. [ ] Per-briber click-through modal: bribe timeline + USD-per-epoch chart
     — data already in rollup `bribers[].by_epoch`, zero capture work.
  4. [ ] (own spec, if wanted) CAPA placement-price backfill for the hole,
     derived from on-chain Astroport pool reserves — estimate-class, so it
     would be labeled as derived, per pricing doctrine.

---

## ✅ 2026-07-20/21 — SITE GO-LIVE · GitHub-outage health check · votion-positions v1.1

- **GO-LIVE (aDAO-links-site):** test.html → **tla-stats.html** (nav was built
  with data-page="tla-stats"), test2.html → **member-portfolio.html**; prior
  stats page preserved as tla-stats-legacy.html (holds the Epoch Bribes
  all-time deep-dive pending re-home). Boards: chunked expanders (top 5 →
  +10/click) on all seven; OG/Newcomers tiebreak = smallest held lock token
  id; Top Bribers banner is MEASURED from bribe_ledger (LUNA attributed
  share — auto-updates on rollup rebuild). Vercel page views were already
  site-wide; custom events added (board_expand, bribe_board_mode,
  portfolio_view/save — surface on Pro). Details: website-adao-core
  tla-log.md Rev 5.2–5.4.
- **Sunday rollup rebuild VERIFIED (07-20 02:09):** 2,837 attributed bribe
  events (was 173), 17 bribers, wallets.json labels live on the board. LUNA
  attributed share correctly still ~1% — the recovered tributes bribe in
  ASTRO/pool tokens; PD's 72,676 LUNA stays honestly unattributed (both PD
  txs sit in capture gaps: prop 247 pre-forward-capture, prop 250 in the
  21.81–21.91M prune window) until the registry backfill or PD's next bribe.
- **2026-07-20 GitHub API outage (~00:00–01:00 UTC):** 503s at the publish
  step killed 10 crons in one hour — capture succeeded everywhere, only the
  final PUT died. Hourly crons self-healed; address-catalog + adao-positions
  re-run manually. HARDENING QUEUED: 3-attempt backoff retry on GitHub 5xx
  in the shared publish helpers (would have turned ten failure emails into
  zero). Corrected diagnosis on the volume tile: the astroport epoch-roller
  was HEALTHY all along — the page-side epoch-boundary fallback was missing
  on the NEW stats page (fixed in go-live).
- **votion-positions v1.1.0 SHIPPED & LIVE-VERIFIED (cron-scripts repo):**
  tx_search discovery ran on public-node ~2–3wk tx retention → historical
  depositors invisible while `complete:true` asserted. Fix: org
  address-catalog ∪ deposit-events candidate universe, one bank/balances
  sweep (all 6 vdenoms/call), MEASURED completeness (supply_coverage_pct),
  real total_tvl_usd + discovered_holders_usd, schema 2 + discovery meta.
  Gate 14/14 on the Eris fixture; first run: 18 holders (was 2), TVL
  $35,105. The catalog-sweep design is what org-votion-positions inherits
  at migration. Member-portfolio Votion card live with coverage honesty
  guard ("absence isn't proof of absence" below 90%).
- **Portfolio Arc — REMAINING QUEUE:** (1) VP model audit — tile 1.31M vs
  banner 1.18M→1.20M on one screen; (2) APR convention + price-source audit
  (Eris arbLUNA ~$0.12 vs our hub-ratio ~$0.055); (3) SPEC-portfolio-pnl
  (flows × price-history join — both feeds exist); (4) design pass. Plus:
  SPEC-landing-pulse, 5xx retry hardening, old/new cron-pair retirement
  ledger (address-catalog, nft-inventory×3, votion pair, astroport-snapshot
  vs org-dex-data — retire after duty ports per parallel-run doctrine).

---

## ✅ 2026-07-18 — v6.1 BUILT & GATED: governance-executed bribes captured · FCD re-derive READY

Every line verified against real chainscope pastes or a full local run this session.

- **v6.1 (org-tla-voting 2.3.1) — BUILT, mock gate 116/116, DEPLOY PENDING
  (commit the tla-voting folder; no schedule/env change).** The PD fixture
  exposed a REAL silent-drop bug in deployed v6: all ten `add_bribe` events
  in a governance-executed tx share `msg_index 0` → identical dedup keys →
  **9/10 bribes silently collapsed** (26,284 of 34,763 LUNA lost from the
  fixture alone). Fix: collision-aware promoted msg_index — unique keys ONLY
  when 2+ promoted bribes share an index; single-add take-rate events keep
  byte-identical keys (parity proven old-vs-new; no historical dupes on
  re-walk). Gate additions: R10b (8 assertions on the verbatim fixture) +
  stale schema-5 assertion reconciled to schema 6 (briber board) + the
  cosmetic "schema 5" log string fixed.
- **Attribution rule SETTLED (dynamic by construction — DeFi_Patriot's
  requirement):** promoted bribes attribute to the wasm `dao` attribute's
  DAO core when EXACTLY ONE distinct dao appears in the tx
  (`briber_source: 'dao_attr'` — the DAO's own funds pay, coin_spent proves
  it); zero or 2+ → msg_target fallback, unlabeled. A new DAO bribing
  through a shared proposal-module pattern surfaces as its OWN unknown
  address — it can never be absorbed into another protocol's total.
  PD therefore attributes to the DAO core `terra1k8ug6dk…4lppjg`, NOT the
  proposal module `terra1660g9…ehqnup`.
- **Fixture corrections (chain-exact, supersede the 07-17 note):** tx
  `402AE7B1…AAAA7` net added = **34,763.534826 LUNA** (not 33,517; gross
  34,863.53 minus ten 10-LUNA fees). SECOND confirmed governance fixture:
  proposal 247, tx `1CA243A3…AF1E` (2026-06-13), ten bribes,
  **37,912.492 LUNA net**, epochs 189–192. Combined: **72,676 LUNA of PD
  bribes** that deployed v6 would have recorded as 18,764.
- **FCD re-derive (D8) — SCRIPT + WORKFLOW DELIVERED, run pending:**
  `.github/scripts/tla-voting/fcd-rederive-bribes.js` +
  `tla-voting-fcd-rederive.yml`. Dual-checkout design: require()s the LIVE
  platform-crons classifier (no third copy) and SELF-GATES on the PD
  fixture (aborts on any pre-2.3.1 checkout → run AFTER the 2.3.1 deploy).
  Local run against real production data: **2,640 contract-initiated bribes
  recovered** (2024-09: +428 · 2024-10: +701 · 2024-11: +812 ·
  2024-12: +622 · 2025-01: +77), all 191 prior events byte-preserved,
  second run adds 0 (idempotent). Top recovered bribers = the four gauge
  tribute contracts + Lion DAO (23) + Solid `…dd7s3t` (11). Bribes-stream
  event history then reaches TLA genesis for the FCD era; rollups absorb on
  next rebuild.
- **Astroport-candidate contracts RESOLVED (07-17 open item):**
  `…qswspq` / `…gw3lpa` (+ `…lf4arv`, `…w6e23k`) are the four gauge
  tribute contracts — `distribute_take_rate` sweeps fees to the PD DAO,
  `distribute_bribes` recycles accumulated ASTRO into the manager. The
  "pool:null arg shape" was this class; NOT an Astroport team wallet.
- **Solid Protocol = TWO wallets (both entered in wallets.json):**
  `…dd7s3t` — FCD-era direct briber (e.g. 61,350 CAPA → ampCAPA,
  2025-01-02) AND the CAPA token contract's feeshare withdraw address
  (deployer-tied evidence); `…s0yhw0` — current wallet, three 1M-CAPA
  bribes across all three buckets 2026-06-21 (chainscope-verified), sitting
  in the events hole so absent from committed events until the registry
  pass. The two txs' feeshare events paying `…dd7s3t` link the wallets.
- **Backfill doctrine REAFFIRMED for the 2025-01→2026-06 hole:** per-period
  TOTALS are already state-side (bribe-state walk); per-briber attribution
  in the hole stays gated on the Phase-2 capture-registry one-pass (bundle
  everything, walk once). Fuel: still zero direct bribes found — stays
  honestly blank.
- **Deploy checklist:** (1) commit platform-crons tla-voting 2.3.1 →
  Render picks up hourly; (2) run the fcd-rederive workflow (dry-run flag
  available); (3) next rollups rebuild extends the briber board to genesis
  for the FCD era; (4) board banner broadening ("contract-initiated
  bribes") rides the board-page commit — still pending the Rev 4 files.

---

## ✅ 2026-07-17 — briber board data layer LIVE · override layer wired in · denom identity 100%

Every line verified against production output or the committed rollup that day.

- **Briber leaderboard — rollups schema 6: SHIPPED & LIVE.** org-tla-voting
  (lib/rollups.js) first build 23:03Z: `schemaVersion: 6`, 16 bribers,
  Σ 173 bribe events / 18 withdraws, `bribers_order` present, DeFi_Patriot
  SOLID row $262.82 at placement = mock exactly. Spec:
  `SPEC-tla-voting-briber-board.md` (this folder — rev 2, schema 6).
  Labels join `docs/curated/wallets.json`; DGN display from PROBES record.
  Known stale log string: index.js line ~1089 still prints "schema 5" —
  cosmetic, fix with next tla-voting commit.
- **token-catalog 1.5.0 — curated override layer APPLIED (was write-only).**
  Stage 2b reads `docs/curated/token_overrides.json` per the stage-2
  per-field model: `discovered` untouched, `override` + `effective` added.
  First run: 23 applied, 20 previously unnamed tokens identified. Also fixes
  the silent claims-pricing gap (rollups buildTokenMap now reads `effective`).
- **Denom identity: 17/17 IBC traces run, 14/14 matched existing overrides**
  (chain-exact reconciliation of the curated layer). INJ + stATOM entries
  added (trace-verified); decimals added to 16 entries (convention-derived,
  noted). DGN (`udgn`, channel-582) = the only bribe-only token; named via
  `PROBES-denom-traces.md`, honestly unpriced.
- **price-history: RUN_ALL backfill complete (17 tokens).** CAPA reaches only
  ~2025-03 (CG listing start) — pre-listing CAPA bribes stay unpriced.
  DECIDED: no ampWHALE/bWHALE backfill — White Whale deprecated, tokens
  worthless; their 91 bribe events stay named + unpriced-at-placement by
  design, usd_at_build reads ~zero (true).
- **Board surfaces SHIPPED (evening).** test.html Community card = "Top
  Bribers" (all-time, schema-6, registry-first names, Earners view kept behind
  toggle); tla-stats.html Epoch Bribes modal gained the sortable deep-dive
  board (optional commit — re-homes into the restructure later). Details:
  website-adao-core `tla-log.md` Rev 4.
- **PD BRIBES ARE CONTRACT-INITIATED — build #3 fixture captured.** Chainscope
  tx `402AE7B14451C9C46612DBD5342FC722A8562B2900AB35973081082B66FAAAA7`
  (2026-07-09): executor `terra14p3mc04s7jcaxvvetlzehvhx9gdx6w4nm3zzw3` runs
  proposal 250; DAO treasury
  `terra1k8ug6dkzntczfzn76wsh24tdjmx944yj6mk063wum7n20cwd7lxq4lppjg` makes TEN
  add_bribe calls in one tx — 33,517 LUNA, epochs 193–196, ten pools,
  10-LUNA fee each. NONE appear in the direct events stream (no top-level
  briber). Confirms the governance-execution bribe pattern alongside take-rate
  tributes; Phoenix Directive is therefore ABSENT from the current board by
  capture limitation, not by fact. Board banners state the direct-only
  universe. Resolution path: build #3 parses wasm add_bribe events + execute
  chain for attribution; this tx is the acceptance fixture.
- **Briber identity status:** Lion DAO `terra1ksk66l…z8ru04` CONFIRMED
  (DeFi_Patriot) → wallets.json entry added. Solid Protocol candidate
  `terra1t380w5…dd7s3t` strongly corroborated (bulk-CAPA multi-pool pattern
  matches DeFi_Patriot's description exactly) — awaiting explicit
  confirmation before labeling. The two single-pool LUNA wallets
  (`…szrpnz`, `…ecsx24`) are NOT PD (see above) — unidentified individuals.
  Two new Astroport-candidate CONTRACTS began ASTRO bribes 07-16/17
  (`terra1v399cx…qswspq`, `terra1awq6t7…gw3lpa`, pool:null arg shape —
  classifier quirk to check in build #3) — unconfirmed. Fuel DAO: zero
  direct bribes exist; any Fuel incentives flow via non-direct routes.
- **Site (aDAO-links-site): Atrium links fixed (3 places), DAO custody wallets
  pinned on Holder Leaderboard (broken sum = 1,000 = Props 64–69 exactly),
  rewards-tile sparklines restored (+ Vote added), fetchAllSnapshots
  promise-memoized + per-source date floors, tla-ext walkback cached,
  DAO Members chart icon removed (no daily source — honest gap).

## ✅ 2026-07-14 — VP fix LIVE · distributions ledger COMPLETE · docs consolidated

Every line below verified against chain or production output that day.

- **Build 1 — VP definition fix: SHIPPED & LIVE.** member-data 1.1.0 Render run:
  canonical `system.total_tla_vp` = **27,973,049.25** = TLA UI exactly, 4/4
  outputs published, status ok. Spec updated to SHIPPED:
  `SPEC-vp-definition-fix.md` (this folder).
- **Build 2 — distributions harvest + forward capture: SHIPPED.** One-shot
  harvest committed at `tla-core/tla-voting/distributions/history.json`:
  **floor certificate period 96** (95 = empty pre-genesis), **98 periods
  (96→193), zero gaps, zero invariant violations**. Storage layout **DECIDED:
  single `history.json`** (Deviation Register §7 row flipped to DECIDED).
  Forward capture live in `org-tla-voting` **1.1.0** via the shared
  `<<DISTRIBUTIONS CORE v1>>` block (byte-identical platform-crons lib ↔
  tla-core harvester script — diff-verify after ANY change).
- **Tarpit closed:** the 40s hard-deadline `httpGet` fix is ported into
  org-tla-voting 1.1.0 (the item further down is flipped DONE).
- **VP mechanics derived & documented** (multiplier = 1 + 9×wk/104, stamping,
  slope, dormant locks) → now canonical in
  `docs/ecosystem-knowledge/eris-protocol.md` + `.facts.json` (`vamp.*` facts).
- **queries.md updated + moved to `docs/`** — distributions / gauge_infos /
  user_info / lock_info / total_vamp blocks now carry the verified shapes.
- **Docs consolidation EXECUTED** (SPEC-docs-consolidation, this folder) —
  data/capture-layer docs live ONLY here; website-adao-core keeps site-runtime
  logs + bootstrap docs + website-feature specs.

### 👀 Zero-effort watch items (self-resolving — glance when convenient)
- **[ ] Next scheduled org-tla-voting Render run:** log shows **1.1.0** + a
  `distributions:` line (`skipped (up to date)` expected mid-week); heartbeat
  gains `distributions_head: 193`.
- **[ ] Sunday 2026-07-19 epoch flip:** first live test of forward capture —
  period **194** should append on its own; self-heal check is
  `last_captured_period == current_period − 1`.

### 🆕 Queue additions (from the 2026-07-14 session)
- **[ ] member-data per-lock census** — the cron already queries all 433 locks
  every run but publishes aggregates only; emit per-lock detail (token_id,
  coefficient, multiplier, slope, end_period, vp components, stale-gap) so
  non-max multipliers + **dormant locks** ("expired-but-unwithdrawn — wake up
  your VP") are answerable org-side for all wallets. Cheap: data already in
  hand each run.
- **[ ] Distributions product README** — `tla-core/tla-voting/distributions/`
  needs its product README per storage doctrine (layout: single history.json,
  DECIDED; document the floor certificate + forward self-heal).
- **[ ] Credia ecosystem-knowledge pair** — the 6-byte stray placeholder file
  `docs/ecosystem-knowledge/credia` was deleted 2026-07-14; write the real
  `credia.md` + `credia.facts.json` pair (Eris-built money market; mints
  wBTC.creda.a — directly relevant to defect #3, the missing 2.69M-VP pool).
- **[ ] Spec retirement pass after the 2026-07-19 epoch flip** — once the
  period-194 forward append + the SPEC-vp §4 second check (distribution
  fractions × bucket rewards ≈ reward deltas) both pass and the distributions
  README exists: SPEC-vp-definition-fix + SPEC-distributions-capture become
  retirable (durable content → ecosystem-knowledge + queries.md + the product
  README, already done); SPEC-tla-flows-gap-fill retirable now (complete,
  facts live in known_gaps). Completed one-shots retire; git history keeps them.

### ▶ Next up (order RESET by the reconciliation verdict, 2026-07-14 late)
**Reconciliation diagnostic: ✅ EXECUTED 2026-07-14 22:20 UTC — verdict
LOSSES, triple-verified.** Full story: changelog Rev 4; raw report:
`tla-voting/events/reconciliation.json`. Decomposition: (1) declared-gap
losses real but small (~7 key-swap re-votes, period ~190, June window —
honest); (2) ≥1 PROVEN SILENT loss in a claimed-covered window (a new
~5.97M-VP whale's project vote, period 191 — the pager cannot be trusted
even where it records no gap); (3) systematic blindness to contract-path
votes — 7 voting contracts identified: VOTION vote-aggregator vaults
(arbLUNA-MAX = BIGGEST TLA lock holder, ampLUNA-MAX = 2nd, + arbLUNA-1wk),
3 DAO DAO DAOs (one CONFIRMED on chain as aDAO itself, terra1sffd4… — the
council's prop-39 re-vote, 4× gauge/vote @ 841,486.80 VP, 2026-07-07, is
among the invisible; aDAO locks = token_id 600 + 711), 1 Polytone proxy
(ROAR/WHALE Osmosis entity voting cross-chain).
VP invariant PERFECT (Σ locks = total_vamp = 27,975,687.10, Δ 0.0000%).

**New build order (§6 routing applied):**
1. ✅✅ **tla-voting capture fix — DEPLOYED + HEAL VERIFIED 2026-07-15**
   (spec'd, built, mock-gated 44/44, restructured, deployed, and healed in
   ONE DAY. Changelog Rev 5 carries the full story + live verification.)
   Cutover executed:
   - [x] suspend `org-tla-voting` on Render
   - [x] dispatch `tla-voting-restructure` (dry_run clean, then real —
         commit 4b9823c, 62 month files, identity verified, byte-checked
         post-commit)
   - [x] push platform-crons `tla-voting/` 2.0.0 (byte-verified post-commit)
   - [x] schedule `0 */6 * * *` → `0 * * * *` (D6)
   - [x] first run: banner 2.0.0, cursor migrated from min-frontier
         21,905,081, walker + live dedup proof (1 gated tx → 8 rewards →
         zero added), status ok, catch-up in progress
   - [x] FIRST HARVEST = THE HEAL: period 193, 203 wallets, 19 voted, 0
         pending. aDAO 841,486.80 VP × 4 stamped 193; whale's project vote
         back-attributed stamped 191; Votion arbLUNA-MAX 6.47M VP (largest
         voter in TLA) + ampLUNA-MAX 1.18M captured. vote_capture
         {625/8/28/0} — matches the reconciliation exactly.
   - [x] ~~probe: pin the period-stamp field~~ **RESOLVED BY THE HARVEST
         ITSELF** — the field is `period` (recorded in queries.md
         Q-AssetGauge-UserInfo; no probe needed)
   - [x] system-health MONITORED entry for `tla-voting/vote-state/heartbeat.json`
         (done 2026-07-16: FRESHNESS_MAP covers vote-state, bribe-state,
         distributions at 216h weekly cadence)
   **Interpretation law (encode in build #2 analytics): CHAIN_ONLY ≈ 28 is
   the PERMANENT HEALTHY BASELINE** — contract-path voters never have
   events; the alarm is GROWTH beyond the known contract-voter set.
   **Watches (passive):** catch-up clears over ~5 hourly runs (self-noted in
   heartbeat) · Sunday 2026-07-19 flip = double self-heal test — period 194
   must self-append to BOTH distributions AND vote-state.
2. ✅✅ **rollup rebuilds (build #2) — DEPLOYED + VERIFIED 2026-07-15**
   (spec'd, built, mock-gated 63/63, deployed, and verified live in ONE
   sitting — changelog Rev 6 carries the verification). FORCE_ROLLUPS first
   build: 262 voters, Votion arbLUNA-MAX #1 by VP with visibility none, aDAO
   rank 7, three-number claims live (top claimer $3,541 when-claimed vs $251
   at-build), 1,816/1,082 claim-tx/paid split, env removed post-verify.
   Harvest runs own the rebuild from here (Sunday = triple self-heal test:
   distributions + vote-state + rollups).
   Queue riders: historical compound-amount fill (pre-2.1.0 events,
   non-gating) · **price-history early-era backfill** (1,177 unpriced claim
   entries — mostly CAPA/ROAR before coverage; they self-price on the next
   rollup rebuild once the price series extends) · site feature: claims
   dashboard on the three-number model + live pending recipe
   (rollups.pending_recipe).
3. ✅ **tribute/bribe capture rework (build #3) — SPEC APPROVED + BUILT
   2026-07-15 evening (org-tla-voting 2.2.0), mock-gated 96/96 on real
   fixtures incl. the take-rate tx 69D072693314 — DEPLOY PENDING (commit
   the 2.2.0 folder; no restructure, no schedule/env change; walk-down
   self-starts, floor in ~4 hourly runs). Changelog Rev 7 carries the full
   story. The lock-state retention rider RODE ALONG (vote-state/locks/
   {YYYY}/{MM}.json — one per-period record, end/underlying/asset/VP per
   lock). Post-deploy: verify floor certificate (expect 96, trust the
   chain), spot period 100 vs the probe paste, Sunday flip = QUADRUPLE
   self-heal (distributions + vote-state + rollups + bribe-state), ✅ build #3.5 BUILT same evening (2.3.0, rollups schema 5
   bribe_ledger — mock-gated 108/108, changelog Rev 8, deploy pending):
   blind-spot label RETIRED, unattributed remainder now MEASURED per
   period/denom. Sole remaining rider (D8, queued, non-gating): FCD
   re-derive with v6 for the 751 contract-initiated txs — attribution-only;
   when it lands, historical remainders shrink on the next rollup rebuild.**
   Original evidence (all probe/FCD-verified 2026-07-15):
   - The incentive manager's `{bribes:{period}}` query is THE authoritative
     per-period tribute ledger (queries.md Q-IncentiveManager-Bribes,
     CHAIN-PINNED: `{bribes:{period:{period:N}}}` — the field is the ve3
     Time enum, never a bare number; `{bribes:{}}` = current). State layer =
     bribe-state harvest walking periods — recovers the take-rate tributes
     the event stream is blind to, INCLUDING the 2025-01→2026-06 hole.
     **Retention PROVEN: period 100 returns full buckets (12 pools,
     Sept-2024 era). The walk is green-lit — start at the distributions
     floor (96), record the true floor honestly if lower periods error.**
   - FCD census: 2,793 `bribe/add_bribe` wasm events on the manager vs 173
     committed bribe events; 751 FCD-era txs are contract-initiated (no
     top-level msg — invisible to the current classifier by construction).
   - The manager's `bribe/add_bribe` event carries `added: <denom:amount>`,
     `start`, `end` — but NO pool and NO briber. The take-rate anatomy: four
     tribute contracts (one per gauge bucket) emit
     `asset/track_bribes_callback {asset: <pool>, bribe: <denom:amount>}`
     per pool before the aggregated add_bribe. Briber/pool attribution is
     event-side (classifier v6); completeness is state-side.
   - Design shape (the capture-fix playbook): bribe-state product (period
     walk + weekly forward) + classifier v6 event promotion; events remain
     the who-paid layer, state the what/where/when truth.
   **SPEC-tla-voting-bribe-state.md: approved + BUILT (see the ✅ header
   above) — locked defaults D1–D9 all honored; mock gate R8–R12 green.**
   **Analytics riders (banked 2026-07-15 evening, ride 2.2.0 or later):**
   - ✅ Lock-state retention — SHIPPED in 2.2.0 (rode along as planned):
     per-period record in vote-state/locks/{YYYY}/{MM}.json retaining end
     (verbatim permanent|{period}), underlying_amount, asset, amount,
     start, coefficient, slope, voting_power, fixed_amount per lock.
     Avg-duration / permanent-split / sizes / LST-composition analytics
     are now pure Layer-3 reads.
   - Emissions curve (Layer-3 chart, data COMPLETE today): rebase pot per
     period from distributions/history.json in RAW ampLUNA — answers
     whether the two-year emissions ramp has flattened, immune to USD
     noise. Companion: take-rate + bribe pots per period per denom.
   - Total-locked curve (Layer-3, data COMPLETE to genesis): cumulative
     canonical lock ins minus withdraws from the lock stream = total locked
     ampLUNA over the entire life of TLA; big inflow/outflow events visible.
   - PROBE: gauge_infos historical projection — does the gauge answer
     gauge_infos with time:{period:N} like its sibling queries? If yes:
     per-pool VP-weight history walk → the ATOM-LUNA / INJ-LUNA APR decline
     decomposes fully into emissions vs vote-weights vs depositor dilution
     (LP flows already committed since Aug 2024). If no: forward-only via
     vote-state.
   - Known thin spot (accepted): TVL/APR snapshots (dex-data) reach back
     only to late June 2026; accumulates daily forward, no backfill exists.
   Queue riders from the build: FCD re-derive with classifier v4 for
   genesis→Jan-2025 lock token_ids (monthly-aware fill — lift v4 FROM THE
   CRON; non-gating) · seed modernization to monthly layout on archive-node
   day (both seed + fcd-fill are layout-guarded off meanwhile).
   Original design brief (for the record): DESIGN FACT (prop-39 tx dump):
   the gauge/vote wasm event emits ONLY {action, vp} — no user, no
   allocation — so wrapped votes CANNOT be attributed from events; the fix's
   completeness+attribution layer must be a per-period STATE HARVEST
   (enumerate owners → user_info → period-stamp identifies who voted that
   period; ~250 queries/week; catches Votion vaults, DAO DAO, Polytone,
   silent misses). Events stay the fine-grained tx layer for direct votes
   (walker transport, no tx_search trust). Heal the ~9 missed votes the
   same way (NO archive node). Lock token_id capture confirmed feasible via
   ve/deposit_for + wasm-metadata_changed pairing. Events monthly
   restructure rides this same touch ({YYYY}/{MM}.json, Deviation Register
   row). Votion has 6 live vaults (MAX tiers dominate: 216,898 arbLUNA /
   53,445 ampLUNA; vaults answer {state:{}}) — capture the whole
   code_id-3677 family.
2. Rollup rebuilds (pool-status-history, vp-attribution org-side) — ONLY
   after 1; the current stream mis-attributes exactly the actors these
   products measure.
3. Tribute capture rework (#2) — shares the wasm-event attribution core
   from 1.
Also queued from findings: the 7 voter contracts are ALREADY in
curated/known_contracts.json — queue item is to surface them as a VOTER
class in analytics (whole code_id-3677 Votion family) once attribution
lands; lock_create token_id classifier refinement (all 1,306 creates carry
null).
✅ Watch item 1 PASSED (org-tla-voting-1.1.0, distributions_head 193).
Remaining: the Sunday 2026-07-19 flip (period 194 self-append).

---

## 🔬 Capture-layer accuracy audit (2026-07-13) — VP definition, distributions, tribute gap

Trigger: LUNA-SOLID investigation (bribe → 7× VP rotation → liquidity followed)
surfaced a UI/data mismatch; full audit against a same-day TLA UI paste + 4
chain probes followed. Specs (this folder): `SPEC-vp-definition-fix.md` (✅
SHIPPED 2026-07-14), `SPEC-distributions-capture.md` (✅ SHIPPED 2026-07-14).
**Every VP surface we publish was affected; reward-dollar figures were NOT
(they already read distributions).**

### ✅ Established this session (chain-confirmed)
- **vAMP VP = `fixed_amount + voting_power`** — we publish boost-only, ~11% low
  everywhere, worse for short-lock pools (stLUNA was 26% off). Verified 9/9
  pools vs UI incl. 5-sig-fig match on the discriminating case; money follows
  it (distributions). Canonical total = `total_vamp.vp` ≈ 27.96M (the old
  "max bucket ≈ 24M" convention retires — PROJECT_KNOWLEDGE edit queued).
- **Gauge controller retains FULL per-period distribution history** in
  queryable state — period 120 (deep in the events dead zone) answers from a
  public LCD. Payout ledger back to gauge genesis = ~100 cheap queries, **no
  block scanning**. Epoch mechanics locked: gauge_infos(next) = live tally →
  freezes to distributions(period N) at flip → pays during N+1.
- **DeFi Patriot's LUNA-SOLID bribe captured byte-perfect** (203.2 SOLID linear
  193→200 = 25.4/epoch ✓ UI $25.83). Vote events match UI per-wallet exactly.

### 🐞 Defect register (owning cron → fix vehicle)
1. ✅ **VP definition** — FIXED org-side 2026-07-14 (SPEC-vp-definition-fix):
   capture-engine + member-data on `fixed + voting_power`; false comment
   rewritten; `display_voting_power_human` retired. Personal crons (tla-snapshot
   / tla-locks) NOT patched — retiring; the live site shows boost-only VP until
   the tla-snapshot REPLACE-CHECK lands (its priority rose accordingly).
2. **Tribute capture ~97% blind** — ~$925/epoch of live incentives on ~19
   pools vs 1 captured event (DeFi Patriot's). Cause: recurring tributes are
   contract-initiated `add_bribe` (asset take-rate callbacks), invisible to
   top-level-msg parsing in org-tla-voting. Fix = wasm **event**-level parse
   keyed on the manager address. History: pre-2025 via FCD re-harvest (event
   filters); retained-window partial recovery; 2025→Jun-2026 joins known_gaps.
   **Block-scale work GATED on the Phase-2 capture registry** (one pass,
   everything: tributes + flows pool-identity + whatever else the hunt finds).
3. **wBTC.creda.a — REFRAMED 2026-07-15:** org discovery was never broken —
   the pool IS captured (token-catalog, 2.675M VP, gauge_status active),
   just identity-unresolved because the Credia adapter is a placeholder.
   Probe list written (PROBES-credia.md): it + the other 2 unresolved
   singles + Credia adapter sources. DeFi Patriot runs probes → curated identity
   overrides + dexes/credia.js build (dex-data 1.2.0).
4. **Ghost/stray gauge votes** in bucket denominators (wstETH-SS,
   wBTC.osmo-*, cross-bucket USDC-USDT strays; ~3M VP earns nothing).
   Distributions = the whitelist; pct math moves to it; expose "wasted VP".
5. **Name-resolution failures** — 4 raw-id pools (one proven = ampROAR-ROAR
   Astroport); display-name parity (bLUNA-LUNA↔LUNA-boneLUNA,
   LUNA-WBTC↔LUNA-wBTC.atom, PAXG-WBTC↔PAXG-wBTC.atom). Historical LP
   addresses from period-120 data need catalog resolution too.
6. **Depth stale/inconsistent** — LUNA-SOLID depth $10.5k < staked $12.5k in
   one snapshot (impossible); several pools ±20-35% vs UI; singles depth=0
   (UI shows staked-asset depth). One source, one timestamp, invariant
   `staked ≤ depth` added to run self-checks.
7. **vp-attribution ordering hazard — REFRAMED 2026-07-15 (audit):** the
   defect lives in the RETIRING personal-repo cron (vp-attribution is not an
   org module). The org layer already supersedes it: tla-voting vote-state
   harvests per-wallet votes AT the flip from retained chain state (no
   staleness window), and rollups schema 5 voters consume that. Dies with
   the personal-repo retirement — no org build needed. (Original evidence:
   DeFi Patriot's 1.18M vote binned as other_vp at e193.)
8. ✅ **dex-data bucket labels — FIXED 2026-07-15 evening (dex-data 1.1.0,
   mock-gated 31/31, deploy pending).** Cross-check vs token-catalog gauge
   truth found THREE Astroport mislabels (LUNA-SOLID stable→project,
   USDC-USDT bluechip→single, LUNA-WHALE null→project) + SkeletonSwap
   labeling nothing (27 gauge pools bucket:null). Root cause: buckets from
   `total_staked_balances` MEMBERSHIP, not gauge classification. Fix:
   lib/bucket-truth.js — `whitelisted_asset_details` on the 4 bucket
   contracts + LP-minter pair resolution, shared by both adapters;
   ambiguity/dewhitelisted flags declared; truth failure → null + errors,
   never a staked-membership guess. dex-data CHANGELOG 1.1.0 carries it.
9. **tla-flows records lack pool identity** (bucket inferable only via
   raw_actions/zap legs — bit us in this analysis) — classifier enrichment;
   rides the capture-registry block pass for history.
10. **Invariant monitors → system-health**: BUILT 2026-07-16 — 1.0.0,
    mock-gated 33/33 + real-data dry run (see
    changelogs/cron-system-health-log.md Rev 1). DEPLOY PENDING: new Render
    cron `org-system-health` (hourly, env GITHUB_TOKEN rw tla-core). Day-one
    dry run already flags #4 (13.71% bluechip VP drift) and finding A (SS
    LUNA-SOLID label) — the monitors work. INV-4 baseline arrives with the
    first post-flip run.

### 🔥 Build order (approved 2026-07-13; spec → approval → build → mock, one at a time)
1. ✅ VP definition fix (SPEC-vp-definition-fix) — **SHIPPED 2026-07-14**,
   live-verified (member-data 1.1.0, canonical 27,973,049.25 = UI).
2. ✅ Distributions harvest + forward capture (SPEC-distributions-capture) —
   **SHIPPED 2026-07-14** (floor 96, 98 periods, zero gaps; forward in
   org-tla-voting 1.1.0). Unblocks the exact history rebuild.
3. **[ ] NEXT:** Rollup rebuilds (pool-status-history, vp-attribution) from
   corrected sources + ordering fix (#7).
4. Tribute event-level capture rework (#2) — forward first; history waits on
   the capture-registry gate.
5. Discovery + naming (#3, #5), depth unification (#6), labels (#8),
   invariant monitors (#10).

### 📒 Found-by-building ledger additions
- Bribe-market reflexivity observed live: the LUNA-SOLID bribe's own success
  diluted its $/VP 87% in one epoch → Votion optimizer dropped it while LP
  staking APR spiked → liquidity migrating in (first: $4.2k USDC-SOLID →
  LUNA-SOLID rotation Jul-13, outside TLA farm contracts — by-design
  coverage note for the flows README). Feature seeds: epoch shift simulator,
  shift feed, wasted-VP detector, biggest-supporters view (tag Votion lock
  contracts in address catalog), freshness timestamps à la Votion.

---

## ⛏ Mined from retired docs (2026-07-14 — SYSTEM-AUDIT-AND-OPS + CRON-FIXES-BRIEF)

Both files walked line-by-line against current truth per SPEC-docs-consolidation
rules; everything below is what SURVIVED. The rest was superseded (fixes to
retiring personal crons, contract mapping now built into the org capture layer,
pricing thinking superseded by PRICING-DOCTRINE, the pre-org NestJS/Postgres
backend plan) and retires with the files — git history keeps them. Chain-query
knowledge that would otherwise die (ve3-connector-alliance) was rescued into
`docs/queries.md` §18.

### Ops (small, real)
- **[ ] Nov-2026 token rollover — legacy crons only.** All `*-data_2026` commit
  tokens expire end-2026; tla-core already runs on one no-expiration token
  (solved). A legacy cron retired before November needs nothing — retirement IS
  the rollover plan. For any still alive in November: new token + Render env
  update, checklist per cron (a missed token = silent capture failure; the
  system-health heartbeat monitor is the safety net).
- **[ ] Dead personal repos — safe to delete now** (0 live references, verified
  2026-06-14): `astroport_json_storage`, `archive-storage`, `nft-tracker`,
  `transaction-tracker`, `adao_nft-tx_2025`. ⚠ NOT `aDAO-Image-Planets-Empty` —
  the 2026-07-09 source audit found **59 live site refs**; stays BLOCKED until
  those migrate (SOURCE-AUDIT-DRAFT §A).
- **[ ] Schedule registry for platform-crons** — Render is the only place org
  cron schedules exist (fragile). Add a small `SCHEDULES.md` in platform-crons
  mirroring Render as the source of truth; fold the dependency rule in
  (foundation data before its consumers).
- **[ ] Retire-or-keep decision: old admin pages** `tla_tool.html` /
  `tla-tool_ext.html` (the deprecated manual-capture flow, replaced by crons).
  DeFi Patriot's call; if kept, label clearly as legacy.

### Feature seeds (still valid, data now exists or is queued)
- **[ ] APR breakdown — "gross − 10% take − 8% compound fee = realized", all
  chain-sourced.** Flagship trust feature. Verification gates before shipping
  (all still open): (1) confirm gauge distributions emissions are pre- or
  post-take; (2) add Astroport base yield to the gross side (realized
  `exchange_rates.apr` includes it — the reconciliation didn't close without
  it); (3) pin the USD price source; (4) ship per pool ONLY on reconciliation
  vs realized — a non-reconciling pool shows a data-health flag, not a number.
- **[ ] Fee-stack transparency content** (rides the Trust & Data tab of the
  tla-stats restructure): non-compounding = 10% take; amplified = 10% take + 8%
  compounder fee ≈ 18% on the reward stream; the 8% buys daily auto-compounding
  (APR→APY), no claim gas, fewer taxable events — net-yield edge mainly on
  higher-APR pools. Neutral framing; fee is documented by Eris, not hidden.
- **[ ] Price/oracle-health panel** — per token, every feed side by side
  (our derived, Astroport, Eris backend, CoinGecko) with divergence vs median,
  freshness, and green/amber/red parity. User trust feature + our own canary
  (real divergences already caught: ASTRO 9×, KUJI 18×, MARS 146× in the Eris
  feed). Merges the standing-canary idea in the price-audit note below.
- **[ ] amplp holdings + transfer helper tool** — amplp are transferable
  tokenfactory denoms (send an LP position wallet-to-wallet without
  unstaking). Per-vault balance, USD, denom-for-Keplr, "$X → base units" send
  helper, and the underlying-token decomposition via the pair `share{}` query.
  ⚠ DECIMALS GOTCHA: most vaults are 6-decimals but BTC-style are 8 — read
  decimals from source, never hardcode 6 (100× send error otherwise).
- **[ ] "Control of TLA" concentration panel** — per-holder VP concentration
  (top-1/5/10 share, Nakamoto/HHI) from the lock census. HONESTY RULE:
  multi-wallet clustering cannot be proven on-chain — label per-wallet, never
  imply wallet count = distinct people.
- **[ ] Bribe-source → Votion-swing attribution + contributor leaderboard +
  batch-staleness gap** — decompose Votion's VP swing by briber (PD / Solid /
  Astroport / aDAO / individuals) as a centralization-health signal; a
  $-contributed leaderboard; and per-epoch bribe-efficiency drift for batch
  bribes (added 4 epochs at once, graded at add-time — show the gap as a
  re-optimize nudge). Data: tla-voting bribe stream × Votion allocations.
  Attribution law applies (personal wallets = the individual, never aDAO).
- DAO-arb bot (DeFi Patriot's intent: treasury-funded arb supporting TLA pairs) —
  recorded verdict stands: a SEPARATE, later, governance-approved project with
  realistic edge analysis first; the dashboard ships the informational versions
  (slippage, zap-impact, alerts) which are already in the restructure spec.


## 📜 Backfill audit — pass two DONE 2026-07-16 (BACKFILL-AUDIT.md)

Full history inventory + anomaly hunt + per-chart merge design committed as
docs/pending-changes/BACKFILL-AUDIT.md. Headlines: price-history is pristine
(1,355 gapless days); the bribes/rewards/flows event streams share a
16-17-month pruned-window hole (2025-02→2026-05) that is STRUCTURAL (post-FCD,
pre-org-cron) and fully covered at period granularity by bribe-state +
distributions (both complete 96→193) — chart rule recorded; epoch-series
history floors at ~epoch 184 by construction. Work item RESOLVED 2026-07-16 the provenance-clean way:
**price pre-history via the PAID pipeline.** An import from old
luna-usd-daily was prepared, then rejected on provenance grounds before
commit — correctly — even though values proved identical to 8 decimals on
61 overlap days (same CoinGecko series). Instead the committed Price
Backfill Action ran with backfill_from=2022-05-28: series now 1,512 gapless
days from phoenix genesis, one pipeline, one provenance. Post-run
verification caught a REAL regression: the backfill's per-DAY merge replaced
21 live-era LUNA entries (2026-06-26→07-16) carrying the daily cron's
multi-source/confidence records — value drift vs CG daily-avg mean 2.2%,
max 8.8%. Fixed same day: (1) corrected 2026/06+07 month files restoring
the rich entries (genesis additions preserved); (2) backfill.js 1.0.1 —
merge guard that NEVER downgrades a rich multi-source token record to a
single-source value; (3) the daily cron self-healed forward on its own
(2026-07-17 already rich). luna-usd-daily/bluna-usd-daily site fetches
re-point at Batch-3 (G13), then the old files retire. The flip-review checklist gains
BACKFILL-AUDIT §5 (rollups overlap-diff vs old 184→193 epoch files, period
194 in all three state products, first tribute events, INV-4 armed, votion
rate monotonicity). Token identity: PAXG + wstETH voucher decimals RESOLVED
= 18 (solved from Credia supply math with wBTC/LUNA as controls; overrides
updated — that item retires).

## 🗳 votion module — G2 BUILT 2026-07-16 (org-votion 1.0.0, mock 28/28)

UI-DATA-READINESS G2 (the data-loss clock). Branches A+B built per
SPEC-votion-capture; Branch C (Eris optimizer NEXT) = v1.1, old votion cron
covers Sundays meanwhile. Probes ANSWERED 2026-07-16 — user_info
shape corrected (parser rewritten to the real
gauge_votes[{gauge,period,votes:[[id,bps]]}] shape), re-gated 30/30.
DEPLOY-READY: Render cron org-votion, hourly :20, env GITHUB_TOKEN. After
first live runs: parallel-run vs old votion-positions output, then retire
old cron + votion-positions-data_2026. Pools-tab "Votion Now" re-points to
votion/snapshots/vaults.json votion_vp_now_per_pool during Batch-3.

## 🔎 Credia deep dive — probes answered, knowledge base + identities landed (2026-07-16)

All PROBES-credia items answered (probe file marked ANSWERED; results live in
`ecosystem-knowledge/credia.facts.json` + `credia.md` and
`curated/token_overrides.json`). Findings that create or touch work items:

1. **Credia is a lending protocol, not a dex.** Whole market state = one smart
   query `{"metrics":{}}` on the Portfolio contract
   (terra1y6hfmr3lxxj6srduhlfz96x7sga2984pr757a0nrfuqxa9rqxapqcjv4zz). The
   `dexes/credia.js` adapter models lending MARKETS normalized to the common
   pool shape (`pool_type: "lending_market"`, tvl = supplied USD, lending
   truth under `raw`). BUILT 2026-07-16 — dex-data 1.2.0, mock gate 39/39
   (changelogs/cron-dex-data-log.md Rev 1). Deploys with the next org-dex-data
   run (no Render changes needed — adapter registry already listed credia).
   FOLLOW-UPS: (a) DONE 2026-07-16 — system-health 1.0.1 FRESHNESS_MAP
   covers dex-credia + votion (vaults 6h / positions 30h); (b) system-health
   INV2/INV5 iterate all enabled dexes and pick credia up automatically —
   INV2 skips it (no staked_liquidity_usd field), INV5 joins any
   gauge-labeled markets.
2. **Take-rate tribute lead (for the tribute/bribe rework):** the three TLA
   ampLP collateral markets (gauge pools 32/46/52) carry `take_rate {fixed:
   0.02}` — the only Credia markets that do (~$150K ampLP posted). HYPOTHESIS,
   explicitly unconfirmed: this feeds the contract-initiated add_bribe
   tributes. Test mechanically against bribe_capture sender addresses once
   post-flip data accumulates (first capture 2026-07-19). If confirmed, Credia
   becomes a named briber for bribe-source attribution.
3. **Identities closed (5):** vcawbtc = gauge wBTC.creda.a (the 2.69M-VP
   single), xASTRO, arbLUNA, PAXG, wstETH — all chain-verified, now in
   token_overrides.json. PAXG/wstETH decimals left null pending voucher-level
   verification — do NOT guess before pricing math.
4. **ampROAR-ROAR resolution:** the dewhitelisted gauge mystery entry is the
   DRAINED Astroport xyk pair contract (reserves + total_share = 0), not a
   token. Catalog must handle gauge assets registered by pair address — fold
   into the token-catalog stale-bucket/multi-bucket fix (finding A) touch.
5. **wBTC.creda.a depth/pricing note:** vcawbtc is a receipt token — its value
   derives from supplied wBTC in the Credia market, not from any swap pool.
   Depth/slippage semantics differ from LP pools; flag for the depth
   unification work (#6).

## Audit findings — 2026-07-15 late-night deep dive (post 1.1.0/2.3.0 deploys)

**Verified clean:** dex-data 1.1.0 live output — Astroport 37/37 gauge pools
labeled, ZERO mismatches vs token-catalog truth, all three former mislabels
corrected in committed data, ambiguity + dewhitelisted flags flowing; SS 27
gauge pools now labeled. tla-voting bribe-state — 61 CONTIGUOUS periods
(133→193), zero D5 field violations, epoch-end month routing landing history
in its 2025 months (the bribe capture hole is filling from state as the walk
descends); floor certification expected within ~2 hourly runs. Distribution
fractions sum to exactly 1.0 in all four buckets (INV-3 passes live).

**New defects found (filed, in priority order):**

A. **token-catalog: no multi-bucket handling in gauge discovery.** The chain
   can list one asset under MULTIPLE bucket contracts' whitelisted_asset_
   details (live example: the SS LUNA-SOLID factory LP is whitelisted:true
   under PROJECT and dewhitelisted under STABLE tonight). The catalog carries
   only a single stale entry (bucket stable, dewhitelisted) — dex-data 1.1.0's
   resolver caught the disagreement (bucket_label_agreement in action, before
   the monitor even exists). Fix: port dex-data's resolveBucket semantics
   (whitelisted wins, canonical order, ambiguity DECLARED) into token-catalog
   discovery. Small; rides the next token-catalog rev.

B. **member-data vp_voting_per_bucket includes ghost/stray votes.** Epoch-194
   like-for-like: bluechip member-data 27.67M vs sum of ACTIVE catalog pools
   23.88M — ≈3.79M ghost VP in the bucket figure (single shows ≈1.76M). This
   is defect #4's surface inside member-data: bucket denominators must come
   from the distributions whitelist, with the remainder EXPOSED as wasted_vp,
   not blended in. (Timing caveat: member-data ran 21.6h before the catalog;
   magnitudes are approximate, direction is not.) Rides defect #4's build.

C. **price-history heartbeat is a fossil.** heartbeat.json (356h stale)
   belongs to the one-off backfill tool; the DATA is current — token-catalog
   appends daily rows (2026-07-15 present). Fix: system-health reads the
   latest day key as the freshness signal for this product; optionally
   token-catalog stamps the heartbeat on append.

D. **Heartbeat conventions are inconsistent** across products: mixed
   timestamp fields (updatedAt / capturedAt / ran_at / generated_at) and
   skip-runs that don't stamp (distributions reads 30.4h old after an
   'up to date' skip; address-catalog 46.6h on its own cadence). Not data
   defects — but SPEC-system-health D2.6 needs a per-product cadence + field
   map, and one-off products (provenance) need a kind marker exempting them.

**Spec addendum queued for SPEC-system-health (pre-approval):** INV-1
like-for-like must be same-DAY not just same-epoch (the 21.6h skew above);
INV-6 freshness uses product-appropriate signals per finding C/D.

### Riders on already-queued builds
- Discovery/naming build (#5): also tag migrated-away pool corpses
  (same name+dex, dead gauge after a curve-type migration) —
  `is_migrated_legacy` / `current_canonical_gauge_for_pair` flag so the active
  pool per pair is explicit, not inferred from VP size.
- Invariant monitors (#10): add the gauge-identity invariants — within one
  snapshot a `gauge_pool_id` appears in exactly one bucket, and a
  `name+dex+bucket` has at most one active gauge (warn, never silently emit).

---

## 🏛 tla-voting migration + FCD archive breakthrough (2026-07-07/08)

Full story: `tla-core/docs/changelogs/cron-tla-voting-log.md` (Rev 1–2) and the
FCD section in PROJECT_KNOWLEDGE. Summary + resulting queue:

### ✅ Done (2026-07-07/08)
- **tla-voting migrated end-to-end** — seed + `org-tla-voting` Render cron
  (6-hourly) live at `thealliancedao/tla-core/tla-voting/events/`; old
  history/voting names purged from both org repos.
- **FCD frozen archive discovered** (genesis→~2025-01-07) + harvester built;
  **10 harvests complete (~84k txs)**: minter, collection, 3× governance,
  5× LP custody.
- **fcd-fill executed** — tla-voting streams at TRUE genesis (2024-08-27):
  votes 8,270 · locks 13,585 · bribes 172 · rewards 6,038. Residual gaps
  recorded honestly (votes/locks Jun-15→22; bribes/rewards Jan-25→Jun-26).
- **aDAO mint story chain-verified** (1,191 free GoA + 8,809→treasury =
  10,000 exact; break_nft = 1,010 not 1,000) — see MINT-TEMPLATE.md.

### 🔥 P1 — the queue (in build order, one at a time)
1. **Provenance ledger derive** → `tla-core/nfts/adao/provenance/` (script
   `.github/scripts/adao-provenance/`): per-token mint→transfers→state,
   per-wallet cost basis, the exact 1b/2a split, release-history verification
   (then correct `release-history.html` from chain-exact numbers).
2. **tla-flows deploy review + deploy** — code `cron-scripts/tla-flows/`
   Rev A.3; check vs org conventions + resolve nfts-flows name collision.
   RETENTION CLOCK: the permanent LP hole grows weekly until deployed.
3. **flows-fill derive** — LP harvests (55,199 txs, `archive/fcd/lp-*`)
   through the flows classifier (fcd-fill pattern).
4. **SPEC-tla-stats-restructure.md** — agreed design: global member LENS
   (selector currently Overview-only), hook landing (epoch clock, money
   board, activity ticker, leaderboard teaser, wallet-lookup CTA), tab remap
   (Member Stats → My Portfolio; Docs → Trust & Data w/ coverage map),
   slippage 3 surfaces (pool grades / on-off-ramp tool = Zap-Out Optimizer /
   personal exit-cost via lens). Rides the Batch-3 source re-pointing —
   **tla-stats.html currently consumes 23 personal-repo sources, zero org data.**
5. **votion-positions migration** (Votion users' portfolios incomplete
   without it) · **reconciliation section in org-tla-voting** (events ≟ live
   escrow state, match-rate in heartbeat) · **address-catalog rider**
   (bribers — 172 events give the real list — + wrapper namespaces).
6. Docs/wiring: health monitor → tla-voting heartbeat; read the fcd-fill
   Actions log for the FCD↔legacy overlap verdict (UNREAD).

### 🌊 tla-flows walker + capture-layer queue (added 2026-07-08, post-deploy-night)
Context: the Rev B tx_search engine stalled on its first live runs (backfill
species on a forward schedule — doctrine now in SPEC-tla-flows-walker §0).
Rev C block-walker built + mock-verified same night.
- ✅ DONE: Rev C walker committed; org-tla-flows resumed (verify banner 2.0.0).
- **[ ] 17-day retained-history catch-up** — one-shot tx_search harvest
  (fcd-harvest style, slow is fine) of the ~17 days public nodes retain,
  merged under the same tla-flows month files. Pairs with flows-fill.
- **[ ] Phase-2: platform capture layer (DeFi Patriot's design)** — promote the
  walker to the single chain-reader: a registry file (addresses + message
  patterns → destination bucket, config/contracts.js-style) routing matched
  txs into per-domain captures; nft-flows and eventually tla-voting become
  consumers instead of running their own scanners. Spec before build.
- **[ ] Live activity feed (site product)** — websocket subscription showing
  TLA activity live, walker as its reconnect/catch-up spine. After Phase-2.
- ✅ DONE 2026-07-14: hard-deadline (40s) httpGet fix ported to org-tla-voting
  (shipped inside 1.1.0 with the distributions step) — the latent tarpit hang
  it shared with tla-flows Rev B is closed.

### 🧭 Storage-conformance queue (added 2026-07-08 — from the settled-convention audit)
Canonical convention + full Deviation Register: `TLA-CORE-STORAGE-DESIGN.md`
(corrected 2026-07-08: events = monthly `{YYYY}/{MM}.json` JSON arrays; the
daily-jsonl plan is superseded). Ratified in-session with DeFi Patriot.
- ✅ DONE 2026-07-08: `nfts/adao/provenance/tokens/` re-derived `.jsonl` →
  `part-NN.json` JSON arrays (delete the 10 old `.jsonl` files on commit).
- **[ ] tla-voting events restructure** — per-stream single files
  (`reward-events.json` already 16.6 MB, growing) → monthly `{YYYY}/{MM}.json`
  per stream. **MUST land before Batch-3 site wiring** — zero consumers today
  makes this the cheapest it will ever be. Touches: org-tla-voting cron + seed
  + fcd-fill (shared `<<CLASSIFIER v3>>` block — diff-verify after).
- **[ ] index.json conformance sweep** — add the standard manifest to:
  `price-history/`, `nfts/adao/flows/`, `nfts/adao/snapshots/`,
  `dex-data/{astroport,skeletonswap}/snapshots/`. Each owning cron writes its
  own; one small PR-sized change per cron, batchable.
- Process rule (binding, all sessions): any new deviation discovered gets a
  Deviation Register row + an item here THE SAME DAY. No silent drift.

### ⚠ Org→personal dependency audit (2026-07-08) — cut before ANY personal-repo deletion
Verified: NO org cron writes to personal repos. Four org READS exist:
- ✅ Acceptable (one-time seed bridges, inert): tla-voting-seed legacy bootstrap
  (self-disabled) · price-history backfill Actions (executed).
- 🔥 **capture-engine.js** (required by org address-catalog + token-catalog)
  hardcodes fetches of `tla-snapshot-data_2026` + `network-and-prices-data_2026`
  — known June interim ("dissolves later"). TRACE whether the org crons still
  exercise those paths; dissolve or repoint. Until then those two repos are
  NOT deletable.
- 🟢 org nfts/adao reads `defipatriot/nft-metadata/adao-rarity-intended.json`
  (static curated file, not cron output) — migrate to `tla-core/docs/curated/`
  before touching nft-metadata.
- 📋 `fuel/` — **disposition DECIDED (2026-07-08): absorb, don't migrate.**
  Fuel = hourly FUEL-token price/TVL/volume + daily OHLC (since 2026-04-13);
  the price exists nowhere else (thin market, priced from its pool). Plan:
  (1) fold the daily OHLC series into `price-history` as FUEL's seed (the
  June-dailies fold pattern); (2) archive the raw hourlies losslessly under
  org `archive/`; (3) add FUEL to token-catalog's tracked set + price-history
  forward capture (pool/denom/source = read `cron-scripts/fuel/` first);
  (4) THEN suspend the fuel cron — after tracing both readers (site reads
  `fuel-data_2026`, a separate repo — the cron may write two places). No
  standalone fuel cron going forward.

### 🗑 Retire board addition — personal `defipatriot/tla-core` writers
Four legacy Render crons still write to the June-interim personal tla-core:
`fuel` (fuel/snapshots), price cron (prices/), address-catalog v1 (catalog/),
contract-token-catalog (contracts/) — all superseded by org rebuilds. Retire
after verifying nothing still reads them (system-health MONITORED paths,
site fetches). ⚠ Two repos named `tla-core` — always check the OWNER before
destructive ops.

---

## 🏗 tla-core migration — foundation crons (active, 2026-06-25)

> ⭐ 2026-07-08 note: the P1s below concern the PERSONAL-repo interim crons —
> since superseded by org rebuilds (see retire board above). Kept for context.

The unified-repo migration is underway. `fuel/` was the pilot; this session added
the first who/what/price modules + the history engine. **Full audit + handoff:
`TLA-CORE-STATUS.md` (read it first for tla-core work).**

### ✅ Done this session
- **tier-builder** (`lib/tier-builder.js`) — history cascade engine, unit-proven.
- **address-catalog** — WHO registry, LIVE (`tla-core/catalog/`), 389 addresses, self-contained.
- **contract-token-catalog** — WHAT registry, LIVE (`tla-core/contracts/`); ampLP denom
  per-pool matching fixed. (Reads tla-snapshot — interim; dissolves later.)
- **price cron** — token prices, LIVE (`tla-core/prices/`), token-only after the
  LP/ampLP correction (see below).
- **docs centralized** — epoch schedule + Staking APR.csv → `tla-core/docs/`.

### 🔥 P1 — Realign the 3 new crons to the settled storage layout
They write `catalog/current.json` (module/files) — **missing the `product` level
and `index.json`** that `TLA-CORE-STORAGE-DESIGN.md` requires (see `fuel/` as the
reference: `fuel/snapshots/…`). Fix: `{module}/{product}/` + `index.json` + full
heartbeat schema. Update `system-health.js` MONITORED paths to match. Low-risk, mechanical.

### 🔥 P1 — Build the self-contained domain crons (lift code, don't repoint)
The goal is to DELETE old crons + repos, not feed off them. Build, run parallel
with the old, prove identical, then retire. One at a time. **Sandbox can't reach
Terra RPC — lift the proven functions, DeFi Patriot verifies on Render.**
- **[ ] `token-catalog`** (rename of price-cron) — absorb network-and-prices
  (pricing + ratios, Pricing-Doctrine intact) + tla-registry token identity
  (logos 1/token + 2/pair, decimals, categories). Retire network-and-prices repo.
- **[ ] `DEX-Data`** — absorb tla-snapshot (lp_health/amp_lp/buckets) + astroport +
  skeletonswap; pools, reserves, **share-based LP/ampLP position valuation**, the
  slippage-simulator data. Retire those repos.
- **[ ] address-catalog** — absorb tla-registry's address side (known_contracts,
  wallets, protocols, directory). Then retire tla-registry + interim contract-token-catalog.

### ⚠ Correction logged — LP/ampLP are NOT per-unit priced
The platform values LP/ampLP positions by SHARE FRACTION (`staked/total × pool_usd`,
the adao-positions method that matches Eris's $7,593.66), NOT amount × price.
`tla-snapshot.amp_lp.shares` is inconsistent across pools and cannot be a divisor.
→ token prices live in `token-catalog`; LP/ampLP valuation lives in the positions module.


---

## 🛡 Systemwide reliability audit (2026-06-09)

Triggered by finding that `nft-inventory.js` had been *silently* dropping DAODAO unstakes for months (a publicnode pagination quirk: `pagination.offset` is ignored, only `page` is honored). That one bug exposed a recurring **failure-class** pattern. Every cron was walked through the checklist below. The common root across all findings: **code that couldn't distinguish "query failed" (null) from "no data" ([]/end-of-list)**, which silently produces incomplete data that can reach permanent archives.

### Failure-class checklist (run this against any new cron)
- **F1 — Pagination truncation.** `pagination.offset` (ignored by publicnode → use `page`), `page`-cap, or a `start_after` loop that stops early.
- **F2 — Silent null-coercion.** `r || []` / `Array.isArray(r) ? r : []` right after a query that returns `null` on rate-limit → empty masquerades as "no data."
- **F3 — Overwrite-with-partial.** A snapshot clobbers last-good with fewer/empty records on a bad run (worst when it reaches a permanent archive).
- **F4 — Corrupt-vs-absent input.** A `try/catch` that treats a *corrupt* file like a *missing* one → silently drops a whole source.
- **F5 — Staleness / schema drift.** Static reference data going stale (oracle), or an upstream field rename silently zeroing a parser.
- **F6 — Required-vs-optional misclassification.** A source that should be fatal treated as optional → partial publishes marked `ok`.
- **F7 — Heartbeat honesty.** Does `status` actually flip to `partial`/`error` on failure, or always say `ok`? If it lies, the health widget never alerts.
- **F8 — Epoch/time boundary.** Off-by-one epoch, UTC flip, missed end-of-epoch window → irreversible wrong-epoch capture.

### Fixes shipped this pass
- **[x] `cron-scripts/nft-inventory/nft-inventory.js`** — F1: `buildTxSearchUrl`/`fetchDaodaoTxs` now page-based `ORDER_BY_DESC` (was ignored `pagination.offset`). Captures all unstakes; `reconciled` flag will read true.
- **[x] `cron-scripts/tla-snapshot/tla-snapshot.js`** — **F2+F3 (critical):** added a completeness gate after the 9 core chain queries (`gauge_infos × 4`, `total_staked_balances × 4`, `distributions`). A `null` (failure) now aborts the run (exit 2, no publish) instead of `|| []`-coercing a whole bucket to empty and freezing it into the permanent daily archive.
- **[x] `cron-scripts/chain/tla-registry/tla-registry.js`** — **F2 (high):** `list_stakers` + `all_tokens` enumeration loops now distinguish `null` (failure) from `[]` (genuine end); a mid-walk failure records to a module `ENUMERATION_FAILURES` registry → status `partial` (+ surfaced in snapshot). No more silently-truncated catalog.
- **[x] `cron-scripts/tla-vp-holders/tla-vp-holders.js`** — F2: same `all_tokens` truncation fix → `ENUM_INCOMPLETE` → status `partial`.
- **[x] `cron-scripts/bribes-history/bribes-history.js`** — F2+F7: proposal-walk truncation fix; **added a `partial` status it never had** (`PROPOSALS_INCOMPLETE`).
- **[x] `cron-scripts/adao-positions/adao-positions.js`** — F7: run status now escalates to `partial` when any member portfolio has `_errors` (was only treasury/council), + `members_with_errors` in heartbeat stats.
- **[x] `nft-inventory-data_2026/{nft-provenance,bbl-sales,atrium-sales}-backfill.js`** — **F3 (critical):** never-shrink publish guard. History is append-only; a sweep producing fewer records than committed = incomplete → abort (exit 1), don't overwrite.
- **[x] `nft-inventory-data_2026/nft-analytics-builder.js`** — **F1 fix #5 (F4):** boost/atrium/bluna inputs now distinguish corrupt (throw) from absent (skip). **F5:** extends LUNA + bLUNA oracles to "now" via live `network-and-prices` prices, so post-oracle sales price live instead of stale last-known (best-effort; falls back to static oracle).

### Clean bill
- **`network-and-prices`** — the model cron (per-source `.ok` flags, `stuck/partial/ok` escalation, fingerprint staleness detector). Propagate its fingerprint approach to others over time.
- **`astroport`, `votion`, `skeletonswap`** — single-fetch / concurrency-worker patterns, no enumeration loop to truncate. (`skeletonswap`'s `while(true)` is a parallel-map worker, not pagination.)

### Remaining (flagged-not-silent — polish, not landmines)
1. **[ ] F5 follow-up:** the static `luna-usd-daily.json` / `bluna-usd-daily.json` only get *live-extended* at build time now; consider a tiny daily appender so the on-disk oracle itself grows (the in-memory extension covers correctness today).
2. **[ ] `network-and-prices` carry-forward:** on dual-oracle failure for a token it writes `final_price_usd: null` (overwriting last-good). Already flagged `partial` + dashboard caches, so visible. Fix: add `fetchPreviousSnapshot()` and carry forward last-good with a `stale: true` flag. *Touches the linchpin — test carefully.*
3. **[ ] `astroport` / `votion` partial status:** both are throw-based all-or-nothing; `astroport` can partially succeed (liq ok, vol fail via `fetchOk`) but status stays `ok`. Minor F7 — add a `partial` branch.
4. **[ ] `marketplace-stats` (Pixel-Lions, parked):** `fetchBblActivityPages` catch does `warn + break` (silent truncation of the activity feed). Tier 3, daily-refresh, no permanent archive. Fix with the same flag-to-`errors` pattern when Pixel-Lions work resumes.

---

## 🎯 TLA Stats expansion — clean next steps (planned 2026-06-12, build pending)

Discovery is complete for the whole TLA-Stats data-capture expansion. Nothing below is built yet; all of it is documented in `cron-scripts/README.md` "Project status & roadmap" and `PROJECT_KNOWLEDGE.md` "TLA Stats — product pillars & planned capture expansion." Recommended build order:

### 🔥 P0 — One-field Render fix (do anytime, unblocks Portfolio Tracker history)
- **[ ] Switch `adao-positions` Render schedule `0 1 * * 1` → `0 1 * * *`.** The code already expects daily; the schedule was never changed, so no daily P&L history accumulates. Every week unswitched is permanently lost forward-history. (No code change — Render dashboard only.)

### 🔥 P1 — Extract the shared capture engine (keystone, do before ally crons)
- **[ ] Extract `lib/capture-engine.js`** from `adao-positions.js` — the per-address position-capture logic (LP positions, rewards, voting, locks, bribes, balances, summary). All planned member crons import it, so "fix once, all benefit." Tradeoff accepted: the new crons depend on it, but independent discovery/output/scheduling keep them isolated otherwise.

### 🟢 P2 — Member-expansion crons (separate cron per source; build after the engine)
Each its own repo + heartbeat + schedule so allies can't break aDAO and can be paused independently. Membership always live-queried (never a hardcoded CSV).
- **[ ] `tla-participants`** (highest value — catches non-governance liquidity providers): all TLA-lock holders (CW721 enumeration of veLUNA `terra1uqhj8…`, confirmed enumerable, 431 locks) ∪ all bribe providers (read from `bribes-data_2026`).
- **[ ] `pixellions-positions`**: Pixel Lions registered members. DAO core `terra1c690mdrwdetnr09zfk3tf9xz9jhrgd9wpjyf3tuccj74ql09eqmq6sh7en`.
- **[ ] `liondao-positions`**: Lion DAO registered members. DAO core `terra1tkersa2mqwy2h8exj799qx2xrhdu0dkymk9psp6v0k4kz4tkxucssgluec`.
- **[ ] Widen `adao-positions`** to include unknown (unnamed) members (one-line filter change — currently named-only).

### 🟢 P2 — `tla-locks` cron (its own big cron; full schema mapped, see PROJECT_KNOWLEDGE)
The highest-value *new* capture — stale-VP-gap + unlock-cliff metrics exist nowhere else in the ecosystem. Forward-tracking, so clock-start has urgency. Captures per-lock asset/underlying/stamped-ratio/VP/slope/coefficient/window/permanent-flag/owner; system totals in one `total_vamp` call; derives auto-max status, weeks-to-unlock, stale-VP upside (via config oracles), participation order, per-member rollups, Boost-listing cross-ref, and voter-behavior metrics (churn + votes-on-dead-LPs from the gauge controller).

### 🔲 P3 — TLA Stats page (`tla-stats.html`) — the four pillars UI
Once the capture above accumulates: **Portfolio Tracker**, **LP Performance & Health Scoring**, **Bribes Tracking**, **Vote Intelligence**. Bribes/Vote-Intelligence are buildable soonest (multi-epoch bribes + snapshot data already has depth); Portfolio Tracker needs the accumulation runway. `tla-stats.html` is ~7,000 lines of polished rendering — data-layer changes only, never restructure the render code.

---

## 🛠 Active / next round

### ✅ DONE — Dashboard data-source migration (`index.html` `fetchTlaData`) — shipped Rev 3.51–3.54 (2026-06-11/12)
**Resolved via the dao-dashboard cron** (a cleaner solution than the per-source adapter originally specced below). The new `dao-dashboard` cron assembles the DAO aggregates server-side into a legacy-compatible `{meta, dashboard}` shape, so `fetchTlaData` simply reads that one file (live-primary, 26h fresh-gated) with the legacy epoch walk-back as fallback. The Unclaimed Rewards / TLA Deposits / Lion tiles are now hourly-fresh instead of frozen at epoch 185. Deep-dive pages (`dao_treasury.html`, `dao_tla_deposits.html`) migrated the same way. Also shipped in this arc: cron-first instant paint (~9s→3-5s load), deving.zone fully eliminated from index, chart history revived past 185, heartbeat false-stale fix. Full detail in `index-log.md` Revs 3.51–3.54 and `cron-scripts/dao-dashboard/README.md`. The original per-source adapter plan is retained below for reference but is superseded.

<details><summary>(superseded) original per-source adapter plan</summary>

**Identified 2026-06-09.** The DAO Unclaimed Rewards + DAO TLA Deposits tiles are stuck (`--` / spinner). Root cause: `fetchTlaData()` (index.html ~line 9836) still reads the **dead** monolithic `tla_json_storage/main/tla-data-epoch-{N}-end.json` (404 for epochs ≥186). That old file bundled pools + DAO treasury + locks + balances + ratios in one blob; the **new architecture split it across 4 crons**, so this is a *routing* migration, not a URL swap.

**Old `tlaData.*` field → new source mapping (confirmed against live data 2026-06-09):**
| Old field(s) | New source | New path |
|---|---|---|
| `tlaData.pools`, `tlaData.vote.pools` | tla-snapshot cron | `tla-snapshot-data_2026/data/tla-snapshot.json` → `pools[]` / `buckets{}` / `totals{}` / `epoch{}` |
| `tlaData.dao`, `tlaData.locks(.individual_locks)`, `tlaData.totalDeposit`, `tlaData.tokenBalances` | adao-positions cron | `adao-positions-data_2026/data/current.json` → `treasury.{locks, lp_positions, wallet_balances, summary}` |
| `tlaData.vote` (rewards) | adao-positions + tla-snapshot | `treasury.{pending_rewards, pending_rebase, pending_bribes}` and/or `tla-snapshot totals.rewards` / `buckets[].rewards` |
| `tlaData.lstRatios`, `tlaData.ampRatios`, `tlaData.tokenPricesAtSnapshot` | network-and-prices cron | `network-and-prices-data_2026/data/network-and-prices.json` → `lst_ratios{}` / `token_prices{}` |
| `tlaData.snapshotDate` | any | new `capturedAt` |
| `tlaData.meta` (staleness) | rebuild | from heartbeat `dataFreshness` / `capturedAt` — **date-based now, not epoch-based** |
| `tlaData.dashboard(.alliances)` | TBD | needs an archived `tla-data-epoch-N-end.json` to confirm exact semantics, or reverse-engineer from consumers |

**Recommended approach (lowest risk):** rewrite `fetchTlaData()` as an **adapter** that fetches the 3 new sources and assembles an object matching the old `tlaData` contract, so the **12 consumer call sites stay unchanged** (lines 7159, 8272, 8546, 9330, 9836, 10065, 10307, 10483, 11134, 11229, 11297, 11385). Field mapping lives in one place.

**Hard requirements (per DeFi Patriot, 2026-06-09):**
- **Remove the old fallback entirely** — delete the `tla_json_storage` epoch walk, the `tla-ext_json_storage` reads (`fetchTlaExtData`, ~line 9883), and the `epoch_1-300_date.json` ref (~line 9807).
- **Work-as-intended-or-error:** if a new source is unavailable, the tile shows an **error state** — never a stale snapshot or a silent default.
- Also retire the v3-format fallback block (~line 5020-5024).

**Caveats:** untestable from the sandbox (browser code in a 914 KB / 15k-line file). Test in-browser after. Obtain one archived `tla-data-epoch-N-end.json` if possible to nail `dashboard`/`dao` field semantics exactly. Per project rule, `index.html` data-layer changes only — don't touch render logic.

</details>

### ✅ DONE — NFT Explorer repoint (`nft-explorer-app.js`) — shipped 2026-06-09/10
deving.zone fully removed; explorer reads `data/v2/nfts.json` + canonical rarity files only, with hard-fail integrity gates (10,000-record check, owner-resolution check, no fallbacks). Details in the Rev 2 section below and `explorer-log.md`.



### 🔥 P1 — NFT Explorer page migration (Rev 2)
**Identified 2026-06-06. Rev B cron foundation shipped 2026-06-07. Explorer migration SHIPPED 2026-06-09/10 (items 1–7); item 8 (pending-claims surfacing) remains — per-record flag now carried through the merge, UI not yet built.** The `nft-inventory` cron Rev B now produces a full chain-of-truth replacement for `deving.zone/nfts/alliance_daos.json` (which has confirmed bugs: 16 missing DAODAO stakers, 54 undercounted, DAODAO contract itself listed as a 384-NFT user, no Atrium awareness, no Boost seller resolution). The explorer page still reads from deving.zone — Rev 2 swaps the data source.

**Affected file:** `nft-explorer-app.js` (237 KB main page logic)

**Changes needed:**
1. **[x]** Swap `STATUS_DATA_URL` from `deving.zone/nfts/alliance_daos.json` → our cron's `nfts.json` raw URL
2. **[x]** Adapt `mergeNftData()` to handle Rev B records[] format (schema v2) with new fields: `real_owner`, `listing{...}`, classification flags
3. **[x]** Replace dead `MEMBERS_CSV_URL` (`adao_json_storage/main/members.csv` — repo dead since 2026-05-17) with our cron's `summary.json` (richer data — per-staker counts + voting_power_pct)
4. **[x]** Add marketplace badges with prices: "Listed: 2,200 bLUNA ($1,875)" — BBL/Atrium/Boost icons
5. **[x]** Add backing display tile: collection-wide treasury value ($1.65M today) + per-NFT share (88.20 ampLUNA) + boost-mechanic story ("share grew +12.3% since launch as 1,093 NFTs broke")
6. **[x]** Add AbortController timeouts on all `.json()` fetches (deving.zone-hang lesson — same fix applied to `index.html` below)
7. **[x]** Add new badges/filters: "DAO Treasury" (898 broken), "Atrium Listed" (1), distinguish "Enterprise Staked" (403 real) vs "Enterprise DAO Broken" (100 gov)
8. **[ ]** Surface pending claims from `summary.daodao_pending_claim` (cron ships this as of Rev B.3): a global "N NFTs unstaked & pending claim" stat, and a per-wallet "You have N NFTs ready to claim" nudge when a viewed/connected address appears in `claimable[]`. Show `reconciled: false` defensively (render count, treat per-wallet detail as best-effort).

Estimate: 4-6 hrs. Verify cron data has run cleanly for 24+ hours first. Don't ship Rev 2 same-day as Rev B.

### 🟢 P2 — NFT Explorer Analytics tab: investor-grade expansion (spec'd 2026-06-10)
**Context.** Goal: stats an investor in a stock/token would expect, applied to the collection. The wishlist originally lived only in chat — this section is now canonical.

**Shipped 2026-06-10 (client-side, live data only):**
- **Supply screener** — the collection read like a token: Max 10,000 · Circulating (minted) 4,172 · Staked/DAO-controlled 3,049 (1,632 DAODAO + 14 pending + 403 Enterprise + 1,000 DAO broken) · Free float 1,054 + 48 listed; stacked supply bar.
- **Governance concentration** — Nakamoto coefficient (currently **4** wallets > 50% of staked VP), top-1/5/10 VP shares (19.9% / 57.9% / 68.1%), 157 stakers. VP = DAODAO-staked NFTs; broken keep VP.
- **Floor by tier** — Broken / Unbroken (base) / Phoenix rows: listed count, **listing floor** vs **sales floor** (median of recent tier sales, USD-at-sale) and the **spread** between them. Backing reference shown. Caveat noted in-UI: sales classified by *current* broken state. NOTE: the panel surfaced an apparent −84% base spread on day one, which turned out to be a cron-side ghost listing (see brief item 5) — real base floor ≈ $101 / spread ≈ −6%. Panel self-corrects when the resolver fix lands; the panel catching this is the point.
- **Floor-history chart (complete)** — sales bars (low->high + median) x 12W/12M x Broken/Base/Phoenix with ‹older/newer› paging through full Dec-2023->now history; historical cheapest-listing **USD-range band + mid line** from `listing-history.json` + daily oracles (stablecoin-denominated asks render flat — correctly); **LUNA price overlay** (own scale, toggleable); legend; tier classification **exact via `broken-at.json`** (109 previously mislabeled sales reclassified). Defensive liveness filter on open listing segments (ghost 14765).
- **Mark price & Market cap** — per-tier mark = mid(sales floor, listing floor); Mark column in Floor-by-tier; hero = Market cap (Σ tier mark × circulating) + FDV + Mark(base) + volume + highest sale ("Value today" removed).
- **Click-to-explain** — Market cap, Mark, Volume, Backing/NFT, Total backing, Supply, Nakamoto open methodology modals with live numbers substituted into the formulas. Nakamoto shows a 1–20+ zone scale with label.
- **Buyers/sellers** — 12-month ownership-trajectory line per trader (holdings reconstructed from marketplace trades), desktop-only center column; behaviour blurbs retained.
- Cache-busted asset URLs (`?v=5.x`, bump per release). Listing-floor overlay (incl. USD drift of standing listings) is the cron-side follow-up (listing backfill, brief item 0).
- Earlier this pass: matching-traits tooltip; analytics thumbnails moved to CDN-primary + IPFS-fallback (ipfs.io rate-limiting fix).

**Floor methodology — SETTLED:** sales floor = median of recent sales within the tier (Phoenix segmented out so trait skew can't pollute base), displayed *against* the listing floor as a spread rather than picking one "true" number. This unblocks per-wallet cost-basis P&L.

**Remaining (explorer-side, data already live):**
1. **[ ]** Pending-claims surfacing (migration item 8): global "N unstaked & pending claim" stat + per-wallet "ready to claim" nudge (`pending-claims.json` + per-record flag shipped; flag now carried through merge).
2. **[ ]** Per-wallet cost-basis P&L in Wallet tab: paid (from `sales-enriched` buys) vs backing vs tier sales-floor; "no basis" for non-marketplace acquisitions. Unblocked by floor methodology above.
3. **[ ]** Per-NFT provenance drill-down on card/modal (`nft-provenance.json` is 13 MB — fetch per-token on demand, never wholesale).
4. **[ ]** Backing growth story on the backing tile ("per-NFT share grew +X% since launch as 1,093 NFTs broke").

**Cron-side: ✅ ALL DONE 2026-06-11** — floor-history.json (daily per-tier listing+sales floors, DOM, bids), listing-first-seen.json, broken-at.json (1,093/1,093 break timestamps), listing-history.json (3,264 listings w/ outcomes 1,252 sold / 1,958 delisted / 54 active), BBL resolver fixes, and forward-fill in the incremental. Explorer can now: classify Broken-tier sales by `sale_ts` vs `broken_at` (remove the interim warning), chart real floor history, show DOM, upgrade `sales_tiering`.


### 🔥 P1 — Rarity system overhaul: explorer wiring + DAO proposal (spec'd 2026-06-10)
**Context.** Full investigation done 2026-06-10 in the NFT *Inventory* chat (this section is the handoff to the explorer chat). Rarity worked out from `all_nfts_metadata.json` + the HashLips design and reconciled against BBL's live marketplace API (HAR capture). Page + data files are shipped; what remains is the explorer wiring, an explorer bug fix, and the proposal.

**Two ranking systems — both canonical files live in `defipatriot/nft-metadata`:**
| | Intended (design) | BBL (marketplace) |
|---|---|---|
| File | ✅ `adao-rarity-intended.json` (committed) | ✅ `adao-rarity-bbl.json` (committed; built 2026-06-10 19:02 UTC, 1.28 MB) |
| Method | **Object trait alone defines the grade** (40 objects ↔ 40 grades, 1:1; metadata `Rarity` attribute = that grade). Grade order follows HashLips **planned weights**, not realized counts: Phoenix Rising planned 12 → Grade 40 apex (ranks #1–25) even though 25 minted vs Saber's 6. Grades laid end-to-end apex-first → 1–10,000 `intended_rank`; **within a grade tokens are equal-rarity by design**, ordered by token id as a lucky-draw tiebreaker (lower mint id = lower number; the grade is the rarity, not the within-grade slot). Planet/Inhabitant are flat by design (~500/value), Light/Weather are scene — **none are rarity factors** | Generic inverse-frequency sum over **every** attribute — including the derived `Rarity` tier (Object effectively double-counted) and the `broken`/`rewards` status. Result: realized-count order (Saber #1–6 above Phoenix #48–66) plus atmosphere leakage — the six `Weather: Lightning strike` tokens (common weapons) rank BBL #7–12 but intended #3,022–7,476 |
| Broken NFTs | All 10,000 ranked (grade is broken-agnostic) | Most broken NFTs come back unranked (`bbl_rank:null`); a small number still slip through with a rank — not fully consistent. Our cron faithfully records what BBL serves |
| Spot-check | #9068 (Phoenix) = grade 40, rank **24** | #9068 = rank **68** |

**BBL Action — DONE.** Weekly GitHub Action (`bbl-rarity.yml`) in `nft-metadata`, `bbl-rarity.js` 218 lines committed. Verified against the user's BBL text dump: **38/38 sample ranks match exactly** (incl. #242=1, #9068=68, #3937=443, #3021=444). File is 8,931 ranked + 1,069 unranked = 10,000. Hard-floor 8,500 captured + auto-fill BBL-unreturned tokens as `bbl_rank:null` (handles BBL's null-block pagination instability — confirmed: 411 broken correctly unranked + 658 unreturned-filled + 24 broken-but-ranked-by-BBL = 1,093 broken NFTs total, matches `nft-inventory` truth). 5 structural self-checks before any write (id universe, rank uniqueness, sums). Commit-on-change only → quiet weeks = no commit → file `built` date = "last time BBL ranks moved." Deliberately isolated: if BBL dies, delete the workflow + js + drop the toggle; zero blast radius.

**Rarity page — DONE.** `rarity-explained.html` shipped 2026-06-10 (replaces site-root page). Covers HashLips + planned weights, layer roles, designed grade ladder w/ planned-vs-actual, intended-rank construction including the lucky-draw within-grade framing, BBL divergences (apex inversion + weather example + broken-handling differs) with no hard-coded counts that'll age, full per-trait scoreboards (Object/Weather/Light/Planet/Inhabitant with planned where applicable), and a "Trait matches — the home system" section (P+I: 967, P+I+O: 80 — these are the *correct* numbers; see explorer bug below). References block links HashLips repo, the Terra-money Notion rarity doc, and both canonical JSONs.

**🐛 Explorer bug found while reviewing the rarity wiring (must fix before/with the wiring):** `nft-explorer-app.js` lines 166 and 180 (`PLANET_INHABITANT_MAP` and `PLANET_OBJECTS_MAP`) use the key `'Pampa'`. The metadata's Planet base name is `'Pampas'` (Pampas North / Pampas South). The strip-North/South regex returns `'Pampas'`, the lookup misses, and ~1,000 Pampas-planet NFTs are silently excluded from every matching-trait check. Symptom: explorer shows P+I=**864** instead of **967** and P+I+O=**74** instead of **80**. Two-character fix in two places — change both `'Pampa'` keys to `'Pampas'`. Verified by re-running both maps against the metadata; this is the *only* discrepancy — every other planet base, all 10 inhabitant species, and all object spellings reconcile exactly.

**Explorer changes — ✅ SHIPPED 2026-06-10** (staged on `nft-explorer-test.html`, promoted same day; verified live: Pampa fix bumped P+I 864→967 / P+I+O 74→80; #9068 = Rank 24 Intended / 68 BBL; 1,069 BBL-unranked render "Unranked"):
1. **[x]** Load both rarity files (`raw.githubusercontent.com/defipatriot/nft-metadata/main/adao-rarity-{intended,bbl}.json`); join to records by `token_id`.
2. **[x]** **Rank-system toggle** `BBL Rank / Intended Rank`, switching every rank shown. Display style: `Rarity 40, Rank 24` for Intended; `Rarity 40, Rank 68` for BBL — the grade stays visible in both; the *rank* is what switches. BBL + broken (`bbl_rank:null`) → render "Unranked," not 0 / blank.
3. **[x]** Small disclaimer line near the toggle when BBL is active: *"BBL ranks mirrored from BackBone Labs · last changed {file `built` date} · BBL leaves most broken NFTs unranked."*
4. **[x]** Display-option toggles — defaults ON: **Rank, Planet, Inhabitant, Object**; defaults OFF/hidden: **Weather, Light, Rarity** (the old `40/1`-style line is retired from the default card view).
5. **[x]** Filter dropdowns: still 4; **replace the Rarity dropdown with Rank** — filters by the 1–40 grade under the hood (a 10,000-option exact-rank dropdown is impractical; user-confirmed intent).
6. **[x]** **Sort By**: `Ranking, Rarity, ID`, default **Ranking High→Low** (best rank first, honoring the active toggle).
7. **[x]** Footer: **remove "Sorting Explained" and "Snapshot Tool" entirely.** Remaining: **Rarity Explained** (now a link to `rarity-explained.html`, not a modal) + **Badges Explained**.
8. **[x]** The explorer's internal sub-rank computation (rarityClass + Weather/Light tie-break, source of the old `40/1` display) is superseded — ranks come only from the canonical JSONs.
9. **[x]** Fix the `Pampa`→`Pampas` typo above (lines 166 + 180).

**DAO proposal (separate task, evidence-ready):** adopt Intended as the collection's official grading; ask Atrium to grade by it (file is open + verifiable at `raw.githubusercontent.com/defipatriot/nft-metadata/main/adao-rarity-intended.json`). Evidence ready: HashLips design intent (Object-only, planned weights, Phoenix apex), three named BBL divergences (apex inversion, weather leakage, inconsistent broken handling), the explorer toggle as the both-worlds bridge, full per-trait scoreboards already on the rarity page.

---

### ✅ DONE (2026-06-15) — TLA history backfill (votes + locks) + price + ratio layers
Completed in one session. The lock-lifecycle target below (vAMP Minter / voting-escrow CW721) was folded into a combined **gauge-vote + escrow-lock** backfill.
- **`tla-history-data_2026`** — `tla-history-backfill.js` (Action, one-time + forward-maintain) seeded **5,858 votes / 11,520 locks** to genesis, both `clean-end`. Lock lifecycle captured: create / extend_amount / extend_time / merge / split / migrate / withdraw / (un)lock_permanent / transfer, incl. cw20 send-hook locks + Votion/arb/launch-nft wrapper events. Events carry **`canonical`** (filter wrapper dupes for VP math). `tla-history-annotate.js` retro-tagged the seed (schema v2). Resilient ASC pager ported from the nft backfills. Per-cron README is current.
- **`price-history-data_2026`** — `price-history-backfill.js` (Action, one-time) → 23 tokens × ~365d CoinGecko USD. DONE + validated. **Orphan cleanup pending:** the dead archive-node `ratio-history-backfill.*` + `ratio-history-probe.*` were committed here during exploration — safe to delete (ratio history lives in network-and-prices, not here).
- **`network-and-prices`** — ratio-history forward-capture folded in (end-of-day append) + `ratio-history-consolidate.js` (in network-and-prices-data_2026) recovered ~34 days. 6 LSTs. Closes ampCAPA/ampROAR USD.

See PROJECT_KNOWLEDGE.md "Backfill data layers" for the full status. **Next: wire the Portfolio P&L + Vote Intelligence UIs to these feeds.**

---

### ~~🔥 P1 — TLA Lock NFT backfill~~ ✅ DONE 2026-06-15 (see above)
Same playbook as the aDAO events backfill, new subject: **TLA Lock NFTs** (vAMP Minter CW721 `terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg`). Lifecycle to reconstruct: member **lock creation, merges, unlock starts, unlock completions**, plus **Boost marketplace activity for lock NFTs** (the Boost sweep machinery already exists). First step is browser-probe the lock contract's event/action names (create/merge/unlock) exactly like the `break_nft`/`create_auction` probes — then the sweep script reuses `bbl-sales-backfill.js`'s pager + the events-backfill patterns. Start this in a FRESH chat with: fetch CHANGES_PENDING + cron-scripts/README.md registry section first.

### 🔥 P1 — Switch adao-positions Render schedule from weekly to daily
**Identified 2026-05-17. Confirmed still pending 2026-06-06.** The cron is currently scheduled `0 1 * * 1` (Mondays only). For the Portfolio Tracker dashboard to accumulate meaningful position history, it needs to run **daily**. The cron code now produces a `data/daily/{YYYY-MM-DD}.json` archive on every run — that file overwrites within a day, so daily cadence gives one snapshot per calendar day.

Two changes required:
1. **[ ] Update Render cron expression**: `0 1 * * 1` → `0 1 * * *` (manual click in Render dashboard)
2. **[x] Update `next_expected_run_at` constant in `adao-positions.js`** — done 2026-05-17, now `25 * 60 * 60 * 1000` (25 hours)

Ship both together. If only the Render click happens, the heartbeat is wrong; if only the code change is deployed, the dashboard flags the cron stale every 25 hours.

Without the Render change, letting things run for weeks produces 0 weeks of Portfolio Tracker history. **Top priority — should ship before any other accumulated-data work.**

---

### 🔥 P1 — Migrate `index.html` off retired admin-tool storage repos
**Identified 2026-06-05 during deving.zone outage investigation.** The page still reads from old admin-tool storage repos (`tla_json_storage`, `tla-ext_json_storage`) that stopped publishing on **2026-05-17**. The page silently falls back to epoch 185 (now 3+ weeks stale) labeled "STALE - N epochs old" in the console but renders without obvious warning to users.

Affected fetches in `index.html`:
- `fetchTlaData()` — `tla_json_storage/main/tla-data-epoch-N-end.json` (last write epoch 185)
- `fetchTlaExtData()` — `tla-ext_json_storage/main/tla-ext-epoch-N-end.json` (last write epoch 185)

The data now lives across multiple `_2026` repos with different schemas. Field mapping documented in catalog-log.md (Rev 0.15 deep-dive).

**Path forward:** Hybrid approach — `fetchTlaExtData` has a clean 1:1 mapping to `network-and-prices-data_2026/data/network-and-prices.json` (do this first, 1-2 hrs). `fetchTlaData` needs multi-source composition (do as separate larger pass, 4-6 hrs).

**Why P1 now:** every passing day the stale data drifts further. Member-facing tiles (TLA Deposits, Locks, treasury balances) become wrong.

---

### 🟢 P2 — Add timeout / AbortController to all `await response.json()` calls in `index.html`
**Identified 2026-06-05** during deving.zone outage. When deving.zone returned 200 OK headers but stalled mid-body, `fetch().catch()` didn't fire (it only handles network errors), `response.json()` hung forever waiting for body end, and the page appeared blank/spinning with no JS error.

**Fix pattern:**
```js
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
fetch(url, { signal: controller.signal })
  .finally(() => clearTimeout(timeoutId))
const data = await response.json().catch(() => null);
```

Apply to all four primary fetches (`onChainStatsUrl`, `contractUrl`, `ampLunaRateUrl`, `priceUrl`) and any other `.json()` in the page. Without this, any third-party endpoint hiccup blanks the page silently.

---

### 🟢 P2 — Filter LCD 500 responses on "no new proposal" as not-an-error
**Identified 2026-06-05.** The `checkForLiveProposals` loop in `index.html` queries `terra1va3tny5...` for proposals 38, 39, 40, 41, 42 to detect new ones. The contract throws 500 when proposal doesn't exist — which is the **normal case** (no new proposals). The page logs these as errors, generating ~5 console errors per page load even when nothing is wrong.

**Fix:** Treat HTTP 500 with a "proposal does not exist" error body as "no new proposal" (not an error). Stop the loop on first 500 (proposals are sequential).

---

### 🟢 P2 — Migrate `index.html` inline live-data code to `aDAOLive` library
**Identified 2026-05-28 (Rev 3.47).** The shared library `lib/adao-live-data.js` is now the canonical source for live RPC fetching, but `index.html` still has its own inline copies of `fetchLiveTlaDeposits`, `queryChain`, `fetchTlaSharedCatalog`, `fetchLiveTlaDepositsFromChain`, etc. They coexist (both work) but the duplication will drift. Migrate incrementally — when touching one of these code paths for another reason, swap it for the library call.

Bonus: removes ~300 lines from `index.html`, helping cold-start parse time slightly.

### 🟢 P2 — Migrate `dao_treasury.html` inline live-balance code to `aDAOLive.getDaoTreasury()`
**Identified 2026-05-28.** `dao_treasury.html` already pulled live wallet balances correctly before the library existed (it was the first page to use this pattern). Now that `aDAOLive.getDaoTreasury()` does the same thing with consistent caching across pages, migrate. The library was tested to return identical values ($13,912.14 across 9 priced tokens) against the page's own code at deploy time, so this is a safe drop-in.

### 🟢 P2 — Fix TLA Deposits modal inside `index.html` to show live per-pool data
**Identified 2026-05-28.** The TLA Deposits modal (drill-down from the tile) still shows snapshot per-pool data. With `aDAOLive.getDaoTlaDeposits()` already returning live per-position data (16 positions including bluechip + single-asset), the modal can show real-time per-pool breakdowns. Estimated ~80 lines to wire up.

### 🟢 P2 — Enterprise Staked chart shows 403→503 jump in history
**Identified 2026-05-24 (Rev 3.43).** The Enterprise Staked tile now correctly shows 403 (excluding 100 DAO-controlled broken NFTs), but historical chart data captured before the filter was applied shows the unfiltered 503 count. Cron-side fix needed in the source data — either backfill the historical archive files with the corrected counts, or have the dashboard apply the same filter when rendering historical points.

### 🟡 P2 — APR outliers for stable pairs (USDC-USDT, USDC-EURe)
**Discovered 2026-05-17 audit.** These two pools show APR ~5× higher than Eris's number for the same pool. Specific to stable pools — non-stable pools are internally consistent. Likely tied to stable-pair price normalization in the `tla-snapshot` cron's APR formula. Needs investigation.

### 🟡 P2 — Null-dex unnamed pool inflates Astroport count by 1
**Discovered 2026-05-17 audit.** `tla-snapshot` cron has one entry with `name: "cw20:terra1hqq6..."` and `dex: null`. The normalizer defaults null dex to "Astroport" (`p.dex || 'Astroport'`), making this pool count toward the Astroport total. Real fix is cron-side: either classify or skip the unnamed pool. Cosmetic but indicates a classification gap.

### 🟡 P2 — IBC denom resolution gap in network-and-prices
**Discovered 2026-05-17 audit.** The LUNA-USDC bribe asset (`ibc/8D8A7F7253615E5F76CB6252A1E1BD921D5EDB7BBAAF8913FB1C77FF125D9995`) is not in the 27-token `network-and-prices` index. Eris prices this bribe at $12.93 but our resolver returns $0. Fix: add explicit IBC-denom → symbol mapping for known TLA-relevant denoms in the `network-and-prices` cron.

Note: Rev 3.48 added native-denom lookups including this IBC hash → ASTRO in the vote-rewards capture path inside `index.html` as a local workaround. Cron-side fix would let other consumers benefit too.

### 🟢 P2 — CoinGecko bulk fetch failing in `network-and-prices-data_2026`
**Identified 2026-06-05.** The `network-and-prices` cron heartbeat reports `coingecko_bulk.ok = false` causing overall `status = partial`. Astroport prices are filling the gap so user-facing data still works, but CG bulk is failing systematically (rate-limited 429s observed in the cron log). Investigation needed in the `network-and-prices` cron code.

### 🟢 P2 — TLA Chain Registry catalog: acquisition guide curation pass
**Identified 2026-06-02 audit. Still pending.** Council members (especially the owner) have first-hand verified routes for tokens they actually hold. Several tokens in TLA still have `auto_suggested` or `route_known_unverified` guides where a council member could provide a verified route.

Drafts captured in `catalog-log.md` Rev 0.10 narrative:
- **ATOM** — standard Keplr IBC from Cosmos Hub. Verified by owner 2026-06-02 (deposit test).
- **USDC** — Swapped.com → Keplr Noble → IBC to Terra. Verified by owner 2026-06-02.
- **wBTC.atom** — Skip.go bridge from Ethereum WBTC (Eureka path). Route_known_unverified.
- **PAXG** — same Skip.go pattern from Ethereum. Route_known_unverified.
- **wBTC.creda.a** — Creda Finance minting on Terra (not a bridge). Unverified.
- **USDt** — auto-suggested guide will show "Kava-suspected" from bridge data.
- **EURe** — owner noted "truly don't know how you get it"; auto-derived shows source-chain hint.

Effort: low per token (a JSON entry). High clarity benefit — users deposit into the wrong variant if they pick the wrong bridge.

### 🟢 P2 — TLA Chain Registry catalog: Eris CG-ID outreach
**Identified 2026-06-02 audit. Still pending.** 3 tokens have `coingecko_match = "mismatched"` where Eris's `/prices` claims a CoinGecko ID that doesn't actually match the token on CG's terra-2 platform list. These produce wrong USD prices on any consumer that trusts Eris's claim directly.

User-side: ping Eris team, ask them to correct the mappings in their backend. Catalog-side: already handled (Stage 7c flags as mismatched, downstream consumers can skip).

### 🟢 P2 — TLA Chain Registry catalog: fill council member curation candidates
**Identified 2026-06-05 (Rev 0.15).** 125 TLA member wallets have no curated label and no PFPK profile name. Top 30 by VP templatized in `tla-chain-registry/curated/curation-candidates.json` (drop-in compatible with `wallets.json`).

User action: open the file, fill in `label` fields for addresses you recognize, merge into `wallets.json` under the `wallets` key, push. Next cron run picks them up.

Biggest unnamed wallet: 5.4M VP (`terra13aae4futz6jk...`) — significant council member.

### 🟢 P3 — NFT Inventory cron — Rev C: tier architecture (hot/warm/cold split)
**Identified 2026-06-07 during Rev B design. Stage 1 SHIPPED as Rev C.1 (2026-06-07).** Rev B ran a single hourly full scan. Rev C splits into:
- **Hot** (every 15 min): user-held + marketplace + recently-unstaked (~1,100 NFTs)
- **Warm** (daily): hot ∪ staked (DAODAO + Enterprise, ~3,200 NFTs)
- **Cold/full** (weekly Mon 02:00): all 10k, full reconcile, rebuilds `hot-set.json`

**Stage 1 (Rev C.1) — DONE:** mode infrastructure via `RUN_MODE` env, `hot-set.json` membership file, scoped per-NFT fetch + `mergeRecords` onto the last full base, full-scan fallback. One script / three Render jobs. Default `full` = unchanged behavior. Deploy steps in cron README "Deployment (tiered modes)". Mode only changes per-NFT scope; Phases 3-7 identical, so output is always a complete 10k picture.

**Stage 2 — TODO (activity deltas):** each hot run diffs against the previous hot snapshot and appends what moved (transfers, list/delist, stake/unstake/claim, sales) to the day's activity log. This is what powers traffic/volume charts (net first-vs-last endpoint diffs would miss intra-day churn — must accumulate per-run deltas).

**Stage 3 — TODO (rollups):** finalize each daily file as opening snapshot + closing snapshot + accumulated activity; then aggregate daily→weekly (`weekly/<YYYY-Www>.json`)→monthly (`monthly/<YYYY-MM>.json`)→yearly (`yearly/<YYYY>.json`). Higher periods are rollups of the dailies, NOT fresh endpoint diffs. Forward-only (no backfill — LCDs prune).

Achieves ~50% query reduction vs the old full-every-hour, 4× freshness on hot data. Manual promotion to hot via `tla-chain-registry/curated/nft-overrides.json` when the DAO releases NFTs via prop; weekly cold reconcile is the safety net (max 7-day drift). **Page (Rev 2) reads the merged `nfts.json` regardless of which tier produced each record — schema is identical.**

### 🟢 P3 — NFT Inventory cron — Rev D: daily yield timeline
**Identified 2026-06-07.** Parse `update_rewards_callback` events from chain transaction history → exact daily ampLUNA inflows + 7d/30d/all-time rolling averages + annualized APR calculation. Pattern decoded from txn `70757515D0FEBE07DABC2013CAC9217514C16AE252AA54BF5E395A9885215B18` on 2026-04-25.

Daily inflow ~809 ampLUNA today (90% of 899 ampLUNA produced by Alliance staking → 10% goes to DAO main wallet). Per-NFT daily yield = `daily_inflow / unbroken_count` = ~0.091 ampLUNA today.

Rev B's `data/daily/{YYYY-MM-DD}.json` snapshot already captures the substrate — Rev D adds the txn-history parser and surfaces timeline charts on the explorer page.

### 🟢 P3 — NFT Inventory cron — Rev E: pending-unstake tracking
**Identified 2026-06-07. DAODAO half SHIPPED as Rev B.3 (2026-06-07).** DAODAO pending-claim tracking is live: count is chain-truth (`custody − total_power_at_height`), per-wallet attribution tracked forward via `unstake`/`claim_nfts` tx-search, persisted in `data/v2/pending-claims.json`, self-reconciling. Note the original `claims{address}` idea was superseded — that query is per-address only and misses full-unstakers (zero VP, zero in-wallet), so we use the historical event diff instead. **Remaining:** (a) explorer-side "ready to claim" nudge — see P1 item 8 below; (b) Enterprise NFT staking pending-unstake tracking (if Enterprise exposes a claim queue — not yet investigated; lower value, far fewer unstakes there).

### 🟢 P3 — NFT Inventory cron — Rev F: marketplace offers + bid history
**Identified 2026-06-07.** BBL `collection_offers_by_contract` (collection-wide buy offers), Atrium `offers_by_nft` + `collection_offers_for_collection`, BBL `bid_history_by_auction_id` (per-auction bid timeline). Surface buyer demand + live auction bid feed.

### 🟢 P3 — Generic multi-collection NFT inventory cron (Rev G future direction)
**Identified 2026-06-07.** The nft-inventory architecture (all_tokens enum → per-NFT info → marketplace integration) is collection-agnostic. Rev G could parameterize the cron to track any cw721 on Terra — including the other 7 Terra collections on BBL (Skeleton Punks, pixeLions, Galactic Punks, SoulReapers, Burning Lion Festival, Origin Enigma, Scandalous Birds). One cron writes per-collection JSON files; any future explorer page can read whichever collection it cares about. Same chain-of-truth pattern applied broadly.

Out of scope for current TLA work — note for future direction. Lion DAO collections (pixeLions, Burning Lion Festival) noted as candidates if/when there's user demand for an "ecosystem NFT catalog" page.

### 🟢 P3 — SS API migration
**Identified 2026-05-04.** The SS API migrated to `/api/pools` ~May 4. The cron already handles the new endpoint but `test.html` temporarily hides SS lines (legacy display logic). Cleanup: re-enable SS lines in `test.html` once verified, or remove if no longer needed.

---

## 🆕 New ideas / not yet prioritized

### 🔥 P1 — Deploy `tla-flows` (LP-flow event capture) to Render  ⚠ STILL NOT DEPLOYED (2026-06-25)
**Confirmed 2026-06-25: no `flows/` data exists in tla-core (all paths 404).** The
cron was built + locally verified but the Render deploy never landed data. This
**blocks verifying 24hr position change from the test txs** (the `terra1n28…` zap
test) — there's no captured event data to compare against. Next: confirm the Render
service exists, points at tla-core with the flows output path, runs, and commits.
Built + locally verified 2026-06-24 (parser 42/42 on real data; `tx_search` + cost capture confirmed live on the free LCD). Code `cron-scripts/tla-flows/`; writes the **new `tla-core` repo, `flows/` module**. Wire a 15-min Render cron (`node tla-flows.js`, `TLA_OUT_DIR`→tla-core checkout `flows/`, commit step as fuel). Once running it accumulates exact claim timing + entry/exit slippage/fees forward. Backfill = the same loop from a genesis start height (deep history needs an archive node — public LCDs prune). See `tla-flows/README.md` + PROJECT_KNOWLEDGE "TLA LP-flow event capture".

> ✅ **Storage layout SETTLED (2026-06-24) — deploy unblocked.** The `tla-core`
> module→product→files convention is finalized in
> `website-adao-core/TLA-CORE-STORAGE-DESIGN.md`. Decision: the paths `tla-flows`
> already writes — `flows/events/{heartbeat,index,cursor}.json` + `2026/MM/DD.jsonl`
> — are **correct as-is; no cron output-path change needed.** Deploy the current code.

### 🟢 P2 — Tools spec'd on the flow data (build after capture is accumulating)
Specs to be fleshed out from real captured data:
- **Net-P&L waterfall (per position):** deposits − withdrawals + claimed yield − entry slippage − exit slippage ± IL ± price. The "what did I actually make, after all costs" number — closes out the realized-APR work. Runs off `tla-flows` + `adao-positions` daily + ratio/price history.
- **Realized-APR audit:** advertised (`approx_apr_pct`) vs realized per pool; the per-pool delta = the compounder's reward fee. Band tightens once `tla-flows` exact claim timing replaces daily-snapshot granularity. (See the realized-APR correction in PROJECT_KNOWLEDGE — APR-vs-APY, bribes-are-separate.)
- **DAO slippage/fee ledger:** total zap slippage + swap fees members have paid entering/exiting — a transparency number from `cost.swaps` / `cost.provide_slippage_pct`.
- **Zap-Out Optimizer (live, prospective — distinct from the capture):** for a position, simulate exit to each withdraw-token (LUNA/ampLUNA/bLUNA/ASTRO/USDC/SOLID/CAPA/WHALEs/ROAR) via Astroport `simulate`/`reverse_simulation` at current reserves; rank by total slippage → cheapest exit + arb signal (a non-pool exit is multi-hop, much costlier — proven: LUNA 0.05% vs USDC 0.43%). `tla-flows` realized costs calibrate the simulator's predictions.

**Boundary marker:** bribes/votes are a SEPARATE stream (`tla-history` + `pending_bribes`), to VOTERS not LP depositors — deliberately out of LP-flow scope. Don't "find" a phantom gap there.

### 🔍 PRICE AUDIT — hub-ratio vs market pricing for "calculated-eris" LSTs (flagged 2026-06-14)
Discovered while validating the Votion cron against Votion's own UI: our
`network-and-prices` cron prices 5 LSTs by **hub-ratio** ("calculated-eris"):
**ampLUNA, arbLUNA, bLUNA, ampCAPA, ampROAR**. Everything else is market-priced
(Astroport/CoinGecko) and fine. Hub-ratio pricing is only accurate for CLEAN
staking derivatives; it breaks for STRATEGY tokens whose market value lags their
theoretical backing.
- **ampLUNA** — clean staking. Validated vs Votion: ~1.5% match. ✅ OK
- **bLUNA** — clean liquid-staking (Backbone). Likely OK, spot-check recommended.
- **arbLUNA** — arbitrage strategy. **CONFIRMED ~14% HIGH** (hub $0.1516 vs market
  ~$0.133). Biggest TLA lock asset (~15M VP), so this matters. Has a LUNA-arbLUNA
  Astroport pool for a market reference.
- **ampCAPA** — amp strategy on CAPA. **UNVERIFIED** — could have the same gap.
  ampCAPA single pool / LUNA-CAPA refs available to check.
- **ampROAR** — amp strategy on ROAR. **UNVERIFIED** — could have the same gap.
  ampROAR-ROAR pool available to check.

**Audit task:** for each of the 5, compare hub-ratio price vs its Astroport
market price. Where they diverge (strategy tokens), `network-and-prices` should
**prefer the market price** as `final_price_usd` (it already does market pricing
for most tokens — these 5 just fall back to hub-ratio). Fixing at the SOURCE
corrects everywhere downstream at once: tla-locks stale-VP, member portfolios,
treasury, Votion. **Until fixed, any USD figure including arbLUNA/ampCAPA/ampROAR
may be overstated.** Interim: Votion tags `underlying_usd_price_source` so the UI
can show our feed + a market feed side-by-side. Full detail in
`NOTE-arbLUNA-pricing-gap.md`.

**Standing canary idea:** periodically cross-check our prices against an
independent feed (CoinGecko / Astroport market) — mismatched prices are how users
get misled, and we only caught arbLUNA by validating against an external UI.



### Phase 1+ direction (post Phase 0 lock-in)

After Rev 0.16 locked in Phase 0, four directions for next phase:

- **A. TLA Stats migration** — evolve existing 7,000-line `tla-stats.html` Rev 3.51 to consume catalog data via `aDAOLive.getTlaCatalog()`. Big effort but biggest user impact.
- **B. Member Stats `dao-tla.html`** — net-new page using catalog as foundation. Per-member VP, positions, voting patterns, P&L. Fresh build, no legacy.
- **C. `index.html` migration** — close the tech debt from the deving.zone investigation (also overlaps with P1 above).
- **D. Portfolio Tracker** — depends on adao-positions daily archive being in place (P1 above), then time-series + P&L.

User to choose direction at next session start.

### Hardening: third-party endpoint resilience
The deving.zone outage exposed how a single third-party JSON endpoint hanging mid-body can blank the entire page. Pattern in P2 above (AbortController on `.json()`) is the immediate fix. Broader hardening could include:
- Cached fallback for `deving.zone/nfts/alliance_daos.json` (we have 157-member CSV)
- Service worker or `<noscript>` fallback page
- Surface "feature degraded" banner instead of blank when key endpoints fail

---

## ✅ Recently shipped (last 30 days, summarized — full detail in changelogs)

- **NFT events backfill + forward-fill (2026-06-11)**: One-time sweep (`nft-events-backfill.js` + Action in the data repo) reconstructed `data/v2/broken-at.json` — **1,093/1,093 break timestamps, zero missing** (breaks are executed on the NFT contract, so capture is frontend-agnostic: Atrium-UI and Boost-UI breaks verified) — and `data/v2/listing-history.json` — **3,264 listings** back to Dec 2023 (BBL 3,121 / Boost 122 / Atrium 21) with derived outcomes **1,252 sold / 1,958 delisted / 54 active / 0 unknown** (sold = sales-enriched match, token-strict; delisted = provenance exit timestamp; no cancel-event needed). Forward-fill folded into the 6-hour incremental Action with per-stream watermarks (new breaks append; new creates append; active listings auto-close to sold/delisted). Same parsers serve both callers — one implementation, no drift.
- **NFT Inventory floor-history + first-seen + bids (2026-06-11)**: `data/v2/floor-history.json` — daily per-tier (broken/base/phoenix) row: listed count, listing floor, sales floor (median of last 5/10/3 enriched sales by `notional_usd`, n recorded), avg days-on-market, per-NFT backing USD, active bids. Same-date upsert, prior dates immutable, never-shrink guard. `data/v2/listing-first-seen.json` — DOM accrual from 2026-06-11 (Atrium `created_at` heights preserved for future precision upgrade). Full/warm runs only.
- **BBL listing-resolver fixes (2026-06-10/11)**: (1) Phantom listing excluded — chain-live-but-not-buyable auction 14765 set a fake $17.59 floor; warlock (BBL's own API) is now the liveness oracle: chain-only auctions excluded + warned, warlock-down ⇒ unfiltered + warned, never blanked. (2) Completeness — the contract's `auction_by_contract` cursor skips entries (mid-range holes, root cause unknown); 6 live listings recovered directly from warlock (`source:'warlock_recovered'`, denom/price byte-identical to chain). Verified live: 35/35 listings, base floor self-corrected to ~$102. Heartbeat canary: `listing_resolver_warnings`.
- **Data & pipeline registry + hardcode audit (2026-06-11)**: new section in `cron-scripts/README.md` — every producer → outputs → consumers with status labels, cleanup actions (stale `nft-inventory.js` orphan in the data repo; frozen pre-v2 `data/nfts.json`), and a classified hardcode inventory (IMMUTABLE / CONFIG / ASSUMPTION / STALE-PRONE with canaries). Rule it encodes: **one fact, one producer** — e.g. wallet names are owned solely by `adao-positions` (`members.json` via pfpk). Read it before building any new capture.

- **Rarity foundation (2026-06-10)**: Canonical rarity data + page shipped (explorer wiring still pending — see P1 above). `nft-metadata` repo now holds `adao-rarity-intended.json` (all 10k tokens: object/grade/planned+actual counts/intended_rank/percentile; #9068 = grade 40 rank 24) plus `bbl-rarity.js` + weekly GitHub Action producing `adao-rarity-bbl.json` (mirrors BBL's published ranks; commit-on-change only; broken NFTs faithfully `null`). `rarity-explained.html` Rev 2.0 rewritten around design intent (HashLips planned weights; Object-only grading; Phoenix apex; BBL weather-leakage example with real tokens). Key findings preserved in the P1 spec above.
- **NFT Inventory — staked-NFT staker resolution (2026-06-09/10)**: DAODAO + Enterprise stakes now resolve `real_owner` to the actual staker per token (phantom-whale fix — staking contracts no longer appear as top holders). DAODAO via `staked_nfts{address}` per staker (157, sums to 1,632 = exactly the DAODAO UI); Enterprise via `user_stake{user,limit}` per member with `total_user_stake` completeness check. `daodao_pending_claim` per-record flag (29 = chain truth; 15 untracked inferred pending, custody = active + pending definitionally); 81 Enterprise legacy stakes unattributable (abandoned contract, no reverse lookup) → flagged `enterprise_unattributed`, label "Enterprise (legacy, unattributed)". `dao_members_count` corrected 746 → **157** (DAODAO governance only; Enterprise ≠ DAO membership) with new `non_custody_holders_count` (746) for "anyone holding." Hard errors (query failure/truncation) flip status `partial`; known-incomplete-upstream stragglers are warnings, status stays `ok`. Verified live: error_count 0, classification sums to 10,000. Detail in cron README.
- **NFT Inventory Rev C.1 (2026-06-07)**: Tiered run modes, stage 1. `RUN_MODE` env (`full` default / `warm` / `hot`) scopes the per-NFT fetch only; Phases 3-7 run identically so output is always a complete 10k `nfts.json`. Full (weekly) rebuilds `hot-set.json`; warm (daily) re-fetches hot ∪ staked; hot (15 min) re-fetches the hot set — both merge fresh records onto the last full base, with full-scan fallback if base/hot-set unreadable. One script, three Render jobs (deploy steps in cron README). Merge/derive unit-tested; live cadence verified on Render. Stages 2 (activity deltas) + 3 (daily→weekly→monthly→yearly rollups) still to come. Gets 15-min fresh active data + ~50% query reduction.
- **NFT Inventory Rev B.7 (2026-06-07)**: Atrium listings schema-drift fix. `listings_by_collection` started 500'ing (`unknown field collection` — contract renamed the field). `fetchAtriumListings` now self-resolves the collection field name by probing common CosmWasm conventions (`collection_addr`, `nft_contract`, etc.), memoizes the winner, and logs the contract's full valid-field list if none match. No regression (Atrium NFTs already classified by ownership; this restores price/seller detail). Confirm via the `ℹ Atrium collection field resolved to '…'` log line on the Render run. This was the last known cron-side error — all three marketplaces + pricing + pending-claims now clean.
- **NFT Inventory Rev B.6 (2026-06-07)**: DAODAO pending-claim tx-search fix. LCD started rejecting the query (`400 "specify tx.height with strict equality"`) because it carried a `tx.height>` range; dropped the height term from the query and moved height filtering client-side in `fetchDaodaoTxs`. Restores forward per-wallet attribution tracking (count was always chain-truth; only the "who" was frozen). Parsers/reducer unchanged; logic re-verified (genesis replay → [1319,3605,6847,7123], incremental no-op, forward claim removal). Confirmed live: `lastScannedHeight` advanced 21353559 → 21355202. Detail in cron README.
- **NFT Inventory Rev B.5 (2026-06-07)**: USD pricing fix — it had been silently skipping (both sister-cron URLs 404'd, and the parser assumed a schema that didn't match). Corrected URLs (`…/data/network-and-prices.json`, `…/2026/current.json`) and rewrote `fetchPriceData` to the real schema: LUNA from `token_prices.LUNA.final_price_usd`, ampLUNA from `token_prices.ampLUNA.final_price_usd` (fallback `lst_ratios.ampLUNA.ratio × luna`), joining registry catalog (address→symbol+decimals) with `token_prices` (symbol→price). Verified live: LUNA $0.0512, ampLUNA $0.1103 → `treasury_value_usd` ≈ $86.8K, `per_nft_value_usd` ≈ $9.74 (were null). Marketplace listing USD now resolves. Detail in cron README "Rev history".
- **NFT Inventory Rev B.4 (2026-06-07)**: Marketplace pagination hardening. Fixed log-spam (`⚠ NFT #X listed on BOTH BBL and BBL` repeated to the page cap) that surfaced once BBL active listings crossed 30 (now 43) and pagination began re-fetching the same window. All three marketplace fetchers now de-dupe by listing id and break the page loop when a page brings nothing new; merge warning now fires only on genuine cross-marketplace conflicts. Data was always correct (one listing kept per token, classification sums to 10000) — fix removes noise + ~100 wasted queries/run. Marketplace data layer only; classification/pending-claim logic untouched. Detail in cron README "Rev history".

- **NFT Inventory Rev B.3 (2026-06-07)**: DAODAO pending-claim tracking. Surfaces NFTs unstaked from DAODAO but not yet claimed (7-day queue, or forgotten indefinitely). Count is chain-truth (`daodao_staked` custody − `total_power_at_height` active stake = 1,661 − 1,657 = 4); per-wallet attribution tracked forward via `unstake`/`claim_nfts` tx-search, persisted in `data/v2/pending-claims.json`, reconciled every run (heartbeat `daodao_pending_reconciled`). Seeded once with 4 verified legacy forgotten-claims (tokens 1319, 3605, 6847, 7123); self-maintaining thereafter. Verified end-to-end against full chain history before deploy. Inline in `nft-inventory.js` (+~196 lines, additive). New `summary.daodao_pending_claim` block. Explorer "ready to claim" nudge is the page-side follow-up (P1 item 8).

- **NFT Inventory Rev B (2026-06-07)**: Schema v2 + chain-of-truth replacement for deving.zone. Treasury/Enterprise classification fixed (898 treasury + 403 real Enterprise stakes + 100 DAO-controlled Enterprise broken). All 3 marketplaces (BBL 43 + Atrium 1 + Boost 4) with seller resolution. Backing data (ampLUNA balance + per-NFT share). Sister cron price integration for USD conversion. Daily snapshots for future timeline work. ~250 lines new code in `cron-scripts/nft-inventory/nft-inventory.js`, schema v1→v2 with backward-compat aliases preserved so existing dashboard JS keeps working during Rev 2 migration window. Detail in `cron-scripts/nft-inventory/README.md` "Rev history". Page-side migration (Rev 2) deferred to next session — see P1 above.
- **Rev 0.16 (2026-06-06)**: Phase 0 lock-in — 5 polish fixes (Eris not labeled DEX, pair_type normalization, definitional failure detection, SS source synthesis, expanded fingerprint)
- **Rev 0.15 (2026-06-06)**: contract_info via cw2 raw storage (fixes Rev 0.14 error spam), SS indexer correction, avatar capture defensive ungating, curation candidates file
- **Rev 0.14 (2026-06-05)**: Pool architecture surfacing — all 75 pools get architecture object (contract, version, pair_type, dex)
- **Rev 0.13 (2026-06-05)**: Wallet names + avatars — 668/668 wallets have meaningful labels (PFPK names + synthesized DAO-membership labels)
- **Rev 0.12.x (2026-06-05)**: Token logos (3-layer system) + curated URL audit + CDN cache bypass via SHA-pinned URLs
- **Rev 0.11 (2026-06-05)**: amplp classification fix — 65 amplps fully classified with bucket inheritance
- **Rev 0.10 (2026-06-02)**: 10 systemic catalog fixes (self-referential vault detection, Stage 5/6/7 cascade, source coverage transparency)

Phase 0 LOCKED IN as of 2026-06-06 after Rev 0.16 deploy.


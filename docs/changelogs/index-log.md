# Index Page Changelog

## 2026-08-25 — legacy chrome strip, batch 1 (12 pages) + adao-lore shared footer

The inline copies of the shared chrome (style#shared-chrome-css, the changelog
modal, the mobile bottom nav, the SHARED CHROME SCRIPT block) removed from
alliances, dao, dao_tla_deposits, dao_treasury, index, nft-explorer-index,
release-history, tla-catalog, tla-chain-queries, tla-docs, tla-stats —
all mount the shared header + footer, which already provide both. adao-lore
had a header but its own inline footer; it now mounts SiteFooter (Rev 2.9
carried) and its inline chrome is gone. Every page boot-smoked (no uncaught
errors); all gates green. Kept on purpose: ampcapa-tool, fuel-tool,
tla-catalog-edit — their inline chrome IS their chrome (tool pages keep their
own header/footer per owner); not legacy duplicates. Dead CSS rules for the
old bottom nav still sit in index/tla-catalog/tla-chain-queries stylesheets
(harmless; strip with the next CSS pass).

## 2026-08-24 — index 4.07 — Pulse Votion rows: annualised figures removed, per-period reward kept

Owner: Votion's page shows ampLUNA-Max asset 36.87% / arbLUNA-Max 16.57%
(Eris 36.81 / 15.63); ours showed 34.8% / 39.4%. Diagnosis from the product's
own basis notes: the headline was `realized_7d` — vault exchange-rate growth
over a 7.7-day window compounded to a year, and the "asset" leg the same on
the LST hub rate. Fine for ampLUNA; wrong for arbLUNA, whose vault books
profit in lumps (0.70% in one week → 39% "APY" against a real ~16%). A week
is not a rate. What matches Votion to the cent is the forward leg: expected
reward $48.77 / $262.12 per period (Votion: $49.05 / $263.63) and 0.87% /
0.79% of TVL. The rows now show exactly that — % this period, $ expected,
TVL, link — and no APR/APY at all; the tooltip says why. The realized series
stays in the product (labeled measured) for anyone who wants it; the page no
longer headlines it.

## 2026-08-24 — index 4.06 — All Current Listings 10 at a time

Same treatment as the activity feed, and the bigger win: 63 listing cards each
carry an NFT image. Now 10 render (count reads "10 of 63"), "Load 10 more
(N left)" appends; any filter or collection switch resets to the first 10.
Smoke-tested on a 63-listing fixture through the live renderer.

## 2026-08-24 — index 4.05 — rewards popup from products, activity feed aDAO-first in pages of 10, decoded proposal messages

Owner walk, five items. **Unclaimed TLA Rewards popup**: amounts were already
live from the right contracts (staking buckets, zLUNA connectors, gauge
controller `user_pending_rebase`, bribe manager); two things were not — the
"Last claimed" labels were hardcoded constants (Sep/Dec 2025) that had
drifted 6–10 months from chain, and the bribe rows printed the map KEY (the
raw denom) instead of the token name. Now: last claims come from the
dao-dashboard product (`last_claims`, derived by the cron from the treasury's
claim executions in tla-flows — deposit 2026-07-07, bribes/rebase
2026-01-11, locks 2026-07-07 — with a tx link; unknown renders as "not seen",
never a remembered date), and token names fall back to the token catalog
(USDC/USDT/SOLID/LUNA instead of ibc/…). **Live Activity**: default tab aDAO;
rows render 10 at a time with "Load 10 more" — every aDAO row carries an NFT
image, so this cuts 60 image fetches at first paint to 10. **Quick audit**:
the ledger now reads the two amount shapes it was blind to (a cw20 call's
`{spender|recipient, amount}` is in the token being called; cw-asset
`{amount, info}` in add_bribe), names `for_info` pools from the register, and
notes the distribution window; new **Decoded messages** block shows the raw
JSON with every address named inline (green = a registry knows it, amber =
the part to check) and every amount in human units. Gate
`gate-index-audit.mjs` on Lion DAO #26: "3,500,000,000 ROAR" both places,
"for pool: ROAR-ampROAR LP (Astroport)", 10 LUNA attached, unknown-LP → soft.
8/8. **News feed**: capture question written up (SPEC-news-feed) — X needs a
paid key, everything else is a probe + cron; not built.

## 2026-08-24 — verify.html 1.0 (new) · index 4.04 — "Verify us": contracts, code, audits, governance, data

Owner walk: the Contract tile held two links. New page `verify.html`: the
canonical Alliance DAO set (collection, minter, Ally denom, DAO core /
proposal / voting modules, treasury, council multisig, broken-security
holder, mint-era Enterprise treasury, the three candy machines with their
reconciled counts, legacy Enterprise staking, ampLUNA hub) each with copy +
explorer; code and audits (TFL's contract repo with the audit inside it,
SCV's report, tla-core / platform-crons / this site); the governance that
made it (Terra #4801, Growth Proposal, Enterprise props 10/11/14, DAODAO
proposals); the data products anyone can re-derive with the guard that
protects each; and the org's full contract register (59) loaded live,
grouped by protocol, unverified entries tagged. Law enforced by the gate:
every address on the page must exist in a chain product — it caught one
(the proposal module) completed from memory before delivery. The minter
was added to `known_contracts.json` (sourced to the TFL README, code 2325)
so the register, not a README, is its home. Index 4.04: Contract tile gains
"Contract Source" and "Verify us". Header alias `verify → index`. Gate 6/6.

## 2026-08-24 — owner eyes-on walk, batch 1: alliances 1.5 · rarity-explained 1.1

**alliances 1.5** — owner: page is right as it is; add a front door for
prospective partners. Added under "Forge Your Alliance": three tracks (NFT
collection · token/protocol · projects on other chains) each with how a past
deal was actually shaped (Pixel Lions OTC → treasury; 3B ROAR three ways;
Eris backing), a copyable proposal template, and the honest process line
(Telegram → community poll → proposal in both DAOs; the DAO decides
on-chain). Owner HAR: the story image `Ozara North.png` was 3.2 MB — 60% of
the page and its slowest asset; now a 213 KB WebP (same 1500² art), lazy.
Zero failed requests in the HAR.

**rarity-explained 1.1** — owner: "make sure this is accurate". Every claim
re-derived from the metadata the page itself links. Reproduced exactly:
all object counts, 40/32/20/20/16 layers, planet 480–520, inhabitant
463–543, Lightning strike 6, Grade 1 = 466, Grade 40 = 25, BBL #1–#6 Sabers,
#7–#12 lightning-strike tokens with their intended ranks, native-planet 967,
home-system 80 (under "any Object carrying the species' name" — now stated).
Corrected: Phoenix Rising's BBL rank is #48–#73 as one block (page said
"roughly #66"); the most common Light is Clear (1,739), not Sunlight (507),
with three lights at exactly 1,000; the BBL capture date (2026-06-10; 8,931
ranked; 22 of 433 broken carried a rank) is now stated — the broken count has
grown since, so the BBL side is a dated snapshot and reads as one. Owner HAR:
1.7 MB, 1.0 s, zero failures.

## 2026-08-24 — page-walk mechanical pass: index 4.03 · fuel-tool 2.5 (+ dao 1.10, tla-stats T3.18, release-history 1.5)

Every page booted in jsdom against committed products (errors, fetch
inventory, first-paint weight, dead reads, legacy chrome). Record:
`docs/pending-changes/AUDIT-page-walk-2026-08-24.md`. Fixed here: fuel-tool's
volume bars loaded 30 daily JSON snapshots (8.1 MB) for one pool — now the
19 KB daily CSVs, first paint 9.4 → 1.86 MB; index logo-library link pointed
at a deleted personal repo — now the site's own assets folder (which is what
the library renders from). dao / tla-stats credit links moved to tla-core.
Queued with counts: legacy chrome strip is 15 pages, not 1; index 33 MB /
tla-stats 9.5 MB / member-portfolio 5.5 MB share one fix (slim daily series).

## 2026-08-24 — fuel-tool 2.4 — deep links into the trade planner (FUEL queue item b, step 1)

"Plan a trade into FUEL →" / "out of FUEL →" under the supply map, landing on
slippage.html Rev 3.0 with FROM/TO preset.

## 2026-08-24 — fuel-tool 2.3 — FUEL supply map + Boost DAO stakers (Neutron) from the product; dead second pass removed

Top of the page: FUEL SUPPLY MAP strip (native supply bar: Boost staked ·
unbonding · treasury · bridged to Terra · Neutron liquid, guard state in the
corner). Whales panel now reads `supply/fuel/wallets.json` in four sections:
Boost DAO stakers (governance power, unbonding chips), Neutron liquid top 15,
Terra IBC top 15, and the structural contracts listed separately with their
roles so nobody reads the treasury as a whale. Verified names from the trust
register. Terra-only live scan kept as the labeled fallback. Gate
`gate-fuel-tool.mjs` 14/14 (fixture from the live cron module) — and it
caught a live bug: a legacy 24h Astroport liquidity/volume second pass
referenced an undefined `FUEL_POOL` and had failed silently since 2.0; its
targets were already set by dex-data/getTokens, so the pass was deleted.

## 2026-08-24 — ampcapa-tool 2.3 (CAPA in TLA LP: the five TLA-side forms) · fuel-tool 2.2 (whales legible)

**ampcapa-tool 2.3** — owner walk: the CAPA-in-TLA-LP tab showed two columns
from two browser scans (Astro LP liquid + Astro LP TLA-plain; every "Direct"
cell read 0 because the LP sits in Astroport Incentives). It now reads
`supply/capa/wallets.json` and shows the five forms the owner named, each a
sum-guarded product column: LP · not in TLA (Astro + SS liquid) · LP · TLA
amplified · LP · TLA plain · ampCAPA · TLA plain · ampCAPA · amplified, not
in DAO (receipt held + unbonding; the in-DAO receipt is the DAO Members tab).
Astro/SS breakdown on hover, `?` for unknown forms, bucket contracts hidden
unless toggled (the compounder then shows every amplified position as ONE
plain-stake row — the visible proof there is no double count), verified
labels, CSV with all five. The Astro-only browser scan remains as a labeled
fallback. Owner's double-count question answered from the live file: a
wallet's plain stake is keyed by its own address in the staking contract,
its amplified stake by the compounder's — disjoint by construction; Σ every
holder's receipt forms = 50,575,920 CAPA = receipt supply × rates =
compounder plain-stake entry 50,575,748 (Δ 0.0003%, take-rate timing).
Gate 53/53 (+T1–T12, treasury/owner/W5/W6/W7 cells exact, toggle, sort,
CSV, footer rev).

**fuel-tool 2.2** — the FUEL Whales table was wrapped in `.stat-sub` (the
10px `#4a4840` caption style) and read as a footnote. Own styling now:
rank dim, verified name in accent, address mono, amount bold. Boost DAO
member positions (Neutron) still not shown — probe Action delivered (docs-log);
capture follows the probe.

## 2026-08-24 — ampcapa-tool 2.2 — members-tab change periods from the org series; dead feed gone; verified labels

The 24H/7D/30D Δ column on DAO Members read `defipatriot/ampcapa-data_2026`
(cron dead since 08-10; its dailies 404). It now reads
`token-catalog/supply/capa/wallets-daily/` — latest committed day at or
before today−N — and the badge names the comparison day actually used
("7D vs 2026-08-17 (legacy weekly)") so weekly-resolution history is never
mistaken for a daily. A member whose value was unknown on the comparison day
gets NEW/—, never a fabricated delta. Zero fetches to the personal repo
remain on the page. Whale rows now carry the VERIFIED label from
`catalog/trusted/current.json` when one exists (Phoenix Directive DAO core,
etc.); unlabeled stays unlabeled (pattern ≠ identity). Gate 41/41 (+M1–M8:
live DAO enumeration stubbed, exact deltas per period, legacy badge, null →
NEW, dead-feed fetch would throw, trust label join). Footer rev 2.2.

## 2026-08-24 — ampcapa-tool 2.1 — CAPA Whales from the product (13 forms), live scan demoted

The whale tab now reads `token-catalog/supply/capa/wallets.json` first: one
column per custody form (liquid CAPA · gov · ampCAPA liquid · ampCAPA in TLA ·
receipt in DAO · receipt held / unbonding · CAPA-LUNA LP across Astro + SS,
liquid + TLA + amplified) with hover breakdowns, a source line showing cron
capture time, status and sum-guard state (13/13 green or which failed), the
enumerated/published/floor counts and any unattributable remainder. Threshold
filters client-side; `?` cells (never 0) when an enumeration was incomplete;
structural bucket contracts hidden unless toggled, other contracts (the aDAO
treasury is a DAODAO core) shown as holders with a *contract* chip. CSV export
carries all 13 forms. The browser scan stays as ⛏ LIVE (4 forms) — labeled
partial, offered only when the product is unavailable; no table is invented.
Footer rev string corrected (read "Rev 1.3" since before 2.0). Gate
`gate-ampcapa-whales.mjs` (jsdom, fixture derived from the LIVE cron module)
33/33: owner + treasury cells exact, threshold/sort/toggle/CSV, incomplete
and product-down scenarios. Still reading the dead `ampcapa-data_2026`
snapshots: the members tab's 24h/7d/30d change columns — queued (needs a
compact per-wallet daily).

## 2026-08-24 — FUEL history fold (owner catch)

The owner asked where the older FUEL history went — and it was sitting in
`docs/pending-changes/F2B-fuel-price-series.json`: 95 days (2026-05-17→08-20)
extracted verbatim from dex-data daily CSVs during F2, filed as a fixture,
never merged. Folded into `price-history/2026/{05,06,07,08}.json` under
prior-verbatim (committed rows untouched, only missing dates filled), src
tagged `F2b fold`, confidence 60 with a `single_source_reserve_snapshot` flag —
labeled repair, never silent. FUEL series: 32 → ~117 confirmed days; the
fuel-tool ALL/90D charts fill immediately. Fixture retained with a merged-at
note. Never-shrink asserted per month.

## 2026-08-24 — tools batch: fuel-tool 2.0 · ampcapa-tool 2.0 · tools 1.6 · help-agent v1.11.4

**fuel-tool 2.0** (was broken — its history repo `defipatriot/tla-core` is 404):
price history now from org `price-history` months (confirmed captures only; no
epoch estimates — an estimated line dressed as history is a phantom, removed
with `buildChartDual`); natural 7D/30D/90D/ALL ranges replace the epoch tabs;
volume bars + TVL line under the price chart from committed `dex-data` dailies
(≤30d, honestly labeled); new strip: DEX TVL, Staked-in-TLA (+gauge VP), live
bribes for this pool with epoch-settle countdown, Votion optimizer next-epoch
plan; FUEL Whales table from LCD `denom_owners` (Terra IBC only — Boost staking
is on Neutron and the page says so). Gate: jsdom on fixtures, 7/7.

**ampcapa-tool 2.0**: CAPA SUPPLY MAP strip at the top reading
`token-catalog/supply/capa/current.json` — level-1 and level-2 bars with cron
status + guard state, the hub-stakes-in-gov overlap explained inline, and a note
that big negative 24h table moves can be a pending 3-day unbond (owner's own
position demonstrated it). Whale table below unchanged (live scan stays until
per-wallet rows land in the product).

**tools 1.6**: page split into LIVE TOOLS (ampCAPA, FUEL, Trade Cost Simulator)
and TOOLS IN DEVELOPMENT (TLA Catalog, Chain Queries, Catalog Edit + the
dynamic test-page tiles, which keep injecting into the dev grid).

**help-agent v1.11.4**: `docs/ecosystem-knowledge/boost-dao.md` + facts in the
corpus (what Boost is, FUEL's Terra IBC identity, what the agent must NOT claim
— tokenomics, Neutron staking, audit status), and the CAPA supply map added to
the product allow-list so answers can cite it.

Noted for the pulse review (queued, not changed here): the pulse FUEL chart
reads network-and-prices dailies, which price FUEL sparsely; once daily pricing
via token-catalog has depth the chart fills on its own — revisit the tab then,
and consider a current-FUEL-price readout in the strip.

## 2026-08-24 — batch 3 (same package as batch 2): CAPA supply map spec + probe · contracts fold

- **SPEC-capa-supply-map.md** — all nine custody forms of CAPA (two-level: CAPA
  buckets sum to supply; ampCAPA buckets sum to CAPA-in-hub via the hub rate),
  as a duty inside org-token-catalog at `token-catalog/supply/capa/`. Lists every
  neighbour that must move with a new product (DATA-MAP, system-health gate,
  cron-registry.js, help-agent allow-list, REPO-CATALOG, changelog, facts).
- **capa-supply-probe** Action (read-only): reads every bucket for the treasury
  + owner wallets and collection totals; learns the unknown query shapes (Solid
  gov, ampCAPA DAO voting module, SkeletonSwap pool) by trying candidates and
  reporting which answered; null never coerced to 0; concurrency 4 with backoff.
  Mock-gated end-to-end against a stubbed LCD (shape fallback, pagination,
  per-LP math). Its run log + artifact are the gate for the cron duty.
- **docs/curated/known_contracts.json** +5 Phoenix Directive contracts folded from
  the legacy registry (FEE_COLLECTOR, CONNECTOR stable/bluechip, PDT_CONFIG_OWNER,
  VE_GUARDIAN) — first step of the tools-to-org fold.

Deferred with the mapping written (CHANGES_PENDING): FUEL tool repoint (price
from price-history, TVL/volume from dex-data/astroport daily — 32 sparse FUEL
days since 2025-12-28), TLA Catalog / Chain Queries repoint (needs
`amplp_mappings` published), ampCAPA tool repoint (needs the supply product).

## 2026-08-24 — batch 2: index 4.02 · footer v3.3 (owner HAR + console, index load)

Owner HAR of the index: 447 requests, 68 MB, `onLoad` at 32.2 s while
`DOMContentLoaded` was 2.1 s. Diagnosis and what this rev does about it:

- **Votion rows dashed out** (owner report): the pulse asks for *today's*
  `votion/snapshots/daily/<date>.json`, which is written later in the day than
  the astro daily that sets `latest`; 404 → null → "—" on vault TVL and both
  Max rows. Rev 3.99 gave the member feed a nearest-capture fallback; Votion now
  has the same (`nearest(daily.votion, latest, 3)`). Data was never missing.
- **`window.load` held 31.8 s by `boostdao.io/favicon.ico`** — three tiles
  loaded remote favicons (TLA, BBL, Boost). Repointed to local logo assets.
  Anything gated on `load` (timeout fallbacks) was waiting on Boost's server.
- **nfts.json (7 MB) downloaded twice**: the V2 marketplace loader used its own
  `get()` instead of `__jsonOnce`. Deduped — 7 MB less per load.
- **`assets/token-logos/wBTC.png` was 2000×2000, 1.03 MB** for a 20 px tile.
  Resized to 128×128 (19 KB). `ATOM` logo path pointed at a missing `atom.png`;
  now `atom.svg` (exists).
- Marketplace thumbnail `<img>`s get `loading="lazy" decoding="async"` (65
  imagedelivery requests, 8.5 MB, were eager).

Footer **v3.3**: Creda added to the ecosystem banner; Atrium, Votion and Creda
tiles carry logos, all vendored in /assets/images (owner committed them 2026-08-24;
votion-logo-optimized.png resized 365 KB → 128 px). 10 tiles. links.html **1.6**:
Atrium and Creda cards use the same logos.

STILL THE BULK OF THE LOAD — cron work, logged in CHANGES_PENDING:
the pulse chart and the TLA history chart fan out one request per day per
product: 56 × tla-snapshot/daily (9.9 MB), 49 × astroport/snapshots/daily
(13.8 MB), 28 × skeletonswap daily, 21 × network-and-prices daily, 10 × monthly
bribe event files (3.1 MB). ~28 MB and ~165 requests that should be one slim
`index.json` row series per product (the backing-history pattern). sessionStorage
makes repeat visits cheap; first visit pays it all. Also seen: the
`network-and-prices/daily/2026-08-11.json` 404 is the same 08-11 hole as
backing-history.

Gate: count==1 anchors; 8/8 inline blocks `node --check`; footer jsdom gate 10
tiles / Creda present / all logos; Votion fallback is the Rev 3.99 pattern
verbatim (not fixture-gated here — the pulse module has no standalone gate yet;
owed).

## 2026-08-23 — page-walk batch 1: index 4.01 · ally 3.5 · tools 1.5 · links 1.5 · tutorials 1.6 · footer v3.2 · header picker slot

Site-wide (shared libs, every page picks these up):
- **Footer v3.2** — the Ecosystem column became a left-to-right banner of logo
  tiles (9 venues; Atrium and Votion render as lettermarks until logo assets
  land; any failed logo degrades to a lettermark, never a broken image). Site /
  This project columns rebalanced. **@DeFi_Patriot · Telegram** and **· X** added
  under This project as the builder's direct line.
- **Header picker slot** — `#sh-picker` sized to content, so the VIEWING pill
  never grew past its 22em minimum and the full address truncated. Slot now
  `min(42em,100%)`; name + full terra1… address fit on desktop.
- **Legacy chrome strip** (tools, ally, links, tutorials): the per-page
  `shared-chrome-css`, `changelogModal`, `mobile-bottom-nav` and "SHARED CHROME
  SCRIPT" blocks were all orphaned once lib/site-header.js took over (it hides
  `.mobile-bottom-nav` and owns the active tab; Changelog links to GitHub). ~230
  lines per page, zero visible change. Index still carries its copy — its own walk.

index.html → **Rev 4.01**: missing `logo_stamp_primary.png` (aDAO tab icon,
silently hidden) repointed to the real logo; pixeLions thumbnails (3 sites) moved
from the retired deving.zone CDN to the CID in `nft-collections/pixel-lions/
collection.json` via one `pixelionsImageUrl()` helper; two hardcoded BBL
`pinataGatewayToken` URLs removed (collection.json: never hardcode it); defunct
`cloudflare-ipfs.com` fallback → ipfs.io; inline `REV` 3.98 vs footer 4.00 drift
fixed (both 4.01); stale deving.zone comments corrected. Internal tile links: all
15 resolve. External tiles: owner click-check.

ally.html → **Rev 3.5** (the reason for this batch):
- **Daily gain had been on the hardcoded 0.21 fallback since 2026-08-11.**
  backing-history.json migrated to `{rows:[…]}` that day; ally still read the
  legacy `{history:[…]}` key, found nothing, and showed "Fallback Gain" with
  0.2100 exactly. Now the same `rows` read and latest-two-rows math as the index
  tile; the fallback constant is deleted; if the series is unreadable the gain
  cells say "Daily gain unavailable" in red and the slider projection says
  "unavailable" (blank beats phantom). Real value at delivery: +0.318 LUNA/day.
- **"+40% Yield Boost"** (2023 proposal-era estimate, hardcoded) replaced by a live
  tile: ampLUNA hub-rate growth over the last ≤31 rows of the same series,
  annualised, with the window named in the subtext (29.2% over 39 days at delivery).
- **"~0.61% of Total LUNA Staking Rewards"** relabelled to what it computes: share
  of all *bonded* LUNA that is aDAO backing. The true reward share needs the Ally
  asset's Alliance `reward_weight` (queued: read `/terra/alliances`, record as a
  fact, then restore a rewards-share tile). Static "~0.72%" placeholder removed.
- **10% tile** is now a button opening "Where the 10% goes": the daily
  `alliance_claim_rewards` by the Eris bot → bond to ampLUNA → 90% holders / 10%
  DAO wallet, with the decoded 2026-04-25 tx (1,874 LUNA → 899 ampLUNA → 809 + 89).
  This page is the only place the mechanism is shown.
- Claim section offers **Boost and Atrium** (both support breaking); the one video
  is labelled as the Boost walkthrough.
- Gate (`gate-ally.mjs`, jsdom on real summary.json + backing-history.json, LCD
  stubbed to the day's values): per-NFT gain cell equals the two-row math to 4dp;
  status names the window; slider max = `unbroken_count` (8,907); projection at
  max equals per-NFT gain; yield tile equals the series math; no "0.2100" anywhere;
  error path withholds the gain while backing stays live. 11/11.

tools.html → **Rev 1.5**: 2023 "About this site" band (dual footer, linked the
personal GitHub) removed; dead ampCAPA calculator script (~90 lines, the tool
moved to ampcapa-tool.html) removed — it was the `Cannot read properties of null
(reading 'addEventListener')` console error. Test-page tiles (test.html …
test-5.html probes) kept by owner decision; the 404s they log are the probe
working.

links.html → **Rev 1.5**: Deving.zone card removed (retired pipeline; this site
is the analytics now). Added Astroport, The Liquidity Alliance, SkeletonSwap
(URL from ecosystem-knowledge/skeletonswap.md). Atrium keeps its "A" lettermark
until a logo asset is provided.

tutorials.html → **Rev 1.6**: legacy chrome strip only; owner walk found nothing
else.

Help agent: new corpus doc `docs/ecosystem-knowledge/alliance-dao.md` +
`alliance-dao.facts.json` (12 facts, chain-sourced where decoded) and both added
to `CORPUS_SOURCES` (help-agent v1.11.2). Until now the agent had no aDAO
mechanics in its corpus — "where does the 10% go" could not be answered from a
citation.

FINDINGS logged, not fixed here:
- `nfts/adao/snapshots/backing-history.json` has **no rows 2026-08-11 → 08-19**
  (migrated series ends 08-10, `org-nft-daily` rows start 08-20) and its `date_range.end`
  / `missing_dates` metadata is stale. Cron item.
- Font drift: index/ally use Inter; dao/tla-stats and the shared libs use Outfit +
  JetBrains Mono. Owner to pick the canonical family.
- `address-catalog.html` has no Vercel analytics tag.
- tools.html: "2023 footer" note in PROJECT_KNOWLEDGE was stale — it was already on
  lib v3.1; the band removed here was the separate About section.
- The four legacy tools (Trade Cost Simulator, TLA Catalog, TLA Chain Queries,
  Catalog Edit) are owed a purpose review — fold into Help/Docs or retire.

## Rev 4.00 — 2026-08-23 — audit arc milestone

The index audit-and-revamp arc closes at a round number. Since 3.9x: VP Locked /
VP potential change-rows fixed (nearest-day fallback for the late-publishing
member daily), the untrustworthy Votion realized/combined-APY chips dropped
(forward APR + TVL remain), the 2023-era dual footer retired for the shared lib
footer v3.1 (uniform project column, honest wording — the "no tracking" claim
removed, anonymous page metrics and public-chain-data disclosed), and the
ecosystem row rebuilt to the owner's nine venues.

---

## 2026-08-21 — Unified chrome milestone (site-wide)

One header, one address picker, one ticker, one in-page tab component on every
core page (SPEC-unified-header §3–§9). Libs: `lib/site-header.js` (index header in
the TLA Stats theme; logo = tab height 3.25rem; VIEWING address row; CoinGecko
marquee; `SiteHeader.subnav()` = the TLA-Stats-style tab strip under the header
with a right status slot), `lib/address-picker.js` (typeahead: case-insensitive
name prefix→substring, exact first; terra1 prefix; paste-through; 3–6 char
last-N either direction; full finder with group tabs + sorts; rows = name — full
address [copy → "Copied, please verify" card]; selection contract URL→remembered→
saved, always-visible ×, one-tap Save for home-screen; `tla:wallet` event;
entities from `catalog.entities`, never hardcoded), `lib/site-footer.js` (help
drawer wallet = the global selection; "Choose an address" → finder). Every page
mounts the header/picker; local search boxes/tab strips are hidden receivers so
existing page logic is untouched. All steps jsdom-gated 0 fails.

index: own header + own ticker retired (lib renders both); refresh strip moved
into the sub-nav right slot; mobile bottom bar kept. adao-lore: header + picker.
transparency-hub + help: header, picker, sub-nav (hub: Updates · Docs · System
Health · Endpoints with live badges mirrored). Catalog cron 1.2.0 publishes the
curated `wallets.json` register as `entities` (see cron-address-catalog-log).

## 2026-08-20 — tla-ext rescue + epoch-band backfill plan (tla-stats)

- **RESCUE (paste before deleting tla-ext_json_storage!)**: the legacy repo's
  irreplaceable epoch-era data copied verbatim into
  docs/archive-2026-08/tla-ext-rescue/ — tla_ext_historical{,_2025,_2026}
  (LP epoch data, epochs 141–166), nine tla-ext-epoch-{165..185}-end
  snapshots, tla_pd_bribes, tla_metadata. Once this lands, deleting the
  personal repo loses nothing.
- **tla-stats band popups** ("more history will appear as epochs are
  tracked"): the store is real and correctly starting at E199 — but deep
  backfill is now proven possible: Active Pools / TLA TVL / avg APRs from
  the org astroport per-epoch files (E184→now, 16 epochs on disk) plus the
  rescued ext historicals + epoch-end files (E141–166, bridging toward the
  fold); Epoch Bribes from the tla-voting bribe streams (FCD re-derive
  reaches TLA genesis); Epoch Rewards from gauge distributions. Booked as
  the epoch-band backfill — next session, after reading the store schema.

## Rev I-A10 — 2026-08-21 — calculators PROVEN working (harness-gated); chips corrected

Root cause named by an in-fn try/catch under a Node DOM harness:
unmintedCount is null until the dashboard fetch lands, and
null.toLocaleString() threw — silently blanking every output below it.
Both calculator instances are now fully self-contained (inline price/
backing resolution, no cross-scope helper calls), null-hardened
(fail-honest early return — no fake math), and the chart instance wraps
in try/catch so one bad element can never blank the rest. Harness-gated
on real fixtures: SOLID 49.75 x 5,828 -> $287K total / $58K backing /
+$229K premium / 5.0x — the owner's exact acceptance case. Chips
corrected: venue collection floors are typically the CHEAPEST listing
(= BROKEN), so the BBL/Atrium chips set NFT-Type to Broken to match what
they fill; a third "Unbroken floor (USD)" chip fills the lowest unbroken
listing from the Backing/Floor tile. Chips sit on their own wrapped row
(basis-full) and manual entry always works — chips only pre-fill.

## Rev I-A8 — 2026-08-20 — band LUNA prices 15/16; chart-modal calculator parity; members booked

- **epoch-band-history luna prices**: the deep source was the tla-snapshot
  dailies (totals.rewards.luna_price_used, full archive since 2026-05-13) —
  price chain now np-daily → snapshot-daily with nearest-day walkback and a
  cap-at-today rule for the current epoch. Coverage 15/16; E184 ends
  2026-05-11, two days before the archive exists — its "--" is the true
  floor, not a gap to chase.
- **Chart-modal calculator parity**: the Unminted popup carries its OWN
  calculator instance (different element ids) that the I-A7 pass missed —
  it now matches the main one: SOLID in the list, live BBL/Atrium floor
  chips (useLiveFloor targets whichever calculator asked), SOLID price
  path, Atrium beside Backbone/Boost in the links row.
- **DAO Members trend**: measured conclusion — NO daily member-count field
  exists in any product (dao-dashboard dashboard carries none); the tile's
  155 is computed live. Trending it requires a capture rider (member-count
  daily into dao-dashboard) — booked as such; no chart can honestly ship
  before the data exists.
- Unminted history status: July 31 remains the only complete month-end
  (org unminted_count begins 07-01; backing resumes nightly as of tonight
  → the Aug partial point appears on its own). Deeper unminted requires the
  mint-event replay — queued with the epoch-band rewards/bribes work.

## Rev I-A7 — 2026-08-20 — treasury-held history (drift ZERO); calculator modernized; trend queue

- **derive.js v1.1**: treasury wallet added to the transfers replay — truth
  test across the org-captured era: worst drift 0. treasury_held_count now
  carries 18 months of history: exactly 898, unmoved since Jan 2025 — a flat
  line, but a chain-verifiable one. Fail-honest rule built in: if treasury
  drift ever exceeds tolerance on a rerun, that field is withheld while
  staked fields still emit.
- **Market Value Calculator**: SOLID added to the denomination list (top —
  Atrium prices in SOLID; conversion fail-honest at 0 if no SOLID price is
  cached); one-tap "BBL floor" / "Atrium floor" chips fill the live floor
  from the marketplace cards already on the page (same number, zero
  refetch); Atrium link added beside Backbone/Boost.
- **Trend backfills triaged for next session**: DAO TLA VP history —
  derivable by replaying the treasury's lock events (tla-voting/events,
  full history) with weekly boost-decay slope math; capture-gap rows before
  the VP fields joined dao-dashboard are honest. Unminted backing deep
  history — needs mint-event replay (unminted count) × backing-history;
  fills to Apr-2026 immediately, deeper when mint capture lands. DAO
  members — dd carries the count since 06-12; distinct-holder derivation
  from inventory snapshots gives the deep series; tracked as a first-class
  metric per owner.

## Rev I-A6 — 2026-08-20 — 18 months of staked-count history RECOVERED (transfers replay)

The deleted legacy repos took the daily staked-count files with them — but
not the events that produced them. New derivation
(.github/scripts/state-history-backfill/derive.js): every NFT transfer
to/from the DAODAO and Enterprise staking contracts, replayed ANCHORED at
the first org-captured day (2026-07-01), walking deltas backward to
2025-01-01. Built-in truth test: forward replay across all 50 org-captured
days reproduces them with worst drift 1 NFT (same-day capture timing) —
the run refuses to emit above tolerance. 546 derived days land as
state-history months 2025-01..2026-06, day rows carrying only the proven
fields + source "derived:transfers-replay-v1"; org months untouched.
Recovered history: DAODAO 1,160 → 1,631 staked; Enterprise 452 → 403.
Site: V2 floor opened to 2025-01-01, month-end probing reaches the derived
era, network-and-prices per-day fetches guarded at their real floor
(2026-05-13). Gated on the REAL merged series: Monthly now fills all 14
slots (Jul-2025 → Aug-2026 partial); Epoch 14 weeks. Also: Staking APR now
reads docs/"Staking APR.csv" — SmartStake's native download name, upload
as-is forever (source links to SmartStake + the CSV added in the modal);
DELETE the old docs/staking-apr.csv after pasting (one canonical file).

## Rev I-A5 — 2026-08-20 — view order Daily·Epoch·Monthly (Daily default); APR source link

- Granularity tabs reordered per owner spec; Daily is the default view.
- Staking APR overlay: source link added in the modal (Secondary Axis row) →
  tla-core/docs/staking-apr.csv, the org-rescued series (1,485 rows,
  2022-05-29 → 2026-06-22). Extend it by pencil-editing the CSV; a live LCD
  sampler (annual_provisions / bonded) is queued to end manual imports.
- Legacy-data hunt CONCLUDED: all legacy NFT daily repos are already
  deleted; the surviving tla-ext_json_storage holds LP epochs + the APR csv
  only — no staked counts. Deep DAODAO/Enterprise staked history is
  therefore derivable ONLY by replaying stake/unstake events from the org
  transfers stream (captured to genesis by the archive walk) into
  state-history rows — booked as the top chart-queue item.

## Rev I-A4.1 — 2026-08-20 — aggregator scope crash fixed (empty Epoch/Monthly views)

I-A4 called the page-level epoch helpers from a different script scope —
Epoch/Monthly modes threw at runtime on every metric: empty chart strip,
stale All Data Points table carried over from the last working render
(which is why the DAODAO Staked modal displayed LUNA backing rows). Daily
survived because it only needed the helpers for gap slots. The gate had
injected the helpers into its harness and so could not catch it.
aggregateSnapshots is now fully self-contained (own epoch constants), gap
placeholders for the current partial period cap at today instead of the
epoch's future end-date, and the gate now evals the function exactly as the
page scopes it — zero injected helpers — plus real-epoch fixtures for both
the backing archive shape and the young state-history source. 8/8.

## Rev I-A4 — 2026-08-20 — uniform 14-slot chart views (owner spec)

aggregateSnapshots rewritten: every view now renders the last 14 CALENDAR
period slots (14 days / 14 epochs / 14 months), newest on the right, with
the CURRENT partial period always the newest point (latest captured
reading — the missing-August bug). Slots before a source existed are
trimmed from the left; slots inside the archive with a missing metric
render as gaps, never fabricated zeros. Unit-gated on real-shaped series:
the actual backing archive shape (Apr start + producer gap 08-11..19 +
resume today) and the young state-history source (Jul start → honest
two-slot Monthly).

## Rev I-A3.1 — 2026-08-20 — April backing restored; chart-view truth documented

- Month-end probing floored at the global per-day EARLIEST (2026-05-13),
  cutting April even though backing-history begins 2026-04-13. Month-ends
  now floor at the oldest single-file source; per-day sources keep their own
  guards.
- Measured source floors, so nobody re-diagnoses honest gaps as bugs:
  backing-history 2026-04-13 → daily · state-history (staked counts)
  2026-07-01 → daily (their one-point Monthly IS the full archive) ·
  dao-dashboard daily 2026-06-12 · ratio-history ZERO rows (producer never
  existed org-side — queued).
- QUEUED (next session, first item): uniform view slots — each view renders
  the last 14 period slots (day/epoch/month) with the CURRENT partial period
  as the newest point (latest captured day); missing metrics render as gaps,
  never fabricated zeros.
## Rev I-A3 — 2026-08-20 — tile trend charts read the full archive

Monthly/Epoch chart views sample month-end / epoch-end dates — but the
assembler only probed the last 45 days, so Monthly showed ONE point while
backing-history holds 120 daily rows back to April. The assembler now
additionally probes just the month-end and epoch-end dates back to each
source's start (a handful of cheap fetches); Daily stays a 45-day window,
long views fill from the whole archive. Companion producer fix in
platform-crons (nft cron Rev C.5): the backing-history daily APPENDER was
never ported in the fold — the series froze at 2026-08-10 with every row
stamped migrated:. One write-once row per day resumes tonight.
Known remaining gap (queued): network-and-prices ratio-history.json has
ZERO rows — its producer never ran org-side; LST-ratio overlays stay empty
until that producer ships.

## Rev I-A2 — 2026-08-20 — health dot delegation (red-dot root cause)

index's local refreshHealthIndicator computed its own verdict and overwrote
the shared wireHealth's data-overall — the two setters fought and the local
legacy-cadenced verdict won: red dot on index while the hub (shared
registry) read 100%. Fixed with the same delegation as tla-stats T5.2:
SiteFooter.wireHealth when present, local logic fallback-only.

## site-footer — 2026-08-20 — Help link added

lib/site-footer.js LINKS now leads with Help (help.html) on every page;
help-log.md registered in PAGE_LOG. See help-log.md Rev 1.0.

## Hub Rev H2 — 2026-08-20 — Updates tab reads the merged changelogs

The Updates feed parsed CHANGES_PENDING.md, which the 08-19 queue rewrite
turned into a lean cleanup list — freezing the tab at 08-09 while work
shipped daily. Updates now merges the real running record
(docs/changelogs/tla-log, index-log, portfolio-log, cron-lp-grades-log)
plus the queue for milestone items — newest first, each entry chipped with
its source; changelog entries default SHIPPED, queue entries BUILDING.
Functional-gated on the real changelog files: 18 entries parse, T5.x on top.

## Rev I-A1 — 2026-08-20 — Live Activity reads org streams; collection tabs

The feed showed "No activity in the last 7 days" while 400+ events happened —
because it fetched the BBL warlock API through a CORS proxy and rendered only
BBL auctionHistory: the venue with the LEAST aDAO traffic, invisible to
Atrium/Boost sales, all listings/cancels, transfers, and lock events. Rewired
to the org streams (nfts/adao/flows + transfers + tla-voting/events/locks,
current + previous month): first live render shows 408 events in 7 days.

- Rows: sales with price/venue, listings/delistings, transfers (marketplace
  escrow legs deduped — the flows stream already tells that story), Staked/
  Unstaked via the known staking contracts (aDAO DAODAO, Enterprise), and
  human-labeled lock events (New lock, Merged, Added to, Set auto-max, …).
  Every row links its tx where the stream carries a hash.
- Tabs: All / aDAO / TLA Locks live now; Pixel Lions shown disabled with a
  tooltip until its capture ships (SPEC-activity-feed). Full taxonomy
  (venue-attributed memos, derived price changes, new-member) lands with that
  build.
- "updates nightly" chip: streams roll up ~00:00 UTC — today's actions appear
  after tonight's rollup. Honest, stated.
- Seam note: the old wrapper fn (setupActivityFeed) is preserved — an external
  caller depends on it; the first splice orphaned its brace and the per-script
  syntax sweep caught it before delivery.

## Rev 3.80 — 2026-08-19 — floor tile corrected, shared health registry, Atrium complete

**The floor tile was wrong, and the cause was a stale source I introduced.**
Atrium's CURRENT listings were read from `listing-history.json` filtered to
`outcome:'active'`. That file is the FROZEN one-time backfill (builtAt
2026-08-04) migrated during the strip — its active flags were 15 days stale, so
delisted NFTs still counted. Concretely it kept #2852 at 50 SOLID alive, which
dragged the headline Unbroken Floor to $50 when the true floor was $73.52, and
inflated Atrium's count from 17 to 19. Current listings now come from
`nfts.json` (the LIVE inventory, ~15 min). listing-history keeps its real job —
HISTORY (lifecycles, listing start times) — not "what is listed right now".
**Law: a frozen backfill may answer "what happened", never "what is true now".**

**The $77 → $50 flash was two writers on one element.** A BBL-only path wrote
the tile, then the cross-marketplace override rewrote it moments later. The
BBL-only value is now explicitly provisional ("BBL only · checking other
venues…") and the cross-venue writer marks itself authoritative
(`dataset.crossMpFloor`) so it cannot be clobbered.

**Floor tile contract, restated:** show the TRUE floor in USD across every
marketplace, to be read against backing. WHERE that floor lives is the
marketplace tiles' job below. Broken listings are EXCLUDED deliberately — they
forfeited their backing claim, so pricing backing against a broken ask compares
two different assets. Today: backing $9.53 vs unbroken floor $73.52 = 13%
covered; including the lone broken ask at $9.80 would read a misleading 97%.
The subtext now names only the venues that actually reported.

**Shared health registry.** index no longer owns a private cron list —
`CRON_REGISTRY` derives from `lib/cron-registry.js`, shared with tla-stats and
transparency-hub. Corrections it exposed: `adao-positions` was still described
as WEEKLY after being folded into the hourly member-data job (a day-long outage
would have shown green); `bribes-history` was daily when org-tla-voting captures
every ~15 min; seven products nobody monitored were added (dao-dashboard,
tla-flows, dao-governance, nft-analytics, nft-flows, token-catalog,
address-catalog). token-catalog was later corrected from hourly to ~6h — a
healthy job was reading "RUN PENDING".

**Freshness ≠ findings.** A product reporting `status:"violation"` (system-health
flagging an invariant) is that job WORKING. Conflating them turned healthy jobs
red. Findings are surfaced separately and never colour the dot. Result: 94% →
100% confidence with zero real problems.

**Footer dot fixed twice.** First the CSS vocabulary (index keys off
`fresh|warning|stale`; the script was setting `ok|watch|degraded`, so no
selector matched and every dot stayed red). Then the shared footer for pages
without Tailwind, which needed scoped CSS and a Font Awesome fallback.

**Atrium completed:** real logo in its marketplace tile (with lettered
fallback), and its "View" link had been missing the `/atrium/` path segment —
it would have 404'd.

## Rev 3.76 — 2026-08-11 — full org cutover: NFT/backing/votion/bribes repoint + health registry

Every legacy data reference on this page is now org or a deliberate dead
fallback. Repointed: NFT inventory (v2/* → `nfts/adao/snapshots/*`), NFT day
state (per-day files → `state-history/{yyyy}/{mm}.json`, days keyed by date),
NFT sales (manual `nft-sales-YYYY.json` → chain-backfilled `sales-history` /
`sales-enriched`, 1,221 sales back to 2023-12), backing (per-day files → the
merged canonical `backing-history.json`), staking APR, adao props →
dao-originations, and all five health heartbeats.

**Two structural adapters** (the repoint alone would have silently produced
empty charts):
- `backingRowFor(date)` — the retired backing cron wrote one file per day; the
  org series is ONE file with `rows[]`. Fetch once, index by date. Also fixed
  `fetchBackingCronHistory` which read `idx.history` (legacy) → now
  `idx.rows || idx.history`. This is why the backing-per-NFT chart popups and
  the avg-daily-gain tile were empty.
- `stateRowFor(date)` — NFT day-state is monthly-keyed org-side; fetch each
  month once, cache, return the day. Verified live: 120 backing rows,
  10 state days in 2026/08.

**Health registry corrected for the folds:** +`tla-participants` (new org
product, all lock holders); `adao-positions` weekly → **hourly** (it now runs
inside org-member-data — the weekly thresholds would have hidden a day-long
outage); `bribes-history` daily → hourly and relabelled "Voting & Bribes"
(org-tla-voting captures ~15min). All 9 sources verified live and fresh.

**NFT Marketplace tiles fixed (same paste):** the v2 pipeline fetched
`listing-history.json` and `broken-at.json` UNGUARDED — both 404'd org-side,
the throw killed the whole pipeline, and Atrium sat on "Loading pipeline
data..." with every marketplace total blank. Two fixes: each optional input
now fails to null independently, and six genuinely-missing files were migrated
into the org tree rather than left behind in a dying repo — `listing-history`
(3,291 listing lifecycles back to 2023), `broken-at` (1,093 break events with
tx hashes), `atrium-sales`, `boost-sales`, `luna-usd-daily` (1,473 points),
`bluna-usd-daily` (281). The first two are FROZEN one-time chain backfills
(built 2026-08-04 / 2026-06-11), not live series — exactly the merge-don't-
abandon case. The org NFT cron keeps writing the live half
(listing-first-seen, sales-enriched, nfts, summary).

Known dead fallbacks retained (they fail gracefully and are already guarded):
`tla-data-epoch-N-end` / `tla-ext-epoch-N-end` walk-backs — dao-dashboard is
the primary path and the legacy epoch cron stopped at 185.

## 2026-08-09 — Org cutover: pricing feed + asset self-hosting (grand repoint v1)

Two source migrations, no visual changes intended. (1) Pricing: all 5 legacy
network-and-prices-data_2026 reads → tla-core/network-and-prices (current,
heartbeat, ratio-history, dailies); parallel-feed comparison passed (worst
shared-token deviation 0.74%; org prices 7 tokens legacy nulled; canary
active). (2) Assets: every image/planet/token-logo/nft-metadata URL → root-
absolute /assets/... served from this repo (site repo transferred to
thealliancedao; assets consolidated + sha-verified). Punch list (pre-broken
before AND after): BNB logo.png, logo_stamp_primary.png, atom.png, astro.png.
This is the change history for `index.html` (the dashboard / homepage).
Newest revisions on top. Times are UTC.

This file also covers cross-cutting site changes that affect multiple pages — most non-core pages link here for their changelog rather than maintaining their own.

---

## Rev 3.70 — 2026-08-04 — Bribes this epoch row (owner: "$3 can't be right")

The $3 was right but answered the wrong question (newly-ADDED bribes in
48h, dust-bot era). New row answers the intuitive one: **Bribes this
epoch** — everything sitting in the current epoch's buckets awaiting
voters, from the bribe-state harvest at current prices ($844.27 across 19
pools at epoch 196 at build). PD's governance bribes route via the ve3
manager, not bribe-state — disclosed in-row as additional; full total
lands with pd-bribes integration. The added-in-window row stays (renamed
for clarity) — recent flow and standing pot are both true, different
questions. Gate 58/58. Queued next session: votion-positions ORG-PORT to
platform-crons (the delivered-not-committed v1.1 fix — kills the Votion
"—" permanently under repo law), then cutover, then the Votion epoch view.

## Rev 3.69 — 2026-08-04 — Astroport status semantics fix (site-verified)

the owner's cross-check of app.astroport.fi revealed 'active' persists after
voting ends until finalization (props with Jul-ended votes still 'active').
Card semantics corrected: LIVE = active AND end in future; past-end active
props show an orange **VOTE ENDED — awaiting finalization** badge, keep
their heuristic flags, but no longer claim to be votable. The #30 saga in
full: same submitter's #29 was rejected 89.95% against (community caught
it); #30 was the quiet retry — 2 voters, 100% for, 0.014% turnout, vote
ended Jul 31, presumably pending quorum failure at finalization. Exactly
the attack pattern the 3.68 flags were built for, one governance over.
Gate 55/55.

## Rev 3.68 — 2026-08-04 — governance auto-flags · clear PASSED/REJECTED (owner)

Motivated by a real attack class: buy tokens → post a fund-transfer prop →
pass it on tiny turnout before anyone looks. Cards now carry HEURISTIC
auto-flags (never accusations, disclosed as such): **moves funds** (msgs
scan for bank/send/transfer/spend/recipient), **minimal description**
("Proposal N" titles / empty or duplicated desc), **tiny turnout** (<1% of
total power). A LIVE prop that moves funds with minimal description or
tiny turnout gets a red **Auto-flag** banner naming the pattern and
telling visitors to verify and vote; flagged live props sort first.
Status badges become unambiguous: LIVE amber / PASSED green / REJECTED
red / EXPIRED gray. CAPA-governance slot removed — none exists; ampCAPA
is it. At build time the heuristic fires on a REAL live proposal:
Astroport #30 ("Proposal 30", 580k USDC bank-send, 2 voters, 0.014%
turnout) — the exact pattern, caught by the exact feature, same day it
was requested.

Gate 51/51: real #30 trips review with both flags + turnout; benign
detailed prop stays clean; badge mapping; banner copy; zero har-pending.

## Rev 3.67 — 2026-08-04 — X feed in News (embed + honest fallback)

Latest-posts section in the News tab: account pills for @The_AllianceDAO,
@phoenix_dir, @eris_protocol, @TheLionDAO, @PixeLionsDAO; X embedded
timeline (7-post limit, dark, chrome-stripped). X's read API is paid-only
(~$200/mo) so v1 rides X's free widget — which X sometimes refuses to
render for logged-out visitors; after 6s without a rendered iframe the
section degrades to clean per-account link cards, disclosed in-UI. Upgrade
paths (no page change): cron-fed tla-core/social/current.json behind a
funded X API key, or a curated relay file. Gate 49/49.

## Rev 3.66 — 2026-08-04 — Astroport Assembly adapter (HAR-verified) · Votion epoch-view sourced

**Astroport Assembly live in News**: tRPC getAllProposals adapter
(HAR-verified shape — status 'active' = live, power-weighted Yes/No of
cast, endTimestamp countdown when present, graceful absence on
CORS/outage). Eight governances now tracked. **CAPA gov still pending**:
its HAR captured only staking queries — re-capture with the PROPOSALS
LIST view open.

**Votion epoch-view SOURCED, build queued next session** (context-bounded
deferral, not a data gap): votion.money HAR reveals
backend.erisprotocol.com /votion/liquidity-alliance/{vault}/optimization —
per-vault, per-gauge: votingOptions[{pool, votingPower, usdIncentives}],
activeVoted allocation %, and diff{totalDeviation, isWorthChanging,
currentExpectedRewards, optimizedRewards, rewardLoss, message} at period
197. That is the complete "current vs next allocation + incentive
context" dataset, pre-computed, across six vaults (ampluna/arbluna ×
1/12/max). Next build: Votion-TVL chart tab becomes the vote-optimization
view — grouped current-vs-optimal bars per pool with USD-incentive
context and the worth-changing verdicts, Votion total VP with Δ% above.

Gate 47/47: astroCard pinned on the HAR sample (live, Yes 100% of cast
power, no false countdown; executed → not live); har-pending count drops
to 1 (CAPA).

## Rev 3.65 — 2026-08-04 — all 7 DAODAO governances wired (HAR-verified addresses)

WATCHED_DAOS filled from the owner's HAR captures: aDAO, aDAO Council,
Phoenix Directive, ampCAPA, Lion DAO, Pixellions, Pixellions Council — all
live via direct LCD contract queries (dao-core → proposal modules →
reverse proposals; chain truth, independent of DAODAO's indexer). News tab
now tracks all seven; default-tab law applies across them. Astroport
Assembly + CAPA native gov remain the two har-pending adapters (their gov
pages still need HAR capture). Gate 45/45 with all seven addresses pinned
exactly.

## Rev 3.64 — 2026-08-04 — News/Pulse tabs · governance tracker · VP potential line (owner)

The card becomes two tabs. **Ecosystem News**: governance tracker across
watched DAOs — each card shows prop number, LIVE badge or status, days
left, Yes/No % of votes cast, title, description snippet, and a vote link;
‹ › arrows scroll; live proposals sort first (all of them), otherwise the
latest prop per governance. **Default-tab law: any live proposal anywhere
opens News; none opens Pulse.** DAODAO govs query live on-chain (aDAO +
Council active; Phoenix Directive + ampCAPA slots await dao-core
addresses); Astroport Assembly + CAPA native gov are labeled har-pending —
adapters land once DeFi_Patriot captures HARs of those gov pages.

**VP Locked chart gains a second line**: dashed max-potential VP
(Σ fixed_amount × 10, all locks at 104wk) drawn with the locked line —
the gap IS the ecosystem's lock-extension headroom (93.1% utilized at
build). Chart scale spans both lines.

Deferred to next build (needs Eris gauge-page HAR to verify live query
shapes): vote-optimization epoch view — per-pool current vs next
allocation with bribe-delta context.

Gate 45/45: all prior pins; propCard exact (2.5d left, 75/20% of cast,
live/executed flags); defaultTab law; WATCHED_DAOS v2 shape (2 active + 2
address slots + 2 har-pending); VP potential 08-03 = 31,551,455.34 exact;
tabs + dashed-potential-line markup.

## Rev 3.63 — 2026-08-04 — decision-grade charts: volume bars · SOLID peg tab · FUEL tab-only (owner)

Iteration on 3.62 pre-deploy: (1) FUEL becomes a **chart tab only** — stat
band back to four; the tab is still the only place FUEL price exists
anywhere. (2) **Volume bars** under the price pane, stock-chart style, with
per-bar tooltips: TLA TVL bars = TLA-relevant 24h volume across both dexes;
FUEL bars = LUNA-FUEL pool volume; SOLID bars = both SOLID pools; the
cumulative-incentives chart gets per-month LUNA-added bars under its
always-up line. Metrics without a real volume concept (VP Locked, Votion)
honestly show none. (3) **SOLID peg tab**: daily SOLID USD from
price-history with a dashed **$1.00 baseline** — the peg-drift story at a
glance, with peg-pool volume underneath. Collateral ratio NOT included:
no Solid Protocol state capture exists yet — queued as a new capture
stream rather than faked. Page order stands: pulse on top, NFT + DAO
content follows.

Gate 39/39: all prior pins carried; FUEL-tab-not-tile asserted; TLA volume
08-03 $52,246.60 exact; LUNA-FUEL $49.45; SOLID pools $428.92; volume
null-safety; SOLID peg 08-03 = 1.0026065786247902 exact; baseline +
bars-legend strings.

## Rev 3.62 — 2026-08-04 — pulse ABOVE tiles · FUEL price · live-proposal alerts (owner)

Superseded 3.61 pre-deploy (same-day iteration on the live 3.60 render).
Three additions per the owner review: (1) **Pulse moves to the top** — directly
under the ticker banner, above the nav tile grid; the state of the alliance
is now the first thing the page says. (2) **FUEL price tile + chart** — FUEL
lives in NO price product and exactly ONE pool (LUNA-FUEL, concentrated,
$42.8k): reserve-implied mark, explicitly labeled approximate, joined
against price-history LUNA USD for the daily chart. The landing page is the
only place FUEL price is shown anywhere. (3) **Live-proposal alert strip**
above the stat band: watched DAODAO DAOs are queried live (dao-core →
proposal modules → reverse proposals, open only); each alert links to the
DAO's proposals page and dismisses persistently (localStorage) until it
closes; strip vanishes when nothing is live. aDAO + Council addresses
prefilled; Phoenix Directive / Lion DAO / Capapult slots labeled in
WATCHED_DAOS for address paste. Stat band grows to 5 tiles.

Gate 32/32: all 3.61 pins carried; placement asserted (pulse-card precedes
the tile grid div); FUEL 08-03 reserve-implied === $0.002238094136824423
exact from committed fixtures; null-safety; openProposalsOf filters
open-only with dao/id/title; WATCHED_DAOS shape (2 prefilled + 3 labeled
slots); reserve-implied labeling string.

## Rev 3.61 — 2026-08-04 — PULSE COMMUNITY REDESIGN (per the owner review of 3.60 live)

3.60's tile read like an analyst changelog — dash-heavy rows at wide windows,
a valueless bribe count, a red delta as the page's opening statement. 3.61
leads with the STATE of the alliance in a hero stat band: **TLA Liquidity**
($2.4M), **Voting Power Locked** (29.4M vAMP · 203 wallets — units RESOLVED:
member-data wallet-sum 29.38M vs gauge 30.40M, ratio 0.967, cross-product
consistent; the old ~1.3M banner figure is a different quantity, audit note
updated), **Voter Incentives all-time** (440,625 LUNA · 10,022 bribes · 32
bribers · since Aug 2024 · +9.8k other-asset legs), **Gauge Epoch** (#196 ·
28 incentivized pools). Delta rows below now resolve missing window
endpoints to the NEAREST REAL capture with the actual span disclosed
(amber Δnd chip) — real endpoints only, never interpolated. Bribes row is
USD-valued at current prices (dust shows honestly as <$1; Aug's 35 adds =
$7.79 — the 3.60 count was masking near-zero value). Charts: TLA TVL,
VP Locked (new daily series), Votion TVL, and cumulative all-time LUNA
incentives (monthly, always-up). VP-renewed metric dropped.

Gate 26/26: provenance (original + 3 anchored edits byte-identical), carried
3.60 pins, plus VP Locked 08-03 = 29,383,364.51 / 08-02 = 29,361,824.02;
all-time 10,022 adds / 440,624.943495 LUNA / 32 bribers; 28 active pools
p196; window USD $7.7917 exact with 35/0 priced/unpriced; cumulative
monotonic; year-boundary month spans.

## Rev 3.60 — 2026-08-04 — ECOSYSTEM PULSE (SPEC-landing-pulse v1) + rev-footer law

**Pulse tile** above the fold: window pills 24h/48h/7d/14d/30d (default 48h),
rows TLA TVL (daily, dex captures), Votion vault TVL (daily; field exists
since votion-positions v1.1 2026-08-03 — earlier days honestly show Δ n/a,
and total_tvl_usd is NEVER substituted, it's a different metric), VP renewed
(daily, positive per-wallet vAMP deltas from member-data), bribes posted
(bribe_add event count in window — multi-denom, count is the honest primary).
**30-point chart** with ‹ › back-paging per metric; gaps render as gaps (no
interpolation), missing captures marked. Committed tla-core products only —
this is a history feature, cron products ARE the truth. sessionStorage cache
under adao_live: convention; immutable dated files cached hard.

**Total VP row DEFERRED**: distributions gauge VP reads 25–30M while the
banner convention is ~1.2–1.3M — a units question owned by the queued VP
audit. Not shipping an unexplained 23× on the landing page; do not add the
row back without that audit.

**Rev-footer law lands on index.html**: footer span (which had drifted —
showed 3.51 while code comments were at 3.56) now renders from REV/REV_DATE
constants via #page-rev. Bump both on every change.

Gate 17/17: provenance layer (original + 3 anchored edits byte-identical to
shipped), pinned real-fixture values (TVL 08-01 $2,393,265.45 / 08-03
$2,393,738.07; Votion 08-03 $31,498.74 with 08-01 null; VP renewed
61,432.05; 35 bribe_adds in 08-01..04; July window 0), schema-evolution
honesty, Total-VP absence, and jitter-disclosure strings asserted.

## 2026-08-03 (2) — site-wide floor-consumer audit (owner) + two index fixes

Audited every floor-price consumer across the site after the valuation-policy
catch. Findings:

| Consumer | Was | Now |
|---|---|---|
| portfolio (test.html) ladder + banner/tiles | sales floor only | conservative min — fixed this session |
| **index headline "Unbroken Floor" tile** | **BBL-only** (first non-broken BBL listing, bLUNA) | cross-marketplace override once the v2 context loads: lowest non-broken listing across BBL + Boost + Atrium, venue named in the subtext (BBL value remains the fast first paint) |
| **index NFT mcap** | midpoint of sales-median & listing floor | conservative min (floor-based mcap convention) |
| index per-marketplace tier rows | per-venue min (correct scope) | labels clarified earlier today |
| index backing-vs-floor chart floor layer | dormant (`floorPerNft_USD` never populated — layer never renders) | untouched; wiring it to org floor-history is queued |
| tla-stats / explorer / dao / others | no NFT floor valuation | clean |
| capture layer (floor-history) | provides BOTH signals | correct by design |
| member-portfolio.html (live) | old sales-floor valuation | superseded when test.html promotes |

## 2026-08-03 — marketplace tier-floor label fix

- Per-tier marketplace floors read "$50.00 × 17", implying 17 listings AT
  the floor — the count is actually ALL listings in that tier on that
  marketplace, floor = the lowest of them (the owner's catch). Relabeled to
  "from $50.00 · 17 listed" with a hover stating the semantics exactly.
  No math changed.

## Rev 3.55 — 2026-07-17

Community-suggestion fixes + sparkline revival + fetch hygiene. (Note: in-code
comments in this rev were mislabeled "Rev 3.51" — they refer to THIS rev.)

### index.html
- **Atrium links fixed (community report):** Marketplace Activity tile header now
  links to the aDAO collection page on atrium.markets; every Atrium listing card
  in All Current Listings deep-links to its specific NFT
  (`/atrium/{contract}/{token_id}`). Previously both pointed at bare atrium.money.
- **DAO Broken modal typo:** wallet suffix "...417v" corrected to "...4l7v"
  (bech32 has no digit 1 — the printed suffix was chain-impossible).
- **Rewards-tile sparklines restored:** the tile restructure had deleted the
  `deposit-sparkline`/`rebase-sparkline` canvases and the renderer silently
  no-op'd. Canvases restored on Deposit + Rebase tiles, a third added to Vote
  Rewards (per-day stored `total_usd` — honest multi-token basis), and the
  silent guard replaced with a loud `console.warn`.
- **fetchAllSnapshots hygiene:** in-flight promise memoization (two concurrent
  callers were doubling a ~225-request daily-archive pass); per-source start-date
  floors (dao-dashboard ≥ 2026-06-12, v2 daily ≥ 2026-06-07) remove 13
  guaranteed-404 probes per pass.
- **tla-ext walkback:** last-good epoch cached in sessionStorage; probes current
  epoch first (catches cron resumption) then jumps — ~2 fetches instead of 10.
  Log now says plainly when the ext cron is stalled behind current.
- **DAO Members chart icon removed:** the daily pipeline has no member-count
  source, so the modal was permanently empty. Mapping documented for restore
  once a daily capture exists.

### links.html (cross-cutting)
- **Atrium Markets card added** to NFT Marketplaces (collection link,
  `?tab=listings`). No logo asset exists yet — uses the site's pink "A" badge;
  swap when a logo lands in aDAO-Image-Files.

### Diagnosis note
- Most of the community-reported "forever loading" symptoms reproduced only when
  opening the downloaded file from Downloads (`file://`): sibling `/lib/*.js`
  absent → tiles never mount; CORS proxy rejects `Origin: null` → BBL/Boost
  live fields blank. Test local builds from a repo clone or on Vercel.

## Rev 3.54 — 2026-06-12

Deep-dive page migration + chart history revival + cron-first instant paint. Closes the "everything frozen at epoch 185" era and cuts cold-load from ~9s to ~3-5s.

### Cron-first instant paint (the load-time fix)
The dashboard's live path (`fetchLiveOnChainData`) fires dozens of LCD queries on every open — the ~9s cold load. The v2 NFT pipeline + `network-and-prices` cron carry chain-truth copies of nearly every headline number (15-min / hourly fresh), so a new `paintFromCron()` runs FIRST: two fast static fetches fill the mint/broken sliders + counts, backing-per-NFT (all 3 denominations), unminted backing, DAODAO/Enterprise staked, DAO members, and the supply screener — page readable in <1s, then the live pass lands on top. Safety: a freshness gate (skip paint if pipeline >2h stale) and every fill is spinner-guarded, so cron paint can never overwrite live data regardless of race order. Also seeds the gecko-shaped price cache so price-dependent components work before CoinGecko answers. Status line shows "Data as of HH:MM (pipeline) — refreshing live…" until live completes. Marketplace cards pre-fill too (counts + per-venue floors from `summary.json`'s marketplaces block).

### deving.zone eliminated
The dead `deving.zone/nfts/alliance_daos.json` feed (stale since the explorer migration, and it *hard-failed the whole load* if it didn't respond) is gone from both fetch sites — replaced by v2 `nfts.json` through thin adapters mapping `records[]` into the legacy `{collection_stats, nfts}` shape (resolving staked NFTs to real stakers, normalizing id types). Correctness fix as much as speed.

### Charts: post-185 history revived
The chart engine (`fetchAllSnapshots`) walked legacy per-epoch files that stopped at epoch 185, so every tile chart froze there. Now augments missing post-185 epochs from three live archive families: v2 NFT dailies (DAODAO staked, Enterprise, DAO-held, circulating — since 2026-06-07), TLA-snapshot dailies (canonical Total TLA VP = max bucket VP — since 2026-05-13), and dao-dashboard dailies (TLA deposits / vote / deposit / rebase USD + LUNA price — since 2026-06-12). One synthetic point per epoch (latest day in the epoch week); metrics a source can't supply stay null (honest gaps). Legacy reads 161–185 preserved — only that history has those points. Verified live: Total TLA VP continues 24.42M → 24.70M → 24.85M across epochs 186-188; DAODAO staked shows real destaking (1,661 → 1,632). Two honest caveats documented: Enterprise Staked steps down at the 185→186 boundary (legacy counted 100 enterprise-DAO broken as stakes; v2 counts 403 real users — the step is the correction), and DAO Members has no post-185 source until the stake-event sweep lands.

### Heartbeat monitor: NFT inventory false "5d stale" fixed
The cron-status monitor read the old v1 `data/heartbeat.json` (frozen 2026-06-07 when the cron moved to `data/v2/`), showing a false 5-day-stale alarm while the pipeline was green every 15 min. Repointed to `data/v2/heartbeat.json` with hot-mode cadence (15-min).

### Deep-dive pages onto the live layer
`dao_treasury.html` and `dao_tla_deposits.html` both read `dao-dashboard.json` first (fresh-gated 26h, legacy epoch walk-back as fallback) and continue their history past epoch 185 via the dao-dashboard daily archives. `dao_treasury.html` gains a fresh compare baseline (today's epoch alongside legacy 185); `dao_tla_deposits.html` reconstructs its per-pool `active_pools` view from the cron's new `tla_deposits.positions` field via an adapter. (No `dao_tla_vp.html` exists — VP lives in `tla-stats.html`, untouched.)

## Rev 3.53 — 2026-06-12

dao-dashboard cron repoint — ends the rewards-card-frozen-at-185 problem.

`fetchTlaData` now tries `tla-snapshot-data_2026/data/dao-dashboard.json` (new dao-dashboard cron, hourly live chain aggregates in a legacy-v3-compatible `{meta, dashboard}` shape) FIRST, accepted only when `meta.generated_at` < 26h fresh; the legacy epoch walk-back with its staleness pill remains the fallback. So the Unclaimed Rewards (Deposit/Vote/Rebase), TLA Deposits, and Lion alliance tiles go from "honest but frozen at epoch 185" to hourly-fresh. See the cron's own README and the cron-scripts README for the producer side. Single `tlaDataMeta.isStale` flag drives the pill; cron-primary path sets it false correctly.

## Rev 3.52 — 2026-06-12

Marketplace v2 tie-in (chain-of-truth pipeline) + `ally.html` live-data fix in the same batch.

**index.html — marketplace v2:**
- **All Current Listings**: Atrium listings included (from `listing-history.json` active records, USD via live prices, broken status via `broken-at.json`, pink ATRIUM badge); filter row now **All / BBL / Atrium / Boost** (All default). ~53 listings.
- **Live Activity**: BBL live API + v2 pipeline (Atrium + Boost list/**delist**/sale + on-chain **BREAK**, venue tags, no cross-source dupes). ~25 events/wk vs 7. Stake/Destake pending cron event capture.
- **Top 10 All-Time Sales**: computed live from `sales-enriched.json` on modal open (all venues, USD-at-sale); legacy static file is fallback.
- **Marketplace overview**: third **Atrium card** (floor/volume/sales/listed, "Chain-of-truth pipeline" source), grid 3-up on desktop. **Per-tier floor rows** (Broken / Unbroken base / Phoenix, as floor × count, "N/A" when empty) added to all three tiles — surfaces that a venue's headline floor may be a broken NFT (verified: Atrium's "$10 floor" is broken; real base floor $77). Tier from broken-at + grade-40 Phoenix set. (Race fix: tier fill is idempotent, triggered from both the v2 module and the marketplace-cache completion, since the activity feed kicks the module off before the BBL/Boost caches populate.)
- **Analytics strip**: between Treasury and Backing rows, styled like the DAO Total Value strip; Market cap matches the explorer to the dollar ($345,541, circulating split from the page's per-token array, 5 unminted Phoenixes excluded; "--" rather than a near-miss if the array is unavailable). (Same idempotent-race fix as tier floors — mcap recomputes from the v2 module, the caches, AND the NFT-array stash.)
- **Live-feed rows** sized up on desktop (40px imgs, base-size ids, pink venue chips, roomier padding); mobile compact override untouched.

**ally.html — live data fix:**
- Hardcoded `0.21` avg daily gain → live from `backing-data_2026` daily history (dashboard's source). Flows through per-NFT gain, contract total, slider projection; status line shows live window dates, fallback labeled honestly. Now shows ~+0.31 LUNA/day, contract ~+2,800/day (vs understated +1,870).
- Dead deving.zone feed → v2 `summary.json` (unbroken 8,907).
- "~0.72% of staking rewards" tile computes live (contract LUNA ÷ bonded LUNA from chain staking pool).

## Rev 3.51 — 2026-06-11

TLA data restoration + NFT analytics banner.

- **fetchTlaData walk-back 5 → 12 epochs**: the legacy epoch cron died after 185 while the 5-epoch window only reached 186 — every dependent tile (Deposit/Vote/Rebase, TLA Deposits, TLA LPs, Lion) went blank. Walk-back finds 185; staleness pill flags it honestly. (Superseded by Rev 3.53's cron-primary path, kept as fallback.)
- **fetchTlaExtData fixed**: hardcoded epoch-163 fallback (files that never existed) → real current epoch + 14-epoch walk-back across the sparse ext set.
- **NFT Collection Analytics banner** with live v2 preview stats, deep-linking to `nft-explorer-index.html?view=analytics`.

## Rev 3.50 — 2026-05-29

Audit + cleanup pass for legacy epoch-snapshot remnants. Now that all tiles are live-RPC + cron-driven, several pieces of the old snapshot infrastructure were either dead or redundant.

### Removed (dead code)

**Orphan Snapshot Manager modal** (~212 HTML lines + ~60 JS lines)
The `#snapshotModal` admin UI provided "Paste from Eris" and "Manual Entry" capture modes for the legacy per-epoch snapshot workflow. The trigger element (`id="snapshot-link"`) didn't exist anywhere in the DOM, so the modal couldn't actually be opened — confirmed dead. The capture flow now lives in `tla_tool.html` (admin tool, per PROJECT_KNOWLEDGE convention). Removed:
- The full modal DOM (lines 2750–2960 pre-cleanup)
- `setSnapshotMode()` function
- `loadLastSnapshotValues()` function
- `'snapshot-link': 'snapshotModal'` mapping in `modalTriggers`
- The special-case click handler for the missing trigger
- The `#snapshot-link` CSS rules

**Dead `unclaimed-stale-banner` HTML block**
The big red banner inside the DAO Unclaimed Rewards card was already hidden by `applyTlaStaleness` on every render (Rev 3.30 replaced it with the launch modal, then Rev 3.49 disabled that modal too). Removed:
- The banner's HTML
- The mobile CSS rules that styled it
- The JS that hid it on every render (dead code path)

The small `Stale Data` pill on the card title remains as a low-noise indicator if it's ever needed.

### Migrated (legacy → cron)

**`loadStakingApr()` now reads from the `network-and-prices` cron**
Previously fetched `tla-ext_json_storage/Staking APR.csv`, parsed the last line, and used that as "the current staking APR." The cron's `network.staking_apr` field is computed hourly from chain queries (inflation, bonded ratio, community tax) and matches the same calculation — but is fresh on every cron run rather than waiting on manual CSV updates. Cleaner data path, one fewer legacy repo dependency.

Note: `fetchStakingAprHistory()` (different function, used by chart modals for the full multi-year time series) is **kept on the CSV** — the cron doesn't have years of accumulated history, and that's the only source for it.

### Relabeled (UI accuracy)

**`unclaimed-data-status` initial text: "Data from TLA Snapshot" → "Loading..."**
The label is overwritten on first live fetch (`Live • HH:MM:SS UTC` once `applyLiveUnclaimedRewards` succeeds). But for the brief flash before that, the original label lied — the tile isn't snapshot-driven anymore. Neutral "Loading..." is honest.

### Kept (still needed, documented)

- `fetchAllSnapshots()` (lines ~5000+) — loads weekly snapshots from `tla_json_storage` for the historical chart modals (epochs 161 onwards). Crons only started capturing in May 2026, so this is still the only source for multi-month chart history. Migrate when the cron has enough accumulated weekly archives.
- `epoch_1-300_date.json` lookup — canonical 1-indexed epoch schedule, per PROJECT_KNOWLEDGE.
- `adao_json_storage/adao_props.json` — DAO proposals data, separate concern.
- `adao_json_storage/` sales history paths — NFT sales tracking, separate concern.
- TLA Deposits modal "Snapshot" labels — the modal itself still shows snapshot per-pool data; labels are accurate. Migrating the modal to live per-pool data is tracked in CHANGES_PENDING (P2).

### Impact
- File size: ~931 KB → ~913 KB (-18 KB / -284 lines)
- Cold-start parse time: marginal improvement
- Fewer legacy data dependencies, one less point of confusion when reading the code

---



Disabled the "Snapshot data is stale" launch popup. The modal made sense when tiles were snapshot-driven, but the architecture has moved on:

### Why this needed to go
- **TLA VP, TLA Deposits, Unclaimed Rewards, Treasury, Broken NFTs all read live RPC primary now** (Rev 3.38, 3.41, 3.46, 3.47). Snapshots are fallback only.
- **Cron health has its own visible surface** — the footer cron-status widget shipped in Rev 3.37 with freshness fingerprinting catches stuck/stale crons explicitly and surfaces them in the UI.
- **The modal as written named exactly the wrong tiles** — text said "TLA deposits, VP, unclaimed rewards may not reflect recent claims" but those three are precisely what's NO LONGER snapshot-based. The popup would lie to users showing fresh data underneath.

### What changed
- `applyTlaStaleness()` no longer calls `showStaleDataModal(meta)` — call site commented out with explanation.
- `applyTlaStaleness()` no longer sets dot indicators on `dao-tla-title` and `dao-tla-vp-title` — those are owned by the live setters now (`applyLiveTlaDeposits` and the TLA VP live fetcher). The old snapshot-based dot fought the live ones in a race condition; whichever ran last won.
- The `showStaleDataModal()` function and `#staleDataModal` DOM are kept in place as a one-line revert path if some edge case is discovered.
- The small "Stale Data" pill on the unclaimed-rewards card header remains — it's a low-noise indicator, not a viewport-blocking modal.

### Cron health is the new authoritative staleness surface
If a cron stops updating or starts returning stuck data (same fingerprint N runs in a row), the footer cron-status widget shows that explicitly. Users diagnosing "why is this number weird" go there now, not to a launch-time popup. This matches Design Principle #1 (honest data, no false positives) much better than warning about staleness that no longer affects the tiles.

---



Vote Rewards tile showed `$0` even though tokens were claimable. Two stacked bugs.

### Bug 1 — `voteUsdTotal` declared but never incremented
The render loop had `let voteUsdTotal = 0`, built per-token rows, then displayed `voteUsdTotal` — but the increment was missing. The total was always literally zero regardless of what was claimable.

### Bug 2 — Token identity discarded at capture time
The capture stored only a truncated label like `"terra1t4p..."` for cw20 rewards or the raw IBC hash for natives. No `cw20` / `denom` field was preserved, so even if the render loop wanted to look up a price, there was nothing to look it up by.

### Fix
- Added two lookup maps at capture time. **Native denoms**: `uluna` → LUNA (terra-luna-2), `ibc/8D8A...` → ASTRO (astroport-fi), `ibc/2C96...` → USDC, `ibc/8838...` → wBTC. **CW20s**: `terra1t4p3u8...` → CAPA, `terra1ecgazyd...` → ampLUNA, `terra10aa3zd...` → SOLID, `terra1lxx40s...` → ROAR, `terra17aj4ty...` → bLUNA. All decimals=6 except wBTC=8. Each carries its `geckoId` for live price lookup.
- Each captured token entry now stores `{ name, amount, cw20, denom, geckoId }` instead of a truncated label.
- Render loop uses `data.geckoId` against `window.cachedPriceData` to compute per-token USD, sums into `voteUsdTotal`.
- Each row displays both amount and USD (`LUNA 371.47 / $22.97`).
- Tokens without a known geckoId render with an italic "no price" hint — silent zeros now visible.

### Verified live
DAO had 3 unique tokens claimable across 9 pool buckets at deploy time: LUNA 371.47 ($22.97), ASTRO 1,735.57 ($1.43), CAPA 672.64 ($1.04). Total ~$25. Tile now correctly shows the dollar figure.

---

## dao_treasury.html Rev 3.1 — 2026-05-29

3-bucket "What Changed" breakdown — separates intentional DAO actions from market and organic movement so users can read the actual story behind treasury value changes.

### Problem
Previous "What Changed" panel showed two buckets: Market Movement (price impact) and Position Growth (amount changes). A "Deposit into TLA" prop deploying $1,800 of LUNA out of the treasury wallet appeared as `-$1,800 Position Growth` — looking identical to losing money. Net Result of `-$2,581 (-15.6%)` scared users into thinking the treasury was tanking when really the DAO had just chosen to redeploy capital.

### Fix
Split position change into two buckets using each prop's actual on-chain treasury impact:

```
Net Change = Market Movement + Organic Growth + DAO Actions
```

Where:
- **Market Movement** — pure price impact on starting holdings (unchanged from before)
- **Organic Growth** — yield, rewards, slippage *only* (was "Position Growth")
- **DAO Actions** — sum of `calcPropImpactUsd(prop.netByToken)` for props executed in the comparison window

`isReceiptToken` filters out zLUNA / amp-LP / LP shares from prop impact so a "Deposit into TLA" correctly shows only the LUNA outflow, not the offsetting amp-LP token inflow.

### Contributing Proposals list
New panel below the breakdown shows each prop that drove DAO Actions. Each row is clickable → opens DAODAO proposal page. Shows: prop ID, date, title, top-3 token movements, USD impact (purple for outflow / green for inflow). Hidden if no props executed in the window.

### Smart net-result explanation
When DAO Actions dominate the change magnitude, the explanation surfaces that:
- `📊 Mostly due to DAO deploying capital (not a loss)` — when actions negative + largest
- `📊 Mostly due to DAO inflows` — when actions positive + largest

Otherwise falls back to organic + market language. The Net Result number is unchanged — only the attribution + framing improves.

### Why this is flexible
Classification uses each prop's actual execution transactions (`getActualTreasuryImpact`), not hard-coded prop types. Works for deposits/withdrawals (TLA, staking, lending), token swaps, inflows (claiming rewards, grants), outflows (spending, transfers), or any combination — just sums net token movements per prop.

---

## dao_treasury.html Rev 3.0 — 2026-05-28

Single unified view — strip the 4-tab structure entirely, surface the stock-chart-with-prop-annotations concept that was buried behind tab switching.

### Removed
- Tab switching behavior on the 4 summary cards (`switchView` is now a no-op for safety; cards became static summary tiles)
- Hidden classes on all 4 view sections — they're now all visible together
- Misleading "Click on any token row" chart placeholder
- `currentView` state machine

### Added
- **Token pill bar above the chart** — top 8 holdings by USD, one-click switch (no more scrolling down to find token rows)
- **Amount / USD toggle** — the centerpiece of "see amounts growing while prices lag"
- **Auto-loads ampLUNA on init** — chart isn't empty on first visit
- `$` prefix in y-axis ticks, stats row, and tooltips when in USD mode
- Default compare anchor = most recent snapshot → Live (was second-to-last → Live, which produced confusing `E182 → Live` rather than `E185 → Live`)

### Layout flow (top to bottom)
1. 4 summary tiles (Treasury / Staked / Council / Combined Total) — display only, not tabs
2. **What Changed** story panel — always visible (was hidden by default until first data load)
3. **Token Performance** chart with pill selector + Amount/USD toggle + time range + prop annotations
4. Holdings tables (DAO / Staked / Council / Total breakdown) — all visible at once
5. Recent DAO Proposals sidebar

---

## dao_tla_deposits.html Rev 1.2 — 2026-05-28

Live overlay + chart-extends-to-live fixes.

### Compare anchor fixed
When live overlay succeeds, the "compare against" snapshot now re-anchors to the snapshot we just overlaid on. So the comparison reads `E185 (snapshot) → Live (now)` instead of `E182 → Live` which mixed a 3-week-old anchor with live data. The badge color reflects source: green pulse for live, amber for cron fallback, plain for snapshot-only.

### Chart extends through to live
After live overlay succeeds, a synthetic point with epoch label `'Live'` is appended to `history[]`. Chart now plots through the present rather than ending at the last snapshot epoch.

---

## dao_tla_deposits.html Rev 1.1 — 2026-05-28

Library integration — added `lib/adao-live-data.js` script tag, then overlay live data from `aDAOLive.getDaoTlaDeposits()` on top of the snapshot baseline in `init()`.

Snapshot remains the historical comparison baseline (used for charts, comparison views, value breakdown), but for headline numbers the page now reflects what's actually on-chain right now. Source badge added next to the epoch indicator:
- Green pulse dot + "E185 → Live" — chain capture succeeded
- Amber static dot + "E185 → Cron" — cron fallback used
- Plain text "E182 → E185" — snapshot-only (live unavailable)

---

## Rev 3.47 — 2026-05-28

Extracted live-data fetching into a shared library that all three pages in the dashboard suite consume. Replaces three duplicated implementations of the same RPC primitives.

### New file: `lib/adao-live-data.js` (~34 KB)

Exposes `window.aDAOLive` with:

**Composite getters** (live RPC primary, cron fallback):
- `getDaoTlaDeposits()` → `{ positions, totalLpUsd, pendingRewardsUsd, zlunaUsd, totalTlaUsd, source }`
- `getDaoTreasury()` → `{ assets, totalUsd, allPriced, source }`
- `getDaoUnclaimedRewards()` → `{ depositLuna, rebaseLuna, voteUsd }`

**Catalog + primitives**:
- `getTlaCatalog()` → pools, amp configs, token prices, LST ratios
- `queryChain(addr, msg)`, `bankBalances(wallet)`, `cw20Balance(contract, wallet)`

**Cron passthrough**: `getCron(name)` for raw cron data when needed.

**Cache control**: `clearCache(pattern?)`.

**Constants exposed**: `DAO_MAIN_WALLET`, `TLA_STAKING_BY_BUCKET`, `TLA_ASSET_COMPOUNDER`, `ZLUNA_CONNECTORS`, `denomMap`, etc.

### Caching architecture
Layered: in-memory `Map` (instant within page session) + `sessionStorage` keyed `adao_live:` (survives navigation between pages within a tab). TTL: 5 min for catalog and live LP capture, 1 min for unclaimed rewards. Second page load is effectively instant.

### Page integrations
- `index.html` — library tag added, existing inline fetchers preserved for now (coexist, migrate incrementally).
- `dao_tla_deposits.html` — library tag added, live overlay applied on top of snapshot baseline (see separate Rev 1.1 entry).
- `dao_treasury.html` — library tag added; existing live RPC code preserved for now.

### Verified against chain at deploy time
- TLA Deposits: $9,723.60 vs Eris UI $9,751.19 (timing noise: $27 diff)
- Treasury: $13,912.14 across 9 priced tokens via CoinGecko
- 16 positions captured (all amp + non-amp, including bluechip + single-asset)
- Cache: 0 ms on second call

### Open follow-ups
1. Migrate index.html's inline `fetchLiveTlaDeposits` / `queryChain` / `fetchTlaSharedCatalog` to use `aDAOLive` — kill the duplication
2. Migrate dao_treasury.html's inline live-balance code to use `aDAOLive.getDaoTreasury()` — same reason

---

## Rev 3.46 — 2026-05-27

Refactored TLA Deposits to **live-RPC primary, cron fallback** — the architecturally correct pattern for tiles that should reflect current state. Previous revs had it backwards: cron was the source, live was the fallback.

### Architecture corrected
```
fetchLiveTlaDeposits()
    ├─► fetchTlaSharedCatalog()         [pool catalog, amp configs, token prices]
    ├─► fetchLiveTlaDepositsFromChain()  [PRIMARY — 8 parallel RPC queries]
    │       ├─ 4× all_staked_balances    (DAO non-amp per bucket)
    │       └─ 4× user_infos             (DAO amp per bucket, via compounder)
    ├─► fetchLiveUnclaimedRewards()      [pending rewards/bribes, already live]
    ├─► bank query for zLUNA wallet balances
    └─► fetchTlaDepositsFromCron()       [FALLBACK if any chain query fails]
```

The previous arch tied the tile's freshness to the cron's hourly cadence. With live-primary, the tile reflects on-chain truth within seconds. The cron is now correctly positioned as **historical capture + resilience fallback**, not the data source for current state.

### Single-asset pool valuation
Earlier path missed amplified positions in single-asset pools (ampCAPA, xASTRO, ampROAR-ROAR). Three valuation paths now match the cron's logic exactly:
1. **Cw20 LP tokens** — lookup via `poolByLpAddr[cw20]`
2. **Native/factory pools** — lookup via `poolByGaugeId["native:" + denom]`
3. **Single-asset pools** (no `lp_address`) — value via `tokenPrices[poolName].final_price_usd` primary, `lp_health.asset_0.price_usd` fallback, compounder share last resort

### Source indicator on tile
Pulse-dot color now indicates data source:
- Green pulse = LIVE chain query succeeded
- Amber static = fell back to cron snapshot

Hover tooltip shows the full composition (LP / pending rewards / pending bribes / zLUNA / total).

### Architecture rule for future tile work
**Dashboard tiles should be LIVE feeds (RPC primary), cron is for fallback + historical capture only.** Never tie tile freshness to cron's hourly cadence. Documented in `PROJECT_KNOWLEDGE.md`. Migrate any remaining cron-driven tiles to this pattern over time.

---

## Rev 3.45 — 2026-05-26

Composite TLA Deposits total + modal overflow fix + cron-side bug fix.

### Composite total
Per user rule: "DAO TLA Deposits = LP positions + pending rewards + zLUNA wallet + bribes (anything in TLA except LOCKs)". `fetchLiveTlaDeposits()` now sums all four components. Pulse-dot tooltip on the tile title shows the breakdown:

```
Live (captured 14:23:01):
  LP positions:    $6,340.15  (10 pools)
  Pending rewards: $11.77
  Pending bribes:  $0.00
  zLUNA in wallet: $178.98
  ─────────────────────
  Total TLA:       $6,530.91
```

### Modal overflow fix
Both `daodaoModal` and `enterpriseModal` were running content past the viewport bottom on smaller screens. Added `max-h-[90vh] overflow-y-auto` to the `modal-content` div on both — content now scrolls within the modal instead of overflowing.

### Cron-side fix shipped same session (adao-positions v1.3.0)
The `adao-positions` cron at v1.2.0 was dropping ~6 amplified positions for the DAO (all bluechip + half of project) due to silent rate-limiting in `queryContract`. Pattern `Array.isArray(r) ? r : []` silently coerced `null` (failed query) to empty array with no error recorded. Patched to v1.3.0:
- `BATCH_CONCURRENCY` lowered 15 → 5 (was saturating publicnode LCD with ~255 in-flight queries per batch)
- `queryContract` retry-with-backoff (2× primary attempts with 200-500ms jittered backoff, then fallback endpoint)
- Distinguish `entries: null` (failed) from `entries: []` (genuinely empty) for both amp and non-amp paths
- Errors surface to `portfolio._errors` so silent failures are no longer silent

Verified locally on patched cron: 16 positions captured / $9,667 total (matches Eris UI $9,751 within timing noise). Was 10 positions / $6,340 before patch.

### Why the architecture changed in Rev 3.46
At deploy time Rev 3.45 still read cron data for LP positions. Once the user pointed out tiles should be live feeds (not tied to hourly cron cadence), Rev 3.46 flipped the architecture to live-primary / cron-fallback. The composite calculation logic is unchanged across both revs.

---

## Rev 3.44 — 2026-05-25

DAODAO modal deep-dive. The DAODAO Staked tile already showed staked count and "% of Circulating" — the modal now explains both transparently and adds staker concentration analysis.

### % of Circulating formula breakdown
Shows the math step by step:
- Total minted (10,000)
- Minus DAO-controlled (1,000 broken + held)
- = Circulating (9,000)
- Staked ÷ Circulating = X.XX%

No more black-box percentage.

### Staker concentration analysis
- Top 1 / Top 5 / Top 10 staker shares of total staked
- Unique staker count
- Distribution buckets (1–9 / 10–49 / 50–99 / 100–499 / 500+ NFTs staked)
- Surfaces whether staking is healthy/distributed or concentrated

### Addressable Pool
Wallet-held + stuck-in-Enterprise NFTs = the **growth ceiling** for staking. Reframes the metric: "X% of the addressable supply, not Y% of total". Tells the right story for a growth indicator.

### Supply Distribution panel (shared)
A "locked vs liquid" breakdown shared between DAODAO and Enterprise modals via `applySupplyDistribution(modalContext)`. Single source of truth, two display contexts.

---

## Rev 3.43 — 2026-05-24

Enterprise Staked tile correction + investor-focused supply distribution.

### Enterprise Staked count: 503 → 403
Previously showed the **total** count in the old enterprise staking wallet (`terra1e54tc...8tdv`), but 100 of those are DAO-controlled broken NFTs that can't be migrated. Filtering them out gives the actual count of unmigrated user-held NFTs:
```js
nft.owner === OLD_ENTERPRISE_STAKING_WALLET || nft.enterprise === true
// AND not DAO-controlled broken
```
Modal still shows the full breakdown (403 unmigrated + 100 trapped) but the tile reflects what's actually addressable.

### "Trapped" → "Unmigrated" reframing
These NFTs are not lost — they can be migrated via Eris Boost. The modal explains this and links the migration path.

### Bug fix
Changed `daoBrokenModal` wallet ending from `...6ugw` (wrong, leftover from earlier truncation) to `...8tdv` (correct, actual old enterprise staking wallet).

### Supply Distribution panel
New "locked vs liquid" breakdown of total supply, shared via `applySupplyDistribution(modalContext)`. Visible in both DAODAO and Enterprise modals.

---

## Rev 3.42 — 2026-05-23

Cron Health modal. Surfaces the freshness state of all 7 production crons in one place so staleness in any one feed is debuggable from the UI.

Subsequently superseded in concept by Rev 3.37's freshness fingerprinting system + footer cron-status widget (the other session's parallel work). The two systems coexist; Rev 3.37's footer widget is the authoritative health surface going forward.

### What this rev shipped
- Per-cron health card showing last successful run timestamp, hours since (color-coded green/yellow/red), output file size, latest captured value, and failure mode if cron is silent

---

## Rev 3.41 — 2026-05-22

TLA VP modal overhaul. Cron-history hybrid chart shows DAO's TLA VP over time (cron-captured per-epoch) overlaid with live current VP.

### Lock breakdown
Modal now shows the two component locks separately:
- Lock #600 (27,335 arbLUNA → 796K VP)
- Lock #711 (1,213 ampLUNA → 25.7K VP)
- = 821,791 VP total

### Live overlay
Latest data point uses live RPC against the voting escrow contract — chart extends from historical snapshots through to right-now.

---

## Rev 3.40 — 2026-05-21

Broken NFTs hardcoded to 1,000 (was reading from cron, which was unreliable for this specific count). Static value matches the verified governance count from chain. Tooltip explains the source. Same approach as the Props 64-69 commitment.

---

## Rev 3.39 — 2026-05-20

Replaced the snapshot disclaimer banner with a cleaner "live data shown above" inline note. Removed the hardcoded "Last Claim Actions" section that was showing stale data — those events now flow through the live unclaimed-rewards system (Rev 3.38).

---

## Rev 3.38 — 2026-05-19

Live DAO Unclaimed Rewards + Global Refresh button.

### Live Unclaimed Rewards (`fetchLiveUnclaimedRewards`)
8 parallel RPC calls to capture the DAO's pending rewards across the 4 staking buckets, plus rebase, plus vote bribes:
- 4× `all_pending_rewards` (zLUNA per bucket)
- `user_pending_rebase` on gauge controller (ampLUNA)
- `user_claimable` on bribe manager (various tokens — schema is `{start, end, buckets}` NOT an array; gotcha for any future caller)
- 2× connector `state` queries for zLUNA → LUNA rate

### Global Refresh button
Top-right "Refresh All" button. 5-minute cooldown to prevent abuse. Invalidates all in-memory caches and triggers re-render of the live tiles (TLA VP, Unclaimed Rewards, TLA Deposits, etc.).

---

## Rev 3.37.1 — 2026-05-29 (fleet health audit)

10-day post-deploy audit of the freshness monitoring system. **6 of 7 crons fresh; bribes-history flagged stuck — true positive, benign.**

### bribes-history: stuck = chain is genuinely quiet
- consecutiveStuckRuns: 4 (4 daily runs in a row with identical fingerprints)
- Verified by direct chain query at 01:11 UTC against the cron's 23:35 UTC capture: **identical 16 active bribes, total 379,552,298,332 raw units**
- Master stats unchanged since 2026-05-18: still 245 proposals / 167 executed / 53 epochs with bribes / 1 briber
- PD hasn't proposed a new vote-incentives bribe in ~10 days; no one has claimed against existing bribes

This is exactly the false-positive scenario flagged when designing the bribes threshold. The system is doing its job — accurately reporting that on-chain state isn't moving. The cron itself is healthy.

**Status**: leaving the threshold at 3 for now. If quiet weeks become routine, bumping bribes-history `STUCK_THRESHOLD` from 3 to 7 (one full week of inactivity tolerance) is a one-line change. The other 6 crons have movement guaranteed by chain mechanics (LP shares, prices, LST ratios all drift passively); bribes don't — they only move on user action.

### Everything else green
- votion: fresh, last run Sun May 24 23:55 UTC (on schedule, weekly)
- skeletonswap: fresh — running cleanly since the rebuild
- astroport: fresh
- network-and-prices: fresh (hourly)
- tla-snapshot: fresh (hourly)
- adao-positions: fresh

No code changes from this audit. Documentation update only.

---

## Rev 3.37 — 2026-05-18

Cron-fleet freshness monitoring. The motivation: in April 2026, the Skeleton Swap upstream (`dex.warlock.backbonelabs.io/api/pools/phoenix-1`) silently froze at its 2026-04-16T17:00:00Z snapshot. The cron kept running on schedule, the heartbeat said "ok," but every daily run captured the exact same numbers. This went undetected for 31 days because the existing health system only checked **whether** the cron ran, not whether the **data** changed.

### Skeleton Swap cron rebuilt from scratch
The frozen warlock endpoint isn't coming back — Skeleton Swap's own front-end migrated to a hybrid architecture. Mirrored that approach:
- Pool list from `skeletonswap.backbonelabs.io/mainnet/phoenix-1/pools_list.json` (34 active pools)
- Reserves queried directly from the chain via LCD smart-contract queries (`{"pool":{}}` per swap address)
- Token prices from our existing `network-and-prices` cron output (no new external dependency)
- TVL computed in JS: `Σ (reserve_i / 10^decimals_i) × price_i`
- `volume_24h_usd` / `volume_7d_usd` / `apr_7d` columns now empty (no trustworthy source post-warlock)

Cleaned `ss-pool-data_2026` of ~32 stale files (every daily backup from Apr 17 onward was identical to Apr 16; contaminated April monthly-avg; post-epoch-181 weekly averages). Pre-Apr-17 history preserved.

### Freshness fingerprinting added to all 7 production crons
Each cron now computes a SHA-256 over its volatile fields (reserves, prices, VP allocations, etc. — excluding counters that auto-increment) and writes the first 12 hex chars to its heartbeat. On the next run, the cron fetches its previous heartbeat and compares fingerprints:

- `dataFreshness: "fresh"` — fingerprint differs from previous run (normal)
- `dataFreshness: "suspicious"` — 2 identical runs in a row (yellow flag)
- `dataFreshness: "stuck"` — 3+ identical runs in a row (red flag, escalates `status` to `stuck`)

Detection windows by cadence:
- Hourly crons (network-and-prices, tla-snapshot): ~3 hours after a freeze starts
- Daily crons (skeletonswap, astroport, bribes-history, adao-positions): ~3 days
- Weekly cron (votion): ~3 weeks

Per-cron fingerprint inputs were chosen for each cron's specific volatility profile — e.g. tla-snapshot fingerprints per-pool `(voting_power.vp, depth_usd, staked_in_tla_usd)`, network-and-prices fingerprints sorted `(token_name, final_price_usd)` tuples, adao-positions fingerprints per-member position aggregates.

### Footer cron-status widget
New trigger in footer: `Rev 3.37 · Changelog · ● Cron status`. Click opens a modal with all 9 crons (the 7 freshness-enabled production crons plus `nft-inventory` and `marketplace-stats`). Each row shows:
- Status dot — fresh / approaching-stale / stale / **data stuck** (pulsing red) / no-signal
- Cron label + description
- Inline freshness badge — `✓ fresh data`, `⚠ data suspicious (N consecutive)`, or `🔴 data stuck (N consecutive identical runs)`
- Cadence (hourly/daily/weekly)
- Age + last capturedAt timestamp

Self-contained IIFE at the bottom of `index.html` — zero global scope pollution, doesn't touch any existing data flow. Re-checks every 30 seconds. The same widget was added to `test.html` (Rev 1.16 → 1.17).

### test.html updates
- Rev 1.16: Added the new `stuck` status to the health modal, extended `recordCronCapture()` to capture `dataFreshness` + `consecutiveStuckRuns` from heartbeats, migrated all cron source URLs to point at `data/heartbeat.json` instead of the main data files (so freshness fields get extracted).
- Rev 1.17: Fixed votion showing "fetch failed" — the page had two cron-record paths (a bulk-load on page boot, and the new background heartbeat fetch). The bulk-load was using votion's per-epoch JSON file which 404s on the current epoch before Sunday's run. Consolidated everything onto the single heartbeat-based path.

### Files changed
- `cron-scripts/skeletonswap-lp_data/index.js` — full rewrite of data acquisition (preserved all aggregation/git logic)
- `cron-scripts/{astroport, network-and-prices, tla-snapshot, votion, bribes-history, adao-positions}/...` — added `crypto` require + three freshness helpers + heartbeat field injection
- `index.html` — CSS block + footer button + modal HTML + self-contained IIFE
- `test.html` — updated existing cron-health system with freshness support, consolidated fetch path

### What freshness monitoring can't detect (worth being honest about)
1. **Quiet pools** — a small pool that legitimately stops trading would eventually flag stuck. Three-run threshold helps; dashboard surfaces `consecutiveStuckRuns` so a human can recognize "abandoned pool" vs "freeze."
2. **Faulty cache rotating between states** — different fingerprints each run, but data still broken. Would need value-range checks, not fingerprint checks.
3. **A new pool added with zero liquidity** — its zeros are stable; the rest of the fingerprint is what flags actual freezes.

---

## Rev 3.36 — 2026-05-09

Three mobile fixes against Rev 3.34/3.35 deploy. User screenshot showed:

### Bug 1 — DAO Total Value tile: breakdown clipped to gibberish on mobile
Even with the Rev 3.34 compact-number formatting, the inline formula `Tok $X + LPs $Y + Locks $Z + NFT $W = $TOTAL` couldn't fit a 2-column mobile width. Visible portion read just "$74.1K = $104.4K" — losing the first three values entirely.

**Fix:** Split the tile into two layouts. Desktop (sm: and up) keeps the full inline formula. Mobile (below sm:) uses a stacked layout — big amber `$104.4K` total on top, single subtle line below reading `Tokens + LPs + Locks + Backing` (no individual numbers, just communicates what's being summed). The actual contributing values are visible in the tiles directly below the total tile, so omitting them from the mobile summary loses no information.

New element `#dao-total-grand-mobile` mirrors `#dao-total-grand` and gets written by the same `updateDaoTotalValue()` function. Mobile uses compact formatting (`$104.4K`); desktop uses full (`$104,846`).

### Bug 2 — Backing/Floor tile: leading `$` clipping at left edge
`$12.72 / $137.84` was overflowing left of the tile, dropping the dollar sign on the BACKING value. The Rev 3.34 mobile font-size shrink to 1.25rem helped but wasn't enough.

**Fix:** Tightened the inner row gap from `gap-3` (12px) to `0.5rem` (8px) on mobile. Selector `#backing-usd-title + .flex { gap: 0.5rem !important; }` targets only that one tile's value row. Combined with the existing font shrink, content now fits cleanly within tile borders.

### Bug 3 — "ampLUNA Backed" title showing as "mpLUNA Backed"
The leading "a" was being clipped by the existing `.stat-card h3` rule (line 216-224) which sets `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` on titles. Combined with the tile's centered `flex` layout, the truncation chopped the LEFT side of the text instead of adding ellipsis on the right (which is unusual but happens when ellipsis can't fit either side and the layout center-anchors).

**Fix:** Override the nowrap/ellipsis behavior for the specific tile titles that are short enough to wrap cleanly:
```css
#backing-ampluna-title, #backing-luna-live-title, #backing-usd-title,
#avg-daily-gain-title, #unminted-nft-backing-title {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
}
```
Doesn't affect any other tiles (DAODAO Staked, Treasury, etc. keep the truncation behavior). These five just allow normal text wrap.

### Why three fixes in one rev?
All three were observed in the same screenshot and all touch the same area (mobile dashboard tiles). Tackling them in one rev minimizes the number of "push, screenshot, push again" iterations. Each fix is independent and could've been its own rev — bundled for efficiency, not because they share a root cause.

---

## Rev 3.35 — 2026-05-09

Fixes Rev 3.34 DAO Total Value tile bug. User reported on first deploy: Treasury and NFT Backing populated correctly in the breakdown formula, but TLA LPs and TLA Locks stayed as spinners — even though those values ($6,260.87 and $5,715) were clearly visible in the contributing tiles right next to it.

### Root cause

Rev 3.34's `updateDaoTotalValue()` read from window globals (`liveTreasuryUsd`, `liveTlaVpUsd`, etc.) that each tile was supposed to set when it rendered. Two paths broke this assumption:

1. **TLA Deposits** — read `dashboardData.tlaDeposits.totalDeposit`. This works on first load, but on cache-warm reloads or snapshot fallback paths, the value might be 0 or stay null while the tile DOM gets populated through a different code path.
2. **TLA VP** — read `vpResult.totalUsdLuna * lunaPriceUSD`, computed locally. The tile ITSELF computed and rendered `$5,715` through a different path (`buildTlaVp` snapshot fallback OR live VP fetch with available USD), but my hook only fired when `totalUsdLuna != null && lunaPriceUSD != null` — which can be false even when `$5,715` is shown.

The result: globals never set → totals stay spinner → values clearly visible elsewhere on the page.

### Fix — read directly from rendered DOM

`updateDaoTotalValue()` now reads each contributor by parsing the rendered text out of the contributing tile's DOM element. New `parseUsd(selector)` helper:

- Returns null if the element contains a spinner (handles loading state)
- Returns null for `'—'` and `'Error'` (handles known sentinels)
- Matches `$NN,NNN.NN` pattern, picking the LAST match in the string (handles "1,051,763 LUNA $74,089 USD" → 74089)
- Falls back to bare number parsing if no `$` prefix exists

If the value is rendered to the page anywhere, the total picks it up. No race conditions, no globals to keep in sync, no missed code paths.

### Polling instead of event-driven

Since DOM-read isn't triggered by writes, added a `setInterval(500ms)` polling loop that calls `updateDaoTotalValue()` repeatedly until all four contributors are parsed (returns `true`) OR 30 seconds elapses (60 attempts max). 60 setInterval ticks reading 4 DOM elements each is negligible CPU. Started from inline IIFE on script eval, covers every load path (initial fetch, cached fetch, error recovery, slow LCD, etc.).

### Test cases verified

All 9 expected tile-text formats parse correctly: `$18,928`, `$6,260.87`, `$5,715`, `$74,089 USD`, `1,051,763 LUNA $74,089 USD`, `—`, `Error`, empty, `$104,846`.

### Rev 3.34's hooks left in place

The previous rev's contributor-side hooks (writing `window.liveTreasuryUsd` etc., calling `updateDaoTotalValue` from each contributor callback) are now redundant but harmless — globals get set, polling ignores them. Leaving in place is lower risk than removing.

---

## Rev 3.34 — 2026-05-09

New "DAO Total Value" tile + mobile UX polish.

### New tile — DAO Total Value

A slim, full-width tile inserted between row 1 (Status tiles ending with DAO Broken/Held NFTs) and row 2 (DAO Treasury / TLA Deposits / TLA VP / Unminted NFT Backing). Sums the four major USD components the DAO controls into a single headline number.

**Layout:** spans `col-span-2 md:col-span-4` (full row width on both mobile and desktop). Slimmer vertical padding than other tiles so it reads as a divider/summary row rather than competing with them. Visual: orange `fa-coins` icon + small uppercase "DAO Total Value" header, followed by the breakdown formula `Tokens + TLA LPs + TLA Locks + NFT Backing = $TOTAL` with the grand total in larger amber-400 mono.

**Mobile compaction:** the breakdown labels collapse from "Tokens / TLA LPs / TLA Locks / NFT Backing" to "Tok / LPs / Locks / NFT" via `sm:hidden` / `hidden sm:inline` spans. Numbers also use compact notation on mobile (`$18,948` becomes `$18.9K`, `$1,051,763` becomes `$1.05M`) so the whole formula fits one line. Re-renders on resize via a window listener. Per Design Principle #1, the GRAND total stays a spinner until ALL FOUR contributors have populated — partial sums would mislead.

**Wiring:** new `updateDaoTotalValue()` helper, idempotent. Reads from four sources that each tile already populates:
- Treasury → `window.liveTreasuryUsd` (set by buildTreasuryTable; already global)
- TLA Deposits → `dashboardData.tlaDeposits.totalDeposit` (set by buildTlaDeposits; already populated)
- TLA VP → `window.liveTlaVpUsd` (NEW global, set in fetchDaoTlaVp's `.then`)
- NFT Backing → `window.liveUnmintedNftBackingUsd` (NEW global, set in the unminted-backing tile render path)

Each contributor calls `updateDaoTotalValue()` after writing its global, so the breakdown values appear progressively as data arrives, with the grand total appearing when the last one lands.

### Mobile-only label shortening — 5 tiles

Long labels that were getting truncated/wrapping awkwardly on mobile. Pure CSS swap via `sm:hidden` / `hidden sm:inline` spans — no JS, no flicker:

| Desktop | Mobile |
|---|---|
| Unminted NFT Backing | NFT Backing |
| Backing in ampLUNA | ampLUNA Backed |
| Backing in LUNA | LUNA Backed |
| Backing / Floor (USD) | Backing / Floor |
| Avg Daily Gain Per NFT | Avg Daily Gain |

### Mobile-only smaller Backing/Floor numbers

The `$12.72 / $137.84` pair was crammed against the tile edges on small screens. Added a scoped mobile CSS rule (`#backing-per-nft-usd, #unbroken-floor-usd { font-size: 1.25rem !important; }`) inside the existing `@media (max-width: 640px)` block. Targets only those two value elements — no cascade impact on other tiles.

### What this rev did NOT touch
- Open dashboard items in `CHANGES_PENDING.md` (per-fetch resilience, fallback LCD, fmt/safeLocale dedup) all still pending
- TLA data automation work (`DESIGN_tla_data_automation.md`) — separate workstream
- Mobile polish on non-index pages (other workstream)

---

## Rev 3.33 — 2026-05-08

Fixes the stale-data modal still-can't-close bug from Rev 3.32. Two related issues:

### Issue 1 — DOMContentLoaded handler never fired

Rev 3.30 wrapped the modal close-button wiring in `document.addEventListener('DOMContentLoaded', () => {...})`. That seemed sensible, but the script containing this code is at line 3371 — well inside the body, with the modal HTML already parsed at line 3353 (above). DOMContentLoaded fires *after* the entire body is parsed, which is *after* this script runs. By the time the script attaches the listener, the event hasn't fired yet — but `addEventListener` for a not-yet-fired event… is fine, it should fire when DOMContentLoaded happens.

The actual failure mode appears to be related to the script tag itself being heavy enough (or some other inline script earlier on the page being heavy) that DOMContentLoaded was firing in an unexpected ordering relative to the rest of the page lifecycle. Hard to pin down exactly without instrumenting it on prod, but the symptom was clear: `ack.addEventListener('click', hideStaleDataModal)` was never executing, so the button click had no handler. Same for Esc and backdrop click.

**Fix:** Drop the DOMContentLoaded wrapper. The script runs after the modal HTML is parsed, so `getElementById('staleDataModal')` succeeds at script-eval time. Attach the listeners immediately via an IIFE. This is the more reliable pattern when a script is positioned mid-body, after the elements it operates on.

### Issue 2 — Hide-modal opacity wasn't fully reset

`hideStaleDataModal` removed `opacity-100` but never added `opacity-0` back. With both gone, the modal's effective opacity depended on cascade defaults (likely 1, fully visible). The `display:none` from the eventual `hidden` class added 200ms later would still hide it correctly, but during that 200ms window the modal would appear undimmed — and if `hidden` was somehow blocked from being added (e.g. setTimeout cleared early), the modal would stay visible. The user's repro of "still can't close" suggests this was happening together with Issue 1.

**Fix:** Explicitly add `opacity-0` back when hiding, mirror of the Rev 3.32 show-path fix.

### What this rev confirms working
- Live DAO TLA VP query (Rev 3.31) — screenshot showed `757.0K VP / $5,739` ✅
- DAO Broken/Held NFTs hardcoded (Rev 3.31) — screenshot showed `1,000` ✅
- TLA Deposits main USD render (Rev 3.32) — screenshot showed `$418 / $422 / $39` populated ✅
- Modal opens correctly first time (Rev 3.32) — screenshot showed dimmed backdrop ✅
- Modal still doesn't close on first click — fixed in this rev

---

## Rev 3.32 — 2026-05-08

Three bug fixes shipped against Rev 3.31. All three were confirmed by the user testing on prod.

### Bug 1 — Stale-data modal "Got it" button needed an off-modal click first

**Symptom:** Modal renders correctly, button is visible, hover state works on the button, but the first click on the button does nothing. User reported having to click on the page first, then the button works on second try.

**Root cause:** Tailwind opacity cascade. The modal HTML had both `opacity-0` (initial state) and `hidden` (display:none). The `showStaleDataModal()` function removed `hidden` and added `opacity-100`, but `opacity-0` was never explicitly removed. Tailwind generates both as plain utilities (no `!important`), so which one wins depends on CSS source order. The modal-content (inner div) had its own `opacity-0` that DID get removed, but the backdrop's lingering `opacity-0` was making the entire stacking context transparent to pointer events on the first paint.

**Fix:** Explicitly call `classList.remove('opacity-0')` before adding `opacity-100`, on both the backdrop and content elements. Standard fix for Tailwind opacity transitions on modal show/hide patterns.

### Bug 2 — Modal could fire twice in some loads

**Symptom:** User reported that on some loads, a second modal popup appeared after they had already dismissed the first one.

**Root cause:** `applyTlaStaleness()` is called from two places by design:
1. Early in `updateUI()` (Rev 3.30 fast-popup) — fires ~500ms after page load
2. Inside `fetchLiveOnChainData`'s finally block — fires ~15s later

Both calls invoke `showStaleDataModal()` if the data is stale. The `sessionStorage.aDAO_stale_modal_dismissed` flag was supposed to prevent re-show, but it's only set when the user clicks "Got it" — `hideStaleDataModal()`. If the second call's `applyTlaStaleness` invocation happened *before* the user dismissed the first modal (i.e. user is reading the modal and the slow LCD calls finish in the background), the second modal would queue up and show on top of / after the first.

**Fix:** Added a `window._staleModalShown` runtime flag that's set on first show. Independent of sessionStorage. Once set during a page lifecycle, no further calls to `showStaleDataModal()` open another modal regardless of dismissal state. sessionStorage still serves its purpose for *across-reload* persistence.

### Bug 3 — DAO TLA Deposits tile main value stayed a spinner

**Symptom:** "Est. APR 29.61%" rendered correctly under the TLA Deposits tile, but the main USD value above it was perpetually a spinner — even though epoch 182 data clearly populated successfully.

**Root cause:** Rev 3.30 changed the `buildTlaDeposits` function to RENDER stale data instead of bailing-to-spinner. The render path was working — the function was successfully writing `$6,261` to the tile via `totalValueTileEl.textContent = ...`. **Then** the next line called `updateTile('dao-tla-total', null, false, { ... })` to set the dot color — but `updateTile` has logic at line 8529 that **converts the tile back to a spinner** when called with `isLive=false` and a current value that's not already a spinner. So the dollar value was being written, then immediately wiped back to a spinner one line later.

This was a Rev 3.30 regression. In the pre-3.30 code, the function returned early on stale data, never reaching the `updateTile(..., null, false)` call. After 3.30 made it fall through, that call started firing on every render and undoing the value write.

**Fix:** Removed the redundant `updateTile('dao-tla-total', null, false, ...)` call. Its job (managing the tile's dot indicator) is now owned by `applyTlaStaleness()` introduced in Rev 3.30. The value write at line 7644 is now permanent.

### Not fixed in this rev

- **15-20 second load time** still happens (mostly Terra LCD response time during the May 8 publicnode flakiness). Resilience items in `CHANGES_PENDING.md`: per-fetch timeouts, per-fetch try/catch isolation, fallback LCD endpoint on 5xx.
- **Live LP-balance query** for fully-live TLA Deposits — the user described what this would require (DAO wallet → ampLP balances both amplified and non-amplified → prices → reverse-resolve to underlying tokens, plus discovery of new LPs as they're added). Confirmed correctly: too heavy for this session's scope. Snapshot + staleness modal is the right approach for this tile. Logged in CHANGES_PENDING for future consideration if it becomes important.

---

## Rev 3.31 — 2026-05-08

Live DAO TLA VP query + DAO Broken/Held NFTs tile fix. Removes Rev 3.29's dead code in the same pass.

### The architectural insight that drove this rev

The user's question: *"why can we query the DAO contract to find the TLA Locks to get the TLA voting power live not from snapshot?"* — Correct, and that approach is strictly better. Live queries:
- Eliminate staleness entirely — no snapshot, no stale-vs-fresh logic, no red dot
- Don't depend on the Sunday-night snapshot capture happening
- Reflect on-chain reality the moment claims/transfers occur
- Make the fragility the previous revs were working around (cascade fixes, parallel epoch-fallback, modal popups) irrelevant for the affected tiles

The TLA Locks contract was already partially wired into `index.html` (line ~9229, `TLA_LOCKS_CONTRACT = 'terra1uqhj8agy...'`) for marketplace lookups. The same contract handles the live VP query.

### Discovery — TLA Locks is a CW721

Inspecting the contract address the user provided (`terra1uqhj8agy...`) revealed it's a CW721 NFT contract, not a standard liquidity-staking contract. **Each lock IS an NFT**, owned by the locker. So getting all of the DAO's locks is just standard NFT enumeration:

1. `tokens{owner, start_after, limit}` → list of token IDs owned by an address
2. `all_nft_info{token_id}` → metadata for each (locked amount, asset, multiplier)
3. Sum: `amount × multiplier × (LST→LUNA ratio)`

This is well-documented CW721, no new dependencies, no Eris-specific API.

### Changes

**1. New `fetchDaoTlaVp(ampLunaToLunaRate, arbLunaToLunaRate)` function**
- Paginates `tokens` query (up to 5 × 100 IDs — DAO unlikely to have many but safe)
- Parallel `Promise.all` of `all_nft_info` queries for each token
- Multiple attribute-name fallbacks (`amount` / `locked_amount` / `balance`, `multiplier` / `power_factor` / `factor`, etc.) since the exact CW721 attribute scheme isn't documented anywhere — first session will log diagnostic info if attrs don't match expectations
- Duration-string fallback for multipliers (`Max=10`, `3mo=2`, `1wk=1` per `tla-tool_ext.html` line 3998)
- Auto-converts arbLUNA / ampLUNA amounts to LUNA-equivalent for "underlying assets" sum
- 6-second per-fetch timeout via AbortController
- 60-second in-memory cache (chain queries are rate-limited; locks don't change second-to-second)

**2. New `DAO_BROKEN_HELD_COUNT = 1000` constant**
The dashboard's `#dao-broken-total` tile has been spinning since launch — turns out it never had any code path writing to it. The admin tool (`tla_tool.html` line 2409) explicitly states *"Dashboard hardcodes this as 1000"* — the documented governance count from Props 64-69 (DAO holds 1,000 broken NFTs across 3 multisig wallets). Now actually hardcodes it. Future improvement noted in CHANGES_PENDING: filter the live `nfts` array against the actual 3 wallet addresses (which aren't in the codebase yet).

**3. Live wiring in `fetchLiveOnChainData`'s finally block**
Both new tiles are populated in the existing finally block (which runs after the slow LCD calls). Both get green pulse-dots since the data is live. The `applyTlaStaleness()` call still runs but now only manages staleness UI for the **TLA Deposits** tile (which legitimately needs snapshot data — it's a USD aggregate computed at epoch end across many positions, not a single-contract query).

**4. Deleted Rev 3.29's dead code**
The `fetchTlaFromGitHub` + `updateTlaFromGitHub` functions were querying `adao_json_storage` for `adao-snapshot_*_end.json` files that have never existed in that repo, then falling back to `fetchTlaData` anyway. Pure dead code, ~140 lines removed. The `_adaoSnapshotCache` variable removed too. Cleanup item from `CHANGES_PENDING.md` resolved.

**5. New `window.cachedLunaPrice`** added at the existing LUNA-price assignment site, so `fetchDaoTlaVp` can compute USD totals without re-fetching.

### What this does NOT do

- **TLA Deposits** stays on the snapshot path. The deposits tile is a USD aggregate of multiple positions (the DAO has stake in pools, not just locks), computed at epoch end. Going live would require querying every pool the DAO has stake in plus their token prices — much more work for marginal benefit. Snapshot + staleness modal (Rev 3.30) is appropriate here.
- **DAO Broken/Held still hardcoded.** Could be made fully live by filtering the `nfts` array for owners matching the 3 DAO wallets, but the two liquidity-wallet addresses (`...8ywv`, `...417v`) aren't in the codebase. Logged in CHANGES_PENDING.

### First-load diagnostic
On the first run after deploy, the console may log:
```
DEBUG: fetchDaoTlaVp — found tokens but no locks parsed; first lock attrs: [...]
```
This means the CW721 attribute names don't match what the code expects. Send a screenshot of the logged attributes and the multiplier/asset extraction can be tuned to the real format.

---

## Rev 3.30 — 2026-05-08

Stale-data UX overhaul. Three problems fixed in one pass: (1) DAO TLA Deposits and DAO TLA VP tiles spinning forever despite epoch-182 data being available, (2) red bordered banner inside the rewards card was redundant once you got a popup explaining the same thing, (3) staleness check happened way too late in the page lifecycle (after the 15s LCD calls finished).

### Diagnosis — why two TLA tiles were stuck

`buildTlaDeposits()` and `buildTlaVp()` had a `if (!hasValidTlaData || dataIsStale)` guard that swapped the entire render path for a spinner whenever data was stale. Original intent was good — Design Principle #1 says blank > stale. But with this rev's modal + red dot, "stale" is now visibly marked, so showing the actual numbers is fine. Hiding behind a perpetual spinner was just confusing because it looks indistinguishable from "still loading" forever.

Also discovered: **`adao_json_storage` has zero `adao-snapshot_*_end.json` files** — the entire pattern Rev 3.29's `fetchTlaFromGitHub()` was querying never existed. The actual data the dashboard tiles need (treasury, tla_deposits, etc.) lives in `tla_json_storage/tla-data-epoch-X-end.json` under the `dashboard.*` keys, and the existing `fetchTlaData()` already fetches it correctly. The `buildTlaDeposits()` function already had a fallback path to consume that data — it just wasn't being reached because the staleness check bailed first.

### Changes

**1. Tile builders render stale data instead of bailing**
- `buildTlaVp()`: changed `if (!tlaData || meta.isStale)` to just `if (!tlaData)` — only spin when data is genuinely missing
- `buildTlaDeposits()`: same change to `if (!hasValidTlaData)`

**2. New `applyTlaStaleness()` helper — single source of truth for staleness UI**
Lives near `tlaDataMeta` declaration (so it has scope access). Reads the meta, sets:
- 🟢 green `pulse-dot` on `dao-tla-title` + `dao-tla-vp-title` if fresh, 🔴 red `static-dot-red` if stale
- Small "Stale Data" pill (`unclaimed-stale-warning`) in the rewards card header — visible
- Status text (`unclaimed-data-status`) showing "Epoch X data" — visible
- Big red bordered banner (`unclaimed-stale-banner`) — explicitly hidden (replaced by modal)
- Modal popup if stale AND `sessionStorage.getItem('aDAO_stale_modal_dismissed')` is unset

Idempotent — safe to call multiple times. Called from three places: end of `updateUI()` (early), inside `fetchLiveOnChainData`'s finally block, and would be added to tile builders if needed (currently not — early `updateUI()` call is enough).

**3. New stale-data modal**
HTML at `<div id="staleDataModal">` near the other modals. Shows on launch when stale; user clicks "Got it — show me the dashboard" to dismiss; sessionStorage flag prevents re-show within the tab session. Standard modal pattern (click outside, Escape, X to close).

**4. Banner display removed from two places**
- The `if (meta.isStale)` branch in the rewards-card stale handler — now only sets the pill + status + yellow tint, no banner
- The Rev 3.29 finally-block code in `fetchLiveOnChainData` — replaced with single `applyTlaStaleness()` call. The banner HTML element itself is left in place (zero footprint when hidden) for now; can be deleted in a cleanup pass.

**5. Early staleness check — popup appears within ~500ms of load**
`updateUI()` now kicks off `fetchTlaData()` in parallel with `fetchLiveOnChainData()`. Since fetchTlaData is internally cached, all the downstream callers (buildTlaVp, buildTlaDeposits, etc.) reuse the same in-flight promise — no duplicate network calls. The `.then(() => applyTlaStaleness())` fires the modal as soon as the snapshot resolves, regardless of how slow the on-chain calls are.

### What this didn't fix

- **DAO Broken/Held NFTs tile is still spinning.** This one isn't actually a TLA snapshot issue — the tile element (`#dao-broken-total`) has zero live-data writes anywhere in the codebase. Only the chart icon attaches to it. It's missing implementation, not a stale-data problem. Probably wants `nfts.filter(n => n.broken && n.owner === DAO_MAIN_WALLET).length` populating it from the live `nfts` array, but that's a design call. Logged in `CHANGES_PENDING.md`.
- **Rev 3.29's `fetchTlaFromGitHub` is now redundant.** It still runs and harmlessly returns null (since `adao_json_storage` is empty). The downstream builders already fall back to `fetchTlaData` correctly. Worth deleting in a cleanup pass — logged.

---

## Rev 3.29 — 2026-05-08

TLA snapshot fetch: parallel epoch-fallback + staleness UI. Closes the gap that Rev 3.27 left — the dashboard's TLA tiles (DAO TLA Deposits, DAO TLA VP) were spinning forever any time the latest snapshot was missing, even when older snapshots existed.

### Background
Two separate fetches consume snapshot data on this site:
- `fetchTlaData()` (line ~7700) reads `tla_json_storage` for the **TLA Stats page** — already had epoch fallback
- `fetchTlaFromGitHub()` (line ~3529) reads `adao_json_storage` for the **dashboard tiles** — had no fallback

When the user misses a Sunday-night snapshot capture (e.g. site outage prevented it), the second function's `currentEpoch-1` fetch 404s and the dashboard tiles never recover. Older snapshots are sitting right there in the repo, but the code never tries them.

### What changed

**`fetchTlaFromGitHub()` rewrite — parallel epoch walk:**
- Tries 6 candidate epochs simultaneously: `[currentEpoch+1, currentEpoch, currentEpoch-1, currentEpoch-2, currentEpoch-3, currentEpoch-4]`
- `Promise.allSettled` — total wall-time is one round-trip regardless of which one wins (vs. up to 6 sequential round-trips in the old TLA Stats pattern)
- 5-second per-fetch timeout via `AbortController` so a hung GitHub CDN can't stall the dashboard
- In-memory cache keyed by `currentEpoch` so re-renders within a session reuse the result; auto-invalidates when the epoch number rolls Sunday 23:59 UTC

**Staleness convention:**
- Found at `currentEpoch+1` / `currentEpoch` / `currentEpoch-1` → **fresh** (the healthy expected state)
- Found at `currentEpoch-2` or older → **stale**, with `epochsBehind` count
- Returned as `{data, epoch, currentEpoch, epochsBehind, isStale, timestamp}`

**`updateTlaFromGitHub()`** now returns the same metadata so the caller can render the right state instead of just a boolean.

**Caller (the `finally` block in `fetchLiveOnChainData`)** now does three things on success:
1. **Green pulse dot** on `dao-tla-title` and `dao-tla-vp-title` when fresh
2. **Red `static-dot-red`** + tooltip explaining the lag when stale
3. **Reveals the existing `unclaimed-stale-banner`** with epoch numbers populated, so users see the same warning the TLA Stats page already shows when data is behind. No new modal — reuses what was already there.

On total failure (all 6 epochs unreachable), no dot is added — spinner stays so the user knows the state is genuinely unresolved rather than being shown stale data dressed up as fresh.

### Why parallel matters for speed
The previous TLA Stats fallback walks epochs sequentially. If the user missed 2 epochs, that's 3 sequential fetches before finding data — easily 1–2 seconds of avoidable wait time. Parallel collapses that to one round-trip. The new dashboard fetch will load fast even in the worst-case stale scenario.

### Open items not addressed in this rev
- **Apply the same parallel pattern to `fetchTlaData()`** (TLA Stats page) — it works correctly today but is unnecessarily slow on stale fallback. Easy port; logged for a follow-up.
- **Per-fetch timeout in `fetchLiveOnChainData`** for the slow Terra LCD calls — 14.67s load time on yesterday's session is mostly from there, not from TLA. Logged.

---

## Rev 3.28 — 2026-05-08

Mint Status slider — was permanently spinning. Bug existed since the slider was added; only became visible once Rev 3.27 fixed the cascade and the rest of the dashboard started loading reliably.

### Root cause
The slider's three text spans (`#unminted-count`, `#minted-count`, `#minted-percent`) and the bar (`#mint-slider`) were only touched by `updateUI()` at startup. That function reads `dashboardData.statusSliders.mint.percentMinted` — but that field is hardcoded `null` (line 3373) and nothing in the codebase ever writes to it. So the read failed the null check, the slider was left untouched, and the initial spinner HTML stayed forever. By contrast, the Broken Status slider next to it has a parallel block in `fetchLiveOnChainData()` that writes to its DOM elements directly using the live `brokenCount` — that's why one worked and the other didn't.

### Fix
Added a Mint Status slider update block in `fetchLiveOnChainData()` immediately after the existing Broken Status block. Uses the same `mintedCount` / `unmintedCount` values already derived in Rev 3.26's null-safety patch (line ~6164), so no new data fetching needed. Color convention matches the Broken slider: cyan-blue = the highlighted half ("Minted" here, "Broken" there), gray = the remaining half. All formatters use the Rev 3.27 `safeLocale` / `safeFix` helpers, so a missing upstream value shows `—` instead of crashing.

---

## Rev 3.27 — 2026-05-08

Comprehensive null-safety fix — the same `TypeError: Cannot read properties of null (reading 'toLocaleString')` from Rev 3.26 was still crashing `fetchLiveOnChainData()`, just at different sites that 3.26 didn't touch.

### What was still broken after Rev 3.26

Rev 3.26 fixed the `mintedCount.toLocaleString()` crash by adding `fmt(v)` and applying it to the supply / unminted-modal block (lines ~6313–6318, 6346–6347). But the function has **15+ other** `.toLocaleString()` and `.toFixed()` calls that were still unguarded:

- **Broken-count slider** (lines 6325–6331): `brokenCount.toLocaleString()`, `(totalNftsForBrokenCalc - brokenCount).toLocaleString()`, `(brokenCount / totalNftsForBrokenCalc * 100).toFixed(2)`
- **Backing tile updates** (lines 6333–6338): `liveAmpLunaBacking.toFixed(4)`, `ampLunaToLunaRate.toFixed(4)`, `backingInLunaLive.toFixed(4)`, `lunaPriceUSD.toFixed(4)`, `backingInUSD.toFixed(2)`, `unmintedBackingLuna.toLocaleString(...)`, `unmintedBackingUSD.toLocaleString(...)`
- **Unminted modal text content** (lines 6348–6351): `backingInLunaLive.toFixed(4)`, `backingInUSD.toFixed(4)`, `unmintedBackingLuna.toLocaleString(...)`, `unmintedBackingUSD.toLocaleString(...)`
- **Catch block** (lines 6368–6377): the *recovery* path called `keyMetrics.daodaoStaked.toLocaleString()`, `keyMetrics.daoMembers.toLocaleString()`, `keyMetrics.enterpriseStakedHolder.toLocaleString()`, `keyMetrics.backingInLuna.toFixed(2)` — but those keyMetrics fields are hardcoded `null` at line 3370. So the catch crashed on its first line and **never applied any of its 'Error' fallbacks**, leaving downstream tiles permanently stuck on the initial spinner.

### Today's trigger

`terra.publicnode.com` returned HTTP 500 on a treasury balance query (the contract balance for `terra1sffd…3m5vzm`). That null propagated into the unguarded format calls and triggered the cascade. It "worked yesterday" simply because the LCD was up yesterday — the underlying bug has been latent since Rev 3.21's honest-data cleanup removed the static fallbacks that masked it.

### Fix

- **Hoisted null-safe formatters** above the `try` block so they're visible in both `try` and `catch`:
  - `safeLocale(v, opts)` — null-safe `.toLocaleString('en-US', opts)`, returns `'—'` for null/undefined/NaN
  - `safeFix(v, d=2)` — null-safe `.toFixed(d)`, returns `'—'` for null/undefined/NaN
- **Made backing calcs null-aware** so a missing upstream value propagates as `null` instead of being silently coerced to `0` (which would display as "0 LUNA" — a Design Principle #1 violation, since "0" looks like real data):
  ```js
  // Was: const backingInLunaLive = liveAmpLunaBacking * ampLunaToLunaRate;  // null * num = 0
  // Now:
  const backingInLunaLive = (liveAmpLunaBacking != null && ampLunaToLunaRate != null)
    ? liveAmpLunaBacking * ampLunaToLunaRate : null;
  ```
  Same treatment for `liveAmpLunaBacking`, `backingInUSD`, `unmintedBackingLuna`, `unmintedBackingUSD`.
- **Replaced every unguarded format call** in the affected lines (6325–6351 in try, 6368–6377 in catch) with `safeLocale` / `safeFix`.
- **Reset broken-count slider in catch** so it doesn't stay on its initial spinner if recovery runs.

### Why the catch had the same bug

This was a textbook "the recovery path was never tested" scenario. The catch was written assuming `keyMetrics.X` was always populated with sensible defaults — but Rev 3.21's honest-data cleanup left those at `null`. Since the catch only fires on errors, and errors on prod were rare until today's LCD outage, nobody noticed the recovery itself was broken.

### Open items not addressed in this rev

- **Per-fetch try/catch isolation** would be a stronger fix — currently one failed treasury balance fetch poisons every downstream calculation. Logged for future revisit; not in scope here.
- **Fallback LCD endpoint** — both `terra.publicnode.com` and `terra-lcd.publicnode.com` returned 500s today. A retry against a different public LCD on 5xx would significantly improve resilience. Logged for future revisit.
- **The `fmt` helper from Rev 3.26 is now redundant with `safeLocale`** but left in place for stability — can be deduplicated in a future cleanup pass.

---

## Rev 3.26 — 2026-05-08

Bug fix — broken tile cascade.

### Root cause
A `TypeError: Cannot read properties of null (reading 'toLocaleString')` was crashing `fetchLiveOnChainData()` partway through, leaving 7+ stat tiles permanently spinning (Mint Status, Broken Status, DAO Treasury, DAO TLA Deposits, DAO TLA VP, NFT Backing tiles, Unminted NFT Backing). The crash happened at `mintedCount.toLocaleString()` because `mintedCount` was always null.

The Rev 3.21 "honest data display" cleanup removed snapshot fallbacks but left two read paths (`dashboardData.statusSliders.mint.minted` and `.unMinted`) reading from values that were no longer being populated by anything. They stayed at their initialization value of `null` forever.

### Fix
- **Derive `mintedCount` and `unmintedCount` from the live `nfts` array** instead of the dead static-data path. Strategy: NFTs owned by the DAO main wallet (`terra1sffd4efk2jpdt894r04qwmtjqrrjfc52tmj6vkzjxqhd8qqu2drs3m5vzm`) are unminted (held by the DAO, not yet distributed). If the API ever exposes an explicit `minted` boolean per NFT, the code prefers that. Console logs the derived counts for verification.
- **Added null-safety helper `fmt(v)`** that returns `'—'` instead of crashing when a value is null. Applied to all toLocaleString calls in the supply / unminted-modal block.

### Other infrastructure
- **`site.webmanifest`** restored to repo root (was 404'ing — PWA manifest)
- **`favicon.ico`** still needs to be added at repo root (browser auto-requests `/favicon.ico`; the GitHub-hosted favicons in `<link>` tags don't catch this fallback request). Action item for the user — copy the file from `aDAO-Image-Files/favicon.ico` into the site repo.

---

## Rev 3.25 — 2026-05-08

Duplicate header cleanup pass — extending the Rev 3.23 fix to the 10 pages chrome'd in 3.24.

### Pages with simple "logo + page title + logo" duplicate row removed entirely
The page-specific second header was redundant with the shared header (which already provides logos). Removed:
- `tutorials.html` (1.4 → 1.5) — "Community Tutorials" title
- `rarity-explained.html` (1.2 → 1.3) — "NFT Rarity Explained" title
- `release-history.html` (1.3 → 1.4) — "NFT Release History" title
- `links.html` (1.3 → 1.4) — "Official & Helpful Links" title
- `alliances.html` (1.3 → 1.4) — "Our Alliances" title
- `ally.html` (3.3 → 3.4) — "ALLY Rewards Explained" title

### tools.html (1.3 → 1.4)
The page-specific second header had the OLD top nav (4-tab: NFT Explorer dropdown / TLA Stats / DAO) — redundant with the shared 5-tab nav above. Removed entirely. The CoinGecko price ticker that lived just below the old nav is preserved.

### Sticky functional headers cleaned (kept functional bits, dropped Dashboard/title)
Same treatment as TLA Stats / DAO got in earlier revs:
- `dao_treasury.html` (2.2 → 2.3) — removed Dashboard backlink and "DAO Treasury" title; kept Live data indicator
- `dao_tla_deposits.html` (2.2 → 2.3) — removed Dashboard backlink and "TLA Deposits" title; kept Treasury cross-link, period buttons, and epoch badge

### tla-docs (1.2 → 1.3)
Removed the small `<header class="header">` block containing "TLA Documentation" title + tagline. Page content makes purpose clear.

---

## Rev 3.24 — 2026-05-08

Phase 2 cross-page chrome rollout + site-wide favicons + Vercel analytics + deving.zone API URL update.

### deving.zone API URL update
The deving.zone API path migrated from `/en/nfts/alliance_daos.json` to `/nfts/alliance_daos.json`. Updated all 7 occurrences across 5 files: `index.html` (2x), `ally.html`, `links.html` (browser link), `tla_tool.html` (2x), `nft-explorer-app.js`. The API now refreshes hourly instead of every 6 hours, so NFT status data on the site will be more current going forward.

### Per-page chrome rollout (12 pages)
Brought the unified chrome system (5-tab top nav, mobile bottom nav, footer with Rev / Changelog button, page-specific changelog modal) to the remaining user-facing pages. All fetch this file (`index-log.md`) on changelog open since site-wide changes typically affect multiple pages and a single shared log is easier to maintain than 12 separate ones.

| Page | Starting rev |
|---|---|
| `tools.html` | 1.3 |
| `ally.html` | 3.3 |
| `tutorials.html` | 1.4 |
| `alliances.html` | 1.3 |
| `links.html` | 1.3 |
| `rarity-explained.html` | 1.2 |
| `release-history.html` | 1.3 |
| `tla-docs.html` | 1.2 |
| `dao_treasury.html` | 2.2 |
| `dao_tla_deposits.html` | 2.2 |
| `ampcapa-tool.html` | 1.3 |
| `fuel-tool.html` | 1.3 |

Page-specific headers and content preserved on all 12 — the shared header was inserted ABOVE existing headers, never replacing them. `tools.html` had a duplicate "social + Tutorials/Official Links/NFT Contract/Contract Audit" footer that was redundant with the shared footer, so it was removed.

### Site-wide favicons
Added the standard 4-link favicon block to all 9 user-facing pages that were missing it:
- `adao-lore.html`, `alliances.html`, `ally.html`, `dao_tla_deposits.html`, `dao_treasury.html`, `rarity-explained.html`, `tla-docs.html`, `tutorials.html`
- Plus `dao_governance_tool.html` (admin page, favicon only)

Now every user-facing page shows the aDAO logo as the browser tab icon.

### Site-wide Vercel Web Analytics
Added the Vercel `_vercel/insights/script.js` snippet to 5 pages that were missing it:
- `dao.html`, `dao_governance_tool.html`, `dao_tla_deposits.html`, `dao_treasury.html`, `tla-docs.html`

All 19 user-facing pages (everything except the Google verification stub) now report analytics.

### Admin pages — partial treatment
`tla_tool.html`, `tla-tool_ext.html`, `dao_governance_tool.html` already had favicons + Vercel analytics from earlier work, but did NOT get the chrome rollout. They're internal admin tools where the public 5-tab navigation would be misleading context. This is a deferred decision logged in CHANGES_PENDING.

---

## Rev 3.23 — 2026-05-08

Quick fix after Rev 3.22 went live.

### What changed
- Fixed changelog modal — was fetching from `/main/logs/index-log.md` (404), now fetches from `/main/index-log.md` to match where the file actually lives in `website-adao-core`. Same fix applied to all 4 core tab pages (NFT Explorer, aDAO Lore, TLA Stats, DAO)

### Convention now codified
Log files in `defipatriot/website-adao-core` live at the **root** of the repo, not in a `/logs/` subdirectory. PROJECT_KNOWLEDGE.md updated to reflect this.

---

## Rev 3.22 — 2026-05-08

Cross-page consistency rollout (phase 1) — top-level navigation pages.

### What changed
- **4 files renamed for cleaner URLs:**
  - `planet-map.html` → `adao-lore.html`
  - `capa_lp_converter.html` → `ampcapa-tool.html`
  - `fuel_tracker.html` → `fuel-tool.html`
  - `dao_governance.html` → `dao.html`
- **Top nav now has 5 tabs** including a new Home tab (was 4 — Home now shows on every page including index)
- **Active page highlighting** — current page's tab gets cyan styling in both desktop top nav and mobile bottom nav
- All internal references in `index.html` and `tools.html` updated for the renamed files
- `sitemap.xml` rewritten to reflect current page list with new names

### Cross-page rollout (separate file pushes, listed here for visibility)
Four core tab pages now have unified header + 5-tab top nav + mobile bottom nav + footer + per-page changelog system, with their original page-specific controls preserved:
- `nft-explorer-index.html` — starting rev 4.12 (Collection/Wallet/Map view toggles preserved)
- `adao-lore.html` — starting rev 2.8 (galaxy map content preserved)
- `tla-stats.html` — starting rev 1.14 (epoch selector + all charts preserved)
- `dao.html` — starting rev 1.4 (Members/Proposals tabs + audit tool link preserved)

Each of those 4 pages fetches its own changelog. All other pages (when added in a future rollout phase) will fetch `index-log.md` since most site-wide changes happen on the homepage anyway.

---

## Rev 3.21 — 2026-05-07

This revision consolidates a wide-ranging modernization of the dashboard. Major themes: SEO/PWA readiness, mobile redesign, more honest data display, navigation cleanup.

### SEO & discovery
- Added canonical URL, full Open Graph + Twitter Card meta tags, robots directive, theme-color
- Improved meta description (~150 chars)
- Sitemap rewritten — removed 7 dead pages, added 8 active ones, re-prioritized live dashboards

### PWA / install support
- `site.webmanifest` upgraded with categories, maskable icons, 3 quick-launch shortcuts
- App install instructions modal (iPhone / Android steps)
- App-launch default-page selector (only visible when running as installed app)
- Mobile bottom tab bar (Home / NFTs / Lore / TLA / DAO) — fixed-position, native-app feel, auto-highlights active page

### Navigation overhaul
- Top nav restructured to 4 equal-width tabs: NFT Explorer · aDAO Lore · TLA Stats · DAO
- Galaxy Map promoted out of dropdown to its own "aDAO Lore" tab
- Mobile labels shortened: Explorer · Lore · TLA · DAO
- DAO Home link fixed (removed `?url=...erisprotocol.com` query param)
- Top info-cards grid expanded to **9 tiles** with two new dropdown-style tiles:
  * **DAO Links** (Main DAO + Council DAO sections, 10 destinations)
  * **Contract** (NFT Contract + Contract Audit)
- ALLY Rewards displays as a tall tile spanning 2 rows on desktop, normal tile on mobile

### Honest data display
- Removed all "snapshot fallback" data — tiles no longer show stale values when fetches fail
- Replaced em-dashes and "stale data" text with consistent loading spinners
- Removed red snapshot indicator dot — tiles either show live data (green pulse dot) or a spinner
- Treasury tile only displays a value when ALL assets successfully priced
- TLA Deposits / TLA VP use epoch-based staleness check (not date-based)
- "Please Note" disclaimer banner removed (no longer needed)

### Mobile redesign
- Single coherent mobile CSS block (replaced ~370 lines of layered overrides)
- Top info-cards: 3-col grid on mobile, all 9 tiles uniform compact size
- Stat tiles: tighter padding, smaller fonts, chart icons no longer overlap titles
- Live Activity rows: 2-line layout (NFT info on row 1, price + time on row 2)
- Marketplace collection tabs: segmented control style with proper sizing
- Listings filter: replaced 3-button toggle with single-select dropdown using collection logos
- Mobile-only filter dropdowns for Condition + Marketplace (replaces inline button groups)
- CoinGecko ticker thinner on mobile
- Tile titles wrap to 2 lines instead of truncating with ellipsis
- Tile text properly centered (CSS specificity fix)

### Cleanup
- Removed dead pages from repo: `graphs.html`, `news.html`, `rampt.html`, `on-ramp.html`, `off-ramp.html`, `alliance-dao-docs.html`, `test-page.html`
- Removed `Logos` modal trigger from footer
- Removed yellow disclaimer banner
- Vercel domain redirects fixed to 308 permanent (`theadao.com`, `www.theadao.com` → `www.thealliancedao.com`)

### Footer additions
- Rev number + Changelog link added to footer (this changelog)

---

## Rev 3.20 and earlier

History prior to Rev 3.21 was not formally tracked. Major prior revisions:
- **Rev 3.x** — multiple iterations of the unified dashboard view (current architecture)
- **Rev 2.x** — separate-pages era, before main dashboard consolidation
- **Rev 1.x** — initial release with basic NFT links / info hub layout

Going forward, each push will get its own rev entry here.

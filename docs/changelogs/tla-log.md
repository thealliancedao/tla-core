# TLA Stats Changelog

## T3.20 — 2026-08-25 — LP Grades tab rebuilt (v2 lenses · Vote Advisor v2 · PD Bribe Tracker · guide) · Pools tab (LP Stats + TLA Stats merged) · dead tab + inline chrome stripped

**LP Grades:** five-lens grade per pool from lp-grades 2.0.0 (Purpose · Work ·
Efficiency · Durability · Governance; measured lenses are percentiles against
the field; bands A≥75 B≥60 C≥45 D≥30), bucketed rows with five bars, streak
chip, why line, drill to every number; legend states the field distribution.
**Vote Advisor v2** on the owner's doctrine: votes are earned (≥4 epochs at
C+), new/inactive/unsupported pools only through a declared council reason,
bribes never an input, recommend seldom. Every bucket shows NOW and THE
LENSES SAY with reasons + emissions; verdict carries proposability
("not proposable yet — X 2/4 still earning"); proposal message (gauge
controller `vote`, bps = 10000, ≤50%/pool) only when proposable. **PD Bribe
Tracker** (pd-bribe-fit 1.0): per batch, stated criterion quoted, allocation
vs rank on that criterion across ALL pools at placement, qualified-not-bribed,
drift heatmap through the window, the whole field expandable with pools that
outranked a bribed pool and got nothing. **Guide** block + corpus doc
(lp-grades-and-voting.md) — the old interim-weights methodology text was
wrong and is gone; header chip reads "grading v2.0.0".
**Pools tab:** LP Stats + TLA Stats merged — one row per pool (grade ·
liquidity · work · emissions · votes · pot · you), bucket totals rows,
sortable, drill; tiered daily charts restored per bucket (tier remembered).
Subnav = Overview · LP Grades · Pools; `#tla` → pools. Unknown single gauge
named from the register (ROAR-ampROAR LP) via the FULL gauge id (the
snapshot's name field is a truncated id).
**Strips:** the dead TLA Stats tab (614 lines: markup, renderTlaTab,
applyTlaFilters, showTlaMetricHistory, updateTlaSortIcons, listeners) and the
inline legacy chrome (shared-chrome CSS, changelog modal, mobile bottom nav,
chrome script) — see index-log for the site-wide batch. Header highlight now
follows switchToTab. Gate 63/63.


## T3.19 — 2026-08-24 — Overview tab walk: Batch A fixes, Batch B redesign, Vote Market v3 (Votion's optimizer reproduced), live pots, reward fates

**Batch A (mechanical, owner walk + HAR + console):** Top-by-APR reads Eris's
per-gauge product (Amp = eris_apy_pct, Non = eris_apr_pct; movement baseline
= the same product one epoch back) — the old path was snapshot approx_apr × a
bucket multiplier (1.10/1.05) and read 88.5% where Eris shows 68.7/96.1 ·
Votion VP repointed to votion/optimization aggregate (every bucket read
"Votion 0.00" because the snapshot field was gone) · Movers rows show
Votion's announced next-epoch move (per-pool Votion history is not captured
daily; the tooltip says so) · bribes keyed by gauge + bucket (the same LP in
two buckets inherited one gauge's bribe: a phantom "$493/1M VP" row and $139
double-counted in the pot) · SS volume board says "not captured" · Member
Portfolio → SOON (disabled subtab; page = Test 1 on Tools), Docs tab removed
(Test 2) · dead yearly-file loader stripped (116 lines; its sources retired
08-11) · token-name adapter fixed (parsed the catalog as an object; loaded 0
names since 08-11 — 38 now).

**Batch B (presentation):** Vote breakdown defaults to Planned, bars
left-aligned and scaled to the largest pool, delta labels show "(users ±a ·
Votion ±b)" · Runway opens with the sentence the data supports (0.00% of VP
unlocking → "exit pressure from unlocks is negligible"); pending-withdrawal
block priced in USD · Threshold Watch at-risk rows: cushion above 1% and
"+N VP ≈ $ of bribe at the market rate" to reach 2% · Pool Health rows:
identity + one sentence from the numbers + wider trend + three chips (APR ·
runway · votes) + "plan a trade →" per pool; embedded simulator removed
(strip links to the Trade Planner with the selected wallet) · Positions &
flow: "Idle in the wallet" — live bank + cw20 balances, priced, with the TLA
pools that take each token (Eris APY), the VP a max-lock would carry (LSTs,
LUNA via ampLUNA), planner link per token; a menu, not advice · Growth tile:
"Where the rewards go" panel from tla-flows/pressure (compounded / claimed to
wallet / swapped in-tx per epoch; net token pressure chips; "left Terra" not
captured and says so).

**Vote Market (was Bounty Board), three versions in one night, the last one
right:** v1 rate = VP-weighted median over all bribed pools → $4.58 (LP-voted
bluechip VP dragged it down) and every projection capped at the same 7.98M.
v2 rate = median over pools Votion votes ($18–27 band), per-pool cap by
Votion's spare votes. **v3 = Votion's own optimizer, reproduced and gated:**
its captured worksheet shows reward = bribe × a/(V+a) (V = gauge VP excluding
the vault's own) and objective = max Σ with the vault's VP as budget; solving
it exactly lands 1–2% above Votion's reported totals on every bucket-plan
(their solver runs 1–4 iterations); hysteresis observed (keeps current under
~4% deviation / ~$1 gain). "+$X" runs that objective on the pots with $X
added, both max vaults, and reports Votion's votes before → after, pool
share, emissions/week. **Owner catch:** the three CAPA gauges were missing
from Votion's option set NOT because of the token — their pots were funded
for period 199 only (bribe-state runway); Votion only weighs pots funded for
the period it votes into. Rows now carry "funded / not funded p200", unfunded
gauges with Votion votes sort to the top as warnings. **Live pots:** the page
reads the incentive manager's pots for the voted period directly (one smart
query, catalog-priced) on load and every 5 min, shows Votion's cast deadline
(its voteBefore) as a countdown, and the optimizer runs on the live pots — a
top-up shows on the next refresh. Gate `gate-tla-stats.mjs` 36/36 incl. a
simulated live CAPA top-up flipping the row and placing Votion votes.


---

## Rev T3.13 — 2026-08-21 — unified chrome: tabs above the tiles, picker in the header

Tabs (Overview · Member Portfolio · LP Grades · LP Stats · TLA Stats · Docs) now
render via `SiteHeader.subnav` directly under the site header, ABOVE the six
info tiles; the "Terra Liquidity Alliance Tracker / Eris TLA" title row is
retired and Live Epoch · Epoch Ends In · load status · member status chip move
into the sub-nav's right slot at runtime. The legacy tab strip and the "View
member" select are hidden receivers: sub-nav clicks forward to `.tab-btn` so
switchToTab(), #hash deep links and analytics are unchanged; the header picker
sets `#member-selector` (pre-data selections held in store and rendered when
data lands; × = TLA-wide; board clicks sync the pill). Rendering code untouched.
Gate: order, 6 tabs, hash sync, epoch widgets moved, click drives page — 0 fails.
Also T5.4 (arb strip corpse filter) earlier today.

## Rev T5.4 — 2026-08-21 — arb strip: corpses out (matches the simulator)

The Overview arb strip and slippage.html's radar disagreed: the strip showed
"1 divergence · ampROAR-ROAR (Skeleton Swap) vs unnamed pool terra1hqq6…
(unlisted) · 15.66% apart" while the simulator said "all quiet". Root cause:
the strip reads the gauge-set snapshot, which still carries drained migration
corpses (dex:null, address-named — that one is the old ampROAR-ROAR Astroport
pair); the simulator builds from the DEX crons' own pool lists, where corpses
never exist. The strip's filter only excluded concentrated/stable, so corpses
passed. Fix: additionally require a named DEX (`if (!p.dex) continue`).
Replayed over the live snapshot: both phantom arbs gone (ampROAR-ROAR and a
USDC-USDt vs unlisted), 6 real cross-DEX pairs still compared, radar quiet —
identical to the simulator. Skeleton Swap pools (dex_subtype:null, xyk by
construction) stay in. One line; rendering untouched.
Noted for later: the largest remaining gap (WETH|WSTETH 23.6%) pairs an SS
wETH pool with an Astroport WETH.axl pool — two bridges under one symbol.
Pattern ≠ identity; the grouping key should include the denom. Queued.

## Rev T5.3 — 2026-08-20 — epoch-band history: 16 epochs backfilled (Active Pools, TLA TVL)

The band popups said "more history will appear as epochs are tracked" over a
two-point (prev+current) design — no store existed. Now one does:
epoch-band-history.json, derived from the snapshot matrices
(pool-status-history active+staked_usd per pool per epoch, E184–199) with
BAND-IDENTICAL semantics, gated against the live tile at E199: 28 pools
(A20+S8) and $1.83M match exactly. The history modal seeds Active Pools
(all/Astro/SS splits) and TLA TVL from it; the live prev/current pair stays
authoritative for the newest epochs. Honest exclusions, stated in the
product: APR averages (the matrix apr basis reads 323% where the band
computes 47% — a confident wrong number stays unshipped), Epoch
Rewards/Bribes (different sources; booked), and LUNA price beyond
network-and-prices' 15-day retention (2 of 16 rows; older show --,
deeper price history booked).

## Rev T5.2 — 2026-08-20 — the missing site-footer include (footer consistency root cause)

tla-stats never loaded /lib/site-footer.js — every other unified page did —
so it fell through to its LOCAL fallback health logic, whose divergent "Cron
stale" label could disagree with the transparency hub even when the shared
registry read healthy (owner screenshot: red footer, hub at 100%). One
script include; one implementation everywhere, as T3.12 intended.

## Rev T5.1 — 2026-08-20 — Bribe Runway rehomed as the Runway tile's second tab

The standalone Bribe Runway card broke the Overview grid (tall orphan column
— owner screenshot). Removed; the Unlock Runway tile is now "Runway" with two
pills — Unlocks (default) and Bribes — and the bribe view restyled to the
tile's visual language: left column = epochs-of-funding-left bars (red bar =
this epoch's cliff, hover lists the pools), right column = soonest-to-empty
list with amounts, funders, and the last-epoch warning banner. Headline and
title swap with the tab. Same product, same warnings, layout that belongs.

## Rev T5 — 2026-08-20 — canonical VP everywhere; Bribe Runway tile; pending-withdrawal board

- **38 stale VP reads migrated across three pages** (tla-stats 22,
  member-portfolio 12, index 4): SPEC-vp-definition-fix (2026-07-13) retired
  `display_voting_power_human` in the positions product, but the readers were
  never migrated — Voting Leaders showed "No data.", the portfolio landing
  showed "0 VP live". All reads now use canonical `voting_power_human`
  (total = boost + fixed). Producer was correct; readers caught up.
- **Bribe Runway tile (Overview)** — surfaces the already-shipped
  `tla-voting/bribe-state/runway.json` product: per-pool epochs-left with
  last-epoch red flags, remaining amounts by denom, funders (attribution only
  where event streams matched — otherwise short address), and the depositor
  warning the tile exists for: when a pot empties, Votion re-optimizes away.
  First live reading: 5 pots on their last funded epoch.
- **Pending-withdrawal board under Unlock Runway** — locks whose end_period
  passed but were never redeemed (unlocked capital that hasn't come home;
  already out of the VP race, so a withdrawal here is old news, not new exit
  pressure). Live: 48 locks, 7.5K ampLUNA + 1.2K bLUNA + 1.2K arbLUNA + 1.1K
  LUNA. Chain-validated same-day: test locks #1317/#1318 withdrew this
  morning and age out at the next hourly capture; #1319 stands as the
  permanent pending fixture.
- Gate-caught polish: runway denom keys carry the `cw20:` prefix, lp-grades
  token denoms don't — symbol match now strips the prefix (CAPA renders as
  CAPA, not a raw address).

## Rev T4.1 — 2026-08-20 — Overview VP donut restored (both slices, one root cause)

The TLA Total VP donut had collapsed to a single gray "Other 100%" ring. Two
slices, one diagnosis:

- **aDAO slice**: read the SAME dead field the aDAO Vote column did
  (`treasury.summary.display_voting_power_human`, nulled when the positions
  product changed) — both broke together. Now reads
  `voting.total_voting_power_human` with the old field as fallback.
  Verified: 841.5K.
- **Votion slice**: summed per-pool `votion_current_vp` fields the org
  snapshot never carried (the legacy per-pool votion data was method-tainted
  and deleted) — zero forever by construction. Now sourced from the org
  votion product: Σ vaults[].lock_vp_human, the chain-derived lock VP the
  Votion vaults control. Verified: 7.86M (28.2% of 27.89M total). Per-POOL
  votion remains honestly unknown until a per-pool vote capture ships.

## Rev T4 — 2026-08-20 — LP Stats & TLA Stats cleaned to current org data; dead tabs stripped

Full-pipeline audit (jsdom, every org fetch routed to a real tla-core checkout,
every table cell censused) found and fixed:

- **aDAO Vote column was zero on every pool** — `buildAdaoVotesIndex` read
  `treasury.summary.display_voting_power_human`, which is null on the treasury
  record; the live field is `voting.total_voting_power_human` (the same one the
  Vote Advisor uses). Verified fixed: stable pools now show 420.7K each —
  exactly the treasury's 841,486 VP × its real 50% allocations.
- **Votion Now / Δ Vote / Votion Next columns RETIRED (fail-honest).** They
  expected per-pool Votion vote fields no org product carries; the legacy
  per-pool votion data was the method-tainted website copy-paste already
  deleted by doctrine. Three headers, three row cells, three footer cells and
  their helpers removed, with an in-tab note; they return the day a
  trustworthy per-pool Votion vote capture ships (queued).
- **Efficiency column (TLA Stats) filled from the canonical source** — the
  epoch-avg join only covers charted Astroport pools; it now falls back to
  the lp-grades product's `util_weekly_ratio` (same semantic, computed for
  every windowed pool; no-third-copy). Remaining blanks are the honest floor:
  inactive pools + SS/singles where no trustworthy volume exists.
- **Dead weight stopped executing:** the retired rankings + dao tabs' HTML
  removed (13.9K chars, unreachable since 2026-07), their load-time render
  calls removed (this was the "PD Rankings: 0 pools" console line), the
  placeholder `computePoolScores` (support hardcoded 60) unwired, and the
  dead four-score flatten reader removed. The interleaved function bodies
  stay inert pending the dedicated dead-code strip pass (same rule as the
  star-map block — live helpers like `normalizePoolName` are woven through).

Audit after: every column in both tabs renders real values or an honest
blank with a stated reason; zero NaN/undefined cells; grades-tab regression
gate 17/17 unchanged.

## Rev G2 — 2026-08-19 — aDAO Vote Advisor + Bribe Planner + grading tooltips

Two decision tools land on the LP Grades tab, both DETERMINISTIC algorithms
over the published lp-grades product with every parameter in the public
rubric's new `advisor` block (config 0.2.0) — the rubric's answer, never
hidden opinion; council judgment decides.

- **aDAO Vote Advisor.** Reads the treasury's live allocation from the
  positions product (`voting.votes_per_bucket`, weight_bps) and shows, per
  bucket: how we vote NOW, what the rubric recommends, and the exact SHIFTS
  to get there — all in TLA's 10% chunks. The allocator assigns each chunk to
  the bucket pool with the highest marginal quality × underpaid score,
  recomputed after every chunk as our own assigned VP raises that pool's
  support, with a 50% diversification cap per pool (max_per_pool_bps —
  the first gate run recommended 100% all-in per bucket, mathematically
  honest but overstating the rubric's confidence; the cap is a public
  parameter, raise to 10000 to disable). Duplicate pool names across DEXes
  disambiguate with the venue — the advisor genuinely recommends the
  SkeletonSwap LUNA-USDC alongside the Astroport one.
- **Bribe Planner.** Preset $25/$50/$75/$100 or a custom budget: greedy
  placement by need score with diminishing pull as a pool's planned pot
  grows — big budgets naturally split (max 4 pools), small ones concentrate;
  sub-$25 placements merge upward instead of dust-splitting. Each placement
  carries its why (no existing pot / N× bucket-median liquidity per vote /
  threshold defense). Gate verified budget conservation at every preset plus
  a custom $240.
- **Grading tooltips everywhere.** Lens pills carry their lens description;
  every grade letter explains itself (quality = A × B with the live rubric's
  weights, version, and letter boundaries); both advisor panels carry ℹ
  tooltips stating their exact algorithm and parameters.

Gate (jsdom, real product 1.0.1 + real treasury votes): 18/18 — recommended
weights are exact 10% chunks summing 100% per bucket, shifts net to zero,
every budget conserves to the dollar.

## Rev G1 — 2026-08-19 — LP Grades tab reads the org lp-grades product; page-side grading retired

The interim page-side grade computation (~200 lines inside `renderLpGrades()`)
is GONE. The tab now renders `lp-grades/snapshots/current.json` — computed by
the org lp-grades cron on epoch-aligned trailing windows of COMPLETED epochs,
per the public rubric in `tla-core/docs/curated/grading_config.json`
(SPEC-lp-grading.md). Weights shown in the UI come from the product's rubric
echo, so a config edit changes both the scores AND the labels with zero page
work.

What the tab gains:
- **Lenses from the product** — Best for the chain (default), Needs votes,
  Underdogs, Chain builders, Trader's choice, Active projects, New pools,
  Bribe targets, At risk, Healthy to enter (depositor framing), plus a local
  Inactive board (44 pools carrying last-known grades as a safety signal).
- **Confidence tiers per row** (firm / provisional / low sample) straight from
  the cron's sample gates — a thin window is never presented as a firm grade.
- **Component B is finally in the grade** — price-oracle durability,
  acquisition friction, asset-class rubric, and take-rate contribution to
  chain-owned liquidity (per-asset breakdown in the detail expander).
- **Bucket-aware support gap** — the C overlay compares liquidity-per-vote
  against the pool's own bucket median, not a global one.

Also: `lib/cron-registry.js` gains the `lp-grades` row (daily,
org-lp-grades), so system-health and every footer now track the new product;
the grades tab's `data-cron-source` moved from tla-snapshot to lp-grades.

Gate (jsdom, real live product as fixture): 11/11 — row counts match product
counts per lens, rubric version renders in the chip, confidence chips render,
unavailable-state message honest when the product is missing.

## Rev T3.12 — 2026-08-19 — footer unified with index; local health modal removed

The Cron Health modal is gone. Every page links to the transparency hub for
health, so there is ONE place to look and one implementation to maintain.
`CRON_REGISTRY` derives from `lib/cron-registry.js`; the footer now matches
index exactly (socials, links, Rev + Changelog, System Health dot, Alliance
Contact).

Two bugs found while doing it:
- **"never" timestamps.** This page's fetcher read only a FLAT `capturedAt`, so
  dao-dashboard and system-health (which carry `meta.generated_at`) rendered
  "never" despite being fresh. It now honours the registry's `tsPath`.
- **Everything red.** Its cadences still said weekly/daily for jobs that had
  moved hourly, so healthy jobs rendered stale.

## Rev T3.9 — 2026-08-11 — every legacy source repointed to org (15 refs → 0)

CONFIG + health tiles fully org. Drop-in swaps: docs, known-tokens base,
NFT/marketplace heartbeats. **Four shape adapters** where org differs (a blind
repoint would have fed the page unparseable data):
- bribes: month file is a LIST of harvests → take the latest, expose
  `.active_bribes` (its buckets are byte-identical to the legacy entries)
- pd-bribes: chain placements → the legacy epoch-window shape
  `buildBribesIndex()` consumes; only real fields mapped, nothing invented
- known tokens: org token-catalog keys BY ADDRESS → flattened to the
  `{cw20:addr → NAME}` map the page expects
- allies: retired cron → participants `.members` exposed as `.allies`
- votion: one canonical `snapshots/current.json` replaces the per-epoch files
  and their epoch-boundary 404 fallback dance

**Two sources RETIRED rather than migrated** (per the trust rule): the FUEL
index (no org series — FUEL falls back to the pool-derived price in
network-and-prices) and `tla_ext_historical_*` (hand-corrected
`staging_4day_corrected` with missing=zero volume). Both are `null` with
guarded fetches.

⚠ **Known empty sections until 23:xx UTC daily:** "Is TLA Liquidity Growing?"
and "Pool Health & Exit Risk" both need `pool-status-history.json`, and the
APR views need `apr-history.json`. Those rollups were folded into
org-member-data and only run after the daily archive is written — the panels
say so honestly rather than rendering fake trends. They populate on the first
23:xx run and need two epochs of history for trends.

## Rev T3.4 — 2026-08-10 — DEX reader repoint to org trees (strip step 2)

Data-layer only (CONFIG + fetch URL surface; rendering untouched). All four
dex bases now read tla-core: astroportEpochBaseUrl → dex-data/astroport/
epochs; ssWeeklyAvgBaseUrl → dex-data/skeletonswap/weekly-avg (CANONICAL
labels — the legacy +1 mislabel meant this page was silently showing
week-stale SS epoch averages; the 2026-08-10 relabel + this repoint fix the
display with zero selection-logic changes, since lastCompleteEpoch was
already canonical); astroportDailyBaseUrl → astroport/daily-csv;
ssDailyBaseUrl → skeletonswap/daily-csv (flat dated files —
ssMonthBackupFolder helper removed with its builder line). Health sourceUrls
+ astro fallbackFn → org heartbeats/epochs. Stale May-2026 comments updated
(coverage caveats; SS-frozen note — the freeze is FIXED, SS re-enable in the
bucket chart queued as a separate rendering decision). Gate: zero
legacy-dex-repo refs site-wide; every constructed URL fetched 200 live
(astro dailies pre-08-09 pending the astro-daily-bank one-off).
tla-stats-legacy.html RETIRED in the same round: zero inbound links
site-wide (grep-proven), the data-layer transform it existed to reference is
long-proven — pages-define-need says remnant. Footer-rev note: this page's
footer AUTO-DERIVES from this log's top `## Rev TX.Y — date` header (static
span is only the pre-JS default) — entries MUST use that header format or
the footer silently shows the previous rev (which is how the 08-10 entry
briefly displayed T3.3).

## 2026-08-09 — Org cutover: pricing feed + asset self-hosting (data layer only)

Same two migrations as index (see index-log 2026-08-09): 2 pricing URL swaps →
tla-core/network-and-prices; asset URLs → /assets/.... Rendering code
untouched. NOTE for next session: epoch/weekly/rolling reads still point at
astroport-pool-data_2026 / ss-pool-data_2026 — the dex reader-repoint (to
tla-core dex-data/astroport/epochs etc.) is queued behind the SS fold; legacy
dex crons stay running until then (repoint → suspend → archive law).
This is the change history for `tla-stats.html` (the Terra Liquidity Alliance public dashboard).
Newest revisions on top. Times are UTC.

---

## Rev T3.3 — 2026-08-03 — liveness pass · arb radar · flip-day hardening (T2.7d–T2.8c)

**T2.7d** — zap-out dollars-lost under every target cell at the exact
fraction zapped; simulator card auto-opens in member mode (wallet selected
= the planner is the workflow), TLA-wide keeps the 08-02 collapsed
default, manual toggle wins.

**T2.8/T2.8b/T2.8c — ARB RADAR (embedded strip)**: cross-pool price
divergences from the hourly snapshot, xyk-only (concentrated/stable hold
imbalanced reserves BY DESIGN — including them manufactures fake arbs);
same-pair comparison cancels catalog prices entirely, so spreads are raw
reserve truth. Optimal size + net profit from the exact xyk optimum after
0.3%×2 fees. Quiet state shows the largest sub-threshold gap ("efficient"
is a reading). Strip lives OUTSIDE the collapse and SELF-ARMS on DOM
ready (retries until snapshot pools exist) — the initial render chain has
unguarded upstream renderers whose exceptions silently killed downstream
hooks (observed live). The self-arming retry surfaced the real bug: `esc`
undefined in this page's scope (ported from slippage.html which defines
its own) — ×24 in console; renderArbStrip is now self-contained. First
live catch: ampROAR-ROAR (Skeleton) vs an unlisted pool, 13.92% apart —
and the honest lesson shipped with it: persistent visible spreads usually
mean a catch (unlisted/paused/stale pool); verify on-chain first.

**Votion epoch-boundary fallback** — same pattern as the (already-live)
astroport one: on flip day the roller hasn't birthed epoch-N.json yet;
the page now falls back to N−1 (observed live e197: votion 404 → boards
empty until tonight's run; astro fallback was working as designed).
Full-simulator radar (slippage.html): same math, always-visible quiet
state, live-gated (26 xyk pools, hot/exclusion replays).

## Rev T3.2 — 2026-08-03 — PD split epoch-flip fix (T2.7) + zap-in multiplier mode (T2.7b)

**T2.7b — Zap planner grow-to-N× (the owner's spec):** Zap-in gains a preset
row (1.25× · 1.5× · 1.75× · 2× · 3× · 4× · 5×, plus "$" returning to the
fixed-amount mode). In multiplier mode each HELD pool shows the dollar add
needed to reach the target multiple ((N−1) × current position, +$ shown per
row) and the routing impact grade computed at exactly that size, using the
selected source asset (LUNA/USDC/SOLID/any listed). Pools the wallet
doesn't hold are excluded — multiplying an empty position is meaningless.
Positions under $1 skipped.

**T2.7c — dollar cost on zap-in rows (the owner's spec):** every zap-in and
multiplier row now shows the estimated dollars lost to price impact at
that exact size next to the % grade ("~$9.30 lost"), same math as the
full simulator's lost figure — the % finally answers "is it worth it?"
Fixed-$ mode uses the selected amount; multiplier mode uses that pool's
computed add.

**QUEUED — full-simulator rework (SPEC-simulator-v2, next site batch):**
bring the member-aware planner features into the standalone simulator:
wallet selector (positions-first ordering + exit costs like the embedded
card), zap in/out modes with source-asset choice, the grow-to-N×
multiplier row, and per-row dollars-lost. The simulator keeps its
strengths (token picker, size slider, depth bars, crown ranking) and
gains the planner's position awareness — one tool instead of two
half-tools.


Live flip-day failure (e196→e197, morning of 2026-08-03): the epoch popup's
PD column fell to $0.00 with the stale legacy note, while PD's per-epoch
LUNA sat visibly in "Other" ($87.63 on LUNA-ampLUNA = 2,121 LUNA × $0.0413).
Root cause was N/N+1: the popup renders the incentive manager's active set —
the DISTRIBUTING epoch's frozen bribes (N tallies during N, pays during
N+1) — while the org-product split keyed by the RUNNING epoch. Every flip
morning the two disagree by one. Fix: prefer `by_epoch[epNow]`, fall back
to the distributing epoch `epNow−1`; once a PD range truly ends, neither
slot exists and a corrected honest note engages (the old note falsely
blamed missing attribution when the product was loaded and simply not
covering the epoch). Replayed against the real product: flip-day resolves
to e196 (11 pools, 9,538.8 LUNA); post-range e198 correctly falls to the
note. pd-bribes derive itself verified healthy (v1.2.0, 20 placements, 0
unmatched, 427,877 LUNA chain truth).

## Rev T3.1 — 2026-08-03 (live-page touch: badge fix + Unlock Runway)

Two changes to the LIVE `tla-stats.html` (base byte-verified == the promoted
T3 build). Gate: the full T3 suite re-run on the edited file + new
assertions — **104/104**.

- **"TEST T3" staging badge removed** — promotion leftover.
- **Unlock Runway card** (the owner's exit-pressure request), between the
  leader boards and the vote waterfall: VP scheduled to unlock over the next
  8 weeks from non-auto-max locks across the tracked electorate. Headline =
  ≤4-epoch VP total + share of tracked VP; 8 week-bucket bars (weeks 1–4
  highlighted) with per-week lock counts + asset amounts in the hover;
  "largest upcoming unlocks" list (name/wallet, lock id, amount, VP, weeks,
  ≤2w in red). Honesty: tracked-electorate coverage stated; auto-max locks
  never unlock and are excluded by definition; healthy-empty state when
  nothing is inside the window. Someone letting a lock run out is often
  pulling LUNA — this is the early tell, and pairs with the Pool Health
  member flows view for the "same wallet also unwinding LP" check.

## Rev T3 (test.html staging) — 2026-08-03

Lower-half rebuild (the owner's six review items, 2026-08-02), staged cumulatively
on `/test.html` on top of T2.6, pending live review + promotion. One file.

- **Pool Health reorganized:** every row now carries a **DEX tag** (Astro blue /
  Skeleton orange — waterfall color convention; the two LUNA-USDC rows are
  finally distinguishable), in TLA-wide AND member mode. **Chip diet**: rows keep
  name · DEX · bucket · status · runway only; funder-class + "+unattributed"
  moved to the runway chip's hover text and the drill (where the full
  who's-paying panel already lives); skew chips only surface for the
  possible-depeg case. Column header row is now **sticky**; bucket headers carry
  a **windowed net-flow** figure (follows the 4/8/12 toggle).
- **Waterfall shift view (Planned):** each bar shows a **ghost dashed outline at
  its locked-in size** with a green/red **hatched region for the change** — the
  current→planned move is finally visible, not inferred. Shift label = TOTAL
  projected−locked (+N/+%), decomposed in the tooltip as **cast-vote drift**
  (live votes vs the boundary snapshot) **+ Votion planned** (optimizer target vs
  current placement) — an identity, both terms measured. New bucket-level
  **shift summary** line: net bucket shift + top-3 movers + encoding legend.
  Honesty note when a member is selected: member/aDAO per-pool lock-in baselines
  aren't captured yet, so their shifts aren't decomposed (boundary-snapshot
  rider queued).
- **ampCAPA gov false-"withdrawn" fixed:** when a member stakes their ampCAPA
  position's receipt (ampLP) into the ampCAPA governance DAO, the receipt leaves
  the wallet and the exit logic read it as withdrawn. Now: one live per-wallet
  LCD read of the DAODAO voting module (contracts + conversion chain lifted from
  `ampcapa-tool.html`: balance × ve3 rate = ampCAPA, priced via the hub-ratio
  feed), cached per session. **Re-attribution only fires on a chain-confirmed
  balance** — LCD down or zero balance changes nothing. The row renders a purple
  **"staked in ampCAPA Gov · still TLA"** chip instead of the exit chip.
- **"Is TLA Growing" v2:** per-epoch **real-flow bars** under the index lines
  (the E188 event is now one visible red bar, hover for amounts) · window toggle
  4/8/all · **two-force cards**: LUNA-family net (mostly auto-compounding) vs
  everything-else net (real LP deposits/withdrawals) · **Base retained %** gauge
  (real base now ÷ window start).
- **Zap planner (member mode, inside the simulator card):** per-position
  **zap-out** costs at 25/50/75/100% to LUNA / USDC / SOLID (+ any other target
  via dropdown), and a **zap-in** mode (source asset + the card's $ amount, your
  pools starred first). Routing = best of direct pool or two-hop via LUNA from
  live reserves, winning route named on hover; withdrawals shrink the exited
  pool before any same-pool swap; unroutable legs say **"no TLA route"** rather
  than guessing (e.g. xASTRO has no TLA pair). ≤ convention kept for
  concentrated/stable legs. Simulator card itself now **collapsed by default**
  (tap-to-open header, full-sim link stays live).
- **Footer refresh:** four-paragraph disclaimer block → one line + expander;
  credits link re-pointed to `thealliancedao/tla-core` (the actual data home);
  **PD Watch** slot added (dim, "soon" — the data product behind it is live).

**Gate: 99/99 green** (jsdom, real committed fixtures, fixture-derived expected
values in specific cells; member flows exercised with the DeFi_Patriot
acceptance wallet). Honesty note: the T2.6 98-assertion suite was session-local
and lost with that sandbox — this suite **reconstructs** the same surface
coverage and extends it with T3; extend-never-reset resumes from here.
**Live-verify on review:** the ampCAPA leg runs against a stubbed LCD in the
gate (sandbox can't reach publicnode) — select an affected wallet on the live
page to confirm the chain read end-to-end. Note the epoch flipped 196→197 at
2026-08-03T00:00Z, so day-1 fallbacks (astroport epoch file, SS weekly) are
engaged during review.

---

## Rev T1–T2.6 (test.html staging) — 2026-08-02

Staged on `/test.html` (98-assertion gate), pending promotion to
`tla-stats.html` after live review. One cumulative file.

- **Hero band v2:** merged Active Pools tile (+Astro/SS sub), new TLA TVL tile
  wired to the history/trend system, epoch sparklines, status pills
  (bold rounded green/red), uniform label/value/sub/pill rhythm, whole-tile
  drills into per-metric epoch history, movers diverging bars, stale-VP and
  take-rate mini bars, freshness chips.
- **Boards:** volume All/Astro/SS toggle (recomputed within DEX), APR Amp/Non
  toggle, utilization tiebreak by smallest stale gap, expand/collapse on all six
  boards + the three Pool-Tops tiles.
- **Bribers card, three modes:** Bribers (all-time providers) · **Earned** (NEW —
  all-time claimed per wallet, valued at claim date, lower bound per rollup
  claim coverage) · **Pending** (this epoch, now computed live per member as
  vote-share × pots — the broken positions-cron field is no longer consumed).
- **Labels:** DAODAO handles bold sky-blue, protocol labels bold orange,
  addresses gray mono; Astroport take-rate buckets named; briber rows clickable
  → deep-dive modal (epoch chart now counts governance/null-pool events).
- **PD split re-homed:** epoch-bribes popup reads the org `pd-bribes` product
  (proposal-state derive, 20/20 chain-verified placements) keyed by gauge id;
  the stale hand-file path is dead; PD's By-pool drill filled from the product.
- Data-side same day: rollup rebuild (32 bribers, PD #1 @ 427.9K LUNA), FUEL
  placement pricing, token-catalog forward-append fix.

---

## Rev 6.1 — 2026-07-31

- **APR truth, finally:** the reward-APR column and drill were showing "—"/wrong
  because the figure never lived on `store.pools` (slim vote-pools by design) —
  it lives on `store.tlaPools.apr_non_amp`. `_aprOf` repointed; real percentages
  render everywhere. Added a **next-epoch APR estimate** line (current × committed
  vote shift vs last payout; gauge drift ignored — labeled estimate).
- **APR convention honesty:** our figure = emissions ÷ TLA-staked $ (yield on
  TLA-staked capital) and intentionally reads HIGHER than Eris's per-depth+fees
  display — every APR tooltip now says so explicitly. Full evidence + fixture
  tables in tla-core `SPEC-lp-apr §7`; the permanent fix ("eris apr" session)
  extracts Eris's own formula from their frontend bundle server-side.
- **Column header row** over the Pool Health data (pool · staked trend · reward
  APR · bribe runway · votes·shift · net flow · staked in TLA).
- **3-layer VOTE SHIFT breakdown** (vote column click → drill): 1·casted
  (on-chain vs last payout) · 2·Votion planned (optimizer target vs now) ·
  3·total projected — definitions in hovers, "no baseline" stated honestly.
- **Votion intention overlay:** violet "Votion plans +X%/entry" sub-line where
  the chain is quiet; PLANNED sentence in every planning pool's tooltip;
  VOTION'S PLAN drill panel (current→planned VP, NEW/EXIT, deadline, lockup
  coverage, "intention, not yet on chain"). Committed always outranks planned.
- **Staked in TLA ±%** vs last epoch under the value; shift colors full-strength;
  2-column drill layout (narrative left, numbers+charts right); drill chart
  labels beside the chart (overlap bug fixed).

## Rev 6.0 — 2026-07-30

- **Bribe runway chips** on every Pool Health row from the new hourly pot-probe
  feed (`tla-voting/bribe-state/runway.json`): funded-through epoch + epochs
  left, thresholds ≤1 red · 2–4 amber · 5+ green; runway column colored and
  click-to-drill.
- **Funder-class tags from evidence only** (attributed on-chain placements):
  PD bribed / Project bribed / DEX support / User bribed, plus "+unattributed"
  wherever pots hold money no captured event explains. The "auto-bribed weekly"
  pattern-guess is retired. Drill gains **WHO'S PAYING THE BRIBES** (funder ·
  class · tokens · thru-epoch).
- **Pool Health v2→v3 rebuild:** ALL pools per bucket; sort toolbar with
  explanatory tooltips (TLA staked / inflows / outflows / trend Δ% / reward APR /
  bribe runway / risk first); **4/8/12-epoch window** driving charts, trend
  labels, net-flow column and sorts; row mid-chart in the former dead space;
  generated plain-English **verdict sentence** per drill; per-epoch flow bars;
  vote-power history; composition preface + visible "what's inside" toggle;
  dot-color meanings in tooltips.
- **Top Bribers coverage banner:** "a preview, not the full picture" — names the
  absent payers (Solid current wallet, PD, hole-era individuals), ties them to
  the runway chips, states the archive backfill as the fix. Tribute tooltip now
  says these contracts ARE the Astroport take-rate bribe flow.

## Rev 5.5 — 2026-07-21

- **Votion card now fully live end-to-end:** the cron-side discovery fix
  (votion-positions v1.1.0, cron-scripts repo) shipped and its first
  production run surfaced 18 holders (was 2) with real vault TVL $35,105.
  DeFi_Patriot's two MAX positions verified in the published feed to the
  Eris fixture (1,225.5 ampLUNA / 4,363.9 arbLUNA — drift = vault
  auto-compounding). No page changes were needed: the Rev 5.4 card + honesty
  guard render the corrected feed as designed (coverage chip shows the
  measured %, e.g. arbLUNA-MAX 3.5% — the rest is non-community whales).

## Rev 5.4 — 2026-07-20

- **member-portfolio.html: Votion Positions LIVE.** The "not captured yet"
  explainer was outdated — the votion-positions feed already publishes
  per-holder rows (schema 1: vtoken balance, underlying LST, USD,
  share-of-vault %, implied VP). Card now renders the viewed address's
  positions across all vaults, sorted by USD, with a totals line
  (Σ USD · Σ implied VP) and capture date. Implied VP stays in the card —
  NOT merged into the VP tile (that splice waits for the daily archive per
  SPEC-portfolio-tracker step 1). Empty state is honest and contextual:
  "No Votion positions for this address · N vaults · $TVL · captured DATE".
  Portfolio-value tile subtitle ("excludes Votion & NFTs") unchanged — still true.
- **Discovery honesty guard (same commit):** the card immediately exposed an
  UPSTREAM defect — the feed's discovered holders cover only ~2.5% of vtoken
  supply (147K arbLUNA-MAX vtokens, 0.6% seen) while every vault claims
  holder_discovery_complete:true. The page now computes found-balance vs
  supply coverage: below 90%, the empty state says "no position FOUND —
  discovery sees only X% of vault tokens, absence isn't proof of absence,"
  and populated views carry a "discovery N%" chip. Cron-side discovery fix
  queued (votion-positions source needed next session).

## Rev 5.3 — 2026-07-20 (GO-LIVE)

- **Promotion:** test.html → **tla-stats.html** (its nav was already built
  with data-page="tla-stats"); test2.html → **member-portfolio.html** (new
  canonical URL). All cross-links repointed (0 test/test2 refs remain).
  Prior tla-stats.html preserved verbatim as **tla-stats-legacy.html**
  (holds the Epoch Bribes all-time deep-dive pending its re-home).
- **Volume root cause CLOSED:** the new stats page has its OWN epoch fetch
  and lacked the boundary fallback — that's why the tile stayed blank after
  Rev 5.1 patched only the legacy page. Fallback now applied here too.
- **Analytics:** Vercel Web Analytics page views were already site-wide on
  every page; added CUSTOM EVENTS — board_expand (per board),
  bribe_board_mode (toggle), portfolio_view / portfolio_save. Events
  surface on Vercel Pro; no-op harmlessly on Hobby.
- After committing: test.html / test2.html can be deleted or kept as
  staging copies — nothing links to them anymore.

## Rev 5.2 — 2026-07-20

- test.html: `boardExpander` now reveals in CHUNKS — top 5, then +10 per
  click with a hidden-count on the button and "collapse to top 5" at the
  bottom (boards run 200+ deep; all-at-once was a wall). Top Bribers
  all-time board unified onto the shared expander (custom one removed).
- test2.html (Member Portfolio): VP rank now carries its scope — "of aDAO +
  allies" with a tooltip pointing at the TLA-wide Voting Leaders board.
  Resolves the "#1 here, #4 there" confusion: the participants feed ranks
  aDAO members + registered allies only; both numbers are correct.
- tla-stats volume: no page change needed — the epoch-boundary fallback
  (Rev 5.1) is committed and the page's epoch table resolves 195 → falls
  back to the live epoch-194 file; "still blank" = stale deploy/browser
  cache, and the roller writes epoch-195.json nightly at ~23:50 UTC.

## Rev 5 — 2026-07-18

Top Bribers board REBUILT and committed (the Rev 4 files never reached the
repo — rebuilt from the Rev 4 spec against the current pages, verified
against the live schema-6 rollup in a Node DOM harness before delivery).

### test.html
- **All leaderboards now expand past top 5 (same commit):** shared
  `boardExpander` — every board (Voting Leaders, Utilization, Recently
  Adjusted, OG Board, Newcomers, Bribe Earners; Top Bribers already had it)
  renders top 5 with a "show all N" toggle revealing the full depth.
- **OG Board / Newcomers tiebreak (same commit):** first_participation is
  period-granular, so the whole Day One crowd tied at period 96. Same-period
  ordering now tiebreaks by the wallet's smallest held lock token id (lock
  ids mint sequentially → earliest surviving lock = join order), shown in
  the sub line as "lock #N"; VP remains the final fallback. Newcomers sorts
  symmetrically (largest min lock id first). Upgrade path noted in-code:
  rollups voters carry exact `first_lock_ts` when non-null.
- Bribe Earners card → **"Top Bribers"** by default: all-time bribe providers
  from `tla-core/tla-voting/events/rollups.json` (schema 6), top 5 +
  show-all expander, personRow visual language, registry-first naming
  (roster displayName + walletBadges → rollup `label` in purple → short
  address). Old pending-rewards view preserved behind the **Earners** toggle.
- **Banner is now MEASURED, not worded** (supersedes Rev 4's "board banner
  states the direct-only universe" and the planned "contract-initiated
  bribes" rewording): it renders live from the rollup — briber count,
  attributed-event count since first bribe, and the bribe_ledger's
  attributed share of lifetime LUNA flow (currently 1.0%; jumps
  automatically when the rollup rebuilds over the v6.1 + FCD-re-derived
  events). Tooltip states the honest rule: unattributed flow is counted in
  the ledger but never merged into any briber's row.
- Unpriced honesty: no historical price record → "unpriced" chip with
  chain-exact counts; USD at placement primary, at-build value on hover.

### tla-stats.html
- Epoch Bribes modal gains **"All-Time Top Bribers"**: sortable
  (at placement / today value / most active), per-briber `<details>` rows
  expanding to by-token and by-pool breakdowns (pool names resolved via
  `gauge_pool_id` against store.pools, short-key fallback). Fully
  self-contained (own fetch/cache/naming) for re-homing into the
  restructured Rankings tab.

### Timing notes (data-layer, recorded in tla-core CHANGES_PENDING 07-18)
- The deployed rollup predates today's data work: labels show as addresses
  and the FCD-recovered bribers are absent until the next rollups rebuild
  (Sunday self-heal or manual reconcile) — the pages need no change when it
  lands; the board and banner update themselves.
- PD's two known governance-bribe txs sit inside capture gaps (prop 247
  pre-forward-capture; prop 250 in the 21.81M–21.91M prune window), so PD
  appears on the board after the gap backfill or its next bribe — the
  amounts are already in the state ledger and therefore in the banner's
  unattributed share. Honest by construction.

## Rev 4 — 2026-07-17

Top Bribers board — first UI consumer of the tla-voting rollups **schema 6**
briber leaderboard (SPEC-tla-voting-briber-board, tla-core).

### test.html (primary surface — Community leaderboards)
- The **Bribe Earners card is now "Top Bribers" by default**: all-time direct
  bribers from the live schema-6 `rollups.json`, top 5 with a show-all
  expander, in the same personRow visual language as OG Board / Newcomers.
- **Naming rule (settled):** registry-first and uniform — every aDAO/ally
  member resolves via `displayName` + `walletBadges` identically; curated
  protocol labels (rollup `label`) in purple second; short address last.
  Nothing hardcoded in the page.
- **Unpriced honesty:** bribers whose tokens have no historical price record
  (WHALE-era LSTs, early CAPA) show "unpriced" with an explanatory tooltip —
  amounts are chain-exact, USD is never guessed. Priced rows show USD at
  placement; today-value on hover.
- The previous pending-rewards view is preserved behind an **All-time /
  Earners toggle** in the card header (it answers a different question).

### tla-stats.html (legacy page — optional commit)
- The Epoch Bribes modal gained an "All-Time Top Bribers" deep-dive section:
  sortable (at placement / today value / most active), expandable per-pool
  rows with per-token USD, same naming + unpriced rules. Redundant once the
  test-page restructure ships; kept self-contained for easy re-homing.

### Data notes surfaced by this work (recorded in tla-core CHANGES_PENDING)
- Phoenix Directive bribes via **DAO governance execution** (contract-initiated
  add_bribe) — invisible to the current direct-event capture; fixture tx
  recorded for build #3. The board banner states the direct-only universe.
- Confirmed protocol briber: Lion DAO (`terra1ksk66l…z8ru04`) → wallets.json.

## Rev 3 — 2026-05-30

Today's session. A long multi-part day on `tla-stats.html`: bribe/member tile work, the Overview leaderboard-tile and ranking-popup rework, the Vote Breakdown waterfall rebuild, a major data-accuracy audit against on-chain Eris/Votion ground truth (the variant-collision class + concentrated-pool discovery), the Pool Health / Liquidity-Growth / Threshold panels, member-position earnings, and the comprehension pass. Each sub-revision below is one test-file iteration that was reviewed and edited, oldest first. All work is in the rendering layer unless noted; cron-side items are collected in `CRON-FIXES-BRIEF.md`.

### What changed

#### Rev 3.1 — Bribe token breakdown (new)
The Epoch Bribes modal now labels each pool's bribe with the paying token (LUNA, ASTRO, CAPA, FUEL, etc.). Single-token pools show the symbol inline; multi-token pools show the largest-USD token with a "+N more" expander that reveals the full per-token breakdown (humanized amount and USD value per token). Token amounts respect per-token decimals (e.g. wBTC = 8), and any bribe token that can't be priced is labeled "(unpriced)" rather than silently dropped.

#### Rev 3.2 — Member selector now activity-filtered
The member dropdown is built live from the DAO DAO indexer roster (no manual list — new members auto-appear, names come from their PFPK profile). It now shows only members worth selecting: those with a name AND some TLA presence (an LP position, voting power, pending rewards/rebase/bribes, or an active lock). Named members with nothing to show and unnamed members (no PFPK profile) are hidden, trimming the list from the full roster to the active participants.

#### Rev 3.3 — Member status chip (new)
Selecting a member now shows a live status chip beside the dropdown: their total VP, total LP value, and a health dot — green (all their LPs are active), yellow (an LP sits in a pool at 1.0-1.5% of its bucket VP, i.e. near the 1% threshold), or red (any LP is inactive). A small legend button explains the colours. (The dot lives beside the dropdown rather than inside it because native select options can't be styled or coloured.)

#### Rev 3.4 — Member reward/bribe tiles relabeled + token breakdowns (new)
The member stat tiles now distinguish reward sources: "Member Epoch Rewards" -> "Member Deposit Rewards" (LP emissions, paid in zLUNA) and "Member Epoch Bribes" -> "Member Bribe Rewards" (vote-share estimate). Each tile has an expandable chevron that reveals the per-token breakdown — amount and USD per token — so it's clear what the rewards/bribes are actually paid in. Bribe tokens are resolved client-side through the same price resolver used for the pool bribes, fixing cases where the positions cron left IBC tokens (e.g. ASTRO) as a raw denom hash with a null USD value.

#### Rev 3.5 — Newcomer protection: per-pool risk flags + APR caveat (new)
The Pools tab now surfaces plain-language risk flags on each pool, aimed at people evaluating where to LP: "Near threshold" (active pool at 1.0-1.5% of bucket VP — may stop earning next epoch), "Thin liquidity" (pool depth < $25k — large trades move the price), and "Volatile reward (TOKEN)" (a bribe/reward token that moved >15% in 7 days). A note above the pool list explains that APRs are forward-looking estimates at current prices and emissions, lists the flags, and states this is not financial advice / do your own research. All derived from existing data (depth, bucket VP %, token price-change) — no new cron required. (Token-market liquidity isn't in the price feed, so the liquidity flag uses pool depth as a proxy.)

#### Rev 3.6 — Overview leaderboard tiles enriched (new)
The three Overview tiles now carry more context. The Liquidity tile gains a DEX TVL / TLA-staked toggle (DEX = total pool liquidity on the DEX; TLA-staked = the portion staked into the gauge that actually earns), each with its own rank movement and vs-prior delta. The APR tile now shows the drivers of an APR move inline — the pool's VP change vs last epoch and its current bribe total — so a reader can see whether APR shifted because of votes or bribes. Each tile's click-through popup is expanded into a "nerd-out" view: every row shows the full cross-metric breakdown (APR, VP + VP change, bribes with PD/Other split, DEX liquidity, TLA-staked, volume). Each tile's % delta measures its own metric's change (volume vs volume, etc.) — they are intentionally not the same number.

#### Rev 3.7 — Overview tiles: fixes + cleaner drivers
Fixed a variant-collision bug where a pool with two gauges in one bucket (e.g. LUNA-WBTC: an active ~7.7M-VP gauge plus a dead 18K-VP one) compared the active row against the wrong prior variant, producing absurd deltas like +41,884%. Prior VP/TLA-staked baselines now pick the largest (active) variant per pool name. Fixed the TLA-staked toggle showing "No liquidity data" (the field wasn't carried into store.pools). Removed the noisy "No Change" rank badge — movement now shows only when rank actually changed. APR-tile drivers reworked: voting power shown as votes with a green/red % change vs last epoch, plus Votion's projected current->next shift (purple/red), plus current bribe level. Bribe direction vs last epoch is intentionally NOT shown — per-epoch bribe history isn't captured yet, so a token-amount-vs-USD up/down arrow can't be derived honestly.

#### Rev 3.8 — Overview tiles: clean uniform rows + drivers moved to popup
Reworked per feedback. The variant-collision VP bug was actually upstream: store.poolHistoryByKey collapses two same-name|bucket gauges into one key and kept the dead variant, so even the "largest variant" fix read the wrong number. Now prior VP/staked baselines read the RAW poolStatusHistory.pools list (both variants) and keep the largest — LUNA-WBTC correctly reads +1.2%, not +41,884%. The three dashboard tiles are now structurally identical (rank · name · DEX · value · one delta) so they line up cleanly; all driver detail moved into the click-through popup. The popup now shows, per pool: APR change, votes change, TLA-staked change, Votion projected shift, and bribe level (with PD/Other split) — each colored green/red — plus a plain-language "why APR moved" line that names whether votes or staked-LP drove it (e.g. "APR down 67% — staked LP rose 40%: more LP spreads the same rewards thinner"). Bribe direction is still a level not an up/down arrow (no per-epoch bribe history yet).

#### Rev 3.9 — Overview tiles: TLA-staked field fix + honest APR comparisons
Root-caused the TLA-staked "No liquidity data" (and the bogus "staked LP fell 100%" in the popup): the votePools builder that feeds store.pools never set tla_staked (only a separate active_pools/buildTlaPool path did), so the field was always 0. Added tla_staked to votePools — the toggle now populates and the popup staked-change is real. Also removed the APR rank-movement badge and APR "% vs prev": the only prior-APR source (apr-history apr_pct_avg) is RAW and uncapped (values into the trillions of %), which is not comparable to the live capped amplified APR — comparing them produced meaningless arrows (e.g. LUNA-FUEL "▲1" when it was already #1, and LUNA-WBTC "−67%"). APR tile is now labeled "live snapshot · click for drivers". Volume tile labeled "(USD)" with a tooltip noting volume % can move on token price, not just trading activity. Popup "why" line reworked to describe live drivers (votes up → APR up; staked up → APR down) instead of an unreliable vs-prev APR %.

#### Rev 3.10 — Overview tiles: APR rank arrows restored + Eris reconciliation
Verified depth (DEX liquidity) and staked (TLA deposits) against the live Eris UI — both match within ~1-3% across all pools (the page faithfully reflects the cron). APR (apr_amp) matches Eris closely for most pools; a few (USDC-EURe, USDC-USDT, LUNA-ampLUNA) diverge because the cron's emissions-based approx_apr_pct over/under-estimates for those specific pools — a cron-side calc issue, not a page bug. Restored the APR rank-movement arrows: the prior baseline (buildAprBaselineIndex) already applies the same $20K-min filter, 200% cap, and amp factor as the live APR, so current-vs-prior rank is comparable; also capped the amplified baseline at 200% so a base pinned at the cap doesn't read as 210%. Known residual: a stale below-threshold gauge variant (e.g. an old LUNA-WBTC) can still inflate the PRIOR ranking because apr-history merges variants under one name — a clean fix needs the apr-history cron to key by gauge_pool_id, not name.

#### Rev 3.11 — Ranking popup redesigned: prior -> current -> change table
The expand popup was a confusing soup of current values with parenthetical percentages. Rebuilt each pool's detail as a clear mini-table: every metric (APR, Votes, TLA staked, DEX liq, Volume) shows Prev epoch -> Current -> Change in labeled columns, with the change colored green/red. Metrics without a reliable prior are explicit: Bribes shows current with a "level" tag (no per-epoch history yet), Votion shows current->next projection. Fixed the bogus tiny DEX/Vol values (e.g. LUNA-WBTC "DEX $53.56"): the popup was picking up a dead below-threshold gauge variant's depth — now it dedups to the highest-VP variant per pool name, so DEX/staked/APR reflect the real active pool (~$130K, matching Eris). Kept the plain-language driver line (votes up lifts APR, staked up dilutes it).

#### Rev 3.12 — Popup: bribe token amounts + Votion zero-sum note
Bribe rows now show the TOKEN AMOUNT alongside USD (e.g. "100,000 CAPA ≈ $153") so it's clear the token quantity is the fixed thing a briber committed and the $ is just its current valuation — addressing the confusion where the same token amount shows a different USD each epoch as price moves. Added two explainer notes to the detail: Votion reallocates a fixed vote pool (a gain on one pool is offset by losses on others — which is why the top-ranked pools can all show positive Votion shifts while the losers sit lower in the list), and bribes are a fixed token amount whose $ value moves with token price. Confirmed the Votion data is roughly zero-sum (22.36M -> 22.52M total) with real negatives (USDC-EURe -7%, LUNA-FUEL -1%) — they just weren't visible in the top-5 view.

#### Rev 3.13 — Overview tiles: move toggle inline for uniform tile heights
Moved the DEX/TLA liquidity toggle from a separate row under the liquidity tile's title into the title row itself (shortened to "DEX"/"TLA"), so all three overview tile headers are the same height and the pool rows line up across tiles. Confirmed LUNA-FUEL's $3.43 volume is real (source astroportDayVolumeUsd is $0/$0/$4.13) — a high-APR pool with near-zero DEX trading, so its yield is emissions/bribes not fees. Bribe "prev epoch" is correctly blank (no per-epoch bribe history captured yet).

#### Rev 3.14 — Vote Breakdown waterfall: cleaner labels + grouped inactive
Cleaned up the waterfall. Each pool's name label was rendering twice (once outside the bar on the left, once inside if wide enough) and overlapping — now it's a single label, placed inside the bar when it's wide enough (>12% of scale) or just to the right of the bar end otherwise. Inactive pools (the many tiny below-threshold slivers — e.g. 11 of them in the project bucket totaling just $453K vs $23.2M active) are now grouped into ONE striped "Inactive pools (N) · X VP" bar by default, collapsing project from 19 rows to 8 active + 1 grouped. Click the divider/bar to expand into individual inactive rows, click again to collapse. Bucket totals still include all pools.

#### Rev 3.15 — Waterfall: fixed label gutter + aligned plot area
Restructured every waterfall row into a fixed 150px name column on the left + a plot area to the right where the bar lives. Previously labels floated at each bar's position and scattered across the chart (right-side ones ran off the edge); now all names sit in a clean left gutter and every bar plots from a consistent left edge. The scale ruler (0 / 6.25M / ... / 25M), its tick marks, and the background grid lines are all left-padded by the same 150px so the axis lines up with the bars. The grouped inactive bar uses the same gutter layout. Bar sub-segment percentages are now relative to the plot area, not the whole row, so name length no longer shifts the bars.

#### Rev 3.16 — Waterfall: color scheme + planned-epoch deltas
Recolored per request. DEX text: Astro = dark blue, Skeleton = orange, Single = gray. Bar segments: Votion = green, aDAO = light blue, Other = gray, selected member = yellow (legends in both the totals row and footer updated to match). Fixed the inactive-VP label spilling outside the tile — labels near the right edge now flip to render on the left side of the bar instead of past its end. On the Epoch 188 (Planned) view, each pool now shows its projected vote change at the bar's end as "+N / +%" (green) or "-N / -%" (red) — replacing the bare up/down arrow — using votion_now -> votion_next; verified real positives and negatives in the data (e.g. LUNA-FUEL -25,180/-1%, USDC-SOLID +16,146/+1%).

#### Rev 3.17 — Waterfall: planned-delta label placement
First (left-most) bar shows its planned +/- vote delta AFTER the bar end; every following bar shows it BEFORE the bar (ending at the bar's left edge). The first bar starts at x=0 with no room before it, while later bars sit further right with empty space to their left — so this keeps every label inside the tile and reads cleanly, instead of trailing off the right edge.

#### Rev 3.18 — Waterfall: real locked-in vs planned baseline
The two epoch views now mean what they should. "Epoch N (Locked-in)" uses the votes as they stood at the epoch boundary — fetched from the daily snapshot captured just before epochStartedAt (~Sunday 23:40 UTC), which carries the full per-pool breakdown (total + Votion split). "Epoch N+1 (Planned)" uses live votes now with Votion's slice moved to its optimized target, so each bar total shifts by Votion's reallocation (live - votion_now + votion_next) — bars actually grow/shrink as Votion moves VP between pools, zero-sum across the bucket. New loadLockedInBaseline() fetches the boundary daily (walking back up to 3 days if missing), dedups to the largest-VP variant per pool name, stores store.lockedInByPool, and re-renders the waterfall when it lands (falls back to live if the fetch fails). getPoolVP/getVotionVP route totals + Votion through the active view. NOTE for later cron work: aDAO and member PRIOR (locked) positions aren't in the daily snapshot — only Votion + totals are — so attributing the lock->now total change to users vs aDAO vs members needs a cron that captures their per-pool VP at the boundary.

#### Rev 3.19 — Waterfall: fix locked-in double-count + amber inactive
Fixed the locked-in view inflating the Stable bucket to 43M (LUNA-USDC showing a false ~18M jump). Root cause: the locked-in map was keyed by pool NAME only, but LUNA-USDC trades on BOTH Astroport (20M) and Skeleton Swap (2.5M) as separate real pools — keying by name merged them and both live rows grabbed the 20M baseline, double-counting. Now keyed by name+DEX so each variant matches its own baseline; Stable locked-in total back to ~24.3M (matches the planned-view 24.59M within real week-over-week drift). Also recolored the grouped/expanded inactive section amber (was gray, blended with the Other segments) so it stands out as a distinct group.

#### Rev 3.20 — Waterfall: clamp duplicated Votion onto dead gauge variants
Fixed LUNA-arbLUNA showing a fat green Votion bar in the INACTIVE group bigger than the pool itself. The cron attaches the same Votion allocation (1.36M) to both the active gauge (2.0M VP, real) and a dead below-threshold gauge (29K VP) that share the pair name but have different gauge_pool_ids — so the dead variant inherited a Votion bar ~46x its own size. Display fix: a pool segment can never exceed its own total, so Votion is clamped to the pool VP (and aDAO to the remainder) in both renderRow and the bucket totals. The dead variant now shows its real ~29K with no oversized bar; the active pool is unaffected. Real fix remains cron-side: key Votion/aDAO attachment by gauge_pool_id, not pool name.

#### Rev 3.21 — Data audit vs Eris/Votion + two central variant safeguards
Audited every pool's VP against the live Eris vote UI. Finding: almost all pools sit at a uniform -10% to -15% vs Eris, which is just VP decay/timing between our hourly capture and the Eris view — NOT a bug. The real bugs were the OUTLIERS, all the same root class (a gauge variant leaking into the active set), now fixed CENTRALLY in store.pools instead of per-renderer:
- Safeguard 1 (name+dex+bucket): within each group only the largest-VP variant stays active; dead voted_but_below_threshold leftovers are demoted to inactive. Caught LUNA-WBTC (18.5K dead beside 7.78M real) and LUNA-arbLUNA (29K dead beside 2.0M real).
- Safeguard 2 (gauge_pool_id across buckets): the same gauge must live in one bucket; keep the largest-VP instance, demote the rest. Caught USDC-USDT and USDC-USDt, each split bluechip+single for one gauge (our 281K+2.0M = Eris's 2.28M exactly).
Both log a console.warn when they fire, so if naming/bucketing breaks in future cron data it is visible rather than silent. Demoted variants collapse into the inactive group everywhere (tiles, popup, waterfall) automatically. Real upstream fix remains: key cron history + Votion/aDAO attachment by gauge_pool_id.

#### Rev 3.22 — Fix: demoted variants inflating the inactive group in locked-in view
The inactive group showed implausibly large VP (e.g. bluechip locked-in inactive = 10.7M). Cause: the variant safeguards demote a dead gauge to inactive, but getPoolVP looked the locked-in baseline up by name+dex — and a demoted variant shares the REAL pool's name+dex, so it inherited the real pool's big locked VP (LUNA-WBTC 7.69M, USDC-USDT 1.99M) instead of its own tiny VP. Fixed: demoted variants (_demotedVariant) never pull the locked-in baseline or the optimized-Votion path — they use their own small live VP/Votion. Bluechip inactive locked-in now ~300K (real below-threshold VP) instead of 10.7M. Note: the earlier screenshots showing a huge green inactive bar were from the build before the central safeguard + Votion clamp landed.

#### Rev 3.23 — Fix: locked-in active/inactive split must reflect boundary status
Root of the persistent large inactive total in the LOCKED-IN view: the active/inactive split was always based on CURRENT status, but the locked-in view shows boundary VP. A pool active when votes locked but below threshold now was put in the inactive group, yet its getPoolVP returned its big boundary baseline — so a real multi-M locked position showed up as inactive. Fix: in the locked-in view, a pool is active if it had a boundary baseline (lockedInByPool has its name+dex key); demoted duplicate variants stay inactive regardless; the planned/live view still uses current is_active. Bluechip locked-in now splits 11 active (~26M) + 10 inactive (~166K real below-threshold) instead of dumping multi-M into inactive.

#### Rev 3.24 — Pool Health & Exit Risk: made legible
The panel showed an unlabeled orange/grey magnitude bar (size of exposure) and an unlabeled red sparkline (4-epoch trend) — neither read as anything to a viewer. Removed the meaningless magnitude bar entirely (the right-hand $ figure already conveys size). Each row now pairs the mini-chart with a plain-language trend label ("falling 4 epochs straight", "down 12% over 4 epochs", "steady"), and the per-epoch dollar flow is the labeled headline on the right ("−$8.3K / out this epoch"). Rewrote the panel description to plainly state what it shows, and added an inline legend explaining the dot colours (healthy / watch / high exit risk) and that the mini-chart is staked over 4 epochs. Applied the same de-clutter to the member-mode view (dropped its unlabeled bar; its Stake%/Value$/threshold chips already carry the detail).

#### Rev 3.25 — Remove per-card STALE-SOON badge (footer health check only)
The per-widget staleness badge (the amber STALE-SOON box + coloured outline drawn on each data card) was visual clutter on the Overview. Removed the CSS that rendered it. Cron freshness is now surfaced in ONE place — the footer cron-health popover (dot + Crons healthy / stale soon / stale), which reads the cron status directly and is unaffected. The data-stale attribute is still set on widgets but no longer renders anything; the underlying freshness logic is untouched.

#### Rev 3.26 — Pool Health: LP composition strip + IL sensitivity
Added a per-pool composition view to the Pool Health panel. For two-sided pools it shows a value-split bar (each side's USD value and %) plus each side's token-AMOUNT drift this epoch. Because constant-product pools auto-rebalance to ~50/50 by value, the value split alone is rarely a signal — the token-amount drift is, so a divergence reads out as e.g. "net selling INJ into the pool" and parallel moves as "LPs adding/pulling both sides". Auto-expanded on flagged pools (where pressure matters), one tap away on calm ones. Single-asset pools show nothing (no second side).
Added an impermanent-loss SENSITIVITY line (not realized IL — epoch-over-epoch IL here is ~0 and would be noise). It shows what IL the 50/50 pool would incur if the two tokens diverged 25% / 50% / 2x (e.g. 50% -> -2.0%), clearly hypothetical and educational, with a tooltip explaining IL and that fees/incentives offset it. Pegged pairs (stable/stable, LST/LST) instead show "IL risk: minimal — pegged pair" since their ratio shouldn't diverge by design.

#### Rev 3.27 — Composition: guard against bad LST price feeds (the 62/38 bug)
Caught by inspection: LUNA-arbLUNA showed a 62/38 USD value split, impossible for a constant-product pool (which holds ~equal USD value per side by construction). Root cause: the price feed misprices liquid-staking tokens (arbLUNA shown at 2.9x LUNA; an LST should be ~1.0-1.1x and needs a redemption-rate oracle, not a market px), so the USD values are wrong. Same for LUNA-ampLUNA. Fix: when the computed value split is >8pts off 50/50, treat the price as suspect — draw the structural 50/50 bar and show chain-reported TOKEN AMOUNTS (trustworthy) instead of misleading dollar figures, with an amber note "USD split unverified — showing token amounts (LST price feed)". The token-amount drift and directional read are price-independent and stay valid. Real upstream fix: give the cron an LST redemption-rate oracle so USD values are correct.

#### Rev 3.28 — Threshold Watch: split into the two intended warnings
Reworked to clearly separate the two signals it was meant to give. (1) AT RISK OF FALLING: active pools within 1-2% of their bucket, now sorted FALLING-first (losing share epoch-over-epoch) with forward-looking framing — these may drop below 1% and stop earning if the slide continues. (2) CURRENTLY INACTIVE: a new standing list of pools below 1% right now (not earning) — the pull-liquidity candidates, sorted closest-to-1% first so the near-reactivation ones (e.g. LUNA-stLUNA at 0.96%) surface. The prior "dropped this epoch" and "earlier drops" history is kept below as event history. Verified non-overlapping. Note: a true "planned" projection isn't added because the Votion-optimized shift moves bucket % by <0.05pt — it would be false precision; the honest signal is current share + trend direction.

#### Rev 3.29 — Revert the LST priceSuspect guard — arbLUNA price was correct
On-chain check (arb UI: 1 arbLUNA = 2.92 LUNA, arbLUNA $0.1748, LUNA $0.0604) confirmed our arbLUNA price was RIGHT — arbLUNA redeems for ~2.92 LUNA, it is not 1:1. So the 62/38 value split is REAL: these LST pools use a weighted/concentrated curve, not a 50/50 constant product. My earlier priceSuspect guard (assuming all LSTs sit ~1:1) was wrong and hid correct data; reverted. Now we show the true USD split and, for an LST pair whose split is naturally uneven, a small note "uneven split is normal for an LST pair" so it does not look alarming. IL-minimal pegged handling unchanged.

#### Rev 3.30 — Composition: pool-type aware (concentrated vs xyk vs stable)
The 62/38 USD split on LUNA-arbLUNA looked broken but is correct: dex_subtype=concentrated. Astroport PCL (concentrated-liquidity) pools concentrate reserves around the current price, so the two sides hold different USD amounts BY DESIGN — not an imbalance. 22 of the pools are concentrated (incl. LUNA-USDC, LUNA-CAPA, LUNA-FUEL, LUNA-arbLUNA), 7 are xyk (true 50/50), 6 stable. The composition strip now reads dex_subtype (carried on store.pools as type, looked up by name+bucket since pool-status-history lacks it) and adapts: concentrated pools show "concentrated pool — uneven USD split is by design" and "IL: amplified vs a 50/50 pool" instead of the xy=k IL numbers (which don't apply to concentrated pools); xyk pools keep the 50/50 treatment + IL sensitivity figures; the "LPs pulling/adding both sides" read is suppressed for concentrated pools (reserves shift with price there, so it is not an LP add/remove signal). LST note retained for pegged pairs.

#### Rev 3.31 — New: "Is TLA Liquidity Growing?" panel + Threshold reorg + per-token flows
Three additions this round.
(1) New Overview panel answering the core health question: is the liquidity base growing or being drawn down. Total TLA-staked $ moves with token prices, so a $ decline can be pure price, not extraction. The panel leads with the REAL (price-neutral) trend — every epoch's reserves revalued at today's prices — alongside the headline $ trend, plus the token drivers of the change. Current read: $ down ~8% but REAL liquidity roughly flat (LUNA base growing from auto-compounding, offset by stablecoin withdrawals) — i.e. NOT extraction, the $ drop is mostly LUNA price. Honest framing: only 4 epochs of history, read direction not precision.
(2) Threshold Watch reorg: all four sub-sections now top-3 + expandable for a uniform, neat layout. AT RISK OF FALLING sorted falling-first; CURRENTLY INACTIVE now sorted by MOST TLA-STAKED first (biggest $ being eroded by take rate) showing staked $ and bucket %; DROPPED THIS EPOCH stays green when none, top-3 expandable when some; EARLIER DROPS top-3 expandable. Member filter wired through all sections. Fixed a literal-unicode bug where the section sublabels showed raw –2 / — (escapes in static HTML don't render) — now proper 1-2% and dashes.
(3) Pool Health flow cards (Net flow / Inflows / Outflows) are now tap-to-expand to per-token amounts (price-independent), so you can see which tokens entered/left — e.g. LUNA rising (auto-compounding) vs stablecoins leaving — that the USD figure hides.

#### Rev 3.32 — Liquidity Growth: recalibrate verdict + add size/migration context
The panel labeled a -1.9% real change over 4 epochs as "Drawing down" (red), which read as alarming for what is actually statistical flatness. Cross-checked against a fresh Eris dump: TLA holds ~$2.62M TVL, pays ~$1.01M/yr rewards (~38% blended APY), pools are actively earning and being MIGRATED to more efficient curve types (xyk -> pcl/concentrated) — a functioning, healthy protocol, not a declining one. Fixes: widened the stable band to +/-5% over the window (a couple-percent wiggle at a few-$M size is noise, not a trend) so the verdict now reads "Holding steady"; renamed "Drawing down" -> "Shrinking" and reserved it for real sustained moves; greyed the metric cards inside the band rather than red/green; added a size anchor ("TLA currently holds $X staked; a few percent of movement is normal at this size"); added a note that pools migrate between curve types, shifting where liquidity sits without leaving TLA. A panel that cries wolf is worse than none.

#### Rev 3.33 — Pool Health: group by bucket, top-3 each + expandable
The Pool Health & Exit Risk list was one long flat run of pools. Now grouped by bucket (STABLE / PROJECT / BLUECHIP / SINGLE), each showing its top 3 by severity-then-stake with a per-bucket "show N more" expander. Each bucket header carries pool count, total staked, and a flagged/all-clear chip. Candidate set widened from top-10-flat to every pool >= $5K staked (or flagged), so expansion reveals real depth instead of a hard 10-row cap. Verified the grouping handles legitimately-distinct same-name pools correctly (e.g. Astroport LUNA-USDC $598K concentrated vs SkeletonSwap LUNA-USDC $82K xyk — different DEX + gauge, both active, both shown).

#### Rev 3.34 — Member positions: earnings, APR/share, amplified tag + pool-type note everywhere
Member-selected Pool Health view gained three things from data we already capture but weren't surfacing: (1) an unclaimed-earnings banner (pending_rewards + pending_rebase + pending_bribes summed in USD, shown only when >0) so a member sees what's waiting to claim; (2) a per-position earning line — USD-weighted APR + their share of the pool (e.g. "68% APR · 5.3% of pool"); (3) an "auto-compounding" tag on amplified positions (is_amplified is reliable per-position, unlike the pool-wide ratio_type). Also added the pool-type explanation to BOTH views: the TLA-wide skew chip in the row header now names the reason ("62% LUNA · concentrated pool" / "· LST pair" / "· possible depeg" for stables) instead of a bare "by design", and member rows show a "concentrated pool — uneven split is by design" note. So a lopsided split is explained the moment it's seen, not one tap away in the composition strip.

#### Rev 3.35 — Explain mode — plain-language on-ramp for newcomers
Added a global "Explain mode" toggle (top-right of Overview). Off by default, so the dashboard looks exactly as it does now for experienced users. When on, a cyan "What this means" box appears under each major panel (Liquidity Growth, Pool Health, Threshold Watch, Vote Breakdown) explaining it in plain English with an analogy, no jargon — e.g. TLA as "a big shared pot of crypto", the threshold as "needs at least 1% of the votes or it stops earning". Pure-CSS show/hide via a body.explain-mode class (no per-panel JS); one tap reveals/hides all of them. First of the comprehensibility improvements (a member reported the tool was hard to understand); next candidates are consistent key-term tooltips and a short "how to read this" intro card.

#### Rev 3.36 — Replace explain mode with per-panel expandable descriptions; header tidy-ups
Reverted the global Explain-mode toggle in favour of per-panel descriptions: every major panel (Liquidity Growth, Pool Health, Threshold Watch, Vote Breakdown) now keeps a short always-visible one-line description plus a "learn more" link that expands the full plain-language explanation inline (toggleDesc + .desc-full). Cleaner than a global mode — the explanation lives next to the panel and you open only the one you need. Also: (1) fixed the header reflow — the member summary chip (VP/LP/active) now sits on its own line below the member selector instead of inline, so selecting a member no longer pushes the Live Epoch / Epoch Ends In group around; (2) removed the "Data Snapshot — Epoch NNN" element from the header entirely (freshness already lives in the footer cron-health popover and the data-notice), replaced with a quiet green "Live" dot.

#### Rev 3.37 — Footer rev label auto-tracks the changelog + last-updated date
The footer "Rev 2.2 · Changelog" label was hardcoded in the HTML, so it never moved when tla-log.md was pushed (the changelog MODAL fetches live from GitHub, but the little rev label did not). Fixed by deriving the label from the changelog itself: on page load (and on modal open) the page reads the top `## Rev X — YYYY-MM-DD` header from tla-log.md and sets the footer to "Rev X · Changelog · updated <Mon D, YYYY>". Now it auto-tracks every future push — no more hand-editing — and adds an at-a-glance last-updated date so visitors can see the dashboard is actively maintained.

#### Rev 3.38 — Changelog: jump-to-rev navigation
The changelog modal is long (Rev 3 alone has 37 sub-entries before you reach Rev 2/1). Added a "Jump to:" pill row at the top of the modal — one pill per major revision (Rev 3, 2.2, 2.1, 2.0, 1.15, 1.14), each scrolls straight to that revision. Built dynamically from the ## Rev headers in tla-log.md (anchor ids added to each rev header during markdown parse), so it auto-includes any future revisions with no extra work. Note: the footer label intentionally shows the MAJOR rev ("Rev 3") not the sub-rev — the X.x detail lives inside the changelog.

#### Rev 3.39 — Pools tab: aDAO Vote column = % of aDAO's own VP (vote utilization)
Pools tab audit (these tabs hadn't been revisited since the cron-data migration). Findings: Votion Now/Next are CORRECT — verified they sum every lockup contribution (each LST type × duration: Max/3mo/1wk) exactly across all pools. Bribes are correctly wired — PD sourced from the PD-bribes file by normalized name+bucket, valued at live LUNA price (the file's USD is frozen at prop-post time), keyed by gauge_pool_id, with the on-chain remainder attributed to Other. The aDAO Vote column was the real fix: its bottom % showed share-of-bucket; it now shows each pool's aDAO VP as a % of aDAO's OWN total live VP (vote utilization). Denominator is the live adao-positions treasury VP (~821,792 right now — matches the live figure, not the stale snapshot's 739,612). Now LUNA-EURe reads "16,025 · 1.9% of aDAO VP" and each bucket footer sums to ~100% of aDAO VP deployed, so you can see aDAO is using all its voting power in TLA and how it spreads it (e.g. 86% of its stable allocation on LUNA-USDC). Still queued for the Pools tab: switch this column to the selected member's VP when a member is chosen; default chart to high+mid tier; click-LP-to-isolate in chart.

#### Rev 3.40 — Pools tab: explain the blank Epoch Avg Liq/Vol cells
Investigated the blank Epoch Avg Liq/Vol entries — they're real data gaps, not a page bug, from three causes: Skeleton Swap pools (the SS upstream API is stale, ~24 rows), single-asset pools ampCAPA/xASTRO (no LP-pair liquidity/volume by nature, 6 rows), and a few pools whose name never resolved upstream so they show as raw gauge ids and can't match the epoch data (2 rows, incl. one active ~430K-VP single-bucket pool). The page now shows a context-aware marker instead of a bare "-": "data pending" (SS, amber, with tooltip), "n/a · single-asset" (ampCAPA/xASTRO), and a dash+tooltip for unresolved names — so a blank reads as explained, not broken. All pools still show (the active unresolved one matters). Cron brief updated: 2.8 (resolve pair-names for all gauges + dex/subtype at capture) and 2.9 (documents the three blank causes; only SS and unresolved-name are fixable, single-asset is expected).

#### Rev 3.41 — Pools tab: surface the fresh Skeleton Swap data (epoch-label off-by-one)
Followed up on "shouldn't the new SS cron have data by now?" — it does. The SS cron is healthy (daily heartbeat, ~34 pools, ~$676K TVL, fresh) and writing weekly-avg files. The blanks were a fetch mismatch, not missing data: the SS cron labels its weekly file by the CURRENT epoch while the page/astroport label by the COMPLETED epoch, so for the 2026-05-18..05-24 week astroport has epoch-186 but SS wrote 2026-epoch-187.csv. The page asked for epoch-186 (404) → fell back to 185 (404) → no SS data, while epoch-187.csv (the correct week, fresh, names matching) sat unused. Page fix: the weekly-avg fetch now tries lastCompleteEpoch, then +1 (SS convention), then -1 — so SS Epoch Avg Liq/Vol now populate. Durable fix is cron-side (align SS epoch label to the completed-epoch convention) — cron brief 1.4 updated from "migration" to the real off-by-one finding, with a note to remove the page +1 fallback once aligned.

#### Rev 3.42 — Data-source sweep: drop the dead votion fetch (all tabs on new crons)
Swept every data source after the SS finding, to make sure nothing else still pulls from the old system. Result: all CONFIG URLs already point at the new *-data_2026 cron repos, and heartbeats confirm they're fresh (tla-snapshot, network-and-prices, adao-positions, bribes, astroport, ss all ran today on epoch 187). The one piece of old-system cruft: the page was fetching votion-epoch-{N}.json from the standalone votion-data_2026 repo (which is ~6 days stale) on every load — but buildLegacyDataShape already IGNORED it ("use the snapshot's embedded votion fields, ignore external votion file"), so the fetched value was thrown away. Removed the wasted fetch (slot kept as Promise.resolve(null) to preserve the Promise.all alignment). Votion now/next + per-lockup data continue to come from the hourly-fresh tla-snapshot voting_power fields. Confirmed astroport-epoch-187.json exists and is the right live file, and prevLeaderboardAvg reuses the corrected SS text (no separate stale-label refetch).

#### Rev 3.43 — Pools tab: fix LIQ variant-collision + show real zero-volume as $0
Two fixes from the Pools-tab screenshot. (1) Some Astroport pools (LUNA-arbLUNA, LUNA-WBTC) showed blank/tiny LIQ despite having real liquidity. Cause: the epoch-avg index is keyed by pool NAME, and a pair with two Astroport variants (the real migrated/concentrated pool + a dead husk on the old curve type) collided — last-write-wins let the husk overwrite the real pool (LUNA-arbLUNA: 10,764 husk clobbering 89,061 real; LUNA-WBTC: 53 clobbering 131,521). Fixed by keeping the LARGER-liquidity variant on key collision (same variant-collision class as the Overview safeguards). (2) Skeleton Swap pools showed "data pending" for volume when the volume is a genuine ZERO (these are low-activity pools with real TVL but no trades). Split the marker into liq/vol: if the pool's data was found (has TVL), a zero volume now shows "$0" (real no-activity), and "data pending" is reserved for pools genuinely absent from the data. Cron brief: this is another symptom of name-keying vs gauge_pool_id (item 1.1) — the epoch-avg files should key by gauge_pool_id so variants never collide.

#### Rev 3.44 — Pools tab: latest-epoch window, single-asset liquidity, $0/APR markers
Cleared the remaining Pools-tab blanks from the screenshot. (1) ATOM-dATOM and wstETH-WETH.axl showed "-" for LIQ because their liquidity samples only exist in the LATEST epoch (187), while the rolling-average window ended at lastCompleteEpoch (186) and excluded it. The live astroport file is named for the current epoch and includes it, so buildEpochAvgIndex now extends the window end to the max epoch actually present in the data (current-window only; the previous-window baseline keeps its fixed end via extendToLatest=false for fair movement deltas). (2) Single-asset pools (ampCAPA, xASTRO) have no paired-pool depth (depth_usd null) but DO have a real on-chain TLA-staked value — the LIQ column now shows that (~$206K, ~$26K) instead of "n/a". (3) Color consistency: sub-$1 volume rounds to $0 and read confusingly in orange next to true gray zeros — anything under $1 now shows a consistent gray "$0" regardless of DEX. (4) APR "-" for many pools is the intentional under-$20K-staked suppression (tiny stakes produce wild APR like 3,193%), not missing data — those cells now read "below $20K · hidden" with a tooltip explaining the pool is active but too small for a credible APR. Deferred: inflow/outflow display for single-asset pools (needs per-epoch single-asset token-amount deltas — separate enhancement).

#### Rev 3.45 — Pools tab: show APR for all pools with real stake (lower floor $20K -> $1K)
The Pools tab was hiding APR for any pool under $20K TLA-staked, which over-suppressed: Eris shows these APRs, the cron's APR data (rewards.approx_apr_pct) is the same source the Overview tab uses successfully, and 66 of 67 pools have it. The $20K floor was a ranking-credibility choice, not a data limit. Lowered the per-pool DISPLAY floor to $1K (kept the 200% cap), which surfaces 11 previously-hidden pools with genuinely useful, Eris-matching APRs (LUNA-USDT 67.9%, LUNA-SOLID 48.1%, LUNA-ASTRO 60.5%, ATOM-LUNA 48.5%, LUNA-stLUNA 45.5%, LUNA-arbLUNA 3.1%, etc.). Only sub-$1K dust pools stay hidden, where the figure is mathematically meaningless (a few dollars of rewards over ~$10 of stake reads as thousands-to-millions of %); those now show "below $1K · hidden" with a tooltip. The $20K threshold is unchanged for the leaderboard ranking + avg-APR credibility filter — that's a separate concern from per-pool display.

#### Rev 3.46 — APR: revert to hidden-under-$20K; capturing Eris's exact APR is a cron task
Followed up on showing APR for all pools (Rev 3.45). Goal was to match Eris exactly — anything else reads as wrong. Tested our data against a full capture of Eris's live APRs and found we CAN'T reproduce Eris from what we hold: our emissions ÷ TLA-staked figure runs ~20-25% high for real pools (LUNA-USDT 67.9% ours vs 56.1% Eris) and explodes for near-zero-stake pools. emissions ÷ depth matches Eris for most pools but breaks on high-depth/low-stake ones (LUNA-ampLUNA 3.5% vs 19%) and single-asset pools; no denominator we have reproduces Eris's number, so there's a factor (take-rate / time-weight / net-of-fee) we don't capture. Per "match Eris or it's perceived as wrong," reverted the per-pool APR display floor back to $20K (undoing 3.45's $1K) so we don't show a non-matching number, and reworded the hidden marker to note an Eris-APR capture is queued. Added cron brief 2.10 [HIGH]: capture Eris's published per-pool APR directly (keyed by gauge_pool_id as rewards.eris_apr_pct), with the full Eris ground-truth table for validation. Once it lands, the column switches to the exact Eris figure and the floor can drop.

#### Rev 3.47 — APR: confirmed our data is correct via on-chain contracts; net-APR is a cron task
Verified the APR question against the actual ve3-asset-staking contracts (the real ground truth, not Eris's display). Findings: (1) our reward DISTRIBUTION is exact — the contract's reward_distribution query gives LUNA-USDC 0.819836966 of the stable bucket; our allocation gives it 82% of $427,872 = $350,785, matching to the decimal. (2) our STAKED value is exact — on-chain staked LP ≈ $597,490 vs our $597,702. (3) there's a 10% take rate (yearly_take_rate: 0.1 on every asset) — Eris's APR is net of it, ours was gross, which is most of the ~15-20% gap. (4) our gross "rewards ÷ TLA-staked" is the mathematically correct yield-on-TLA-stake — DeFi Patriot's mechanism read was right; depth is NOT the denominator (confirmed: LUNA-ampLUNA shows 19% where any depth formula gives 3.5%). No simple transform reproduces Eris's displayed number exactly (per-pool factors), so rather than reverse-engineer a screen value, the cron will compute the real net APR from first principles off the staking contracts (taken/harvested/take-rate/staked + the astroport-incentives reward rate). Wrote the full spec into cron brief 2.10 [HIGH] with all four bucket contract addresses, the relevant queries, two computation approaches (rate-based + realized/model-free), and the Eris validation table. Page unchanged this turn — APR stays hidden under $20K (per 3.46) until net_apr_pct lands from the cron, so we never ship a number we can't stand behind.

#### Rev 3.48 — Mapped the full Eris ve3 contract suite (source-of-truth for the whole pipeline)
Worked through the on-chain Eris ve3 contracts via chainscope query dumps to map our entire data pipeline to its source of truth. This is the answer to the "too many breaking points / hard to trust" concern: instead of each cron reconstructing pools/VP/bribes/rewards from indirect sources, they can read the authoritative contracts directly. Mapped and verified five core contracts (every check matched our reconstructed data): (1) global-config `all_addresses` = master directory of every Eris contract by role — one bootstrap query, no hardcoded addresses, auto-tracks migrations; (2) asset-gauge `distributions`/`last_distributions` = authoritative pool registry with per-pool VP + reward-share % + canonical epoch number (last_distribution_period = 186), resolves bucket membership for "unresolved" pools; (3) ASSET_STAKING__* (4 buckets) = staked balances + 10% take rate + realized rewards (taken/harvested) — the real APR mechanics; (4) bribe-manager `bribes` = authoritative active-bribe registry per pool, replaces the PD-file merge; (5) voting-escrow `total_vamp` = authoritative total VP (26.59M = 23.74M decaying + 2.85M fixed across 431 veLUNA NFT locks). Confirmed the reward flow from on-chain txs: astroport-incentives → bucket-staking (takes 10%) → bribe-manager + connectors. Also surfaced: a per-wallet lookup feature (the address/token_id-arg queries enable "enter any address → see VP, locks, claimable bribes/rewards"), and a token-registry gap (ibc/4B44… bribe token). Captured everything in cron brief items 2.11–2.15 with all contract addresses, query lists, sample outputs, and an architectural recommendation: one cron bootstraps from global-config.all_addresses then fans out, becoming the master source every other cron reconciles against. No page changes this session — this is groundwork for the cron rebuild. The contract reads also confirmed (Rev 3.47) that our APR data is correct and the gap to Eris is the 10% take rate + per-pool factors, resolved by computing net APR from these same contracts (item 2.10).

#### Rev 3.49 — Lock registry, feature roadmap, and capture-from-source principle
Extended the contract work into capability/roadmap planning. Added cron brief items: 2.16 (self-discovering pool registry — LPs auto-add/remove via gauge last_distributions + staking whitelisted flag, so the pool list becomes a derived view of chain state, no manual maintenance — fixes the variant-collision/unresolved-pool/migrated-husk band-aids at the source); 2.17 (veLUNA lock registry — enumerate all 431 lock NFTs via all_tokens + lock_info{token_id}, ~440 queries/epoch, to build a LUNA unlock schedule + VP-decay forecast + lock composition — a genuinely unique, market-relevant feature; one raw lock_info sample still needed to lock the schema). Added a REF-A reference documenting every address/token_id-arg query (which arg each needs) so wiring per-wallet/per-lock lookups later is trivial. Added an IDEAS running list of features the contract data unlocks (wallet lookup, early-user recognition via user_first_participation, cross-contract health panel, history/trends, unlock schedule). Added a PRINCIPLE note: capture from source, snapshot raw outputs each epoch into history repos, store the raw + derive the views, keep this brief as the "which contract/query holds the answer" reference. No page changes — roadmap/groundwork.

#### Rev 3.50 — Completed the per-wallet query map (all 5 contracts, every schema confirmed)
Worked through the remaining address-arg queries via live chainscope queries, confirming every schema against real output (nothing guessed). Captured in cron brief items 2.18 (gauge per-wallet: user_info with gauge_votes, user_shares for live pool influence, user_first_participation for early-user, user_pending_rebase), 2.19 (master participant registry — enumerate voters via user_infos + lockers via tokens/lock_info + stakers via pool_stakers + bribers, union + diff epoch-over-epoch for join/leave history), plus schema confirmations: user_claimable {start,end,buckets:[{gauge,asset,assets}]} (populated example: a wallet with 1,735 ASTRO + 371 LUNA + 672 CAPA claimable across 9 pools); voting-escrow verdict (lock_info is the single source; tokens{owner} enumerates a wallet's locks — example wallet holds 8; lock_vamp and nft_info confirmed redundant); pool_stakers {user,shares,balance} paginated = staker enumeration + concentration; and the four staking per-wallet queries. Documented two gotchas: (1) staking uses `address` not `user` (gauge/bribe use `user`); (2) staked_balance returns a storage "not found" error for no-position while all_pending_rewards returns clean empty []  — cron must treat both as zero, not failure (ties to failed-vs-empty house rule). Also corrected the vote-persistence framing per DeFi Patriot: an unchanged vote is a deliberate "still happy with it," not disengagement — present "vote set since epoch X" neutrally, never as staleness. No page changes — this completes the source-of-truth reference for the cron rebuild. Net: all five Eris ve3 contracts (global-config, asset-gauge, asset-staking×4, bribe-manager, voting-escrow) fully mapped, every query schema confirmed against real chain output, with field-name/not-found/dust gotchas documented.

#### Rev 3.51 — Mapped the asset-compounder (the "skipped" contract earned its place)
Chased the full asset-compounder query pipeline (ve3-asset-compounding v1.9.7, terra1zly98…). config{} revealed an 8% compounder reward fee SEPARATE from staking's 10% take, plus fee_collector (matches directory), 4h profit delay, 10 LUNA denom-creation fee. Decoded the three list queries: asset_configs{} = compounding vault registry (per pool: asset, gauge, staking contract, amp_denom, zasset_denom, reward=ampLUNA, fee null=global 8%); amplp_exchange_rates{} = current amplp→LP rate per vault; exchange_rates{} = rate history + an `apr` field CONFIRMED to be the PER-PERIOD (daily) compounding rate (verified on LUNA-USDC stable: measured 0.159%/period vs apr 0.163%) — i.e. the realized, net-of-8%-fee daily yield baked into amplp, arguably the truest "what a compounded staker earned," a strong cross-check/source for the net-APR work (item 2.10). Per-arg shapes: asset_config needs BOTH {asset_info, gauge}; user_infos uses `addr` (THIRD field-name variant after gauge/bribe `user` and staking `address`) and can OUT-OF-GAS at the 3M default (iterates all vaults) — cron must raise gas or paginate. Verified against Eris's own docs that the fee is DOCUMENTED (their published APY formula bakes in the reward fee) — corrected an initial "is this sneaky" read: 8% performance fees are industry-standard and only apply to opted-in compounded positions. Added a neutral TRANSPARENCY DOCS item to the brief: non-compounding = 10% take only; auto-compounding = 10% + 8% (~18% on the reward stream) but buys daily compounding (APR→APY), no manual-claim gas, fewer taxable events — net-yield edge mainly on higher-APR pools (50% APR → ~51% realized vs 45% simple), convenience+tax-efficiency always. Dashboard angle: show gross reward APR vs realized net (from compounder exchange_rates.apr) vs the spread. No page changes. ALL Eris contracts now mapped — nothing left deliberately unmapped that carries dashboard-relevant data.

#### Rev 3.52 — Astroport pools.getAll API found (HAR) — closes the APR reconciliation gap + pricing/decomposition
A HAR capture of app.astroport.fi/pools surfaced the frontend data endpoint api/trpc/pools.getAll (chainId phoenix-1) — 275 pools, each with poolAddress/lpAddress, poolLiquidityUsd + poolLiquidity (total LP supply), poolStakedLiquidityUsd + poolStakedLiquidity, assets[] with per-token RESERVE amounts + price + precision, and APR pre-split into tradingFees.apr / astroRewards.apr / totalRewards.apr plus rewards[] emission detail and dayVolumeUsd. This provides the pool reserves + LP supply that items 2.10b (gross-APR denominator), 2.10c (LP USD pricing), and the amplp underlying-token decomposition were all missing. Verified against known data: LUNA-USDC reserves×price = $688,280 ≈ poolLiquidityUsd $687,891; implied LP price $0.53592 ≈ Eris backend $0.53647; value split 50.5/49.5 (NOT 50/50 — confirms reserves must be read, not assumed); $100 LP decomposes exactly to 810.13 LUNA + 49.57 USDC. CRUCIALLY this closed the long-standing reconciliation gap: Astroport's APR here (~2.4% for LUNA-USDC) is ONLY the Astroport base+ASTRO side and does NOT include TLA/Eris gauge rewards (~58% gross), so full gross for a TLA-staked LP = Astroport (~2.4%) + TLA (~58%); the realized compounder exchange_rates.apr captures both, which is why our earlier TLA-only "gross" nearly equalled realized instead of exceeding it. Now both components are sourced and the breakdown can reconcile. Source caveat noted: pools.getAll is Astroport's OFF-CHAIN tRPC API (centralized, same trust class as the Eris backend) — use as fast primary + cross-check, keep on-chain pair `pool` query as source-of-truth and flag divergence. HAR also exposed tokens.byChain / tokens.getPrice as additional off-chain price sources for cross-checking. Captured as item 2.10d. No page changes.

#### Rev 3.53 — Skeletonswap API migration resolved + token-icon source strategy (HAR)
HAR of skeletonswap.backbonelabs.io closed the long-open SS migration item: the new endpoint is dex.warlock.backbonelabs.io/api/pools/phoenix-1 → {chain_id, pools[], total, limit, offset} (40 pools), each with pool_id, pool_address, reserve_0/reserve_1, total_share, tvl_usd, volume_24h/7d, apr_7d, and token_0/token_1 {denom, symbol, name, decimals, logo_url}. Same reserve+share+tvl shape as Astroport's pools.getAll — SS cron should point here and re-enable the SS lines in test.html once flowing. SS also exposes /api/coingecko?ids=... as a CoinGecko price passthrough (another off-chain cross-check). Token icons: both DEXs hotlink GitHub-raw icons — Cosmos Chain Registry (raw.githubusercontent.com/cosmos/chain-registry/master/<chain>/images/<token>.{svg,png}, broad multi-chain, best primary) and astroport-token-lists (Terra fallback); plus both pool APIs return a per-token logo_url directly, so the simplest path reads the icon URL straight from pool data we already fetch (cache/proxy through our domain). Blended LP/amplp icon = client-side CSS/SVG overlap of the two constituent token logos (a small PairIcon component); amplp's two underlying tokens resolved via asset_configs → LP → pools.getAll assets[]. Captured as items 2.10e (SS) and 2.10f (icons). No page changes.

#### Rev 3.54 — Eris HARs: confirmed displayed numbers are fully reproducible from source + oracle-health panel spec
HARs of erisprotocol.com liquidity + vote tabs revealed the full data assembly: backend.erisprotocol.com/prices (CoinGecko-backed token prices) + app.astroport.fi/api/pools?chainId=phoenix-1 (REST variant, 275 pools, with totalLiquidityUSD/poolTotalShare/assets/yield{poolFees,astro,externalRewards,total}) + phoenix-rpc.erisprotocol.com batched abci_query against the gauge/staking/compounder/escrow contracts we already mapped. KEYSTONE conclusion: Eris computes its displayed APR/VP/rewards CLIENT-SIDE from these contract queries + Astroport pool data + prices — nothing proprietary server-side — so every number on Eris's UI is reconstructable from sources we now hold, and the earlier "unexplained per-pool factor" is just their client formula, not hidden data. Validates the 2.10b reconciliation plan end to end. Also: confirmed both Astroport endpoint styles (REST /api/pools and tRPC pools.getAll) serve the same data. Icon priority set per DeFi Patriot (trust-ordered): Eris self-hosted /assets/tokens/<t>.webp PRIMARY, astroport-token-lists FALLBACK, Cosmos Chain Registry last; explicitly not Skeletonswap (lowest reliability for asset hosting). Captured DeFi Patriot's oracle/price-health panel idea (2.10h): surface Astroport + Eris + CoinGecko + our own on-chain prices side by side per token with %-divergence, freshness, and green/amber/red parity status; flag feeds that diverge beyond tolerance (real cases already found: ASTRO 9x, KUJI 18x, MARS 146x in the Eris feed across bridged variants) — both a user trust feature and our own data-health guard. All price feeds now identified; nothing left to discover. Captured as items 2.10g, 2.10h + icon-priority note. No page changes.

#### Rev 3.55 — On-chain pool source-of-truth layer CONFIRMED (pair pool/pair/share/cumulative_prices/lp_price)
Ran the LUNA-USDC Astroport pair on-chain and reconciled against the off-chain API. pool{} → reserves + total_share; total_share IDENTICAL to the unit vs pools.getAll, reserves within ~0.22% (different block) — the parity-check working exactly as intended. pair{} confirms pair_type {custom:concentrated} (PCL) + liquidity_token. share{amount} returns the contract-computed decomposition (1 LP = 4.3514 LUNA + 0.2651 USDC, matches reserve/supply) — resolves the decomposition feature's only gap. cumulative_prices{} CONFIRMED as the on-chain TWAP accumulator: {assets, total_share, cumulative_prices:[[a,b,cum],...]} both directions, each a price-seconds running total — TWAP = Δaccumulator/Δtime between two timestamped reads, so the cron stores (cum, ts) per epoch; this is the manipulation-resistant on-chain price feed for the oracle-health panel. lp_price{} returned 1.0741 for LUNA-USDC which is ~2× our USD per-LP (~$0.5365) → NOT USD; likely an internal PCL peg/scale or virtual-price unit — flagged do-not-display-as-USD until denomination confirmed (~60% peg-denominated); reserves×price (or share×prices) stays the trustworthy USD LP value. simulation needs {offer_asset:{info,amount}}, reverse_simulation needs {ask_asset:{info,amount}} (effective spot/slippage, thin-pool risk). Captured as item 2.10i. Source-of-truth pool/oracle layer now complete; only remaining unconfirmed query is the compounder user_infos pagination (nice-to-have). No page changes.

#### Rev 3.56 — simulation/reverse_simulation confirmed → slippage curve grounded (last query shape)
Ran simulation across sizes on LUNA-USDC. CONFIRMED: simulation{offer_asset:{info,amount}} → {return_amount, spread_amount, commission_amount} (output-asset base units); reverse_simulation{ask_asset:{info,amount}} → {offer_amount, spread_amount, commission_amount}. Two distinct costs: commission = pool fee (~0.147% flat, PCL tier), spread = price impact (size-dependent). Measured curve selling LUNA: 1 LUNA 0.016% spread → 100 0.019% → 10k (~$620) 0.21% → 100k (~$6.1k) ~2.0% spread/~1.9% impact — flat then accelerating, exactly what a large-zap user needs pre-commit. Grounds all three 2.10j features: slippage display (curve per pool, fee vs impact split), zap-impact preview ($10k LUNA zap ≈ ~0.8% total cost shown live before commit), arb/alert signal (spot vs TWAP). This was the last unconfirmed query shape needed for the informational features. Remaining open: only the compounder user_infos pagination (nice-to-have). No page changes.

#### Rev 3.57 — compounder user_infos: input fields known, element encoding deferred to build time
Closed the last chain-query item honestly. Contract errors confirmed the top-level fields: user_infos{addr, assets} — addr = wallet (third field-name variant after gauge `user` / staking `address`), assets = a LIST that filters which vaults to read (NOT pagination); bare {addr} OOGs because it scans all vaults, so the cron passes the specific vaults a wallet holds (known from amplp balances). The exact JSON encoding of each assets[] element is NOT pinned: chainscope rejected bare {cw20:addr}, {asset_info,gauge} object, and [asset_info,gauge] tuple — all "Invalid type". Deferred to build time, where the message type can be generated from the erisprotocol/contracts-ve3 source or the contract's shipped CosmWasm query schema (exact, ~30s) rather than guessed blind. This is the only unconfirmed query left and the lowest-priority feature (per-wallet compounder lookup; nothing depends on it). BONUS: the asset_configs output gave the authoritative LP token-type map — asset_info is a bare string enum, {cw20:"terra1..."} (older Astroport LPs) or {native:"factory/.../uLP"} (newer tokenfactory LPs), per pool — useful for cron LP lookups regardless. No page changes.

#### Rev 3.58 — Eris contract inventory COMPLETE (footer cross-checked) — discovery phase done
The Eris TECH footer (full contract list) confirms total coverage: 5 singletons (asset-gauge, bribe-manager, global-config, voting-escrow, asset-compounder) + 2 repeating types one-per-bucket (ve3-asset-staking ×4 code_id 3585; ve3-connector-alliance ×4 code_id 3120). Every entry schema-confirmed; bluechip/single instances share code_id with the stable/project instances already queried, so they are guaranteed same-schema (only per-bucket values differ). Reward-share-by-bucket (stable highest) is DATA read from asset-gauge distributions + gauge vote weights, not a new schema. Cron pattern: one query handler per type, iterate the 4 bucket addresses from global-config all_addresses. Discovery phase is complete — the sole deferred item is the asset-compounder user_infos assets[] element encoding (resolve from contracts-ve3 schema at build time; lowest-priority, nothing depends on it). Captured as the COVERAGE section in the brief. No page changes.

#### Rev 3.59 — Build & architecture plan captured (Part 5 of brief) — full pipeline/cadence/cost/backend/migration handover
Appended PART 5 to CRON-FIXES-BRIEF.md capturing the architecture-session decisions so nothing is lost to context compaction: (5.1) the strict layered pipeline order discovery→pricing→entities→participants→rollups, each layer depending only on layers above, failure-isolated; (5.2) freshness tiers by volatility×consequence — LIVE (prices/rates/balances/reserves/quotes, cache-served + server-capped), HOURLY (TVL/APR headline), DAILY (full authoritative raw snapshot = history backbone), ROLLUPS (derived, zero chain queries), plus change-alerts; (5.3) cost/abuse defense — browser reads cache, only server reads chain, ONE globally-capped server-side refresh; JS rate caps are not real protection; immediate stopgap = Render/Vercel billing caps; (5.4) coherent "feels-live" UX without per-tile timestamp clutter — instant cached load, smooth in-place ticks, one ambient freshness cue; (5.5) target = NestJS+Postgres backend (Eris's rec, endorsed) but SEQUENCED — prove pipeline logic in familiar scripts first, then port, one hard new thing at a time; (5.6) migration = parallel-run + field-by-field diff vs old + live chain, via the hidden WIP test page, flip one tile at a time, never a rip-and-replace; v2-suffix the new Render crons; (5.7) FREEZE-don't-delete the old data (untrusted ≠ worthless; can't re-query past block state; keeping = cheap, deleting = permanent loss); (5.8) retain the why-behind-the-rigor context in conversation only, never in public files; transparency tools are neutral-by-construction. Discovery phase complete; this records the build approach. No page changes.

#### Rev 3.60 — Query cookbook consolidated into brief (Part 6); scratch query files retired
Added PART 6 to CRON-FIXES-BRIEF.md: a single CONFIRMED query reference — for every contract and the Astroport pair layer + off-chain APIs, the exact request JSON, the response shape, and what each is used for, plus the fixed contract address set, the pricing method, and icon priority. This is the build-off-this central reference (results + formats only; the how-we-got-there errors/dead-ends live in this changelog, not the cookbook). The scratch paste-and-confirm files (QUERY-BATCH-FINAL, QUERY-SIMULATION, QUERY-BATCHES, QUERY-BATCH4-FIXED) are now fully superseded by Part 6 and were removed. The two handover files are now CRON-FIXES-BRIEF.md (Parts 1-6: what to build, how, and the confirmed queries) and tla-log.md (how we got there). No page changes.

---

## Rev 2.2 — 2026-05-29

Pool health, capital-flow, and a full member mode built on top of the Rev 2.1 member overlay. All additions live in the rendering layer; the cron data layer is untouched except for two new history rollups that ride along with the existing `tla-snapshot` cron (see `cron-scripts/` and the new data files below).

### What changed

#### Pool Health & Capital Flow panel (new)
A watchlist of TLA's largest exposures, ranked by staked capital. Each pool shows a 4-epoch sparkline of its TLA stake, dollar flow this epoch, a health dot, and in/out/net summary cards. Comparisons are made within each pool's own `pool_address` series (never by name) so old/new pool migrations don't create phantom drops. Alarms are market-normalized — a pool is only flagged when it's draining materially faster than its bucket's median, so a broad market dip doesn't trip false alarms. Tiers: combined exit signal (depth + reserves + price all down hard), draining faster than peers, and sustained bleed (down every epoch and at least 15% cumulative). Reserve skew is shown only when a pair is meaningfully off 50/50.

#### Member mode (new) — the panels become personal when you pick a wallet
Selecting a member in the header now transforms two panels into a personal view, and reverts cleanly when deselected:

- **Pool Health becomes "Your positions & flow"**: your LP positions ranked by your own capital. Each row splits two honest signals side by side:
  - **Stake** — the change in your *real* LP units (vault/ampLP shares, falling back to LP tokens or underlying), which is the true deposit/withdraw signal. Auto-compounding and deposits grow it; only a genuine withdrawal shrinks it.
  - **Value** — the USD change, which also moves with token price. Price-driven moves are tagged `(price)` so a falling token can never look like you pulling capital.
  - Summary cards: **Value change** (USD, incl. price), **Stake added** (deposits + compounding), and **Stake reduced** (actual withdrawals only).
- **Threshold Watch becomes "Your at-risk pools"**: driven by your actual positions (`status` + `distance_from_threshold_pp`), not your votes — your pools that are near the 1% line, dropped this epoch, or already inactive.

Members holding the same pool under multiple stake configs are aggregated into one row. Member flow is epoch-over-epoch against the prior weekly archive; when that archive is missing, positions still list and the flow baseline is marked unavailable.

#### Threshold Watch rework
Rebuilt to be history-driven (keyed `name|bucket`): active danger-band pools (1–2% of bucket) most-at-risk first with an epoch-over-epoch trend, pools dropped this epoch, and an expandable list of drops over the last 4 epochs.

#### Leaderboards & APR history
Leaderboards now use true 4-epoch rolling averages with rank-movement badges and percentage deltas. New APR history (per-epoch rollup feeding a page consumer) adds an APR movement badge versus the last completed epoch.

#### Fixes
- **Non-PD bribes now captured, and PD bribes attributed correctly.** The Epoch Bribes breakdown showed $0.00 in every Phoenix Dir column and was missing bribes from other sources entirely. Two root causes: (1) `buildBribesIndex` hardcoded `pd_usd: 0` and dumped everything into "Other"; (2) the token-price resolver failed to price several bribe tokens, so many pools showed $0 total. Fixes: PD bribes are matched by normalized pool name + bucket/gauge and valued as `luna_per_epoch x live LUNA price` (the PD prop commits fixed LUNA per epoch over a multi-epoch range, so the prop's frozen USD is stale for later epochs); the price resolver now also matches native/IBC denoms stored under `prices.{source}.address`, maps known cross-chain IBC denoms (e.g. ASTRO) to their feed symbol, and pulls FUEL's price from its own `fuel-data_2026` repo (FUEL isn't in the network-and-prices feed). The result reconciles against Eris pool-by-pool: PD bribes land in the PD column, third-party bribes (e.g. Astroport volume kickbacks in ASTRO, CAPA incentives) land in Other, and pools with both show the split correctly (e.g. LUNA-ASTRO = PD LUNA + a small extra ASTRO bribe).
- **Phoenix Directive bribes now attributed correctly.** The Epoch Bribes breakdown showed $0.00 in every Phoenix Dir column — `buildBribesIndex` was hardcoding `pd_usd: 0` and dumping all on-chain bribes into "Other". PD bribes are now matched (by normalized pool name + bucket/gauge, so the same pool in two buckets is handled) and valued correctly: PD commits a fixed LUNA amount per epoch over a multi-epoch range, so the USD is recomputed as `luna_per_epoch x live LUNA price` rather than using the prop's frozen post-time USD. For epoch 187 this surfaces ~$510 of PD bribes across 10 pools that were previously mislabeled. (The PD master list lives in `tla-ext_json_storage/tla_pd_bribes.json`, maintained per PD governance prop.)
- **Single-asset pools** (ampCAPA, xASTRO) were mislabeled "Skeleton" in the Vote Breakdown waterfall — the dex sub-label was a binary `Astro` / `Skeleton`, so anything not Astroport fell through to Skeleton. They now correctly read "Single." (ampROAR-ROAR is a genuine Skeleton Swap pair and is unchanged.)
- Removed the orphaned "snapshot missed" popup.
- Removed the Skeleton Swap amber data-limitation banner.
- Fixed a false STALE outline caused by the bribes-history sporadic-data flag.

#### New data (cron side)
Two history files now accumulate, written once/day by rollups folded into the existing `tla-snapshot` cron (no new Render service):
- `apr-history.json` — per-epoch APR + staked averages per pool
- `pool-status-history.json` — per-epoch VP, bucket %, status, depth, staked, and reserves per pool (keyed `pool_address|bucket`)

### Verified working
- Pool Health watchlist flags the genuinely draining pools (LUNA-arbLUNA sustained bleed, LUNA-ATOM faster-than-peers) and stays quiet otherwise; net flow reconciles
- Single-asset pools read "Single"; Astroport reads "Astro"; Skeleton Swap reads "Skeleton"
- Member mode verified against live `adao-positions` data: the stake-vs-value split correctly separates real withdrawals from price — the only genuine withdrawal DAO-wide this epoch is one member trimming USDC-SOLID ~19%; every other apparent outflow was price movement
- Member at-risk view honestly shows "none near threshold" when all of a member's pools sit comfortably above the 1% line
- Both history rollups produce output byte-identical to hand computation against real daily archives

### Known limitations (acceptable)
- Member flow is epoch-over-epoch (positions update at the adao-positions cron cadence), and depends on the prior epoch's weekly archive existing
- For compounder vaults, manual deposits and auto-compounding both grow your unit count and can't be fully separated — hence the "Stake added: deposits + compounding" label

---

## Rev 2.1 — 2026-05-17

Member Data overlay feature + critical bribes resolver bug fix. Surgical additions to the rendering layer; cron data layer untouched (separate cron-side updates ship in the same session — see `cron-scripts/` repo for those).

### What changed

#### Member Data overlay (new feature)
Header dropdown selector — pick any aDAO member, the Overview tab visuals update with their data overlaid in amber. Pools / TLA Liquidity / aDAO tabs unchanged (member overlay is Overview-only by design).

When a member is selected:
- **VP Breakdown pie**: carves a member-colored slice out of "Other" — total VP unchanged
- **Vote Breakdown waterfall**: adds an amber member layer to each pool the member voted in. Bucket totals row gains a member chip; per-pool tooltip gains a member row
- **Threshold Watch**: filters to pools the member voted in. Header gains a "Filtered: {member}" badge. Empty states are member-aware ("None of {name}'s pools are at risk")
- **Member Stats Row**: 6 amber tiles below the global stat tiles — Astroport LPs, Skeleton LPs, Epoch Rewards, Epoch Bribes, Avg APR Non-Amp, Avg APR Amplified. Hidden by default; appears only when a member is selected
- Dropdown styling: dark color-scheme to fix invisible-text issue on some browsers; sorted by VP descending

#### Critical bug fix: bribes resolver
`resolveTokenPriceFromInfo()` was looking up cw20 token prices at `entry.address`. The actual `network-and-prices` schema nests the address at `entry.prices.{source}.address` (or under `prices.{source}.all_chains.{chain}.address` for multi-chain tokens). Any bribe paid in a cw20 token (CAPA, ROAR, etc.) silently priced as $0.

**Impact before fix**: Global Epoch Bribes tile showed ~$820. After fix: ~$1,300 (about 58% more accurate, more aligned with Eris). Member bribes tile correctly captures CAPA bribes (was 100% understated for members voting in LUNA-CAPA, ampCAPA).

Same resolver is used in `buildBribesIndex()` so this fix also corrects the per-pool bribe attribution used by waterfalls and ranking displays.

#### Pool lookup keying
All member-overlay lookups now use `gauge_pool_id` (truly unique, e.g. `cw20:terra1wdz...`) instead of `name+dex` (which can collide e.g. two `LUNA-WBTC|Astroport|BLUECHIP` entries with different gauge IDs). Required adding `gauge_pool_id` passthrough to both pool normalizers in the rendering layer (`votePools` normalizer ~line 3213, `normalizePoolData` ~line 2882).

Member-vote field is `pool_gauge_id`; snapshot field is `gauge_pool_id` — same values, different field names. Both are now handled.

#### Color scheme
- Member overlay color: amber (`#f59e0b`)
- "Other" VP: slate gray (`#64748b`) — was previously amber in waterfall, now consistent with pie chart slate
- Updated all 3 legends (waterfall totals, waterfall bottom, member tile row) for consistency

### Verified working
- Member dropdown populates from `adao-positions/current.json` members array
- Picking any member updates pie, waterfall, threshold watch, and member tile row in sync
- Switching to "All members" cleanly restores the global view
- Global Epoch Bribes tile climbs to ~$1,300 (verified against cron data)
- Member bribes correctly capture CAPA — tested against members voting in LUNA-CAPA pool
- All existing tabs and features continue to work (no regression in the ~7,000 lines of preserved rendering code)

### Known minor issues (acceptable for now)
- Skeleton Swap data labeled in Member Stats row but upstream source is frozen (see audit findings in `PROJECT_KNOWLEDGE.md`)
- Avg APR tiles still use TLA-staked-USD weighting (different from Eris); methodology fix tracked in `CHANGES_PENDING.md`

---

## Rev 2.0 — 2026-05-14

Major rebuild of the data layer to consume from the new TLA cron infrastructure (7 production crons writing to per-cron `*-data_2026` GitHub repos). Rendering code (~7,000 lines of charts, tables, modals, tabs) preserved intact — surgical surgery on data flow only.

### What changed
- **Removed** epoch/phase selector dropdown and snapshot date badge from the header. Data is now continuous (hourly updates) rather than per-epoch manual captures, so picking an epoch makes no sense. Live epoch + countdown remain.
- **Removed** all references to old per-epoch file paths (`tla-data-epoch-{N}-end.json`, `adao-snapshot_{N}_end.json`) which are no longer being written.
- **Added** new data fetch pipeline in `loadEpochData()`: parallel fetches from `tla-snapshot-data_2026`, `network-and-prices-data_2026`, `adao-positions-data_2026`, `bribes-data_2026`, `tla_ext_historical_2026.json`, and `tla_pd_bribes.json`. Falls through gracefully when individual sources unavailable.
- **Added** `buildLegacyDataShape()` transform function that maps the new continuous-data schema to the v3 store shape the existing renderers expect. Preserves all rendering code untouched.
- **Added** "Member Stats" tab link to the tab strip. Points to `dao-tla.html` (page not yet built — Pass 2 of the rebuild).
- **Fixed** aDAO tab now sources from treasury wallet data (`adao-positions/current.json` treasury field). At the TLA-wide level "aDAO" = treasury entity (single voter, 757K VP). Individual members live on the separate Member Stats page.
- **Fixed** TLA Total VP donut chart now shows mathematically truthful breakdown: 24.11M total (max bucket VP = Eris convention) split into Votion VP 6.90M (28.6%), aDAO/treasury VP 757K (3.14%), Other VP 16.46M (68.3%). Reconciled exactly against Votion's actual lockup data shown on votion.money.
- **Fixed** Liquidity DEX vs TLA Staked bar chart now populates correctly (uppercase bucket names matching renderer's expectations).
- **Fixed** Vote Breakdown Waterfall chart now renders all 4 bucket views (STABLE / PROJECT / BLUECHIP / SINGLE).
- **Fixed** Top by APR rankings excluded dust pools (TLA-staked < $20K) and capped at 200% to prevent illiquid pools with huge emissions/TVL ratios from dominating. Top entries now show realistic 70-80% APRs (LUNA-INJ, LUNA-FUEL, LUNA-CAPA, etc.) matching Eris.
- **Fixed** Avg APR weighted by TLA-staked-USD rather than depth-USD. ~40% Non-Amp / ~42% Amplified.

### Verified working
- All 6 tabs render
- Header tiles (Active pools 22 Astroport + 8 Skeleton, Epoch Rewards 339K LUNA / $22.7K, Epoch Bribes $841, Avg APR 40%)
- TLA Total VP donut with truthful breakdown
- Liquidity DEX vs TLA Staked bar chart (all 4 buckets)
- Vote Breakdown Waterfall (all 4 bucket views work)
- aDAO tab matches Eris UI within ±1%: Locked VP 757K, LP $6,669, rewards $453, bribes $443
- Top by APR rankings with realistic values

### Known minor issues (acceptable for now)
- Trend mini-charts on stat tiles will be empty until 2+ weekly snapshots accumulate (~4 weeks)
- Token grade scoring is a simplified stub — needs proper formula refinement
- Avg APR shows ~40% but Eris shows ~55% (different weighting methods, order of magnitude correct)
- Epoch number labeled as 184 instead of 185 — known off-by-one bug in cron output, dates correct. Fix planned across all crons. **[RESOLVED 2026-05-15 — see Rev 2.1 notes and cron README changelogs]**

---

## Rev 1.15 — 2026-05-08

Cleanup pass after first user review of the unified chrome rollout.

### What changed
- Cleaned up the page-specific header: removed the small aDAO logo, the "← Dashboard" backlink under it, and the "by The Alliance DAO •" subtitle. The "Terra Liquidity Alliance Tracker" title and the Eris TLA link remain. Epoch / phase selector and live epoch info on the right side are unchanged
- Cleaned up the page-specific footer: removed the "Updated: 4/26/2026" line (the changelog timestamp is the source of truth now), the "Built by: DeFi Patriot · DM for edits or errors" credit, and the "© 2025 Alliance DAO Community Project. Not affiliated with Terraform Labs..." copyright notice. The disclaimer block (Not Financial Advice / Data Accuracy / Third-Party Links / Use at Your Own Risk) and the Terra Liquidity Ecosystem links row remain
- Made the `last-updated` JS update null-safe since the element it targets was removed
- Fixed changelog modal — was fetching from `/main/logs/tla-log.md` (404), now fetches from `/main/tla-log.md`

---

## Rev 1.14 — 2026-05-08

Initial entry — page brought into the unified site chrome system.

### What changed
- Added unified site header (logo + 5-tab top nav + Terra logo)
- Added mobile bottom tab bar with TLA tab highlighted as active
- Added unified footer with Rev number + Changelog link (this changelog) — appended after the existing page footer (mission statement + ecosystem links preserved)
- Original page-specific controls preserved (epoch selector, phase selector, all charts and data tables)

### Earlier history (untracked)
TLA Stats has been the primary public face for Terra Liquidity Alliance data — voting share charts, lock data, epoch tracking, ve(3,3) analysis. The data pipeline depends on weekly Sunday 23:59 UTC snapshots captured manually via the TLA admin tool (automation is on the roadmap — see CHANGES_PENDING.md). Starting point of formal changelog tracking is rev 1.14.

Going forward, each meaningful change to this page will get its own entry here.

# Member Portfolio Changelog

---

## 2026-08-09 — Rev 2.4 — asset + pricing source migration (no behavior change)

Included in the site-wide grand repoint v1: pricing reads → org feed
(2026-08-07 cutover, byte-verified) and asset URLs → /assets/... self-hosted
in the (now org-owned) site repo. P1.8 logic untouched — verified preserved
in the shipped file.
This is the change history for `member-portfolio.html` (per-member portfolio tracker).
Newest revisions on top. Times are UTC.

---

## Rev P2.0 — 2026-08-20 — canonical VP field migration

12 reads of the retired `display_voting_power_human` migrated to canonical
`voting_power_human` (SPEC-vp-definition-fix). Fixes the landing tiles that
showed 0 VP live.

## Rev P1.9 — 2026-08-20 — navigation continuity with tla-stats

Member Portfolio looked like a sibling tab on tla-stats but clicking it jumped
to a page with different chrome: the top-nav swapped aDAO Lore for a
highlighted Portfolio button, and the tab strip vanished — the tab metaphor
broke mid-click. Fixed by making both pages present one continuous surface:

- **Top-nav now identical to tla-stats** (Home / NFT Explorer / aDAO Lore /
  TLA Stats / DAO). The page's location is expressed by the sub-tab strip,
  not by hijacking a top-nav slot.
- **The same sub-tab strip renders here**, Member Portfolio active, with
  Overview / LP Grades / LP Stats / TLA Stats / Docs deep-linking into
  tla-stats' hash router (#overview, #grades, #pools, #tla, #docs — the
  router already handled these). Crossing pages now reads as switching tabs.
- Sticky-bar epoch readout preserved (same #nav-epoch element).

## Rev 2.2 — 2026-08-03 — LIVENESS PASS (P1.6 + P1.7), production

**P1.6 — live claimable.** The participants feed is a DAILY 03:00 UTC
snapshot; a claim made after capture showed as pending all day (observed
live on DP's own claim — his post-claim reload is the acceptance
fixture). Rewards now read LIVE per wallet (the same four bucket
all_pending_rewards + rebase queries the DAO pages run in production),
green "live" tag; daily value stays as the labeled fallback. The card
splits honestly: "claimable now" (live) vs "accruing this epoch (est.,
settles at close — not claimable)". Never-understate guard: a failed
query or missing rate while rewards exist invalidates the live read and
falls back labeled — a broken query can never masquerade as a live zero.
Loop-guarded (render→fetch→render recursion replayed 1-fetch-per-wallet).
Copy fix: "about an hour" → the truthful next-daily-snapshot.

**P1.7 — live repricing.** Quantities move rarely; prices move
constantly. All summary values now = feed amounts × LIVE prices: LP
underlyings priced from the hourly TLA snapshot by symbol (29 priced),
wallet + locks from the org catalog by denom (symbol→denom bridge built
from the feed itself — the catalog carries no symbol field). Real-record
replay: locks $5,531→$5,263 (a $268 same-day staleness caught), LP full
reprice zero-fallback. Unpriceable items keep their feed value, labeled —
never silently bridged. Tiles carry "live px".

## Rev 2.0 — 2026-08-03 (staged on test.html — the P1+P2 portfolio rebuild)

Full-page rebuild toward the awe-factor brief ("this is people's money"),
staged on `test.html` (free since the TLA Stats T3 promotion); promotes to
`member-portfolio.html` when approved. Gate: **117/117** fixture-derived
assertions (new page surface = new baseline suite in the session workspace).

- **Net-worth banner — the full splice, one number.** TLA (locks+LP+wallet)
  + Votion (per-holder feed) + aDAO NFTs at sales floors, with a clickable
  composition bar (segments scroll to their section), 1d/7d/30d change chips
  from the daily archive (TLA slice only — labeled, since Votion/NFTs have no
  archive yet), a 30-day sparkline, and the unpriced-assets honesty chip.
  Votion and the NFT scan resolve async and the banner updates in place.
- **"Your position over time" trend engine.** Sampled real days from the
  registered-member daily archive (since 2026-06-13): metric toggle
  (Portfolio $ / VP / LP / Locked), 14d/30d/all ranges, tracking-began marker
  on "all", dots are captured days, never interpolated. Per-wallet slim
  records cached in sessionStorage; ≤17 fetches per range.
- **Tiles v2.** Six tiles now cover the whole splice (VP · Locked · LP ·
  Votion · NFTs · Claimable), each with an async 7d delta vs the archive and
  a whole-tile drill into a full-history modal chart. Wallet folded into the
  banner composition (still itemized in Balances).
- **Claimable goes live-math (R2).** `total_pending_bribes_usd` is the
  proven-broken cron field — replaced by your VP share of each voted pool's
  live pot valued via the org token catalog (same replacement tla-stats made
  in T2.6). Feed value only as a labeled fallback. Tile, alert, and Income
  card all use it; live figure $61.12 vs the feed's $37.68 on the fixture
  wallet at gate time.
- **Income card (new).** Every income stream, measured: claimable now, LP
  yield claimed (pnl Phase B: 1,695.73 LUNA ≈ $585.39 at claim-day prices on
  the fixture), lifetime **bribe income** joined from the voting rollups
  ($3.6K / 105 paid claims on the fixture — first time surfaced per-member),
  income rate = measured ÷ months active, per-epoch accrual by pool, and the
  coverage-hole lower-bound statement.
- **LP table:** 30d per-pool value sparkline column (async from the archive).
- **Locks:** the decay picture made visual — per-lock live-VP bars against
  the dashed adjusted-potential outline (the gap IS the reclaimable), plus an
  unlock-cliff chip strip for non-auto-max locks.
- **Vote allocations:** each vote shows "earning ≈ $X/ep" — your live share
  of that pool's bribe pot, tooltip with share % and pot size.
- **Modal/drill system + tooltip pass** across every new surface; old
  bottom "Trends" honesty card folded into the chart's footer.

- **Votion layer re-pointed to the ORG feed** (`tla-core/votion/snapshots/`),
  retiring this page's read of the personal `votion-positions-data_2026`
  repo. The org feed is strictly better: hub-rate LST pricing per
  AUDIT-eris-apr-pricing (per-row price-source tag rendered), the corrected
  VP definition (fixed + boost — DP implied VP 159.5K vs the old feed's
  143.5K undercount), per-vault `holder_discovery_complete` honesty, and a
  **daily archive already running since 2026-07-16** — so the Votion card
  gains a 30d sparkline and the Votion tile a full-history drill, both from
  org dailies. Vault labels derived from the factory vdenom
  ({duration}/{vtoken}).

**P1.1 — same-day feedback round (Camron):**
- **TLA-wide VP rank**: identity now ranks across ALL lock holders from the
  org member-data snapshot (fixture wallet: #4 of 203 — the old "#1" was the
  registered subset only), with a tap-to-open **peer ladder** modal: top
  ranks + your ±4 neighbors, self-highlighted, registered names shown,
  Votion vault whales labeled.
- **ampCAPA governance position** re-attributed into LP Positions via a live
  chain read (same DAODAO voting-module + ve3 rate chain as tla-stats T3 /
  ampcapa-tool) — tagged "gov · live", excluded from summary tiles, renders
  only when the chain confirms a balance.
- **Native LUNA staking** row in Wallet Balances (live delegations read,
  validator count, valued via catalog).
- **Wallet balances v2**: live bank scan merged with the feed's cw20 set;
  same-token reads reconciled (never summed); zLUNA receipts + sub-$0.10
  dust collapsed into one line with a hover itemization; unpriced on-chain
  denoms counted, not guessed.
- **Income projection**: "if you reclaimed your +X VP" — the live pot math
  re-run at display VP + gap, with the added VP included in each pool's
  denominator (the share never pretends the pool stays the same size).
- **Income "Lifetime avg" relabel** (was "Income rate"): a wallet that
  farmed big through 2024 and holds $2 today still shows its true historical
  average — the label now says so explicitly ("reflects PAST position sizes,
  not today's"), with a recent-rate view queued behind the monthly-buckets
  derive. Sub-cent accrual rows filtered.
- **Coverage strip now derives from `sources.months_read`** (what the P&L
  builder actually read) instead of the recorded-gap note — which went stale
  the moment the 2026-08-03 rollup rebuild landed the archive-walk months
  (coverage is now unbroken 2024-08 → 2026-08; the strip proved it green
  without a code guess, and would paint real missing months red just as
  automatically). Income footer text is months-aware the same way.
- **Trend paging**: 12w range added; ◀ earlier / later ▶ window paging —
  ready to walk into the epoch-ledger history when that derive lands.

**P1.2 — second feedback round (Camron):**
- **ampCAPA gov row completed**: now carries the pool's TLA reward APR
  (base/≈amplified pair — the gov-staked receipt IS an amplified position),
  pool share = your ampCAPA value ÷ ALL ampCAPA staked in TLA (non-amp +
  amplified; gov receipts remain inside the amplified total, so that
  denominator is the whole pool — method in the hover), and the pool-level
  threshold distance. **Folded into totals**: LP tile and the banner grand
  now include the gov position (asterisked as a live read; only when
  catalog-priced, never a guessed dollar).
- **Other Cosmos chains** in Wallet Balances: sibling addresses (your terra1
  key-hash re-encoded per chain prefix — the chainscope approach) with live
  bank + staking reads on Cosmos Hub / Osmosis / Neutron. Honesty built in:
  the tooltip states the coin-type-330-vs-118 derivation caveat (an empty
  chain is NOT proof of absence), amounts stay unpriced (outside the TLA
  catalog — never guessed), empty chains fold away, Injective excluded by
  construction (different key scheme).

**P1.3 — third feedback round (Camron):**
- **NFT valuation switched to the CONSERVATIVE floor** — min(live listing
  floor, recent sales floor) per tier. Root cause of the "value too high"
  report: Atrium listings WERE captured all along (19 live, SOLID-denom) and
  set the listing floor ($50.11 base), but the ladder valued at the recent-
  SALES floor ($97.90). The lower signal is now the mark, the source used is
  named on each row, both signals shown. Banner + NFT tile follow.
- **Deep history defaults to Σ CUMULATIVE** (running total since the
  wallet's first epoch — the story view; per-epoch buckets one toggle away).
  Running total computed from e-first so paging never lies mid-history.
- **Sibling chains v2**: rest.cosmos.directory primaries with publicnode
  fallback; **pending staking rewards** per chain (distribution module);
  **manual address linking** ("link ATOM address" → saved locally,
  overrides the derived sibling) for wallets whose derivation differs —
  with an honest empty-state that offers linking instead of pretending
  absence. Native Terra staking row also gains pending rewards (priced).

**P1.4 — "make it mean something" round (Camron):**
- **"How you've done" card** (new, under the trend chart) — the honest
  bottom line: in-TLA-since fact (first epoch + real date; **the fixture
  wallet has been in since e96, TLA's literal first epoch, 2024-08-26 —
  stated as the day-one badge it is**), then three measured pieces side by
  side: what went in (zap cost, with the N-of-M coverage stated), what
  you've earned (LP yield + bribes at claim-day value), what you hold now
  (live). Plus the LUNA-terms strip (LUNA in · LUNA claimed · LUNA-equiv
  locked) — the units this crowd actually thinks in. Explicit netting
  honesty: no single up/down number until Phase C exit valuations + full
  entry costs; the earned-vs-cost ratio is shown as pieces, never a net.
- **Deep chart rebuilt as ONE continuous whole-life chart** — no more
  window paging: every epoch a point from your first epoch to today, real
  month labels on the x-axis (epoch calendar), span chips (whole life /
  last year / last 26), Σ cumulative default, and the genesis start-note
  ("e96 · TLA's first epoch (2024-08-26) — you were there day one").

**P1.5:** aDAO Treasury made viewable (richer feed record now wins the
registry merge; "🏛️ aDAO Treasury" welcome chip) — its full profile
(~$13K, 898 NFTs, locks) renders like any member. Gate 117/117.

**P2.5 — DEEP HISTORY (the heavy lift, same session):** paging ◀ past the
start of the daily archive now crosses into **epoch-ledger mode** — your
whole TLA life in epoch buckets back to e96 (Aug 2024), from the
genesis-complete flow capture: Claimed $/ep · Deposited $/ep (measured
zap-entry, lower bound) · Fees $/ep · Activity, 26-epoch windows with
◀ ▶ paging to your first epoch. Powered by the new
`tla-flows/pnl/ledger/{address}.json` product (build-pnl v2 — see
SPEC-portfolio-epoch-ledger, builder gate 22/22). On-chart honesty: value
curve absent pre-2026-06 (no pool state exists; the archive state sampler
upgrades in place), cross-unit position flags surfaced, ledger-absent
wallets get an honest empty state.

Known limits, stated on-page: the TLA daily archive covers registered members
only (others get honest empty trends); NFT value carries no daily archive
yet; Votion history begins 2026-07-16 (org archive start — earlier days are
permanently missing); income figures are lower bounds until the archive-gap
backfill.

## Rev 1.3 — 2026-07-31

- **APR cell rebuilt as the Non-Amp / Amp pair** (e.g. "72% / ≈103%", the
  figure matching the position type highlighted): Amp APY = weekly
  auto-compounding of the base reward APR — reconciles to Eris's boosted
  display within ±5%, labeled an estimate in the hover with the derivation.
- **Next-epoch estimate line** ("next ep ≈65%/≈93%", green/red) when the pool's
  committed vote shift vs the last payout is material — chain votes only,
  gauge-total drift ignored, caveats in the hover. Inputs (distributions
  last-payout VP + pool-status current VP) joined into the page load.

## Rev 1.2 — 2026-07-23

- **LP reward APR v1 (SPEC-lp-apr):** the column showed dex-side APR only
  (≈5%) while TLA emissions — the dominant yield — were absent. Now shows the
  chain-distributions reward APR (emissions ÷ pool staked) with the dex-side
  component in the hover; interim "Dex APR†" label retired.
- **xASTRO valued:** positions the feed can't price get a render-time value
  from the org token catalog (balance × catalog USD), asterisked with source +
  capture time; deliberately excluded from summary tiles until the org
  positions migration prices it at the source.
- **Claimed-yield line** on Lifetime Cost & Activity (P&L Phase B): lifetime
  claims valued as LUNA at claim-day prices, with the unmeasured-claims
  residual stated. Footer reads its phase from the rollup.

## Rev 1.1 — 2026-07-21 and earlier

- Votion positions card live end-to-end (cron v1.1.0 discovery fix); LP
  positions, wallet balances, locks, NFT holdings; measured/unvalued badges
  per the honesty doctrine. (Pre-changelog era summarized.)

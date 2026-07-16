# UI-DATA-READINESS — capture-gap audit before UI/UX week (2026-07-16)

**Purpose:** Sunday 2026-07-19 proves the capture layer; the week after is
full UI/UX build on `tla-stats.html` + the site. This audit walks every spec /
direction doc / UI log, reconstructs what the UI will need, inventories what
the org crons actually capture, and names every hole NOW so UI week is never
diverted by a missing feed.

**Inputs read (fresh checkouts 2026-07-16):** all 16 tla-core SPECs +
CHANGES_PENDING + changelogs; website-adao-core (PROJECT-DIRECTION,
SPEC-portfolio-tracker, SPEC-ai-assistant, SPEC-nft-onboarding, tla-log 361
lines); the OLD `defipatriot/cron-scripts` README (25 cron folders, 16 active)
+ its roadmap/engine notes; the live site's actual fetch URLs (every
`raw.githubusercontent` reference in aDAO-links-site); org data trees +
current-file shapes (member-data, token-catalog, dex-data ×3, tla-voting ×4,
nfts, price-history, system-health).

**Next pass (agreed, separate):** backfill audit — inventory what history we
hold vs what forward capture adds, anomaly-hunt the backfills, and design how
past+present merge in the site's charts. This doc is capture-completeness
only.

---

## 1. The headline finding

**The site today reads ~20 personal data repos; the org layer fully replaces
about half of them.** CHANGES_PENDING already knows the top of this
("tla-stats.html consumes 23 personal-repo sources, zero org data") — this
audit completes the picture: the org migration rebuilt the TLA/dex/token/NFT
*market* layers superbly, but the **per-wallet position layer, Votion, lock
intelligence, and the aDAO-dashboard feeds** still live only in the old
world. Those are exactly the feeds the flagship UI surfaces (My Portfolio,
member lens, Pools tab) sit on.

Nothing here blocks Sunday. Several things block *retiring the old crons*,
and a few block UI surfaces as designed. Every old cron keeps running until
its org replacement is verified (standing parallel-run principle) — so the
risk is not outage, it's building UI week against feeds scheduled for
deletion.

---

## 2. What the UI needs (reconstructed from the specs)

The planned surfaces and their feed classes:

- **Hook landing** (queue item: restructure #4): epoch clock (global-config
  seconds-to-epoch — live query, no capture), bribe money board
  (bribe-state ✓ + tribute capture arriving Sunday), live activity ticker
  (tla-flows events ✓ + tla-voting events ✓), leaderboard teaser
  (member-data ✓), wallet-lookup CTA (needs the per-wallet position layer —
  see gap G1).
- **My Portfolio / member lens** (SPEC-portfolio-tracker): NFTs ✓ (org nfts),
  locks/VP ✓ (member-data), **LP positions + pending rewards/rebase/bribes +
  balances + tenure (G1)**, **Votion positions (G2)**, decay/stale-VP/cliff
  intelligence (G3), daily growth series (member-data daily ✓ but only VP —
  positions daily rides G1).
- **Pools tab / Rankings** (tla-log Revs 3.1–3.48): pool state ✓ (dex-data +
  token-catalog), **epoch-series apr-history / pool-status-history (G5 — the
  rollups rebuild)**, **Eris-published APR (G4)**, **Votion now/next per pool
  (G2)**, bribes per pool ✓ (bribe-state supersedes tla_pd_bribes for chain
  truth; PD prop-context stays as curated color).
- **aDAO tab + index.html dashboards**: treasury/delegations/prop-impact =
  **dao-dashboard feed (G6)**; NFT dashboards ✓ (org nfts is rich:
  floor-history, sales-enriched, pending-claims, listing-first-seen,
  state-history, hot-set, flows, provenance).
- **Trust & Data tab**: system-health ✓ (org current.json is the D3 alert
  shape); docs hub per SPEC-adao-docs ✓ (content exists; renderer is UI
  work).
- **Slippage surfaces**: depth ✓ (dex-data reserves) + flows cost capture ✓
  (tla-flows swap-leg/slippage fields) + **depth unification defect #6**
  (open, known).

---

## 3. Old→org replacement matrix (the 25 folders)

✓ = org replacement live and verified · ◐ = partial (named gap) · ✗ = no org
equivalent · † = retired/legacy already

| Old cron/repo | Org replacement | Status |
|---|---|---|
| contract-token-catalog | token-catalog | ✓ |
| astroport / skeletonswap-lp_data | dex-data (astroport, skeletonswap) | ✓ |
| bribes-history (+ tla_pd_bribes.json) | tla-voting/bribe-state (+ tributes from Sunday) | ✓ superior |
| price-cron (+ ratio-history) | price-history + ratios | ✓ |
| nft-inventory (v2 suite) | nfts/adao (snapshots+flows+provenance) | ✓ (see §5 file map) |
| tla-flows (old repo copy) | platform-crons/tla-flows → tla-core | ✓ |
| address-catalog | address-catalog (org) | ✓ |
| system-health (old) | system-health (org, new shape) | ✓ — site re-point needed |
| tla-participants / tla-vp-holders | member-data (all wallets equal) | ✓ |
| adao-positions | member-data | ◐ **G1** — VP layer only; engine-v1.1 position payload not rebuilt |
| tla-locks | member-data / vote-state | ◐ **G3** — raw locks captured; intelligence product not rebuilt |
| votion / votion-positions | — | ✗ **G2** (queued as restructure item #5 — this audit elevates it) |
| tla-snapshot (apr-history, pool-status-history) | rollups schema 5 | ◐ **G5** — rebuild queued (#3), first materialization Sunday; confirm apr-history in scope |
| dao-dashboard | — | ✗ **G6** |
| network-and-prices | token-catalog (prices) + price-history | ◐ **G7** — live-price re-point + network stats decision |
| adao-allies | member-data (VP) | ◐ **G8** — ally membership mapping (who is a Lion/Pixel) not in org |
| backing | nfts summary/provenance | ◐ **G9** — verify live backing-per-NFT feed before retiring |
| marketplace-stats | nfts snapshots (listed counts, listing-first-seen) | ◐ **G9** |
| adao_json_storage (props: aDAO/LionDAO/Pixelions) | — | ✗ **G10** — governance-props feed |
| fuel / ampcapa | — | ✗ **G11** — niche token dashboards; decide keep/fold/sunset |
| chain / lib / dao-dashboard helpers | org lib/config | ✓ (code, not data) |
| legacy folders (†, per old README §55) | — | † nothing to do |

---

## 4. The gaps, prioritized

**Tier 1 — feeds flagship UI surfaces; build (or consciously defer with the
old cron kept alive) BEFORE or DURING UI week:**

- **G1 — per-wallet position layer** (the old capture-engine v1.1 payload):
  LP positions (pool, share %, USD, APR, active/inactive, take-exposure),
  pending rewards / rebase / bribes, wallet balances, VP spread,
  `first_participation` tenure. member-data walks the same wallets already —
  natural home is a **member-data positions extension (member-data 1.2.x)**
  lifting the engine verbatim (it lives in old `lib/capture-engine.js`).
  Feeds: My Portfolio, wallet lookup, member lens, unclaimed-earnings
  banners, Pools-tab member view. BATCH_CONCURRENCY ≤5 rule applies.
- **G2 — Votion capture**: per-vault holdings (vtoken, underlying LST, USD,
  implied VP) + per-pool Votion now/next. Already queued (restructure #5)
  and flagged in SPEC-portfolio-tracker in JUNE as "start daily-archiving
  Votion NOW" — **13 months of Votion time-series have been forfeited to
  date; every further week is lost forever** (forward-only doctrine). This
  is the single most time-sensitive gap in this audit.
- **G3 — lock intelligence** (old tla-locks product): stale-VP gap, unlock
  cliff, decay projection, auto-max detection, per-asset VP. The old README
  calls it "the highest-value capture — exists nowhere else, not even Eris."
  Raw inputs all captured (member-data locks + vote-state); the computed
  product isn't. Fold into member-data (it already enumerates locks) — the
  old cron's math + the lock-asset symbol-resolution gotcha (#3 in the old
  README) port directly.
- **G4 — Eris published per-pool APR** (old cron brief 2.10 HIGH): proven
  2026-06 that no denominator we hold reproduces Eris's APR (take-rate /
  time-weight factor we don't capture); the UI reverted to hiding APRs
  under $20K rather than show non-matching numbers. Capture Eris's published
  figure directly as `rewards.eris_apr_pct` keyed by gauge_pool_id
  (dex-data rider or token-catalog stage). Unblocks the Pools-tab APR column
  at full coverage.
- **G5 — epoch-series rollups**: pool-status-history + apr-history are what
  the Pools/Overview tabs chart. Rollups schema 5 (queued #3, first
  materialization Sunday) rebuilds pool-status-history keyed by
  gauge_pool_id — which also retires the variant-collision bug class (old
  brief 1.1) the UI patched around four separate times (Revs 3.24/3.43/3.44
  + Overview safeguards). **Verify after Sunday that apr-history is in the
  rollup scope; if not, add it.**

**Tier 2 — feeds specific pages; decide before Batch-3 re-pointing:**

- **G6 — dao-dashboard feed** (index.html main data: treasury, delegations
  incl. the moniker-resolved Lion validator, prop impact). aDAO-scope, not
  TLA. Either build an org `adao-dashboard` module or explicitly keep the
  old cron as the LAST personal survivor until the index.html migration
  (open items post Rev 3.48 already queue that page's live-layer work).
- **G7 — network-and-prices re-point**: ratio-history → org ratios ✓ done;
  the live network-and-prices.json (8 site refs — live LUNA price, network
  stats) needs consumers re-pointed to token-catalog prices; decide whether
  block-time/network stats are worth an org capture or get dropped.
- **G8 — ally membership mapping**: member-data has every ally wallet's VP
  but not WHICH wallets are Pixel Lions / Lion DAO members (DAODAO
  topStakers + PFPK names). Small address-catalog rider (the bribers rider
  queued in restructure #5 is the same pattern — do both in one touch).
- **G9 — NFT adjacents verification**: before retiring backing-data /
  marketplace-data, byte-verify org equivalents: live ampLUNA-backing feed
  (summary vs backing-data snapshots), listing-history vs
  listing-first-seen, nft-analytics contents. Likely ✓ already; verify,
  don't assume.
- **G10 — governance props** (aDAO/LionDAO/Pixelions proposals in
  adao_json_storage): inventory which cron writes these (old `chain`?),
  decide org home (an `governance/` module fits the ally story), or accept
  static.

**Tier 3 — conscious decisions, not builds:**

- **G11 — fuel / ampcapa dashboards**: keep old crons, fold into
  token-catalog, or sunset the pages. Decide during Batch-3, don't let it
  ambush.
- **G12 — epoch-boundary capture** (PROJECT-DIRECTION #5): no cron fires AT
  the flip. Sunday's distributions/vote-state work reduces the need (period
  data is chain-queryable after the fact), but epoch-over-epoch position
  growth for portfolios still wants a boundary snapshot. Post-UI decision.
- **G13 — site re-points already possible today** (cheap wins during UI
  week): old system-health-data → org system-health/current.json;
  epoch_1-300_date.json + tla_docs/tla_known_tokens → tla-core copies (docs/
  already holds epoch_1-300_date.json and tla-docs-content.json);
  bribes current-state → bribe-state.

---

## 5. Confirmed NON-gaps (checked, not assumed)

- member-data **does** archive daily (`snapshots/daily/`) — VP time-series
  accumulating since 1.0.0; G1 extends the payload, not the cadence.
- org nfts suite covers the old v2 files' core: nfts.json (10k records),
  summary, sales-enriched, floor-history, pending-claims,
  listing-first-seen, state-history, hot-set + flows + provenance.
  luna/bluna-usd-daily → price-history (F5 follow-up note stands).
- bribe-state + Sunday's tribute capture supersede bribes-history AND the
  frozen-USD tla_pd_bribes file for chain truth (PD file remains useful
  prop-context color, valued live per Rev 3.39's pattern).
- Pool risk flags, IL sensitivity, composition, threshold panels: all
  derivable from dex-data + token-catalog (the UI already proved it — "no
  new cron required", Rev 3.5).
- Credia: captured (dex-data 1.2.0), knowledge-based, take-rate hypothesis
  queued. Follow-up standing: add dex-data/credia to system-health
  FRESHNESS_MAP on next touch.
- system-health monitors the org world hourly; INV-4 arms Sunday.

---

## 6. Recommended sequencing (post-Sunday, pre/during UI week)

1. **G2 Votion capture first** — the only gap where waiting destroys data.
   One org cron (votion module: vaults + per-wallet positions + per-pool
   now/next), engine pattern exists in old `votion-positions/`.
2. **G1 + G3 together as member-data 1.2.0** — one cron touch, lift
   capture-engine + tla-locks math verbatim, mock-gate, parallel-run vs old
   adao-positions/tla-locks outputs, then those two old crons retire.
3. **G5 verification** rides Sunday's flip review (is apr-history in rollup
   scope?).
4. **G4 Eris APR** — small capture rider, big UI unlock.
5. **Batch-3 re-pointing** proceeds page-by-page during UI week with this
   doc's matrix as the checklist; G6–G11 decisions made as each page is
   touched, never mid-surprise.

Each gap that becomes a build gets its own SPEC/plan + approval per standing
process — this doc is the map, not the authorization.

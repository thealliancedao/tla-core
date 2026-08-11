# PROJECT STATUS — TLA Stats (as of 2026-07-21)

The single snapshot of where everything stands. Read this first when picking up
work. Pairs with PROJECT-DIRECTION.md (the roadmap) and CHANGELOG.md (the history).

---

## 🟢 LIVE & VERIFIED (committed, running, confirmed in production)

### July arc — briber board → SITE GO-LIVE → votion fix (2026-07-15 → 07-21)
The public surface is LIVE at canonical URLs: **tla-stats.html** (restructured
page: chunked-expander leaderboards, Top Bribers with MEASURED banner, lock-#
OG tiebreak, volume epoch-fallback) and **member-portfolio.html** (rank scope
label, LIVE Votion positions card with coverage honesty guard); legacy stats
preserved as tla-stats-legacy.html. Data layer: org-tla-voting **2.3.1**
(v6.1 — governance-bribe capture + dao_attr attribution, gate 116/116 on PD
fixture 402AE7B1…), FCD re-derive recovered **2,640 contract-initiated bribes
to TLA genesis** (rollup schema 6, wallets.json labels live on the board).
votion-positions **v1.1.0** fixed tx-retention-blind holder discovery
(catalog-union sweep, measured completeness, real TVL — 18 holders surfaced,
fixture-verified). Full trail: tla-core CHANGES_PENDING (07-17→07-21) +
tla-log.md Rev 4–5.5. **Next (Portfolio Arc):** VP model audit (tile 1.31M vs
banner 1.18M), APR/price-source audit, SPEC-portfolio-pnl, design pass; then
SPEC-landing-pulse, 5xx publish-retry hardening, old-cron retirement ledger.

### tla-core unified migration — foundation crons (2026-06-25)
First who/what/price modules live in the unified `tla-core` repo (+ `fuel/` pilot):
**address-catalog** (WHO, 389 addresses), **contract-token-catalog** (WHAT),
**price cron** (token prices, clean), plus **tier-builder** (history engine) and
docs centralized in `tla-core/docs/`. Audit + handoff: **`TLA-CORE-STATUS.md`**.
Known defect: the 3 new crons need realigning to the `module/product/files` +
`index.json` layout (fuel is the reference). Next: realign → land `tla-flows` →
build self-contained `token-catalog` + `DEX-Data` (lift code, run parallel, retire old).

### Data capture (18 crons → 18 data repos)
All core crons live and publishing. Daily archives accumulating on votion-positions,
adao-allies, tla-participants (started 2026-06-14). nft-inventory healthy (10k NFTs,
0 errors, writes data/v2/). Full inventory + schedules in SYSTEM-AUDIT-AND-OPS.md.

### Pricing (network-and-prices) — Pricing Doctrine Rev 1
Smart price selection LIVE: hub-ratio (LUNA × on-chain Eris ratio) is primary for
Tier-2 tokens; single-pool price is a weak cross-check that flags but never
overrides. Verified arbLUNA $0.1553 ≈ CoinGecko $0.1523. Doctrine in
PRICING-DOCTRINE.md. arbLUNA/ampLUNA/bLUNA/ampCAPA/ampROAR all correct.

### Registry (tla-chain-registry)
45 known contracts (added 6 Votion vaults + polytone-proxy 2026-06-14). The
tla-registry cron bootstraps from global-config, publishes a master directory,
daily-archives. Curated layer: known_contracts, wallets, acquisition_guides,
curation-candidates.

### System Health Monitor — Rev 1 (LIVE)
system-health cron reads all heartbeats, scores confidence, pings endpoints,
publishes system-health.json every 30 min. Currently ~92% confidence. Found real
issues (heartbeat-path mismatches, since fixed). Error-reporter sanitizes errors
(strips tokens/creds/paths — adversarially tested) so failures surface safely.

---

## 🟡 BUILT — AWAITING COMMIT / DEPLOY (done, tested, not yet live)

- **Transparency Hub** (`transparency-hub.html`) — 4 tabs: Updates (reads
  CHANGELOG.md), Docs (browses website-adao-core), System Health, Endpoints.
  Supersedes standalone system-health.html. NEEDS: commit + the endpoint-pinging
  system-health.js committed & run so the Endpoints tab populates.
- **system-health.js with endpoint checks** — updated version pings 7 external
  endpoints. The LIVE monitor is still the older version (no endpoints array) —
  commit the new one + re-run.
- **error-reporter.js** (`lib/`) — the sanitizer. Wired into votion-positions as
  the template. Roll out to other crons as fast-follow.
- **portfolio-assembler.js + portfolio-alerts.js** (`lib/`) — join all sources
  into one per-address portfolio + alerts. Tested against real data ($7,508
  portfolio, 1.09M VP, 3 alerts). Refinements noted: NFT backing_usd, ally join.
- **my-portfolio.html** — save-address portfolio tracker page (read-only,
  localStorage). Uses inlined assembler+alerts.
- **CHANGELOG.md** — seeded with this session's revs.

---

## 🔴 PENDING / OPEN ITEMS

- **bribes-history cadence** — monitor flags it "down 18h" because cadence set to
  4h. Confirm real cadence; loosen if it runs less often. (Likely a false alarm.)
- **ampcapa, backing** — write no heartbeat → can't be health-monitored. Add a
  heartbeat write to each (small).
- **index.html old-epoch fallback reads** — still falls back to old epoch JSONs;
  convert to adao-positions + dao-dashboard (see SYSTEM-AUDIT cleanup section).
- **dao_tla_deposits.html** — still reads tla-data-epoch-N-end.json (snapshot
  modal migration).
- **Dead repos to delete** (confirmed 0 live refs): astroport_json_storage,
  archive-storage, nft-tracker, transaction-tracker, adao_nft-tx_2025,
  aDAO-Image-Planets-Empty; + tla_json_storage/tla-ext_json_storage/adao_json_storage
  after index.html converted off them.
- **Footer wiring** — Rev/ChangeLog/SystemHealth/Contact links across pages (this session).
- **Test-page tiles** — dynamic test.html tiles on tools page (this session).

---

## 📐 KEY DOCTRINES (don't re-derive — these are settled)

- **Pricing:** Tier-1 (LUNA/wBTC/USDC/ATOM) → CoinGecko direct. Tier-2 (LSTs,
  small tokens) → base price × on-chain ratio. Thin pools flag, never override.
- **LP/ampLP valuation:** by SHARE FRACTION (`staked/total × pool_usd`), never a
  per-unit price. Token prices in the price layer; positions valued in the positions module.
- **Cron timing:** foundation (prices, registry) first; bribes before participants;
  most data is continuous (snapshot anytime); only epoch-bound data needs boundary
  timing. DeFi Patriot sets schedules in Render.
- **Data correctness:** verified sound — no zeroing needed. adao-positions schema
  evolved (46→156 members ~06-13); charts use stable totals.* fields.
- **Workflow:** full-file replacements only (never partial edits). Verify each
  cron heartbeat path against production before trusting it. Check committed state
  before handing files.
- **Changelog discipline:** don't update continuously. Finish work, THEN package
  the changelog + commit docs before moving on.

---

## 🗺️ WHERE THE BODIES ARE (gotchas learned this session)

- nft-inventory writes heartbeat to `data/v2/heartbeat.json` (not data/).
- fuel writes heartbeat to `snapshots/heartbeat.json`.
- votion (weekly system snapshot) ≠ votion-positions (daily per-user) — keep both.
- tla-snapshot + dao-dashboard share a repo but write different files — fine.
- GITHUB_REPO env must include `defipatriot/` owner prefix.
- All commit tokens expire end-2026 — rollover checklist needed (Nov 2026).
- Repos are `*-data_2026` — year-rollover plan needed (recommend year-folders like
  tla-chain-registry already uses).

# SPEC — votion capture (org module, G2 from UI-DATA-READINESS) — 2026-07-16

**Status:** spec for approval. No code until approved.
**Why now:** the only audit gap where waiting destroys data — Votion holdings
have no daily archive anywhere; every un-captured week is lost forever
(forward-only doctrine). SPEC-portfolio-tracker flagged this in June.
**Lifts from (proven code):** old `cron-scripts/votion-positions/` (vault
discovery, holder reconstruction, valuation) and `cron-scripts/votion/`
(per-epoch optimizer capture). Old crons stay running in parallel until this
module's output is verified, then retire with their data repos.

## What Votion is (context, one paragraph)

A liquid-lock wrapper around veLUNA: users deposit an LST into a vault
({LST} × {duration} matrix, code_id 3677, label `votion-la`), receive a
factory v-token, and the vault pools everything into ONE veLUNA lock it owns
— auto-voting to chase bribes and auto-compounding payouts into the LST.
Votion users are invisible to every other cron (their position hides inside
the vault's single lock NFT); this module makes them visible and
re-attributes the "anonymous whale" locks to real users.

## D1 — One cron, three cadence branches (self-escalating by clock)

New module `votion/`: cron in `platform-crons/votion/`, data in
`tla-core/votion/`. ONE Render job; the run inspects the clock (and its own
heartbeat) to pick the branch — never separate jobs per cadence.

**Branch A — vaults (every run, hourly, ~15–20 LCD queries):**
1. Discover vaults: LCD `cosmwasm/wasm/v1/code/3677/contracts`
   (self-maintaining), seed-list fallback if the listing fails. Per vault
   read `config` → LST cw20, vdenom, lock_id, protocol_fee.
2. Per vault: `{state:{}}` → `staked` (total underlying LST — byte-matches
   Votion's own UI, proven); vdenom `supply/by_denom` → exchange rate =
   staked ÷ supply (LST per v-token); escrow `lock_info{token_id: lock_id,
   time:'next'}` → the vault's VP (fixed + voting_power per
   SPEC-vp-definition-fix — TOTAL, not boost).
3. **Per-pool Votion NOW — chain, not API:** gauge controller
   `user_info` for each vault's lock owner → the vault's current gauge
   votes; weight × vault VP, summed across vaults per pool = Votion VP per
   pool right now. This replaces the API-derived "Votion Now" the Pools tab
   uses, from chain truth.
4. Write `votion/snapshots/vaults.json` (vault list, rates, VP, TVL, per-pool
   NOW rollup) and append one point per run to
   `votion/history/{YYYY}/{MM}.json` (monthly array doctrine): timestamp,
   per-vault {staked, rate, vp} — the series that later yields REALIZED
   compounding APY per vault (old v1.2 goal, becomes a pure derivation).

**Branch B — positions (daily, LCD-heavy, concurrency ≤5):**
1. Holder discovery: factory denoms have no `all_accounts`, so reconstruct
   from deposit events — `tx_search wasm._contract_address='{vault}' AND
   wasm.action='votion-la/deposit'` → recipients. **Improvement over the old
   full re-walk:** keep `votion/holders-registry.json` (set of ever-seen
   holders per vault + a tx_search page cursor); each daily run fetches only
   new pages and unions. Registry only grows; balances decide who is
   *current*. publicnode tx_search gotcha applies (no height filter in the
   query — 400; window client-side, DESC paging, null page ≠ empty page).
2. Per holder: vdenom bank balance × exchange rate = underlying LST;
   USD via **token-catalog prices** (hub-ratio primary per
   PRICING-DOCTRINE), each holder row tagged `underlying_usd_price_source`.
   The arbLUNA lesson is preserved: arbLUNA trades ~market, not hub-ratio —
   we surface the source tag rather than silently choose (proper market-feed
   fix tracked in token-catalog, not here). Share of vdenom supply × vault
   VP = implied VP. Zero-balance holders drop from current, stay in
   registry.
3. Write `votion/snapshots/current.json` (per-vault holders: vtoken,
   underlying LST, USD + source tag, share %, implied VP) and
   `votion/snapshots/daily/{YYYY-MM-DD}.json` — **the archive this whole gap
   is about.** No names in this cron — identity joins downstream via
   address-catalog (PFPK rider queued separately).

**Branch C — optimizer projection (v1.1, NOT in first build):**
The old `votion` cron's scope — Eris Votion API
(`backend.erisprotocol.com/votion/liquidity-alliance/{lockup}/optimization`)
per-lockup current-vs-optimized allocation, captured pre-flip. Third-party
API data, labeled as source-provided. Deferred one rev because: (a) v1's
chain-pure NOW covers the Pools tab's live number; (b) the old cron still
runs Sundays and keeps capturing NEXT in parallel; (c) the hourly schedule's
last pre-flip run (~23:10) is 50 min early vs the old 23:55 precision — the
right shape for C needs a small design decision (accept 23:10, or a
Sunday-only second schedule, which bends the one-job doctrine). Decide at
v1.1 with the old cron's data as the comparison baseline.

## D2 — Verdicts, failure semantics (old F-rules preserved)

`partial` status if any vault's holder discovery was incomplete or a vdenom
supply read failed; `error` if zero vaults resolve. Failed reads are
recorded per-vault in `_errors`; `entries:null` (failed) ≠ `entries:[]`
(none) — never fake an empty. Heartbeat carries per-branch status +
last-run stamps (`vaults_at`, `positions_at`).

## D3 — Outputs (tla-core/votion/)

- `snapshots/vaults.json` — hourly vault system view + per-pool NOW rollup
- `snapshots/current.json` — daily per-holder positions
- `snapshots/daily/{date}.json` — the daily archive
- `history/{YYYY}/{MM}.json` — hourly vault-state series (monthly arrays)
- `holders-registry.json` — ever-seen holders + discovery cursors
- `heartbeat.json`

## D4 — Gates (binding)

Mock gate before deploy: fixtures from real probe payloads (vault config,
state, lock_info, a deposit tx_search page, bank balances) covering: happy
path both branches; vault-discovery fallback to seed; one vault's holder
paging failing → `partial` + others intact; zero-balance holder dropped from
current but retained in registry; registry cursor advance only on complete
pages; NOW rollup math; price-source tagging; history append never-shrink.
Then a live dry run against chain via captured responses (I cannot reach
LCDs from the sandbox — DeFi Patriot runs 4–6 probe URLs once, pasted back,
which double as fixture truth). Parallel-run: first live outputs compared
against the old votion-positions current.json before any old-cron
retirement.

## D5 — system-health rider (next touch, with credia's)

Add `votion` to FRESHNESS_MAP: vaults.json 6h, current.json 30h.

## Deploy

Render cron `org-votion`, hourly at :20 (after dex/token at :00, health at
:10). Env: `GITHUB_TOKEN` (rw tla-core). Node stdlib only.

## Open decisions for approval

1. Branch C deferral to v1.1 (recommended) — or include the Eris API capture
   in v1?
2. Hourly vault-history cadence (recommended — it's ~15 queries and buys the
   realized-APY series) — or daily-only to start?
3. Probe list: I'll produce the exact clickable URLs (vault listing, one
   config/state/lock_info set, one tx_search page, one balance) on approval.

# On-Chain Queries Reference — aDAO / TLA tooling

> **What this document is.** A complete catalog of every on-chain query relevant to TLA tooling: what the cron currently does, what Chainscope exposes by default for each contract, what custom queries we want to build into future tools, and — most importantly — the **human-readable label**, **input shape**, and **expected output** for each one.
>
> **Why it exists.** The end goal is a query tool that lets a TLA participant ask plain-English questions like *"What does this pool hold right now?"* or *"What's my voting power decay schedule?"* — and have it work better than visiting Chainscope and pasting raw JSON. To build that, every query needs a documented input contract, output contract, and what it powers downstream.
>
> **How to maintain.** When the cron adds a new query, or we discover a new contract method, or we want to add a future tool query, **append it here**. When inputs or outputs change shape upstream, update the example block. Treat this file as the single source of truth for *"what can we ask the chain about TLA, and what comes back."*
>
> **Home:** `tla-core/docs/` (moved from `website-adao-core` 2026-07-14 per SPEC-docs-consolidation — fits the static-reference charter).
>
> ⚠ **VP definition law (chain-confirmed 2026-07-13, SPEC-vp-definition-fix):** everywhere the escrow/gauge returns both `voting_power` and `fixed_amount`, the actual voting power is **`vp = fixed_amount + voting_power`** — and the money follows `vp` (the gauge's `distributions` payout record carries fixed+boost totals). Any consumer summing `voting_power` alone is ~11% low (worse for short locks). Applies to `total_vamp`, `lock_info`, `user_info`, and `gauge_infos` below.

---

## How to read this doc

Each contract has its own section. Inside each section:

- **Address** — the on-chain address on Terra phoenix-1
- **Role** — what this contract does
- **Default queries (Chainscope)** — queries you can run with no input customization, that Chainscope's default "smart query" panel exposes
- **Custom queries** — queries we use that need input parameters (and what those parameters are)
- **Pagination notes** — for queries that return cursor-paginated lists
- **Gotchas** — known traps for callers

Each query block has the same shape:

```
Q-{Contract}-{Method}
  Human label:   "<plain-english version we'd surface in a UI>"
  Used by:       <which cron/tool needs this today>
  Input shape:   <raw JSON message>
  Inputs:        <what the user/caller fills in>
  Output shape:  <what comes back from the chain, abbreviated>
  Powers:        <what features/insights this query enables>
  Notes:         <gotchas, retry behavior, etc.>
```

---

## Calling pattern (LCD smart query)

All queries below are CosmWasm smart queries via Terra's public LCD:

```
GET https://terra-lcd.publicnode.com/cosmwasm/wasm/v1/contract/{addr}/smart/{base64(query_json)}
GET https://terra.publicnode.com/cosmwasm/wasm/v1/contract/{addr}/smart/{base64(query_json)}
```

The cron uses **two endpoints** for resilience — if one times out or rate-limits, retry on the other. See `Critical data-capture gotcha — Silent coercion hides cron query failures` in `PROJECT_KNOWLEDGE.md` for the canonical retry+backoff pattern.

For native bank queries (LUNA, IBC tokens, factory denoms) — that's the bank module, not smart queries:

```
GET /cosmos/bank/v1beta1/balances/{address}
GET /cosmos/bank/v1beta1/balances/{address}/by_denom?denom={url-encoded}
```

---

# Contract Registry

## 1. Eris Global Config (root discovery contract)

**Address:** `terra1hwxg6s732eparz3ys7sa4t5f64ngpd2w8syrca6z7ckv3fs9uqnsvrpcqa`
**Role:** Eris's root config contract. Holds the addresses of every other Eris-protocol-affiliated contract — gauge controller, voting escrow, asset compounder, all four asset-staking buckets, the bribe manager, etc. **This is where every catalog run starts** — fetch the address book once, derive everything else.

### Default queries (Chainscope)

#### Q-GlobalConfig-AllAddresses
- **Human label:** "What are all the Eris/TLA contract addresses?"
- **Used by:** `tla-registry` cron (Q1, always first)
- **Input shape:** `{ "all_addresses": {} }`
- **Inputs:** (none)
- **Output shape:**
  ```json
  {
    "asset_gauge": "terra1hfks...",
    "voting_escrow": "terra1uqhj...",
    "asset_compounder": "terra1zly9...",
    "bribe_manager": "terra1tuuw...",
    "asset_staking__bluechip": "terra14mmv...",
    "asset_staking__stable":   "terra1v399...",
    "asset_staking__project":  "terra1awq6...",
    "asset_staking__single":   "terra1qdz5..."
  }
  ```
- **Powers:** Every downstream query in the catalog. Without this, the cron can't even start.
- **Notes:** If this returns null, the whole run aborts (`global-config.all_addresses returned null — both LCDs failed`). No fallback — without the address book we don't know which other contracts to call.

---

## 2. TLA Asset Gauge (the voting heart of TLA)

**Address:** `terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj`
**Role:** Records every member's vote allocations per epoch. Computes per-pool distribution percentages, holds gauge configuration (epoch length, vote-weight curves), publishes distribution snapshots.

### Default queries (Chainscope)

#### Q-AssetGauge-Distributions ⭐ the payout ledger (updated 2026-07-13/14)
- **Human label:** "What was each pool's finalized reward split for period P?"
- **Used by:** `org-tla-voting` forward capture + the one-shot distributions harvest (`tla-core/tla-voting/distributions/history.json`); previously `tla-registry` cron (Q2, current period only).
- **Input shape:** `{ "distributions": { "time": { "period": <P> } } }` — omit `time` for the latest finalized period.
- **Inputs:** optional `period` (any finalized period from the floor upward)
- **Output shape (all four gauges in ONE call):** per gauge: `total_gauge_vp` + per-pool `{ asset, distribution (fraction of the gauge pot), total_vp }`.
- **Powers:** The finalized payout split per period — the record rewards are actually paid against; the de-facto whitelist (pools voted-for but absent here earn nothing = "wasted VP"); the canonical historical per-pool VP/pct record; cross-validation ground truth for the vote/lock event streams.
- **Notes (locked in 2026-07-13, harvest-proven 2026-07-14):**
  - **The contract retains FULL per-period history in queryable state** — any public LCD answers deep-history periods instantly (period 120, inside the events dead zone, verified). No block scanning, no archive node, ~1 query per period.
  - **Genesis floor = period 96** (period 95 returns empty pre-genesis state — floor certificate in `tla-voting/distributions/index.json`). 98 periods (96→193) harvested gap-free 2026-07-14.
  - **Epoch mechanics:** votes during epoch N tally live in `gauge_infos(time:"next")`; at the Sunday flip they freeze into `distributions(period N)`; rewards for N pay during N+1. **Contract `period` == the UI epoch number** (1-indexed, matches `epoch_1-300_date.json`).
  - Per-pool `total_vp` here = fixed + boost (see the VP definition law in the header). `distributions ≈ gauge_infos` boost+fixed at the flip; the small residual = votes cast between period flip and query time (verified against our own vote-events).
  - Hard invariant: fractions per gauge sum to 1.0 ± 1e-9 for every period (violation = do-not-publish).
  - Below-threshold and dewhitelisted pools are NOT here — that's why we also need `whitelisted_asset_details` from each bucket's staking contract (see §5).

#### Q-AssetGauge-LastDistributionPeriod
- **Human label:** "What epoch are we in right now?"
- **Used by:** `tla-registry` cron (Q3) — provides canonical epoch
- **Input shape:** `{ "last_distribution_period": {} }`
- **Inputs:** (none)
- **Output shape:** integer — the **last FINALIZED period** (= current in-progress epoch − 1).
- **Powers:** `canonicalEpoch` field in `current.json`; epoch alignment across crons; the forward distributions capture's `last_captured_period == current_period − 1` self-heal check.
- **Notes (explanation corrected 2026-07-13):** the contract's `period` numbering IS the 1-indexed UI epoch number (matches `epoch_1-300_date.json`) — the earlier "0-indexed, add 1" reading was a misinterpretation. The `+1` the crons apply is still arithmetically correct because this query returns the *last finalized* period, and `+1` yields the current in-progress epoch. Don't change any code; just know *why* the +1 works. **Off-by-one trap** — was the source of the May 2026 epoch numbering fix.

#### Q-AssetGauge-Config
- **Human label:** "What are the gauge settings (epoch length, vote weights, etc.)?"
- **Used by:** `tla-registry` cron (Q4)
- **Input shape:** `{ "config": {} }`
- **Inputs:** (none)
- **Output shape:** `{ owner, epoch_length_s, vote_weight_curve, ... }`
- **Powers:** Diagnostic — confirms gauge contract hasn't been reconfigured.

### Custom queries (require inputs)

#### Q-AssetGauge-Votes
- **Human label:** "How did this member vote this epoch?"
- **Used by:** Not currently in `tla-registry` cron; **wanted by future Vote Intelligence tool**
- **Input shape:** `{ "votes": { "user": "terra1...", "period": <epoch> | null } }`
- **Inputs:** `user` (member's wallet), optional `period` (epoch number, default = current)
- **Output shape:**
  ```json
  {
    "votes": [
      { "asset": {"cw20": "terra1..."}, "bps": 5000 },
      { "asset": {"native": "uluna"}, "bps": 3000 },
      { "asset": {"cw20": "terra1..."}, "bps": 2000 }
    ],
    "total_voting_power": "..."
  }
  ```
- **Powers:** Per-member voting history; coalition detection; "is this member voting in their own interest" analysis.

#### Q-AssetGauge-GaugeInfo
- **Human label:** "How much VP voted for this specific pool, and what's its current rate?"
- **Used by:** Not in cron today; **wanted by Pool Detail view**
- **Input shape:** `{ "gauge_info": { "gauge_pool_id": "<cw20:...|native:...>", "period": <epoch> | null } }`
- **Inputs:** `gauge_pool_id` (the canonical pool ID from `pools[]`), optional `period`
- **Output shape:** `{ vp_voting_for_pool, current_rate, take_rate, ... }`
- **Powers:** Per-pool VP attribution; "who's voting for this pool" panel.

#### Q-AssetGauge-GaugeInfos ⭐ live tally per bucket (added 2026-07-13)
- **Human label:** "What's the LIVE per-pool vote tally for a bucket, for the in-progress period?"
- **Used by:** VP-definition-fix evidence probes; the acceptance test (gauge_infos vs TLA UI bucket tab, ≤2 min apart).
- **Input shape:** `{ "gauge_infos": { "gauge": "<stable|project|bluechip|single>", "time": "next" } }` — `time:"next"` = the in-progress period's live tally (what the UI shows); also accepts `"current"` / `"last"` / `{ "period": N }`.
- **Output shape:** per pool: `{ asset, voting_power, fixed_amount, slope }`.
- **Powers:** Live per-pool VP = `voting_power + fixed_amount` (the VP definition law — we had been receiving `fixed_amount` in every response and discarding it). `slope` = per-pool VP decay forecasting, a free metric. Predictive test 2026-07-13: 9/9 project pools boost+fixed = UI, incl. LUNA-stLUNA to 5 sig figs.
- **Notes:** Ghost pools (e.g. wstETH-SS, wBTC.osmo-*) can appear here while absent from `distributions` — label them `unlisted_no_distribution`, never mix into listed-pool pct math.

#### Q-AssetGauge-UserFirstParticipation ⭐ tenure
- **Human label:** "What's the first epoch this wallet ever voted in?"
- **Used by:** Not in cron today; **wanted by Portfolio Tracker / member tenure.** *(This query was missing from the catalog until 2026-06-13 — it exists on-chain and is exposed in `tla-chain-queries.html`. It corrected an earlier assumption that first-participation had to be forward-accumulated; it does NOT — the gauge contract tracks it natively.)*
- **Input shape:** `{ "user_first_participation": { "user": "terra1..." } }`
- **Inputs:** `user` (wallet)
- **Output shape:** `{ period }` — the epoch number; map to a date via `epoch_1-300_date.json` (canonical epoch↔date schedule, epochs 1–300, in `website-adao-core`).
- **Powers:** Address-level tenure / early-user signal. **Important:** this is "first epoch *voted*," not "first held an NFT" or "first locked" — so it's the meaningful participation date, not a token-ownership artifact. Edge case: a pure lock-holder who never cast a vote may return empty/none — fall back to the lock's `start` period (Q-VotingEscrow-LockInfo) for those.
- **Verified:** DAO main wallet (`terra1sffd4…m5vzm`) → `{period:120}` = week of 2025-02-10 (~16 months tenure as of epoch 189).

#### Q-AssetGauge-UserShares
- **Human label:** "What's this wallet's share of each pool's voting power?"
- **Used by:** Not in cron today; **wanted for member % influence** (use THIS for live per-pool member %, not user_info).
- **Input shape:** `{ "user_shares": { "user": "terra1..." } }`
- **Inputs:** `user` (wallet)
- **Output shape:** Array per-gauge: `{ asset, period, user_vp, total_vp }`
- **Powers:** Live percentage influence in each pool per member.

#### Q-AssetGauge-UserInfo ⭐ per-wallet VP (verified 2026-07-13; gauge_votes shape pinned 2026-07-15)
- **Human label:** "What's this wallet's total voting power right now?"
- **Used by:** VP-definition-fix evidence (probe P3); **org-tla-voting vote-state harvest** (the per-period completeness + attribution layer — SPEC-tla-voting-capture-fix §3).
- **Input shape:** `{ "user_info": { "user": "terra1...", "time": "next" } }`
- **Inputs:** `user` (wallet), `time` (`"next"` = current live tally)
- **Output shape:** `{ voting_power, fixed_amount, slope, gauge_votes, ... }`
- **`gauge_votes` entry shape (CHAIN-PINNED 2026-07-15, first live vote-state harvest — 203 wallets):** `{ gauge, period, votes: [[asset, bps], …] }` — **the stamp field is `period`** = the vote period in which that gauge allocation was last set. Any entry stamped P means that actor voted in P — this is what makes wrapped/contract-path votes (Votion vaults, DAO DAO, Polytone) attributable from state when events cannot see them. Stamps carry only the LAST vote per gauge (older history is never emitted by the chain). Live proof: the 5.97M-VP whale's silently-dropped project vote came back stamped `191`; 19 wallets stamped `193` matched the finalized period exactly.
- **Powers:** Wallet-level VP = `voting_power + fixed_amount` — verified: 1,179,504.21 + 131,056.04 = 1,310,560.25 = the UI's "1.31M VP" exactly. `gauge_votes` = the wallet's current vote allocations WITH period stamps (feeds vote-state records, voter-churn, votes-on-dead-LPs metrics).
- **Notes:** summing `voting_power` alone was the platform-wide ~11% undercount fixed 2026-07-14 (SPEC-vp-definition-fix).

#### Q-AssetGauge-UserPendingRebase
- **Human label:** "How much unclaimed rebase (ampLUNA) does this wallet have?"
- **Used by:** `adao-positions` cron (portfolio `pending_rebase`).
- **Input shape:** `{ "user_pending_rebase": { "user": "terra1..." } }`
- **Inputs:** `user` (wallet)
- **Output shape:** `{ rebase }` (ampLUNA micro-units)
- **Powers:** The rebase line in member/DAO unclaimed rewards.

---

## 3. TLA Voting Escrow (vAMP / TLA Locks)

**Address:** `terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg`
**Role:** CW721 NFT contract — every TLA lock is one NFT. Each token has a voting power amount, a lock start period, a lock end period, and an owner. **Total locks today: 431 (verified 2026-06-13 via `num_tokens`).** Note: lock count ≠ holder count — some wallets hold multiple locks. The contract is CW721-enumerable (`all_tokens`), name "Vote Escrowed LUNA" / veLUNA.

### Default queries (Chainscope)

#### Q-VotingEscrow-NumTokens
- **Human label:** "How many TLA locks exist in total?"
- **Used by:** `tla-registry` cron (Q5) for sanity check
- **Input shape:** `{ "num_tokens": {} }`
- **Inputs:** (none)
- **Output shape:** `{ count: <integer> }`
- **Powers:** Sanity check on `all_tokens` paginated walk; sizing for "X members locked" displays.

### Custom queries

#### Q-VotingEscrow-AllTokens (paginated)
- **Human label:** "List every TLA lock NFT (oldest to newest)"
- **Used by:** `tla-registry` cron (paginated walk after Q5)
- **Input shape:** `{ "all_tokens": { "limit": <int>, "start_after": "<token_id>" | omitted } }`
- **Inputs:** `limit` (max 100 per page; we use 30), `start_after` (last token_id from previous page, or omitted on first page)
- **Output shape:** `{ tokens: ["1", "2", "3", ...] }` (array of token_id strings)
- **Powers:** Member enumeration; portfolio scans; "who owns this lock" lookup.
- **Pagination:** Walk until `tokens.length === 0`. Use `start_after` = last token_id of previous response.

#### Q-VotingEscrow-LockInfo (expanded 2026-07-13/14 — full verified shape)
- **Human label:** "What does this specific TLA lock contain (VP, multiplier, end date, owner)?"
- **Used by:** capture layer (member-data / capture-engine query every lock each run); previously `tla-registry` cron per-token after enumeration
- **Input shape:** `{ "lock_info": { "token_id": "<id-as-string>", "time": "current" } }` — `time` accepts `"current"` / `"next"` / `"last"` / `{ "period": N }`
- **Inputs:** `token_id` (string; even though it's numeric, pass as string), optional `time`
- **Output shape:**
  ```json
  {
    "owner": "terra1...",
    "asset": { "info": { "cw20|native": "..." }, "amount": "..." },
    "underlying_amount": "...",     // ratio FROZEN at lock/last-touch time (the stamp)
    "coefficient": "9",             // boost multiplier tier = 9 × (lock_weeks / 104)
    "start": { "period": 100 },
    "end":   { "period": 200 } | "permanent",
    "slope": "...",                 // exact boost decay per week (0 = auto-max)
    "voting_power": "...",          // boost component = underlying_at_lock × coefficient
    "fixed_amount": "..."           // fixed component = underlying_at_lock × 1
  }
  ```
- **Powers:** Per-lock **total VP = `fixed_amount + voting_power`** (the VP law); auto-max detection (`end=="permanent"` && `slope==0`); multiplier per lock (`1 + coefficient`, from the curve `1 + 9×wk/104`); stale-VP gap (`amount × current_ratio × (coefficient+1)` vs frozen components); dormant-lock detection (end period in the past, never withdrawn); decay schedule; participation order (ascending `token_id`).
- **Notes:** amounts in base units (÷1e6 for human display). Any touch (extend_amount / extend_time / merge) restamps BOTH components at today's LST ratio — restamp events are in the tla-voting lock-events stream (13,610 to genesis).

#### Q-VotingEscrow-Tokens (owner's locks)
- **Human label:** "What locks does this wallet own?"
- **Used by:** Not in cron today; **wanted by Portfolio Tracker**
- **Input shape:** `{ "tokens": { "owner": "terra1...", "limit": 30, "start_after": "<token_id>" | omitted } }`
- **Inputs:** `owner` (wallet address), optional pagination
- **Output shape:** `{ tokens: ["123", "456"] }`
- **Powers:** "Show me MY locks" — without scanning every NFT in existence.

#### Q-VotingEscrow-UserInfo (⚠ unverified shape)
- **Human label:** "What's this user's total voting power and lock summary?"
- **Used by:** Not in cron today
- **Input shape:** `{ "user_info": { "user": "terra1..." } }`
- **Notes:** the output shape recorded here previously (`{total_voting_power, lock_count, locks}`) was never chain-verified. The VERIFIED per-wallet VP query is **Q-AssetGauge-UserInfo** (§2) — use that. Probe this one before relying on it.

#### Q-VotingEscrow-TotalVamp ⭐ canonical system VP (verified 2026-07-13)
- **Human label:** "What's the total TLA voting power right now (and at a future period)?"
- **Used by:** `member-data` 1.1.0 (publishes `system.total_tla_vp` as CANONICAL); VP-definition-fix evidence (probe P4); tla-locks decay projection.
- **Input shape:** `{ "total_vamp": {} }` — projection: `{ "total_vamp": { "time": { "period": <N> } } }` (**NOT `at_period`** — rejected variant).
- **Inputs:** optional future `period`
- **Output shape:** `{ "fixed": "...", "voting_power": "...", "vp": "..." }` — `vp = fixed + voting_power` **by the contract's own definition**.
- **Powers:** Canonical "Total TLA VP" = `total_vamp.vp` (≈27.96M at verification, = the TLA UI header; the old "max bucket ≈ 24M" convention is retired). A handful of future-period calls = the whole-system VP decline curve without simulating per-lock slopes.
- **Notes:** bucket-tally-vs-total comparisons are only valid like-for-like by period — a period-N freeze may legally exceed the current `total_vamp`.

---

## 4. TLA Asset Compounder (the amplp factory)

**Address:** `terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx`
**Role:** Eris's compounder factory. Creates and manages every amplp wrapper. **65 vaults today.** Each vault wraps an underlying LP token (or single-asset stake) and auto-compounds rewards back into more LP.

### Default queries (Chainscope)

#### Q-AssetCompounder-AssetConfigs
- **Human label:** "What amplps exist and what LPs do they wrap?"
- **Used by:** `tla-registry` cron (Q6) — drives `amplp_mappings`
- **Input shape:** `{ "asset_configs": {} }`
- **Inputs:** (none)
- **Output shape:**
  ```json
  [
    {
      "amp_denom": "factory/.../LUNA-USDC-ampLP",
      "asset_info": { "token": { "contract_addr": "terra1..." } },
      "gauge": "stable",
      "zasset_denom": "...",
      "reward_asset_info": { "cw20": "..." } | { "native": "..." },
      "fee": null | { "override_fee": "0.05" }
    }, ...
  ]
  ```
- **Powers:** The entire amplp layer of the catalog; lp_to_amplp index; "is this LP wrapped?" lookup.
- **Notes:** `asset_configs[].gauge` is the bucket NAME (`'single'`, `'stable'`, `'project'`, `'bluechip'`), NOT a contract address — see "Schema gotchas" in PROJECT_KNOWLEDGE.md.

### Future custom queries

#### Q-AssetCompounder-State (per-amplp)
- **Human label:** "What's the current exchange rate between this amplp and its underlying LP?"
- **Used by:** Not yet; **wanted for accurate amplp USD valuation**
- **Input shape:** `{ "state": { "amp_denom": "..." } }` (exact shape TBD when implemented)
- **Powers:** Removes the need for the LST-ratio hardcoded fallbacks (`bLUNA || 1.6048` etc.) — derive directly from compounder state.

---

## 5. ASSET_STAKING contracts (one per bucket — 4 total)

These four contracts hold the *complete* list of whitelisted, below-threshold, AND dewhitelisted LPs per bucket. **Where the catalog learns about pools** — the gauge `distributions` query (§2) only returns active ones.

| Bucket | Address |
|---|---|
| `bluechip` | `terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv` |
| `stable`   | `terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq` |
| `project`  | `terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa` |
| `single`   | `terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k` |

### Default queries (Chainscope)

#### Q-AssetStaking-WhitelistedAssetDetails ⭐ critical
- **Human label:** "Every LP this bucket has ever whitelisted — including inactive and dewhitelisted ones — with take-rate metadata"
- **Used by:** `tla-registry` cron (per bucket)
- **Input shape:** `{ "whitelisted_asset_details": {} }`
- **Inputs:** (none)
- **Output shape:**
  ```json
  [
    {
      "asset": {"cw20": "terra1..."} | {"native": "..."},
      "whitelisted": true | false,
      "yearly_take_rate": "0.1",
      "taken": "1234567890",
      "harvested": "1234567890",
      "last_taken_s": "1717000000",
      "stake_config": "default" | { ... custom mechanism ... }
    }, ...
  ]
  ```
- **Powers:** The full catalog scope (active + below_threshold + dewhitelisted); per-LP take-rate display; "this LP was dewhitelisted but still has X take-rate exposure" warnings.
- **Notes:** Use `whitelisted_asset_details` NOT `whitelisted_assets` — the latter only returns *currently active* entries. This was a key fix in early Phase 0.

#### Q-AssetStaking-Config
- **Human label:** "What's this bucket's staking config (threshold, take rate floor, etc.)?"
- **Input shape:** `{ "config": {} }`
- **Inputs:** (none)
- **Output shape:** `{ activation_threshold_pct, default_take_rate, ... }`
- **Powers:** "Why is this LP below threshold?" explainers — show the threshold, the LP's vote share, and the gap.

### Custom queries

#### Q-AssetStaking-ListStakers (paginated)
- **Human label:** "Who has tokens staked in this bucket?"
- **Used by:** `adao-positions` cron (different cron, but uses same shape)
- **Input shape:** `{ "list_stakers": { "limit": <int>, "start_after": "<addr>" | omitted } }`
- **Inputs:** `limit` (we use 30), `start_after` (last address from previous page)
- **Output shape:** `{ stakers: [{ address, amount, ... }, ...] }`
- **Powers:** Member-level position discovery; "who's the biggest LP in this bucket" rankings.

---

## 6. Pair contracts (LP-pool foundation)

Every TLA pool has a pair contract behind it. **Three architecture variants** appear in the catalog:

- **Astroport xyk** (`astroport-pair`) — constant product
- **Astroport stable** (`astroport-pair-stable`) — stableswap curve
- **Astroport concentrated** (`astroport-pair-concentrated`) — CL ranges
- **White Whale pool** (`white_whale-pool` v1.3.8) — operated as Skeleton Swap by Backbone Labs after WW shut down. Pool contracts inherited from WW.

Same query interface across all variants (different code, same WASM smart-query API).

### Default queries (Chainscope)

#### Q-Pair-Pair ⭐ critical
- **Human label:** "What two assets does this pool hold, and what's the LP token?"
- **Used by:** `tla-registry` cron (resolves every LP's underlyings — see §10)
- **Input shape:** `{ "pair": {} }`
- **Inputs:** (none)
- **Output shape:**
  ```json
  {
    "asset_infos": [
      { "native_token": { "denom": "ibc/2739..." } } | { "token": { "contract_addr": "terra1..." } },
      { "native_token": { "denom": "uluna" } }
    ],
    "contract_addr": "terra1...",
    "liquidity_token": { "token": { "contract_addr": "terra1..." } } | <missing for factory-LP pools>,
    "asset_decimals": [6, 6],
    "pair_type": "constant_product" | "stable" | "concentrated"
  }
  ```
- **Powers:** **Ground truth** for what a pool holds. Used to verify SS's mislabeled API denoms; used to detect cross-DEX token-identity claims (17/17 verification of TLA same-named pairs); foundation for variant-trap warnings.
- **Notes:** **TRUST THIS OVER ANY API.** SS's API JSON claims `ibc/C3988DBA...` for ATOM in some pools; `pair{}` query on those same contracts returns the standard `ibc/27394FB0...`. The contract knows what it actually holds; the API just labels it weirdly.

#### Q-Pair-Pool
- **Human label:** "How much of each token does this pool currently hold, and how many LP shares exist?"
- **Used by:** Not in `tla-registry` (would bloat the snapshot); **wanted for live valuation in future Detail View**
- **Input shape:** `{ "pool": {} }`
- **Inputs:** (none)
- **Output shape:**
  ```json
  {
    "assets": [
      { "info": {"native_token": {"denom": "..."}}, "amount": "..." },
      { "info": {"native_token": {"denom": "uluna"}}, "amount": "..." }
    ],
    "total_share": "..."
  }
  ```
- **Powers:** Live per-pool depth; per-LP token USD value; impermanent loss math; slippage estimates.

#### Q-Pair-Config
- **Human label:** "What fees does this pool charge, and is it open for swaps/deposits/withdrawals?"
- **Used by:** Not in `tla-registry` today; **wanted for pool detail view**
- **Input shape:** `{ "config": {} }`
- **Inputs:** (none)
- **Output shape (white_whale-pool):**
  ```json
  {
    "owner": "terra1...",
    "fee_collector_addr": "terra1...",
    "pool_fees": {
      "protocol_fee": { "share": "0.001" },
      "swap_fee": { "share": "0.002" },
      "burn_fee": { "share": "0" }
    },
    "feature_toggle": {
      "withdrawals_enabled": true,
      "deposits_enabled": true,
      "swaps_enabled": true
    }
  }
  ```
- **Output shape (astroport-pair):** different shape — `params` is base64-encoded; need a parse step.
- **Powers:** Surface "this pool charges N% fee", "deposits temporarily paused" notices, fee breakdown for fee-yield calcs.
- **Notes:** White Whale and Astroport return different shapes. The catalog should normalize for the page.

#### Q-Pair-Contract (the version sniffer)
- **Human label:** "What kind of pool is this — Astroport or White Whale, and what version?"
- **Used by:** Not currently in cron; **wanted for pool architecture surfacing**
- **Input shape:** `{ "contract_version": {} }` — or read the `contract_info` smart query
- **Inputs:** (none)
- **Output shape:** `{ "contract": "white_whale-pool" | "astroport-pair" | "astroport-pair-stable" | "astroport-pair-concentrated", "version": "1.3.8" | "..." }`
- **Powers:** "(S)" suffix explainability — show users "Pool architecture: White Whale v1.3.8 (operated by Backbone Labs as Skeleton Swap)" so they understand why some pools look different.

### Custom queries (Astroport-specific, future use)

#### Q-AstroportPair-LpPrice
- **Human label:** "What's one LP token worth in USD right now?"
- **Input shape:** `{ "lp_price": {} }`
- **Output shape:** decimal string in stableswap denom
- **Powers:** Direct LP USD valuation; cross-check against derived `pool / total_share × price`.

#### Q-AstroportPair-Share
- **Human label:** "If I redeem this many LP tokens, what do I get back?"
- **Input shape:** `{ "share": { "amount": "<lp-units>" } }`
- **Inputs:** `amount` (LP units)
- **Output shape:** `[ { info, amount }, { info, amount } ]`
- **Powers:** "Withdraw preview" tool; member-level position valuation.

#### Q-AstroportPair-Simulation
- **Human label:** "If I swap X of token A, how much B do I get (incl. slippage)?"
- **Input shape:** `{ "simulation": { "offer_asset": { "info": {...}, "amount": "..." } } }`
- **Inputs:** `offer_asset` (full info+amount object)
- **Output shape:** `{ return_amount, spread_amount, commission_amount }`
- **Powers:** Slippage calculator; "is this pool deep enough for your trade size" warnings.

#### Q-AstroportPair-ReverseSimulation
- **Human label:** "How much A do I need to spend to get exactly Y of B?"
- **Input shape:** `{ "reverse_simulation": { "ask_asset": { "info": {...}, "amount": "..." } } }`

### Custom queries (White Whale pool-specific)

#### Q-WhiteWhalePool-ProtocolFees
- **Human label:** "How much in fees has this pool collected (uncollected)?"
- **Input shape:** `{ "protocol_fees": {} }`
- **Output shape:** `{ fees: [ { info, amount }, { info, amount } ] }`
- **Powers:** Real fee revenue tracking — not gameable like emissions APR.

#### Q-WhiteWhalePool-BurnedFees
- **Human label:** "How much has this pool burned of each token?"
- **Input shape:** `{ "burned_fees": {} }`
- **Output shape:** same shape as protocol_fees
- **Powers:** Deflationary token accounting.

---

## 7. CW20 Token Standard (every Eris-side LP, project token, etc.)

Standard CosmWasm token interface. Applies to: cw20 LP tokens, ROAR, CAPA, SOLID, ampLUNA, ampROAR, ALLY, ADAO, and most project tokens. **Not applicable to** native tokens (`uluna`), IBC tokens (`ibc/...`), or factory denoms (`factory/.../...`).

### Default queries (Chainscope)

#### Q-CW20-TokenInfo
- **Human label:** "What's this token's name, symbol, decimals, supply?"
- **Input shape:** `{ "token_info": {} }`
- **Output shape:** `{ name, symbol, decimals, total_supply }`
- **Powers:** Token identity verification; used by chain-registry, Eris, CG indices as the canonical source.

#### Q-CW20-Minter
- **Human label:** "Who's allowed to mint this token?"
- **Used by:** `tla-registry` cron — used to resolve `cw20 LP → pair contract` (the minter of an LP token IS the pair contract that created it)
- **Input shape:** `{ "minter": {} }`
- **Output shape:** `{ minter: "terra1...", cap: null | "..." }`
- **Powers:** LP→pair resolution path. **Critical** for the catalog — without this, we couldn't get from "this cw20 is in TLA's gauge" to "what pair contract does it belong to → what underlyings does it have."

### Custom queries

#### Q-CW20-Balance
- **Human label:** "How much of this token does this wallet hold?"
- **Input shape:** `{ "balance": { "address": "terra1..." } }`
- **Inputs:** `address`
- **Output shape:** `{ balance: "..." }`
- **Powers:** Per-wallet position tracking; used by `adao-positions` cron and `aDAOLive` library.

#### Q-CW20-AllAccounts (paginated)
- **Human label:** "Who holds this token? (every holder)"
- **Input shape:** `{ "all_accounts": { "limit": 30, "start_after": "terra1..." } }`
- **Powers:** Whale-concentration analysis; Gini coefficient for LP Health Scoring.

---

## 8. Native bank queries (uluna, ibc/..., factory/.../...)

For non-cw20 tokens — LUNA itself, IBC bridged tokens, factory denoms (Eris's amplps, BBL's bWHALE, etc.). These don't have smart-query contracts; they're tracked by the chain's bank module.

### Bank balance lookups (REST, not smart query)

#### Q-Bank-AllBalances
- **Human label:** "What does this wallet hold of every native + IBC + factory token?"
- **Endpoint:** `GET /cosmos/bank/v1beta1/balances/{address}`
- **Inputs:** address
- **Output:** `{ balances: [ { denom, amount } ], pagination }`
- **Powers:** Treasury composition; "show me everything in this wallet."

#### Q-Bank-ByDenom
- **Human label:** "How much of this specific denom does this wallet hold?"
- **Endpoint:** `GET /cosmos/bank/v1beta1/balances/{address}/by_denom?denom={url-encoded denom}`
- **Inputs:** address, denom (url-encoded — `ibc/...` and `factory/.../...` need escaping)
- **Output:** `{ balance: { denom, amount } }`
- **Powers:** Targeted balance check; faster than scanning all balances when you know the denom.

#### Q-Bank-Supply
- **Human label:** "What's the total supply of this token across the chain?"
- **Endpoint:** `GET /cosmos/bank/v1beta1/supply/by_denom?denom=...`
- **Powers:** Native-token tokenomics tracking; cross-check against cw20 `token_info.total_supply` for migrated tokens.

---

## 9. TLA Incentive Manager (bribes contract)

**Address:** `terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh`
**Role:** Holds all the bribes paid to TLA voters; tracks which member can claim which bribes per epoch.

### Default queries (Chainscope)

#### Q-IncentiveManager-Config
- **Human label:** "What are the bribe-manager settings?"
- **Input shape:** `{ "config": {} }`
- **Output shape:** owner, fees, allowed bribe tokens, etc.

### Custom queries (used by `bribes-history` cron)

#### Q-IncentiveManager-UserClaimable
- **Human label:** "What bribes can this member claim across all open epochs?"
- **Input shape:** `{ "user_claimable": { "user": "terra1..." } }`
- **Inputs:** user (member's wallet)
- **Output shape:**
  ```json
  {
    "start": <epoch>,
    "end": <epoch>,
    "buckets": [
      { "bucket": "...", "claimables": [...] }, ...
    ]
  }
  ```
- **Powers:** "How much in pending bribes do I have?" tile; member-bribe summaries.
- **Notes:** Returns `{ start, end, buckets }` — NOT an array. Iterating directly throws (see `Schema gotchas` in PROJECT_KNOWLEDGE.md).

#### Q-IncentiveManager-Bribes ⭐ per-period bribe ledger (CHAIN-VERIFIED 2026-07-15)
- **Human label:** "What bribes were paid into this specific period (across all pools)?"
- **Input shape (CHAIN-PINNED via the contract's own error chain, 2026-07-15):** `{ "bribes": { "period": <Time> } }` where **`period` is the ve3 Time enum**: `"current" | "next" | "last" | { "time": <unix> } | { "period": <N> }`. Historical: `{ "bribes": { "period": { "period": 100 } } }` ✓ verified. `{ "bribes": {} }` = current period ✓ verified. A BARE NUMBER (`"period": 100`) FAILS with the serde-json-wasm fallback error ("Expected true/false/null") — the enum can't parse it; this cost four probes to diagnose, don't repeat it. Full QueryMsg set (enumerated by its own errors): `config`, `next_claim_period`, `bribes`, `user_claimable`.
- **Output shape:** `{ buckets: [ { gauge: "<bucket>", asset: {cw20|native: <pool>}, assets: [ { info: {cw20|native: <denom>}, amount: "<raw>" }, … ] }, … ] }` — verified on the current period (20 pool entries) AND period 100 (12 pool entries, Sept-2024 era): per-gauge, per-pool, per-denom totals.
- **Powers:** THE authoritative tribute ledger — complete per-period bribes regardless of initiator (take-rate tribute contracts, Votion, direct). **Deep retention PROVEN (period 100 returns full buckets)** — the build #3 bribe-state walk (~100–193 queries) recovers the complete tribute history INCLUDING the 2025-01→2026-06 event-capture hole. What it does NOT carry: the briber — attribution stays event-side (classifier v6 over `bribe/add_bribe` wasm events + direct msgs; the take-rate anatomy is in CHANGES_PENDING item 3).
- **Note:** the old `epoch_bribes` guess was wrong — this block supersedes it.
- **Powers:** Bribe history per epoch — fuels the Global Epoch Bribes tile.

---

## 10. Skeleton Swap / Backbone Labs API (off-chain reference; not a query, but indexed by cron)

**Endpoint:** `https://dex.warlock.backbonelabs.io/api/pools/phoenix-1`
**Role:** Lists SS-frontend pools (which all run on inherited White Whale pool contracts).

### Critical gotcha

SS's API JSON has **misleading "denom" labels** for some IBC tokens. Returns things like `"ATOM on Dungeon"` at `ibc/C3988DBA...` for pools that — when queried via `pair{}` on the actual contract — hold standard `ibc/27394FB0...` ATOM.

**Always verify SS's API claims with `Q-Pair-Pair` (§6) before trusting the denom field.** The catalog uses on-chain pair{} queries as ground truth.

User-verified empirically: standard-IBC ATOM deposits into both Astroport AND SS LUNA-ATOM pools. There's one ATOM on Terra, just one weird API label.

---

# Future Query Tool — UX Sketch

The current Chainscope flow is:

1. User goes to Chainscope
2. Pastes contract address
3. Picks a method from a dropdown of raw method names (`pair`, `pool`, `config`)
4. Fills in JSON inputs by hand
5. Hits Query
6. Gets back raw JSON they have to interpret

The aDAO tool replaces this with:

1. User picks a **topic** ("LPs", "My voting power", "Pool fees")
2. The tool shows a list of **human questions** that match (e.g., "What does this pool hold right now?", "How much VP do I have locked?")
3. User picks one; the tool shows the inputs as **labeled form fields** (not JSON), with placeholders, validation, and defaults
4. The tool runs the query under the hood
5. Returns a **formatted answer** with units, USD valuations, and links to related queries

Examples of human-readable wrappers:

| Chainscope flow | Tool flow |
|---|---|
| `terra1aa8nu... → pair{} → JSON response with asset_infos` | "What does the ATOM-dATOM SS pool hold? → ATOM (53M) + dATOM (12.4M), as factory denom LP" |
| `terra1uqhj... → lock_info{ token_id: "600" } → JSON` | "What's lock #600? → 796,000 vAMP owned by terra1sffd4..., ends epoch 250 (decay rate: X/epoch)" |
| `terra1tuuw... → user_claimable{ user: "terra1sffd4..." } → nested buckets JSON` | "What's pending for the aDAO treasury wallet? → $443.13 across 3 buckets (CAPA $200, LUNA $150, ROAR $93). Claim before epoch 195." |

**Build prerequisites** (in roughly this order):
1. Every contract's queries documented in this file — *done as of 2026-06-02*
2. A query runner that does retry + dual-endpoint fallback — *exists in `tla-registry` cron's `queryContract`*
3. A formatter library: takes a raw response + schema → human-readable string
4. The UI for topic → question → form-fields → answer

---

# Query Patterns Library (reusable)

### Pattern A — Pagination cursor walk

```js
let cursor = undefined;
const all = [];
while (true) {
  const msg = { all_tokens: { limit: 30, ...(cursor ? { start_after: cursor } : {}) } };
  const r = await queryContract(addr, msg);
  const batch = r?.tokens || [];
  if (batch.length === 0) break;
  all.push(...batch);
  cursor = batch[batch.length - 1];
  if (batch.length < 30) break;  // last page
}
```

Applies to: `all_tokens`, `all_accounts`, `list_stakers`.

### Pattern B — Retry with dual-LCD fallback

```js
async function queryContract(addr, query, label, retries = 2) {
  const qb = base64(JSON.stringify(query));
  const endpoints = ['https://terra-lcd.publicnode.com', 'https://terra.publicnode.com'];
  for (let attempt = 0; attempt <= retries; attempt++) {
    for (const base of endpoints) {
      try {
        const r = await fetch(`${base}/cosmwasm/wasm/v1/contract/${addr}/smart/${qb}`);
        if (r.ok) return (await r.json()).data;
      } catch {}
    }
    await sleep(200 + Math.random() * 300);  // jittered backoff
  }
  return null;  // CRITICAL: caller must distinguish null from empty
}
```

### Pattern C — LP → pair → underlyings resolution

```js
// Given an LP token address, find what it holds
async function resolveLpUnderlyings(lpAddr) {
  let pairAddr;
  if (lpAddr.startsWith('factory/')) {
    // Native factory LP: pair is the first segment of the denom path
    pairAddr = lpAddr.split('/')[1];
  } else {
    // CW20 LP: minter query
    const minterResp = await queryContract(lpAddr, { minter: {} });
    pairAddr = minterResp?.minter || minterResp?.address;
  }
  if (!pairAddr) return null;
  const pairResp = await queryContract(pairAddr, { pair: {} });
  if (!pairResp?.asset_infos) return null;
  return pairResp.asset_infos.map(info =>
    info.token?.contract_addr || info.native_token?.denom
  );
}
```

### Pattern D — Cross-DEX trust verification

When two sources disagree about what a pool holds (e.g., SS API says ATOM at `ibc/C3988DBA...`, our pair{} query says `ibc/27394FB0...`), **trust the chain**. The pair contract knows what it actually accepts — APIs can have stale or mislabeled metadata.

```js
// Run pair{} against the pool's contract directly; use this as truth
const onChainUnderlyings = await resolveLpUnderlyings(lpAddr);
// API claims become a "source coverage" claim, not a fact
const ssApiClaim = ssApiData.tokens?.map(t => t.denom);
// Surface disagreement explicitly; don't silently pick a winner
if (!arraysEqual(onChainUnderlyings, ssApiClaim)) {
  warnings.push({ pool: lpAddr, api_claim: ssApiClaim, on_chain: onChainUnderlyings });
}
```

---

## 11. Alliance NFT Collection (aDAO NFT)

**Address:** `terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9`

**Role:** The aDAO NFT collection — standard CW721 plus aDAO-specific `rewards` query and `break_nft` execute. Contract label: `alliance-nft-collection`. Audited by SCV-Security 2023-11-24 (8 findings, 4 resolved / 4 acknowledged).

### Default queries (Chainscope)

`config`, `rewards`, `nft_info`, `all_nft_info`, `owner_of`, `approval`, `approvals`, `all_operators`, `num_tokens`, `contract_info`, `tokens`, `all_tokens`, `minter`

### Custom queries

```
Q-AdaoNft-AllTokens
  Human label:   "Enumerate every NFT in the collection"
  Used by:       nft-inventory cron Phase 1
  Input shape:   { "all_tokens": { "limit": 30, "start_after": "<token_id>" } }
  Inputs:        limit (cap 30 default), start_after (last seen token_id for pagination)
  Output shape:  { "tokens": ["1", "2", "3", ...] }
  Powers:        Phase 1 enumeration of all 10,000 NFT IDs
  Notes:         Standard CW721 paginated query. 334 pages at limit 30.

Q-AdaoNft-AllNftInfo
  Human label:   "Get owner + metadata for one NFT"
  Used by:       nft-inventory cron Phase 2
  Input shape:   { "all_nft_info": { "token_id": "1234" } }
  Inputs:        token_id (string)
  Output shape:  {
                   "access": { "owner": "terra1..." },
                   "info":   { "extension": {
                       "name": "AllianceDAO NFT #1234",
                       "image": "ipfs://...",
                       "attributes": [
                         { "trait_type": "broken", "value": "false" },
                         { "trait_type": "Rarity", "value": 9876 },
                         ...
                       ]
                   }}
                 }
  Powers:        Per-NFT owner + broken status + rank + image
  Notes:         broken flag lives in extension.attributes; value can be string "true"/"false" or boolean.

Q-AdaoNft-Rewards
  Human label:   "What ampLUNA share does this NFT have?"
  Used by:       not used for backing display — see gotcha below
  Input shape:   { "rewards": { "token_id": "1234" } }
  Inputs:        token_id
  Output shape:  {
                   "rewards": [
                     {
                       "info": { "cw20": "terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct" },
                       "amount": "88202952"
                     }
                   ]
                 }
  Powers:        Theoretically per-NFT claimable. In practice misleading for broken NFTs (see gotcha).
  Notes:         🔴 GOTCHA: returns non-zero amounts for already-broken NFTs that can't claim again
                 ("you can only claim once" per break_nft docs). Three broken NFTs returned three
                 different non-zero values in testing (88.20, 27.91, 49.39). The audit doesn't
                 flag this — the query is informational/historical, computed as a share without
                 checking broken state. The actual `break_nft` execute message blocks re-claims.
                 For UI backing display use treasury_balance / unbroken_count (~88.20 today).
                 Verified empirically: this formula matches the contract's actual distribution math.

Q-AdaoNft-NumTokens
  Human label:   "How many NFTs exist?"
  Used by:       nft-inventory cron (sanity check vs all_tokens enumeration)
  Input shape:   { "num_tokens": {} }
  Inputs:        none
  Output shape:  { "count": 10000 }
  Powers:        Capture-rate validation
  Notes:         Always 10,000 for aDAO.

Q-AdaoNft-OwnerOf
  Human label:   "Who owns this NFT?"
  Used by:       on-demand spot checks (cron uses all_nft_info instead since it's both owner + metadata in one call)
  Input shape:   { "owner_of": { "token_id": "1234" } }
  Inputs:        token_id
  Output shape:  { "owner": "terra1..." }
  Powers:        Quick ownership lookup
  Notes:         For marketplace-listed NFTs, returns the MARKETPLACE contract address, not the
                 original seller. Use marketplace queries (Q-Bbl-AuctionByContract,
                 Q-Atrium-ListingsByCollection, Q-Boost-Launches) to resolve real owner.
```

### Execute messages (for reference)

```
break_nft — claim ampLUNA share and mark NFT as broken
  Input:   { "break_nft": "1234" }
  Effect:  Sends per-NFT ampLUNA share to caller, sets broken=true.
  Limits:  ONE-SHOT per NFT (cannot re-claim even though rewards query may still return non-zero).
           Caller must be current owner.
```

### Pagination notes

`all_tokens` uses `start_after` keyed by the last token_id from the previous page. Standard CW721 pattern.

### Gotchas

- **Rewards query lies for broken NFTs** (see Q-AdaoNft-Rewards above). For per-NFT backing display, compute `treasury_balance / unbroken_count` collection-wide instead. Both values agree at 88.20 ampLUNA today, but only the latter is reliable.
- **Daily yield accrual pattern.** Once per day (typically ~00:50 UTC, triggered by Eris auto-compound bot at `terra1gtuvt6eh4m67tvd2dnfqhgks9ec6ff08c5vlup`), `alliance_claim_rewards` is executed on this contract. The flow: claim LUNA from all 49 Alliance validators → bond LUNA to Eris Staking Hub → 90% of new ampLUNA stays in NFT contract for unbroken holders, 10% sent to DAO main wallet (`terra1sffd4efk...`). Decoded from txn `70757515D0FEBE07DABC2013CAC9217514C16AE252AA54BF5E395A9885215B18` on 2026-04-25.
- **Boost mechanic.** As NFTs break and claim their share, the unbroken count decreases. Same daily inflow is divided among fewer NFTs → per-NFT yield grows. At launch (10,000 unbroken): ~0.081 ampLUNA/day. Today (8,907 unbroken): ~0.091 ampLUNA/day (+12.3%). Verified working — the rewards query returning 88.20 = treasury 785,796 / unbroken 8,907 = boost math correct.

---

## 12. Enterprise NFT Staking

**Address:** `terra1e54tcdyulrtslvf79htx4zntqntd4r550cg22sj24r6gfm0anrvq0y8tdv`

**Role:** Enterprise-framework NFT staking contract. Holds 503 aDAO NFTs total: **100 broken** (DAO-controlled via stake — governance leverage) + **403 unbroken** (real user stakes). Per-user enumeration available.

**Critical naming note:** This is DIFFERENT from the DAO Treasury contract (`terra1h8psjg...rp4l7v`) which is sometimes informally called "Enterprise treasury." Treasury holds 898 broken NFTs separately for DAO governance.

### Default queries (Chainscope)

`config`, `members`, `nfts`, `state`, plus Enterprise framework standard queries

### Custom queries

```
Q-EnterpriseNftStaking-Members
  Human label:   "Who has staked NFTs here and how many each?"
  Used by:       nft-inventory cron Phase 3
  Input shape:   { "members": { "limit": 30, "start_after": "terra1..." } }
  Inputs:        limit (default 30), start_after (last seen address for pagination)
  Output shape:  {
                   "members": [
                     { "user": "terra1...", "weight": 12 },
                     ...
                   ]
                 }
  Powers:        Per-user staker breakdown (mirrors DAODAO indexer's per-staker counts)
  Notes:         weight = number of NFTs the user has staked. May use field name "user" or "address"
                 depending on Enterprise framework version — cron handles both defensively.
                 Filter: only users with weight > 0 are real stakers (some entries may show 0 for unstaked-but-tracked).
```

### Pagination notes

`start_after` keyed by the last user/address from the previous page. ~200 stakers across multiple pages typically.

### Gotchas

- **Broken NFTs at this address are NOT user stakes** — they are DAO-controlled stakes used for governance leverage. Distinguish via Phase 2 broken status: `owner == enterprise && !broken` = real user stake, `owner == enterprise && broken` = DAO control.

---

## 13. BBL Marketplace (Necropolis)

**Address:** `terra1ej4cv98e9g2zjefr5auf2nwtq4xl3dm7x0qml58yna2ml2hk595s7gccs9`

**Role:** BackBone Labs marketplace (Necropolis). Contract: `bbl-necropolis-marketplace v2.2.2`. Code ID 3737. Accepts bLUNA + native LUNA. Hosts 19 NFT collections across multiple chains (7 on Terra). Backend API at `https://warlock.backbonelabs.io/api/v1/dapps/necropolis/collections` (off-chain reference, returns volume + floor + last_sale per collection).

### Default queries (Chainscope)

`config`, `state`, `auction`, `royalty_fee`, `royalty_admin`, `all_royalty_fee`, `calculate_price`, `nft_auction`, `bid_history_by_auction_id`, `bids_count`, `auction_by_contract`, `auction_by_seller`, `auction_by_amount`, `auction_by_end_time`, `not_started_auction`, `auction_by_bidder`, `offers_by_bidder`, `user_balance`, `live_auction_config`, `collection_offers_by_bidder`, `collection_offers_by_contract`

### Custom queries

```
Q-Bbl-AuctionByContract
  Human label:   "List all active auctions for one NFT collection"
  Used by:       nft-inventory cron Phase 4
  Input shape:   { "auction_by_contract": {
                     "nft_contract": "terra1phr9fngj...w3apw9",
                     "limit": 30,
                     "start_after": "<last auction_id>"
                  }}
  Inputs:        nft_contract (collection address), limit (default 30), start_after (auction_id)
  Output shape:  {
                   "auctions": [
                     {
                       "auction_id": "17753",
                       "auction_type": "buy_now",     // or "english"
                       "nft_contract": "terra1phr9fngj...",
                       "token_id": "5678",
                       "seller": "terra1v0k9r7c...",  // ✅ real owner (resolved!)
                       "denom": "cw20:terra17aj4ty...", // bLUNA or "uluna"
                       "reserve_price": "2200000000",   // 2200 bLUNA (6 dec)
                       "amount": "2200000000",          // same as reserve for buy_now; current bid for auction
                       "bidder": null,
                       "end_time": 0,                   // 0 = no expiry; otherwise unix timestamp
                       "duration": 0,
                       "extension_duration": 180,       // anti-snipe seconds
                       "creator_address": "terra1sffd4efk...", // royalty recipient (DAO main wallet)
                       "royalty_fee": "0.05",           // 5%
                       "is_settled": false,
                       "offers": null
                     }, ...
                   ]
                 }
  Powers:        Marketplace listings on the explorer with seller resolution, price, royalty info
  Notes:         Error "unknown field `contract`" if you use param name `contract` — must be `nft_contract`.

Q-Bbl-BidHistoryByAuctionId
  Human label:   "Show all bids on this auction"
  Used by:       future Rev F (bid timeline display)
  Input shape:   { "bid_history_by_auction_id": { "auction_id": "17753" } }
  Inputs:        auction_id
  Output shape:  list of { bidder, amount, timestamp }
  Powers:        "Last bid was X bLUNA, 3 hours ago" on auction detail
  Notes:         Not used yet.

Q-Bbl-CollectionOffersByContract
  Human label:   "Show standing buy offers for any NFT in this collection"
  Used by:       future Rev F (collection-wide demand display)
  Input shape:   { "collection_offers_by_contract": { "nft_contract": "terra1phr9fngj...w3apw9" } }
  Inputs:        nft_contract
  Output shape:  list of buyer + offer amount + token
  Powers:        "5 buyers offering 1,500 bLUNA for any NFT in this collection"
  Notes:         Not used yet.
```

### Pagination notes

`start_after` keyed by `auction_id` from last page. ~2 pages for aDAO at 43 active auctions.

### Gotchas

- **Param name is `nft_contract`, not `contract`.** Error message is helpful: returns `Error parsing into type bbl_necropolis_marketplace::auction::QueryMsg: unknown field 'contract', expected one of 'nft_contract', 'start_after', 'limit'`.
- **Denom can be cw20: prefix OR native.** Parse defensively.
- **`creator_address`** field is the DAO main wallet — royalty flows back to DAO automatically on every sale.

### Off-chain: BBL backend API

Backend at `https://warlock.backbonelabs.io/api/v1/dapps/necropolis/collections` returns rich pre-computed data (off-chain, off-spec for the query tool but useful for reference):

- `volume` (total all-time trading volume per collection in bLUNA)
- `floor`, `unbroken_floor`, `broken_floor` (separate floor prices)
- `last_sale_amount`, `last_sale_token_id`, `last_sale_auction_id`
- `royalty_pct`
- `dao_address`, `dao_provider`, `necropolis_contract`

Pulled via HAR capture 2026-06-06. 19 collections total (8 Terra, 4 Injective, 4 Osmosis, 2 CosmosHub, 3 Dungeon).

---

## 14. Atrium Marketplace

**Address:** `terra15du229lqcxkn939pmjgklqunftf604q4wz87kt5awj6reghec5jqs0w0kj`

**Role:** Atrium NFT marketplace. Contract: `crates.io:atrium-marketplace v1.6.0-rc1`. Label: `atrium-marketplace v1.0.0-rc1`. Code ID 3857. Marketplace fee 150 bps (1.5%). Multi-collection — listings include other Terra collections (e.g. Scandalous Birds, Galactic Punks). Accepts cw20 and native payment tokens (SOLID observed in current listings).

### Default queries (Chainscope)

`config`, `listing`, `listings_by_collection`, `listings_by_seller`, `all_listings`, `offer`, `offers_by_nft`, `royalty`, `fee_info`, `fee_info_for_trade`, `is_collection_allowed`, `allowed_collections`, `collection_stats`, `launch_caps`, `collection_offer`, `collection_offers_for_collection`, `collection_offers_by_buyer`, `trait_registry`

### Custom queries

```
Q-Atrium-ListingsByCollection
  Human label:   "List active listings for one NFT collection on Atrium"
  Used by:       nft-inventory cron Phase 4
  Input shape:   { "listings_by_collection": {
                     "collection": "terra1phr9fngj...w3apw9",
                     "limit": 30,
                     "start_after": <last listing id (number)>
                  }}
  Inputs:        collection (NFT contract address), limit, start_after (numeric listing id)
  Output shape:  {
                   "listings": [
                     {
                       "id": 9,
                       "seller": "terra1vrjdx0t...",        // ✅ real owner (resolved!)
                       "nft_contract": "terra1phr9fngj...",
                       "token_id": "2219",
                       "price": "100000000",                 // 100 SOLID (6 dec)
                       "payment": { "Cw20": { "contract_addr": "terra10aa3zd..." } },
                                                             // OR { "Native": "uluna" }
                       "expires_at": 0,                      // 0 = never expires
                       "created_at": 20733876,               // block height
                       "whitelisted_buyer": null,            // private sale buyer
                       "time_locked_until": null,            // time-locked listing
                       "locked_for": null,
                       "whitelist": null
                     }, ...
                   ]
                 }
  Powers:        Multi-token marketplace listings (SOLID, USDC, etc.) with seller resolution
  Notes:         start_after is the numeric listing id (not string). Pagination cap defensive at 100 pages.

Q-Atrium-AllListings
  Human label:   "List active listings across ALL collections"
  Used by:       not used (we filter to aDAO via listings_by_collection instead)
  Input shape:   { "all_listings": { "limit": 30 } }
  Output shape:  same per-listing shape; includes other collections
  Powers:        Cross-collection floor / activity exploration
  Notes:         Returns multi-collection — only ~1 in 10 is currently aDAO. Filter client-side.

Q-Atrium-CollectionStats
  Human label:   "Aggregate stats (floor / volume) for one collection"
  Used by:       future Rev F (Atrium-side collection stats display)
  Input shape:   { "collection_stats": { "collection": "terra1phr9fngj...w3apw9" } }
  Output shape:  floor / volume / counts (TBD — not yet sampled)
  Powers:        "Atrium floor: X SOLID" on collection page
  Notes:         Not used yet.

Q-Atrium-AllowedCollections
  Human label:   "Which collections are listable on Atrium?"
  Used by:       reference / admin tooling
  Input shape:   { "allowed_collections": {} }
  Output shape:  list of NFT contract addresses approved for listing
  Powers:        Adding new collections (admin) requires they be in this allowlist
  Notes:         AllianceDAO NFT + Scandalous Birds confirmed in allowlist. Other Terra collections
                 from BBL (Skeleton Punks, pixeLions, Galactic Punks, SoulReapers, Burning Lion Festival,
                 Origin Enigma) are NOT currently in the Atrium allowlist as of 2026-06-06.
```

### Pagination notes

`start_after` is a numeric listing id. Atrium's id assignment is global (not per-collection) so ids may skip if other collections have intervening listings.

### Gotchas

- **Multi-collection marketplace.** `all_listings` returns listings from ALL collections — must filter client-side on `nft_contract`. Use `listings_by_collection` to avoid waste.
- **Payment shape is wrapped.** `{Cw20: {contract_addr: '...'}}` for cw20 tokens or `{Native: 'uluna'}` for native. Parse defensively.

---

## 15. Boost Marketplace

**Address:** `terra1kj7pasyahtugajx9qud02r5jqaf60mtm7g5v9utr94rmdfftx0vqspf4at`

**Role:** Boost NFT marketplace. Contract: `launch-nft v1.4.0`. Label: `launch-nft-permissionless`. Code ID 3488. Multi-collection. Accepts ANY Cosmos registry token. Listings are called "launches" — the contract supports two types: simple NFT swaps (direct sale for tokens) and Launch Agreements (time-locked / vesting deals).

### Default queries (Chainscope)

`ownership`, `config`, `state`, `royalties_info`, `launch`, `launches`, `whitelist`

### Custom queries

```
Q-Boost-Launches
  Human label:   "List all launches ever created on Boost (active + history)"
  Used by:       nft-inventory cron Phase 4 (with client-side filter)
  Input shape:   { "launches": { "start_after": <last id> } }
  Inputs:        start_after (numeric launch id; omit on first call)
  Output shape:  [
                   {
                     "id": 475,
                     "name": "",                              // optional label
                     "cancelled": false,                      // true = seller cancelled
                     "done": false,                           // true = sold
                     "owner": "terra1hr8zsf...",              // ✅ real owner (resolved!)
                     "from": {
                       "contract": "terra1phr9fngj...w3apw9", // collection address
                       "token_id": "8803"
                     },
                     "to_info": {
                       "native": "uluna" | "ibc/..." | "cw20:terra1...",
                       // OR (alternate shape):
                       "cw20": "terra1..."
                     },
                     "runtime": {
                       "nft": { "setup": { "to_amount": "20000000" }, "runtime": {} },
                       // OR:
                       "la": { "setup": { "to_amount": "100000" }, "runtime": {
                         "total": { "info": { ... }, "amount": "..." },
                         "remaining": "...",
                         "end": { "period": 118 } | "permanent"
                       }}
                     }
                   }, ...
                 ]
  Powers:        Multi-collection multi-token marketplace listings with seller resolution
  Notes:         Returns ALL launches across ALL collections, including cancelled and completed.
                 Must filter client-side: `!cancelled && !done && from.contract == ADAO_NFT`.
                 Response shape varies (`to_info.native` vs `to_info.cw20`, `runtime.nft` vs `runtime.la`).

Q-Boost-Launch
  Human label:   "Get one specific launch by id"
  Used by:       diagnostic / verification (cron uses launches[] in bulk)
  Input shape:   { "launch": { "id": 475 } }
  Output shape:  single launch object (same shape as element of launches[])
  Powers:        Single-listing detail lookup
```

### Pagination notes

`start_after` is a numeric launch id. Defensive cap at 200 pages (could grow to many thousands of historical launches across all collections).

### Gotchas

- **Returns multi-collection AND historical data.** Both `cancelled === true` and `done === true` entries are mixed with active ones. Filter client-side. Defensive: also check `from.contract === ADAO_NFT_CONTRACT`.
- **`to_info` shape is inconsistent.** Three forms observed:
  - `{ "native": "uluna" }` — native LUNA
  - `{ "native": "ibc/2C962DAB..." }` — IBC token wrapped as native
  - `{ "native": "cw20:terra1..." }` — cw20 string WRAPPED in native field (weird)
  - `{ "cw20": "terra1..." }` — direct cw20 reference
  Parser must check both `.cw20` and `.native` keys, and recognize `cw20:` prefix in the native string.
- **`runtime` shape is inconsistent.** `runtime.nft.setup.to_amount` for direct NFT sales OR `runtime.la.setup.to_amount` for Launch Agreement (time-locked) sales.

---

## 16. ampLUNA Token (CW20)

**Address:** `terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct`

**Role:** Standard CW20 token — the LST that backs the aDAO NFT collection. Daily Alliance rewards flow into the NFT contract as ampLUNA (90% to holders pool, 10% to DAO main wallet).

### Standard CW20 queries

`balance`, `token_info`, `minter`, `marketing_info`, `download_logo`, `allowance`, `all_allowances`, `all_accounts`

### Custom queries

```
Q-AmpLuna-Balance
  Human label:   "How much ampLUNA does an address hold?"
  Used by:       nft-inventory cron Phase 6 (NFT contract balance for backing math)
  Input shape:   { "balance": { "address": "terra1phr9fngj...w3apw9" } }
  Inputs:        address
  Output shape:  { "balance": "785796778857" }   // 6 decimals → 785,796.78 ampLUNA
  Powers:        Treasury backing display: total ampLUNA available for unbroken NFT holders.
                 Divided by unbroken_count → per-NFT share (88.20 ampLUNA today).
  Notes:         Standard CW20 balance query.
```

### Gotchas

- 6 decimals.
- ampLUNA → LUNA exchange rate available from Eris global config (Q-ErisConfig-State → `arb_max.ratio` or via `tla-chain-registry` catalog's `eris_exchange_rate` field).
- USD conversion: `ampluna_amount * eris_exchange_rate * luna_usd_price`. Pull `luna_usd_price` from `network-and-prices-data_2026/data/current.json`.

---

## 17. DAODAO Governance NFT Staking

**Address:** `terra1c57ur376szdv8rtes6sa9nst4k536dynunksu8tx5zu4z5u3am6qmvqx47`

**Role:** `dao-voting-cw721-staked` — the governance staking contract where holders stake aDAO NFTs for voting power. Holds **1,661 NFTs in cw721 custody**, of which **1,657 are actively staked** (= voting power = what the DAODAO UI shows) and **4 are unstaked-but-unclaimed** (sitting in the 7-day claim queue or forgotten). Per-staker counts come from the daodao.zone indexer (`topStakers`, Phase 5) — the contract has no enumerable staker list.

### Custom queries

```
Q-Daodao-TotalPower
  Human label:   "How many NFTs are ACTIVELY staked (voting power)?"
  Used by:       nft-inventory cron — pending-claim reconciliation
  Input shape:   { "total_power_at_height": {} }      // no args = latest
  Output shape:  { "power": "1657", "height": 21353559 }
  Powers:        Chain-truth pending-claim count: custody (daodao_staked_count) − power.
  Notes:         power is a STRING. This equals the DAODAO UI number exactly.

Q-Daodao-NftClaims
  Human label:   "What unstaked NFTs is this address waiting to claim?"
  Input shape:   { "nft_claims": { "address": "terra1..." } }   // address REQUIRED
  Output shape:  per-address pending claims with token_id + release_at
  Powers:        Per-wallet "ready to claim" lookup; confirms a suspected forgotten-claimer.
  Notes:         PER-ADDRESS ONLY — there is no global "all claims" query. Don't try to
                 enumerate claimants by querying current members/holders: a full unstaker
                 has zero voting power AND zero in-wallet NFTs, so they're invisible from
                 every current-state angle. The complete claimant universe is "anyone who
                 ever unstaked and hasn't claimed" — a historical set (see tx-search below).

Q-Daodao-StakedNfts
  Human label:   "Which token_ids has this address actively staked?"
  Input shape:   { "staked_nfts": { "address": "terra1...", "start_after": "...", "limit": 30 } }
  Powers:        Alternative way to pin the pending set: custody token_ids minus the union of
                 staked_nfts across all members = the unclaimed ones (~157 queries — heavier
                 than the tx-search diff below).
```

### Unstake / claim history (forward tracking — LCD tx-search, not a smart query)

```
Q-Daodao-UnstakeHistory / Q-Daodao-ClaimHistory
  Used by:       nft-inventory cron Rev B.3 (forward pending-claim tracking)
  Endpoint:      /cosmos/tx/v1beta1/txs?query=<q>&order_by=ORDER_BY_ASC&pagination.limit=100
  query (q):     wasm._contract_address='<staking>' AND wasm.action='unstake'    AND tx.height><lastHeight>
                 wasm._contract_address='<staking>' AND wasm.action='claim_nfts' AND tx.height><lastHeight>
  CRITICAL:      Use the query= form. The events= form errors "code 13: query cannot be empty"
                 on current SDK builds.
  Unstake parse: token_ids are in the execute message: msg.unstake.token_ids[]
  Claim parse:   claim_nfts message is EMPTY {} — the returned token_ids are in the tx's
                 transfer_nft EVENTS where sender = staking contract. Parse those.
```

### Gotchas

- **Custody ≠ active stake.** A cw721 ownership count (custody, 1,661) includes NFTs in the unstaking queue. `total_power_at_height` (1,657) excludes them. The difference is the pending-claim count. Both are correct; they measure different things.
- **7-day claim queue, no auto-claim.** `unstake` emits `claim_duration: time: 604800`. After 7 days the owner must call `claim_nfts {}` manually; nothing auto-returns. NFTs sit in custody indefinitely if forgotten ("forgotten claims").
- **claim_nfts claims ALL matured at once** — you can't selectively claim, so a wallet's limbo clears entirely whenever they claim after maturity.
- **Re-unstake ordering matters.** A token can be unstaked → claimed → unstaked again. Apply unstake/claim events in block order (last event wins); a naive "all unstakes then all claims" pass corrupts such tokens (the token-1319 case).
- **No backfill.** Public LCDs prune; the cron seeds `data/v2/pending-claims.json` once and tracks forward. Reconciliation (`custody − total_power` vs tracked entries) flags drift but always renders the chain count.

## 18. ve3-connector-alliance (×4 — the gauge→Alliance-rewards bridge)

**One connector PER gauge bucket** (stable/project/bluechip/single), code_id 3120, v1.0.0 — how each TLA bucket plugs into Terra's Alliance module to earn the LUNA reward distribution. Mapped 2026-06 (stable instance `terra1ym2495f63mdx63tu96085x2vf3xpy9z9k5urxwhvmf9jldm99q5qr4q6n8`); same code_id = same schema across all four. Rescued here 2026-07-14 from the retiring CRON-FIXES-BRIEF.

```
Q-ConnectorAlliance-Config
  Input shape:   { "config": {} }
  Output shape:  { global_config_addr, reward_denom: "uluna", zasset_denom (factory/<this>/zluna),
                   alliance_token_denom (factory/<this>/vt), alliance_token_supply,
                   gauge ("stable"|...), lst_hub_addr, lst_asset_info (cw20 ampLUNA) }
  Powers:        Identifies which bucket this connector serves + its zluna/vt denoms
                 (these match the per-bucket zasset_denom values in compounder asset_configs).

Q-ConnectorAlliance-State
  Input shape:   { "state": {} }
  Output shape:  { last_exchange_rate, share_exchange_rate (zluna share→underlying), total_shares,
                   stake_available, stake_in_contract, taken, harvested }
  Powers:        The bucket's Alliance-stake economics — "Alliance rewards earned by bucket"
                 reward-provenance. Verified: stake_in_contract = the connector's on-chain
                 ampLUNA balance exactly; taken == harvested = rewards fully reconciled.

Q-ConnectorAlliance-Validators
  Input shape:   { "validators": {} }
  Output shape:  array of terravaloper... addresses (52 at mapping time) — the whitelisted
                 validator set the connector spreads its virtual stake across.
```

---

| Date | Change |
|---|---|
| 2026-07-14 | Moved to `tla-core/docs/` (SPEC-docs-consolidation). Update pass from the 2026-07-13/14 probe sessions: VP definition law added to header; `distributions` block rewritten (time param, full per-period history to floor 96, epoch mechanics, 1-indexed period lock-in); `last_distribution_period` explanation corrected; `gauge_infos` (per-pool voting_power + fixed_amount + slope) added; gauge `user_info` verified block added; `lock_info` expanded to the full verified shape (coefficient/slope/fixed_amount/underlying_amount/time); `total_vamp` added (canonical Total TLA VP + `time:{period}` projection, `at_period` rejected); escrow `user_info` flagged unverified; §18 connector-alliance rescued from CRON-FIXES-BRIEF. |
| 2026-06-02 | Initial document created at the close of catalog audit. All current `tla-registry` cron queries inventoried, plus the wishlist queries for Vote Intelligence, Portfolio Tracker, Pool Detail View, and the future query tool. SS API gotcha documented after empirical deposit test + on-chain pair{} verification on 17 pairs. |
| 2026-06-06 | Added sections 11-16 for NFT explorer Rev B work: aDAO NFT collection (incl. rewards query gotcha + audit findings + daily yield flow), Enterprise NFT staking, BBL marketplace + bbl backend API, Atrium marketplace, Boost marketplace, ampLUNA CW20. Documents all queries newly added to `nft-inventory` cron in Rev B. |
| 2026-06-07 | Added section 17 (DAODAO Governance NFT Staking) for Rev B.3 pending-claim tracking: `total_power_at_height` (active stake = chain-truth pending count), `nft_claims` / `staked_nfts` (per-address only — member-query blind spot documented), and unstake/claim tx-search history (forward tracking; query= form required, claim token_ids from transfer_nft events, re-unstake ordering caveat). |

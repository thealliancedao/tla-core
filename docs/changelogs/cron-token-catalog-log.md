# Token-Catalog Cron — Changelog

## capa-supply v1.1 — 2026-08-24 — first live publish: 3 guards fired, all real

The 15:35Z run published `guard_failed` on hub_state_vs_balance,
supply×rate=in_hub, and lp_nonamp_non_negative. Every one was chain truth:

1. **The hub stakes its CAPA in Solid governance** — its own cw20 balance is 0
   and the gov contract's 175.72M CONTAINS the hub's 157.17M. v1.1: `in_hub`
   from hub `state{}`; gov splits into `gov_hub_portion` (gov `staker{hub}`) +
   `gov_staked_direct` (18.55M); new cross-check hub-state ≈ hub-per-gov-books
   (0.5% band for accrual timing). Consequence: **true liquid CAPA is ~300.4M
   (60% of supply)**, not the ~143.6M the probe-era arithmetic implied — the
   probe double-counted hub inside gov, and the guard existed to catch exactly
   that.
2. **Astroport-config staking forwards LP to Astroport Incentives** — the
   staking contract's cw20 balance is 0 by design. Staked totals now read
   `total_staked_balances` (post-take).
3. **Amp/non-amp split now single-basis**: the compounder's own entry in
   `all_staked_balances{address: compounder}` vs the same contract's totals —
   both post-take, so take-rate drift can't push non-amp negative. Rate-implied
   amp removed (rates still published for reference).

Also: `num()` returns null on NaN (a pool answering without the asset produced
NaN that slid past null checks — caught by a gate fixture typo, kept as a case).

Gate rebuilt on the FIRST LIVE PUBLISH values as fixtures — 13/13 incl. both
failure paths. Expect the next run to publish `ok` with liquid_derived ≈ 300.4M.

## capa-supply v1 — 2026-08-24 — CAPA supply map duty (SPEC-capa-supply-map.md)

New isolated duty at the end of the token-catalog run (failure never takes the
catalog publish down): `token-catalog/supply/capa/current.json` — every custody
form CAPA can sit in, two levels.

Level 1 (CAPA): gov contract cw20 balance (the largest bucket, ~175.5M), hub
holding (cw20 balance, cross-checked against hub `state{}` within 0.01%),
Astroport + SkeletonSwap pool reserves; `liquid_derived` is the labeled
remainder (no all_accounts walk in v1). Level 2 (ampCAPA): supply split into
liquid / TLA non-amp / via-compounder using LIVE compounder
`amplp_exchange_rates` (never constants), with the DAO-staked receipt from
`total_power_at_height` and the outside-DAO-or-unbonding remainder labeled
(claims enumeration is v2, per the probe finding that unbonding must be its own
bucket). LP staked amp/non-amp split for both DEXes the same way.

Guards (publish-blocking to `guard_failed` status): hub state-vs-balance,
level-2 sum to ampCAPA supply, supply × hub rate = CAPA in hub, non-negative
remainders. A failed query is a null bucket and `partial` status — never a
silent 0.

Gate: `gate-capa-supply.js` drives the LIVE module (no-third-copy) on the
probe-v2 fixture (artifact 9506487143) — 12/12 incl. both failure paths.

Parallel-run: v1 publishes alongside the legacy ampcapa-data_2026 feed (dead
since 08-10, so parity = probe values); the ampCAPA tool repoints after one
verified publish. Neighbors (DATA-MAP, system-health registry, site
cron-registry, help-agent allow-list, REPO-CATALOG) ship with the tool-repoint
batch — the product is unmonitored until then, by choice, not accident.

The journey of building the **token-catalog** cron: what we set out to do, what
broke, why, how we fixed it, and what we verified at each step. Session-level beats —
the real hurdles and breakthroughs, not every keystroke. Newest first.

---

## 2026-08-19 — retry now covers transient 5xx

This cron already retried 409/422 but threw immediately on anything else, so a
transient GitHub **503** ("No server is currently available") killed a run
outright on 2026-08-17. GitHub 5xx is neither our fault nor permanent — it is
now retried on the same path.

Also: the site's health registry had this job as HOURLY when it is a
self-escalating discovery cron running roughly every 5–6h, so a perfectly
healthy job displayed "RUN PENDING". Corrected in `lib/cron-registry.js`.

## 2026-06-26 (~05:00–08:30 UTC) — v1: discovery → identity → verification

A long build session. Took token-catalog from nothing to a working WORTH layer
through Stage 2.1, verifying against real production data at every step.

### Stage 1 — discovery (what exists in TLA)
Built the pool/token discovery: active pools from the gauge `distributions` query,
inactive pools from `whitelisted_asset_details` on each of the 4 staking buckets
(the complete set — active + below-threshold + dewhitelisted), then resolved every
LP to its underlying tokens (`minter` → pair → `pair{}`).

**Verified against the live Eris UI:** 75 pools (28 active / 47 inactive), 38 unique
tokens — and the 28 active matched the Eris Liquidity tab *exactly*. Variations were
preserved (wBTC.atom / .axl / .osmo stayed distinct).

**Hurdle — single-asset stakes looked like failures.** Three stakes (xASTRO,
wBTC.creda.a, ampCAPA) have no two-sided pair, so the resolver flagged them as
errors. Fixed by resolving them as `pool_kind:'single_asset'` with the staked token
as the underlying — they're expected, not failures. Status now degrades to `partial`
only on a genuine chain-read failure.

### DEX labels — telling apart look-alike pools
The catalog showed three `LUNA-USDC LP` rows and they looked like duplicates. They
weren't — they're real, distinct pools on different DEXes. Added a cw2 `contract_info`
read (via the LCD `/raw/` endpoint) to capture each pair's DEX (Astroport vs Skeleton
Swap) and resolve Astroport's generic `custom` type to `concentrated`. Now the same
pair on different DEXes reads distinctly.

**Stumble caught:** an edit accidentally dropped the `pool.underlyings` assignment —
caught it in validation and restored it before it shipped.

### The viewer / override tool
Built a standalone page to *see* the catalog the way the TLA UI shows it — pools in
buckets (active up top, hard divider, inactive below), with a token view and per-field
override toggles. Normalized token order so pairs read consistently (LUNA/USDC always
lead). Added a logo cascade: override → cosmos chain-registry → SkeletonSwap →
letter-circle fallback.

### Course-correction — don't rebuild the old system
Discovered the live site already had a mature `tla-catalog.html` fed by the old
3,093-line `tla-registry` cron, with logos, a score, and variant flags. Decision:
**don't reuse or feed it — start fresh, but mine it for lessons.** Captured its hard-won
failure modes (the "claimed ≠ verified CoinGecko id" trap, cross-source name mismatch,
wrapped-looks-native danger class) as a checklist to design against — without
inheriting its conflated score or output shape.

### Stage 2 — identity (what each token IS)
Made the cron resolve *discovered* identity per token from the cosmos chain-registry
(authoritative) plus SkeletonSwap (logo backfill): symbol, decimals, logo,
coingecko_id, variations. Wrapped tokens no feed can name are left null on purpose —
the curated override is their rightful home, merged on read.

**Verified:** 16/38 tokens got full identity from chain-registry; the 22 wrapped ones
correctly fell to overrides.

**Breakthrough on logos — the 18-vs-36 "bug" that wasn't.** A run showed 18 discovered
logos, not the ~36 predicted. Investigated: 18 is *correct*. The cron writes only
*discovered* logos (chain-registry + SkeletonSwap); it deliberately does **not** write
the ~20 override logos, because overrides merge on read in the page. The 36 figure had
wrongly included overrides. The architecture was working exactly as designed.

### CoinGecko verification index — a manual Action
To verify coingecko_ids, we need CoinGecko's terra-2 address→id map. Rather than have
the cron call CoinGecko every run (rate-limit and datacenter-IP risk), built a **manual
GitHub Action** (`workflow_dispatch`) that pulls the list on demand and commits the
index to `tla-core/docs/curated/`. The cron just reads the committed file.

**First run doubled as the access test, and came back green:** CoinGecko was reachable
anonymously (no API key needed) — 17,484 coins, 18 terra-2 mappings extracted. cw20s
verified (ROAR→lion-dao, SOLID→solid-2, CAPA→capapult, ampLUNA, arbLUNA). The script
keeps a free-API-key option as insurance if that ever changes.

### Stage 2.1 — verification + identity score
The cron now reads the committed CoinGecko index and verifies each discovered
coingecko_id, honest about provenance: `cg_confirmed` (CoinGecko's own index confirms
the cw20), `registry_assigned` (chain-registry assigns it; CoinGecko indexes it on its
origin chain, normal for IBC), `mismatch` (red flag), `no_mapping`. Composed an
identity sub-score (0–100) from the CG state + symbol + logo + name agreement, with the
per-input breakdown recorded so a low score explains itself.

**Verified live:** 5 cg-confirmed, 0 mismatches, all 38 tokens scored. The well-named
cw20s hit 100; the unnamed wrapped tokens honestly sit at 50 — exactly the signal that
their identity rests entirely on curated overrides.

### Where it landed
Discovery + DEX labels + identity + CoinGecko verification + identity scoring, all live
and verified against real runs. The composite grade weights (price 0.75 / identity 0.25)
live in an editable config, recorded in output. Pricing (Stage 3) is the remaining piece
before the three legacy crons can be retired.

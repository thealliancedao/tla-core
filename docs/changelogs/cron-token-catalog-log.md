# Token-Catalog Cron — Changelog

The journey of building the **token-catalog** cron: what we set out to do, what
broke, why, how we fixed it, and what we verified at each step. Session-level beats —
the real hurdles and breakthroughs, not every keystroke. Newest first.

---

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

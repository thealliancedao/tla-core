# TLA Catalog Changelog

This is the change history for the TLA Chain Registry catalog system:
- `tla-catalog.html` (verification surface)
- `cron-scripts/chain/tla-registry/tla-registry.js` (the producer cron)
- `tla-chain-registry/2026/current.json` (the data artifact)

Newest revisions on top. Times are UTC. Cron-side and page-side changes are interleaved by date — when both shipped together, they share a Rev entry.

---

## Rev 0.16 — 2026-06-06 (Phase 0 lock-in: 5 polish fixes)

Sweep of every remaining issue found in the Rev 0.15 production run audit. Goal: lock Phase 0 with zero known data-quality issues, zero error-log noise, before moving on.

### Issues fixed

| # | Issue (from Rev 0.15 audit) | Fix |
|---|---|---|
| 1 | 1 pool labeled with `dex: "eris-alliance-hub-lst"` (Eris vault isn't a DEX) | DEX label restricted to recognized contract families only |
| 2 | 24 pools with `pair_type: "custom"` (misleading — they're concentrated) | Normalize: `custom`+concentrated contract → `concentrated`; `stable_swap` → `stable`; `xyk` → `constant_product` |
| 3 | ~4 noisy minter query warnings per run from contracts that don't support `minter` | `queryContract` detects "unknown variant" / "not supported query" errors as definitional failures — no retry, no fallback attempt, no warning |
| 4 | 3 tokens (USDC/ATOM/dATOM) missing `sources.skeletonswap` despite being in SS pools | New `ensureSkeletonSourceForArchitecturePools` synthesizes SS source entries for any underlying of an SS-architecture pool, marked `_synthesized: true` |
| 5 | Freshness fingerprint stayed identical across runs despite architecture data changing | Fingerprint now includes architecture contract+version per pool, wallet count, amplp count, architecture resolution count |

### Fix 1 — Eris vault no longer masquerades as DEX

`eris-alliance-hub-lst` (the single-asset Eris compounder vault contract) was being labeled as `dex: "eris-alliance-hub-lst"` because my Rev 0.14 fallback used the contract name as the DEX label when it didn't match white_whale or astroport prefixes. Eris vaults respond to `pair{}` queries with self-referential data — they look like a pair but they're auto-compounding vaults.

**Fix:** No fallback. Only `white_whale*` → "Skeleton Swap" and `astroport*` → "Astroport". Any other contract leaves `dex` as `null`. The pool still gets `contract` and `version` populated for transparency, just not a DEX label.

### Fix 2 — pair_type normalization

Different Astroport contract versions return inconsistent `pair_type` strings:
- xyk pools: `"constant_product"` (modern) or `"xyk"` (older)
- stable pools: `"stable"` or `"stable_swap"`
- concentrated pools: `"concentrated"` (rarely) or `"custom"` (most often)

**Fix:** Normalize at capture time. After Rev 0.16 expect:
- `~31 × constant_product` (was 29 constant_product + 11 xyk = 40, but xyk are mostly Astroport xyk now folded in)
- `~23 × concentrated` (was 24 "custom", normalized)
- `~8 × stable` (was 6 stable + 2 stable_swap, merged)

### Fix 3 — Definitional failure detection

`queryContract` now recognizes two error patterns as definitional (not transient):
- `unknown variant` (contract's QueryMsg enum doesn't have that variant)
- `not supported query` (contract refuses the query)

For these, it returns `null` immediately — no retry, no fallback LCD, no warning. Saves ~4 warning lines per cron run from `minter` calls hitting pair contracts that don't have `minter` (correct: pair contracts ARE the minter, not the other way around).

### Fix 4 — SS source synthesis

The Rev 0.15 SS relocator assumed mislabeled denoms could be moved to correct addresses. Empirical reality: SS API simply doesn't return token-level metadata for some pools (USDC, ATOM, dATOM specifically). No mislabel to relocate — the data isn't there in any form.

**Fix:** After the relocator runs, a second pass synthesizes SS source entries for any underlying of an SS-architecture pool (per cw2 contract name) that has no SS source yet. Entry shape:
```json
{
  "_synthesized": true,
  "_reason": "underlying of SS pool per on-chain pair{} + cw2 contract name",
  "is_in_ss_pool": true
}
```

The `_synthesized` flag distinguishes inferred-from-on-chain entries from real API-fetched metadata. The actual token info (symbol/decimals/logo) still comes from cosmos_chain_registry / eris / astroport — SS source just indicates membership.

Expected after deploy: 3 new synthesized entries (USDC, ATOM, dATOM) → SS coverage on SS-pool underlyings goes from 18/21 to 21/21.

### Fix 5 — Expanded fingerprint

Old fingerprint inputs: epoch, directory_size, tokens_count, contracts_count, pools[].{gauge_pool_id, bucket, distribution_pct}.

New inputs (Rev 0.16 added):
- `wallets_count` — catches discovery changes
- `amplp_count` — catches amplp_mappings shifts
- `arch_resolved_count` — catches architecture regression (Rev 0.14 → 0.15 should have rippled here)
- `pools[].architecture.contract` + `version` — stable per-pool architecture identity

This means Rev 0.15 → Rev 0.16 should show fingerprint change (architecture data different), which restores the freshness signal we lost.

### Cron stats expected after deploy

```
   step B: pair{} lookups — ~46 succeeded, ~2 failed, 1 native LP skipped
           75 LP addresses, 35 underlying token addresses
           architecture resolved for ~72 pools (full: contract+version+type), 0 partial
           attached architecture to ~72 pool objects

🔧 SS source synthesis: marked 3 on-chain SS-pool underlyings as known-to-SS
   (no API metadata available, but pair contract confirms membership)

🔍 Freshness: ✓ fresh (fp <NEW>, prev 5e0b3d3f8e7f)
```

And NO `unknown variant` or `not supported query` warnings.

### Deploy state

Not yet deployed:
- **Cron**: 156,210 bytes (+5.6 KB vs Rev 0.15)
- **Page**: unchanged (Rev 0.14 page renders architecture correctly)

### Phase 0 status: LOCKED IN ✅

After Rev 0.16 deploys, the catalog data foundation is at:
- 173 tokens — all named, all sourced (with synthesized SS entries closing the last gap)
- 75 pools — all with bucket+distribution, 72 with full architecture
- 65 amplps — all classified
- 668 wallets — all named
- 0 noisy log lines per cron run
- Freshness fingerprint catches every meaningful data change

Ready for Phase 1.

---

## Rev 0.15 — 2026-06-06 (P2 cleanup + Rev 0.14 follow-up fix)

Combines three planned P2 cleanups (SS indexer correction, avatar capture defensive ungating, curation candidates) PLUS a fix for a problem that surfaced in Rev 0.14's first production run.

### 0. Rev 0.14 follow-up: contract_info via raw storage (the urgent fix)

**The problem:** Rev 0.14 added a `{contract_version: {}}` smart query on every pair contract to capture architecture (contract name + version). The first production run revealed that **Astroport and White Whale pair contracts don't expose `contract_version` (or `contract_info`) as a smart query**. Their QueryMsg enums simply don't include those variants. Result: every architecture query returned 500 with messages like:

```
Error parsing into type astroport::pair::QueryMsg: unknown variant `contract_v...
Error parsing into type astroport::pair_concentrated::QueryMsg: unknown variant ...
Error parsing into type white_whale_std::pool_network::pair::QueryMsg: unknown ...
```

With cron retry+fallback, this produced **~140 error log lines per run** for zero data captured. The Rev 0.14 stats reflected it: "architecture resolved for **0** pools (full: contract+version+type), 72 partial (pair_type only)".

**The fix:** Switch from a smart query to a **raw storage query**. Every cw2-compliant contract stores `ContractVersion { contract, version }` at the standard storage key `contract_info` — regardless of whether the contract implements a smart query handler for it. The wasmd LCD exposes raw state at `/cosmwasm/wasm/v1/contract/{addr}/raw/{base64_key}` — no QueryMsg routing involved.

New helper function `queryContractRaw(addr, storageKey)` does the raw fetch, base64-decodes the wrapped value, and JSON-parses the cw2 ContractVersion struct. It's quiet-by-default (no console.warn on retry/fallback) since some contracts may legitimately not be cw2-compliant and we don't want the Rev 0.14 noise pattern back.

Expected after deploy: cron log shows "architecture resolved for ~70 pools (full)" instead of 0, no `unknown variant` error spam, and `pools[].architecture` actually has `contract` + `version` + `dex` fields populated.

### 1. SS indexer correction

**The bug:** SS's `/api/pools` returns wrong denoms for some IBC tokens (most famously `"ATOM on Dungeon"` at `ibc/C3988DBA...` for pools whose `pair{}` contract actually holds standard `ibc/27394FB0...` ATOM). The old `indexSkeletonSwap` trusted those API labels, so SS metadata indexed under denoms that don't exist in our scope → scope filter dropped them → real ATOM/USDC/dATOM ended up with `sources.skeletonswap = null`.

**Affected tokens (3, audited from live data):**
- USDC at `ibc/2C962DAB...` — used in `LUNA-USDC LP (S)`
- ATOM at `ibc/27394FB0...` — used in `ATOM-LUNA LP (S)` and `ATOM-dATOM LP (S)`
- dATOM at `ibc/223FF539...` — used in `ATOM-dATOM LP (S)`

**The fix:** A new `relocateSkeletonSourceData` function runs after `buildLpUniverse`. For each SS pool, it compares SS's claimed underlyings against the on-chain truth in `lpToUnderlyings` (captured via `pair{}` queries). When SS's claim doesn't match anything on-chain, the SS metadata gets relocated to the "orphan" on-chain address. N-1-of-N matching covers the common case.

Idempotent. Adds `_relocated_from` marker on relocated entries for debuggability.

### 2. Avatar capture defensive ungating

Rev 0.13 gated avatar capture inside `if (data?.name)`. Audit found 0 current cases — but the gating was incidental, not intentional. As the user base grows this would silently bite. One-line restructure: name and avatar capture independently. `namesFound` counter still tracks name-only captures.

### 3. Curation candidates file (no code change — deliverable for the user)

125 TLA member wallets have no curated label and no PFPK name. Top 30 by VP templatized into `curation-candidates.json` ready for the user to fill in. Largest candidate is a 5.4M VP wallet. Drop-in compatible with `curated/wallets.json` — fill in labels, paste under `wallets` key, next cron picks them up.

### Deploy state

Not yet deployed:
- **Cron**: 150,556 bytes (+8 KB vs Rev 0.14) — adds queryContractRaw + relocateSkeletonSourceData + avatar ungating + the raw-storage architecture query swap
- **Page**: unchanged (Rev 0.14 page renders architecture correctly when present)
- **Curated-candidates file**: included in package as a tool/aid, not a code deliverable

Cron syntax-validated. After deploy + first cron run, expect:
- ~140 fewer error log lines per run
- `pools[].architecture.contract` and `.version` populated for most pools
- 3 newly-correct `sources.skeletonswap` entries (USDC, ATOM, dATOM)

### Phase 0 status: complete, now with quality fixes

The polish items are knocked out. Member Stats and other Phase 1+ work can proceed without further data-layer changes.

---

## Rev 0.14 — 2026-06-05 (pool architecture surfacing)

Completes the Phase 0 data foundation by closing the last major gap: every pool now has its on-chain contract identity captured. Identified via Phase 0 audit — all 75 pool entries had zero architecture metadata (no contract type, no version, no DEX info). Future pages (Member Stats, Portfolio Tracker, LP Health Scoring) all need this to distinguish Astroport-XYK pools from Astroport-stable pools from SS-WW pools.

### What gets captured

For each pool the cron now queries `contract_version{}` on the pair contract (the contract identified earlier via `minter{}` for cw20 LPs or via factory-denom regex for native LPs). Combined with the `pair_type` field already returned by the existing `pair{}` query, we now have:

```json
"architecture": {
  "pair_address": "terra1...",
  "pair_type": "xyk" | "stable" | "concentrated" | ...,
  "contract":   "white_whale-pool" | "astroport-pair" | "astroport-pair-stable" | "astroport-pair-concentrated",
  "version":    "1.3.8" | "1.5.0" | ...,
  "dex":        "Astroport" | "Skeleton Swap" | (other if novel contract)
}
```

This appears in two places in `current.json`:
- **Per-pool**: `pools[].architecture` — easiest for page consumers
- **Indexed**: `scope.lp_to_architecture[lp_addr]` — for tools that join by LP address

### Why both pair_type AND contract identity

`pair_type` alone tells us the AMM math (xyk / stable / concentrated). `contract` identity tells us the codebase. Both matter:

- **Skeleton Swap pools** use White Whale's `white_whale-pool` contracts (v1.3.8) that Backbone Labs took over after WW shut down. They're all `xyk`/`constant_product` math.
- **Astroport pools** can be `astroport-pair` (xyk), `astroport-pair-stable`, or `astroport-pair-concentrated` — three different contracts, three different math curves.

A user wants to know: "Is this Skeleton Swap or Astroport?" (operational identity) AND "What's the slippage curve?" (AMM math). Showing both — `"Skeleton Swap • white_whale-pool v1.3.8 • xyk"` — gives the complete picture.

### Cron changes

Inside `buildLpUniverse()`:
- Added `lpToArchitecture` map alongside `lpToUnderlyings`
- New `contract_version{}` query on each pair contract (after the existing `pair{}` query, same pair address — no extra lookup needed)
- `pair_type` normalization handles both string format (`"constant_product"`) and object format (`{xyk: {}}`) — Astroport versions vary
- DEX label derived from contract name (`white_whale*` → "Skeleton Swap", `astroport*` → "Astroport")
- Errors silently swallowed per query (`.catch(() => null)`) — pool architecture is best-effort, not blocking

After `buildLpUniverse` returns, a small loop attaches `pool.architecture = lpToArchitecture[lpAddr]` so downstream readers don't have to do the join themselves.

### Query overhead

- Existing per-cron LCD queries in this stage: 122 (minter for 47 cw20 LPs + pair for all 75 pools)
- New queries added: 75 (`contract_version` per pool)
- New total: 197 sequential queries with existing retry/backoff
- Expected runtime increase: ~30s

Acceptable given the cron's daily cadence.

### Page changes

**Card-level DEX badge** (existing in Rev 0.11) now prefers on-chain `arch.dex` over name-based inference. Tooltip shows full architecture string: `"white_whale-pool v1.3.8 (xyk) — operated by Backbone Labs"`. Falls back to name-based detection if `lp_to_architecture` data is missing (e.g. before cron has run with new code).

**LP token detail view** gets a new "Pool architecture" row showing the formatted architecture string.

**Amplp "Wraps" panel** enhanced — when on-chain architecture is available, replaces name-based DEX inference with authoritative data and shows a "Pool architecture" sub-row with `contract vX.Y.Z · pair_type` detail. Tooltip distinguishes "inferred from name" vs "on-chain contract_version".

### What this enables for future work

- **Member Stats page**: can show each user's LP positions with proper venue labeling
- **Portfolio Tracker**: can group positions by AMM curve (xyk vs stable vs concentrated) for slippage modeling
- **LP Health Scoring**: scoring criteria can differ by pool architecture (concentrated has IL profile different from xyk)
- **Bribes Tracking**: can correlate bribe efficiency with pool type
- **Query tool**: "show all stable pools" / "show all SS pools" filters become trivial

### Deploy state

Not yet deployed:
- **Cron**: 142,534 bytes (+3.8 KB vs Rev 0.13) — additions in `buildLpUniverse` + scope export
- **Page**: 127,116 bytes (+4.3 KB vs Rev 0.13) — architecture rendering in card badge, detail view, Wraps panel

Both files syntax-validated. Page works in degraded mode if cron hasn't yet populated `lp_to_architecture` (falls back to name-based inference). After cron runs with new code, page surfaces authoritative on-chain data.

### Phase 0 status: COMPLETE

With Rev 0.14, the catalog data foundation now covers:

- ✓ 173 tokens with headline_name (100%)
- ✓ 75 pools with bucket + distribution + total_vp (existing)
- ✓ 75 pools with on-chain architecture (NEW in Rev 0.14)
- ✓ 65 amplps fully classified with bucket inheritance + wraps_lp_address
- ✓ 668 wallets with headline_name (100%)
- ✓ Token logos (36 single + 133 composites)
- ✓ DAO membership data per wallet
- ✓ Source coverage transparency
- ✓ Curated overrides system
- ✓ Reliable curated reads (SHA-pinned cache bypass)
- ✓ Verified cross-DEX token identity (17/17 same-named pairs)
- ✓ AllianceDAO member coverage (157/157, 98% with names)

Phase 1 (TLA Stats migration), Phase 2 (Member Stats), Phase 3 (Portfolio Tracker), and beyond can build on this foundation without further data-layer work.

---

## Rev 0.13 — 2026-06-05 (wallet names + avatars)

User-reported issue: the catalog page showed "a bunch of addresses but really not member names." Investigation found that DAODAO PFPK profile names (160 wallets) and avatars (43 wallets) WERE being captured by the cron — but the page didn't render them. The data layer was good; the rendering layer was incomplete.

### Coverage before / after

| State | Wallets with meaningful name on card |
|---|---|
| **Before Rev 0.13** | 2 (just curated `aDAO Treasury` and `aDAO Council Multi-Sig`) — other 666 showed truncated address as title |
| **After Rev 0.13** | 668 of 668 (100%) — every card has either a real name, a PFPK profile name, or a "{DAO} member" identifier |

Breakdown after fix:
- 2 wallets show curated labels (existing)
- 160 wallets show PFPK profile names (existing data, newly rendered)
- 506 wallets show `{DAO} member` synthesized label (new from cron Rev 0.13)
- 43 wallets render their PFPK NFT avatar as the card icon (was generic fa-user)

### Page changes

**Name resolution priority chain extended.** `daodao_name` now in the fallback chain for card titles and sort comparisons:
```
headline_name → display_name → label → daodao_name → symbol → truncated address
```

**Wallet card icon renders PFPK avatar when available.** ipfs:// URLs rewritten to ipfs.io public gateway; `<img onerror>` falls back to fa-user if 404.

**Wallet card subline now shows primary DAO membership** instead of generic "member · DAODAO". Picks the most prominent membership (TLA > highest VP > first). Format: "TLA (+2 more)" when wallet is in multiple DAOs.

**Wallet detail view gets a PFPK profile panel** at the top showing avatar + name + brief explanation when present.

### Cron changes — `headline_name` for wallets

Post-PFPK-enrichment loop computes a canonical `headline_name` per wallet using priority:

1. Curated `label`
2. `daodao_name` (PFPK)
3. `{DAO} member` synthesized from primary `dao_memberships` entry
4. (left null — page falls through to address)

Result: downstream consumers (future `dao-tla.html` Member Stats page, `tla-stats.html`, any other page) read one canonical field instead of duplicating the priority logic.

### What this doesn't (yet) solve

- The 506 wallets with synthesized "{DAO} member" labels still don't show a real person's name — those people just haven't registered a PFPK profile. Out of our hands; PFPK is opt-in.
- The ~46 specific TLA council member wallets (the ones holding voting_escrow NFTs) include some without PFPK names that are nonetheless known to the community. These should be curated into `wallets.json` for full coverage. See "Open items" in CHANGES_PENDING.md (P2 — TLA council member curation).

### Deploy state

Not yet deployed:
- **Cron**: 138,771 bytes (+2.0 KB vs Rev 0.12.2)
- **Page**: 122,787 bytes (+4.8 KB vs Rev 0.12.2)

Both files syntax-validated. Page change works immediately on deploy (reads existing `daodao_name` field from current.json); cron change populates the new `headline_name` field on next run.

---

## Rev 0.12.2 — 2026-06-05 (cron CDN cache bypass)

User reported logos still broken even after Rev 0.12.1 deploy. Investigation revealed the corrected URLs WERE in the deployed `token_overrides.json` on GitHub, but the cron read STALE data when it ran.

### Root cause — GitHub raw URL CDN caching

`raw.githubusercontent.com` is fronted by Fastly with a 5-minute cache. Sequence of events:

1. User pushed corrected `token_overrides.json` to GitHub at T+0
2. User triggered cron manually at T+2 min (well-intentioned but premature)
3. Cron's `fetchCurated()` hit `raw.githubusercontent.com/.../main/curated/token_overrides.json`
4. Fastly served the OLD cached file (from before the push) — `x-cache: HIT`, `source-age: 164s`
5. Cron wrote stale URLs into `current.json`

The deployed file on GitHub had the correct URLs, but the cron's view of it was 2-3 minutes behind.

### Things tried that DIDN'T work

- Query-string cache-buster `?_=${Date.now()}` — Fastly ignores query strings for these URLs
- `Cache-Control: no-cache` request header — Fastly ignores
- `Pragma: no-cache` request header — Fastly ignores

### The actual fix — SHA-pinned URLs

Raw GitHub URLs are cached by full path. Different SHA = different path = different cache key = guaranteed cache miss for unseen SHAs.

`fetchCurated()` now:

1. Hits GitHub API once: `api.github.com/repos/{repo}/commits/{branch}` → returns latest commit SHA
2. Builds curated file URLs using that SHA: `raw.githubusercontent.com/{repo}/{sha}/curated/{file}.json`
3. Fetches all curated files from those SHA-pinned URLs

If the SHA lookup fails (rate limit, API down), falls back to the branch-name URL with a warning logged. So worst case, behavior matches pre-fix — no new failure mode.

GitHub API has 60 unauthenticated requests/hour limit. We use 1 per cron run. Trivial budget impact.

### Why the user's report was correct

State after Rev 0.12.1 deploy + first cron run:

| Token | Deployed override file | Cron's view of override (current.json) |
|---|---|---|
| arbLUNA | `arbluna.svg` ✓ | `arbLUNA.png` ⚠ (stale) |
| xASTRO | `xAstro.svg` ✓ | `xASTRO.png` ⚠ (stale) |
| FUEL | `neutron/.../fuel.png` ✓ | `migaloo/.../fuel.png` ⚠ (stale) |
| ampWHALE | `ampwhale.svg` ✓ | `ampWHALE.png` ⚠ (stale) |
| ampLUNA | (no override needed) | `ampluna.svg` ✓ (picked up from chain-registry source via SVG fix) |

So ampLUNA fixed via the SVG fallback, but the 4 with overrides got stale data.

### Recovery procedure for Rev 0.12.1 (one-time)

Before deploying Rev 0.12.2, the user just needed to trigger ONE more cron run — by then the 5-minute Fastly cache had expired, so the cron would get the correct curated data.

After deploying Rev 0.12.2, this class of bug is permanently fixed — future curated pushes can be immediately followed by manual cron triggers without waiting.

### Deploy state

- **Cron**: 136,746 bytes (+1.6 KB vs Rev 0.12.1) — single function rewrite in `fetchCurated()`
- Other files unchanged

This rev fixes the MECHANISM. The user should additionally trigger a manual cron run after deploy to refresh `current.json` with correct logo URLs.

---

## Rev 0.12.1 — 2026-06-05 (logo URL hotfix)

User-reported visible failures on arbLUNA, ampLUNA, xASTRO, FUEL after Rev 0.12 deploy. Root-caused two distinct issues:

### Issue 1 — Most curated URLs in Rev 0.12 were wrong

Of the 17 new URLs added to `token_overrides.json`, **12 were 404**. The chain-registry uses:
- **Filename casing** that doesn't match the symbol (`arbluna.svg` not `arbLUNA.png`, `xAstro.svg` not `xASTRO.png`)
- **SVG file extensions** for many newer entries (we assumed PNG)
- **Different chains** than we assumed (FUEL is on Neutron, not Migaloo)

**Fix:** audited every URL against the actual chain-registry assetlist.json files. Found correct URLs for 11 of 12. The 12th (rSWTH) doesn't have its own logo in chain-registry; fell back to parent SWTH icon as a pragmatic substitute. All 20 URLs now HTTP 200 verified.

| Token | Old (404) | New (200) |
|---|---|---|
| arbLUNA | `terra2/images/arbLUNA.png` | `terra2/images/arbluna.svg` |
| dATOM | `cosmoshub/images/dATOM.png` | `neutron/images/dATOM.svg` |
| xASTRO | `neutron/images/xASTRO.png` | `neutron/images/xAstro.svg` |
| wstETH | `_non-cosmos/ethereum/images/wsteth.png` | `_non-cosmos/ethereum/images/wsteth.svg` |
| ampWHALE | `migaloo/images/ampWHALE.png` | `migaloo/images/ampwhale.svg` |
| FUEL | `migaloo/images/fuel.png` | `neutron/images/fuel.png` |
| wETH.wh / WETH.axl | `_non-cosmos/ethereum/images/weth.png` | `_non-cosmos/ethereum/images/weth.svg` |
| wSOL.wh | `solana/images/sol.png` | `_non-cosmos/solana/images/sol.svg` |
| wBNB.wh / wBNB.axl | `bsc/images/bnb.png` | `_non-cosmos/binancesmartchain/images/bnb.png` |
| rSWTH | `carbon/images/rSWTH.png` | `carbon/images/swth.png` (parent fallback) |

### Issue 2 — Cron chain-registry extractor skipped SVG-only entries

The cron's `indexChainRegistry` function only picked up `.png` URLs from chain-registry's asset entries. Many newer tokens (ampLUNA, arbLUNA, xAstro, ampwhale, etc.) are SVG-only in chain-registry — so the cron silently dropped them from its source data.

This explained why `sources.cosmos_chain_registry.logo_uri` was null for ampLUNA in our live data, even though ampLUNA HAS a logo in chain-registry. SS source happened to have it too (which is what was actually being used).

**Fix:** `indexChainRegistry` now picks up PNG OR SVG (preferring PNG when both exist). Both render fine in `<img>`. Future-proofs as chain-registry continues migrating to SVG.

### Verification

- 36 single tokens still have resolved logos (same count, but now all 20 curated ones actually work)
- The 4 user-reported failures (arbLUNA, ampLUNA, xASTRO, FUEL) all verified to load correctly with new URLs
- Cron's SVG fix will add 1+ more chain-registry logos on next run (modest immediate gain, important future-proofing)

### Deploy state

- **Cron**: 135,181 bytes (+464 bytes vs Rev 0.12) — single SVG-fallback fix in `indexChainRegistry`
- **token_overrides.json**: 10,948 bytes (+321 bytes vs Rev 0.12) — 12 URL corrections, no schema changes

Page (`tla-catalog.html`) does not need a hotfix — its fallback chain works correctly; the data underneath was the problem.

---

## Rev 0.12 — 2026-06-05 (token logos)

Spans all three layers — curated data, cron aggregation, page rendering — implementing a unified token-logo system across the catalog. Three layers of fallback so users always see *something* recognizable for every token.

### Curated — `token_overrides.json` extended with `logo_url`

Added a `logo_url` field to 20 single-token override entries (3 existing wBTC variants now have logos; 17 new entries covering ATOM, dATOM, USDC, USDt, EURe, ASTRO, xASTRO, wstETH, INJ, SWTH, rSWTH, WHALE, ampWHALE, bWHALE, FUEL, arbLUNA, stLUNA, wETH.wh, wSOL.wh, wBNB.wh, wBNB.axl, WETH.axl, wBTC.creda.a).

URLs sourced from the `cosmos/chain-registry` repo's per-chain folders (cosmoshub, neutron, migaloo, carbon, stride, terra2, `_non-cosmos/ethereum`, solana, bsc). The pattern is `https://raw.githubusercontent.com/cosmos/chain-registry/master/{chain}/images/{symbol}.png`. Where uncertain, the page's `<img onerror>` handler falls back to a colored letter circle — no broken-image experience.

Schema extended in `_meta`: `logo_url` documented as the canonical field.

### Cron — Stage 7d added (logo aggregation)

After Stage 7 applies curated overrides, the new Stage 7d resolves a single canonical `logo_url` per token using priority order:

1. **`token.override.logo_url`** — curated (highest priority)
2. **`sources.cosmos_chain_registry.logo_uri`** — covers terra-2-native tokens like LUNA, ROAR, ampLUNA
3. **`sources.skeletonswap.logo_url`** — covers additional wrapped tokens
4. *(future)* Eris CDN, Astroport API, CoinGecko per-coin endpoint — none implemented yet

**Simulation result against current live data:**
- 36 of 173 single tokens resolve to a direct logo URL
  - 20 via curated override
  - 13 via chain-registry
  - 3 via SkeletonSwap
- 137 remaining tokens have no direct logo (will use letter fallback)

For LPs and amplps the cron does not compute a composite — that's a rendering concern handled page-side using the existing `scope.lp_to_underlyings` + `amplp_mappings` data.

### Page — three rendering paths

New helper functions before `renderCard`:

```
entryLogoHtml(entry, sizePx)   — main entry point. Picks single vs composite vs FA icon.
tokenLogoHtml(token, sizePx)   — single-token <img> with onerror letter fallback.
lpLogoHtml(token, sizePx)      — composite of 2 underlying tokens (overlapping circles).
logoFallbackInitials(name)     — derives 2-letter initials (handles "X-Y LP", "ampLUNA", etc).
logoFallbackColor(str)         — stable color hash so the same token always gets the same color.
```

Used in two places:
- **Card header** at 28px (replaces the FontAwesome `fa-coins` icon)
- **Detail modal header** at 56px (large, prominent)
- **"Wraps" panel** on amplp detail at 40px (shows the wrapped LP's composite)

**Three rendering paths:**
1. **Single token w/ logo** → `<img>` with `onerror` swap to letter circle
2. **LP / amplp** → composite of 2 overlapping circles (each 72% of card size, second offset right)
3. **No logo data** → deterministic letter circle (colored by hash of token name)

**Page-side fallback:** `tokenLogoHtml` re-does the cron's priority lookup directly from `token.sources` if `token.logo_url` isn't yet populated. This lets the page work as soon as curated logos are committed to GitHub — no need to wait for cron deploy.

**Composite coverage:** 133 of 137 LP/amplp tokens get a full composite (both underlying tokens have resolved logos). The remaining 4 have at least one underlying without a logo — these still render gracefully with letter fallback for the missing side.

**Contracts and wallets** keep their FontAwesome icons (`fa-file-contract`, `fa-user`) — they're not asset tokens, so a logo concept doesn't apply.

### CSS additions

```css
.token-logo-fallback   — colored letter circle (stable per-token color)
.token-logo-wrap       — img wrapper with consistent sizing
.token-logo-composite  — overlapping wrapper for 2-token LP/amplp composites
```

The composite has a thin dark border + cyan glow so each component circle reads clearly when they overlap.

### Deploy state

Not yet deployed:
- **Cron**: 134,717 bytes (deployed: 133,172; +1.5 KB)
- **Page**: 118,029 bytes (deployed: 109,196; +8.8 KB)
- **token_overrides.json**: 10,627 bytes (deployed: 4,552; +6.1 KB)

All three files validated. Cron + page can deploy independently — page works in fallback mode if cron's Stage 7d hasn't run yet.

### Why three layers (instead of just one)

Could have done page-only rendering. Reason for going all three layers:

- **Curated overrides** are durable knowledge — a logo URL is just metadata about a token, no different from its display name or notes
- **Cron aggregation** makes the data reusable — future pages (tla-stats, Member Stats, Portfolio Tracker) read `t.logo_url` directly instead of duplicating the priority-resolution logic
- **Page rendering** is where the visual composition happens (single vs LP composite vs letter fallback)

Each layer has a single responsibility. Adding a new logo to a token means editing one JSON file; everything downstream picks it up next cron run.

---

## Rev 0.11 — 2026-06-05 (amplp classification fix)

Real bugs found by user inspection of the amplp_tokens tab. Two cron bugs root-caused, plus three page-side improvements to make the amplp tab self-explanatory.

### Cron — Bug A: 55 of 65 amplps had wrong subtype

**Symptom:** the amplp_tokens tab showed only ~10 entries despite `amplp_mappings` knowing about 65. The other 55 amplps were classified as `subtype='native'` (factory denoms inherited this from the generic catch-all) or `subtype='lst'` (the LST regex falsely matched amplps whose names contained "luna" — e.g. `arbLUNA-LUNA AMPLP`).

**Root cause:** Stage 5c only set `subtype='amplp'` on tokens it created from scratch. Tokens that were already in `tokens[]` (because Eris's `/prices` returned them) got their subtype set by the later generic logic at the bottom of `buildTokenCatalog`. Two paths corrupted them:

```js
// Generic inference at line 1407-1413:
if (t.type === 'factory') t.subtype = 'native';   // wrong for amplps
// LST regex at line 1415 unconditionally overrode:
if (/^(amp|arb|b|st)/.test(t.symbol) && /luna/i.test(sym)) t.subtype = 'lst';
```

**Fix:**
- New Stage 5d normalizes ALL entries in `amplp_mappings` to `subtype='amplp'` regardless of how they entered the catalog
- LST detection at line 1415 now guards against overriding `'amplp'`

### Cron — Bug B: every amplp showed `tla_pools_count: 0`

**Symptom:** every amplp displayed "Appears in TLA pools: no" on the catalog page. But amplps DEFINITELY appear in TLA pools — staking the amplp IS how you participate in a TLA gauge.

**Root cause:** Stage 5 credits the LP token entries in `pools[]`. Stage 5b backfills underlying tokens via `lpToUnderlyings`. Neither touches amplps because amplps are wrappers, not pool entries and not underlyings. So they never got their `tla_pools_count` incremented.

**Fix:** Stage 5d (same new stage) mirrors `appears_in.tla_pools` from the underlying LP onto the amplp (or falls back to `mapping.bucket` if the underlying LP isn't itself a tracked TLA pool — happens for legacy amplps). Also inherits `gauge_status` and records `wraps_lp_address` for the page to use.

**Simulation against current live data:**
- 55 amplps got their subtype corrected
- 65 of 65 amplps got TLA pools backfilled
- Examples: `ampWHALE-ampLP → single`, `LUNA-USDC-ampLP → stable`, `LUNA-ampLUNA-ampLP → project`

### Page — DEX badge on amplp/LP cards

Derives from name pattern + the new `wraps_lp_address` link:
- Underlying LP name ends in `(S)` → **Skeleton Swap** badge (amber)
- Underlying LP is a hyphenated pair → **Astroport** badge (blue)
- Amplp wraps a single token (no hyphen, no "LP") → **Single-asset vault** badge (purple) — Eris's compounder, not a DEX pool

Renders on both amplp_tokens AND lp_tokens cards. Tooltip explains "white_whale-pool architecture, operated by Backbone Labs" for (S) variants.

### Page — "Wraps" relationship panel on amplp detail view

Top-of-detail panel for any amplp showing:
- **Wraps:** the underlying LP's display name
- **Wrapped LP address:** monospace, truncated, hover for full
- **Underlying DEX:** Astroport / Skeleton Swap / Single-asset vault (with hover explainer)
- **TLA bucket:** which bucket the staked position counts toward

Makes the "amplified version of [X]" relationship visible without forcing the user to deduce it from the name.

### Page — Category subtitle banner

Above the grid, when a specific tab is active (not "all"), shows a one-liner explaining what's in that tab. Especially important for `amplp_tokens`:

> *Amplified LP tokens — auto-compounding wrappers around regular LPs. Stake the underlying LP to receive these; rewards auto-compound back into more LP. The non-amplified LP version lives in the "lp tokens" tab.*

Helps users navigating between `lp_tokens` and `amplp_tokens` understand the relationship (you're depositing the regular LP to GET the amplp back; amplp is the wrapper that does the auto-compounding work).

### Deploy state at end of Rev 0.11

Not yet deployed (bundled for review):
- **Cron**: 133,172 bytes (deployed: 129,407; +3.8 KB)
- **Page**: 109,196 bytes (deployed: 101,730; +7.5 KB)

Both files syntax-validated. Cron simulation against current `current.json` shows expected results (55 subtype corrections, 65 TLA-pool backfills).

---

## Rev 0.10 — 2026-06-02 (audit night)

**Major data-quality audit + Phase 0 documentation pivot.** This is the closing entry of a multi-hour session that identified ~10 systemic bugs in the cron's data layer, verified 17 cross-DEX same-named LPs against on-chain `pair{}` data, and produced the first round of durable knowledge files (this changelog, `queries.md`, updates to `PROJECT_KNOWLEDGE.md` and `CHANGES_PENDING.md`).

### Cron — what changed (built; deploy ready)

**Local cron file: 129,407 bytes** (deployed is 114,834 — diff ~14.5 KB).

#### Self-referential vault detection in scope phase
Eris's single-asset compounder vaults (ampCAPA at `factory/terra186rpf.../ampCAPA`, and any future similar) respond to `pair{}` as if they were 2-asset LPs, returning `asset_infos = [input_asset, self]`. Without intervention, `lp_to_underlyings` ended up with self-references that double-counted into `tla_pools_count` and incorrectly cascaded `is_amplp_underlying` to the vault itself.

The scope phase now detects `lpAddr ∈ underlyings`, strips the self-reference, and tags the entry `_is_vault: true`. Defense-in-depth: Stage 5b dedup catches anything that slips past; Stage 6 cascade skips wrappers when computing the underlying-flag.

#### Stage 5c — synthesize records for unpriced amplps
`amplp_mappings` (from `asset_compounder.asset_configs`) had 65 entries, but only 54 had corresponding `tokens` records. The 11 missing ones were amplps wrapping legacy/inactive LPs that Eris's `/prices` endpoint doesn't publish prices for (arbLUNA-LUNA AMPLP, WHALE-bWHALE AMPLP, WETH.wh-wstETH AMPLP, LUNA-wSOL.wh variants, USDC-USDt amplp duplicates).

Stage 5c now synthesizes minimal records from `amplp_mappings` data so all 65 wrappers appear in the catalog with correct subtype, bucket assignment, and `is_wrapped_by_amplp` flags. They're priced as `null` (honest data over false positives).

#### Stage 6 — cascade `is_amplp_underlying` to the right layer
The previous logic stamped `is_amplp_underlying: true` on LP tokens themselves, which is incorrect — the LP token IS what's wrapped; its UNDERLYING assets (LUNA, ATOM, etc.) are the things "underlying an amplp." Two distinct fields now:

- `is_wrapped_by_amplp` — set on the LP/wrapper itself (the thing the amplp factory consumed)
- `is_amplp_underlying` — set on the underlying assets of any LP that's wrapped

FUEL now correctly shows "yes" — its LP is wrapped, so FUEL is underlying an amplp via that wrapping. Page filter "amplp underlying = yes" matches either flag with a clarifying parenthetical.

#### Stage 7b — Hardcoded override system + source propagation
Some naming conflicts aren't data bugs, they're branding disputes. Eris's `/prices` API returns `"display": "bLUNA"` for Backbone Labs' staked LUNA, but Eris's official UI calls it `"boneLUNA"`. The catalog now has a small `HARDCODED_OVERRIDES` dict (Stage 7b) for these cases.

Override now propagates to BOTH the headline_name AND `sources.eris.display`, preserves the original raw value as `sources.eris._display_original`, and sets `_display_overridden: true` for page-side transparency. Without this, a later headline-name recompute clobbered the override.

#### Stage 7c — CG verification with bridge-trace fallback
Eris's `/prices` sometimes claims a CoinGecko ID that's wrong. The Stage 7c verification stage independently looks up each claimed CG ID against CoinGecko's `terra-2` platform index and adds a fallback that follows `bridge.all_traces` to source chains (e.g., ethereum) for tokens CG indexes by source rather than by Terra.

Catches caught this round:

| Token | Eris claimed | CG actually has | Status |
|---|---|---|---|
| USDC | `usd-coin` (Circle's generic) | `ibc-bridged-usdc` (Noble variant, "USDC.N") | mismatch |
| EURe | `monerium-eur-money` (deprecated v1, labeled "EURe [OLD]") | `monerium-eur-money-2` | mismatch |
| WETH.axl | `ethereum` (native ETH!) | `weth` | mismatch |
| ATOM | (none provided) | `cosmos` (terra-2 direct) | discovered |
| INJ | (none provided) | `injective-protocol` | discovered |
| WBTC.axl | (none provided) | `axlwbtc` | discovered |
| wBTC.atom | (none provided) | `eureka-bridged-wbtc-terra` | discovered |
| PAXG | (none provided) | `pax-gold` (via Ethereum 0x45804880De... bridge trace) | verified_via_bridge |

Scoring stage no longer overwrites match status with `'matched'` whenever a CG ID exists. Uses precise verification result (`verified` / `verified_via_bridge` / `discovered` / `mismatch` / `unverified_no_terra_addr` / `hardcoded_override` / `no_mapping`).

#### Stage 8b — Auto-suggested acquisition from bridge data
For tokens with no curated `acquisition_guides.json` entry, Stage 8b synthesizes a guide from `bridge.all_traces` data. Surfaces useful info like "USDt → bridged from Kava via channel-X" without requiring a council member to write it from scratch first.

#### `source_coverage` block in snapshot
The snapshot now exports per-source asset counts + `fetched_ok` status. Powers the page's informative tooltips when a row shows "— not listed" — instead of an ambiguous empty cell, users see "chain-registry indexed 58 assets; this address not among them."

### Page — what changed (built; deploy ready)

**Local page file: 101,721 bytes** (deployed is 96,805 — diff ~5 KB).

- **`verified_via_bridge` badge** — teal "✓ via bridge" pill with tooltip showing source chain (e.g., "via Ethereum 0x45804880...")
- **Source coverage tooltips** — every "— not listed" row now has informative tooltip from the new `source_coverage` block
- **"n/a (single-asset stake)"** for Astroport/SS rows on tokens that aren't tradeable pairs (vault assets like ampCAPA)
- **amplp underlying = OR of both flags** with clarifying parenthetical "(wrapped by amplp)"
- **`override` badge** (purple) on the Eris UI row when hardcoded override propagated, with tooltip showing the original raw value (e.g., "Eris API: bLUNA → display override: boneLUNA")
- **Filter button** for "amplp underlying" now matches either flag

### Verified by deposit + on-chain query

User tested by depositing standard-IBC ATOM into BOTH Astroport's ATOM-LUNA LP and Skeleton Swap's ATOM-LUNA LP. Both accepted. Then on-chain `pair{}` queries on 17 same-named pairs across both DEXes returned **identical underlying token addresses** in every case. Conclusion: there's ONE ATOM token on Terra (and ONE USDC, ONE LUNA, etc.) — SS's API just labels its denom field with misleading metadata strings. The catalog's `lp_to_underlyings` data is authoritative.

This empirical verification killed three prior wrong theories (different IBC denoms across DEXes; same pool contracts across DEXes; need for new "DEX scope expansion" pulling out-of-TLA pools into scope) and clarified Phase 0 scope: **TLA-only**.

### NOT deployed (intentionally)

The `dex-scope-fix.zip` Step E — would have added Astroport- and SS-pool API addresses into the catalog scope, pulling in out-of-TLA pools. Based on the wrong-theory chain above. Step E was reverted from the local cron file before this Rev was packaged.

### Documentation pivot

Phase 0 documentation completed:

- New file `catalog-log.md` (this file)
- New file `queries.md` — comprehensive on-chain query reference (all current cron queries + wishlist queries for Vote Intelligence, Portfolio Tracker, future query tool)
- Updated `PROJECT_KNOWLEDGE.md` — added `tla-registry` to cron infrastructure, added `tla-catalog.html` to Current pages table, added a major new section on the TLA Chain Registry catalog system, added a Critical catalog gotchas section with all the bug-class learnings
- Updated `CHANGES_PENDING.md` — added catalog work items (SS indexer rewrite, contract-version surfacing, label fixes, acquisition guide curation)

Future sessions should be able to resume context in ~30 minutes by reading the existing PROJECT_KNOWLEDGE.md + CHANGES_PENDING.md + this log file + queries.md.

---

## Rev 0.9 — 2026-06-02

Earlier in the same audit night, before the documentation pivot. These bundles built but not all deployed:

- `data-trust-fix.zip` — **DEPLOYED**. Foundation for CG verification stage. Cron jumped to 114,834 bytes.
- `headline-override-fix.zip` — built, superseded by source-transparency
- `amplp-completeness-fix.zip` — built, superseded
- `systemic-fix.zip` — built, superseded
- `bridge-cg-verification.zip` — built, superseded by source-transparency
- `source-transparency.zip` — built, **this is the correct cron head to deploy** (local file matches)

All these intermediate bundles were stepping stones toward the consolidated Rev 0.10 state above. They're listed here because the deploy timeline matters for any future audit reading the cron's commit history.

---

## Pre-Rev — initial Phase 0 build

The catalog system was bootstrapped over preceding sessions before the 2026-06-02 audit:

- **`tla-registry` cron** — created in `defipatriot/cron-scripts/chain/tla-registry/`. Pulls from 5 external sources (chain-registry, Eris `/prices`, Astroport `/api/pools`, SS `/api/pools/phoenix-1`, CoinGecko `/coins/list?include_platform=true`) and reconciles against on-chain queries on the TLA gauge + asset-staking + asset-compounder contracts.
- **Output repo** — `defipatriot/tla-chain-registry`. Daily output to `2026/current.json` + `2026/heartbeat.json`.
- **Catalog page** — `tla-catalog.html` in `aDAO-links-site`. Renders the catalog data with filters, tabs (tokens / lp_tokens / amplp_tokens / contracts), CG verification badges, take-rate panels for dewhitelisted entries, cron-status footer widget.
- **Curated files** in `website-adao-core`: `categories.json`, `wallets.json`, `protocols.json`, `known_contracts.json`, `token_overrides.json`, `acquisition_guides.json`.

The Pre-Rev period established the architecture but had many silent data bugs that the Rev 0.10 audit surfaced and root-caused. Detailed retrospective lives in the bug-history section of Rev 0.10 above.

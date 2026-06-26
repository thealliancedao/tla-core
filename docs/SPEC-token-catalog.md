# SPEC — token-catalog

The TLA **WORTH layer**: what tokens exist in TLA and what they're worth, with a
confidence grade derived from how many independent price sources agree. Companion
to address-catalog (the WHO layer). Built in stages, each verifiable on a parallel
run before the next is layered on.

> **Scope guard:** only what is *in TLA* (active + inactive gauged pools) — never the
> whole of Astroport / SkeletonSwap / Credia. Discovery defines the price list.

---

## Public-output framing (READ FIRST — repos are public)

All committed output is **descriptive, never attributive.** We report what the
numbers show; we never imply motive, control, or bad faith about any protocol.

- ✅ "wBTC.atom — 4 independent sources, agreement within 0.3%. Confidence: high."
- ✅ "xASTRO — 1 source available. Confidence: low (fewer independent price points
  to cross-check)."
- ❌ Never: a named protocol described as alterable/exploitable/manipulable, or any
  language implying a partner acts in bad faith.

The score's purpose is to help the community feel informed about price-robustness —
assuming good faith of everyone. The risk *rationale* (why independent sources make
a price more robust) is design context; even there the language stays neutral
("more independent sources make a price harder to disrupt"), never accusatory.
Inter-protocol politics stays in conversation, never in committed files.

---

## Stages

| Stage | Adds | Status |
|-------|------|--------|
| **1 — discovery** | pools (active + inactive) + underlying tokens | built |
| **2 — identity**  | native/IBC/wrapped, route, logo, variations, override layer | spec'd below |
| **3 — pricing**   | 4 sources, snapshot-coherent, spread + confidence grade | spec'd below |

Reserves & slippage *grading* (#10/#11) are OUT — that's the `dex-data` domain.
token-catalog stops at "what exists and what it's worth + how trustworthy the price."

Output: `tla-core` `token-catalog/snapshots/` — Stage 2/3 enrich the SAME
`current.json` (the page reads it throughout). Forward-only.

---

## Stage 1 — Discovery (built)

Chain (grounded in queries.md, proven in tla-registry):

1. **Active pools** — gauge `distributions` (active set + vote %).
2. **Inactive pools** — `whitelisted_asset_details` per staking bucket
   (active + below_threshold + dewhitelisted, `whitelisted:true|false` + take-rate).
   ⚠ Phase-0 scar: this query, NOT `whitelisted_assets` (active-only).
3. **Underlyings** — cw20 LP → `minter` → pair → `pair{}` asset_infos;
   native/factory LP → pair from `factory/{addr}/` denom → `pair{}`. Each underlying
   denom is distinct (wBTC.axl ≠ wBTC.eureka — variations preserved).

**Single-asset stakes** (xASTRO, wBTC.creda.a, ampCAPA, etc.) have no two-sided
pair by design. They are `pool_kind:'single_asset'`, underlying = the staked token
itself, and must NOT count as resolution failures. `partial`/`error` status is
reserved for genuine chain-read failures (minter/pair query returning null).
A dead dewhitelisted single-asset with no on-chain record (e.g.
`terra1sjujv…68ens`, unresolvable even on explorers) stays `single_asset,
label:unknown, status:dead` — not chased.

---

## Stage 2 — Identity + the override layer

For each token: `symbol/display`, `kind` (native / ibc / cw20 / factory),
`wrapped?` + `route` (e.g. wBTC via Eureka through Cosmos Hub), `logo_url`,
`variation_of` (wBTC.atom / .axl / .osmo are siblings), and the `coingecko_id`.
Sourced from curated files (`token_overrides.json`, `acquisition_guides.json`,
chain-registry) — lookup, not query. (Curated reads use SHA-pinned raw URLs to
bypass Fastly's 5-min cache — a real bug fixed 2026-06-05.)

### Per-field override model (the human-correction layer)

Each overridable field is a block, never a bare value:

```json
"coingecko_id": { "discovered": "terra-usdc-noble", "override": true,
                  "value": "usd-coin", "note": "no Noble-USDC CG id; drift accepted" }
```

Rule: `override:false` → use `discovered`. `override:true` → use `value`.
Discovery keeps running underneath even when overridden — clearing an override
auto-returns to the live read (e.g. if Astroport relabels a denom to match TLA 1:1,
reverting restores the match and lifts the grade).

- Overrides live in `token_overrides.json` (curated, tla-core) — **never** in the
  cron's discovered output. Merged at read time. The cron writes only what it found;
  the override file is the human layer; the merged view is computed on read. A wrong
  override can never corrupt the discovered record.
- An **editable HTML page** (standalone/local for now): shows LPs in buckets
  (active/inactive) like the TLA UI, toggle to token-view, per-field override
  toggles. Toggling `override` true writes the `value`. Page **downloads an updated
  `token_overrides.json`** to commit — or a contributor opens a PR against it and the
  maintainer approves (why branch protection exists).

---

## Stage 3 — Pricing: four sources, one coherent snapshot

### The four sources (each = ONE bulk call, confirmed from live captures)

| Source | Call (powers that provider's own UI) | Per-item shape |
|---|---|---|
| CoinGecko | `simple/price?ids=…&vs_currencies=usd` | id → `{ usd }` (external reference) |
| TLA | `backend.erisprotocol.com/prices` | denom → `{ price_usd, decimals, display, [coingecko_id] }` |
| Astroport | `app.astroport.fi/api/trpc/tokens.byChain` (phoenix-1) | token → `{ priceUsd, symbol, token, decimals }` |
| SkeletonSwap | `dex.warlock.backbonelabs.io/api/pools/phoenix-1` | pool → `{ reserve_0, reserve_1, tvl_usd, timestamp, block_height, token_0, token_1 }` |

- **Source-selection rule:** each provider's canonical price is *whatever its own UI
  reads to display the number to users.* Match what they see, or the comparison
  isn't meaningful. (Confirmed: Astroport `tokens.byChain`, SkeletonSwap warlock
  `/api/pools`. TLA `backend/prices` returns the exact UI token set — confirm by a
  one-time devtools glance for the call on the liquidity hub.)
- DEX prices are **pair-implied**: reserve ratio × the priced side. SkeletonSwap's
  warlock response carries `timestamp` + `block_height` natively (free snapshot
  anchor). Astroport pair reserves come from `pools.getAll` in the same pass when the
  pair-implied price is needed.

### Snapshot coherence (the rule that makes the spread honest)

Prices fetched seconds apart turn normal market movement into a fake spread.
Therefore:

1. Fetch all four feeds as a **tight parallel batch** (each is one bulk call → a full
   snapshot is ~4 requests, ~1s window, not minutes).
2. **Stamp every price** with its capture instant (`captured_at`; SkeletonSwap also
   carries its own `timestamp`/`block_height`).
3. Compute spread **only across reads inside one snapshot window**. A feed outside
   the window is flagged `stale` — never counted as `disagreement`.
4. A flagged divergence then means the sources *genuinely* disagree, not that a read
   lagged. Honest data over false positives.

### Per-token output shape

```
{
  denom, ticker, coingecko_id, kind, variation_of,
  prices: {
    coingecko:   { usd, captured_at, status },
    tla:         { usd, captured_at, status },
    astroport:   { usd, pair_implied?, captured_at, status },
    skeletonswap:{ usd, pair_implied?, timestamp, block_height, status }
  },
  snapshot_window_ms,
  confidence: { sources_available, sources_agreeing, spread_pct, grade, flags[] }
}
```

### The two community-facing numbers (descriptive only)

- **Source coverage / agreement** → confidence grade. More *independent* sources that
  agree → higher grade. (External CoinGecko + permissionless on-chain DEX pools that
  concur are robust; a single-source price is simply lower-confidence — stated
  neutrally, no protocol named as a risk.)
- **Price divergence** → how far the DEX pools sit from the external reference.
  Wide divergence is surfaced as a token-health signal ("prices differ across
  sources; higher LP risk"), never as an accusation.

Open design choice to confirm: spread measured **pairwise (max gap between any two)**
vs **vs-reference (distance from CoinGecko/median)**. Pick the one that tells the
integration story best.

---

## Build / parallel-run discipline

Self-contained (queries chain + the 4 feeds directly; structural addresses from
`config/contracts.js`). Run alongside the legacy crons (network-and-prices,
contract-token-catalog, tla-registry); verify identical; then retire those three +
their data repos together. `org-` Render prefix; scoped per-cron token.

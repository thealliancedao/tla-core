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

---

## Lessons from the old way (mine, don't inherit)

The legacy `tla-registry` cron (3,093 lines, fed the old `tla-catalog.html`) is a
**reference for lessons and forgotten ideas — not a template.** We build our own
structure; we take only (1) plumbing we forgot to wire, and (2) failure modes they
hit the hard way. We do NOT inherit their score formula, output shape, or page.

### Plumbing worth taking forward

- **Logo cascade.** Why our viewer shows blanks: we never wired a logo source. The
  proven priority chain to adopt (per token): curated override → cosmos
  chain-registry `logo_uri` → SkeletonSwap `logo_url` → (future: Eris CDN /
  Astroport / CoinGecko). Page-side `<img onerror>` falls back to a letter-circle,
  so a dead URL never breaks the view. LP "logos" are composited from the two
  underlyings at render time, not stored.
- **Upstream source set** (one bulk call each — same feeds we traced for pricing):
  cosmos chain-registry terra2 assetlist (symbol/decimals/logo/IBC traces),
  `backend.erisprotocol.com/prices`, Astroport pools, SkeletonSwap (warlock),
  CoinGecko `coins/list?include_platform=true` (for verification, below).

### Failure modes a good identity/score MUST catch (their scars)

- **"Claimed CG id" ≠ "verified CG id."** Their worst bug: a token carrying a
  CoinGecko id passed as score-100 even though CoinGecko didn't actually index that
  address (the rSWTH bug). Fix they learned: cross-check the address against
  CoinGecko's own `terra-2` platform index. States to distinguish:
  `verified` (CG indexes this terra-2 address) / `verified_via_bridge` (CG indexes
  the *source* asset and our bridge trace matches it) / `unverified_no_terra_addr`
  (id claimed, CG doesn't index the address — common for IBC, not necessarily wrong)
  / `mismatch` (CG has a *different* id for this address — real red flag) /
  `no_mapping`.
- **Cross-source name mismatch.** When chain-registry / Eris / Astroport / SS
  disagree on a token's symbol (ignoring `.suffix` variants), that's a confusion
  signal worth surfacing.
- **Wrapped-looks-native danger class.** Acquisition classes they found useful:
  `native_terra` (no guide needed) / `ibc_cosmos_native` (one-hop, no guide) /
  `wrapped_disclosed` (guide useful) / `wrapped_looks_native` (guide REQUIRED — the
  dangerous bucket: a bridged asset whose name hides that it's wrapped).
- **Bridge provenance.** chain-registry IBC traces let you verify a bridged token's
  true origin (e.g. PAXG → Ethereum), which both confirms CG mappings and powers the
  acquisition route.

### What we do differently (our structure, not theirs)

- Their `confusion_score` conflates identity-confusion + price-coverage +
  acquisition into one subtracted number. **We split it into composable sub-scores**
  (per "Grading", below) so a low grade always says *why*.
- Their overrides were partly hardcoded in-cron ("drama-not-data" blocks). **Ours
  live only in `token_overrides.json`, per-field, merged on read** — never in code.
- Their output was one giant registry shape tied to one page. **Ours is the clean
  `module/product` snapshot, consumed by whatever reads it.**

---

## Grading (our model — composable sub-scores, not one number)

A token's overall grade is composed from independent sub-scores, each owned by the
cron that can actually measure it. Kept separate so the grade always explains itself.

- **Identity confidence** (token-catalog, Stage 2): do sources agree on what this
  token IS? Inputs: cross-source name agreement, CG-verification state (above),
  acquisition class clarity, logo presence. Surfaced descriptively
  ("identity verified" / "identity unverified — sources disagree").
- **Price confidence** (token-catalog, Stage 3): how robust is its price? Inputs:
  number of independent sources, snapshot-coherent agreement (spread), DEX coverage.
  (Public framing stays descriptive — "N independent sources, X% agreement" — never
  attributive about any protocol.)
- **Liquidity / depth** (dex-data, later): pool depth, slippage at trade sizes.
  NOT token-catalog's job.

These compose into an overall token grade later. Each sub-score is published with
its inputs so the page can show the breakdown, not just a mystery number.

### Composite grade + editable weights (DECIDED)

One **composite** grade, sortable, computed from the weighted sub-scores:

```
overall = w_price * price_confidence + w_identity * identity_confidence
```

Default weights: **price 0.75, identity 0.25**. The weights are NOT hardcoded —
they live in config (a `scoring_weights` block in a curated file, sibling to
`token_overrides.json`), are editable in the tool, and are **recorded in the cron
output** so every scored snapshot says which weights produced it. Adjust the number,
re-run, grades shift — no code change. (Same philosophy as per-field overrides: the
human keeps the judgment calls.)

```json
"scoring_weights": { "price": 0.75, "identity": 0.25 }
```

**Display:** one overall badge (for ranking/sorting), expandable to show the two
sub-scores AND their inputs — a low grade must explain itself ("62 overall — price 55:
only 1 source; identity 85"). Breakdown stays descriptive (source counts, agreement %),
never attributive.

**Missing-sub-score rule (settle at Stage 3 build):** when a sub-score can't be
computed (e.g. a new token with no price sources yet), do NOT show a misleading 0 —
show "no data" and either renormalize weights to what's available or mark the overall
"partial," so an unmeasured token doesn't look *bad*. Decide the exact behavior when
building Stage 3.

---

## Contribution & verification model (DECIDED — PR-only, no file transfer)

Anyone (projects, members, devs) can propose edits. Trust split: **anyone proposes,
the maintainer approves, the diff is the verification.**

- **No files emailed/sent.** A file in an inbox is an attachment to open (malware
  surface). A pull request is text reviewed in the browser — nothing downloaded, run,
  or opened. PR-only by design.
- **Flow:** contributor edits in the tool → downloads the corrected
  `token_overrides.json` → forks `thealliancedao/tla-core`, places it at
  `docs/curated/token_overrides.json`, opens a PR → maintainer reviews the **diff in
  the browser** and approves or closes. Branch protection means nothing reaches `main`
  without approval (this is why it was enabled).
- **Audience is git-literate protocol teams** (Astroport, TLA, project devs), so a
  one-click PR flow / serverless proxy is unnecessary — footer instructions suffice.
  (If the audience ever broadens, revisit the GitHub prefill-link approach before any
  backend.)
- **The download must be strictly-shaped and stably key-ordered** so the PR diff shows
  only real changes (3 edited fields, not 200 reshuffled lines). Clean diffs are what
  make maintainer + AI verification fast and reliable.
- **Verification watches for *plausible* falsehoods,** not obvious vandalism: a
  `coingecko_id` swapped to a different real token's id, a logo pointed at a lookalike,
  a wBTC variant relabeled to mask its bridge, or (highest stakes) an acquisition
  `verified_link` pointing somewhere phishy a member might send funds to. Verify each
  edit makes identity *more* true, not false-looking.

Footer copy for the Stage 2 override page:
> Contributing a fix? Download the updated file, then open a PR against
> `thealliancedao/tla-core` at `docs/curated/token_overrides.json`. Maintainers review
> the diff and merge. Edits are proposals — branch protection means nothing changes
> until approved.

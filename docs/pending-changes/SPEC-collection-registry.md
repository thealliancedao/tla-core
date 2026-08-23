# SPEC — Collection Registry (multi-collection platform)

**Status: DRAFT for owner review · 2026-08-23 · blocks page retrofits — build new page work against this shape**

## The idea in one paragraph

Everything the site and crons know about aDAO today is hard-coded. This spec
moves that knowledge into ONE registry file per collection, committed to the
org repo. A collection leader fills in a JSON file (or sends us the answers and
we fill it in), the entry is enabled, and from that moment the crons capture it
and the site grows a collection-selector tile — Explorer, Analytics, Wallet,
Member Portfolio, Lore, DAO pages, and TLA Stats (when their DAO participates
in TLA) all render that collection exactly as they render aDAO. No forked
pages, no copied crons. If a collection would rather self-host, the entire
repo is theirs to fork — the registry entry is the only thing they change.

## Files

```
tla-core/collections/registry.json          ← the index: [slug, enabled] pairs
tla-core/collections/<slug>/collection.json ← one file, everything below
tla-core/collections/<slug>/metadata.json   ← 10k-style trait metadata, org format
tla-core/collections/<slug>/rarity.json     ← ranking records (org format, see below)
```

Products land under the existing convention: `nfts/<slug>/snapshots/…` — aDAO's
`nfts/adao/…` is already this shape; nothing moves.

## collection.json — the contract

Field-by-field. `null` is always legal and means "feature off / not applicable"
— blank beats phantom applies to configuration too.

### Identity
| field | example | notes |
|---|---|---|
| `slug` | `"adao"` | path segment, lowercase, permanent |
| `name` | `"The Alliance DAO"` | display name |
| `nft_contract` | `terra1phr9…apw9` | CW721 |
| `chain` | `"phoenix-1"` | LCD selection |
| `supply` | `10000` | hard integrity gate for every product |

### Traits & ranking
| field | notes |
|---|---|
| `traits` | ordered list of trait_types with per-trait display config: `{"name":"Planet","filter":"slider-direction"\|"multi-select"\|"chips","split_suffixes":[" North"," South"]}` — this is how the universal trait-filter builder knows what to render; aDAO's Planet/Inhabitant direction sliders become one declared pattern any collection can pick |
| `rarity` | `{"method":"intended"\|"statistical","file":"rarity.json","secondary":{"label":"BBL","source_url":…}\|null}` — rarity.json rows: `{token_id, grade, intended_rank, percentile, …}` (the shape aDAO already publishes) |

### Images & metadata
| field | notes |
|---|---|
| `images` | `{"cdn_pattern":"https://…/{id}.png","ipfs_fallback":true}` — the explorer builds URLs from the pattern; metadata.json carries per-token `image`/`thumbnail_image` ipfs:// for fallback |
| `metadata_file` | `collections/<slug>/metadata.json` — org format: `[{id, name, attributes:[{trait_type,value}]}]` |

### Backing (null when unbacked)
```json
"backing": {
  "treasury_address": "terra1…",
  "token": { "type": "cw20", "address": "terra1…", "symbol": "ampLUNA" },
  "per_nft_rule": "treasury_balance / unbroken_count",
  "break_mechanism": true
}
```
`break_mechanism:true` turns on the whole broken/unbroken vocabulary (badges,
filters, backing exclusion). Collections without redemption set it false and
every broken-related surface disappears for them.

### Governance
```json
"governance": {
  "dao_address": "terra1sffd…5vzm",
  "dao_platform": "daodao" | "enterprise" | null,
  "staking_contract": "terra1c57u…qx47",
  "council_address": "terra1…" | null,
  "council_members_source": "registry" | "manual-list" | null
}
```
`staking_contract` drives staked/pending-claim/custody capture — the C.6
custody laws (raw-ownership counting, unattributed bucket, classification-sum
guard to `supply`) apply to every collection identically.

### Marketplaces
```json
"marketplaces": [
  { "key": "bbl", "token_url": "https://app.backbonelabs.io/nfts/marketplace/collections/{contract}/{id}",
    "collection_url": "…", "royalty_bps": 500 },
  { "key": "atrium", "token_url": "https://atrium.markets/atrium/{contract}/{id}", … },
  { "key": "boost", … }
]
```
Capture vocabulary per venue lives in tla-voting/capture-registry.json (already
venue-keyed); this section only declares WHICH venues + URL patterns + expected
royalty (the sentinel and the royalty audit read the expectation from here).

### Feature flags — what the site turns on
```json
"features": {
  "explorer": true,
  "analytics": true,
  "wallet_view": true,
  "member_portfolio": { "enabled": true, "wallet_tracking": true },
  "member_name_registry": true,
  "dao_audit": true,
  "lore": true,
  "tla_stats": true,
  "trait_filters": true
}
```
`wallet_tracking:true` means the collection consents to the portfolio system
storing wallet→holdings history for its members (same catalog machinery as
aDAO's). `tla_stats` only makes sense when the DAO participates in TLA.

## How discovery works

- **Crons** (platform-crons): each nfts module gains a thin loop — read
  registry.json, iterate enabled slugs, run the existing pipeline with the
  collection.json values where aDAO constants sit today. One codebase, N
  collections; products at `nfts/<slug>/snapshots/…`. Parallel-run law applies:
  aDAO's current hard-coded path keeps running until the registry-driven path
  is verified against it byte-for-byte, then the constants retire.
- **Site**: pages fetch registry.json once (cached). >1 enabled collection ⇒
  the collection-selector tiles render (Explorer / Analytics / Wallet /
  Portfolio / Lore / DAO / TLA-Stats headers); selection persists like the
  rank-system toggle (sessionStorage + `?collection=` URL param, shareable).
  Every hard-coded aDAO constant a page needs (contract, supply, image
  pattern, marketplace URLs, backing fields) reads from the selected
  collection's config instead. **The perf bundle generalizes for free** —
  `nfts/<slug>/snapshots/explorer-bundle.json` per collection, flags identical.

## Onboarding flow (what a collection leader actually does)

1. Fill collection.json (or answer the field list above in chat — we transcribe).
2. Provide metadata.json + rarity.json in org format (we have converters; "we
   can make that happen").
3. PR to tla-core → review → `enabled: true`.
4. Next cron pass captures; the site shows their tile. Done.
5. Self-hosting instead: fork the org repos, keep your own registry — every
   law, gate, and page comes along.

## Build order (proposed)

1. **This spec approved** → seed `collections/adao/collection.json` with aDAO's
   real values (identity/backing/governance/marketplaces are all known).
2. Pages under audit going FORWARD read constants from a tiny
   `lib/collection-config.js` shim that today returns the aDAO entry — zero
   behavior change, retrofit done incrementally as pages get touched anyway.
3. Cron loop + second-collection pilot (Pixel Lions is the natural candidate —
   already in the catalog roster) — full session of its own.
4. Selector tiles once the pilot's products verify.

## Open questions for the owner

- Pixel Lions as pilot — do we have their leaders' go-ahead for metadata + a
  rarity method?
- Per-collection lore: same page with a collection switch, or per-collection
  lore files? (Spec assumes lore file per slug.)
- Portfolio wallet-tracking consent: registry flag enough, or want an explicit
  signed-off note per collection in the repo?

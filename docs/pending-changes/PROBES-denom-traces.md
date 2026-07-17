# PROBES — IBC denom traces (COMPLETE 2026-07-17 — all 17 traced)

**Purpose (original):** resolve every IBC denom carried with
`no_discovered_symbol` in the token-catalog snapshot.
**Outcome (actual):** a full chain-exact **reconciliation of the curated
identity layer**. All 17 traces ran; every one that has a
`token_overrides.json` entry **matched it exactly — 14/14**. The curated
layer is verified against chain truth. Two denoms had no override entry at
all (INJ, stATOM — now added, trace-verified). The final denom (DGN, a
bribe-only token) required a second run because the first version of this
doc carried a WRONG hash (reconstructed from a truncated display — process
error, recorded here so it isn't repeated: full hashes come from committed
data, never from extending a truncated string).

---

## Verified results (trace → override match)

| denom (short) | trace base_denom | path | identity | override match |
|---|---|---|---|---|
| ibc/517E13F1… | factory/migaloo1…/boneWhale | channel-86 (Migaloo) | **bWHALE** | ✓ (72 bribe events) |
| ibc/B3F63985… | factory/migaloo1…/ampWHALE | channel-86 (Migaloo) | **ampWHALE** | ✓ (19 bribe events) |
| ibc/792AAE62… | swth | channel-36 (Carbon) | **SWTH** | ✓ (1 bribe event) |
| ibc/27394FB0… | uatom | channel-0 (Cosmos Hub) | **ATOM** | ✓ |
| ibc/88386AC4… | transfer/08-wasm-1369/0x2260fac5… | channel-0 (Eureka via Hub) | **wBTC.atom** | ✓ |
| ibc/05D29988… | wbtc-satoshi | channel-6 (Axelar) | **WBTC.axl** | ✓ |
| ibc/CF57A83C… | factory/osmo1…/wbtc | channel-1 (Osmosis) | **WBTC.osmo** | ✓ |
| ibc/08095CED… | stuluna | channel-46 (Stride) | **stLUNA** | ✓ |
| ibc/25BC5938… | inj | channel-255 (Injective) | **INJ** | entry ADDED 2026-07-17 |
| ibc/223FF539… | factory/neutron1…/udatom | channel-229 (Neutron) | **dATOM** | ✓ |
| ibc/0E900266… | urswth | channel-204 | **rSWTH** | ✓ |
| ibc/FD9DBF0D… | stuatom | channel-46 (Stride) | **stATOM** | entry ADDED 2026-07-17 |
| ibc/4B44179A… | factory/neutron1…/fuel | channel-229 (Neutron) | **FUEL** | ✓ (LUNA-FUEL LP) |
| ibc/65B3EB62… | factory/neutron1…/xASTRO | channel-229 (Neutron) | **xASTRO** | ✓ |
| ibc/1319C6B3… | wbnb-wei | channel-6 (Axelar) | **wBNB.axl** | ✓ |
| ibc/BC8A77AF… | weth-wei | channel-6 (Axelar) | **WETH.axl** | ✓ |
| ibc/B2AA4C3C… | udgn | channel-582 | **DGN** | bribe-only — see below |

## DGN — the bribe-only denom (resolved)

Full denom (verbatim from `tla-voting/events/bribes/2024/12.json`):
`ibc/B2AA4C3CD19954859C3B537EC0705640AFC01075F52993D9AC5E73F07F0386CC`
→ trace: `base_denom udgn`, `path transfer/channel-582` → **DGN**
(6 decimals implied by the u-prefix). Used in 7 `bribe_add` events,
Dec 2024–Jan 2025, all by the same briber, into bluechip + WHALE-LST pools.

Scope note: DGN appears ONLY as a bribe token, never in a gauged pool, so it
is **outside token-catalog scope** (SPEC-token-catalog scope guard) and gets
no `token_overrides.json` entry. The briber-board builder (SPEC-tla-voting-
briber-board) takes its display name from THIS committed record: `unpriced[]`
entries may carry a `display` field when a trace record exists here — named,
still unpriced (no DGN series in price-history), never guessed.

## Downstream effects

- **Briber board: 100% identity coverage.** Every one of the 173 direct
  bribe events now maps to a named token. Priceable against price-history:
  bWHALE (72) + ampWHALE (19) + FUEL/SWTH/ATOM/wBTC/ASTRO/CAPA/SOLID/ROAR/
  LUNA/USDC/ampLUNA events. Named-but-unpriced: DGN (7 events — no price
  series). Pricing coverage to be confirmed exactly in the schema-5 rollup
  verify (§5 of SPEC-tla-voting-briber-board).
- **Pricing gaps to note:** xASTRO and rSWTH have no direct price-history
  series — priceable via base-token × on-chain ratio per PRICING-DOCTRINE
  (hub-ratio primary) if/when needed. DGN has no series and no ratio path;
  it stays honestly unpriced.
- **token_overrides.json** updated same day: INJ + stATOM entries added,
  both trace-verified, zero existing entries modified, `lastUpdated`
  bumped to 2026-07-17.

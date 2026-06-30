# SPEC — price-history file format (the shared contract)

The canonical price time-series. ONE format, used by three writers so they snap
together: the backfill (seeds the past), the June fold (transition), and
token-catalog forward (rich days from July). Consumers (bribes USD, NFT backing,
portfolio P&L) read ONLY this.

## File layout

```
price-history/<YYYY>/<MM>.json          daily token prices (the series)
price-history/ratios/<YYYY>/<MM>.json    daily LST ratios
price-history/heartbeat.json
```

One file per month. Every day of that month is a key inside. All tokens for that
day are inside the day. Merge-safe: writing one token never clobbers another.

## Month-file shape

```json
{
  "meta": {
    "module": "price-history",
    "format_version": 1,
    "updated_at": "2026-06-30T12:00:00Z",
    "note": "daily token USD prices; thin historical, rich forward"
  },
  "days": {
    "2026-06-15": {
      "LUNA":   { "usd": 0.0461, "src": "coingecko" },
      "ampLUNA":{ "usd": 0.0974, "src": "LUNA×ratio(interpolated)" }
    },
    "2026-06-29": {
      "LUNA": {
        "usd": 0.04624,
        "src": "tla",
        "confidence": "high",
        "sources": { "tla": 0.04624, "astroport": 0.04624, "coingecko": null, "skeletonswap": 0.04652 }
      }
    }
  }
}
```

## The per-token daily entry — TWO tiers, SAME shape

Both tiers are `{ usd, src, ... }`. `usd` is ALWAYS present and is the canonical
price for that day. Consumers can always just read `usd`. Extra fields are bonus.

**THIN (historical / backfill)** — all the past can give us:
```json
{ "usd": <number>, "src": "coingecko" | "LUNA×ratio(<tier>)" }
```

**RICH (forward / token-catalog from July; also the folded June 26-30 days)** —
adds multi-source detail so the UI can show confidence & disagreement:
```json
{
  "usd": <number>,            // canonical (token-catalog's chosen final price)
  "src": "tla",               // which source won
  "confidence": "high"|"medium"|"low",
  "sources": {                // per-source prices (null = no_data that day)
    "tla": <number|null>,
    "astroport": <number|null>,
    "coingecko": <number|null>,
    "skeletonswap": <number|null>
  }
}
```

## What price-history carries vs NOT

CARRIES (price-relevant, belongs in a time-series):
- usd, src, confidence, per-source prices, (for LSTs) the ratio + tier

Does NOT carry (current-state, lives in token-catalog/snapshots/current.json):
- scoring, identity_flags, pool membership, found_in_pools, discovery metadata
→ price-history is "what each token was worth each day," not the full dossier.

## Ratios file (parallel, same monthly shape)

```json
{
  "days": {
    "2024-06-15": { "ampLUNA": { "ratio": 1.90, "base": "LUNA", "tier": "interpolated" } },
    "2026-06-29": { "ampLUNA": { "ratio": 2.19, "base": "LUNA", "tier": "chain_exact" } }
  }
}
```
tier ∈ chain_exact (archived/live) | interpolated (deadzone, bounded) | edge.

## The timeline (honest data philosophy)

- **genesis → ~June 26 2026**: THIN. CoinGecko daily price (majors) + base×ratio
  (LSTs). Best we can recover; clearly the thin tier.
- **June 26 → June 30 2026**: RICH (folded from token-catalog's 5 captured daily
  snapshots). Transition days inside 2026/06.json.
- **July 1 2026 →**: RICH, uniform. token-catalog appends each day. Clean break.

History is the honest foundation; forward is the full picture. Do the best with
what the past gives; make it genuinely rich going forward.

## Writers (who targets this format)

1. **price-backfill** (Action) — seeds THIN historical days. genesis → present.
2. **June fold** (one-time) — reads token-catalog/snapshots/daily/2026-06-{26..30}.json,
   extracts price-relevant fields → RICH days into price-history/2026/06.json.
3. **token-catalog** (forward, step 2 of rollout) — after computing prices each
   run, appends today's RICH day. Additive change; existing outputs untouched.
   Wired when we cut over to July.

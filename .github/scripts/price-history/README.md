# price-backfill — Historical Price + Ratio Foundation

On-demand backfill of daily token prices and LST ratios, as far back as data
allows (TLA genesis 2022-10-31). Runs as a **GitHub Action with a token picker**:
go to the Actions tab, pick a token, run. Seeds the historical foundation that
bribes-USD, NFT backing, portfolio P&L, and any historical valuation read from.

## Why this exists

Historical token prices are RECOVERABLE (CoinGecko has them) — unlike pruned
on-chain state. This builds that foundation ONCE. Going forward, the daily
prices/network cron appends to the same files.

## Three token classes

**1. Liquid majors** (LUNA, ATOM, INJ, wBTC, ETH, USDC, USDT, PAXG, EURe, ASTRO,
CAPA, SOLID, ROAR) → CoinGecko daily price directly. Real, liquid, no dead zones.

**2. LSTs** (ampLUNA, arbLUNA, bLUNA, ampCAPA) → price = `base × ratio`. The RATIO
is the honest source, because CoinGecko's USD price for thin LSTs has **dead zones**
(flat straight-line interpolation where nobody traded — e.g. ampLUNA/bLUNA
2024→2025). We avoid that fake line by pricing as `base_real_price × ratio`:
- `chain_exact`  — from the archived ratio-history (2026-05-13+) and live forward.
- `interpolated` — across a dead zone, the ratio is interpolated BETWEEN two real
  anchors (early CoinGecko-derived ratio + recent exact). This is honest because
  the ratio is a smooth, monotonic accrual curve (staking yield), and we multiply
  by base's REAL daily price — so the result still tracks real volatility. Every
  day is labeled with its `tier`.

> Honest limitation: pre-2026-05-13 ratios are interpolated, not exact (the chain
> is pruned and ratios weren't archived before then). The interpolation is bounded
> by real anchors on both sides, so it's a defensible estimate — far better than
> CoinGecko's straight-line fake — but it is an estimate, and labeled as such.

**3. FUEL** → no CoinGecko id; seed from the old fuel OHLC data separately (TODO).

## Output (tla-core)

```
price-history/<YYYY>/<MM>.json          { days: { "YYYY-MM-DD": { SYM: {usd, src} } } }
price-history/ratios/<YYYY>/<MM>.json    { days: { "YYYY-MM-DD": { SYM: {ratio, base, tier} } } }
price-history/heartbeat.json
```

Month-files: one per month, every day inside, all backfilled tokens per day.
**Idempotent + merge-safe**: backfilling wBTC won't clobber LUNA already written
for the same day — each token merges into the day's object.

## How to run (GitHub Action)

1. Actions tab → **Price Backfill** → Run workflow.
2. Pick the **token** from the dropdown; optionally set **backfill_from**.
3. Run. It writes that token's full history into the month-files.
4. Repeat per token. (Each run does one token, so it's gentle on CoinGecko's
   rate limit. Run them one at a time, or space them out.)

### Where it lives / secrets

The Action lives **in tla-core** (the repo it writes to): `.github/workflows/
price-backfill.yml` + `price-history/backfill.js`. Because it runs inside the repo
it commits to, it uses GitHub's **automatic `GITHUB_TOKEN`** — **no PAT needed.**
The workflow declares `permissions: contents: write` so the auto-token can commit.

Optional secret (Settings → Secrets → Actions):
- `COINGECKO_API_KEY` — a demo key raises CoinGecko's rate limit. Without it the
  free tier still works for one token at a time.

### Canonical home — one source of truth

`price-history/` is THE canonical price time-series. This backfill seeds the PAST;
going forward, the daily price capture APPENDS today's row to the same month-files
(a follow-up wires token-catalog or a tiny daily appender to do this). So past +
future are ONE coherent series — not two competing sources. token-catalog keeps
its own rich `snapshots/` for current full-state; `price-history/` is the lean,
canonical price-only history that bribes / NFT backing / portfolio P&L all read.

## CoinGecko ids (harvested, no need to gather)

LUNA terra-luna-2 · ATOM cosmos · INJ injective-protocol · wBTC wrapped-bitcoin ·
ETH ethereum · USDC usd-coin · USDT tether · PAXG pax-gold · EURe euroe-stablecoin
· ASTRO astroport-fi · CAPA capapult · SOLID solid-2 · ROAR lion-dao ·
ampLUNA eris-amplified-luna · arbLUNA eris-arbitrage-luna · bLUNA backbone-labs-staked-luna

## Recent changes

- **1.0.0** — initial. CoinGecko daily prices for majors; LST price via base×ratio
  with chain-exact + interpolated tiers (honest dead-zone handling); ratio history
  output; month-file structure; idempotent merge; GitHub Action token-picker.

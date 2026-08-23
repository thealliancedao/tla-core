# PLAN — the genesis walk (pixel-lions backfill + co-capture)

Session opener: "Read PROJECT_KNOWLEDGE, CHANGES_PENDING, and PLAN-genesis-walk,
then build the pixel-lions history backfill."

## Archive-node discipline — BINDING

The backfill uses the PRIVATE archive node we were entrusted with. Rules,
inherited from the existing core backfill and non-negotiable:

- The endpoint is a SECRET: env var / Actions secret ONLY. Never in code,
  never in any public repo, never in logs (mask it in error messages too).
- SESSION STEP ONE: locate the existing archive backfill script in our repos
  and lift its throttle implementation verbatim — same concurrency cap
  (≤5 in-flight, the phoenix-lcd saturation rule), same exponential backoff,
  same politeness delays. We were GIVEN this access; we do not burn it.
- Resumable checkpoints: every walk writes progress markers so an interrupted
  run resumes, never restarts — re-walking ranges is the abuse pattern.
- One pass, many consumers (see co-capture): never walk the same block range
  twice for two purposes.

## Era plan (recorded in pixel-lions/collection.json history_eras)

classic (columbus — BLOCKED on the classic contract address + classic archive
coverage; team in maintenance mode, may come from lore/community instead) →
migration (= phoenix mint history, free) → phoenix-FCD (genesis→2025-01-07,
frozen FCD, existing walker) → phoenix-archive (2025-01-07→now, the private
node, time-sensitive) → forward (tla-flows capture set; BBL vocab locked).
Enterprise custody address: surfaced BY the walk, verified by contract label.

## CO-CAPTURE — one genesis pass, everything we ever wanted from it

The walker filters events per block; adding contracts to the filter set is
near-zero marginal cost. We have never walked phoenix genesis→2023. While the
pass runs, capture for ALL of:

1. pixelions contract — transfers, mints (=migration record), sales, staking
   (Enterprise custody discovery + DAODAO module events)
2. aDAO NFT contract — cross-verification span vs the FCD-built corpus
   (byte-agreement check on overlapping ranges = free integrity audit)
3. TLA Locks (vAMP minter CW721) — full trade/transfer history (locks trade
   as NFTs on Atrium; ownership-change doctrine needs the complete ledger)
4. BBL payment legs (classifyNftTx v2 re-walk item) — mint prices +
   marketplace sale payment legs for per-holder cost basis, BOTH collections
5. Credia leverage stream — borrow/repay/liquidations (accepts TLA ampLP)
6. Gauge/bribe contracts pre-capture-era — early governance bribe history
7. STATE sampling piggyback at height checkpoints (weekly): hub exchange
   rates (LST USD-at-time cost basis), /terra/alliances, annual_provisions —
   the during-archive-access historical STATE sampler, done in the same pass

Products land per collection (tla-core/nfts/<slug>/…) and per stream
(existing homes). Anything captured but not yet consumed is still captured —
the archive access will not last; the block pass is the scarce resource.

## Format law for everything the walk produces

Backfill outputs conform to nft-collections/FORMATS.md — the walk is the first
big consumer of the marketplace-agnostic formats. pixel-lions is the worked
UNBACKED example other collections copy; aDAO is the backed one. No more
reverse-engineering onboarding: teams fill the _template, run
validate-collection, PR.

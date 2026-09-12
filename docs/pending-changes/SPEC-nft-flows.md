# SPEC — nft-flows: backfill + flows for every NFT collection and TLA locks
Status: BACKFILL DONE 2026-09-12 — aDAO (Dec 2023 → Jun 2026), Pixel Lions (Jun 2023 mint → head 22,810,000), TLA locks
(escrow birth Aug 2024 → Jun 2026), primary sales priced in USD at the day (aDAO $135.5K, PL $41.5K). FORWARD CAPTURE = the Render cron
`platform-crons/nfts/nft-flows` (org-nft-flows, hourly): same registry, same classifier (byte-identical), same paths.
The one-time Actions fill `nft-flows-forward` (dispatch only) closes aDAO + locks Jun 2026 → now before the cron starts.
Add a collection: docs/runbooks/RUNBOOK-add-a-collection.md. Read with CHANGES_PENDING → OPEN LEDGER.

## Why
Past data and flows for aDAO NFTs, Pixel Lions and TLA locks — mints (and what they cost, in USD at the day), transfers,
listings, buys/sells on every venue, stakes/unstakes/claims, Enterprise legacy custody, aDAO breaks, lock create/add/
extend/permanent/merge/split/convert/withdraw/transfer — so P&L knows when a wallet minted and what it paid, the explorer
can show every token's story, and forward capture knows where every token sits. Capture is collection-agnostic: a new
collection is one registry entry.

## Pieces (all in tla-core)
Output path is `nfts/<collection>/ledger/` — the on-chain EVENT ledger. `nfts/adao/flows/` already exists and is a
different product (daily state-diff from nfts/adao/flows.js); the two are not merged.
- `docs/curated/nft-collections.json` — the collection registry: collection contract, custodians (DAODAO voting module,
  Enterprise legacy) with roles, launchpad holder (outbound = primary sale), minter, distribution wallets, distributor,
  vetoer, royalty recipients PER VENUE, venues (shared table: BBL, Atrium, Boost, two 2023 venues), handle source, gate.
- `.github/scripts/nft-flows/classify.js` — `<<NFT FLOWS CLASSIFIER v1>>`, one copy (platform-crons vendors it
  byte-identical when forward capture moves over). Events are truth; FCD msg bodies enrich (Atrium/Boost list denom +
  price, DAODAO unstake token ids); a price the tx did not carry is `null` + `price_reason`, never invented.
  Kinds: mint, mint_purchase (price = payment legs ÷ tokens out in the msg), transfer, break, burn, stake/unstake/claim,
  stake_enterprise/unstake_enterprise, list/delist/sale (with venue split legs), bid, offer/offer_cancel, venue_deposit/
  venue_withdraw (wallet-level BBL bid account), venue_in/venue_out (legacy venues), backing_add (the aDAO contract
  bonding LUNA → ampLUNA), lock_create/add/extend/permanent/unpermanent/merge/split/migrate/withdraw/transfer (with
  `lineage {from_ids,to_ids,burned}` — lock history is an id graph).
- `.github/scripts/nft-flows/gate-classify.mjs` — 38 assertions: the owner's 2026-09-11/12 test txs (BBL buy/list/
  deposit/offer/cancel, DAODAO stake/unstake/claim, Boost list/buy/cancel, Atrium list/reprice/offer/accept + a lock
  listed and delisted, escrow withdraw/migrate/merge/create/split/transfer/add), 2023 venues, launchpad math, plus one
  committed tla-flows raw part and one FCD part.
- `.github/scripts/nft-flows/derive.js` (+ `nft-flows-derive.yml`, manual + Mondays) — reads every archived part on
  main (archive/fcd/<label>, tla-flows/raw/<range>, nfts/raw/<collection>/<range>), classifies, writes
  `nfts/<collection>/ledger/YYYY/MM.json` (write-once per record key), `primary-sales.json` (from `nfts/<collection>/provenance/tokens` when it exists —
  aDAO: sale_primary + mint_free, 1,952 paid + 1,191 free, 201,930 LUNA ≈ $135.5K at the day — else first launchpad exit per
  token, price, USD at the day from luna-usd-daily — USDC = 1; LST/SOLID legs null + reason until a dated series
  exists), `lineage.json` (locks), `index.json` (counts, coverage ranges NAMED by source archive, known_gaps computed
  from what is on disk — raw coverage = the walked range, not matched-tx heights; tla-flows/raw for a collection outside its
  watch set is labeled `partial: venue txs only` and never counted as covered span), `heartbeat.json`. Venue-level records (deposit/withdraw/offer) are copied under every
  collection that lists on that venue.
- `.github/scripts/nft-flows/walk.js` (+ `nft-flows-walk.yml`) — one collection's watch set over [from,to] against
  ARCHIVE_RPC (secret) or a public RPC; tx_search first (only matched txs cross the wire; block times cached), block
  walk fallback (archive-walk's loop, concurrency 2); PACE_MS after every node call, exponential backoff, run budget,
  self-chaining chunks; raw parts write-once under nfts/raw/<collection>/<from>-<to>/ in the tla-flows part shape.
- `fcd-harvest.yml` — presets added: pixel-collection, pixel-voting, pixel-enterprise.
- `.github/scripts/nft-flows/forward.js` (+ `nft-flows-forward.yml`, DISPATCH ONLY) — one-time fill: per registry entry,
  last height any archive on disk covers (`report.walked_to` honored) → head on a public RPC → walk chunks → derive.
- **`platform-crons/nfts/nft-flows/` (org-nft-flows, Render, hourly) — THE forward capture.** Global block cursor
  (`nfts/ledger-cursor.json`, bootstrapped from the lowest ledger coverage), /block + /block_results walk with
  MAX_BLOCKS_PER_RUN, watch = every collection's contracts + every venue, raw before ledger
  (`nfts/raw/<collection>/forward/YYYY-MM-DD.json.gz`), merge by recordKey into `nfts/<collection>/ledger/YYYY/MM.json`,
  index coverage `forward:org-nft-flows`, cursor written last, heartbeat. Mock 11/11. A registry entry added today is
  archived from the next run; the archive node is never needed again.

## Coverage model (per collection; derive reports it, never assumes it)
- aDAO and TLA locks: FCD harvests (genesis → 2025-01-07) + tla-flows/raw (13,737,811 → 21,481,530, already on main —
  the archive walk watched the capture-registry superset, which includes both contracts and the marketplaces) +
  forward streams. NO archive-node access needed for these two.
- Pixel Lions: FCD harvests (2023 mint era, 2023 venues) + nft-flows walk over 13,737,811 → 21,481,530 on ARCHIVE_RPC
  (PL contract + custodians were not watched by the archive walk; PL SALES on BBL/Atrium/Boost are already in
  tla-flows/raw because they touch a registered venue) + walk over 21,481,531 → head on a public RPC + forward capture
  once platform-crons carries the registry entry.
- Known limits, labeled in the data: raw parts carry events only, so archive-span Atrium/Boost LISTINGS have no denom/
  price (`msg_body_not_archived`); sales always do. DAODAO `unstake` token ids live in the msg body → null in raw-span
  records, resolved by the later `claim`.

## Still open
- FCD-freeze day 13,728,217→13,737,810 for all three (one short archive walk each, to_height set).
- Lock ledger before Aug 2024: none exists — the escrow contract was born then (FCD's first tx); earlier TLA history is tla-voting's.
- ~~PL launchpad holder~~ RESOLVED from the FCD harvest: registry carries it; derive prices every launchpad exit (10 → 12 LUNA).
- BBL `withdraw` / cancel-offer, Atrium cancel-offer + listing-expiry release verbs (from other users' txs).
- USD series for bLUNA / ampLUNA / SOLID sale legs (fold state-history hub ratios × LUNA USD).
- Inventory for PL + locks (real-owner resolution incl. Atrium-listed locks) and the explorer per collection — next.

## Owner actions (2026-09-12 evening)
1. tla-core: commit forward.js + nft-flows-forward.yml (dispatch-only) + derive.js; dispatch `nft-flows-forward` once
   (public RPC) — closes aDAO + locks Jun→now; check nfts/forward-summary.json.
1b. platform-crons: commit nfts/nft-flows/; Render → new cron `org-nft-flows`, root dir nfts/nft-flows, start
   `node index.js`, schedule `17 * * * *`, env GITHUB_TOKEN (tla-core write) + GITHUB_REPO; add it to the CRON-FLEET
   registry. First run bootstraps its cursor from the ledgers' coverage edge and takes over from there.
2. Freeze day, once per collection: `nft-flows-walk` <key> from 13728217 to_height 13737810 (blank rpc_url), then derive.
3. Done: FCD presets, PL archive + retained walks, derive #7 (PL 46,426 records, one known gap = the freeze day).

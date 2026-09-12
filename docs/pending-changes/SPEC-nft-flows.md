# SPEC — nft-flows: backfill + flows for every NFT collection and TLA locks
Status: BUILT 2026-09-12 (classifier v1 gate 38/38 · derive verified on committed raw + FCD parts · walk mock-verified).
Owner actions to run it are at the bottom. Read with CHANGES_PENDING → OPEN LEDGER.

## Why
Past data and flows for aDAO NFTs, Pixel Lions and TLA locks — mints (and what they cost, in USD at the day), transfers,
listings, buys/sells on every venue, stakes/unstakes/claims, Enterprise legacy custody, aDAO breaks, lock create/add/
extend/permanent/merge/split/convert/withdraw/transfer — so P&L knows when a wallet minted and what it paid, the explorer
can show every token's story, and forward capture knows where every token sits. Capture is collection-agnostic: a new
collection is one registry entry.

## Pieces (all in tla-core)
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
  `nfts/<collection>/flows/YYYY/MM.json` (write-once per record key), `primary-sales.json` (first launchpad exit per
  token, price, USD at the day from luna-usd-daily — USDC = 1; LST/SOLID legs null + reason until a dated series
  exists), `lineage.json` (locks), `index.json` (counts, coverage ranges NAMED by source archive, known_gaps computed
  from what is on disk), `heartbeat.json`. Venue-level records (deposit/withdraw/offer) are copied under every
  collection that lists on that venue.
- `.github/scripts/nft-flows/walk.js` (+ `nft-flows-walk.yml`) — one collection's watch set over [from,to] against
  ARCHIVE_RPC (secret) or a public RPC; tx_search first (only matched txs cross the wire; block times cached), block
  walk fallback (archive-walk's loop, concurrency 2); PACE_MS after every node call, exponential backoff, run budget,
  self-chaining chunks; raw parts write-once under nfts/raw/<collection>/<from>-<to>/ in the tla-flows part shape.
- `fcd-harvest.yml` — presets added: pixel-collection, pixel-voting, pixel-enterprise.

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

## Still open (does not block the walks)
- PL launchpad holder full address (`terra1d2gjv4f…`) → registry `launchpad.address` → re-run derive → primary-sales
  with USD at mint for all 5,000. Until then PL launchpad exits classify as transfers.
- BBL `withdraw` / cancel-offer, Atrium cancel-offer + listing-expiry release verbs (from other users' txs).
- USD series for bLUNA / ampLUNA / SOLID sale legs (fold state-history hub ratios × LUNA USD).
- Inventory for PL + locks (real-owner resolution incl. Atrium-listed locks) and the explorer per collection — next.

## Owner actions, in order
1. Commit this ZIP. Run `nft-flows-derive` once — it publishes aDAO + TLA-locks flows for everything already archived.
2. FCD harvest presets pixel-collection, pixel-voting, pixel-enterprise (politely paced; ~17 mint txs + 2023 venues).
3. `nft-flows-walk` collection=pixel from_height=13737811 final_height=21481530 (ARCHIVE_RPC; chains itself).
4. `nft-flows-walk` collection=pixel from_height=21481531 final_height=<head> rpc_url=<public RPC>.
5. Re-run `nft-flows-derive` after each; paste the index.json coverage/known_gaps lines back.

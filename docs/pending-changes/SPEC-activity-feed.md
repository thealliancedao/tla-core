# SPEC — Live Activity Feed v2 (NFT + locks, filterable)

> Status: design banked 2026-08-20 (owner request) · build queued behind the
> catalog-page rebuild. The current index.html "Live Activity" card shows only
> a thin slice and reads "No activity in the last 7 days" while plenty happens
> — this spec defines the full feed, its event taxonomy, and the chain
> fixtures proving each signature (captured from owner-supplied txs the day
> they happened; several close the pending lock-withdraw test from the queue).

## 1. What the feed shows (owner's list, verbatim scope)

NFT + lock lifecycle events users actually want to watch:
- **Staked / Unstaked** — DAODAO (aDAO), Pixel Lions DAO; **Enterprise unstake**
- **New member in DAODAO** (first stake by a previously-unseen wallet)
- **NFT transfers via known venues** — boostdao.io, NFT Switch, Atrium —
  venue-attributed, tx-linked
- **TLA locks**: newly minted · withdrawn · adjusted — each with the **ΔVP on
  TLA Total VP** at that adjustment (the number that makes the event mean
  something)
- **Marketplace**: listings added · removed · price adjusted
- Anything else NFT-related surfaced by the classifier as it grows

**Filter tabs:** All (default) · aDAO · Pixel Lions · TLA Locks — hide/show
per audience. Tabs filter the one feed; no separate captures per tab.

## 2. Chain fixtures (banked 2026-08-20, chain truth)

### 2a. TLA lock WITHDRAW — closes the pending withdraw-behavior test
Two of the three test locks were withdrawn 2026-08-20 ~15:47 UTC; both show
the signature and the TWO asset-return paths:

- **tx 2EE005BF…90C4** (block 22461395): `withdraw{token_id:"1317"}` on the
  vAMP minter (terra1uqhj8agy…3l62zg). Events: wasm `action: ve/withdraw` +
  `action: burn` + token_id, then **native path**: bank `coin_spent` from
  minter → `coin_received` 25.000000 LUNA to owner, then gauge controller
  `gauge/update_vote`.
- **tx 25CA9939…B413** (block 22461400): `withdraw{token_id:"1318"}` — same
  ve/withdraw+burn, then **cw20 path**: arbLUNA contract (terra1se7rvuer…z490)
  wasm `transfer` 33414885 from minter → owner, then `gauge/update_vote`.

Classifier rule: `ve/withdraw`+`burn` on the minter = lock withdrawal; the
returned asset is EITHER a bank transfer (native) OR a cw20 `transfer` leg —
capture both. The trailing `gauge/update_vote` is the VP-adjustment hook: the
feed's ΔVP comes from the lock's VP at last capture (participants feed), not
re-derived. Third test lock #1319 (ampLUNA 22.22) remains chain-live as the
standing pending-withdrawal fixture.

### 2b. Atrium cancel-listing
**tx 768454711A…FEB6** (block 22447435, memo `Atrium: Cancel listing #386`):
`cancel_listing{listing_id:386}` on terra15du229lqcxkn939pmjgklqunftf604q4wz87kt5awj6reghec5jqs0w0kj
(Atrium marketplace). Events: wasm `cancel_listing` (listing_id, seller,
cancelled_by) then ADAO NFT contract `transfer_nft` escrow→seller (token 4114).
Rule: marketplace contract event = the listing event; the escrow transfer back
is the same story, not a separate "transfer" feed item (dedupe by tx).

### 2c. boostdao transfer
**tx 82AB058A…180E** (block 22447462, memo `www.boostdao.io`): plain
`transfer_nft{recipient, token_id:"4114"}` directly on the ADAO NFT contract.
Venue attribution = **memo** (boostdao signs its memo). NFT Switch + Atrium
transfers attribute by memo/contract similarly; a bare transfer_nft with no
known venue still feeds as "transferred" with venue "direct".

## 3. Sources & architecture

- The **classifier owns event extraction** (classifyNftTx v2 — this spec
  merges with the queued v2 work: BBL payment leg + these signatures). The
  walk streams already capture ADAO-collection txs; add Pixel Lions collection
  + Atrium/marketplace contracts + the vAMP minter lock events (tla-voting/
  events/locks stream already exists — locks feed reads it, not the NFT walk).
- **Feed product**: `nft-analytics/activity/current.json` (rolling ~30d) +
  monthly archive; entries: {ts, tx, kind, venue, collection, token_id,
  wallet, counterparty?, amount?/denom?, vp_delta?, listing_id?, price?}.
  One feed, tab filters client-side on {collection|kind} tags.
- **Staking events** (DAODAO/Pixel/Enterprise): stake/unstake txs on the
  respective staking contracts; "new member" = first-ever stake by wallet
  (needs the member first-seen index — address-catalog has slugs/first-seen).
- Renderer: index.html Live Activity card + tabs; each row links its tx.

## 4. Also queued from the same session (owner items 3 & 4)

- **Member-portfolio landing redesign** — easier wallet selection (recent/
  saved chips, registered-name directory, member search) + a hero that shows
  live examples instead of an empty input. UI-only; next site session.
- **DAO Total Value trend** — popup chart on the DAO TOTAL VALUE band.
  Requires a series that doesn't exist yet: add a small rider to the
  dao-dashboard cron appending one daily point
  `{date, tokens_usd, tla_lp_usd, tla_locks_usd, nft_backing_usd, total_usd}`
  to `member-data/dao-dashboard/value-history.json` (append-only,
  never-shrink). Start the capture ASAP — every day before it ships is a day
  the chart can't show. Chart renders whatever exists, honestly sparse at
  first (mixed-granularity honesty rule).

## 5. Fixture inventory + contract label map (mined 2026-08-20 — owner was right: it was all captured before)

**Held in our own streams (no new txs needed):** 1,259 classified sales
(prices, denoms, venues Atrium/Boost/BBL, back to 2023-12) · 36 listings + 29
delistings · 2,223 transfers (send_nft/transfer_nft with from/to/tx/height) ·
stake/unstake in bulk (700 send_nfts into aDAO DAODAO staking; reverse
transfers = unstakes) · BBL escrow flows (344 sends) · lock mint/adjust
(tla-voting/events/locks since 2024) + the §2 withdraw fixtures.

**Label map (recovered from legacy nft-inventory/marketplace-stats/curated —
now appended to docs/curated/known_contracts.json):**
- aDAO DAODAO staking: terra1c57ur376szdv8rtes6sa9nst4k536dynunksu8tx5zu4z5u3am6qmvqx47
- Enterprise NFT staking (real, abandoned; user_stake pagination workaround
  exists in legacy nft-inventory — PORT IT): terra1e54tcdyulrtslvf79htx4zntqntd4r550cg22sj24r6gfm0anrvq0y8tdv
- DAO treasury NFT holder (898 broken — NOT Enterprise, was mislabeled once
  already): terra1h8psjgcsg9fef7w2yv0j6262sfcaszj8vs4tsy3uwla6zwtaspvqrp4l7v
- Marketplaces: BBL terra1ej4cv98e… (listed/cancel/sale) · Atrium
  terra15du229… · Boost terra1kj7pasya…
- pixeLions collection: terra17z7fpaa8kah698xn5tarrcucvualdy4wsztkfc404g3garucpu6qmxp50g
  (OWNER-CONFIRMED 2026-08-20; second legacy address terra1c690mdr…sh7en is
  therefore staking/DAO or similar — one contract query at build pins it)
- TLA Locks collection = the vAMP minter (Boost-only listings)

**Remaining genuine gaps: NONE — all resolved by owner test txs 2026-08-20.**

### 2d. Atrium LISTING (full mechanism) — tx CDD4C53D…B984 (block 22461917)
`send_nft` on the collection with base64 hook msg decoding to
`{price:"50000000", payment:{Cw20:{contract_addr: SOLID}}, expires_in_blocks:0}`;
marketplace emits wasm `list_nft` {listing_id:545, nft_contract, price, seller,
token_id:4864}. CW20-priced listings and the expiry field confirmed.

### 2e. PRICE ADJUSTMENT — DERIVED, not emitted (answered by owner test)
Sequence: `cancel_listing` #387 returns token 4864 (tx 727FC7DE…2238, block
22461904) → same token relists 13 blocks later as NEW listing 545 (§2d).
Atrium has NO update_price event. **Classifier rule: `price_change` = delist +
relist PAIR — same token, same seller, short window (≤ ~1h), price differs.**
The feed shows it as one "price adjusted X → Y" row, deduping the pair. This
is why the legacy flow summary carried a `price_changes` counter with zero
events of that type: always meant to be derived.

### 2f. NFT SWITCH — tx FA3CECF1…9E51 (block 22462088)
Plain `transfer_nft` direct on the collection; venue lives ONLY in the memo:
`Transferring NFT Via NFTSwitch (https://dapp.nftswitch.xyz)`. No escrow
contract at all.

**⚠ CAPTURE REQUIREMENT exposed by 2f: the transfers stream schema carries no
memo field — historical NFT Switch / boostdao venue usage is invisible in the
archive. The feed's capture MUST record tx memos going forward (classifier v2:
add `memo` to transfer entries; venue attribution = memo match for
memo-signing venues, contract match for escrow venues).** Historical direct
transfers without memo remain venue "direct" honestly.

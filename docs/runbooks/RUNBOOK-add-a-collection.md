# RUNBOOK — add an NFT collection to thealliancedao.com

Everything learned on aDAO, Pixel Lions and TLA locks is encoded in the registry + one classifier, so a new
collection is a registry entry and three workflow runs. Nothing about the existing collections is touched.

## 1. Collect from the collection's members (the only human step)
| need | why | where it shows up |
|---|---|---|
| collection contract (cw721) | the watch set; everything keys on it | `collections.<key>.collection` |
| DAODAO voting module (if they stake on DAO DAO) | stake / unstake / claim custody | `custodians` role `daodao_voting` (+ unbonding seconds) |
| any legacy staking contract (Enterprise etc.) | "still staked in …" custody | `custodians` role `enterprise_staking` |
| launchpad holder (if minted via BBL launchpad) | outbound transfer = primary sale, price ÷ tokens out | `launchpad.address` |
| minter wallet / distribution wallets | label admin moves, never sales | `minter`, `distribution_wallets` |
| rewards distributor (DAO DAO) | rewards leg on Today | `distributor` |
| vetoer / treasury / royalty recipients per venue | attribution of the 5% leg; veto rows | `vetoer`, `royalty_recipients` |
| venues they trade on | shared venue table already covers BBL · Atrium · Boost; add only an unknown venue | `venues` |
| handle source + gate rule | who gets NAMED (policy, not chain data) | `handle_source`, `gate` |
| genesis height (optional) | forward start when no archive exists yet | `genesis_height` |
Unknown custodians are discoverable after the first walk: any contract that received `send_nft` shows up in the ledger
as `transfer` to a contract address — add it with a role and re-derive; records re-label, nothing is lost.

## 2. Register
Add the entry to `docs/curated/nft-collections.json` (copy the `pixel` entry as the template). Add `archives.fcd`
labels you intend to harvest and `archives.raw: "nfts/raw/<key>"`. Add the FCD presets to `fcd-harvest.yml`
(or use the `custom` preset with the address).

## 3. History (three runs, in order)
1. `FCD Harvest` — collection contract, then each custodian (genesis → 2025-01-07). Re-run a preset until it says COMPLETE.
2. `nft-flows-walk` — collection=<key>, from `13737811`, final `21481530`, ARCHIVE_RPC (blank rpc_url). Chains itself.
3. `nft-flows-derive` — publishes `nfts/<key>/ledger/` (month files, primary-sales with USD at the day, index with
   coverage + honest gaps).
Then the FCD-freeze day once: `nft-flows-walk` <key> from `13728217` to `13737810` (to_height set, ~10k blocks).

## 4. Forward
Nothing to do — the Render cron `org-nft-flows` (platform-crons/nfts/nft-flows) walks every registry entry hourly from
its global cursor. Because the cursor is global, a new collection's history between its archives' end and the cursor
is filled by ONE dispatch of the Actions `nft-flows-forward` (one-time) right after step 3; from then on the cron has it.

## 5. Still per-collection (queued, generic once built)
Inventory (current location + real owner incl. Atrium-listed items), explorer bundle, gate/roster, app collection tab.

## What is NOT per-collection anymore
Venue verbs (BBL create_auction/place_bid/settle/cancel/deposit/make_offer · Atrium list_nft/cancel_listing/buy_nft/
make_offer_cw20/accept_offer · Boost launch-nft/setup/deposit_nft/cancel · 2023 trade + offers contracts), DAODAO
stake/unstake/claim, Enterprise custody, launchpad math, USD-at-the-day, lock lineage, legacy flattened-wasm parsing.
All in `.github/scripts/nft-flows/classify.js`, gated by `gate-classify.mjs`.

# MINT TEMPLATE — chain-confirmed (ChainScope, recorded 2026-07-08)

The real mint transaction the archive-harvest campaign (T1) was parked on.
Source: tx `91F7E938D7DD49A18E473684FB2099E1AABD068C2D7189E9683DDBA432ADBCA6`,
block **8,846,532**, 2024-02-01 21:53:16Z, sender = Camron's wallet
(`terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw`). ChainScope is back online.

## The template

Per NFT minted, one `MsgExecuteContract`:

```
sender:   <minter wallet>
contract: terra1qskkhq526l8e89r6xfyjrr3h7v8jng094zgewyy20fhk8ux27caq39py4c   ← LAUNCHPAD MINTER (was "TBD")
msg:      { "mint": {} }
funds:    [ { "denom": "uluna", "amount": "50000000" } ]                      ← price: exactly 50 LUNA
```

Multi-mint = repeated messages in one tx (the source tx has 5).

Event signature per mint (the harvester's parse targets):
1. `wasm` on the **minter**: `action=mint`, `id=<token_id>`
2. 50 LUNA forwarded minter → `terra15gvsnlal5g9xp4zuhg90g5ht240a9hz87pg4lt` (proceeds wallet)
3. `wasm` on the **collection contract**: `action=transfer_nft`,
   `sender=<minter contract>`, `recipient=<wallet>`, `token_id=<id>`

This matches the canonical mint rule exactly: **first paid-in-LUNA transfer of
a token_id = the mint**; everything after = secondary.

## Facts that update the campaign plan

- **Window extends earlier**: confirmed mint at block 8,846,532 (Feb 1 2024) —
  below the assumed ~9.0M start. Probe window WIN_MIN=8.5M stands; treat
  ≤8.85M as confirmed-active mint era.
- **Token IDs are random** (this tx: 441, 453, 3019, 3036, …). The per-NFT
  ledger must key on mint/transfer_nft events, never on ID ranges.
- **Harvest query is now concrete**: on the archive node,
  `wasm._contract_address='<minter>'` = every mint tx; or `transfer_nft` on
  the collection contract for full provenance.

## ⚠ RESOLVED (2026-07-08): this tx is GALACTIC MINING CLUB, not aDAO

Confirmed by Camron: collection contract
`terra1q2hjgq5sm7w04saj70gv0ur5tlz7r20854dfmsk8uv5u8cqnkuzskk7shc` =
**Galactic Mining Club**, and
`terra1qskkhq526l8e89r6xfyjrr3h7v8jng094zgewyy20fhk8ux27caq39py4c` is the
**GMC minter** — not aDAO's.

The TEMPLATE above (launchpad `{mint:{}}` + LUNA funds, `wasm action=mint id`,
`transfer_nft` minter→wallet) is still the expected BBL-launchpad pattern and
the parse-target design stands. But **T1 still needs the aDAO-specific minter
address**. Two ways to get it:
1. Query the ADAO NFT contract's cw721 `minter`:
   `https://terra-lcd.publicnode.com/cosmwasm/wasm/v1/contract/terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9/smart/eyJtaW50ZXIiOnt9fQ==`
   (note: if minting was launchpad-mediated, `minter` may return the launchpad
   contract — exactly what we want; if it returns an admin wallet, fall back
   to option 2)
2. Find one of Camron's own aDAO mint txs on ChainScope (same era, Feb–Jun
   2024) and read the minter contract from it, as done here for GMC.

## ✅ aDAO MINTER — CONFIRMED (2026-07-08)

cw721 `minter` query on the ADAO NFT contract returned:

```
terra1m3ye6dl6s25el4xd8adg9lnquz88az9lur2ujztj9pfmzdyfz3xsm699r3
```

Long-form = a contract (the aDAO launchpad minter), not an admin wallet.
**T1 harvest query is now defined**: on the archive node,
`wasm._contract_address='terra1m3ye6dl6s25el4xd8adg9lnquz88az9lur2ujztj9pfmzdyfz3xsm699r3'`
= every aDAO mint tx; cross-checkable against `transfer_nft` on the ADAO NFT
contract (`terra1phr9fn…`).

Remaining before harvest (nice-to-have, not blocking): pull ONE real aDAO mint
tx (ChainScope, Feb–Jun 2024 era, e.g. from Camron's wallet) to confirm the
msg shape matches the GMC template below and record the aDAO mint price
(GMC's was 50 LUNA — aDAO's may differ, and may have tiers).

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

## ⚠ OPEN — verify before building the harvester

The `transfer_nft` in this tx fires on
`terra1q2hjgq5sm7w04saj70gv0ur5tlz7r20854dfmsk8uv5u8cqnkuzskk7shc`,
which is **NOT** the ADAO NFT contract in config
(`terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9`).

Either (a) this mint was a different collection, or (b) the collection lived on
a predecessor contract. Resolve on ChainScope: open `terra1q2hjgq5…skk7shc`
(which collection?), and/or query the ADAO NFT contract's `minter` to get the
true aDAO minter address. The harvester targets whichever minter the aDAO
collection confirms — do not assume this one.

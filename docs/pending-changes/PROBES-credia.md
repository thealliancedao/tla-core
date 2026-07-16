# PROBES-credia — Credia adapter + unresolved-identity probe list (2026-07-15)

**STATUS: ALL ANSWERED 2026-07-16.** Results are folded into
`ecosystem-knowledge/credia.facts.json` (+ `credia.md`) and
`curated/token_overrides.json` — cite those, not this file. Answer key:
A1 = vcawbtc (Credia wBTC receipt = gauge wBTC.creda.a, decimals 8);
A2 = not a token — the drained ampROAR-ROAR Astroport xyk PAIR contract;
A3 = xASTRO from Neutron via channel-229;
B4 = market data is one smart query {"metrics":{}} on the Portfolio contract
     (GraphQL is referrals/points + indexer history only);
B5 = vault/receipt model confirmed — Credia is a LENDING protocol, not a dex.
Bonus probes resolved arbLUNA, PAXG, wstETH. This file is kept only as the
probe-method record; retire it with the next pending-changes sweep.

Run each URL in a browser and paste the JSON back. Everything below feeds two
queued items: the Credia dex-data adapter (placeholder -> real) and
token-catalog identity for the 3 unresolved singles.

## A. The unresolved singles (token-catalog identity)

1. **wBTC.creda.a candidate** (2.675M VP, matches the July-14 audit):
   - token_info: https://terra-rest.publicnode.com/cosmwasm/wasm/v1/contract/terra1jjvy4s4tyw3ym6s3wk896up6jthvha9vtwaetah3z33sd788lttswhrcpc/smart/eyJ0b2tlbl9pbmZvIjp7fX0=
   - minter:     https://terra-rest.publicnode.com/cosmwasm/wasm/v1/contract/terra1jjvy4s4tyw3ym6s3wk896up6jthvha9vtwaetah3z33sd788lttswhrcpc/smart/eyJtaW50ZXIiOnt9fQ==

2. **Dewhitelisted cw20 single** (identity unknown):
   - token_info: https://terra-rest.publicnode.com/cosmwasm/wasm/v1/contract/terra1sjujvcvkszrt84280agzv0du7tsrf44y4n7hcd9n8y0q7snfgersd68ens/smart/eyJ0b2tlbl9pbmZvIjp7fX0=

3. **Native ibc single** — denom trace:
   - https://terra-rest.publicnode.com/ibc/apps/transfer/v1/denom_traces/65B3EB6263482979FD7A80E3FFB9D0C85CFBF6DB63EB8DDE918B2984A40CEAB6

## B. Credia dex discovery (for the adapter)

4. Does Credia publish a pools API? Check the Credia app in your browser dev
   tools (Network tab) while the pools page loads — paste the request URL(s)
   + one response body. If it's contract-only, paste the Credia
   factory/registry contract address from their docs/app and the smart-query
   probes get generated next.

5. From the app: what does Credia call the wBTC product (wBTC.creda.a?) and
   is it a vault/receipt token (single-asset) rather than a swap pool? That
   decides whether the adapter captures pools, vaults, or both.

## What happens with the answers
- A1-A3 -> curated identity overrides in token-catalog (symbol/decimals/
  display), resolving all 3 unresolved singles; the catalog's unresolved
  count drops to 0.
- B4-B5 -> `dexes/credia.js` gets built against the real source, mock-gated,
  enabled:true flipped. dex-data 1.2.0.

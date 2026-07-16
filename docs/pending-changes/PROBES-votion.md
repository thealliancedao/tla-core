# PROBES-votion — pre-deploy fixture validation (2026-07-16)

**STATUS: ANSWERED 2026-07-16.** Listing = the 6 known vaults exactly.
Config: lock_id is a STRING ('754'), vdenom carries the label path
(max/vampluna), vote_access.wallet exists (Votion's voter). State/staked as
expected (53,458 ampLUNA). Gauge user_info = the catch: real shape is
gauge_votes:[{gauge,period,votes:[[pool_id,bps]]}] + fixed_amount +
voting_power inline — parser rewritten, fixtures replaced, re-gated 30/30.
Probe 4 (escrow lock_info) rendered unnecessary: user_info carries the VP
fields (kept as fallback source). Probe 6 result not needed — the deposit
tx event shape is production-proven by the old cron.

org-votion 1.0.0 is built + mock-gated (28/28) on fixture shapes lifted from
the proven old cron. Before creating the Render job, click these 6 URLs and
paste the JSON back — results validate (or correct) the fixtures. The gauge
user_info shape (#5) is the one genuine unknown: the parser tolerates three
shapes; the probe confirms which is real.

1. Vault listing (code_id 3677):
https://terra-rest.publicnode.com/cosmwasm/wasm/v1/code/3677/contracts?pagination.limit=1000

2. One vault config (ampLUNA-MAX):
https://terra-rest.publicnode.com/cosmwasm/wasm/v1/contract/terra1v7aw9eartqrjrhwd6c7hkmlkspcy5q4tvc07gjmvzqezk3fttr4s3mffyz/smart/eyJjb25maWciOnt9fQ==

3. Same vault state (staked):
https://terra-rest.publicnode.com/cosmwasm/wasm/v1/contract/terra1v7aw9eartqrjrhwd6c7hkmlkspcy5q4tvc07gjmvzqezk3fttr4s3mffyz/smart/eyJzdGF0ZSI6e319

4. Escrow lock_info for that vault's lock — paste the lock_id from probe #2
   into this template (replace LOCKID, then base64 is generated for you at
   run-review; simplest: paste probe #2's JSON and I generate the exact URL):
   escrow terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg
   msg {"lock_info":{"token_id":"LOCKID","time":"next"}}

5. Gauge user_info for the vault (the shape unknown):
https://terra-rest.publicnode.com/cosmwasm/wasm/v1/contract/terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj/smart/eyJ1c2VyX2luZm8iOnsidXNlciI6InRlcnJhMXY3YXc5ZWFydHFyanJod2Q2Yzdoa21sa3NwY3k1cTR0dmMwN2dqbXZ6cWV6azNmdHRyNHMzbWZmeXoifX0=

6. One deposit tx_search page (holder-event shape):
https://terra-rest.publicnode.com/cosmos/tx/v1beta1/txs?query=wasm._contract_address%3D%27terra1v7aw9eartqrjrhwd6c7hkmlkspcy5q4tvc07gjmvzqezk3fttr4s3mffyz%27%20AND%20wasm.action%3D%27votion-la%2Fdeposit%27&order_by=ORDER_BY_DESC&page=1&limit=5

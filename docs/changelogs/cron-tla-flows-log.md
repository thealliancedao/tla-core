# Cron Changelog — tla-flows (org-tla-flows, Render)

## v3.2.0 — 2026-08-24 — pressure duty: reward fates + token pressure per epoch

`tla-flows/pressure.js` rides after the walk (isolated: a failure is logged
into errors, never blocks cursor or heartbeat). From the committed months
(18 read): every LUNA reward claimed via TLA, split by what the claim tx
proves — compounded (amplified vault → ampLUNA), swapped (LUNA offered in the
same tx), held (claimed to the wallet, not swapped in-tx) — and per token
bought/sold (swap legs inside claim / zap-in / zap-out txs, by context) plus
liquidity added/removed (provides, withdraw refunds, zap-out assets), USD at
the day's committed price. `left_terra` is null with a note: no IBC-out
stream exists, so "held" is an upper bound on what stayed. Publishes
`tla-flows/pressure/current.json` (last 9 epochs) and
`pressure/epochs/<n>.json`, write-once for closed epochs. Gate
`mock-run-pressure.js` 12/12 on the real August events (identity compounded +
swapped + held = claimed; unknown denoms listed, never dropped; epoch math
matches docs/epoch_1-300_date.json). First live run 2026-08-25 03:31Z:
E192–200, 0 unknown denoms; E197–199 69–78% of LUNA rewards compounded.

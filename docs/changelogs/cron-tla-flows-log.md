# Cron Changelog — tla-flows (org-tla-flows, Render)

## pnl 1.3.0 → 1.3.1 (tla-flows 3.5.5 → 3.5.6) — 2026-09-28 / 29 — tokens per trip; the P&L runs daily

- **pnl 1.3.0 / pnl-positions 1.4.0** (Portfolio 4.0) — each trip carries the tokens in and out (the page reads "USD ↔ tokens"), one bribe
  number (the build's). mock-run-pnl-v3 32/32.
- **pnl 1.3.1** — owner: "should P and L run more often then weekly" → the build runs DAILY after 03:30 UTC (`PNL_CADENCE=weekly` restores
  the old cadence); it rebuilds automatically when the heartbeat's builder is older than PNL_VERSION (the 2026-09-29 audit found the
  live build still at 1.2.4 after newer code shipped); the builder is logged as the "daily duty". mock-run-pnl-v3 31/32 — the one red is
  the pre-existing take-rate threshold check (known, not from this change).

## pnl 1.2.2 → 1.2.5 (tla-flows 3.5.1 → 3.5.4) — 2026-09-27 / 28 — P&L v3 for the Member Portfolio

- **pnl 1.2.5 / pnl-positions 1.3.1** — "not held" is decided BEFORE the gauge-ceiling check for wallets the hourly read covers, and a
  ceiling dispute whose open units the transfer record explains (gross units sent ≥ 99 %) is a moved receipt, named — the GMC Backing
  Wallet's 12.7M wBTC.osmo-wBTC.axl units (sent 2026-03-17) read "ours $27,162 vs the whole gauge $137.87 · disputed". Gate V14; 27/27.
- **pnl 1.2.4 / pnl-positions 1.3.0** — where receipts went: all 666 amplified receipt transfers (tla-flows/transfers, since 2025-01)
  mapped to their pools by receipt denom (65 vaults, archived registry amplp_mappings) → `position.moves[]` named by the registry
  (custodian / catalog entity / known contract / member / address). A receipt with a CUSTODIAN is `held_in` (open, counted).
- **pnl 1.2.3 / pnl-positions 1.2.0** — the chain referee also says "not held": a wallet the hourly read covered with NO row for an open
  pool × mechanism → `not_held`: out of Open now / unrealized / net and the curve's now point; trips + rewards kept.
  First build: 28 positions not held ($24.3K) across the ledger.
- **pnl 1.2.2 / pnl-positions 1.1.0** — open positions carry `open_lp`: LP in vs now (take-rate drag + top-up on non-amplified,
  compounding on amplified; unmeasured when no rate sample is near entry) and capital × days for the APR.
- **3.5.1** — the whole build publishes as ONE commit (lib/git-batch.js); pool names in the ledger.
- Gates: mock-run-pnl-v3 25/25 on real data (V11 LP in vs now, V12 not held, V13 moves), heap 200 MB OK.

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

# SPEC — tla-voting rollups rebuild (build #2): rollups schema 4 + classifier v5

**Status:** DEPLOYED + VERIFIED 2026-07-15 (same day as approval). First
live build: 262 voters, Votion arbLUNA-MAX #1 (visibility none), aDAO rank
7, three-number claims verified against the committed file. §5 verify
complete except the Sunday natural-rebuild watch (passive).
**Depends on:** SPEC-tla-voting-capture-fix (DEPLOYED + HEALED 2026-07-15) —
vote-state is live; rollups.json has been FROZEN at schema 3 since 2.0.0.
**Ships as:** org-tla-voting **2.1.0** (one rev: rollup builder + classifier
v5 + mock additions). No new crons, no new Actions, no restructures.

---

## 0. Locked defaults

- **D1 — sources of truth:** voters from **vote-state ∪ events** (state wins);
  pots from **distributions/history.json** (dropped from rollups — one truth
  per fact, index points consumers at distributions); claims/locks/bribers
  from the event streams.
- **D2 — cadence:** rollups rebuild on **harvest runs only** (the run already
  reads all vote months for vote_capture) + `FORCE_ROLLUPS=1` env for the
  first live build. Full recompute every time — Layer 3, no incremental state.
- **D3 — output:** single `tla-voting/events/rollups.json`, schemaVersion 4.
  No consumers exist today (site grep 2026-07-15: zero references) — the
  schema is free and this spec is its contract.
- **D4 — the three-number claims model (Camron, 2026-07-15):** per wallet per
  token: raw `amount` (+ decimals-adjusted `amount_display`), **`usd_at_claim`**
  (Σ per-claim amount × price on the claim date — "if sold when claimed",
  immutable), **`usd_at_build`** (amount × price at rollup build — the
  FALLBACK; the site computes live today-value as amount × current price).
  Earned = claimed (accumulated, all chain truth) + live pending
  (`user_claimable` + `user_pending_rebase`, DISPLAY-side, recipe in README).
  No pot-share reconstruction anywhere.
- **D5 — price join:** `price-history/{YYYY}/{MM}.json` `days[date][SYMBOL].usd`
  (nearest prior day within 7 days, else nearest after within 7, else
  unpriced). Denom→symbol+decimals from **token-catalog current.json**;
  unjoinable denoms land in `unpriced[]` with raw amounts — never dropped,
  never guessed.
- **D6 — classifier v5** (surgical, evidence: live probe tx 9B2DD008…, saved
  trimmed at `platform-crons/tla-voting/fixtures/compound_probe.json`):
  1. **compound income:** the gauge's own `wasm {action:'gauge/claim_rebase',
     rebase_amount, user}` event carries the claimed amount even when the
     recipient is a wrapper. compound events get
     `coins:[{amount: rebase_amount, denom: cw20:<ampLUNA>}]` +
     `coins_source:'gauge_event'` when the event's `user` matches the tx's
     escrow-side claimer (the vault) — income measured at the gauge boundary
     (pre-swap, pre-Votion-fee: the wallet EARNED the rebase; what the vault
     did next is portfolio choice).
  2. **claim_rebase backstop:** when the coin parse finds nothing but a
     same-tx `gauge/claim_rebase` event exists with matching `user`, fill
     coins from `rebase_amount` (same source flag). True zero-claims (no
     gauge event / rebase_amount 0) stay `coins:null` — they are real and
     become the honest `claim_tx_count` vs `paid_claim_count` stat.
  Forward-only; the 55 retained compound events keep `coins:null` with an
  `amounts_note` in the rollup (fill rider: re-derive when archive access or
  by-hash retention allows — non-gating).
- **D7 — honesty ledger in the file itself:** `claim_coverage` windows
  (genesis→2025-01-07 via FCD, 2026-06-15→now via seed+walker, HOLE
  2025-01-08→2026-06-14 pending archive backfill); `bribers.coverage_note`
  (~97% blind to contract-initiated add_bribe until build #3);
  `voters[].events_visibility: 'full'|'none'`.

## 1. Why (one paragraph)

Schema-3 rollups were derived from events alone — blind to every voter the
capture fix just surfaced (aDAO's treasury vote, both Votion vaults, the
whale's dropped re-vote) and carrying event-derived pots inferior to the
distributions harvest. The heal gave the platform a complete voter universe
(vote-state) and a chain-complete pot ledger (distributions); the rollups
must be rebuilt on those truths or they remain a polished lie.

## 2. rollups.json schema 4 (the contract)

```json
{
  "schemaVersion": 4,
  "builtAt": "…", "built_on_period": 193,
  "sources": { "vote_state_through_period": 193, "events_index_counts": {…},
               "distributions_pointer": "tla-voting/distributions/history.json" },
  "claim_coverage": [ {"from":"…","to":"…","source":"fcd"},
                      {"from":"2025-01-08","to":"2026-06-14","source":"HOLE (archive backfill queued)"},
                      {"from":"2026-06-15","to":"<builtAt>","source":"seed+walker"} ],
  "voters": [ {
      "wallet": "…",
      "events_visibility": "full" | "none",
      "state": { "vp": {"fixed","boost","total"}, "gauges": [{"gauge","period_stamp","votes"}],
                 "voted_this_period": true, "as_of_period": 193 },
      "votes": { "event_count", "first_vote_epoch", "last_vote_epoch",
                 "pools_voted": [{"asset","times"}] },            // events; null when visibility=none
      "locks": { "canonical_event_count", "first_lock_ts",
                 "net_by_denom": {"<denom>": {"in":"…","out":"…"}} },  // canonical===true only
      "claims": {
        "claim_tx_count", "paid_claim_count",
        "by_token": { "<SYMBOL>": { "denom","decimals","amount","amount_display",
                                     "usd_at_claim","usd_at_build","claim_count" } },
        "unpriced": [ {"denom","amount","reason"} ],
        "totals": { "usd_at_claim","usd_at_build" },
        "first_claim_ts","last_claim_ts",
        "amounts_note": "compound events pre-2.1.0 carry no amounts (v5 forward-only)"
      }
  } ],
  "bribers": [ { "briber","event_count","by_epoch":{…} } ],
  "bribers_coverage_note": "~97% blind to contract-initiated add_bribe — build #3",
  "pots": { "moved_to": "tla-voting/distributions/history.json" }
}
```

Voter ordering: `state.vp.total` desc (contract-path voters finally rank).
Wallets with events but no current state (fully withdrawn) appear with
`state: null` — history is history.

## 3. Build mechanics

`lib/rollups.js`, called from `run()` immediately after a successful
vote-state harvest (or when `FORCE_ROLLUPS=1`). Reads: all four event streams
(monthly, via apiGetJson), the newest vote-state month(s) for the latest
per-wallet records, token-catalog current.json, and the price-history months
that claim timestamps touch (lazy — only months with claims). Publishes
rollups.json (single write; changed-only not required — builtAt changes).
Failures: any source read failure aborts the rollup step only (events/state
products unaffected; error in heartbeat). Index `files['rollups.json']` note
flips from FROZEN to `schema 4 (SPEC-tla-voting-rollups)`.

## 4. Mock gate additions (binding)

On REAL data: (R1) voters merge — aDAO + both Votion vaults present with
`events_visibility:'none'`, a known direct voter `'full'`, ordering by VP;
(R2) three-number claims math on a crafted-known set + a REAL claim_bribes
month (totals equal independent Python sum); (R3) price-join edges (missing
day → nearest ≤7d, unjoinable denom → unpriced, hole-window claim counted +
coverage declared); (R4) canonical-only lock sums (non-canonical excluded);
(R5) classifier v5 on the REAL probe fixture — compound coins
13,966,383 ampLUNA `coins_source:'gauge_event'`, and v4 regression: token_id
748 still extracted from the same fixture; (R6) zero-claim stays null, paid
counts split; (R7) pots absent + pointer present.

## 5. Post-deploy verify

FORCE_ROLLUPS first live build → rollups.json: 250+ voters (union > event-only
250), Votion arbLUNA-MAX ranked #1 by VP with events_visibility none; spot a
known wallet's claimed CAPA/ASTRO totals vs Python over the committed streams;
usd_at_claim sane vs price-history spot dates. Then confirm the next natural
rebuild rides the Sunday-flip harvest run.

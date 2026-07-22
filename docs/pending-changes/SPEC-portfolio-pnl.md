# SPEC — portfolio-pnl (member historical P&L)

Status: **Phase A BUILT & GATED 2026-07-22 — deploy pending commit** · Phases B–D open · Owner: capture layer (derive) + site (surface)
Home: `tla-core/docs/pending-changes/`
Evidence session: 2026-07-22 (all input counts below verified against the live
committed data that day — nothing in this spec is assumed).

## 1. Goal

Surface the number the backfills were run for: **"what did I actually make,
after all costs"** — per member, over time, on `member-portfolio.html`. The
canonical waterfall (from the long-standing queue entry, unchanged):

```
net P&L = Σ deposits (cost basis)
        − Σ withdrawals (exit value)
        + Σ claimed yield
        − entry slippage/fees − exit slippage/fees
        ± IL ± price change (mark on open positions)
```

Doctrine: **honest data over false positives.** Every leg of the waterfall is
shown at its real computability tier — measured, derived-with-stated-method,
or honestly blank — never estimated silently. Coverage gaps are displayed as
gaps, exactly like the bribes board does today.

## 2. Inputs — verified state (2026-07-22)

| Feed | State | What it gives P&L |
|---|---|---|
| `tla-flows/events` (org, 2.1.1 live) | 36,223 events: 17,149 deposit / 4,829 withdraw / 14,265 claim. Coverage: 2024-08-27→2025-01-07 (FCD) + 2026-06-16→head (walker). ONE exact-bounded archive gap (13,737,811→21,481,530). | The transaction ledger: who moved LP when, entry costs |
| deposit events | 17,149/17,149 carry LP/share `amount`; **9,913 carry `cost.swaps`** (zap legs: offer/ask assets, amounts, spread, commission, maker fee, `leg_cost_pct`) | Cost basis in input tokens for 58% of deposits; slippage/fee ledger |
| withdraw events | 4,829 with LP amount; only **457 carry `cost.swaps`** | Exit amounts in LP units; exit costs mostly absent |
| claim events | **`amount: null` on all 14,265** (classifier records occurrence only) | Claim timing only — yield leg is UNVALUED today |
| `tla-voting/events/rewards` | 6,335 events, `coins: null` (asset args only) | Same: timing, not amounts |
| `tla-voting/distributions` | per-pool pot totals per epoch | Pot-level only; per-wallet pro-rating would be an estimate → not used for member P&L |
| `price-history` | daily USD to genesis; token set varies by era (13 tokens in 2024; **CAPA/SOLID hole May-2024→Aug/Sep-2025**, CoinGecko delisting) | USD valuation of token-denominated legs at event date |
| `member-data/snapshots/daily` (org 1.1.0) | total-basis VP per wallet, daily since 2026-06-29 | VP context, not P&L input |
| positions daily (personal `adao-positions`, retiring) | current position marks | Mark-to-market leg until org successor lands |
| `dex-data` daily snapshots | recent daily pool state only | LP-share→USD valuation, forward from capture start |

**Two structural absences drive the phasing:** flow events carry **no pool
identity field**, and claims carry **no amounts**. Both are classifier
enrichments + re-walks, not rollup-side fixes.

## 3. Design decisions

**D1 — Pool identity (enrichment).** Add `pool`/`lp_token` extraction to the
flows classifier. Backfill by re-walk: FCD era from the frozen archive (no
deadline), walker era from public nodes — **time-sensitive, see §5**.
Until enriched, Phase A groups activity per wallet, not per position.

**D2 — Claim amounts (enrichment).** Classifier parses the claim's transfer
events per token (same pattern as bribe coin parsing in org-tla-voting).
Same re-walk backfill path as D1 — do both in ONE pass.

**D3 — Valuation tiers (honesty rule).**
- **Tier M (measured):** zap deposits — the user's actual input tokens from
  `cost.swaps` × price-history USD at event date. Real cost basis, no model.
- **Tier D (derived, method stated):** LP amounts × pool share price where
  daily pool state exists (dex-data era). Label with the source date.
- **Tier blank:** direct (non-zap) LP deposits before dex-data coverage, all
  claims until D2 lands, anything priced into the CAPA/SOLID CoinGecko hole.
  Shown as "n events, unvalued" — never $0, never today's-price silently.

**D4 — Storage.** New product `tla-flows/pnl/` (mirrors the tla-voting
events→rollups pattern): `rollup.json` (per-wallet summary ledger: totals per
leg per tier, coverage bands, event counts) + `wallets/{addr}.json` only if
rollup size forces a split (start single-file; 203 wallets ≈ fine).
Heartbeat + builtAt + sources block, same conventions as voting rollups.

**D5 — Builder.** Phase A is a **pure derive from committed data — zero chain
access**. Per the repo placement map that's a GitHub Action one-off:
`tla-core/.github/scripts/tla-flows/build-pnl.js` + `tla-flows-pnl.yml`
(manual dispatch + weekly cron), own-repo checkout, `${{ github.token }}`,
idempotent rebuild (run twice → byte-identical). When the enrichments (D1/D2)
ship in the platform-crons classifier, the builder gains legs without moving.
Classifier changes obey the **byte-identity discipline** with
`flows-fill.js` (`<<FLOWS CLASSIFIER v1>>` → `v2`, diff-verified both sides).

**D6 — Surface.** `member-portfolio.html` P&L card: waterfall bars per leg
with tier badges (measured / derived / unvalued), coverage band strip
(FCD era ✓ · hole ✗ · walker era ✓), and the slippage/fee lifetime total —
the one number that is already fully measurable today. DAO-wide
slippage/fee transparency ledger = same rollup, summed (free byproduct).

## 4. Phases

- **Phase A — ship from what exists (no capture changes):** build-pnl.js
  derives per-wallet: event timeline; zap cost basis (Tier M); lifetime
  slippage+fees in USD (Tier M — `cost.swaps` spread/commission/maker legs);
  claim/withdraw counts + timing; per-wallet coverage bands. Site card reads
  it. This alone answers "show the backfill work somewhere."
- **Phase B — classifier enrichment (D1+D2) + retained-window re-walk:**
  pool identity + claim amounts on new events; ONE backfill pass over the
  walker era while txs are still in the public index (§5), FCD-era pass at
  leisure. Rollup gains the yield leg + per-position grouping.
- **Phase C — valuation marks:** LP→USD via dex-data daily forward;
  withdraw/exit valuation; IL vs hold; realized-APR audit falls out.
- **Phase D — archive-node Batch 5** closes the 2025-01-08→2026-06-15 hole;
  P&L becomes genesis-complete. (Same batch that unlocks bribe attribution.)

## 5. ⚠ Time-sensitive item (decide early)

The Phase-B re-walk of the **walker era needs the txs to still be queryable**.
Public-node tx retention is ~2–3 weeks (the exact failure that hit
votion-positions v1.0). Events from 2026-06-16 onward were captured from
blocks at walk time, but re-reading them for enrichment by txhash gets harder
as the index prunes. Two mitigations, either acceptable:
(a) ship the classifier enrichment SOON so forward capture carries the new
fields and the un-enriched stretch stays small and exactly bounded; or
(b) fold the walker-era re-read into the Phase-2 capture-registry one-pass
(bundle everything, walk once — existing doctrine). The spec recommends (a)
for the classifier + (b) for the backfill, so nothing is walked twice.

## 6. Acceptance (gate before any commit)

- Fixture wallet: `terra1hr8…ulw` (DeFi_Patriot). Reconcile 2–3 known zap
  deposits against chainscope pastes: input tokens, USD at date, leg costs
  exact. Slippage ledger total hand-checked against the raw `cost.swaps`.
- Determinism: two consecutive builds on the same inputs → byte-identical
  rollup (idempotence, same as fcd-rederive).
- Honesty assertions: no leg valued from a price-history date that has no
  entry for that token (the CAPA-hole class); unvalued counts + valued
  totals reconcile to total event counts exactly.
- Coverage bands in the rollup match `index.known_gaps` verbatim.

## 7. Explicit non-goals (v1)

- No pro-rated yield estimates from pot-level distributions (estimate class).
- No NFT cost-basis P&L (separate, already queued on the floor methodology).
- No bribe income leg (bribes are the VOTER stream — boundary marker in the
  queue stands; can join the waterfall later from tla-voting rollups).
- No backfilling CAPA/SOLID prices from pool reserves (own spec if wanted).

## 8. Phase A gate evidence (2026-07-22 — real committed data, full run)

- `build-pnl.js` run on the live repo state: **553 wallets, 36,243 events**
  (month files are truth; index counts recorded alongside for audit).
- Fixture `terra1hr8…ulw`: 153 deposits / 56 withdraws / 59 claims,
  first event 2024-09-01, both eras flagged; zap inputs LUNA-dominant,
  $2,112 usd@event; hand-reconciled one raw 2024-09-01 zap leg (external
  input detection + spread valued at that day's LUNA price) — exact.
- Idempotence: two consecutive runs byte-identical with `builtAt` stripped.
- Honesty assertions all pass; **1,532 claims carry `user:null`** (classifier
  v1 unattributed) — counted in `sources.null_user_events`, never dropped
  silently. Unpriced legs: 2,245 inputs / 13,749 fees (2024-era tokens absent
  from price-history + non-pool historical denoms) — the per-denom worklist
  is emitted in `pricing_meta.unknown_denoms`; WHALE-class tokens stay
  unpriced by doctrine.
- DAO-wide (usd@event): fees **$5,727.90**, zap inputs **$642,531.39**,
  claims recorded (unvalued) 12,733.

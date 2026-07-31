# SPEC — registry extensions for full-picture P&L (Votion + DEX liquidity + NFT provenance)

Status: **v2 APPROVED & BUILT 2026-07-31** (flows v3 + aux-classifiers gated 8/8; registry v2 54 entries; E2 job routing live) · Owner: capture (platform-crons classifiers + E2 walk) → derive (build-pnl) → site (member-portfolio)
Home: `tla-core/docs/pending-changes/`
Rides: `SPEC-capture-registry-backfill.md` (the E2 job walks these entries in the
same archive pass — walk-once doctrine) · Extends: `SPEC-portfolio-pnl.md`
Origin: 2026-07-31 portfolio audit — the tracker "falls short" because three
event classes were never captured and two waterfall legs were never specified.

## 1. Goal (the requirement, verbatim intent)

The portfolio must show the **overall picture of what a member put into TLA vs
what they pulled out**, in BOTH units:

- **USD-at-the-time lens:** every deposit valued at the day it happened, every
  withdrawal valued at the day it happened. In minus out = realized USD flow.
  (Prices crashed — this lens will look bad. It is still the truth.)
- **Token-quantity lens:** the same events in raw token amounts, so a member
  can see that their TOKEN position GREW from TLA rewards even while USD fell
  — plus an "if held" mark (deposit tokens valued at today) so the two lenses
  reconcile visibly.

Per deposit class:
- **Zapped LP:** input token USD at zap time (pre), resulting LP value at the
  same date (post), and the delta = the real zap cost. Pre/post shown per
  event.
- **Direct LP:** both sides' token amounts + USD at deposit time.
- **All withdrawals, all time:** zapper exits, LP-token withdrawals, and
  LP→tokens withdrawals — token amounts + USD at the time pulled.

Yield split (the amp/non-amp juggle):
- **Non-amplified:** rewards are PAID and claimed — measured from v2 claim
  events (amounts per token, valued at claim date). Yield = claimed.
- **Amplified:** rewards BUY MORE LP inside the vault — nothing is claimed by
  the wallet, the amplp→LP exchange rate rises instead. Yield = measured LP
  growth per share between entry rate and exit/current rate. **No pro-rating,
  no estimates:** the rate curve is MEASURED from every stake/unstake event's
  own LP↔amplp ratio (every user's tx is a rate sample; the curve is dense).
  Same model serves Votion (vtoken↔vAMP rate).

Doctrine unchanged: honest data over false positives — every leg carries its
tier (measured / derived-with-method / honestly blank), never silent estimates.

## 2. Capture extensions (registry v2 entries — all walked by the E2 job)

### A. Votion vaults (6 contracts — **the archive leg of SPEC-votion-capture**)
Reconciliation (v2): SPEC-votion-capture (07-16) is LIVE as org-votion-1.1.0 —
hourly vault rates/VP + history give the FORWARD rate curve; its Branch-B
holder discovery is exactly what hit the retention prune. This stream is that
spec's missing archive leg, nothing more: same module family, event history
from vault genesis. Classifier v1 is DEFENSIVE raw-capture (vault wasm attr
shapes not yet fixture-locked — §9): measured legs come from the standard
event families (tf_mint/tf_burn of the vdenom, LST cw20 moves), full raw
attrs kept, every deposit/withdraw doubling as a vtoken↔LST rate sample.
- New stream `votion/events/{YYYY}/{MM}.json`: deposit / withdraw per wallet
  with amounts (underlying in, vtoken out; vtoken in, underlying out) — each
  event doubles as a vtoken↔underlying rate sample.
- Fixes, honestly and permanently: the discovery-% chip (pre-retention
  depositors become enumerable from genesis), entry dates + cost basis for the
  Votion positions card, holder history.
- Volume: tiny (low-traffic contracts). Target: current head (these have no
  forward event capture today — see §9 forward-rider note).

### B. Astroport pairs for TLA pools (`tla_relevant` set from dex-data daily —
   pair addresses committed in `pool_address`)
- New stream `dex-liquidity/events/{YYYY}/{MM}.json`: `provide_liquidity`
  (both asset amounts + share minted) and `withdraw_liquidity` (refund assets
  + share burned) per wallet per pair. This is the missing cost basis for the
  **42% of deposits that are direct (non-zap)** and the missing exit valuation
  for withdraw-then-unwrap flows.
- **Prices from reserves (closes the CAPA/SOLID price hole):** swap events on
  the same pairs imply pool price at every trade. Raw swaps are NOT persisted
  (volume-prohibitive); instead the walk derives a **daily reserve-implied
  price sample** per pair (last swap of each day: implied price + height +
  tx_hash as provenance) into
  `price-history/reserve-implied/{pair}/{YYYY}.json`. Derivation method
  stated in the file header; consumers label the source. CoinGecko stays
  primary where it exists; reserve-implied fills its holes only.
- **Preflight-gated:** pair queries are only feasible if the archive node
  supports action-filtered event queries
  (`wasm.action='provide_liquidity' AND wasm._contract_address='…'`) — raw
  per-pair tx volume includes every swap. The E2 preflight gains this probe;
  if unsupported, B's provide/withdraw still runs action-filtered per action
  type, and the swap/price payload is re-scoped (options: coarser sampling via
  targeted height probes, or drop) — decision surfaces in the preflight
  report, never silently.

### C. NFT transfer provenance (**extends the EXECUTED SPEC-adao-provenance**)
Reconciliation (v2): full provenance through the FCD freeze ALREADY EXISTS
(per-token ledgers + per-wallet COST BASIS at `nfts/adao/provenance/`). This
stream is only the hole-fill: post-freeze transfer/mint/burn events on the
collection PLUS the lock-NFT contract (the vAMP escrow — never covered by
provenance, and it matters for join-order + VP attribution; walk-once: the
escrow entry's existing tx corpus is classified twice). The provenance derive
re-runs over the extended record when E3 lands.
- New stream `nfts/adao/transfers/{YYYY}/{MM}.json`: `transfer_nft` /
  `send_nft` (token_id, from, to, height, timestamp). Cheap; gives join-order
  provenance and future cost-basis groundwork. No P&L leg in v1 (spec §7 of
  portfolio-pnl stands).

## 3. Classifier work (no third copy — capture code lives in platform-crons)

- **flows classifier v3** (`platform-crons/tla-flows/index.js`, marker
  `<<FLOWS CLASSIFIER v3>>`, additive on v2): record `provide`
  ({assets:[{denom,amount}×2], share}) and `withdraw_liq` ({refund_assets,
  share}) when present in the SAME tx (zapper legs — gives zap post-value +
  zapper-exit valuation with zero pair-walk dependency); record amp
  stake/unstake LP↔amplp ratio fields where the attrs carry them (bond amount
  alongside bond_share — attr names verified against real txs at build, §9).
  Schema-upgrade merge law already handles the rest: **the E2 re-walk at v3
  upgrades v2/v1 in place** — this is why flows got upgrade semantics.
- **New module `platform-crons/tla-flows/lib/aux-classifiers.js`** exporting
  `classifyVotionTx`, `classifyPairLiquidityTx` (+ swap price extraction),
  `classifyNftTx` — required by the E2 job today, adoptable by a forward
  rider tomorrow, one home, byte-one-truth.
- Voting classifiers: UNTOUCHED (prior-verbatim law has no upgrade path by
  design — nothing here needs one).

## 4. Merge + fixtures + gates

- New streams use the flows merge law (per-record by txhash+key,
  schemaVersion upgrade-in-place, never-shrink caller-asserted) — one law for
  all new event classes.
- `backfill-fixtures.json` gains: (i) one known Votion deposit of
  DeFi_Patriot's (chainscope at build: his ampLUNA and arbLUNA entries —
  1,225.39 / 4,363.47 acceptance figures exist from votion v1.1.0), asserted
  amounts+rate; (ii) one direct provide + one zap on a known pool with
  both-sides amounts asserted (hand-picked at build from recovered data, then
  chainscope-confirmed and LOCKED — same §10 process); (iii) NFT: a known
  token_id's mint→current-owner chain must reconcile with live ownership.
- Mock gate (MODE=gate) extends to the aux classifiers with crafted fixtures
  before any commit; E2E mock-LCD run extends to the new streams.

## 5. Derive (build-pnl Phase B'/C — after the walk)

Per wallet × pool position:
- `usd_in` / `usd_out` (at-event prices; reserve-implied fills price holes,
  tier-labeled), `tokens_in` / `tokens_out` per denom, `lp_in` / `lp_out`.
- Zap events: pre (input USD) / post (provide-leg value same date) / delta.
- Yield: `claimed` (non-amp, valued at claim dates) + `compounded` (amp:
  LP-per-share growth entry→exit/current × position, from the measured rate
  curve; Votion identically on vtoken rate).
- Marks: `if_held_usd` (tokens_in at today), `open_position_usd` (current
  state feeds). Net = out + open + yield − in, shown per lens.
- Coverage bands per leg, as today. Idempotent build, fixture-walleted gate.

## 6. Surface (member-portfolio, after derive)

P&L card v2: lens toggle (USD ⇄ tokens) · deposits table (zaps with pre/post
delta chips; directs with both-sides) · withdrawals table · yield split bar
(claimed vs compounded, per mechanism) · if-held vs realized strip. Render
layer conventions untouched; new data mapped to the existing card patterns.

## 6b. Tax-prep export (named deliverable — user-value + the tax question)

The capture IS cost-basis-grade for TLA-scope activity: timestamped
acquisitions (zaps = disposal of the input token, directs = both-sides at
deposit), disposals (withdrawals valued at exit), income events (claims at
receipt FMV; the amp rate curve lets a CPA take EITHER compounding
interpretation from the same data), fees, and NFT cost basis (provenance).
Deliverable: **per-wallet per-year CSV export** from the P&L rollup — event,
type, quantity, denom, USD@time, price source, tx hash — positioned strictly
as *records for your tax software or CPA*, never advice. Header caveats
(mandatory): TLA-scope only, daily-close prices, jurisdiction-dependent
treatment of auto-compounding, reserve-implied fills labeled. Ships with the
Phase-C derive; page button on member-portfolio.

## 6c. Also queued from this arc
- "My TLA Report" — shareable per-wallet epoch/annual summary card (both
  lenses). Cheap derive+UI once P&L v2 exists.
- Hold-LUNA benchmark strip beside if-held.
- Average entry/exit cost per pool (educational; feeds the zap-route
  simulator, which now has a measured ground-truth pair: test txs 09C351A0
  [→LUNA, 575.249312] vs 14F165CD [→USDC, 23.489850] — same LP, seconds
  apart, ≈$23.5 both routes at implied LUNA ≈$0.041).

## 7. Execution order (fits the E-sequence)

1. Approve this spec → commit.
2. Build: flows v3 + aux-classifiers (platform-crons) · registry v2 entries
   (+ per-entry targets/notes) · fixtures · E2 job routing for the new
   streams · preflight action-filter probe. Gate + E2E-mock as in Rev 9.
3. E1 endpoint lands → preflight (now reports pair feasibility) → walk once,
   everything.
4. E3: build-pnl B'/C → §5 gates → portfolio card v2.

## 8. Non-goals

- No per-wallet pro-rating of vault-level compounding pots (the rate curve is
  the measured alternative; estimates stay banned).
- No raw swap persistence (daily reserve samples only, provenance-linked).
- No NFT P&L leg in v1.
- No re-pricing where CoinGecko already covers (reserve-implied is hole-fill,
  clearly labeled, never primary).

## 9. Open verifications (resolved during build, before commit)

- amp stake/unstake attr names for the LP↔amplp ratio (real-tx check).
- Votion vault deposit/withdraw wasm attr shapes + vault genesis heights.
- Pair `provide/withdraw_liquidity` attr shapes (assets encoding).
- Archive action-filter support (preflight probe — B's price payload gates on
  it).
- ~~amp stake/unstake attr names~~ **RESOLVED** by the 8-tx live test matrix
  (2026-07-31, blocks 22,163,785–896): bond_amount/bond_share/
  bond_share_adjusted on stake; unstake rate from tf_burn + returned. All 8
  shapes are LOCKED as classifier gate fixtures (registry-backfill MODE=gate
  5–8) + 3 post-walk flows_record fixtures in backfill-fixtures.json. The v2
  one-flow-per-tx bug the matrix exposed (tx DCA53591) is fixed in v3.
- ~~Pair provide/withdraw attr shapes~~ **RESOLVED** same matrix.
- Votion vault wasm attr shapes: still open — classifier v1 raw-captures
  defensively; one live deposit/withdraw test pair would lock exact fixtures
  (optional; the walk itself surfaces shapes for refinement, idempotence
  makes the re-derive free).
- **Forward capture DECIDED**: extend the tla-flows walker's WATCH set with
  the vault/pair/NFT contracts + adopt aux-classifiers — the walker already
  walks every block, so forward capture for all new streams rides the
  existing engine at ~zero marginal cost. Small follow-up build in
  platform-crons; until it deploys, the registry targets = live head and any
  gap is a registry-edit re-run away.

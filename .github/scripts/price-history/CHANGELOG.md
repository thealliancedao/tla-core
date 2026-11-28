# price-backfill — changelog

## 2026-11-28 — CAPA, looked for again: what is priced now, what stays blank, and why
The owner: "you need to look harder, we have capa price going very far back … if we are only missing .9 million can probably not
worry about it, just get the bulk working — and the bwhale and ampwhale stuff doesn't matter, this was abandoned a long time ago."

- **What the oracle holds for CAPA now.** CoinGecko 2023-10-13 → 2024-04-14; blank 2024-04-15 → 2025-01-06; our swap fill
  2025-01-07 → 2025-08-27; CoinGecko from 2025-08-28. No CAPA bribe was placed in the blank stretch before 9 Nov 2024.
- **The bulk works.** The bribe record was rebuilt the same day (see `docs/changelogs/cron-tla-voting-log.md`): CAPA bribe
  placements without a price 128 → 15; CAPA bribes valued $22,369 → $37,188; CAPA claims valued $14,719 → $27,579.
- **Searched for late 2024, and not used.** `dex-data/state-history/epochs` holds the LUNA-CAPA pool's reserves at every epoch
  boundary from epoch 109 (25 Nov 2024). LUNA ÷ CAPA × LUNA usd agrees with CoinGecko on 42 of 43 boundary days within 5% — but
  the pool is a **concentrated** pool, where the reserves are not the price by rule: against our own swap prices the same reading
  is 36% off on 21 Jul 2025 and 26% off on 3 Feb 2025. The standing guard — no price from the reserves of a non-xyk pool — holds,
  so the seven Mondays 25 Nov 2024 → 6 Jan 2025 stay blank. Deposits into the pool were tried as well: too noisy (worst 17× and
  117× off). No swap rows are held for 2024, and the pool has no reading at all before 25 Nov 2024.
- **Left blank on purpose:** 15 placements, 886,538 CAPA (9 Nov → 17 Dec 2024; roughly $4K by the pool readings above).
  One paced read of the pool's 2024 swaps from the history would close it; not asked for.
- **bWHALE / ampWHALE:** no work — abandoned tokens, by the owner's word. They stay "no price".

## fill-capa-swap-implied 1.0.0 — 2026-11-27 — one-time: CAPA on 233 of the 500 days the oracle had none
The owner, on "no price" beside CAPA bribes on the TLA Whales page: "what is going on here — we surely have token prices in our
data, we have had this for months?"

- **What was wrong.** The oracle's past prices are CoinGecko's, and CoinGecko holds **no CAPA price from 2024-04-15 to
  2025-08-27** (500 days — the same hole bLUNA was carried through by ratio). Every product that looks a CAPA price up in that
  window gets nothing: the voting rollup valued 6.72M CAPA of bribes at "no price".
- **What we already held.** `price-history/reserve-implied` — LUNA↔CAPA swaps from the two LUNA-CAPA pools, one or two a day,
  from 2025-01-07. Nothing read them for prices.
- **The repair** (`fill-capa-swap-implied.mjs`, run by hand, dry run by default): on a day with no CAPA and at least one swap,
  CAPA usd = LUNA per CAPA in the day's swaps (fees put back, weighted by size) × the oracle's LUNA usd. Written as
  `{ usd, src: "LUNA×swap(LUNA-CAPA)", repair: "capa-swap-implied", repaired_at, samples, luna_volume }`; each month records
  the repair in `meta.repairs`. **233 days filled, 2025-01-07 → 2025-08-27; 1,984 lines added, none changed.** A day that had
  a price is never touched; a day with no swap stays blank.
- **Why it can be trusted.** The same formula on the 458 days where CoinGecko HAS a CAPA price: median ratio 1.0026, 438 days
  within 5%, 450 within 10%. The script refuses to write if that check fails. It also meets CoinGecko at the far edge
  (27 Aug 2025: $0.00118 against CoinGecko's $0.00116 the next day).
- **Still blank.** 2024-04-15 → 2025-01-06 (267 days): no swap rows are held for 2024. About 0.89M CAPA of bribes (Nov–Dec
  2024) stay "no price" until those swaps are read from the history.
- **Not touched, same kind of gap.** WHALE is in the oracle only from 2026-06-26, so bWHALE and ampWHALE bribes (5.48M and
  2.00M) cannot be priced even by ratio — that needs WHALE's CoinGecko history added to the oracle.
- Gate `mock-fill-capa.mjs` 11/11 (fills blanks only, labels every row, refuses on a failed check or an overwrite, a second
  run fills nothing).
- **Who picks it up:** every reader of the oracle at its next build — the voting rollup (weekly) re-values the bribes, then
  TLA Whales' daily read shows them.

## reanchor-ratios 1.0.0 — 2026-09-27 — one-time: LST ratios onto the chain reads

- `reanchor-ratios.mjs` + workflow `ratio-reanchor.yml` (dispatch, dry_run default ON). Re-anchors every `interpolated` ratio
  row and the LST USD rows priced on them from dex-data/state-history's chain reads (E97 → latest), fills the ratio days frozen
  since 2026-07-16, adds arbLUNA / ampCAPA / ampROAR days inside the anchored span. The rule is platform-crons
  `dex-data/lib/ratio-anchor.js` (checked out at run time — the forward writer uses the same file).
- Dry run on the 2026-09-27 checkout: ampLUNA 618 repaired (mean +7.5 %, max +10.6 % on 2024-11-10) + 537 pre-E97
  re-interpolated; bLUNA 618 (+3.8 %, max +5.5 %) + 173; arbLUNA 218 (−0.8 %); USD rows repaired 2,164 / added 1,304;
  43 ratio + 41 price month files; a second run changes 0. Refuses to write if the chain disagrees with chain_exact by > 0.5 %.


## 1.0.0 — 2026-06-29 — historical price + ratio foundation

- GitHub Action (workflow_dispatch) with a token-picker dropdown; one token per run.
- Majors: CoinGecko daily price direct. LSTs (ampLUNA/arbLUNA/bLUNA/ampCAPA):
  price = base × ratio, avoiding CoinGecko's dead-zone straight-line fakes.
- Ratio tiers: chain_exact (archived 2026-05-13+ / live forward) vs interpolated
  (smooth monotonic between real anchors across dead zones). Each day labeled.
  Honest: pre-archive ratios are estimates, bounded by real anchors, far better
  than CoinGecko's fake line, but flagged as interpolated.
- Month-file output (price-history/YYYY/MM.json + ratios/), idempotent merge-safe
  (per-token merge — backfilling one token never clobbers another for that day).
- cgIds harvested from the proven contract-token-catalog (no manual gathering).
- Validated: ratio interpolation produces smooth bounded curve through dead zone;
  month-grouping correct.

Known limitations / TODO:
- Dead-zone auto-detection on CoinGecko's own LST price isn't done; we anchor on
  the exact archive + earliest cg-derived point and interpolate between. A future
  refinement could detect flat-line segments and exclude them as anchors.
- FUEL: no CoinGecko id; seed from old fuel OHLC data (separate, not yet wired).
- Daily values are CoinGecko daily points (one/day for multi-year ranges); true
  intraday multi-point averaging only where finer data is available.

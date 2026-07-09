# SPEC — tla-flows block-walker (Rev C) — forward capture done as forward capture

**Status:** APPROVED + BUILT 2026-07-08 (mock suite passed; see §4 results in
`platform-crons/tla-flows/README.md` Rev C entry)
**Replaces:** the tx_search scan engine inside `platform-crons/tla-flows/index.js`
(Rev B.1.2). Classifier, storage, publishing, heartbeat, Render job: unchanged.

## 0. Doctrine this encodes (rider: fold into SPEC-platform-doctrine)

**Backfill tools and forward tools are different species.** Backfill excavates
whatever an index still remembers (tx_search / FCD / archive nodes) and must be
paranoid about lying pages. Forward capture walks blocks as the chain produces
them — questions of the form "what happened in block N", whose cost scales
with elapsed time, not node retention, and whose answers cannot be evasive.
The 2026-07-08 deploy stall happened because a backfill engine was run on a
15-minute schedule. Never again: any forward cron built on index-scanning
needs written justification in its spec.

## 1. Defaults locked (ratified in-session 2026-07-08)

- D1 — Transport: RPC (`https://terra-rpc.publicnode.com`, fallback env
  `RPC_FALLBACK`, default polkachu). Head from `/status` →
  `sync_info.latest_block_height`.
- D2 — Per block: fetch `/block?height=N` (header.time = timestamp source;
  `data.txs` = base64 raw txs). If `data.txs` is empty, SKIP
  `/block_results` (saves ~half the calls). Else fetch
  `/block_results?height=N`; `txs_results[i]` pairs with `data.txs[i]`.
- D3 — txhash = `SHA256(base64decode(data.txs[i]))`, uppercase hex —
  Tendermint standard. Chain-verified 2026-07-08: block 21,823,668's only tx
  hashes to `2334BA2BB22590AD55122090D58CA85D8B16341B691860CEF33180DC761F26AE`
  and its events classify identically to the tx_search capture of the same tx
  (withdraw/amplified/via_zap, user `terra1kvv229…`).
- D4 — **Watched-contract gate (new, in the shell):** a tx is classified only
  if some wasm event's `_contract_address` ∈ WATCH (the six from
  `config/contracts.js`). Block data is not pre-filtered like tx_search was;
  without the gate the classifier's `/claim/i` fallback would capture other
  protocols' claims. The `<<FLOWS CLASSIFIER v1>>` block itself stays
  byte-identical.
- D5 — `finalize_block_events` (BeginBlock validator-reward spam) are
  ignored; only `txs_results[].events` are read. `code !== 0` skip unchanged.
- D6 — Timestamps: `block.header.time` truncated to whole-second `…Z`
  (matches existing record format; month partitioning unaffected).
- D7 — Concurrency: blocks fetched with a small in-flight window (default 4,
  env `WALK_CONCURRENCY`), committed to records strictly in height order.
- D8 — Per-run block budget: `MAX_BLOCKS_PER_RUN` (default 4,000 ≈ 6.5 h of
  chain). If the window exceeds it, process the first budget-worth, advance
  the cursor to the last processed block, status `ok` with note
  `catching-up` — the next run continues. (Forward-walking makes partial
  progress safe to commit; this replaces the scan-world's all-or-nothing.)
- D9 — Cursor: `{ last_block: N }` (schema 2). The Rev B scan-cursor
  (`head_height_at_last_run`) is read once for migration if present.
- D10 — Pruned-block honesty: if `/block` errors "height not available" (both
  endpoints agreeing), binary-search the first available block, record
  `known_gaps` `{from_height, to_height}` with exact bounds, jump the cursor,
  continue. Same honesty law, new trigger.

## 2. What is deleted

`fetchAllTxs` (the resilient ASC pager), `lcdGet`/tx_search paths, page-cap
partial machinery, `RETENTION_BLOCKS` heuristic gap detection (replaced by
D10's exact detection). The pager remains in git history and in tla-voting,
where it belongs — index scanning is now backfill-only tooling.

## 3. What is unchanged

`<<FLOWS CLASSIFIER v1>>` (byte-identical, diff-verified) · monthly
`{YYYY}/{MM}.json` merge with txhash dedupe + never-shrink · index.json ·
heartbeat shape (runMode `forward`/`bootstrap`/`catch-up`) · publishFile with
409-retry · never-seed rule · Render job `org-tla-flows`, `*/15 * * * *`,
same env/token. First run bootstraps `head − TLA_LOOKBACK` blocks (default
1,200 ≈ 2 h; deep catch-up is NOT this cron's job — see §5).

## 4. Verification (binding mock-run rule) — EXECUTED, ALL PASSED 2026-07-08

`mock-run.js` (committed alongside) drives the real run() loop on stubbed
transports:
- **R** — the REAL RPC block 21,823,668 verbatim → exactly one record,
  txhash = D3's chain-verified hash, withdraw/amplified/via_zap, timestamp
  from the block header.
- **A/B/C** — capture == direct classification on real FCD events grouped
  into synthetic blocks; incremental delta-only; crash-rewind idempotent.
- **D** — 6,000-block backlog split across four budget-capped runs, nothing
  lost, cursor at exact budget edges, `catching-up` notes.
- **F** — pruned blocks: gap recorded with exact bounds, cursor jumps.
- **G** — the gate blocks a foreign contract's `claim` (and the bare
  classifier alone would NOT have — proving the gate necessary).
- **N** — empty blocks: zero `/block_results` calls, cursor still advances.

## 5. Rollout & relationship to catch-up / live feed

1. Commit walker (Rev C) → unsuspend `org-tla-flows` → verify banner 2.0.0.
2. The ~17-day retained history is captured by a SEPARATE one-shot (the
   tx_search scanner run once, fcd-harvest-style, where slow is fine) merged
   under the same month files — queued in CHANGES_PENDING with flows-fill.
3. **Phase-2 destiny (approved direction):** this walker seeds the
   platform-wide capture layer — a registry of watched addresses + message
   patterns routing matched txs into per-domain buckets, other crons as
   consumers, and the live activity feed (websocket, walker as its
   reconnect/catch-up spine) on top. Spec'd separately; queued in
   CHANGES_PENDING. Nothing built here is throwaway.

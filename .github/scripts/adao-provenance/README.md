# adao-provenance — one-shot derive

Derives per-token provenance ledgers and per-wallet cost basis for the
10,000-piece aDAO NFT collection from the committed FCD frozen-archive
harvests (`archive/fcd/adao-minter/` + `archive/fcd/adao-collection/`,
chain genesis → ~2025-01-07).

**Run from repo root, no network needed:**
```
node .github/scripts/adao-provenance/derive.js
```
Writes `nfts/adao/provenance/` (deletes and rebuilds the product folder).
Fails hard on any invariant breach — never publishes partial output.
Deterministic: two runs differ only in `heartbeat.json` `ran_at`.

Spec: `docs/pending-changes/SPEC-adao-provenance.md` (see §6 as-built addendum).

Coverage ends at the FCD freeze. `owner_at_freeze` is NOT current
ownership — live state lives in `nfts/adao/snapshots` (nft-inventory).

## Recent changes

# Rev 2 — 2026-07-08
- Token shards converted `.jsonl` → `part-NN.json` (plain JSON arrays), per the
  corrected org storage convention (no `.jsonl` in tla-core). Same data,
  invariants re-verified, deterministic. **Delete the 10 old `part-NN.jsonl`
  files when committing** — uploads don't remove them.

# Rev 1 — 2026-07-08
- Initial build. Verified end-to-end on the real archives: 10,000 tokens ·
  1,191 free GoA · 8,809 treasury mints · 1,952 paid (phases exact by
  candy-machine contract + price) · 1,010 breaks · 2,048 wallets.
- Candy-machine stock lifecycle modeled (`stock_load`/`stock_return`,
  reconciliation invariant). Two custodial staking venues (Enterprise +
  ADAO governance). Marketplace lifecycle (list/bid/delist/settle) folded
  into token ledgers with auction_id → token binding.
- Release-history verification table in `summary.json`: break 1,010 (page
  1,000) · 1b+2a = 652 exact 127/525 (page 681, "split uncertain") · paid
  1,952 (page ~1,981) · Phase 2b raised 156,205 LUNA (page 148,390).

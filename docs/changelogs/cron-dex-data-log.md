# cron-dex-data — changelog

---

## 2026-08-10 — 1.5.0 — epochs-skeletonswap FOLD (strip #3): legacy SS producer ported whole

Legacy cron-scripts/skeletonswap-lp_data (1,207 lines) ported into
dex-data/epochs-skeletonswap.js, running as an isolated tail of org-dex-data
after the astroport fold (index.js hook, kill-switch EPOCHS_SKELETONSWAP=0;
failure never fails core snapshots). Capture logic VERBATIM (pools_list.json
metadata + network-and-prices pricing with all SS symbol aliases + ampROAR
LST derivation + direct LCD {"pool":{}} reserves + fingerprint freshness).
Publish converted git-clone/push → contents API with 409-sha retry; state
converted local-fs → deterministic raw fetches (stateless; gap-honest).
Products into tla-core dex-data/skeletonswap/: daily-csv/<date>.csv,
rolling/day-1..7 + 6-day-avg + heartbeat.json, weekly-avg/<yyyy>-epoch-<N>
(previous completed epoch, self-healing daily), monthly/<yyyy-mm> (1st UTC).
Yearly mode dropped (pages-define-need; no yearly file in sliced tree).

**GATE-PROVEN DISCOVERY — legacy weekly series mislabeled +1:** every legacy
SS weekly file is stamped one epoch AHEAD of the canonical registry
(docs/epoch_1-300_date.json): legacy "2026-epoch-197.csv" holds Jul 27–Aug 2
= canonical epoch 196 (legacy stamped run-time epoch on the prior week's
data). Org labels canonically. Parity gate: org epoch-196 aggregate is
BYTE-IDENTICAL (sorted rows) to legacy's epoch-197 file under the corrected
label. Cross-product joins (bribes/rewards per epoch vs TVL per epoch) would
have misaligned by a full week under the legacy convention.
**Deploy prereq:** one-off relabel of sliced weekly-avg files (shift -1)
BEFORE enabling the fold — queued in CHANGES_PENDING. Related: astroport
fold's accumulating weekly writes CURRENT-day rows into the prev-epoch file
(epoch-197.csv shows period 2026-08-10, outside epoch 197's true window) —
separate fix queued.

**Org-wins fix #2:** monthly period_start/period_end now populated from the
weekly rows' own bounds (legacy wrote them empty — it looked for a `date`
column weekly files don't have). Everything else numerically identical:
monthly 2026-07 parity gate clean vs the legacy sliced file.

**Gate: mock 32/32** on real fixtures (real org SS snapshot epoch-198 as
chain stub — ATOM-LUNA reserves verbatim + TVL hand-recomputed from the live
pricing feed to the cent; real sliced dailies/weeklies fetched by the module
itself for weekly + monthly parity; freshness state machine fresh→
suspicious→stuck→reset; kill-switch + isolation + astroport-tail-untouched
wiring checks). Honest nulls preserved: volume_24h/7d + apr_7d written empty
(no trustworthy source post-warlock), unpriced pools get empty TVL, never
faked. New heartbeat product: dex-data/skeletonswap/rolling/heartbeat.json —
system-health FRESHNESS_MAP row needed at next system-health touch.

Kill sequence once committed + first Render run verified: repoint site SS
readers → suspend ss-pool-daily/weekly/monthly → archive ss-pool-data_2026
→ delete after quiet week (strip combo).

## 2026-08-09 — 1.4.0 — epochs-astroport FOLD (strip #2): legacy producer ported whole

Legacy astroport-snapshot ported verbatim into dex-data/epochs-astroport.js,
running as an isolated tail of the org job (index.js hook, kill-switch
EPOCHS_ASTROPORT=0; failure never fails core snapshots). Publishes epoch
files, rolling day-1..7 + 6-day-avg, weekly CSVs (year now dynamic), and the
daily-CSV substrate into tla-core dex-data/astroport/, CONTINUING dex-slice
history. Roller is stateless (epoch = floor((now−2022-10-31)/7d)+1). First
run: 61 TLA-relevant pools, 36 charts, 6 products, 23.1s. PARITY vs legacy
epoch-197: 36/36 pools, identical schemas; both TVL outliers resolved in
ORG'S favor by independent cross-check (legacy captured LUNA-WBTC at $38 vs
real ~$108K — legacy bug; org arbLUNA exact-matched the core snapshot). Kill
license banked: repoint site readers → suspend astroport-snapshot → archive
repo. Distinct heartbeat: dex-data/astroport/epochs/heartbeat.json.
Owner: `platform-crons/dex-data/` (Render job `org-dex-data`, hourly). Writes
`tla-core/dex-data/`. Revisions before this file existed (1.0.0 build,
1.1.0 bucket-truth) are recorded in CHANGES_PENDING / audit blocks.

# Rev 1 — 2026-07-16 — 1.2.0: Credia lending-market adapter (placeholder → real, enabled)

**What:** `dexes/credia.js` implemented per the CHANGES_PENDING "Credia deep
dive" block. Credia is a LENDING protocol, not a swap dex
(ecosystem-knowledge/credia.facts.json): the whole market state is one smart
query `{"metrics":{}}` on the Portfolio contract — the same query the Credia
app itself uses.

**Mapping:** one market → one normalized pool, `pool_type: 'lending_market'`;
`pool_address` = vproxy_addr (the receipt token — for wBTC this is vcawbtc,
the TLA gauge's wBTC.creda.a entry); `tvl_usd` = total_supplied_usd
(source-provided); swap volume/fees = honest null (lending markets have
none); asset price_usd = null (pricing is token-catalog's domain — Credia's
oracle view is preserved as `raw.credia_price_usd`, labeled as theirs); full
lending truth (borrowed, collateral, LTV, liquidation params, utilization,
APYs, take_rate, isolation, indices, caps, proxy addrs) under `raw`;
`user_wallet_balance` stripped (session artifact). `trust_start` 2026-07-16
(no Credia history exists before first capture).

**Gauge join — the important subtlety:** Credia markets are SINGLE-ASSET
gauge entries. The byPair map (minter-resolved LPs + uLP factory denoms)
misses them: vcawbtc has NO cw20 minter query (chain-proven 2026-07-16), so
it is only findable in `byAsset` keyed by gauge id. The adapter joins
candidates [vproxy, proxy, underlying denom] each as a byAsset key
(`cw20:{addr}` / `native:{denom}`) then byPair, plus parseFactoryPair for
uLP-style natives; `raw.bucket_joined_on` records which key matched.

**Gate:** mock 39/39 (M1–M5 regressions clean + new M6: metrics mapping,
receipt-token byAsset join, ampLP take_rate preserved + bucket joined,
non-gauge market honestly unlabeled, session-artifact strip, platform totals,
honest source label). Fixture built from the real decoded metrics payload
captured from the live app 2026-07-16. Version bumped dex-data-1.2.0.

**Verify on next Render run:** dex-data/index.json shows credia
`enabled:true, last_status:"ok", trust_start:"2026-07-16"`;
`dex-data/credia/snapshots/current.json` exists with ~11 markets; the wBTC
market shows bucket "single" + `raw.bucket_joined_on` = `cw20:terra1jjvy4s…`;
the three ampLP markets carry `raw.state.take_rate.fixed = "0.02"`.
system-health INV-6 does NOT yet monitor dex-data/credia — add a
FRESHNESS_MAP row with the next system-health touch (noted in
CHANGES_PENDING).

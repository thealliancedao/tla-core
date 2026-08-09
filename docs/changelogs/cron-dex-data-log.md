# cron-dex-data — changelog

---

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

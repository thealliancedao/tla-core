# cron-dex-data — changelog

---

## 2026-08-10 — ss-weekly-relabel EXECUTED ✅ — SS weekly series canonical (strip #3 prereq 1b DONE)

All three phases completed and independently verified: weekly-avg/ = exactly
canonical 2026-epoch-186..197, every filename matching its own window per the
canonical registry (spot-verified 186/190/195/196/197); 13 old-schema files
preserved verbatim in weekly-avg/legacy-unverified/ (originals 404); dailies
2026-08-08/09 gap-filled from legacy; canonical 196 rebuilt 7/7 from dailies.
Epoch-197 currently 5/7 has_gaps=true and self-heals on the fold's next
daily run (its missing dailies now exist). Every mutation across all phases
was server-verified (blob sha) with verified-twin-before-delete throughout.
The ss-weekly-relabel workflow + script are FINISHED SCAFFOLDING — disable
and delete both (queued for the step-7 retirement sweep if not done now).
Downstream: SS weekly epoch numbers now join correctly against
tla-voting/distributions and the epoch registry; site reader-repoint (step 2)
should read weekly history as starting at canonical 186.

## 2026-08-10 — ss-weekly-relabel ONE-OFF built (strip #3 prereq 1b) — three-era series ruling

One-off (tla-core .github/scripts/ss-weekly-relabel + workflow, three
human-gated phases report→apply→prune) to make the SS weekly-avg series
canonical. Ground-truth rule: each file's own period columns; filenames/labels
corrected FROM them — safe against the mixed state (org-written canonical
epoch-197 classifies 'ok', untouched).

**Era census (gate-proven on the live tree, 24 files):**
- **187–196 (10): VERIFIABLE, mislabeled +1** → relabel to canonical 186–195
  (label column rewritten, content verbatim, row-verified after push).
- **168–181 (13): UNVERIFIABLE old schema** — no period bounds, pool_id
  column, W-format labels INSIDE epoch-named files (renamed at least once
  already), frozen identical rows in the 177–179 era (warlock-stale). Window
  unknowable + method-tainted → archived VERBATIM to
  weekly-avg/legacy-unverified/ (never-shrink), never relabeled, never
  counted as coverage.
- **197 (1): canonical** (org fold) — untouched.
- **182–186 + 170: missing** — the frozen/broken era; no dailies exist either.

**Rebuild policy (trust-gated):** only canonical epochs with window start ≥
2026-05-18 (the legacy cron's post-warlock architecture fix) rebuild from
dailies — rebuilding pre-trust epochs would launder warlock-era tainted
dailies into canonical-looking files. Result: rebuild = exactly canonical 196
(Jul 27–Aug 2, 7/7 dailies; its data was in legacy-197, overwritten by the
org fold's canonical 197). Pre-trust epochs stay HONESTLY ABSENT.
Also in apply: daily gap-fill 2026-08-08/09 verbatim from the legacy repo
(byte-verified), after which the fold self-heals epoch-197 to 7/7.
Rebuild uses the LIVE fold module's own buildWeekly fetched from
platform-crons at runtime (no-third-copy).

**Post-prune expected tree:** weekly-avg/ = canonical 2026-epoch-186..197 (12
trusted files) + legacy-unverified/ (13 archived) + relabel-report.json.
Site note for the reader-repoint pass: SS weekly history now starts at
canonical 186 (mid-May 2026); earlier epochs are honestly absent.

**Fifth-dispatch fix (2026-08-10) — READ-YOUR-OWN-WRITES SHADOW + SERVER
BLOB-SHA VERIFICATION:** dispatch #5 proved even the contents API can briefly
serve a just-deleted file (target 195 read back the deleted original) — no
remote re-read is trustworthy immediately after our own mutation, period. Two
structural changes: (1) an in-process shadow overlay — every successful
push/delete records the new truth; all state reads consult it first, so the
chain never re-reads its own mutations from any remote; (2) post-push
fetch-back verification REPLACED by comparing the contents-API PUT response's
content.sha (git blob sha of the stored bytes, server-computed) against the
locally computed sha1 — storage verification that is stronger than fetch-back
and immune to all read lag (unit-verified against `git hash-object` exactly).
Relabel transform verification moved BEFORE push. Workflow bumped to Node 24
(runner deprecation). Static gate 32/32... [dispatch #5 also banked 192–194;
remaining: originals 195–196]. LAW ADDENDUM: read-your-own-writes requires a
local shadow — never re-fetch state this run has mutated, from ANY endpoint.

**Fourth-dispatch fix (2026-08-10):** deleteFile lacked the 409 branch-race
retry that pushFile already had — the live cron fleet advanced main between
sha fetch and DELETE (dispatch #4 banked 187–191 then aborted on 192's
delete). deleteFile now retries 5× with fresh sha per attempt + jittered
backoff on 409/422/5xx, per the established branch-race doctrine. Gates
rewritten as STATE-INVARIANTS (probe live at run time; assert structural
truths — zero anomalies, 13 unverifiable, mislabeled→canonical−1 mapping,
ok-window==name, final tree 186–197) instead of pinned counts that expire
each dispatch. Static 26/26, chain 14/14 from the live mid-chain state.

**Third-dispatch fix (2026-08-10) — CONSISTENCY LAW:** the raw CDN
(raw.githubusercontent) provides neither read-after-write nor
read-after-delete consistency — dispatch #3 deleted original 187 (resume,
correct), then read target 187 via the CDN, which still served the deleted
file → collision abort. All tla-core reads inside the phases now go through
the contents API (Accept: application/vnd.github.raw — same backend as the
writes/deletes, strongly consistent); the CDN remains only for the legacy
repo and the fold-module source, where staleness is harmless. Dead CDN retry
helper removed. Chain gate re-run against the post-#3 live state (186
canonical, 187 gone, 188–196 intact) with a TRIPWIRE stub proving zero CDN
reads of the data repo anywhere in phase code: 14/14. Static gate 26/26.
LAW FOR ALL FUTURE ONE-OFFS + CRONS: any script whose next action depends on
its own just-written or just-deleted repo state must read that state via the
contents API, never the raw CDN.

**Second-dispatch fix (2026-08-10) — apply is now a CHAIN MOVE:** the
shift-by-one series means every relabel target name except the lowest is
occupied by the NEXT mislabeled original, so "write everything in apply,
delete everything in prune" was structurally impossible (second dispatch
aborted on the 188→187 collision, correctly and loudly). Apply now processes
ascending by canonical target and deletes each original ONLY in the same
iteration, immediately after its row-verified twin exists —
copy-verify-then-kill enforced per file mechanically. Rebuild runs after the
chain (which frees its name). Resume-safe (a target existing with the same
window is a completed copy: re-verified, original deleted, chain continues)
and idempotent. Prune now = delete the 13 archived old-schema originals
(each re-verified byte-for-byte against its legacy-unverified/ copy) + a
final-tree assertion that everything remaining classifies canonical.
**Chain gate 14/14**: full apply→apply→prune simulated end-to-end against an
in-memory repo seeded from the REAL live mid-chain state (186 written,
originals intact) — chain windows correct, verify-before-delete ordering
proven, idempotency (zero new writes/deletes on re-run), tamper-trap prune
refusal, final tree exactly canonical 186–197. Static gate 25/25.

**First-dispatch fix (2026-08-10):** apply's post-push verification hit raw-CDN
visibility lag — a just-created file can 404 on raw.githubusercontent for
several seconds, and the verify coerced that null into empty content →
spurious "header mismatch" abort (the push itself was correct; apply is
idempotent and resumes). All five verify/prune fetch-backs now retry with
backoff (8×4s) and explicitly distinguish not-yet-visible from content
mismatch (silent-coercion doctrine). Gate extended to 25/25.

**Gate: 20/20 on the LIVE tree** (canonical math vs epoch registry; era
classification of all 24 real files; relabel transform on real epoch-196
content row-verified + tamper-detected + anchor-throw; rebuild set exactly
[196]; legacy gap-fill sources confirmed reachable). Run order: dispatch
report → review relabel-report.json → apply → verify → prune → disable+delete
the workflow (finished scaffolding).

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

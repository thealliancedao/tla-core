# SESSION-STATE — 2026-08-19 (read this FIRST in a new chat)

Written so a new chat inherits real context instead of rediscovering it.
Read order: **this → `REPO-CATALOG.md` → `CHANGES_PENDING.md` (NEXT ACTIONS)**.

---

## ONE-LINE STATE
Every page reads org data and every cron is an org cron. **10 personal repos are
already deletable today**; 8 remain referenced, and only ONE of those needs real
work. The migration is in its final cleanup, not mid-flight.

---

## VERIFIED 2026-08-19 (measured, not remembered)

**Five org repos:** `tla-core` (data + docs), `platform-crons` (all cron code),
`aDAO-links-site` (site), `dao-originations` (per-DAO governance),
`nft-collections` (per-collection NFT data).

**Render: 12 jobs, all `org-` prefixed.** Every legacy job is deleted.
`org-member-data` runs HOURLY and hosts FOUR folded producers in dependency
order — tla-snapshot → tla-participants → adao-positions → dao-dashboard —
then two rollups gated to 23:xx UTC. Each isolated; one failing never kills the
others.

**Org product health (16 checked):** 15 fresh. Only `address-catalog` is stale
(heartbeat 93h) — cause identified and FIXED, see Open Items A.

**Site health is one shared registry.** `lib/cron-registry.js` describes all 17
org products (schedule, heartbeat path, owning Render job). index, tla-stats and
transparency-hub ALL derive from it. `lib/site-footer.js` renders one footer
everywhere; tla-stats' separate health modal was deleted.

---

## LAWS LEARNED (do not relitigate)

1. **Never repoint on "org has this domain."** Fetch BOTH shapes and compare.
   Same domain + different schema = ADAPTER, not repoint.
2. **Legacy MACHINE data is method-tainted → discard and re-derive. Legacy
   CURATED knowledge → migrate.** Votion's old data was website copy-paste
   (deleted); the governance registry was weeks of human vetting (migrated).
3. **A frozen backfill may answer "what happened", NEVER "what is true now".**
   Reading current listings out of the frozen `listing-history.json` put a
   phantom $50 listing on the dashboard for days. Live inventory answers "now";
   history answers "when".
4. **If history is worth keeping, MERGE it into the org series** so the page
   reads ONE file. Never leave a page reading old + new.
5. **Every publisher needs branch-race retry with a FRESH sha per attempt**, and
   must treat 409/422/**5xx** as retryable. Twelve jobs write to tla-core.
   A publisher that returns `false` on a race makes a LOST WRITE look successful.
6. **Data newer than its own heartbeat = a publisher dying at the END of a run.**
   That signature found the address-catalog bug.
7. **Freshness ≠ findings.** A product reporting `status:"violation"` is that job
   WORKING. Conflating them turns healthy jobs red.
8. **Verify from the tree, not the run log.** More than once the log said files
   landed where they hadn't.
9. **Never hardcode a cron list, marketplace list, or logo path in a page.**
   Every one of those drifted. Registries: `lib/cron-registry.js`,
   `MARKETPLACES` in nft-explorer-app.js, `POST_LOGO_URL`.
10. **Shared libs in the ORG repo can still hold legacy URLs.** `capture-engine.js`
    pointed at a deleted prices repo and took two folds down.
11. **No fixes ever land in a dying repo.** Fold it or delete it.
12. **The real name never appears in public repos** — `DeFi_Patriot` or "the
    owner". 135 occurrences were sanitized; git HISTORY still contains them
    (see Open Items D).
13. **Deliver whole files, never fragments to merge by hand.**

---

## OPEN ITEMS

### A. WATCH ON NEXT RUN (fix already committed)
`org-address-catalog` — heartbeat 93h stale while its data is 21h old. It was a
single-shot publisher dying on a 409 at `heartbeat.json`, the last thing it
writes. Retry is committed; the job is DAILY, so confirm the next run turns the
heartbeat green. Nothing else to do unless it fails again.

### B. DELETE NOW — 10 repos, nothing references them
`tla-snapshot-data_2026`, `nft-inventory-data_2026`, `adao-positions-data_2026`,
`tla-participants-data_2026`, `adao-allies-data_2026`, `votion-data_2026`,
`bribes-data_2026`, `backing-data_2026`, `marketplace-data_2026`,
`system-health-data_2026`, `cron-scripts`, `website-adao-core`.
Everything irreplaceable was migrated first (see `FINAL-SWEEP-CLEARANCE.md`):
backing history 120 rows, NFT listing-history 3,291 + broken-at 1,093, the
governance corpus, and 10 project docs now in `docs/archive-2026-08/`.

### C. STILL REFERENCED — 8 repos
| Repo | Refs | What it needs |
|---|---|---|
| `tla_json_storage` | 5 | DEAD fallbacks only (epoch-end walk-backs that already return null; dao-dashboard is the primary path). Delete the repo; strip readers later. |
| `tla-ext_json_storage` | 2 | Same + a fuel-tool link. |
| `tla-chain-registry` | 2 | **THE ONE REAL TASK.** See below. |
| `ampcapa-data_2026` | 1 | ampcapa-tool.html — rebuild org-side or retire the tool. |
| `defipatriot/tla-core` | 2 | fuel-tool.html — **already broken** (its data path 404s). Rebuild or retire. |
| `adao_json_storage`, `nft-metadata`, `aDAO-Image-Files` | 1 each | Link text only (hrefs). Cosmetic. |

**tla-chain-registry — the last real migration work.** `tla-catalog.html` and
`tla-chain-queries.html` consume `tokens`, `wallets_catalog`,
`contracts_catalog`, `amplp_mappings`, `source_coverage`, `scope`, `capturedAt`
— a TOKEN / CONTRACT / LP catalog. Org `catalog/snapshots/current.json` is an
ADDRESS / MEMBER registry (`addresses` 504, `by_address` 389, `slugs`). Different
domain ⇒ **adapter, not repoint**. The token half maps to
`token-catalog/snapshots/current.json` + `docs/curated/*`; `amplp_mappings`
(65 entries) has no org home yet.
⚠ The legacy file was still being written (~24h fresh) — **find that producer
before deleting the repo.**

### D. NAME IN GIT HISTORY — decision needed
Current files are clean. Prior commits still contain the real name in file
contents (NOT in commit messages). Options: accept; `git filter-repo` +
force-push (backup first); or recreate the repo. Deleting the personal repos
removes their share for free.

### E. SMALL QUEUE
- **Bandwidth**: was 36.48 GB vs 25 GB included (~$1.72 over at $0.15/GB). The
  nfts.json chain-state fingerprint gate targets ~24 GB of that — check the
  actual skip rate in the logs. If it under-delivers, `participants/current.json`
  (2.36 MB hourly ≈ 2.3 GB/mo) is the next candidate for the same treatment.
- **listing-history is frozen at 2026-08-04.** Only 1 of 65 listings currently
  falls back to first-seen for its age, but that grows over time. Having the NFT
  cron maintain the lifecycle ledger forward would keep exact ages permanent.
- **Star map dead code** — ~750 lines in nft-explorer-app.js (L3855–L4604),
  unreachable since Rev 4.13, with live functions interleaved. Needs its own
  pass WITH browser verification.
- **Both post generators duplicate logo-sizing math** (same bug appeared twice).
  Extract to one helper if a third post type appears.
- **No historical sales-by-marketplace breakdown** — `marketplace` is present on
  only 38 of 1,259 sales (3%). Deliberately not built; would be a guess dressed
  as a statistic.
- tla-voting + dao-governance self-report `partial` (first epoch flip pending /
  pixel-lions has no registry) — expected.
- `nap-org` shows long Render gaps yet reports fresh data — worth confirming its
  real schedule.

---

## THE FUN STUFF (blocked only by C)
Once tla-chain-registry is adapted and the repos are gone: SPEC-landing-pulse
(recent-changes tile + 30-point chart), SPEC-portfolio-pnl (the rebase two-leg
law), per-pool bribe attribution, and the announcement gate.

---

## HOW TO WORK (what actually worked)
- **Audit before building.** Every time we checked first, org already had it or
  the legacy data was untrustworthy. Every time we skipped, we built something
  redundant or wrong.
- **Gate against real live data**, not fixtures invented from memory. Live-data
  gates caught: a duplicated token symbol, the phantom $50 listing, the wrong
  floor tier, and the useless "2d+" age.
- **One paste per repo**, repo-relative folder trees, whole files only.
- **Update docs in the same pass as the code**, not at the end.

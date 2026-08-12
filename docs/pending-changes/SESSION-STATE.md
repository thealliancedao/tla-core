# SESSION-STATE — 2026-08-12 (read this first in a new chat)

This file exists so a new chat inherits real context instead of rediscovering
it. Read this + `REPO-CATALOG.md` + `CHANGES_PENDING.md` at session start.

---

## THE ONE-LINE STATE

The platform runs entirely on org crons writing to org repos. Every page reads
org data. What remains is **deleting dead personal repos** and a short list of
small decisions — not migration work.

---

## WHAT IS TRUE NOW (verified 2026-08-12, not remembered)

**Org repos (the five):** `tla-core` (data + docs), `platform-crons` (all cron
code), `aDAO-links-site` (the site), `dao-originations` (per-DAO governance),
`nft-collections` (per-collection NFT data). All live.

**Render: 12 jobs, all `org-` prefixed.** Every legacy job is deleted.
`org-member-data` is the big one — it runs hourly and hosts FOUR folded
modules in order: tla-snapshot → tla-participants → adao-positions →
dao-dashboard, then the two rollups (gated to 23:xx UTC when the daily archive
lands). Each fold is isolated; one failing never kills the others.

**Live org products** (all verified 200): member-data/{tla-snapshot,
participants, positions, dao-dashboard}, nfts/adao/snapshots/* (incl.
nft-analytics, backing-history, sales-history, state-history), dex-data/*,
tla-voting/*, votion/*, network-and-prices, catalog, token-catalog,
system-health, tla-flows, dao-originations governance.

**Health: one shared registry.** `lib/cron-registry.js` describes all 17 org
products (schedule, heartbeat path, which Render job writes it). index,
tla-stats and transparency-hub ALL derive from it — before this they each had
their own copy and drifted badly. `lib/site-footer.js` renders one footer
everywhere. tla-stats' separate health modal was removed; every page's
"System Health" links to the transparency hub.

---

## LAWS LEARNED THE HARD WAY (do not relitigate)

1. **Never repoint on "org has this domain."** Fetch BOTH shapes and compare.
   A matching domain with a different schema is an ADAPTER, not a repoint.
   (system-health, bribes, token-catalog, allies all needed adapters.)
2. **Legacy machine data is method-tainted → discard and re-derive.
   Legacy CURATED knowledge → migrate.** Votion's old data was website
   copy-paste (deleted); the governance registry was weeks of human vetting
   (migrated). This rule decided every keep/delete call in the sweep.
3. **If history is worth keeping, MERGE it into the org series** so the page
   reads ONE file. Never leave a page reading old + new.
4. **Every publisher needs branch-race retry** with a FRESH sha per attempt.
   12 jobs write to tla-core; 409s are routine, not edge cases.
5. **Never re-read state you just wrote** from any remote (CDN *or* contents
   API). Use an in-process shadow; verify writes by comparing the PUT
   response's blob sha to a locally computed one.
6. **Freshness ≠ findings.** A job reporting `status:"violation"` is that job
   WORKING. Conflating them made healthy jobs render red.
7. **Before suspending any legacy job, grep the OTHER legacy crons' configs**
   for its repo. Cron→cron dependencies are invisible to the site reader map.
   (This bit us once: killing astroport-snapshot silently broke tla-snapshot's
   name resolution, which blanked the leaderboard tiles.)
8. **Shared libs in the ORG repo can still hold legacy URLs.** When a legacy
   repo dies, grep `platform-crons/lib/` too.
9. **No fixes ever land in a dying repo.** Fold it or delete it.
10. **The real name never appears in public repos.** Use `DeFi_Patriot` or
    "the owner". (135 occurrences were sanitized 2026-08-12 — see below.)

---

## OPEN ITEMS

### A. UNCOMMITTED (deliver first in the new chat)
`site-footer-fixes.zip` was built but NOT committed — verified by the absence
of `CSS_STATE` in the live `lib/site-footer.js`. Until it lands:
- the footer System Health dot stays RED on every page (CSS vocabulary
  mismatch: index CSS wants `fresh|warning|stale`, the script was setting
  `ok|watch|degraded`)
- the footer renders unstyled on transparency-hub + system-health (those pages
  have no Tailwind and no Font Awesome; the fix ships scoped CSS + an icon
  fallback)
- Token Catalog reads "RUN PENDING" (its cadence was wrongly hourly; it's a
  ~6h self-escalating cron)

### B. REPOS SAFE TO DELETE NOW (nothing reads them)
`tla-snapshot-data_2026` (dao-dashboard was its last producer AND reader),
`adao-positions-data_2026`, `tla-participants-data_2026`,
`nft-inventory-data_2026`, `adao-allies-data_2026`, `votion-data_2026`,
`bribes-data_2026`, `backing-data_2026`, `marketplace-data_2026`,
`system-health-data_2026`, `cron-scripts`, `website-adao-core`.
Everything irreplaceable was migrated first (see the sweep in
`FINAL-SWEEP-CLEARANCE.md`): backing history 120 rows, NFT listing-history
3,291 + broken-at 1,093, the governance corpus, and 10 project docs now in
`docs/archive-2026-08/`.

### C. STILL REFERENCED — decide before deleting
| Repo | Refs | Decision needed |
|---|---|---|
| `tla_json_storage` | 5 | All DEAD fallbacks (epoch-end walk-backs) that already return null. Delete the repo; optionally strip readers later. |
| `tla-ext_json_storage` | 2 | Same (dead epoch fallback) + a fuel-tool link. |
| `tla-chain-registry` | 2 | **REAL WORK.** tla-catalog + tla-chain-queries need a TOKEN/CONTRACT/LP catalog; org `catalog/` is an ADDRESS/MEMBER registry — different domain. Token half maps to `token-catalog` + `docs/curated`; `amplp_mappings` (65) has no org home. ⚠ the legacy file is still being written (~24h fresh) — find that producer first. |
| `ampcapa-data_2026` | 1 | ampcapa-tool.html. Rebuild org-side or retire the tool. |
| `defipatriot/tla-core` | 2 | fuel-tool.html — **already broken** (that path 404s). Rebuild or retire. |
| `adao_json_storage`, `nft-metadata`, `aDAO-Image-Files` | 1 each | Link text only (hrefs). Cosmetic. |

### D. NAME SANITIZATION — HISTORY STILL EXPOSED
Current files are clean (135 occurrences fixed across 29 files). **But git
history still contains the name in every prior commit** — checked, it's in
file contents only, NOT in commit messages. Options: accept it, rewrite with
`git filter-repo` + force-push (backup first), or recreate the repo. Deleting
the personal repos removes their share of the exposure for free.

### E. SMALLER QUEUE
- `nap-org` and `org-address-catalog` show long gaps in Render (7d / 22d) yet
  report fresh data — worth confirming their schedules are what we think.
- tla-voting + dao-governance both self-report `partial` — expected (first
  epoch flip pending / pixel-lions has no registry), but worth revisiting.
- The explorer's historical listing-floor band needs `listing-history` +
  the two oracle files — those were migrated, so it may already work.
- `bribes-history: 0 providers from 0 records` in tla-participants — the org
  pd-bribes shape differs from what its provider discovery expects. Participant
  count is unaffected (lock holders ∪ providers = same 203).

---

## HOW TO WORK (what actually worked this session)

- **Audit before building.** Every time we checked first, we found the org
  already had it, or found the legacy data was untrustworthy. Every time we
  skipped the check, we built something redundant (4a pool-status) or wrong.
- **Deliver whole files, never fragments to merge by hand.**
- **Gate against real live data**, not fixtures invented from memory.
- **One paste per repo**, repo-relative folder trees.
- **Verify from the tree, not the log.** The run log said files landed where
  they hadn't more than once.

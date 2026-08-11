# MASTER-PLAN — finishing the strip

Written 2026-08-11. Supersedes ad-hoc queue ordering for the remaining work.
Driven by **SITE-DATA-CONTRACT.md** (what the pages actually need), not by the
cron fleet. Read this + SITE-DATA-CONTRACT at session start.

## The rule that ends the scatter
For every legacy producer, in this order:
1. **Org already has it?** → repoint the page. *Shape-check both sides first —
   a matching domain with a different schema is a PORT, not a repoint.*
2. **No page needs it?** → delete the producer. No port, no ceremony.
3. **Needed, not in org?** → is the legacy method sound *today*?
   - Machine-captured series with a bad method (hand-parsed, frozen upstream,
     hardcoded constants) → **discard the data**, rebuild correctly in org.
   - **Curated knowledge** (vetted addresses, trusted proposals, queries) →
     **migrate it**; it cannot be re-derived.

## COMMIT NOW (built + gated, waiting on you)

| # | File(s) | Destination |
|---|---|---|
| 1 | `platform-crons-dao-governance.zip` → `dao-governance/` | `thealliancedao/platform-crons` |
| 2 | `dao-originations-governance.zip` → aDAO/, Lion-DAO/, Pixel-Lions/ | `thealliancedao/dao-originations` |
| 3 | `dao_governance_tool.html` | site root |
| 4 | `site-repoint-sweep-1.zip` → 6 files | site root |
| 5 | `tla-core-docs.zip` → docs/ | `thealliancedao/tla-core` |

**Then, on Render:** new cron `org-dao-governance` → repo platform-crons, root
dir `dao-governance`, command `node index.js`, schedule every 6h, env
`GITHUB_TOKEN`. **First run must be `PROBE=1`, second `VERIFY=1`, then normal**
(chain shape was unverifiable at build time — see the changelog).

## THEN, IN THIS ORDER

### P1 — Stop serving stale data (the only emergency)
`adao-positions` and `tla-participants` froze **2026-08-09**; their Render jobs
show FAILED; six site files still read them, including `lib/adao-live-data.js`
which every page loads.
- Read the two failed Render logs → why did they break?
- Grep which UI elements consume them (charts? tiles? dropdowns?).
- Decide per element: **fix**, **rebuild in org**, or **remove the feature**.
- Do NOT port blindly — these are the exact jobs whose method should be
  questioned first.

### P2 — Delete the member CSVs (duplicate layer)
Org catalog already holds DAO members (adao 155, liondao 70, pixellions 76).
Diff the 2 aDAO addresses the catalog lacks, add them to the catalog's curated
input, then delete `members.csv` from all three tenant folders and point any
member dropdown at `catalog/snapshots/current.json` filtered by slug.

### P3 — Remaining `adao_json_storage` readers
Still referenced by index, dao, nft-explorer-app, dao_treasury,
dao_tla_deposits. Contents: `nft-sales-2023/2024/2025.json` (→ belongs in
`nft-collections/adao/`), `liondao_registry.json` (already migrated),
`tla-data-epoch-166-end.json`, member CSVs (P2). Migrate the NFT sales history
to the NFT tenant repo, repoint, then this repo is dead.

### P4 — NFT surface (biggest unmapped area)
`nft-inventory-data_2026` feeds 5 files including the explorer. Org
`nfts/adao/` exists but its real paths were not enumerable via API rate limit —
**enumerate the org tree first**, then repoint what matches and port only the
gaps. Explorer, rarity, analytics pages all hang off this.

### P5 — dao-dashboard (4c)
Alive, writing every 15 min, genuinely uncovered by org (treasury, TLA
deposits, unclaimed rewards, vote rewards, rebase, Lion-DAO scan). Read by
index ×2, dao_treasury ×2, dao_tla_deposits ×2. **Method-audit before porting**
(LST ratios compound; price from the live catalog; no hardcoded weights). Port
only what passes. This is the last blocker on deleting
`tla-snapshot-data_2026`.

### P6 — The rollup layer (kills the scatter permanently)
One summary schema per domain, in tla-core, replacing every per-cron summary
file. Pages read `current.json` for "now" and the rollup for day/week/month
charts. Nothing else. Planned specs (landing-pulse, portfolio-pnl, lp-apr,
briber-board, pd-directive-watch, adao-docs) get their rows in this schema
BEFORE they are built, so no feature ever invents its own summary file again.

### P7 — The sweep
Suspend every remaining legacy Render job, watch a quiet week, then delete the
jobs and the repos in one pass. Nothing is deleted while any page reads it;
nothing is kept because "we might need it."

## Standing decisions (do not relitigate)
- Legacy **machine data** is method-tainted → discard + re-derive. Legacy
  **curated knowledge** → migrate. (votion's old data = delete; the governance
  registry = precious.)
- No fixes ever land in a dying repo.
- Never repoint on "org has this domain" — fetch both shapes and compare.
- Before suspending any legacy job, grep the OTHER legacy crons' configs for
  its repo (cron→cron deps are invisible to the site reader map).
- Any script whose next action depends on its own just-written or just-deleted
  repo state reads via the contents API, never the raw CDN, and keeps an
  in-process shadow.

# FINAL SWEEP — deletion clearance (corrected)

Second full pass, 2026-08-11, across **all 18 surviving personal repos** and
every org tree. The first pass applied the wrong test ("is it old and unique?").
This one applies **your** test:

> Machine-captured with a sound method AND not already in org AND actually
> needed → **merge into the org series**, so pages read ONE file.
> Everything else → **delete**. Hand-parsed, gap-filled or superseded data is
> contamination, not history.

---

## A. MERGE — extends an org series that doesn't reach back far enough
**`nfts/adao/snapshots/backing-history.json`** ← from `backing-data_2026`
- **The gap is real:** org `floor-history.json` starts **2026-06-11**; this
  series starts **2026-04-13**. ~59 days of NFT backing that exists nowhere else.
- **Provably machine-captured** (validated, not assumed): 120 rows, **zero
  gaps**, zero duplicates, **120/120 pass** the internal consistency check
  (`ampLunaPerNft × ampLunaRate == backingInLuna`), and `ampLunaRate` is
  **monotonically non-decreasing** across all 120 days — which is the LST law
  (hub rates only compound). Hand-entered data does not pass those tests.
- **Merged, not parallel:** one canonical file, forward rows appended by the org
  NFT layer. No page reads a legacy repo, ever.

## B. ARCHIVE (reference only — `docs/archive-2026-08/`, nothing points at it)
Ten project/spec documents that exist ONLY in `website-adao-core`:
PROJECT_KNOWLEDGE, MISSION, PROJECT-DIRECTION, PROJECT-STATUS,
CLAUDE_PROJECT_INSTRUCTIONS, CHANGELOG, SESSION-CLOSEOUT-2026-06-15,
**SPEC-ai-assistant**, **SPEC-nft-onboarding-blueprint**,
**SPEC-portfolio-tracker**. These are intent and design history, not data —
zero contamination risk because no cron or page reads that folder.
(The six changelogs in that repo are **stale** vs org — index-log personal
Rev 3.55 / org 2026-08-09; tla-log personal Rev 5.5 / org T3.4 — org wins,
don't merge.)

## C. TWO ADDRESSES — add to org config, not a bundle
`terra1660g9mle5kfs…` (Phoenix Directive **proposal module**) and
`terra1k8ug6dkzntcz…` (Phoenix Directive **DAO**) appear in no org config.
The other five I flagged earlier (Atrium, BBL, Boost, Enterprise staking, aDAO
treasury contract) **were already in `platform-crons/nfts/adao/index.js`** — I
had looked in the wrong place. DeFi_Patriot was right.

## D. DELETE — nothing of value (reversed from the first pass)
| Repo | Why it dies |
|---|---|
| `nft-inventory-data_2026` | Org NFT cron captures sales history, all-time analytics, backing, floor, days-on-market — chain-derived, every 15 min. Legacy adds nothing. |
| `adao_json_storage` nft-sales-2023/24/25 | Superseded by the chain backfill. Manually captured ⇒ **contamination risk**. Governance corpus already migrated to dao-originations; members duplicated in the org catalog. |
| `tla_json_storage` | epoch dates byte-identical to org; `tla_metadata` scoring **conflicts with the new grade system** — importing it would create two competing definitions; epoch-end snapshots are frozen May archives the site's own comments call "stale/fragile". |
| `tla-ext_json_storage` | Staking APR identical to org. LP history 141–166 is `staging_4day_corrected` with "missing=zero" volume — **hand-corrected, fails the trust test**. |
| `tla-chain-registry` | 5 of 7 curated files identical to org; the other 2, org is a strict superset (24 vs 21, 14 vs 2) with zero legacy-only entries. |
| `adao-positions-data_2026`, `tla-participants-data_2026` | Folded + verified: 203/203 and 155/155 captured org-side. |
| `bribes-data_2026` | Org `tla-voting/bribe-state` covers 2026/05–08; pd-bribes derive replaces the hand file. |
| `votion-data_2026` | DeFi_Patriot: old method was website copy-paste — unverifiable by construction. Org votion is har-file/chain-derived. Delete outright. |
| `marketplace-data_2026`, `ampcapa-data_2026`, `fuel-data_2026` | Single-page tools. Decide per page: retire the page or rebuild org-side. No data worth carrying. |
| `system-health-data_2026` | Org `system-health/current.json` live. |
| `cron-scripts` | Every surviving module is folded or superseded. READMEs archived under B if wanted. |
| `adao-allies-data_2026` | No org equivalent yet — the allies feature is either rebuilt org-side or retired. Its daily series is 2 months of a feature you may not keep. |
| `website-adao-core` | After B is committed, only stale changelogs remain. |
| `tla-snapshot-data_2026` | **HOLD** — the dao-dashboard half is still live and uncovered (index ×2, dao_treasury ×2, dao_tla_deposits ×2). Last repo standing. |

## E. WILL BREAK (accept — these read frozen May archives)
`tla-data-epoch-N-end.json` readers in index.html and dao_treasury.html, the
`tla-ext-epoch-N-end.json` reader in fuel-tool.html, and the epoch listing in
release-history.html. index.html's own comments already describe that path as
stale and fragile. Remove the readers rather than preserve the files.

## ORDER
1. Commit `MERGE-backing-history.zip` and `ARCHIVE-project-docs.zip`.
2. Add the 2 PD addresses to `docs/curated/known_contracts.json`.
3. Delete every repo in D except `tla-snapshot-data_2026`.
4. Fold dao-dashboard (or retire its 6 reader spots), then delete the last repo.
5. Render: all `org-*` jobs remain; everything else already killed. Drop the
   `org-` prefix later once no legacy jobs exist to distinguish from.

# DAO Changelog

## 2026-08-25 — partner board in the aDAO format · Lion / PixelLions / Both views · quick audit on every proposal · image gateways

Partner leaderboard rebuilt as the aDAO row (medal · tier avatar · name + earned
title · tier · votes/total · streak · last-20 dots · rate · yes/no/abstain ·
bar · expand). View switch: 🤝 Both = the combined Ally grade (unchanged, the
number Allies consumes) · 🦁 Lion DAO · 🎨 PixelLions, each grading the same
people on that DAO's own proposals; rows carry the other grades in the meta
line; podium follows the view. Quick audit on every expanded proposal card
(aDAO, Lion, Pixel) from the shared engine `lib/prop-audit.js` (extracted
verbatim from index.html — one copy): action ledger with named counterparties,
precedent vs that DAO's past proposals, decoded messages; keyed by DAO + id
because ids repeat across DAOs. Member images: IPFS gateway chain reordered
(w3s / pinata / filebase / nftstorage / 4everland before dweb.link and ipfs.io,
which now answer 403 NotSameOrigin to embedded images); Stargaze resize URLs
(dead host) unwrapped to their ipfs path. Gate `gate-dao.mjs` 7/7 on committed
products from tla-core + dao-originations.


## Treasury 3.1 / TLA-Deposits 3.1 — 2026-08-23 — audit arc milestone

Both pages marked at 3.1 to close the reconciliation-audit arc: treasury and
deposits reconcile green against products, and both now render the shared lib
footer v3.1 (single footer everywhere; honest legal block; ecosystem links).

This is the change history for `dao.html` (the DAO Governance landing page).
Newest revisions on top. Times are UTC.

---

## 2026-08-22 — streak means CURRENT streak (the "18 with all-gray recent dots" confusion)

The Lions streak counted from newest to oldest per DAO but a voter who took the
OLDEST 18 of 36 still showed 🔥18 next to a row of recent grays. Now one
definition for the whole bucket, the same sequence the dots draw: combined
Lion+Pixel proposals newest-first (chain startHeight, else id), count back
from the newest CLOSED proposal until the first miss; live/open proposals are
skipped (nobody has "missed" a vote that is still open). Dots render oldest →
newest, newest at the right, exactly like aDAO rows. The tile reads
"🔥 name · current streak". Gate: oldest-only voter → no streak; steady voter
with a live proposal pending → 🔥5; dots newest-right with the live one gray.
Also: "Audit in Help" now REPLACES the drawer input (it could append to a
previous paste — the "piled together" report).

## 2026-08-22 — Lions podium/tiles: registry names, one-bucket streaks

Podium and Best-Streak tile now use registry name → address-catalog handle
(same rule as rows). Lions streak = best run in EITHER DAO (it was the minimum
of both, so anyone active in only one DAO scored 0). Registered/All counts
names from the catalog too. Scoring law recorded inline: each DAO's rate is
out of its own proposal count, then averaged — so the Lion+Pixel pair never
outweighs aDAO in the Allies comparison. Live proposals (two on Lion DAO
today) float to the top of the Lions/Allies proposal lists.

## 2026-08-22 — DAO-first navigation; partner rows match aDAO rows; one vote-dot palette

- Navigation (owner): pick the DAO first — **aDAO** (default) · **Lions** (Lion
  DAO + Pixel Lions as ONE bucket) · **Allies** (all three) — as the shared tab
  strip on the top tile; then **Members | Proposals** for that DAO as a
  segmented toggle in the strip's right slot. The old three DAO buttons and
  the old Members/Proposals tiles are hidden receivers; switchMemberView /
  switchTab unchanged.
- Partner rows (Lions, Allies) now render with the aDAO row layout: registry
  name (members.csv, then the address catalog's handles/entities — never a
  guess), Lion/Pixel/both chip, voted/total, 🔥 streak, last-20 dots inline,
  rate, yes/no/abstain breakdown, progress bar; expanded view = full dot
  history with a legend.
- One vote-dot palette everywhere (owner): yes **green** · no **yellow** ·
  no-with-veto **red** · abstain **light blue** · no vote **solid gray** (the
  hollow "no vote" ring read as a missed row). Legends and breakdown swatches
  updated to match.

## 2026-08-22 — DAO selector drives Proposals; live proposals stand out; Copy / Audit in Help

- The aDAO · Lions · Allies selector now sits above both tabs and applies to
  Proposals too: Lions = Lion DAO + Pixel Lions merged (one bucket), Allies =
  all three, aDAO = aDAO. Newest first by chain `startHeight` (dao-governance
  1.1.0 now captures `startHeight` / `expiration` / `live`), id order within a
  DAO as fallback; LIVE proposals always float to the top.
- Live treatment: amber ring + "LIVE — voting now" strip with time left (from
  `expiration.at_time`), quorum reached / passing state, and a "Vote on DAODAO"
  button that links to the RIGHT DAO's core (aDAO / Lion DAO / Pixel Lions).
- Every card: DAO chip, **Copy messages** (raw msgs JSON — what executes) and
  **Audit in Help** (opens the drawer with the messages pasted into the audit
  prompt — the assistant checks every address against the registries with
  independent verify links). No more fetching the JSON by hand.
- Gate (full page, simulated post-cron Lion file with live #24): Lions shows
  both DAOs, live first with countdown + DAODAO link to Lion's core, copy and
  Audit-in-Help work, Allies shows all three, aDAO-only shows 39. 8/8.

## 2026-08-22 — Lions / Allies tabs were empty: legacy JSON unwrap broke cron-written files

`loadPartnerData()` parsed the partner proposal files through a legacy unwrap
(`.replace(/\\n/g,'\n')…`) written for the old double-encoded hand exports.
The dao-governance cron writes proper JSON, so the unwrap turned escaped
newlines inside descriptions into raw newlines and `JSON.parse` threw ("Bad
control character") — Lion DAO silently loaded 0 proposals, so the Lions and
Allies leaderboards rendered nothing. Fix: `parseProposalFile()` tries proper
JSON first, legacy unwrap second. Full-page gate with the live files: Lions
tab renders voters (main: 0). Note the Lion file itself still holds aDAO's
proposals until dao-governance 1.1.0's next run (see cron-dao-governance-log);
the leaderboards become the real Lion/Pixel rankings at that point.
Scoring law (owner, for the record): Lions tab = Lion DAO + Pixel Lions as ONE
bucket; Allies tab = aDAO + that partner bucket — never two points for the
partner pair vs one for aDAO. Future: TLA lock holders join the ally score.

## Rev 1.7 — 2026-08-20 — Invalid Date fixed; shared footer mounted

- "Updated: Invalid Date" — the page read `exported_at` while dao-governance
  publishes `exportedAt`. Fallback chain reads both.
- The page now mounts the shared site footer (rev · changelog · System
  Health dot from the one registry) — it previously had its own footer with
  no health signal, part of the cross-page drift the owner flagged.

## Rev 1.6 — 2026-05-08

Header cleanup, matching the same treatment applied to TLA Stats in Rev 1.15.

### What changed
- Removed the small aDAO logo from the page-specific header
- Removed the "← Dashboard" backlink (the shared header above already has Home + Dashboard navigation)
- Removed the "by The Alliance DAO" subtitle under the "Governance" title
- Members / Proposals tabs, Live indicator, and DAODAO open button on the right side are unchanged

---

## Rev 1.5 — 2026-05-08

Quick fix to the changelog modal.

### What changed
- Fixed changelog modal — was fetching from `/main/logs/dao-log.md` (404), now fetches from `/main/dao-log.md` to match where the file actually lives in `website-adao-core`

No other changes to the DAO page in this rev.

---

## Rev 1.4 — 2026-05-08

Initial entry — page brought into the unified site chrome system.

### What changed
- File renamed from `dao_governance.html` to `dao.html` (cleaner URL, matches top nav label)
- Added unified site header (logo + 5-tab top nav + Terra logo)
- Added mobile bottom tab bar with DAO tab highlighted as active
- Added unified footer with Rev number + Changelog link (this changelog) — appended after existing page footer (data source links preserved)
- Original page-specific controls preserved (Members / Proposals tabs, governance audit tool link, DAODAO link)

### Earlier history (untracked)
This page tracks Main DAO governance — proposals, members, voting power, treasury links, etc. Pulls data from `defipatriot/adao_json_storage` repo. Starting point of formal changelog tracking is rev 1.4.

Going forward, each meaningful change to this page will get its own entry here.

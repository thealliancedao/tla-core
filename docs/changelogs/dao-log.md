# DAO Changelog

This is the change history for `dao.html` (the DAO Governance landing page).
Newest revisions on top. Times are UTC.

---

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

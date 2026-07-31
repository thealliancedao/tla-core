# aDAO Lore Changelog

This is the change history for `adao-lore.html` (the Galaxy Map / Lore page).
Newest revisions on top. Times are UTC.

---

## Rev 2.9 — 2026-05-08

Cleanup pass after first user review of the unified chrome rollout.

### What changed
- Removed the duplicate page header — second row containing the aDAO logo, "Galaxy Map & Lore" title, and Terra logo. The shared header above already provides logos and navigation
- Fixed changelog modal — was fetching from `/main/logs/lore-log.md` (404), now fetches from `/main/lore-log.md` to match where the file actually lives in `website-adao-core`

---

## Rev 2.8 — 2026-05-08

Initial entry — page brought into the unified site chrome system.

### What changed
- File renamed from `planet-map.html` to `adao-lore.html` (display name match)
- Added unified site header (logo + 5-tab top nav + Terra logo)
- Added mobile bottom tab bar with Lore tab highlighted as active
- Added unified footer with Rev number + Changelog link (this changelog)
- Original galaxy map content preserved

### Earlier history (untracked)
This page has been through 2 iterations of the lore framework — planet maps, tribe lore, the integration with partner DAOs (Lion DAO → Canyon-Clans of Ozara North). Starting point of formal changelog tracking is rev 2.8.

Going forward, each meaningful change to this page will get its own entry here.

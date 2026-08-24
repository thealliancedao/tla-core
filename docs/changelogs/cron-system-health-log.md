# cron-system-health — changelog

---

## 2026-08-24 — 1.0.3 — capa-supply freshness row (+1 → mock 34/34)

`token-catalog/supply/capa/current.json` gets its own FRESHNESS_MAP row
(`capa-supply`, `capturedAt`, 12h band — rides org-token-catalog's ~5h
cadence). The product is its own heartbeat. R4b gate: stale via capturedAt.
Note: the VERSION string still read 1.0.1 — 1.0.2 shipped without the bump;
corrected to 1.0.3 here.

---

## 2026-08-19 — 1.0.2 — consumer-side law: a violation means this job is WORKING

`system-health.html` now reads this product instead of the retired legacy file,
via an adapter mapping `{invariants, meta}` onto the page's existing
`{overall, counts, attention, systems}` contract — no rendering changes.
Mapping: violation → down, **skipped → info (a skipped check is NOT a
failure)**, confidence = ok / (ok + violations) with skipped excluded so a
not-yet-running check cannot drag the score down.

**Important for every consumer:** this cron reporting `status:"violation"`
means it FOUND something — the job is healthy. Treating that as the cron being
unhealthy made a job that runs every ~19 minutes render as "LATE" and turned
every footer dot red across the site.

## 2026-08-10 — 1.0.1 — fold-series freshness rows (strip step 3, same paste as the legacy dex kills)

FRESHNESS_MAP +2: dex-astroport-series (dex-data/astroport/epochs/
heartbeat.json) and dex-skeletonswap-series (dex-data/skeletonswap/rolling/
heartbeat.json), ts=capturedAt, max_age_h=6 — these fold products are what
the site reads post-repoint (Rev 3.1/3.71), so their staleness is now a
first-class violation. Mock fixtures added for both (real capturedAt shape);
mock gate 33/33. Ships in the SAME paste as: suspend Render
astroport-snapshot + ss-pool-daily/weekly/monthly, archive
astroport-pool-data_2026 + ss-pool-data_2026 (strip combo: repoint done →
suspend → archive → quiet week → delete).

## 2026-08-09 — network-and-prices row → org feed; per-row owner support

Monitor table gains an optional owner field (rows may point at org repos;
default stays defipatriot). network-and-prices row now watches
thealliancedao/tla-core network-and-prices/heartbeat.json (cutover
2026-08-07 ✓). Owner flows through both result builders and data_repo_url.
Standing rule: each strip moves/retires its monitor row in the same paste;
the legacy monitor itself dies with the last legacy cron.
Owner: `platform-crons/system-health/` (Render job `org-system-health`,
hourly). Writes `tla-core/system-health/`. Layer 3, chain-free: reads only
committed tla-core files; reports, never repairs.

# Rev 1 — 2026-07-16 — 1.0.0 BUILT: 7 invariant monitors — mock-gated 33/33 + real-data dry run, DEPLOY PENDING

**What:** SPEC-system-health (defect #10) implemented in full, including the
2026-07-15 audit addendum (same-DAY like-for-like for INV-1; product-
appropriate freshness signals for INV-6; one-off exemption; price-history
day-key rule).

**Invariants:** bucket_vp_consistency, staked_le_depth,
distribution_fractions_sum, tribute_stream_coverage, bucket_label_agreement,
heartbeat_freshness, identity_resolution. Verdict shape per D3; overall
status = worst member; D4 no-repair holds by construction (the cron has no
write path into any other product).

**Writes:** `system-health/current.json` (the alert surface),
`system-health/history/{YYYY}/{MM}.json` (monthly appends, never-shrink
guard; each run stores the tribute-coverage baseline the next INV-4 drop
check compares against), `system-health/heartbeat.json`.

**Gates passed:**
- Mock gate 33/33 (D6): all-ok pass, one crafted violation per invariant,
  same-day skip, missing-input honesty, day-key staleness, one-off
  exemption, coverage baseline → drop alarm → recovery, never-shrink.
- Real-data dry run against a fresh tla-core checkout (writes captured):
  overall `violation` — the CORRECT day-one picture:
  - INV-1 fires at 13.71% worst-bucket drift (bluechip) — the known #4
    ghost-vote/tally-scope defect, now a monitored number instead of a note.
  - INV-5 fires on exactly one mismatch: SS LUNA-SOLID (dex `project` vs
    catalog `stale`→`stable`) — finding A, caught automatically.
  - INV-4 skipped + declared (bribe_capture publishes at the first epoch
    flip, 2026-07-19).
  - INV-2 clean across 275 pools; INV-3 exactly 1.0 on all four buckets;
    INV-6 all products fresh (provenance exempt as one-off, price-history
    fresh via day key); INV-7 = 0 unresolved pools, 22 tokens without
    discovered.symbol — matches the catalog's own identity_stats (38−16).

**Shape corrections made during the real-data run (why the dry run is
binding):** member-data heartbeat stamps `generated_at` (not capturedAt);
token identity lives at `tokens[].discovered.symbol` (tokens is a list);
INV-1 detail wording made direction-neutral (live drift runs both ways).

**Deploy:** new Render cron `org-system-health`, hourly. Env: GITHUB_TOKEN
(rw tla-core). No other config. First live run creates the system-health/
folder; the Trust & Data tab can render current.json as-is.

**Next (within this module):** gauge-identity invariants once the Phase-2
capture registry lands; INV-4 gains its baseline automatically after the
first post-flip run.

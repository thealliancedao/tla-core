# cron-system-health — changelog

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

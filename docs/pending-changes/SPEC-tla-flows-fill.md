# SPEC — flows-fill (one-shot archive backfill for tla-flows)

**Status:** BUILT + dry-run-verified on the real archive, 2026-07-09.
**Script:** `.github/scripts/tla-flows/flows-fill.js` · **Workflow:**
`.github/workflows/tla-flows-fill.yml` (manual dispatch, Actions' built-in
token — no PAT).

## What it does
Classifies the five committed `archive/fcd/lp-*` harvests (55,199 raw txs →
32,777 unique) with a **byte-identical** copy of the walker's
`<<FLOWS CLASSIFIER v1>>` block (diff-verified at build) and merges the
result under the live stream at `tla-flows/events/{YYYY}/{MM}.json` using the
walker's own rules: read → txhash-dedupe → never-shrink → publish
(409-retry). Index merged read-modify-write (totals +=, months union,
first_date min). Safe to run while the walker is live: archive months
(2024/08–2025/01) cannot collide with walker months (2026/07→), and the index
merge is race-tolerant. Re-runs add nothing.

## Chain-derived invariants (hard-fail)
32,615 flows exactly = 15,727 deposits + 4,499 withdraws + 12,389 claims;
archive end data-derived (height 13,737,810 @ 2025-01-07T06:23:13Z), sanity
ceiling 14,000,000; per-month never-shrink.

## Honesty
On first successful publish, records the gap in `index.known_gaps`
(key `fcd-freeze-to-forward-capture`): from height 13,737,811 / 2025-01-07,
open-ended until the 17-day retained-history one-shot lands (then bounded by
its floor); full closure = archive node (Batch 5).

## Verified (2026-07-09, sandbox, real data)
Dry-run mode (`--dry-run`) over the committed archives: 32,615 events, 6
month files 2024/08→2025/01 (busiest 2024/12 = 10,341), invariants pass,
byte-identical classifier confirmed, deterministic across two runs.

## Rollout
Commit → Actions tab → "tla-flows-fill" → Run workflow. Watch the log for
`✅ flows-fill complete: +32615`. Verify `tla-flows/events/2024/12.json`
exists and `index.json.total_events` jumped by 32,615. Then check the
CHANGES_PENDING flows-fill item done.

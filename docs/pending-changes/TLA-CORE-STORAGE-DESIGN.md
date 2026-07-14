# tla-core — Unified Repo Storage Design (canonical)

> **Home:** `tla-core/docs/pending-changes/` (moved from `website-adao-core`
> 2026-07-14 per SPEC-docs-consolidation — this is the only copy).

**Settled 2026-06-24 · corrected 2026-07-08.** The storage convention for the
unified `tla-core` repo. Canonical repos are the **org** pair:
**`thealliancedao/tla-core`** (data) + **`thealliancedao/platform-crons`**
(cron code). This doc owns the **layout convention** — capture-layer details
live with each module's spec/README.

> **⭐ 2026-07-08 correction — READ BEFORE BUILDING ANY MODULE.** The original
> version of this doc declared daily `{MM}/{DD}.jsonl` event files "correct and
> final." **That was wrong and is superseded.** Org practice converged on
> **monthly `{YYYY}/{MM}.json` JSON-array partitions** for event/time-series
> data (`nfts/adao/flows` and `price-history` both use it), and that is now the
> settled standard, ratified 2026-07-08. `.jsonl` appears nowhere in tla-core.
> Any doc or code still saying daily-jsonl for events predates this correction.

---

## 1. Target structure: module → product → files

```
tla-core/
├── README.md
├── {module}/                 ← one per cron/domain (fuel, tla-flows, tla-voting, …)
│   └── {product}/            ← the data SHAPE; a module may have >1 product
│       ├── heartbeat.json    ← liveness + last-run stats (ALWAYS)
│       ├── index.json        ← manifest: what exists, latest pointer (ALWAYS)
│       ├── cursor.json       ← resume point (EVENT products only)
│       ├── current.json      ← latest snapshot (SNAPSHOT products only)
│       ├── daily/ hourly/    ← rolling recent (SNAPSHOT products)
│       └── {YYYY}/           ← year partition (history + rollups)
│           └── {MM}.json         (EVENT)  or  {epoch-avg,monthly-avg}/{YYYY}.csv (SNAPSHOT)
```

**Three levels, always:** **module** = the cron/domain (self-identifying names —
`tla-voting`, not `voting`; `tla-flows`, not `flows`); **product** = the data
shape (`snapshots`, `events`, `provenance`, …); **files** = the per-product
conventions (§3). Module names travel to Render job lists and heartbeats, so
they must identify themselves out of context.

---

## 2. The product types

### SNAPSHOT (state at a point in time) — reference: `fuel/snapshots/`, `dex-data/*/snapshots/`
Current state on a schedule, diff-able across time. Files: `heartbeat.json`,
`index.json`, `current.json`, `daily/` (and `hourly/` where warranted), plus
yearly rollups (`{YYYY}/{rollup-name}/{YYYY}.csv`).

### EVENT (append-only stream, cursor-resumable) — reference: `nfts/adao/flows/`, `price-history/`
Discrete events as they happen. Files: `heartbeat.json`, `index.json`,
`cursor.json`, and **monthly partitions `{YYYY}/{MM}.json`** — each a single
JSON array of event objects, kept in chain order.

**Write pattern (not append):** read the current month file → merge new events
**deduped by txhash/event-id** → **never-shrink guard** (fewer merged events
than committed aborts the publish with an error heartbeat) → publish via the
GitHub API → `index.json` → **cursor LAST** → heartbeat. A crash re-reads the
unmoved window and the merge-dedupe absorbs the overlap. Any query error
returns WITHOUT advancing the cursor. Month rollover = the merge simply
targets a new `{MM}.json`.

### DERIVE (bounded, re-runnable, no cursor) — reference: `nfts/adao/provenance/`
A deterministic one-shot computed from committed inputs (e.g. `archive/fcd/`
harvests). Files: `heartbeat.json` (run metadata), `index.json`, plus the
product's own data files (plain `.json`; large sets shard as
`part-NN.json` JSON arrays). Re-running rebuilds the product identically;
hard-fails rather than publishing partial output.

### ARCHIVE (raw captured source material) — `archive/{source}/{label}/`
Trimmed raw captures that derives consume (e.g. `archive/fcd/<label>/
part-NNNNN.json` + `state.json`). Not a consumer-facing product: no index
requirement, never mutated after `complete: true`.

A module can hold several products as sibling folders (`nfts/adao/` has
`snapshots`, `flows`, `provenance`).

---

## 3. Per-product file conventions

### `heartbeat.json` (every product) — schema v1
Base contract (unchanged — the System Health monitor reads
`tla-core/{module}/{product}/heartbeat.json`):
```json
{
  "schemaVersion": 1,
  "cron": "tla-flows",
  "capturedAt": "2026-07-08T17:50:18.079Z",
  "runId": "tla-flows-…",
  "runMode": "forward",              // "hourly" | "daily" | "forward" | "backfill" | "derive"
  "status": "ok",                    // "ok" | "partial" | "error"
  "next_expected_run_at": "…"
}
```
**Event products extend it** (the org-tla-voting shape): `counts`,
`last_heights`, `horizons`, **`known_gaps`** (required whenever a hole exists —
precise resume heights, never papered over), `discovered_actions`,
`error_count` + `recent_errors`. Snapshot products extend with their domain
metrics (as fuel does).

### `index.json` (every consumer-facing product) — the manifest
So consumers never list the tree. Event shape:
`{ latest_date, first_date, total_events, by_type, months_present:
{"2026":["01","02",…]} , latest_height }`. Snapshot shape as fuel.

### `cursor.json` (EVENT products only)
```json
{ "schemaVersion": 1,
  "perContract": { "<addr>": { "last_height": 12345678 } },
  "head_height_at_last_run": 12345999,
  "updatedAt": "…" }
```
**Write order is law:** events → index → **cursor LAST** → heartbeat. Cursor
advances **only on complete scans** (a page-capped or partial scan keeps the
prior frontier and reports `status: "partial"`).

### Partition pattern
- **Event:** `{YYYY}/{MM}.json` monthly JSON arrays (see §2 write pattern).
- **Snapshot:** `daily/`+`hourly/` rolling recent, `{YYYY}/{rollup}/{YYYY}.csv`
  long-horizon.
- **Year rollover is a new folder, never a new repo.**

---

## 4. Module skeleton standard (how to add a module)

A new module = `tla-core/{module}/{product}/` with at minimum
`heartbeat.json` + `index.json` + the product-type files above. **Org crons
publish via the GitHub Contents API** (`publishFile`: GET sha → PUT base64,
with 409-retry on branch races) — not via a local checkout + commit step.
Structural contract addresses come from `platform-crons/config/contracts.js`,
never hardcoded. Event crons carry a marked classifier block
(`<<… CLASSIFIER vN>>`) kept byte-identical with any seed/fill script that
shares it — verify with a plain diff after any change.

References to copy: SNAPSHOT → `fuel/snapshots/` · EVENT →
`nfts/adao/flows/` (layout) + `platform-crons/tla-voting/index.js`
(reliability F-checklist, publisher, heartbeat) · DERIVE →
`nfts/adao/provenance/`.

---

## 5. Migration checklist

Unchanged in principle: migrate opportunistically and by value; run new + old
in parallel; prove; freeze-then-delete. **Live statuses and the retire board
are tracked in CHANGES_PENDING.md — that file is authoritative for what's
done/pending, not this one.**

**Monitor note:** when a module lands, add/repoint its `system-health.js`
`MONITORED` entry to `…/tla-core/main/{module}/{product}/heartbeat.json`.

---

## 6. Why this layout
- One repo, many modules: year rollover is a folder; no per-repo token tax.
- module→product→files separates domain from shape; modules grow products
  without naming fights.
- Monthly JSON arrays for events: matches settled practice, keeps files small
  and diffable, and the read-merge-dedupe publish makes crash-rewind
  idempotent — an advantage plain appends never had.

---

## 7. Deviation register (kept current — check here before conformance work)

| Where | Deviation | Status |
|---|---|---|
| `tla-voting/events/` | per-stream single JSON files (`vote-events.json` … `reward-events.json`, 4–17 MB and growing), no year/month partitions | **QUEUED — restructure to `{YYYY}/{MM}.json` before Batch-3 site wiring** (zero consumers today = cheapest moment). Owner: org-tla-voting cron + seed + fcd-fill (shared classifier block). Tracked in CHANGES_PENDING. |
| `price-history/`, `nfts/adao/flows/`, `nfts/adao/snapshots/`, `dex-data/*/snapshots/` | missing `index.json` | QUEUED — one conformance sweep; each cron adds its own. Tracked in CHANGES_PENDING. |
| `nfts/adao/provenance/tokens/` | shipped as `.jsonl` on 2026-07-08 | ✅ FIXED same day — re-derived as `part-NN.json` JSON arrays. |
| `archive/fcd/` | raw parts, no index | Not a deviation — ARCHIVE class (§2), documented. |
| `tla-voting/distributions/` | single `history.json` array keyed by period, not monthly `{YYYY}/{MM}.json` | ✅ **DECIDED single-file — signed off & shipped 2026-07-14** (harvest committed: floor 96, head 193, 98 periods, zero gaps). Rationale stands: period-keyed contract state, ~4 gauge entries/week, <2 MB over years — not tx events. This is a registered, accepted deviation, not drift. Product README still owed (queued in CHANGES_PENDING). |

Any NEW deviation gets a row here the day it's discovered, plus a
CHANGES_PENDING item. A deviation without a row is the failure mode this
register exists to prevent.

# Address-Catalog Cron — Changelog

The journey of building the **address-catalog** cron (the WHO layer — known addresses:
DAO wallets, members, ally collections). Session-level beats, newest first.

---

## 2026-08-19 — publisher retry (job was dying after publishing its data)

This cron was SINGLE-SHOT and died on a 409 branch race — but only on
`heartbeat.json`, which it writes LAST. So `current.json` and the daily
snapshot published fine while the run exited 1. The visible symptom was a
heartbeat ~93h stale next to data ~21h old: **data newer than its own
heartbeat is the signature of a publisher dying at the end of a run.**

Now retries 409/422/5xx with a fresh sha per attempt and jittered backoff.
Non-retryable statuses (401/404) still fail fast. Runs daily, so the fix
proves itself on the next scheduled run.

## 2026-06-26 (~04:00 UTC) — v1: address-catalog live

Audited and deployed the first cron of the new org pipeline as `org-address-catalog`.

### What it does
Captures known addresses and writes `catalog/snapshots/{current, daily/<date>, index,
heartbeat}.json` to `tla-core`. Pulls aDAO members, TLA lock holders, and ally
collections (Pixel Lions, Lion DAO), de-duplicating to a single unique-address set, and
generates a `contracts` block from `config/contracts.js` (never hand-edited).

### Hurdle — first deploy 403'd
The fine-grained token had **Actions** read/write but the cron needed **Contents**
read/write to commit to the data repo. Re-scoped the token to Contents r+w (owner
`thealliancedao`, repo `tla-core` only) and it went through.

### Gotcha — Render Root Directory
The Render cron's **Root Directory** must be the subfolder name only (`address-catalog`),
not `platform-crons/address-catalog`. The longer path fails to find the cron.

### Verified live
Status `ok`; counts matched the run log exactly — 156 aDAO, 203 TLA locks, 77 Pixel
Lions (214 dropped), 70 Lion DAO (213 dropped), 390 unique addresses across 506 rows.
The `contracts` block, heartbeat schema, and `daily/2026-06-26.json` all wrote correctly.

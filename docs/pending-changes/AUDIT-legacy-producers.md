# AUDIT-legacy-producers — what's left, is it right, do we need it?

Built 2026-08-11 from ACTUAL READS (site grep + product freshness + org
coverage). Written BEFORE any porting, per doctrine: *audit before building —
challenge whether the work duplicates existing data, and whether any page
needs it at all.* Old data is suspect; we do not carry method-tainted or
unread series into the org stack.

## The four questions every legacy producer must answer
1. **What does it capture, and HOW?** Is the method sound today (not "did it
   work in May")? Frozen upstreams, hardcoded constants, and hand-calibrated
   values are disqualifying until re-derived.
2. **Is it already in org?** If yes → repoint readers, kill the job. No port.
3. **Does any page still consume it?** If no → remnant. Delete, don't port.
4. **Is the page that consumes it still working?** A broken chart is not a
   requirement — it's a question about whether the feature should exist.

Only a producer that is (sound) AND (not in org) AND (consumed) gets ported.

## STATUS TABLE — 2026-08-11

| Producer | Product freshness | Render | Site readers | Org equivalent? | Verdict |
|---|---|---|---|---|---|
| **adao-positions** | `data/current.json` ts 2026-08-09T01:01 — **FROZEN 2d** | FAILED (2mo) | index, test, slippage, tla-stats, member-portfolio, **lib/adao-live-data.js** (5× current.json, 4× heartbeat, members.json, daily/, weekly/) | ❌ org member-data = VP layer only (wallets/locks/buckets) | 🔴 **URGENT — stale data live on site.** Audit method, then decide port-vs-drop per chart |
| **tla-participants** | `data/current.json` ts 2026-08-09T02:01 — **FROZEN 2d** | FAILED | test, slippage, tla-stats, member-portfolio (4× current, 3× heartbeat) | ❌ not in org | 🔴 **URGENT — stale data live on site** |
| **adao-allies** | ts 2026-08-11T03:01 — **live** | shows FAILED (a later run failed; data still writing) | test, tla-stats, member-portfolio | ❌ not in org | 🟡 investigate the failing run first |
| **votion-positions** | site reads `votion/heartbeat` + `votion-epoch-*` | FAILED (20d) | index, tla-stats | ✅ **org-votion is live** (tla-core/votion/) | 🟢 likely REPOINT-ONLY — verify org covers the epoch files, then kill |
| **dao-dashboard** | ts 2026-08-11T15:40 — **live** (job is NOT deleted; find it in Render, possibly grouped) | not in Ungrouped list | index ×2, dao_treasury ×2, dao_tla_deposits ×2 (dao-dashboard.json + daily/dao-dashboard-*) | ❌ nothing in org covers treasury / TLA-deposits / unclaimed / vote-rewards / rebase / Lion-DAO scan | 🟡 genuine gap → 4c port, but audit method first |

## What this changes about priorities
The tla-snapshot fold (4b) is done and the leaderboard tiles are healed. The
next work is NOT "fold dao-dashboard" — it is:

**P1. Stop serving stale data.** adao-positions and tla-participants froze
2026-08-09 and their Render jobs are failing, yet six site files (including
`lib/adao-live-data.js`, which every page loads) still read them. Either fix
the producer, replace it, or remove the reader — but a live page showing
2-day-old positions as current is the exact "corrupt the new system with
broken old data" failure we're avoiding. **First step is READ-ONLY**: find
why the jobs fail, and grep which UI elements those readers feed.

**P2. votion-positions → repoint test.** org-votion is live; if it covers the
epoch files the site reads, this is a repoint + kill with no port at all.

**P3. Decide per-chart, not per-job.** Several index.html charts fed by these
producers are known-broken or already migrated to org sources. Before porting
ANY of it, walk the charts: for each one, is it live, broken, or already
org-fed? A broken chart's producer may be a delete, not a port.

**P4. dao-dashboard (4c)** — real gap, real readers, but its captures
(treasury pricing, deposits, rewards, rebase) must be method-audited against
current org doctrine (LST ratios compound; price from the live catalog; no
hardcoded weights) before any of it lands in tla-core. Port only what passes.

## Standing rule reaffirmed
Repo deletion order is unchanged: nothing is deleted until every product it
serves is either org-side or proven unread. But "port it into org" is NOT the
default remedy — **repoint**, **drop**, and **rebuild correctly** are equally
valid outcomes, and for old jobs they are often the right ones.

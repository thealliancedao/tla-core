# SPEC — Site Help Agent + Docs Robustness

> Status: design banked 2026-08-20 (owner request) · build queued.
> Owner intent, verbatim spirit: the docs section should hold EVERYTHING
> someone needs to understand these systems and why we do what we do; and an
> AI middleman on the site should let visitors (a) report suspected errors —
> validated against our own data before they reach the owner — and (b) make
> feature requests triaged against what data/ability we actually have.

## 1. Docs robustness (prerequisite — the agent is only as good as the corpus)

The transparency hub's Docs tab surfaces `tla-core/docs/*` chapters. Audit
target: every question a curious visitor, voter, depositor, or briber could
ask has a chapter answering it. Required coverage (gap-audit at build):

- **What each product is and why** — one chapter per org product family
  (snapshot, dex-data, token-catalog, lp-grades, bribes/voting, votion,
  nfts, catalog), written for outsiders: what it measures, where the data
  comes from, its honesty rules (nulls, trust start-lines, confidence).
- **The grading rubric, in plain language** — SPEC-lp-grading + the live
  grading_config explained: what A/B/C mean, why C is an overlay, why new
  pools aren't graded F, what "provisional" means. The rubric is public by
  design; the doc makes it legible.
- **The TLA mechanics primer** — buckets, 10% chunks, VP/vAMP math, take
  rate, the three reward streams (already in ecosystem-knowledge; promote a
  visitor-grade version).
- **Why-we-do-this** — the mission (routing oracle, calibrated trust,
  facts-not-opinion), the credibility rule, the fail-honest doctrine. Much
  exists in MISSION/doctrine docs; needs a public-facing distillation.
- **Help/FAQ** — "a number looks wrong", "why is X blank", "what does this
  badge mean", how data flows (nightly rollups vs hourly vs live), how to
  report an issue.

## 2. The agent — architecture (honest constraints first)

The site is static (Vercel). An AI assistant needs an API key, which can
NEVER ship in client code. Therefore:

**v0 — ships without any backend (immediate):** a "Report an issue /
Request a feature" flow on the hub: a small form that drafts a STRUCTURED
GitHub issue (prefilled title/body template: page, what looked wrong, the
number seen, screenshot link) via the `github.com/.../issues/new?...`
prefill URL against a public `thealliancedao/site-reports` repo (or tla-core
issues). Zero infrastructure, reports arrive structured, owner triages,
forwards to build sessions. This alone captures the middleman workflow's
value while v1 is built.

**v1 — the AI middleman (small backend):**
- A tiny Render web service (`platform-crons` sibling, own service) holding
  the Anthropic API key. Endpoints: `/ask` (chat), `/triage` (issue intake).
- **Grounding:** the service fetches, caches (~15 min), and injects as
  context: the docs corpus (§1), the changelogs, `known_contracts.json`,
  `grading_config.json`, and LIVE product heads (system-health, lp-grades
  meta, heartbeats) — so "is this number wrong?" gets checked against the
  same sources the site renders. The system prompt encodes the honesty
  rules: never invent data; when the corpus doesn't answer, say so and
  offer the report path; findings ≠ faults (registry doctrine).
- **Error triage flow:** user describes the issue → agent checks the claim
  against live product data (e.g., "the donut shows 0" vs the actual
  positions field) → if reproducible/real, it files the structured GitHub
  issue itself (bot token scoped to the reports repo ONLY) with its
  analysis attached — exactly the artifact the owner forwards into a build
  session. If not reproducible, it explains what the number means and cites
  the doc chapter.
- **Feature-request flow:** agent checks the ask against a machine-readable
  product index (what data exists, cadence, fields — generated from the
  registry + product heads) and answers in three buckets: "data exists,
  small build", "needs new capture (here's what)", "out of scope" — then
  files it tagged accordingly.
- **Abuse/cost guards:** per-IP rate limit, max tokens, no memory between
  sessions, topic fence (site/data questions only), monthly budget cap with
  a hard-off switch. Model: small/fast tier; grounding does the heavy
  lifting.
- **Privacy:** no wallet connection, no user data stored beyond the issue
  text they explicitly submit.

**Explicit non-goals:** the agent never edits the site, never speaks for
the DAO on governance, never gives financial advice (the site's own
disclaimer applies and is in its prompt).

## 3. Build order
1. Docs gap-audit + write the missing chapters (§1) — also immediately
   improves the hub for humans.
2. v0 report/request form on the hub (an afternoon).
3. Product index generator (registry + heads → `docs/product-index.json`).
4. v1 service: proxy + grounding + triage; site chat widget last.

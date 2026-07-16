# SPEC — aDAO Docs hub: one place for everything, built AI-native (2026-07-16)

**Status:** vision spec, pending approval. No build until approved.
**Builds on:** `SPEC-ai-assistant.md` (2026-06-15) — that spec's chat agent
becomes THIS site's assistant; this spec supplies the docs surface and the
grounding corpus discipline it was waiting for.
**Inspiration:** docs.creda.finance (Mintlify). We adopt its *patterns*, not
its platform — everything below fits the no-build static-HTML doctrine and
the site's existing theme.

## Goal

One docs destination on the aDAO site covering everything we've built and
learned — the ecosystem knowledge base, our own system (TLA Stats
architecture, pricing doctrine, data products, trust model), and user guides —
readable three ways: by humans on a themed page, by AI tools via clean
markdown + an index file, and by our own on-site chat agent that answers
questions with citations.

## What Credia's docs do right (HAR-verified 2026-07-16)

1. **Content is markdown in a repo**; the site is just a renderer. Their
   creda-docs GitHub repo IS the docs — the site rebuilds from it.
2. **`/llms.txt`** — a plain-text index of every page, linked from the top of
   each doc, so any AI tool can discover the whole corpus in one fetch.
3. **Every page has a raw-markdown twin** (`<link rel="alternate"
   type="text/markdown">`) — AI pulls clean text, no HTML scraping.
4. **A contextual menu on every page**: copy as markdown / view raw / open in
   ChatGPT / Claude / Perplexity / MCP. One click from any page into any AI.
5. **Nav is data** (tabs → groups → pages as JSON), not hand-built HTML.

## Our unfair advantage

We are AHEAD of this pattern, not behind it. Credia's docs are prose for
humans that AI can also read. Ours are **fact records designed for citation**
(`ecosystem-knowledge/*.facts.json`: stable ids, claims, source URLs,
verified_at stamps, sourced-vs-our-conclusion marking) PAIRED with human
prose. The knowledge base was built for exactly the agent this spec ends at —
the docs hub is the missing rendering surface, not new content.

## Design (locked defaults, pending approval)

- **D1 — single source of truth, render-don't-copy.** The docs page fetches
  committed content from tla-core at view time (raw.githubusercontent with
  cache-busting — the proven changelog-modal pattern, scaled up). NOTHING is
  copy-pasted into site HTML. A fact corrected in tla-core is corrected on the
  site on next load. Content lives where it already lives:
  - `docs/ecosystem-knowledge/*.md` + `*.facts.json` (protocols + our system)
  - `docs/curated/*.json` (registries, rendered as reference tables)
  - selected changelogs + specs (the trust story: what shipped, when, gated how)
  - live JSON where a doc cites a number (`system-health/current.json`, etc.)
- **D2 — nav is a committed JSON.** `docs-index.json` (tabs → groups → pages,
  each page = {title, source_path, kind: md|facts|json|live}) lives in
  tla-core next to the content it indexes. The site renders nav from it; the
  llms.txt generator (D3) reads the same file. One index, two consumers.
- **D3 — our /llms.txt.** A plain-text index in the Credia format: site
  description + every docs page with its RAW source URL (which for us is a
  raw.githubusercontent link — the "markdown twin" pattern comes free because
  our content is already raw markdown in a public repo). Regenerated from
  docs-index.json whenever it changes (a tiny GitHub Action in tla-core, per
  the placement map: one-off/Action scripts live in tla-core/.github/).
  Every rendered docs page links it at the top, same as Credia.
- **D4 — contextual menu, our version.** Per page: **Copy as markdown**
  (clipboard), **View source** (the raw GitHub URL), **View facts** (the
  paired .facts.json, pretty-rendered with each record's source_url +
  verified_at as clickable provenance), **Ask the assistant** (opens the D6
  chat pre-scoped to this page). Skip the ChatGPT/Perplexity deep links in
  v1 — copy-as-markdown covers the need.
- **D5 — theme + tech.** Static `docs.html` (or `/docs/` folder) matching the
  site's existing look — NOT Mintlify's. Vanilla JS, no build step. Markdown
  rendered client-side (marked.js or equivalent single-file lib, vendored).
  Facts files render as citation cards: claim, value, source link, verified_at,
  and a visible badge distinguishing "sourced" (doc/chain/api) from "our
  conclusion" (self) — the honesty distinction made visual.
- **D6 — the chat agent (phase 2, = SPEC-ai-assistant).** The agent's
  grounding corpus is EXACTLY the D2 index: llms.txt for discovery, facts
  records for answers, live JSON for current numbers. Answers cite fact ids
  and link source_urls — the schema was designed so "how is arbLUNA priced?"
  returns the claim + the PRICING-DOCTRINE link, not a paraphrase from
  nowhere. Architecture per SPEC-ai-assistant: Vercel serverless proxy holds
  the API key, per-IP rate limits, scope guardrails. New decision this spec
  adds: retrieval = fetch-by-index (the agent reads docs-index.json/llms.txt
  and pulls only the relevant facts files per question) rather than stuffing
  the whole corpus — cheap, and it scales as the knowledge base grows.
- **D7 — content gaps to fill BEFORE launch** (docs debt, mostly assembly):
  - `tla-stats-system.md` prose companion (facts file exists, prose doesn't)
  - a "Trust & Data" doc: how capture works, the mock-gate discipline,
    system-health monitors, what "chain-honest" means here
  - user guides: reading your portfolio, what VP is, epochs/gauges/tributes
    in plain language, wallet lookup
  - contract-addresses reference page (rendered from curated
    known_contracts.json — already exists as data)
- **D8 — what we do NOT do.** No Mintlify/SaaS dependency. No second copy of
  any fact. No docs CMS. No search service in v1 (client-side filter over
  docs-index.json titles + facts claims is enough to start). Ecosystem-
  politics commentary stays out, per standing rule.

## Phasing

1. **Phase 1 — the hub:** docs-index.json + docs.html renderer + llms.txt
   Action + D4 menu (minus "Ask the assistant"). Ships value immediately:
   the knowledge base becomes visible, citable, and AI-consumable.
2. **Phase 2 — the agent:** SPEC-ai-assistant built on the Phase-1 corpus.
   Requires the serverless proxy decision (Vercel functions, per that spec).
3. **Phase 3 — polish:** support-request submission (per SPEC-ai-assistant),
   page-scoped "ask", maybe MCP endpoint exposure of llms.txt + facts.

## Where things live (per the binding placement map)

- This spec: `website-adao-core/SPEC-adao-docs.md` (website-feature spec).
- docs-index.json + llms.txt generator: `tla-core` (data + its Action).
- docs.html + JS: `aDAO-links-site` (the live site).
- Content: already in `tla-core/docs/` — no moves needed.

## Why it's worth it

The knowledge base already exists and already carries provenance; the docs hub
makes months of capture-layer honesty VISIBLE — every claim on the site
traceable to a source or explicitly labeled as ours. And the agent stops being
a moonshot: its brain is built, its index is D2, its answers cite. What's left
is a renderer, a text file, and a proxy function.

# Help Page Changelog

---

## Agent v1.4.0 + Rev 1.3 — 2026-08-20 — read_product tool, trust links, rich rendering

- **read_product tool**: the agent can now fetch org data files on demand
  (whitelisted tla-core prefixes; arrays truncate head+tail so recent events
  survive) — "who unstaked recently" now reads the actual transfers stream
  instead of describing where to look. Gated on the real August stream.
- **Trust-link protocol (rule 10)**: answers cite verifiable sources as
  links — the exact GitHub file used, chainsco.pe for txs/addresses, the
  visitor's Member Portfolio for wallets, docs.erisprotocol.com /
  docs.astroport.fi for protocol mechanics. Full addresses/hashes, never
  elided.
- **Rich rendering (both chat surfaces)**: markdown bold/code/links render
  properly (the raw ** asterisks are gone); terra1 addresses and tx hashes
  become copyable mono chips with one-tap copy + a chain link. HTML-escape
  first — injection gated.

## Rev 1.2.1 — 2026-08-20 — cold starts self-heal

Free-tier hosting sleeps when idle; the first question after a quiet spell
landed mid-wake and showed "unreachable, try again" — twice in a row for the
owner. Both chat surfaces (drawer + Help page) now wait out the wake and
retry ONCE automatically (~30s, with a live status line) before conceding —
and the concession now distinguishes "probably sleeping" from "probably
down". Always-on hosting ($7/mo) or a free 10-minute /health pinger removes
the wake entirely; the UI no longer punishes either choice.

## Rev 1.2 + Agent v1.3.0 — 2026-08-20 — in-page help drawer, page context, wallet picker

- **The Help bubble now opens a slide-over DRAWER on the page you're viewing**
  (owner request: "see the page I was looking at while I write my question").
  Chat happens beside the content; a "Full help ↗" link reaches the forms/FAQ.
- **Page context**: every drawer question tells the agent which page + tab the
  visitor is on (pathname + hash) — the service injects it as visitor_context
  so answers cater to what's actually on screen.
- **Wallet picker**: searchable by registered name or address (participants
  feed, 203 entries, lazy-loaded 39KB), pinned as a chip with ×-to-remove,
  persisted per browser; the pinned address is sent as its own field and wins
  over any address in the text — every answer caters to that wallet until
  removed. Server v1.3.0 accepts {wallet, page}.
- Same disclaimer (shared acceptance key — accept once anywhere, holds
  everywhere), same rate nudge, same graceful cold-start message.
- AGENT_URL now lives in ONE home (lib/site-footer.js); help.html reads it
  from there.
- Gated: server context/wallet injection on real data; drawer mechanics
  (bubble→open, greeting, pin-by-name, persist, remove) in jsdom.

## Rev 1.1 — 2026-08-20 — discoverability + design pass; index dot fixed

- **Site-wide Help bubble**: every page loading lib/site-footer.js now renders
  a fixed bottom-right Help bubble linking to help.html — one implementation,
  zero per-page wiring (hidden on help.html itself). Help was buried in the
  footer link row; now it is one click from anywhere.
- **Design pass on help.html**: hero banner, suggested-question chips (tap to
  ask; the wallet chip pre-fills the address pattern), avatar chat bubbles
  with a typing indicator, and accent-topped cards (cyan/red/amber). Logic
  untouched — modal, nudge, forms, and gates all as gated.
- **Index health dot ROOT-CAUSED and fixed** (in index-log too): index's
  local refreshHealthIndicator never delegated to the shared wireHealth —
  two setters fought over data-overall and the stricter legacy verdict won,
  running the dot red while the hub read 100%. Same delegation fix as
  tla-stats T5.2. One health implementation now truly everywhere.

## Agent v1.2.1 — 2026-08-20 — respectful-use nudge

The service now reports each visitor's hourly usage with every answer; the
chat shows a "questions this hour: N / 10" chip and, at question 5, posts a
one-time amber nudge: shared community budget, monthly-capped, FAQ answers
most things instantly, please keep it available for everyone. The 429 wall
message carries the same framing. Gated: usage counts, 5th-question value,
and the over-limit payload all verified.

## Agent v1.2.0 — 2026-08-20 — education-not-advice protocol + scroll-through disclaimer

- **The participation protocol** replaces the one-line no-advice rule: the
  agent may explain mechanics (slippage, take rate, amplification, epoch
  settlement, "pot empties → Votion re-optimizes" as documented system
  behavior), show the visitor their own numbers, and route to the site's
  tools (zap planner for entry/exit impact at their size, Bribe Runway, LP
  Grades, Bounty Board). It may NEVER say best/should/recommend, rank
  options for a person, size positions, or forecast outcomes — "what's the
  best way to X" gets reframed into mechanics + the tool that models it +
  "the decision is yours". Every participation-adjacent answer ends with a
  one-line not-financial-advice reminder.
- **Scroll-through disclaimer gate**: first question opens a modal the
  visitor must scroll to the end of before Accept enables — information not
  advice, data can be wrong, no relationship created, DeFi risk, privacy,
  no liability. Accepted state persists per browser; the pending question
  fires automatically after acceptance. The SERVICE independently refuses
  any request without accepted_disclaimer:true (HTTP 428), so no alternate
  client skips assent. Gated both sides.
- ⚠ OWNER ACTION: the disclaimer WORDING is a draft — have a lawyer review
  it before public launch. The mechanism is done; the text is not legal
  counsel.

## Agent v1.1.0 — 2026-08-20 — on-chain queries (real tool use)

The agent can now query the chain itself: two tools against the public LCD —
get_transaction (hash) and search_address_txs (the visitor's own address,
message.sender side, honestly labeled as such). Raw tx JSON is compacted
server-side to hash/time/memo/wasm-actions/transfers before the model sees
it; max 3 chain calls per question, 8s timeouts, node errors reported rather
than papered over. Rule 9: it investigates only on the asker's behalf —
never hunts other wallets for them. Gated on a real fixture (the owner's
lock-withdraw tx): tool round-trip, compaction (ve/withdraw + burn +
gauge/update_vote + 25 LUNA + memo preserved, raw JSON excluded), and the
round counter all verified.

## Agent v1.0.1 — 2026-08-20 — full knowledge grounding + wallet lookup

- Corpus extended to the entire project knowledge base: ecosystem docs
  (Eris/Astroport/BBL/Credia + pricing doctrine), repo catalog, all six page
  changelogs, the three spec files, and the build queue — so "how does X
  work", "when did Y change", and "does Z already exist or is it queued" all
  answer from the same sources build sessions read.
- Wallet lookup: a terra1… address in a question pulls that wallet's live
  record from the public positions/participants products; "my portfolio
  looks off" gets checked against the visitor's actual numbers. Gated
  against the real products: VP, locks brief, and the honest NOT-TRACKED
  path all verified.

## Rev 1.0 — 2026-08-20 — Help page ships (v0 live, v1 ready)

New help.html, linked from every page's shared footer:
- **FAQ** — the honest answers to the questions the data raises: why blanks
  exist, nightly rollup cadence, what grades mean, the health dot's one
  question, VP conventions, verifiability, why bribe runway matters.
- **Report an issue / Request a feature (v0)** — structured forms drafting
  prefilled GitHub issues into tla-core: page, claim, value seen, timestamp.
  Zero backend, zero cost, spam-guarded by GitHub accounts.
- **Assistant chat (v1-ready)** — the panel is live with a graceful
  "not deployed yet" state; flipping it on = deploying
  platform-crons/help-agent (Render web service, ~$0–7/mo hosting +
  ~1–2¢/question on claude-haiku-4-5, hard monthly budget cap) and pasting
  the service URL into HELP_AGENT_URL. Mock-gated end-to-end: grounding
  corpus cached, spend tracked from API usage, per-IP rate limit, every
  error message routes to the always-working report form.
- lib/site-footer.js: Help link added to LINKS on every page; help-log
  registered.

# Help Page Changelog

---

## Rev 1.4 + Agent v1.7.0 — 2026-08-21 — real chat window, triaged forms, mobile pass

- **The chat is a chat window now** (owner request): fixed-height shell — log
  fills, composer pins to the bottom. The composer is an auto-growing
  textarea (2 rows → 200px, scrolls beyond) so a long question stays fully
  readable before sending; 16px font (the iOS threshold below which focusing
  an input zooms the page). Desktop: Enter sends, Shift+Enter wraps. Touch:
  Enter wraps, the button sends — thumbs expect the return key to make a
  newline.
- **Report/Request run THROUGH the assistant first** (owner request): the
  form's primary button is now "Run it past the assistant" — it feeds a
  structured question into the chat in a triage mode. Server v1.7.0 accepts
  `mode: report|request`; the addendum rides as a third system block AFTER
  the cached corpus (triage shares the prompt cache with normal chat) with a
  900-token cap. Report mode verifies the claim against the live record and
  classifies KNOWN CAUSE / PLAUSIBLE FAULT / CANNOT VERIFY; request mode
  triages ALREADY EXISTS / ALREADY QUEUED / DATA EXISTS, SMALL BUILD / NEEDS
  NEW CAPTURE / CONFLICTS WITH DOCTRINE — teaching the constraint instead of
  silently rejecting. Every triage ends with a `---DRAFT---` block the page
  extracts into a filing card: "File on GitHub with this analysis" opens the
  prefilled issue with the triage attached — reports arrive PRE-INVESTIGATED.
  The direct GitHub links stay under each form (quiet secondary path) because
  filing must keep working with the assistant asleep, rate-walled, or capped.
- **Mobile pass** (owner direction — mobile treated as its own shape, not a
  squeezed desktop): the site-wide help drawer becomes a FULL-SCREEN sheet on
  ≤640px viewports, sliding up from the bottom at 100dvh (the address-bar and
  keyboard-safe unit) with thumb-sized close/send; desktop keeps the 400px
  beside-the-content slide-over. One drawer, two shapes. The drawer composer
  is the same 16px auto-growing textarea. On help.html the chat runs 70dvh on
  phones, suggestion chips become a horizontal scroll row, buttons go
  full-width, and cards already stack single-column.
- Triage conversations are single-shot (the service holds no thread history)
  — the form carries full context so one shot usually lands; threaded triage
  is a queued follow-up.
- Gated: server mode plumbing 10/10 with mocked upstream (block order, cache
  position, 900/600 caps, invalid-mode fallback); help.html 14/14 in jsdom
  (composer, autogrow cap, chips scroll, both triage payloads, draft
  extraction + strip + GitHub prefill with triage footer, plain-chat has no
  mode, direct path alive); drawer 12/12 (panel vs sheet by viewport, Enter
  semantics by pointer type, dvh sheet, downward close, page context).

## Battery v1.0 — 2026-08-20 — verification battery (10 graded questions)

The agent gets interviewed: a 10-question battery spanning the data map, each
graded against ground truth computed independently from a fresh tla-core pull
(2026-08-20: band E199, runway period 198, positions current). Coverage: APR
decomposition on a second pool (bLUNA-LUNA — the INVERSE story: staked fell
55%, VP flat, APR rose), TLA TVL trend, NFT staked-count history to Jan-2025,
wallet lookup (9 locks / VP 1,317,638 — the record moved from the old 11-lock
fixture after the lock-withdraw), bribe runway (19 pools, mostly 1–2 epochs),
rule-11 ranking bait ("second-largest after aDAO" — FALSE: Votion ≈7.88M vs
aDAO ≈0.84M, ~9x larger; pass = shown arithmetic or refusal), the wrong-object
trap (sink ≠ pair), out-of-map honesty (E150 APR must not exist), the xASTRO
regression, and distributions routing (history.json, NOT events/).

Two surfaces, one battery: a browser harness running the agent's exact brain
replica (same rules, corpus, tools, model — session artifact), and
`help-agent/test-battery.js` against the live /ask endpoint for deploy parity.
Auto-graders keyword-gated 20/20 on canned pass/fail pairs before delivery;
REVIEW verdicts mean "needs a human read", never "failed". Numeric truths are
dated in-file; structural checks (rule-11, wrong-object, out-of-map, routing)
don't go stale. Note: a full battery spends the service's default 10/hour rate
allowance — run from a quiet IP or raise RATE_PER_HOUR for the window.

## Agent v1.6.0 — 2026-08-20 — data-map grounding, surgical reads, comparative discipline

_(Entry appended one delivery late — the code shipped 2026-08-20; recorded here
from the committed server.js so the log matches the repo.)_

- **Rule 11 — comparative discipline**: rankings are claims, not color. No
  "largest / second-largest / after X" unless the corpus states it verbatim OR
  the arithmetic is shown from numbers in context. If held numbers contradict
  a ranking, the numbers win and the ranking dies — codified from the owner
  catching "second-largest after aDAO" beside numbers proving otherwise.
- **Rule 12 — historical data map**: before "I can't find historical data",
  the agent must check the mapped products (apr-history, pool-status-history,
  epoch-band-history, nft state-history, distributions/history.json), with
  the wrong-object caution (sinks ≠ pairs) and the APR-basis caution (platform
  basis vs Eris convention) inline.
- **docs/agent/DATA-MAP.md**: question → product → recipe, written for the
  agent AND humans; added to the grounding corpus. Carries the xASTRO worked
  example as the canonical decomposition recipe.
- **read_product `key` parameter — surgical extraction**: one pool/token/entry
  pulled from big keyed files (apr-history, pool-status-history,
  token-catalog…), so the middle of a matrix is reachable — plain truncation
  used to cut pools out of the middle. Key-miss returns the available names.
- **Env-switchable MODEL**: `MODEL` env var (default claude-haiku-4-5) — tier
  up to Sonnet on Render with zero code change.

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

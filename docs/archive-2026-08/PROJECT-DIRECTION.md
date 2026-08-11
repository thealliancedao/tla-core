# PROJECT DIRECTION — TLA Stats roadmap (as of 2026-06-15)

Where this is heading. Pairs with PROJECT-STATUS.md (current state). Ordered
roughly by sequence, not strict priority — some unlock others.

---

## The mission (the why)
Three layers: (1) aDAO mandate — Terra-inflation-funded, build impactful tools;
(2) Allies — tools + governance legibility for partner communities; (3) TLA LP
grading — the incentive-routing oracle. **Accuracy is the moat.** And: make
onboarding NEW collections/communities so easy it's config, not code — "when
others come asking 'do for us what you did,' say absolutely."

---

## NEAR-TERM (next sessions)

### 1. Portfolio Tracker — finish & ship
Assembler + alerts + page are built. Remaining: wire NFT backing_usd (per-NFT
ampLUNA × price), verify ally-member join, polish the UI, add growth charts once
daily archives accumulate enough history. Eventually: PWA + push notifications
for alerts (unlock soon, unclaimed rewards, inactive LP).

### 2. AI Assistant on the site  ⭐ (new — 2026-06-15)
A chat widget that answers user questions using the public docs + live data as
context, helps without DeFi Patriot, and can file support/feature requests directly.
- **Value:** self-serve help; surfaces good feature requests; identifies bugs and
  writes them up for DeFi Patriot.
- **How:** Anthropic API, fed the public JSON/markdown (docs, system-health,
  prices) so it answers about THIS system specifically. Can help users articulate
  an issue, then submit it.
- **Support-request flow:** AI helps write it → submits as a GitHub issue (free,
  notified, tracked) OR email/webhook to DeFi Patriot.
- **The one real constraint:** API key CANNOT be client-side (theft = bill). Needs
  a tiny serverless backend proxy holding the key. That's the only non-static
  piece. Cost = API usage (manageable with limits).
- **Status:** spec'd, not built. Needs the backend-proxy decision.

### 3. NFT Collection Onboarding Blueprint  ⭐ (new — 2026-06-15)
The productization: a structured intake so a new collection can join the platform
(explorer, history tracking, backfills, all the goodies).
- **What it captures:** NFT contract address(es), metadata source/format, traits
  structure, staking contracts (DAODAO/Enterprise/etc), marketplace listings
  source, collection lore/story, desired features (explorer, history, backfill,
  portfolio, grading), collection-specific feature requests, branding/assets.
- **How they submit:** a form → DeFi Patriot, OR a GitHub PR/issue with the filled
  template (so it's tracked + diffable).
- **Why it matters:** turns onboarding from archaeology into config. Directly
  serves the mission. No backend needed (pure form + template).
- **Bonus:** the AI assistant (#2) could help a collection fill this out.
- **Status:** spec'd, not built. Pure win, no infra — strong candidate to build
  next.

---

## MID-TERM

### 4. LP Grading System (the oracle)
8 grading dimensions (trade efficiency, depth, sim slippage, token access, net
APR, community-pool benefit, underdog signal, new-LP signal). Multi-epoch,
ungameable. Prereq (global-config bootstrap) ALREADY MET via tla-registry. Needs:
net-APR computation, per-epoch boundary capture, simulated-exit slippage. Spec:
SPEC-lp-grading.md.

### 5. Epoch-boundary capture
No cron fires AT the epoch boundary yet. Needed for: epoch-over-epoch growth,
vote/bribe settlement, bribe-batch staleness gap, the causality chain. Read
"seconds to next epoch" from global-config, fire around the boundary.

### 6. Bribe intelligence
- Bribe-source → Votion swing attribution (centralization-health signal: how much
  of Votion's VP swing is PD vs Solid vs Astroport vs aDAO).
- Bribe contributor leaderboard ($-contributed — showcase real TLA supporters).
- Causality: bribe → vote → liquidity-traffic (did bribes move votes, did rewards
  move deposits). Needs event backfill + boundary capture.

---

## LONGER-TERM

### 7. History backfill
One-time event backfill to genesis via tx_search — votes, locks, deposits, Votion,
claims, bribes. Recovers past behavior. Spec: SPEC-tla-history-backfill.md.

### 8. Block-by-block live watcher
Tail the chain, catch events as they happen, update live. The real-time layer.
Biggest build — needs an indexer / block-streaming service (not a cron).

### 9. Architecture evolution
NestJS + Postgres target, sequenced AFTER proving pipeline logic in current
scripts. Year-rollover (2027 repos/folders) + token-expiry rollover (Nov 2026).

### 10. Mobile-friendliness + SEO pass
Across all user-facing pages. SEO foundation exists; per-page metadata largely
absent.

---

## OPERATING PRINCIPLES (how we build)
- Accuracy first — a wrong number is worse than no number.
- Verify against production before declaring done.
- One change at a time; full-file replacements.
- Capture docs before moving on (this very doc-pass is the discipline).
- Build so adding a new community is config, not a rewrite.

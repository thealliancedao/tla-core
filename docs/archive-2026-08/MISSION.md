# MISSION — Why TLA Stats exists (the three-layer strategy)

**Status:** drafted 2026-06-14, consolidating DeFi Patriot's mission framing + prior
scattered notes (CRON-FIXES-BRIEF, PROJECT_KNOWLEDGE, CHANGES_PENDING). This sits
ABOVE the individual specs and explains *why* each pillar is being built. When a
feature decision is unclear, check it against this.

---

## The mandate

AllianceDAO is a **community-run project funded by Terra inflation** (Ally
rewards). The funding comes with an obligation: **build impactful things on Terra
and grow the Alliance brand.** So every tool TLA Stats ships is not just useful —
it's *justification of the mandate*: evidence that aDAO earns its inflation
funding by making the chain better. Impact and brand are the north star, not
vanity metrics.

This produces three nested missions, each a different audience:

---

## LAYER 1 — AllianceDAO itself (the "why we exist" layer)

Demonstrate the DAO is doing impactful, public-good work on Terra. The dashboards,
trackers, and analytics ARE the deliverable that shows the mandate is being met.
Audience: the broader Terra ecosystem + aDAO's own members/council.

Already serving this: the NFT Explorer, treasury/TLA dashboards, the rarity work,
the whole transparency surface.

---

## LAYER 2 — The Allies (the "build community" layer)

Grow the Alliance by giving **allied DAOs tools their communities actually use**,
and by improving allies' own governance. Two concrete gifts:

1. **Portfolio trackers / analytics for ally members** — the same position-tracking
   companion (NFT + TLA + Votion), pointed at each ally's community. (adao-allies
   already captures Pixel Lions + Lion DAO members + their TLA positions.)
2. **Governance legibility via name resolution** — help allies **identify their
   members by registered name (PFPK) that aligns with social personalities.** A DAO
   that can't see who its members *are* can't govern well; giving them
   name-resolution makes their electorate legible. We already resolve PFPK names
   across all member crons — this just needs to be *aimed at the allies* as the
   audience, surfaced as a tool for them.

The engine reuse (`lib/capture-engine.js`) makes this cheap: any new ally is one
`ALLIES` array entry and gets the full rich position data through the same tested
core. Adding allies = adding community = growing the brand.

**Unified names across apps** (a recurring theme) belongs here too: one canonical
identity per address/asset, consistent everywhere — a small thing that compounds
into ecosystem cohesion.

---

## LAYER 3 — TLA Stats: grade every LP (the "impactful liquidity" layer)

The most ambitious and most data-dependent. Goal: **grade every LP in TLA (active
AND inactive) on real quality**, so the ecosystem can route incentives
intelligently instead of by inertia or bribe-size alone. TLA Stats becomes the
**reference oracle for "where should TLA liquidity go."**

### The grading dimensions (DeFi Patriot's list, expanded with what we can compute)
| Dimension | What it measures | Data status |
|---|---|---|
| **Trade efficiency** | how well the pool actually executes trades | 🔶 from depth + volume + curve type |
| **Token ease-of-access** | friction to get the asset onto Terra (bridge routes) | ✅ token-access routes already curated (CHANGES_PENDING) |
| **Trade depth** | real liquidity depth | ✅ depth_usd captured (single-asset depth fix pending) |
| **Simulated exits / slippage** | model an exit, show actual slippage — score routes | 🔶 computable from pool reserves + curve math |
| **Unified names across apps** | consistent asset/pool identity | 🔶 known-address-registry + token registry |
| **Community-pool benefit (take-rate)** | which LPs build chain-owned liquidity via the 10% take | ✅ take-rate flow fully mapped (CRON-FIXES-BRIEF 2.10–2.14) |
| **Underdog assistance** | good LPs getting no bribes/votes that deserve support | 🔶 cross bribes-history × pool quality × VP |
| **New-LP help** | bootstrapping newly-added pools | 🔶 pool first-seen + low-VP flag |

### What the grade powers (the purpose)
A trustworthy quality score that:
- aDAO **members copy** when voting,
- external parties **bribe based on** (we provide the reference),
- aDAO **self-bribes toward** (use our own rewards to incentivize the best/most
  impactful routes — chain-owned liquidity, underdogs, new pools),
- and that protects users (a healthy-LP signal doubles as a safety signal).

### Why data quality is existential here
If you're telling people where to route capital, **errors aren't cosmetic —
they're credibility failures.** This is exactly why the arbLUNA pricing catch
(this session, ~14% high) matters: a grading oracle with a 14% price error in its
biggest asset can't be trusted to route incentives. The whole Layer-3 mission
rests on the data-integrity discipline already baked into the project (hard-fail
over placeholder, capture-from-source, snapshot raw + derive views, multi-source
parity checks). **Grading is the product; accuracy is the moat.**

---

## The architectural keystone that makes Layer 3 trustworthy

From CRON-FIXES-BRIEF 2.14: the Eris ve3 contracts hold the complete truth. The
**`global-config.all_addresses` query is a master contract directory** — one read
returns every contract in the system (gauge, staking buckets, bribe-manager,
escrow, take-recipient). A grading cron should **bootstrap from this each run**,
then fan out to read pools, VP, rewards, bribes, take-rates from source — no
hardcoded addresses, auto-tracking any migration. This collapses the
hardcoded-address fragility and is the highest-leverage trustworthiness change.

Guiding philosophy (DeFi Patriot): *read from authoritative sources, snapshot the raw
each epoch, derive views from the raw, never throw away the raw.* Capture
comprehensively now — even data we don't display yet — so features can be built
later without re-deriving, and any discrepancy is diagnosable by going back to
source.

---

## How the pillars relate (the build map)

```
                    MANDATE: impact + brand (funded by Terra inflation)
                                    │
        ┌───────────────────────────┼───────────────────────────┐
   LAYER 1                     LAYER 2                       LAYER 3
   aDAO transparency           Ally tools                    TLA LP grading
   (dashboards, explorer)      (trackers + gov legibility)   (the routing oracle)
        │                           │                             │
        └────────── Portfolio Tracker (serves L1 members + L2 allies) ──────────┘
                                    │
                    Shared data layer (16 crons, capture-engine)
                    Foundations: known-address registry · price parity ·
                    history backfill · global-config bootstrap
```

- **Portfolio Tracker** is the cross-cutting product serving both aDAO members
  (L1) and ally members (L2). Spec: SPEC-portfolio-tracker.md.
- **LP Grading** is the Layer-3 oracle. Needs its own spec (next).
- **Four pillars** from prior planning map onto this: Portfolio Tracker (L1/L2),
  LP Health Scoring (L3), Bribes Tracking (L3 routing input), Vote Intelligence
  (L2 gov legibility + L3 routing).
- **Foundations** (registry, price-parity, backfill, global-config bootstrap)
  serve all three and are prerequisites for trustworthy grading.

---

## Open question for DeFi Patriot (recorded, not blocking)
LP grading's primary purpose — DeFi Patriot leaning "both": route incentives (where
SHOULD liquidity go) AND user safety (which LPs are healthy to enter) are the same
quality signal viewed two ways. The metrics serve both; framing per-audience.

# SPEC — LP Grading (the unified routing oracle)

> **Status:** design draft 2026-08-19 · awaiting DeFi_Patriot approval · BUILD IS
> POST-MIGRATION (priority lock). Written now so the design is banked, the legacy
> scoring models are preserved before their repos are deleted, and dex-data's
> forward capture — which this system will grade from — keeps accruing meanwhile.
>
> **This spec unifies the two grading systems that were built separately:**
> the legacy asset-durability score (tla-registry `confusion_score`, fed the old
> catalog/snapshot tool) and the interim LP grade (page-side in tla-stats
> `renderLpGrades()`). They were never competitors — they are the two halves of
> `SPEC-grading-and-dex-data.md` (Component B and Components A+C respectively)
> that never met. This spec is where they meet.
>
> **Reads first:** `MISSION.md` (archive-2026-08 — Layer 3 is this system),
> `SPEC-platform-doctrine.md` (calibrated trust, coherence, validity gates,
> pre-flight checklist), `SPEC-grading-and-dex-data.md` (the three-component
> reasoning + credibility rule — still authoritative for dex-data capture
> boundaries), `ecosystem-knowledge/terra-liquidity-alliance.md` (mechanics).

---

## 1. Purpose and consumers (from MISSION Layer 3)

Grade **every LP in TLA — active AND inactive** — on real quality, so incentives
route intelligently instead of by inertia or bribe-size alone. TLA Stats becomes
the reference oracle for "where should TLA liquidity go."

**Four consumers, one factual core:**

1. **aDAO members** copy it when voting.
2. **External parties** bribe based on it (we provide the reference).
3. **aDAO itself** self-bribes toward it (chain-owned liquidity, underdogs,
   new pools — ecosystem benefit, not personal reward).
4. **Users** read it as a safety signal (which LPs are healthy to enter).

Routing and safety are the SAME quality signal viewed two ways (recorded owner
decision, MISSION open-question resolved "both"). Therefore: the cron publishes
factual sub-scores ONCE; the page renders per-audience framings (voter lens,
depositor lens) from the same data. No audience is baked into the score.

**Why accuracy is existential:** if you tell people where to route capital,
errors aren't cosmetic — they're credibility failures. *Grading is the product;
accuracy is the moat.* (MISSION, verbatim.)

---

## 2. The credibility rule (inherited, restated, binding)

From SPEC-grading-and-dex-data §2 — the most important decision in the system:

**The auto-grade is 100% facts and verifiable measures. Zero opinion.**
Strategic judgment enters ONLY through the override layer: stated reason
required, DAO-prop-sourced when the weight is non-trivial, applied BEFORE the
grade computes, never in cron code. A project that dislikes its grade argues
with a published rubric or a passed prop — never with hidden opinion.

The published rubric IS the config file (§7): every weight, curve, and threshold
that produces a score is public, versioned, and echoed into every output.

---

## 3. The model — A × B quality, C overlay, honest states

```
                     ┌────────────────────────────────────────────┐
                     │  QUALITY GRADE (A × B) — "how good is it?" │
                     │  A: trading quality (measured performance) │
                     │  B: asset & chain value (facts + override) │
                     └────────────────────┬───────────────────────┘
                                          │
                     ┌────────────────────┴───────────────────────┐
                     │  C: SUPPORT-GAP OVERLAY — "does it need     │
                     │  you?" (bucket-aware, source-by-source)     │
                     └────────────────────┬───────────────────────┘
                                          │
                     ┌────────────────────┴───────────────────────┐
                     │  STATES: new / inactive / low-confidence —  │
                     │  never a fake firm grade                    │
                     └─────────────────────────────────────────────┘
```

**Design decision — C is an overlay, not a weighted component.** "How good is
this pool" and "how much does it need your vote" are different questions a voter
reads separately. Folding under-supportedness INTO the quality grade would make
a mediocre pool look "better" merely because it's ignored, corrupting the safety
reading for depositors. Instead: quality grade stands alone (A×B); the C overlay
ranks *opportunity* (`needScore = quality × underpaid-ratio`, the proven formula
from the interim grade). The default lens composes both; other lenses re-sort.
*(Open for owner override — recorded as decision D2, §11.)*

### Component A — Trading quality (measured; dex-data + token-catalog)

| Metric | Definition | Source | Notes |
|---|---|---|---|
| **Depth** | TVL / reserves-priced liquidity | dex-data daily (chain reserves × token-catalog prices) | log curve, config bounds |
| **Utilization** | volume ÷ liquidity (weekly turnover) | dex-data (Astroport volume; SS = null, see §5) | full marks at config turnover |
| **Trend** | real-liquidity change over trailing window | pool-status-history / dex-data averages | price-deflated (real units), not USD noise |
| **Exit slippage** | simulated price impact at standard sizes | reserves + curve math (already live on slippage page / Rankings) | consume, don't reinvent; pool-type-aware (XYK exact; PCL/stable graded on bound) |
| **Pool balance** | % USD per side | reserves at price-time | imbalance = quality flag |

**Anti-gaming (the un-gameable requirement, non-negotiable):**
- Grade on **epoch-aligned trailing windows** (default 4 epochs) of **time-weighted
  averages**, never instantaneous state. A single high-volume day or a momentary
  liquidity injection around a snapshot must not swing a grade.
- Enforce `snapshots_used / snapshots_expected / has_gaps` per window (already
  in dex-data output). Below the config minimum → the grade is **provisional**,
  visibly, never firm.
- Trust start-lines per source (doctrine §6 of grading-and-dex-data): grade only
  on data captured after a source became trustworthy. Every graded number
  carries its source.
- Wash/bot awareness phases in later as a flag, then a filter (behavior-over-
  history; closer to flows than pool mechanics).

### Component B — Asset & chain value (facts + override layer)

Composed per-pool from its underlying tokens' scores + pool-level chain facts.

**B1. Durability (from the legacy confusion-score factors, rebuilt on
token-catalog Stage 2 — already live):**
- **Price-oracle robustness:** count + verification state of independent price
  sources (CG `cg_confirmed` / `verified_via_bridge` / `registry_assigned` /
  `mismatch` / `no_mapping`; DEX pair-implied coverage). Stage 3 pricing enriches
  this with snapshot-coherent spread when it lands.
- **Acquisition friction:** the four-class model — `native_terra` /
  `ibc_cosmos_native` / `wrapped_disclosed` / `wrapped_looks_native` (the danger
  bucket) — guide-presence gated by class. Curated `acquisition_guides.json`.
- **Identity safety:** cross-source name agreement, buy-the-wrong-variant
  detection, shared-base-symbol confusion. (token-catalog identity score.)

**B2. Asset-class rubric (three classes, three fact bases — one formula would
wash out natives or overvalue volatile project coins):**
- *Bridged/wrapped majors* → market cap of the underlying + IBC-native bonus.
- *IBC infrastructure* (ATOM/ASTRO/INJ) → modest fact base + reasoned/DAO
  override premium (strategic role isn't a fetchable number — that's fine,
  because the premium is stated and governed).
- *Native Terra assets* → native-fact flags (is-native-stablecoin elevated with
  the sovereignty reasoning stated plainly; is-governance-token; ecosystem
  footprint → override territory). Never market-cap-scored.

**B3. Chain alignment (NEW — the mission dimension neither old system built):**
- **Take-rate contribution:** which pools build chain-owned liquidity via the
  take rate flowing to the community pool / PD treasury. Purely on-chain,
  per-pool factual (take-rate flow fully mapped per CRON-FIXES-BRIEF 2.10–2.14).
  This is the single most "ecosystem benefit" metric in the system and the
  chain's own value logic made visible — not our editorial.

### Component C — Support gap (bucket-aware, source-by-source overlay)

- **Who supports it and how much:** PD bribes (attribution live, dynamic
  dao_attr), aDAO votes, Votion-routed VP (org-votion), project bribes/votes,
  DEX-side incentives. The three reward streams stay separate (bribes → voters,
  emissions → LPs, rebase → lockers) — never conflated (`[tla.bribes_to_voters_not_lps]`).
- **Support vs deserved, WITHIN BUCKET:** VP allocates per-bucket and each
  bucket has its own reward allocation, so "where does the next vote do the most
  good" is a within-bucket comparison. The median liquidity-per-VP baseline (the
  proven interim-grade signal) computes per bucket, with the cross-bucket view
  available as a secondary lens.
- **Signals published:** `needScore` (quality × underpaid), `overweighted`
  (support outrunning liquidity — "shift the marginal vote"), `underdog`
  (proven performance, below-median support), `bribe_target` (quality + no pot
  = zero-competition bribe placement), threshold-risk (near the 1% cliff).

### States (honesty around the edges)

- **`new`** — pool younger than the config window: NOT graded F for lacking
  history. Published as `state:"new"` with whatever early reads exist, flagged
  as the jump-start candidate list (mission "new-LP help"). First-seen epoch
  recorded; graduates to graded automatically when the window fills.
- **`provisional`** — window has gaps / below min snapshots: grade shown with a
  visible confidence tier, never presented as firm.
- **`inactive`** — dewhitelisted/below-threshold pools carry last-known grade +
  epoch + inactive-reason where known. Mission: grade EVERY LP; safety reading:
  "this pool used to be X and is no longer incentivized."
- **`ungradeable`** — a metric with no trustworthy source is null and its weight
  renormalizes (never fabricated); a pool too thin/unverifiable to grade says so
  (validity-gate doctrine: correct pressure on the DEX/project, not on us).

---

## 4. Confidence — first-class, on every grade

Per platform doctrine ("calibrated trust"): every published grade carries
`confidence: { snapshots_used, snapshots_expected, has_gaps, window_epochs,
sources_available, trust_start_ok, tier }` where `tier ∈ firm | provisional |
insufficient`. The page shows the tier. A confident wrong number is worse than
an honest "not enough sample yet."

---

## 5. SkeletonSwap ruling (measured 2026-08-19, supersedes stale wording)

- **Liquidity: LIVE.** org SS cron daily, chain-read reserves per pair, priced
  via token-catalog; 34 pools, 6/6 rolling snapshots no gaps, fingerprint
  changing run-to-run. SS pools grade fully on depth/TVL, trend, exit slippage,
  balance, B, and C.
- **Volume: absent-by-honesty, not stale.** SS exposes no trustworthy volume
  source; utilization is null and renormalizes away. NOT an exclusion.
- **Outreach (owner action):** ask SkeletonSwap/BackBone to expose per-pool 24h
  volume in the API their own UI reads (source-selection rule: whatever powers
  their UI is canonical). The day they publish it, the SS-volume trust
  start-line begins and SS pools start earning utilization scores. Honest nulls
  are the designed pressure toward exactly this conversation.

---

## 6. Architecture — a composer, not a fetcher

New module `platform-crons/lp-grades` (own Render job or a gated tail on an
existing daily job — decide at build). Per run:

1. **Bootstrap contracts from `global-config.all_addresses`** (the MISSION
   keystone) — no hardcoded addresses; auto-tracks any migration.
2. **Read the config** from `tla-core/docs/curated/grading_config.json`
   (Contents API, never raw CDN). Halt loudly on parse failure — never grade on
   a default silently.
3. **Read inputs — never re-fetch what another cron owns** (doctrine §9.3):
   - `token-catalog/snapshots/current.json` — identities, identity scores, CG
     verification, prices/reserves at one coherent instant (+ Stage 3 spread
     when it lands), curated overrides merged on read.
   - `dex-data/{astroport,skeletonswap}/` daily + rolling + weekly-avg — the
     windowed A metrics with their sample metadata.
   - `network-and-prices` — canonical price feed until Stage 3.
   - bribes/voting/votion org products — the C inputs (pd-bribes, tla-voting,
     org-votion, adao-positions), each with its own attribution law intact.
   - chain: gauge `distributions` + take-rate per pool (the one thing read
     direct, because it must be current-epoch coherent).
4. **Compute** sub-scores → components → quality grade + C overlay + states,
   renormalizing null metrics, applying overrides BEFORE composition.
5. **Publish** `tla-core/lp-grades/snapshots/current.json` (+ heartbeat, +
   epoch-stamped history append under `lp-grades/epochs/`). Output echoes
   `config_version`, `config_sha`, all weights used, and per-pool confidence.
   Write-once/never-shrink laws apply; publisher carries branch-race retry with
   fresh sha, 409/422/5xx retryable.

**The page becomes a pure renderer.** `renderLpGrades()` in tla-stats.html is
replaced by a reader of `lp-grades/current.json` + the lens definitions from the
same output. Page-side computation of grades ends (the current implementation
is the documented interim, §9).

---

## 7. `grading_config.json` — the one file that IS the rubric

Location: `tla-core/docs/curated/grading_config.json` (sibling to
`scoring_weights.json`, same proven pattern, scaled up). Draft ships alongside
this spec. Principles:

- **Everything tunable lives here:** component weights, per-metric weights,
  curve parameters (log bounds, full-marks turnover, trend slope, balance-curve
  steepness), grade letter boundaries, caps (single-asset ceiling), confidence
  gates (min snapshots, min epochs, provisional threshold), state rules
  (new-pool epoch count), C-overlay parameters (within-bucket flag, underpaid/
  overweighted cutoffs), and **lens definitions**.
- **Edit → next run reflects it. No code change.** The cron reads it at run
  start and echoes version+sha into output so every scored snapshot says which
  rubric produced it. History records rubric changes implicitly.
- **Weights sum-check enforced** (cron halts loudly on a config whose weights
  don't normalize — a typo must never silently rescale the world).
- Overrides stay SEPARATE (`token_overrides.json`,
  `asset_value_overrides.json` — new, same `{discovered, override, value, note}`
  block model, reason required, `needs_dao_prop` flag for weighty premiums).
  Config = the rubric; overrides = governed exceptions to inputs.

---

## 8. Lenses — config-defined views (owner requirement 2026-08-19)

A lens = named `{ label, description, sort, filters, framing }` over the
published sub-scores. Defined in config so a new lens is a file edit. The page
renders the lens picker from the output. Launch set:

| Lens | Question it answers | Sort / filter sketch |
|---|---|---|
| **Best for the chain** *(default)* | absolute best for Terra and its users | quality grade (A×B) desc |
| **Needs votes** | deserving and under-supported | needScore desc, within-bucket |
| **Underdogs** | small pools punching above weight | underdog flag, quality desc |
| **Chain builders** | best take-rate contribution to chain-owned liquidity | B3 take-rate desc |
| **Trader's choice** | best to support active traders | depth + exit-slippage + utilization composite desc |
| **Active projects** | project pools with most real activity | bucket=Project, utilization/volume desc |
| **New pools** | jump-start candidates | state=new, first-seen desc |
| **Bribe targets** | quality pools with zero pot competition | bribe_target flag |
| **At risk** | near the 1% threshold cliff | threshold-risk asc |

Depositor framing (safety lens: "healthy to enter") renders from the same
quality sub-scores with C de-emphasized — one core, per-audience views (§1).

---

## 9. The interim grade (documented; being replaced)

Page-side in tla-stats.html `renderLpGrades()` — Components A+C only:
Depth .25 (log 5k–500k) · Utilization .25 (50%/wk = full; SS + singles skip) ·
Support-balance .25 (staked-per-1M-VP vs global median) · Threshold-safety .15 ·
Trend .10 (flat=60). Missing components renormalize; singles capped at 88;
letters A+≥90/A≥80/B≥70/C≥55/D≥40/F. Derived: needScore, underdog,
bribe_target, verdicts. Views: all/needs/underdogs.

**What it got right (keep):** renormalize-not-fabricate; SS volume trust rule;
needScore formula; underdog/bribe-target detection; duplicate-gauge flagging;
plain-language "why" lines. **What it lacks (why it's replaced):** weights
hardcoded page-side; short/live windows (gameable); no Component B at all;
support median not bucket-aware; grade recomputed per page-load (no history, no
config provenance).

---

## 10. Legacy models — preserved verbatim before repo deletion

### 10a. tla-registry `confusion_score` (cron-scripts/chain/tla-registry/tla-registry.js, stages ~1793–1990)

Token-durability score, subtractive from 100, hardcoded weights:

| Factor | Penalty | Notes |
|---|---|---|
| cross_source_name_mismatch | −15 | real names across cosmos-registry/Eris/Astroport/SS, suffix-stripped |
| no CG mapping at all | −25 | `no_external_price_source` |
| CG `verified` (terra-2 index confirms) | 0 | trustworthy |
| CG `verified_via_bridge` | −5 | provenance solid, slightly less specific |
| CG `discovered` (gap-filled) | 0 | neutral |
| CG `mismatch` (claimed≠actual) | −30 | strong red flag |
| CG `unverified_no_terra_addr` | −15 | common for IBC; can't confirm |
| CG `hardcoded_override` | 0 | trusted manual fix |
| CG unknown state | −10 | unverified must not pass as perfect |
| no guide, class `wrapped_looks_native` | −20 | the danger bucket |
| no guide, class `wrapped_disclosed` | −10 | guide useful |
| classes native_terra / ibc_cosmos_native / lp_token | 0 | guide never needed |
| not_in_active_use (0 TLA pools, no source) | −15 | |
| buy_the_wrong_variant (same name, different underlyings) | −20 | + variant_warning payload |
| shared_base_symbol | −10 | + related_variants |

Scars encoded: the rSWTH bug (claimed CG id passed as 100 — hence verification
states); LP display-name composition from underlyings; variant-divergence
warning (brief 2.21). **Everything here is subsumed by B1 + token-catalog
Stage 2 with config-driven weights — the repo can die.**

### 10b. The old snapshot four-score shape (producer already gone)

`scores: { adao_opportunity, access, performance, support }` survives only as a
dead reader branch in tla-stats.html (`calc_score/access/perf/support`, all 0
today — no producer in legacy or org code). Preserved because the SHAPE
validates the model: performance→A, access→B, support+opportunity→C. Both
generations of owner thinking converge on A/B/C. The dead reader branch strips
when the page repoints to lp-grades.

---

## 11. Open decisions (owner call, recorded)

- **D1 — A/B split within the quality grade.** Draft config: A .60 / B .40
  (performance-forward, per the interim grade's instinct) vs spec-implied
  equality. Editable forever; pick the launch value.
- **D2 — C as overlay (default in this spec) vs weighted into the grade.**
  Overlay recommended (§3 reasoning); confirm.
- **D3 — Window length.** 4 epochs draft floor for firm grades; 6 stricter.
- **D4 — Within-bucket normalization details.** Median-per-bucket (draft) vs
  bucket reward-share-weighted baselines.
- **D5 — Module placement.** Own Render job vs gated tail (daily, after
  dex-data). Tail is cheaper; own job isolates failure.
- **D6 — B3 take-rate metric shape.** Absolute take-flow vs take-rate ×
  utilization (flow actually generated). Lean: generated flow.

## 12. Pre-flight checklist (doctrine §9) — walked

1 mechanism read ✅ (TLA/astroport/SS/eris knowledge base) · 2 boundary ✅
(composer; owns composition only) · 3 no duplicate fetch ✅ (§6.3; only
take-rate/distributions read direct, for coherence) · 4 robust sources ✅
(chain reserves > APIs; hub rates > DEX prices) · 5 validity gates ✅ (dust
floors inherit dex-data's; null-vs-empty; type gates on curve math) ·
6 coherence ✅ (A prices/reserves from token-catalog's single instant; C from
same-epoch products) · 7 confidence/provenance ✅ (§4; config sha echoed) ·
8 self-contained ✅ (reads org products only — legacy nothing) · 9 parallel-run ✅
(runs beside the interim page grade; compare rankings before repointing the tab)
· 10 version-stamped ✅.

## 13. Build order (post-migration; forward capture already running)

1. Config + module skeleton, mock-gated on real current org products.
2. A+C on dex-data windows (parity target: interim grade rankings, then beat
   it on window rigor). States + confidence tiers from day one.
3. B1 (token-catalog inputs) + B3 (take-rate) + asset-class rubric + override
   file + editable page extension.
4. Repoint tla-stats LP Grades tab to `lp-grades/current.json`; strip
   `renderLpGrades()` computation + dead four-score reader branch.
5. Lenses beyond launch set; wash-flag phase; Stage-3 spread enrichment when
   token-catalog pricing lands.

**Surface firm grades only when the sample can't be gamed by one epoch.** No
one is watching yet; waiting for a real sample is a fine cost. (grading-and-
dex-data §3, kept verbatim in spirit.)

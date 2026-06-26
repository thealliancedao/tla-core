# SPEC — DEX Grading & dex-data (the mission system)

> This is the design for the system TLA Stats exists to deliver: **guidance that helps
> voters direct TLA rewards toward the liquidity most valuable to Terra and its users.**
> Not a volume leaderboard — a capital-allocation guide answering "where does the next
> incentive dollar do the most good?"
>
> Written before building, on purpose (the design IS the hard part; the cron that
> implements it is comparatively easy). Every decision below records its *reasoning* so
> future maintainers — and the community — can see why we did it this way and argue to
> improve it. Nothing here is locked: the override layer and published rubric mean we
> adjust when reality or the community pushes back.
>
> Builds on: `SPEC-platform-doctrine.md` (snapshot coherence, robust-vs-weak sources,
> validity gates, surface-disagreement) and `ecosystem-knowledge/` (pool mechanics,
> asset facts). Read those first.

---

## 1. What the grade is FOR (the north star)

A voter looking at a pool's grade should learn: **is incentivizing this pool good for
Terra and its users?** That breaks into three honest questions, which become the three
components of the grade:

1. **Is this pair intrinsically GOOD?** — trading efficiency: real depth so users move
   size without slippage, real (non-wash) volume, balanced healthy pool. *(dex-data)*
2. **Are the ASSETS valuable to Terra?** — is this built on assets the chain wants as
   chain-owned liquidity (via the take rate → PD treasury)? *(asset-value rubric)*
3. **Is it well-served or under-served?** — who's already incentivizing it vs. its
   value; is it over-supported (waste) or strong-but-ignored (opportunity)? *(support gap)*

**The "vote here" signal = high intrinsic quality × high asset value × UNDER-served.**
The anti-signal = "over-supported, shift some away." This is the chain's own logic
(buckets reward the most chain-valuable liquidity; the take rate builds chain-owned
reserves) made visible — not our editorial.

> Why this matters: the stable bucket gets the most rewards *because* the protocol
> already decided stable/blue-chip liquidity is most valuable to the chain. We are
> surfacing and operationalizing that existing logic, not inventing a value judgment.

---

## 2. The credibility rule (the most important decision in the whole system)

This grade influences votes. Its credibility is the platform. Therefore:

**The auto-grade is 100% facts and verifiable measures. Zero opinion.** Strategic
judgment enters ONLY through an explicit override layer that requires a stated reason,
and — for meaningful weight — DAO approval.

- Measured facts (depth, slippage, volume, market cap, IBC status, who's incentivizing)
  → auto-grade. Objective, sourced, anyone can verify.
- Strategic judgment ("ATOM is the IBC hub, worth more than its market cap shows") →
  **override with a required reason**, applied BEFORE the grade computes, sourced to a
  DAO prop where the weight is non-trivial.

This dissolves the bias problem: nobody can call the base grade biased (it's facts);
every deviation is a transparent, reasoned, usually DAO-sanctioned override. Subjectivity
is moved OUT of the data and INTO governance, where it is legitimate. A project that
dislikes its grade argues with a published rubric or a passed prop — never with hidden
opinion.

> This reuses the proven token-catalog override pattern (`{discovered, override, value,
> note}`, curated config, editable HTML page, discovery runs underneath). New domain,
> validated mechanism.

---

## 3. Component A — DEX trading quality (dex-data, measured)

The intrinsic-quality half. All measured, all from chain/DEX source. This is the part
that must start capturing trustworthy history NOW (see §6 trust start-lines), because a
grade needs enough un-gameable history that one epoch can't swing or game it.

**Measures (per pool, per snapshot):**
- **Depth → simulated slippage** at standard trade sizes (e.g. $1k/$10k/$100k). The
  honest "can a user move size?" number. Computed from reserves + curve type (XYK vs PCL
  vs stable — see astroport.md; PCL depth concentrates, stable amplifies).
- **Liquidity (TVL)** — reserves × coherent prices (snapshot-coherent with the price feed).
- **Volume** (24h / 7d) — real trading throughput.
- **Pool balance** — % USD value per side; a badly imbalanced pool is a quality flag.
- **Volume / liquidity ratio** — capital efficiency (is the liquidity actually used?).
- **APR** — reward yield to depositors.

**Anti-gaming — the averaging method (this is where the old cron's method was doubted):**
- **Time-weighted averages over enough sample points**, not single snapshots. A single
  high-volume day or a momentary liquidity injection around a snapshot must NOT swing a
  grade.
- **Track `snapshots_used` / `snapshots_expected` / `has_gaps` per aggregation window**
  (the old cron already did this — keep and enforce it). An average built on too few
  points, or with gaps, is flagged low-confidence and must NOT be presented as a firm
  grade. (Validity gate, per platform doctrine.)
- **Sampling cadence frequent enough to resist single-snapshot gaming** — hourly at
  minimum; the grade reads from many points so no one snapshot dominates.
- **Windows: epoch-aligned** (TLA operates in weekly epochs) plus rolling 7d/30d. Grade
  on the trailing window with enough points, not on instantaneous state.
- **Wash/bot awareness** — flag volume that looks like wash trading or bot-dominated
  activity so it doesn't inflate a real-volume grade. (May start as a flag, mature into a
  filter — see §7 phasing. Bot detection is behavior-over-history; possibly its own
  sub-system.)

> Why so careful here: this is the un-gameable requirement. A grade people VOTE on, built
> on a gameable average, is worse than no grade. We would rather wait several epochs to
> accumulate a real sample than ship a swingable grade. No one is watching yet — starting
> fresh today and waiting for a real sample is a fine cost.

---

## 4. Component B — Asset value (rubric: facts + override)

"Are the assets good for Terra?" Three asset CLASSES, scored by three fact-based methods,
because what makes each valuable differs (forcing one formula would either wash out
natives or overvalue volatile project coins). All facts measured/sourced; strategic
premium via override.

### B1. Bridged-in / wrapped majors → market cap of the underlying
BTC, ETH, ATOM(as asset), INJ, PAXG, USDC, USDT. **Primary driver: market cap of the
underlying** — bigger cap = more trusted to pile up in the treasury (sound treasury
principle: a treasury wants blue-chip reserves). Plus factual modifiers:
- **IBC-native bonus** (objective): USDC > USDT in part because USDC is IBC-able — cleaner
  integration. (USDT "ok but not the stable we truly want" is an opinion → if we encode it,
  it's an override with reason, not baked into the auto-score.)
- Market cap is fetchable (CoinGecko/source) — factual, verifiable.

### B2. IBC infrastructure assets → light fact base + override premium
ATOM, ASTRO, INJ. Their value is **not captured by market cap** — ATOM is the IBC
foundation Terra routes through; ASTRO is the primary Terra DEX; INJ ships things like
USDC.inj and RWA. These get a modest fact base (market cap floor + is-IBC-infrastructure
flag) and lean MORE on **reasoned/DAO-override premium** for the strategic role, because
"is the IBC hub" isn't a number. That's fine — as long as the override reason is stated
and big premiums are DAO-passed.

### B3. Native Terra assets → native-fact flags, NOT market cap
SOLID, CAPA, ROAR, FUEL, etc. Market cap would unfairly sink natives, so they're scored
on a native-asset fact set:
- **is-native-stablecoin** (SOLID): elevated — a native stable keeps value AND fees in
  Terra (to Terra builders) rather than leaking to an external issuer. Sourced to Solid
  Protocol; the more SOLID is minted and trusted, the more Terra owns its monetary base.
- **is-governance-token** (CAPA — governs Solid): meaningful.
- **ecosystem-utility / footprint** (ROAR: community + NFT marketplace + top LUNA
  validator): a real but harder-to-quantify factor → likely override territory.
- FUEL (a marketplace token among three marketplaces): lower — not scarce/strategic.

> **Honesty flag for maintainers:** B2 and B3 lean harder on the override layer than B1,
> because their value resists reduction to a fetched number. That is acceptable under the
> credibility rule (§2) PRECISELY because every premium is a stated, often DAO-sanctioned
> reason — not hidden opinion. The SOLID elevation especially must be the most
> transparently justified weight in the rubric (native-stable sovereignty reasoning,
> stated plainly), since Solid is an ecosystem partner and any unexplained partner-token
> elevation would read as favoritism and damage trust. Principled, sourced, visible — or
> not at all.

### The published rubric
The weighting of all the above is **published openly** ("here's how TLA Stats scores
asset quality and why"), so anyone can see exactly why a pool scored as it did and argue
with the *weighting* — but never accuse us of hiding it. Transparency converts strategic
judgment from a liability into the platform's credibility.

---

## 5. Component C — Support gap (flows/bribes)

"Over-served or under-served?" Composes the measured support picture against the
pool's quality×asset value:
- **Who's incentivizing** (aDAO, PD, the project, the DEX) and how much — from
  flows/bribes data.
- **Support vs. deserved** — a high-quality, high-asset-value pool getting little support
  = the prime "vote here" opportunity. A pool drowning in support beyond its value =
  "ease off, shift the marginal dollar."

> This is the differentiated insight no other tool gives: not just "what's good" but
> "what's good AND needs your vote." It depends on flows/bribes data (a later cron), so
> the FULL guidance lands after dex-data + asset-value are trustworthy. Build in order.

---

## 6. Trust start-lines (per-source, baked into the data)

We only grade on data from after a source became trustworthy. This is non-negotiable —
grading on distrusted history poisons the whole system.

- **Pre-deving.zone era**: discarded. Staking / broken-NFT stats from before we built it
  ourselves are not trustworthy — they go away, no rescue attempt.
- **SkeletonSwap**: trustworthy only AFTER the warlock fix (it went stale before; the
  pre-2026-04-16 backups are the only old volume history and are suspect). SS history
  starts at the fix.
- **Astroport**: the current old cron is reasonably trusted on capture, BUT its
  day/week/month/year averaging method is under review — we will design the averaging
  fresh (§3) rather than inherit a method we're unsure of. Matching the old cron 1:1
  would risk matching a bug; we vet the METHOD, not just the numbers.
- **Every graded number carries its source + the trust-start-line**, so the grader never
  silently includes pre-trust data.

> Doctrine: start fresh rather than inherit a broken method to keep old data. We have a
> much better understanding now than when the old crons were built; where a fresh method
> is better, we use it. A few epochs to accumulate a real sample is a fine price for a
> trustworthy, un-gameable grade.

---

## 7. Build order & phasing (forward-capture FIRST)

The urgency is on FORWARD CAPTURE — every epoch not capturing trustworthy DEX
volume/liquidity is history we can't recover (past on-chain state is pruned; no free
phoenix-1 archive node). Start the clock immediately.

1. **dex-data forward-capture** (Component A) — build fresh with the rigorous averaging
   (§3), run in PARALLEL with the old Astroport/SS crons to vet new meets/beats (watching
   the METHOD, not just matching numbers). Let it accrue across epochs.
2. **asset-value rubric** (Component B) — facts + override layer + published rubric +
   the editable HTML override page (extends the existing token-override tool; new curated
   file e.g. `asset_value_overrides.json`; overrides source back to foundation data and
   apply BEFORE grades compute; reason required; DAO-prop flag for weighty bumps).
3. **Grade composition + surface on TLA Stats** — once the sample is statistically real
   and un-gameable. Not before.
4. **support gap** (Component C) — after flows/bribes cron exists.
5. **wash/bot filtering, simulated-slippage refinement, price-oracle/route analysis** —
   the "cool things that help people decide" — layer in as the data foundation matures.

> Don't let the grading dream slow forward-capture. Capture correctly now; refine the
> grade as history accrues. Surface grades only when the sample can't be gamed by one epoch.

---

## 8. The override page (mechanics)

Extends the existing token-catalog override HTML tool. For asset-value (and grade)
overrides:
- Edit/adjust an asset's value score or a pool's grade inputs.
- **Required: stated reason** for any override.
- **Flag: "needs DAO prop" vs "minor curatorial fix"** — weighty strategic bumps
  (e.g. ATOM IBC-hub premium) route through a DAO proposal; if passed, the override is
  applied and sourced to the prop.
- Overrides **source back to foundation data and apply BEFORE the auto-grade computes**
  (caught before auto-pulls, factored in before grades are cast) — an input to the grade,
  not a cosmetic layer.
- Same download-JSON → commit/PR flow as the token override page. Overrides live in a
  curated config (e.g. `asset_value_overrides.json`), never in cron output.

---

## 9. Recorded reasoning (so others can improve this)

Key judgment calls and WHY, so future maintainers / the community / people with deeper
understanding can challenge and improve them:

- **Why facts-only auto-grade + override layer** (not baked-in weighting): credibility.
  A vote-influencing grade must be un-accusable of bias; subjectivity belongs in
  transparent, governed overrides.
- **Why three asset-scoring methods** (not one formula): bridged majors, IBC
  infrastructure, and native Terra assets derive value differently; one formula would
  wash out natives or overvalue volatile project coins.
- **Why market cap for bridged-in**: a treasury wants blue-chip reserves; bigger cap =
  more trusted to accumulate. (Open to challenge: cap can lag quality; that's what
  overrides + IBC/native methods address.)
- **Why native stables elevated** (SOLID): value and fees stay in Terra vs. leaking to an
  external issuer — monetary sovereignty. Must be the most transparently justified weight
  (partner-token sensitivity).
- **Why discard pre-trust history**: a grade is only as trustworthy as its worst input;
  distrusted history poisons it. Better to wait for a real fresh sample.
- **Why forward-capture before backfill**: past valuation state is largely unrecoverable
  (pruned chain, no free archive node); not capturing now = permanent gaps later.

This SPEC is a starting point, not scripture. The override layer and published rubric
exist precisely so the community can say "do it this way instead" and we can adjust.

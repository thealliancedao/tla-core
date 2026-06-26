# SPEC — Platform Doctrine (cross-cutting)

> The durable lessons that apply to EVERY cron and page — `dex-data`, `staking-data`,
> `member-data`, `flows`, and whatever comes after. The token-catalog SPEC covers that
> one cron; this covers how we build and who we build for. Read this before starting any
> new cron.
>
> These are not abstract principles — each was paid for with a real bug or a real
> insight. Where one came from a specific lesson, the lesson is named so it isn't
> re-learned the hard way.

---

## 0. Who we serve, and the one thing that matters most

People use this platform to make decisions: whether to provide liquidity, how to vote,
what a position is worth, whether something is healthy. They **trust** our numbers.

The deepest service we can provide is not more data — it is **calibrated trust**:
helping a user know *how much to trust each number and why*. A confident wrong number is
worse than an honest "these sources disagree by 9%, and here's the reason." Every
doctrine below serves that single end.

**The through-line: show the uncertainty, explain the cause, let the user judge.**
We are not an oracle handing down truth. We are an honest instrument that shows its
readings, its confidence, and its sources — and trusts the user to decide.

---

## 1. Snapshot coherence (a law, not a preference)

Any two numbers a user might compare MUST come from the same instant, or the comparison
is meaningless and we must not present it as one.

- Fetch everything that will be compared in one tight batch; stamp `captured_at`.
- This applies far beyond prices: slippage vs price, VP vs LST ratio, flows vs balances,
  reserves vs the price used to value them — all must be coherent.
- **Lesson (ampLUNA timing ghost):** an ampLUNA market-vs-redemption gap read 8% in one
  snapshot and 0.5% the next — pure timing, not a real divergence. A single
  non-coherent snapshot can manufacture a crisis that isn't there.
- Corollary: **don't alarm on a single snapshot.** Real signals persist across
  snapshots; timing noise doesn't. Where it matters, look at the series, not one point.

## 2. Robust source vs weak source (asymmetry is real)

Not all sources of the same fact are equal, and the most "official" is not always the
most robust.

- For each data type, identify the **structurally most trustworthy** source and make it
  primary; treat the others as cross-checks.
- **A weak source must never silently overwrite a robust one.** (LST: the on-chain hub
  redemption rate is robust; a thin DEX pool or an aggregator price is weak.)
- A large disagreement is a flag for *review*, not an instruction to switch to the weak
  source. Hold the robust value; surface the gap.
- **Lesson (inverted framing):** we first built the LST check backwards — treating the
  market price as truth and flagging the robust redemption price as "diverging." The
  asymmetry must be explicit and correct, or the whole signal inverts.

## 3. Surface disagreement — never resolve it silently

When sources disagree, **show all of them and the size of the gap.** Do not pick one and
hide the rest; do not "correct" a source to match the others.

- **Lesson (bLUNA on Astroport):** Astroport's API prices bLUNA at ~LUNA's price (wrong
  — ignores the redemption ratio). We report it as one source and let the spread flag
  `wide_divergence`. The user sees the disagreement and learns not to trust that one
  source for that token. This is the single most trust-building decision we make.
- This is *more* useful than a clean single number: it tells the user where the data is
  contested, which is exactly what they need to make their own call.

## 4. Validity gates against garbage-in

A formula that is correct in general will still produce confident nonsense on degenerate
inputs. Every computation needs an "is this input even valid?" gate before it runs.

- **Dust floor:** a ~$0.16-liquidity pool manufactured a $43k wBTC price. Skip pools
  below a meaningful liquidity floor (`SS_MIN_TVL_USD`).
- **Type gates:** reserve-ratio pricing is valid for XYK, invalid for stableswap (the
  amplified curve breaks it). Check the pool type before applying the method.
- **Null vs empty:** distinguish "the query failed" (retry/flag) from "the answer is
  legitimately empty." Silent coercion of a failed read to `[]` hides outages.
- General rule: ask *what inputs make this computation lie?* and gate them out
  explicitly, with the reason recorded — never silently.

## 5. The mechanism explains the anomaly

When a number looks weird, the answer is almost always in how the underlying thing
*works* — and understanding that is what lets us present it honestly instead of raising
a false alarm.

- **Lesson (arbLUNA):** arbLUNA trading below redemption is not a depeg or a bug — it's
  a strategy (arbitrage) vault whose redemption requires a 25-day wait or a 5%
  instant-exit fee. The market correctly prices that friction. Once you know the
  mechanism, the "anomaly" is expected behavior.
- **Therefore: ground every cron in the mechanism before building it.** The
  `ecosystem-knowledge/` base exists for exactly this. A new cron should start by
  reading the relevant ecosystem-knowledge file, and add to it what it learns.
- If we can't explain why a number looks the way it does, we are not ready to present
  it as fact — we present it as an open question.

## 6. Verify against real data before declaring done

Static review does not catch the bugs that matter. Run it, read the actual numbers,
and check each against an independent expectation.

- Every bug this session — inverted LST framing, dust pools, the silently-missed commit
  — was caught only by running against real data and *reading the output*, never by
  syntax check or code review.
- **Bump the version on every code change** so `meta.version` answers "did my fix
  actually deploy?" at a glance. (A fix once silently failed to commit because the
  version string was identical.)
- Validate a method against KNOWN values before trusting it on unknowns (the anchor
  pricing method was validated to 7/8 within 3% on anchor/anchor pools first).

## 7. Sourced fact vs our conclusion (intellectual honesty)

A user must always be able to tell **what a source says** from **what we concluded from
it.** We use officially sourced data; where we draw our own conclusion, we say so.

- External fact -> link the verifiable source (docs, contract code, audit). Our
  conclusion/method -> label it as ours, traceable to our own repo/spec.
- Highest-authority sources are contract code and audits, then official docs. Prefer
  them; cite the specific report/section so a user can verify independently.
- See `ecosystem-knowledge/README.md` for the fact-record schema that enforces this.

---

## 8. How these serve the user — concretely

Each doctrine maps to a thing the user can see and benefit from:

| Doctrine | What the user gets |
|---|---|
| Snapshot coherence | Comparisons (spreads, gaps, health) that are real, not timing artifacts |
| Robust vs weak source | A primary number they can trust + visibility into weaker cross-checks |
| Surface disagreement | Honesty about where data is contested — they judge, we don't hide |
| Validity gates | No confident-garbage numbers from dust pools or wrong pool math |
| Mechanism explains anomaly | "Why is this weird?" answered with sourced reasoning, not a false alarm |
| Verify on real data | Numbers that have actually been checked, not just plausibly coded |
| Sourced vs conclusion | They can verify our sources and judge our reasoning separately |

**What to build toward (forward-looking service ideas, grounded in the above):**

- **Confidence as a first-class, visible thing.** Every key number should be able to
  carry and show its confidence (sources agreeing, spread, freshness). Users deserve to
  see not just the value but how much to trust it. (Price confidence exists; extend the
  pattern.)
- **"Why does this number look like this?" answerable in-product.** The ecosystem-
  knowledge base + live bindings means a future on-site agent (or an info tooltip) can
  explain an anomaly with sourced reasoning. arbLUNA below redemption -> "strategy
  vault, exit cost, here's the source." That is calibrated trust delivered to the user.
- **Freshness honesty.** Tiles are live-primary, cron-fallback, snapshot-last-resort —
  and should *show* which one they're on. A user should never mistake stale for live.
- **Disagreement as a feature surface.** Where sources diverge persistently (not timing),
  that's signal worth showing deliberately — e.g. "the DEX pool prices arbLUNA at
  redemption while TLA reads ~9% low" is actionable intelligence, not noise to hide.
- **Source-death honesty.** When a source we cited disappears, the fact goes to `broken`
  and we show "needs re-verification" rather than repeating a fact whose basis vanished.

---

## 9. Pre-flight checklist for any NEW cron

Before building `dex-data` (or any future cron), confirm:

1. **Mechanism read.** Have I read the relevant `ecosystem-knowledge/` file(s) so I
   understand how the underlying thing works? (If the file is thin, deepen it first.)
2. **Boundary set.** What is this cron's ONE domain? What does it own vs read from
   another cron? (Snapshot-coherence decides the boundary: timing-critical numbers stay
   with what they must be coherent with; slow analytics decouple.)
3. **No duplicate fetch.** Am I re-fetching something another cron already owns? If so,
   read theirs or move the ownership — don't duplicate (the disease the migration cures).
4. **Robust source identified** per data type, with weak sources as cross-checks only.
5. **Validity gates listed** — what inputs would make my computations lie, and how do I
   gate them out (with the reason recorded)?
6. **Coherence plan** — what must be captured in the same instant as what?
7. **Confidence/provenance carried** — does my output let a consumer show how trustworthy
   each number is and where it came from?
8. **Self-contained** — does it query the chain/sources itself, not read a legacy cron's
   output (which keeps the old system alive)?
9. **Parallel-run plan** — how will I verify it matches/beats what it replaces on real
   data before anything retires?
10. **Version-stamped** so deployment is verifiable.

---

## 10. The dex-data boundary (decided here, for when we build it)

From this session's reasoning, recorded so it isn't re-litigated:

- **Timing-critical -> stays in the price snapshot (token-catalog emits it):** pool
  reserves, % USD per side, pool balance, and anything (like simulated slippage)
  computed from reserves that must be coherent with the price. token-catalog should
  EMIT the reserves it already reads, so dex-data reads them rather than re-fetching.
- **Not timing-critical -> dex-data owns, own cadence:** 24h volume, DEX fees (near-
  static), slippage time-series (its own sampling), pool depth trends, and bot/behavior
  flags (wallet-behavior clustering over history — possibly its own sub-system, closer
  to member-data/flows than pool mechanics).
- **Pool-type awareness:** dex-data is the right place to act on what token-catalog only
  documents — e.g. down-weighting a PCL-derived price that can lag spot (PCL tracks an
  EMA oracle; see `astroport.md`). Pool-type-aware confidence is dex-data's job.
- **No duplicate DEX fetch:** the raw pool fetch happens once. Decide ownership before
  coding (lean: token-catalog emits reserves at price-time; dex-data builds analytics on
  them).

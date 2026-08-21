# Phoenix Directive

> Fact source-of-truth: `phoenix-directive.facts.json` (schema in `README.md`).
> **Founding document:** https://medium.com/@PhoenixDirective/the-phoenix-directive-81abeddab404
> (Phoenix Foundation, 2024-06-29) · **Forum canonical:** https://commonwealth.im/terra/discussion/23826-the-phoenix-directive
> · **X:** https://x.com/phoenix_dir · **Verified:** 2026-08-21 (founding doc full text)

The Phoenix Directive (PD) is the community-led initiative that took over Terra
chain stewardship after TFL's 2024 disbandment. It is not a single entity but a
BORG-structured network (MetaLeX framework): **Terra Governance** (ultimate
veto) → **Think Tank** (ideas + veto on >$50k spends) → **Task Forces**
(execution) → **Stewardship Team** (admin; the "Phoenix Foundation" BORG —
founding members 0xPhilipp, MBaejir, Evan_Phoen1x) → **Phoenix Treasury**.

## Where PD's money comes from `[pd.treasury.funding]`
The treasury is funded by a smart contract that **mints a virtual token staked
via the Alliance module** — initial Reward Weight **10%** — and periodically
claims the staking rewards into the treasury. In plain terms: PD's budget is
redirected chain staking emissions, continuously, with a governance
kill-switch (delist the virtual asset = funding stops, no clawbacks needed).
Spending controls: **>$50k → 3-day lockup + Think Tank veto; >$150k → 10-day
lockup + Terra Governance veto**.

## PD and the gauge war `[pd.liquidity_wars.cap]`
The founding document explicitly authorizes PD to join the Alliance Liquidity
Wars "to have a strategic impact in liquidity recommendations (**max 20% of
total voting power**)". Two things follow for our reporting:
1. That 20% is PD's **own chartered ceiling** — a measurable yardstick, not
   our editorial line.
2. The cap as written speaks to *voting power participation*. PD's observed
   influence has two channels we must keep distinct: (a) **direct VP** it
   holds/votes, and (b) **bribe-steered VP** — placements that Votion's
   optimizer follows. The PD pages report both, with shown arithmetic, and
   quote the charter line verbatim; readers draw conclusions.

Our record (pd-bribes stream, chain-verified): 21 placements, 469,175.27 LUNA
all-time; placements arrive in multi-epoch batches (e.g. prop 250: eleven
add_bribe legs, 38,155.10 LUNA gross).

## What the founding doc does NOT establish (open sourcing needs)
- The **placement criteria** ("based off volume and liquidity / trade
  efficiency") attributed to PD — stated in community discussion but not in
  this document. Need: the PD post/announcement where criteria are stated.
  Until sourced, our pages phrase it as "PD's stated criteria (source
  pending)". `[pd.placement_criteria — unverified:]`
- The **treasury contract address** on phoenix-1 (for direct chain
  verification of claims/DCA flows).
- Later structural updates (Think Tank membership changes since 2024).

## Mandate lines relevant to TLA Stats (verbatim topics from the doc)
Task-force community-building objectives include: "Incentivizing liquidity,
the deployment of liquidity, and suggesting liquidity needs" — this is the
charter basis for the bribe program our pd-bribes stream tracks. PD also
maintains the Alliance module, the Alliance dashboard
(https://dashboard.alliance.money/?selected=phoenix-1), and backed the Terra
Liquidity Alliance proposal itself
(https://commonwealth.im/terra/discussion/20123-terra-liquidity-alliance) —
i.e. **PD is simultaneously the steward of the Alliance rails and the largest
briber on them**. Factual, sourced, and exactly why the drift/concentration
page reports it with numbers rather than adjectives.

## PD publication catalog (all 8, verified 2026-08-21)
1. **The Phoenix Directive** (2024-06-29) — founding doc, extracted above.
   https://medium.com/@PhoenixDirective/the-phoenix-directive-81abeddab404
2. **Terra Retrospective** (2025-02-15) — https://medium.com/@PhoenixDirective/phoenix-foundation-terra-retrospective-8c7ff560903c
3. **Strategy & Roadmap** (2025-02-25) — https://medium.com/@PhoenixDirective/phoenix-foundation-strategy-roadmap-aaace03be12b *(unread — candidate for placement criteria)*
4. **Treasury Report to 2025-02-15** (2025-03-23) — https://medium.com/@PhoenixDirective/phoenix-foundationtreasury-report-8a9aff053f54 *(unread — candidate for treasury contract address)*
5. **Grants for Developers** (2025-09-05) — https://medium.com/@PhoenixDirective/grants-for-developers-building-on-terra-phoenix-8c368961d0ec
6. **Terra — Year in Review 2025–2026** (2026-03-06) — https://medium.com/@PhoenixDirective/terra-year-in-review-2025-2026-065f879f2edd
7. **Phoenix Treasury Report — Q1 2026** (2026-03-13) — https://medium.com/@PhoenixDirective/phoenix-treasury-report-q1-2026-b287d64a38c8 *(unread — candidate for contract address + bribe accounting)*
8. **Structured Liquidity in Practice** (2026-04-14) — https://medium.com/@PhoenixDirective/the-terra-ecosystem-structured-liquidity-in-practice-51cb28b978b3 — extracted below.

## From "Structured Liquidity in Practice" (2026-04, PD's system doctrine) `[pd.system_doctrine]`
- **PD's stated allocation philosophy** (closest published statement to
  placement criteria): TLA "redirects staking emissions into targeted
  liquidity incentives… liquidity is continuously positioned where it is most
  effective" for "trading, borrowing, and ecosystem growth". Flow stated as
  **Staking emissions → Incentives → Liquidity → Market activity**. The
  granular volume/liquidity formula remains unpublished — drift-page wording
  stays "stated criteria (formula unpublished)" citing this article.
- **Take-rate claim `[pd.take_rate_pol]`:** "The Take Rate ensures that
  permanent chain owned liquidity grows each day" — PD asserts TLA take-rate
  flows build **chain-owned liquidity (POL)**. This is the sourced answer to
  "where do fees recycle": not into bribes, into POL (per PD). On-chain
  verification of the take-rate destination is an open probe.
- **Votion mechanism in PD's words `[votion.mechanism.pd_description]`:**
  "vote aggregation infrastructure… provides continual LUNA buy pressure —
  auto-compounding bribes into users' LUNA lock positions." (Feeds the thin
  votion chapter; matches our observed reflexivity finding.)
- **Layer map** (visitor-grade framing for our docs): Coordination = TLA +
  Votion · Capital efficiency = Eris, Creda, Solid · Execution = Astroport ·
  Expansion = Boost DAO (Ignite), Streamweave, BackBone Labs · Access =
  Keplr, Chainscope, SmartStake. Note: PD spells it "Creda"; our chapter uses
  "Credia" per docs.creda.finance — reconcile naming once their docs are
  re-checked. **Streamweave** (payments) is new to our knowledge base — no
  chapter exists; low priority unless it touches TLA flows.

## PD GitHub organization (verified 2026-08-21) `[pd.github_org]`
**Org:** https://github.com/phoenix-directive ("Phoenix Foundation") — 11 public
repos, confirming the founding-doc stewardship mandate in code. Captured for
future deep reads (all pullable via codeload tarballs from our build env):

| Repo | What it is | Why we care |
|---|---|---|
| [core](https://github.com/phoenix-directive/core) | Terra protocol Go implementation (active, Jun 2026) | PD maintains chain core — mandate in practice |
| [alliance](https://github.com/phoenix-directive/alliance) | **the x/alliance module** | PRIMARY SOURCE for TLA mechanics primer: reward weight, take rate, delegation math |
| [alliance-nft-collection](https://github.com/phoenix-directive/alliance-nft-collection) | "reward participants for the Game Of Alliance" | **the aDAO NFT collection's own source** — primary source for the backing/break/mint lifecycle chapter |
| [enterprise-contracts](https://github.com/phoenix-directive/enterprise-contracts) | Enterprise DAO contracts | where 403 aDAO NFTs are staked — staking mechanics source |
| [daodao-secondary-gui](https://github.com/phoenix-directive/daodao-secondary-gui) | DAODAO secondary GUI (active, Mar 2026) | the other staking venue's PD-maintained frontend |
| [cosmos-sdk](https://github.com/phoenix-directive/cosmos-sdk) | SDK fork | chain maintenance |
| [legacy-docs](https://github.com/phoenix-directive/legacy-docs) / [docs](https://github.com/phoenix-directive/docs) | Terra docs | reference |
| faucet · cw3-fixed-multisig-dapp · pd-frontend-placeholder | minor | — |

## Take rate — TWO mechanisms, one name (sourced 2026-08-21) `[alliance.take_rate.definition]`
The x/alliance module README defines Take Rate as "the percentage of staked
Alliance assets the chain redistributes to **native chain stakers**"
(https://github.com/phoenix-directive/alliance — same text upstream at
terra-money/alliance). PD's Structured-Liquidity article says "The Take Rate
ensures that permanent chain owned liquidity grows each day." These describe
**different layers**: (a) the module-level take on staked Alliance assets →
native stakers, and (b) the hub-level take on TLA ampLPs (the Eris
yearly_take_rate our platform already prices) — which is the plausible
POL-builder PD means. OPEN PROBE: confirm on-chain where each flow lands;
until then our docs name both explicitly and never say "the take rate"
unqualified. Official module docs: https://docs.alliance.terra.money/

## Alliance module audit (CAPTURED) `[alliance.audit]`
**alliance-audit-v1.0.pdf** — 3,232,072 bytes, verified live 2026-08-21 at
BOTH: upstream https://github.com/terra-money/alliance/blob/main/audit/alliance-audit-v1.0.pdf
and the PD fork https://github.com/phoenix-directive/alliance/blob/master/audit/alliance-audit-v1.0.pdf
(byte-identical size). First of the audit set secured; aDAO NFT audit already
linked (SCV); Solid audit still owner-sourced.

## Treasury contract — SOURCED (2026-08-21) `[pd.treasury.contract_source]`
The Phoenix Treasury contract was **built by Eris Protocol**: contract
`phoenix-treasury` in https://github.com/erisprotocol/contracts-ve3 — the same
repo as the ve3 gauge system. Audited by SCV (see AUDITS.md): commits
`911ec9f22a793c5cee653f2011cf8eadee1c3f40` and revision
`2c397031fde53f29e3abbcec250c731311c6e6a1`. Audit scope confirms the founding
doc implemented: virtual-token Alliance staking, DCA + OTC, milestone/vesting
payments, veto + spending-limit enforcement, on-chain oracles. Structural
fact this establishes: **Eris built the gauge system, the TLA hub, AND PD's
treasury** — the coordination layer's code has one primary author. Factual,
sourced; our pages report it as such. DEPLOYED ADDRESS — FOUND (2026-08-21, chain truth via gov prop #4822):
`terra16st8yfprkdl06kccktshd3p2vccq93xcn9mkhjl8s4jumyjtd4kqye0me5` — the PD
virtual token is `factory/<that address>/vt`, listed by "Launching the
Phoenix Directive Treasury" (passed 2024-10-07) at **reward weight 0.14
fixed** (founding doc said "initially 10%" — doc-vs-chain divergence
recorded; chain wins), module take_rate 0. Probe closed.

## The PoL program in full (forum thread, verified 2026-08-21) `[pd.pol_program]`
Source: https://forum.phoenix.money/t/executed-revenue-generating-pol-deployment-a-flywheel-for-terra-s-long-term-success/10
(0xPhilipp, 2025-10-07; executed per 2025-12-11 update; first burn calc
2026-02-25). Chain leg = prop #4844 (30M LUNA @ ~$0.073 — the forum draft said
28.5M @ $0.14; LUNA fell between draft and posting, both figures recorded).

**Custody — 3-of-5 multisig, signers self-disclosed on the official forum:**
`terra1kzkrm2a8qquer9dgztg4a3fvhh8d7fudsd7ualae843wsv9plhksv8ea3g`
- Philipp `terra1vm5azhvaxeanc7auxh02y8jmxrk8tj93f6aywp`
- MB `terra1qu0ych3xv4455m8p3h8877yeehn2s70newxd7p`
- Andre `terra1np5em0379k8hc90chdzfsfgjgtm7xk8d0td77t`
- David `terra1j00tmfa8el568llp3y96dquc9j2fcczmccnsn0`
- Vini `terra18ruqkccl5tp493uhvra0u6jylrzq8t8dv5qs4c`
(Registry-eligible: explicit public self-disclosure with source link.)

**The POL sits inside TLA-tracked pools** — attribution matters for our
dashboards: multisig owns **100.000%** of USDC–ampLUNA PCL
`terra145dguwqp5n9r7dmlefyv4yuuua7uaysmj47qleydh67fud0p2y0q8tw7pw` and
**80.819%** of LUNA–ampLUNA PCL
`terra1cupwgntu082ypw2ztgtxfzcenexcu6ggp5zzunn3yzfwgrvdcclqgjrjqg`
(per the posted xcp_profit fee report, blocks 18695634→19836080). A large
share of "staked" in those pools is community POL, not member/mercenary
liquidity — label it.

**Fee policy live:** withdraw LP fees → convert to LUNA → reinvest if
LUNA > $1, **burn if ≤ $1**. First burn computed 2026-02-25:
**≈58,499 LUNA-equivalent** (ampLUNA 13,657 + LUNA 13,188 + USDC 1,163,
converted). Fee measurement method: Δ`xcp_profit_real` × LP share on the
concentrated pools — a PCL fee-accounting pattern we can reuse. 24-month
sunset: liquidity returns to the Community Pool ~2027 unless extended.

**Appendices = negotiated protocol commitments (all sourced to the thread):**
- **Astroport:** commits **50% of its TEAM revenue share from Terra pools as
  Astro Wars bribes**, distributed proportionally to each pool's trading
  fees (illustration given: $100 fees → $66 LPs, $33 Astroport, team ~$16.6,
  ~$8 to bribes on that pool). **This is the real fees→bribes loop** — a
  program commitment under this proposal, NOT core Astroport mechanics
  (core docs: maker fee → xASTRO stakers). Both facts now sourced.
- **Eris:** commits to opening Amp Governance beyond ≤10%-commission
  validators via a commission-scaled delegation formula, removing the >25%
  drop-off "which has incentivized some validators to create sybils"; Amp
  Governance "still managed by an old multisig" pending contract upgrade.
- **Solid:** once Solid lists LUNA–ampLUNA LP as collateral, up to $500K LP
  deposited at 20% LTV to mint up to 100,000 SOLID for OTC USDC via
  Ignite (Boost DAO). (Feeds solid-protocol chapter.)

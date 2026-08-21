# The Depeg and the Rebirth — Terra Classic, May 2022, and phoenix-1

> Grounding reference: why today's Terra has no native algorithmic stablecoin,
> why SOLID is designed the way it is, and why TLA yields come from staking
> emissions instead of subsidized deposit rates. Every claim cites a source;
> this chapter is history + mechanism, not blame. **Verified 2026-08-21.**

## The old system (Terra Classic, pre-May-2022)

Original Terra ran an **algorithmic stablecoin**: UST held its dollar target
through a mint/burn arbitrage with LUNA — burn $1 of LUNA to mint 1 UST, burn
1 UST to mint $1 of LUNA. The peg was confidence-backed, not asset-backed:
when UST traded below $1, arbitrageurs were expected to burn UST for LUNA and
profit, shrinking UST supply back to peg. Demand for UST was driven
overwhelmingly by **Anchor Protocol's ~19.5% deposit rate** — an
artificially maintained yield rather than market-cleared interest; at the
peak Anchor held roughly $14B of UST against a ~$30B ecosystem TVL
(sources: [smartoptions lessons analysis](https://smartoptions.io/analysis-5-key-lessons-to-be-learnt-from-the-terra-ust-debacle/),
[LedgerMind retrospective](https://theledgermind.com/terra-luna-crash-analysis/)).

## The run (May 7–13, 2022)

Per **Nansen's on-chain forensics** (Terra + Ethereum data, May 7–11 window):
a small set of well-funded wallets (seven identified) recognized the
**shallow liquidity of the Curve pools** securing UST's peg, withdrew large
UST from Anchor, bridged via Wormhole to Ethereum, and swapped size into
Curve — then arbitraged CEX/DEX price gaps as the peg slipped. Nansen
**explicitly refuted the single-attacker narrative**: the depeg is consistent
with several entities' risk-management exits, not one "hacker"
([Nansen findings summarized](https://cointelegraph.com/news/two-key-takeaways-from-nansen-s-ust-stablecoin-depeg-report),
[report coverage](https://www.altcoinbuzz.io/spotlight/nansen-report-showing-the-on-chain-events-of-the-terrausd-de-peg/)).

Once UST broke, the peg mechanism became the amplifier: redeeming depegged
UST minted LUNA, hyperinflating supply while price collapsed ($62 → cents in
days); LFG deployed its BTC reserves in defense without restoring the peg.
The academic treatment is **NBER working paper w31160, "Anatomy of a Run:
The Terra Luna Crash"** (Liu et al., built on full-chain data with
Nansen/Flipside — also compares the May-2021 near-depeg TFL survived):
https://www.nber.org/system/files/working_papers/w31160/w31160.pdf
Roughly $40B of value was destroyed across UST and LUNA.

## The rebirth: proposal 1623 → phoenix-1

- **May 18, 2022** — prop 1623 proposed: rename the existing chain **Terra
  Classic** (LUNC/USTC keep running to this day) and launch a **new** chain
  ([Fortune](https://fortune.com/2022/05/18/terra-stablecoin-do-kwon-official-vote-fork-ust-new-blockchain/)).
- Terra clarified it was **"not a fork but a genesis chain"** — phoenix-1
  shares no history with Classic
  ([contemporaneous coverage](https://watcher.guru/news/terra-2-0-not-a-fork-of-the-existing-chain-confusion-persists)).
- **May 25** — passed with overwhelming support
  ([CNBC](https://www.cnbc.com/2022/05/25/terra-backers-vote-to-revive-luna-cryptocurrency-abandon-ust.html)).
- **May 27, 2022** — **phoenix-1 mainnet genesis**: 1B LUNA allocated via
  pre-attack and post-attack snapshots with cliff/vesting schedules, **no
  native stablecoin** — the chain this platform tracks. Canonical genesis
  details: https://docs.terra.money/learn/protocol/

## Why today's design is different (the load-bearing part)

1. **No algorithmic stable.** phoenix-1 launched without one, deliberately.
2. **SOLID is a different animal** `[solid.vs_ust]`: a **collateralized CDP
   stablecoin** — users deposit supported collateral and mint $SOLID against
   it, overcollateralized, with liquidations enforcing solvency
   (Collateral → Mint → Deploy; source: PD's
   [Structured Liquidity article](https://medium.com/@PhoenixDirective/the-terra-ecosystem-structured-liquidity-in-practice-51cb28b978b3)
   + solid-protocol.facts.json). UST's peg leaned on reflexive confidence in
   its own sister asset; SOLID's leans on seizable collateral exceeding debt.
   **Honesty note:** collateralized ≠ riskless — collateral crashes, oracle
   faults, and liquidation cascades are the CDP failure modes; the design
   removes the death-spiral coupling, not risk itself. (Audit status: no SCV
   or Oak report found for Solid as of 2026-08-21 — see AUDITS.md.)
3. **Yield provenance.** Anchor's 19.5% was a subsidized rate that
   manufactured stablecoin demand. TLA APRs are **redirected staking
   emissions plus bribes, measured and market-cleared weekly** through gauge
   votes — when capital floods a pool, its APR compresses (our matrices show
   exactly this); nothing promises a fixed rate. The difference between a
   posted rate and a cleared rate is, in one sentence, the difference between
   Anchor and TLA.
4. **The history is why this site exists as it does**: measured facts,
   verifiable sources, blanks over estimates. A community that lived through
   confidence-backed numbers now runs on chain-backed ones.

## Archived original Agora (registered 2026-08-21)
The original Agora research forum survives read-only at
**https://classic-agora.terra.money** ("Terra Research Forum") — the full
2021–2022 governance discussion record, including the revival-plan era.
Key artifact for this chapter (queued read):
https://classic-agora.terra.money/t/terra-2-0-is-live-luna-airdrop-calculation-logic-details-inside/40742
— the airdrop calculation logic post, primary source for the genesis
distribution mechanics summarized above. Channel-transition notice:
https://classic-agora.terra.money/t/transition-of-terra-classic-community-channels-to-read-only/52070
Category map (from owner HAR #2, homepage capture): general/53,
**governance/13** (revival-plan-era governance record — mining target),
support/54, developer/20, dapps/15, oracle-and-swaps/11,
validation-and-staking/12, **stability/16** (pre-collapse UST peg-stability
discourse — primary material on contemporaneous risk awareness), chain/17,
markets-and-macro/18. Deep reads queued for the intake pass; browse base
`https://classic-agora.terra.money/c/<name>/<id>`.

## Source shelf (for the corpus)
- Nansen on-chain report (coverage links above; canonical summary quoted in
  both) · NBER w31160 · docs.terra.money/learn/protocol (genesis) ·
  prop-1623 timeline links above · Anchor Liquidation Queue audit
  (Oak Security, 2021 — historical artifact, see AUDITS.md) · Terra LBP
  audit (Oak, 2021 — historical).

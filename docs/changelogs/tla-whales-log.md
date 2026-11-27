# TLA Whales Changelog

## tla-whales.html 1.2.0 · reader tla-whales 1.2.0 — 2026-11-27 — what each account did lately, how often it acts, its value over a year; a daily read
- **The owner:** "shows if they are building liquidity and or selling the rewards … if they are bot" and, tonight, "just want to
  get the whale page done with and working — if you feel good about it let's just do it."
- **All from the public flow record** (`tla-flows/pnl/ledger/<account>.json`) — no archive, no private data:
  - **Last 12 rounds** per account: claims and what they were worth on the day, deposits, withdrawals. The all-pools list can be
    ordered by it, and says the sum.
  - **"N moves a week"** — a tag on any account whose deposits, withdrawals and claims come to seven or more a week over the last
    8 rounds. It is a count; the page says activity that regular is usually automated and does not say who or what runs it.
  - **Value, past year** — the record's value of the account's Alliance positions at each round. **Drawn only where the record's
    present figure is within 10% of what the chain says the account holds now** (and the account holds $25 or more). Where the
    two differ the page gives both figures and draws nothing.
- **What is deliberately not shown:** what happens to LUNA after a claim (kept, swapped, bridged, sent to an exchange). The
  public record does not hold it. The first look at the stored wallet history (below) showed its dollar flows are not good
  enough to put beside an account yet, so the page says "not here" instead of guessing.
- **First read (17:59 UTC):** 376 of 384 accounts carry the last 12 rounds; 107 claimed in that time, $71,656 in all, 15 of them
  with no deposit; **19 accounts act seven or more times a week and hold 45.9% of the staked value** (the busiest: 127 moves a
  week); a value line is drawn for 145 accounts and withheld for 16 where the record and the chain disagree.
- **The read now runs once a day by itself** (05:17 UTC; public nodes only; delete the two `schedule` lines in
  `tla-whales.yml` to stop it), besides by hand and on a change of its script.
- **Tested:** `gate-tla-whales.mjs` 96/96 on the real read (the reader's 10% rule re-checked against the chain figures for every
  account; an older read without the new fields still draws); eight planted faults caught. Reader mock 38/38, four planted
  faults caught. Rendered at 1760 and 390 wide: no sideways scroll, no text under 13px.

## 2026-11-27 — behaviour summary 0.1.1: a first look at value in and out, by group (counts only, no node) — NOT for quoting
- **The owner:** "shows if they are building liquidity and or selling the rewards … lets get that process started."
- **No node run was needed.** 372 of the 384 accounts on the list already have a stored wallet history (the deep-walk derive of
  26 Nov, 2022-05-30 → 2026-11-23); the 12 without are 5 small accounts and 7 contracts.
- **`.github/scripts/tla-whales/behaviour-summary.mjs`** + workflow *"Public · TLA whales — value in and out, by group (stored
  history, no node)"* (by hand only; reads files from the private archive repo; refuses to run if a node address is set). It
  writes `tla-whales/behaviour-summary.json`: per group of accounts (all · by size · by how held · voters · bribers) and window
  (all time · 52 weeks · 12 weeks), value crossing the wallet boundary by kind, beside the Alliance rewards claimed. **Sums and
  counts only — no account is named; a group under 5 is withheld; the file is refused if an address would appear.**
- **What the first run showed about the data itself — why nothing is on the page yet:**
  1. the stored history names **no exchange address**, so a transfer to an exchange sits under "another plain wallet";
  2. **one token carries most of the recent bridge inflow** (xASTRO: $6.78M of the $7.5M in the last 12 weeks, against $0.77M
     staked by the whole group) — the same token the derive already holds "under review"; a price that is wrong, not a fact
     about the accounts. "Unlisted token" is a further $5.6M all-time.
  The file carries `status: first look — NOT checked` and lists what it found wrong with itself.
- Mock `mock-behaviour.mjs` 17/17 (windows cut to the week, small groups withheld, an address refused; five planted faults caught).
- **Next, before anything per account:** fix the price of xASTRO and the unlisted tokens in the stored history, name the
  exchange addresses, then decide what is shown per account.

## 2026-11-27 — on the TLA tab bar
- The owner asked for the tab. Whales is the eighth tab of the TLA bar (lib/site-header.js 1.15.0) and is lit on this page. The
  tile on Tools stays.

## tla-whales.html 1.1.0 · reader tla-whales 1.1.3 — 2026-11-27 — full width; direct against amplified; votes and bribes beside the liquidity
- **The owner:** "massive amount of blank spots here and left and right and can we do better with layout. Also would it be worth
  while to show whales in TLA voting power as well and or have some way of showing those who vote and bribe the pools they
  deposit into? Also can we show these whales' LPs in different colours if they are amplified vs non-amplified, and a way to
  filter for this so you can see the whale list for those who would collect the LUNA and those who amplify and build liquidity?"
- **Layout:** the page is as wide as the screen (it was held to a centre column). A row is one line of ten columns on a wide
  screen and folds to labelled cells on a narrow one. The pool card carries two boxes side by side — the pool by holder and how
  it is held (with its five largest direct stakers and five largest amplified holders), and its votes and bribes.
- **Directly, or amplified:** one colour each across the page (cyan = staked directly: the rewards are paid out as LUNA, to
  claim · violet = amplified, through the pool's amp token: the rewards are compounded back into the pool). Every row carries a
  strip in its colour and a tag in words; position chips take the same colours. Three buttons — All · Staked directly ·
  Amplified — cut either list to one kind and re-rank it by that part (`?held=direct|amp`). A bar per pool, and one for all
  pools, draws the two parts.
- **Votes and bribes:** beside each account its voting power, the votes it gives the pool it holds, and the bribes it placed on
  that pool. Each pool shows the votes on it and the bribes placed on it, the part of each that comes from accounts holding it,
  and its largest voters and bribers, each marked "holds it" or not. The all-pools list can be ordered by voting power or by
  bribes placed, and says how many holders vote and bribe and what they hold.
- **A third view, "Voting power"** (`?view=vote`): every voter by voting power — also those holding no liquidity — where each
  points its votes (a pool it also holds is marked), the liquidity it holds, the share of its votes on pools it holds, and its
  bribes.
- **Where the new figures come from (reader 1.1.0 → 1.1.3):** voting power and votes from the hourly lock-holder record
  (`member-data/participants`), else the weekly voting rollup; bribes from the rollup's briber ledger
  (`tla-voting/events/rollups.json`), in dollars on the day placed. A pool's votes = Σ voting power × the share each voter gives
  it (a voter splits its full power in each bucket).
- **Found while looking at the first render — fixed before it shipped:** a bribe in a token the ledger has no price for counted
  as **$0** and nothing said so (one pool showed "21 bribes · $0.00"). Twenty-seven pools have such bribes; across the ledger
  the unpriced amounts are large (millions of CAPA, bWHALE and ampWHALE). The reader now carries those tokens beside every
  dollar figure (`np`, `unpriced`, `brb_np`), the page names them wherever they apply, reads "no price" instead of $0, and says
  that the dollar sums and the share from holders leave them out.
- **What the page does not say:** that an account votes for or bribes a pool it holds is given as a figure, with no judgement —
  that is what the system is built for. Nobody is named beyond a registered name, a verified label, or the name the public
  bribe record gives a briber.
- **First read with the new fields (16:39 UTC, 27 Nov; $890,649 staked):** 63.7% staked directly (125 accounts), 35.1% amplified
  (203 accounts). 107 of the 384 holders have voting power — they hold 16.4% of the staked value and 19.5% of all voting power;
  14 holders have placed bribes — they hold 44.1% of the staked value. Voting power: 36.81M in 210 accounts; the largest holds
  27.9%, the top five 64.5%, the top ten 76.3%; three of the ten largest voters hold staked liquidity, and two of the ten largest
  liquidity holders have voting power.
- **Under a filter the rewards sum follows the list:** with "Amplified" on, the line said the listed accounts had claimed the
  sum of *all* accounts. It now sums the accounts the filter keeps (an account holding both ways is on both lists).
- **Tested:** `gate-tla-whales.mjs` 83/83 on the real read (figures recounted from the file; a pool's votes worked again from
  each voter's own split); eleven planted faults all caught (colours swapped, a filter ranking by the wrong part, "holds it" on
  everyone, the wrong figure in a cell, a missing-data crash …). Reader mock run 34/34. Rendered at 1760 and 390 wide: no
  sideways scroll, no text under 13px.

## tla-whales.html 1.0.0 · reader tla-whales 1.0.2 — 2026-11-27 — who holds each pool's staked liquidity
- **The owner:** "we need a TLA whale list … select an LP and it pulls up all the whales in that LP, highest to lowest … shows handle
  name and address … current position and sparkline … if they are building liquidity … how long they have held … I really want
  to get a feel for who is actually participating in TLA — is it all the teams that have most of the liquidity and take most of
  the rewards?" A community member had asked the help assistant for a pool's top depositors; it could not answer.
- **Where the list comes from (`.github/scripts/tla-whales/read.mjs`, public nodes only, run by hand):**
  - *direct stakers* — the staking contracts cannot list everyone, so the accounts asked are those the public flow record
    (`tla-flows/pnl`) shows with stake left; each is asked on the chain. Checked before building: on 198 positions the record's
    figure equalled the chain's in 198.
  - *amp-token holders* — the chain lists every holder of a pool's amp token. A holder's share is its part of the tokens
    outstanding × what the compounder has staked in the pool.
  - *the check* — per pool the staking contract's total = the compounder's stake + the direct stakers. What is not explained is
    published as `not_attributed`, never spread over the others.
- **First reads (27 Nov, 14:09 → 14:23 UTC):** 75 pools · 69 amp tokens · 507 stakers asked, none unread · 591 requests. Of the 25
  pools with more than $1,000 staked, 24 are explained to between 99.5% and 100%; the other (vcausdci) to 83.9% — the compounder
  holds 16.1% of it and lists no amp token for it.
- **Three things the first read changed (1.0.1, 1.0.2):** on some pools the amp tokens × the compounder's *stated* rate come to
  more than it has staked (up to 113.8%), so shares are taken from the stake and both figures are published (`amp_check`); a
  catalog label loses a trailing first name in brackets — an organisation is named, a person is not; claims belong to an
  account, not a pool (the record ties only some claims to a pool), so per-pool claim counts were removed and each listed
  account's deposits, withdrawals and claims are published once under `accounts`.
- **The page (Tools → TLA Whales; the TLA tab bar is shown, no tab lit):**
  - *By pool* — a rail of every pool; for the picked pool: staked, accounts, largest, top 5, top 10, the auto-compounding part; a
    bar of the pool by holder; then every account, largest first: name or label where one is registered or verified, share
    (direct and amp drawn apart), value, in since, deposits and withdrawals, the last eight rounds in a word, a line of its
    changes. Opened: the full address, how it is held, what the record holds for the account across the Alliance, and the
    other pools it is in — each a button to that pool with the account opened.
  - *Largest accounts, all pools* — accounts ranked by staked value or by rewards claimed; top 1 / 5 / 10 / 25; and a split by
    what the chain says only: verified label · registered name · no name · not attributed. It states that "no name" means
    neither "community" nor "team".
  - A pool not read to the end, a part not attributed, and a stated rate that disagrees with the stake each get a plain note.
    If the list cannot be read, nothing is shown.
- **Gates:** reader mock run 24/24 (nine planted faults caught) · `gate-tla-whales.mjs` 48/48 on the real read (thirteen planted
  faults caught) · header and TLA nav gates unchanged (42/42). Rendered at 1760 and phone width: no sideways scroll, no text
  under 13px.
- **Not in this version:** what an account does with its rewards after claiming (compounds, sells, leaves Terra) and
  week-by-week value — both need the full transaction history. The list is refreshed by hand, not on a timer.

# TLA Whales Changelog

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

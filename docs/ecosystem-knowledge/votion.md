# Votion

> Fact source-of-truth: `votion.facts.json` (schema in `README.md`).
> **Docs:** https://github.com/erisprotocol/votion-docs (read in full,
> 2026-08-21 — user-facing pages only) · **Verified:** 2026-08-21.

Votion is the TLA gauge war's **vote-aggregation and optimization layer**.
Two faces, two sources:

## 1. The advisor (votion-docs, sourced)
The official docs describe an optimizer that "gathers reward information
from the pools", "estimates expected USD rewards for different vote
distributions", and "suggests vote allocations that can increase the USD
value of your rewards". It supports **both Liquidity Alliance and Hydro
pools** — Votion is multi-ecosystem, not TLA-only. `[votion.scope]`
**The docs repo lives under the erisprotocol GitHub org** — extending the
pattern that Eris built the gauge system, the TLA hub, PD's treasury, and
(at minimum) hosts Votion's docs. `[votion.eris_link]`

## 2. The vaults (PD description + our chain captures)
PD's Structured-Liquidity article: Votion "provides continual LUNA buy
pressure — auto-compounding 'bribes' into users' LUNA lock positions."
Our votion cron measures the vault VP directly (varbLUNA vault the largest
single Votion position). This is the channel that makes bribes reflexive:
bribe → Votion votes follow → payouts compound into locks → more VP.

## 3. What its history shows (our back-test, 2026-09-27) `[votion.move_rule]`
Votion publishes its optimizer's worksheet per vault and bucket (our capture: `votion/optimization/current.json`, every ~15 min). Its
own words in each diff are "Worth changing: X% deviation, gain $Y" / "Keep current: only X% deviation, would gain $Y". Fitted over
1,399 captures (periods 196–204, 27,196 vault × bucket observations, 27,196 matches): **a vault re-votes a bucket only when the
re-solve gains more than $0.05 AND its split differs by more than 5%**. At the 9 casts, the arbLUNA vault moved 20 of 20 flagged
buckets, the ampLUNA vault 17 of 25; no bucket ever moved without the flag. Casts land ~2.6 h before the Sunday 23:59 UTC deadline
(≈ 21:20 UTC; p201 at 23:20; p204 early on 2026-09-23). Its reward model is the one it shows: expected reward = bribe × your votes ÷
(gauge votes + your votes), maximized across gauges with the vault's VP as the budget. Product: `votion/backtest/move-rule.json`
(re-run `backtest-move-rule.py` to refresh). The site's Vote Market applies this rule to every simulation.

## What is NOT published (honesty boundary) `[votion.optimizer_unpublished]`
The allocation **algorithm**, re-optimization **cadence**, and **fee
schedule** are not in the docs — the move rule and timing in §3 are FITTED from its published worksheets, not stated by Votion. Anything our pages say about how Votion
responds to a bribe is a **model with visible assumptions** (see
SPEC-lp-grades-rework Bribe Planner v2) — never stated as Votion's actual
logic. Audit status: none found (SCV + Oak checked 2026-08-21).

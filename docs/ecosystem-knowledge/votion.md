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

## What is NOT published (honesty boundary) `[votion.optimizer_unpublished]`
The allocation **algorithm**, re-optimization **cadence**, and **fee
schedule** are not in the docs. Anything our pages say about how Votion
responds to a bribe is a **model with visible assumptions** (see
SPEC-lp-grades-rework Bribe Planner v2) — never stated as Votion's actual
logic. Audit status: none found (SCV + Oak checked 2026-08-21).

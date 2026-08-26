# SPEC — "New Here? → TLA" (the LUNA holder's decision page)

Status: **BUILT & GATED 2026-08-26 — data layer (org-votion 1.4.0 Branch D) +
page (new-here-tla.html 1.0, gate 27/27) — first live look pending yields deploy** · Origin: community question → owner brief 2026-08-26 · Consumers:
`new-here-tla.html` (new), help-agent corpus.

## 1. The page in one line
"I have X LUNA — what are my options, what does each pay, what does each cost
me?" One input (LUNA, default 10,000), one horizon toggle (weekly / monthly /
yearly; monthly default), three routes side by side, every number live.

## 2. Routes (columns) — each cell: live number + "how?" popup + tla-docs link
| | Native staking | TLA lock | Votion |
|---|---|---|---|
| Hold | LUNA delegated | ampLUNA / arbLUNA / bLUNA, locked 1w–2y | LST inside a Votion vault, its own lock |
| Yield | native APR (est.), claim vs compound | LST APY (hub ratio compounding) | LST APY + Votion APY (additive — Eris UI) |
| Governance | chain governance voice | TLA VP: direct rewards to your LPs, or farm bribes | no TLA voice |
| Cost | 21-day unbond | hub unbond 21d or market swap w/ slippage; lock 1w–2y | lock; no secondary market |
| Exit early | no | sell the lock on Atrium/Boost at a discount | no |
| Catch | validator choice is yours | Eris picks validators; VP decays unless topped up | — |

Worked examples, all live: (a) native: X × APR → claimable per horizon, and
compounded; (b) TLA: X max-locked → VP (fixed×10 convention, reconciled vs
Eris) → drop into a pool with $B bribes and V votes → share = a/(V+a) × B weekly
(the Vote Market optimizer math, reused); (c) lock resale: underlying × LUNA
price × (1 − discount), discount defaults to an observed Atrium/Boost value,
draggable; (d) VP decay: VP today vs in 6 months untouched; (e) Votion: X → LST
→ vault APY + asset APY per horizon, and the mechanism popup (compounding of
the vault's exchange_rate; where the boost comes from).

Both audiences: numbers move as the input moves (visual); every cell's "how?"
opens the paragraph + link (readers). No wall of text on the page itself.

## 3. Data layer — `votion/yields/current.json` (+ `daily/`) — BUILT
org-votion Branch D, hourly. Per Votion vault (6) and per LST (ampLUNA,
arbLUNA, bLUNA): windows 7/14/30 days, each with `apr_daily_contract` (the
contract's own `exchange_rates(limit)` `apr`), `apr_daily_measured` (endpoints
of the same series), `apy_*` = (1+apr)^365.25 − 1 (Eris's formula, verbatim),
`agree` (within 0.5 pp). Vault `headline[w] = asset_apy + votion_apy`
(additive, matches the Eris UI: 16.57 + 74.93 = 91.50 on 2026-08-26).
Sources labeled per asset: `hub_exchange_rates` → `ratio_series` →
`ratio_series_stale` (staleness in days). `native_staking` PRIMARY is chain-derived every hour (owner's source hunt
2026-08-26): `apr_gross` = annual_provisions ÷ bonded_tokens (what validator
sites quote — Allnodes 37.78%); `apr_stakers` = gross × (1 − community_tax) ÷
total_reward_weight (Σ active alliance weights + 1, eris-apr's filter) = what a
LUNA staker receives before validator commission (27.0% — SmartStake's 27.6%);
inputs published (provisions, bonded, tax, weights, active alliances);
CROSS-CHECK `apr_daily_est` = ampLUNA 30d rate ÷ (1 − hub fee), gap in pp;
`references` carry Allnodes / Stakely / SmartStake CSV. No more manual APR. Eris recommends ≥14–30d windows for Votion; the page defaults to 30d.

VERIFY on first live run: `assets.ampLUNA.source === 'hub_exchange_rates'`
and `agree === true`; arbLUNA hub — does Eris's arb vault answer
`exchange_rates(limit)`? (unknown; fallback is the ratio series); a vault's
30d headline vs the Votion UI within ~1 pp (their window may differ);
`native_staking.apy_est` vs SmartStake's current figure.

## 4. Open capture issue found on the way
`price-history/ratios` daily series STOPS at 2026-07-16 (heartbeat 07-17) —
six-week hole. The yields product reads the hubs directly so the page is not
blocked, but the series is the fallback and the historical LST curve for
Portfolio P&L. Investigate the network-and-prices cron on Render (log tail).

## 5. Site — BUILT
`new-here-tla.html` 1.0 on shared chrome. Four routes (Credia added: the LUNA
market's supply APY is a real no-lock route; the LST loop and TLA-ampLP-as-
collateral are shown with the numbers, verdict follows them). VP formula pinned
on the real vaults (1 week = 1.0×, MAX = 10.0×; boost linear on weeks beyond the
first) — VERIFY against a real 3-month lock when one of size exists. The header
"New here?" is two pulsing pills beside the globe everywhere — aDAO blue, TLA
orange (site-header). Native APR: manual override + validator commission with the honesty note.
Queued: help-agent corpus doc for the four routes; ratio re-anchor from the
sampler; bLUNA hub status; observed Atrium/Boost lock discount as the
resale default (slider at 10% today).

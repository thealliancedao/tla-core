# SPEC — "New Here? → TLA" (the LUNA holder's decision page)

Status: **SHIPPED 2026-08-26 — data layers live (org-votion 1.4.0 yields; dex-data
1.3.2 Credia rate history), page new-here-tla.html 1.0 walked three times with the
owner, gate 44/44. Open: help-agent corpus; take-rate leg measurement.** · Origin: community question → owner brief 2026-08-26 · Consumers:
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
Eris) → VP votes in EVERY bucket at once (100% in each of the 4) → one pool per
bucket, share = a/(V+a) × pot, weekly, SUMMED over buckets (owner catch 2026-08-26;
the first cut wrongly took one pool); picker grouped by bucket, one pick each; (c) lock resale: underlying × LUNA
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

## 3b. FIRST LIVE YIELDS RUN — 2026-08-26 18:47 — what it said
arbLUNA's hub DOES answer `exchange_rates(limit)`: 16.57% APY, contract = measured
= the Eris UI "Asset APY 16.57%". ampLUNA 36.86%. Votion ampLUNA-MAX 59.3 +
36.9 = 96.2%; arbLUNA-MAX 57.9 + 16.6 = 74.5%. bLUNA blank (no hub history, ratio
series 42 d stale) — correct. NATIVE: bonded 316.1M → gross 30.5%, provisions leg
to stakers 21.8% — below every published figure while ampLUNA's realized 36.9%
is ABOVE gross: the missing leg is Alliance take-rate rewards paid to delegators
in alliance assets (unmeasured; named in the product as `take_rate_leg`, with
`ampluna_realized_apy_30d` as the ceiling and `gap_vs_ampluna_pp`). The hub-fee
gross-up was dropped (hub config no longer exposes protocol_reward_fee). Page:
manual APR override + commission input carry the honesty note, now stating the
take-rate gap explicitly.

## 3c. Visual — the web (owner 2026-08-26, walked twice)
Home is a radial SVG on ≥900px: the LUNA amount is a real input IN the center
node (type any amount; chips 10K/100K/1M) → 4 route hubs → leaves, edges
green/amber/red (keep / cost / give up), sub-leaves dashed; everything clickable;
cards remain for narrow screens. Owner's second walk, all in: TLA hub shows the
LST yield AND the VP ("same staking yield as native, underneath"); a sub-leaf off
the lock: "sell it on Boost / Atrium at a discount"; Eris leaf names the
LUNA-governance VP concentration; Votion's lock leaf carries the 2 + 2 year clock
(vault unlock → TLA lock → sell or another 2-year clock; worst case 4 years) and a
"degen: loop it" leaf (TLA ampLP is Credia collateral at 45% LTV; the Votion
receipt is not) — both also as tiles on the Votion screen. Route screens draw
colored spokes from the hub node to each tile.

## 3d. Owner's third walk — 2026-08-26 — all in
Colors: native orange · TLA yellow · Votion green · Credia purple. The web uses
the room: 280-wide hubs with a second line (TLA: LST yield AND VP), 12 leaves +
2 dashed sub-leaves, every leaf has a `?` mini-popup (dynamic where there is
data). The loop moved to the Credia hub and, after the owner's Credia table (2026-08-26),
reduced to what chain verifies: ampLP markets are SUPPLY-ONLY collateral (45% LTV,
not borrowable); the real loop is LST collateral (70% LTV) → borrow LUNA (14.24%)
→ bond → repeat — positive carry only while LST yield > borrow rate (computed
live; 3.33× at 70%). Credia's displayed ampLUNA supply APY 36.79% = the LST yield
passing through (our hub read 36.86% — a second source agreeing). wBTC/Solid legs
are NOT described. The LUNA amount is a card in
the center of the web with its own input + chips.
**LP boost simulator** (TLA screen, `#sim`): pick a pool (eris-apr's 20+) or —
with a wallet selected in the picker — one of your own TLA positions (participants
product, deposit prefilled); model: emissions to a pool = bucket rewards/yr ×
vote share; share' = (v + a)/(V_b + a) with all your VP in that pool; pool APY
before → after by Eris's own convention (aprToApy(incentive × 0.92) + trading −
take, from the eris-apr product); your LP's $/yr with and without your votes;
bribes from that pool vs the bucket's best pot ("voting your own LP costs you the
difference in bribes, gains you the emissions"). Sanity: the re-derived APR is
checked against eris-apr's within 2% every render. Gate 42/42.

## 3e. Credia rate history (owner: "keep history, live feed not made-up numbers")
dex-data 1.3.2 `lib/credia-rates.js`: every hour, for every Credia market in the
snapshot, pull the app's own indexer series (`historyGranularity`, hourly points)
for the last 8 days → merge into `dex-data/credia/rates/<yyyy>/<mm>.json` keyed
(market, t), existing point wins, never-shrink asserted, read via the Contents
API; publish `rates/current.json` with 7-day min/max/latest per market. Labeled
OFF-CHAIN on every file; the chain snapshot stays truth for "now". Gate 8/8 on
the REAL indexer responses from the owner's HAR (LUNA borrow 9.0–14.2% over the
window, 18.6% on Aug 19). The page shows the range on the Credia screen and in
the loop popup, blank until the first run.

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

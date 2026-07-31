# SPEC — lp-apr (real LP yield on member-portfolio)

Status: **DRAFT — for approval** · Evidence session 2026-07-23
Problem (Camron's screenshots, verified): the LP card's "APR" is dex-side only
(LUNA-ASTRO on-chain fee_apr 0.85%; feed shows 5% from a pre-split dex figure)
while the DOMINANT yield — TLA reward emissions — is absent entirely; single-
side pools show "—" (no dex APR exists). Eris shows 71.23% base / 100.30%
boosted (LUNA-ASTRO, amp) and 68.40% (xASTRO). Interim shipped: column
relabeled "Dex APR†" with exclusion tooltip — stops the lie, awaits the model.

## 1. The model

```
pool_reward_apr = (gauge_pot_per_epoch_usd × pool_distribution_share × 52.14)
                  ÷ pool_staked_tla_usd
row shows: base APR (non-amp) · boosted APR (amp positions, × amp multiplier)
total column (later): dex fee APR + reward APR, components on hover
```

## 2. Inputs — verified 2026-07-23

| input | source | state |
|---|---|---|
| `pool_distribution_share` | `tla-voting/distributions/history.json` — per-gauge per-period `distribution` fraction per pool asset | ✅ live, periods 96→194, floor-certified |
| `pool_staked_tla_usd` | snapshot feed `pools[].staked_in_tla_usd` (page already loads it) | ✅ |
| token prices + capture time | org token-catalog (page already loads it, Rev this week) | ✅ |
| **`gauge_pot_per_epoch`** (reward tokens per gauge per epoch) | **THE MISSING INPUT** — distributions carry splits, not pot sizes | ❌ to capture |
| amp multiplier per pool | positions feed `is_amplified` + amp factor (source TBD: compounder state or Eris convention) | partial |

## 3. D1 — where the pot size lives (settle first, ~30min of chain reading)

Candidates, in checking order:
(a) incentive-manager rewards state (per-gauge emission per period) via a
    direct query — likely the same state the distribute call reads;
(b) the rewards event stream at rollover (distribute events carry coins? —
    earlier census showed `coins: null` on wallet_claims, but the DISTRIBUTE
    events may differ);
(c) sum of per-wallet claim amounts per pool per epoch — **already measured**
    in flows v2 `claims[]` (10,253 entries) → pot ≈ Σ claims for that pool
    that epoch. Lower bound (unclaimed lag) but zero new capture; fine for a
    labeled v1 ("from measured claims").
Recommendation: ship v1 on (c) — honest, data in hand — while (a) gets a
cron rider for the exact figure.

## 4. Fixture (hard acceptance bar)

DeFi_Patriot LUNA-ASTRO: base ≈ **71.23%**, boosted ≈ **100.30%**; xASTRO ≈
**68.40%** (Eris display, same-day capture tolerance ±5% relative — price/
capture drift, tolerance stated on screen via the catalog capture time).
Sanity already done: Eris's own math reconciles as annual rewards ÷ pool
depth ($5,503.23 ÷ $7,638.35 = 72.05% vs displayed 71.23% — drift).

## 5. Conventions (decide in review, then frozen)

Denominator = pool total staked USD (matches Eris) — NOT user position.
Annualization = ×52.14 epochs. Base vs boosted: show the figure matching the
member's position type, hover shows both. Price source = catalog `tla` usd
with capture time in tooltip. Unpriceable reward token ⇒ that component
honest-blank, never zero.

## 6. Delivery shape

Compute page-side v1 (all feeds already loaded by member-portfolio) behind a
`rewardAprFor(pool)` helper; column becomes "APR" again with fee+reward
breakdown on hover; †-tooltip retired. Org-side derive product only if v1
proves the model (avoid premature cron work).


## 7. APR-convention reconciliation (OPEN — evidence 2026-07-31, Camron's side-by-side)

Our figure (snapshot `approx_apr_pct`) = annual emissions USD ÷ **TLA-staked $**.
Eris's display divides by something near **whole-pool depth with a fee
treatment** — reads LOWER. Fixture pairs (same moment):

| pool | ours | Eris base | Eris amp | staked | depth | Eris rewards/yr |
|---|---|---|---|---|---|---|
| LUNA-EURe | 90% | 53.24% | 68.62% | $209.6K | $217.6K | $131.8K |
| LUNA-USDC (Astro) | 47% | 37.00% | 43.51% | $253.2K | $324.0K | $115.6K |
| LUNA-USDC (Skel) | 47%* | 36.46% | 43.29% | $55.9K | $78.7K | $25.98K |
| LUNA-USDT | — (<$20K clamp) | 34.16% | 39.89% | $8.2K | $11.1K | $3.58K |

Candidates tested, none fits all rows: rewards÷depth (EURe 60.6% ✗),
rewards×0.9÷depth (EURe 54.5 ✓, USDC 32.1 ✗), rewards÷staked (USDC 45.7 ✗).
Also: our emissions estimate ≠ their rewards/yr (USDC 132.7K vs 115.6K —
price + share drift). *Both LUNA-USDC rows currently collide to one figure
(name+bucket lookup) — dex must join the match key.

**Decision needed before any formula ships:** (a) which question the column
answers — yield on TLA-staked capital (current, higher, defensible) vs match-
the-deposit-venue display; (b) if matching Eris: pin their exact fee/denominator
by reading the amplifier contract or asking the Eris team — do NOT curve-fit
two screenshots. Interim (shipped): tooltips state our definition explicitly
and that it intentionally differs from Eris's.

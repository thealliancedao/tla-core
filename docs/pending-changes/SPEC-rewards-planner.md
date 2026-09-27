# SPEC: rewards planner ("what should I do with my claim?")

Status: **IDEA → SPEC 2026-09-27** (owner). Builds on SPEC-portfolio-coverage (data) and build-pnl v3 (claim history).
Home: one engine `aDAO-links-site/lib/rewards-planner.js` (UMD). It powers the member-portfolio section, the app (Portfolio
tab) and a help-bot tool: one number, one code path.

## 1. The problem, in the owner's words

"When you have deposits in TLA the rewards are claimable as one: $200 to claim, you get $200, it's not divided out." The
planner splits that one number back into where it came from. Then it helps decide where it goes:
- **Put back** enough to offset the take rate on each LP, plus an optional top-up.
- **Pay down** a Solid or Credia loan to improve the liquidation price.
- **Save** into buckets the member (or a DAO) defines: an aDAO NFT fund, buy ROAR, bribes budget, NFT buybacks… The rewards are
  zapped into a store-of-value LP that keeps earning while it waits. Each zap is a lot with its entry cost and P&L, and the
  bucket turns green at its target.

It is a **planning tool**. It never moves funds and never signs anything. Every figure that isn't measured is labeled
"estimate", and each action links out to where it's done (Eris, Astroport, Solid, BBL).

## 2. The four panels

### A. Where this claim comes from (before you claim)
- Per pool from `member-data/participants` `pending_rewards` (bucket · pool · amount · LUNA-equivalent · USD), plus
  `pending_bribes` (per pool, per token) and `pending_rebase`.
- A stacked bar: "your $200 = $120 LUNA-ampLUNA · $50 ROAR-LUNA · $18 bribes · $12 rebase".
- After a claim, the same split reads from the claim events: `claims[]` per gauge `reward_amount`; a gauge-level amount
  spanning several pools is split by the pending share just before (method stated).

### B. Offset the take rate (put rewards back)
- TLA takes a yearly % of every staked position (`yearly_take_rate`, 10 % on most pools today; from the tla-snapshot
  `amp_lp`, the same field lp-grades reads). Per position, per window:
  `take_usd = position_usd × yearly_take_rate × days_since_last_claim ÷ 365`.
- Offset = take_usd ÷ LUNA price = **LUNA to zap back into that LP**. Top-up chips **+1 / 2 / 3 / 5 / 8 / 20 %** of the
  position on top.
- It shows whether this pool's own rewards cover its take ("covers 140 %", or "short $3.20: another pool's rewards make up
  the difference").
- Zap cost comes from the existing slippage planner's depth model (dex-data), and every row gets a "Zap on Eris →" link.
- Amp positions: the compounder already re-buys LP inside the vault. The panel says so and shows the net unit growth from
  the measured amp-rate curve (build-pnl v3) instead of asking the member to offset.

### C. Pay down a loan (needs P1 readers)
- Reads the member's **Credia borrows / health** and **Solid CDP (collateral, minted SOLID, LTV, liquidation price)**
  (SPEC-portfolio-coverage P1).
- Simulate: X of the claim → swap LUNA→SOLID (price impact from the pool's depth) → repay → **new LTV and liquidation
  price, before vs after**, plus the swap cost.
- Until the readers exist, the panel says "your loans aren't captured yet (Solid / Credia readers, coming)". Never a zero.

### D. Savings buckets, held in a "vault" LP (owner 2026-09-27)

**The idea.** A bucket isn't idle LUNA in the wallet. The rewards are **zapped into a store-of-value LP** that keeps earning TLA
yield while it waits. Each zap-in becomes a **lot** tagged to a bucket. When the bucket reaches its target it turns
**green**: pull it and go do the thing.

**Buckets (member examples):** aDAO NFT fund · buy ROAR · donate to a DAO (memo `thanks_adao`) · the member's own.
**Buckets (DAO examples, for aDAO / Lion DAO treasuries):** bribes budget for LPs · rewards to NFT stakers · NFT buybacks ·
DAO ops. The same engine runs on a DAO's wallets through the tenant registry (ally-positions already reads them).

**Vault LPs are a curated list,** not a hand map in a page: `docs/curated/savings-vaults.json`, the owner's knob. Candidates
on TLA today, with the honest read:

| LP | On TLA today | Risk read |
|---|---|---|
| PAXG-WBTC (Astroport, single bucket) | ✅ $97K staked, active | Gold vs bitcoin: **not IL-free.** IL builds when the gold/BTC ratio moves. A store of value, not a stable one. The page says so |
| USDC-SOLID | ⚠️ today's pool is **USDC.n**-SOLID (winding down; Skeleton's USDC-SOLID is dewhitelisted) | Stable/stable: near-zero IL unless SOLID or USDC de-pegs (peg risk, stated). Use it **once a USDC.inj-SOLID pool exists** |
| USDC.inj-USDT | ❌ no USDC.inj pool on TLA yet (only USDC.n-USDT, winding down) | Stable/stable: near-zero IL, peg risk only. Becomes the default stable vault when it lands |
| (candidates) LUNA-EURe? EURe-USDT? | owner's call | a registry line each |

`lib/winddown.js` keeps any winding-down pool out of the vault list automatically, so no USDC.n vault can be picked.

**How a lot works (measured, never modeled):**
- A lot = one **deposit event** into a vault LP (tla-flows/events: `provides` legs, the LP units received, the timestamp).
  The lot stamps **cost at entry** in USD and LUNA from price-history on that day, plus which claim(s) funded it.
- **Tagging:**
  - The member assigns a deposit to a bucket (or splits it: "$5 of this $30 zap is the NFT fund").
  - The planner **suggests** a tag when a vault deposit follows a claim within 24 h.
  - Deposits made before the planner existed can be tagged after the fact from the member's own deposit history.
- A member may already hold $3,000 in that LP. Only the tagged units belong to the bucket; the rest stays "unassigned" in the
  same position. Units, never dollars, are what get split, so the bucket's value moves with the pool honestly.
- **Bucket value now** = Σ tagged LP units × the pool's value per unit now (dex-data / state-history). For amplified
  deposits, the units grow with the measured amp rate. **P&L** = value now − Σ entry cost, in USD and in LUNA. The
  **average entry** is the unit-weighted cost.
- **Top-ups** (more claims zapped in) add lots. The average and P&L update. **Withdrawals** from the vault LP take units
  **FIFO from the bucket the member names** (default: the bucket that's green). A pull closes those lots with an exit
  value, like a round trip in build-pnl v3: one ledger, no second model.
- **Target:** a USD amount, or "N LUNA", or "the floor of an unbroken aDAO NFT" (a live target that moves with the floor).
  A progress bar shows the current value vs the target. **Green** when reached, amber when the pool's value dips it back
  under.

**Storage:**
- Tags and bucket definitions live on the device (the site is read-only, no accounts), plus export / import JSON so a plan
  moves between phone and desktop.
- For a **DAO**, the bucket file can live in the DAO's own folder (dao-originations/<dao>/buckets.json), committed by the
  council like the manual balance sheet, so every member sees the same DAO buckets.
- Lots are **recomputed** from the chain events every time, never stored as numbers.

**Still open (owner: "there is more we are missing"):**
- Rebalancing a bucket between vaults.
- Bucket-to-bucket transfers.
- A DAO bucket that pays out on a schedule (staker rewards).
- Tax export per bucket (SPEC-registry-extensions §6b CSV).
- Alerts: "bucket green" and "vault pool went inactive / winding down".

## 3. Data: what exists

| Needs | Source | State |
|---|---|---|
| Pending rewards per pool, bribes, rebase | member-data/participants (hourly, 205 wallets) | ✅ (USDC.n bribes unpriced: symbol bug, queued) |
| Position value per pool, take rate | participants `lp_positions`, tla-snapshot `amp_lp.yearly_take_rate` | ✅ 10 % on every pool today. lp-grades' `take_rate` comes in two shapes (a number on 65 pools, an object `{yearly_rate, taken_raw, …}` on 11), so the lib reads both, and the shape gets fixed upstream (queued) |
| Claim history per wallet (amounts) | tla-flows/events claims (`claims[]`, `claimed_coins`), tla-voting rewards `claim_bribes`/`claim_rebase` | ✅ captured; **valued** by build-pnl v3 into `tla-flows/pnl/ledger/<addr>.json` |
| Prices then / now | price-history (LSTs re-anchored 09-27), network-and-prices | ✅ |
| Zap cost | dex-data depth + the slippage planner | ✅ |
| Loans (Credia borrows, Solid CDP) | — | ❌ P1 readers (SPEC-portfolio-coverage) |
| NFT floor / ROAR price for "what it buys" | nft-collections floor-history, network-and-prices | ✅ |
| Vault LP deposits (the lots), units, value per unit | tla-flows/events (deposit `provides` + LP units), dex-data + state-history pool state | ✅ captured; valued per epoch by build-pnl v3 |
| USDC.inj pools | — | ❌ none on TLA yet (the token IS in the catalog: `ibc/E8481AD8…` USDC.inj); USDC.n pools are excluded by lib/winddown.js |

## 4. Order

1. **v1**, after build-pnl v3 lands (claim history valued): A + B + D on member-portfolio and in the app, one lib, gated on
   real fixture wallets (the owner's wallet + a heavy claimer).
2. **v2**, after the P1 Credia and Solid readers: C.
3. Help bot: a `rewards_plan` tool on the same lib ("I have 300 LUNA to claim: how much offsets my take rate?").

## 5. Honesty rules
- The take-rate offset is an **estimate** (rate × time); the position value is measured.
- Bucket tallies are measured claims × the member's own %; they never assume a claim that didn't happen.
- Loan simulations show the price impact and say "at today's prices".
- No row reads $0 when the data is missing: it says what's missing.

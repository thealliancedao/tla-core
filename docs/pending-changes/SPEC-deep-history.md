# SPEC — Deep history: who qualifies, what the one-time backfill captures, and forward tracking

Status: DRAFT 2026-09-28, owner answers folded in (§6). **Why this exists (owner):** a correct P&L needs every past transaction and
past state, and that needs the ARCHIVE NODE — which we have today and may lose any day. So: capture it now, once, for the people who have
been loyal to us and our allies, KEEP it (if the node goes, their data stays), and forward-capture from then on. Not for everyone — too
many addresses, too much storage.

**Build order (revised):** (1) the eligibility product; (2) the **raw capture** for the cohort — every chain answer we might ever need, per
wallet per epoch, stored as read (§8) — started EARLY because the node is the scarce thing; (3) finish the page; (4) derive the series
from the stored raw reads (repeatable, no node needed); (5) forward tracking. Docs update + new chat at the milestone.

## 1. Eligibility (owner, 2026-09-28 — as stated)
A wallet qualifies for deep history if ANY of:
1. **aDAO NFT staked for more than 90 days.**
2. **aDAO and/or Lion DAO NFT staked, with a DAO-registered handle.** Lion DAO = **Pixel Lions staked in the Pixel Lions DAO for 90 days**
   (owner: Burning Lions have no DAO, so they do not qualify). Read as: an aDAO or Pixel Lions NFT staked ≥ 90 days in its DAO + a
   DAO-registered handle. (Rule 1 already covers aDAO ≥ 90 days without a handle.)
3. **TLA auto-max lock held for more than 90 days, with a DAO-registered name.**

How each is checked from data we already capture (no new chain source needed):
| Test | Source |
|---|---|
| aDAO NFT staked since | `nft-collections/adao/ledger` (stake / unstake events per token → continuous-stake start per wallet) |
| Pixel Lions NFT staked ≥ 90 days | `nft-collections/pixel-lions/ledger` (the Pixel Lions DAO's staking) |
| DAO-registered handle / name | the DAODAO profile name (`pfpk.daodao.zone`) the positions crons already resolve (`name`, `has_pfpk_profile`) |
| Auto-max lock held since | `nft-collections/tla-locks/ledger` (lock lifecycle) + the locks product's `is_auto_max_locked` |

Product: `member-data/eligibility/current.json` — per wallet {rules_met[], evidence per rule (since dates, handle), tier, cohort, as_of};
re-evaluated daily by member-data (cheap: reads three ledgers + the names it already has). `lib/eligibility.js` holds the rules ONCE; the
page, the backfill Action and the forward job all read the product (one number, one code path).

## 2. Tiers
- **Cohort (deep):** wallets qualifying on the CUT DATE (the day the deep backfill runs) — full history reconstructed back to their first
  participation, then tracked forward daily.
- **Forward-only:** wallets that qualify LATER — added to daily tracking from the day they qualify; no deep backfill. (Later idea: a deep
  backfill unlocked by a donation to the DAO — the same Action, run for one wallet.)
- **Everyone else:** the live view and what the org products already hold for all wallets (the current-state P&L from the flow ledger,
  current positions) — unchanged; only the deep reconstructed history and the leaderboards (§7) are cohort-only.
- **Stops qualifying** (owner): history is KEPT (deleting it would be a manual act, and they may come back); forward tracking stops the day
  they drop out; the gap is marked on their charts ("not tracked — did not qualify").
- **Comes back** (proposal): the eligibility product records the gap (`gaps[]: {from, to}`); a weekly Action fills it from the stored
  raw capture where it exists, else from the archive node **while we still have it**; if the node is gone, the gap stays marked, never
  interpolated. A returning wallet was in the cohort once, so it gets its gap filled; a brand-new qualifier still gets forward-only.

## 3. Public by design
Everything committed to `tla-core` is public, and the site has no wallet connection (owner: none planned). So the rules decide **which
wallets we spend archive reads and storage on**; anyone can view any tracked wallet — which is also what makes the leaderboards (§7) work.

## 4. What the deep backfill captures (every domain; built from what the page needs)
Granularity: **per epoch (weekly) for the deep past, daily from the cut date forward** — per-epoch is ~7× cheaper and matches how TLA pays
(rewards, bribes, votes are per epoch). Daily for the deep past only where a series changes intra-week and matters (question 4).

| Domain | Series per wallet | How (archive at height unless noted) | History available |
|---|---|---|---|
| TLA LP | amp + non-amp units per pool, value | compounder `user_info` / alliance staking at the epoch height; values from dex state-history (epochs 97–205) | flows since 2024-08 |
| TLA locks | locks, VP, auto-max, rebase | tla-locks ledger (genesis) + locks-anchor reads | genesis |
| TLA rewards / bribes | claimed per epoch | tla-flows claims + tla-voting events (bribes since 2024) — already archived, no archive reads | 2024 |
| Votion | vTokens per vault, value, the three P&L legs | votion events (since 2025-02) + vault rate series; holder-pnl per lot | 2025-02 |
| NFTs (aDAO, Pixel Lions, Burning Lions, locks) | held / staked / listed per day, marked at the floor that day | nft-flows ledgers (genesis) × floor history | genesis (floors from their start) |
| DAOs | DAODAO stakes (aDAO NFT, Lion DAO, ampCAPA DAO receipts) | ledgers + receipt transfers (tla-flows/transfers since 2025-01) + voting-module `voting_power_at_height` | 2025-01 / genesis |
| Credia | supplied / borrowed / health | Credia portfolio contract at height | archive |
| Solid | collateral / debt / health, events | SPEC-portfolio-solid (events backfill + overseer/market at height) | archive |
| Wallet balances | bank + cw20 (priced) | bank `balances` + cw20 `balance` at height — the heaviest; cohort only | archive |
| Prices | everything above valued the day it happened | price-history (LUNA from 2022-05, ratios from 2022-10) | 2022 |

Output: `member-data/history/<wallet>/{epochs.json, daily/<yyyy>.json}` — one file set per cohort wallet; the page's trend reads it
first, then the org daily archive (`member-data/positions/daily`, org copy from 2026-08-11) for recent days. Every row says its source;
days we could not read are gaps, never interpolated.

Mechanics: a GitHub Action (one-time work → Actions; scheduled → Render), ARCHIVE_RPC, resumable per wallet × month, commits per chunk,
heap-bounded (read → fold → drop), a gate that re-reads a sample of rows against the live chain for the current day. Size check before
running: cohort × epochs × reads (e.g. 100 wallets × 110 epochs × ~15 reads ≈ 165K archive reads).

## 5. Why "all" on the trend looks short today (found 2026-09-28)
- The org daily archive `member-data/positions/daily` starts **2026-08-11** (49 files). The page's `CONFIG.trackStart` still says
  2026-06-13 — the pre-migration days (06-13 → 08-10) are not in tla-core (the legacy repos are private/unreachable from the session).
- "all" samples every 7th day from 06-13, so the first real point is 08-15.
- Fix now (small, next chat): trackStart = the first file actually present; recover 06-13 → 08-10 from the legacy repo if the owner still has
  it (question 5). The real fix is this spec: the deep backfill reconstructs the past from the chain instead of relying on snapshots.

## 6. Owner answers (2026-09-28)
1. Deep history is for supporters of us and our allies — the P&L needs every past transaction and the archive node may not last.
   Current-state views stay for everyone.
2. Lion DAO side = Pixel Lions staked in the Pixel Lions DAO ≥ 90 days; Burning Lions do not qualify (no DAO).
3. Visible to anyone — no wallet connection. Leaderboards planned (§7).
4. Weekly for the deep past is fine — the charts need a way to pick a point and see its totals / breakdown (§9).
5. Unknown; if the old files are not on GitHub they are gone — the cohort's past is rebuilt from the chain anyway, so this is low priority.
6. Keep history when a wallet stops qualifying; stop forward tracking; the returning-wallet gap is handled as proposed in §2.

## 7. Leaderboards (owner: "power users in TLA, Credia, Solid — top 10 performing wallets so others can see how they use the protocol
## and copy / clone those accounts")
- One board per protocol: **TLA** (LP + votes + locks), **Credia** (supply / borrow), **Solid** (collateral / borrow), later Votion.
- Ranked on the deep P&L (both lenses, USD and LUNA) and APR earned on capital × time — so **cohort only** (only they have the full history).
- Each row links to the wallet's portfolio with its strategy visible: what pools, what mechanism, what votes, what loans, when it moved.
- Name shown = the DAO-registered handle (every cohort wallet under rules 2–3 has one; rule-1 wallets without one show a short address).
- Guard: a ranking needs ≥ N weeks of history and a minimum capital, so a one-week lucky wallet does not top it (N and the floor in config).

## 8. Raw first (the archive is the scarce thing)
The backfill stores **what the chain answered**, per cohort wallet per epoch height, before deriving anything:
`member-data/history-raw/<wallet>/<epoch>.json` = { height, time, reads: { query → answer } } for every query in the §4 table (compounder
user_info, alliance staking, locks, Votion vault balances, Credia portfolio, Solid collaterals / borrower_info, DAO voting power, bank +
cw20 balances). Series are then DERIVED from these files by a normal job — so if the page later wants something new, or a bug is found,
we recompute without the node. Size first: cohort × epochs × reads, compressed; a gate re-reads a sample live for the current epoch.

## 9. Charts on weekly points (owner)
Every deep-history chart point is clickable: a panel with that epoch's totals and its breakdown (locks / LP by pool / Votion / NFTs /
Credia / Solid / wallet), each figure labelled with its source; points with a gap say so.

## 10. Still open
- Rule 2 duration as read above (aDAO or Pixel Lions ≥ 90 days staked + handle) — confirm.
- The cohort size estimate (run the eligibility product first) → storage + archive-read budget.
- Leaderboard N-weeks and capital floor.

## (was) Questions for the owner
1. Is anything beyond the deep trends / reconstructed history cohort-only (e.g. the P&L story, the Votion story)? Recommendation: keep
   the current-state P&L for everyone (it's computed for 770 wallets already, and it's what shows the platform off); gate the deep
   reconstructed history.
2. Rule 2: does "Lion DAO NFT" mean Pixel Lions staked, Burning Lions too? Any minimum time for rule 2 (rules 1 and 3 say 90 days)?
3. Visible-to-anyone (public repo, the rules decide what we compute) — or owner-only (private storage + signature login)?
4. Deep past per epoch (weekly) — acceptable, with daily from the cut date?
5. Do you still have the legacy repo with member daily files for 2026-06-13 → 2026-08-10?
6. If a wallet stops qualifying (unstakes), do we keep its history and stop forward tracking — or keep tracking?

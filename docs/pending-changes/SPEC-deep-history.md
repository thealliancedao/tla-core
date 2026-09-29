# SPEC — Deep history: who qualifies, what the one-time backfill captures, and forward tracking

Status: 2026-09-28, owner answers folded in (§6); §1 + §8 REVISED 2026-09-28 (capture wide, show by setting; the three-layer walk). The first gate build (address-catalog 1.4.0) is ON HOLD — to be reworked into facts + settings. **Why this exists (owner):** a correct P&L needs every past transaction and
past state, and that needs the ARCHIVE NODE — which we have today and may lose any day. So: capture it now, once, for the people who have
been loyal to us and our allies, KEEP it (if the node goes, their data stays), and forward-capture from then on. Not for everyone — too
many addresses, too much storage.

**Build order (revised):** (1) the eligibility product; (2) the **raw capture** for the cohort — every chain answer we might ever need, per
wallet per epoch, stored as read (§8) — started EARLY because the node is the scarce thing; (3) finish the page; (4) derive the series
from the stored raw reads (repeatable, no node needed); (5) forward tracking. Docs update + new chat at the milestone.

## 1. Who is captured, who is shown (owner, 2026-09-28 — REVISED: capture wide, show by a setting)
**Capture is decided by cost, display by a settings file.** Storage is not the limit when data is kept compact (measured: the daily
series is 105 bytes per wallet per day ≈ 45 MB/yr for 1,155 wallets; full daily snapshots at ~15 KB per wallet per day are what would
break the repo and get pruned to 90 days). Archive-node TIME is the limit, so the backfill is shaped to spend it well (§8).

**The backfill cohort (the cut date)** — a wallet is in if ANY of (DAODAO and Enterprise stakes both count):
1. holds an aDAO NFT (any state) — 801 wallets on 2026-09-28;
2. has a Pixel Lion staked, or holds a Burning Lion — 506 (+4 Burning Lion holders, all already counted);
3. holds a TLA auto-max lock with total VP > 100K — 32.
**Union: 1,155 wallets** (192 of them have TLA flow history; the rest have NFT history only — so far as TLA shows).

**After the cut date (owner):** a wallet that meets the rules AND breaks an aDAO NFT gets its own deep backfill, automatically — a small
Render job watches the aDAO ledger for `break` events by wallets with no deep history; if they qualify and the archive node is still
reachable it runs that one wallet (~5–10 min); if nobody breaks, nothing runs; if the node is gone the wallet is marked forward-only.
Without the archive a newcomer still gets everything rebuildable from events (LP, locks, votes, bribes, claims, NFTs) — only past
state-only facts (Credia / Solid / balances on past dates) are missing.

**Wallets that have done nothing in TLA (owner):** they stay watched. The forward watcher (§8, layer 1 forward) sees every tx they sign;
the first time one touches a protocol we read (Solid, Credia, Votion, TLA, Astroport …) their portfolio + P&L for it starts from that tx.

**Who the portfolio page shows** = a settings file (`docs/curated/portfolio-access.json`, rules any-of / all-of over per-wallet FACTS:
NFTs held / staked + since, broken NFTs, lock count / auto-max / VP, DAODAO name, name history). The daily identity job writes the facts,
not a verdict — a rule change is a one-line edit, and nobody's data depends on it. Name history (`catalog/names/history.json`) as built.

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
Everything committed to `tla-core` is public, and the site has no wallet connection (owner: none planned). The rules decide which wallets
we spend archive reads and storage on AND (owner, 2026-09-28) which wallets the member portfolio page shows — the data stays public in the
repo; the page tells the whole story only for covered wallets. Leaderboards (§7) are cohort-only by construction.

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

### 4b. Protocol inventory — what the walk must look for (2026-09-28, owner list + what our data shows)
Layer 1 (every tx of every cohort wallet, §8) catches ALL of these without a list; this table is what layers 2/3 read at each epoch and
what the page will derive. **Order: layer 1 first → `contracts_seen` + `contract_info` (code id, label, admin) for every contract any
cohort wallet touched → the owner labels anything unknown → layers 2/3.** That is how "did we miss a protocol" gets answered by the chain.

| Protocol | What users do | Have today | The walk adds |
|---|---|---|---|
| TLA (vAMP locks, votes, bribes, amp/non-amp LP) | lock, vote, provide, claim | flows since 2024-08, locks ledger genesis, votes, bribes | per-wallet state per epoch (layer 3) |
| aDAO | hold / stake / list / sell / break, DAO votes, backing | NFT ledger genesis, DAO capture | voting power at height |
| Pixel Lions · Lion DAO (ROAR) · pyROAR · Burning Lions | stake NFTs / ROAR, votes, DAODAO rewards | PL ledger genesis; ROAR/Lion DAO forward only; pyROAR holder list; Burning Lions snapshot only (7 tokens, no ledger) | ROAR stake + rewards history; Burning Lions ledger (tiny) |
| Solid (Capapult) + CAPA / ampCAPA DAO | deposit / lock / borrow (0.5 % mint fee) / repay, liquidations, **bid in the liquidation queue**, wrap bridged tokens (bond / redeem) | census + oracle + liquidation vocabulary PROVEN (full census 2026-09-28, S1–S9) | per-wallet queue bids (`bids_by_user`), borrow / repay / fee events, per-epoch state |
| Credia (Creda Finance) | supply / withdraw / borrow / repay, collateral + e-mode switches, receipt transfers (e.g. wBTC.creda.a staked in the TLA single gauge), flash-loan liquidations | current state for TLA participants | probe 1.1 PROVEN (2026-09-29, below) — history is derivable from events alone |
| Votion | deposit / withdraw vaults | events since 2025-02 + vault rates + holder P&L | nothing new beyond layer 1 |
| Eris (ampLUNA, arbLUNA hubs, amplifier, gov) | bond / unbond / claim, amp vaults | hub ratios (price-history), amp flows via TLA | unbond queue per wallet, non-TLA Eris use |
| Backbone Labs (bLUNA, BBL marketplace) · Stader (LunaX — turned off in Solid; history only) | LST bond / unbond; NFT trades | hub ratios; BBL venue in NFT ledgers | unbond queues; LunaX ratio history |
| Astroport · Skeleton Swap (White Whale) | swap, provide / withdraw, incentives | TLA pools only | LP outside TLA, swaps (fees paid), incentive claims |
| DAODAO · Enterprise (legacy) · Polytone | stake, vote, propose, rewards | our DAOs + allies | every DAO a cohort wallet is in (voting power at height) |
| Native staking · Alliance module · chain governance | delegate / undelegate / redelegate / claim, alliance delegate, votes | live read only | delegations + rewards per epoch, gov votes |
| Marketplaces: BBL · Boost · Atrium · NFT Switch | list / sell / buy / bid (NFTs and TLA locks) | venue-attributed ledgers | nothing new (layer 1 keeps the raw) |
| Bridges & routers: IBC (Osmosis, Noble USDC), Axelar, Wormhole, Skip / TFM | move assets in / out, routed swaps | IBC counterparties found live on the page | cross-chain in/out per wallet (cost basis of what arrived) |
| **Wallet token flows** (owner 2026-09-28) | every token in / out of the wallet: bank sends, cw20 transfers, IBC in / out | amp-token wallet↔wallet moves only (tla-flows/transfers); balances live | every transfer from layer 1, each counterparty labeled: protocol contract · our registry (DAOs, members, the wallet's own linked addresses) · bridge / IBC chain · **exchange** (curated list + a volume heuristic; see §8b — no memo is ever stored) · unknown ("external"). Valued at that day's price → **net deposits** per wallet, which turns the P&L into value now − (money in − money out) across everything, not only TLA; moves between a member's own wallets cancel out |
| Warp (automation), feegrant, authz, token factory | automated jobs (seen placing Solid bids), fee grants, permissions, factory denoms | authz live on the page | the jobs / grants a wallet created |
| Allies / watched: Galactic Mining Club, Galactic Punks | NFTs, BTC backing | registry entries | their DAOs via the DAODAO row |

**Solid — status 2026-09-28 (probe 1.4, the full census):** 219 wallets with collateral, 551 borrower records, 202 with a loan; the
protocol's limit reproduced within 1 % on every priced position (114/114); **59 wallets still owe SOLID with no collateral left**
(liquidated to zero — new band `debt_no_collateral`); the bridged wrappers (wBTC, wETH) report 6 decimals but count in the wrapped
token's units (reader 1.0.1 fixes the token counts; USD was never affected); wBNB has no oracle price (blank); **1,655 liquidations on
chain** (custody `liquidate_collateral` totals), 190/190 sampled tie borrower + collateral taken + SOLID repaid. Still to prove before
the Solid history: queue bids per wallet, borrow/repay fee attributes, the wrapper bond/redeem events.


**Credia — status 2026-09-29 (probe 1.1, docs/fixtures/2026-09-29/credia-probe.json):** 14 markets (LUNA, ampLUNA, arbLUNA, wBTC, USDC,
PAXG, wstETH, EURe, USDi / USDC pairs, five TLA ampLP tokens — only the ampLP markets carry the 2 % take rate). **Census complete in one
paged query:** `portfolios` returns every position with values — **183 portfolios** (8 pages), the same shape as `portfolio{address}` —
so the hourly reader can cover every Credia user in 8 calls instead of one call per participant. **12,995 portfolio txs** since height
18,251,767 (8,000 newest read), 127 wallets in them, 51 liquidator txs. **Every event carries the position's full snapshot** (portfolio,
value, vamount, lthf, supplied / collateral / borrowed / lt / ltv values, APRs): `creda-portfolio/supply | withdraw | borrow | repay |
transfer (owner → recipient, both snapshots) | change_emode | liquidate (liquidated, debt repaid USD, bonus liquidator / protocol,
lthf before → after) | flashloan` — **Credia's history needs no per-wallet archive state reads**; balances are vamount × the market's
supply / borrow index (metrics). Tribute hypothesis: NOT supported — the add_bribe seen next to Credia events is TLA's own weekly
take-rate distribution, which takes a slice of the wBTC.creda.a receipts staked in the single gauge (a `creda-portfolio/transfer` to the
take collector); where Credia's 2 % ampLP take goes is still unseen.

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

## 8. The backfill walk — take EVERYTHING (owner: "make sure we get everything, even stuff we may not know we need yet")
The node is the scarce thing, so the walk stores what the chain says in the most general form first, and derives later. Three layers:

**Layer 1 — every tx of every cohort wallet (protocol-agnostic, the widest net).** Archive RPC `tx_search` for each wallet as signer
(`message.sender`) AND everywhere else a wallet appears in an indexed attribute — measured from 111K txs of our own raw corpus
(tla-flows/raw) plus the Solid census: `transfer.recipient`, `coin_received.receiver`, `withdraw_rewards.delegator`, `wasm.receiver`,
`wasm.recipient`, `wasm.to`, `wasm.user`, `wasm.owner` / `wasm.new_owner` / `wasm.old_owner`, `wasm.borrower` (a liquidation is not
signed by the borrower), `wasm.bidder`, `wasm.seller`, `wasm.portfolio`, `wasm.address`, `wasm-erishub/*.receiver`,
`fungible_token_packet.receiver` — full tx result with events, deduplicated by hash. This captures protocols we do not read yet —
any future feature re-derives from it. Cheap in reads (100 txs per page), heavy in bytes (est. ~1 GB gzip for the cohort) → stored
OUTSIDE tla-core git (§8a). **Forward:** a daily Render job runs the same searches from the last height for all captured wallets (one or
two pages each) — this is also what activates a dormant wallet (above) and what replaces the archive once it is gone.

**Layer 2 — protocol state at every epoch boundary (per protocol, not per wallet).** Pool reserves + LP supply, compounder / Alliance
share prices, LST hub rates, Votion vault rates, Credia market states + oracle, Solid market / overseer / oracle, vAMP totals, DAO voting
module totals, bribe state — a few hundred reads per epoch × ~110 epochs. This is what VALUES the positions layer 1 reconstructs.

**Layer 3 — per-wallet state where events cannot rebuild it, only where layer 1 says the wallet was there.** Compounder `user_info` per
pool it touched, Alliance staking, Credia portfolio / health, Solid collaterals / borrower_info, Votion vault balances, DAO voting power,
bank + the cw20s it ever received — at each epoch boundary from its first tx on. Layer 1 decides which contracts to ask, so no read is
spent on a protocol a wallet never used.

**Also saved:** the list of every contract any cohort wallet ever called (`contracts_seen`, with first/last height and counts) — so
unknown protocols surface and can be labeled later.

**8b. Privacy rules (owner 2026-09-28: "I'm trying to help, not hurt our users — this must not become ammo against them").** Binding on
every layer, the raw included:
- **No memos, ever.** Tx memos are not stored in the raw, the derived products or the pages (an exchange deposit memo is the exchange's
  customer id — the one field that ties a wallet to a person). The walk drops `tx.body.memo` before anything is written; the existing
  raw corpus (tla-flows/raw) holds events only and has none. (Supporter gifts keep only the fact that the agreed tag matched — the donor
  chose to write it.)
- **Exchange flows are summaries, not trails.** A transfer to / from an exchange is kept as {day, direction, token, amount, value that
  day, "exchange"} — no tx hash, no counterparty address, no exchange name on the page. Dedup during the walk uses a keyed hash (HMAC with
  a secret held in the Action), so the stored key cannot be looked up on an explorer.
- **The raw archive is PRIVATE** (a private repo / private storage, not tla-core): full txs are needed to re-derive features, but they are
  not published. Only derived, summarised products are public.
- **No new identity links.** We never guess who owns a wallet, never link wallets to each other unless the owner linked them on the page
  (their own browser) or they share a DAODAO name they chose to register; the exchange heuristic labels ADDRESSES as exchanges, never
  people as exchange customers.
- The footer's tax / no-liability notice stands: figures are orientation, not records.

**8a. Where it lives.** Raw layers 1–3: gzip, write-once per wallet × chunk, in a SEPARATE **private** archive repo (e.g. `thealliancedao/tla-archive`,
never rewritten, so git grows only by the data; private per §8b) — tla-core keeps only the compact derived products (weekly points, daily series, P&L
ledgers, facts). A gate re-reads a sample live for the current epoch. **Step 0** before any of it: a 15-minute timing probe (tx_search
pages/s + payload size, smart queries/s at height) to size the run for real.

**Estimates (to be replaced by the probe):** layer 1 ≈ 1,155 wallets × ~6 searches × a few pages ≈ 20–40K requests; layer 2 ≈ 30–60K
reads; layer 3 ≈ 150–250K reads for the 192 TLA wallets + whatever layer 1 shows the others touched. At 3–10 reads/s: roughly 1–3 days,
run as resumable GitHub Action chunks (6 h cap each).

## 9. Charts on weekly points (owner)
Every deep-history chart point is clickable: a panel with that epoch's totals and its breakdown (locks / LP by pool / Votion / NFTs /
Credia / Solid / wallet), each figure labelled with its source; points with a gap say so.

## 10. Still open
- Auto-max history: the switch is read as it is today; a lock set to auto-max recently counts from acquisition (record the switch forward).
- Enterprise-DAO stakes (504 aDAO / 683 Pixel Lions tokens still in state staked_enterprise) do not count — confirm.
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

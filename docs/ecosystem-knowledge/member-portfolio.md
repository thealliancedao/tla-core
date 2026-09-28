# The Member Portfolio — what it shows, where every number comes from, and how to tell right from wrong

Page: https://thealliancedao.com/member-portfolio.html?wallet=<terra1…> (member-portfolio 3.8, 2026-09-28). Open to anyone for any
tracked wallet — there is no wallet connection; all data is public chain data captured by the org crons into the public tla-core repo.
Tracked = the TLA electorate (every lock holder, ~205 wallets, hourly) plus aDAO members and ally rosters. Owner / maintainer:
DeFi_Patriot (@DeFi_Patriot on X) — reports go through the Help page's "Report an issue" form (it pre-checks the claim and files it).

## The cards, top to bottom

| Card | What it says | Source (tla-core path) | Cadence |
|---|---|---|---|
| Banner + tiles | Locks, LP (incl. receipts staked in a DAO), wallet, Votion, NFTs, claimable; 1d/7d/30d change | member-data/participants/current.json + member-data/positions/current.json (capture engine), live price re-price | hourly (participants), live prices on load |
| How you've done (P&L story) | Net in USD and LUNA = closed trips (prices + pool mechanics) + TLA rewards (claims + bribes) + still-open vs cost | tla-flows/pnl/ledger/<wallet>.json (build-pnl v3) | the tla-flows job; rebuilt as flows arrive |
| Value curve | Position value per epoch + now | same ledger, value_curve | per epoch |
| LP positions (P&L table) | Per pool × mechanism by bucket: in, out, open now, P&L incl. rewards, APR earned, LP since entry, trips | same ledger + the hourly read (reconcile) | as above |
| LP positions (live) | What is staked now, valued via pool share; inactive pools flagged with the take-rate cost; the cyan "STAKED IN A DAO" panel | participants / positions (capture engine), ampCAPA DAO live read | hourly + live |
| Votion | Per vault: vTokens, underlying LST, implied VP; the story (USD in → now = LUNA price + LST staking + Votion compounding; real vs advertised APR) | votion/snapshots/current.json, votion/holder-pnl/current.json | positions daily (~20 h), story after each |
| Vote allocations | Where the wallet's VP votes; expected bribes at the close; will-earn vs could-earn (best split) | participants voting + the Vote Market engine (lib/vote-market.js) | hourly + live pots |
| Wallet balances | Every bank token + every catalog cw20 read live; dust < $2 folded; unpriced listed; idle LP warning; illiquid box; Liquid total | live LCD + token-catalog/snapshots/current.json (+ Lion DAO markets for pyROAR) | live on load |
| Other Cosmos chains | Tokens, staked, claimable rewards on Cosmos Hub / Osmosis / Neutron / Injective | live chain REST for derived, linked or IBC-found addresses | live |
| NFTs | aDAO + Pixel Lions held vs paid, floor mark, round trips | nft-collections/<slug>/ledger/by-wallet | nft-flows job |
| Trend | Portfolio $, VP, LP, locked per archived day | member-data/positions/daily/<date>.json (org archive from 2026-08-11) | daily |

## The honesty rules the page follows (why a number is blank, moved or kept out)

- **Blank beats phantom.** No trustworthy price or basis → blank with a reason, never an estimate.
- **Custody (a receipt staked in a DAO) is still the member's position.** The ampCAPA DAO voting module holds TLA amplified ampCAPA
  receipts staked for governance VP; they still earn. Counted once in every total, shown in its own panel, on every trend day.
- **Moved ≠ withdrawn.** A receipt that left the wallet by TRANSFER (not a withdrawal) is shown as "⚠ not in this wallet · sent to
  <name> <address> on <day>" and left out of Open now; its trips and rewards stay in the history.
- **APR is left blank when a trip had no price** (the capital behind the rewards is not fully known — an APR would be inflated).
- **Illiquid is not value.** A holding large against its pool (pyROAR: pool ~$272) shows what selling it would fetch (constant product,
  before fees) and stays out of the Liquid total.
- **Idle is a warning.** LP tokens sitting in the wallet earn swap fees but no TLA rewards or bribes.
- **P&L two ways.** USD and LUNA lenses; LUNA's own price move is separated from what the position did.

## Diagnosis table — "this number looks wrong"

| Symptom the visitor sees | Most likely cause (KNOWN) | How to verify (portfolio tool / read_product) | When it IS a fault — report it |
|---|---|---|---|
| A position shows "open" but the wallet no longer has it | Receipt moved by transfer; build before pnl 1.2.3 | tool `portfolio`: position.not_held / moves | The chain read shows the position in the wallet but the page says moved (or vice versa) |
| LP card says "No LP positions" but the wallet has TLA exposure | It is staked in a DAO (custody) — shown in the cyan panel | tool: custody[] | custody[] empty but the DAO shows a stake for the wallet |
| ampCAPA value much bigger than the P&L's open cost | Part of the DAO stake came before our history (no cost basis) → valued, kept out of P&L | tool: custody + position held_in / untracked | never — this is by design |
| APR shows "—" | A trip had no price that day | tool: position.trips_unpriced | APR blank with every trip priced |
| A position reads "unknown, $0" | Single-asset cw20 gauge not resolved (fixed 2026-09-28, capture-engine 1.2.1) | tool: lp_live rows with no pool | Still unknown after 2026-09-28 11:00Z |
| pyROAR (or another token) not in the total | Illiquid — would fetch far less than its paper value | page's Illiquid box | The pool is deep and it is still excluded |
| A token shows "unpriced" | Not in the token catalog / no price source | token-catalog/snapshots/current.json | The catalog has a price and the page shows unpriced |
| "disputed" on a row | Our value disagrees with the chain read by > 50 % and > $50 → left out of totals | tool: position.disputed (both figures) | Always worth a report — it names a real disagreement |
| Votion card has no story | The holder P&L is built after each daily positions run | votion/holder-pnl/current.json exists? holder row for the vault? | The file exists, the wallet holds vTokens, and no story shows |
| Trend "all" starts at 2026-08-11 | The org daily archive starts then; earlier days are not in the repo | member-data/positions/daily/ | — (deep history is a planned build, see below) |
| Change chips jump | A total gained a new component (e.g. custody) — fixed so past days carry it | trend dots vs the CAPA supply history | A jump with no new component |
| Numbers differ from Eris / another site | Different APR basis / price source / timing | name both sources and their times | Same basis, same time, different number |
| Votion "untracked vTokens" | vTokens with no archived deposit (moved in, or before the archive) — valued, no basis | holder row untracked_vtokens | — |
| Stale numbers | Check the product's capturedAt / heartbeat | the tool's freshness block | A heartbeat older than its cadence (hourly > 3 h, daily > 30 h) |

**What to send the maintainer when it IS a fault** (the Report form does this; otherwise DM @DeFi_Patriot): the wallet address, the
card and the number seen, what was expected and why, the tool's finding code, and the product path + capturedAt that was checked.

## Strategies, copying and leaderboards

- Every tracked wallet's portfolio is public: anyone can open a named wallet (a DAO treasury, a registered member, the GMC Backing
  Wallet) and see its pools, mechanism (amplified or not), votes, locks, Credia/Solid use and how it performed.
- **Leaderboards are planned, not live** (SPEC-deep-history §7): top wallets per protocol (TLA, Credia, Solid) ranked on the deep P&L
  and APR earned on capital × time — only for wallets in the deep-history cohort, with a minimum history and capital so one lucky week
  does not top it. Until then, the bot can describe what a named wallet does, factually — never as a recommendation.
- **Deep history** (planned): a one-time archive backfill for supporters of aDAO and its allies — aDAO NFT staked ≥ 90 days; an aDAO
  or Pixel Lions NFT staked ≥ 90 days with a DAO-registered (DAODAO profile) name; or a TLA auto-max lock held ≥ 90 days with a
  DAO-registered name. Later qualifiers get forward tracking only.

## Solid (planned card — SPEC-portfolio-solid)
Collateral locked vs deposited-not-locked, SOLID debt, health = borrow limit ÷ loan (the protocol's own numbers), liquidation price,
P&L from events (borrowed / repaid / mint fees / liquidations). Not on the page yet.

## Watched ally: Galactic Mining Club
The GMC Backing Wallet (terra1jd2tam4svukk7pg8fv0dkj7zgwes9yw5c2h3wm0gkjcwdth2mpfsxxw6zd) is GMC's BTC Backing Treasury sub-DAO. As of
2026-09-28 its backing in TLA is 0.3971 wBTC.creda.a amplified in the ACTIVE single gauge (≈ $33.1K) plus 8 TLA locks — nothing in an
inactive pool. Its portfolio page is public like any tracked wallet.

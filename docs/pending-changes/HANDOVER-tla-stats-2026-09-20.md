# HANDOVER — TLA Stats rework (from the 2026-09-20 chat; read with AUDIT-tla-stats-2026-09-20.md and CHANGES_PENDING)

Why this file exists: the 2026-09-20 chat held every screenshot (ours, Votion's, Eris's), both Votion HAR files and every audit
run on them. A new chat cannot see any of that. Everything a fresh session needs is written here or in the three fixture files
beside it (`docs/fixtures/2026-09-20/`): `votion-optimization.json` (Votion's optimizer API, verbatim), `eris-lp-list.json`
(Eris liquidity hub, 26 rows), `eris-vote-page.json` (Eris vote page, 37 rows + total VP). Read those before touching the
Vote Market, the APR product, or the VP wording. The owner cannot open Eris on his desktop (blocked) — Eris evidence is phone
screenshots; Votion he can capture as a HAR from desktop. Ask for a new HAR at the start of each epoch's work.

## A. What our tla-stats page showed on 2026-09-20 (~19:20Z, epoch 203 live) — transcribed
1. **Hero tiles + history popups.** Active Pools (all DEXes) 31 at E203, +10.7 %; popup table E203, E199 … E188 (E200–E202
   missing), chart E184–E203 with the gap; LUNA price column ($0.0555 at E203). TLA TVL $2.01M (+9.3 %), same E199→E203 gap.
   Epoch Rewards (USD) $19.7K, Epoch Bribes $1.3K, Avg APR (Non-Amplified) 43.7 %, Avg APR (Amplified) 60.7 % — each popup
   shows ONE point (E203) and "More history will appear as epochs are tracked". Cause and fix: audit §1.
2. **Vote Market** ("What a Votion vote costs, what is funded for the period it is voting into, and what your next $ would
   move"). Header chips: "Epoch 203 · live", "Votion's rate $18.78/1M VP", "funded for p203 $1.3K · 16/17 pots", "casts in
   4h 36m", "live 19:22Z". Row of add-amounts $0 · $10 · $25 · $50 · $100 · $250 "to a pot for p203"; sort by pot / move per $ /
   best grade. Columns: POOL (with DEX chip, bucket, grade letter) · POT · P203 (USD + the token amounts, e.g. "$241.32 ·
   75.0K FUEL") · VOTES NOW (e.g. "10.22M · Votion 3.81M") · $/1M ("$23.61 · +26 % vs rate") · VOTION'S NEXT MOVE at $0
   ("+734.5K VP · 3.81M → 4.55M · +$84.56/wk") or "+$X → VOTION VOTES" at $10…$250 ("+226.1K VP · share 36→39 % ·
   +$26.03/wk · pays $22.60/1M"). LUNA-EURe row: "not funded · through p206" with the warning "Votion's 1.70M VP here leaves
   unless p203 is funded before it casts". 8 rows shown, "show all 17 bribed pools". At $10 the header says "$10 is 1 % of
   everything funded"; at $250 "19 %". Owner's question: is the +$X column what we built it for (add $, see where Votion pulls
   VP from). Answer in audit §6 (model right, claim wrong, threshold ignored).
3. **Movers This Epoch** ("Biggest vote shifts since the epoch locked in"). GAINING: LUNA-FUEL +2.44M VP (users +1.70M ·
   Votion plans +734.5K · 8.41 % of all TLA VP), LUNA-ROAR +1.45M (users +1.72M · Votion −265.6K), LUNA-PAXG +1.32M (users
   +165.5K · Votion +1.16M). LOSING: LUNA-WBTC −4.54M (users −4.54M · Votion 0), USDC.n-EURe −3.09M (users — · Votion −3.09M),
   LUNA-arbLUNA −2.56M (users −2.56M). "show all 28 movers (22 hidden)". Footnote: users' on-chain moves since lock-in
   (2026-09-13); Votion's published plan (casts at the end of the period); % of all TLA VP (28.99M).
4. **Vote Breakdown by Pool** — tabs Epoch 203 (Locked-in) / Epoch 204 (Planned); buckets Stable / Project / Bluechip /
   Single. Bucket totals 28.66M / 28.77M / 28.74M / 28.99M; Votion 8.47–8.48M (29.2–29.6 %), aDAO 841K (2.9 %), Other
   19.35–19.67M. Stacked bars per pool (Votion green · aDAO blue · Other grey), ghost outline = locked-in, hatched = the change,
   labels like "+963.4K / +5 %", "−852.2K / −16 % (users +111.2K · Votion −963.4K)". Inactive pools grouped ("2 inactive · below
   1 % threshold · 124.6K VP"). Audit §7.
5. **Leaderboards** — Pool Tops: Top Avg Volume (4-epoch avg, LUNA-USDC.n $6.9K …), Top DEX Liquidity (LUNA-ampLUNA
   $844.6K …), Top by APR ("Eris amplified APY (their orange number) · rank vs last epoch · as of 19:02 UTC": LUNA-FUEL 345.5 %,
   LUNA-EURe 106.5, PAXG-WBTC 97.9, LUNA-SOLID 86.9, LUNA-ROAR 84.7, LUNA-USDC.n 84.7 NEW, LUNA-PAXG 76.3, LUNA-USDC(SS) 74.5,
   ampROAR-ROAR 64.1, ATOM-LUNA(SS) 61.3, USDC-USDt(SS) 51.9, LUNA-INJ 44.6, LUNA-USDT 44.1, LUNA-arbLUNA 39.7, bLUNA-LUNA
   37.1). Voters: Voting Leaders (terra1lsas…f7y2 7.81M · Votion arbLUNA Max 7.12M · terra1nmnr…68dg 2.28M · Votion ampLUNA
   Max 1.35M · DeFi_Patriot 1.33M · LionDAO 1.18M · Quarks 1.01M …), Utilization Leaders (every row 100.0 %), Most Engaged
   Voters ("THIS EPOCH" / "period 202"). Community: OG Board (since period 96), Newcomers (terra1hvjx…7nh7 period 203 …), Top
   Bribers (Phoenix Directive DAO $41.0K · Astroport take-rate · Stable bucket $18.4K · Solid Protocol $16.6K · LionDAO $11.6K
   · Astroport take-rate · Project $5.6K · terra1tk…luec $5.0K · Fuel $2.5K …; "34 bribers · 10604 attributed bribes since
   2024-08-28 · 110 % of lifetime LUNA bribe flow attributed"). Audit §9.
6. **Runway** — Unlocks tab: "Essentially the whole electorate is auto-max: only 16.8K VP (0.05 % of tracked VP) unlocks in
   the next 8 weeks, 41.67 of it within 4" — bars by week, largest upcoming unlocks list (Luna1 #319 0.04 ampLUNA · Rpm87v2
   #51 109.04 ampLUNA · terra14p3mc0 #429 20.8K ampLUNA 16.1K VP 6w …), "tracked electorate only (327 wallets in the
   participants feed)". PENDING WITHDRAWAL — 66 locks fully unlocked never withdrawn, 7.8K ampLUNA · 1.6K LUNA · 1.4K bLUNA ·
   1.3K arbLUNA ≈ $1.5K, rows like "terra1jn1320… #388 3.9K ampLUNA · 97w overdue". Bribes tab ("Bribe Runway · 17 pools
   funded · period 202" ← stale label): epochs of funding left per pot (13 pools 2e, 1 pool 4e, 3 pools 6+e), SOONEST TO EMPTY
   (USDC.n-SOLID 319 native:ulu… 2e, LUNA-SOLID 637, LUNA-ASTRO 6,187 + 319 by terra1awq6…, USDC.n-EURe 1,982 ampLUNA + 6,373
   …). Audit §5, §9.
7. **Is TLA Liquidity Growing?** — "One-week outflow, then steady · real liquidity over 20 epochs (E184–E203) · window 4 / 8 /
   all (20)"; "Most of the window's move was a single outflow of $442.5K going into E188 — the base has held steady since";
   indexed chart (real price-neutral vs headline $ with token prices; bars = real $ in/out per epoch); cards Real −12.5 %,
   Headline −29.4 %, Last 4 epochs (real) −1.6 %, LUNA family net −$66.7K, Everything else net −$377.8K, Base retained 87.5 %;
   "What moved (price-neutral, E184→E203)" chips (EURE +$69.2K · PAXG +$6.0K · ROAR +$3.8K · ampROAR +$2.5K · USDC −$274.6K ·
   USDT −$127.0K · INJ −$32.9K · SOLID −$25.2K); "TLA holds $1.93M staked". WHERE THE REWARDS GO: "E202: 568.7K LUNA claimed —
   74 % compounded by the Eris amplifier … 26 % claimed to wallets, 0 % swapped in the same tx" with bars E200–E203; net
   buy/sell pressure chips (ampLUNA −$51.7K · LUNA +$28.8K · PAXG +$7.5K · USDC.n +$6.2K · EURe −$2.6K · CAPA +$1.5K).
   Audit §8.
8. **Pool Health & Exit Risk** — "Capital flow E202 → E203 · 2 flagged": Net +$29.9K, Inflows +$124.9K, Outflows −$95.0K;
   "Plan a trade" strip (cheapest route, arb radar "largest gap 0.22 % on ATOM-LUNA"); sort by TLA staked / inflows / outflows /
   trend Δ % / reward APR / bribe runway / risk first; window 4 / 8 / 12. Grouped by bucket with one line per pool ("LUNA-USDC.n
   Astro stable · bribed thru e204 · 2 epochs · $354.0K staked in TLA (+10 % vs last epoch) · up 20 % over 4 epochs · +$59.2K
   net over 4 ep · 18.93M votes · −13 % next ep"), mini 4-epoch chart, APR / runway / votes pills, staked-in-TLA figure with
   the epoch's net; a WATCH pool (USDC.n-SOLID: down 15 % over 4 epochs, −$10.2K, −64 % next ep) expanded with the IL note.
   Audit §8.
9. **Alerts / TLA alerts** — not on this page (home window); not audited here.

## B. What Votion showed (votion.money vault pages, 2026-09-20 11:30 local; HAR at 19:30–19:31Z)
- arbLUNA-Max: TVL 232,095.99 arbLUNA ($35,893.99), APY 100.63 %; OPTIMIZATION SUMMARY period 203, vote "in about 4 hours",
  total expected rewards $355.14 (0.99 % in period, 67.09 % APY). Per bucket a "current → optimized" donut and a CHANGE VOTE
  mark: STABLE ✗ ($13.55: LUNA-USDC 89.62 → 100 %, LUNA-EURe 10.38 → 0; "Change would only lead to $-0.22 more rewards —
  skipped"), PROJECT ✗ ($139.10: FUEL 53.51 → 64.66, ROAR 33.60 → 28.28, ampLUNA 12.60 → 7.06, ASTRO 0.29 → 0; skipped, −$1.61),
  BLUECHIP ✓ +$8.01 ($80.97: USDC-EURe 90.01 → 55.27, PAXG 8.53 → 20.60, INJ 0.84 → 4.95, wBTC.atom 0.62 → 19.18),
  SINGLE ✗ ($121.52: ampROAR-ROAR 30.51 → 25.16, PAXG-wBTC 20.02 → 20.70, USDC-USDt 17.22 → 15.50, wBTC.creda 16.28 → 19.25,
  LUNA-arbLUNA 15.97 → 19.39; skipped, −$0.73).
- ampLUNA-Max: TVL 57,680.06 ampLUNA ($3,384.28), APY 104.01 %; total $71.04 (0.98 %, 64.74 % APY); every bucket ✓ (STABLE
  +$0.22: EURe 71.32 → 8.24, USDC 28.68 → 91.76; PROJECT +$2.05: ampLUNA 64.35 → 33.36, ROAR 19.66 → 0, ASTRO 15.94 → 11.45,
  USDC-SOLID 0.05 → 0, FUEL 0 → 55.19; BLUECHIP +$0.90: USDC-EURe 46.25 → 0, INJ 29.90 → 39.66, PAXG 23.85 → 45.82, wBTC.atom
  0 → 14.52; SINGLE +$1.22: USDC-USDt 96.52 → 76.69, wBTC.creda 3.48 → 12.96, LUNA-arbLUNA 0 → 10.35).
- arbLUNA-1 Week: TVL 250.45 arbLUNA ($36.73), APY 36.81 %, total expected rewards $0.
- Our captured product (`votion/optimization/current.json`, 18:20Z) matched these shares within ~0.5 pp everywhere except
  ampLUNA-Max STABLE (ours 100 % LUNA-USDC vs Votion 91.76 / 8.24).

## C. What Eris showed — in the two fixture files. Headline: Total Voting Power 32.08M VP "For Epoch 203", round ends in ~4 h;
LP list sums to $1,970,711 staked.

## D. The visual / presentation plan the owner asked for ("keep the user in mind … what does the user want to know")
Principle: every section opens with ONE sentence written from data, then the number that backs it, then the detail. Three
readers: a VOTER (has VP: where should it go, what changed, am I idle), a BRIBER (has $: where does it buy the most votes, will
Votion move), an LP (has liquidity: is my pool healthy, what does it earn, is money leaving). Structure the page as the three
questions they bring, in this order; leaderboards and community boards become one drawer at the end.

1. **WHAT IS HAPPENING THIS EPOCH** (top of page, replaces the six hero tiles as the opener; the tiles move under it as the
   "numbers behind the sentence"). One line: "Voting round 203 ends in 4 h 36 m · 32.08M VP total, 29.0M voting (90 %) ·
   $1.3K funded across 16 pots · Votion casts at the end and plans to move 3 buckets". Then MOVERS (keep as is, but the users /
   Votion split becomes two coloured segments of one bar per pool, no separate legend rows) and the BREAKDOWN (keep; default
   tab = Epoch 204 planned since that is the actionable view; the four bucket totals get a subline "VP used in this bucket —
   Eris reads 31.9 / 30.4 / 29.2 / 30.5M live"). Runway's two tabs fold in here as one strip: "0.05 % unlocks in 8 weeks ·
   66 locks ($1.5K) unlocked and never withdrawn · 13 pots empty in 2 epochs".
2. **WHERE SHOULD MY VP / MY BRIBE GO** — the Vote Market, rebuilt as a decision tool with a mode switch: "I have VP"
   (pick your lock type: ampLUNA-Max / arbLUNA-Max / other; the table answers "what does 1M of my VP earn per pool this round
   at Votion's rate, and where is Votion about to go") and "I have $" (the existing +$X ladder; the answer column reads "your
   $X would … · Votion moves if its re-solve gains > $0 (its rule) · our model's projection, back-test error N pp"). Every
   projection carries its confidence in the same cell. The "not funded through p206" warning stays but reads "funded from
   p204, not for this round". Rates shown as Eris does (a range) with our $/1M beside it.
3. **IS TLA HEALTHY** — the liquidity panel first (its one sentence is already right: "one-week outflow, then steady"), then
   Pool Health as today but with the four flags (healthy / watch / draining / high exit) explained once at the top and the
   per-pool line shortened to what changed (staked, net, next-epoch votes). "Where the rewards go" stays under it.
4. **DRAWER: Leaderboards & community** — Pool Tops, Voters (Utilization inverted to "idle VP"), OG / Newcomers / Top Bribers
   (take-rate rows labeled "Astroport take-rate — not a briber's choice"; bot wallets marked when the gate allows).
5. **One vocabulary, printed once** in a small legend under the opener: "voting round N (ends Sunday 23:59Z) → emissions
   epoch N+1 · total VP = every lock · voting VP = on gauges · idle VP = the difference · dotted APR = linear, flame = APY".
   Every number states its basis and epoch in the same words; no section carries its own.
Visual notes from the owner's screenshots: the page is dense and dark-on-dark; the six same-sized tiles give the wrong things
equal weight; popups are the only place history lives (make the sparkline visible on the tile); the Vote Market's yellow
"VP" column is the most-read cell and should be the widest; Breakdown's hatched bars need the legend on the bars, not below.

## E. Data facts settled in the 2026-09-20 chat (do not re-derive)
- Votion reward model / skip rule / solver gap: audit §6 + `votion-optimization.json`.
- Eris APR formula: AUDIT-eris-apr-pricing.md (validated 08-02); today's uniform −14.8 % on `incentives_usd_per_year` and the
  leaderboard's separate APR source: audit §4 + `eris-lp-list.json` (Rewards $ column = the re-validation target).
- VP words: audit §2 + `eris-vote-page.json` (32.08M total). Bucket totals may differ (withdrawn claim).
- Pots: 14/15 within 1 % (price); LUNA-EURe $9.99 on Eris vs "not funded for p203" ours — check the manager's period fields.
- Tile popups: audit §1 (three cron steps; the daily archive is the series; the astroport-epoch files are NOT).
- Bribe Runway header "period 202" is one behind. Movers/Breakdown are right; add the "Votion has cast" state.

## F0. SCOPE RULING (owner, 2026-09-20 late): someone is making VIDEOS of tla-stats right now
The page's SHAPE is frozen until those videos are out: section order, section names, tile layout, the Vote Market's columns,
the Breakdown's bars. Steps 1–5 below change nothing a viewer would recognise as moved — labels, more rows in the popups the
page already has, correct numbers under the same tiles, honest wording in the same cells. Step 6 (the §D restructure) is
STAGED ON test.html (the page's own staging pattern, Revs T1–T3) and reviewed there; the live page flips only on the owner's
word after the videos land. "Some stuff really bugs me" = fix in place; "worried about totally breaking it" = no layout change
on the live file. Every delivery to tla-stats.html in this window is gated with gate-tla-stats.mjs AND a screenshot-level
check that the section order and headings are unchanged.

## F. Order of work (= audit §11, = PROJECT_KNOWLEDGE opener 0)
1 vocabulary/labels · 2 tile history (daily-fold stamp → epoch-history rollup → modal; TVL + pool counts first) · 3 APR
(find the leaderboard's source; re-validate eris-apr stage 2 against Rewards $; make it a standing gate; one source) · 4
LUNA-EURe pot · 5 Vote Market honesty (threshold + back-test) · 6 the restructure in §D. Each step: fresh pull, gate on real
fixtures, one ZIP per repo, byte-verify, changelog line.

# Optimizer Watch Changelog

## optimizer-watch.html 1.4.1 — 2026-11-26 — a deposit token says what is behind it
- **The owner**, on the row "vcausdci": "what LP is this? … if you hover, a tooltip could say."
- **What it is, from the chain:** not an LP pair. The token is Credia's deposit token for USDC.inj — the token contract's own
  label names the asset and Credia's market lists this token as that asset's deposit token (`docs/fixtures/2026-09-29/
  credia-probe.json`). So the note states it; nothing is guessed.
- **Where it is kept:** `docs/curated/token_overrides.json` gains an optional `receipt_for { symbol, denom, protocol, kind,
  source }` and one entry. It sets no display name and no warning, and its note avoids the words the LP grades read as "bridged",
  so no name and no grade changes.
- **On the page:** such a name has a dotted underline and says on hover "Credia's deposit token for USDC.inj (lending market) —
  a single token, not an LP pair"; the opened row says the same in words (hover does not exist on a phone). Pools without a
  note are untouched. If the curated file cannot be read the page works as before.
- **Gate:** 70/70 (four new: the curated asset is the price registry's own denom for that symbol · the note on the page · no
  note elsewhere · file unreadable). Three planted faults, each caught.

## optimizer-watch.html 1.4.0 — 2026-11-26 — the whole width; every bucket at once, with a picture; a feed that reads as live
- **The owner:** "can this be compacted to show maybe 5–10 most recent or have a scrollable feed … this doesn't look or feel like a
  feed of live activity … an insane amount of free space left and right … you see Project but no others and the selector is at
  the very top — show all buckets in their own tiles … is there not a graph or chart … the vault by vault as small tiles, the
  largest selected by default", and the order of the page: header · countdown · live feed · error tile · big picture · vault by
  vault · where the numbers come from.
- **Order and width:** the page follows that order and is as wide as the screen (was 76rem). The header reads "Votion, in a
  transparent light — for anyone who wants more data, or wants to verify the optimization". The bucket selector is gone.
- **Countdown:** the two clocks with a bar of the voting week between them — how much is gone, and, striped at its end, the
  stretch from Votion's cast to the end of the round.
- **Live feed:** a LIVE mark, the time of the last read of the chain and the seconds to the next. Left: the bribes on chain right
  now, one row a pool, with whether Votion offers it. Right: ONE list, newest first — bribes added (+), taken back (−), a bribed
  pool leaving or rejoining Votion's list (!) — in a box that shows about five and scrolls.
- **The big picture:** four tiles, one a bucket, all shown at once (the bucket with missing pools first). Each opens with a
  picture: Votion's votes NOW and AFTER ITS CAST as one bar each, cut by pool; where bribed pools are missing a third bar, BY
  ITS OWN RULE, shows them as dashed pieces. A pool keeps one colour within its bucket (six colours checked for colour-blind
  separation on this background; green and red stay for gains and loses). Under the picture the pool rows as before; each tile
  ends in its own fold of every pool of the bucket.
- **Vault by vault:** eight small tiles (name, lockup, votes and share as a bar, ✓/✕ per bucket, expected rewards). The vault
  with the most voting power is picked first; the picked tile says "shown below", the others "show ›".
- **Kept across refreshes:** a row or fold the reader opened, and a list's scroll position, survive the minute's re-read.
- **Gate:** `gate-optimizer-watch.mjs` 66/66 on the live files (was 52): the order, no selector, the shares in every bar against
  the engine, the dashed pieces, one colour a pool, the feed's order, the week bar, the largest vault first, open rows kept.
  Eleven planted faults, each caught. Rendered at 1760, 1360 and phone width: no sideways scroll, no text under 13px.

## optimizer-watch.html 1.3.0 — 2026-11-26 — now vs expected as one picture; the selected vault is its own tile
- **The owner:** "the lockup by lockup view needs more separation so it is obvious it changes the tile below … the error text is
  a word wall and lacking visuals — the part that shows now vs should-be needs to be more clear … at the bottom of each pool in
  that tile an expandable of the other pools that visually shows the system sees them, or calls out errors … if there are errors
  maybe it changes or flashes."
- **NOW vs EXPECTED:** two boxes side by side — what Votion shows · what its own rule gives — each with votes and the pool's APR.
  Used in the alert, in a pool's row on the main card, and in a vault's bucket. The paragraphs are gone; one short line remains
  ("listed by Votion, not offered, no reason published").
- **The selected vault** is a framed tile of its own under the table: "Selected vault", its name and voting power; the picked row
  says "shown below"; a hint line sits between the two; the tile flashes when the pick changes.
- **Each bucket of a vault ends in a fold of every pool of the bucket**, each with a state chip (in the plan · offered, bribe under
  the rate · missing, possible error · no bribe · off the reward list). With nothing missing it is a plain fold ("every one
  accounted for"). When bribed pools are missing it turns red, pulses and says how many; the missing pools come first, each as
  the NOW vs EXPECTED picture.
- A bucket a vault **keeps** is drawn as kept (no red or green), with the optimizer's split said beside it.
- Gate `gate-optimizer-watch.mjs` 52/52.

## optimizer-watch.html 1.2.0 — 2026-11-26 — one picture for all of Votion; the rest folded away
- **The owner:** "we could do a way better job of adding visual elements and compacting text — sharp and easy to see quickly, with
  expandable details … for the whole view I was thinking combined, how all these will shift the LPs affected … if an LP is losing
  Votion votes then have a red bar over the current grey bar … a bar for the APR shift as a result … at the bottom a place to
  expand ALL LPs and why … the tiles following, I am confused by the layout."
- **One main card — Votion as a whole:** all eight vaults added together, one row a pool. A bar for Votion's votes (grey = stays,
  green = gains, red over the grey = loses, dashed outline = what its own rule would give a pool that is not offered) and a second
  bar for the pool's APR this round → next. Each row opens for the detail (the bribe, what LPs earn, each vault's published split,
  and the reason when a bribed pool gets no votes).
- **At the bottom of the card:** a fold with every pool of the bucket and one line on why it does or does not get votes — gets
  votes · offered, under the going rate · possible error, not offered · no bribe · off the reward list.
- **The alert** is three compact cards (bribe · Votion shows · its own rule gives · pool APR next round).
- **Folded:** vault by vault (the eight side by side, and each one in the layout of Votion's own page — now with the same red /
  green bars), the live bribes, where the numbers come from. The separate "bribed and no votes" and "every pool" cards are merged
  into the main card. Text cut throughout.
- Gate `gate-optimizer-watch.mjs` 47/47 (bar geometry checked against the engine's figures; three planted faults each caught).

## optimizer-watch.html 1.1.0 · lib/vote-market.js 1.6.2 — 2026-11-26 — a suggestion for Votion's page, in the layout of its pages
- **The owner, the same day:** "I'm not trying to build our own version, I'm trying to provide an example of what Votion can do to
  improve trust and transparency … you see the winner but you don't see the ones left out or why they were left out … I hate how
  there isn't a combined view of all of them." He attached Votion's vault list and all eight vault pages.
- **Reframed:** the page is titled *What Votion's page could show*; every part that is not on Votion's page today carries an
  "added" mark. It stays in the site's own look and says whose page it is (it is not made to look like Votion's site).
- **The alert (added), first on the page:** every pool that has a bribe and is not among the voting options — its bribe, what
  Votion shows (not offered), what its own rule would give (votes and share), marked "possible error". No reason is given
  because none is published.
- **All eight vaults, one view (added):** each vault's voting power and share of Votion, whether it changes or keeps its vote in
  each bucket with the gain Votion's plan gives, what it expects to collect; totals.
- **One vault in the layout of Votion's own vault page:** period · calculated · vote before · total expected rewards, then each
  bucket with current → optimized per pool, the change flag and Votion's own note, the expected rewards — and, **added under each
  bucket**, the pools that are in that vault's bribes and not in its options (marked "possible error — not offered", with the
  share the rule would give that vault), and offered pools that get 0% (under the going rate).
- **Vault names (engine 1.6.2):** the short vaults are **1 Week** and **3 Months** (12 weeks) — the engine called them 1-month and
  12-month. All eight page ids were checked against the chain read (`votion/chain/vaults.json`): id ↔ name ↔ contract match the
  names and contract endings on Votion's own pages. TLA Stats' Votion total already counts all eight (10.19M votes a bucket).
- **Found, not changed here:** the two Claim vaults and Votion's settings contract are not in the Contract Watch list or in
  `known_contracts.json`, and the votion cron's on-chain vault products find vaults by one code id, which the Claim vaults do
  not share.
- Gate `gate-optimizer-watch.mjs` 44/44 (nine new checks); `gate-vote-market.mjs` 168/168 on two data sets after the name fix.

## optimizer-watch.html 1.0.0 — 2026-11-26 — a vote optimizer's decision, shown in full
- **The owner (2026-11-26):** "Could we build an example of what trust and transparency would look like, so when we say this
  isn't working — we can't prove why — we can suggest making it more clear so we don't need to question it." Four parts asked for;
  hosted under Tools.
- **What it is:** aDAO's own page, in the site's own look, and it says so at the top: not Votion's page, not affiliated with
  Votion or Eris; an example of what an optimizer's page could show, built only from public data. It uses none of their marks.
- **Two deadlines, side by side:** Votion's weekly cast (the hour it fell in on the rounds on record) and the end of the round
  (the gauge's flip, Monday 00:00 UTC), each counting down, with the hours between them said plainly.
- **1 · What Votion plans to do:** every pool it has votes on now or after its cast — votes now → after, the change, its share of
  Votion's vote, the bribe and what it pays per 1M votes, the pool's APR this round → next, what LPs earn a week. Each vault with
  what it will do and Votion's own note.
- **2 · Bribed, and no votes — why:** every bribed pool that ends with none, each with the reason the data gives: *not offered*
  (the published plan lists the bribe and does not offer the pool; no reason is published and the page does not guess one — with
  what the rule would do if it were offered), *offered and under the going rate* (with about how much more it needs), or *off the
  reward list*.
- **3 · Every pool** of the bucket, every DEX, on the list or off, with its votes, Votion's votes and its bribe or "none".
- **4 · The round's bribes as they change:** the bribe contract read live in the visitor's browser every minute, with every change
  since the page was opened; the recorded adds and withdrawals with their transactions; and the log of when a bribed pool left
  Votion's list or came back (`votion/options-log.json`, cron-votion-log.md).
- Engine: `lib/vote-market.js` 1.6.1 (the Vote Simulator's) — one set of numbers across the site.
- Gate `gate-optimizer-watch.mjs` 35/35 on the real products, the chain's own pots for the round and the options log; five planted
  faults each caught. Rendered on a desktop and a phone: no text under 13px, no sideways scroll.
- Tools 1.10: a tile. Footer and sitemap entries.

# Contract Watch Changelog

## contract-watch.html 1.4.2 · contract-watch-alerts 1.0.0 — 2026-11-26 — the older marked changes are linked; the home page gets a Contracts tab
- **The owner:** "I thought you said 4 in total — why do I only see 2?" The box at the top of the page counts the last 30 days
  (the two changes of 24 Nov). The two older marked changes (1 Oct 2025, 8 Oct 2024) were in the list but the box did not say so
  while it was showing. **Now** it adds "2 older changes on record also need a look", a link that opens all of them.
- **One list.** The marked changes are one function on the page (`lookList` / `alertsData`): the box, the gate and the new file
  below read it.
- **`contract-watch/alerts.json` (new, public)** — every change on record that the page marks "needs a look", newest first:
  key, time, title, contract, how it was sent, each reason as a sentence, transaction. Built by `.github/scripts/contract-watch-alerts/build.mjs`,
  which loads the page itself in jsdom against the record — the rule is not written a second time. It refuses to write when the
  page could not read the record or a governance capture did not load. Workflow *Public · Contract Watch alerts — what needs a look*:
  not scheduled; runs when the record or the groups file changes, or by hand (by hand after the page's rule changes). Public
  files only, no node, no secret. A run that finds the same list leaves the file alone.
- **Home page (index 4.48, `lib/contract-alerts.js` 1.0.0):** a Contracts tab beside Props. Quiet: a plain link to this page.
  When a change of the last 30 days is marked, the tab glows with the count and opens a panel listing each one, linked to its
  entry here. See index-log.md.
- Gates: `gate-contract-watch.mjs` 102/102 (two new checks; the wider-inventory check now reads the same inventory file the
  page is served); `gate-contract-alerts.mjs` 17/17.

## contract-watch-archive 1.0.1 — 2026-11-25 — a contract too busy to count no longer leaves the backfill open
- **What happened:** the first two real runs (09:55 and 11:39 UTC) each ended with one search left — the count of executes on a
  token contract. The node gives no answer to that count, so the search stayed open and the record stayed "not complete" although
  9,442 of 9,443 searches were read and every check agreed.
- **Now:** when the node cannot count a contract's executes (no answer; asked once more, lightly), the contract is closed as too
  busy to read in full — it is read by action name, by the DAO that sent a change and by key-holding account, like every busy
  contract — and listed: `report.searches.uncounted`, `census … executes_not_counted`. Migrations and admin changes are found for
  every contract regardless. The limits line of the report says so.
- Gate `mock-run.mjs` 60/60 (three new checks: closed and listed after two asks, its changes still found, not asked again; one
  expectation that was tied to the record before the backfill now follows the record).
- The page gate's seven record-tied expectations follow the record too (site `7f68f87`, 99/99).

## Rev 1.4 → 1.4.1 — 2026-11-25 — the tab bar

- The tab bar is the site's one list (lib/site-header.js 1.14.0): Overview · Member Portfolio · Slippage Simulator · Vote Simulator ·
  LP Grades · Contract Watch · PD Watch. Pools and Docs are off the bar. The tabs wear the site's tab colours here too (the page's
  link colour had been painting every tab cyan), and on a phone the lit tab is brought into view by the lib. Nothing else on the page
  changed. Gate 100/100.
- The help bot can now answer from this record: see help-log.md v1.24.0 and `docs/ecosystem-knowledge/contract-watch.md`.

## Rev 1.3 → 1.4 — 2026-11-25 — what a role is for, in the contracts' own words

Owner: for a change that was forced through, show what was and what the change makes possible.

- **The contracts were asked.** `contract-watch/guards.json` (tla-core Action *contract-watch-guards*, public nodes,
  simulation only, nothing signed): a message of each kind of change, sent from an address without any role, and the
  contract's own answer. 42 kinds asked; 29 answered with a role. The four roles that moved on 2026-11-24:
  `ASSET_WHITELIST_CONTROLLER` — the reward lists of the four staking contracts; `DELEGATION_CONTROLLER` — the Alliance's
  stake in the four connectors and the PDT treasury contract; `BRIBE_WHITELIST_CONTROLLER` — the bribe manager's list of
  tokens allowed as vote incentives; `VE_GUARDIAN` — the blacklist of the lock that gives voting power.
- **On the page:** beside a marked change, what each moved role is required for; on a change that was sent directly,
  which role its contract requires of a sender and — when the record shows it — that the sender was given that role one
  message earlier in the same transaction; in "Who holds the keys", role by role and per holder. An answer counts only
  for the code the contract ran when it was asked: after an upgrade the line is gone until the contract is asked again.
- **How an account signs.** `contract-watch/accounts.json` (the chain's own account record, same Action): where control
  moves to an account the page says "an account with one key" (or "needs m of its n keys"). Also in the look-up and
  beside an admin in "Who can upgrade the Alliance's contracts". The keys themselves are not kept.
- Gate 100/100 on the real record and the real answers.

## Rev 1.2 → 1.3 — 2026-11-25 — needs a look

Owner: the page has to be quiet when there is nothing to worry about and draw attention when something is a big deal;
for a change that was forced through, show what was and what the change makes possible.

- **A banner over the page.** "Nothing out of the ordinary in the last 30 days" with the plain count, or each change
  that needs a look with its reason in one line. On the real record 2 of 287 changes are marked, both of 24 Nov 2026.
- **A change is marked only for what the record itself shows**, each reason a sentence that can be checked:
  control moved from a DAO to an account (a role in the address book, or an admin key) · sent directly where every
  earlier change of that kind to that contract came by proposal · sent directly while a vote on the same kind of change
  was open, or after one did not pass · a difference a state read found that no transaction explains, where the record
  is complete for the time between the reads. A passed proposal and the weekly routine are never marked. The mark is not
  a verdict; "How to read a change" says what it means.
- **What was, what is.** A change of the address book that carries its message shows a table: each role, who held it
  before, who holds it now — and says where "before" comes from (the state read before the change; the block before the
  change once the one-time archive read has it). The reason also lists what that account has sent directly since.
- **Filter and link.** "Needs a look" beside the How filters; `#att=look` opens that view.
- **Beside an address:** "admin of N" when the chain names it as the admin of watched contracts. Look-up: the proposals
  an address voted on, from the DAOs' own vote records (the address and its weight, never a name).
- **Ready for the one-time archive read** (`contract-watch/archive`, `contract-watch/state/history`): coverage shows it
  under way and, when complete, the four checks against the chain; a contract's settings before and after a change; what
  the contracts themselves require a role for, once that has been read.
- The catch-up now reads the first days of September before November (it was four hours ahead of the oldest block the
  public nodes hold); `contract-watch/rewalk.json`.
- Gate 88/88 on the real record.

## Rev 1.1.1 → 1.2 — 2026-11-25 — which change set a role; the catch-up in dates

- **Who holds the keys**, role by role: where a change on record carries its own message and that message names the role
  and its holder, the role reads "Set to this holder on <date> — <how>" and links to the change. An address-book change
  that carries its message is titled by what it set ("set 4 roles").
- The message as sent is folded where the plain words already list what changed (reward lists), open where the events
  said little (the address book, settings).
- **What this record covers**: the catch-up shown as stretches of the chain, oldest first, each in dates (the exact times
  of its first and last block once the job has them; the catch-up file's own label, marked "about", until then), with one
  overall percentage under the tiles. November is read before September–October.
- "Latest" treats one state read's address-book differences as one item.
- Gate 65/65. On the real record: the message of the 2026-11-24 address-book change names four roles, each set to the
  sender — exactly the roles the state read saw move to that address.

## Rev 1.1 — 2026-11-25 — the message as sent

- A change that was sent directly now shows **the message as sent** when the record carries it (org-tla-flows 3.8.0 reads it
  from the transaction's own bytes): the call's own name and its values as short lines; a list of role–address pairs reads
  "ROLE → holder". Nothing is interpreted beyond that. Where the message went to another contract than the one that
  changed, the row says so.
- A listed address the last state read got no answer for as a contract says that, instead of "not read yet".
- Gate 61/61 (+ the naming rule: a contract carries a DAO's name only where that DAO is its admin in the state read).

## Rev 1.0 — 2026-11-25 — the page

Owner request: a place where anyone can keep tabs on the Alliance's contracts — who changed one, what they changed and
when, and whether the change came through a passed proposal or was sent directly. A tab in the TLA Stats tab bar.

- **Changes** — every recorded change, newest first, in plain words ("Removed 3 assets from the reward list"). Each says
  how it arrived: **Passed proposal** (the proposal's number, title, status and votes, linked to DAO DAO, and who pressed
  execute), **Sent directly** (the sender's address and the roles it holds; "no proposal was executed in this
  transaction"), or **Seen in a state read** (before and after between two reads of the chain — not the sender). Filters:
  how, what (reward lists, code upgrades, admin, roles, settings, DAO structure, delegation, reserves), group, free search
  (contract, address, transaction, asset, "A117"). The weekly distribution is routine and hidden unless asked for.
- **Marked from the record itself**: a change sent directly where every earlier change of its kind to that contract (three
  or more) came through a passed proposal says so. A change sent directly also lists the proposals that asked for the same
  kind of change on the same contract and did not execute, with their votes and how many of the same assets they name.
- **Votes that would change a watched contract** — open proposals whose messages would change a grouped contract, and
  whether a change of the same kind was sent directly since the vote opened.
- **Contracts** — the groups of `docs/curated/contract-watch.json` (TLA control, the four buckets, Rewards, LP tools, PD
  Stewardship DAO, Votion vaults, Liquid staking, Alliance DAO, pools, Solid, …). Per contract: address, role, admin (who
  can upgrade it), code id, creator, the chain's own label, when that was read, and its own timeline.
- **Who holds the keys** — the address book (the global config's role → address map) by holder and role by role, with who
  held a role before when a state read saw it move; who can upgrade the Alliance's own contracts; and a button that reads
  the address book from a public node in the visitor's browser and compares it with the page.
- **Look up an address** — what it sent directly, the passed proposals it executed, the roles it holds, the watched
  contracts it is admin or creator of; on request the same across the 1,700+ contracts of the deep-history inventory. A
  transaction hash finds that transaction's changes.
- **What the record covers** — the stored history, the stretch that is not on record, the catch-up in progress, the live
  stream and the state read, each with its dates; links to the raw files.
- Links open one thing: `#k=<change>`, `#contract=<address>`, `#address=<address>`, `#tx=<hash>`, `#view=…&how=…&kind=…`.
- The page states what the chain shows and does not say why. No address is typed in the page: they come from the record,
  the groups file and the state read. Data shown as text, never as markup.
- Data: `contract-watch/events/**`, `contract-watch/index.json`, `contract-watch/state/current.json`,
  `contract-watch/rewalk.json`, `docs/curated/contract-watch.json` (org-tla-flows 3.6.0–3.7.0), the governance captures
  in dao-originations, the token catalog for asset names.
- Gate `gate-contract-watch.mjs` 57/57 on the real record (every expected number recounted from the files).

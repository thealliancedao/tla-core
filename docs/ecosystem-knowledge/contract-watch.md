# Contract Watch — who changed a Liquidity Alliance contract, what, and when

> Plain-language guide to **theadao.com/contract-watch.html** (the Contract Watch tab of TLA Stats), live since 2026-11-25.
> Read by people and by the help bot. The page states what the chain shows — what changed, when, who sent it and how.
> It does not say why, it names no person, and it gives no verdict. Neither does the bot.

## What it is for

A protocol's contracts can be changed after you deposit: the code can be upgraded, a reward list edited, a role handed
to another address, a setting moved. Contract Watch keeps every such change on record so anyone can check it instead of
taking a protocol's word: **what changed, when, who sent it, and whether it came through a passed proposal or was sent
directly.** Most changes are ordinary. The page stays quiet about those and marks the few that left the usual route.

## The page, top to bottom

- **Needs a look** banner (only when something is marked), then four tiles (changes on record · through a passed
  proposal · sent directly · seen in a state read), the latest change, and one line on what the record covers.
- Four views: **Changes** (the list, filters How / What / Where, search by contract, address, transaction, asset or
  proposal number), **Contracts** (every watched contract by group: its code id, its admin, its changes), **Who holds
  the keys** (every role in the TLA address book, who holds it, what it is required for, how the holder signs) and
  **Look up an address** (everything on record that an address changed, the contracts it can upgrade, the roles it holds).
- "How to read a change" and "What this record covers" at the bottom.
- Links: `contract-watch.html#k=<record key>` one change · `#contract=<address>` one contract · `#address=<address>` one
  address · `#tx=<hash>` one transaction · `#att=look` only the marked changes · `#view=roles` who holds the keys ·
  `#how=direct`, `#kind=upgrade`, `#bucket=<group id>` filters.

## What is watched

Every contract on the chain for **code upgrades, admin changes and new code stored**; and for the watched contracts
(166 on 2026-11-25, in 19 groups — the list is `docs/curated/contract-watch.json`) also reward lists, settings, roles,
DAO structure, delegation, reserves, pause and blacklist. Groups: TLA control (the address book, the weekly vote, the VP
lock), the four buckets (Stable, Bluechip, Project, Single — each a staking contract and its Alliance connector),
Rewards, LP tools, the PD Stewardship DAO, Votion vaults, Liquid staking, Alliance DAO, pools on Astroport and
SkeletonSwap, Solid, Lending, other DAOs, NFT, bridges, tokens. A name and a group come from that file; a contract not in
it shows the label the chain gives it under "Not grouped yet".

## The kinds of change

Reward lists (which assets a bucket pays) · Code upgrades (`migrate`: the contract now runs other code) · Admin (the
address that can upgrade a contract changed, or was removed) · Roles (the address book now names another holder) ·
Settings · DAO structure (members, modules, sub-DAOs) · Delegation (where the alliance's stake is delegated) · Reserves ·
Pause and blacklist · New code uploaded. The **weekly distribution** (the epoch's reward split, every Monday) is routine:
it is kept, hidden unless you ask for it, and never marked.

## How a change arrived (the route)

- **Passed proposal** — the change is a DAO proposal being executed. The record names the DAO and the proposal number;
  the page shows the vote and links it on DAO DAO.
- **Sent directly** — an account signed the change itself; no proposal was executed in that transaction. Some powers
  belong to an account (an admin key, a role), so this is the usual route for those. It is not, by itself, a problem.
- **Seen in a state read** — the chain gave one value at one read and another at the next. The record has before and
  after, and the two read times — not who sent it. The transaction is in the record too when the walk saw it.

## "Needs a look" — the mark

A change is marked when the record itself shows one of four things:

1. **Control moved from a DAO to an account.** A role or an admin key that took a passed vote to use can now be used by
   whoever holds one account's key.
2. **Not the route it took before.** Every earlier change of that kind to that contract (three or more) came through a
   passed proposal; this one was sent directly.
3. **A vote on it was open, or did not pass.** A proposal asked for the same kind of change on the same contract, and
   the change was sent directly anyway.
4. **No transaction explains it.** A state read found a difference and the record, complete for that time, holds no
   transaction for it.

A passed proposal being executed is never marked. Neither is the weekly routine. **The mark is not a verdict**: it says
where a change left the usual route, with the reason beside it, so that anyone can check it. It does not mean funds are
at risk, and no mark does not mean a change is good. The page works the marks out when it loads; they are not a file.
For what is marked now, open `contract-watch.html#att=look`.

## What was, and what is

For a role change the page shows a table — Role · Before · Now — and says where "before" comes from: the block before
the change (read from an archive node) or the last state read before it. No source, nothing shown; never a guess. For
an upgrade it shows the new code id and, when the contract reports them, its name and the version before and after. For a
reward list it lists the assets added or removed by name. For a change that was sent directly it shows the message as
sent, when the record has it.

## Roles, and what each one is for

The **address book** (the TLA global config) maps each role to one address. What a role is *required for* is not taken
from documentation: each contract was sent a real message of each kind **in simulation** (nothing signed, nothing
changed) from an address that holds no role, and the contract's own refusal named what it requires
(`contract-watch/guards.json`). As read on 2026-11-25:

- `ASSET_WHITELIST_CONTROLLER` — required to add assets to, or remove them from, a bucket's reward list, and to change an
  asset's settings, on the four staking contracts.
- `DELEGATION_CONTROLLER` — required to delegate, redelegate or undelegate the alliance's stake, on the four connectors
  and the PDT treasury contract.
- `BRIBE_WHITELIST_CONTROLLER` — required to add tokens to, or remove them from, the list allowed as vote incentives, on
  the bribe manager.
- `VE_GUARDIAN` — required to change the blacklist on the VP lock.
- The address book itself answers "Caller is not the contract's current owner" to a role change; the PD member group
  answers "Caller is not admin" to a member change.

An answer counts only for the code the contract ran when it was asked; after an upgrade it is asked again.

**Admin** is separate from roles: the admin of a contract is the address that can upgrade (replace) its code. No admin =
the code cannot be replaced. A DAO as admin = by vote. An account as admin = by that account's signature.

## How an account signs

For every account that holds a role or an admin key, the chain's own account record says how many keys it needs
(`contract-watch/accounts.json`): **one key**, or **m of n keys** (a multisig), or none yet (it has never signed). That
is all it says. It does not say who holds a key, how a key is stored, or whether several people share one. A holder
that is a DAO (its members vote) or another contract is shown as that.

## What the record covers — and what it does not

| Span | Source |
|---|---|
| 2023-12-11 → 2026-06-16 | history derived from the chain walks already stored in tla-core |
| 2026-06-16 → 2026-09-01 | **not captured** — public nodes no longer hold those blocks |
| 2026-09-01 → 2026-11-25 | a catch-up walk through public nodes, in progress (`contract-watch/rewalk.json`) |
| 2026-11-25 → | the live walk, every 15 minutes (org-tla-flows) |

A daily read of each contract's state (code id, admin, the address book) catches a difference even where the walk has a
hole — that is the "seen in a state read" record. Not seen by any of it: a change made by chain governance at the end
of a block, and a setting whose contract reports no action. **A blank is not "nothing happened"; it is "not read".**

**The one-time archive read.** A script is ready that reads every change since the chain began from an archive node —
plus the message as sent and each contract's state in the block before and the block of a change — and fills the hole
above (`contract-watch/archive/`, `contract-watch/state/history/`). The archive node is a courtesy to the project, so the
read is started by a person, one run at a time, paced, and is never scheduled. Until `contract-watch/index.json` carries
an `archive` block it has not run; the page's coverage lines say which.

## The files (tla-core)

`contract-watch/index.json` (months, counts, coverage — read first) · `contract-watch/events/<YYYY>/<MM>.json` (the
records) · `contract-watch/state/current.json` (each contract now; the address book) · `contract-watch/guards.json` ·
`contract-watch/accounts.json` · `contract-watch/rewalk.json` · `docs/curated/contract-watch.json` (groups and names) ·
changelog `docs/changelogs/contract-watch-log.md`. The help bot reads them with its `contract_watch` tool.

## For the help bot — how to answer

- Facts from the tool, in the page's words: what changed, on which contract (its name from the groups file), when, by
  which route, sent by what kind of sender (a DAO's proposal, a contract, an account with one key / m of n keys).
- Never "safe", "unsafe", "attack", "rug", "malicious", "suspicious", "illegal". Never a motive. Never a person: an
  address is an address; name it only as the groups file or the DAO list names it. Never guess who holds a key.
- "Is this a problem?" → say what the record shows and what the role or admin key lets its holder do, say the mark is
  the page's and link it, and that the decision is theirs. Do not decide a mark yourself.
- Always link the change (`contract-watch.html#k=…`), the contract or the address so the visitor can check it.
- If the record does not cover the time asked about, say so with the span — not "nothing changed".

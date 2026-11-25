# Contract Watch Changelog

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

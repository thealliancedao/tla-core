# contract-watch-guards — who may send a change, asked of the contracts

When a role in the address book moves, the record shows who holds it now. It does not show what the role is for, and the
contracts' source is not public. The contracts say it themselves: a message that needs a role, sent by an address
without it, is refused with the role's name.

For every kind of change the contract-watch record holds (a contract and the name of the call) this takes the newest real
message of that kind — the message as sent on a record, or a DAO proposal's own message — and asks a public node to
**simulate** it from an address that holds no role and no admin key. Nothing is signed and nothing is broadcast.

- **Public nodes only.** No secret; the script refuses to run when an archive setting is present.
- One request at a time, at most 2 a second, at most `max` simulations a run.
- A kind already answered for the code its contract runs now is not asked again; after an upgrade it is.
- Output: `contract-watch/guards.json`. Each answer: `role` (the role the contract named), `address` (the one contract it
  expects), `account` (it expects one account — not kept), `unnamed`, `open` (it went through), `shape` (the contract no
  longer accepts that form), `other`, `failed` (no node answered).

Run: Actions → *contract-watch-guards* → Run workflow. It also runs when this script or its workflow changes.

Gate: `CW_DIR=<tla-core checkout> TLA_CORE_DIR=<checkout with the registries> DAOO_DIR=<dao-originations checkout> PLATFORM_CRONS_DIR=<platform-crons> node .github/scripts/contract-watch-guards/mock-run.mjs` — 18 checks.

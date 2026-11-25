# contract-watch — who changed a contract, what, and when

Every event that changes what a contract **is** or **does**, read from the chain's own transaction events.
Written by `org-tla-flows` (platform-crons `tla-flows/lib/admin-classifier.js`); history derived by
`tla-flows/backfill-contract-watch.js` from the walks already stored in this repo.

## Files

- `events/<YYYY>/<MM>.json` — an array per month, sorted by height then `k`.
- `index.json` — the months of `events/` and what each holds (records, changes that are not the weekly routine, first and
  last time). Read this first: a page cannot list a folder.
- `state/current.json` — what each watched contract IS now, as the chain reports it (code id, admin, creator, label), and
  the TLA address book (the global config's role → address map, `{"all_addresses":{}}`). Read once a day and in any run
  that files a change. Each entry carries the time of its own read. Until the first live read it holds two stored reads:
  the address book of 2026-08-11 (the legacy registry) and the contract inventory of 2026-09-29 (`docs/deep-history`).
- `rewalk.json` — block spans being walked again for contract changes (the months before the live stream), with progress.
- `backfill-report.json` — what the history derive read and found.
- `../docs/curated/contract-watch.json` — the watcher's groups: which group each contract is in and the name shown.
  Edit it to regroup or rename. Every contract listed there is watched.

## A record

| Field | Meaning |
|---|---|
| `k` | `txhash:n` — unique; the n-th change in that transaction |
| `txhash`, `height`, `timestamp` | the transaction |
| `kind` | `upgrade` · `admin` · `code` · `list` · `setting` · `role` · `governance` · `delegation` · `guard` · `reserve` · `epoch` |
| `contract` | the contract that changed (`null` for `code`: new code stored, no contract yet) |
| `action` | the chain's own name for it: `migrate`, `update_admin`, `clear_admin`, `store_code`, or the contract's action (`asset/remove_assets`, `zapper/update_config`, …) |
| `detail` | the event's attributes (for an upgrade: `code_id` and, when the contract reports them, previous / new name and version) |
| `signer` | the account that sent the message |
| `msg_type` | the message type (`/cosmwasm.wasm.v1.MsgExecuteContract`, `…MsgMigrateContract`, …) |
| `via` | `{ kind: "dao_proposal", dao, proposal_module, proposal_id }` when the change is a DAO DAO proposal being executed · `{ kind: "authz", grantee }` · `null` when it was sent directly |
| `routine` | `true` on the weekly distribution (`kind: "epoch"`) |
| `observed` | `"state-read"` on a record that comes from comparing two reads of the chain instead of from a transaction: `txhash` and `signer` are `null`, `detail` holds `before`, `after` and the two read times (`seen_after`, `seen_by`); for the address book also `role`. The transaction that made the change is in the same stream when the walk saw it. |

## What is kept

- **Every contract on the chain:** upgrades, admin changes, new code stored.
- **Watched contracts** (platform-crons `config/contracts.js`, `docs/curated/known_contracts.json`, the capture registry,
  and the optional `docs/curated/contract-watch.json`): list, setting, role, governance, delegation and reserve changes,
  and the weekly distribution.
- **Anything a watched DAO's passed proposal changes**, on whatever contract it lands.

User actions and callbacks are not changes and are not kept.

## Coverage

| Span | Source | Complete for |
|---|---|---|
| 2023-12-11 → 2025-01-07 | the FCD archive (`archive/fcd`) | the contracts that archive was taken for; upgrades and admin changes rebuilt from the messages (no code id kept there) |
| 2025-01-07 → 2026-06-16 | the archive walk (`tla-flows/raw`) | the contracts of the capture registry |
| 2026-06-16 → about 2026-09-10 | — | **not captured** — the walk kept flows only then, and the public nodes no longer hold those blocks |
| about 2026-09-10 → 2026-11-25 | the catch-up walk (`rewalk.json`), in progress | as the forward walk; `rewalk.json` shows how far it is |
| 2026-11-25 → | the forward walk, every 15 minutes | every contract for upgrades / admin changes / stored code; the watched contracts for the rest |

Not seen by any of these: a change made by chain governance at the end of a block (it is not in a transaction's events),
and a setting whose contract emits no action.

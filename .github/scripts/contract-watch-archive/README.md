# contract-watch-archive — the one-time backfill from an archive node

The contract-watch record (`contract-watch/`) is complete from 2026-11-25. This fills what came before: every change of
every watched contract since the chain began, the message as sent, and what a contract was in the block before and the
block of a change. It runs once. After it, the forward capture (platform-crons `tla-flows`) is all that is needed, and
that does not use the archive.

## The rules it keeps

- **Started by a person only.** The workflow has one trigger, "Run workflow". No timer, no start on push.
- **One request at a time**, at most `rps` a second (ceiling 4). One archive job at a time across the repository.
- **Budgets**: stops at `max_requests` (ceiling 20,000) and `max_minutes` (ceiling 300). Everything read is filed first.
  Press Run workflow again and it carries on at the page where it stopped.
- **A busy node** (429, 502–504, no answer) is asked again after a pause. **A refusal** is never asked twice, and its
  reason is kept in the manifest. Six failures in a row end the run.
- **No block range in a search** unless one is typed in: a range makes an older node scan every transaction of the range.
- **No account's whole history.** An account is asked for only together with a contract: what a key-holding account sent
  to that contract.
- **No memo, ever.** Messages are read from the transaction body; the memo, the fee and the signatures are not read.
- The log prints counts. The node's address is never printed.

## What to run

1. Actions → **Archive · Contract Watch backfill** → Run workflow, everything as it is (every box of the form begins with what to
   leave it at; `phase: all`).
2. When it ends, read the last three lines of the log. "Done: nothing left to read" — finished. "Run the workflow again"
   — press it again; nothing is read twice.
3. The result is in `contract-watch/archive/report.json`; the proofs are under `verify`.

`phase: census` first is optional: it only counts (a few hundred requests) and writes
`contract-watch/archive/census.json`, which shows how much there is to read.

## What it reads

| Search | For | Why |
|---|---|---|
| `migrate._contract_address='X'`, `update_contract_admin._contract_address='X'` | every watched contract | wasmd's own events: complete, and few |
| `execute._contract_address='X'` | a quiet contract (at most `ALL_CAP` = 1,500 executes) | every transaction, so nothing depends on knowing an action's name; the census lists every action the contract reported |
| `message.sender='<DAO core>'` | each DAO in `docs/curated/contract-watch.json` | every proposal it executed, whatever it changed |
| `wasm.action='<name>'` (+ `AND wasm._contract_address='X'` when the action is common) | the change actions the record already holds | a busy contract is never asked for all its transactions |
| `message.sender='<account>' AND execute._contract_address='X'` | accounts that hold or held a role or an admin key × busy contracts of the alliance's own groups | a change with an action name the record has not seen |
| `migrate._contract_address EXISTS`, `update_contract_admin._contract_address EXISTS` | the whole chain, when there are at most `chain_cap` | the forward walk keeps upgrades and admin changes for every contract |

Which group is read how is in `docs/curated/contract-watch.json` (`archive_read`, `archive_senders`).

**Limit, stated in the report:** on a busy contract, a change with an action name never seen before, sent by an account
that holds no role and no admin key, is not found. Upgrades and admin changes are found for every watched contract
regardless, and the proofs below would show a missing upgrade.

## State at past heights (`phase: state`)

- The address book (`{"all_addresses":{}}` on the global config) in the block before and the block of every change of
  that contract → `contract-watch/state/history/address-book.json`.
- Each watched contract: ContractInfo at the end of the range, its ContractHistory, its admin in the block it was
  created → `contract-watch/state/history/contracts.json`.
- `{"config":{}}` before and after every change on record, kept as the paths that differ →
  `contract-watch/state/history/config-changes.json`.

The node holds contract state from block 7,324,381 (2023-10-23). An earlier block answers "not held"; that is recorded,
not retried.

## The proofs (`verify`, no node reads)

1. Every migration in a contract's own code history has a record. A missing one is named (contract, block, code id).
2. Each contract's admin at the end of the range is what its admin at creation plus the admin changes on record give.
3. The address book after one change is the address book before the next: nothing changed it in between without a record.
4. Every change that was on file before the backfill, inside the block range, was shown again by the node.

## Merge

A transaction the archive reads replaces what was on file for that transaction, when the archive's reading holds
everything that was on file (same or more records). When it holds less, what was on file stays and the transaction is
listed under `differs` in the report. Records without a transaction (state reads) are never touched. A month never shrinks.

## Gate

```
TLA_CORE_DIR=<checkout with tla-flows/raw> CW_DIR=<checkout with contract-watch/> PLATFORM_CRONS_DIR=<platform-crons> \
  node .github/scripts/contract-watch-archive/mock-run.mjs
```

57 checks against a stand-in archive node built from seven real parts of the stored walks: the same records as the forward
classifier gives, field for field; budgets and carrying on; a busy, refusing and silent node; old-format answers; the merge
rule; state reads and the four proofs (with planted faults); publishing by git while another writer pushes; the workflow's
single trigger and ceilings.

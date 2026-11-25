# votion-chain-read — what the chain itself says about the Votion vaults

The Votion vaults hold locked voting power and vote in the weekly gauge. Their pages show a plan; this reads what the chain
holds for the contracts themselves, so that anyone can check it:

- **the contract record** — the code each vault runs, the address that can upgrade it (admin), its creator, its label;
- **the code history** — every code the contract has run, the block of each change and the message of that change. A
  change of code is always in it; nothing has to be found in old transactions;
- **its settings**, as the contract reports them — `config`, and the other queries the contract lists that take no argument
  (the list is the contract's own: it is asked for a query it does not have and names the ones it has);
- the same for a **settings contract a vault points to** (one step), and the settings of the gauge and the bribe manager;
- for an **account** named in a vault's settings or as its admin: how many keys the chain's account record shows it needs.
  Never the keys.

Rules: GET requests to public nodes only — nothing is simulated, signed or sent; no archive node and no secret (the script
refuses to run when an archive setting is present); one request at a time, at most 2 a second, at most `max` a run. A query
whose answer would list depositors or positions, or a long series, is never sent (`queries_not_sent` names them).

Output: `votion/chain/vaults.json`. What it does not hold: a setting changed by a message that is not a change of code
(`update_config`) is a transaction — those are in `contract-watch/events/`. Heights are block heights; the time of a change
is on the contract-watch record when it holds the transaction.

Run: the Action **Public · Votion vaults — what the chain says** (`votion-chain-read.yml`), by hand, or it runs when the
script changes. Check without a network: `node .github/scripts/votion-chain-read/mock-run.mjs`.

# The Actions in this repo — what each one is

Every Action's name begins with its group, so the list in the Actions tab reads in three blocks:

- **Archive ·** — reads the archive node. The node is a courtesy: these start only when a person presses *Run workflow*, one at a
  time (a second one waits behind the first), never on a timer.
- **One-time ·** — jobs and probes that did their work once. Kept for the record; there is nothing to press.
- **Public ·** — tools on public nodes or public APIs. Run one when you want what it makes.

To run one: Actions tab → pick it in the list on the left → **Run workflow** (right side, above the list of runs) → the green
**Run workflow** at the bottom of the form.

An Action's *file name* never changes; docs and changelogs name Actions by file (`dex-history`, `deep-walk`). "Last run" is as of
2026-11-25.

## Archive · (the archive node — by hand, one at a time)

| Name in the Actions tab | File | What it does | Last run |
|---|---|---|---|
| Archive · Contract Watch backfill | `contract-watch-archive.yml` | Every change of every watched contract since the chain began, the message as sent, and each contract's state before and after a change → `contract-watch/`. Every box of its form begins with what to leave it at. If its log ends "Run the workflow again", run it again: it carries on. | not yet |
| Archive · Deep Walk (wallet history) | `deep-walk.yml` | Every transaction and the monthly balances of the cohort's wallets → the private archive repo; only counts are published here. Runs in modes, in order (its form lists them). | 2026-10-05 |
| Archive · DEX history (weekly volume) | `dex-history.yml` | Weekly swap volume and trader counts per TLA pool → `dex-data/history/weekly.json`. | 2026-11-24 |
| Archive · Entity verify (who controls) | `entity-verify.yml` | A contract's on-chain admin and label, read before the contract is named for an organisation on a page. | 2026-10-16 |
| Archive · PD placements lead-up | `placement-leadup.yml` | The picked pools' volume and liquidity before each PD proposal opened → `lp-grades/leadup/placements.json`. | 2026-11-23 |
| Archive · Credia probe | `credia-probe.yml` | One-off read of Credia's contracts and their vocabulary → `docs/fixtures/`. Done. | 2026-09-29 |
| Archive · Solid probe | `solid-probe.yml` | One-off read of Solid's contracts and their vocabulary → `docs/fixtures/`. Done. | 2026-09-28 |
| Archive · TLA flows walk | `tla-flows-archive-walk.yml` | Raw TLA flows over a span of blocks; starts the next chunk itself until the span is read. Heavy. | 2026-08-09 |
| Archive · TLA flows re-walk by hash | `tla-flows-rewalk-by-hash.yml` | Re-reads flow records by transaction hash to bring them to the current classifier. | 2026-08-26 |
| Archive · TLA voting registry backfill | `tla-voting-registry-backfill.yml` | The capture registry's contracts, walked back through history. | 2026-08-09 |
| Archive · Vote history (Votion's votes) | `vote-history.yml` | Votion's vault votes at the first block of each past period → `tla-voting/vote-history/votion.json`. | 2026-10-31 |
| Archive · Votion depositors | `votion-holders.yml` | Every vault's deposit history → `votion/archive-holders.json` (a finished list; the votion cron finds new depositors itself). | 2026-11-23 |

## Public · (public nodes and APIs)

| Name in the Actions tab | File | What it does | Last run |
|---|---|---|---|
| Public · Contract Watch role answers | `contract-watch-guards.yml` | Asks each contract, in simulation (nothing signed), what a change requires, and reads how each key-holding account signs → `contract-watch/guards.json`, `accounts.json`. Also runs by itself when its own two files change. | 2026-11-25 |
| Public · CoinGecko index refresh | `coingecko-index.yml` | Refreshes the committed CoinGecko coin list the token catalog reads. | 2026-06-26 |
| Public · FCD harvest (old Terra indexer) | `fcd-harvest.yml` | Transaction history from Terra's FCD indexer (the chain's start → January 2025) → `archive/fcd/`. | 2026-09-12 |
| Public · Price backfill | `price-backfill.yml` | Historical prices and LST ratios for a chosen token → `price-history/`. | 2026-07-17 |
| Public · Votion vaults — what the chain says | `votion-chain-read.yml` | For each Votion vault: the code it runs, the address that can upgrade it, the contract's own code history (every change, with its block and message) and its settings as the contract reports them → `votion/chain/vaults.json`. GET requests only; nothing simulated, signed or sent. Also runs by itself when its script changes. | 2026-11-25 |
| Public · TLA whales — who holds each pool's liquidity | `tla-whales.yml` | For every pool: the accounts holding its staked liquidity, largest first — direct stakers (the accounts the public flow record shows with stake left, each asked on the chain) and amp-token holders (the chain's own list × the compounder's rate) → `tla-whales/current.json`. Checked per pool against the staking contract's total; what is not explained is published as "not attributed". GET requests only, at most 2 a second and 3,000 a run (about 25 min); nothing simulated, signed or sent; never the archive. Also runs by itself when its script changes. | 2026-11-27 |
| Public · Contract Watch alerts — what needs a look | `contract-watch-alerts.yml` | Loads the Contract Watch page itself against the record and writes down the changes it marks "needs a look" → `contract-watch/alerts.json` (the home page's Contracts tab reads it). Public files only; no node. Not scheduled: runs when the record or the groups file changes, or by hand (by hand after the page's rule changes). |
| Public · Votion's list — when a bribed pool left it or came back | `votion-options-log.yml` | Each time a pool that has a bribe stops being, or begins to be, among the voting options of Votion's published plan → `votion/options-log.json`, with the two hourly captures it happened between. Reads only the capture in this repository; no node, no network. Not scheduled: runs when the capture changes. The Optimizer Watch page shows it. |

## One-time · (done — kept for the record)

| Name in the Actions tab | File | What it did | Ran |
|---|---|---|---|
| One-time · Astroport dailies bank | `tla-snapshot-daily-bank.yml` | Banked the legacy Astroport daily files into `dex-data/`. | 2026-08-11 |
| One-time · CAPA supply fold (legacy) | `capa-supply-fold-legacy.yml` | Folded the retired cron's CAPA snapshots into the org series. | 2026-08-24 |
| One-time · CAPA supply probe | `capa-supply-probe.yml` | Read-only look at every place CAPA can sit (public nodes). | 2026-08-24 |
| One-time · DEX history copy | `dex-slice.yml` | Copied the legacy DEX repos' history into `dex-data/`. | 2026-08-08 |
| One-time · FCD archive compress | `fcd-compact.yml` | Compressed the frozen FCD archive in place. | 2026-08-07 |
| One-time · Fold June dailies | `fold-june.yml` | Overlaid five June 2026 daily snapshots into the price history. | 2026-07-01 |
| One-time · FUEL (Boost DAO) probe | `fuel-boost-dao-probe.yml` | Read-only look at Boost DAO on Neutron (public nodes). | 2026-08-24 |
| One-time · LST ratio re-anchor | `ratio-reanchor.yml` | Rewrote interpolated LST ratios from the chain's own reads. | 2026-09-27 |
| One-time · NFT flows backfill | `flows-backfill.yml` | Seeded the NFT flows month files from the sales history. | 2026-07-01 |
| One-time · NFT mint probe | `mint-probe.yml` | Read-only check whether the NFT mint events can be recovered. | 2026-07-01 |
| One-time · TLA flows fill | `tla-flows-fill.yml` | Merged the LP flow history of the FCD archive under the live TLA flows stream. | 2026-08-03 |
| One-time · TLA flows index repair | `tla-flows-rebuild-index.yml` | Rebuilt the TLA flows index. | 2026-07-09 |
| One-time · TLA voting distributions | `tla-voting-distributions.yml` | Harvested the gauge distributions history. | 2026-07-14 |
| One-time · TLA voting FCD re-derive | `tla-voting-fcd-rederive.yml` | Re-derived bribes from the FCD archive with the live classifier. | 2026-07-18 |
| One-time · TLA voting fill from FCD | `fcd-fill.yml` | Completed the TLA voting backfill from the FCD harvests. | 2026-07-08 |
| One-time · TLA voting reconcile | `tla-voting-reconcile.yml` | Diagnostic: the committed event streams against the chain. | 2026-07-22 |
| One-time · TLA voting restructure | `tla-voting-restructure.yml` | Split the TLA voting event files into monthly parts. | 2026-07-15 |
| One-time · TLA voting seed | `tla-voting-backfill.yml` | Seeded the TLA voting events (votes, locks, bribes, rewards) from public nodes. | 2026-07-08 |

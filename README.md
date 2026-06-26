# tla-core

Shared data layer for the Terra Liquidity Alliance (TLA) ecosystem. There is one
TLA, so there is one `tla-core` — every tenant (NFT collection or DAO) reads from
the same data here.

## Layout
Each domain is a module folder, written by a cron in `platform-crons`:

- `catalog/`  — known addresses (WHO): DAO wallets, members, ally collections
- `prices/`   — token prices and on-chain ratios
- `pools/`    — TLA liquidity pools: rewards, APR, votes
- `dex/`      — DEX data: fees, slippage, LP balances, recycle-to-TLA
- `votion/`   — Votion's effect on TLA-wide voting power
- `pd/`       — Phoenix Directive bribe activity and grading
- `flows/`    — LP deposit / withdraw / claim events
- `fuel/`     — fuel snapshot module (reference snapshot pattern)
- `docs/`     — static reference: epoch schedule, staking APR

Every module follows `module / product / files` with a `heartbeat.json` and
`index.json`. Year rollover is a new folder, never a new repo.

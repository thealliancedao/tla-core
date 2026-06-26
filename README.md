# tla-core

Shared data layer for the Terra Liquidity Alliance (TLA) ecosystem. There is one
TLA, so there is one `tla-core` — every tenant (NFT collection or DAO) reads from
the same data here. Crons in `platform-crons` write the snapshots; humans maintain
`docs/`.

## Layout

Each domain module is written by a cron and follows `module / product / files` with
a `heartbeat.json` and `index.json`. Year rollover is a new folder, never a new repo.

**Live now:**
- `catalog/`        — known addresses (WHO): DAO wallets, members, ally collections.
                      Written by `address-catalog`.
- `token-catalog/`  — what's in TLA and how we read it (WORTH): pools, tokens,
                      discovered identity, verification, scoring. Written by `token-catalog`.
- `docs/`           — human-maintained reference (below).
- `.github/`        — the manual CoinGecko index Action (see `docs/curated`).

**Planned modules** (cron homes reserved): `prices/`, `pools/`, `dex/`, `votion/`,
`pd/` (Phoenix Directive), `flows/`, `fuel/`.

## docs/

- `curated/`            — hand-maintained registry inputs (token overrides, contracts,
                          protocols, wallets, acquisition guides, scoring weights, and the
                          generated CoinGecko index). See `docs/curated/README.md`.
- `ecosystem-knowledge/`— per-protocol deep-dive notes (placeholders to be filled;
                          source content from the live `tla-docs.html`).
- `changelogs/`         — pipeline changelog (`CHANGELOG.md`).
- `pending-changes/`    — design specs in progress (e.g. `SPEC-token-catalog.md`).
- `epoch_1-300_date.json`, `staking-apr.csv` — static reference data.

## Conventions

- Cron output is **descriptive, never attributive** — this repo is public. Report what
  the data shows; inter-protocol commentary stays out of committed files.
- Overrides live in `curated/`, merged on read over cron-discovered values — never
  written by a cron.
- Contributions come as pull requests (branch-protected); the diff is the verification.

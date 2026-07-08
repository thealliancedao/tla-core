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
- `dex-data/`       — per-DEX pool trading quality. Written by `dex-data`.
- `member-data/`    — VP layer: held + directed VP, influence, utilization.
                      Written by `member-data`.
- `tla-voting/`     — governance EVENTS: votes, locks, bribes, rewards, from
                      contract genesis (2024-08-27). Written by `org-tla-voting`
                      (forward) + seed/fill Actions in `.github/scripts/tla-voting/`.
                      Spec: `docs/pending-changes/SPEC-tla-voting.md`.
- `nfts/`           — NFT inventory + marketplace flows per collection.
- `price-history/`  — token price history, genesis → now.
- `archive/fcd/`    — deep-history raw tx captures from the FROZEN FCD indexer
                      (phoenix-fcd.terra.dev: chain genesis → ~2025-01-07 only).
                      Written by the `fcd-harvest` Action; consumed by derive
                      steps (e.g. `tla-voting` fcd-fill). 10 harvests complete.
- `docs/`           — human-maintained reference (below).
- `.github/`        — seed/backfill/harvest Actions + the CoinGecko index Action.

**Planned modules** (cron homes reserved): `tla-flows/` (LP deposit/withdraw/claim
events — built, deploy pending, urgency elevated by public-node prune),
`votion/`, `pd/` (Phoenix Directive). Note: `fuel/`, `prices/`, `contracts/`
exist only in the LEGACY personal `defipatriot/tla-core` (June interim) — see
retire board in `website-adao-core/CHANGES_PENDING.md`.

## docs/

- `curated/`            — hand-maintained registry inputs (token overrides, contracts,
                          protocols, wallets, acquisition guides, scoring weights, and the
                          generated CoinGecko index). See `docs/curated/README.md`.
- `ecosystem-knowledge/`— per-protocol deep-dive notes (placeholders to be filled;
                          source content from the live `tla-docs.html`).
- `changelogs/`         — per-cron changelogs (`cron-tla-voting-log.md`, `cron-address-catalog-log.md`, `cron-token-catalog-log.md`).
- `pending-changes/`    — design specs in progress (e.g. `SPEC-token-catalog.md`).
- `epoch_1-300_date.json`, `staking-apr.csv` — static reference data.

## Conventions

- Cron output is **descriptive, never attributive** — this repo is public. Report what
  the data shows; inter-protocol commentary stays out of committed files.
- Overrides live in `curated/`, merged on read over cron-discovered values — never
  written by a cron.
- Contributions come as pull requests (branch-protected); the diff is the verification.

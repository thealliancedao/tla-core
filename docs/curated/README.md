# curated — hand-maintained registry reference

Human-curated inputs the catalog and token crons read. Edited by hand (or via the
token-catalog viewer's override download → PR), not written by a cron.

- `known_contracts.json` — labeled contract addresses (gauges, staking, vaults, etc.)
- `protocols.json` — protocol directory (Eris, Solid, Astroport, Votion…)
- `token_overrides.json` — token identity overrides (display name, subtype, coingecko_id,
  logo, note). Merged on read over the cron's discovered identity; never written by a cron.
- `categories.json` — token/contract category definitions
- `wallets.json` — labeled wallets (DAO, council, treasury…)
- `acquisition_guides.json` — how-to-acquire reference per asset (steps + verified link)
- `curation-candidates.json` — addresses flagged for review/labeling
- `coingecko-terra2-index.json` — CoinGecko terra-2 address→id map. **Generated**, not
  hand-edited: built by the manual GitHub Action (`.github/workflows/coingecko-index.yml`)
  and read by token-catalog Stage 2.1 to verify discovered coingecko_ids.
- `scoring_weights.json` — composite token-grade weights (`price` / `identity`, default
  0.75 / 0.25). Editable; recorded in cron output so each scored snapshot says which
  weights produced it.

## Contributing

Edits are proposed via pull request against this repo — never by sending files.
Use the token-catalog viewer to edit, download the updated `token_overrides.json`,
then open a PR. Branch protection means nothing merges without maintainer approval;
the diff is the verification.

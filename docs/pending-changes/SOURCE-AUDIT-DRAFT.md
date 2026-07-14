# SOURCE AUDIT — site data sources → org homes (DRAFT for review, 2026-07-09)

Home: `tla-core/docs/pending-changes/` (moved 2026-07-14 per
SPEC-docs-consolidation). Working draft. Once agreed, statuses fold into
CHANGES_PENDING (now in this same folder) and this becomes the Batch-3 contract. Grades: 🟢 org home live · 🟡 org home exists,
parity/shape check needed · 🔴 no org home yet. Ref counts = fetch references
across all live pages.

## A. Current site sources (25 repos found)

| Source (refs) | What | Org home | Grade |
|---|---|---|---|
| aDAO-Image-Files (156) | NFT/planet images | stays (static asset repo) | 🟢 keep |
| **aDAO-Image-Planets-Empty (59)** | planet images | **⚠ ON THE DELETE LIST while site fetches it 59× — migrate refs into aDAO-Image-Files BEFORE deleting** | 🔴 flag |
| adao_json_storage (21) | legacy aDAO NFT/dao data | superseded by `nfts/adao/*` + provenance — verify per-file, then retire | 🟡 |
| nft-inventory-data_2026 (19) | NFT inventory snapshots | `nfts/adao/snapshots` | 🟡 parity check |
| website-adao-core (17) | docs, changelogs (index-log.md) | stays (docs repo is canonical) | 🟢 keep |
| **tla-snapshot-data_2026 (17)** | pool/bucket VP + health snapshots — tla-stats' backbone | **none — biggest red row** | 🔴 |
| token_logo (8) | token logos | token-catalog absorb (already queued) | 🟡 |
| tla_json_storage (8) | legacy TLA data | inventory per-file → absorb or retire | 🔴 |
| network-and-prices-data_2026 (8) | prices + network stats | `price-history` covers prices/ratios; network stats homeless | 🟡 split |
| adao-positions-data_2026 (7) | member/treasury positions | `member-data/snapshots` | 🟡 parity check |
| tla-ext_json_storage (6) | legacy ext data | inventory per-file | 🔴 |
| astroport-pool-data_2026 (6) | astroport pool snapshots | `dex-data/astroport/snapshots` | 🟡 parity check |
| votion-data_2026 (5) | Votion positions | none | 🔴 |
| nft-metadata (5) | static NFT metadata | fold into `nfts/adao` or keep static | 🟡 |
| cosmos/chain-registry (5) | external registry | external, fine | 🟢 keep |
| tla-chain-registry (4) | token identity | token-catalog absorb (queued) | 🟡 |
| ss-pool-data_2026 (4) | skeleton swap pools | `dex-data/skeletonswap/snapshots` | 🟢 |
| bribes-data_2026 (3) | bribes | `tla-voting/events` bribe stream | 🟡 shape check |
| backing-data_2026 (3) | NFT ampLUNA backing | `nfts/adao/snapshots` (+ provenance for origination) | 🟡 |
| marketplace-data_2026 (2) | NFT marketplace events | `nfts/adao/flows` | 🟢 |
| **defipatriot/tla-core (1)** | ⚠ points at PERSONAL tla-core, not org | fix ref → thealliancedao/tla-core | 🔴 flag |
| system-health-data_2026 (1) | monitor output | eventually org; low priority | 🟡 |
| fuel-data_2026 (1) | fuel snapshots | `fuel/snapshots` | 🟢 |
| ampcapa-data_2026 (1) | ampCAPA tool data | tiny; absorb into dex-data or keep | 🟡 |
| Live LCD/RPC (aDAOLive) | live-first tiles | doctrine-correct, stays | 🟢 keep |

**Tally: 7 🟢 · 12 🟡 · 6 🔴.** The red mass concentrates exactly where
predicted: **tla-snapshot** (the single biggest dependency of tla-stats.html),
**votion**, the three legacy `*_json_storage` grab-bags, plus two hygiene
flags (Planets-Empty deletion hazard; one wrong-repo ref).

## B. Redesign needs → data readiness (the "other stuff")

| Planned feature | Data it needs | Status |
|---|---|---|
| Live activity ticker (hook landing) | LP flow events, fresh | 🟢 **tla-flows — live as of this week; didn't exist when the site was drafted** |
| Epoch clock | epoch schedule | 🟢 tla-voting (epoch_1-300_date.json + events) |
| Bribe money board | bribes w/ amounts | 🟢 tla-voting bribe stream (shape check w/ UI) |
| Wallet lookup CTA / cost basis | per-wallet acquisitions, P&L | 🟢 provenance cost-basis (NFTs) + tla-flows receipts (LP) — **new capability** |
| Leaderboards / rankings | member aggregates | 🟡 all inputs exist (member-data, flows, voting); needs one small **aggregates derive** |
| My Portfolio (member lens) | positions + flow history + prices | 🟡 member-data + tla-flows + price-history; flows carry the honest Jan-25→Jun-26 gap |
| Slippage simulator + exit-cost view | pool reserves + REAL slippage receipts | 🟢 dex-data reserves + tla-flows cost fields — receipts make it empirical, not modeled |
| Trust & Data coverage map | per-product coverage + gaps | 🟢 known_gaps + heartbeats + index.json — **the honesty layer becomes a feature** |
| dao-tla.html Member Stats | 46 members' VP/locks/positions | 🟡 member-data + tla-voting locks; page not built |
| On/off-ramp dollar-cost tool | pool depths + hop costs | 🟡 dex-data + flows receipts; needs derive |

**Read:** every planned feature's data either exists or reduces to one small
derive (aggregates). Nothing planned requires a new capture domain — the
capture layer built this week already feeds the whole redesign.

## C. Proposed Batch-3 order (discussion, not decree)
1. Hygiene flags (Planets-Empty ref migration; wrong-repo ref) — hours.
2. Parity checks on the six 🟡 "org home exists" rows — verify shapes, flip
   to 🟢, retire personal repos per parallel-run rule.
3. **tla-snapshot org rebuild** — the big red row; tla-stats' backbone.
4. votion + legacy json_storage inventory/absorption.
5. tla-voting monthly restructure (already queued, pre-wiring).
6. Aggregates derive (leaderboards/P&L) → then site build begins.

## D. Retirement census methodology (Camron, 2026-07-09 — the rule for every legacy repo)

No legacy repo is deleted at the repo level. Each gets a **file-level census**
with five columns, and only a fully-dispositioned repo reaches the retire
board:

| file | duplicated in (org home?) | unique content? | history depth & fetch quality | disposition |
|---|---|---|---|---|

Dispositions, exactly three:
1. **MIGRATE** — unique + accurate → move into its org home (or a new cron's
   seed), re-point the site, then the file is "covered elsewhere" and stops
   blocking deletion.
2. **DELETE** — fully duplicated, or unique-but-wrong (bad fetch method /
   known-inaccurate). Wrong data is not heritage; a fresh cron + best-effort
   backfill beats migrating a lie.
3. **FRESH-START** — unique domain, data untrustworthy → new org cron now,
   backfill later from raw sources (FCD/retained/archive), gap recorded
   honestly. (The tla-flows pattern, generalized.)

The junk-drawer trap this kills: a repo with one unique file among nine
duplicated ones is UNDELETABLE until that one file is dispositioned — so the
census makes the one file visible instead of holding the whole drawer hostage.

**Priority order (Camron's call, supersedes §C ordering where they differ):**
1. **All crons built & functioning in org repos** — tla-snapshot rebuild,
   votion, network-stats home, the 🟡 parity flips. Censuses happen as each
   cron's migration touches its legacy repo (not as a separate mega-project).
2. **Website built on org data** — the verification engine; wrong shapes and
   missed domains surface by building, per the archive-ask gating decision.
3. **Iterate on what the site reveals**, then the archive ask, once, complete.
- Images/lore repos: explicitly deferred — static assets, no rot risk, lore
  page migration is its own later item. (Planets-Empty deletion stays BLOCKED
  until its 59 refs migrate.)

## E. tla-snapshot: REPLACE-CHECK before rebuild (Camron, 2026-07-09)

The biggest 🔴 may not need an org rebuild at all — most of its content now
has other homes (live gauge/bucket queries per live-first doctrine · VP
history derivable from tla-voting events · reserves/LP in dex-data ·
positions in member-data · prices in price-history). **Next-session task:
field-level replace-check** — enumerate every tla-stats.html read of the 17
tla-snapshot refs; disposition each: LIVE-QUERY / ORG-PRODUCT / DERIVE /
RESIDUE. Only true residue justifies a (slim) cron; residue history migrates
via census either way. UI unchanged: transform layer presents the legacy
store shape (the 7,000-line rendering rule). The best cron is no cron.

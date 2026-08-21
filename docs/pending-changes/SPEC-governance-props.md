# SPEC — Terra Governance Props: capture, catalog, news feed

**Status:** DRAFT for owner approval · opened 2026-08-21 (owner HAR data-dump)
**Seed:** `governance/props/luna-seed-2026-08-21.json` — 122 props verbatim
(66 passed / 56 rejected, IDs 349–4849), extracted from the owner's Chainscope
HAR. ID gaps are deposit-period props that never reached voting — the catalog
states this so gaps read as truth. Endpoint proven by the HAR: standard
**`/cosmos/gov/v1/proposals`** (Chainscope uses cosmosrescue + publicnode;
ours can use `terra-lcd.publicnode.com` — same paths, no auth).

**Naming convention (owner, 2026-08-21):** chain-governance series carry the
`luna-` prefix (`luna-seed-*.json`, capture writes `luna-history.json`) so
future prop sources (forum topics, DAO-level governance, other chains) can
sit beside them under their own prefixes without ambiguity.

## 1. Capture (new small product: `org-gov-props`)
- Daily GitHub Action in tla-core (one-off-style, not a Render cron — low
  frequency suits Actions) polling `/cosmos/gov/v1/proposals` for statuses
  1,2,3,4,5 (seed only had 2/3/4 — deposit-period and failed are cheap adds)
  with `pagination.limit=200&pagination.reverse=true` (newest first; full
  backfill already in the seed).
- **Prior-verbatim / write-once:** merge into `governance/props/luna-history.json`
  keyed by id; a prop's record updates only while status is non-final
  (deposit/voting → tally moves); once PASSED/REJECTED/FAILED the record
  freezes. Heartbeat + entries:null-vs-[] discipline as everywhere.
- Also snapshot gov params (deposit/tallying/voting — the HAR showed all
  three endpoints) into `governance/params/current.json`.

## 2. Docs page (the catalog as reference)
- `docs` tab or standalone section: full prop table (id · title · status ·
  submitted · voting window · message types), filterable; each row expands to
  summary + tally + typed messages. Annotated highlights get a "TLA lineage"
  badge — the founding arc is now on-chain-verified:
  #4813 TLA signaling (2024-05-31) → #4816 PD Path Forward (2024-07-29) →
  **#4817 Launching TLA** (2024-08-20, 3× MsgCreateAlliance) →
  **#4822 Launching PD Treasury** (2024-10-07, MsgCreateAlliance) →
  #4823 Alliance Reform → #4844 PoL Deployment (2025-11-25, 30M LUNA) →
  #4847 TLA Recalibration (2026-03-07). Rejected-but-instructive:
  #4830, #4836 (community TLA-governance attempts).

## 3. News feed hook (index)
- Index news module reads `governance/props/luna-history.json` (cron fallback) or
  live LCD (primary, per tiles-live doctrine): surface (a) any prop in
  status 1/2 (deposit/voting) with days remaining, (b) newly-final props
  since last visit. Newest-id watermark in sessionStorage.

## 3b. Forum source (added 2026-08-21)
forum.phoenix.money is PD's Discourse — where props are discussed BEFORE
chain. Discourse exposes JSON (`/latest.json`, `/t/<id>.json`): the capture
can optionally poll it for new Proposals-category topics, giving the news
feed a pre-chain signal ("proposed on forum") ahead of the on-chain
deposit/voting states. **Forum-news tab design (owner request 2026-08-21, HAR-informed):**
The owner's forum HAR (97 entries, one page load) shows Discourse serving
server-rendered HTML with **no CORS headers on anything** — so the index
CANNOT poll forum.phoenix.money JSON from the browser. The tab therefore
follows our standard pattern: the same daily/hourly **GitHub Action** that
polls chain props also polls Discourse's standard JSON
(`/latest.json`, and `/t/<id>.json` for new-topic detail) **server-side**
(no CORS constraint there), writing a curated
`governance/forum/latest.json` into tla-core: topic id, slug, title,
category, tags, created_at, last_posted_at, reply count. The index news
module gets a "Forum" tab reading that file exactly like every other feed
(cron-file only — no live-primary here, since live isn't possible
cross-origin). New-topic + new-reply-on-tracked-topic both surface;
watermark by highest topic id + last_posted_at. NOTE (gate item): Discourse
JSON endpoints are standard but verify `/latest.json` responds on this
instance at build gate before wiring. v1 can ship chain-only; the forum tab
rides the same Action as v1.1.

**Complete forum index (all 19 topics, verified live 2026-08-21 — the forum
is the WHOLE post-Sep-2025 discussion record; the 2024 founding arc lived on
Commonwealth/Agora and is covered by the chain seed):**
| Topic (id) | Cat/Tag | Replies | Posted |
|---|---|---|---|
| Welcome (5) | General | 0 | 2025-09 |
| PoL Deployment [EXECUTED] (10) | Proposals/liquidity | 18 | 2025-10-07 → chain #4844 · READ, extracted |
| DEFI/Community game (14) | Proposals | 0 | 2025-10-29 |
| Chain Upgrade v2.18 (15) | Proposals/upgrade | 0 | 2025-11-27 |
| Conditional Mint-Inflation Reduction (16) | Proposals | **21** | 2026-01-18 · biggest open debate, no chain prop yet |
| Dead Stake / Validator Right-Sizing (21) | Proposals | 7 | 2026-01-23 |
| Stabilising Core Liquidity / Strategic Pool Set on TLA (22) | Proposals | 2 | 2026-01-23 · TLA-relevant |
| Terra BD & Growth Program (23) | Proposals | 0 | 2026-01-26 |
| Astroport × Eris Collaboration (24) | Proposals | 0 | 2026-01-26 |
| Grants Mechanism Changes (25) | Proposals | 2 | 2026-01-26 |
| Sustainable tokenomics on PoL (28) | Proposals/liquidity | 5 | 2026-02-21 · burn-all-fees idea |
| Chain Upgrade 2.19 [EXECUTED] (29) | Proposals/upgrade | 0 | 2026-03-04 |
| WBTC.axl-WBTC.osmo Removal (30) | Proposals/liquidity | 15 | 2026-03-05 → chain #4847 · queued read |
| Core→Upstream Cosmos SDK signal (31) | Proposals | 1 | 2026-03-27 |
| Validator Set 130→100 (32) | Proposals/param | 2 | 2026-04-12 · chain id unconfirmed (candidate #4848/#4849) |
| Dynamic Min Validator Commission (33) | General/upgrade | 6 | 2026-05-18 |
| Airdrop help ×2 (34, 35) | General | 0 | 2026-05-23 |
| Chain Upgrade 2.20.0 (38) | Proposals/upgrade | 1 | 2026-07-16 |
Base URL: https://forum.phoenix.money/t/<slug>/<id> (ids gap where topics
were unlisted/deleted). Poster of record for ops posts: `rose` (PD);
`0xPhilipp` active in economics threads.

## 4. Bot corpus + facts
- Add to agent CORPUS_SOURCES: a **curated compact catalog**
  (`governance/props/catalog.md`, generated: id/date/status/title/one-line +
  the TLA-lineage badges) — NOT the 215KB raw seed (token cost). Raw stays
  the citable source of truth.
- facts.json entries from chain-truth findings (below) go to
  terra-liquidity-alliance.facts.json + phoenix-directive.facts.json.

## Chain-truth findings locked by the seed (record in facts files)
1. **PD treasury deployed address:**
   `terra16st8yfprkdl06kccktshd3p2vccq93xcn9mkhjl8s4jumyjtd4kqye0me5`
   (virtual token `factory/<addr>/vt`, prop #4822). Closes the open probe
   from the audit (which was pre-deployment). **Reward weight on-chain =
   0.14 FIXED (min=max)** — the founding doc said "initially 10%"; chain
   says 14%. Doc-vs-chain divergence recorded; chain wins.
2. **TLA's three alliance assets at creation (prop #4817):**
   `terra1ym2495…qr4q6n8` (LUNA-Stable, rw 0.005→cap 0.10),
   `terra1x8v9fu…qqcnhyh` (rw 0.0025→cap 0.05),
   `terra16l43xt…qnl8h53` (rw 0.0025→cap 0.05); all with
   reward_change_interval **604800s = the weekly epoch cadence, in chain
   config**, growth factors 1.25916 / 1.12212 / 1.12212 per week.
   OPEN: reconcile these three vt contracts against our four gauge buckets
   (asset_configs.gauge) — mapping not yet asserted.
3. **x/alliance take_rate = 0.000 on ALL of the above at creation** — chain
   evidence for the two-take-rates finding: the module-level take on TLA
   virtual tokens is zero, so TLA-context "take rate" = the hub-level Eris
   ampLP take. CAVEAT: two MsgUpdateAlliance props exist in the seed —
   check both for later take/weight changes before stating "still zero".
4. **#4844 PoL program:** 30M LUNA community-pool spend to
   `terra1kzkrm2…sv8ea3g` for USDC-ampLUNA + LUNA-ampLUNA POL ("only 25%
   swapped to USDC via OTC… LP fees return to the community pool" per
   summary) — the concrete PD chain-owned-liquidity program; recipient
   address captured for treasury/POL flow tracking.

## Open questions for owner
- Docs placement: section inside docs tab vs standalone governance page?
- News feed: live-LCD primary acceptable, or cron-only to keep index light?
- Should the capture also pull each prop's **votes/tally by big voters**
  (heavier; separate endpoint) or is final tally enough for v1?

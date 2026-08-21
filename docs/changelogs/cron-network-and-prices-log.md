# cron: network-and-prices — changelog

> Log created 2026-08-21 (this cron family previously had no entry file in the
> single changelog home).

## 2026-08-21 — F1: outage carry-forward (AUDIT-price-artifact-2026-08 §4)
- New `applyCarryForward`: tokens whose `final_price_usd` would land null
  (CoinGecko/Astroport outage) now carry the prior run's final, flagged
  `stale:true` with `final_source: carried_forward(<orig>)` and a preserved
  `stale_since` across chained carries — capped at 7 days, then honest null
  (`expired` counted and logged). Closes the silent-null path that invited
  downstream Stage-3 phantoms (audit Class A: 14 outage days).
- Gate 12/12 (shared harness with tla-snapshot F1): outage simulation carried
  all 8 CG-sourced tokens from the real current.json; 9-day-old prior expired
  to null; non-null finals untouched; stale_since not clock-reset.

## 2026-08-21 — F2-forward: FUEL + dATOM proper feed entries
- TOKEN_REGISTRY +FUEL (astroport-only; owner-sourced: Astroport DEX is the
  only venue pricing it, ~$22K TVL pool — thin but the only market) and
  +DATOM (cgId `drop-staked-atom`, owner-verified, plus phoenix-1 IBC denom).
  Denoms taken from our own astroport cron snapshot (IBC traces verbatim).
- WHALE intentionally ABSENT from the registry: abandoned per owner —
  its pools stay honest-null permanently.
- Gate 5/5 incl. real Astroport series-shape contract; null cgId safe in
  bulk-id builder (`filter(Boolean)` pre-existing).
- Observed live: CoinGecko 429-throttling on the Render IP is now routine —
  carry-forward had nothing to carry this run because prior finals for
  cg-only tokens were already null (pre-F1 outage). Expect stATOM/dATOM to
  populate as CG windows succeed, then carry across throttled runs.

## 2026-08-21 — E12: ASTRO wrong-token repoint (owner-verified)
- The 2083% ASTRO flagged_mismatch from the 19:14 run was the registry's
  phoenix-1 address pointing at LEGACY cw20 ASTRO (pre-Neutron-migration
  ghost, ~$12K TVL, trading ~21× above real ASTRO) while CoinGecko's
  astroport-fi listing is live and correct. The mismatch rule held the
  correct final ($0.000333) — no taint entered — but the flag was real.
- Repointed phoenix-1 to the current ibc ASTRO denom (verbatim from our
  astroport cron snapshot). Verified against the TLA LUNA-ASTRO gauge pool
  contract: it holds the NEW ibc ASTRO, so no symbol collision touches TLA;
  the cw20 ghost lives only in leftover non-TLA pools.
- Gate 3/3: repointed entry lands direct_match (~1.4% delta), astroport
  final restored, legacy address absent. Registry incident index: E11
  (EURe wrong coin) → E12 (ASTRO wrong token, same failure family:
  identifier drift after a migration).

## 2026-08-21 — dATOM repointed to its real market: Astroport Neutron (registry v3.0.2)
- **Finding reversed mid-delivery, on evidence.** F2b read CG's dATOM as a
  "frozen venue number" because it sat at $2.62 for 7 weeks while ATOM moved
  25%. Owner-sourced facts corrected that: Drop Protocol is in WIND-DOWN
  (Medium 2025-11-13; no token, redemptions on a departing team), and CG's
  venue table shows USDC.N/DATOM on Astroport NEUTRON at ~$89K/day — a real
  market. dATOM is simply DECOUPLED from ATOM: the peg arb no longer works.
  So (a) the pre-July CG history was still venue-flipping (par-proxy, jumps)
  → the F2b history null STANDS; (b) the forward source must be the market,
  NOT hub-rate × ATOM (backing ≠ price for an unredeemable derivative) — the
  hub plan drafted earlier today was withdrawn before commit.
- **Change (one registry entry):** `DATOM.astroportAddresses` → neutron-1
  tokenfactory denom under the admin CG lists, `preferChain: 'neutron-1'`;
  the phoenix-1 ATOM-dATOM pool ($132/day, CG-flagged stale) is REMOVED from
  the entry so a Neutron miss cannot fall back to it. CG `drop-staked-atom`
  stays as the cross-check (it tracks the same venue).
- **Visible-failure design:** the Neutron denom could not be verified from the
  sandbox (metrics fixture is phoenix-only). Gate proves both branches on
  today's live values: Neutron hit → `astroport`/neutron-1/`direct_match`;
  Neutron miss → `cg_only`, no Terra-pool fallback. 28/28 other tokens
  identical to main. OWNER: first run after commit, check
  `token_prices.DATOM.match_quality` — `direct_match` = denom right;
  `cg_only` = denom wrong (price still correct via CG; fix the denom).
- Doctrine note: "from the source" for an LST normally means hub rate × base
  (bLUNA). When the protocol can't honor redemptions, the market is the
  source. Recorded in PRICING-DOCTRINE follow-up.

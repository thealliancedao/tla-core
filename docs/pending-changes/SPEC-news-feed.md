# SPEC — news feed ("latest across forums, social, governance") — DRAFT 2026-08-24

Status: capture question for the owner. Nothing built. Index Rev 3.67 already
anticipated this: `renderXFeed` reads X's free embed widget (X often refuses
logged-out renders → the link-card fallback you see) and says the upgrade path
is a cron-fed `tla-core/social/current.json`. That product is this spec.

## What can be captured server-side without any key (org-news cron, hourly)
- DAODAO proposals across the watched DAOs — already captured (dao-governance);
  the feed just reads it.
- Terra gov proposals — already captured (governance/props).
- Agora / Commonwealth forum threads — public JSON endpoints exist for
  thread lists; PROBE first (shape + rate limits), same path as every capture.
- Medium (terra-money, eris) — public RSS.
- GitHub — releases/commits of the org repos and terra-money/alliance-nft-collection
  (api.github.com, unauthenticated 60/h is enough hourly).
- Telegram public channels — `t.me/s/<channel>` is server-renderable HTML;
  probe before relying on it (it is scraping, and it can change).

## What cannot be captured without a decision
- X / Twitter: the read API is paid (Basic tier). No key → no capture → the
  page keeps the embed + link cards. OWNER DECISION: fund an X API key (then
  X posts join the same feed product) or accept link-out for X.

## Product
`social/current.json` (org-news cron): last 100 items
`{ts, source: 'daodao'|'terra-gov'|'agora'|'medium'|'github'|'telegram'|'x', title, url, dao?, kind}`,
never-shrink daily archive `social/daily/<date>.json`. Freshness row in
system-health. Page: ONE compact strip on index (5 items, source pills, "more"
loads 5) replacing the X widget slot — same size, all sources. No page grows.

## Order
probe (Agora + Telegram shapes) → cron → strip. One session.

# Optimizer Watch Changelog

## optimizer-watch.html 1.0.0 — 2026-11-26 — a vote optimizer's decision, shown in full
- **The owner (2026-11-26):** "Could we build an example of what trust and transparency would look like, so when we say this
  isn't working — we can't prove why — we can suggest making it more clear so we don't need to question it." Four parts asked for;
  hosted under Tools.
- **What it is:** aDAO's own page, in the site's own look, and it says so at the top: not Votion's page, not affiliated with
  Votion or Eris; an example of what an optimizer's page could show, built only from public data. It uses none of their marks.
- **Two deadlines, side by side:** Votion's weekly cast (the hour it fell in on the rounds on record) and the end of the round
  (the gauge's flip, Monday 00:00 UTC), each counting down, with the hours between them said plainly.
- **1 · What Votion plans to do:** every pool it has votes on now or after its cast — votes now → after, the change, its share of
  Votion's vote, the bribe and what it pays per 1M votes, the pool's APR this round → next, what LPs earn a week. Each vault with
  what it will do and Votion's own note.
- **2 · Bribed, and no votes — why:** every bribed pool that ends with none, each with the reason the data gives: *not offered*
  (the published plan lists the bribe and does not offer the pool; no reason is published and the page does not guess one — with
  what the rule would do if it were offered), *offered and under the going rate* (with about how much more it needs), or *off the
  reward list*.
- **3 · Every pool** of the bucket, every DEX, on the list or off, with its votes, Votion's votes and its bribe or "none".
- **4 · The round's bribes as they change:** the bribe contract read live in the visitor's browser every minute, with every change
  since the page was opened; the recorded adds and withdrawals with their transactions; and the log of when a bribed pool left
  Votion's list or came back (`votion/options-log.json`, cron-votion-log.md).
- Engine: `lib/vote-market.js` 1.6.1 (the Vote Simulator's) — one set of numbers across the site.
- Gate `gate-optimizer-watch.mjs` 35/35 on the real products, the chain's own pots for the round and the options log; five planted
  faults each caught. Rendered on a desktop and a phone: no text under 13px, no sideways scroll.
- Tools 1.10: a tile. Footer and sitemap entries.

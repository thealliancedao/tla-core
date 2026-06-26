# Ecosystem Knowledge — schema & contract

This folder is the **grounding reference** for how the TLA ecosystem actually works —
written for three readers:

1. **Humans** (contributors, the community) — readable prose explaining the *why*.
2. **Us, mid-build** — when a cron or page is confusing, the answer is here, sourced.
3. **AI agents** (e.g. a future on-site assistant) — discrete, citable fact records
   so an agent can answer "how do you price arbLUNA?" and link the source directly.

The goal: knowledge that **grows with us, stays current on its own where it can, and
fails honestly when a source we relied on disappears** — never silently asserting a
stale fact.

---

## Two files per topic

For each protocol (and for our own system), there are two paired files:

- **`<topic>.facts.json`** — the **source of truth**. Structured fact records an
  agent can retrieve and cite. JSON-first by design.
- **`<topic>.md`** — readable prose for humans, citing the same fact `id`s. May
  eventually be generated from the facts file so the two cannot drift.

If prose and facts ever disagree, **the facts file wins** and the prose is corrected.
We do not keep two sources of truth for one fact — that's the disease this whole
migration exists to cure.

---

## Fact record shape

Every entry in a `.facts.json` `facts[]` array:

```json
{
  "id": "arbluna.withdrawal.instant_fee",
  "claim": "Instant withdrawal of arbLUNA costs a 5% markup fee, dropping linearly to unlock.",
  "value": 5,
  "unit": "percent",
  "kind": "static_sourced",
  "source_url": "https://docs.erisprotocol.com/products/arb-vault/",
  "source_section": "Withdrawals",
  "source_type": "doc",
  "verified_at": "2026-06-26",
  "source_status": "ok",
  "live_ref": null,
  "notes": "Drops linearly to 0 as the position reaches its 25-day unlock."
}
```

### Field reference

| Field | Meaning |
|---|---|
| `id` | Stable dotted key. An agent retrieves by this; never reuse or repurpose. `protocol.area.fact`. |
| `claim` | One-sentence statement of the fact, in plain language. What an agent quotes. |
| `value` / `unit` | The machine value when there is one (`5` / `"percent"`). Omit for purely qualitative facts. |
| `kind` | `static_sourced` (a fixed fact from a doc) **or** `live_binding` (a value pulled from our data at render — NOT stored here). |
| `source_url` | The authoritative source. For `static_sourced`, the doc/page. For `live_binding`, may point at our own cron output spec. |
| `source_section` | Heading/anchor within the source, so a reader lands on the exact spot. |
| `source_type` | `doc` (prose docs), `chain` (on-chain query), `api` (live API), `self` (our own system/method). |
| `verified_at` | ISO date we last confirmed the source says this. The slot a drift-checker updates. |
| `source_status` | `ok` \| `drifted` (source changed near this claim) \| `broken` (source 404/moved). Default `ok`. |
| `live_ref` | For `live_binding` only: where the live value comes from, e.g. `token-catalog:lst.market_vs_redemption_pct`. `null` otherwise. |
| `notes` | Optional caveats, edge cases, or accepted nuance. |

---

## Sourced fact vs. our conclusion — a first-class distinction

A reader must always be able to tell **what a source says** from **what we concluded
from it**. This is core to the project's honesty: we use officially sourced data, and
where we draw our own conclusion on top of it, we label it as ours.

- `source_type: "doc"` / `"chain"` / `"api"` → an **external, officially-sourced fact**.
  The `source_url` points at the verifiable artifact (protocol docs, contract code, an
  audit). The reader can check it themselves.
- `source_type: "self"` → **our own conclusion, method, or measurement.** Grounded in
  sourced facts, but the interpretation is ours. The `source_url` points at our own
  repo/spec so the reasoning is traceable.

Never present a `self` conclusion as if a protocol or auditor stated it. When a fact
combines both ("the docs say X, therefore we do Y"), split it into two records — the
sourced X (`doc`) and our Y (`self`) — so the line stays clean. Audits and contract
source code are the highest-authority `doc` sources; prefer them when available.

---

## static_sourced vs live_binding — the core rule

**If a number can change, it does NOT get written down here.** Only the *reason* it
changes does.

- **`static_sourced`** — facts a source states as fixed: a 5% fee, a 25-day unbond,
  "PCL uses an EMA price oracle." These have a `value` and a `source_url`. They change
  only when the *source* changes — which is a re-verification event, not a daily one.

- **`live_binding`** — values our own data measures and that move constantly: the
  current arbLUNA market-vs-redemption gap, today's price, a hub ratio. These carry
  **no stored value** — `value` is null and `live_ref` names the cron field. The site
  (or agent) resolves them live at answer-time, so they are never stale.

> Example: "arbLUNA can trade below redemption" is `static_sourced` (the *mechanism*
> is permanent, from the Eris docs). "arbLUNA is currently 9% below redemption" is a
> `live_binding` — we never write the 9%; we resolve `live_ref` against the live
> token-catalog snapshot, and show its current value and observed range.

---

## Source-death detection (how it "fails honestly")

Each `static_sourced` fact carries `source_url` + `verified_at` + `source_status`.
A future checker (manual Action or cron, not yet built) periodically re-fetches each
`source_url` and:

- still reachable, content near the claim unchanged → leave `source_status: "ok"`,
  bump `verified_at`.
- reachable but content around the claim changed → set `source_status: "drifted"`.
- 404 / moved / unreachable → set `source_status: "broken"`.

The site and any agent **must** check `source_status` before presenting a fact:
- `ok` → present normally with citation.
- `drifted` → present, but flag "source may have changed — re-verify".
- `broken` → do **not** assert the fact; show "source no longer found — needs
  re-verification" so we know to track down what replaced it.

This is the schema's promise: **if someone deletes the content we sourced, our side
goes to `broken` and we find out — rather than confidently repeating a fact whose
basis vanished.** The checker is future work; the *slots* exist now so adding it later
populates fields that already exist.

---

## `live_ref` convention

Format: `<cron-or-source>:<dotted.path.into.its.output>`. Examples:

- `token-catalog:lst.market_vs_redemption_pct` — per-token field in the token-catalog snapshot.
- `token-catalog:pricing_stats.lst_ratios.arbLUNA.ratio` — a live hub ratio.
- `chain:<hub-addr>/{state}` — a direct chain query, when no cron carries it.

The resolver lives on the consuming side (site/agent). This folder only *declares*
where a live value comes from; it never stores the value.

---

## Adding knowledge (for humans and agents)

1. Add the fact to the relevant `<topic>.facts.json` with a stable `id`, real
   `source_url` + `source_section`, today's `verified_at`, and `source_status: "ok"`.
2. Decide `kind`: does the source state a fixed value (`static_sourced`) or do we
   measure something that moves (`live_binding`)? When unsure, it's probably
   `live_binding` — err toward not hardcoding.
3. Reference the fact `id` in the prose `.md` so humans get the narrative.
4. Never delete a fact `id` that something may cite — mark it `source_status` or
   supersede it; stable ids are a contract.

---

## Files in this folder

- `README.md` — this contract.
- `<protocol>.facts.json` / `<protocol>.md` — per-protocol knowledge (eris-protocol,
  astroport, backbonelabs, solid-protocol, phoenix-directive, votion, …).
- `tla-stats-system.facts.json` / `.md` — **our own** architecture as citable facts:
  where each number comes from, which cron, how it's verified. So an agent can answer
  "how do you know the treasury value?" the same way it answers questions about Eris.

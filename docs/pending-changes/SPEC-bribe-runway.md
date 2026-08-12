# SPEC — bribe-runway (bribe expiry & renewal visibility)

Status: **v1 CAPTURE BUILT & GATED 9/9 2026-07-30 — deploy pending commit;
UI card next session** · Origin: DeFi_Patriot 2026-07-30 — LPs and voters should
see that a pool's bribes are funded ahead ("safe to add liquidity"), and
bribers (him, Solid, PD) should see when THEIR bribes run out.

## The trick
The manager's per-period pots are queryable for FUTURE periods. Probe head →
head+CAP (26) until pots go empty ⇒ per-pool, per-token funded runway from
STATE TRUTH — which INCLUDES unattributed hole-era bribes (Solid's CAPA
batches, PD), so the feature works fully pre-E2. Payers stay unnamed (events'
job). Linear bribes taper per period; `per_period` shows the shape, never
just a cliff date. Proof-by-fixture: the owner's own July LUNA-SOLID bribe
(e193→e200 span) reproduces as `last_funded_period: 200, epochs_left: 5`.

## v1 shipped (platform-crons)
`lib/bribe-runway.js` + one wired call in `index.js` after the bribe-state
step (isolated try/catch — event streams unaffected on failure). Runs every
hourly pass (≤27 sequential pot queries) so a fresh add appears within the
hour. Publishes `tla-voting/bribe-state/runway.json`: meta (current_period,
probed_through, method), `expiring_this_epoch`, pools sorted soonest-first
with {last_funded_period, epochs_left, expires_approx (labeled), by_denom
{last_period, periods_funded, total_remaining_raw, per_period}}.
Gate 9/9: runway spans, taper, totals, expiring flag, sort, floor stop,
honesty method string.

## v2 (next session): the UI
tla-stats pool rows get a runway chip — green "bribed through eN · K epochs"
/ amber ≤3 / red "expires after this epoch" — plus an "expiring soon" sort =
a renewal dashboard for briber teams and a confidence signal for LPs. Data:
one fetch of runway.json; per-pool match by gauge id (existing map). After
E2, attributed events can annotate WHO funds each runway.

## Non-goals v1
No renewal predictions (we show funded truth, not briber intent). No payer
attribution from pots. No dollar valuation of future pots in v1 (catalog
prices could add it later, labeled at-today's-prices).

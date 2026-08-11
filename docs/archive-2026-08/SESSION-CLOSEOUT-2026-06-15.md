# SESSION CLOSE-OUT — Commit Checklist (2026-06-15)

Everything built this session, what to commit where, and what to run. Work
top-down; verify each before the next. All files are FULL replacements.

---

## ⭐ PRIORITY 1 — Docs (capture before anything is lost)

Commit to **website-adao-core** (wholesale, each file):
- `CHANGELOG.md` — the rev-based changelog (Updates tab reads this)
- `PROJECT-STATUS.md` — current state of everything
- `PROJECT-DIRECTION.md` — the roadmap (incl. AI assistant + onboarding ideas)
- `PRICING-DOCTRINE.md` — settled pricing rules
- `SYSTEM-AUDIT-AND-OPS.md` — every cron/repo/schedule + cleanup + rollover plan
- `NOTE-arbLUNA-pricing-gap.md` — corrected (hub was right)
- `SPEC-ai-assistant.md` — new
- `SPEC-nft-onboarding-blueprint.md` — new
- (SPEC-portfolio-tracker, SPEC-lp-grading, SPEC-votion-capture if not already in)

No runs needed — docs only.

---

## PRIORITY 2 — System Health + Transparency Hub (the visibility layer)

1. **New repo** (if not done): `system-health-data_2026` (public, with README).
2. Commit to **cron-scripts** (in a `system-health/` folder):
   - `system-health/system-health.js`  ← UPDATED (now pings endpoints)
   - `system-health/package.json`
3. Commit to **cron-scripts**:
   - `lib/error-reporter.js`  ← the sanitizer
4. **Render cron** (if not set up): root `system-health`, build `npm install`,
   cmd `node system-health.js`, schedule `*/30 * * * *`, env: GITHUB_TOKEN,
   GITHUB_REPO=`defipatriot/system-health-data_2026`, GITHUB_BRANCH=main.
5. **Trigger the run** → confirms `system-health.json` now has the `endpoints` array.
6. Commit to **aDAO-links-site**:
   - `transparency-hub.html`  ← 4 tabs (supersedes standalone system-health.html)

After the run, the Endpoints tab populates (was blank because the OLD monitor
without endpoint-pinging was live).

---

## PRIORITY 3 — Footer + test tiles (connective tissue)

Commit to **aDAO-links-site**:
- `index.html` — footer now has Rev · Changelog · Cron status · System Health · Alliance Contact
- `tools.html` — dynamic test tiles (test.html … test-5.html show only if the file exists)

For test tiles to show a description, each test file's `<head>` should include:
`<meta name="test-desc" content="TLA Stats Page">` → tile reads "Test 1 (TLA Stats Page)".

---

## PRIORITY 4 — Portfolio (when ready to ship the tracker)

Commit to **cron-scripts**:
- `lib/portfolio-assembler.js`, `lib/portfolio-alerts.js`
Commit to **aDAO-links-site**:
- `my-portfolio.html`  ← save-address tracker (uses inlined assembler)

(Refinements before public: NFT backing_usd, verify ally join. Fine for soft launch.)

---

## OPEN QUESTIONS / SMALL FIXES (next session)
- **bribes-history cadence** — monitor flags "down 18h" (cadence set to 4h). Tell
  me the real cadence; I'll loosen it so it's not a false degraded.
- **ampcapa, backing** — add a heartbeat write to each so they're monitorable.
- **index.html old-epoch fallback** — convert to adao-positions + dao-dashboard.
- **Delete dead repos** (confirmed safe): astroport_json_storage, archive-storage,
  nft-tracker, transaction-tracker, adao_nft-tx_2025, aDAO-Image-Planets-Empty.

---

## VERIFIED THIS SESSION (no action — just so it's recorded)
- Daily archives live: votion-positions, adao-allies, tla-participants.
- Pricing correct: arbLUNA $0.1553 ≈ CoinGecko (hub-ratio confirmed right).
- Registry: 45 contracts (Votion vaults labeled).
- nft-inventory: healthy, 10k NFTs, 0 errors.
- Error sanitizer: adversarially tested, no secrets leak.
- Portfolio assembler: tested against real data ($7,508 / 1.09M VP / 3 alerts).
- System health monitor: catches stale crons + endpoint health; ~92% confidence.

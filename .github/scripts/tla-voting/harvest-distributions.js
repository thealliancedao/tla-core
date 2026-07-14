// =============================================================================
// .github/scripts/tla-voting/harvest-distributions.js — ONE-SHOT payout harvest
// =============================================================================
// SPEC-distributions-capture §2 (website-adao-core). Self-contained per the
// tla-core one-off convention (fcd-fill / flows-fill / rebuild-index pattern):
// workflow in .github/workflows/, script here, runs against THIS repo with the
// workflow's own token. The capture core between the DISTRIBUTIONS-CORE-v1
// markers is byte-identical to platform-crons/tla-voting/lib/distributions.js
// (the Render forward step) — diff-verify after ANY change, classifier rule.
//
// Walks distributions{time:{period:P}} DOWN from the current finalized period
// to the contract floor (findFloor PROVES genesis — never assumes). Retained
// contract state: ~1 query/period, no blocks, idempotent, re-run heals gaps.
//
// Run (Action): .github/workflows/tla-voting-distributions.yml
// Env: DRY_RUN=1 → walk + report, publish nothing.
// =============================================================================
'use strict';

const https = require('https');

const LCD_PRIMARY  = process.env.LCD_PRIMARY  || 'https://terra-lcd.publicnode.com';
const LCD_FALLBACK = process.env.LCD_FALLBACK || 'https://terra-rest.publicnode.com';
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';

// tla-core has no shared contracts config; literal below == platform-crons
// config/contracts.js GAUGE_CONTROLLER.addr (chain-verified 2026-07-13 probes).
const GAUGE_CONTROLLER = 'terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj';
const DIST_DIR = 'tla-voting/distributions';
const DIST_SCHEMA_VERSION = 1;
const STORAGE_LAYOUT = process.env.DIST_STORAGE_LAYOUT || 'single';
const FLOOR_CONFIRM = 3;
const FETCH_RETRIES = 3;
const PACE_MS = 150;

// <<DISTRIBUTIONS CORE v1>> — byte-identical in tla-core/.github/scripts/tla-voting/harvest-distributions.js. Diff-verify the marked block after ANY change (same rule as <<FLOWS CLASSIFIER v1>>).
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- transport: HARD deadline (flows 1.0.2 port). r.setTimeout is an IDLE
// timeout (resets on every byte — a tarpit hangs the run); this destroys the
// request when the wall clock says so, regardless of trickling data.
function httpGetHard(url, deadlineMs = 40000) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { Accept: 'application/json', 'User-Agent': 'org-tla-voting-distributions/1.0' } }, (res) => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                clearTimeout(killer);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(b)); } catch { reject(new Error('bad JSON')); }
                } else {
                    const err = new Error(`HTTP ${res.statusCode} ${b.slice(0, 200)}`);
                    err.statusCode = res.statusCode; err.body = b.slice(0, 300);
                    reject(err);
                }
            });
        });
        const killer = setTimeout(() => req.destroy(new Error(`deadline ${deadlineMs}ms`)), deadlineMs);
        req.on('error', (e) => { clearTimeout(killer); reject(e); });
    });
}

function smartPath(addr, queryObj) {
    const b64 = Buffer.from(JSON.stringify(queryObj)).toString('base64');
    return `/cosmwasm/wasm/v1/contract/${addr}/smart/${encodeURIComponent(b64)}`;
}

// Query one period ('current' or a number). Distinguishes three outcomes:
//   {ok:true, period, gauges}           — data
//   {ok:false, floor:true, error}       — contract-level refusal or empty state
//   {ok:false, floor:false, error}      — network/transient (after retries)
async function fetchDistributions(periodOrCurrent) {
    const q = { distributions: { time: periodOrCurrent === 'current' ? 'current' : { period: periodOrCurrent } } };
    let lastErr = null;
    for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
        const base = attempt % 2 === 0 ? LCD_PRIMARY : LCD_FALLBACK;
        try {
            const res = await httpGetHard(base + smartPath(GAUGE_CONTROLLER, q));
            const gauges = res?.data;
            if (!Array.isArray(gauges)) return { ok: false, floor: false, error: 'unexpected shape (data not array)' };
            const allEmpty = gauges.length === 0 || gauges.every(g => !Array.isArray(g.assets) || g.assets.length === 0);
            if (allEmpty) return { ok: false, floor: true, error: 'empty distributions (pre-genesis state)' };
            const period = Math.max(...gauges.map(g => Number(g.period) || 0));
            return { ok: true, period, gauges };
        } catch (e) {
            lastErr = e;
            // Contract-level refusal (query parse / state errors) arrives as HTTP
            // 4xx/5xx WITH a cosmwasm error body — that's floor-shaped, not transient.
            if (e.statusCode && e.body && /ve3_shared|query wasm contract failed|not found|Generic error/i.test(e.body)) {
                return { ok: false, floor: true, error: e.body };
            }
            await sleep(250 * (attempt + 1)); // transient — back off and alternate LCD
        }
    }
    return { ok: false, floor: false, error: String(lastErr && lastErr.message || lastErr) };
}

// ---- committed-state reads: authenticated API + raw media type (2.1.0/2.1.1)
function ghRaw(path) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
            method: 'GET',
            headers: { 'User-Agent': 'org-tla-voting-distributions', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.raw' },
        };
        const req = https.request(opts, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                if (res.statusCode === 404) return resolve(null);
                if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(d)); } catch { reject(new Error('bad JSON from API raw read')); } }
                else reject(new Error(`GitHub raw read ${path}: ${res.statusCode} ${d.slice(0, 150)}`));
            });
        });
        req.on('error', reject); req.end();
    });
}
const readHistory = () => ghRaw(`${DIST_DIR}/history.json`);
const readIndex   = () => ghRaw(`${DIST_DIR}/index.json`);

// ---- invariant: fractions per gauge sum to 1 ± 1e-9
function checkInvariant(entry) {
    const violations = [];
    for (const g of entry.gauges) {
        if (!Array.isArray(g.assets) || g.assets.length === 0) continue;
        const sum = g.assets.reduce((s, a) => s + parseFloat(a.distribution || 0), 0);
        if (Math.abs(sum - 1) > 1e-9) violations.push({ gauge: g.gauge, sum });
    }
    return violations;
}

function makeEntry(period, gauges, capturedAt) {
    const entry = { period, capturedAt, gauges };
    const violations = checkInvariant(entry);
    if (violations.length) entry._invariant_violations = violations; // marked, never dropped
    return entry;
}

function buildIndex(entries, { floorCertificate, knownGaps, runNote }) {
    const periods = entries.map(e => e.period);
    const withViolations = entries.filter(e => e._invariant_violations).map(e => e.period);
    return {
        schemaVersion: DIST_SCHEMA_VERSION,
        module: 'tla-voting', product: 'distributions',
        storage_layout: STORAGE_LAYOUT,
        generatedAt: new Date().toISOString(),
        count: entries.length,
        period_floor: periods.length ? Math.min(...periods) : null,
        period_head: periods.length ? Math.max(...periods) : null,
        known_gaps: knownGaps.length ? knownGaps : [],
        invariant_violations: withViolations.length ? withViolations : [],
        floor_certificate: floorCertificate || null,
        note: runNote || undefined,
    };
}

// <<DISTRIBUTIONS CORE v1 END>>

// publish helper (same shape as org-tla-voting's; kept local so the one-shot
// has zero coupling to the forward cron's internals)
function githubApiRequest(method, apiPath, body) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'api.github.com', path: apiPath, method, headers: { 'User-Agent': 'harvest-distributions', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } };
        if (body) opts.headers['Content-Type'] = 'application/json';
        const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(d)); } catch { resolve(d); } } else reject(new Error(`GitHub ${method}: ${res.statusCode} ${d.slice(0, 200)}`)); }); });
        req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
    });
}
async function publishFile(filePath, contentObj, message) {
    const content = JSON.stringify(contentObj, null, 2);
    const apiPath = `/repos/${GITHUB_REPO}/contents/${filePath}`;
    let sha = null;
    try { sha = (await githubApiRequest('GET', apiPath + `?ref=${GITHUB_BRANCH}`)).sha; } catch { /* new file */ }
    const body = { message, content: Buffer.from(content).toString('base64'), branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;
    return githubApiRequest('PUT', apiPath, body);
}

async function main() {
    const startedAt = new Date();
    console.log(`\n📜 harvest-distributions — ${startedAt.toISOString()} (layout: ${STORAGE_LAYOUT}${DRY_RUN ? ', DRY RUN' : ''})\n`);
    if (!GITHUB_TOKEN && !DRY_RUN) throw new Error('GITHUB_TOKEN missing (set DRY_RUN=1 to walk without publishing)');

    // Current finalized period = the walk's starting head.
    const cur = await fetchDistributions('current');
    if (!cur.ok) throw new Error(`current-period query failed: ${cur.error}`);
    const head = cur.period;
    console.log(`  current finalized period: ${head}`);

    // Idempotency: never re-fetch committed periods.
    const prior = DRY_RUN ? null : await readHistory();
    const entries = (prior && Array.isArray(prior.entries)) ? prior.entries.slice() : [];
    const have = new Set(entries.map(e => e.period));
    console.log(`  committed periods already present: ${have.size}`);

    const capturedAt = startedAt.toISOString();
    const knownGaps = [];
    let floorRun = 0;                 // consecutive floor-shaped responses
    let floorCertificate = null;
    let fetched = 0;

    for (let p = head; p >= 1; p--) {
        if (have.has(p)) { floorRun = 0; continue; }
        const r = (p === head) ? cur : await fetchDistributions(p);
        if (r.ok) {
            entries.push(makeEntry(p, r.gauges, capturedAt));
            fetched++; floorRun = 0;
            if (fetched % 10 === 0) console.log(`    …period ${p} (${fetched} fetched)`);
        } else if (r.floor) {
            floorRun++;
            if (!floorCertificate) floorCertificate = { first_floor_period: p, evidence: String(r.error).slice(0, 300), probedAt: capturedAt };
            if (floorRun >= FLOOR_CONFIRM) {
                console.log(`  🧱 floor certified at period ${floorCertificate.first_floor_period} (${floorRun} consecutive floor responses)`);
                console.log(`     deepest valid period: ${floorCertificate.first_floor_period + 1}`);
                break;
            }
        } else {
            // transient after retries — a GAP, not the floor. Record and continue.
            knownGaps.push({ period: p, error: r.error, at: capturedAt });
            console.warn(`  ⚠ period ${p}: transient failure recorded as gap (${r.error})`);
            floorRun = 0;
        }
        await sleep(PACE_MS);
    }

    entries.sort((a, b) => a.period - b.period);
    const history = { schemaVersion: DIST_SCHEMA_VERSION, module: 'tla-voting', product: 'distributions', entries };
    const index = buildIndex(entries, { floorCertificate, knownGaps, runNote: `harvest ${capturedAt}` });

    console.log(`\n📋 harvest summary:`);
    console.log(`  periods: ${index.period_floor} → ${index.period_head}  (${index.count} entries, ${fetched} newly fetched)`);
    console.log(`  known_gaps: ${knownGaps.length}  invariant violations: ${index.invariant_violations.length}`);
    if (floorCertificate) console.log(`  floor certificate: first floor period ${floorCertificate.first_floor_period} — "${floorCertificate.evidence.slice(0, 80)}…"`);

    if (DRY_RUN) { console.log('\nDRY RUN — nothing published.'); return; }
    if (fetched === 0 && knownGaps.length === 0) { console.log('\nAlready complete — no-op (idempotent).'); return; }
    await publishFile(`${DIST_DIR}/history.json`, history, `distributions: harvest ${index.period_floor}→${index.period_head}`);
    await publishFile(`${DIST_DIR}/index.json`, index, `distributions: index (harvest)`);
    await publishFile(`${DIST_DIR}/heartbeat.json`, {
        schemaVersion: DIST_SCHEMA_VERSION, cron: 'harvest-distributions', product: 'distributions',
        capturedAt, status: knownGaps.length ? 'partial' : 'ok', period_floor: index.period_floor, period_head: index.period_head, count: index.count,
    }, 'distributions heartbeat (harvest)');
    console.log('\n✅ published: history.json, index.json, heartbeat.json');
}

main().catch(e => { console.error('fatal:', e); process.exit(1); });

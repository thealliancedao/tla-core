// =============================================================================
// registry-backfill.js — E2: the capture-registry archive backfill (close the
// hole, one pass). Spec: docs/pending-changes/SPEC-capture-registry-backfill.md
// Lives in: tla-core/.github/scripts/tla-voting/
// Workflow: .github/workflows/tla-voting-registry-backfill.yml (checks out
//           BOTH repos; this script require()s the LIVE cron classifiers —
//           "no third copy", the fcd-rederive-bribes.js precedent).
// =============================================================================
//
// WHAT: registry-driven archive walk of every contract in
// tla-voting/capture-registry.json, per-contract height cursor, recovering all
// streams at once (walk-once doctrine, spec §2):
//   bribes + rewards  ← incentive manager (org-tla-voting 2.3.1 classifier:
//                       collision-aware promoted msg_index, dynamic dao_attr)
//   votes  + rewards  ← gauge controller
//   locks  + rewards  ← vAMP escrow
//   flows (v2)        ← buckets ×4, amp compounder, zapper
//                       (<<FLOWS CLASSIFIER v2>>: pool identity + claim
//                       amounts; schema-upgrade merge replaces walker-era v1)
//   dao_attr context  ← PD DAO core (context census; its bribes surface via
//                       the manager query — same txs, dedup-safe)
//
// TARGETS (per entry, recorded into the registry as target_height/basis):
//   voting entries → the committed voting cursor at job start (full walker-era
//     re-derive: covers the hole, the recorded Jun-15→22 prune gaps, AND the
//     pre-v6.1 stretch where governance bribes were walked but never promoted
//     — the PD fixtures live there). mergeEvents dedup keeps every committed
//     event byte-identical; only misses are added. Override: VOTING_HEAD.
//   flows entries  → the v2-deploy head, derived from committed months (the
//     earliest schemaVersion≥2 record above the hole's right edge — the
//     registry e2_note). Override: E2_HEAD.
//   Walk floors additionally honor per-stream known_gaps left edges when they
//   sit BELOW the registry cursor (the bribes gap starts at 13,736,597 —
//   1,214 blocks under the registry floor; honesty over convenience).
//
// TRANSPORT (E1, spec §4 — transport-agnostic, endpoint arrives later as env):
//   ARCHIVE_LCD  (preferred) — cosmos REST tx service, height-ranged
//     /cosmos/tx/v1beta1/txs?query=wasm._contract_address='…' AND
//     tx.height>=A AND tx.height<=B — returns DECODED tx_responses, the exact
//     shape every classifier has always consumed. Param dialect (query= vs
//     legacy events=) is probed once and cached.
//   ARCHIVE_RPC  (optional) — Tendermint /tx_search: discovery + count
//     cross-check in preflight. Decoded bodies still need the LCD — most
//     archive providers expose both; the preflight report says exactly what
//     the given endpoint(s) can do BEFORE any walk.
//   No endpoint set → clean "E1 pending" exit 0. Deploy today, plug in later.
//
// MODES:
//   preflight (default) — capability probe + plan. Writes nothing.
//   walk               — the job. DRY_RUN=1 classifies+merges in memory and
//                        prints the plan; no writes, no commits, cursors hold.
//   gate               — offline self-test on fixtures + committed data.
//                        No network. Run before every commit of this file.
//
// RESUMABILITY: cursors committed after every window via in-job git
// checkpoint (add/commit/push with pull-rebase retry). A killed run resumes
// from the last committed window. TIME_BUDGET_MIN stops cleanly before the
// Actions ceiling; re-dispatch continues.
//
// MERGE LAWS (unchanged, enforced here as everywhere):
//   voting: mergeEvents dedup key (tx_hash|type|wallet/briber|msg_index),
//     prior WINS on key match, never-shrink + prior-byte-identity asserted
//     per touched month before write.
//   flows: mergeMonth — higher schemaVersion replaces in place, lower/equal
//     never overwrites; never-shrink asserted by this caller.
//   Idempotence: a second completed run adds 0 and upgrades 0.
//
// COMPLETION GATES (spec §7 + §10): when every entry reaches its target, the
// §10 fixtures (tla-voting/backfill-fixtures.json) are evaluated against the
// merged streams — byte-level field assertions per fixture; each recovered
// fixture event is printed VERBATIM for hand-verification. Any miss fails the
// job loudly. The manager census (unknown_manager_wasm) runs over the whole
// archive corpus and lands in tla-voting/backfill-report.json — the §5
// refund/expiry event class (E0c) gets enumerated from real data by this very
// pass; once the classifier learns it, re-running this job backfills those
// events (idempotence makes that safe by construction).
// =============================================================================
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');

// ----------------------------------------------------------------------------- env
const MODE = (process.env.MODE || 'preflight').toLowerCase();      // preflight | walk | gate
const DRY = process.env.DRY_RUN === '1';
const CORE_DIR = path.resolve(process.env.TLA_CORE_DIR || '.');
const CRONS_DIR = path.resolve(process.env.PLATFORM_CRONS_DIR || path.join(CORE_DIR, '..', 'platform-crons'));
const ARCHIVE_LCD = (process.env.ARCHIVE_LCD || '').replace(/\/+$/, '');
const ARCHIVE_RPC = (process.env.ARCHIVE_RPC || '').replace(/\/+$/, '');
const STARSCREAM_URL = (process.env.STARSCREAM_URL || '').replace(/\/+$/, '');   // Chainscope GraphQL indexer (E1 alt transport — USE ONLY WITH THEIR BLESSING)
const SS_LIMIT = Number(process.env.SS_LIMIT || 100);
const SS_PAIRS = process.env.STARSCREAM_PAIRS === '1';   // pair walks over starscream page EVERY swap — explicit opt-in only
const TRANSPORT = STARSCREAM_URL && !ARCHIVE_LCD ? 'starscream' : 'lcd';
const WINDOW_BLOCKS = Math.max(10000, Number(process.env.WINDOW_BLOCKS || 250000));
const PAGE_LIMIT = Number(process.env.PAGE_LIMIT || 100);
const PAGE_RETRIES = Number(process.env.PAGE_RETRIES || 8);
const ERR_BACKOFF = Number(process.env.PAGER_ERR_BACKOFF || 400);
const REQ_DELAY = Number(process.env.REQ_DELAY_MS || 120);          // ≤5 conc doctrine → serial + spacing
const TIME_BUDGET_MIN = Number(process.env.TIME_BUDGET_MIN || 320);
const GIT_CHECKPOINT = process.env.GIT_CHECKPOINT !== '0';
const VOTING_HEAD = process.env.VOTING_HEAD ? Number(process.env.VOTING_HEAD) : null;
const E2_HEAD = process.env.E2_HEAD ? Number(process.env.E2_HEAD) : null;
const WALK_FLOOR = process.env.WALK_FLOOR ? Number(process.env.WALK_FLOOR) : null;  // staged mode: walk only [max(floor,WALK_FLOOR), target] on THIS source; deep remainder stays honestly open

process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'unused-local';

// ----------------------------------------------------------------------------- live cron modules (no third copy)
const MV = require(path.join(CRONS_DIR, 'tla-voting', 'index.js'));   // classifiers v6.1, mergeEvents, eventKey, census
const MF = require(path.join(CRONS_DIR, 'tla-flows', 'index.js'));    // <<FLOWS CLASSIFIER v3>>, mergeMonth, WATCH
const AX = require(path.join(CRONS_DIR, 'tla-flows', 'lib', 'aux-classifiers.js')); // extension-stream classifiers + mergeKeyed

const REGISTRY_PATH = path.join(CORE_DIR, 'tla-voting', 'capture-registry.json');
const FIXTURES_PATH = path.join(CORE_DIR, 'tla-voting', 'backfill-fixtures.json');
const REPORT_PATH = path.join(CORE_DIR, 'tla-voting', 'backfill-report.json');
const VOTING_DIR = path.join(CORE_DIR, 'tla-voting', 'events');
const FLOWS_DIR = path.join(CORE_DIR, 'tla-flows', 'events');
const AUX_DIRS = {
    votion_flows:   path.join(CORE_DIR, 'votion', 'events'),
    dex_liquidity:  path.join(CORE_DIR, 'dex-liquidity', 'events'),
    nft_transfers:  path.join(CORE_DIR, 'nfts', 'adao', 'transfers'),
    price_samples:  path.join(CORE_DIR, 'price-history', 'reserve-implied'),
};
let ACTION_FILTER_OK = null;   // probed once; pair walks REQUIRE it

const MANAGER = 'terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh';
const GAUGE = 'terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj';
const ESCROW = 'terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg';
const PD_DAO = 'terra1k8ug6dkzntczfzn76wsh24tdjmx944yj6mk063wum7n20cwd7lxq4lppjg';
const PD_PROP = 'terra1660g9mle5kfsq8c0p4k4hgr9ujdyr3m48c22cawy0akr98rmwksqehqnup';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let WINDOWS_DONE = 0;   // global progress — survives into the crash handler
function writeRunStatus(state) { try { fs.writeFileSync('/tmp/backfill-status.json', JSON.stringify({ state, windows: WINDOWS_DONE })); } catch {} }
const startedAt = Date.now();
const outOfBudget = () => (Date.now() - startedAt) / 60000 > TIME_BUDGET_MIN;

// ============================================================================= self-gates
// Voting self-gate — the PD fixture, chainscope-verbatim (tx 402AE7B1…AAAA7),
// lifted from fcd-rederive-bribes.js. Running against a pre-2.3.1 checkout is
// therefore impossible.
function selfGateVoting() {
    const NET = ['8478910934', '1695782186', '4239455467', '4239455467', '847891093',
        '847891093', '847891093', '8478910934', '3391564373', '1695782186'];
    const tx = {
        txhash: '402AE7B14451C9C46612DBD5342FC722A8562B2900AB35973081082B66FAAAA7',
        height: '21827518', timestamp: '2026-07-09T04:45:27Z',
        tx: { body: { messages: [{ sender: 'terra14p3mc04s7jcaxvvetlzehvhx9gdx6w4nm3zzw3',
            contract: PD_PROP, msg: { execute: { proposal_id: 250 } }, funds: [] }] } },
        events: [
            { type: 'wasm', attributes: [{ key: '_contract_address', value: PD_PROP },
                { key: 'action', value: 'execute' }, { key: 'dao', value: PD_DAO }, { key: 'msg_index', value: '0' }] },
            ...NET.map(a => ({ type: 'wasm', attributes: [
                { key: '_contract_address', value: MANAGER }, { key: 'action', value: 'bribe/add_bribe' },
                { key: 'added', value: 'native:uluna:' + a }, { key: 'end', value: '196' },
                { key: 'start', value: '193' }, { key: 'msg_index', value: '0' }] }))],
    };
    const { bribeEvents } = MV.classifyIncentiveTxs([tx], {});
    const { merged } = MV.mergeEvents([], bribeEvents);
    const total = merged.reduce((s, e) => s + Number(e.coins[0].amount), 0);
    const keys = new Set(merged.map(e => MV.eventKey(e)));
    const ok = bribeEvents.length === 10 && merged.length === 10 && total === 34763534826 &&
        merged.every(e => e.briber === PD_DAO && e.briber_source === 'dao_attr') && keys.size === 10;
    if (!ok) {
        console.error(`SELF-GATE (voting) FAILED — checked-out platform-crons classifier is not v6.1 ` +
            `(promoted ${bribeEvents.length}, survived ${merged.length}, total ${total}). ABORTING.`);
        process.exit(1);
    }
    console.log('self-gate voting: v6.1 invariants hold on the PD fixture');
}

// Flows self-gate — proves the checked-out tla-flows carries <<FLOWS
// CLASSIFIER v2>> (pool identity + schema-upgrade merge), not v1.
function selfGateFlows() {
    const bucketAddr = Object.keys(MF.WATCH).find(a => MF.WATCH[a] && MF.WATCH[a].startsWith('staking-'));
    if (!bucketAddr) { console.error('SELF-GATE (flows) FAILED — no staking-* entry in WATCH. ABORTING.'); process.exit(1); }
    const tx = {
        txhash: 'F'.repeat(64), height: '21990000', code: 0, timestamp: '2026-07-25T00:00:00Z',
        events: [{ type: 'wasm', attributes: [
            { key: '_contract_address', value: bucketAddr }, { key: 'action', value: 'asset/stake' },
            { key: 'user', value: 'terra1selfgateflowsuser' }, { key: 'share', value: '12345' },
            { key: 'asset', value: 'cw20:terra1selfgatepool' }] }],
    };
    const rec = MF.classifyFlowTx(tx);
    const gauge = MF.WATCH[bucketAddr].slice(8);
    const okClassify = rec && Number(rec.schemaVersion) >= 2 && rec.type === 'deposit' &&
        rec.mechanism === 'non_amplified' && rec.pool === 'cw20:terra1selfgatepool' && rec.gauge === gauge;
    const v1 = { schemaVersion: 1, txhash: tx.txhash, height: 21990000, timestamp: tx.timestamp, type: 'deposit' };
    const up = MF.mergeMonth([v1], [rec || {}]);
    const same = MF.mergeMonth(up.merged, [rec || {}]);
    const okMerge = up.added === 0 && up.upgraded === 1 && up.merged.length === 1 &&
        up.merged[0].schemaVersion === (rec && rec.schemaVersion) && same.added === 0 && same.upgraded === 0;
    if (!okClassify || !okMerge) {
        console.error(`SELF-GATE (flows) FAILED — checked-out tla-flows is not v2 ` +
            `(classify ${okClassify}, upgrade-merge ${okMerge}). ABORTING.`);
        process.exit(1);
    }
    console.log(`self-gate flows: <<FLOWS CLASSIFIER v${rec.schemaVersion}>> + schema-upgrade merge hold`);
}

// ============================================================================= transport
function httpGetJson(url, timeoutMs = 30000, redirects = 3) {
    const mod = url.startsWith('https:') ? https : http;
    return new Promise((res, rej) => {
        const r = mod.get(url, { headers: { Accept: 'application/json', 'User-Agent': 'tla-registry-backfill/1.0' } }, (x) => {
            // follow redirects (Cloudflare-fronted LCDs 301 to their canonical
            // host — observed on phoenix-lcd.terra.dev, preflight run #2)
            if ([301, 302, 307, 308].includes(x.statusCode) && x.headers.location && redirects > 0) {
                x.resume();
                const next = new URL(x.headers.location, url).toString();
                console.log(`    ↪ HTTP ${x.statusCode} → following redirect to ${next.split('/').slice(0, 3).join('/')}…`);
                return res(httpGetJson(next, timeoutMs, redirects - 1));
            }
            let b = ''; x.on('data', c => b += c); x.on('end', () => {
                if (x.statusCode >= 200 && x.statusCode < 300) { try { res(JSON.parse(b)); } catch { rej(new Error(`bad JSON (HTTP ${x.statusCode})`)); } }
                else rej(Object.assign(new Error(`HTTP ${x.statusCode} ${b.slice(0, 200)}`), { statusCode: x.statusCode, body: b.slice(0, 400) }));
            });
        });
        r.on('error', rej); r.setTimeout(timeoutMs, () => r.destroy(new Error('timeout')));
    });
}

let LCD_DIALECT = null; // 'query' | 'events'
async function probeLcdDialect() {
    if (LCD_DIALECT) return LCD_DIALECT;
    const cond = `wasm._contract_address='${MANAGER}' AND tx.height>=13737811 AND tx.height<=13737911`;
    const errs = [];
    for (const dialect of ['query', 'events']) {
        const url = `${ARCHIVE_LCD}/cosmos/tx/v1beta1/txs?${dialect}=${encodeURIComponent(cond)}&order_by=ORDER_BY_ASC&page=1&limit=1`;
        try { await httpGetJson(url); LCD_DIALECT = dialect; return dialect; }
        catch (e) { errs.push(`${dialect}=: ${e.message.slice(0, 120)}`); }
    }
    throw new Error(`archive LCD rejected BOTH tx-query dialects — endpoint unusable for height-ranged event queries (${errs.join(' | ')})`);
}

async function probeActionFilter(registry) {
    if (ACTION_FILTER_OK != null) return ACTION_FILTER_OK;
    const from = Number(registry.hole.from_height);
    const dialect = await probeLcdDialect();
    const cond = `wasm._contract_address='${MANAGER}' AND wasm.action='bribe/add_bribe' AND tx.height>=${from} AND tx.height<=${from + 50000}`;
    const url = `${ARCHIVE_LCD}/cosmos/tx/v1beta1/txs?${dialect}=${encodeURIComponent(cond)}&order_by=ORDER_BY_ASC&page=1&limit=1`;
    try { const r = await httpGetJson(url); ACTION_FILTER_OK = Array.isArray(r.tx_responses); }
    catch { ACTION_FILTER_OK = false; }
    console.log(`  action-filtered event queries: ${ACTION_FILTER_OK ? 'SUPPORTED' : 'NOT SUPPORTED'} — pair (dex_liquidity) walks ${ACTION_FILTER_OK ? 'enabled' : 'BLOCKED (full pair corpus is swap-volume-prohibitive; use an endpoint that supports compound event queries)'}`);
    return ACTION_FILTER_OK;
}

// Height-windowed page fetch. Archive nodes paginate deterministically (the
// publicnode flake the seed's pager fights is a shared-fleet artifact), but we
// keep per-page retries + a dedupe/regression check anyway — trust nothing.
let EFF_PAGE_LIMIT = null;   // adaptive: shrinks (stickily) when a node's gRPC response-size cap trips on event-heavy pages
async function fetchWindowTxs(addr, hFrom, hTo, label, extraCond) {
    const dialect = await probeLcdDialect();
    if (EFF_PAGE_LIMIT == null) EFF_PAGE_LIMIT = PAGE_LIMIT;
    const cond = `wasm._contract_address='${addr}' AND tx.height>=${hFrom} AND tx.height<=${hTo}` + (extraCond ? ` AND ${extraCond}` : '');
    const urlOf = (page) => `${ARCHIVE_LCD}/cosmos/tx/v1beta1/txs?${dialect}=${encodeURIComponent(cond)}&order_by=ORDER_BY_ASC&page=${page}&limit=${EFF_PAGE_LIMIT}`;
    let out = []; let seen = new Set();
    let total = null;
    for (let page = 1; ; page++) {
        let resp = null, lastErr = null;
        for (let a = 0; a < PAGE_RETRIES; a++) {
            try { resp = await httpGetJson(urlOf(page)); break; }
            catch (e) {
                if (/larger than max/i.test(e.message) && EFF_PAGE_LIMIT > 5) {
                    EFF_PAGE_LIMIT = Math.max(5, Math.floor(EFF_PAGE_LIMIT / 2));
                    console.log(`    ↳ ${label}: node's response-size cap tripped — page limit shrunk to ${EFF_PAGE_LIMIT}, window restarts`);
                    out = []; seen = new Set(); total = null; page = 0;   // restart this window's paging at the smaller size
                    resp = null; lastErr = null; break;
                }
                lastErr = e; await sleep(ERR_BACKOFF * (a + 1));
            }
        }
        if (page === 0) continue;
        if (!resp) throw new Error(`${label} p${page}: unreachable after ${PAGE_RETRIES} tries (${lastErr && lastErr.message}) — window aborts, cursor holds`);
        const batch = resp.tx_responses || [];
        const t = Number(resp.total ?? resp.pagination?.total ?? NaN);
        if (Number.isFinite(t)) total = t;
        let fresh = 0;
        for (const tr of batch) {
            if (seen.has(tr.txhash)) continue;
            seen.add(tr.txhash); out.push(tr); fresh++;
        }
        if (!batch.length) break;
        if (total != null && out.length >= total) break;
        if (batch.length < EFF_PAGE_LIMIT && total == null) break;
        if (fresh === 0 && batch.length) throw new Error(`${label} p${page}: page returned only duplicates — pagination broken, window aborts`);
        await sleep(REQ_DELAY);
    }
    if (total != null && out.length !== total) {
        throw new Error(`${label}: collected ${out.length} ≠ reported total ${total} — refusing a silently-partial window`);
    }
    out.sort((a, b) => Number(a.height) - Number(b.height) || (a.txhash < b.txhash ? -1 : 1));
    const ok = out.filter(tr => Number(tr.code || 0) === 0);   // failed txs never classified (walker law)
    return { txs: ok, totalSeen: out.length, reportedTotal: total };
}

// ----------------------------------------------------------------------------- starscream transport (Chainscope GraphQL indexer)
// Address-paged discovery: AddressTxs(address, offset) DESC pages with FULL
// decoded messages + per-message raw events (shape verified from a real
// captured response of DeFi_Patriot's own test tx DCA53591 — gate 9).
// Adapter maps each tx onto the exact tx_response shape every classifier has
// always consumed; events are flattened with msg_index injected per message
// position when absent. Pair entries stay BLOCKED under this transport unless
// STARSCREAM_PAIRS=1 (paging every swap ever is a volume decision Chainscope
// gets to make, not us).
const SS_QUERY = `query AddressTxs($address: String!, $offset: String) {\n  address(address: $address) {\n    txsCount\n    txs(offset: $offset) {\n      height txhash code timestamp\n      messages { msg { value } events { type attributes { key value } } }\n    }\n  }\n}`;
function httpPostJson(url, body, timeoutMs = 45000) {
    return new Promise((res, rej) => {
        const u = new URL(url);
        const r = https.request({ hostname: u.hostname, port: u.port || 443, path: u.pathname || '/', method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'tla-registry-backfill/1.0' } }, (x) => {
            let b = ''; x.on('data', c => b += c); x.on('end', () => {
                if (x.statusCode >= 200 && x.statusCode < 300) { try { res(JSON.parse(b)); } catch { rej(new Error(`bad JSON (HTTP ${x.statusCode})`)); } }
                else rej(Object.assign(new Error(`HTTP ${x.statusCode} ${b.slice(0, 200)}`), { statusCode: x.statusCode }));
            });
        });
        r.on('error', rej); r.setTimeout(timeoutMs, () => r.destroy(new Error('timeout')));
        r.write(JSON.stringify(body)); r.end();
    });
}
function adaptStarscreamTx(t) {
    const messages = (t.messages || []).map(m => m?.msg?.value).filter(Boolean);
    const events = [];
    (t.messages || []).forEach((m, mi) => {
        for (const ev of (m.events || [])) {
            const hasIdx = (ev.attributes || []).some(a => a.key === 'msg_index');
            events.push(hasIdx ? ev : { type: ev.type, attributes: [...(ev.attributes || []), { key: 'msg_index', value: String(mi) }] });
        }
    });
    return { txhash: t.txhash, height: String(t.height), timestamp: t.timestamp, code: Number(t.code || 0),
             tx: { body: { messages } }, events };
}
async function ssFetchPage(address, offset) {
    let last = null;
    for (let a = 0; a < PAGE_RETRIES; a++) {
        try {
            const r = await httpPostJson(STARSCREAM_URL, { query: SS_QUERY, variables: { address, offset: String(offset), order: 'desc', limit: SS_LIMIT }, operationName: 'AddressTxs' });
            if (r.errors) throw new Error('GraphQL: ' + JSON.stringify(r.errors).slice(0, 160));
            const a2 = r?.data?.address || {};
            return { txs: a2.txs || [], txsCount: Number(a2.txsCount ?? NaN) };
        } catch (e) { last = e; await sleep(ERR_BACKOFF * (a + 1)); }
    }
    throw new Error(`starscream page @${offset} for ${address.slice(0, 12)}…: ${last && last.message}`);
}

// ============================================================================= registry + targets
function readJson(p, fallback) {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj, pretty = 2) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, pretty) + '\n');
}

function streamGapEdges(index) {
    // per-stream known_gaps → { minFrom, maxTo } for floor/target honesty
    const out = {};
    for (const [name, s] of Object.entries(index.streams || {})) {
        const gaps = Array.isArray(s.known_gaps) ? s.known_gaps : [];
        const froms = gaps.map(g => Number(g.from_height)).filter(Number.isFinite);
        const tos = gaps.map(g => Number(g.to_height)).filter(Number.isFinite);
        out[name] = { minFrom: froms.length ? Math.min(...froms) : null, maxTo: tos.length ? Math.max(...tos) : null };
    }
    return out;
}

function deriveFlowsV2Head(holeTo) {
    // earliest schemaVersion≥2 record ABOVE the hole's right edge = the
    // v2-deploy boundary (FCD-era months were upgraded to v2 in place but sit
    // BELOW the hole; the gap-fill + walker v1 stretch sits between).
    let min = null;
    for (const y of fs.readdirSync(FLOWS_DIR).filter(d => /^\d{4}$/.test(d)).sort()) {
        for (const f of fs.readdirSync(path.join(FLOWS_DIR, y)).filter(f => /^\d{2}\.json$/.test(f)).sort()) {
            const arr = readJson(path.join(FLOWS_DIR, y, f), []);
            for (const r of arr) {
                if (Number(r.schemaVersion || 1) >= 2 && Number(r.height) > holeTo) {
                    if (min == null || Number(r.height) < min) min = Number(r.height);
                }
            }
        }
    }
    return min;
}

function computeTargets(registry, votingIndex, votingCursor) {
    const holeTo = Number(registry.hole.to_height);
    const gapEdges = streamGapEdges(votingIndex);
    const votingHead = VOTING_HEAD || Number(votingCursor.last_block);
    if (!Number.isFinite(votingHead)) throw new Error('cannot derive voting head (cursor.json unreadable and no VOTING_HEAD)');
    let flowsHead = E2_HEAD || deriveFlowsV2Head(holeTo);
    if (!Number.isFinite(flowsHead)) {
        throw new Error('cannot derive the flows v2-deploy head from committed months — pass E2_HEAD explicitly');
    }
    const plans = [];
    for (const entry of registry.contracts) {
        const streams = entry.streams || [];
        const isFlowsOnlyOrBucket = streams.includes('flows');
        let target, basis, streamName = null;
        if (streams.includes('bribes') && entry.address === MANAGER) { streamName = 'bribes'; }
        else if (streams.includes('votes')) streamName = 'votes';
        else if (streams.includes('locks')) streamName = 'locks';
        const isExtension = ['votion_flows', 'dex_liquidity', 'nft_transfers'].some(s => streams.includes(s)) && !streamName;
        if (streamName || streams.includes('dao_attr_context') || isExtension) {
            target = votingHead;
            basis = VOTING_HEAD ? 'VOTING_HEAD override'
                : isExtension ? `live head (${votingHead}) — extension stream, no forward capture yet; walker WATCH rider takes over post-deploy`
                : `committed voting cursor (${votingHead}) — full walker-era re-derive at v6.1 (dedup-safe)`;
        } else if (isFlowsOnlyOrBucket) {
            target = flowsHead; basis = E2_HEAD ? 'E2_HEAD override' : `derived flows v2-deploy head (${flowsHead}) — e2_note`;
        } else { target = holeTo; basis = 'hole right edge'; }
        // floor: registry cursor, lowered to the stream's recorded gap left edge
        let floor = Number(entry.cursor_height);
        const ge = streamName ? gapEdges[streamName] : null;
        let floorNote = 'registry cursor';
        if (ge && ge.minFrom != null && ge.minFrom < floor) { floor = ge.minFrom; floorNote = `stream known_gaps left edge (${ge.minFrom}) below registry cursor — honored`; }
        plans.push({ entry, floor, floorNote, target, basis, streamName });
    }
    return { plans, votingHead, flowsHead };
}

// ============================================================================= classification routing
const monthOf = (ts) => { const s = String(ts || ''); const ym = s.slice(0, 7); return /^\d{4}-\d{2}$/.test(ym) ? ym : null; };

function routeAndClassify(plan, txs, discovered, contextCensus, reg) {
    const out = { votes: [], locks: [], bribes: [], rewards: [], flows: [], votion_flows: [], dex_liquidity: [], nft_transfers: [], swap_samples: [] };
    const { entry } = plan;
    const streams = entry.streams || [];
    if (entry.address === MANAGER) {
        const r = MV.classifyIncentiveTxs(txs, discovered);           // census rides inside
        out.bribes = r.bribeEvents; out.rewards = r.rewardEvents;
    } else if (streams.includes('votes')) {
        const r = MV.classifyGaugeTxs(txs, discovered);
        out.votes = r.voteEvents; out.rewards = r.rewardEvents;
    } else if (streams.includes('locks')) {
        const r = MV.classifyEscrowTxs(txs, discovered);
        out.locks = r.lockEvents; out.rewards = r.rewardEvents;
    } else if (streams.includes('dao_attr_context')) {
        // context-only: PD's bribes surface via the manager query (same txs).
        for (const tr of txs) {
            for (const ev of tr.events || []) {
                if (ev.type !== 'wasm') continue;
                let c = null, a = null;
                for (const kv of ev.attributes || []) {
                    if (kv.key === '_contract_address') c = kv.value;
                    else if (kv.key === 'action') a = kv.value;
                }
                if (c === entry.address && a) contextCensus[a] = (contextCensus[a] || 0) + 1;
            }
        }
    }
    if (streams.includes('flows')) {
        for (const tr of txs) { const rec = MF.classifyFlowTx(tr); if (rec) out.flows.push(rec); }
        // extension rider: swap price samples + any pair provide/withdraw legs
        // riding the SAME zapper/bucket txs (dedup-safe via record keys)
        for (const tr of txs) {
            const r = AX.classifyPairLiquidityTx(tr, reg.pairs);
            out.dex_liquidity.push(...r.records); out.swap_samples.push(...r.swapSamples);
        }
    }
    if (streams.includes('votion_flows')) {
        for (const tr of txs) out.votion_flows.push(...AX.classifyVotionTx(tr, { [entry.address]: { vdenom: entry.vdenom, lst: entry.lst } }));
    }
    if (streams.includes('dex_liquidity') && !streams.includes('flows')) {
        for (const tr of txs) {
            const r = AX.classifyPairLiquidityTx(tr, reg.pairs);
            out.dex_liquidity.push(...r.records); out.swap_samples.push(...r.swapSamples);
        }
    }
    if (streams.includes('nft_transfers')) {
        for (const tr of txs) out.nft_transfers.push(...AX.classifyNftTx(tr, reg.nftContracts));
    }
    // NOTE (walk-once bookkeeping): bucket entries list streams
    // ["bribes","flows"] — their tribute bribes are events ON THE MANAGER and
    // are captured by the manager entry's own query. Recorded in the report.
    return out;
}

// ============================================================================= merge (working tree)
function mergeVotingMonth(stream, ym, fresh, tallies) {
    const [yyyy, mm] = ym.split('-');
    const fp = path.join(VOTING_DIR, stream, yyyy, `${mm}.json`);
    const prior = readJson(fp, []);
    if (!Array.isArray(prior)) throw new Error(`${fp} is not an array — refusing to touch it`);
    const { merged, added } = MV.mergeEvents(prior, fresh);
    if (merged.length < prior.length) throw new Error(`never-shrink violated: ${stream}/${ym} merged ${merged.length} < prior ${prior.length}`);
    const byKey = new Map(merged.map(e => [MV.eventKey(e), e]));
    for (const p of prior) {
        const m = byKey.get(MV.eventKey(p));
        if (!m || JSON.stringify(m) !== JSON.stringify(p)) {
            throw new Error(`prior-verbatim violated in ${stream}/${ym} (key ${MV.eventKey(p)}) — nothing written`);
        }
    }
    tallies[stream] = (tallies[stream] || 0) + added;
    if (added > 0 && !DRY) writeJson(fp, merged, 1);
    return added;
}
function mergeFlowsMonth(ym, fresh, tallies) {
    const [yyyy, mm] = ym.split('-');
    const fp = path.join(FLOWS_DIR, yyyy, `${mm}.json`);
    const prior = readJson(fp, []);
    if (!Array.isArray(prior)) throw new Error(`${fp} is not an array — refusing to touch it`);
    const { merged, added, upgraded } = MF.mergeMonth(prior, fresh);
    if (merged.length < prior.length) throw new Error(`never-shrink violated: flows/${ym} merged ${merged.length} < prior ${prior.length}`);
    tallies.flows_added = (tallies.flows_added || 0) + added;
    tallies.flows_upgraded = (tallies.flows_upgraded || 0) + upgraded;
    if ((added > 0 || upgraded > 0) && !DRY) writeJson(fp, merged, 1);
    return { added, upgraded };
}
function mergeAuxMonth(dirKey, ym, fresh, tallies) {
    const [yyyy, mm] = ym.split('-');
    const fp = path.join(AUX_DIRS[dirKey], yyyy, `${mm}.json`);
    const prior = readJson(fp, []);
    if (!Array.isArray(prior)) throw new Error(`${fp} is not an array — refusing to touch it`);
    const { merged, added, upgraded } = AX.mergeKeyed(prior, fresh);
    if (merged.length < prior.length) throw new Error(`never-shrink violated: ${dirKey}/${ym}`);
    tallies[dirKey] = (tallies[dirKey] || 0) + added + upgraded;
    if ((added > 0 || upgraded > 0) && !DRY) writeJson(fp, merged, 1);
    return { added, upgraded };
}
function stageAndMerge(classified, tallies) {
    for (const stream of ['votes', 'locks', 'bribes', 'rewards']) {
        const byMonth = {};
        for (const ev of classified[stream]) {
            const ym = monthOf(ev.timestamp);
            if (!ym) throw new Error(`event without usable timestamp (tx ${ev.tx_hash}) — aborting window`);
            (byMonth[ym] ||= []).push(ev);
        }
        for (const ym of Object.keys(byMonth).sort()) mergeVotingMonth(stream, ym, byMonth[ym], tallies);
    }
    const byMonthF = {};
    for (const rec of classified.flows) {
        const ym = monthOf(rec.timestamp);
        if (!ym) throw new Error(`flows record without usable timestamp (tx ${rec.txhash}) — aborting window`);
        (byMonthF[ym] ||= []).push(rec);
    }
    for (const ym of Object.keys(byMonthF).sort()) mergeFlowsMonth(ym, byMonthF[ym], tallies);
    for (const dirKey of ['votion_flows', 'dex_liquidity', 'nft_transfers']) {
        const byM = {};
        for (const r of classified[dirKey] || []) { const ym = monthOf(r.timestamp); if (!ym) throw new Error(`${dirKey} record without timestamp (${r.txhash})`); (byM[ym] ||= []).push(r); }
        for (const ym of Object.keys(byM).sort()) mergeAuxMonth(dirKey, ym, byM[ym], tallies);
    }
    const sampleRecs = AX.samplesToRecords(classified.swap_samples || []);
    const byMS = {};
    for (const r of sampleRecs) (byMS[monthOf(r.timestamp)] ||= []).push(r);
    for (const ym of Object.keys(byMS).sort()) mergeAuxMonth('price_samples', ym, byMS[ym], tallies);
}

// ============================================================================= index recounts (ground truth = month files)
function recountVotingIndex() {
    const idxPath = path.join(VOTING_DIR, 'index.json');
    const idx = readJson(idxPath, null);
    if (!idx || !idx.streams) return;
    for (const stream of Object.keys(idx.streams)) {
        const dir = path.join(VOTING_DIR, stream);
        if (!fs.existsSync(dir)) continue;
        let count = 0; const mp = {};
        for (const y of fs.readdirSync(dir).filter(d => /^\d{4}$/.test(d)).sort()) {
            for (const f of fs.readdirSync(path.join(dir, y)).filter(f => /^\d{2}\.json$/.test(f)).sort()) {
                count += readJson(path.join(dir, y, f), []).length;
                (mp[y] ||= []).push(f.replace('.json', ''));
            }
        }
        idx.streams[stream].count = count;
        idx.streams[stream].months_present = mp;
        idx.streams[stream].builtAt = new Date().toISOString();
    }
    idx.updatedAt = new Date().toISOString();
    if (!DRY) writeJson(idxPath, idx, 1);
}
function recountFlowsIndex() {
    const idxPath = path.join(FLOWS_DIR, 'index.json');
    const idx = readJson(idxPath, null);
    if (!idx) return;
    const by_type = {}, mp = {}; let total = 0, first = null, latest = null, hmax = 0;
    for (const y of fs.readdirSync(FLOWS_DIR).filter(d => /^\d{4}$/.test(d)).sort()) {
        for (const f of fs.readdirSync(path.join(FLOWS_DIR, y)).filter(f => /^\d{2}\.json$/.test(f)).sort()) {
            const arr = readJson(path.join(FLOWS_DIR, y, f), []);
            for (const r of arr) {
                by_type[r.type] = (by_type[r.type] || 0) + 1; total++;
                const d = String(r.timestamp).slice(0, 10);
                if (!first || d < first) first = d; if (!latest || d > latest) latest = d;
                if (Number(r.height) > hmax) hmax = Number(r.height);
            }
            const M = f.replace('.json', ''); (mp[y] ||= []).includes(M) || mp[y].push(M); mp[y].sort();
        }
    }
    Object.assign(idx, { total_events: total, by_type, months_present: mp, first_date: first, latest_date: latest, latest_height: hmax, updatedAt: new Date().toISOString() });
    if (!DRY) writeJson(idxPath, idx, 2);
}

// ============================================================================= git checkpoint
function git(args, opts = {}) { return execFileSync('git', args, { cwd: CORE_DIR, encoding: 'utf8', ...opts }); }
function checkpoint(msg) {
    if (MODE === 'walk' && !DRY) writeRunStatus('continue');
    if (DRY || !GIT_CHECKPOINT) { console.log(`  [${DRY ? 'dry' : 'no-checkpoint'}] would commit: ${msg}`); return; }
    const addPaths = ['tla-voting/events', 'tla-voting/capture-registry.json', 'tla-voting/backfill-report.json', 'tla-flows/events', 'votion/events', 'dex-liquidity', 'nfts/adao/transfers', 'price-history/reserve-implied']
        .filter(pth => fs.existsSync(path.join(CORE_DIR, pth)));   // dirs/files are born on first write — add only what exists
    git(['add', ...addPaths]);
    try { git(['commit', '-m', msg]); } catch { console.log('  checkpoint: nothing to commit'); return; }
    for (let a = 1; a <= 10; a++) {
        try { git(['push']); console.log(`  ✓ checkpoint pushed: ${msg}`); return; }
        catch (e) {
            const wait = 1000 * a + Math.floor(Math.random() * 4000);   // jitter past the hourly crons' publish bursts
            console.warn(`  ⚠ push race lost (attempt ${a}/10) — rebase + retry in ${wait}ms`);
            try { git(['pull', '--rebase']); } catch (pe) { console.warn(`  ⚠ rebase failed: ${String(pe).slice(0, 200)}`); }
            execFileSync('sleep', [String(wait / 1000)]);
        }
    }
    throw new Error(`checkpoint push failed after 10 attempts (${msg}) — aborting so the failure is loud, work up to the previous checkpoint is committed`);
}

// ============================================================================= §10 fixture gate
function loadFlowsRecordByHash(hash) {
    for (const y of fs.readdirSync(FLOWS_DIR).filter(d => /^\d{4}$/.test(d)).sort())
        for (const f of fs.readdirSync(path.join(FLOWS_DIR, y)).filter(f => /^\d{2}\.json$/.test(f)).sort())
            for (const r of readJson(path.join(FLOWS_DIR, y, f), [])) if (r.txhash === hash) return r;
    return null;
}
function loadAllBribeEvents() {
    const dir = path.join(VOTING_DIR, 'bribes');
    const all = [];
    for (const y of fs.readdirSync(dir).filter(d => /^\d{4}$/.test(d)).sort())
        for (const f of fs.readdirSync(path.join(dir, y)).filter(f => /^\d{2}\.json$/.test(f)).sort())
            all.push(...readJson(path.join(dir, y, f), []));
    return all;
}
function coinsEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((c, i) => c.denom === b[i].denom && String(c.amount) === String(b[i].amount));
}
function evalFixtures(fixturesDoc, events) {
    const failures = [], report = [];
    for (const fx of fixturesDoc.fixtures) {
        if (fx.kind === 'exact_event') {
            const hits = events.filter(e => e.tx_hash === fx.tx_hash && e.type === fx.type);
            if (hits.length !== 1) { failures.push(`${fx.id}: expected exactly 1 ${fx.type} event for ${fx.tx_hash.slice(0, 12)}…, found ${hits.length}`); continue; }
            const e = hits[0]; const x = fx.expect; const bad = [];
            if (Number(e.height) !== Number(x.height)) bad.push(`height ${e.height}≠${x.height}`);
            if (e.timestamp !== x.timestamp) bad.push(`timestamp ${e.timestamp}≠${x.timestamp}`);
            if ('gauge' in x && e.gauge !== x.gauge) bad.push(`gauge ${e.gauge}≠${x.gauge}`);
            if ('pool' in x && e.pool !== x.pool) bad.push(`pool ${e.pool}≠${x.pool}`);
            if ('epoch_start' in x && Number(e.epoch_start) !== Number(x.epoch_start)) bad.push(`epoch_start ${e.epoch_start}≠${x.epoch_start}`);
            if ('epoch_end' in x && Number(e.epoch_end) !== Number(x.epoch_end)) bad.push(`epoch_end ${e.epoch_end}≠${x.epoch_end}`);
            if ('coins' in x && !coinsEqual(e.coins, x.coins)) bad.push(`coins ${JSON.stringify(e.coins)}≠${JSON.stringify(x.coins)}`);
            if ('fee_funds' in x && !coinsEqual(e.fee_funds, x.fee_funds)) bad.push(`fee_funds ${JSON.stringify(e.fee_funds)}≠${JSON.stringify(x.fee_funds)} — the 10-LUNA add_bribe fee must stay OUT of coins (never attributed as a PD bribe)`);
            if ('briber_is_wallet' in x && x.briber_is_wallet && !(typeof e.briber === 'string' && e.briber.startsWith('terra1'))) bad.push(`briber not a wallet (${e.briber})`);
            if (bad.length) failures.push(`${fx.id}: ${bad.join('; ')}`);
            else report.push({ fixture: fx.id, status: 'VERBATIM', recovered_event: e });
        } else if (fx.kind === 'tx_event_set') {
            const hits = events.filter(e => e.tx_hash === fx.tx_hash && e.type === fx.type);
            const total = hits.reduce((s, e) => s + (e.coins || []).filter(c => c.denom === fx.denom).reduce((a, c) => a + Number(c.amount), 0), 0);
            const bad = [];
            if (hits.length !== fx.count) bad.push(`count ${hits.length}≠${fx.count}`);
            if (String(total) !== String(fx.total_raw)) bad.push(`total ${total}≠${fx.total_raw}`);
            if (fx.briber && !hits.every(e => e.briber === fx.briber)) bad.push(`briber mismatch`);
            if (fx.briber_source && !hits.every(e => e.briber_source === fx.briber_source)) bad.push(`briber_source mismatch`);
            if (bad.length) failures.push(`${fx.id}: ${bad.join('; ')}`);
            else report.push({ fixture: fx.id, status: 'OK', events: hits.length, total_raw: String(total) });
        } else if (fx.kind === 'attributed_total') {
            // Optional window_to (ISO ts, exclusive): attributed_total fixtures are
            // all-time sums, which can NEVER stay locked while the briber remains
            // active — observed live 2026-08-09: PD placed a 41,298.31-LUNA bribe at
            // 09:29Z, the capture caught it within hours, and the gate correctly
            // flunked the stale 2026-08-02 lock. Freezing the window verifies the
            // measured slice forever instead of chasing a moving target.
            const hits = events.filter(e => e.type === fx.type && e.briber === fx.briber && e.tx_hash !== fx.exclude_tx && (!fx.window_to || String(e.timestamp) < fx.window_to));
            const raw = hits.reduce((s, e) => s + (e.coins || []).filter(c => c.denom === fx.denom).reduce((a, c) => a + Number(c.amount), 0), 0);
            const human = raw / Math.pow(10, fx.decimals);
            if (Math.abs(human - fx.total_human) > fx.tolerance) failures.push(`${fx.id}: attributed ${human} outside ${fx.total_human}±${fx.tolerance}`);
            else report.push({ fixture: fx.id, status: 'OK', events: hits.length, total_human: human });
        } else if (fx.kind === 'briber_events') {
            const inWin = (ts) => ts >= fx.window_from && ts < fx.window_to;
            const hits = events.filter(e => e.type === fx.type && e.briber === fx.briber && inWin(String(e.timestamp)) &&
                (e.coins || []).some(c => c.denom === fx.denom && String(c.amount) === String(fx.per_event_amount)));
            if (hits.length < fx.min_count) failures.push(`${fx.id}: found ${hits.length} < min ${fx.min_count} matching events`);
            else report.push({ fixture: fx.id, status: 'OK', events: hits.length });
        } else if (fx.kind === 'flows_record') {
            const r = loadFlowsRecordByHash(fx.tx_hash);
            if (!r) { failures.push(`${fx.id}: flows record ${fx.tx_hash.slice(0, 12)}… not found`); continue; }
            const bad = [];
            if (Number(r.schemaVersion || 1) < Number(fx.min_schema || 3)) bad.push(`schemaVersion ${r.schemaVersion} < ${fx.min_schema || 3} (re-walk upgrade missing)`);
            for (const [pathStr, want] of Object.entries(fx.assert || {})) {
                let v = r; for (const seg of pathStr.split('.')) v = v == null ? v : v[seg];
                if (String(v) !== String(want)) bad.push(`${pathStr}=${JSON.stringify(v)}≠${JSON.stringify(want)}`);
            }
            if (bad.length) failures.push(`${fx.id}: ${bad.join('; ')}`);
            else report.push({ fixture: fx.id, status: 'OK', schemaVersion: r.schemaVersion });
        } else failures.push(`${fx.id}: unknown fixture kind ${fx.kind}`);
    }
    return { failures, report };
}

// ============================================================================= gate mode (offline, run before every commit of this file)
// Real starscream AddressTxs response for test tx DCA53591 (HAR-captured
// 2026-07-31; trimmed to msg values + wasm/tf events) — gate 9's fixture.
const SS_FIXTURE_JSON = "{\"txhash\": \"DCA53591AAAD50EE2AF16803DCD6C00F74EDD4751AA6028CEBF1EA542854C564\", \"height\": \"22163886\", \"timestamp\": \"2026-07-31T20:19:12Z\", \"code\": 0, \"messages\": [{\"msg\": {\"value\": {\"@type\": \"/cosmwasm.wasm.v1.MsgExecuteContract\", \"sender\": \"terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw\", \"contract\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\", \"msg\": {\"unstake\": {\"asset\": {\"amount\": \"20268566\", \"info\": {\"cw20\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}}, \"recipient\": \"terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl\"}}, \"funds\": []}}, \"events\": [{\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"action\", \"value\": \"asset/unstake\"}, {\"key\": \"user\", \"value\": \"terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw\"}, {\"key\": \"recipient\", \"value\": \"terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl\"}, {\"key\": \"asset\", \"value\": \"cw20:terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"share\", \"value\": \"24491990\"}, {\"key\": \"msg_index\", \"value\": \"0\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1eywh4av8sln6r45pxq45ltj798htfy0cfcf7fy3pxc2gcv6uc07se4ch9x\"}, {\"key\": \"action\", \"value\": \"claim_rewards\"}, {\"key\": \"action\", \"value\": \"withdraw\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"claimed_position\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"lp_token\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"user\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"msg_index\", \"value\": \"0\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"action\", \"value\": \"transfer\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"from\", \"value\": \"terra1eywh4av8sln6r45pxq45ltj798htfy0cfcf7fy3pxc2gcv6uc07se4ch9x\"}, {\"key\": \"to\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"msg_index\", \"value\": \"0\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"action\", \"value\": \"asset/track_bribes_callback\"}, {\"key\": \"msg_index\", \"value\": \"0\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"action\", \"value\": \"transfer\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"from\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"to\", \"value\": \"terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl\"}, {\"key\": \"msg_index\", \"value\": \"0\"}]}]}, {\"msg\": {\"value\": {\"@type\": \"/cosmwasm.wasm.v1.MsgExecuteContract\", \"sender\": \"terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw\", \"contract\": \"terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl\", \"msg\": {\"zap\": {\"assets\": [{\"cw20\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}], \"into\": {\"cw20\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, \"post_action\": {\"liquid_stake\": {\"compounder\": \"terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx\", \"gauge\": \"project\"}}}}, \"funds\": []}}, \"events\": [{\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl\"}, {\"key\": \"action\", \"value\": \"zapper/zap\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl\"}, {\"key\": \"action\", \"value\": \"zapper/callback_liquid_stake_result\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"action\", \"value\": \"send\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"from\", \"value\": \"terra1qdjsxsv96aagrdxz83gwtjk8qvf2mrg4y8y3dqjxg556lm79pg5qdgmaxl\"}, {\"key\": \"to\", \"value\": \"terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx\"}, {\"key\": \"action\", \"value\": \"asset-compounding/stake\"}, {\"key\": \"asset\", \"value\": \"cw20:terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"bond_amount\", \"value\": \"20268565\"}, {\"key\": \"bond_share\", \"value\": \"4707941\"}, {\"key\": \"bond_share_adjusted\", \"value\": \"4706408\"}, {\"key\": \"gauge\", \"value\": \"project\"}, {\"key\": \"user\", \"value\": \"terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"action\", \"value\": \"send\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"from\", \"value\": \"terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx\"}, {\"key\": \"to\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"action\", \"value\": \"asset/stake\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"asset\", \"value\": \"cw20:terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"share\", \"value\": \"24491989\"}, {\"key\": \"user\", \"value\": \"terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"action\", \"value\": \"send\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"from\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"to\", \"value\": \"terra1eywh4av8sln6r45pxq45ltj798htfy0cfcf7fy3pxc2gcv6uc07se4ch9x\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1eywh4av8sln6r45pxq45ltj798htfy0cfcf7fy3pxc2gcv6uc07se4ch9x\"}, {\"key\": \"action\", \"value\": \"claim_rewards\"}, {\"key\": \"action\", \"value\": \"deposit\"}, {\"key\": \"amount\", \"value\": \"20268565\"}, {\"key\": \"claimed_position\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"lp_token\", \"value\": \"terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8\"}, {\"key\": \"user\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"user\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"wasm\", \"attributes\": [{\"key\": \"_contract_address\", \"value\": \"terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa\"}, {\"key\": \"action\", \"value\": \"asset/track_bribes_callback\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}, {\"type\": \"tf_mint\", \"attributes\": [{\"key\": \"amount\", \"value\": \"4707941factory/terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx/13/project/amplp\"}, {\"key\": \"mint_to_address\", \"value\": \"terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx\"}, {\"key\": \"msg_index\", \"value\": \"1\"}]}]}]}";
function gateMode() {
    console.log('\n🧪 MODE=gate — offline self-tests (no network, no writes)\n');
    selfGateVoting();
    selfGateFlows();

    // 1. merge idempotence on a REAL committed month (largest bribes month)
    const dir = path.join(VOTING_DIR, 'bribes');
    let biggest = null;
    for (const y of fs.readdirSync(dir).filter(d => /^\d{4}$/.test(d)))
        for (const f of fs.readdirSync(path.join(dir, y)).filter(f => /^\d{2}\.json$/.test(f))) {
            const arr = readJson(path.join(dir, y, f), []);
            if (!biggest || arr.length > biggest.arr.length) biggest = { ym: `${y}/${f}`, arr };
        }
    if (!biggest) { console.error('gate: no committed bribes months found'); process.exit(1); }
    const re = MV.mergeEvents(biggest.arr, biggest.arr);
    if (re.added !== 0 || re.merged.length !== biggest.arr.length) { console.error(`gate FAILED: re-merge of ${biggest.ym} added ${re.added}`); process.exit(1); }
    const byKey = new Map(re.merged.map(e => [MV.eventKey(e), e]));
    for (const p of biggest.arr) {
        if (JSON.stringify(byKey.get(MV.eventKey(p))) !== JSON.stringify(p)) { console.error(`gate FAILED: prior-verbatim broke in ${biggest.ym}`); process.exit(1); }
    }
    console.log(`gate 1: real-month re-merge idempotent + prior-verbatim (${biggest.ym}, ${biggest.arr.length} events)`);

    // 2. flows re-merge idempotence on a REAL committed month
    let fBig = null;
    for (const y of fs.readdirSync(FLOWS_DIR).filter(d => /^\d{4}$/.test(d)))
        for (const f of fs.readdirSync(path.join(FLOWS_DIR, y)).filter(f => /^\d{2}\.json$/.test(f))) {
            const arr = readJson(path.join(FLOWS_DIR, y, f), []);
            if (!fBig || arr.length > fBig.arr.length) fBig = { ym: `${y}/${f}`, arr };
        }
    const rf = MF.mergeMonth(fBig.arr, fBig.arr);
    if (rf.added !== 0 || rf.upgraded !== 0 || rf.merged.length !== fBig.arr.length) { console.error(`gate FAILED: flows re-merge of ${fBig.ym} added ${rf.added} upgraded ${rf.upgraded}`); process.exit(1); }
    console.log(`gate 2: real flows month re-merge idempotent (${fBig.ym}, ${fBig.arr.length} records)`);

    // 3. §10 fixture matcher: synthetic recovered events built FROM the
    //    fixtures must PASS; a single mutated field must FAIL.
    const fixturesDoc = readJson(FIXTURES_PATH, null);
    if (!fixturesDoc) { console.error(`gate FAILED: ${FIXTURES_PATH} missing`); process.exit(1); }
    const synth = [];
    for (const fx of fixturesDoc.fixtures) {
        if (fx.kind === 'exact_event') synth.push({ type: fx.type, tx_hash: fx.tx_hash, briber: 'terra1syntheticfixturewallet', msg_index: 0,
            height: fx.expect.height, timestamp: fx.expect.timestamp, pool: fx.expect.pool, gauge: fx.expect.gauge,
            coins: fx.expect.coins, fee_funds: fx.expect.fee_funds, epoch_start: fx.expect.epoch_start, epoch_end: fx.expect.epoch_end });
        if (fx.kind === 'tx_event_set') { const per = BigInt(fx.total_raw) / BigInt(fx.count); const rem = BigInt(fx.total_raw) - per * BigInt(fx.count);
            for (let i = 0; i < fx.count; i++) synth.push({ type: fx.type, tx_hash: fx.tx_hash, briber: fx.briber, briber_source: fx.briber_source, msg_index: 100000 + i,
                height: 21827518, timestamp: '2026-07-09T04:45:27Z', coins: [{ denom: fx.denom, amount: (per + (i === 0 ? rem : 0n)).toString() }] }); }
        if (fx.kind === 'attributed_total') synth.push({ type: fx.type, tx_hash: 'B'.repeat(64), briber: fx.briber, msg_index: 0,
            height: 21900000, timestamp: '2026-07-10T00:00:00Z', coins: [{ denom: fx.denom, amount: String(Math.round(fx.total_human * Math.pow(10, fx.decimals))) }] });
        if (fx.kind === 'briber_events') for (let i = 0; i < fx.min_count; i++) synth.push({ type: fx.type, tx_hash: String(i).repeat(64).slice(0, 64), briber: fx.briber, msg_index: 0,
            height: 21400000 + i, timestamp: '2026-06-10T0' + i + ':00:00Z', coins: [{ denom: fx.denom, amount: String(fx.per_event_amount) }] });
    }
    const bribeKinds = { ...fixturesDoc, fixtures: fixturesDoc.fixtures.filter(f => f.kind !== 'flows_record') };
    const pass = evalFixtures(bribeKinds, synth);
    if (pass.failures.length) { console.error('gate FAILED: fixture matcher rejected its own synthetic truth:\n  ' + pass.failures.join('\n  ')); process.exit(1); }
    const mutated = JSON.parse(JSON.stringify(synth));
    const mv = mutated.find(e => e.fee_funds); mv.coins = [...mv.coins, ...mv.fee_funds]; mv.fee_funds = undefined;   // the exact §10 doctrine violation
    const fail = evalFixtures(bribeKinds, mutated);
    if (!fail.failures.length) { console.error('gate FAILED: matcher accepted a fee-in-coins mutation — the §10 doctrine assert is dead'); process.exit(1); }
    console.log(`gate 3: §10 matcher — synthetic truth passes (${pass.report.length} fixtures), fee-in-coins mutation FAILS as required`);

    // 4. registry + targets derivation runs clean on committed state
    const registry = readJson(REGISTRY_PATH, null);
    const votingIndex = readJson(path.join(VOTING_DIR, 'index.json'), null);
    const votingCursor = readJson(path.join(VOTING_DIR, 'cursor.json'), null);
    const t = computeTargets(registry, votingIndex, votingCursor);
    for (const p of t.plans) {
        if (p.entry.done || Number(p.entry.cursor_height) >= p.target) { console.log(`  plan: ${p.entry.label} — complete (cursor ${p.entry.cursor_height})`); continue; }
        if (!(p.target > p.floor)) { console.error(`gate FAILED: ${p.entry.label} target ${p.target} ≤ floor ${p.floor}`); process.exit(1); }
        console.log(`  plan: ${p.entry.label} — ${p.floor} → ${p.target} (${p.basis}${p.floorNote !== 'registry cursor' ? '; floor: ' + p.floorNote : ''})`);
    }
    console.log(`gate 4: targets derive clean (voting head ${t.votingHead}, flows v2 head ${t.flowsHead})`);
    // ---- gates 5–8: <<FLOWS CLASSIFIER v3>> + aux classifiers, crafted from
    // DeFi_Patriot's 8-tx live test matrix (chainscope-read 2026-07-31)
    const W = (addr, action, kv) => ({ type: 'wasm', attributes: [{ key: '_contract_address', value: addr }, { key: 'action', value: action }, ...Object.entries(kv).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(x => ({ key: k, value: x })))] });
    const BUCKET_PROJECT = Object.keys(MF.WATCH).find(a => MF.WATCH[a] === 'staking-project');
    const COMPOUNDER = Object.keys(MF.WATCH).find(a => MF.WATCH[a] === 'compounder');
    const PAIR = 'terra1e45ctmel6t5m9vdgxv3zxh3ecflkfcd6mr42sluzrqnhveqmy3fss338s7';
    const LP = 'cw20:terra14arerdfc88cdv6m6frc03a0963z877756kqac4h4xvd9vftn0hqqhquca8';

    // gate 5 — tx DCA53591 (multi-flow: non-amp unstake + amp re-stake, ONE tx)
    {
        const tx = { txhash: 'DCA53591AAAD50EE2AF16803DCD6C00F74EDD4751AA6028CEBF1EA542854C564', height: '22163886', code: 0, timestamp: '2026-07-31T20:19:12Z', events: [
            W(BUCKET_PROJECT, 'asset/unstake', { user: 'terra1wallet', recipient: 'terra1zapper', asset: LP, amount: '20268565', share: '24491990' }),
            W('terra1zapperaddr', 'zapper/zap', {}),
            W(COMPOUNDER, 'asset-compounding/stake', { asset: LP, bond_amount: '20268565', bond_share: '4707941', bond_share_adjusted: '4706408', gauge: 'project', user: 'terra1wallet' }),
        ] };
        const r = MF.classifyFlowTx(tx);
        const ok = r && r.schemaVersion === 3 && r.type === 'withdraw' && r.mechanism === 'non_amplified' &&
            Array.isArray(r.flows) && r.flows.length === 2 &&
            r.flows[0].type === 'withdraw' && r.flows[0].mechanism === 'non_amplified' &&
            r.flows[1].type === 'deposit' && r.flows[1].mechanism === 'amplified' &&
            r.flows[1].bond_amount === '20268565' && r.flows[1].bond_share === '4707941' && r.flows[1].bond_share_adjusted === '4706408' && r.via_zap === true;
        if (!ok) { console.error('gate 5 FAILED: v3 multi-flow (DCA53591 shape)', JSON.stringify(r)); process.exit(1); }
        console.log('gate 5: v3 multi-flow — both flows captured, primary keeps v2 semantics, amp rate fields present');
    }
    // gate 6 — tx 82FBE584 (zap-in: swap + provide_liquidity + non-amp stake, user = wallet)
    {
        const tx = { txhash: '82FBE58432C93E6FDF650E34AF7477FDDC00FCB86B9B80DFD2D4A1FE33366E08', height: '22163880', code: 0, timestamp: '2026-07-31T20:18:38Z', events: [
            W('terra1zapperaddr', 'zapper/create_lp', {}),
            W(PAIR, 'swap', { ask_asset: 'terra10aa3solid', commission_amount: '15339', maker_fee_amount: '5112', offer_amount: '125157373', offer_asset: 'uluna', return_amount: '5097943', spread_amount: '2495' }),
            W(PAIR, 'provide_liquidity', { assets: '5097943terra10aa3solid, 124842627uluna', receiver: 'terra1zapper', sender: 'terra1zapper', share: '20268568' }),
            W(BUCKET_PROJECT, 'asset/stake', { amount: '20268568', asset: LP, share: '24491990', user: 'terra1wallet' }),
        ] };
        const r = MF.classifyFlowTx(tx);
        const ok = r && r.type === 'deposit' && r.mechanism === 'non_amplified' && r.user === 'terra1wallet' && r.via_zap === true &&
            r.provides && r.provides.length === 1 && r.provides[0].pair === PAIR && r.provides[0].share === '20268568' &&
            r.provides[0].assets.length === 2 && r.provides[0].assets[0].amount === '5097943' && r.provides[0].assets[1].amount === '124842627' &&
            r.cost && r.cost.swaps.length === 1 && r.cost.swaps[0].offer_amount === '125157373';
        if (!ok) { console.error('gate 6 FAILED: v3 provide both-sides (82FBE584 shape)', JSON.stringify(r)); process.exit(1); }
        console.log('gate 6: v3 zap-in — provide both-sides + share + swap leg + wallet user');
    }
    // gate 7 — tx 29537FA7 (amp unstake + tf_burn amplp + withdraw_liquidity + double-returned callback)
    {
        const AMPLP = 'factory/terra1compounder/13/project/amplp';
        const tx = { txhash: '29537FA7ACAC9BD8C26FBD105241186EFC2C14BFC8CAC70EC07762CC57E1586A', height: '22163868', code: 0, timestamp: '2026-07-31T20:17:28Z', events: [
            W(COMPOUNDER, 'asset-compounding/unstake', { user: 'terra1wallet', recipient: 'terra1zapper', returned: LP + ':46857383' }),
            { type: 'tf_burn', attributes: [{ key: 'burn_from_address', value: COMPOUNDER }, { key: 'amount', value: '10883935' + AMPLP }] },
            W(PAIR, 'withdraw_liquidity', { refund_assets: '11791285terra10aa3solid, 288473508uluna', sender: 'terra1zapper', withdrawn_share: '46857382' }),
            W('terra1zapperaddr', 'zapper/callback_send_results', { returned: ['cw20:terra10aa3solid:11791285', 'native:uluna:288473508'] }),
        ] };
        const r = MF.classifyFlowTx(tx);
        const ok = r && r.type === 'withdraw' && r.mechanism === 'amplified' &&
            r.flows[0].amplp_burned === '10883935' &&
            r.withdraw_liqs && r.withdraw_liqs.length === 1 && r.withdraw_liqs[0].share === '46857382' && r.withdraw_liqs[0].refund_assets.length === 2 &&
            r.zap_out_assets && r.zap_out_assets.length === 2 && r.zap_out_assets[1].amount === '288473508';
        if (!ok) { console.error('gate 7 FAILED: v3 amp unstake + withdraw_liq + double-returned (29537FA7 shape)', JSON.stringify(r)); process.exit(1); }
        console.log('gate 7: v3 exit — amplp burn rate leg + refund both-sides + repeated-attr callback');
    }
    // gate 8 — aux classifiers + mergeKeyed laws
    {
        const pairs = { [PAIR]: { name: 'LUNA-SOLID', bucket: 'project' } };
        const tx6 = { txhash: 'A'.repeat(64), height: '22163880', code: 0, timestamp: '2026-07-31T20:18:38Z', tx: { body: { messages: [{ sender: 'terra1wallet' }] } }, events: [
            W(PAIR, 'swap', { ask_asset: 'terra10aa3solid', offer_amount: '125157373', offer_asset: 'uluna', return_amount: '5097943', spread_amount: '2495', commission_amount: '15339' }),
            W(PAIR, 'provide_liquidity', { assets: '5097943terra10aa3solid, 124842627uluna', receiver: 'terra1wallet', sender: 'terra1zapper', share: '20268568' }),
        ] };
        const pr = AX.classifyPairLiquidityTx(tx6, pairs);
        const s2r = AX.samplesToRecords([...pr.swapSamples, ...pr.swapSamples]);
        const okPair = pr.records.length === 1 && pr.records[0].kind === 'provide' && pr.records[0].provider === 'terra1wallet' && pr.records[0].assets[1].denom === 'uluna' && pr.swapSamples.length === 1 && s2r.length === 1;
        const nft = AX.classifyNftTx({ txhash: 'B'.repeat(64), height: '22000000', code: 0, timestamp: '2026-07-30T00:00:00Z', events: [
            W('terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9', 'transfer_nft', { sender: 'terra1from', recipient: 'terra1to', token_id: '4242' }) ] },
            { terra1phr9fngjv7a8an4dhmhd0u0f98wazxfnzccqtyheq4zqrrp4fpuqw3apw9: 'ADAO NFT' });
        const okNft = nft.length === 1 && nft[0].token_id === '4242' && nft[0].from === 'terra1from' && nft[0].to === 'terra1to';
        const VD = 'factory/terra1vaultaddr/max/vampluna';
        const vt = AX.classifyVotionTx({ txhash: 'C'.repeat(64), height: '22000001', code: 0, timestamp: '2026-07-30T01:00:00Z', tx: { body: { messages: [{ sender: 'terra1depositor' }] } }, events: [
            W('terra1vaultaddr', 'execute', {}),
            { type: 'tf_mint', attributes: [{ key: 'mint_to_address', value: 'terra1vaultaddr' }, { key: 'amount', value: '650000000' + VD }] },
            W('terra1lstaddr', 'transfer', { from: 'terra1depositor', to: 'terra1vaultaddr', amount: '1000000000' }) ] },
            { terra1vaultaddr: { vdenom: VD, lst: 'terra1lstaddr' } });
        const okVt = vt.length === 1 && vt[0].kind === 'deposit' && vt[0].vtoken_minted === '650000000' && vt[0].lst_in === '1000000000' && Math.abs(vt[0].rate_sample - 1.5384615385) < 1e-6;
        const m1 = AX.mergeKeyed(vt, vt);
        const up = AX.mergeKeyed(vt, [{ ...vt[0], schemaVersion: 2 }]);
        const okMerge = m1.added === 0 && m1.upgraded === 0 && up.upgraded === 1 && up.merged[0].schemaVersion === 2;
        if (!okPair || !okNft || !okVt || !okMerge) { console.error(`gate 8 FAILED: aux (pair ${okPair}, nft ${okNft}, votion ${okVt}, merge ${okMerge})`); process.exit(1); }
        console.log('gate 8: aux classifiers — pair provide + swap sample dedup, NFT transfer, votion deposit rate sample, mergeKeyed laws');
    }
    // gate 9 — REAL starscream response (DeFi_Patriot's test tx DCA53591,
    // captured from the live indexer 2026-07-31) through the adapter into the
    // v3 classifier: the full alternate-transport path, end-to-end, offline.
    {
        const ssTx = JSON.parse(SS_FIXTURE_JSON);
        const ad = adaptStarscreamTx(ssTx);
        const okAdapt = ad.txhash === 'DCA53591AAAD50EE2AF16803DCD6C00F74EDD4751AA6028CEBF1EA542854C564' &&
            ad.tx.body.messages.length === 2 && ad.tx.body.messages[0].sender && ad.tx.body.messages[0].contract && ad.events.length >= 10;
        const r = MF.classifyFlowTx(ad);
        // The REAL event chain yields THREE flows: the wallet's unstake, the
        // wallet's amp re-stake (rate fields), AND the vault's own internal
        // bucket re-stake (user = the compounder contract). All three are
        // truth; derive filters member P&L by user === wallet.
        const okClassify = r && Array.isArray(r.flows) && r.flows.length === 3 &&
            r.flows[0].type === 'withdraw' && r.flows[0].mechanism === 'non_amplified' && r.flows[0].user === ad.tx.body.messages[0].sender &&
            r.flows[1].type === 'deposit' && r.flows[1].mechanism === 'amplified' && r.flows[1].user === ad.tx.body.messages[0].sender &&
            r.flows[1].bond_amount === '20268565' && r.flows[1].bond_share === '4707941' &&
            r.flows[2].mechanism === 'non_amplified' && r.flows[2].user !== ad.tx.body.messages[0].sender;
        if (!okAdapt || !okClassify) { console.error(`gate 9 FAILED: starscream adapter (adapt ${okAdapt}, classify ${okClassify})`, JSON.stringify(r).slice(0, 300)); process.exit(1); }
        console.log('gate 9: starscream transport — REAL captured indexer response adapts + classifies verbatim (multi-flow, amp rate fields)');
    }
    console.log('\n✅ ALL GATES PASS\n');
}

// ============================================================================= preflight
async function preflight() {
    console.log('\n🔎 MODE=preflight — E1 capability probe (writes nothing)\n');
    const registry = readJson(REGISTRY_PATH, null);
    if (STARSCREAM_URL) {
        console.log('STARSCREAM probe:');
        try {
            const { txs, txsCount } = await ssFetchPage(MANAGER, 0);
            const hs = txs.map(t => Number(t.height));
            console.log(`  ✓ alive: manager txsCount=${txsCount}, first page ${txs.length} txs, heights ${Math.min(...hs)}–${Math.max(...hs)}`);
            const one = txs.find(t => Number(t.code || 0) === 0);
            if (one) {
                const ad = adaptStarscreamTx(one);
                const ok = ad.txhash && ad.events.length && ad.tx.body.messages.length;
                console.log(`  ${ok ? '✓' : '✗'} adapter: sample tx ${ad.txhash.slice(0, 12)}… → ${ad.tx.body.messages.length} msgs, ${ad.events.length} events`);
            }
            console.log('  depth: proven by termination (pages walk DESC to below the floor); indexer serves 2023-era txs (HAR-verified 2026-07-31)');
            console.log('\n➡ starscream READY (pending Chainscope blessing): dispatch mode=walk with STARSCREAM_URL set.');
        } catch (e) { console.log(`  ✗ starscream probe failed: ${e.message}`); }
        if (!ARCHIVE_LCD && !ARCHIVE_RPC) return;
    }
    if (!ARCHIVE_LCD && !ARCHIVE_RPC) {
        console.log('E1 PENDING — no archive endpoint configured.');
        console.log('When the endpoint arrives: set repo secret ARCHIVE_LCD (cosmos REST, preferred)');
        console.log('and/or ARCHIVE_RPC (Tendermint 26657), re-dispatch mode=preflight to verify,');
        console.log(`then mode=walk. The job needs tx queries over heights ${registry.hole.from_height}–${registry.hole.to_height}+.`);
        return;
    }
    const report = { at: new Date().toISOString(), lcd: null, rpc: null };
    if (ARCHIVE_LCD) {
        const lcd = { endpoint: ARCHIVE_LCD, checks: {} };
        const FIXTURE_HASH = 'D08804E15F5CCB9C834A786450D9347B67008B84DD68DBF94D2524925455BB04'; // §10 wBTC bribe, h17,129,670 (mid-hole)
        const step = async (name, fn, describe) => {
            try { const v = await fn(); lcd.checks[name] = { ok: true, ...(v || {}) }; console.log(`  ✓ ${name}: ${describe(v)}`); return v; }
            catch (e) { lcd.checks[name] = { ok: false, error: e.message.slice(0, 200) }; console.log(`  ✗ ${name}: ${e.message.slice(0, 160)}`); return null; }
        };
        console.log('LCD capability matrix:');
        const live = await step('alive', async () => {
            const r = await httpGetJson(`${ARCHIVE_LCD}/cosmos/base/tendermint/v1beta1/blocks/latest`);
            return { head: Number(r?.block?.header?.height) };
        }, v => `LCD responds, head ${v.head}`);
        await step('state_depth', async () => {
            const r = await httpGetJson(`${ARCHIVE_LCD}/cosmos/base/tendermint/v1beta1/blocks/${registry.hole.from_height}`);
            return { block_time: r?.block?.header?.time };
        }, v => `serves hole-floor block ${registry.hole.from_height} (${String(v.block_time).slice(0, 10)}) — archive-depth block storage`);
        const txDepth = await step('tx_depth_fixture', async () => {
            const r = await httpGetJson(`${ARCHIVE_LCD}/cosmos/tx/v1beta1/txs/${FIXTURE_HASH}`);
            const h = Number(r?.tx_response?.height);
            if (!h) throw new Error('tx_response missing');
            return { height: h };
        }, v => `serves the §10 fixture tx BY HASH (h${v.height}, 2025-08-26) — tx storage reaches mid-hole`);
        const dialectOk = await step('event_query_recent', async () => {
            const head = live?.head || 22160000;
            const dialect = await probeLcdDialect();       // probes at the hole floor
            return { dialect };
        }, v => `height-ranged event queries work (dialect=${v.dialect})`);
        if (dialectOk) {
            await step('event_index_depth', async () => {
                const w = await fetchWindowTxs(MANAGER, Number(registry.hole.from_height), Number(registry.hole.from_height) + 50000, 'preflight-window');
                lcd.hole_floor_window_txs = w.totalSeen; lcd.reported_total = w.reportedTotal;
                if (w.totalSeen === 0) throw new Error('window returned 0 txs — event index likely pruned below the hole (or genuinely empty; cross-check another window)');
                return { txs: w.totalSeen };
            }, v => `hole-floor 50K-block manager window: ${v.txs} txs — EVENT INDEX REACHES THE HOLE`);
            await step('event_index_floor', async () => {
                // bisect the endpoint's tx-event-index floor: the manager has
                // had steady traffic since Aug 2024, so any ~250K-block window
                // above TLA genesis returning 0 txs means the index doesn't
                // reach it. ~14 queries → floor to ±35K blocks (~1 day).
                const head = (lcd.checks.alive && lcd.checks.alive.head) || 22160000;
                let lo = Number(registry.hole.from_height), hi = head - 300000, floorAt = null;
                const has = async (h) => { const w = await fetchWindowTxs(MANAGER, h, h + 250000, `bisect@${h}`); return w.totalSeen > 0; };
                if (await has(lo)) { floorAt = lo; }
                else {
                    while (hi - lo > 70000) {
                        const mid = Math.floor((lo + hi) / 2);
                        if (await has(mid)) hi = mid; else lo = mid;
                    }
                    floorAt = hi;
                }
                lcd.event_index_floor = floorAt;
                const covered = head - floorAt, hole = head - Number(registry.hole.from_height);
                return { floor: floorAt, pct_of_span: +(100 * covered / hole).toFixed(1) };
            }, v => `event index floors at ≈ block ${v.floor} — this endpoint can serve ~${v.pct_of_span}% of the span FOR FREE (dispatch mode=walk with WALK_FLOOR=${v.floor} to harvest it now; deep remainder stays open in the registry)`);
            await step('action_filter', async () => {
                ACTION_FILTER_OK = null;
                const ok = await probeActionFilter(registry);
                if (!ok) throw new Error('compound wasm.action conditions rejected — pair walks would be blocked');
                return {};
            }, () => 'compound action-filtered queries supported — pair walks enabled');
        }
        lcd.depth_ok = !!(lcd.checks.event_index_depth && lcd.checks.event_index_depth.ok);
        lcd.verdict = lcd.depth_ok
            ? 'READY — this endpoint can feed the full walk'
            : txDepth ? 'PARTIAL — tx storage is deep but the height-ranged EVENT INDEX is unavailable; the walk needs the event index. Ask the provider to enable tx indexing (indexer=kv) or pick one that has it.'
            : 'UNSUITABLE for the walk (see failed checks)';
        console.log(`  verdict: ${lcd.verdict}`);
        report.lcd = lcd;
    }
    if (ARCHIVE_RPC) {
        const rpc = { endpoint: ARCHIVE_RPC };
        try {
            const st = await httpGetJson(`${ARCHIVE_RPC}/status`);
            rpc.earliest_block_height = Number(st.result?.sync_info?.earliest_block_height);
            rpc.covers_hole = rpc.earliest_block_height <= Number(registry.hole.from_height);
            const q = encodeURIComponent(`"wasm._contract_address='${MANAGER}' AND tx.height>=${registry.hole.from_height} AND tx.height<=${Number(registry.hole.from_height) + 50000}"`);
            const ts = await httpGetJson(`${ARCHIVE_RPC}/tx_search?query=${q}&page=1&per_page=1`);
            rpc.tx_search_total = Number(ts.result?.total_count);
            console.log(`RPC ✓ earliest=${rpc.earliest_block_height} covers_hole=${rpc.covers_hole} tx_search total (probe window)=${rpc.tx_search_total}`);
            if (report.lcd?.depth_ok && Number.isFinite(rpc.tx_search_total) && report.lcd.hole_floor_window_txs != null) {
                rpc.cross_check_vs_lcd = rpc.tx_search_total === report.lcd.hole_floor_window_txs ? 'MATCH' : `MISMATCH (rpc ${rpc.tx_search_total} vs lcd ${report.lcd.hole_floor_window_txs})`;
                console.log(`cross-check RPC↔LCD probe window: ${rpc.cross_check_vs_lcd}`);
            }
            if (!report.lcd?.depth_ok) console.log('NOTE: RPC discovery works, but decoded tx bodies need the archive LCD — set ARCHIVE_LCD (most providers expose both).');
        } catch (e) { rpc.error = e.message; console.log(`RPC ✗ ${e.message}`); }
        report.rpc = rpc;
    }
    console.log('\npreflight report:\n' + JSON.stringify(report, null, 2));
    if (report.lcd?.depth_ok) console.log('\n➡ READY: dispatch mode=walk (DRY_RUN=1 first if you want the plan).');
    else if (report.lcd) console.log('\n➡ NOT READY — try the next candidate endpoint with mode=preflight (each probe is free).');
}

// ============================================================================= walk
async function walk() {
    console.log(`\n🚜 MODE=walk${DRY ? ' (DRY RUN)' : ''} — registry archive backfill\n`);
    selfGateVoting();
    selfGateFlows();
    if (!ARCHIVE_LCD && !STARSCREAM_URL) { console.error('walk requires ARCHIVE_LCD or STARSCREAM_URL (see preflight). Aborting.'); process.exit(1); }
    if (TRANSPORT === 'starscream') console.log('  transport: STARSCREAM (Chainscope GraphQL) — run this ONLY with their blessing; REQ_DELAY_MS + SS_LIMIT are your politeness knobs');

    const registry = readJson(REGISTRY_PATH, null);
    const votingIndex = readJson(path.join(VOTING_DIR, 'index.json'), null);
    const votingCursor = readJson(path.join(VOTING_DIR, 'cursor.json'), null);
    if (!registry || !votingIndex || !votingCursor) throw new Error('committed priors unreadable (registry/index/cursor) — refusing to run on unknown state');
    const { plans } = computeTargets(registry, votingIndex, votingCursor);
    const regCtx = {
        pairs: Object.fromEntries(registry.contracts.filter(c => (c.streams || []).includes('dex_liquidity')).map(c => [c.address, { name: (c.label.match(/pair ([^ ]+)/) || [])[1] || c.label, bucket: null }])),
        nftContracts: Object.fromEntries(registry.contracts.filter(c => (c.streams || []).includes('nft_transfers')).map(c => [c.address, c.label])),
    };
    const actionFilter = TRANSPORT === 'lcd' ? await probeActionFilter(registry) : false;
    const blocked = new Set();

    const discovered = {}, contextCensus = {}, tallies = {};
    const report = readJson(REPORT_PATH, { kind: 'backfill-report', runs: [] });
    const runRec = { startedAt: new Date().toISOString(), mode: DRY ? 'dry' : 'walk', windows: 0, entries: {} };

    let stoppedForBudget = false; let entryErrors = 0;
    for (const plan of plans) {
        const { entry } = plan;
        try {
        // once done, done — targets derived from a LIVE cursor move on every
        // run; re-opening completed entries would chase the forward walker
        // forever (extensions are a registry edit + re-run, per doctrine).
        if (entry.done) { console.log(`— ${entry.label}: done (cursor ${entry.cursor_height})`); continue; }
        // record the target used (transparent, committed with the first checkpoint)
        entry.target_height = plan.target; entry.target_basis = plan.basis;
        // gap-floor lowering applies ONCE (first window ever); afterwards a
        // resume continues from the advanced cursor, never re-walks from floor.
        const stagedFloor = WALK_FLOOR != null ? Math.max(plan.floor, WALK_FLOOR) : null;
        if (stagedFloor != null) {
            const sPairOnly = (entry.streams || []).includes('dex_liquidity') && !(entry.streams || []).includes('flows');
            if (sPairOnly && !actionFilter) { blocked.add(entry.address); console.log(`— ${entry.label}: BLOCKED in staged pass (no action-filtered queries on this endpoint)`); continue; }
            // STAGED MODE: this source can't reach the true floor — walk only
            // its serviceable slice [stagedFloor, target]; the deep remainder
            // [floor, stagedFloor) stays honestly open (done stays false; a
            // deeper source later walks the rest, dedup makes overlap free).
            if (Number(entry.staged_floor_done || Infinity) <= stagedFloor) { console.log(`— ${entry.label}: staged slice already done (≥${entry.staged_floor_done})`); continue; }
            let sCur = entry.staged && entry.staged.floor === stagedFloor ? Number(entry.staged.cursor) : stagedFloor;
            console.log(`\n▶ ${entry.label} [STAGED] — ${sCur} → ${plan.target} (deep remainder ${plan.floor}–${stagedFloor} stays open)`);
            while (sCur < plan.target) {
                if (outOfBudget()) { stoppedForBudget = true; break; }
                const hFrom = sCur + 1, hTo = Math.min(sCur + WINDOW_BLOCKS, plan.target);
                const label = `${entry.label} [staged] ${hFrom}-${hTo}`;
                let txs, totalSeen;
                if (sPairOnly) {
                    const a = await fetchWindowTxs(entry.address, hFrom, hTo, label + ' [provide]', `wasm.action='provide_liquidity'`);
                    const b = await fetchWindowTxs(entry.address, hFrom, hTo, label + ' [withdraw]', `wasm.action='withdraw_liquidity'`);
                    const seenH = new Set(a.txs.map(t => t.txhash));
                    txs = [...a.txs, ...b.txs.filter(t => !seenH.has(t.txhash))].sort((x, y) => Number(x.height) - Number(y.height));
                    totalSeen = a.totalSeen + b.totalSeen;
                } else ({ txs, totalSeen } = await fetchWindowTxs(entry.address, hFrom, hTo, label));
                const classified = routeAndClassify(plan, txs, discovered, contextCensus, regCtx);
                stageAndMerge(classified, tallies);
                sCur = hTo;
                entry.staged = { floor: stagedFloor, cursor: sCur };
                if (sCur >= plan.target) { entry.staged_floor_done = stagedFloor; delete entry.staged; }
                runRec.windows++; WINDOWS_DONE++;
                runRec.entries[entry.label] = { staged_cursor: sCur, staged_floor: stagedFloor, target: plan.target, slice_done: sCur >= plan.target };
                if (!DRY) writeJson(REGISTRY_PATH, registry, 2);
                console.log(`  ${label}: ${totalSeen} txs (${txs.length} ok) → tallies ${JSON.stringify(tallies)}`);
                if (runRec.windows % 3 === 0 || sCur >= plan.target) checkpoint(`registry-backfill[staged≥${stagedFloor}]: ${entry.label} → ${sCur}${sCur >= plan.target ? ' (SLICE DONE)' : ''}`);
            }
            if (stoppedForBudget) break;
            continue;
        }
        const begun = entry.walk_floor_applied === true;
        let cur = begun ? Number(entry.cursor_height) : Math.min(Number(entry.cursor_height), plan.floor);
        entry.walk_floor_applied = true;
        const pairOnly = (entry.streams || []).includes('dex_liquidity') && !(entry.streams || []).includes('flows');
        if (TRANSPORT === 'starscream' && pairOnly && !SS_PAIRS) { blocked.add(entry.address); console.log(`— ${entry.label}: BLOCKED under starscream transport (paging every swap needs Chainscope's explicit OK — set STARSCREAM_PAIRS=1 once blessed)`); continue; }
        if (TRANSPORT === 'lcd' && pairOnly && !actionFilter) { blocked.add(entry.address); console.log(`— ${entry.label}: BLOCKED (archive lacks action-filtered queries — see preflight)`); continue; }
        console.log(`\n▶ ${entry.label} — ${cur} → ${plan.target} (${plan.basis})${TRANSPORT === 'starscream' ? ' [starscream]' : ''}`);
        if (TRANSPORT === 'starscream') {
            // address-paged DESC: resume from committed ss_offset; done when a
            // page's min height drops below the walk floor.
            let offset = Number(entry.ss_offset || 0);
            let firstHashPrev = entry.ss_first_hash_prev || null;
            const floor = plan.floor;
            while (true) {
                if (outOfBudget()) { stoppedForBudget = true; break; }
                const { txs: pageTxs, txsCount } = await ssFetchPage(entry.address, offset);
                if (!pageTxs.length) { entry.done = true; break; }
                if (pageTxs[0].txhash === firstHashPrev) throw new Error(`${entry.label}: starscream pagination stuck at offset ${offset}`);
                firstHashPrev = pageTxs[0].txhash;
                const heights = pageTxs.map(t => Number(t.height));
                const minH = Math.min(...heights);
                const inRange = pageTxs.filter(t => Number(t.height) >= floor && Number(t.height) <= plan.target && Number(t.code || 0) === 0)
                    .map(adaptStarscreamTx).sort((a, b) => Number(a.height) - Number(b.height));
                const classified = routeAndClassify(plan, inRange, discovered, contextCensus, regCtx);
                stageAndMerge(classified, tallies);
                offset += pageTxs.length;
                entry.ss_offset = offset; entry.ss_first_hash_prev = firstHashPrev; entry.ss_txs_count = txsCount;
                runRec.windows++; WINDOWS_DONE++;
                runRec.entries[entry.label] = { ss_offset: offset, txsCount, min_height_seen: minH, done: minH < floor };
                if (minH < floor) { entry.done = true; entry.cursor_height = plan.target; }
                if (!DRY) writeJson(REGISTRY_PATH, registry, 2);
                console.log(`  ${entry.label} p@${offset}: ${pageTxs.length} txs (min h${minH}) → tallies ${JSON.stringify(tallies)}`);
                if (offset % (SS_LIMIT * 10) === 0 || entry.done) checkpoint(`registry-backfill[ss]: ${entry.label} @${offset}${entry.done ? ' (DONE)' : ''}`);
                if (entry.done) break;
                await sleep(REQ_DELAY);
            }
            if (stoppedForBudget) break;
            continue;
        }
        while (cur < plan.target) {
            if (outOfBudget()) { stoppedForBudget = true; break; }
            const hFrom = cur + 1, hTo = Math.min(cur + WINDOW_BLOCKS, plan.target);
            const label = `${entry.label} ${hFrom}-${hTo}`;
            let txs, totalSeen;
            if (pairOnly) {
                const a = await fetchWindowTxs(entry.address, hFrom, hTo, label + ' [provide]', `wasm.action='provide_liquidity'`);
                const b = await fetchWindowTxs(entry.address, hFrom, hTo, label + ' [withdraw]', `wasm.action='withdraw_liquidity'`);
                const seenH = new Set(a.txs.map(t => t.txhash));
                txs = [...a.txs, ...b.txs.filter(t => !seenH.has(t.txhash))].sort((x, y) => Number(x.height) - Number(y.height));
                totalSeen = a.totalSeen + b.totalSeen;
            } else ({ txs, totalSeen } = await fetchWindowTxs(entry.address, hFrom, hTo, label));
            const classified = routeAndClassify(plan, txs, discovered, contextCensus, regCtx);
            const before = JSON.stringify(tallies);
            stageAndMerge(classified, tallies);
            cur = hTo;
            entry.cursor_height = cur;
            if (cur >= plan.target) entry.done = true;
            runRec.windows++; WINDOWS_DONE++;
            runRec.entries[entry.label] = { cursor: cur, target: plan.target, done: !!entry.done };
            if (!DRY) writeJson(REGISTRY_PATH, registry, 2);
            console.log(`  ${label}: ${totalSeen} txs (${txs.length} ok) → tallies ${JSON.stringify(tallies)}${before === JSON.stringify(tallies) ? ' (no new)' : ''}`);
            if (runRec.windows % 3 === 0 || entry.done) checkpoint(`registry-backfill: ${entry.label} → ${cur}${entry.done ? ' (DONE)' : ''}`);
        }
        } catch (e) {
            entryErrors++;
            console.warn(`  ⚠ ${entry.label}: ${String(e.message).slice(0, 200)} — entry skipped this hop (cursor holds; the self-chain retries it next dispatch)`);
            runRec.entries[entry.label] = { error: String(e.message).slice(0, 200) };
            try { checkpoint(`registry-backfill: checkpoint before skipping ${entry.label}`); } catch {}
        }
        if (stoppedForBudget) break;
    }

    // report: census (the §5/E0c payload) + tallies, every run appended
    runRec.finishedAt = new Date().toISOString();
    runRec.tallies = tallies;
    runRec.discovered_keys = Object.fromEntries(Object.entries(discovered).sort((a, b) => b[1] - a[1]).slice(0, 60));
    runRec.pd_context_census = contextCensus;
    runRec.unknown_manager_wasm = Object.keys(MV.UNKNOWN_MANAGER_WASM.counts).length ? MV.UNKNOWN_MANAGER_WASM : null;
    runRec.note_buckets = 'tribute-bucket bribes are manager-contract events — captured under the manager entry; bucket entries classify flows only (dedup-safe by construction)';
    report.runs.push(runRec);
    if (!DRY) { writeJson(REPORT_PATH, report, 2); recountVotingIndex(); recountFlowsIndex(); }

    if (stoppedForBudget) {
        checkpoint('registry-backfill: budget checkpoint (re-dispatch to continue)');
        writeStatus('continue');
        console.log(`\n⏸ TIME_BUDGET_MIN (${TIME_BUDGET_MIN}) reached — cursors committed; self-chain continues.`);
        return;
    }

    const writeStatus = (state) => { try { fs.writeFileSync('/tmp/backfill-status.json', JSON.stringify({ state, windows: WINDOWS_DONE, entryErrors })); } catch {} };
    if (WALK_FLOOR != null) {
        // An entry harvested to FULL depth (done=true, cursor at target) has by
        // definition completed any staged slice above the floor. Without this,
        // a staged pass over an already-complete registry livelocks: the
        // per-entry loop skips done entries (never stamping staged_floor_done)
        // while this counter demands the stamp — observed live 2026-08-09,
        // 16 hops × 0 windows before manual cancel.
        const sliceDone = (e) => e.done === true || Number(e.staged_floor_done || Infinity) <= Math.max(WALK_FLOOR, 0);
        const sliced = registry.contracts.filter(sliceDone).length;
        const remaining = registry.contracts.filter(e => !sliceDone(e) && !blocked.has(e.address)).length;
        checkpoint(`registry-backfill: staged pass (floor ${WALK_FLOOR}) checkpoint`);
        writeStatus(remaining === 0 ? 'complete' : 'continue');
        console.log(`\n${remaining === 0 ? '✅ STAGED PASS COMPLETE' : '⏸ STAGED PASS'} (WALK_FLOOR=${WALK_FLOOR}): ${sliced}/${registry.contracts.length} entries have completed their serviceable slice${remaining ? `; ${remaining} remain — self-chain continues` : ''}.`);
        console.log('Deep remainder below the staged floor stays open in the registry; §10 fixtures evaluate on the eventual FULL-depth completion.');
        console.log('Fixtures that live ABOVE the staged floor (PD props, June Solid, flows-v3 upgrades) can be spot-checked now in the committed months.');
        return;
    }
    const allDone = registry.contracts.every(e => e.done || blocked.has(e.address));
    if (!allDone) { checkpoint('registry-backfill: partial (see registry cursors)'); writeStatus('continue'); console.log('\n⏸ not all entries complete — self-chain continues.'); return; }
    writeStatus('complete');
    if (blocked.size) console.log(`\n⚠ ${blocked.size} pair entr${blocked.size === 1 ? 'y' : 'ies'} BLOCKED on action-filter support — everything else complete; fixtures evaluated on what was walked.`);

    // §10 completion gate
    console.log('\n🔒 all entries at target — evaluating §10 fixtures');
    const fixturesDoc = readJson(FIXTURES_PATH, null);
    if (!fixturesDoc) throw new Error(`${FIXTURES_PATH} missing — the completion gate cannot run`);
    const { failures, report: fxReport } = evalFixtures(fixturesDoc, loadAllBribeEvents());
    for (const r of fxReport) console.log('  ' + JSON.stringify(r));
    runRec.fixture_gate = failures.length ? { status: 'FAILED', failures } : { status: 'PASS', fixtures: fxReport };
    if (!DRY) writeJson(REPORT_PATH, report, 2);
    checkpoint(`registry-backfill: COMPLETE — fixture gate ${failures.length ? 'FAILED' : 'PASS'}`);
    if (failures.length) {
        console.error('\n❌ §10 FIXTURE GATE FAILED:\n  ' + failures.join('\n  '));
        console.error('Recovered data is committed (never-shrink-safe); the gate failing means capture is still incomplete or wrong — investigate before E3.');
        process.exit(1);
    }
    console.log('\n✅ BACKFILL COMPLETE — §10 fixtures verbatim. Next (E3): rollup + P&L rebuilds, then spec §7 gates.');
}

// ============================================================================= main
(async () => {
    if (MODE === 'gate') return gateMode();
    if (MODE === 'preflight') return preflight();
    if (MODE === 'walk') return walk();
    throw new Error(`unknown MODE ${MODE}`);
})().catch(e => {
    console.error('FATAL', e.stack || e.message);
    if (MODE === 'walk' && !DRY && WINDOWS_DONE > 0) {
        writeRunStatus('continue');   // progress WAS made and is committed — the self-chain resumes past this transient
        console.error(`(${WINDOWS_DONE} windows committed before the crash — status=continue written; the chain re-dispatches and resumes from committed cursors)`);
    }
    process.exit(1);
});

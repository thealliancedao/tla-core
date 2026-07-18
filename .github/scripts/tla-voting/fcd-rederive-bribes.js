// =============================================================================
// fcd-rederive-bribes.js — D8: re-derive FCD-era bribes with classifier v6.1
// Lives in: tla-core/.github/scripts/tla-voting/
// Workflow: .github/workflows/tla-voting-fcd-rederive.yml (checks out BOTH
//           repos; this script require()s the LIVE cron classifier — no copy)
// =============================================================================
//
// WHY: the FCD census counted 2,793 bribe/add_bribe wasm events on the
// incentive manager, but only ~173 FCD-era direct bribes are committed —
// 751 FCD-era txs are contract-initiated (take-rate tributes and, later,
// governance-executed bribes) and were invisible to top-level-msg parsing.
// Classifier v6 promotes them; v6.1 fixes the shared-msg_index collision
// (PD fixture 402AE7B1…AAAA7: ten add_bribes under one msg — nine were
// silently dropped) and adds dao_attr attribution.
//
// WHAT THIS DOES (bribes stream ONLY — v6/v6.1 changed nothing for rewards):
//   1. requires the live cron module (PLATFORM_CRONS_DIR checkout) —
//      "no third copy": the classifier is the production code, verbatim.
//   2. SELF-GATE: replays the embedded PD fixture through that module and
//      aborts unless every v6.1 invariant holds (10 promoted, 10 survive
//      merge, chain-exact total, dao_attr attribution, 10 distinct keys).
//      Running this against a pre-2.3.1 checkout is therefore impossible.
//   3. reads archive/fcd/tla-incentive/part-*.json (frozen FCD archive:
//      contract genesis → ~2025-01-07), skipping failed txs (code !== 0).
//   4. classifies ALL txs, keeps bribe events, buckets by timestamp month.
//   5. merges into tla-voting/events/bribes/{YYYY}/{MM}.json under the laws:
//      dedup by eventKey (prior event WINS on key match — committed direct
//      events stay byte-identical), never-shrink (aborts if any prior event
//      would change or vanish), chain sort order via the cron's mergeEvents.
//   6. updates index.json bribes.count + builtAt ONLY (heights, horizons,
//      known_gaps, scan flags are the Render cron's — untouched).
//
// Writes to the WORKING TREE; the workflow commits. DRY_RUN=1 prints the
// plan without writing. Safe to re-run: fully idempotent (second run adds 0).
//
// Post-run: rollups pick the recovered events up on the next rebuild
// (Sunday self-heal or a manual reconcile run) — the briber board's history
// then extends to TLA genesis for the FCD era. The 2025-01→2026-06 window
// remains attribution-unknown (known_gaps; state-side bribe-state holds the
// per-period totals) pending the Phase-2 capture-registry pass.
// =============================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const CORE_DIR = process.env.TLA_CORE_DIR || '.';
const CRONS_DIR = process.env.PLATFORM_CRONS_DIR || path.join(CORE_DIR, '..', 'platform-crons');
const DRY = process.env.DRY_RUN === '1';
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'unused-local';

const M = require(path.join(path.resolve(CRONS_DIR), 'tla-voting', 'index.js'));

// ---------------------------------------------------------------- self-gate
// The PD fixture, chainscope-verbatim (tx 402AE7B1…AAAA7, 2026-07-09).
function selfGate() {
    const MGR = 'terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh';
    const PD_DAO = 'terra1k8ug6dkzntczfzn76wsh24tdjmx944yj6mk063wum7n20cwd7lxq4lppjg';
    const PD_PROP = 'terra1660g9mle5kfsq8c0p4k4hgr9ujdyr3m48c22cawy0akr98rmwksqehqnup';
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
                { key: '_contract_address', value: MGR }, { key: 'action', value: 'bribe/add_bribe' },
                { key: 'added', value: 'native:uluna:' + a }, { key: 'end', value: '196' },
                { key: 'start', value: '193' }, { key: 'msg_index', value: '0' }] }))],
    };
    const { bribeEvents } = M.classifyIncentiveTxs([tx], {});
    const { merged } = M.mergeEvents([], bribeEvents);
    const total = merged.reduce((s, e) => s + Number(e.coins[0].amount), 0);
    const keys = new Set(merged.map(e => M.eventKey(e)));
    const ok = bribeEvents.length === 10 && merged.length === 10 && total === 34763534826 &&
        merged.every(e => e.briber === PD_DAO && e.briber_source === 'dao_attr') && keys.size === 10;
    if (!ok) {
        console.error(`SELF-GATE FAILED — the checked-out platform-crons classifier is not v6.1 ` +
            `(promoted ${bribeEvents.length}, survived ${merged.length}, total ${total}). ABORTING before any read/write.`);
        process.exit(1);
    }
    console.log('self-gate: v6.1 invariants hold on the PD fixture — proceeding');
}

// ---------------------------------------------------------------- main
function main() {
    selfGate();

    // 1. archive completeness (same precondition as fcd-fill)
    const archDir = path.join(CORE_DIR, 'archive', 'fcd', 'tla-incentive');
    const statePath = path.join(archDir, 'state.json');
    if (fs.existsSync(statePath)) {
        const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (st && st.complete === false) { console.error('archive state.complete=false — a partial archive would poison the record. ABORT.'); process.exit(1); }
    }
    const parts = fs.readdirSync(archDir).filter(f => /^part-\d+\.json$/.test(f)).sort();
    if (!parts.length) { console.error('no archive parts found — nothing to derive. ABORT.'); process.exit(1); }

    // 2. load + adapt (FCD trimmed shape: {txhash,height,timestamp,code,messages,events})
    let txs = [];
    for (const p of parts) {
        const doc = JSON.parse(fs.readFileSync(path.join(archDir, p), 'utf8'));
        txs = txs.concat(doc.txs || []);
    }
    const trs = txs.filter(t => t.code === 0).map(t => ({
        txhash: t.txhash, height: String(t.height), timestamp: t.timestamp,
        tx: { body: { messages: t.messages || [] } }, events: t.events || [],
    }));
    console.log(`archive: ${parts.length} parts, ${txs.length} txs, ${trs.length} successful`);

    // 3. classify (the live production classifier — bribes only)
    const discovered = {};
    const { bribeEvents } = M.classifyIncentiveTxs(trs, discovered);
    const viaCounts = {};
    for (const e of bribeEvents) { const v = e.via || 'msg'; viaCounts[v] = (viaCounts[v] || 0) + 1; }
    console.log(`classified: ${bribeEvents.length} bribe events`, JSON.stringify(viaCounts));

    // 4. bucket by month
    const byMonth = new Map();
    for (const e of bribeEvents) {
        const ym = String(e.timestamp).slice(0, 7); // YYYY-MM
        if (!/^\d{4}-\d{2}$/.test(ym)) { console.error(`event with unusable timestamp ${e.timestamp} (tx ${e.tx_hash}) — ABORT`); process.exit(1); }
        if (!byMonth.has(ym)) byMonth.set(ym, []);
        byMonth.get(ym).push(e);
    }

    // 5. merge under the laws
    const bribesDir = path.join(CORE_DIR, 'tla-voting', 'events', 'bribes');
    let totalAdded = 0; const monthReport = [];
    for (const [ym, fresh] of [...byMonth.entries()].sort()) {
        const [yyyy, mm] = ym.split('-');
        const fp = path.join(bribesDir, yyyy, `${mm}.json`);
        const prior = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : [];
        if (!Array.isArray(prior)) { console.error(`${fp} is not an array — refusing to touch it. ABORT.`); process.exit(1); }
        const { merged, added } = M.mergeEvents(prior, fresh);
        // never-shrink + prior-verbatim: every prior event must survive byte-identically
        const mergedByKey = new Map(merged.map(e => [M.eventKey(e), e]));
        for (const p of prior) {
            const m = mergedByKey.get(M.eventKey(p));
            if (!m || JSON.stringify(m) !== JSON.stringify(p)) {
                console.error(`never-shrink violated in ${ym} (key ${M.eventKey(p)}) — ABORT, nothing written.`);
                process.exit(1);
            }
        }
        monthReport.push(`  ${ym}: ${prior.length} prior + ${added} recovered → ${merged.length}`);
        totalAdded += added;
        if (added > 0 && !DRY) {
            fs.mkdirSync(path.dirname(fp), { recursive: true });
            fs.writeFileSync(fp, JSON.stringify(merged, null, 1) + '\n');
        }
    }
    console.log(monthReport.join('\n'));
    console.log(`${DRY ? '[DRY RUN] would add' : 'added'}: ${totalAdded} recovered contract-initiated bribe events`);

    // 6. index.json — count + builtAt only
    if (totalAdded > 0 && !DRY) {
        const idxPath = path.join(CORE_DIR, 'tla-voting', 'events', 'index.json');
        const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
        let count = 0;
        for (const yyyy of fs.readdirSync(bribesDir)) {
            const ydir = path.join(bribesDir, yyyy);
            if (!fs.statSync(ydir).isDirectory()) continue;
            for (const f of fs.readdirSync(ydir)) if (f.endsWith('.json'))
                count += JSON.parse(fs.readFileSync(path.join(ydir, f), 'utf8')).length;
        }
        idx.streams.bribes.count = count;
        idx.streams.bribes.builtAt = new Date().toISOString();
        idx.updatedAt = new Date().toISOString();
        fs.writeFileSync(idxPath, JSON.stringify(idx, null, 1) + '\n');
        console.log(`index.json: bribes.count → ${count}`);
    }
    console.log('done. rollups will absorb the recovered events on the next rebuild.');
}

main();

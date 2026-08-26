#!/usr/bin/env node
'use strict';
// tla-flows REWALK-BY-HASH — bring every non-v4 flow record to classifier v4
// without walking a single block (2026-08-26, Portfolio P&L step 2).
//
// Population (measured 2026-08-26): 5,563 records below schemaVersion 4 —
//   v3 4,419 (2026-06-15→08-03, the forward walker before v4: withdraws lack
//   refund_assets, deposits lack provides) · v1 277 (same window) · v1 867
//   (FCD era). Every txhash is already committed, so the re-read is BY HASH:
//   · height < FCD_FREEZE → the tx is in tla-core/archive/fcd/*/part-*.json.gz
//     verbatim (classifier shape) — ZERO network
//   · otherwise → ARCHIVE_LCD /cosmos/tx/v1beta1/txs/{hash} (tx_response is the
//     exact shape every classifier consumes) — one serial read per hash
// Classification = the LIVE production classifier, required from the
// platform-crons checkout (no-third-copy). Merge = its own mergeMonth
// (schema-upgrade-in-place by txhash).
//
// Two outcomes per record, both labeled, nothing deleted (never-shrink,
// prior-verbatim):
//   UPGRADE  — v4 record replaces the lower-schema record (fields gained)
//   RETRACT  — the live classifier returns null (the tx is not a member flow:
//              867+222 are the stable bucket's epoch take-rate distributions
//              misread by v1 as claims with user = the staking contract; 55
//              are Votion vault compounds). The record stays, verbatim, with
//              `retracted: {at, by, reason}` added — consumers skip it and
//              count it (build-pnl reconciles retracted into its totals).
//
// Archive discipline: secrets only, serial, REQ_DELAY_MS spacing, chain
// answers never retried, breaker on consecutive transport failures, endpoint
// masked, `archive-node` concurrency group (queues behind the state sampler).
// Resumable: hashes already v4 or retracted are skipped on re-run (idempotent);
// DRY_RUN=1 reports without writing.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const http = require('http');

const CORE_DIR  = path.resolve(process.env.TLA_CORE_DIR || process.env.CORE_DIR || '.');
const CRONS_DIR = path.resolve(process.env.PLATFORM_CRONS_DIR || path.join(CORE_DIR, '..', 'platform-crons'));
const MF = require(path.join(CRONS_DIR, 'tla-flows', 'index.js'));   // <<FLOWS CLASSIFIER v4>> + mergeMonth
const FCD_FREEZE = Number(process.env.FCD_FREEZE_HEIGHT || 13737811);
const ARCHIVE_LCD = String(process.env.ARCHIVE_LCD || '').replace(/\/+$/, '');
const REQ_DELAY = Number(process.env.REQ_DELAY_MS || 150);
const BREAKER_MAX = Number(process.env.BREAKER_MAX || 5);
const DRY = process.env.DRY_RUN === '1';
const ONLY_LOCAL = process.env.ONLY_LOCAL === '1';       // FCD era only (no archive needed)
const LIMIT = Number(process.env.LIMIT || 0);            // cap archive reads this run (0 = all)
const TARGET_SCHEMA = 4;
const EVENTS_DIR = path.join(CORE_DIR, 'tla-flows/events');
const FCD_DIR = path.join(CORE_DIR, 'archive/fcd');
const REPORT = path.join(CORE_DIR, 'tla-flows/events/rewalk-by-hash-report.json');
const NOW = new Date().toISOString();
const BY = `<<FLOWS CLASSIFIER v${TARGET_SCHEMA}>> (platform-crons/tla-flows/index.js, rewalk-by-hash)`;

const SECRETS = []; if (ARCHIVE_LCD) { SECRETS.push(ARCHIVE_LCD); try { SECRETS.push(new URL(ARCHIVE_LCD).host); } catch {} }
const mask = (s) => { s = String(s == null ? '' : s); for (const x of SECRETS) s = s.split(x).join('[ARCHIVE]'); return s; };
const log = (...a) => console.log(...a.map(mask));
const fail = (m) => { console.error('FATAL: ' + mask(m)); process.exit(1); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function httpGet(url, t = 25000) {
  return new Promise((res, rej) => {
    const r = (url.startsWith('http:') ? http : https).get(url, { headers: { Accept: 'application/json', 'User-Agent': 'tla-flows-rewalk-by-hash/1.0' } }, (x) => {
      let b = ''; x.on('data', c => b += c); x.on('end', () => { clearTimeout(dl);
        if (x.statusCode >= 200 && x.statusCode < 300) { try { res(JSON.parse(b)); } catch { rej(Object.assign(new Error('bad JSON'), { statusCode: x.statusCode })); } }
        else rej(Object.assign(new Error(`HTTP ${x.statusCode} ${b.slice(0, 160)}`), { statusCode: x.statusCode, body: b.slice(0, 400) })); });
    });
    r.on('error', (e) => { clearTimeout(dl); rej(e); });
    r.setTimeout(t, () => r.destroy(new Error('idle-timeout')));
    const dl = setTimeout(() => r.destroy(new Error('deadline')), t * 2); if (dl.unref) dl.unref();
  });
}
const stats = { archive_requests: 0, archive_retries: 0 }; let streak = 0;
const CHAIN_ANSWER_RE = /codespace|not found|tx \(|no such|Error parsing|invalid/i;
// → { ok, tx } | { ok:false, class:'unindexed'|'net', msg }
async function fetchTxByHash(hash) {
  let last;
  for (let a = 1; a <= 4; a++) {
    stats.archive_requests++;
    try { const r = await httpGet(`${ARCHIVE_LCD}/cosmos/tx/v1beta1/txs/${hash}`); await sleep(REQ_DELAY); streak = 0; return { ok: true, tx: r.tx_response }; }
    catch (e) {
      last = e; const sc = e.statusCode; const chain = CHAIN_ANSWER_RE.test(e.body || e.message || '');
      if (sc && sc !== 429 && (sc < 500 || chain)) { streak = 0; return { ok: false, class: 'unindexed', msg: mask(e.body || e.message).slice(0, 160) }; }
      stats.archive_retries++; await sleep(400 * a * a);
    }
  }
  if (++streak >= BREAKER_MAX) fail(`${BREAKER_MAX} consecutive transport failures — stopping rather than hammering a node that is not answering`);
  return { ok: false, class: 'net', msg: mask(last && last.message).slice(0, 160) };
}

// ── inputs ───────────────────────────────────────────────────────────────────
const months = [];
for (const y of fs.readdirSync(EVENTS_DIR).filter(d => /^\d{4}$/.test(d)).sort())
  for (const f of fs.readdirSync(path.join(EVENTS_DIR, y)).filter(x => /^\d{2}\.json$/.test(x)).sort())
    months.push({ key: `${y}/${f.slice(0, 2)}`, file: path.join(EVENTS_DIR, y, f), events: JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, y, f), 'utf8')) });
const pending = []; // { month, rec }
for (const m of months) for (const e of m.events) if (Number(e.schemaVersion || 1) < TARGET_SCHEMA && !e.retracted) pending.push({ month: m, rec: e });
const fcdSet = pending.filter(p => p.rec.height < FCD_FREEZE), lcdSet = pending.filter(p => p.rec.height >= FCD_FREEZE);
log(`rewalk-by-hash · ${pending.length} records below v${TARGET_SCHEMA} (${fcdSet.length} FCD-era local · ${lcdSet.length} archive-LCD)${DRY ? ' · DRY RUN' : ''}${ONLY_LOCAL ? ' · ONLY_LOCAL' : ''}`);

// local FCD archive: hash → tx (only the hashes we need)
const need = new Set(fcdSet.map(p => p.rec.txhash)); const local = new Map();
if (need.size && fs.existsSync(FCD_DIR)) {
  for (const d of fs.readdirSync(FCD_DIR).filter(x => fs.statSync(path.join(FCD_DIR, x)).isDirectory())) {
    for (const f of fs.readdirSync(path.join(FCD_DIR, d)).filter(x => x.endsWith('.json.gz'))) {
      const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(FCD_DIR, d, f))));
      for (const t of (j.txs || [])) if (need.has(t.txhash) && !local.has(t.txhash)) local.set(t.txhash, t);
    }
  }
}
log(`  local FCD archive holds ${local.size}/${need.size} FCD-era hashes`);

// ── work ─────────────────────────────────────────────────────────────────────
const tally = { upgraded: 0, retracted: 0, unindexed: 0, net: 0, missing_local: 0, unchanged_already_v4: 0 };
const retractedBy = {}; const upgradedByMonth = {}; const retractedByMonth = {};
const touched = new Map(); // month key → { month, incoming:[], retract:[] }
function bucket(m) { return touched.get(m.key) || touched.set(m.key, { month: m, incoming: [], retract: [] }).get(m.key); }
function reasonFor(rec) {
  const a = (rec.raw_actions || []);
  if (a[0] === 'asset/distribute_take_rate') return 'contract-initiated epoch take-rate distribution (staking contract as user) — not a member flow';
  if (a.some(x => String(x).startsWith('votion-la/'))) return 'Votion vault compound (contract-initiated) — not a member flow';
  return 'live classifier v4 returns null — not a TLA member flow';
}
function apply(p, tx) {
  const rec = MF.classifyFlowTx(tx);
  if (rec) {
    if (Number(rec.schemaVersion) < TARGET_SCHEMA) fail(`live classifier emitted schemaVersion ${rec.schemaVersion} — refusing (expected ${TARGET_SCHEMA})`);
    bucket(p.month).incoming.push(rec); tally.upgraded++; upgradedByMonth[p.month.key] = (upgradedByMonth[p.month.key] || 0) + 1;
  } else {
    const reason = reasonFor(p.rec);
    bucket(p.month).retract.push({ txhash: p.rec.txhash, reason }); tally.retracted++; retractedByMonth[p.month.key] = (retractedByMonth[p.month.key] || 0) + 1;
    retractedBy[reason] = (retractedBy[reason] || 0) + 1;
  }
}
(async () => {
  for (const p of fcdSet) { const t = local.get(p.rec.txhash); if (!t) { tally.missing_local++; continue; } apply(p, t); }
  log(`  FCD-era: upgraded ${tally.upgraded} · retracted ${tally.retracted} · missing locally ${tally.missing_local}`);
  if (!ONLY_LOCAL && lcdSet.length) {
    if (!ARCHIVE_LCD) fail('ARCHIVE_LCD missing — set the repo secret, or run ONLY_LOCAL=1 for the FCD era');
    const before = { u: tally.upgraded, r: tally.retracted };
    let n = 0; const t0 = Date.now();
    for (const p of lcdSet) {
      if (LIMIT && n >= LIMIT) break; n++;
      const r = await fetchTxByHash(p.rec.txhash);
      if (!r.ok) { tally[r.class]++; if (r.class === 'unindexed') log(`    ? ${p.rec.txhash.slice(0, 12)} h${p.rec.height} ${r.msg}`); continue; }
      const tx = r.tx; if (!tx || Number(tx.height) !== Number(p.rec.height)) { tally.unindexed++; log(`    ? ${p.rec.txhash.slice(0, 12)} height mismatch ${tx && tx.height} vs ${p.rec.height}`); continue; }
      apply(p, { txhash: p.rec.txhash, height: Number(tx.height), timestamp: tx.timestamp || p.rec.timestamp, code: Number(tx.code || 0), events: tx.events, logs: tx.logs });
      if (n % 250 === 0) log(`    …${n}/${lcdSet.length} (${Math.round((Date.now() - t0) / 1000)}s, ${stats.archive_requests} reads)`);
    }
    log(`  archive-LCD: read ${n} · upgraded ${tally.upgraded - before.u} · retracted ${tally.retracted - before.r} · unindexed ${tally.unindexed} · net ${tally.net}`);
  }

  // ── merge + write (per month: upgrade in place via live mergeMonth; retract by label) ──
  let written = 0;
  for (const { month, incoming, retract } of touched.values()) {
    const base = month.events;
    const m = MF.mergeMonth(base, incoming);
    if (m.merged.length !== base.length) fail(`never-shrink/identity violated for ${month.key}: ${base.length} → ${m.merged.length}`);
    if ((m.added || 0) !== 0) fail(`${month.key}: merge ADDED ${m.added} records — a by-hash re-read must never add`);
    const byHash = new Map(m.merged.map(r => [r.txhash, r]));
    for (const rt of retract) { const r = byHash.get(rt.txhash); if (!r) fail(`${month.key}: retract target ${rt.txhash} vanished`); if (Number(r.schemaVersion || 1) >= TARGET_SCHEMA) fail(`${month.key}: refusing to retract a v${r.schemaVersion} record ${rt.txhash}`); r.retracted = { at: NOW, by: BY, reason: rt.reason }; }
    const upgradedHere = m.upgraded || 0;
    log(`  ${month.key}: ↑${upgradedHere} · retracted ${retract.length} (${m.merged.length} records, unchanged count)`);
    if (!DRY) { fs.writeFileSync(month.file, JSON.stringify(m.merged, null, 1) + '\n'); written++; }
  }
  const report = { schemaVersion: 1, product: 'tla-flows/events (rewalk-by-hash)', ran_at: NOW, dry_run: DRY, only_local: ONLY_LOCAL, target_schema: TARGET_SCHEMA, by: BY,
    population: { total_below_target: pending.length, fcd_era: fcdSet.length, archive_lcd: lcdSet.length }, tally, retracted_by_reason: retractedBy, upgraded_by_month: upgradedByMonth, retracted_by_month: retractedByMonth,
    remaining_below_target: pending.length - tally.upgraded - tally.retracted, archive: { requests: stats.archive_requests, retries: stats.archive_retries } };
  if (!DRY) fs.writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n');
  log(`\nSUMMARY: upgraded ${tally.upgraded} · retracted ${tally.retracted} · unindexed ${tally.unindexed} · net ${tally.net} · remaining below v${TARGET_SCHEMA}: ${report.remaining_below_target} · ${stats.archive_requests} archive reads (${stats.archive_retries} retries) · ${written} month files written${DRY ? ' (dry: none)' : ''}`);
  if (tally.net || tally.unindexed) process.exitCode = 2;
})().catch(e => fail(e.stack || e.message));

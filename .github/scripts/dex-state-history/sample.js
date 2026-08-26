#!/usr/bin/env node
'use strict';
// dex-state-history DUTY — per-epoch pool state to genesis, from the archive node.
//
// Product: dex-data/state-history/
//   epochs/<epoch>.json  one file per TLA epoch START boundary (write-once; a file
//                        is written only when the sample is COMPLETE = zero transport
//                        failures; absent/depth/query answers are recorded honestly
//                        per pool and do not block completion)
//   index.json           epoch coverage + the pair registry (key → pair, name, dex,
//                        bucket, first/last event)
//   cursor.json          resume state (last epoch attempted, incomplete epochs)
//   heartbeat.json
//
// Per epoch: every pair that had a TLA flow event on or before the boundary →
// {pool:{}} reserves + LP total_share; the asset-compounder's per-asset
// total_lp / total_amplp (the amplified exchange rate); the 4 staking buckets'
// total_staked_balances; the 5 LST hub ratios.
//
// Laws honoured: write-once (existing complete epochs are never resampled unless
// FORCE=1); never-shrink (nothing is deleted); honest blanks (absent/depth kept as
// classes, never bridged); resumable (cursor + git checkpoints every CHECKPOINT_EVERY
// epochs); budgeted (TIME_BUDGET_MIN clean stop); archive discipline in lib.js.
//
// Inputs (env): ARCHIVE_LCD | ARCHIVE_RPC · EPOCH_FROM / EPOCH_TO (default: whole
//   anchor span) · REQ_DELAY_MS (150) · REFINE_MAX (8) · TIME_BUDGET_MIN (300) ·
//   CHECKPOINT_EVERY (8) · GIT_CHECKPOINT (1) · DRY_RUN (0) · FORCE (0) · PUBLIC_LCD.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib');

const ROOT = process.env.CORE_DIR || process.cwd();
const OUT_DIR = path.join(ROOT, 'dex-data/state-history');
const EP_DIR = path.join(OUT_DIR, 'epochs');
const VERSION = 'dex-state-history-1.0.0';
const DRY = process.env.DRY_RUN === '1';
const FORCE = process.env.FORCE === '1';
const GIT_CHECKPOINT = process.env.GIT_CHECKPOINT !== '0';
const CHECKPOINT_EVERY = Number(process.env.CHECKPOINT_EVERY || 8);
const BUDGET_MS = Number(process.env.TIME_BUDGET_MIN || 300) * 60000;
const REFINE_MAX = Number(process.env.REFINE_MAX || 8);
const PUBLIC_LCD = String(process.env.PUBLIC_LCD || 'https://terra-lcd.publicnode.com').replace(/\/+$/, '');

const archive = L.makeArchive({ lcd: process.env.ARCHIVE_LCD, rpc: process.env.ARCHIVE_RPC, reqDelayMs: Number(process.env.REQ_DELAY_MS || 150), breakerMax: Number(process.env.BREAKER_MAX || 5) });
const { log, fail } = L;

function rj(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function wj(p, o) { if (DRY) { log(`  [dry] would write ${path.relative(ROOT, p)}`); return; } fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 1) + '\n'); }
function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }); }
function checkpoint(msg) { // lifted verbatim in spirit from tla-voting/registry-backfill.js checkpoint()
  if (DRY || !GIT_CHECKPOINT) { log(`  [${DRY ? 'dry' : 'no-checkpoint'}] would commit: ${msg}`); return; }
  git(['add', 'dex-data/state-history']);
  try { git(['commit', '-m', msg]); } catch { log('  checkpoint: nothing to commit'); return; }
  for (let a = 1; a <= 10; a++) {
    try { git(['push']); log(`  ✓ checkpoint pushed: ${msg}`); return; }
    catch (e) {
      const wait = 1000 * a + Math.floor(Math.random() * 4000);
      log(`  ⚠ push race lost (attempt ${a}/10) — rebase + retry in ${wait}ms`);
      try { git(['pull', '--rebase']); } catch (pe) { log(`  ⚠ rebase failed: ${String(pe).slice(0, 200)}`); }
      execFileSync('sleep', [String(wait / 1000)]);
    }
  }
  throw new Error(`checkpoint push failed after 10 attempts (${msg}) — work up to the previous checkpoint is committed`);
}

(async () => {
  const t0 = Date.now();
  log(`${VERSION} · transport=${archive.transport} · spacing=${archive.reqDelayMs}ms · serial${DRY ? ' · DRY RUN' : ''}${FORCE ? ' · FORCE (resample complete epochs)' : ''}`);
  const corpus = L.loadCorpus(ROOT);
  const targets = await L.buildTargets(corpus, { publicLcd: PUBLIC_LCD, reqDelayMs: archive.reqDelayMs, stats: archive.stats });
  const pairs = targets.filter(t => t.kind === 'pair');
  const unresolved = targets.filter(t => t.kind === 'unresolved');
  log(`  ${corpus.anchors.length} anchors · ${targets.length} pools in events · ${pairs.length} pairs · ${unresolved.length} unresolved${unresolved.length ? ' (' + unresolved.map(u => u.key).join(', ') + ')' : ''}`);

  // epoch span: first boundary inside the anchor corpus → last boundary that has already started
  const nowIso = new Date().toISOString();
  const inSpan = corpus.epochTable.filter(r => L.ms(r.start_time) > corpus.anchors[0][0] && r.start_time <= nowIso);
  const spanFrom = inSpan[0].epoch, spanTo = inSpan[inSpan.length - 1].epoch;
  const FROM = Number(process.env.EPOCH_FROM || spanFrom), TO = Number(process.env.EPOCH_TO || spanTo);
  if (!(FROM >= spanFrom && TO <= spanTo && FROM <= TO)) fail(`epoch range ${FROM}→${TO} outside the resolvable span ${spanFrom}→${spanTo}`);

  const cursor = rj(path.join(OUT_DIR, 'cursor.json'), { schemaVersion: 1, incomplete: [] });
  let done = 0, skipped = 0, sinceCheckpoint = 0, stoppedForBudget = false;
  const incomplete = new Set(cursor.incomplete || []);

  for (let ep = FROM; ep <= TO; ep++) {
    if (Date.now() - t0 > BUDGET_MS) { stoppedForBudget = true; log(`time budget reached before epoch ${ep} — clean stop (resume by re-dispatch)`); break; }
    const file = path.join(EP_DIR, `${ep}.json`);
    const existing = rj(file, null);
    if (existing && existing.complete && !FORCE) { skipped++; continue; }         // write-once
    const hr = await L.resolveHeight(corpus, archive, ep, REFINE_MAX);
    if (hr.error) { log(`epoch ${ep}: ${hr.error}`); continue; }
    const s = await L.sampleHeight(archive, targets, hr.height, { skipBornLater: true, boundaryIso: hr.start_time });
    const complete = s.tally.net === 0;
    const rec = {
      schemaVersion: 1, product: 'dex-data/state-history', version: VERSION, epoch: ep,
      start_time: hr.start_time, height: hr.height, height_time: hr.height_time, delta_sec: hr.delta_sec, block_reads: hr.block_reads, resolve_note: hr.note || null,
      sampled_at: new Date().toISOString(), transport: archive.transport, complete,
      method: {
        height: 'last block at or before the epoch start_time; bracketed by tla-flows/events anchors, refined by block reads',
        pairs: '{pool:{}} on the pair contract at height — assets (denom, amount) + total_share; only pairs with a TLA flow event on or before the boundary are queried',
        compounder: 'asset_configs at height → user_infos totals per gauge; lp_per_amplp = total_lp / total_amplp (the amplified exchange rate)',
        classes: 'absent = contract not instantiated at height · depth = node has no state at height · query = message rejected · shape = answered without assets+total_share · net = transport (blocks completion)',
      },
      pairs: s.pairs, not_sampled: s.not_sampled, compounder: s.compounder, staking: s.staking, lst_hubs: s.lst_hubs, tally: s.tally,
    };
    const bornLater = Object.keys(s.not_sampled).length;
    log(`epoch ${ep} ${hr.start_time.slice(0, 10)} h=${hr.height} (${hr.delta_sec}s, ${hr.block_reads} reads) · pairs ok ${s.tally.pair_ok} · absent ${s.tally.absent} · depth ${s.tally.depth} · query ${s.tally.query} · shape ${s.tally.shape} · net ${s.tally.net} · skipped ${bornLater} · amp rates ${s.compounder.ok ? s.compounder.rates.length : s.compounder.class} · hubs ${Object.values(s.lst_hubs).filter(x => x.ok).length}/5 · buckets ${Object.values(s.staking).filter(x => x.ok).length}/4${complete ? '' : '  ✗ INCOMPLETE'}`);
    for (const [k, v] of Object.entries(s.pairs)) if (!v.ok && v.class !== 'absent') log(`    ✗ ${k.slice(0, 64)} ${v.class}: ${v.msg}`);
    if (complete) { wj(file, rec); incomplete.delete(ep); done++; }
    else { incomplete.add(ep); if (!existing) wj(file, rec); }   // an incomplete sample is kept (visible) but resampled next run
    cursor.last_attempted = ep; cursor.incomplete = [...incomplete].sort((a, b) => a - b); cursor.updatedAt = new Date().toISOString();
    wj(path.join(OUT_DIR, 'cursor.json'), cursor);
    if (++sinceCheckpoint >= CHECKPOINT_EVERY) { writeIndex(); checkpoint(`dex-data/state-history: epochs through ${ep}`); sinceCheckpoint = 0; }
  }

  function writeIndex() {
    const epochs = [];
    if (fs.existsSync(EP_DIR)) for (const f of fs.readdirSync(EP_DIR).filter(x => /^\d+\.json$/.test(x)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))) {
      const r = rj(path.join(EP_DIR, f), null); if (!r) continue;
      epochs.push({ epoch: r.epoch, start_time: r.start_time, height: r.height, delta_sec: r.delta_sec, complete: r.complete, pairs_ok: r.tally.pair_ok, absent: r.tally.absent, depth: r.tally.depth, query: r.tally.query, shape: r.tally.shape, net: r.tally.net, skipped: r.tally.skipped, amp_rates: r.compounder && r.compounder.ok ? r.compounder.rates.length : 0, hubs_ok: Object.values(r.lst_hubs).filter(x => x.ok).length });
    }
    const idx = {
      schemaVersion: 1, product: 'dex-data/state-history', version: VERSION, updatedAt: new Date().toISOString(),
      epoch_span: epochs.length ? [epochs[0].epoch, epochs[epochs.length - 1].epoch] : null,
      epochs_complete: epochs.filter(e => e.complete).length, epochs_incomplete: epochs.filter(e => !e.complete).map(e => e.epoch),
      pairs: targets.filter(t => t.kind !== 'single').map(t => ({ key: t.key, kind: t.kind, pair: t.pair, lp: t.lp, name: t.name, dex: t.dex, bucket: t.bucket, pair_via: t.pair_via, events: t.events, first_event: t.first, last_event: t.last })),
      singles: targets.filter(t => t.kind === 'single').map(t => ({ key: t.key, name: t.name, events: t.events, first_event: t.first, last_event: t.last })),
      epochs,
    };
    wj(path.join(OUT_DIR, 'index.json'), idx);
    wj(path.join(OUT_DIR, 'heartbeat.json'), { schemaVersion: 1, product: 'dex-data/state-history', version: VERSION, capturedAt: new Date().toISOString(), status: incomplete.size ? 'partial' : 'ok', epochs_complete: idx.epochs_complete, epochs_incomplete: idx.epochs_incomplete, archive_requests: archive.stats.archive_requests, archive_retries: archive.stats.archive_retries, stopped_for_budget: stoppedForBudget });
  }
  writeIndex();
  checkpoint(`dex-data/state-history: ${done} epochs sampled, ${skipped} already complete${stoppedForBudget ? ' (budget stop)' : ''}`);
  const el = Math.round((Date.now() - t0) / 1000);
  log(`\nSUMMARY: ${done} sampled · ${skipped} skipped (write-once) · ${incomplete.size} incomplete${incomplete.size ? ' [' + [...incomplete].join(',') + ']' : ''} · ${archive.stats.archive_requests} archive requests (${archive.stats.archive_retries} retries) · ${archive.stats.public_requests || 0} public minter lookups · ${el}s${stoppedForBudget ? ' · BUDGET STOP — re-dispatch to continue' : ''}`);
  if (incomplete.size) process.exitCode = 2;
})().catch(e => fail(e.stack || e.message));

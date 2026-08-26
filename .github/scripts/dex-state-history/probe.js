#!/usr/bin/env node
'use strict';
// dex-state-history PROBE — READ-ONLY, one-off (2026-08-26; run #1 green 2026-08-26:
// LCD transport, full depth at epoch 100, 67/67 pairs at epoch 199).
//
// Samples a few TLA epoch boundaries with the SAME code the duty runs (./lib.js —
// no second copy) and reports: how each height was placed, and per height how
// every pool / the compounder / the staking buckets / the LST hubs answered.
// Writes nothing to the repo; the JSON artifact is the fixture for the duty.
//
// Inputs (env): ARCHIVE_LCD | ARCHIVE_RPC (one required), EPOCHS ("100,150,199"),
//   REQ_DELAY_MS (150), REFINE_MAX (8), PUBLIC_LCD, OUT_FILE.

const fs = require('fs');
const L = require('./lib');

const ROOT = process.env.CORE_DIR || process.cwd();
const EPOCHS = String(process.env.EPOCHS || '100,150,199').split(',').map(s => Number(s.trim())).filter(Number.isFinite);
const REFINE_MAX = Number(process.env.REFINE_MAX || 8);
const PUBLIC_LCD = String(process.env.PUBLIC_LCD || 'https://terra-lcd.publicnode.com').replace(/\/+$/, '');
const OUT = process.env.OUT_FILE || 'dex-state-history-probe.json';
const archive = L.makeArchive({ lcd: process.env.ARCHIVE_LCD, rpc: process.env.ARCHIVE_RPC, reqDelayMs: Number(process.env.REQ_DELAY_MS || 150), breakerMax: Number(process.env.BREAKER_MAX || 5) });
const { log, fail } = L;

(async () => {
  log('loading tla-flows/events (height↔time anchors + pool set)…');
  const corpus = L.loadCorpus(ROOT);
  log(`  ${corpus.anchors.length} anchors, ${corpus.poolSeen.size} distinct pools in events`);
  log(`dex-state-history probe · transport=${archive.transport} · epochs=${EPOCHS.join(',')} · spacing=${archive.reqDelayMs}ms · serial`);
  const targets = await L.buildTargets(corpus, { publicLcd: PUBLIC_LCD, reqDelayMs: archive.reqDelayMs, stats: archive.stats });
  const pairs = targets.filter(t => t.kind === 'pair');
  log(`  ${pairs.length} pairs to sample (${pairs.filter(t => t.pair_via === 'lcd_minter').length} resolved via minter), ${targets.filter(t => t.kind === 'single').length} singles, ${targets.filter(t => t.kind === 'unresolved').length} unresolved`);
  const report = { schemaVersion: 2, kind: 'probe', ran_at: new Date().toISOString(), transport: archive.transport, epochs: [], targets, stats: null };
  for (const ep of EPOCHS) {
    const hr = await L.resolveHeight(corpus, archive, ep, REFINE_MAX);
    if (hr.error) { log(`epoch ${ep}: ${hr.error}`); report.epochs.push(hr); continue; }
    log(`epoch ${ep} starts ${hr.start_time} → height ${hr.height} (block ${hr.height_time}, ${hr.delta_sec}s before boundary, ${hr.block_reads} block reads${hr.note ? ' — ' + hr.note : ''})`);
    const s = await L.sampleHeight(archive, targets, hr.height, { skipBornLater: false }); // the probe asks EVERY pair — absent is information here
    const c = s.compounder;
    log(`  pairs ok ${s.tally.pair_ok}/${pairs.length} · absent ${s.tally.absent} · depth ${s.tally.depth} · query ${s.tally.query} · shape ${s.tally.shape} · net ${s.tally.net}`);
    log(`  compounder ${c.ok ? `${c.configs} configs, ${c.rates.length} rates` : `${c.class}: ${c.msg}`} · staking ok ${Object.values(s.staking).filter(x => x.ok).length}/4 · hubs ok ${Object.values(s.lst_hubs).filter(x => x.ok).length}/5`);
    for (const [k, v] of Object.entries(s.pairs)) if (!v.ok && v.class !== 'absent') log(`    ✗ ${k.slice(0, 60)} ${v.class}: ${v.msg}`);
    const bornLater = pairs.filter(t => s.pairs[t.key] && s.pairs[t.key].class === 'absent' && t.first > hr.start_time).length;
    if (s.tally.absent) log(`  absent ${s.tally.absent}: ${bornLater} first seen in events after this boundary (expected), ${s.tally.absent - bornLater} seen BEFORE it (look)`);
    report.epochs.push({ ...hr, sample: s });
  }
  archive.stats.elapsed_sec = Math.round((Date.now() - archive.stats.started) / 1000);
  report.stats = archive.stats;
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  const anyDepth = report.epochs.some(e => e.sample && e.sample.tally.depth > 0);
  log(`\nSUMMARY: ${archive.stats.archive_requests} archive requests (${archive.stats.archive_retries} retries), ${archive.stats.public_requests || 0} public minter lookups, ${archive.stats.elapsed_sec}s`);
  log(anyDepth ? 'VERDICT: archive DEPTH failures seen — read per-epoch tallies before building the duty'
               : 'VERDICT: every non-absent pool answered at every sampled height — the duty can be built on these shapes');
  log(`artifact: ${OUT}`);
})().catch(e => fail(e.stack || e.message));

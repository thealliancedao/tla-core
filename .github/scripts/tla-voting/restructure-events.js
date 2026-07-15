#!/usr/bin/env node
/**
 * restructure-events.js — one-shot: split the four tla-voting event monoliths
 * into per-stream monthly partitions.
 *
 *   tla-voting/events/vote-events.json    → tla-voting/events/votes/{YYYY}/{MM}.json
 *   tla-voting/events/lock-events.json    → tla-voting/events/locks/{YYYY}/{MM}.json
 *   tla-voting/events/bribe-events.json   → tla-voting/events/bribes/{YYYY}/{MM}.json
 *   tla-voting/events/reward-events.json  → tla-voting/events/rewards/{YYYY}/{MM}.json
 *
 * Spec: docs/pending-changes/SPEC-tla-voting-capture-fix.md §6.
 * Storage law: TLA-CORE-STORAGE-DESIGN.md (EVENT products = monthly
 * {YYYY}/{MM}.json JSON arrays; stream subfolders = registered deviation).
 *
 * Month files are PLAIN JSON ARRAYS of event objects in original chain order
 * (compact, matching tla-flows/events/{YYYY}/{MM}.json). Container metadata
 * (contract, horizons, scan state, known_gaps) moves verbatim into
 * index.json's new `streams` section — heartbeat.json already carries the
 * live copies and is untouched here (the cron owns it).
 *
 * HARD VERIFICATION before any write (F3 — abort, never publish partial):
 *   1. every event has a parseable `timestamp` (the split key);
 *   2. re-concatenating the month files in chronological order reproduces
 *      the original events array BYTE-IDENTICALLY (JSON.stringify equality,
 *      element by element) — count identity and tx_hash-set identity are
 *      implied and also reported;
 *   3. Σ(month counts) === container `count` === events.length.
 *
 * Runs from the repo-root of an own-repo checkout (GitHub Action). All
 * transforms are on the local working tree; the WORKFLOW commits the result
 * (single atomic commit: new tree + updated index.json + monolith deletes).
 *
 * Env:
 *   DRY_RUN=1  — full read + split + verification + printed plan, zero writes.
 *
 * Node 18+ builtins only. Self-contained (placement map: one-off scripts in
 * tla-core/.github/scripts/<module>/ never depend on platform-crons).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || process.cwd();
const EVENTS_DIR = path.join(ROOT, 'tla-voting', 'events');
const DRY_RUN = process.env.DRY_RUN === '1';

// stream name → monolith filename. Stream names become the subfolder names.
const STREAMS = {
  votes:   'vote-events.json',
  locks:   'lock-events.json',
  bribes:  'bribe-events.json',
  rewards: 'reward-events.json',
};

const INDEX_PATH = path.join(EVENTS_DIR, 'index.json');

function die(msg) {
  console.error(`\n✖ ABORT: ${msg}`);
  console.error('Nothing was written. The working tree is unchanged.');
  process.exit(1);
}

function loadJson(p) {
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); }
  catch (e) { die(`cannot read ${p}: ${e.message}`); }
  try { return JSON.parse(raw); }
  catch (e) { die(`corrupt JSON at ${p}: ${e.message} (corrupt ≠ absent — refusing to continue)`); }
}

function monthKeyOf(ev, stream, i) {
  const ts = ev && ev.timestamp;
  if (typeof ts !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(ts)) {
    die(`${stream} event #${i} has no parseable timestamp (tx ${ev && ev.tx_hash}): ${JSON.stringify(ts)}`);
  }
  return { yyyy: ts.slice(0, 4), mm: ts.slice(5, 7) };
}

function main() {
  console.log(`tla-voting events restructure — root: ${ROOT}${DRY_RUN ? '  [DRY RUN]' : ''}`);

  // ── Guard: refuse to run twice ─────────────────────────────────────────
  for (const stream of Object.keys(STREAMS)) {
    if (fs.existsSync(path.join(EVENTS_DIR, stream))) {
      die(`stream folder events/${stream}/ already exists — restructure appears to have run. ` +
          'This script is one-shot; a second run against a restructured tree is a bug, not a retry.');
    }
  }

  const indexJson = loadJson(INDEX_PATH);

  const plan = {};       // stream → { yyyy → { mm → events[] } }
  const streamMeta = {}; // stream → container metadata (minus events)

  // ── Phase 1: read + split + verify (no writes at all) ──────────────────
  for (const [stream, filename] of Object.entries(STREAMS)) {
    const monoPath = path.join(EVENTS_DIR, filename);
    const mono = loadJson(monoPath);
    if (!Array.isArray(mono.events)) die(`${filename}: no events[] array`);
    const events = mono.events;

    if (typeof mono.count === 'number' && mono.count !== events.length) {
      die(`${filename}: container count ${mono.count} ≠ events.length ${events.length}`);
    }

    // split (stable — original relative order preserved within each month)
    const byMonth = {};
    for (let i = 0; i < events.length; i++) {
      const { yyyy, mm } = monthKeyOf(events[i], stream, i);
      ((byMonth[yyyy] ||= {})[mm] ||= []).push(events[i]);
    }

    // reassemble chronologically and demand byte-identity with the original
    const reassembled = [];
    for (const yyyy of Object.keys(byMonth).sort()) {
      for (const mm of Object.keys(byMonth[yyyy]).sort()) {
        reassembled.push(...byMonth[yyyy][mm]);
      }
    }
    if (reassembled.length !== events.length) {
      die(`${stream}: reassembled count ${reassembled.length} ≠ original ${events.length}`);
    }
    for (let i = 0; i < events.length; i++) {
      if (JSON.stringify(reassembled[i]) !== JSON.stringify(events[i])) {
        die(`${stream}: identity check failed at position ${i} — the original stream is not ` +
            `month-monotonic (event tx ${events[i].tx_hash} out of chronological month order). ` +
            'The split would reorder events; investigate before restructuring.');
      }
    }

    // tx_hash multiset identity (implied by the above; reported for the record)
    const hashCount = new Map();
    for (const e of events) hashCount.set(e.tx_hash, (hashCount.get(e.tx_hash) || 0) + 1);

    // container metadata → carried into index.json verbatim (defensive: single
    // source going forward is heartbeat/index, so nothing may be dropped here)
    const meta = {};
    for (const k of Object.keys(mono)) if (k !== 'events') meta[k] = mono[k];

    plan[stream] = byMonth;
    streamMeta[stream] = meta;

    const months = Object.keys(byMonth).sort()
      .flatMap(y => Object.keys(byMonth[y]).sort().map(m => `${y}/${m}`));
    console.log(`  ✓ ${stream.padEnd(7)} ${String(events.length).padStart(6)} events → ` +
      `${months.length} month files (${months[0]} … ${months[months.length - 1]}), ` +
      `${hashCount.size} distinct tx hashes — identity verified`);
  }

  // ── Phase 2: build the new index.json (schemaVersion 4) ────────────────
  const newIndex = {
    module: 'tla-voting',
    product: 'events',
    schemaVersion: 4,
    updatedAt: new Date().toISOString(),
    spec: 'docs/pending-changes/SPEC-tla-voting.md',
    restructure_spec: 'docs/pending-changes/SPEC-tla-voting-capture-fix.md',
    layout: 'per-stream monthly partitions: events/{stream}/{YYYY}/{MM}.json (plain JSON arrays, chain order)',
    streams: {},
  };
  for (const stream of Object.keys(STREAMS)) {
    const byMonth = plan[stream];
    const monthsPresent = {};
    let total = 0;
    for (const yyyy of Object.keys(byMonth).sort()) {
      monthsPresent[yyyy] = Object.keys(byMonth[yyyy]).sort();
      for (const mm of monthsPresent[yyyy]) total += byMonth[yyyy][mm].length;
    }
    const meta = streamMeta[stream];
    newIndex.streams[stream] = {
      dir: `events/${stream}/`,
      count: total,
      months_present: monthsPresent,
      // container metadata carried verbatim (heartbeat holds the live copies)
      ...meta,
    };
    // container `count` is superseded by the recomputed total above
    delete newIndex.streams[stream].count_container;
    if (typeof meta.count === 'number') newIndex.streams[stream].count = total;
  }
  // preserve the non-stream entries the old index tracked
  const oldFiles = indexJson.files || {};
  newIndex.files = {};
  for (const k of ['rollups.json', 'cursor.json', 'heartbeat.json', 'reconciliation.json']) {
    if (oldFiles[k]) newIndex.files[k] = oldFiles[k];
    else if (fs.existsSync(path.join(EVENTS_DIR, k))) newIndex.files[k] = {};
  }
  newIndex.note_gaps = indexJson.note_gaps ||
    'public-node prune gaps recorded per stream (index.streams[*].known_gaps + heartbeat) — archive-node targets';

  // ── Phase 3: write / delete (skipped on DRY_RUN) ────────────────────────
  if (DRY_RUN) {
    console.log('\n[DRY RUN] verification passed for all four streams. Planned writes:');
    for (const stream of Object.keys(plan)) {
      for (const yyyy of Object.keys(plan[stream]).sort()) {
        for (const mm of Object.keys(plan[stream][yyyy]).sort()) {
          console.log(`  + events/${stream}/${yyyy}/${mm}.json  (${plan[stream][yyyy][mm].length} events)`);
        }
      }
    }
    console.log(`  ~ events/index.json  (schemaVersion 4)`);
    for (const f of Object.values(STREAMS)) console.log(`  - events/${f}  (delete)`);
    console.log('\nDry run complete — nothing written.');
    return;
  }

  let filesWritten = 0;
  for (const stream of Object.keys(plan)) {
    for (const yyyy of Object.keys(plan[stream]).sort()) {
      const dir = path.join(EVENTS_DIR, stream, yyyy);
      fs.mkdirSync(dir, { recursive: true });
      for (const mm of Object.keys(plan[stream][yyyy]).sort()) {
        fs.writeFileSync(path.join(dir, `${mm}.json`), JSON.stringify(plan[stream][yyyy][mm]));
        filesWritten++;
      }
    }
  }
  fs.writeFileSync(INDEX_PATH, JSON.stringify(newIndex, null, 2) + '\n');
  for (const f of Object.values(STREAMS)) fs.unlinkSync(path.join(EVENTS_DIR, f));

  console.log(`\n✓ Restructure complete: ${filesWritten} month files written, index.json → schemaVersion 4, ` +
    `4 monoliths deleted. The workflow commits this tree atomically.`);
}

main();

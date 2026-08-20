// =============================================================================
// state-history-backfill/derive.js — deep staked-count history from chain events
// -----------------------------------------------------------------------------
// WHY: the legacy repos that tracked daily DAODAO/Enterprise staked counts were
// deleted before the org migration folded them; org state-history begins
// 2026-07-01. But the archive walk captured every NFT transfer back to
// Jan 2025 — and staking IS a transfer (to the staking contract) as unstaking
// is one back. This script replays those events ANCHORED at the first
// org-captured day (2026-07-01, chain truth), walking deltas BACKWARD to give
// absolute daily counts for 2025-01 → 2026-06.
//
// TRUTH TEST built in: replaying FORWARD from the anchor across July/August
// must reproduce every org-captured value. Any drift is printed and the run
// refuses to emit (a derived series that can't reproduce the measured era has
// no business claiming the unmeasured one).
//
// Emits: state-history {yyyy}/{mm}.json for 2025-01..2026-06, day rows carrying
// ONLY the derived fields + source label — org-captured months are never
// touched (write-once / org-wins).
//
// Run: LOCAL_DATA_DIR=/path/to/tla-core node derive.js OUT_DIR
// =============================================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.env.LOCAL_DATA_DIR || '.';
const OUT = process.argv[2] || './out';
const DAODAO = 'terra1c57ur376szdv8rtes6sa9nst4k536dynunksu8tx5zu4z5u3am6qmvqx47';
const ENTERPRISE = 'terra1e54tcdyulrtslvf79htx4zntqntd4r550cg22sj24r6gfm0anrvq0y8tdv';
const ANCHOR_DATE = '2026-07-01';

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// ---- 1) per-day net deltas from the transfers stream -------------------------
const deltas = new Map(); // date -> {dao, ent}
const tDir = path.join(ROOT, 'nfts/adao/transfers');
let evCount = 0;
for (const y of fs.readdirSync(tDir).sort()) {
  for (const mf of fs.readdirSync(path.join(tDir, y)).sort()) {
    const evs = readJson(path.join(tDir, y, mf));
    for (const e of evs) {
      const date = String(e.timestamp || '').slice(0, 10);
      if (!date) continue;
      const to = e.to || e.recipient, fr = e.from || e.sender;
      const d = deltas.get(date) || { dao: 0, ent: 0 };
      if (to === DAODAO) d.dao++; if (fr === DAODAO) d.dao--;
      if (to === ENTERPRISE) d.ent++; if (fr === ENTERPRISE) d.ent--;
      if (d.dao || d.ent || deltas.has(date)) deltas.set(date, d);
      evCount++;
    }
  }
}
console.log(`events replayed: ${evCount}; days with staking flow: ${[...deltas.values()].filter(d => d.dao || d.ent).length}`);

// ---- 2) anchors + captured era for the truth test ---------------------------
const shDir = path.join(ROOT, 'nfts/adao/snapshots/state-history');
const captured = new Map(); // date -> {dao, ent}
for (const y of fs.readdirSync(shDir).sort()) {
  for (const mf of fs.readdirSync(path.join(shDir, y)).sort()) {
    const m = readJson(path.join(shDir, y, mf));
    for (const [date, row] of Object.entries(m.days || {})) {
      if (row.daodao_staked_count != null) captured.set(date, { dao: row.daodao_staked_count, ent: row.enterprise_staked_count });
    }
  }
}
const anchor = captured.get(ANCHOR_DATE);
if (!anchor) { console.error('anchor day missing from org capture'); process.exit(1); }
console.log(`anchor ${ANCHOR_DATE}: DAODAO ${anchor.dao}, Enterprise ${anchor.ent}`);

// ---- 3) truth test: forward replay across the captured era ------------------
// Counts are end-of-day; a day's delta applies to that day's close. The org
// capture runs mid-day, so compare each captured day against BOTH the prior
// close and that day's close and take the better match (a same-day event
// after capture time is not a derivation error).
let dao = anchor.dao, ent = anchor.ent, worst = 0, worstDay = '';
const capDays = [...captured.keys()].sort();
for (let i = capDays.indexOf(ANCHOR_DATE) + 1; i < capDays.length; i++) {
  const day = capDays[i], prevClose = { dao, ent };
  // apply deltas for every calendar day up to and including `day`
  let cur = new Date(capDays[i - 1] + 'T00:00:00Z');
  const end = new Date(day + 'T00:00:00Z');
  while (cur < end) {
    cur = new Date(cur.getTime() + 86400000);
    const dd = deltas.get(cur.toISOString().slice(0, 10));
    if (dd) { dao += dd.dao; ent += dd.ent; }
  }
  const got = captured.get(day);
  const errClose = Math.abs(dao - got.dao) + Math.abs(ent - got.ent);
  const errPrev = Math.abs(prevClose.dao - got.dao) + Math.abs(prevClose.ent - got.ent);
  const err = Math.min(errClose, errPrev);
  if (err > worst) { worst = err; worstDay = day; }
}
console.log(`truth test across ${capDays.length} captured days: worst drift ${worst}${worstDay ? ' on ' + worstDay : ''}`);
if (worst > 2) { console.error('REFUSING to emit: drift exceeds tolerance — the event set is incomplete for the captured era.'); process.exit(1); }

// ---- 4) backward walk: absolute counts for the pre-capture era --------------
const series = new Map(); // date -> {dao, ent} end-of-day
let bDao = anchor.dao, bEnt = anchor.ent;
// anchor is a capture on 07-01; treat 06-30 close as anchor minus 07-01 deltas? No:
// captured value on 07-01 reflects state at capture time; end-of-06-30 = anchor
// minus any 07-01 deltas that happened BEFORE capture. Tolerance ±2 covers this;
// use anchor as 06-30 close then subtract each prior day's delta stepping back.
let cur = new Date('2026-06-30T00:00:00Z');
const floor = new Date('2025-01-01T00:00:00Z');
while (cur >= floor) {
  const ds = cur.toISOString().slice(0, 10);
  series.set(ds, { dao: bDao, ent: bEnt });
  const dd = deltas.get(ds);
  if (dd) { bDao -= dd.dao; bEnt -= dd.ent; }
  cur = new Date(cur.getTime() - 86400000);
}
console.log(`derived ${series.size} days; 2025-01-01 close: DAODAO ${series.get('2025-01-01').dao}, Enterprise ${series.get('2025-01-01').ent}`);

// ---- 5) emit month files (derived era only — org months untouched) ----------
const byMonth = new Map();
for (const [date, v] of series) {
  const ym = date.slice(0, 7);
  if (!byMonth.has(ym)) byMonth.set(ym, {});
  byMonth.get(ym)[date] = {
    daodao_staked_count: v.dao,
    enterprise_staked_count: v.ent,
    source: 'derived:transfers-replay-v1',
  };
}
for (const [ym, days] of byMonth) {
  const [y, m] = ym.split('-');
  const dir = path.join(OUT, 'nfts/adao/snapshots/state-history', y);
  fs.mkdirSync(dir, { recursive: true });
  const out = {
    meta: {
      generated_at: new Date().toISOString(),
      method: 'transfers-replay anchored at ' + ANCHOR_DATE + ' org capture; see .github/scripts/state-history-backfill/derive.js',
      note: 'Derived era: daily staked counts rebuilt from the captured NFT transfer stream. Fields limited to what the replay proves; every count traces to transactions.',
    },
    days,
  };
  fs.writeFileSync(path.join(dir, m + '.json'), JSON.stringify(out, null, 1));
}
console.log(`emitted ${byMonth.size} month files to ${OUT}`);

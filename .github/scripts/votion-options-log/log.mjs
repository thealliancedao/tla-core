#!/usr/bin/env node
// votion-options-log — a dated record of one thing: a pool that HAS A BRIBE for the round and is, or is not, among the voting
// options in Votion's published plan. Each time that changes for a pool it is written down, with the two hourly captures it
// happened between. Source: votion/optimization/current.json (Votion's own optimizer answer, saved hourly by the votion cron).
// No node is asked; nothing is inferred — the file says what the published answer listed, never why.
//   offered      the pool is in `votingOptions` of at least one vault page for that bucket
//   not offered  the pool is in `bribes` (it has a pot) and in no page's `votingOptions`
// Env: CUR (the capture now) · PREV (optional: the capture before — gives the "after" time) · OUT (default votion/options-log.json)
import fs from 'fs';
export const VERSION = 'votion-options-log-1.0.0';
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
export function stateOf(doc) {   // { 'bucket|pool id': 'offered' | 'not offered' } for every pool with a pot, and the round
  const bribed = new Set(), offered = new Set(); let round = null;
  for (const v of Object.values((doc && doc.vaults) || {})) { if (v && v.period != null && round == null) round = Number(v.period) || null;
    for (const op of (v && v.optimizations) || []) { const gauge = ((op.bribes || [])[0] || {}).gauge || op.gauge || null;
      for (const b of op.bribes || []) { const id = b.asset && (b.asset.cw20 || b.asset.native); if (id && b.gauge) bribed.add(b.gauge + '|' + id); }
      if (gauge) for (const o of op.votingOptions || []) if (o && o.id) offered.add(gauge + '|' + o.id); } }
  const st = {}; for (const k of [...bribed].sort()) st[k] = offered.has(k) ? 'offered' : 'not offered';
  return { state: st, round, at: (doc && doc.capturedAt) || null };
}
export function step(log, cur, prev) {   // → the log with any change appended; `changed` says whether to write
  const now = stateOf(cur), before = prev ? stateOf(prev) : null; const old = (log && log.state) || (before && before.state) || null; const changes = (log && log.changes) ? log.changes.slice() : []; let changed = !log;
  for (const [k, v] of Object.entries(now.state)) { const was = old ? old[k] : undefined;
    if (was === v) continue; if (was === undefined && (v === 'offered' || !old)) continue;   // a new pot that is offered is the ordinary case; the first run records no history it did not see
    const [bucket, pool] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
    changes.push({ bucket, pool, from: was === undefined ? null : was, to: v, after: before ? before.at : (log && log.state_at) || null, by: now.at, round: now.round }); changed = true; }
  if (old && JSON.stringify(Object.keys(old).sort()) !== JSON.stringify(Object.keys(now.state).sort())) changed = true;   // a pot appeared or ran out: keep the state current
  return { changed, doc: { schemaVersion: 1, product: 'votion/options-log', builder: VERSION,
    note: 'When a pool that has a bribe stopped being, or began to be, among the voting options of Votion\'s published plan. Read from the hourly captures of that plan; "after" and "by" are the two captures a change happened between. The file says what was listed, not why. Rewritten only when something changes.',
    state_at: now.at, round: now.round, state: now.state, changes: changes.slice(-300) } };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const OUT = process.env.OUT || 'votion/options-log.json'; if (!process.env.CUR) { console.error('CUR required'); process.exit(1); }
  const cur = J(process.env.CUR); let prev = null, log = null; try { if (process.env.PREV) prev = J(process.env.PREV); } catch { } try { log = J(OUT); } catch { }
  if (!cur || !cur.vaults || !cur.capturedAt) { console.error('NOT WRITTEN — the capture has no vault pages'); process.exit(1); }
  if (log && log.state_at && Date.parse(cur.capturedAt) <= Date.parse(log.state_at)) { console.log('this capture is not newer than the log — nothing to do'); process.exit(0); }
  const r = step(log, cur, prev); const n = r.doc.changes.length - ((log && log.changes) || []).length;
  console.log(`${VERSION} · capture ${cur.capturedAt} · round ${r.doc.round} · pools with a bribe ${Object.keys(r.doc.state).length} · not offered ${Object.values(r.doc.state).filter((v) => v === 'not offered').length} · new changes ${n}`);
  if (!r.changed) { console.log('nothing changed — file left alone'); process.exit(0); }
  fs.writeFileSync(OUT, JSON.stringify(r.doc, null, 1) + '\n'); console.log('written: ' + OUT);
}

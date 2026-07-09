#!/usr/bin/env node
// rebuild-index — one-off repair: reconstruct tla-flows/events/index.json from
// the month files themselves (ground truth), after the 2026-07-09 walker
// Rev C incident rebuilt it from empty on a CDN 429 (fixed in walker 2.1.0).
// Runs on repo checkout: reads months from the working tree, publishes via API.
'use strict';
const fs = require('fs'), path = require('path'), https = require('https');
const ROOT = process.cwd(), DIR = 'tla-flows/events';
const REPO = process.env.GITHUB_REPO || 'thealliancedao/tla-core', BR = 'main', TOK = process.env.GITHUB_TOKEN;
const months = [];
for (const y of fs.readdirSync(path.join(ROOT, DIR)).filter(d => /^\d{4}$/.test(d)).sort())
  for (const f of fs.readdirSync(path.join(ROOT, DIR, y)).filter(f => /^\d{2}\.json$/.test(f)).sort())
    months.push(`${y}/${f.replace('.json','')}`);
const by_type = {}, mp = {}; let total = 0, first = null, latest = null, hmax = 0;
for (const mk of months) {
  const arr = JSON.parse(fs.readFileSync(path.join(ROOT, DIR, mk + '.json'), 'utf8'));
  const hashes = new Set(arr.map(r => r.txhash));
  if (hashes.size !== arr.length) { console.error(`DUPES in ${mk}!`); process.exit(1); }
  total += arr.length;
  for (const r of arr) { by_type[r.type] = (by_type[r.type]||0)+1;
    const d = r.timestamp.slice(0,10); if (!first || d < first) first = d; if (!latest || d > latest) latest = d;
    if (r.height > hmax) hmax = r.height; }
  const [Y,M] = mk.split('/'); (mp[Y] ||= []).includes(M) || mp[Y].push(M); mp[Y].sort();
  console.log(`${mk}: ${arr.length}`);
}
// state of the gap harvest decides the gap entry's right edge
let gapTo = null, gapToNote = 'until the retained-window harvest completes (then: its floor); full close requires archive node (Batch 5)';
try { const st = JSON.parse(fs.readFileSync(path.join(ROOT, DIR, 'gapfill-state.json'), 'utf8'));
  if (st.done) { gapTo = st.target_from - 1; gapToNote = `CLOSED to public-node retention: retained blocks begin at ${st.target_from}; remaining span requires archive node (Batch 5)`; } } catch {}
const idx = { schemaVersion: 2, product: 'tla-flows/events', total_events: total, by_type, months_present: mp,
  known_gaps: [{ key: 'fcd-freeze-to-forward-capture', from_height: 13737811, from_date_approx: '2025-01-07',
    to_height: gapTo, to_note: gapToNote, recorded_at: new Date().toISOString(),
    reason: 'FCD frozen archive ends at the freeze; public-node tx index pruned — span recoverable only from archive nodes' }],
  first_date: first, latest_date: latest, latest_height: hmax,
  rebuilt: { at: new Date().toISOString(), reason: 'index metadata clobbered 2026-07-09 (walker Rev C CDN-429 bug, fixed in 2.1.0); reconstructed from month files' },
  updatedAt: new Date().toISOString() };
console.log(`TOTAL ${total} · first ${first} · latest ${latest}`);
function gh(m, p, b){ return new Promise((res, rej) => { const o={hostname:'api.github.com',path:p,method:m,headers:{'User-Agent':'rebuild-index','Authorization':`Bearer ${TOK}`,'Accept':'application/vnd.github+json'}}; if(b)o.headers['Content-Type']='application/json'; const r=https.request(o,x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>{ if(x.statusCode>=200&&x.statusCode<300){try{res(JSON.parse(d));}catch{res(d);}} else rej(new Error(`${x.statusCode} ${d.slice(0,120)}`)); });}); r.on('error',rej); if(b)r.write(JSON.stringify(b)); r.end(); }); }
(async()=>{ let sha=null; try{ sha=(await gh('GET',`/repos/${REPO}/contents/${DIR}/index.json?ref=${BR}`)).sha; }catch{}
  const body={message:`rebuild index from month files: ${total} events, gap entry restored`,content:Buffer.from(JSON.stringify(idx,null,2)+'\n').toString('base64'),branch:BR}; if(sha)body.sha=sha;
  await gh('PUT',`/repos/${REPO}/contents/${DIR}/index.json`,body);
  console.log('✅ index rebuilt and published'); })().catch(e=>{console.error('FATAL',e.message);process.exit(1);});

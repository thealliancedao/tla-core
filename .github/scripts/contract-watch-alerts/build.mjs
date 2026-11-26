#!/usr/bin/env node
// contract-watch-alerts — which changes on record "need a look", as one small public file: contract-watch/alerts.json.
//
// WHY THIS RUNS THE PAGE. The rule for "needs a look" lives in one place: the Contract Watch page (aDAO-links-site
// contract-watch.html — to_key · new_route · vote · unexplained, each reason a sentence that can be checked). The record is
// about 7 MB over many files, far too much for the home page to load to light one tab. So this script loads the page itself in
// jsdom against the record in this checkout and writes down what the page marks. There is no second copy of the rule to drift.
//
// Reads: this checkout (contract-watch/**, docs/curated/contract-watch.json) and, over the network, the public governance
// captures the page reads (dao-originations). GET requests to raw.githubusercontent.com only. No chain node, no archive node.
// Writes: contract-watch/alerts.json — only when the list itself changed (a quiet run leaves the file alone).
// Refuses to write when the page could not read the record, or a governance capture did not load (the "vote" reason needs it).
//
// Env: CORE_DIR (a tla-core checkout, default cwd) · SITE_DIR (an aDAO-links-site checkout holding contract-watch.html)
//      OUT (default CORE_DIR/contract-watch/alerts.json) · DAOO_DIR (optional: a dao-originations checkout instead of the network)
//      NOW (optional ISO time, for tests)
import { JSDOM } from 'jsdom'; import fs from 'fs'; import path from 'path';
const VERSION = 'contract-watch-alerts-1.0.0';
const CORE = path.resolve(process.env.CORE_DIR || '.'), SITE = process.env.SITE_DIR, DAOO = process.env.DAOO_DIR || null;
const OUT = process.env.OUT || path.join(CORE, 'contract-watch/alerts.json');
if (Object.keys(process.env).some((k) => /^ARCHIVE_/.test(k))) { console.error('refusing to run with an ARCHIVE_* setting present: this job reads public files only'); process.exit(1); }
if (!SITE || !fs.existsSync(path.join(SITE, 'contract-watch.html'))) { console.error('SITE_DIR must hold contract-watch.html'); process.exit(1); }
const html = fs.readFileSync(path.join(SITE, 'contract-watch.html'), 'utf8');
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8')); const asked = { local: 0, net: 0, missing: [] };
const ok = (data) => ({ ok: true, status: 200, json: async () => data }), no = (status = 404) => ({ ok: false, status });
async function net(url) { asked.net++; for (let i = 0; i < 3; i++) { try { const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': VERSION } }); if (r.ok) return ok(await r.json()); if (r.status === 404) return no(404); } catch { } await new Promise((r) => setTimeout(r, 1500 * (i + 1))); } return no(503); }
async function pageFetch(u) {
  const url = String(u).split('?')[0]; let m;
  if ((m = url.match(/raw\.githubusercontent\.com\/thealliancedao\/tla-core\/main\/(.+)$/))) { const f = path.join(CORE, m[1]); asked.local++; if (fs.existsSync(f)) return ok(J(f)); asked.missing.push(m[1]); return no(404); }
  if ((m = url.match(/raw\.githubusercontent\.com\/thealliancedao\/dao-originations\/main\/(.+)$/))) { if (DAOO) { const f = path.join(DAOO, m[1]); return fs.existsSync(f) ? ok(J(f)) : no(404); } return net(url); }
  return no(404);   // anything else (a chain node for the page's "read it live" button) is not asked here
}
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, '').replace(/<link[^>]*>/g, ''), { url: 'https://theadao.com/contract-watch.html', runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(w) {
  w.SiteHeader = { mount() { }, subnav() { }, tlaTabs() { return []; } }; w.SiteFooter = { mount() { } };
  w.fetch = pageFetch; w.Element.prototype.scrollIntoView = function () { }; w.__errors = []; w.addEventListener('error', (e) => w.__errors.push(String(e.message)));
  if (process.env.NOW) { const t = Date.parse(process.env.NOW); w.Date.now = () => t; } } });
const w = dom.window; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the page fills in after its first paint (votes, the archive's state history, key counts): wait until it is ready, nothing is still loading and the list has stopped moving
let last = null, stable = 0, cw = null;
for (let i = 0; i < 240 && stable < 6; i++) { await sleep(250); cw = w.__cw; if (!cw || !cw.S || !cw.S.ready || typeof cw.alertsData !== 'function') continue;
  if ([...cw.S.props.values()].some((p) => p.status === 'loading')) { stable = 0; continue; }
  const now = JSON.stringify(cw.alertsData()); if (now === last) stable++; else { stable = 0; last = now; } }
const fail = (msg) => { console.error('NOT WRITTEN — ' + msg); process.exit(1); };
if (!cw || !cw.S) fail('the page did not start' + (w.__errors.length ? ': ' + w.__errors[0] : ''));
if (typeof cw.alertsData !== 'function') fail('this page build has no alertsData() (needs contract-watch.html 1.4.2 or later)');
if (cw.S.loadFailed || !cw.S.ready) fail('the page could not read the record');
if (stable < 6) fail('the list did not settle');
if (w.__errors.length) fail('the page reported an error: ' + w.__errors[0]);
const props = [...cw.S.props.entries()].map(([k, p]) => [k, p.status]); const bad = props.filter(([, s]) => s !== 'ok');
if (bad.length) fail('a governance capture did not load (' + bad.map(([k, s]) => k + ' ' + s).join(', ') + ') — the "vote" reason cannot be judged without it');
const list = cw.alertsData(); if (!Array.isArray(list)) fail('no list');
const all = cw.S.recs.filter((r) => r._how !== 'routine' && r.contract && cw.S.lib.byAddr.has(r.contract));
const idx = J(path.join(CORE, 'contract-watch/index.json'));
const body = {
  needs_look: list,
  codes: [...new Set(list.flatMap((x) => { const r = cw.S.recs.find((y) => y.k === x.k); return r ? cw.attention(r).why.map((v) => v.code) : []; }))].sort(),
};
const doc = { schemaVersion: 1, product: 'contract-watch/alerts', builder: VERSION,
  note: 'Every change on record that the Contract Watch page marks "needs a look", newest first. Built by loading that page against the record, so the rule is the page\'s own (to_key · new_route · vote · unexplained — see the page: "What needs a look means"). The mark is not a verdict. This file is rewritten only when the list changes; a reader applies its own time window (the page and the home tab use 30 days).',
  page_rev: cw.REV, built_at: new Date().toISOString(), record_updated_at: idx.updated_at || null, changes_on_record: all.length, count: list.length, ...body };
let old = null; try { old = J(OUT); } catch { }
const same = old && JSON.stringify({ n: old.needs_look, c: old.codes, r: old.page_rev }) === JSON.stringify({ n: body.needs_look, c: body.codes, r: doc.page_rev });
console.log(`${VERSION} · page ${cw.REV} · ${all.length} changes on record · ${list.length} need a look · record files read ${asked.local} · governance captures ${props.length} (network requests ${asked.net})`);
for (const x of list) console.log(`  ${x.at.slice(0, 16).replace('T', ' ')} UTC · ${x.title} · ${x.on} · ${x.how} · ${x.why.join(' · ')}`);
if (same) { console.log('the list is unchanged — file left alone'); process.exit(0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n'); console.log('written: ' + path.relative(CORE, OUT));
process.exit(0);

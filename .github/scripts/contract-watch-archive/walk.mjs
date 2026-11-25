#!/usr/bin/env node
// contract-watch-archive 1.0.0 (2026-11-25) — THE ONE-TIME BACKFILL of the contract-watch record from an archive node.
//
// Why: the contract-watch stream is complete from the day it shipped (2026-11-25). Before that it holds what earlier walks
// happened to keep — the contracts of the capture registry, to 2026-06-16 — and nothing for the months after, nor for the
// contracts those walks did not follow. An archive node still holds every transaction, and state back to 2023-10. This
// reads, once, what the stream lacks; from then on the forward capture is all that is needed.
//
// THE ARCHIVE NODE IS A COURTESY. This script runs only when a person starts it (the workflow has one trigger: Run
// workflow). It asks one request at a time, never faster than RPS a second (ceiling 4), stops at a request budget and a
// time budget, backs off when the node is busy, stops by itself when the node stops answering, and never asks again for
// something the node has refused. Everything it has read is filed before it stops; the next run carries on where it stopped.
//
// What it reads (phase `changes`) — the smallest set of searches that finds every change:
//   per watched contract   migrate / update_contract_admin events (wasmd's own; complete, and few)
//   quiet contracts        every execute, when the contract has at most ALL_CAP of them (also lists every action it reports)
//   busy contracts         the change actions the record already knows, by name; everything a watched DAO's core sent;
//                          what the accounts that hold (or held) a role or an admin key sent TO THAT CONTRACT — never
//                          an account's whole history
//   the whole chain        every migrate and every admin change, of any contract (the forward walk keeps those for all)
// A search is asked WITHOUT a block range (a range makes an older node scan every transaction of the range; a plain search
// is one index lookup) and read page by page in block order, so a run that stops carries on at the next page. A page too
// heavy to answer in time is asked again for fewer transactions at once. A block range is used only when one is typed in.
// Each transaction goes through the SAME classifier the forward walk uses (platform-crons tla-flows/lib/admin-classifier.js)
// and gets the message as sent from its own bytes (lib/tx-messages.js — the body's messages only, never the memo).
//
// What it reads (phase `state`) — what a contract WAS, at the block before and the block of each change:
//   the address book (role → address) around every change of the global config;
//   each watched contract's own code history, its admin when it was created, its admin and code id now;
//   {"config":{}} of the contract around every change on record, kept when the two differ.
//
// What it proves (phase `verify`, no node reads): every migration in a contract's own code history has a record; each
// contract's admin today is what its creation plus the admin changes on record give; the address book of one change is the
// starting point of the next; every change that was already on record was found again.
//
// Output (tla-core, public): contract-watch/events/<YYYY>/<MM>.json (merged), index.json (months + `archive`),
//   contract-watch/archive/{manifest,census,report,block-times}.json, contract-watch/state/history/{address-book,contracts,config-changes}.json
// Output (private archive, when present): contract-watch/raw/part-*.jsonl.gz — every transaction read, events + messages, no memo.
// The log prints counts only; the node's address is never printed.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { execSync } from 'child_process'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
export const VERSION = 'contract-watch-archive-1.0.0';
const UA = 'contract-watch-archive/1.0';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v, lo, hi, d) => { const n = Number(v); return v !== undefined && v !== null && v !== '' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const ACCT = /^terra1[0-9a-z]{38}$/, CONTRACT = /^terra1[0-9a-z]{58}$/;
const monthKey = (ts) => `${String(ts).slice(0, 4)}/${String(ts).slice(5, 7)}`;
const readJsonAt = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const writeAt = (p, text) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };

// ── protobuf, the little that the three state queries need ─────────────────────────────────────────────────────────────
const varint = (n) => { n = BigInt(n); const b = []; while (n > 127n) { b.push(Number(n & 127n) | 128); n >>= 7n; } b.push(Number(n)); return Buffer.from(b); };
const fBytes = (no, buf) => Buffer.concat([varint((no << 3) | 2), varint(buf.length), buf]);
const fStr = (no, s) => fBytes(no, Buffer.from(String(s), 'utf8'));

// ── events as the classifier wants them: plain text. A node on an old binary answers with base64 keys and values. ─────
const b64d = (s) => { try { const t = String(s), b = Buffer.from(t, 'base64'); return b.length && b.toString('base64').replace(/=+$/, '') === t.replace(/=+$/, '') ? b.toString('utf8') : null; } catch { return null; } };
export function normEvents(evs) {
  evs = Array.isArray(evs) ? evs : [];
  const keys = evs.filter((e) => e && e.type === 'message').flatMap((e) => (e.attributes || []).map((a) => a && a.key));
  const known = (k) => k === 'action' || k === 'sender' || k === 'module';
  const coded = !keys.some(known) && keys.some((k) => known(b64d(k)));
  return evs.map((e) => ({ type: e.type, attributes: (e.attributes || []).map((a) => (coded ? { key: b64d(a.key) ?? a.key, value: a.value == null ? a.value : (b64d(a.value) ?? a.value) } : { key: a.key, value: a.value })) }));
}

// ── merge: the archive's reading of a transaction replaces what was on file for that transaction, never loses a record ─
// The key of a record is its place among the records of its transaction, so a fuller reading of the same transaction
// (more watched contracts, real events where an earlier source had rebuilt ones) cannot be merged key by key.
const sig = (r) => `${r.kind}|${r.contract}|${r.action}`;
const core = (r) => JSON.stringify([r.kind, r.contract, r.action, r.signer, r.height, r.via || null, r.routine || false]);
function covers(big, small) { const m = new Map(); for (const s of big) m.set(s, (m.get(s) || 0) + 1); for (const s of small) { const n = m.get(s) || 0; if (!n) return false; m.set(s, n - 1); } return true; }
export function mergeByTx(existing, incoming) {
  const inc = new Map(); for (const r of incoming) { if (!inc.has(r.txhash)) inc.set(r.txhash, []); inc.get(r.txhash).push(r); }
  const old = new Map(); for (const r of existing) if (r.txhash && inc.has(r.txhash)) { if (!old.has(r.txhash)) old.set(r.txhash, []); old.get(r.txhash).push(r); }
  const out = existing.filter((r) => !r.txhash || !inc.has(r.txhash));
  const st = { added: 0, confirmed: 0, refined: 0, kept_as_filed: 0, differs: [], changed: false };
  for (const [h, recs] of inc) {
    const was = old.get(h) || [];
    if (!was.length) { out.push(...recs); st.added += recs.length; st.changed = true; continue; }
    const a = was.map(sig), b = recs.map(sig);
    if (!covers(b, a)) { out.push(...was); st.kept_as_filed += was.length; st.differs.push({ txhash: h, on_file: a, from_archive: b }); continue; }   // the archive reads LESS than was filed: keep what was filed, and say so
    out.push(...recs); st.added += recs.length - was.length;
    const have = new Map(); for (const r of was) { const k = core(r); have.set(k, (have.get(k) || 0) + 1); }
    for (const r of recs) { const k = core(r); if (have.get(k)) { have.set(k, have.get(k) - 1); st.confirmed++; } else if (covers(a, [sig(r)])) st.refined++; }
    if (JSON.stringify(was) !== JSON.stringify(recs)) st.changed = true;
  }
  out.sort((x, y) => (x.height - y.height) || String(x.k).localeCompare(String(y.k)));
  return { merged: out, ...st };
}

// ── a JSON value flattened to paths, for "what was → what is" ──────────────────────────────────────────────────────────
export function flat(v, pre = '', out = {}) {
  if (v !== null && typeof v === 'object') { const ks = Array.isArray(v) ? v.map((_, i) => i) : Object.keys(v).sort(); if (!ks.length) out[pre || '.'] = Array.isArray(v) ? '[]' : '{}'; for (const k of ks) flat(v[k], pre ? `${pre}.${k}` : String(k), out); }
  else out[pre || '.'] = v;
  return out;
}
export function diffJson(a, b, max = 40) {
  const A = flat(a), B = flat(b), out = []; const clip = (x) => { const s = typeof x === 'string' ? x : JSON.stringify(x); return s === undefined ? null : (s.length > 300 ? s.slice(0, 300) + '…' : s); };
  for (const k of [...new Set([...Object.keys(A), ...Object.keys(B)])].sort()) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) out.push({ path: k, before: k in A ? clip(A[k]) : null, after: k in B ? clip(B[k]) : null });
  return { changed: out.length, diff: out.slice(0, max) };
}

export async function run(opts = {}) {
  const env = opts.env || process.env, log = opts.log || ((s) => console.log(s));
  const cfg = {
    rpc: String(opts.rpc || env.ARCHIVE_RPC || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/+$/, ''),
    core: path.resolve(opts.core || env.CORE_DIR || '.'), pc: path.resolve(opts.pc || env.PC_DIR || 'platform-crons'),
    priv: (opts.priv || env.ARCHIVE_DIR) ? path.resolve(opts.priv || env.ARCHIVE_DIR) : null,
    phase: String(opts.phase || env.PHASE || 'all'),
    rps: opts._unpaced ? 1e6 : num(env.RPS, 0.2, 4, 2), maxRequests: num(opts.maxRequests ?? env.MAX_REQUESTS, 1, 20000, 8000), maxMinutes: num(opts.maxMinutes ?? env.MAX_MINUTES, 1, 300, 180),
    allCap: num(opts.allCap ?? env.ALL_CAP, 0, 20000, 1500), pageCap: num(opts.pageCap ?? env.PAGE_CAP, 100, 50000, 20000),
    actionCap: num(opts.actionCap ?? env.ACTION_CAP, 0, 20000, 3000), chainCap: num(opts.chainCap ?? env.CHAIN_CAP, 0, 50000, 3000),
    from: num(opts.from ?? env.FROM_HEIGHT, 1, 1e12, null), to: num(opts.to ?? env.TO_HEIGHT, 1, 1e12, null), fresh: !!(opts.fresh || env.FRESH === '1'),
    noPush: !!(opts.noPush || env.NO_PUSH), timeoutMs: opts.timeoutMs || 90000, backoffMs: opts.backoffMs ?? 2000, maxConsecutive: opts.maxConsecutive || 6,
  };
  if (!cfg.rpc) throw new Error('ARCHIVE_RPC is missing (a repository secret)');
  if (!['all', 'census', 'changes', 'state', 'verify'].includes(cfg.phase)) throw new Error('PHASE must be all, census, changes, state or verify');
  const P = (rel) => path.join(cfg.core, rel);
  const AD = require(path.join(cfg.pc, 'tla-flows/lib/admin-classifier.js')), TM = require(path.join(cfg.pc, 'tla-flows/lib/tx-messages.js')), CS = require(path.join(cfg.pc, 'tla-flows/lib/contract-state.js')), CFG = require(path.join(cfg.pc, 'config/contracts.js'));
  const mask = (s) => String(s).split(cfg.rpc).join('<node>').replace(/https?:\/\/[^\s"')]+/g, '<url>');

  // ── what is watched, exactly as the cron builds it ───────────────────────────────────────────────────────────────────
  const curated = readJsonAt(P('docs/curated/contract-watch.json'), null);
  if (!curated || !Array.isArray(curated.contracts)) throw new Error('docs/curated/contract-watch.json is missing — the groups are the list of what to read');
  const WATCH = AD.adminWatchFrom({ config: CFG, known: readJsonAt(P('docs/curated/known_contracts.json'), null), registry: readJsonAt(P('tla-voting/capture-registry.json'), null), extra: curated });
  const contracts = [...WATCH].sort();
  const bucketOf = new Map(curated.contracts.map((c) => [c.address, c.bucket])), readOf = new Map((curated.buckets || []).map((b) => [b.id, b.archive_read || 'count']));
  const modeOf = (a) => readOf.get(bucketOf.get(a)) || 'count';
  const ownGroups = new Set((curated.buckets || []).filter((b) => b.core || b.archive_senders).map((b) => b.id));   // the alliance's own groups, and the ones marked: where a key-holding account can have something to change
  const BOOK = CFG.GLOBAL_CONFIG && CFG.GLOBAL_CONFIG.addr;
  const daoCores = [...new Set((curated.daos || []).map((d) => d && d.core).filter((a) => CONTRACT.test(a || '')))].sort();
  const allMonths = () => { const idx = readJsonAt(P('contract-watch/index.json'), {}); const out = []; for (const mk of Object.keys(idx.months || {}).sort()) { const a = readJsonAt(P(`contract-watch/events/${mk}.json`), []); if (Array.isArray(a)) out.push(...a); } return out; };
  const onFile = allMonths();
  // the accounts that hold or held a key: a role in the address book, an admin key, or an account that has itself sent a
  // change (not the member who pressed "execute" on a passed proposal, and not the account that merely created a contract)
  const st0 = readJsonAt(P('contract-watch/state/current.json'), {});
  const keyAccounts = new Set(); const addAcct = (a) => { if (typeof a === 'string' && ACCT.test(a)) keyAccounts.add(a); };
  for (const v of Object.values((st0.address_book && st0.address_book.entries) || {})) addAcct(v);
  for (const c of Object.values(st0.contracts || {})) addAcct(c.admin);
  for (const r of onFile) { if (r.observed) { const d = r.detail || {}; addAcct(d.before); addAcct(d.after); } else if (!r.routine && !r.via) addAcct(r.signer); if (r.kind === 'admin' && r.detail) addAcct(r.detail.new_admin_address); }
  const accounts = [...keyAccounts].sort();
  const vocabulary = [...new Set(onFile.filter((r) => r.txhash && !['upgrade', 'admin', 'code'].includes(r.kind) && (AD.CHANGE_RE.test(r.action) || AD.EPOCH_RE.test(r.action))).map((r) => r.action))].sort();
  const startSigs = new Set(onFile.filter((r) => r.txhash).map((r) => `${r.txhash}|${sig(r)}`));

  // ── budgets, pacing, one request at a time ───────────────────────────────────────────────────────────────────────────
  const t0 = Date.now(), stats = { requests: 0, retries: 0, failed: 0, pages: 0, txs: 0, block_reads: 0, state_reads: 0, records: 0 };
  let consecutive = 0, stop = null, lastStart = 0;
  const over = () => stop || (stats.requests >= cfg.maxRequests ? (stop = 'the request budget of this run is used') : (Date.now() - t0 > cfg.maxMinutes * 60000 ? (stop = 'the time budget of this run is used') : null));
  async function get(pathQ, o = {}) {   // o.tries: how often to ask (4) · o.soft: a failure here is the request's weight, not the node's health
    let last = null;
    for (let i = 0; i < (o.tries || 4); i++) {
      if (over()) return { ok: false, why: stop, halted: true };
      const wait = lastStart + 1000 / cfg.rps - Date.now(); if (wait > 0) await sleep(wait); lastStart = Date.now(); stats.requests++;
      try {
        const r = await fetch(cfg.rpc + pathQ, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(cfg.timeoutMs) });
        const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { }
        if (r.ok && j && !j.error) { consecutive = 0; return { ok: true, json: j }; }
        const body = j && j.error ? String(j.error.data || j.error.message || '') : text.slice(0, 200);
        last = { ok: false, why: mask(`HTTP ${r.status}: ${body}`).slice(0, 200) };
        const busy = r.status === 429 || (r.status >= 502 && r.status <= 504) || (!j && r.status >= 500) || /timed? ?out|temporar|busy|too many|overload|EOF|connection reset/i.test(body);
        if (!busy) { consecutive = 0; return { ...last, refused: true }; }   // the node answered: asking again changes nothing
      } catch (e) { last = { ok: false, why: e && e.name === 'TimeoutError' ? 'no answer in time' : 'no answer' }; }
      stats.retries++;
      if (!o.soft) { consecutive++; if (consecutive >= cfg.maxConsecutive) { stop = 'the node stopped answering'; return { ...last, halted: true }; } }
      await sleep(Math.min(60000, cfg.backoffMs * Math.pow(2, i)));
    }
    stats.failed++; return last;
  }
  const qs = (q) => encodeURIComponent('"' + q + '"');
  async function txSearch(q, page, perPage, o) {
    const r = await get(`/tx_search?query=${qs(q)}&per_page=${perPage}&page=${page}&order_by=%22asc%22`, o);
    if (!r.ok) return r;
    const res = r.json.result; if (!res || res.total_count == null) return { ok: false, why: 'an answer without a result', refused: true };
    stats.pages++; return { ok: true, total: Number(res.total_count), txs: res.txs || [] };
  }

  // ── the manifest: what has been read, so a run carries on where the last one stopped ─────────────────────────────────
  const MAN = 'contract-watch/archive/manifest.json';
  let man = cfg.fresh ? null : readJsonAt(P(MAN), null);
  if (!man || !man.units) man = { schemaVersion: 1, product: 'contract-watch/archive-manifest', builder: VERSION, note: 'One entry per search the backfill makes: total = matches the node reported, read = transactions read so far (page by page, in block order), per = transactions asked for at once, done = read to the end — or refused by the node (the reason is kept), counted only, or over the cap.', units: {}, state: {}, runs: [] };
  const times = readJsonAt(P('contract-watch/archive/block-times.json'), {});
  const tag = (h) => String(h).slice(0, 16);
  man.actions = man.actions || {}; man.shown_again = man.shown_again || [];
  const shownAgain = new Set(man.shown_again);
  if (!man.window) {
    const s = await get('/status'); const latest = s.ok && Number(s.json.result && s.json.result.sync_info && s.json.result.sync_info.latest_block_height);
    if (!latest) throw new Error(`the node did not say how far it is (${s.why || 'no height in its answer'})`);
    man.window = { lo: cfg.from || 1, hi: cfg.to || latest, node_latest: latest, typed_in: !!(cfg.from || cfg.to), set_at: new Date().toISOString() };
    man.on_file_at_start = [...new Set(onFile.filter((r) => r.txhash && r.height >= man.window.lo && r.height <= man.window.hi).map((r) => tag(r.txhash)))].sort();
  }
  const wasOnFile = new Set(man.on_file_at_start || []);
  const { lo: LO, hi: HI } = man.window;
  log(`${VERSION} · phase ${cfg.phase} · ${contracts.length} watched contracts · ${accounts.length} accounts that hold or held a key · ${daoCores.length} DAO cores · ${vocabulary.length} change actions known · blocks ${LO}–${HI} · at most ${cfg.rps} requests a second, ${cfg.maxRequests} requests, ${cfg.maxMinutes} minutes · private archive ${cfg.priv ? 'present' : 'not present (raw transactions are not kept this run)'}`);

  // ── every transaction read: classify, remember what gave a record, keep the raw when there is a private archive ──────
  const seen = new Set(), pending = [], newRecs = [], rawBuf = []; let rawParts = 0, rawTxs = 0;
  const rawDir = cfg.priv && path.join(cfg.priv, 'contract-watch/raw');
  if (rawDir) { fs.mkdirSync(rawDir, { recursive: true }); rawParts = fs.readdirSync(rawDir).filter((f) => /^part-\d+\.jsonl\.gz$/.test(f)).length; }
  const flushRaw = () => { if (!rawDir || !rawBuf.length) return; fs.writeFileSync(path.join(rawDir, `part-${String(rawParts++).padStart(5, '0')}.jsonl.gz`), zlib.gzipSync(rawBuf.join('\n') + '\n')); rawTxs += rawBuf.length; rawBuf.length = 0; };
  function handleTx(t, unitId, tally) {
    const hash = String(t && t.hash || '').toUpperCase(); if (!hash) return;
    const res = t.tx_result || {}, events = normEvents(res.events), txr = { txhash: hash, height: Number(t.height), timestamp: null, code: Number(res.code || 0), events };
    // a contract read in full: every action it reported, counted (also in a transaction another search has already shown)
    if (tally) for (const e of events) { if (e.type !== 'wasm') continue; let c = null, a = null; for (const x of e.attributes) { if (x.key === '_contract_address') c = x.value; else if ((x.key === 'action' || x.key === 'method') && a == null) a = x.value; } if (c === tally && a != null) { const o = man.actions[c] || (man.actions[c] = {}); o[a] = (o[a] || 0) + 1; } }
    if (seen.has(hash)) return; seen.add(hash); stats.txs++;
    if (wasOnFile.has(tag(hash))) shownAgain.add(tag(hash));
    let recs = []; try { recs = AD.classifyAdminTx(txr, WATCH); } catch (e) { stats.classify_errors = (stats.classify_errors || 0) + 1; }
    if (recs.length) pending.push({ tx: t.tx, recs, unitId });
    if (rawDir) { let m = null; try { m = TM.messagesOf(t.tx); } catch { }
      rawBuf.push(JSON.stringify({ h: txr.height, x: hash, i: t.index, c: txr.code, e: events.map((e) => [e.type, e.attributes.filter((a) => !(e.type === 'tx' && (a.key === 'acc_seq' || a.key === 'signature'))).map((a) => [a.key, a.value])]), m })); if (rawBuf.length >= 1000) flushRaw(); }
  }
  async function blockTime(h) {
    if (times[h]) return times[h];
    const r = await get(`/block?height=${h}`); const t = r.ok && r.json.result && r.json.result.block && r.json.result.block.header && r.json.result.block.header.time;
    if (!t) return null; stats.block_reads++; return (times[h] = String(t).slice(0, 19) + 'Z');
  }
  // a record needs its block's time before it can be filed. false = a block could not be read: nothing of that page is filed
  // with a made-up time, and the page is asked for again.
  async function settle() {
    let ok = true;
    for (const p of pending.splice(0)) {
      const time = await blockTime(p.recs[0].height);
      if (!time) { ok = false; seen.delete(p.recs[0].txhash); shownAgain.delete(tag(p.recs[0].txhash)); continue; }
      for (const r of p.recs) r.timestamp = time;
      try { TM.attachSent(p.recs, p.tx); } catch { }
      newRecs.push(...p.recs); stats.records += p.recs.length;
    }
    return ok;
  }

  // ── one search, read to its end, page by page in block order ─────────────────────────────────────────────────────────
  const Q = (cond) => (man.window.typed_in ? `${cond} AND tx.height>=${LO} AND tx.height<=${HI}` : cond);
  async function unit(id, cond, o = {}) {
    const u = man.units[id] || (man.units[id] = {});
    const capNow = o.count === 'cap' ? o.cap : (o.count ? null : (o.cap ?? cfg.pageCap));
    if (u.done && (u.over_cap || (u.counted_only && o.count === 'cap')) && capNow != null && u.total <= capNow) { delete u.done; delete u.over_cap; delete u.counted_only; }   // a cap that was raised re-opens what it had closed
    if (u.done || over()) return u;
    const q = Q(cond);
    if (u.per == null) {   // not begun: how many are there?
      const c = await txSearch(q, 1, 1);
      if (!c.ok) { if (c.refused) { u.done = true; u.refused = c.why; } return u; }
      u.total = c.total;
      if (o.count === true || (o.count === 'cap' && c.total > o.cap)) { u.done = true; u.counted_only = true; return u; }
      if (!c.total) { u.read = 0; u.done = true; return u; }
      if (c.total > (o.count ? cfg.pageCap : (o.cap ?? cfg.pageCap))) { u.done = true; u.over_cap = true; return u; }
      u.read = 0; u.per = 100;
    }
    while (u.read < u.total) {
      if (over()) return u;
      const r = await txSearch(q, Math.floor(u.read / u.per) + 1, u.per, { tries: 2, soft: u.per > 1 });
      if (!r.ok) {
        if (r.refused) { u.done = true; u.refused = r.why; return u; }
        if (r.halted) return u;
        if (u.per > 1) { u.per = u.per === 100 ? 20 : u.per === 20 ? 5 : 1; continue; }   // too heavy to answer in time: fewer transactions at once
        return u;   // not even one transaction came back: left open for the next run
      }
      if (!r.txs.length) { u.short = u.total - u.read; break; }
      for (const t of r.txs) handleTx(t, id, o.tally);
      if (!(await settle())) { if (stop) return u; u.block_time_failed = (u.block_time_failed || 0) + 1; if (u.block_time_failed < 3) return u; u.untimed = (u.untimed || 0) + 1; }   // three runs could not read a block of this page: say so and move on
      u.read += r.txs.length; if (r.total > u.total) u.total = r.total;   // the chain grew meanwhile: the new ones are at the end
    }
    u.done = true; return u;
  }

  // ── publish: everything this run holds, onto a fresh copy of the repository (so another writer's work is never lost) ─
  const runInfo = { at: new Date(t0).toISOString(), phase: cfg.phase, added: 0, confirmed: 0, refined: 0, kept_as_filed: 0, differs: [] };
  let census = readJsonAt(P('contract-watch/archive/census.json'), null) || { schemaVersion: 1, product: 'contract-watch/archive-census', note: 'Per watched contract: how many transactions the archive node holds for each kind of event, how the contract was read (all = every execute; targeted = by change action, by DAO and by key-holding account), and — for a contract read in full — every action it reported with its count.', contracts: {} };
  let hist = { book: readJsonAt(P('contract-watch/state/history/address-book.json'), null), contracts: readJsonAt(P('contract-watch/state/history/contracts.json'), null), config: readJsonAt(P('contract-watch/state/history/config-changes.json'), null) };
  let verify = null;
  const sh = (c, cwd) => execSync(c, { cwd, stdio: 'pipe' }).toString();
  function writeOutputs() {
    const byM = {}; for (const r of newRecs) (byM[monthKey(r.timestamp)] ||= []).push(r);
    const touched = {}, tot = { added: 0, confirmed: 0, refined: 0, kept_as_filed: 0, differs: [] };
    for (const mk of Object.keys(byM).sort()) {
      const rel = `contract-watch/events/${mk}.json`, existing = fs.existsSync(P(rel)) ? readJsonAt(P(rel), null) : [];
      if (!Array.isArray(existing)) throw new Error(`${rel} is not a list — refusing to write over it`);
      const m = mergeByTx(existing, byM[mk]);
      if (m.merged.length < existing.length) throw new Error(`${rel}: the merge would lose records — nothing written`);
      for (const k of ['added', 'confirmed', 'refined', 'kept_as_filed']) tot[k] += m[k]; tot.differs.push(...m.differs);
      if (m.changed) { writeAt(P(rel), JSON.stringify(m.merged)); touched[mk] = m.merged; }
    }
    // what this run added, counted against what was on file when it started (a second publish of the same run counts nothing twice)
    runInfo.added = newRecs.filter((r) => !startSigs.has(`${r.txhash}|${sig(r)}`)).length; runInfo.confirmed = newRecs.length - runInfo.added;
    runInfo.refined = tot.refined; runInfo.kept_as_filed = tot.kept_as_filed; runInfo.differs = tot.differs.slice(0, 50);
    const leaf = Object.values(man.units), left = leaf.filter((u) => !u.done).length;
    const idx = readJsonAt(P('contract-watch/index.json'), null) || { schemaVersion: 1, product: 'contract-watch/index', months: {} };
    idx.months = idx.months || {}; for (const mk of Object.keys(touched)) idx.months[mk] = AD.monthSummary(touched[mk]);
    idx.months = Object.fromEntries(Object.keys(idx.months).sort().map((k) => [k, idx.months[k]]));
    const allDone = planned.changes && left === 0 && !stop && !!man.found_again;
    idx.archive = { builder: VERSION, note: 'The one-time backfill from an archive node: every watched contract read over the whole block range below. complete = every search was read to its end.', from_height: LO, to_height: HI, to_time: times[HI] || (idx.archive && idx.archive.to_time) || null,
      complete: !!(allDone || (idx.archive && idx.archive.complete && !planned.changes)), contracts: contracts.length, searches: leaf.length, searches_left: left, read_at: new Date().toISOString(),
      state: man.state && man.state.done ? { done: true, at: man.state.at } : { done: false }, verified: verify ? verify.summary : (idx.archive && idx.archive.verified) || null };
    idx.updated_at = new Date().toISOString();
    writeAt(P('contract-watch/index.json'), JSON.stringify(idx, null, 2));
    man.shown_again = [...shownAgain].sort(); man.updated_at = new Date().toISOString(); writeAt(P(MAN), JSON.stringify(man));
    writeAt(P('contract-watch/archive/block-times.json'), JSON.stringify(Object.fromEntries(Object.keys(times).map(Number).sort((a, b) => a - b).map((h) => [h, times[h]]))));
    census.builder = VERSION; census.updated_at = new Date().toISOString(); writeAt(P('contract-watch/archive/census.json'), JSON.stringify(census, null, 1));
    if (hist.book) writeAt(P('contract-watch/state/history/address-book.json'), JSON.stringify(hist.book, null, 1));
    if (hist.contracts) writeAt(P('contract-watch/state/history/contracts.json'), JSON.stringify(hist.contracts, null, 1));
    if (hist.config) writeAt(P('contract-watch/state/history/config-changes.json'), JSON.stringify(hist.config, null, 1));
    const prev = readJsonAt(P('contract-watch/archive/report.json'), null);
    const report = { schemaVersion: 1, product: 'contract-watch/archive-report', builder: VERSION, classifier: AD.VERSION, updated_at: new Date().toISOString(),
      blocks: { from: LO, to: HI }, watched_contracts: contracts.length, key_accounts: accounts.length, dao_cores: daoCores.length, change_actions_known: vocabulary.length,
      more_to_read: !!stop || left > 0,
      searches: { total: leaf.length, done: leaf.length - left, left, refused: leaf.filter((u) => u.refused).length, short: leaf.filter((u) => u.short).length, over_cap: leaf.filter((u) => u.over_cap).length, untimed: leaf.filter((u) => u.untimed).length },
      complete: idx.archive.complete, stopped: stop,
      this_run: { ...runInfo, requests: stats.requests, retries: stats.retries, pages: stats.pages, transactions_read: stats.txs, block_reads: stats.block_reads, state_reads: stats.state_reads, minutes: +((Date.now() - t0) / 60000).toFixed(1), raw_transactions_kept: rawDir ? rawTxs + rawBuf.length : 'no private archive in this run' },
      runs: [...((prev && prev.runs) || []), { at: runInfo.at, phase: cfg.phase, requests: stats.requests, transactions_read: stats.txs, added: runInfo.added, confirmed: runInfo.confirmed, minutes: +((Date.now() - t0) / 60000).toFixed(1), stopped: stop }].filter((r, i, a) => a.findIndex((x) => x.at === r.at) === i || i === a.length - 1).slice(-40),
      verify: verify || (prev && prev.verify) || null,
      limits: 'On a busy contract (one with more executes than the cap, or in a group marked targeted) a change is found by its action name, by the DAO that sent it or by the key-holding account that sent it. A change with an action name never seen before, sent by an account that holds no role or admin key, would not be found there. Migrations and admin changes are found for every contract regardless.' };
    // one line per run in `runs`: the entry of this run replaces its own earlier publish
    report.runs = report.runs.filter((r, i, a) => i === a.map((x) => x.at).lastIndexOf(r.at));
    writeAt(P('contract-watch/archive/report.json'), JSON.stringify(report, null, 1));
    return { left, more: !!stop || left > 0, report };
  }
  function publish(msg) {
    flushRaw();
    if (cfg.noPush) return writeOutputs();
    let out = null;
    for (let i = 0; i < 6; i++) {
      try { sh('git fetch -q origin main && git reset -q --hard origin/main', cfg.core); } catch (e) { if (i === 5) throw new Error('could not refresh the repository'); continue; }
      out = writeOutputs();
      try { sh('git add contract-watch', cfg.core); try { sh('git diff --cached --quiet', cfg.core); return out; } catch { }
        sh(`git commit -q -m ${JSON.stringify(msg)}`, cfg.core); sh('git push -q origin HEAD:main', cfg.core); return out; } catch (e) { execSync(`sleep ${3 * (i + 1)}`); }
    }
    throw new Error('could not publish after six tries — what was read is in this run only');
  }
  function publishPrivate(msg) {
    if (!cfg.priv || cfg.noPush) return; flushRaw();
    writeAt(path.join(rawDir, '_manifest.json'), JSON.stringify({ product: 'contract-watch/raw', builder: VERSION, note: 'Every transaction the backfill read: events and the body\'s messages. No memo, no signatures.', parts: rawParts, updated_at: new Date().toISOString() }, null, 1));
    for (let i = 0; i < 6; i++) { try { sh('git add contract-watch && (git diff --cached --quiet || git commit -q -m ' + JSON.stringify(msg) + ') && git pull -q --rebase origin main && git push -q origin HEAD:main', cfg.priv); return; } catch (e) { execSync(`sleep ${3 * (i + 1)}`); } }
    log('  the private archive could not be pushed — the raw parts of this run are lost; the public record is not affected');
  }

  // ── phases ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const planned = { census: ['all', 'census', 'changes'].includes(cfg.phase), changes: ['all', 'changes'].includes(cfg.phase), state: ['all', 'state'].includes(cfg.phase), verify: ['all', 'state', 'verify'].includes(cfg.phase) };
  let lastPublish = Date.now();
  const tick = async (what) => { if (Date.now() - lastPublish > 12 * 60000) { publish(`contract-watch archive backfill: ${what} (in progress)`); publishPrivate(`contract-watch raw: ${what}`); lastPublish = Date.now(); } };
  const C = (a) => census.contracts[a] || (census.contracts[a] = {});

  if (planned.census || planned.changes) {
    // 1. wasmd's own events, per contract: complete and few.
    for (const a of contracts) { if (over()) break;
      for (const [k, ev] of [['migrations', 'migrate'], ['admin_changes', 'update_contract_admin']]) {
        const u = await unit(`${ev}|${a}`, `${ev}._contract_address='${a}'`, planned.changes ? {} : { count: true }); if (u.total != null) C(a)[k] = u.total; if (u.refused) C(a)[k + '_refused'] = u.refused; }
      await tick('lifecycle events');
    }
    // 2. every execute of a quiet contract (counted first; a group marked targeted is never counted — a pool has millions)
    for (const a of contracts) { if (over()) break;
      if (modeOf(a) === 'targeted') { C(a).read = 'targeted'; continue; }
      const u = await unit(`execute|${a}`, `execute._contract_address='${a}'`, planned.changes ? { count: 'cap', cap: cfg.allCap, tally: a } : { count: true });
      if (u.total != null) C(a).executes = u.total;
      if (u.done) C(a).read = u.counted_only || u.refused ? 'targeted' : 'all';
      if (C(a).read === 'all' && man.actions[a]) C(a).actions = Object.fromEntries(Object.entries(man.actions[a]).sort((x, y) => y[1] - x[1]));
      await tick('quiet contracts');
    }
  }
  if (planned.changes) {
    const busy = contracts.filter((a) => C(a).read !== 'all');
    // 3. everything a watched DAO's core sent (every proposal it executed, whatever it changed)
    for (const d of daoCores) { if (over()) break; await unit(`dao|${d}`, `message.sender='${d}'`); await tick('DAO-sent changes'); }
    // 4. the change actions the record knows: across the chain when the action is rare, else on each busy contract
    for (const act of vocabulary) { if (over()) break;
      const u = await unit(`action|${act}`, `wasm.action='${act}'`, { count: 'cap', cap: cfg.actionCap });
      if (u.done && u.counted_only) for (const a of busy) { if (over()) break; await unit(`action|${act}|${a}`, `wasm.action='${act}' AND wasm._contract_address='${a}'`); }
      await tick('change actions');
    }
    // 5. what a key-holding account sent to a busy contract (a quiet contract was read in full; an account's other
    //    transactions are not this record's business and are never asked for). Only in the alliance's own groups and the
    //    groups marked for it: a key of the alliance changes nothing in someone else's pool.
    const theirs = busy.filter((a) => ownGroups.has(bucketOf.get(a)) || modeOf(a) === 'count');
    for (const w of accounts) { if (over()) break;
      for (const a of theirs) { if (over()) break; await unit(`sender|${w}|${a}`, `message.sender='${w}' AND execute._contract_address='${a}'`); }
      await tick('key-holding accounts');
    }
    // 6. the whole chain: every migration and every admin change of any contract (the forward walk keeps these for all)
    for (const [id, cond, alts] of [['chain|migrate', 'migrate._contract_address EXISTS', ['MsgMigrateContract']], ['chain|admin', 'update_contract_admin._contract_address EXISTS', ['MsgUpdateAdmin', 'MsgClearAdmin']]]) { if (over()) break;
      const u = await unit(id, cond, { cap: cfg.chainCap });
      // a node that does not know EXISTS: the top-level messages instead (a change made through another contract is then found per watched contract only)
      if (u.refused) for (const m of alts) { if (over()) break; await unit(`${id}|${m}`, `message.action='/cosmwasm.wasm.v1.${m}'`, { cap: cfg.chainCap }); }
      await tick('chain-wide lifecycle');
    }
    await settle();
    if (!over()) await blockTime(HI);
    // every change that was on file when the backfill began and lies in the block range: did the archive show it again?
    const leafLeft = Object.values(man.units).filter((u) => !u.done).length;
    if (!leafLeft && !stop) { const missing = [...wasOnFile].filter((t) => !shownAgain.has(t)); man.found_again = { on_file: wasOnFile.size, shown_again: wasOnFile.size - missing.length, not_found: missing.length, not_found_hashes_start_with: missing.slice(0, 40) }; }
  }

  // ── state at past heights ────────────────────────────────────────────────────────────────────────────────────────────
  async function abci(pathStr, data, height) {
    const r = await get(`/abci_query?path=${qs(pathStr)}&data=0x${data.toString('hex')}${height ? `&height=${height}` : ''}`);
    if (!r.ok) return r;
    const resp = r.json.result && r.json.result.response; if (!resp) return { ok: false, why: 'an answer without a response', refused: true };
    if (resp.code) return { ok: false, why: mask(`code ${resp.code}: ${String(resp.log || '').slice(0, 160)}`), refused: true };
    stats.state_reads++; return { ok: true, value: Buffer.from(resp.value || '', 'base64') };
  }
  const F = (buf, no) => TM.fields(buf).filter((f) => f.no === no), s1 = (buf, no) => { const f = F(buf, no)[0]; return f && f.b ? f.b.toString('utf8') : null; }, n1 = (buf, no) => { const f = F(buf, no)[0]; return f && f.v != null ? Number(f.v) : null; };
  async function infoAt(addr, height) {
    const r = await abci('/cosmwasm.wasm.v1.Query/ContractInfo', fStr(1, addr), height); if (!r.ok) return r;
    const ci = F(r.value, 2)[0]; if (!ci || !ci.b) return { ok: false, why: 'no contract info in the answer', refused: true };
    const cr = F(ci.b, 5)[0];
    return { ok: true, info: { code_id: String(n1(ci.b, 1)), creator: s1(ci.b, 2), admin: s1(ci.b, 3) || null, label: (s1(ci.b, 4) || '').slice(0, 200), created_height: cr && cr.b ? n1(cr.b, 1) : null } };
  }
  async function smartAt(addr, query, height) {
    const r = await abci('/cosmwasm.wasm.v1.Query/SmartContractState', Buffer.concat([fStr(1, addr), fStr(2, JSON.stringify(query))]), height); if (!r.ok) return r;
    const d = F(r.value, 1)[0]; try { return { ok: true, data: JSON.parse(d.b.toString('utf8')) }; } catch { return { ok: false, why: 'the answer is not JSON', refused: true }; }
  }
  async function historyOf(addr, height) {
    const r = await abci('/cosmwasm.wasm.v1.Query/ContractHistory', fStr(1, addr), height); if (!r.ok) return r;
    const OPS = { 1: 'init', 2: 'migrate', 3: 'genesis' };
    return { ok: true, entries: F(r.value, 1).filter((e) => e.b).map((e) => { const up = F(e.b, 3)[0]; let msg; const m = F(e.b, 4)[0]; if (m && m.b) { const t = m.b.toString('utf8'); if (t.length <= TM.MAX_JSON) { try { msg = JSON.parse(t); } catch { } } else msg = { too_long: t.length }; }
      return { operation: OPS[n1(e.b, 1)] || String(n1(e.b, 1)), code_id: String(n1(e.b, 2)), height: up && up.b ? n1(up.b, 1) : null, tx_index: up && up.b ? (n1(up.b, 2) || 0) : null, ...(msg !== undefined ? { msg } : {}) }; }) };
  }

  if (planned.state && !over()) {
    const recs = [...new Map(allMonths().concat(newRecs).filter((r) => r.txhash).map((r) => [`${r.txhash}|${r.k}|${sig(r)}`, r])).values()];
    man.state = man.state || {};
    // a. each watched contract: what it is at the end of the range, its own code history, its admin when it was created
    hist.contracts = hist.contracts || { schemaVersion: 1, product: 'contract-watch/state-history/contracts', note: 'Per watched contract, from the archive node: what the chain reports at the end of the block range (code id, admin, creator, label, the block it was created in), its own code history (every code it has run, with the block of each change) and its admin in the block it was created — "not held" when the node no longer keeps the state of that block.', at_height: HI, contracts: {} };
    for (const a of contracts) { if (over()) break; const h = hist.contracts.contracts[a] || (hist.contracts.contracts[a] = {});
      if (!h.info && !h.info_refused) { const r = await infoAt(a, HI); if (r.ok) h.info = r.info; else if (r.refused) h.info_refused = r.why; else break; }
      if (!h.history && !h.history_refused) { const r = await historyOf(a, HI); if (r.ok) h.history = r.entries; else if (r.refused) h.history_refused = r.why; else break; }
      const ch = h.info && h.info.created_height;
      if (ch && h.admin_at_creation === undefined) { const r = await infoAt(a, ch); if (r.ok) h.admin_at_creation = r.info.admin; else if (r.refused) h.admin_at_creation = 'not held'; else break; }
      await tick('contract histories');
    }
    // b. the address book around every change of the global config
    if (BOOK && !over()) {
      hist.book = hist.book || { schemaVersion: 1, product: 'contract-watch/state-history/address-book', note: 'The TLA address book (the global config\'s role → address map) in the block before and in the block of every change of that contract on record, read from an archive node. before/after are whole maps; diff lists the roles that differ.', contract: BOOK, changes: [] };
      const have = new Set(hist.book.changes.map((c) => c.height));
      const heights = [...new Set(recs.filter((r) => r.contract === BOOK && r.txhash && !r.routine).map((r) => r.height))].filter((h) => h >= LO && h <= HI).sort((x, y) => x - y);
      for (const h of heights) { if (over()) break; if (have.has(h)) continue;
        const b = await smartAt(BOOK, CS.BOOK_QUERY, h - 1), a = b.ok || b.refused ? await smartAt(BOOK, CS.BOOK_QUERY, h) : b;
        if (!(a.ok || a.refused) || !(b.ok || b.refused)) break;
        const pb = b.ok ? CS.parseAddressBook(b.data && b.data.data !== undefined ? b.data.data : b.data) : null, pa = a.ok ? CS.parseAddressBook(a.data && a.data.data !== undefined ? a.data.data : a.data) : null;
        const before = pb && pb.ok ? pb.entries : null, after = pa && pa.ok ? pa.entries : null;
        const roles = before && after ? [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter((k) => before[k] !== after[k]).map((k) => ({ role: k, before: before[k] || null, after: after[k] || null })) : null;
        hist.book.changes.push({ height: h, time: await blockTime(h), txhash: [...new Set(recs.filter((r) => r.contract === BOOK && r.height === h && r.txhash).map((r) => r.txhash))], before, after, diff: roles, ...(b.ok ? {} : { before_refused: b.why }), ...(a.ok ? {} : { after_refused: a.why }) });
        hist.book.changes.sort((x, y) => x.height - y.height); await tick('address book');
      }
      if (!over() && !hist.book.at_end) { const e = await smartAt(BOOK, CS.BOOK_QUERY, HI); const pe = e.ok ? CS.parseAddressBook(e.data && e.data.data !== undefined ? e.data.data : e.data) : null; if (pe && pe.ok) hist.book.at_end = { height: HI, entries: pe.entries }; else if (e.refused) hist.book.at_end = { height: HI, refused: e.why }; }
    }
    // c. {"config":{}} around every change on record, kept when the two differ
    if (!over()) {
      hist.config = hist.config || { schemaVersion: 1, product: 'contract-watch/state-history/config-changes', note: 'For a change on record: the contract\'s {"config":{}} answer in the block before and in the block of the change, as the paths that differ (values clipped). Only changes whose config differs are listed; `unchanged` counts the rest; a contract with no such query is listed under no_config.', changes: [], unchanged: 0, no_config: {}, done: {} };
      const pts = new Map(); for (const r of recs) { if (!r.txhash || r.routine || r.kind === 'code' || !r.contract || !WATCH.has(r.contract) || r.height < LO || r.height > HI) continue; const k = `${r.contract}@${r.height}`; if (!pts.has(k)) pts.set(k, []); if (!pts.get(k).includes(r.k)) pts.get(k).push(r.k); }
      for (const [k, keys] of [...pts].sort((x, y) => Number(x[0].split('@')[1]) - Number(y[0].split('@')[1]))) { if (over()) break; if (hist.config.done[k]) continue;
        const [c, hs] = k.split('@'), h = Number(hs); if (hist.config.no_config[c]) { hist.config.done[k] = 1; continue; }
        const a = await smartAt(c, { config: {} }, h); if (!a.ok) { if (!a.refused) break; if (/unknown variant|parse|not found: query|Error parsing|unknown request/i.test(a.why)) hist.config.no_config[c] = a.why.slice(0, 120); hist.config.done[k] = 1; continue; }
        const b = await smartAt(c, { config: {} }, h - 1); if (!b.ok && !b.refused) break;
        const d = b.ok ? diffJson(b.data, a.data) : null;
        if (d && d.changed) hist.config.changes.push({ records: keys, contract: c, height: h, paths_changed: d.changed, diff: d.diff }); else if (d) hist.config.unchanged++; else hist.config.changes.push({ records: keys, contract: c, height: h, before_refused: b.why });
        hist.config.done[k] = 1; await tick('config before and after');
      }
    }
    if (!over()) { man.state.done = true; man.state.at = new Date().toISOString(); }
  }

  // ── verify: no node reads ────────────────────────────────────────────────────────────────────────────────────────────
  if (planned.verify && hist.contracts) {
    const AT = hist.contracts.at_height || HI;
    const byC = new Map(); for (const r of allMonths().concat(newRecs)) { if (!r.txhash || !r.contract || r.height > AT) continue; if (!byC.has(r.contract)) byC.set(r.contract, new Map()); byC.get(r.contract).set(`${r.txhash}|${sig(r)}`, r); }
    const code = { contracts: 0, agree: 0, migrations: 0, missing: [] }, admin = { contracts: 0, agree: 0, differs: [], start_not_held: 0 };
    for (const [a, h] of Object.entries(hist.contracts.contracts)) {
      const rs = [...(byC.get(a) || new Map()).values()].sort((x, y) => x.height - y.height);
      if (h.history) { code.contracts++; const migs = h.history.filter((e) => e.operation === 'migrate'); code.migrations += migs.length;
        const miss = migs.filter((e) => !rs.some((r) => r.kind === 'upgrade' && r.height === e.height)); if (!miss.length) code.agree++; else code.missing.push(...miss.map((e) => ({ contract: a, height: e.height, code_id: e.code_id }))); }
      if (h.info) { const ch = rs.filter((r) => r.kind === 'admin');
        if (h.admin_at_creation === undefined || h.admin_at_creation === 'not held') { if (!ch.length) { admin.start_not_held++; continue; } admin.contracts++; const last = ch[ch.length - 1]; const now = last.action === 'clear_admin' ? null : (last.detail && last.detail.new_admin_address) || null; if (now === (h.info.admin || null)) admin.agree++; else admin.differs.push({ contract: a, on_chain: h.info.admin || null, record_gives: now, start: 'not held' }); continue; }
        admin.contracts++; let cur = h.admin_at_creation || null; for (const r of ch) cur = r.action === 'clear_admin' ? null : (r.detail && r.detail.new_admin_address) || null;
        if (cur === (h.info.admin || null)) admin.agree++; else admin.differs.push({ contract: a, on_chain: h.info.admin || null, record_gives: cur }); }
    }
    let book = null;
    if (hist.book && hist.book.changes.length) { const ch = hist.book.changes.filter((c) => c.before && c.after); const same = (x, y) => JSON.stringify(Object.entries(x).sort()) === JSON.stringify(Object.entries(y).sort()); const gaps = [];
      for (let i = 1; i < ch.length; i++) if (!same(ch[i - 1].after, ch[i].before)) gaps.push({ after_height: ch[i - 1].height, before_height: ch[i].height });
      if (hist.book.at_end && hist.book.at_end.entries && ch.length && !same(ch[ch.length - 1].after, hist.book.at_end.entries)) gaps.push({ after_height: ch[ch.length - 1].height, before_height: hist.book.at_end.height });
      book = { changes: hist.book.changes.length, read_both_sides: ch.length, chain_unbroken: gaps.length === 0, changed_between_with_no_record: gaps }; }
    verify = { at: new Date().toISOString(), code_history: code, admin: admin, address_book: book, found_again: man.found_again || null,
      summary: { code_history: `${code.agree} of ${code.contracts}`, admin: `${admin.agree} of ${admin.contracts}`, address_book_unbroken: book ? book.chain_unbroken : null, earlier_records_not_found: man.found_again ? man.found_again.not_found : null } };
  }

  await settle();
  const out = publish(`contract-watch archive backfill: ${stats.records} record(s) read · ${stop ? 'stopped — ' + stop : 'this pass is done'}`);
  publishPrivate(`contract-watch raw: ${rawTxs} transaction(s)`);
  log(`requests ${stats.requests} (retries ${stats.retries}, failed ${stats.failed}) · pages ${stats.pages} · transactions read ${stats.txs} · records ${stats.records} (new ${runInfo.added}, already on file ${runInfo.confirmed}) · block reads ${stats.block_reads} · state reads ${stats.state_reads} · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  log(`searches: ${out.report.searches.done} of ${out.report.searches.total} done · left ${out.left} · refused ${out.report.searches.refused} · over cap ${out.report.searches.over_cap}`);
  if (verify) log(`verify: code history ${verify.summary.code_history} contracts agree · admin ${verify.summary.admin} agree · address book unbroken: ${verify.summary.address_book_unbroken} · earlier records not found again: ${verify.summary.earlier_records_not_found}`);
  log(stop ? `STOPPED: ${stop}. Everything read is filed. Run the workflow again to carry on.` : (out.left ? `${out.left} search(es) left — run the workflow again.` : 'Done: nothing left to read.'));
  return { stats, stop, left: out.left, more: out.more, report: out.report, verify, man };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().then((r) => { if (r.stop === 'the node stopped answering') process.exitCode = 1; }).catch((e) => { console.error('FATAL: ' + String(e && e.message || e).replace(/https?:\/\/[^\s"')]+/g, '<url>')); process.exit(1); });
}

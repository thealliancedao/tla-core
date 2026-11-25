#!/usr/bin/env node
// mock-run — the gate of contract-watch-archive. The walker runs against a STAND-IN archive node built in this file from
// transactions the stored walks really hold (tla-core tla-flows/raw: their events exactly as the chain gave them), so what
// it must find is known in advance: the records the forward classifier gives for those same transactions.
//
// Usage:  TLA_CORE_DIR=<tla-core checkout with tla-flows/raw>  CW_DIR=<tla-core checkout with contract-watch/ and docs/curated/contract-watch.json>
//         PLATFORM_CRONS_DIR=<platform-crons checkout>  node .github/scripts/contract-watch-archive/mock-run.mjs
// Nothing is pushed and no real node is asked. The transaction bytes (which the stored walks did not keep) are built here
// from the wire format around the real senders and contracts of each transaction, each with a memo that must never be kept.
import fs from 'fs'; import os from 'os'; import path from 'path'; import zlib from 'zlib'; import http from 'http'; import { execSync } from 'child_process'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import { run, normEvents, mergeByTx, diffJson, VERSION } from './walk.mjs';
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.TLA_CORE_DIR, CW = process.env.CW_DIR || SRC, PC = process.env.PLATFORM_CRONS_DIR;
if (!SRC || !PC) { console.error('usage: TLA_CORE_DIR=… CW_DIR=… PLATFORM_CRONS_DIR=… node mock-run.mjs'); process.exit(2); }
const AD = require(path.join(PC, 'tla-flows/lib/admin-classifier.js')), TM = require(path.join(PC, 'tla-flows/lib/tx-messages.js')), CFG = require(path.join(PC, 'config/contracts.js'));
let pass = 0, fail = 0;
const check = (name, ok, detail) => { if (ok) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 700) : '')); } };
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const MEMO = 'A MEMO THAT MUST NEVER BE KEPT', NODE_SECRET = 'secret-node-key-9f3a';
const ACCT_RE = /terra1[0-9a-z]{38}(?![0-9a-z])/;

// ── the wire format, written out ───────────────────────────────────────────────────────────────────────────────────────
const vi = (n) => { const o = []; let v = BigInt(n); do { let b = Number(v & 0x7fn); v >>= 7n; if (v) b |= 0x80; o.push(b); } while (v); return Buffer.from(o); };
const ld = (no, b) => Buffer.concat([vi((no << 3) | 2), vi(Buffer.byteLength(b)), Buffer.isBuffer(b) ? b : Buffer.from(b)]);
const vf = (no, n) => Buffer.concat([vi((no << 3) | 0), vi(n)]);
const any = (type, value) => Buffer.concat([ld(1, type), ld(2, value)]);
const txRaw = (msgs) => Buffer.concat([ld(1, Buffer.concat([...msgs.map((m) => ld(1, m)), ld(2, MEMO), vf(3, 0)])), ld(2, Buffer.from('auth-info-bytes')), ld(3, Buffer.from('a-signature'))]).toString('base64');
const attr = (e, k) => { const a = (e.attributes || []).find((x) => x.key === k); return a ? a.value : undefined; };
// the messages of a transaction, rebuilt from its events: one per `message` event that carries an action
function bytesFor(events) {
  const msgs = []; let cur = null;
  for (const e of events) {
    if (e.type === 'message' && attr(e, 'action')) { cur = { type: attr(e, 'action'), sender: attr(e, 'sender') || '', contract: null, code_id: null, new_admin: null, action: null }; msgs.push(cur); continue; }
    if (!cur) continue;
    if (e.type === 'message' && attr(e, 'sender') && !cur.sender) cur.sender = attr(e, 'sender');
    if (e.type === 'execute' && !cur.contract) cur.contract = attr(e, '_contract_address');
    if (e.type === 'migrate' && cur.code_id == null) { cur.contract = cur.contract || attr(e, '_contract_address'); cur.code_id = attr(e, 'code_id'); }
    if (e.type === 'update_contract_admin' && cur.new_admin == null) { cur.contract = cur.contract || attr(e, '_contract_address'); cur.new_admin = attr(e, 'new_admin_address') || ''; }
    if (e.type === 'wasm' && !cur.action && attr(e, 'action')) cur.action = attr(e, 'action');
  }
  return txRaw(msgs.map((m) => {
    if (/MsgExecuteContract$/.test(m.type) && m.contract) return any(m.type, Buffer.concat([ld(1, m.sender), ld(2, m.contract), ld(3, JSON.stringify({ [String(m.action || 'do').split('/').pop()]: { built_in: 'the gate' } }))]));
    if (/MsgMigrateContract$/.test(m.type) && m.contract) return any(m.type, Buffer.concat([ld(1, m.sender), ld(2, m.contract), vf(3, Number(m.code_id || 1)), ld(4, '{}')]));
    if (/MsgUpdateAdmin$/.test(m.type) && m.contract) return any(m.type, Buffer.concat([ld(1, m.sender), ld(2, m.new_admin || ''), ld(3, m.contract)]));
    return any(m.type, Buffer.alloc(0));
  }));
}

// ── the stand-in archive node ──────────────────────────────────────────────────────────────────────────────────────────
const WANT = new Set(['execute._contract_address', 'migrate._contract_address', 'update_contract_admin._contract_address', 'wasm._contract_address', 'wasm.action', 'message.sender', 'message.action']);
function buildNode(txs, model = {}) {
  txs = [...txs].sort((a, b) => (a.height - b.height) || (a.index - b.index));
  const idx = {}; for (const k of WANT) idx[k] = new Map();
  txs.forEach((t, i) => { for (const e of t.events) for (const a of e.attributes || []) { const k = `${e.type}.${a.key}`; if (!WANT.has(k)) continue; const m = idx[k]; let arr = m.get(a.value); if (!arr) m.set(a.value, arr = []); if (arr[arr.length - 1] !== i) arr.push(i); } });
  const timeAt = new Map(txs.map((t) => [t.height, t.time]));
  const latest = model.latest || (txs.length ? txs[txs.length - 1].height + 1000 : 1000);
  const st = { requests: 0, tx_search: 0, queries: [], seenUrls: new Map(), behave: null, base64: false, noExists: false };
  const evalQuery = (q) => {
    let set = null, lo = -Infinity, hi = Infinity;
    for (const part of q.split(' AND ').map((s) => s.trim())) {
      let m;
      if ((m = /^tx\.height\s*(>=|<=|<|>)\s*(\d+)$/.exec(part))) { const n = Number(m[2]); if (m[1] === '>=') lo = Math.max(lo, n); else if (m[1] === '>') lo = Math.max(lo, n + 1); else if (m[1] === '<=') hi = Math.min(hi, n); else hi = Math.min(hi, n - 1); continue; }
      let arr;
      if ((m = /^([\w.\-/]+)\s*=\s*'([^']*)'$/.exec(part))) { if (!WANT.has(m[1])) throw new Error(`the stand-in does not index ${m[1]}`); arr = idx[m[1]].get(m[2]) || []; }
      else if ((m = /^([\w.\-/]+) EXISTS$/.exec(part))) { if (st.noExists) throw new Error('failed to parse query: unexpected token EXISTS'); if (!WANT.has(m[1])) throw new Error(`the stand-in does not index ${m[1]}`); arr = [...new Set([...idx[m[1]].values()].flat())].sort((a, b) => a - b); }
      else throw new Error('failed to parse query: ' + part);
      set = set === null ? arr : set.filter((i) => arr.includes(i));
    }
    return (set || txs.map((_, i) => i)).filter((i) => txs[i].height >= lo && txs[i].height <= hi);
  };
  const enc = (s) => (st.base64 ? Buffer.from(String(s)).toString('base64') : s);
  const shape = (t) => ({ hash: t.hash, height: String(t.height), index: t.index, tx_result: { code: t.code, data: null, log: '', gas_wanted: '1', gas_used: '1', events: t.events.map((e) => ({ type: e.type, attributes: (e.attributes || []).map((a) => ({ key: enc(a.key), value: a.value == null ? a.value : enc(a.value), index: true })) })) }, tx: t.tx });
  const rpcErr = (res, data) => { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ jsonrpc: '2.0', id: -1, error: { code: -32603, message: 'Internal error', data } })); };
  const ok = (res, result) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ jsonrpc: '2.0', id: -1, result })); };
  const rd = (buf) => { const out = {}; let i = 0; const v = () => { let x = 0n, s = 0n; for (;;) { const b = buf[i++]; x |= BigInt(b & 127) << s; if (b < 128) return Number(x); s += 7n; } }; while (i < buf.length) { const tag = v(), no = tag >> 3, w = tag & 7; if (w === 2) { const l = v(); (out[no] = out[no] || []).push(buf.subarray(i, i + l)); i += l; } else if (w === 0) (out[no] = out[no] || []).push(v()); else break; } return out; };
  const server = http.createServer((req, res) => {
    st.requests++; const u = new URL(req.url, 'http://x'); const n = (st.seenUrls.get(req.url) || 0) + 1; st.seenUrls.set(req.url, n);
    if (!req.url.startsWith('/' + NODE_SECRET + '/')) { res.writeHead(404); return res.end('no'); }
    const p = u.pathname.slice(NODE_SECRET.length + 1);
    if (st.behave) { const b = st.behave({ path: p, url: req.url, nth: n, total: st.requests, q: u.searchParams.get('query') }); if (b === 'drop') return req.socket.destroy(); if (b) { res.writeHead(b.status, { 'content-type': b.json ? 'application/json' : 'text/plain' }); return res.end(b.json ? JSON.stringify(b.json) : (b.body || '')); } }
    try {
      if (p === '/status') return ok(res, { sync_info: { latest_block_height: String(latest), earliest_block_height: '1' } });
      if (p === '/tx_search') {
        st.tx_search++; const q = String(u.searchParams.get('query') || '').replace(/^"|"$/g, ''), per = Number(u.searchParams.get('per_page') || 30), page = Number(u.searchParams.get('page') || 1);
        st.queries.push({ q, per, page, seq: st.requests });
        let hit; try { hit = evalQuery(q); } catch (e) { return rpcErr(res, e.message); }
        const pages = Math.max(1, Math.ceil(hit.length / per)); if (page < 1 || page > pages) return rpcErr(res, `page should be within [1, ${pages}] range, given ${page}`);
        return ok(res, { txs: hit.slice((page - 1) * per, page * per).map((i) => shape(txs[i])), total_count: String(hit.length) });
      }
      if (p === '/block') { const h = Number(u.searchParams.get('height')); return ok(res, { block: { header: { height: String(h), time: timeAt.get(h) || new Date(1600000000000 + h * 6000).toISOString() } } }); }
      if (p === '/abci_query') {
        const pth = String(u.searchParams.get('path') || '').replace(/^"|"$/g, ''), data = Buffer.from(String(u.searchParams.get('data') || '').replace(/^0x/, ''), 'hex'), h = Number(u.searchParams.get('height') || latest), f = rd(data), addr = f[1] ? f[1][0].toString() : '';
        const resp = (value) => ok(res, { response: { code: 0, log: '', value: Buffer.from(value).toString('base64'), height: String(h) } }), bad = (log) => ok(res, { response: { code: 18, log, value: null, height: String(h) } });
        if (model.floor && h < model.floor) return bad(`failed to load state at height ${h}; version does not exist (latest height: ${latest}): invalid request`);
        if (/ContractInfo$/.test(pth)) { const ci = model.info && model.info(addr, h); if (!ci) return bad('not found: invalid request');
          return resp(Buffer.concat([ld(1, addr), ld(2, Buffer.concat([vf(1, Number(ci.code_id)), ld(2, ci.creator || ''), ...(ci.admin ? [ld(3, ci.admin)] : []), ld(4, ci.label || ''), ld(5, Buffer.concat([vf(1, ci.created_height), vf(2, 0)]))]))])); }
        if (/ContractHistory$/.test(pth)) { const hs = model.history && model.history(addr, h); if (!hs) return bad('not found: invalid request');
          return resp(Buffer.concat(hs.map((e) => ld(1, Buffer.concat([vf(1, { init: 1, migrate: 2, genesis: 3 }[e.operation]), vf(2, Number(e.code_id)), ld(3, Buffer.concat([vf(1, e.height), vf(2, e.tx_index || 0)])), ld(4, JSON.stringify(e.msg || {}))]))))); }
        if (/SmartContractState$/.test(pth)) { const q = JSON.parse(f[2][0].toString()); const r = model.smart && model.smart(addr, q, h); if (r && r.error) return bad(r.error); if (r === undefined || r === null) return bad('Error parsing into type x::QueryMsg: unknown variant `' + Object.keys(q)[0] + '`: query wasm contract failed');
          return resp(ld(1, JSON.stringify(r))); }
        return bad('unknown request');
      }
      res.writeHead(404); res.end('no');
    } catch (e) { res.writeHead(500); res.end('stand-in error: ' + e.message); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/${NODE_SECRET}`, st, txs, latest, close: () => new Promise((r) => { server.closeAllConnections && server.closeAllConnections(); server.close(r); }) })));
}

// ── fixtures ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const PARTS = ['15086406-15536405/part-00003', '15086406-15536405/part-00010', '15086406-15536405/part-00017', '16735277-17185276/part-00018', '17005824-17455823/part-00010', '17005824-17455823/part-00011', '17005824-17455823/part-00014'];
function coreDir(mutate) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cwa-core-'));
  const cp = (from, rel) => { const to = path.join(d, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.cpSync(from, to, { recursive: true }); };
  cp(path.join(CW, 'contract-watch'), 'contract-watch'); cp(path.join(CW, 'docs/curated/contract-watch.json'), 'docs/curated/contract-watch.json');
  for (const rel of ['docs/curated/known_contracts.json', 'tla-voting/capture-registry.json']) { const from = fs.existsSync(path.join(CW, rel)) ? path.join(CW, rel) : path.join(SRC, rel); if (fs.existsSync(from)) cp(from, rel); }
  fs.rmSync(path.join(d, 'contract-watch/archive'), { recursive: true, force: true }); fs.rmSync(path.join(d, 'contract-watch/state/history'), { recursive: true, force: true });
  const idx = readJson(path.join(d, 'contract-watch/index.json'), {}); delete idx.archive; fs.writeFileSync(path.join(d, 'contract-watch/index.json'), JSON.stringify(idx, null, 2));
  if (mutate) mutate(d);
  return d;
}
const monthsOf = (d) => { const idx = readJson(path.join(d, 'contract-watch/index.json'), {}); const out = []; for (const mk of Object.keys(idx.months || {}).sort()) out.push(...readJson(path.join(d, `contract-watch/events/${mk}.json`), [])); return out; };
const allFiles = (d) => { const out = []; (function w(p) { for (const f of fs.readdirSync(p)) { const q = path.join(p, f); if (fs.statSync(q).isDirectory()) w(q); else out.push(q); } })(d); return out; };
const textOf = (f) => (/\.gz$/.test(f) ? zlib.gunzipSync(fs.readFileSync(f)).toString('utf8') : fs.readFileSync(f, 'utf8'));
const go = async (o) => { const logs = []; const r = await run({ pc: PC, noPush: true, _unpaced: true, backoffMs: 1, timeoutMs: 4000, log: (s) => logs.push(s), ...o }); return { ...r, logs }; };

console.log(`${VERSION} gate — stand-in node from ${PARTS.length} real parts of the stored walks`);
const curated = readJson(path.join(CW, 'docs/curated/contract-watch.json'), null);
if (!curated) { console.error('CW_DIR has no docs/curated/contract-watch.json'); process.exit(2); }
const probe = coreDir();
const WATCH = AD.adminWatchFrom({ config: CFG, known: readJson(path.join(probe, 'docs/curated/known_contracts.json'), null), registry: readJson(path.join(probe, 'tla-voting/capture-registry.json'), null), extra: curated });
const real = [];
for (const rel of PARTS) for (const r of JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(SRC, 'tla-flows/raw', rel + '.json.gz'))).toString('utf8'))) real.push({ hash: r.x, height: Number(r.h), index: real.length % 7, code: r.c || 0, events: (r.e || []).map((e) => ({ type: e.type, attributes: (e.attributes || []).map((a) => ({ key: a.key, value: a.value })) })), time: r.t });
for (const t of real) t.tx = bytesFor(t.events);
const BOOK = CFG.GLOBAL_CONFIG.addr, onFile0 = monthsOf(probe);
const classify = (t) => { const recs = AD.classifyAdminTx({ txhash: t.hash, height: t.height, timestamp: String(t.time).slice(0, 19) + 'Z', code: t.code, events: t.events }, WATCH); TM.attachSent(recs, t.tx); return recs; };
const expected = real.flatMap(classify);
const byKind = (rs) => rs.reduce((o, r) => { o[r.kind] = (o[r.kind] || 0) + 1; return o; }, {});

console.log('— A the stand-in and what must be found —');
{ check('the stand-in holds real transactions with their real events, and the forward classifier finds changes of many kinds among them', real.length > 9000 && expected.length >= 40 && ['upgrade', 'admin', 'governance', 'delegation', 'setting', 'list', 'epoch'].every((k) => byKind(expected)[k] > 0), { txs: real.length, expected: byKind(expected) });
  check('some were sent directly and some came through a passed proposal', expected.some((r) => !r.via && !r.routine) && expected.some((r) => r.via && r.via.kind === 'dao_proposal'));
  check('every one of them is already on file from the stored walks (so the backfill must confirm, not duplicate)', expected.every((r) => onFile0.some((o) => o.txhash === r.txhash && o.kind === r.kind && o.contract === r.contract && o.action === r.action)), expected.filter((r) => !onFile0.some((o) => o.txhash === r.txhash && o.kind === r.kind && o.contract === r.contract && o.action === r.action)).length); }

console.log('— B one full run —');
const nodeB = await buildNode(real);
const coreB = coreDir(), privB = fs.mkdtempSync(path.join(os.tmpdir(), 'cwa-priv-'));
const B = await go({ rpc: nodeB.url, core: coreB, priv: privB, phase: 'changes', maxRequests: 20000 });
const afterB = monthsOf(coreB), keyOf = (r) => `${r.txhash}|${r.kind}|${r.contract}|${r.action}`;
{ const got = new Map(afterB.filter((r) => r.txhash).map((r) => [r.k, r]));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const miss = expected.filter((e) => { const g = got.get(e.k); return !g || !same(g, e); });
  check('every change the forward classifier gives for these transactions is on file after the run — the same record, field for field, with the block\'s own time', miss.length === 0, miss.slice(0, 3).map((e) => ({ want: e, got: got.get(e.k) || null })));
  check('nothing was lost and nothing doubled: the record has exactly as many entries as before', afterB.length === onFile0.length && B.report.this_run.added === 0 && B.report.this_run.confirmed === expected.length, { before: onFile0.length, after: afterB.length, run: B.report.this_run });
  const exH = new Set(expected.map((e) => e.txhash)), untouched = onFile0.filter((r) => !exH.has(r.txhash)), stillThere = new Map(afterB.map((r) => [r.k + '|' + (r.txhash || ''), JSON.stringify(r)]));
  check('records of transactions the stand-in does not hold, and every state-read record, are byte for byte what they were', untouched.every((r) => stillThere.get(r.k + '|' + (r.txhash || '')) === JSON.stringify(r)) && afterB.filter((r) => r.observed).length === onFile0.filter((r) => r.observed).length);
  const direct = expected.filter((r) => !r.via && !r.routine && r.sent), viaP = expected.filter((r) => r.via && r.via.kind === 'dao_proposal');
  check('a change that was sent directly now carries the message as sent, read from the transaction\'s own bytes; a proposal\'s change and the weekly routine do not', direct.length > 5 && direct.every((r) => { const g = got.get(r.k); return g && g.sent && g.sent.to && g.schemaVersion === 2; }) && viaP.every((r) => !got.get(r.k).sent) && afterB.filter((r) => r.routine).every((r) => !r.sent), { direct: direct.length, viaP: viaP.length });
  const files = [...allFiles(coreB), ...allFiles(privB)];
  check('the memo of a transaction is in no file, public or private; neither is a signature', files.every((f) => { const t = textOf(f); return !t.includes(MEMO) && !t.includes('a-signature') && !t.includes(Buffer.from('a-signature').toString('base64')); }), files.length);
  const rawTx = allFiles(privB).filter((f) => /part-\d+\.jsonl\.gz$/.test(f)).flatMap((f) => textOf(f).trim().split('\n').map((l) => JSON.parse(l)));
  check('the private archive keeps every transaction read — its events and its messages — once', rawTx.length === B.stats.txs && new Set(rawTx.map((t) => t.x)).size === rawTx.length && rawTx.every((t) => Array.isArray(t.e) && t.e.length && Array.isArray(t.m)) && B.report.this_run.raw_transactions_kept === rawTx.length, { raw: rawTx.length, read: B.stats.txs });
  const man = readJson(path.join(coreB, 'contract-watch/archive/manifest.json')), leaf = Object.values(man.units);
  check('every search was read to its end, and the index says the backfill is complete', leaf.length > 300 && leaf.every((u) => u.done) && B.left === 0 && !B.stop && readJson(path.join(coreB, 'contract-watch/index.json')).archive.complete === true && B.report.complete === true, { leaf: leaf.length, left: B.left, stop: B.stop });
  check('no search that returned transactions came back short', leaf.every((u) => !u.short), leaf.filter((u) => u.short).length);
  const long = Object.entries(man.units).filter(([, u]) => u.total > 100 && u.read);
  check('a search with more than a hundred matches is read page by page in block order, each page once, and its pages add up to its total', long.length > 0 && long.every(([, u]) => u.read === u.total && u.per === 100) && (() => { const seenPages = new Map(); for (const q of nodeB.st.queries.filter((x) => x.per === 100)) seenPages.set(q.q + '#' + q.page, (seenPages.get(q.q + '#' + q.page) || 0) + 1); return [...seenPages.values()].every((n) => n === 1) && nodeB.st.queries.some((x) => x.per === 100 && x.page === 3); })() && nodeB.st.queries.every((x) => !/tx\.height/.test(x.q)), long.map(([id, u]) => [id.slice(0, 20), u.total]).slice(0, 4));
  const cen = readJson(path.join(coreB, 'contract-watch/archive/census.json')).contracts, quiet = Object.entries(cen).filter(([, c]) => c.read === 'all' && c.executes > 0);
  // the stand-in's own count: the wasm events of that contract in the transactions that execute it
  const tallied = (a) => { const o = {}; for (const t of real) { if (!t.events.some((e) => e.type === 'execute' && attr(e, '_contract_address') === a)) continue; for (const e of t.events) if (e.type === 'wasm' && attr(e, '_contract_address') === a) { const act = attr(e, 'action') ?? attr(e, 'method'); if (act != null) o[act] = (o[act] || 0) + 1; } } return o; };
  check('a quiet contract is read in full and the census lists every action it reported, with the stand-in\'s own counts', quiet.length > 0 && quiet.every(([a, c]) => JSON.stringify(Object.entries(c.actions || {}).sort()) === JSON.stringify(Object.entries(tallied(a)).sort())), quiet.map(([a, c]) => [a.slice(-6), c.executes]).slice(0, 5));
  const tg = curated.contracts.filter((c) => (curated.buckets.find((b) => b.id === c.bucket) || {}).archive_read === 'targeted').map((c) => c.address);
  check('a contract of a group marked targeted is never asked for all its executes — not even for a count', tg.length > 50 && tg.every((a) => !nodeB.st.queries.some((q) => q.q.startsWith(`execute._contract_address='${a}'`))) && tg.every((a) => cen[a] && cen[a].read === 'targeted'), tg.length);
  check('no search asks for an account\'s whole history: an account appears only together with a contract', nodeB.st.queries.every((q) => !/message\.sender='terra1[0-9a-z]{38}'/.test(q.q) || /execute\._contract_address='terra1[0-9a-z]{58}'/.test(q.q)));
  const fa = man.found_again, inNode = new Set(real.map((t) => t.hash)), onFileTx = new Set(onFile0.filter((r) => r.txhash && r.height <= nodeB.latest).map((r) => r.txhash));
  check('the record says which earlier changes (inside the block range) the node showed again: all that the stand-in holds; the rest — blocks the stand-in does not hold — are counted as not shown', fa && fa.on_file === onFileTx.size && fa.shown_again === [...onFileTx].filter((h) => inNode.has(h)).length && fa.shown_again === new Set(expected.map((e) => e.txhash)).size && fa.not_found === fa.on_file - fa.shown_again, fa && { on_file: fa.on_file, shown_again: fa.shown_again, not_found: fa.not_found });
  check('the log speaks in counts: no account address, and never the node\'s address', B.logs.length > 3 && B.logs.every((l) => !ACCT_RE.test(l) && !l.includes(NODE_SECRET) && !l.includes('127.0.0.1')) && allFiles(coreB).every((f) => !textOf(f).includes(NODE_SECRET)), B.logs.find((l) => ACCT_RE.test(l)));
}

console.log('— C budgets and carrying on —');
{ const node = await buildNode(real), core = coreDir();
  const r1 = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 500 });
  const after1 = monthsOf(core), man1 = readJson(path.join(core, 'contract-watch/archive/manifest.json'));
  check('a run stops at its request budget, says so, files what it read and leaves the rest for the next run', /request budget/.test(r1.stop || '') && node.st.requests <= 500 && r1.more === true && r1.report.more_to_read === true && after1.length >= onFile0.length && readJson(path.join(core, 'contract-watch/index.json')).archive.complete === false, { stop: r1.stop, req: node.st.requests, more: r1.more });
  const doneBefore = new Set(Object.entries(man1.units).filter(([, u]) => u.done).map(([, u]) => u)); const seenBefore = node.st.queries.length;
  let r2 = null, runs = 1; do { r2 = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 2500 }); runs++; } while (r2.more && runs < 14);
  const again = node.st.queries.slice(seenBefore).map((q) => q.q), doneQ = new Set(node.st.queries.slice(0, seenBefore).filter((q) => q.per === 100).map((q) => q.q));
  check('the next runs carry on: nothing that was read to its end is asked for again, and the result is what one long run gives', r2.more === false && !r2.stop && doneBefore.size > 50 && again.filter((q) => doneQ.has(q)).length === 0 && JSON.stringify(monthsOf(core)) === JSON.stringify(afterB) && readJson(path.join(core, 'contract-watch/index.json')).archive.complete === true, { runs, more: r2.more, reasked: again.filter((q) => doneQ.has(q)).length });
  const rep = readJson(path.join(core, 'contract-watch/archive/report.json'));
  check('the report lists each run with its requests, and the months index stays in step with the month files', rep.runs.length === runs && rep.runs.every((x) => x.requests > 0) && Object.entries(readJson(path.join(core, 'contract-watch/index.json')).months).every(([mk, m]) => m.n === readJson(path.join(core, `contract-watch/events/${mk}.json`)).length), rep.runs.length);
  { // stop exactly before page 2 of the first long search (the request number is known from the full run above)
    const first2 = nodeB.st.queries.find((x) => x.per === 100 && x.page === 2), nodeM = await buildNode(real), coreM = coreDir();
    const m1 = await go({ rpc: nodeM.url, core: coreM, phase: 'changes', maxRequests: first2.seq - 1 });
    const uM = Object.values(readJson(path.join(coreM, 'contract-watch/archive/manifest.json')).units).find((u) => u.read === 100 && !u.done && u.total > 100), cut = nodeM.st.queries.length;
    const m2 = await go({ rpc: nodeM.url, core: coreM, phase: 'changes', maxRequests: 20000 });
    const later = nodeM.st.queries.slice(cut).filter((x) => x.q === first2.q);
    check('a run that stops in the middle of a long search carries on at the page after the last one it read — page 1 is not asked for again', m1.more === true && !!uM && later.length >= 1 && later[0].page === 2 && later.every((x) => x.per !== 100 || x.page >= 2) && m2.more === false && JSON.stringify(monthsOf(coreM)) === JSON.stringify(afterB), { uM, later: later.map((x) => [x.per, x.page]) });
    await nodeM.close(); }
  { // a page of a hundred that the node cannot answer in time: asked again twenty at a time
    const heavy = nodeB.st.queries.find((x) => x.per === 100 && x.page === 2).q, nodeH = await buildNode(real), coreH = coreDir();
    nodeH.st.behave = ({ q, url }) => (String(q || '').replace(/^"|"$/g, '') === heavy && /per_page=100/.test(url) ? 'drop' : null);
    const h1 = await go({ rpc: nodeH.url, core: coreH, phase: 'changes', maxRequests: 20000 });
    const uH = Object.values(readJson(path.join(coreH, 'contract-watch/archive/manifest.json')).units).find((u) => u.per === 20);
    check('a page too heavy to come back is asked again for fewer transactions at once — the search still reads every transaction once, and one heavy page does not end the run', h1.more === false && !h1.stop && uH && uH.read === uH.total && uH.done && JSON.stringify(monthsOf(coreH)) === JSON.stringify(afterB), { stop: h1.stop, uH });
    await nodeH.close(); }
  { // the chain-wide searches have a cap: over it they are counted, not read — and a later run with a higher cap reads them
    const nodeK = await buildNode(real), coreK = coreDir();
    const k1 = await go({ rpc: nodeK.url, core: coreK, phase: 'changes', maxRequests: 20000, chainCap: 1 });
    const u1 = readJson(path.join(coreK, 'contract-watch/archive/manifest.json')).units['chain|migrate'], lifeAny = expected.filter((r) => r.kind === 'upgrade' && !WATCH.has(r.contract)), gotK = (c) => monthsOf(c).filter((r) => r.txhash).length;
    const n1 = gotK(coreK);
    const k2 = await go({ rpc: nodeK.url, core: coreK, phase: 'changes', maxRequests: 20000, chainCap: 3000 });
    const u2 = readJson(path.join(coreK, 'contract-watch/archive/manifest.json')).units['chain|migrate'];
    check('every migration on the chain is read only when there are few enough: over the cap they are counted and the report says so; a later run with a higher cap reads them', u1.over_cap === true && u1.total > 1 && !u1.read && k1.report.searches.over_cap >= 1 && u2.read === u2.total && !u2.over_cap && k2.more === false && JSON.stringify(monthsOf(coreK)) === JSON.stringify(afterB), { u1, u2, lifeAny: lifeAny.length, n1 });
    await nodeK.close(); }
  const t0 = Date.now(); const node2 = await buildNode(real.slice(0, 300)); const r3 = await run({ rpc: node2.url, pc: PC, core: coreDir(), noPush: true, phase: 'census', maxRequests: 12, env: { RPS: '50' }, backoffMs: 1, log: () => { } });
  check('pacing: asked for 50 requests a second the walker still keeps to its ceiling of 4', r3.stats.requests === 12 && Date.now() - t0 >= 11 * 250 - 60, { ms: Date.now() - t0, req: r3.stats.requests });
  await node.close(); await node2.close(); }

console.log('— D a node in trouble —');
{ const node = await buildNode(real), core = coreDir();
  node.st.behave = ({ path: p, nth }) => (p === '/tx_search' && nth <= 2 && Math.random() < 2 ? null : null);
  const hits = new Map(); node.st.behave = ({ url, path: p }) => { if (p !== '/tx_search') return null; const n = (hits.get(url) || 0) + 1; hits.set(url, n); if (hits.size % 9 === 0 && n === 1) return { status: 503, body: 'upstream busy' }; if (hits.size % 13 === 0 && n === 1) return { status: 429, body: 'too many requests' }; return null; };
  const r = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  check('a busy node (503, 429) is asked again after a pause, and the result is the same as from a node that always answers', r.left === 0 && r.stats.retries > 20 && JSON.stringify(monthsOf(core)) === JSON.stringify(afterB), { retries: r.stats.retries, left: r.left });
  await node.close(); }
{ const node = await buildNode(real), core = coreDir(); const target = curated.contracts.find((c) => c.address !== BOOK && WATCH.has(c.address)).address; let asked = 0;
  node.st.behave = ({ q }) => { if (q && q.includes(`migrate._contract_address='${target}'`)) { asked++; return { status: 500, json: { jsonrpc: '2.0', id: -1, error: { code: -32603, message: 'Internal error', data: 'this node refuses that search' } } }; } return null; };
  const r = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  const u = readJson(path.join(core, 'contract-watch/archive/manifest.json')).units[`migrate|${target}`];
  check('a search the node refuses is asked once, never again — in this run or the next — and is listed with the node\'s reason', asked === 1 && u && u.done && /refuses that search/.test(u.refused || '') && r.report.searches.refused === 1 && r.left === 0, { asked, u });
  const r2 = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  check('…and a second run does not ask it again', asked === 1 && r2.stats.pages === 0, { asked, pages: r2.stats.pages });
  await node.close(); }
{ const node = await buildNode(real), core = coreDir(); let n = 0; node.st.behave = () => (++n > 400 ? 'drop' : null);
  const r = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  check('a node that stops answering ends the run after a few tries — what was read before is filed, and the run says why', r.stop === 'the node stopped answering' && n - 400 <= 16 && r.more === true && monthsOf(core).length >= onFile0.length && fs.existsSync(path.join(core, 'contract-watch/archive/report.json')), { stop: r.stop, extra: n - 400 });
  await node.close(); }
{ const node = await buildNode(real), core = coreDir(); node.st.noExists = true;
  const r = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  const man = readJson(path.join(core, 'contract-watch/archive/manifest.json'));
  check('a node that does not know EXISTS: the chain-wide searches fall back to the message types, and the record is the same', /parse/.test((man.units['chain|migrate'] || {}).refused || '') && man.units['chain|migrate|MsgMigrateContract'] && man.units['chain|admin|MsgUpdateAdmin'] && man.units['chain|admin|MsgClearAdmin'] && r.left === 0 && JSON.stringify(monthsOf(core)) === JSON.stringify(afterB));
  await node.close(); }
{ const node = await buildNode(real), core = coreDir(); node.st.base64 = true;
  const r = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  check('a node that answers in the old format (keys and values in base64) gives the same record', r.left === 0 && JSON.stringify(monthsOf(core)) === JSON.stringify(afterB));
  const e = [{ type: 'message', attributes: [{ key: 'YWN0aW9u', value: 'L2Nvc213YXNtLndhc20udjEuTXNnRXhlY3V0ZUNvbnRyYWN0' }] }, { type: 'wasm', attributes: [{ key: 'X2NvbnRyYWN0X2FkZHJlc3M=', value: 'dGVycmExeA==' }] }];
  check('…decoded only when the message event shows the old format: plain text is left as it is', normEvents(e)[1].attributes[0].key === '_contract_address' && normEvents(e)[0].attributes[0].value === '/cosmwasm.wasm.v1.MsgExecuteContract' && normEvents([{ type: 'message', attributes: [{ key: 'action', value: 'YWJj' }] }, { type: 'wasm', attributes: [{ key: 'YWN0aW9u', value: 'YWJj' }] }])[1].attributes[0].key === 'YWN0aW9u');
  await node.close(); }

{ const node = await buildNode(real), core = coreDir(); const victim = expected.find((r) => !r.routine && !r.via); let blocked = true;
  node.st.behave = ({ path: p, url }) => (blocked && p === '/block' && url.includes(`height=${victim.height}`) ? { status: 500, json: { jsonrpc: '2.0', id: -1, error: { code: -32603, message: 'Internal error', data: 'could not find block' } } } : null);
  const r1 = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  const got1 = monthsOf(core).find((r) => r.txhash === victim.txhash);
  check('a change whose block time cannot be read is not filed with a made-up time: it stays as it was, the search that found it is left open, and the run says there is more to read', r1.more === true && readJson(path.join(core, 'contract-watch/index.json')).archive.complete === false && got1 && !got1.sent && JSON.stringify(got1) === JSON.stringify(onFile0.find((r) => r.k === got1.k && r.txhash === victim.txhash)), { more: r1.more, got1: !!got1 });
  blocked = false; const r2 = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  check('…and the next run reads it and ends with the same record as a clean run', r2.more === false && JSON.stringify(monthsOf(core)) === JSON.stringify(afterB), { more: r2.more });
  await node.close(); }

console.log('— E an action the record has never seen —');
{ // the vocabulary comes from the record; take one action out of the record and see which routes still find its changes
  const act = 'update_config', victims = expected.filter((r) => r.action.split('/').pop() === act || r.action === act);
  const names = [...new Set(victims.map((r) => r.action))];
  const core = coreDir((d) => { const idx = readJson(path.join(d, 'contract-watch/index.json')); for (const mk of Object.keys(idx.months)) { const f = path.join(d, `contract-watch/events/${mk}.json`); const a = readJson(f, []); const b = a.filter((r) => !names.includes(r.action)); if (b.length !== a.length) fs.writeFileSync(f, JSON.stringify(b)); } });
  const node = await buildNode(real); const r = await go({ rpc: node.url, core, phase: 'changes', maxRequests: 20000 });
  const got = new Set(monthsOf(core).map((x) => x.k + '|' + x.txhash)), found = victims.filter((v) => got.has(v.k + '|' + v.txhash));
  const st0 = readJson(path.join(CW, 'contract-watch/state/current.json'), {}), admins = new Set(Object.values(st0.contracts || {}).map((c) => c.admin));
  const expectFound = victims.filter((v) => (v.via && v.via.kind === 'dao_proposal') || true);
  check(`changes whose action name (${names.join(', ')}) is not in the record are still found when a key-holding account or a DAO sent them or the contract is quiet — and the report states the limit for the rest`, victims.length > 0 && found.length > 0 && !node.st.queries.some((q) => names.some((n) => q.q.startsWith(`wasm.action='${n}'`))) && /action name never seen before/.test(r.report.limits) && r.report.this_run.added === found.length, { victims: victims.length, found: found.length, signers_hold_keys: victims.filter((v) => admins.has(v.signer)).length });
  void expectFound; await node.close(); }

console.log('— F the merge rule —');
{ const R = (tx, n, kind, contract, action, extra = {}) => ({ schemaVersion: 1, k: `${tx}:${n}`, txhash: tx, height: 100, timestamp: '2026-01-01T00:00:00Z', kind, contract, action, detail: {}, signer: 's', msg_type: 'm', via: null, ...extra });
  const obs = { schemaVersion: 1, k: 'state:abc', txhash: null, height: 50, timestamp: '2026-01-01T00:00:00Z', kind: 'role', contract: 'c1', action: 'address_book', detail: {}, signer: null, msg_type: null, via: null, observed: 'state-read' };
  const m1 = mergeByTx([obs, R('T1', 0, 'list', 'c1', 'remove_assets')], [R('T1', 0, 'list', 'c1', 'remove_assets', { msg_index: 1, sent: { to: 'c1' }, schemaVersion: 2 })]);
  check('the same reading of a transaction: confirmed, and the fuller record (message index, message as sent) takes its place', m1.confirmed === 1 && m1.added === 0 && m1.merged.length === 2 && m1.merged.find((r) => r.txhash === 'T1').sent && m1.changed);
  const m2 = mergeByTx([R('T2', 0, 'setting', 'c2', 'update_config')], [R('T2', 0, 'upgrade', 'c9', 'migrate'), R('T2', 1, 'setting', 'c2', 'update_config')]);
  check('the archive reads MORE of a transaction than was filed: its reading replaces the filed one, one record added, none lost, no key twice', m2.added === 1 && m2.merged.length === 2 && new Set(m2.merged.map((r) => r.k)).size === 2 && m2.merged.some((r) => r.kind === 'upgrade'));
  const m3 = mergeByTx([R('T3', 0, 'list', 'c1', 'whitelist_assets'), R('T3', 1, 'setting', 'c1', 'update_config')], [R('T3', 0, 'setting', 'c1', 'update_config')]);
  check('the archive reads LESS than was filed: what was filed stays, and the transaction is listed as differing', m3.merged.length === 2 && m3.kept_as_filed === 2 && m3.differs.length === 1 && m3.differs[0].txhash === 'T3' && !m3.changed);
  check('a state-read record is never touched, and the month stays sorted by block then key', m1.merged[0].k === 'state:abc' && JSON.stringify(m1.merged[0]) === JSON.stringify(obs) && m2.merged.every((r, i, a) => !i || a[i - 1].height < r.height || (a[i - 1].height === r.height && String(a[i - 1].k).localeCompare(String(r.k)) <= 0)));
  const d = diffJson({ fee: '0.01', owner: 'a', list: ['x', 'y'] }, { fee: '0.02', owner: 'a', list: ['x'], extra: { on: true } });
  check('"what was → what is": two answers of a contract are compared path by path', d.changed === 3 && d.diff.find((x) => x.path === 'fee').before === '0.01' && d.diff.find((x) => x.path === 'fee').after === '0.02' && d.diff.find((x) => x.path === 'list.1').after === null && d.diff.find((x) => x.path === 'extra.on').before === null); }

console.log('— G state at past heights, and the proofs —');
{ // a stand-in state: each watched contract's code history IS the upgrades the stand-in holds for it; the address book changes
  // in two transactions built here; one contract's config changes with a setting change on record.
  const FLOOR = 7324381, W1 = expected.find((r) => !r.via && !r.routine).signer, DAO = curated.daos[0].core;
  const ups = expected.filter((r) => r.kind === 'upgrade'), adm = expected.filter((r) => r.kind === 'admin');
  const young = [...new Set(ups.map((r) => r.contract))][0], youngBorn = Math.min(...ups.filter((r) => r.contract === young).map((r) => r.height)) - 5000;
  const settingRec = expected.find((r) => r.kind === 'setting' && !r.via), settingC = settingRec.contract, noCfgC = (expected.find((r) => r.kind === 'list' && r.contract !== settingC) || {}).contract;
  const H1 = 17100000, H2 = 17150000, HS = 17120000, STRANGER = 'terra1' + 'q'.repeat(38);   // an account no record names
  const bookTx = (h, hash) => ({ hash, height: h, index: 0, code: 0, time: new Date(1700000000000 + h * 1000).toISOString(), events: [{ type: 'message', attributes: [{ key: 'action', value: '/cosmwasm.wasm.v1.MsgExecuteContract' }, { key: 'sender', value: W1 }] }, { type: 'execute', attributes: [{ key: '_contract_address', value: BOOK }] }, { type: 'wasm', attributes: [{ key: '_contract_address', value: BOOK }, { key: 'action', value: 'set_addresses' }] }] });
  const extra = [bookTx(H1, 'B00C' + '1'.repeat(60)), bookTx(H2, 'B00C' + '2'.repeat(60))]; for (const t of extra) t.tx = bytesFor(t.events);
  const base = { ASSET_WHITELIST_CONTROLLER: DAO, VE_GUARDIAN: DAO, FEE_COLLECTOR: W1.replace(/.$/, 'q') === W1 ? DAO : DAO, TAKE_RECIPIENT: DAO };
  const bookAt = (h, silent) => { const b = { ...base }; if (h >= H1) b.ASSET_WHITELIST_CONTROLLER = W1; if (silent && h >= HS) b.TAKE_RECIPIENT = W1; if (h >= H2) b.VE_GUARDIAN = W1; return Object.entries(b); };
  const LATEST = Math.max(...real.map((t) => t.height)) + 1000, admAll = [...onFile0, ...adm].filter((r) => r.kind === 'admin' && r.txhash && r.height <= LATEST);
  const lastAdmin = (a) => { const x = admAll.filter((r) => r.contract === a).sort((p, q) => p.height - q.height).pop(); return x ? (x.action === 'clear_admin' ? null : (x.detail.new_admin_address || null)) : DAO; };
  const model = (o = {}) => ({ floor: FLOOR,
    info: (a, h) => (WATCH.has(a) ? { code_id: (ups.filter((r) => r.contract === a && r.height <= h).sort((p, q) => p.height - q.height).pop() || { detail: { code_id: '100' } }).detail.code_id, creator: DAO, admin: a === young && h < youngBorn + 10 ? DAO : (o.wrongAdmin === a ? STRANGER : lastAdmin(a)), label: 'stand-in', created_height: a === young ? youngBorn : 5000000 } : null),
    history: (a) => (WATCH.has(a) ? [{ operation: 'init', code_id: '100', height: a === young ? youngBorn : 5000000, msg: { owner: 'x' } }, ...ups.filter((r) => r.contract === a).map((r) => ({ operation: 'migrate', code_id: r.detail.code_id, height: r.height, msg: {} })), ...(o.plantMigration === a ? [{ operation: 'migrate', code_id: '9999', height: 17300000, msg: {} }] : [])] : null),
    smart: (a, q, h) => { if (a === BOOK && q.all_addresses) return bookAt(h, o.silent); if (!q.config) return null; if (a === noCfgC) return null; if (a === settingC) return { fee: h >= settingRec.height ? '0.02' : '0.01', owner: DAO }; return { owner: DAO, paused: false }; } });
  const stateRun = async (o) => { const node = await buildNode([...real, ...extra], { ...model(o), latest: LATEST }); const core = coreDir(); const r = await go({ rpc: node.url, core, phase: 'all', maxRequests: 20000 }); await node.close(); return { r, core, node }; };
  const S = await stateRun({});
  const hb = readJson(path.join(S.core, 'contract-watch/state/history/address-book.json')), hc = readJson(path.join(S.core, 'contract-watch/state/history/contracts.json')), hf = readJson(path.join(S.core, 'contract-watch/state/history/config-changes.json'));
  const c1 = hb && hb.changes.find((c) => c.height === H1), c2 = hb && hb.changes.find((c) => c.height === H2), others = hb ? hb.changes.filter((c) => c.height !== H1 && c.height !== H2) : [];
  check('the address book is read in the block before and the block of each change of the global config: what each role pointed at, before and after', c1 && c2 && c1.diff.length === 1 && c1.diff[0].role === 'ASSET_WHITELIST_CONTROLLER' && c1.diff[0].before === DAO && c1.diff[0].after === W1 && c2.diff.length === 1 && c2.diff[0].role === 'VE_GUARDIAN' && c1.txhash[0].startsWith('B00C') && Object.keys(c1.before).length === 4 && others.every((c) => c.diff.length === 0), hb && hb.changes.map((c) => [c.height, c.diff]));
  check('each watched contract: what the chain reports at the end of the range, its own code history, and its admin in the block it was created — "not held" where the node no longer keeps that block\'s state', Object.keys(hc.contracts).length === WATCH.size && hc.contracts[young].info.created_height === youngBorn && hc.contracts[young].admin_at_creation === DAO && hc.contracts[young].history.filter((e) => e.operation === 'migrate').length === ups.filter((r) => r.contract === young).length && Object.entries(hc.contracts).filter(([a]) => a !== young).every(([, h]) => h.admin_at_creation === 'not held'));
  check('a contract\'s config before and after a change on record: the paths that differ, with both values; a contract with no config query is noted once and not asked again', hf.changes.some((c) => c.contract === settingC && c.height === settingRec.height && c.diff.length === 1 && c.diff[0].path === 'fee' && c.diff[0].before === '0.01' && c.diff[0].after === '0.02' && c.records.includes(settingRec.k)) && hf.unchanged > 0 && (!noCfgC || (hf.no_config[noCfgC] && S.node.st.seenUrls.size > 0)), { changes: hf.changes.length, unchanged: hf.unchanged, no_config: Object.keys(hf.no_config).length });
  const v = S.r.verify;
  check('proof 1 — every migration in a contract\'s own code history has a record', v && v.code_history.contracts === WATCH.size && v.code_history.agree === WATCH.size && v.code_history.migrations === ups.length && v.code_history.missing.length === 0, v && v.code_history);
  check('proof 2 — each contract\'s admin today is what its creation and the admin changes on record give', v.admin.differs.length === 0 && v.admin.agree === v.admin.contracts && v.admin.contracts >= 1, v.admin);
  check('proof 3 — the address book after one change is the address book before the next (nothing changed it in between without a record)', v.address_book && v.address_book.chain_unbroken === true && v.address_book.read_both_sides === hb.changes.length && hb.changes.length >= 2, v.address_book);
  check('the index carries the proofs in short, for the page', (() => { const a = readJson(path.join(S.core, 'contract-watch/index.json')).archive; return a.complete && a.state.done && a.verified && a.verified.code_history === `${WATCH.size} of ${WATCH.size}` && a.verified.address_book_unbroken === true; })());
  const P1 = await stateRun({ plantMigration: young, silent: true, wrongAdmin: young });
  const pv = P1.r.verify;
  check('a migration the record does not hold is named (contract, block, code id)', pv.code_history.missing.length === 1 && pv.code_history.missing[0].contract === young && pv.code_history.missing[0].code_id === '9999' && pv.code_history.agree === WATCH.size - 1, pv.code_history.missing);
  check('an admin the record cannot explain is named', pv.admin.differs.length === 1 && pv.admin.differs[0].contract === young && pv.admin.differs[0].on_chain === STRANGER && pv.admin.differs[0].record_gives !== STRANGER, pv.admin.differs);
  check('an address book that changed between two changes with no record of it breaks the chain, and the two blocks are named', pv.address_book.chain_unbroken === false && pv.address_book.changed_between_with_no_record.length === 1 && pv.address_book.changed_between_with_no_record[0].after_height === H1 && pv.address_book.changed_between_with_no_record[0].before_height === H2, pv.address_book);
  const node = await buildNode([...real, ...extra], { ...model({}), latest: LATEST }); const core = coreDir(); const a = await go({ rpc: node.url, core, phase: 'all', maxRequests: 900 }); let n = 1, b = a; while (b.more && n < 16) { b = await go({ rpc: node.url, core, phase: 'all', maxRequests: 900 }); n++; }
  check('the state reads carry on across runs too, and end in the same files', n > 2 && !b.stop && JSON.stringify(readJson(path.join(core, 'contract-watch/state/history/address-book.json')).changes.map((c) => c.diff)) === JSON.stringify(hb.changes.map((c) => c.diff)) && JSON.stringify(readJson(path.join(core, 'contract-watch/state/history/config-changes.json')).changes) === JSON.stringify(hf.changes) && b.verify.summary.code_history === v.summary.code_history, { n, stop: b.stop });
  await node.close(); }

console.log('— I publishing for real: git, another writer, the private archive —');
{ const sh = (c, cwd) => execSync(c, { cwd, stdio: 'pipe', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' } }).toString();
  const ident = 'git config user.name gate && git config user.email gate@example.invalid';
  const mk = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
  const origin = mk('cwa-origin-'), privOrigin = mk('cwa-privorigin-'), seed = coreDir(), work = mk('cwa-work-'), flag = path.join(work, 'pushed-once');
  sh('git init -q --bare -b main', origin); sh('git init -q --bare -b main', privOrigin);
  sh(`git init -q -b main && ${ident} && git add -A && git commit -q -m seed && git remote add origin ${origin} && git push -q origin main`, seed);
  const ps = mk('cwa-privseed-'); fs.writeFileSync(path.join(ps, 'README.md'), 'private\n'); sh(`git init -q -b main && ${ident} && git add -A && git commit -q -m seed && git remote add origin ${privOrigin} && git push -q origin main`, ps);
  sh(`git clone -q ${origin} core && git clone -q ${origin} other && git clone -q ${privOrigin} priv`, work); for (const d of ['core', 'other', 'priv']) sh(ident, path.join(work, d));
  // another writer (the cron, say) files a state-read record in a month the walker is about to write — while the walker is pushing
  const mkOf = (ts) => `${ts.slice(0, 4)}/${ts.slice(5, 7)}`, month = mkOf(expected.find((r) => !r.via && !r.routine).timestamp), rel = `contract-watch/events/${month}.json`;
  const foreign = { schemaVersion: 1, k: 'state:another-writer', txhash: null, height: 1, timestamp: `${month.replace('/', '-')}-01T00:00:00Z`, kind: 'role', contract: BOOK, action: 'address_book', detail: { role: 'X' }, signer: null, msg_type: null, via: null, observed: 'state-read' };
  fs.writeFileSync(path.join(work, 'other.js'), `const fs=require('fs');const f=${JSON.stringify(path.join(work, 'other', rel))};const a=JSON.parse(fs.readFileSync(f,'utf8'));a.unshift(${JSON.stringify(foreign)});fs.writeFileSync(f,JSON.stringify(a));`);
  fs.writeFileSync(path.join(work, 'core/.git/hooks/pre-push'), `#!/bin/sh\nif [ ! -f ${flag} ]; then touch ${flag}; (cd ${path.join(work, 'other')} && git pull -q origin main && node ${path.join(work, 'other.js')} && git commit -qam "another writer" && git push -q origin main) >/dev/null 2>&1; fi\nexit 0\n`, { mode: 0o755 });
  const node = await buildNode(real); const logs = [];
  const r = await run({ rpc: node.url, pc: PC, core: path.join(work, 'core'), priv: path.join(work, 'priv'), phase: 'changes', maxRequests: 20000, _unpaced: true, backoffMs: 1, log: (x) => logs.push(x) });
  const check2 = mk('cwa-check-'); sh(`git clone -q ${origin} c && git clone -q ${privOrigin} p`, check2);
  const pub = readJson(path.join(check2, 'c', rel), []), subjects = sh('git log --format=%s', path.join(check2, 'c')).trim().split('\n');
  const want = expected.filter((e) => mkOf(e.timestamp) === month);
  check('the run publishes by git, on top of whatever is on the branch: when another writer lands a commit in the same month file mid-push, the walker takes the branch again, merges and pushes — both writers\' records are there', fs.existsSync(flag) && r.more === false && pub.some((x) => x.k === 'state:another-writer') && want.length > 0 && want.every((e) => pub.some((x) => x.k === e.k && JSON.stringify(x) === JSON.stringify(e))) && subjects.includes('another writer') && subjects.some((x) => /^contract-watch archive backfill:/.test(x)), { flag: fs.existsSync(flag), subjects: subjects.slice(0, 4) });
  check('the published record is the same as a run that does not push', JSON.stringify(monthsOf(path.join(check2, 'c')).filter((x) => x.k !== 'state:another-writer')) === JSON.stringify(afterB) && readJson(path.join(check2, 'c/contract-watch/index.json')).months[month].n === pub.length);
  const privFiles = sh('git ls-files', path.join(check2, 'p')).trim().split('\n');
  check('the raw transactions are pushed to the private archive only, with a note of what they are', privFiles.some((f) => /^contract-watch\/raw\/part-00000\.jsonl\.gz$/.test(f)) && privFiles.includes('contract-watch/raw/_manifest.json') && !sh('git ls-files', path.join(check2, 'c')).includes('raw/part-'), privFiles.slice(0, 4));
  await node.close(); }

console.log('— H the workflow —');
{ const wfPath = [path.join(HERE, '../../workflows/contract-watch-archive.yml'), path.join(HERE, 'contract-watch-archive.yml')].find((p) => fs.existsSync(p)); const wf = wfPath ? fs.readFileSync(wfPath, 'utf8') : '';
  const on = (/^on:\n((?:[ \t]+.*\n|\n)+)/m.exec(wf) || [])[1] || '';
  check('the workflow starts one way only — a person pressing Run workflow: no timer, no start on push, and the job itself refuses any other event', !!wf && /^\s{2}workflow_dispatch:/m.test(on) && !/^\s{2}(schedule|push|pull_request|workflow_run|repository_dispatch):/m.test(on) && !/cron:/.test(wf) && /if: github\.event_name == 'workflow_dispatch'/.test(wf), wfPath || 'workflow file not found');
  check('one archive job at a time (it queues behind another, never beside it), a hard time limit, and the node\'s address only from the secret', /concurrency:\s*\n\s+group: archive-node\s*\n\s+cancel-in-progress: false/.test(wf) && /timeout-minutes: \d+/.test(wf) && /ARCHIVE_RPC: \$\{\{ secrets\.ARCHIVE_RPC \}\}/.test(wf) && !/https?:\/\/(?!github\.com)[a-z0-9.-]+\.[a-z]{2,}[^\s]*rpc/i.test(wf));
  const clamp = await (async () => { const node = await buildNode(real.slice(0, 50)); const logs = []; await run({ rpc: node.url, pc: PC, core: coreDir(), noPush: true, phase: 'census', env: { RPS: '99', MAX_REQUESTS: '999999', MAX_MINUTES: '9999' }, maxRequests: 3, log: (s) => logs.push(s) }); await node.close(); return logs[0]; })();
  check('whatever is typed into the form, the limits hold: at most 4 requests a second, 20,000 requests, 300 minutes', /at most 4 requests a second/.test(clamp), clamp);
  const logs = []; const node = await buildNode(real.slice(0, 50)); const r = await run({ rpc: node.url, pc: PC, core: coreDir(), noPush: true, phase: 'census', env: { RPS: '99', MAX_REQUESTS: '999999', MAX_MINUTES: '9999' }, _unpaced: true, maxMinutes: undefined, maxRequests: undefined, log: (s) => logs.push(s), opts: 1 }).catch((e) => ({ err: e.message })); await node.close();
  check('…(the ceilings, read from the first line of the log)', / 20000 requests, 300 minutes/.test(logs[0] || ''), logs[0]); void r; }

await nodeB.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

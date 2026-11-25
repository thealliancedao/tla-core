// mock-layer1.mjs — gate for walk.mjs 2.2.0: MODE=cohort (the wider rule; a walked wallet is never dropped) and MODE=layer1 with a
// top-up (TOPUP=<label>). A made-up node and made-up public files on localhost; a small archive on disk. No network, no push.
// Run: node mock-layer1.mjs
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import http from 'http'; import os from 'os'; import { execFile } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)); let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (x !== undefined ? '  ← ' + JSON.stringify(x).slice(0, 300) : '')); } };
const addr = (c) => 'terra1' + c.repeat(38); const ADAO = addr('q'), BIG = addr('p'), SMALL = addr('z'), PNL = addr('r'), OLD = addr('y'), QUIET = addr('x');
// transactions each wallet sent, by height
const TXS = { [ADAO]: [10, 50, 120, 130], [BIG]: [5, 6], [SMALL]: [7], [PNL]: [8, 9, 300], [OLD]: [20, 100, 101, 250, 251], [QUIET]: [40] };
const tx = (w, h) => ({ hash: 'H' + w.slice(6, 8).toUpperCase() + String(h).padStart(6, '0'), height: String(h), index: 0, tx_result: { code: 0, gas_wanted: '1', gas_used: '1', events: [{ type: 'message', attributes: [{ key: 'sender', value: w }] }] } });
const seen = []; let failFor = null;
const srv = http.createServer((req, res) => { const u = new URL(req.url, 'http://x'); const send = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/tx_search') { const q = u.searchParams.get('query').replace(/^"|"$/g, ''); seen.push(q); const m = /^([^=']+)='(terra1[0-9a-z]+)'(?: AND tx\.height>(\d+))?$/.exec(q); if (!m) return send(400, { error: { data: 'bad query ' + q } });
    if (failFor && m[2] === failFor && m[1] === 'transfer.recipient') return send(400, { error: { data: 'made-up failure' } });
    const list = m[1] === 'message.sender' ? (TXS[m[2]] || []).filter(h => !m[3] || h > Number(m[3])).map(h => tx(m[2], h)) : []; return send(200, { result: { total_count: String(list.length), txs: list } }); }
  const p = u.pathname;
  if (p === '/nft-collections/main/adao/ledger/by-wallet/index.json') return send(200, { shards: { a: 1 } });
  if (p === '/nft-collections/main/adao/ledger/by-wallet/a.json') return send(200, { wallets: { [ADAO]: { holdings_now: { tokens: [{ state: 'held' }] } } } });
  if (p === '/nft-collections/main/pixel-lions/ledger/by-wallet/index.json') return send(200, { shards: {} });
  if (p === '/nft-collections/main/burning-lions/snapshots/nfts.json') return send(200, { records: [] });
  if (p === '/tla-core/main/member-data/participants/current.json') return send(200, { members: [{ wallet: BIG, summary: { voting_power_human: 200000 }, locks: [{ is_auto_max_locked: true }] }, { wallet: SMALL, summary: { voting_power_human: 5 }, locks: [] }] });
  if (p === '/tla-core/main/tla-flows/pnl/rollup.json') return send(200, { wallets: [{ address: PNL }, { address: 'not-an-address' }, { address: SMALL }] });
  send(404, { message: 'not found ' + p }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port;
const AR = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-')); const A = (p) => path.join(AR, p); const J = (p) => JSON.parse(fs.readFileSync(A(p), 'utf8'));
const wr = (p, o) => { fs.mkdirSync(path.dirname(A(p)), { recursive: true }); fs.writeFileSync(A(p), typeof o === 'string' || Buffer.isBuffer(o) ? o : JSON.stringify(o)); };
const partOf = (w, n) => `layer1/${w.slice(-1)}/${w}/part-${String(n).padStart(3, '0')}.jsonl.gz`; const rows = (p) => zlib.gunzipSync(fs.readFileSync(A(p))).toString('utf8').trim().split('\n').map(l => JSON.parse(l));
const gz = (list) => zlib.gzipSync(list.map(x => JSON.stringify(x)).join('\n') + '\n');
// the archive as the September walk left it: OLD and QUIET were in the cohort (they are in no public product today), ADAO too — all three walked
wr('cohort/current.json', { cut_day: '2026-09-29', wallets: { [OLD]: ['adao'], [QUIET]: ['adao'], [ADAO]: ['adao'] } });
wr(partOf(OLD, 0), gz([{ h: 20, x: 'OLD20' }, { h: 100, x: 'OLD100' }])); wr(partOf(QUIET, 0), gz([{ h: 40, x: 'Q40' }])); wr(partOf(ADAO, 0), gz([{ h: 10, x: 'A10' }, { h: 50, x: 'A50' }]));
wr('layer1/_manifest.json', { wallets: { [OLD]: { done: true, txs: 2, parts: 1, to_height: 100 }, [QUIET]: { done: true, txs: 1, parts: 1, to_height: 40 }, [ADAO]: { done: true, txs: 2, parts: 1, to_height: 50 } } });
const oldPart0 = fs.readFileSync(A(partOf(OLD, 0)));
const run = (env) => new Promise((res) => { seen.length = 0; execFile('node', [path.join(here, 'walk.mjs')], { cwd: AR, env: { ...process.env, ARCHIVE_DIR: AR, RAW_BASE: base, ARCHIVE_RPC: base, NO_PUSH: '1', CONCURRENCY: '2', MAX_MINUTES: '5', ...env }, maxBuffer: 1 << 24 }, (e, so, se) => res({ code: e ? e.code || 1 : 0, out: String(so) + String(se) })); });

console.log('A. cohort — everyone who has used the Liquidity Alliance; a walked wallet is never dropped');
{ const r = await run({ MODE: 'cohort' }); const C = J('cohort/current.json'); const w = C.wallets;
  ok(r.code === 0 && [ADAO, BIG, SMALL, PNL, OLD, QUIET].every(a => w[a]) && Object.keys(w).length === 6, 'the cohort is the union: NFT holders, big locks, everyone in the P&L record, everyone with a lock or position now, and the wallets of the earlier cohort', [r.code, Object.keys(w).length, r.out.slice(-200)]);
  ok(w[PNL].includes('tla_participant') && w[SMALL].includes('tla_participant') && w[BIG].includes('tla_participant') && w[BIG].includes('automax_vp100k') && !w[OLD].includes('tla_participant'), 'each wallet carries why it is in: the P&L record or a position → tla_participant; the big lock keeps its own rule too');
  ok(w[OLD].join() === 'earlier_cohort' && w[QUIET].join() === 'earlier_cohort' && w[ADAO].includes('adao') && w[ADAO].includes('earlier_cohort'), 'a wallet that is in no public product today stays in because it was walked before');
  ok(!Object.keys(w).some(a => !/^terra1[02-9ac-hj-np-z]{38}$/.test(a)) && C.rules.length === 6 && C.counts.union === 6 && C.counts.tla_participant === 3, 'a malformed address in a source is left out; the rules and the counts are on the file', C.counts); }

console.log('B. layer1 without a top-up — only the new wallets are walked, from the start');
{ const r = await run({ MODE: 'layer1' }); const M = J('layer1/_manifest.json').wallets;
  ok(r.code === 0 && [BIG, SMALL, PNL].every(a => M[a] && M[a].done) && M[PNL].txs === 3 && M[PNL].to_height === 300 && rows(partOf(PNL, 0)).map(x => x.h).join() === '8,9,300', 'the three new wallets are walked in full', [r.code, r.out.slice(-300)]);
  ok(!seen.some(q => / AND tx\.height>/.test(q)) && !seen.some(q => q.includes(OLD) || q.includes(QUIET) || q.includes(ADAO)), 'no walked wallet is searched again, and no search is cut at a height');
  ok(fs.readFileSync(A(partOf(OLD, 0))).equals(oldPart0) && M[OLD].txs === 2 && M[OLD].topped === undefined, 'what the first walk stored is untouched');
  ok(/3 new, 0 to top up \(no top-up asked for\)/.test(r.out) && /0 wallet\(s\) still to walk or top up — layer1 is complete/.test(r.out), 'the log says how many are new, how many are topped up, and whether layer1 is complete'); }

console.log('C. layer1 with a top-up — a walked wallet is searched only above the height it was walked to, and the new transactions are appended');
{ fs.mkdirSync(path.dirname(A(partOf(OLD, 7))), { recursive: true }); wr(partOf(OLD, 7), gz([{ h: 999, x: 'STRAY' }]));   // a part left by a top-up that stopped half-way
  failFor = ADAO; const r = await run({ MODE: 'layer1', TOPUP: '2026-11-25' }); const M = J('layer1/_manifest.json').wallets; const qs = seen.slice();
  ok(r.code === 0 && qs.filter(q => q.includes(OLD)).every(q => q.endsWith(' AND tx.height>100')) && qs.filter(q => q.includes(QUIET)).every(q => q.endsWith(' AND tx.height>40')) && qs.filter(q => q.includes(PNL)).every(q => q.endsWith(' AND tx.height>300')), 'every search of a walked wallet is cut at its own height', [r.code, qs.filter(q => q.includes(OLD))[0], r.out.slice(-300)]);
  ok(fs.readFileSync(A(partOf(OLD, 0))).equals(oldPart0) && rows(partOf(OLD, 1)).map(x => x.h).join() === '101,250,251' && !fs.existsSync(A(partOf(OLD, 7))), 'the new transactions are a further part; the first part is byte for byte what it was; the stray part of a stopped top-up is gone');
  ok(M[OLD].txs === 5 && M[OLD].parts === 2 && M[OLD].to_height === 251 && M[OLD].topped === '2026-11-25' && M[OLD].topup_txs === 3 && M[OLD].topup_from === 100 && M[OLD].done === true, 'the manifest adds up: 2 + 3 transactions, 2 parts, walked to 251, topped under the label', M[OLD]);
  ok(M[QUIET].topped === '2026-11-25' && M[QUIET].txs === 1 && M[QUIET].parts === 1 && M[QUIET].to_height === 40 && !fs.existsSync(A(partOf(QUIET, 1))), 'a wallet with nothing new is marked topped and gains no part', M[QUIET]);
  ok(M[ADAO].topped === undefined && M[ADAO].txs === 2 && M[ADAO].to_height === 50 && M[ADAO].parts === 1 && !!M[ADAO].topup_failed_at && M[ADAO].done === true, 'a wallet whose top-up had a failed search keeps its record as it was — nothing half-counted', M[ADAO]);
  ok(/wallet\(s\) still to walk or top up — run layer1 again with the same settings/.test(r.out) && /1 wallet\(s\) still/.test(r.out), 'the log says one wallet is left and to run again');
  failFor = null; const r2 = await run({ MODE: 'layer1', TOPUP: '2026-11-25' }); const M2 = J('layer1/_manifest.json').wallets;
  ok(r2.code === 0 && seen.every(q => q.includes(ADAO)) && M2[ADAO].topped === '2026-11-25' && M2[ADAO].txs === 4 && M2[ADAO].to_height === 130 && rows(partOf(ADAO, 1)).map(x => x.h).join() === '120,130' && /layer1 is complete/.test(r2.out), 'the next run with the same label does only what was left, from the same height, and then says complete', [M2[ADAO], seen.length]);
  const r3 = await run({ MODE: 'layer1', TOPUP: '2026-11-25' });
  ok(r3.code === 0 && seen.length === 0 && /0 wallets to walk/.test(r3.out), 'run again with the same label: nothing is searched');
  const hashes = [0, 1].flatMap(n => rows(partOf(OLD, n)).map(x => x.x)); ok(new Set(hashes).size === hashes.length, 'no transaction is stored twice across the parts'); }
srv.close(); console.log(`\ndeep-walk mock-layer1: ${pass}/${pass + fail}` + (fail ? ' — FAILED' : '')); process.exit(fail ? 1 : 0);

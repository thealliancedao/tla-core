#!/usr/bin/env node
// mock-run — the gate of contract-watch-guards: the script against a stand-in public node that answers the way the real
// contracts answer (the refusal texts are the chain's own, taken from a probe of 2026-10-01), on the real record and the
// real governance captures. Usage: CW_DIR=<tla-core checkout> TLA_CORE_DIR=<older checkout for the registries> DAOO_DIR=<dao-originations checkout> PLATFORM_CRONS_DIR=<platform-crons> node mock-run.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
import { run, txBytes, classify, VERSION } from './guards.mjs';
const require = createRequire(import.meta.url), HERE = path.dirname(fileURLToPath(import.meta.url));
const CW = process.env.CW_DIR, SRC = process.env.TLA_CORE_DIR || CW, DAOO = process.env.DAOO_DIR, PC = process.env.PLATFORM_CRONS_DIR;
if (!CW || !PC || !DAOO) { console.error('usage: CW_DIR=… DAOO_DIR=… PLATFORM_CRONS_DIR=… node mock-run.mjs'); process.exit(2); }
const TM = require(path.join(PC, 'tla-flows/lib/tx-messages.js'));
let pass = 0, fail = 0; const check = (n, ok, d) => { if (ok) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '\n      ' + JSON.stringify(d).slice(0, 600) : '')); } };
const J = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const curated = J(path.join(CW, 'docs/curated/contract-watch.json')), st = J(path.join(CW, 'contract-watch/state/current.json'));
const captures = Object.fromEntries((curated.daos || []).map((d) => [d.capture, J(path.join(DAOO, d.capture, 'governance/proposals.json'), null)]));
const coreDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cwg-')); const cp = (from, rel) => { if (!fs.existsSync(from)) return; const to = path.join(d, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.cpSync(from, to, { recursive: true }); };
  cp(path.join(CW, 'contract-watch'), 'contract-watch'); cp(path.join(CW, 'docs/curated'), 'docs/curated'); cp(fs.existsSync(path.join(CW, 'tla-voting/capture-registry.json')) ? path.join(CW, 'tla-voting/capture-registry.json') : path.join(SRC, 'tla-voting/capture-registry.json'), 'tla-voting/capture-registry.json'); fs.rmSync(path.join(d, 'contract-watch/guards.json'), { force: true }); return d; };
// the stand-in node: an account for any address; a simulation answered by the name of the call, in the chain's own words
const TAIL = ': execute wasm contract failed [CosmWasm/wasmd@v0.54.9/x/wasm/keeper/keeper.go:453] with gas used: \'105039\': unknown request';
function node(rule) { const seen = []; const srv = http.createServer((req, res) => { let b = ''; req.on('data', (c) => b += c); req.on('end', () => {
    const send = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url.startsWith('/cosmos/auth/v1beta1/accounts/')) return send(200, { account: { '@type': '/cosmos.auth.v1beta1.BaseAccount', address: req.url.split('/').pop(), pub_key: null, account_number: '77', sequence: '3' } });
    if (req.url === '/cosmos/tx/v1beta1/simulate' && req.method === 'POST') { const tx = JSON.parse(b).tx_bytes, m = TM.messagesOf(tx)[0], raw = Buffer.from(tx, 'base64'); seen.push({ m, raw });
      const r = rule(m); if (r === 'down') { res.writeHead(503); return res.end('upstream'); } if (r === null) return send(200, { gas_info: { gas_wanted: '100000000', gas_used: '243041' }, result: {} });
      return send(400, { code: 2, message: `failed to execute message; message index: 0: ${r}${TAIL}`, details: [] }); }
    send(404, { code: 5, message: 'not found' }); }); });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}`, seen, close: () => new Promise((r) => srv.close(r)) }))); }
const ROLE_OF = { remove_assets: 'ASSET_WHITELIST_CONTROLLER', whitelist_assets: 'ASSET_WHITELIST_CONTROLLER', update_asset_config: 'ASSET_WHITELIST_CONTROLLER', set_addresses: null };
const rule = (m) => { const k = Object.keys(m.msg || {})[0]; if (k in ROLE_OF && ROLE_OF[k]) return `Unauthorized missing right: (${ROLE_OF[k]}, ${m.sender})`; if (k === 'set_addresses') return 'Unauthorized'; if (/alliance_/.test(k)) return `Unauthorized execution, sender (${m.sender}) is not the expected address (${curated.daos[0].core})`; if (k === 'update_members') return `Unauthorized execution, sender (${m.sender}) is not the expected address (terra1${'q'.repeat(38)})`; if (k === 'update_sub_daos') return null; return 'Error parsing into type x::ExecuteMsg: unknown variant `' + k + '`, expected one of `a`, `b`'; };
const go = async (o) => { const logs = []; const r = await run({ pc: PC, noPush: true, _unpaced: true, captures, log: (s) => logs.push(s), env: {}, ...o }); return { ...r, logs }; };

console.log(`${VERSION} gate`);
console.log('— A the unsigned transaction —');
{ const b = txBytes({ sender: 'terra1sender', sequence: 3n, contract: 'terra1contract', msg: { remove_assets: [{ native: 'x' }] } }), m = TM.messagesOf(b)[0], raw = Buffer.from(b, 'base64');
  check('one message: an execute from the sender to the contract with the JSON as given, no funds — and the bytes decode with the same reader the cron uses', m.type === '/cosmwasm.wasm.v1.MsgExecuteContract' && m.sender === 'terra1sender' && m.contract === 'terra1contract' && JSON.stringify(m.msg) === '{"remove_assets":[{"native":"x"}]}' && (!m.funds || !m.funds.length));
  const top = TM.fields(raw); const sig = top.filter((f) => f.no === 3);
  check('it is not signed: one empty signature, no public key, the sender\'s sequence, no memo', sig.length === 1 && sig[0].b.length === 0 && (() => { const auth = TM.fields(top.find((f) => f.no === 2).b), si = TM.fields(auth.find((f) => f.no === 1).b); return !si.some((f) => f.no === 1) && Number(si.find((f) => f.no === 3).v) === 3; })() && !TM.fields(top.find((f) => f.no === 1).b).some((f) => f.no === 2)); }
console.log('— B the contract\'s answer, read —');
{ const S = 'terra1' + 'a'.repeat(38), acct = 'terra1' + 'b'.repeat(38), con = 'terra1' + 'c'.repeat(58), F = (t) => ({ ok: false, text: `failed to execute message; message index: 0: ${t}${TAIL}` });
  const a = classify(F(`Unauthorized missing right: (VE_GUARDIAN, ${S})`), S), b = classify(F(`Unauthorized execution, sender (${S}) is not the expected address (${con})`), S), c = classify(F(`Unauthorized execution, sender (${S}) is not the expected address (${acct})`), S), d = classify(F('Unauthorized'), S), e = classify(F('Error parsing into type ve3_shared::msgs::ExecuteMsg: unknown variant `x`'), S), f = classify({ ok: true }, S), g = classify(F('Asset already whitelisted'), S);
  check('"missing right: (ROLE, sender)" → the role, by name', a.kind === 'role' && a.role === 'VE_GUARDIAN');
  check('"not the expected address (a contract)" → that contract; "(an account)" → an account is expected, and its address is not kept', b.kind === 'address' && b.address === con && c.kind === 'account' && !JSON.stringify(c).includes(acct));
  check('a refusal without a name, a message the contract no longer accepts, a simulation that went through, and any other answer are told apart', d.kind === 'unnamed' && e.kind === 'shape' && f.kind === 'open' && g.kind === 'other' && /Asset already whitelisted/.test(g.text));
  check('the kept text has neither the simulating address nor any account, and not the node\'s trailer', [a, b, c, d, e, g].every((x) => !x.text.includes(S) && !/terra1[0-9a-z]{38}(?![0-9a-z])/.test(x.text) && !/wasmd@|gas used/.test(x.text)), a.text); }
console.log('— C a run on the real record and the real proposals —');
{ const n = await node(rule), core = coreDir(); const r = await go({ lcds: n.url, core }); const doc = J(path.join(core, 'contract-watch/guards.json')), g = doc.guards;
  const pairs = new Set(); for (const cap of Object.values(captures)) for (const p of Object.values((cap && cap.proposals) || {})) for (const m of p.rawMsgs || []) { const e = m && m.wasm && m.wasm.execute; if (!e) continue; try { pairs.add(e.contract_addr + '|' + Object.keys(JSON.parse(Buffer.from(e.msg, 'base64').toString()))[0]); } catch { } }
  check(`every answer is for a watched contract and a call that changes it, taken from a real message (${g.length} kinds; ${[...new Set(g.map((x) => x.sample.from))].join(' and ')})`, g.length >= 15 && g.every((x) => curated.contracts.some((c) => c.address === x.contract) && x.guard && x.guard.kind && x.sample && x.sample.ref) && g.some((x) => x.sample.from === 'proposal') && g.every((x) => x.sample.from !== 'proposal' || pairs.has(x.contract + '|' + x.action)), g.length);
  const rm = g.filter((x) => x.action === 'remove_assets');
  check('the reward-list calls are answered with the role the contract named, on each staking contract the record has them for', rm.length >= 3 && rm.every((x) => x.guard.kind === 'role' && x.guard.role === 'ASSET_WHITELIST_CONTROLLER') && g.filter((x) => /alliance_/.test(x.action)).every((x) => x.guard.kind === 'address' && x.guard.address === curated.daos[0].core), rm.map((x) => x.guard));
  check('each answer carries the code the contract ran when it was asked', g.every((x) => x.code_id === ((st.contracts[x.contract] || {}).code_id || null)));
  const sim = doc.simulated_as.address, holders = new Set([...Object.values(st.address_book.entries), ...Object.values(st.contracts).map((c) => c.admin)]);
  check('the simulations ran as an address that holds no role and no admin key — a pool contract of the groups file — and every one was an execute without funds', !holders.has(sim) && /^pools-/.test(curated.contracts.find((c) => c.address === sim).bucket) && n.seen.length === r.asked && n.seen.every((x) => x.m.sender === sim && (!x.m.funds || !x.m.funds.length) && TM.fields(x.raw).filter((f) => f.no === 3)[0].b.length === 0));
  check('the file holds no account address except in no place at all: the simulating address is a contract, refusals are masked', !/terra1[0-9a-z]{38}(?![0-9a-z])/.test(JSON.stringify(doc)));
  check('the log speaks in counts', r.logs.every((l) => !/terra1/.test(l)) && /public nodes only/.test(r.logs[0]), r.logs);
  const n2 = await node(rule); const r2 = await go({ lcds: n2.url, core });
  check('a second run asks nothing again: every kind is already answered for the code its contract runs', r2.asked === 0 && n2.seen.length === 0 && JSON.stringify(J(path.join(core, 'contract-watch/guards.json')).guards) === JSON.stringify(g));
  const stp = path.join(core, 'contract-watch/state/current.json'), s2 = J(stp), up = rm[0].contract; s2.contracts[up].code_id = '99999'; fs.writeFileSync(stp, JSON.stringify(s2));
  const n3 = await node(rule); const r3 = await go({ lcds: n3.url, core });
  check('…until a contract runs new code: then its kinds are asked again, and only its', r3.asked === g.filter((x) => x.contract === up).length && n3.seen.every((x) => x.m.contract === up) && J(path.join(core, 'contract-watch/guards.json')).guards.filter((x) => x.contract === up).every((x) => x.code_id === '99999'));
  await n.close(); await n2.close(); await n3.close(); }
console.log('— D limits and refusals to run —');
{ const n = await node(rule), core = coreDir(); const r = await go({ lcds: n.url, core, max: 5 });
  check('a run asks at most its limit and says how many are left', r.asked === 5 && n.seen.length === 5 && r.doc.left > 0 && r.doc.guards.length === 5);
  const n4 = await node(() => 'down'), c4 = coreDir(); const r4 = await go({ lcds: n4.url, core: c4, max: 3 });
  check('a node that does not answer is not mistaken for a contract\'s answer: the kind is filed as "failed" and asked again next time', r4.doc.guards.every((x) => x.guard.kind === 'failed') && (await go({ lcds: n.url, core: c4, max: 3 })).asked === 3);
  let e1 = null, e2 = null; try { await go({ lcds: n.url, core: coreDir(), sender: curated.daos[0].core }); } catch (e) { e1 = e.message; } try { await go({ lcds: n.url, core: coreDir(), env: { ARCHIVE_RPC: 'https://x' } }); } catch (e) { e2 = e.message; }
  check('it refuses to simulate as an address that holds a role or an admin key, and refuses to run at all when an archive setting is present', /holds a role or an admin key/.test(e1 || '') && /public nodes only/.test(e2 || ''), [e1, e2]);
  await n.close(); await n4.close(); }
console.log('— E the workflow —');
{ const wfp = [path.join(HERE, '../../workflows/contract-watch-guards.yml'), path.join(HERE, 'contract-watch-guards.yml')].find((p) => fs.existsSync(p)), wf = wfp ? fs.readFileSync(wfp, 'utf8') : '';
  check('the workflow has no secret and no archive setting, runs by hand or when its own files change, and never on a timer', !!wf && !/secrets\./.test(wf) && !/ARCHIVE_/.test(wf) && !/schedule:|cron:/.test(wf) && /workflow_dispatch:/.test(wf) && /paths: \['\.github\/workflows\/contract-watch-guards\.yml', '\.github\/scripts\/contract-watch-guards\/guards\.mjs'\]/.test(wf), wfp); }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

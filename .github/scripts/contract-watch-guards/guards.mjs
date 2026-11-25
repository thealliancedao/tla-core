#!/usr/bin/env node
// contract-watch-guards 1.0.0 (2026-11-25) — WHO MAY SEND THIS? Asked of the contracts themselves.
//
// Why: when a role in the address book moves, the record shows who holds it now — not what the role is for. The contracts'
// source is not public. But a contract says it itself: a message that needs a role, sent by an address without that role,
// is refused with the role's name ("Unauthorized missing right: (VE_GUARDIAN, …)"), or with the one address it expects.
//
// What this does: for every kind of change the record holds (a contract + the name of the call), it takes the newest real
// message of that kind — the message as sent on a record, or the message of a DAO proposal from the governance capture —
// and asks a public node to SIMULATE it from an address that holds no role and no admin key. Nothing is signed, nothing is
// broadcast, nothing changes on the chain: the node runs the transaction in simulate mode and throws the result away. The
// contract's answer is filed: the role it named, the address it named, a refusal without a name, or that it went through.
// For a call the record holds no message of, the groups file may list a test message with empty values (guard_probes);
// its answer is marked as coming from a probe.
//
// Public nodes only — this never touches the archive node and has no secret. One request at a time, at most 2 a second,
// at most MAX simulations a run. Output: contract-watch/guards.json (tla-core). The log prints counts only.
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
export const VERSION = 'contract-watch-guards-1.1.0';   // 1.1.0: test messages from the groups file (guard_probes) for a call the record holds no real message of; a kind is asked again when its sample changes
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ACCT = /^terra1[0-9a-z]{38}$/, CONTRACT = /^terra1[0-9a-z]{58}$/;
const readJsonAt = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };

// ── the wire format of an unsigned transaction with one MsgExecuteContract ─────────────────────────────────────────────
const vi = (n) => { const o = []; let v = BigInt(n); do { let b = Number(v & 0x7fn); v >>= 7n; if (v) b |= 0x80; o.push(b); } while (v); return Buffer.from(o); };
const ld = (no, b) => { b = Buffer.isBuffer(b) ? b : Buffer.from(String(b), 'utf8'); return Buffer.concat([vi((no << 3) | 2), vi(b.length), b]); };
const vf = (no, n) => Buffer.concat([vi((no << 3) | 0), vi(n)]);
export function txBytes({ sender, sequence, contract, msg }) {
  const exec = Buffer.concat([ld(1, sender), ld(2, contract), ld(3, JSON.stringify(msg))]);                       // MsgExecuteContract { sender, contract, msg } — no funds, ever
  const body = ld(1, Buffer.concat([ld(1, '/cosmwasm.wasm.v1.MsgExecuteContract'), ld(2, exec)]));                // TxBody { messages: [Any] } — no memo
  const signer = Buffer.concat([ld(2, ld(1, vf(1, 1))), ...(BigInt(sequence || 0) > 0n ? [vf(3, sequence)] : [])]);   // SignerInfo { mode_info: single DIRECT, sequence } — no public key
  const auth = Buffer.concat([ld(1, signer), ld(2, vf(2, 100000000))]);                                           // AuthInfo { signer_infos, fee: { gas_limit } }
  return Buffer.concat([ld(1, body), ld(2, auth), ld(3, Buffer.alloc(0))]).toString('base64');                    // TxRaw { body, auth_info, signatures: [empty] } — not signed
}

// ── the contract's answer, read ────────────────────────────────────────────────────────────────────────────────────────
export function classify(res, sender) {
  if (res.ok) return { kind: 'open', text: 'the simulation went through: this address may send it' };
  let t = String(res.text || '').replace(/^failed to execute message; message index: \d+: /, '').replace(/: execute wasm contract failed.*$/s, '').replace(/\s*\[CosmWasm[^\]]*\].*$/s, '').replace(/ with gas used.*$/s, '');
  if (sender) t = t.split(sender).join('<the sender>');
  t = t.replace(/terra1[0-9a-z]{38}(?![0-9a-z])/g, '<an account>').slice(0, 240);
  let m;
  if ((m = /missing right:?\s*\(?\s*([A-Za-z][A-Za-z0-9_]*)\s*,/.exec(t))) return { kind: 'role', role: m[1], text: t };
  if ((m = /not the expected address \((terra1[0-9a-z]{58}|<an account>)\)/.exec(String(res.text || '').split(sender).join('<the sender>').replace(/terra1[0-9a-z]{38}(?![0-9a-z])/g, '<an account>')))) return m[1].startsWith('terra1') ? { kind: 'address', address: m[1], text: t } : { kind: 'account', text: t };
  if (/Error parsing into type|unknown variant|missing field|invalid type|unknown field|Invalid type/.test(t)) return { kind: 'shape', text: t };
  if (/unauthori[sz]ed|not authori[sz]ed|only .* can|permission|not owner|caller is not|not the owner|not allowed/i.test(t)) return { kind: 'unnamed', text: t };
  return { kind: 'other', text: t };
}

export async function run(opts = {}) {
  const env = opts.env || process.env, log = opts.log || ((s) => console.log(s));
  const core = path.resolve(opts.core || env.CORE_DIR || '.'), pc = path.resolve(opts.pc || env.PC_DIR || 'platform-crons');
  const lcds = String(opts.lcds || env.LCD_ENDPOINTS || 'https://terra-rest.publicnode.com,https://phoenix-lcd.terra.dev,https://terra-lcd.stakely.io').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const daoo = String(opts.daoo || env.DAOO_RAW || 'https://raw.githubusercontent.com/thealliancedao/dao-originations/main').replace(/\/+$/, '');
  const MAX = Math.min(300, Math.max(1, Number(opts.max ?? env.MAX_SIMULATIONS) || 150)), gap = opts._unpaced ? 0 : 500, noPush = !!(opts.noPush || env.NO_PUSH);
  for (const k of Object.keys(env)) if (/^ARCHIVE_/.test(k) && env[k]) throw new Error('an archive setting is present — this script reads public nodes only and will not run with one');
  const P = (rel) => path.join(core, rel);
  const AD = require(path.join(pc, 'tla-flows/lib/admin-classifier.js')), CFG = require(path.join(pc, 'config/contracts.js'));
  const curated = readJsonAt(P('docs/curated/contract-watch.json'), null); if (!curated) throw new Error('docs/curated/contract-watch.json is missing');
  const WATCH = AD.adminWatchFrom({ config: CFG, known: readJsonAt(P('docs/curated/known_contracts.json'), null), registry: readJsonAt(P('tla-voting/capture-registry.json'), null), extra: curated });
  const st = readJsonAt(P('contract-watch/state/current.json'), {}), idx = readJsonAt(P('contract-watch/index.json'), {});
  const recs = []; for (const mk of Object.keys(idx.months || {}).sort()) { const a = readJsonAt(P(`contract-watch/events/${mk}.json`), []); if (Array.isArray(a)) recs.push(...a); }
  const isChange = (name) => { const s = String(name || ''); return AD.CHANGE_RE.test(s) || AD.EPOCH_RE.test(s); };

  // ── transport: one request at a time ────────────────────────────────────────────────────────────────────────────────
  let last = 0; const stats = { requests: 0, failed: 0 };
  async function ask(pathQ, body) {
    let err = null;
    for (const base of lcds) for (let i = 0; i < 2; i++) {
      const wait = last + gap - Date.now(); if (wait > 0) await sleep(wait); last = Date.now(); stats.requests++;
      try {
        const r = await fetch(base + pathQ, { method: body ? 'POST' : 'GET', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'contract-watch-guards/1.0' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(45000) });
        const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { }
        if (r.ok && j) return { ok: true, json: j };
        if (j && typeof j.message === 'string' && r.status < 502) return { ok: false, answered: true, status: r.status, text: j.message };   // the node answered: this is the contract's (or the chain's) reply, not a failure of the node
        err = { ok: false, status: r.status, text: text.slice(0, 160) };
      } catch (e) { err = { ok: false, status: 0, text: e && e.name === 'TimeoutError' ? 'no answer in time' : 'no answer' }; }
      await sleep(opts._unpaced ? 1 : 1500);
    }
    stats.failed++; return err;
  }

  // ── the address the simulations run as: one that holds no role and no admin key ─────────────────────────────────────
  const holders = new Set([...Object.values((st.address_book && st.address_book.entries) || {}), ...Object.values(st.contracts || {}).map((c) => c.admin).filter(Boolean)]);
  // by default a pool contract of the groups file: it has an account on the chain like every contract, and no say in any other contract
  const sender = opts.sender || env.SIM_SENDER || (curated.contracts.find((c) => /^pools-/.test(c.bucket || '') && CONTRACT.test(c.address) && !holders.has(c.address)) || {}).address;
  if (!sender || !(ACCT.test(sender) || CONTRACT.test(sender))) throw new Error('no address to simulate as (SIM_SENDER, or a pool contract of the groups file)');
  if (holders.has(sender)) throw new Error('the address to simulate as holds a role or an admin key — its answers would say nothing about who else may send a message');
  const acc = await ask(`/cosmos/auth/v1beta1/accounts/${sender}`);
  if (!acc.ok) throw new Error(`the simulating address has no account on the chain, or the nodes did not answer (${acc.text || acc.status})`);
  const a0 = acc.json.account || {}, base = a0.base_account || (a0.base_vesting_account && a0.base_vesting_account.base_account) || a0, sequence = BigInt(base.sequence || 0);

  // ── one real message per (contract, call): the message as sent on a record, or a proposal's own message ─────────────
  const samples = new Map();   // key → { contract, action, msg, from, ref, at }
  const take = (contract, msg, from, ref, at) => {
    if (!CONTRACT.test(contract || '') || !WATCH.has(contract) || !msg || typeof msg !== 'object' || Array.isArray(msg)) return;
    const keys = Object.keys(msg); if (keys.length !== 1 || !isChange(keys[0])) return;
    const k = `${contract}|${keys[0]}`, cur = samples.get(k); if (!cur || at > cur.at) samples.set(k, { contract, action: keys[0], msg, from, ref, at });
  };
  for (const r of recs) if (r && r.sent && r.sent.msg && !r.sent.msg.too_long && !(r.sent.funds && r.sent.funds.length)) take(r.sent.to, r.sent.msg, 'record', r.k, Number(r.height) || 0);
  let captures = 0;
  for (const d of curated.daos || []) { if (!d.capture) continue;
    let cap = opts.captures ? opts.captures[d.capture] : null;
    if (!cap) { try { const r = await fetch(`${daoo}/${d.capture}/governance/proposals.json`, { signal: AbortSignal.timeout(60000) }); cap = r.ok ? await r.json() : null; } catch { cap = null; } }
    if (!cap || !cap.proposals) { log(`  the governance capture "${d.capture}" could not be read — its proposals give no samples this run`); continue; }
    captures++;
    for (const p of Object.values(cap.proposals)) for (const m of p.rawMsgs || []) { const e = m && m.wasm && m.wasm.execute; if (!e || (e.funds && e.funds.length)) continue; let msg = null; try { msg = JSON.parse(Buffer.from(String(e.msg), 'base64').toString('utf8')); } catch { } take(e.contract_addr, msg, 'proposal', String(p.id), Number(p.startHeight) || 0); }
  }
  // test messages from the groups file, only where the record has no real message of that kind
  for (const pr of curated.guard_probes || []) { if (!pr || !pr.contract || !pr.msg) continue; const k = `${pr.contract}|${Object.keys(pr.msg)[0]}`; if (!samples.has(k)) take(pr.contract, pr.msg, 'probe', 'docs/curated/contract-watch.json', 0); }
  const prev = readJsonAt(P('contract-watch/guards.json'), null), prevBy = new Map(((prev && prev.guards) || []).map((g) => [`${g.contract}|${g.action}`, g]));
  const codeOf = (c) => (st.contracts && st.contracts[c] && st.contracts[c].code_id) || null;
  // newest code first is not the point — a pair already answered on the code the contract runs now is not asked again
  const todo = [...samples.values()].filter((s) => { const g = prevBy.get(`${s.contract}|${s.action}`); return !(g && g.code_id && g.code_id === codeOf(s.contract) && g.guard && g.guard.kind !== 'failed' && g.sample && g.sample.from === s.from && g.sample.ref === s.ref); }).sort((a, b) => (a.contract + a.action).localeCompare(b.contract + b.action));
  log(`${VERSION} · ${samples.size} kinds of change with a real message (${captures} governance capture(s), ${recs.filter((r) => r.sent && r.sent.msg).length} record(s) with their message) · ${todo.length} to ask · at most ${MAX} this run · public nodes only`);

  const out = new Map(prevBy); let asked = 0;
  for (const s of todo) { if (asked >= MAX) break; asked++;
    const res = await ask('/cosmos/tx/v1beta1/simulate', { tx_bytes: txBytes({ sender, sequence, contract: s.contract, msg: s.msg }) });
    const guard = res.ok ? classify({ ok: true }, sender) : res.answered ? classify({ ok: false, text: res.text }, sender) : { kind: 'failed', text: 'the nodes did not answer' };
    out.set(`${s.contract}|${s.action}`, { contract: s.contract, action: s.action, code_id: codeOf(s.contract), guard, sample: { from: s.from, ref: s.ref }, read_at: new Date().toISOString() });
  }
  const guards = [...out.values()].filter((g) => WATCH.has(g.contract)).sort((a, b) => (a.contract + '|' + a.action).localeCompare(b.contract + '|' + b.action));
  const counts = guards.reduce((o, g) => { o[g.guard.kind] = (o[g.guard.kind] || 0) + 1; return o; }, {});
  const doc = { schemaVersion: 1, product: 'contract-watch/guards', builder: VERSION, read_at: new Date().toISOString(),
    note: 'For each kind of change the record holds (a contract and the name of the call): what the contract answered when a real message of that kind was SIMULATED from an address that holds no role and no admin key. kind: role = it named the role the sender lacks; address = it named the one contract it expects; account = it named one account it expects (the address is not kept here); unnamed = refused without a name; open = it went through; shape = the contract no longer accepts a message of that form; other = another answer (text kept); failed = no node answered. code_id is the code the contract ran when it was asked — an answer is about that code. Nothing was signed or broadcast.',
    simulated_as: { address: sender, why: 'a pool contract of the groups file (or the address given): it holds no role in the address book and is not the admin of a watched contract' }, counts, left: Math.max(0, todo.length - asked), guards };
  fs.mkdirSync(path.dirname(P('contract-watch/guards.json')), { recursive: true });
  const write = () => fs.writeFileSync(P('contract-watch/guards.json'), JSON.stringify(doc, null, 1));
  if (noPush) write();
  else {
    const sh = (c) => execSync(c, { cwd: core, stdio: 'pipe' }).toString(); let done = false;
    for (let i = 0; i < 5 && !done; i++) { try { sh('git fetch -q origin main && git reset -q --hard origin/main'); write(); sh('git add contract-watch/guards.json'); try { sh('git diff --cached --quiet'); done = true; break; } catch { } sh(`git commit -q -m ${JSON.stringify(`contract-watch guards: ${guards.length} kinds of change asked of their contracts (${VERSION})`)}`); sh('git push -q origin HEAD:main'); done = true; } catch (e) { execSync(`sleep ${3 * (i + 1)}`); } }
    if (!done) throw new Error('could not publish contract-watch/guards.json');
  }
  log(`asked ${asked} · answers on file ${guards.length}: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(' · ')} · left ${doc.left} · requests ${stats.requests} (failed ${stats.failed})`);
  return { doc, stats, asked };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run().catch((e) => { console.error('FATAL: ' + String(e && e.message || e)); process.exit(1); });

#!/usr/bin/env node
// votion-chain-read 1.0.0 (2026-11-25) — WHAT THE CHAIN ITSELF SAYS ABOUT THE VOTION VAULTS.
//
// The Votion vaults hold locked voting power and vote in the weekly gauge. This reads, from the chain's own state:
//   • each vault's contract record — the code it runs, the address that can upgrade it (admin), its creator, its label;
//   • the contract's own history — every code it has run, the block of each change and the message of each change;
//   • its settings as the contract reports them: `config`, and the other queries it lists that take no argument;
//   • the same for a settings contract a vault points to (one step), and the settings of the gauge and the bribe manager;
//   • for an account named in a vault's settings, or as a vault's admin: how many keys it needs to sign (never the keys).
//
// Read-only: GET requests to public nodes. Nothing is simulated, signed or sent. No archive node, no secret — the script
// refuses to run when an archive setting is present. One request at a time, at most 2 a second, at most MAX_REQUESTS a run.
// A query that would list depositors or positions is never sent (see SKIP). Output: votion/chain/vaults.json (tla-core).
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
export const VERSION = 'votion-chain-read-1.0.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ACCT = /^terra1[0-9a-z]{38}$/, CONTRACT = /^terra1[0-9a-z]{58}$/;
const readJsonAt = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };

// The vaults, by the id of their page on votion.money. The six lock vaults are also in docs/curated/contract-watch.json
// (group "votion"); the two Claim vaults run other code and are listed here only.
export const VAULTS = [
  ['arbluna-max', 'arbLUNA - Max', 'terra13aae4futz6jk7hmdv0gwm2xs6p4nxv4xwz5tc0c2vt4960u4j6jqpqmye9'],
  ['ampluna-max', 'ampLUNA - Max', 'terra1v7aw9eartqrjrhwd6c7hkmlkspcy5q4tvc07gjmvzqezk3fttr4s3mffyz'],
  ['ampluna-max-claiming', 'ampLUNA - Claim', 'terra1xjusp8m8vzj9lgzj9guddfdfmsxaz8mhukmc6ffyvzc89usqjvts09nxcs'],
  ['arbluna-max-claiming', 'arbLUNA - Claim', 'terra1g0g68yfgw5wfmk40gaf7fenjenrk66hcxw7a9uwe8nqxmxq0xcds3pgens'],
  ['ampluna-12', 'ampLUNA - 3 Months', 'terra1dr7mv4w6chznedhp7uw6ntz9zjj4hxcdga2lmenlfuj35vmwpf0qhnzm5p'],
  ['arbluna-12', 'arbLUNA - 3 Months', 'terra163jnveun52hxv2kg4ys9a28h20trmccr98tnrvr92snn6yzdeg7qd9zj9l'],
  ['ampluna-1', 'ampLUNA - 1 Week', 'terra1mzelg87h36y6wvtgj6fh9s4crgx9acw63l3zc6f9px6pc5f8h8lqs0sux0'],
  ['arbluna-1', 'arbLUNA - 1 Week', 'terra16xzky47caqc3krsxpla58m36ttxcjty3zpp92344m2tere5t26ysuxkjuj'],
];
// The Alliance's own contracts whose settings bear on a vote: read for their settings only.
export const ALSO = [
  ['gauge', 'Gauge — the weekly vote', 'terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj'],
  ['bribe-manager', 'Bribe manager (vote incentives)', 'terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh'],
];
// A query whose answer would list people or positions, or a long series, is not sent.
export const SKIP = /user|staker|holder|account|balance|position|claim|deposit|member|unbond|withdraw|exchange_rate|reward_index|histor|token|allowance|minter|simulate|share|lock|nft|owner_of|approv/i;
const MAX_ANSWER = 12000;

// the names a contract lists when asked for a query it does not have
export function namesIn(text, probe) {
  const t = String(text || ''); const i = t.search(/expected (one of )?`/); if (i < 0) return null;
  const out = []; const re = /`([A-Za-z0-9_]+)`/g; re.lastIndex = i; let m;
  const end = t.indexOf(': query wasm', i); const stop = end < 0 ? t.length : end;
  while ((m = re.exec(t)) && m.index < stop) if (m[1] !== probe && !out.includes(m[1])) out.push(m[1]);
  return out;
}
export function keysOf(resp) {
  const a = resp && resp.account; if (!a || typeof a !== 'object') return null;
  const base = a.base_account || (a.base_vesting_account && a.base_vesting_account.base_account) || a, pk = base.pub_key, kind = String(a['@type'] || '').split('.').pop() || null;
  if (pk == null) return { keys: 0, type: kind };
  const t = String(pk['@type'] || '');
  if (/multisig/i.test(t) && Array.isArray(pk.public_keys)) return { keys: pk.public_keys.length, threshold: Number(pk.threshold) || null, type: kind };
  if (/PubKey$/.test(t)) return { keys: 1, type: kind };
  return null;
}
const trimErr = (t) => String(t || '').replace(/: query wasm contract failed.*$/s, '').replace(/\s*\[CosmWasm[^\]]*\].*$/s, '').slice(0, 300);
// every string in a value that is an address, with the key it sits under
export function addressesIn(v, key = '', out = []) {
  if (typeof v === 'string') { if (ACCT.test(v) || CONTRACT.test(v)) out.push({ key, address: v, kind: ACCT.test(v) ? 'account' : 'contract' }); }
  else if (Array.isArray(v)) v.forEach((x) => addressesIn(x, key, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) addressesIn(x, key ? key + '.' + k : k, out);
  return out;
}

export async function run(opts = {}) {
  const env = opts.env || process.env, log = opts.log || ((s) => console.log(s)), doFetch = opts.fetch || fetch;
  const core = path.resolve(opts.core || env.CORE_DIR || '.');
  const lcds = String(opts.lcds || env.LCD_ENDPOINTS || 'https://terra-rest.publicnode.com,https://phoenix-lcd.terra.dev,https://terra-lcd.stakely.io').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const MAX = Math.min(500, Math.max(20, Number(opts.max ?? env.MAX_REQUESTS) || 400)), gap = opts._unpaced ? 0 : 500, noPush = !!(opts.noPush || env.NO_PUSH);
  for (const k of Object.keys(env)) if (/^ARCHIVE_/.test(k) && env[k]) throw new Error('an archive setting is present — this script reads public nodes only and will not run with one');

  // ── transport: one request at a time ────────────────────────────────────────────────────────────────────────────────
  let last = 0; const stats = { requests: 0, failed: 0, by_node: {} };
  async function ask(pathQ) {
    if (stats.requests >= MAX) return { ok: false, status: 0, text: 'request limit of this run reached' };
    let err = null;
    for (const base of lcds) for (let i = 0; i < 2; i++) {
      const wait = last + gap - Date.now(); if (wait > 0) await sleep(wait); last = Date.now(); stats.requests++;
      try {
        const r = await doFetch(base + pathQ, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'votion-chain-read/1.0' }, signal: AbortSignal.timeout(45000) });
        const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { }
        if (r.ok && j) { stats.by_node[base] = (stats.by_node[base] || 0) + 1; return { ok: true, json: j }; }
        if (j && typeof j.message === 'string' && r.status < 502) { stats.by_node[base] = (stats.by_node[base] || 0) + 1; return { ok: false, answered: true, status: r.status, text: j.message }; }   // the node answered: the contract's (or the chain's) own reply
        err = { ok: false, status: r.status, text: text.slice(0, 160) };
      } catch (e) { err = { ok: false, status: 0, text: e && e.name === 'TimeoutError' ? 'no answer in time' : 'no answer' }; }
      await sleep(opts._unpaced ? 1 : 1500);
    }
    stats.failed++; return err;
  }
  const smart = (a, q) => ask(`/cosmwasm/wasm/v1/contract/${a}/smart/${encodeURIComponent(Buffer.from(JSON.stringify(q)).toString('base64'))}`);
  const keep = (data) => { const s = JSON.stringify(data); return s.length <= MAX_ANSWER ? { answer: data } : { too_long: s.length, top_level: data && typeof data === 'object' ? Object.keys(data).slice(0, 40) : typeof data }; };

  async function readContract(address, { queries = true } = {}) {
    const out = { address };
    const info = await ask(`/cosmwasm/wasm/v1/contract/${address}`);
    if (info.ok && info.json.contract_info) { const c = info.json.contract_info; out.info = { code_id: c.code_id || null, admin: c.admin || null, creator: c.creator || null, label: c.label || null, created_height: (c.created && c.created.block_height) || null }; }
    else out.info = { error: info.answered ? trimErr(info.text) : 'no node answered' };
    const hist = await ask(`/cosmwasm/wasm/v1/contract/${address}/history?pagination.limit=100`);
    if (hist.ok && Array.isArray(hist.json.entries)) out.history = hist.json.entries.map((e) => ({ operation: String(e.operation || '').replace(/^CONTRACT_CODE_HISTORY_OPERATION_TYPE_/, '').toLowerCase(), code_id: e.code_id || null, height: (e.updated && e.updated.block_height) || null, tx_index: (e.updated && e.updated.tx_index) || null, msg: e.msg === undefined ? null : e.msg }));
    else out.history = { error: hist.answered ? trimErr(hist.text) : 'no node answered' };
    if (!queries) return out;
    const probe = 'zz_which_queries'; const d = await smart(address, { [probe]: {} });
    const names = d.ok ? null : namesIn(d.text, probe);
    out.queries_listed = names || (d.ok ? 'the contract answered a query it should not know' : { error: d.answered ? trimErr(d.text) : 'no node answered' });
    out.answers = {};
    const want = Array.isArray(names) ? names.filter((n) => !SKIP.test(n)) : ['config', 'state'];
    out.queries_not_sent = Array.isArray(names) ? names.filter((n) => SKIP.test(n)) : [];
    for (const n of want) {
      const r = await smart(address, { [n]: {} });
      out.answers[n] = r.ok ? keep(r.json.data) : (r.answered ? { refused: trimErr(r.text) } : { error: 'no node answered' });
    }
    return out;
  }

  const doc = { schemaVersion: 1, product: 'votion/chain-read', builder: VERSION, read_at: null,
    note: 'What the chain itself holds for each Votion vault, read from public nodes with GET requests only (nothing simulated, signed or sent). info = the contract record (code id, the address that can upgrade it, creator, label). history = the contract\'s own code history: every code it has run, the block of each change and the message of that change — a change of code is always in it. answers = what the contract returned for each query it lists that takes no argument; a query that would list depositors or positions is not sent (queries_not_sent). pointed_to = a settings contract a vault\'s config names, read the same way (one step). accounts = for an account named in a vault\'s settings or as its admin, how many keys the chain\'s account record shows it needs — never the keys. Heights are block heights; the time of a change is in contract-watch/events when the record holds the transaction. A setting can also be changed by a message that is not a change of code (update_config): those are transactions, kept in contract-watch/events, not in this file.',
    vaults: {}, also: {}, pointed_to: {}, accounts: {}, requests: null };
  for (const [id, name, address] of VAULTS) { doc.vaults[id] = { name, ...(await readContract(address)) }; log(`vault ${id}: code ${doc.vaults[id].info.code_id || '?'} · history ${Array.isArray(doc.vaults[id].history) ? doc.vaults[id].history.length : 'not read'} · queries ${Array.isArray(doc.vaults[id].queries_listed) ? doc.vaults[id].queries_listed.length : 'not listed'}`); }
  for (const [id, name, address] of ALSO) { doc.also[id] = { name, ...(await readContract(address)) }; log(`${id}: code ${doc.also[id].info.code_id || '?'} · queries ${Array.isArray(doc.also[id].queries_listed) ? doc.also[id].queries_listed.length : 'not listed'}`); }
  // one step: a settings contract a vault names, and the accounts it names
  const known = new Set([...VAULTS, ...ALSO].map((x) => x[2])); const follow = new Map(), accts = new Map();
  for (const [id, v] of Object.entries(doc.vaults)) {
    if (v.info && ACCT.test(v.info.admin || '') && !accts.has(v.info.admin)) accts.set(v.info.admin, 'admin of a vault');
    for (const [q, a] of Object.entries(v.answers || {})) for (const x of addressesIn(a.answer)) {
      if (x.kind === 'account') { if (!accts.has(x.address)) accts.set(x.address, `named in a vault's ${q} (${x.key})`); }
      else if (!known.has(x.address) && /config|setting|registry|controller|operator|access/i.test(x.key) && follow.size < 4 && !follow.has(x.address)) follow.set(x.address, `${q}.${x.key} of ${id}`);
    }
  }
  for (const [address, why] of follow) { doc.pointed_to[address] = { named_by: why, ...(await readContract(address)) }; log(`pointed to (${why}): code ${doc.pointed_to[address].info.code_id || '?'}`); }
  for (const [, p] of Object.entries(doc.pointed_to)) for (const [q, a] of Object.entries(p.answers || {})) for (const x of addressesIn(a.answer)) if (x.kind === 'account' && !accts.has(x.address) && accts.size < 12) accts.set(x.address, `named in a settings contract's ${q} (${x.key})`);
  for (const [address, why] of accts) { const r = await ask(`/cosmos/auth/v1beta1/accounts/${address}`); const k = r.ok ? keysOf(r.json) : null; doc.accounts[address] = k ? { ...k, why } : { why, error: 'not read' }; }
  doc.read_at = new Date().toISOString(); doc.requests = { sent: stats.requests, failed: stats.failed, limit: MAX };

  const rel = 'votion/chain/vaults.json', P = path.join(core, rel);
  const write = () => { fs.mkdirSync(path.dirname(P), { recursive: true }); fs.writeFileSync(P, JSON.stringify(doc, null, 1)); };
  const readOk = Object.values(doc.vaults).filter((v) => v.info && v.info.code_id).length;
  if (!readOk) throw new Error('no vault could be read — nothing written');
  if (noPush) write();
  else {
    const sh = (c) => execSync(c, { cwd: core, stdio: 'pipe' }).toString(); let done = false;
    for (let i = 0; i < 5 && !done; i++) { try { sh('git fetch -q origin main && git reset -q --hard origin/main'); write(); sh(`git add ${rel}`); try { sh('git diff --cached --quiet'); done = true; break; } catch { } sh(`git commit -q -m ${JSON.stringify(`votion chain read: ${readOk} of ${VAULTS.length} vaults (${VERSION})`)}`); sh('git push -q origin HEAD:main'); done = true; } catch (e) { await sleep(3000 + i * 2000); } }
    if (!done) throw new Error('could not publish ' + rel);
  }
  log(`vaults read ${readOk} of ${VAULTS.length} · settings contracts followed ${follow.size} · accounts ${accts.size} · requests ${stats.requests} (failed ${stats.failed})`);
  return { doc, stats };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run().catch((e) => { console.error('FATAL: ' + String(e && e.message || e)); process.exit(1); });

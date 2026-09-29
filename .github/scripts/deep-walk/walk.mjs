// ── deep-walk 1.0 (2026-09-29) — SPEC-deep-history §8, LAYER 1: every tx of every cohort wallet, into the PRIVATE archive repo.
// Modes (env MODE):
//   timing  — how fast the archive answers: tx_search pages and smart queries at a past height, at concurrency 1 / 2 / 4 / 8; the
//             result sizes the whole walk (archive/timing/<date>.json + the numbers in the log). Nothing per wallet is read.
//   cohort  — builds the cut-date cohort from public products (aDAO holders · Pixel Lions staked incl. Enterprise · Burning Lion holders ·
//             auto-max lock with VP > 100K) → archive/cohort/<date>.json. Run once; layer1 reuses it.
//   layer1  — for each cohort wallet not yet done: tx_search for every attribute a wallet appears under (§8 list), deduplicated by hash,
//             decoded, and written as gzip parts to archive/layer1/<shard>/<wallet>/part-NNN.jsonl.gz + a per-wallet summary in the
//             manifest. Resumable (done wallets skipped), committed every few wallets, stops cleanly before the time budget.
// PRIVACY (§8b): the tx MEMO is never read into the output — the body is decoded and only its messages are kept; signer keys and
// sequences are dropped. The log prints COUNTS ONLY (this Action's log is public) — never a wallet, a hash or an amount.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { execSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VERSION = 'deep-walk-1.0';
const MODE = process.env.MODE || 'timing';
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const LCD = String(process.env.ARCHIVE_LCD || process.env.LCD || 'https://terra-lcd.publicnode.com').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '');
const ARCHIVE_DIR = process.env.ARCHIVE_DIR || 'archive';
const CONC = Math.max(1, Number(process.env.CONCURRENCY || 4));
const MAX_MIN = Number(process.env.MAX_MINUTES || 320);
const LIMIT_WALLETS = Number(process.env.LIMIT_WALLETS || 0);   // 0 = all
const SHARDS = String(process.env.SHARDS || '').trim();          // e.g. "0-9" or "a,c,d" — the last address character; empty = all
const PART_TXS = 1500;
const DAY = new Date().toISOString().slice(0, 10);
const T0 = Date.now(); const minutes = () => (Date.now() - T0) / 60000; const overBudget = () => minutes() > MAX_MIN;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const UA = 'thealliancedao.com deep-walk/1.0';
const RAW = 'https://raw.githubusercontent.com/thealliancedao';

// the attribute keys a wallet appears under (measured on our own raw corpus + the Solid and Credia probes — SPEC §8 layer 1)
const KEYS = ['message.sender', 'transfer.recipient', 'withdraw_rewards.delegator', 'fungible_token_packet.receiver',
  'wasm.recipient', 'wasm.to', 'wasm.receiver', 'wasm.user', 'wasm.owner', 'wasm.new_owner', 'wasm.borrower', 'wasm.bidder',
  'wasm.seller', 'wasm.portfolio', 'wasm.address', 'wasm.from', 'wasm.liquidator', 'wasm.staker', 'wasm.delegator', 'wasm.voter'];

// ── http ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const stats = { requests: 0, errors: 0, retries: 0 };
async function getJson(url, tries = 5, timeoutMs = 45000) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    stats.requests++;
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok && j) return { ok: true, json: j }; last = { ok: false, status: r.status, body: (j && (j.message || j.error && (j.error.data || j.error.message))) || t.slice(0, 200) }; if (r.status >= 400 && r.status < 500 && r.status !== 429) return last; }
    catch (e) { last = { ok: false, status: 0, body: e.message }; }
    stats.retries++; await sleep(1000 * Math.pow(2, i));
  }
  stats.errors++; return last;
}
async function txSearch(q, page, perPage = 100) {
  let last = null;
  for (const rpc of RPCS) {
    const r = await getJson(`${rpc}/tx_search?query=${encodeURIComponent('"' + q + '"')}&per_page=${perPage}&page=${page}&order_by=%22asc%22`);
    if (r.ok && r.json.result) return { total: Number(r.json.result.total_count), txs: r.json.result.txs || [] };
    last = r;
  }
  return { error: last ? `HTTP ${last.status}: ${String(last.body).slice(0, 120)}` : 'no RPC' };
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
async function smartAt(addr, q, height) {
  const url = `${LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${b64(q)}`;
  let last = null;
  for (let i = 0; i < 4; i++) { stats.requests++;
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA, 'x-cosmos-block-height': String(height) }, signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (r.ok) return { ok: true, json: JSON.parse(t) }; last = { status: r.status }; if (r.status < 500 && r.status !== 429) break; }
    catch (e) { last = { status: 0 }; } stats.retries++; await sleep(1000 * (i + 1)); }
  stats.errors++; return { ok: false, status: last && last.status };
}
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }

// ── decoding: messages kept, memo / signer data dropped (§8b) ───────────────────────────────────────────────────────────────
const T = (() => { try {
  const { TxRaw, TxBody, AuthInfo } = require('cosmjs-types/cosmos/tx/v1beta1/tx');
  const mods = {};
  const add = (file, names) => { try { const m = require(file); for (const n of names) if (m[n]) mods[n] = m[n]; } catch { } };
  add('cosmjs-types/cosmos/bank/v1beta1/tx', ['MsgSend', 'MsgMultiSend']);
  add('cosmjs-types/cosmwasm/wasm/v1/tx', ['MsgExecuteContract', 'MsgInstantiateContract', 'MsgInstantiateContract2', 'MsgMigrateContract', 'MsgUpdateAdmin', 'MsgClearAdmin', 'MsgStoreCode']);
  add('cosmjs-types/cosmos/staking/v1beta1/tx', ['MsgDelegate', 'MsgUndelegate', 'MsgBeginRedelegate', 'MsgCancelUnbondingDelegation', 'MsgCreateValidator', 'MsgEditValidator']);
  add('cosmjs-types/cosmos/distribution/v1beta1/tx', ['MsgWithdrawDelegatorReward', 'MsgSetWithdrawAddress', 'MsgWithdrawValidatorCommission', 'MsgFundCommunityPool']);
  add('cosmjs-types/cosmos/gov/v1beta1/tx', ['MsgVote', 'MsgVoteWeighted', 'MsgDeposit', 'MsgSubmitProposal']);
  add('cosmjs-types/cosmos/authz/v1beta1/tx', ['MsgExec', 'MsgGrant', 'MsgRevoke']);
  add('cosmjs-types/cosmos/feegrant/v1beta1/tx', ['MsgGrantAllowance', 'MsgRevokeAllowance']);
  add('cosmjs-types/ibc/applications/transfer/v1/tx', ['MsgTransfer']);
  const gov1 = (() => { try { return require('cosmjs-types/cosmos/gov/v1/tx'); } catch { return {}; } })();
  return { TxRaw, TxBody, AuthInfo, mods, gov1 };
} catch (e) { return null; } })();
function decodeAny(any, depth = 0) {
  const url = any.typeUrl; const name = url.split('.').pop();
  let M = T.mods[name];
  if (/cosmos\.gov\.v1\./.test(url) && T.gov1[name]) M = T.gov1[name];
  if (!M || depth > 3) return { type: url, raw: Buffer.from(any.value).toString('base64') };
  try {
    const v = M.decode(any.value); const o = JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Uint8Array ? Buffer.from(x).toString('base64') : typeof x === 'bigint' ? x.toString() : x)));
    if (v.msg instanceof Uint8Array) { try { o.msg = JSON.parse(Buffer.from(v.msg).toString('utf8')); } catch { } }
    if (name === 'MsgExec' && Array.isArray(v.msgs)) o.msgs = v.msgs.map(m => decodeAny(m, depth + 1));
    if (o.memo !== undefined) delete o.memo;   // MsgTransfer carries its own memo field — dropped too
    return { type: url, value: o };
  } catch (e) { return { type: url, raw: Buffer.from(any.value).toString('base64'), decode_error: true }; }
}
function shapeTx(t) {
  const rec = { h: Number(t.height), x: t.hash, i: t.index, c: t.tx_result.code, gw: Number(t.tx_result.gas_wanted || 0), gu: Number(t.tx_result.gas_used || 0) };
  // events: all but the 'tx' type's signer data (acc_seq, signature) — fee + fee_payer kept
  rec.e = (t.tx_result.events || []).map(e => ({ t: e.type, a: (e.attributes || []).filter(a => !(e.type === 'tx' && (a.key === 'acc_seq' || a.key === 'signature'))).map(a => [a.key, a.value]) })).filter(e => e.a.length);
  if (T && t.tx) { try { const raw = T.TxRaw.decode(Buffer.from(t.tx, 'base64')); const body = T.TxBody.decode(raw.bodyBytes); const auth = T.AuthInfo.decode(raw.authInfoBytes);
      rec.m = body.messages.map(m => decodeAny(m));   // body.memo is NOT copied (§8b)
      rec.f = { amount: (auth.fee && auth.fee.amount || []).map(c => c.amount + c.denom), gas: auth.fee && auth.fee.gasLimit ? auth.fee.gasLimit.toString() : null, granter: auth.fee && auth.fee.granter || undefined };
    } catch (e) { rec.m_error = 'decode failed'; } }
  return rec;
}

// ── archive repo (private) ─────────────────────────────────────────────────────────────────────────────────────────────────
const A = (p) => path.join(ARCHIVE_DIR, p);
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(A(p), 'utf8')); } catch { return d; } };
const writeJson = (p, o) => { fs.mkdirSync(path.dirname(A(p)), { recursive: true }); fs.writeFileSync(A(p), JSON.stringify(o, null, 1) + '\n'); };
function commitPush(msg) {
  if (process.env.NO_PUSH) return;
  const sh = (c) => execSync(c, { cwd: ARCHIVE_DIR, stdio: 'pipe' }).toString();
  sh('git add -A'); try { sh('git diff --cached --quiet'); return; } catch { }
  sh(`git commit -q -m ${JSON.stringify(msg)}`);
  for (let i = 0; i < 6; i++) { try { try { sh('git pull -q --rebase origin main'); } catch (e) { /* an empty archive has no main yet */ } sh('git push -q origin HEAD:main'); return; } catch (e) { execSync(`sleep ${5 * (i + 1)}`); } }
  throw new Error('push to the archive failed 6 times');
}

// ── mode: timing ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function timing() {
  const out = { version: VERSION, day: DAY, rpc: RPCS.length ? 'archive RPC (secret)' : 'none', lcd: process.env.ARCHIVE_LCD ? 'archive LCD (secret)' : LCD, runs: [] };
  const PORTFOLIO = 'terra1y6hfmr3lxxj6srduhlfz96x7sga2984pr757a0nrfuqxa9rqxapqcjv4zz';   // Credia — a busy, well-known contract
  const TLA_BUCKET = 'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k';
  for (const n of [1, 2, 4, 8]) {
    const s0 = { ...stats }; const t0 = Date.now();
    const pages = await pool(Array.from({ length: 8 * n }, (_, i) => i + 1), n, (p) => txSearch(`wasm._contract_address='${PORTFOLIO}'`, p));
    const secs = (Date.now() - t0) / 1000; const txs = pages.reduce((x, r) => x + ((r.txs || []).length), 0); const bytes = pages.reduce((x, r) => x + JSON.stringify(r.txs || []).length, 0);
    out.runs.push({ kind: 'tx_search page (100 txs)', concurrency: n, calls: pages.length, failed: pages.filter(r => r.error).length, seconds: +secs.toFixed(1), pages_per_s: +(pages.length / secs).toFixed(2), txs_per_s: +(txs / secs).toFixed(0), kb_per_tx: txs ? +(bytes / txs / 1024).toFixed(1) : null, retries: stats.retries - s0.retries });
    console.log(`  tx_search  ×${n}: ${out.runs[out.runs.length - 1].pages_per_s} pages/s · ${out.runs[out.runs.length - 1].txs_per_s} txs/s · ${out.runs[out.runs.length - 1].kb_per_tx} KB/tx · failed ${out.runs[out.runs.length - 1].failed}`);
  }
  const heights = [8_000_000, 12_000_000, 16_000_000, 20_000_000];
  for (const n of [1, 4, 8]) {
    const t0 = Date.now(); const qs = Array.from({ length: 12 * n }, (_, i) => heights[i % heights.length] + i);
    const rs = await pool(qs, n, (h) => smartAt(TLA_BUCKET, { config: {} }, h)); const secs = (Date.now() - t0) / 1000;
    out.runs.push({ kind: 'smart query at a past height', concurrency: n, calls: rs.length, ok: rs.filter(r => r.ok).length, seconds: +secs.toFixed(1), per_s: +(rs.length / secs).toFixed(2) });
    console.log(`  smart@h    ×${n}: ${out.runs[out.runs.length - 1].per_s}/s · ok ${out.runs[out.runs.length - 1].ok}/${rs.length}`);
  }
  writeJson(`timing/${DAY}.json`, out); commitPush(`timing ${DAY}`);
}

// ── mode: cohort (public products only) ───────────────────────────────────────────────────────────────────────────────────
async function cohort() {
  const W = /^terra1[02-9ac-hj-np-z]{38}$/; const sets = { adao: new Set(), pixel_lions_staked: new Set(), burning_lions: new Set(), automax_vp100k: new Set() };
  for (const [slug, key, keep] of [['adao', 'adao', () => true], ['pixel-lions', 'pixel_lions_staked', (st) => /^staked/.test(st)]]) {
    const idx = await getJson(`${RAW}/nft-collections/main/${slug}/ledger/by-wallet/index.json`); if (!idx.ok) throw new Error(slug + ' index unreadable');
    for (const s of Object.keys(idx.json.shards || {})) { const r = await getJson(`${RAW}/nft-collections/main/${slug}/ledger/by-wallet/${s}.json`); if (!r.ok) throw new Error(`${slug} shard ${s} unreadable`);
      for (const [a, v] of Object.entries(r.json.wallets || {})) if (W.test(a) && ((v.holdings_now && v.holdings_now.tokens) || []).some(t => keep(t.state))) sets[key].add(a); }
  }
  { const r = await getJson(`${RAW}/nft-collections/main/burning-lions/snapshots/nfts.json`); if (!r.ok) throw new Error('burning lions unreadable'); for (const x of r.json.records || []) { const o = x.real_owner || x.owner; if (W.test(o || '')) sets.burning_lions.add(o); } }
  { const r = await getJson(`${RAW}/tla-core/main/member-data/participants/current.json`); if (!r.ok) throw new Error('participants unreadable');
    for (const m of r.json.members || []) if (((m.summary || {}).voting_power_human || 0) > 100000 && (m.locks || []).some(l => l.is_auto_max_locked)) sets.automax_vp100k.add(m.wallet); }
  const all = new Set(); const why = {}; for (const [k, s] of Object.entries(sets)) for (const a of s) { all.add(a); (why[a] = why[a] || []).push(k); }
  const doc = { version: VERSION, cut_day: DAY, rules: ['holds an aDAO NFT (any state)', 'a Pixel Lion staked (DAODAO or Enterprise)', 'holds a Burning Lion', 'a TLA auto-max lock with total VP > 100K'],
    counts: Object.fromEntries([...Object.entries(sets).map(([k, s]) => [k, s.size]), ['union', all.size]]), wallets: Object.fromEntries([...all].sort().map(a => [a, why[a]])) };
  writeJson(`cohort/${DAY}.json`, doc); writeJson('cohort/current.json', doc); commitPush(`cohort ${DAY}: ${all.size} wallets`);
  console.log(`cohort: ${JSON.stringify(doc.counts)}`);
}

// ── mode: layer1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function shardOk(a) { if (!SHARDS) return true; const c = a.slice(-1); return SHARDS.split(',').some(p => { const [x, y] = p.split('-'); return y ? c >= x && c <= y : c === x; }); }
async function walkWallet(w) {
  const seen = new Set(); const searches = {}; let part = [], partNo = 0, n = 0, maxH = 0; const dir = `layer1/${w.slice(-1)}/${w}`;
  fs.rmSync(A(dir), { recursive: true, force: true });
  const flush = () => { if (!part.length) return; fs.mkdirSync(A(dir), { recursive: true }); fs.writeFileSync(A(`${dir}/part-${String(partNo++).padStart(3, '0')}.jsonl.gz`), zlib.gzipSync(part.map(x => JSON.stringify(x)).join('\n') + '\n')); part = []; };
  for (const key of KEYS) {
    let page = 1, total = null, got = 0, err = null;
    while (true) {
      if (overBudget()) return { incomplete: true };
      const r = await txSearch(`${key}='${w}'`, page); if (r.error) { err = r.error; break; }
      total = r.total; got += r.txs.length;
      for (const t of r.txs) { if (seen.has(t.hash)) continue; seen.add(t.hash); const rec = shapeTx(t); rec.k = key; part.push(rec); n++; maxH = Math.max(maxH, rec.h); if (part.length >= PART_TXS) flush(); }
      if (!r.txs.length || got >= total) break; page++;
    }
    searches[key] = { total, pages: page, error: err || undefined };
  }
  flush();
  return { txs: n, parts: partNo, to_height: maxH || null, searches, errors: Object.values(searches).filter(s => s.error).length };
}
async function layer1() {
  const C = readJson('cohort/current.json', null); if (!C) throw new Error('no cohort — run MODE=cohort first');
  const man = readJson('layer1/_manifest.json', { version: VERSION, cohort_day: C.cut_day, keys: KEYS, wallets: {} });
  let todo = Object.keys(C.wallets).filter(shardOk).filter(a => !(man.wallets[a] && man.wallets[a].done));
  if (LIMIT_WALLETS) todo = todo.slice(0, LIMIT_WALLETS);
  console.log(`layer1: ${todo.length} wallets to walk (${Object.values(man.wallets).filter(x => x.done).length} already done) · concurrency ${CONC} · budget ${MAX_MIN} min`);
  let done = 0, txs = 0, errs = 0, lastCommit = Date.now();
  await pool(todo, CONC, async (w) => {
    if (overBudget()) return;
    const r = await walkWallet(w);
    if (r.incomplete) return;   // re-walked from scratch next run
    man.wallets[w] = { done: r.errors === 0, txs: r.txs, parts: r.parts, to_height: r.to_height, walked_at: new Date().toISOString(), searches: r.searches };
    done++; txs += r.txs; errs += r.errors ? 1 : 0;
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); man.updated_at = new Date().toISOString(); writeJson('layer1/_manifest.json', man); commitPush(`layer1: +${done} wallets`); }
    if (done % 25 === 0) console.log(`  … ${done}/${todo.length} wallets · ${txs} txs · ${errs} with a failed search · ${minutes().toFixed(0)} min · ${stats.requests} requests`);
  });
  man.updated_at = new Date().toISOString(); man.counts = { wallets_done: Object.values(man.wallets).filter(x => x.done).length, wallets_with_errors: Object.values(man.wallets).filter(x => !x.done).length, txs: Object.values(man.wallets).reduce((x, v) => x + (v.txs || 0), 0) };
  writeJson('layer1/_manifest.json', man); commitPush(`layer1: ${man.counts.wallets_done} wallets done`);
  console.log(`layer1 run: ${done} wallets · ${txs} txs · ${errs} with a failed search (re-walked next run) · ${minutes().toFixed(0)} min · ${stats.requests} requests, ${stats.retries} retries · total done ${man.counts.wallets_done}/${Object.keys(C.wallets).length}${overBudget() ? ' · stopped at the time budget — run again to continue' : ''}`);
}

if (!RPCS.length && MODE !== 'cohort') { console.error('ARCHIVE_RPC not set'); process.exit(1); }
if (!T) console.log('note: cosmjs-types not installed — messages will not be decoded (events are still kept)');
const run = { timing, cohort, layer1 }[MODE]; if (!run) { console.error('unknown MODE ' + MODE); process.exit(1); }
await run();

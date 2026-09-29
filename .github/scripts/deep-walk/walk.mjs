// ── deep-walk 1.0 (2026-09-29) — SPEC-deep-history §8, LAYER 1: every tx of every cohort wallet, into the PRIVATE archive repo.
// Modes (env MODE):
//   timing  — how fast the archive answers: tx_search pages and smart queries at a past height, at concurrency 1 / 2 / 4 / 8; the
//             result sizes the whole walk (archive/timing/<date>.json + the numbers in the log). Nothing per wallet is read.
//   cohort  — builds the cut-date cohort from public products (aDAO holders · Pixel Lions staked incl. Enterprise · Burning Lion holders ·
//             auto-max lock with VP > 100K) → archive/cohort/<date>.json. Run once; layer1 reuses it.
//   inventory — reads layer 1 back: every contract the cohort touched (txs, wallets, actions, first/last height), its on-chain
//             label / code id / admin, our registry's name when we have one, message types, IBC channels and denoms seen →
//             archive/inventory/<day>.json (full) + docs/deep-history/contracts-seen.json in tla-core (counts only — no wallet)
//   layer2  — protocol state at every weekly boundary (Monday 00:00 UTC, the TLA epoch calendar extended back to Terra 2's first
//             week): every DEX pair the cohort touched ({pool:{}} — Astroport, URA, Terraswap-era, SkeletonSwap, Phoenix …), Credia
//             metrics, Solid market / oracle / whitelist, DAO NFT-voting totals — from the week the cohort first touched each one.
//             The boundary heights are resolved once (dex-state-history's for epochs 97+, block-time search for the rest) →
//             archive/layer2/heights.json; answers → archive/layer2/<code>/<contract>.jsonl.gz (one row per week); resumable.
//   layer1  — for each cohort wallet not yet done: tx_search for every attribute a wallet appears under (§8 list), deduplicated by hash,
//             decoded, and written as gzip parts to archive/layer1/<shard>/<wallet>/part-NNN.jsonl.gz + a per-wallet summary in the
//             manifest. Resumable (done wallets skipped), committed every few wallets, stops cleanly before the time budget.
// PRIVACY (§8b): the tx MEMO is never read into the output — the body is decoded and only its messages are kept; signer keys and
// sequences are dropped. The log prints COUNTS ONLY (this Action's log is public) — never a wallet, a hash or an amount.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { execSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VERSION = 'deep-walk-1.2';   // 1.2 (2026-09-29): mode layer2 — protocol state at every weekly boundary (pools, Credia, Solid, DAO voting), resumable   // 1.1 (2026-09-29): mode inventory — every contract the cohort touched, labeled, as an AGGREGATE (no wallets) for tla-core
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
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA, 'x-cosmos-block-height': String(height) }, signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (r.ok) return { ok: true, json: JSON.parse(t) }; last = { status: r.status, body: t.slice(0, 300) }; if (/no such contract|not found|unknown variant|parse|Error parsing|unknown request/i.test(t)) break; if (r.status < 500 && r.status !== 429) break; }
    catch (e) { last = { status: 0 }; } stats.retries++; await sleep(1000 * (i + 1)); }
  stats.errors++; return { ok: false, status: last && last.status, body: last && last.body };
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

// ── mode: inventory ────────────────────────────────────────────────────────────────────────────────────────────────────────
async function inventory() {
  const man = readJson('layer1/_manifest.json', null); if (!man) throw new Error('no layer1 manifest');
  const C = new Map(); const msgTypes = {}; const channels = {}; const denoms = {}; let txs = 0, wallets = 0;
  const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
  for (const w of Object.keys(man.wallets)) {
    const dir = A(`layer1/${w.slice(-1)}/${w}`); if (!fs.existsSync(dir)) continue; wallets++; const touched = new Set();
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl.gz')).sort()) {
      for (const line of zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8').split('\n')) {
        if (!line) continue; let t; try { t = JSON.parse(line); } catch { continue; } txs++;
        for (const m of t.m || []) bump(msgTypes, m.type);
        for (const e of t.e || []) {
          if (/^wasm/.test(e.t)) { const at = Object.fromEntries(e.a); const c = at._contract_address; if (!c) continue;
            let x = C.get(c); if (!x) { x = { txs: 0, wallets: 0, actions: {}, first_h: t.h, last_h: t.h, _tx: null }; C.set(c, x); }
            if (x._tx !== t.x) { x._tx = t.x; x.txs++; x.first_h = Math.min(x.first_h, t.h); x.last_h = Math.max(x.last_h, t.h); }
            if (at.action) bump(x.actions, at.action); touched.add(c); }
          if (e.t === 'send_packet' || e.t === 'recv_packet' || e.t === 'fungible_token_packet') { const at = Object.fromEntries(e.a); const ch = at.packet_src_channel || at.packet_dst_channel; if (ch) bump(channels, (e.t === 'send_packet' ? 'out ' : 'in ') + ch); if (at.denom) bump(denoms, 'ibc-packet ' + String(at.denom).slice(0, 80)); }
          if (e.t === 'transfer') for (const [k, v] of e.a) if (k === 'amount') for (const part of String(v).split(',')) { const m = part.match(/^\d+(.+)$/); if (m) bump(denoms, m[1].slice(0, 120)); }
        }
      }
    }
    for (const c of touched) C.get(c).wallets++;
  }
  console.log(`inventory: ${wallets} wallets · ${txs} txs · ${C.size} contracts · ${Object.keys(msgTypes).length} message types`);
  // labels: our registry (public) + the chain's contract_info (label, code id, admin)
  const known = await getJson(`${RAW}/tla-core/main/docs/curated/known_contracts.json`); const K = (known.ok && known.json.contracts) || {};
  const list = [...C.entries()].sort((a, b) => b[1].wallets - a[1].wallets || b[1].txs - a[1].txs);
  const toLabel = list.filter(([, x]) => x.wallets >= 2 || x.txs >= 5).slice(0, 5000); for (const [, x] of list) { delete x._tx; x.actions = Object.fromEntries(Object.entries(x.actions).sort((p, q) => q[1] - p[1]).slice(0, 12)); }
  let n = 0; await pool(toLabel, 6, async ([addr, x]) => {
    const r = await getJson(`${LCD}/cosmwasm/wasm/v1/contract/${addr}`, 3, 20000); const ci = r.ok ? r.json.contract_info : null;
    x.label = ci ? ci.label : null; x.code_id = ci ? ci.code_id : null; x.admin = ci ? ci.admin : null; x.creator = ci ? ci.creator : null;
    const k = K[addr]; x.known = k ? { name: k.name, protocol: k.protocol || null, type: k.type || null } : null;
    if (++n % 200 === 0) console.log(`  … labels ${n}/${toLabel.length}`);
  });
  for (const [addr, x] of list) if (x.known === undefined) { const k = K[addr]; x.known = k ? { name: k.name, protocol: k.protocol || null, type: k.type || null } : null; }
  // by code id: many contracts share one code (every Astroport pair, every cw20) — the protocol view
  const byCode = {}; for (const [a, x] of list) { const k = x.code_id || '?'; const b = byCode[k] || (byCode[k] = { contracts: 0, txs: 0, wallets_max: 0, labels: {}, known: {} }); b.contracts++; b.txs += x.txs; b.wallets_max = Math.max(b.wallets_max, x.wallets); if (x.label) bump(b.labels, x.label.slice(0, 60)); if (x.known) bump(b.known, x.known.protocol || x.known.name); }
  for (const b of Object.values(byCode)) { b.labels = Object.fromEntries(Object.entries(b.labels).sort((p, q) => q[1] - p[1]).slice(0, 5)); }
  const doc = { version: VERSION, day: DAY, cohort_day: man.cohort_day, cohort_wallets: wallets, txs,
    note: 'Every contract the deep-history cohort touched in its full tx history (layer 1). COUNTS ONLY — no wallet is named. known = our registry (docs/curated/known_contracts.json); label / code_id / admin from the chain. Unknown busy contracts are the ones to label.',
    counts: { contracts: list.length, known: list.filter(([, x]) => x.known).length, unknown_with_10plus_wallets: list.filter(([, x]) => !x.known && x.wallets >= 10).length },
    message_types: Object.fromEntries(Object.entries(msgTypes).sort((a, b) => b[1] - a[1])), ibc_channels: Object.fromEntries(Object.entries(channels).sort((a, b) => b[1] - a[1])),
    denoms_top: Object.fromEntries(Object.entries(denoms).sort((a, b) => b[1] - a[1]).slice(0, 150)), by_code_id: byCode,
    contracts: Object.fromEntries(list.filter(([, x]) => x.wallets >= 2 || x.known).map(([a, x]) => [a, x])) };
  writeJson(`inventory/${DAY}.json`, Object.assign({}, doc, { contracts: Object.fromEntries(list) })); commitPush(`inventory ${DAY}: ${list.length} contracts`);
  const outDir = process.env.CORE_OUT; if (outDir) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'contracts-seen.json'), JSON.stringify(doc, null, 1) + '\n'); }
  console.log(`inventory: ${doc.counts.contracts} contracts · ${doc.counts.known} in our registry · ${doc.counts.unknown_with_10plus_wallets} unknown ones used by 10+ cohort wallets · ${Object.keys(byCode).length} code ids`);
}

// ── mode: layer2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const WEEK = 7 * 864e5; const EPOCH1 = Date.parse('2022-10-31T00:00:00Z');   // TLA epoch 1; boundaries before it continue the same Mondays back
const PAIR_CODES = new Set(['392', '2569', '71', '428', '2267', '322', '3279', '3720', '2961', '1723', '3171', '40', '3107']);
const SOLID = { market: 'terra1h4cknjl5k0aysdhv0h4eqcaka620g8h69k8h0pjjccxvf9esfhws3cyqnc', overseer: 'terra10qnsw3wn4uaxs7en2kynhet2dsyy76lmprh2ptcz85d8hu59gkuqcpndnv', oracle: 'terra199pgv9dymcg9q8xtwsxk7yakazmvlf5ptkqh4zadcv7k0yqsal2q6tq7mv' };
async function blockAt(h) { for (const rpc of RPCS) { const r = await getJson(`${rpc}/block?height=${h}`, 3, 20000); const t = r.ok && r.json.result && r.json.result.block && r.json.result.block.header.time; if (t) return Date.parse(t); } return null; }
async function latestHeight() { for (const rpc of RPCS) { const r = await getJson(`${rpc}/status`, 3, 20000); const h = r.ok && r.json.result && r.json.result.sync_info && Number(r.json.result.sync_info.latest_block_height); if (h) return h; } return null; }
// the last block at or before t (secant search between two bracketing blocks; ~6–10 block reads)
async function heightAt(t, lo, hi) {
  let tl = await blockAt(lo.h) ?? lo.t, th = await blockAt(hi.h) ?? hi.t; let a = { h: lo.h, t: tl }, b = { h: hi.h, t: th };
  for (let i = 0; i < 40 && b.h - a.h > 1; i++) {
    let g = Math.round(a.h + (b.h - a.h) * (t - a.t) / Math.max(1, b.t - a.t)); g = Math.min(b.h - 1, Math.max(a.h + 1, g));
    if (i % 3 === 2) g = Math.floor((a.h + b.h) / 2);   // guarantee progress
    const tg = await blockAt(g); if (tg == null) return null;
    if (tg <= t) a = { h: g, t: tg }; else b = { h: g, t: tg };
  }
  return a;
}
async function boundaries() {
  const have = readJson('layer2/heights.json', null); const now = Date.now();
  const all = []; for (let t = EPOCH1; t >= Date.parse('2022-05-30T00:00:00Z'); t -= WEEK) all.unshift(t); for (let t = EPOCH1 + WEEK; t <= now; t += WEEK) all.push(t);
  const out = have || { note: 'last block at or before each Monday 00:00 UTC (the TLA epoch calendar; epoch = (t − 2022-10-31) / 7d + 1, ≤ 0 before it)', rows: {} };
  // epochs 97+ from dex-state-history (already resolved on this archive node)
  for (let e = 97; e < 400; e++) { const d = new Date(EPOCH1 + (e - 1) * WEEK).toISOString().slice(0, 10); if (out.rows[d] || EPOCH1 + (e - 1) * WEEK > now) continue;
    const r = await getJson(`${RAW}/tla-core/main/dex-data/state-history/epochs/${e}.json`, 2, 15000); if (r.ok && r.json.height) out.rows[d] = { h: r.json.height, epoch: e, src: 'dex-state-history' }; }
  const top = await latestHeight(); const topT = top ? await blockAt(top) : now; let lo = { h: 1, t: Date.parse('2022-05-28T06:00:00Z') };
  for (const t of all) { const d = new Date(t).toISOString().slice(0, 10); if (out.rows[d]) { lo = { h: out.rows[d].h, t }; continue; } if (overBudget()) break;
    const nextKnown = Object.values(out.rows).filter(x => x.h > lo.h).sort((x, y) => x.h - y.h)[0]; const hi = nextKnown ? { h: nextKnown.h, t: Date.parse(Object.keys(out.rows).find(k => out.rows[k] === nextKnown) + 'T00:00:00Z') } : { h: top, t: topT };
    const r = await heightAt(t, lo, hi); if (!r) { console.log('  heights: a block read failed — stopping here'); break; }
    out.rows[d] = { h: r.h, epoch: Math.floor((t - EPOCH1) / WEEK) + 1, src: 'block search' }; lo = { h: r.h, t };
  }
  out.rows = Object.fromEntries(Object.entries(out.rows).sort()); writeJson('layer2/heights.json', out);
  return Object.entries(out.rows).map(([d, x]) => ({ d, h: x.h, epoch: x.epoch }));
}
function layer2Targets() {
  const inv = (fs.readdirSync(A('inventory')).filter(f => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop()); if (!inv) throw new Error('no inventory — run MODE=inventory first');
  const I = readJson('inventory/' + inv, null); const T = [];
  for (const [addr, x] of Object.entries(I.contracts)) {
    const code = String(x.code_id || '');
    if (PAIR_CODES.has(code) && x.actions && (x.actions.swap || x.actions.provide_liquidity || x.actions.withdraw_liquidity)) T.push({ key: `${code}/${addr}`, addr, q: { pool: {} }, from_h: x.first_h, kind: 'pair' });
    if (code === '3995') T.push({ key: `${code}/${addr}`, addr, q: { metrics: {} }, from_h: x.first_h, kind: 'credia' });
    if (code === '3193') T.push({ key: `${code}/${addr}`, addr, q: { total_power_at_height: {} }, from_h: x.first_h, kind: 'dao_voting' });
  }
  const sFrom = Math.min(...['2413', '1431'].map(c => Math.min(...Object.values(I.contracts).filter(x => String(x.code_id) === c).map(x => x.first_h), Infinity)));
  if (isFinite(sFrom)) { T.push({ key: 'solid/market', addr: SOLID.market, q: { state: {} }, from_h: sFrom, kind: 'solid' }); T.push({ key: 'solid/oracle', addr: SOLID.oracle, q: { prices: {} }, from_h: sFrom, kind: 'solid' }); T.push({ key: 'solid/whitelist', addr: SOLID.overseer, q: { whitelist: {} }, from_h: sFrom, kind: 'solid' }); }
  return T;
}
async function layer2() {
  const weeks = await boundaries(); console.log(`layer2: ${weeks.length} weekly boundaries resolved (${weeks[0] && weeks[0].d} → ${weeks[weeks.length - 1] && weeks[weeks.length - 1].d})`);
  const T = layer2Targets(); const man = readJson('layer2/_manifest.json', { version: VERSION, targets: {} });
  const tasks = []; for (const t of T) { const m = man.targets[t.key] || (man.targets[t.key] = { kind: t.kind, done: {} }); for (const w of weeks) if (w.h >= t.from_h - 120000 && !m.done[w.d]) tasks.push([t, w]); }
  console.log(`layer2: ${T.length} targets (${Object.entries(T.reduce((o, t) => (o[t.kind] = (o[t.kind] || 0) + 1, o), {})).map(([k, v]) => k + ' ' + v).join(' · ')}) · ${tasks.length} reads to do · concurrency ${CONC}`);
  const buf = new Map(); let n = 0, ok = 0, absent = 0, bad = 0, lastCommit = Date.now();
  const flush = () => { for (const [key, rows] of buf) { const f = `layer2/${key}.jsonl.gz`; let old = ''; try { old = zlib.gunzipSync(fs.readFileSync(A(f))).toString('utf8'); } catch { } fs.mkdirSync(path.dirname(A(f)), { recursive: true }); fs.writeFileSync(A(f), zlib.gzipSync(old + rows.map(r => JSON.stringify(r)).join('\n') + '\n')); } buf.clear(); man.updated_at = new Date().toISOString(); writeJson('layer2/_manifest.json', man); };
  await pool(tasks, CONC, async ([t, w]) => {
    if (overBudget()) return;
    const r = await smartAt(t.addr, t.q, w.h); n++;
    let row; if (r.ok) { ok++; let data = r.json && r.json.data; if (t.kind === 'pair' && data) data = { assets: (data.assets || []).map(a => [a.info && (a.info.native_token ? a.info.native_token.denom : a.info.token && a.info.token.contract_addr), a.amount]), total_share: data.total_share }; row = { d: w.d, h: w.h, data }; }
    else if (/no such contract|not found/i.test(r.body || '')) { absent++; row = { d: w.d, h: w.h, absent: true }; }
    else { bad++; return; }   // not recorded as done — retried next run
    (buf.get(t.key) || buf.set(t.key, []).get(t.key)).push(row); man.targets[t.key].done[w.d] = 1;
    if (n % 2000 === 0) console.log(`  … ${n}/${tasks.length} reads · ok ${ok} · absent ${absent} · failed ${bad} · ${minutes().toFixed(0)} min`);
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); flush(); commitPush(`layer2: +${n} reads`); }
  });
  flush(); commitPush(`layer2: ${ok} answers`);
  const left = tasks.length - ok - absent;
  try { fs.writeFileSync('layer2_left.txt', String(Math.max(0, left))); } catch { }
  console.log(`layer2 run: ${n} reads · ok ${ok} · contract not yet / no longer there ${absent} · failed ${bad} (retried next run) · ${minutes().toFixed(0)} min · ${left > 0 ? left + ' reads left — run again' : 'ALL DONE'}`);
}

if (!RPCS.length && MODE !== 'cohort' && MODE !== 'inventory') { console.error('ARCHIVE_RPC not set'); process.exit(1); }
if (!T) console.log('note: cosmjs-types not installed — messages will not be decoded (events are still kept)');
const run = { timing, cohort, layer1, inventory, layer2 }[MODE]; if (!run) { console.error('unknown MODE ' + MODE); process.exit(1); }
await run();

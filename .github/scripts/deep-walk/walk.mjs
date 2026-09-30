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
//   layer3  — per-wallet CHECKPOINTS the events cannot fully give: bank balances (all native denoms), staking delegations and
//             unbonding at the first weekly boundary of every month from the wallet's first tx → archive/layer3/<shard>/<wallet>.jsonl.gz.
//             Everything else per wallet (cw20s, LP tokens, amp shares, locks, Credia, Solid, Votion) is rebuilt from its own events.
//   flows   — the derive, no chain reads: every native (coin_spent / coin_received) and cw20 (transfer / send / mint / burn) balance
//             change of each wallet from layer 1, with its counterparty, → archive/derived/flows/<shard>/<wallet>.json.gz: per-denom
//             balances at every weekly boundary + the flow list; checked against the layer 3 checkpoints where they exist.
//   layer1  — for each cohort wallet not yet done: tx_search for every attribute a wallet appears under (§8 list), deduplicated by hash,
//             decoded, and written as gzip parts to archive/layer1/<shard>/<wallet>/part-NNN.jsonl.gz + a per-wallet summary in the
//             manifest. Resumable (done wallets skipped), committed every few wallets, stops cleanly before the time budget.
// PRIVACY (§8b): the tx MEMO is never read into the output — the body is decoded and only its messages are kept; signer keys and
// sequences are dropped. The log prints COUNTS ONLY (this Action's log is public) — never a wallet, a hash or an amount.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { execSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VERSION = 'deep-walk-1.5';   // 1.5 (2026-09-30): the node keeps full TX history but not all old STATE ("version does not exist … pruned" at 1.83M) — each state mode finds the node's state floor (binary search) and skips older reads (reported, not retried); a contract that refuses the question (unknown request / variant) is recorded and skipped after 3; the route test tries up to 8 busiest contracts   // 1.4 (2026-09-30): state reads go through the archive RPC (abci_query) with the LCD as fallback — layer2 runs #6–#9 failed every LCD read; each state mode tests both routes at a recent AND an old height first and stops red (no chain) when neither answers; 150 failures in a row stop a run; the top failure messages are printed   // 1.3 (2026-09-29): modes layer3 (monthly bank + staking checkpoints per wallet) and flows (every native / cw20 balance change per wallet rebuilt from layer 1, sampled weekly)   // 1.2 (2026-09-29): mode layer2 — protocol state at every weekly boundary (pools, Credia, Solid, DAO voting), resumable   // 1.1 (2026-09-29): mode inventory — every contract the cohort touched, labeled, as an AGGREGATE (no wallets) for tla-core
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
async function smartLcd(addr, q, height) {
  const url = `${LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${b64(q)}`;
  let last = null;
  for (let i = 0; i < 4; i++) { stats.requests++;
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA, 'x-cosmos-block-height': String(height) }, signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (r.ok) return { ok: true, json: JSON.parse(t) }; last = { status: r.status, body: t.slice(0, 300) }; if (/no such contract|not found|unknown variant|parse|Error parsing|unknown request|does not exist|pruned|failed to load state/i.test(t)) break; if (r.status < 500 && r.status !== 429) break; }
    catch (e) { last = { status: 0 }; } stats.retries++; await sleep(1000 * (i + 1)); }
  stats.errors++; return { ok: false, status: last && last.status, body: last && last.body };
}
// ── 1.4: state reads through the archive RPC (abci_query — the path layer 1 proved) with the LCD as the fallback ──────────
// 2026-09-30: layer2 runs #6–#9 failed EVERY read through the LCD (instant errors, 4 retries each, 13 h for nothing). Now every
// state-reading mode tests both routes first, picks one that answers at an OLD height, and stops (red, no chain) when neither does.
const Q = (() => { try { return { w: require('cosmjs-types/cosmwasm/wasm/v1/query'), b: require('cosmjs-types/cosmos/bank/v1beta1/query'), s: require('cosmjs-types/cosmos/staking/v1beta1/query') }; } catch { return null; } })();
const NO_RETRY = /no such contract|not found|unknown variant|parse|Error parsing|unknown request|does not exist|pruned|failed to load state|invalid/i;
async function abci(route, bytes, height) {
  let last = null;
  for (let i = 0; i < 4; i++) { for (const rpc of RPCS) { stats.requests++;
    try { const r = await fetch(`${rpc}/abci_query?path=${encodeURIComponent('"' + route + '"')}&data=0x${Buffer.from(bytes).toString('hex')}&height=${height}&prove=false`, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { } const resp = j && j.result && j.result.response;
      if (r.ok && resp) { if (!resp.code) return { ok: true, value: Buffer.from(resp.value || '', 'base64') };
        last = { status: 500, body: String(resp.log || resp.info || 'abci code ' + resp.code).slice(0, 300) }; if (NO_RETRY.test(last.body)) { stats.errors++; return { ok: false, ...last }; } }
      else last = { status: r.status, body: String((j && j.error && (j.error.data || j.error.message)) || t).slice(0, 300) };
    } catch (e) { last = { status: 0, body: e.message }; } }
    stats.retries++; await sleep(1000 * (i + 1)); }
  stats.errors++; return { ok: false, ...last };
}
async function smartRpc(addr, q, height) {
  const r = await abci('/cosmwasm.wasm.v1.Query/SmartContractState', Q.w.QuerySmartContractStateRequest.encode({ address: addr, queryData: Buffer.from(JSON.stringify(q)) }).finish(), height);
  if (!r.ok) return r; try { return { ok: true, json: { data: JSON.parse(Buffer.from(Q.w.QuerySmartContractStateResponse.decode(r.value).data).toString('utf8')) } }; } catch (e) { return { ok: false, status: 0, body: 'decode: ' + e.message }; }
}
async function stateRpc(kind, w, height) {   // layer 3 — answers in the LCD's JSON shape
  if (kind === 'bank') { const r = await abci('/cosmos.bank.v1beta1.Query/AllBalances', Q.b.QueryAllBalancesRequest.encode(Q.b.QueryAllBalancesRequest.fromPartial({ address: w, pagination: { limit: 500n } })).finish(), height); if (!r.ok) return r;
    return { ok: true, json: { balances: Q.b.QueryAllBalancesResponse.decode(r.value).balances.map(c => ({ denom: c.denom, amount: c.amount })) } }; }
  if (kind === 'delegations') { const r = await abci('/cosmos.staking.v1beta1.Query/DelegatorDelegations', Q.s.QueryDelegatorDelegationsRequest.encode(Q.s.QueryDelegatorDelegationsRequest.fromPartial({ delegatorAddr: w, pagination: { limit: 200n } })).finish(), height); if (!r.ok) return r;
    return { ok: true, json: { delegation_responses: Q.s.QueryDelegatorDelegationsResponse.decode(r.value).delegationResponses.map(x => ({ delegation: { validator_address: x.delegation && x.delegation.validatorAddress }, balance: { amount: x.balance && x.balance.amount } })) } }; }
  const r = await abci('/cosmos.staking.v1beta1.Query/DelegatorUnbondingDelegations', Q.s.QueryDelegatorUnbondingDelegationsRequest.encode(Q.s.QueryDelegatorUnbondingDelegationsRequest.fromPartial({ delegatorAddr: w, pagination: { limit: 200n } })).finish(), height); if (!r.ok) return r;
  return { ok: true, json: { unbonding_responses: Q.s.QueryDelegatorUnbondingDelegationsResponse.decode(r.value).unbondingResponses.map(x => ({ validator_address: x.validatorAddress, entries: (x.entries || []).map(e => ({ balance: e.balance, completion_time: e.completionTime ? new Date(Number(e.completionTime.seconds) * 1000).toISOString() : null })) })) } };
}
let ROUTE = (Q && RPCS.length) ? 'rpc' : 'lcd';
const smartAt = (addr, q, height) => ROUTE === 'rpc' ? smartRpc(addr, q, height) : smartLcd(addr, q, height);
const say = (r) => r.ok ? 'ok' : `HTTP ${r.status}: ${String(r.body || '').replace(/https?:\/\/[^\s"']+/g, '<url>').slice(0, 160)}`;
// 1.5 (2026-09-30, first 1.4 run): the node answered "version does not exist … pruned" at block 1.83M (mid-2022) on BOTH routes — it keeps
// the full TX history but NOT all old STATE. So each state mode first finds, per route: (1) the lowest block whose state the node still
// has (a bank read, binary search to ~2,000 blocks), (2) a contract that answers at the newest week (up to 8 of the busiest targets —
// one refusing the question is that contract, not the node). Reads below that floor are skipped and reported, never retried.
const PRUNED = /does not exist|pruned|failed to load state|version mismatch|lowest height is/i;
const TREASURY = 'terra1sffd4efk2jpdt894r04qwmtjqrrjfc52tmj6vkzjxqhd8qqu2drs3m5vzm';   // any address works for a bank read; this one is public
const smartVia = (rt, addr, q, h) => rt === 'rpc' ? smartRpc(addr, q, h) : smartLcd(addr, q, h);
const bankVia = (rt, addr, h) => rt === 'rpc' ? stateRpc('bank', addr, h) : lcdAt(`/cosmos/bank/v1beta1/balances/${addr}?pagination.limit=500`, h);
async function chooseRoute(label, samples, weeks) {
  const top = await latestHeight(); if (!top) { console.log('route: the archive RPC /status did not answer — stopping'); try { fs.writeFileSync(`${MODE}_stop.txt`, '1'); } catch { } process.exitCode = 1; return null; }
  const dateOf = (h) => { const w = weeks.find(x => x.h >= h); return w ? 'week of ' + w.d : 'after the last week'; };
  const routes = []; if (Q && RPCS.length) routes.push('rpc'); if (process.env.ARCHIVE_LCD) routes.push('lcd');
  for (const rt of routes) {
    const rTop = await bankVia(rt, TREASURY, top - 20);
    if (!rTop.ok) { console.log(`route test (${label}) · ${rt}: a bank read at the newest block failed — ${say(rTop)}`); continue; }
    let floor = 1; const r1 = await bankVia(rt, TREASURY, 2);
    if (!r1.ok) { if (!PRUNED.test(r1.body || '')) { console.log(`route test (${label}) · ${rt}: an early bank read failed for a reason other than pruning — ${say(r1)}`); continue; }
      let lo = 2, hi = top - 20, odd = null;
      while (hi - lo > 2000) { const mid = Math.floor((lo + hi) / 2); const r = await bankVia(rt, TREASURY, mid); if (r.ok) hi = mid; else if (PRUNED.test(r.body || '')) lo = mid; else { odd = r; break; } }
      if (odd) { console.log(`route test (${label}) · ${rt}: the state-floor search hit an unexpected answer — ${say(odd)}`); continue; }
      floor = hi; }
    const recent = weeks[weeks.length - 1]; const tried = []; let hit = !samples.length;
    for (const t of samples.slice(0, 8)) { const r = await smartVia(rt, t.addr, t.q, recent.h); tried.push(`${t.key}: ${say(r)}`.slice(0, 140)); if (r.ok) { hit = true; break; } }
    console.log(`route test (${label}) · ${rt}: state kept from block ${floor.toLocaleString('en-US')} (${dateOf(floor)}) — ${floor > 2 ? 'older weeks are not readable on this node' : 'full history'}${tried.length ? ' · contract reads at the newest week: ' + tried.join(' | ') : ''}`);
    if (hit) { ROUTE = rt; console.log(`route: ${rt}`); return { floor }; }
  }
  console.log('route: no route answered — stopping (nothing written, no next run). Read the route test lines above.');
  try { fs.writeFileSync(`${MODE}_stop.txt`, '1'); } catch { } process.exitCode = 1; return null;
}
function breaker() {   // stops a run after 150 failures in a row — a dead route must not burn hours again
  let inRow = 0; const samples = {};
  return { ok() { inRow = 0; }, bad(r) { inRow++; const k = say(r).slice(0, 90); samples[k] = (samples[k] || 0) + 1; return inRow >= 150; },
    report() { const top = Object.entries(samples).sort((a, b) => b[1] - a[1]).slice(0, 3); if (top.length) console.log('failures seen: ' + top.map(([k, v]) => `${v}× ${k}`).join(' | ')); } };
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
  const tasks = []; for (const t of T) { const m = man.targets[t.key] || (man.targets[t.key] = { kind: t.kind, done: {} }); if ((m.unsupported_n || 0) >= 3) continue; for (const w of weeks) if (w.h >= t.from_h - 120000 && !m.done[w.d]) tasks.push([t, w]); }
  console.log(`layer2: ${T.length} targets (${Object.entries(T.reduce((o, t) => (o[t.kind] = (o[t.kind] || 0) + 1, o), {})).map(([k, v]) => k + ' ' + v).join(' · ')}) · ${tasks.length} reads to do · concurrency ${CONC}`);
  let below = 0, unsupported = 0;
  if (tasks.length) {
    const per = new Map(); for (const [x] of tasks) per.set(x, (per.get(x) || 0) + 1);
    const samples = [...per.entries()].sort((a, b) => b[1] - a[1]).map(([x]) => x);
    const pick = await chooseRoute('layer2', samples, weeks); if (!pick) return;
    man.state_floor = { route: ROUTE, block: pick.floor, checked_at: new Date().toISOString() };
    const keep = tasks.filter(([, w]) => w.h >= pick.floor); below = tasks.length - keep.length; tasks.length = 0; tasks.push(...keep);
    if (below) console.log(`layer2: ${below} reads are older than the node's state (skipped — not retried; they need another source)`); }
  const brk = breaker(); let halted = false;
  const buf = new Map(); let n = 0, ok = 0, absent = 0, bad = 0, lastCommit = Date.now();
  const flush = () => { for (const [key, rows] of buf) { const f = `layer2/${key}.jsonl.gz`; let old = ''; try { old = zlib.gunzipSync(fs.readFileSync(A(f))).toString('utf8'); } catch { } fs.mkdirSync(path.dirname(A(f)), { recursive: true }); fs.writeFileSync(A(f), zlib.gzipSync(old + rows.map(r => JSON.stringify(r)).join('\n') + '\n')); } buf.clear(); man.updated_at = new Date().toISOString(); writeJson('layer2/_manifest.json', man); };
  await pool(tasks, CONC, async ([t, w]) => {
    if (overBudget() || halted || (man.targets[t.key].unsupported_n || 0) >= 3) return;
    const r = await smartAt(t.addr, t.q, w.h); n++;
    let row; if (r.ok) { ok++; let data = r.json && r.json.data; if (t.kind === 'pair' && data) data = { assets: (data.assets || []).map(a => [a.info && (a.info.native_token ? a.info.native_token.denom : a.info.token && a.info.token.contract_addr), a.amount]), total_share: data.total_share }; row = { d: w.d, h: w.h, data }; }
    else if (/no such contract|not found/i.test(r.body || '')) { absent++; row = { d: w.d, h: w.h, absent: true }; }
    else if (/unknown variant|Error parsing into type|unknown request/i.test(r.body || '')) { unsupported++; row = { d: w.d, h: w.h, unsupported: String(r.body).slice(0, 120) }; }   // this contract does not answer this question — recorded once per week, not retried
    else { bad++; if (brk.bad(r) && !halted) { halted = true; console.log('layer2: 150 failures in a row — stopping this run (no next run)'); try { fs.writeFileSync('layer2_stop.txt', '1'); } catch { } process.exitCode = 1; } return; }   // not recorded as done — retried next run
    brk.ok();
    if (row.unsupported) man.targets[t.key].unsupported_n = (man.targets[t.key].unsupported_n || 0) + 1;   // 3 refusals → the target is skipped from then on
    (buf.get(t.key) || buf.set(t.key, []).get(t.key)).push(row); man.targets[t.key].done[w.d] = 1;
    if (n % 2000 === 0) console.log(`  … ${n}/${tasks.length} reads · ok ${ok} · absent ${absent} · failed ${bad} · ${minutes().toFixed(0)} min`);
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); flush(); commitPush(`layer2: +${n} reads`); }
  });
  flush(); if (ok || absent) commitPush(`layer2: ${ok} answers`); brk.report();
  const skippedUnsup = tasks.filter(([t, w]) => (man.targets[t.key].unsupported_n || 0) >= 3 && !man.targets[t.key].done[w.d]).length;
  const left = tasks.length - ok - absent - unsupported - skippedUnsup;
  try { fs.writeFileSync('layer2_left.txt', String(Math.max(0, left))); } catch { }
  console.log(`layer2 run: ${n} reads · ok ${ok} · contract not yet / no longer there ${absent} · question not supported ${unsupported}${skippedUnsup ? ' (+' + skippedUnsup + ' skipped on those contracts)' : ''} · older than the node's state ${below} · failed ${bad} (retried next run) · ${minutes().toFixed(0)} min · ${left > 0 ? left + ' reads left — run again' : 'ALL DONE'}`);
}

// ── helpers shared by layer3 / flows ──────────────────────────────────────────────────────────────────────────────────────
function walletTxs(w) {   // every layer-1 record of one wallet (small enough per wallet; the parts are read one at a time)
  const dir = A(`layer1/${w.slice(-1)}/${w}`); const out = []; if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl.gz')).sort()) for (const line of zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8').split('\n')) { if (line) { try { out.push(JSON.parse(line)); } catch { } } }
  return out.sort((a, b) => a.h - b.h || (a.i || 0) - (b.i || 0));
}
async function lcdAt(p, height) {
  let last = { status: 0, body: '' };
  for (let i = 0; i < 4; i++) { stats.requests++;
    try { const r = await fetch(`${LCD}${p}`, { headers: { Accept: 'application/json', 'User-Agent': UA, 'x-cosmos-block-height': String(height) }, signal: AbortSignal.timeout(30000) }); const t = await r.text();
      if (r.ok) return { ok: true, json: JSON.parse(t) }; last = { status: r.status, body: t.slice(0, 200) }; if ((r.status < 500 && r.status !== 429) || /does not exist|pruned|failed to load state/i.test(t)) return { ok: false, ...last }; } catch (e) { last = { status: 0, body: e.message }; }
    stats.retries++; await sleep(1000 * (i + 1)); }
  stats.errors++; return { ok: false, ...last };
}
function monthlyBoundaries() { const H = readJson('layer2/heights.json', null); if (!H) return null; const seen = new Set(); const out = [];
  for (const [d, x] of Object.entries(H.rows)) { const m = d.slice(0, 7); if (seen.has(m)) continue; seen.add(m); out.push({ d, h: x.h }); } return out; }

// ── mode: layer3 (checkpoints) ────────────────────────────────────────────────────────────────────────────────────────────
async function layer3() {
  const C = readJson('cohort/current.json', null); if (!C) throw new Error('no cohort');
  const months = monthlyBoundaries(); if (!months) { console.log('layer3: layer2/heights.json not there yet — run layer2 first (it resolves the boundary heights), then layer3'); try { fs.writeFileSync('layer3_left.txt', '1'); } catch { } return; }
  const man = readJson('layer3/_manifest.json', { version: VERSION, wallets: {} });
  const tasks = [];
  for (const w of Object.keys(C.wallets).filter(shardOk)) {
    const m = man.wallets[w] || (man.wallets[w] = { done: {} });
    if (m.first_h == null) { const txs = walletTxs(w); m.first_h = txs.length ? txs[0].h : null; }
    if (m.first_h == null) continue;
    for (const b of months) if (b.h >= m.first_h - 450000 && !m.done[b.d]) tasks.push([w, b]);   // from the month before its first tx
  }
  console.log(`layer3: ${Object.keys(man.wallets).length} wallets · ${months.length} monthly boundaries · ${tasks.length} checkpoints to read (3 reads each) · concurrency ${CONC}`);
  let below = 0;
  if (tasks.length) { const pick = await chooseRoute('layer3', [], months); if (!pick) return;
    man.state_floor = { route: ROUTE, block: pick.floor, checked_at: new Date().toISOString() };
    const keep = tasks.filter(([, b]) => b.h >= pick.floor); below = tasks.length - keep.length; tasks.length = 0; tasks.push(...keep);
    if (below) console.log(`layer3: ${below} checkpoints are older than the node's state (skipped — the flows derive covers those months from layer 1)`); }
  const brk = breaker(); let halted = false;
  const buf = new Map(); let n = 0, ok = 0, bad = 0, lastCommit = Date.now();
  const flush = () => { for (const [w, rows] of buf) { const f = `layer3/${w.slice(-1)}/${w}.jsonl.gz`; let old = ''; try { old = zlib.gunzipSync(fs.readFileSync(A(f))).toString('utf8'); } catch { } fs.mkdirSync(path.dirname(A(f)), { recursive: true }); fs.writeFileSync(A(f), zlib.gzipSync(old + rows.map(r => JSON.stringify(r)).join('\n') + '\n')); } buf.clear(); man.updated_at = new Date().toISOString(); writeJson('layer3/_manifest.json', man); };
  await pool(tasks, CONC, async ([w, b]) => {
    if (overBudget() || halted) return; n++;
    const [bank, del, unb] = ROUTE === 'rpc' ? await Promise.all(['bank', 'delegations', 'unbonding'].map(k => stateRpc(k, w, b.h))) : await Promise.all([lcdAt(`/cosmos/bank/v1beta1/balances/${w}?pagination.limit=500`, b.h), lcdAt(`/cosmos/staking/v1beta1/delegations/${w}?pagination.limit=200`, b.h), lcdAt(`/cosmos/staking/v1beta1/delegators/${w}/unbonding_delegations?pagination.limit=200`, b.h)]);
    if (!bank.ok) { bad++; if (brk.bad(bank) && !halted) { halted = true; console.log('layer3: 150 failures in a row — stopping this run (no next run)'); try { fs.writeFileSync('layer3_stop.txt', '1'); } catch { } process.exitCode = 1; } return; }   // retried next run
    brk.ok();
    const row = { d: b.d, h: b.h, bank: (bank.json.balances || []).map(c => [c.denom, c.amount]),
      delegations: del.ok ? (del.json.delegation_responses || []).map(x => [x.delegation.validator_address, x.balance && x.balance.amount]) : null,
      unbonding: unb.ok ? (unb.json.unbonding_responses || []).map(x => [x.validator_address, (x.entries || []).map(e => [e.balance, e.completion_time])]) : null };
    ok++; (buf.get(w) || buf.set(w, []).get(w)).push(row); man.wallets[w].done[b.d] = 1;
    if (n % 1000 === 0) console.log(`  … ${n}/${tasks.length} checkpoints · ok ${ok} · failed ${bad} · ${minutes().toFixed(0)} min`);
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); flush(); commitPush(`layer3: +${n} checkpoints`); }
  });
  flush(); if (ok) commitPush(`layer3: ${ok} checkpoints`); brk.report();
  const left = tasks.length - ok; try { fs.writeFileSync('layer3_left.txt', String(Math.max(0, left))); } catch { }
  console.log(`layer3 run: ${n} checkpoints · ok ${ok} · failed ${bad} (retried next run) · ${minutes().toFixed(0)} min · ${left > 0 ? left + ' left — run again' : 'ALL DONE'}`);
}

// ── mode: flows (derive, no chain reads) ─────────────────────────────────────────────────────────────────────────────────
// Native: coin_spent (spender = w) / coin_received (receiver = w) — every native balance change in a tx, fees included (a failed tx
// carries only its fee events). cw20: wasm transfer / send / transfer_from / send_from (from / to), mint (to), burn / burn_from (from),
// on the token's own contract. Counterparty: the other side of the matching bank transfer / cw20 event (a contract, a wallet, a module).
function flowsOf(w, txs) {
  const flows = [];   // [h, denom, delta(string, signed), counterparty|null, tx-kind]
  const addAmt = (s) => String(s || '').split(',').map(x => x.trim().match(/^(\d+)(.+)$/)).filter(Boolean).map(m => [m[2], m[1]]);
  for (const t of txs) {
    const kind = (t.m && t.m[0] && t.m[0].type || '').split('.').pop() || null;
    const cps = {};   // native counterparties from bank transfer events
    for (const e of t.e || []) if (e.t === 'transfer') { const a = Object.fromEntries(e.a);   // keyed by denom AND amount, so a fee is not tagged with the swap next to it
      if (a.recipient === w && a.sender) for (const [d, amt] of addAmt(a.amount)) { cps['in ' + d + ' ' + amt] = a.sender; cps['in ' + d] = cps['in ' + d] || a.sender; }
      if (a.sender === w && a.recipient) for (const [d, amt] of addAmt(a.amount)) { cps['out ' + d + ' ' + amt] = a.recipient; cps['out ' + d] = cps['out ' + d] || a.recipient; } }
    const feeAmts = new Set(((t.f && t.f.amount) || []).map(x => { const m = String(x).match(/^(\d+)(.+)$/); return m ? m[2] + ' ' + m[1] : ''; }));
    let feeSeen = false;
    for (const e of t.e || []) {
      if (e.t === 'coin_received' || e.t === 'coin_spent') { const a = Object.fromEntries(e.a); const who = e.t === 'coin_received' ? a.receiver : a.spender; if (who !== w) continue;
        for (const [d, amt] of addAmt(a.amount)) { const dir = e.t === 'coin_received' ? 'in ' : 'out ';
          // the tx fee: the first spend matching the fee in the auth info (tagged 'fee', no counterparty)
          if (dir === 'out ' && !feeSeen && feeAmts.has(d + ' ' + amt)) { feeSeen = true; flows.push([t.h, d, '-' + amt, null, 'fee']); continue; }
          flows.push([t.h, d, (dir === 'in ' ? '' : '-') + amt, cps[dir + d + ' ' + amt] || cps[dir + d] || null, kind]); } }
      else if (/^wasm/.test(e.t)) { const a = Object.fromEntries(e.a); const tok = a._contract_address; const act = a.action; if (!tok || !a.amount || !/^\d+$/.test(a.amount)) continue;
        if (['transfer', 'send', 'transfer_from', 'send_from'].includes(act)) { if (a.to === w && a.from !== w) flows.push([t.h, 'cw20:' + tok, a.amount, a.from || null, kind]); else if (a.from === w && a.to !== w) flows.push([t.h, 'cw20:' + tok, '-' + a.amount, a.to || a.contract || null, kind]); }
        else if (act === 'mint' && a.to === w) flows.push([t.h, 'cw20:' + tok, a.amount, tok, kind]);
        else if ((act === 'burn' || act === 'burn_from') && a.from === w) flows.push([t.h, 'cw20:' + tok, '-' + a.amount, tok, kind]);
      }
    }
  }
  return flows;
}
async function flowsMode() {
  const C = readJson('cohort/current.json', null); if (!C) throw new Error('no cohort');
  const H = readJson('layer2/heights.json', null); const weeks = H ? Object.entries(H.rows).map(([d, x]) => ({ d, h: x.h })) : [];
  let n = 0, nFlows = 0, checked = 0, agree = 0; const mism = {};
  for (const w of Object.keys(C.wallets).filter(shardOk)) {
    if (overBudget()) break;
    const txs = walletTxs(w); const flows = flowsOf(w, txs); n++; nFlows += flows.length;
    // balances at each weekly boundary (BigInt — raw units)
    const byDenom = {}; for (const f of flows) (byDenom[f[1]] = byDenom[f[1]] || []).push(f);
    const bal = {}; for (const [d, list] of Object.entries(byDenom)) { let i = 0, acc = 0n; bal[d] = weeks.map(wk => { while (i < list.length && list[i][0] <= wk.h) { acc += BigInt(list[i][2]); i++; } return acc.toString(); }); }
    // check against the layer 3 bank checkpoints (native only — the events that happen outside txs show up here as drift)
    const cp = fs.existsSync(A(`layer3/${w.slice(-1)}/${w}.jsonl.gz`)) ? zlib.gunzipSync(fs.readFileSync(A(`layer3/${w.slice(-1)}/${w}.jsonl.gz`))).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    const drift = [];
    for (const c of cp) { const wi = weeks.findIndex(x => x.d === c.d); if (wi < 0) continue; const chain = Object.fromEntries(c.bank || []);
      for (const d of new Set([...Object.keys(chain), ...Object.keys(bal).filter(k => !k.startsWith('cw20:'))])) { checked++; const mine = bal[d] ? BigInt(bal[d][wi]) : 0n; const theirs = BigInt(chain[d] || '0'); if (mine === theirs) agree++; else { drift.push([c.d, d, (theirs - mine).toString()]); mism[d] = (mism[d] || 0) + 1; } } }
    const out = { wallet: w, version: VERSION, weeks: weeks.map(x => x.d), balances: bal, flows, checkpoint_drift: drift };
    const f = `derived/flows/${w.slice(-1)}/${w}.json.gz`; fs.mkdirSync(path.dirname(A(f)), { recursive: true }); fs.writeFileSync(A(f), zlib.gzipSync(JSON.stringify(out)));
    if (n % 100 === 0) { console.log(`  … ${n} wallets · ${nFlows} balance changes`); }
  }
  const report = { version: VERSION, day: DAY, wallets: n, flows: nFlows, checkpoints_compared: checked, agree, agree_pct: checked ? +(100 * agree / checked).toFixed(1) : null, drift_by_denom_top: Object.fromEntries(Object.entries(mism).sort((a, b) => b[1] - a[1]).slice(0, 30)) };
  writeJson(`derived/flows/_report.json`, report); commitPush(`flows: ${n} wallets, ${nFlows} balance changes`);
  console.log(`flows: ${n} wallets · ${nFlows} balance changes · checkpoints compared ${checked}, exact ${agree} (${report.agree_pct ?? '—'}%)${checked ? '' : ' — no layer 3 checkpoints yet (run layer3, then flows again)'}`);
}

if (!RPCS.length && !['cohort', 'inventory', 'flows'].includes(MODE)) { console.error('ARCHIVE_RPC not set'); process.exit(1); }
if (!T) console.log('note: cosmjs-types not installed — messages will not be decoded (events are still kept)');
const run = { timing, cohort, layer1, inventory, layer2, layer3, flows: flowsMode }[MODE]; if (!run) { console.error('unknown MODE ' + MODE); process.exit(1); }
await run();

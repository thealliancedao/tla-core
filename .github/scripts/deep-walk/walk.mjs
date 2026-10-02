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
//   audit   — (1.7) reads the whole archive + a few small node samples and says what is missing and why: layer 1/2/3 expected vs
//             stored, the flows drift classified, cw20 balances vs the chain (sample), txs the search keys missed (sample), busy contracts
//             layer 2 never read (with their query API), price coverage of everything held → archive/audit/<day>.json + a counts-only
//             docs/deep-history/audit.json in tla-core. Run it before any more node time is spent.
//   gapfill — (1.8) fetches what the audit found missing (layer1b: 16 more search keys · layer2b: TLA / LST / CAPA / Lion DAO state
//             weekly · layer3b: missing delegations), then re-runs flows and the audit. Chains itself while work is left.
//   layer1  — for each cohort wallet not yet done: tx_search for every attribute a wallet appears under (§8 list), deduplicated by hash,
//             decoded, and written as gzip parts to archive/layer1/<shard>/<wallet>/part-NNN.jsonl.gz + a per-wallet summary in the
//             manifest. Resumable (done wallets skipped), committed every few wallets, stops cleanly before the time budget.
// PRIVACY (§8b): the tx MEMO is never read into the output — the body is decoded and only its messages are kept; signer keys and
// sequences are dropped. The log prints COUNTS ONLY (this Action's log is public) — never a wallet, a hash or an amount.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import { execSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VERSION = 'deep-walk-2.0.1';   // 2.0.1 (2026-10-02): the first ratios run published bond-tx rates that disagreed with the hub (ampLUNA +3.5 %, bLUNA ×6 — the staking rewards a delegation pays the hub in the same tx were counted as bonded LUNA; ampROAR / ampCAPA −50 % — a tokenfactory mint emits tf_mint AND coinbase, both were counted). Fixed (distribution-module transfers excluded; tf_mint counted, coinbase only without it), B recomputed, stored-history timestamps read in any unit (arbLUNA's were dropped), failed pool quotes say why — and a PUBLISH GATE: a source enters the public file only when it agrees with the hub (B, X ≤ 0.25 %) or the pool quote (S ≤ 1 %) where both exist; otherwise it is withheld with the reason   // 2.0 (2026-10-01): mode ratios — every liquid-staking rate measured on chain, daily: the hub at the day's block height (from the contract floor), the hub's stored history, bond txs before the floor (validated against the hub after it), cross-chain LSTs from their Terra pool's quote at block height and swap txs; published per symbol to docs/deep-history/chain-ratios/ with each day's source; no interpolation   // 1.9 (2026-10-01): mode closeout (gapfill now runs it too) — settles what the 1.8 run left without re-walking: a search key the node REJECTS (same error on two wallets) is dropped with its message, never retried (1.8 retried each 5× with backoff on every wallet — most of its 5 h); keys a wallet already searched successfully are not searched again; the contract floor is measured on the earliest-starting contract (1.8 measured it on a 2024 bucket and read back to 2023-03: 300 reads below the real floor); a state read the node fails on deterministically ("invalid denom" — 3,688 delegations) is marked unreadable, not retried; NEW layer2c — price pools for every token the cohort held that nothing prices (pools found through the DEX factories that created the pairs, reserves monthly from the contract floor); the audit counts layer 2b / 2c as covered   // 1.8 (2026-09-30): mode gapfill — what the audit found missing, in one run: layer1b (every cohort wallet searched under 16 more keys, new txs only), layer2b (TLA v2 hub 2580, v3 buckets / gauges / vAMP / compounder / connectors, the 5 LST hubs, CAPA gov + staking, Lion DAO LP staking — weekly from the contract floor), layer3b (delegations the layer-3 rows lack); then flows and the audit re-run   // 1.7 (2026-09-30): mode audit — every layer checked against what was expected (and why anything is missing), the flows drift classified per wallet × denom, cw20 balances checked on a sample, layer-1 search keys checked on a sample, busy contracts layer 2 never read listed with their query API, price coverage of everything held; nothing re-read in bulk   // 1.6 (2026-09-30): contract reads get their own floor (the 1.5 run: bank reads from 2023-03, every older contract read "panic: unknown request") — found on the earliest-starting contract that answers, with a 7-point spread printed; "unknown request" is no longer read as the contract refusing (the 1.5 marks are cleared)   // 1.5 (2026-09-30): the node keeps full TX history but not all old STATE ("version does not exist … pruned" at 1.83M) — each state mode finds the node's state floor (binary search) and skips older reads (reported, not retried); a contract that refuses the question (unknown request / variant) is recorded and skipped after 3; the route test tries up to 8 busiest contracts   // 1.4 (2026-09-30): state reads go through the archive RPC (abci_query) with the LCD as fallback — layer2 runs #6–#9 failed every LCD read; each state mode tests both routes at a recent AND an old height first and stops red (no chain) when neither answers; 150 failures in a row stop a run; the top failure messages are printed   // 1.3 (2026-09-29): modes layer3 (monthly bank + staking checkpoints per wallet) and flows (every native / cw20 balance change per wallet rebuilt from layer 1, sampled weekly)   // 1.2 (2026-09-29): mode layer2 — protocol state at every weekly boundary (pools, Credia, Solid, DAO voting), resumable   // 1.1 (2026-09-29): mode inventory — every contract the cohort touched, labeled, as an AGGREGATE (no wallets) for tla-core
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
const RAW = process.env.RAW_BASE || 'https://raw.githubusercontent.com/thealliancedao';   // RAW_BASE: mocks only

// the attribute keys a wallet appears under (measured on our own raw corpus + the Solid and Credia probes — SPEC §8 layer 1)
const KEYS = ['message.sender', 'transfer.recipient', 'withdraw_rewards.delegator', 'fungible_token_packet.receiver',
  'wasm.recipient', 'wasm.to', 'wasm.receiver', 'wasm.user', 'wasm.owner', 'wasm.new_owner', 'wasm.borrower', 'wasm.bidder',
  'wasm.seller', 'wasm.portfolio', 'wasm.address', 'wasm.from', 'wasm.liquidator', 'wasm.staker', 'wasm.delegator', 'wasm.voter'];

// ── http ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const stats = { requests: 0, errors: 0, retries: 0 };
const REJECTED_Q = /failed to parse|parse error|syntax error|invalid query|unexpected token|unrecognized/i;   // 1.9
let DROPPED_KEYS = new Set();   // 1.9: search keys the node rejects (layer1/_manifest.json keys_dropped)
async function getJson(url, tries = 5, timeoutMs = 45000) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    stats.requests++;
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok && j) return { ok: true, json: j }; last = { ok: false, status: r.status, body: (j && (j.message || j.error && (j.error.data || j.error.message))) || t.slice(0, 200) }; if (r.status >= 400 && r.status < 500 && r.status !== 429) return last;
      if (REJECTED_Q.test(String(last.body))) { stats.errors++; return last; } }   // 1.9: a query the node rejects is never retried
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
    const recent = weeks[weeks.length - 1]; const tried = []; const oks = [];
    for (const t of samples.slice(0, 8)) { const r = await smartVia(rt, t.addr, t.q, recent.h); tried.push(`${t.key}: ${say(r)}`.slice(0, 140)); if (r.ok) oks.push(t); }
    console.log(`route test (${label}) · ${rt}: state kept from block ${floor.toLocaleString('en-US')} (${dateOf(floor)}) — ${floor > 2 ? 'older weeks are not readable on this node' : 'full history'}${tried.length ? ' · contract reads at the newest week: ' + tried.join(' | ') : ''}`);
    if (samples.length && !oks.length) continue;
    // 1.6: bank reads going back further than contract reads (the 1.5 run: bank from 2023-03, every contract read below "recent" said
    // "panic: unknown request"). So contract reads get their OWN floor, found on the earliest-starting contract that answered.
    let wasmFloor = floor;
    if (oks.length) { const t = oks.sort((a, b) => (a.from_h || 0) - (b.from_h || 0))[0]; const good = async (h) => (await smartVia(rt, t.addr, t.q, h)).ok;
      const start = Math.max(floor, (t.from_h || 0) + 20000);
      const spread = []; for (let k = 0; k <= 6; k++) { const h = Math.floor(start + (recent.h - start) * k / 6); const r = await smartVia(rt, t.addr, t.q, h); spread.push(`${dateOf(h).replace('week of ', '')}: ${r.ok ? 'ok' : say(r).slice(0, 60)}`); }
      console.log(`route test (${label}) · ${rt}: ${t.key} across its history → ${spread.join(' | ')}`);
      if (!(await good(start))) { let lo = start, hi = recent.h; while (hi - lo > (['audit', 'closeout', 'gapfill', 'ratios'].includes(MODE) ? 1000 : 50000)) { const mid = Math.floor((lo + hi) / 2); if (await good(mid)) hi = mid; else lo = mid; } wasmFloor = hi; }
      else if (start > floor + 50000) {   // 1.9: the earliest sample began after the state floor — it cannot say what lies below it (1.8 then took the BANK floor and read 300 weeks the node cannot serve)
        const known = (readJson('layer2/_manifest.json', {}).state_floor || {}).contract_reads_from;
        wasmFloor = known && known >= floor && known <= start ? known : start;
        console.log(`route test (${label}) · ${rt}: the earliest sample starts after the state floor — contract floor from ${wasmFloor === known ? 'the layer-2 measurement' : 'that sample (conservative)'}`); }
      else wasmFloor = floor;
      console.log(`route test (${label}) · ${rt}: contract reads work from block ${wasmFloor.toLocaleString('en-US')} (${dateOf(wasmFloor)})`); }
    ROUTE = rt; console.log(`route: ${rt}`); return { floor, wasmFloor };
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
  for (const key of KEYS) { if (DROPPED_KEYS.has(key)) continue;
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
  const man = readJson('layer1/_manifest.json', { version: VERSION, cohort_day: C.cut_day, keys: KEYS, wallets: {} }); DROPPED_KEYS = new Set(Object.keys(man.keys_dropped || {}));
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
  if (!man.fixed_16) {   // 1.5 marked targets "not supported" on the node's "unknown request" — clear those marks and their rows
    let cleared = 0; for (const [key, m] of Object.entries(man.targets)) { const f = A(`layer2/${key}.jsonl.gz`); let rows = [];
      try { rows = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { }
      const bad = rows.filter(r => r.unsupported && /unknown request/i.test(r.unsupported)); if (!bad.length && !m.unsupported_n) continue;
      for (const r of bad) delete m.done[r.d]; delete m.unsupported_n; cleared += bad.length;
      const keep = rows.filter(r => !(r.unsupported && /unknown request/i.test(r.unsupported)));
      if (keep.length) fs.writeFileSync(f, zlib.gzipSync(keep.map(r => JSON.stringify(r)).join('\n') + '\n')); else { try { fs.unlinkSync(f); } catch { } } }
    man.fixed_16 = true; if (cleared) console.log(`layer2: cleared ${cleared} rows the 1.5 run wrongly marked "not supported"`); }
  const tasks = []; for (const t of T) { const m = man.targets[t.key] || (man.targets[t.key] = { kind: t.kind, done: {} }); if ((m.unsupported_n || 0) >= 3) continue; for (const w of weeks) if (w.h >= t.from_h - 120000 && !m.done[w.d]) tasks.push([t, w]); }
  console.log(`layer2: ${T.length} targets (${Object.entries(T.reduce((o, t) => (o[t.kind] = (o[t.kind] || 0) + 1, o), {})).map(([k, v]) => k + ' ' + v).join(' · ')}) · ${tasks.length} reads to do · concurrency ${CONC}`);
  let below = 0, unsupported = 0;
  if (tasks.length) {
    const per = new Map(); for (const [x] of tasks) per.set(x, (per.get(x) || 0) + 1);
    const samples = [...per.entries()].sort((a, b) => b[1] - a[1]).map(([x]) => x);
    const pick = await chooseRoute('layer2', samples, weeks); if (!pick) return;
    man.state_floor = { route: ROUTE, block: pick.floor, contract_reads_from: pick.wasmFloor, checked_at: new Date().toISOString() };
    const keep = tasks.filter(([, w]) => w.h >= pick.wasmFloor); below = tasks.length - keep.length; tasks.length = 0; tasks.push(...keep);
    if (below) console.log(`layer2: ${below} reads are older than the contract state this node can read (skipped — not retried; they need another source)`); }
  const brk = breaker(); let halted = false;
  const buf = new Map(); let n = 0, ok = 0, absent = 0, bad = 0, lastCommit = Date.now();
  const flush = () => { for (const [key, rows] of buf) { const f = `layer2/${key}.jsonl.gz`; let old = ''; try { old = zlib.gunzipSync(fs.readFileSync(A(f))).toString('utf8'); } catch { } fs.mkdirSync(path.dirname(A(f)), { recursive: true }); fs.writeFileSync(A(f), zlib.gzipSync(old + rows.map(r => JSON.stringify(r)).join('\n') + '\n')); } buf.clear(); man.updated_at = new Date().toISOString(); writeJson('layer2/_manifest.json', man); };
  await pool(tasks, CONC, async ([t, w]) => {
    if (overBudget() || halted || (man.targets[t.key].unsupported_n || 0) >= 3) return;
    const r = await smartAt(t.addr, t.q, w.h); n++;
    let row; if (r.ok) { ok++; let data = r.json && r.json.data; if (t.kind === 'pair' && data) data = { assets: (data.assets || []).map(a => [a.info && (a.info.native_token ? a.info.native_token.denom : a.info.token && a.info.token.contract_addr), a.amount]), total_share: data.total_share }; row = { d: w.d, h: w.h, data }; }
    else if (/no such contract|not found/i.test(r.body || '')) { absent++; row = { d: w.d, h: w.h, absent: true }; }
    else if (/unknown variant|Error parsing into type/i.test(r.body || '')) { unsupported++; row = { d: w.d, h: w.h, unsupported: String(r.body).slice(0, 120) }; }   // this contract does not answer this question — recorded once per week, not retried
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

// ── mode: audit (1.7) — "do we have everything the derive needs?" before any more node time is spent ─────────────────────
// Reads EVERYTHING in the archive (no writes to layers) and asks the node a few SMALL samples. Answers, per layer: what was expected,
// what is there, what is missing and why; classifies the flows drift; checks cw20 balances against the chain on a sample; finds txs
// the layer-1 search keys missed on a sample; lists the busy contracts layer 2 never read, with their query API (the node's own
// "expected one of …" answer); and measures how much of the cohort's holding history can be priced. Output:
//   archive/audit/<day>.json (full, private)  +  docs/deep-history/audit.json in tla-core (COUNTS ONLY — no wallet; guarded).
const AUDIT_SAMPLE = Math.max(10, Number(process.env.AUDIT_SAMPLE || 80));
const AUDIT_PROBE_PAGES = Math.max(1, Number(process.env.AUDIT_PROBE_PAGES || 10));
const STATIC_EXTRA_KEYS = ['coin_received.receiver', 'coin_spent.spender', 'wasm.old_owner', 'wasm.sender'];
function readJsonl(p) { try { return zlib.gunzipSync(fs.readFileSync(A(p))).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return null; } }
function eachTx(w, fn) {   // streams one wallet's layer-1 records (parts one at a time — no need to hold 600K txs)
  const dir = A(`layer1/${w.slice(-1)}/${w}`); if (!fs.existsSync(dir)) return 0; let n = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl.gz')).sort()) for (const line of zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8').split('\n')) { if (!line) continue; let t; try { t = JSON.parse(line); } catch { continue; } n++; fn(t); }
  return n;
}
const topN = (o, n = 20) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n));
const bumpA = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
async function loadResolver() {   // THE denom → symbol rule (platform-crons/lib/denom-symbol.js), loaded at run time — one rule, no copy
  try { const src = await (await fetch(`${RAW}/platform-crons/main/lib/denom-symbol.js`, { signal: AbortSignal.timeout(20000) })).text(); const f = path.join(process.env.RUNNER_TEMP || '/tmp', 'denom-symbol.cjs'); fs.writeFileSync(f, src);
    const lib = require(f); const cat = await getJson(`${RAW}/tla-core/main/token-catalog/snapshots/current.json`, 3, 30000); if (!cat.ok) return null; return lib.buildResolver(cat.json); } catch { return null; }
}
async function audit() {
  const out = { version: VERSION, day: DAY, sections: {} }; const S = out.sections; const gaps = [];
  const C = readJson('cohort/current.json', null); if (!C) throw new Error('no cohort');
  const cohort = Object.keys(C.wallets).sort(); const cohortSet = new Set(cohort);
  const H = readJson('layer2/heights.json', null); const weeks = H ? Object.entries(H.rows).map(([d, x]) => ({ d, h: x.h })) : [];
  const L2M = readJson('layer2/_manifest.json', { targets: {} }); const L3M = readJson('layer3/_manifest.json', { wallets: {} }); const L1M = readJson('layer1/_manifest.json', { wallets: {} });
  const invF = fs.existsSync(A('inventory')) ? fs.readdirSync(A('inventory')).filter(f => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop() : null; const I = invF ? readJson('inventory/' + invF, null) : null;
  let labels = {}; try { labels = JSON.parse(fs.readFileSync(path.join(process.env.CORE_OUT || 'docs/deep-history', 'protocol-labels.json'), 'utf8')).by_code_id || {}; } catch { }
  const codeOf = (addr) => (I && I.contracts[addr] && String(I.contracts[addr].code_id || '')) || null;
  const protoOf = (code) => (labels[code] && `${labels[code].protocol} — ${labels[code].what}`.slice(0, 90)) || null;

  // ── 0. the node: is it there, and what are its floors today (law: step 0 measures floors, not only speed) ──
  let node = { reachable: false }; let floors = { bank: (L3M.state_floor || {}).block || null, contract: (L2M.state_floor || {}).contract_reads_from || null, source: 'manifests' };
  if (RPCS.length) { const top = await latestHeight(); node = { reachable: !!top, latest_height: top || null };
    if (top && weeks.length && I) { const samples = layer2Targets().filter(t => t.kind === 'pair').sort((a, b) => (I.contracts[b.addr] ? I.contracts[b.addr].txs : 0) - (I.contracts[a.addr] ? I.contracts[a.addr].txs : 0));
      const pick = await chooseRoute('audit', samples, weeks); if (pick) { floors = { bank: pick.floor, contract: pick.wasmFloor, source: 'measured now', route: ROUTE }; } else node.reachable = false; } }
  try { fs.rmSync(`${MODE}_stop.txt`, { force: true }); } catch { } process.exitCode = 0;   // an unreachable node does not fail the offline audit
  S.node = { ...node, floors, floors_before: { bank: (L3M.state_floor || {}).block || null, contract: (L2M.state_floor || {}).contract_reads_from || null } };
  if (!node.reachable) gaps.push({ id: 'node', severity: 'high', node: true, what: 'the archive node did not answer — the chain probes below were skipped; only the offline audit ran' });
  const weekOf = (h) => { let lo = 0, hi = weeks.length; while (lo < hi) { const m = (lo + hi) >> 1; if (weeks[m].h >= h) hi = m; else lo = m + 1; } return lo < weeks.length ? weeks[lo].d : null; };
  const yearOf = (h) => (weekOf(h) || DAY).slice(0, 4);
  console.log(`audit · node: ${node.reachable ? 'answers' : 'NOT reachable'} · bank state from ${floors.bank ? floors.bank.toLocaleString('en-US') + ' (' + weekOf(floors.bank) + ')' : '?'} · contract state from ${floors.contract ? floors.contract.toLocaleString('en-US') + ' (' + weekOf(floors.contract) + ')' : '?'}`);

  // ── 1. cohort + layer 1 (one streaming pass over every tx; also collects what sections 5–8 need) ──
  const l1 = { cohort: cohort.length, in_manifest: 0, done: 0, with_failed_search: 0, missing_dir: 0, zero_txs: 0, txs: 0, failed_txs: 0, decode_errors: 0, undecoded_msgs: {}, by_year: {}, search_totals: {}, last_height_max: 0, last_height_min: null, parts_txs_mismatch: 0 };
  const extraKeys = {};     // event.attr keys the wallet appears under that the search did NOT use (txs per key)
  const hashes = new Map(); // sample wallets only — their layer-1 hashes (for the missed-keys probe)
  const cw20Count = new Map(); // wallet → { token: flows } (sample for the cw20 check)
  const KEYSET = new Set(KEYS);
  const sample = []; { const step = Math.max(1, Math.floor(cohort.length / (AUDIT_SAMPLE * 2))); for (let i = 0; i < cohort.length && sample.length < AUDIT_SAMPLE * 2; i += step) sample.push(cohort[i]); }
  const sampleSet = new Set(sample);
  for (const w of cohort) {
    const m = L1M.wallets[w]; if (m) { l1.in_manifest++; if (m.done) l1.done++; else l1.with_failed_search++; for (const [k, s] of Object.entries(m.searches || {})) { if (s && s.total != null) bumpA(l1.search_totals, k, s.total); } }
    if (!fs.existsSync(A(`layer1/${w.slice(-1)}/${w}`))) { l1.missing_dir++; if (m && m.txs) l1.parts_txs_mismatch++; else l1.zero_txs++; continue; }
    const hs = sampleSet.has(w) ? new Set() : null; const cw = sampleSet.has(w) ? {} : null; let maxH = 0;
    const n = eachTx(w, (t) => { l1.txs++; if (t.c) l1.failed_txs++; if (t.m_error) l1.decode_errors++; maxH = Math.max(maxH, t.h);
      bumpA(l1.by_year, yearOf(t.h)); if (hs) hs.add(t.x);
      for (const mm of t.m || []) if (mm.raw && !mm.decode_error) bumpA(l1.undecoded_msgs, mm.type);
      const seenK = new Set(); for (const e of t.e || []) for (const [k, v] of e.a) { if (v !== w) continue; const key = `${e.t}.${k}`; if (!KEYSET.has(key) && !seenK.has(key)) { seenK.add(key); bumpA(extraKeys, key); } }
      if (cw) for (const e of t.e || []) if (/^wasm/.test(e.t)) { const a = Object.fromEntries(e.a); if (a.amount && (a.to === w || a.from === w) && /^(transfer|send|transfer_from|send_from|mint|burn|burn_from)$/.test(a.action || '')) bumpA(cw, a._contract_address); } });
    if (m && m.txs != null && m.txs !== n) l1.parts_txs_mismatch++;
    if (!n) l1.zero_txs++; if (hs) hashes.set(w, hs); if (cw) cw20Count.set(w, cw);
    if (maxH) { l1.last_height_max = Math.max(l1.last_height_max, maxH); }
  }
  l1.undecoded_msgs = topN(l1.undecoded_msgs, 15); l1.search_totals = topN(l1.search_totals, 30);
  S.layer1 = l1; S.layer1_extra_keys = topN(extraKeys, 25);
  if (l1.with_failed_search || l1.missing_dir - l1.zero_txs > 0 || l1.parts_txs_mismatch) gaps.push({ id: 'layer1-incomplete', severity: 'high', node: true, what: `${l1.with_failed_search} wallets with a failed search, ${l1.parts_txs_mismatch} whose stored txs ≠ the manifest` });
  console.log(`audit · layer1: ${l1.done}/${l1.cohort} wallets done · ${l1.txs} txs · ${l1.zero_txs} with no tx · ${l1.with_failed_search} with a failed search · ${l1.parts_txs_mismatch} stored≠manifest · decode errors ${l1.decode_errors}`);

  // ── 2. layer 2: every target — expected weeks (from the week the cohort first touched it), readable (≥ the contract floor), done, answered ──
  const l2 = { targets: 0, by_kind: {}, events_only_weeks: 0, readable_missing: 0, targets_with_missing: [] };
  if (I && weeks.length) for (const t of layer2Targets()) { l2.targets++;
    const k = l2.by_kind[t.kind] || (l2.by_kind[t.kind] = { targets: 0, expected: 0, below_floor: 0, readable: 0, done: 0, ok: 0, absent: 0, unsupported: 0, empty: 0, missing: 0 }); k.targets++;
    const man = L2M.targets[t.key] || { done: {} }; const rows = readJsonl(`layer2/${t.key}.jsonl.gz`) || []; const byD = new Map(rows.map(r => [r.d, r]));
    let miss = 0; for (const w of weeks) { if (w.h < t.from_h - 120000) continue; k.expected++;
      if (floors.contract && w.h < floors.contract) { k.below_floor++; continue; } k.readable++;
      const r = byD.get(w.d); if (man.done[w.d]) k.done++; if (!r) { k.missing++; miss++; continue; }
      if (r.absent) k.absent++; else if (r.unsupported) k.unsupported++; else if (r.data == null || (t.kind === 'pair' && !(r.data.assets || []).length)) k.empty++; else k.ok++; }
    if (miss) l2.targets_with_missing.push([t.kind, codeOf(t.addr) || t.key, miss]); }
  for (const k of Object.values(l2.by_kind)) { l2.events_only_weeks += k.below_floor; l2.readable_missing += k.missing; }
  l2.targets_with_missing = l2.targets_with_missing.sort((a, b) => b[2] - a[2]).slice(0, 20);
  S.layer2 = l2;
  if (l2.readable_missing) gaps.push({ id: 'layer2-missing', severity: 'high', node: true, what: `${l2.readable_missing} weekly reads the node CAN serve are not in the archive` });
  console.log(`audit · layer2: ${l2.targets} targets · ${Object.entries(l2.by_kind).map(([k, v]) => `${k} ok ${v.ok}/${v.readable} (missing ${v.missing}, events-only ${v.below_floor})`).join(' · ')}`);

  // ── 2b. layer 2b (1.8 gapfill): TLA / LST / CAPA / Lion DAO state, weekly ──
  { const M = readJson('layer2b/_manifest.json', null);
    if (M) { const t = Object.entries(M.targets || {}); const rows = t.reduce((x, [k]) => x + ((readJsonl(`layer2b/${k}.jsonl.gz`) || []).filter(r => r.data != null).length), 0);
      S.layer2b = { targets: t.length, answering: t.filter(([, m]) => !m.dropped).length, dropped: t.filter(([, m]) => m.dropped).map(([k, m]) => [k, String(m.dropped).slice(0, 100)]), weeks_answered: rows };
      // 1.9: expected / events-only / readable / missing per target, against the contract floor (the run's own, else today's)
      const fl = floors.contract || M.contract_floor || 0; const tf = new Map(layer2bTargets().map(x => [x.key, x.from_h || 0])); let below = 0, readable = 0, missing = 0;
      for (const [k, m] of t) { if (m.dropped) continue; const fh = tf.get(k) || 0; for (const w of weeks) { if (w.h < fh - 120000) continue; if (fl && w.h < fl) { below++; continue; } readable++; if (!m.done[w.d]) missing++; } }
      Object.assign(S.layer2b, { contract_floor: fl, events_only_weeks: below, readable_weeks: readable, missing });
      if (missing) gaps.push({ id: 'layer2b-missing', severity: 'high', node: true, what: `${missing} weekly TLA / LST reads the node can serve are not in the archive` });
      if (S.layer2b.dropped.length) gaps.push({ id: 'layer2b-dropped', severity: 'low', node: true, what: `${S.layer2b.dropped.length} layer-2b questions were not answered by their contract — see layer2b.dropped for the message` }); }
    else S.layer2b = { not_run: true }; }
  S.layer1.searched_under_1_8_keys = Object.values(L1M.wallets).filter(x => x.top18).length;
  S.layer1.keys_dropped = L1M.keys_dropped || {};   // 1.9: queries the node rejects (never retried)
  if (Object.values(L1M.wallets).some(x => x.top18 !== undefined) && S.layer1.searched_under_1_8_keys < cohort.length) gaps.push({ id: 'layer1b-incomplete', severity: 'high', node: true, what: `${cohort.length - S.layer1.searched_under_1_8_keys} wallets not yet searched under every 1.8 key that works` });
  // ── 3. layer 3: monthly checkpoints per wallet ──
  const months = monthlyBoundaries() || []; const l3 = { wallets_with_first_tx: 0, expected: 0, below_floor: 0, readable: 0, rows: 0, missing: 0, wallets_missing_some: 0, delegations_null: 0, unbonding_null: 0 };
  for (const w of cohort) { const m = L3M.wallets[w]; if (!m || m.first_h == null) continue; l3.wallets_with_first_tx++;
    const rows = readJsonl(`layer3/${w.slice(-1)}/${w}.jsonl.gz`) || []; const have = new Set(rows.map(r => r.d)); let miss = 0;
    for (const r of rows) { if (r.delegations == null && r.delegations_unreadable) l3.delegations_unreadable = (l3.delegations_unreadable || 0) + 1; else if (r.delegations == null) l3.delegations_null++; if (r.unbonding == null) l3.unbonding_null++; } l3.rows += rows.length;
    for (const b of months) { if (b.h < m.first_h - 450000) continue; l3.expected++; if (floors.bank && b.h < floors.bank) { l3.below_floor++; continue; } l3.readable++; if (!have.has(b.d)) { miss++; l3.missing++; } }
    if (miss) l3.wallets_missing_some++; }
  S.layer3 = l3;
  if (l3.missing) gaps.push({ id: 'layer3-missing', severity: 'medium', node: true, what: `${l3.missing} monthly checkpoints the node can serve are missing (${l3.wallets_missing_some} wallets)` });
  if (l3.delegations_null || l3.unbonding_null) gaps.push({ id: 'layer3-partial', severity: 'low', node: true, what: `${l3.delegations_null} checkpoints without delegations, ${l3.unbonding_null} without unbonding (the bank part was saved)${l3.delegations_unreadable ? ` · ${l3.delegations_unreadable} more the node cannot serve (rebuilt from events)` : ''}` });
  console.log(`audit · layer3: ${l3.rows} checkpoints · readable ${l3.readable} · missing ${l3.missing} · before the bank floor ${l3.below_floor} · delegations null ${l3.delegations_null}`);
  console.log(`audit · layer1 keys dropped (the node rejects them): ${Object.keys(S.layer1.keys_dropped).join(', ') || 'none'} · wallets complete under the 1.8 keys ${S.layer1.searched_under_1_8_keys}/${cohort.length}`);
  if (S.layer2b && !S.layer2b.not_run) console.log(`audit · layer2b: ${S.layer2b.answering}/${S.layer2b.targets} targets · ${S.layer2b.weeks_answered} weeks answered · missing ${S.layer2b.missing ?? '?'} · events-only ${S.layer2b.events_only_weeks ?? '?'} (before the contract floor)`);
  console.log(`audit · delegations: ${l3.delegations_null} missing · ${l3.delegations_unreadable || 0} the node cannot serve`);

  // ── 4. flows: classify the drift (per wallet × denom, not per checkpoint — one missed event repeats at every later checkpoint) ──
  const resolve = await loadResolver(); const sym = (d) => { if (!resolve) return null; const r = resolve(d.startsWith('cw20:') ? d : d); return r && r.symbol; };
  const fl = { wallets: 0, flows: 0, pairs_drifting: 0, by_class: {}, first_drift_month: {}, never_in_flows_denoms: {}, class_denoms: {} };
  const holding = {};   // denom → wallet-weeks held (> 0 at the boundary) — for section 7
  const flowsByW = new Map();   // sample wallets → {weeks, balances}
  for (const w of cohort) { let F; try { F = JSON.parse(zlib.gunzipSync(fs.readFileSync(A(`derived/flows/${w.slice(-1)}/${w}.json.gz`))).toString('utf8')); } catch { continue; }
    fl.wallets++; fl.flows += (F.flows || []).length;
    for (const [d, arr] of Object.entries(F.balances || {})) { let n = 0; for (const v of arr) if (v !== '0' && !String(v).startsWith('-')) n++; if (n) bumpA(holding, d, n); }
    if (sampleSet.has(w)) flowsByW.set(w, { weeks: F.weeks, balances: F.balances });
    const cps = (readJsonl(`layer3/${w.slice(-1)}/${w}.jsonl.gz`) || []).map(r => r.d).sort(); const firstCp = cps[0];
    const per = {}; for (const [d, denom, diff] of F.checkpoint_drift || []) (per[denom] = per[denom] || []).push([d, diff]);
    for (const [denom, list] of Object.entries(per)) { fl.pairs_drifting++; list.sort((a, b) => a[0] < b[0] ? -1 : 1);
      const distinct = new Set(list.map(x => x[1])).size; const firstD = list[0][0]; const after = cps.filter(c => c >= firstD).length; const gapsIn = after - list.length;
      const neverInFlows = !(F.balances || {})[denom];
      const cls = neverInFlows ? 'never_in_flows' : distinct === 1 ? (firstD === firstCp ? 'constant_from_first_checkpoint' : 'constant_from_a_month') : gapsIn > 0 && distinct <= 3 ? 'intermittent' : distinct <= 5 ? 'steps' : 'creeping';
      const c = fl.by_class[cls] || (fl.by_class[cls] = { pairs: 0, checkpoints: 0, chain_higher: 0, chain_lower: 0 }); c.pairs++; c.checkpoints += list.length; if (BigInt(list[list.length - 1][1]) > 0n) c.chain_higher++; else c.chain_lower++;
      bumpA(fl.class_denoms[cls] || (fl.class_denoms[cls] = {}), (sym(denom) || denom).slice(0, 70)); bumpA(fl.first_drift_month, firstD.slice(0, 7));
      if (neverInFlows) bumpA(fl.never_in_flows_denoms, (sym(denom) || denom).slice(0, 70)); } }
  for (const k of Object.keys(fl.class_denoms)) fl.class_denoms[k] = topN(fl.class_denoms[k], 10); fl.never_in_flows_denoms = topN(fl.never_in_flows_denoms, 15);
  fl.first_drift_month = Object.fromEntries(Object.entries(fl.first_drift_month).sort());
  S.flows = fl;
  console.log(`audit · flows: ${fl.wallets} wallets · ${fl.pairs_drifting} wallet×denom pairs drift · ${Object.entries(fl.by_class).map(([k, v]) => `${k} ${v.pairs}`).join(' · ')}`);

  // ── 5. cw20: the rebuilt balances were never checked (layer 3 is native only) — a sample against the chain ──
  const cw = { wallets: 0, reads: 0, agree: 0, differ: 0, failed: 0, chain_higher: 0, chain_lower: 0, rebuilt_negative: 0, by_token: {}, fail_reasons: {} };
  if (node.reachable && floors.contract && weeks.length) {
    const top = weeks[weeks.length - 1]; const pickW = (iso) => { const w = weeks.find(x => x.d >= iso); return w && w.h >= floors.contract ? w : null; };
    const checkWeeks = [pickW('2024-06-01'), pickW('2025-06-01'), top].filter(Boolean);
    const tasks = []; for (const w of sample) { const cnt = cw20Count.get(w); const F = flowsByW.get(w); if (!cnt || !F) continue; const toks = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]); if (!toks.length) continue; cw.wallets++; if (cw.wallets > AUDIT_SAMPLE) break;
      for (const tok of toks) for (const wk of checkWeeks) { const i = F.weeks.indexOf(wk.d); const arr = F.balances['cw20:' + tok]; tasks.push([w, tok, wk, i >= 0 && arr ? arr[i] : '0']); } }
    await pool(tasks, CONC, async ([w, tok, wk, mine]) => { if (overBudget()) return; const r = await smartAt(tok, { balance: { address: w } }, wk.h); cw.reads++;
      const bt = cw.by_token[tok] || (cw.by_token[tok] = { reads: 0, agree: 0, differ: 0, failed: 0 }); bt.reads++;
      if (!r.ok || !r.json || !r.json.data || r.json.data.balance == null) { cw.failed++; bt.failed++; bumpA(cw.fail_reasons, say(r).slice(0, 80)); return; }
      const chain = BigInt(r.json.data.balance); const m = BigInt(mine || '0'); if (m < 0n) cw.rebuilt_negative++;
      if (chain === m) { cw.agree++; bt.agree++; } else { cw.differ++; bt.differ++; if (chain > m) cw.chain_higher++; else cw.chain_lower++; } });
    cw.agree_pct = cw.reads - cw.failed ? +(100 * cw.agree / (cw.reads - cw.failed)).toFixed(1) : null;
    cw.worst_tokens = Object.entries(cw.by_token).filter(([, v]) => v.differ).sort((a, b) => b[1].differ - a[1].differ).slice(0, 15).map(([t, v]) => ({ token: t, symbol: sym('cw20:' + t), code: codeOf(t), protocol: protoOf(codeOf(t)), ...v }));
    delete cw.by_token; cw.fail_reasons = topN(cw.fail_reasons, 5); cw.weeks = checkWeeks.map(x => x.d);
    if (cw.agree_pct != null && cw.agree_pct < 99) gaps.push({ id: 'cw20-drift', severity: 'high', node: false, what: `cw20 balances rebuilt from events agree with the chain on ${cw.agree_pct} % of sampled reads — the flows derive misses some cw20 movements` });
  } else cw.skipped = 'node not reachable';
  S.cw20_check = cw;
  console.log(`audit · cw20 sample: ${cw.reads} reads · agree ${cw.agree} · differ ${cw.differ} (chain higher ${cw.chain_higher}, lower ${cw.chain_lower}) · failed ${cw.failed}${cw.skipped ? ' — ' + cw.skipped : ''}`);

  // ── 6. layer-1 keys: search a sample under keys the walk did not use; count txs that are not in the archive ──
  const kp = { wallets: 0, keys: {}, missed_by_kind: {} };
  if (node.reachable) {
    const cand = [...new Set([...STATIC_EXTRA_KEYS, ...Object.keys(S.layer1_extra_keys).filter(k => /^[a-z0-9_-]+\.[a-z0-9_]+$/i.test(k))])].slice(0, 10);
    const ws = sample.filter(w => hashes.has(w)).slice(0, Math.min(40, AUDIT_SAMPLE));
    for (const k of cand) kp.keys[k] = { wallets: 0, total_on_chain: 0, fetched: 0, not_in_archive: 0, wallets_with_missed: 0, capped: 0, errors: 0 };
    await pool(ws.flatMap(w => cand.map(k => [w, k])), CONC, async ([w, k]) => { if (overBudget()) return; const s = kp.keys[k]; s.wallets++; const have = hashes.get(w); let page = 1, got = 0, miss = 0;
      while (page <= AUDIT_PROBE_PAGES) { const r = await txSearch(`${k}='${w}'`, page); if (r.error) { s.errors++; break; } if (page === 1) s.total_on_chain += r.total; got += r.txs.length;
        for (const t of r.txs) if (!have.has(t.hash)) { miss++; const rec = shapeTx(t); const kind = (rec.m && rec.m[0] && rec.m[0].type || '?').split('.').pop(); const act = ((rec.e || []).find(e => /^wasm/.test(e.t)) || { a: [] }).a.find(a => a[0] === 'action'); bumpA(kp.missed_by_kind, `${kind}${act ? ' · ' + act[1] : ''}`.slice(0, 80)); }
        if (!r.txs.length || got >= r.total) break; page++; }
      if (page > AUDIT_PROBE_PAGES) s.capped++; s.fetched += got; s.not_in_archive += miss; if (miss) s.wallets_with_missed++; });
    kp.wallets = ws.length; kp.missed_by_kind = topN(kp.missed_by_kind, 20);
    const missed = Object.entries(kp.keys).filter(([, s]) => s.not_in_archive); for (const [k, s] of missed) s.estimated_cohort_missed = s.fetched ? Math.round(s.not_in_archive / s.fetched * s.total_on_chain * cohort.length / Math.max(1, s.wallets)) : null;
    if (missed.length) gaps.push({ id: 'layer1-keys', severity: 'high', node: false, what: `txs found under ${missed.map(([k]) => k).join(', ')} that are not in layer 1 — re-search the cohort under these keys (tx history stays on this node, and public nodes keep recent txs)` });
  } else kp.skipped = 'node not reachable';
  S.layer1_keys_probe = kp;
  console.log(`audit · layer1 keys (sample of ${kp.wallets}): ${Object.entries(kp.keys).map(([k, s]) => `${k} +${s.not_in_archive}`).join(' · ') || kp.skipped}`);

  // ── 7. protocol state layer 2 never read: busy code ids, with their query API (the node answers an unknown query with its list) ──
  const covered = new Set([...PAIR_CODES, '3995', '3193', '2413', '1431', '2410']);
  { const M2 = readJson('layer2b/_manifest.json', null); if (M2) for (const m of Object.values(M2.targets || {})) { if (m.dropped) continue; const c = codeOf(m.addr); if (c) covered.add(c); } }   // 1.9: what layer 2b reads weekly is covered
  const pr = { codes_checked: 0, uncovered: [] };
  if (I && I.by_code_id) { const codes = Object.entries(I.by_code_id).filter(([c]) => c !== '?' && !covered.has(c)).sort((a, b) => b[1].txs - a[1].txs).slice(0, 60);
    for (const [code, b] of codes) { const cs = Object.entries(I.contracts).filter(([, x]) => String(x.code_id) === code).sort((p, q) => q[1].txs - p[1].txs); const [addr, x] = cs[0] || [];
      const readable = x ? weeks.filter(w => w.h >= Math.max(x.first_h - 120000, floors.contract || 0)).length : 0;
      const row = { code, protocol: protoOf(code), contracts: b.contracts, txs: b.txs, busiest: addr || null, busiest_first_week: x ? weekOf(x.first_h) : null, readable_weeks_busiest: readable, reads_all_contracts: readable * b.contracts };
      if (node.reachable && addr && weeks.length) { pr.codes_checked++; const r = await smartAt(addr, { __audit_probe__: {} }, weeks[weeks.length - 1].h); const txt = String((r && r.body) || '');
        const mm = txt.match(/expected (?:one of )?(.+?)(?:: query wasm|$)/); row.query_api = mm ? (mm[1].match(/`([^`]+)`/g) || []).map(s => s.slice(1, -1)).slice(0, 30) : null; if (!row.query_api) row.probe_answer = say(r).slice(0, 120); }
      pr.uncovered.push(row); } }
  S.protocol_state_not_in_layer2 = pr;
  console.log(`audit · protocol state: ${pr.uncovered.length} busy code ids layer 2 never read · query APIs read for ${pr.codes_checked}`);

  // ── 8. prices: how much of what the cohort held (wallet-weeks) can be valued, and with what ──
  const series = {}; const pairAssets = new Map();   // asset → set of other assets seen in a layer-2 pair with it
  { const M3 = readJson('layer2c/_manifest.json', null); if (M3) { let rowsOk = 0; for (const [addr, pm] of Object.entries(M3.pairs || {})) { const rows = (readJsonl(`layer2c/${addr}.jsonl.gz`) || []).filter(r => r.data && r.data.assets); rowsOk += rows.length; const last = rows.pop(); if (!last) continue; const as = last.data.assets.map(a => a[0]); for (const a of as) { const st = pairAssets.get(a) || new Set(); for (const b of as) if (b !== a) st.add(b); pairAssets.set(a, st); } }
      S.layer2c = { candidates: M3.candidates || null, factories_listed: Object.values(M3.factories || {}).filter(x => x.listed).length, not_factories: Object.values(M3.factories || {}).filter(x => x.not_a_factory).length, factory_errors: Object.entries(M3.factories || {}).filter(([, x]) => x.error).map(([a, x]) => [a.slice(0, 14), x.error]), pools: Object.keys(M3.pairs || {}).length, monthly_rows: rowsOk }; } else S.layer2c = { not_run: true }; }   // 1.9
  if (I) for (const t of layer2Targets().filter(t => t.kind === 'pair')) { const rows = readJsonl(`layer2/${t.key}.jsonl.gz`); const last = rows && rows.filter(r => r.data && r.data.assets).pop(); if (!last) continue; const as = last.data.assets.map(a => a[0]); for (const a of as) { const s = pairAssets.get(a) || new Set(); for (const b of as) if (b !== a) s.add(b); pairAssets.set(a, s); } }
  const seriesOf = async (s) => { if (!(s in series)) { const r = await getJson(`${RAW}/tla-core/main/price-history/series/${encodeURIComponent(s)}.json`, 2, 20000); const days = r.ok && r.json.daily ? Object.keys(r.json.daily).sort() : []; series[s] = days.length ? { from: days[0], to: days[days.length - 1] } : null; } return series[s]; };
  const pc = { denoms: 0, wallet_weeks: 0, by_class: {}, top: [] };
  for (const [d, ww] of Object.entries(holding).sort((a, b) => b[1] - a[1])) { pc.denoms++; pc.wallet_weeks += ww;
    const bareD = d.startsWith('cw20:') ? d.slice(5) : d; const s = sym(d); const code = d.startsWith('cw20:') ? codeOf(bareD) : null; const proto = code ? protoOf(code) : null; let cls, ser = null;
    if (s) { ser = await seriesOf(s); cls = ser ? 'symbol + price series' : 'symbol, no price series'; }
    else if (code && /LP token|amp compounder|LST/i.test(proto || '')) cls = /amp|LST/i.test(proto) ? 'amp / LST token — needs its exchange rate' : 'LP token — value = pool share (layer 2)';
    else if (pairAssets.has(bareD) && [...pairAssets.get(bareD)].some(x => x === 'uluna' || sym(x.startsWith('terra1') ? 'cw20:' + x : x))) cls = 'no symbol — priceable from a layer-2 pool';
    else cls = 'unpriced';
    const c = pc.by_class[cls] || (pc.by_class[cls] = { denoms: 0, wallet_weeks: 0 }); c.denoms++; c.wallet_weeks += ww;
    if (pc.top.length < 40) pc.top.push({ denom: d.slice(0, 90), symbol: s, code, protocol: proto, wallet_weeks: ww, class: cls, series: ser }); }
  for (const c of Object.values(pc.by_class)) c.share_pct = pc.wallet_weeks ? +(100 * c.wallet_weeks / pc.wallet_weeks).toFixed(1) : null;
  pc.resolver = resolve ? `platform-crons/lib/denom-symbol.js (${resolve.size} catalog symbols)` : 'NOT loaded — every denom counted as unresolved';
  S.prices = pc;
  const unval = Object.entries(pc.by_class).filter(([k]) => k !== 'symbol + price series').reduce((x, [, v]) => x + v.wallet_weeks, 0);
  if (unval) gaps.push({ id: 'prices', severity: 'medium', node: false, what: `${pc.wallet_weeks ? (100 * unval / pc.wallet_weeks).toFixed(1) : '?'} % of wallet-weeks held are in tokens without a direct price series (LP / amp / unlisted) — see prices.by_class` });
  console.log(`audit · prices: ${pc.denoms} denoms held · ${Object.entries(pc.by_class).map(([k, v]) => `${k} ${v.share_pct}%`).join(' · ')}`);
  if (S.layer2c && !S.layer2c.not_run) console.log(`audit · layer2c: ${S.layer2c.candidates} unpriced tokens · ${S.layer2c.factories_listed} factories listed · ${S.layer2c.pools} pools · ${S.layer2c.monthly_rows} monthly reserve rows`);

  if (!S.layer2b || S.layer2b.not_run || !S.layer2b.answering) gaps.push({ id: 'layer2-tla-lst', severity: 'high', node: true, what: 'TLA (ve3 compounding / staking / gauges / vAMP) and LST hub state are not in layer 2 — needed to value amp positions before the dex state-history (epoch 97)' });
  // 2.0: the measured liquid-staking rates (docs/deep-history/chain-ratios, written by mode ratios)
  { let ix = null; try { ix = JSON.parse(fs.readFileSync(path.join(process.env.CORE_OUT || 'docs/deep-history', 'chain-ratios', 'index.json'), 'utf8')); } catch { }
    S.chain_ratios = ix ? Object.fromEntries(Object.entries(ix.series).map(([k, v]) => [k, { from: v.from, to: v.to, days: v.days, by_source: v.by_source, validation: v.validation }])) : { not_run: true };
    if (ix) console.log(`audit · chain ratios: ${Object.entries(ix.series).filter(([, v]) => v.days).map(([k, v]) => `${k} ${v.days} d from ${v.from}`).join(' · ')}`); }
  out.gaps = gaps; out.summary = gaps.map(g => `[${g.severity}${g.node ? ' · needs the node' : ''}] ${g.id}: ${g.what}`);

  // ── write: full (private) + counts only (public, guarded: no cohort wallet may appear) ──
  writeJson(`audit/${DAY}.json`, out); commitPush(`audit ${DAY}: ${gaps.length} gaps`);
  const pub = JSON.parse(JSON.stringify(out)); pub.note = 'Deep-history backfill audit — COUNTS ONLY: no wallet is named (checked before writing). The full report is in the private archive.';
  const txt = JSON.stringify(pub, null, 1); const leak = (txt.match(/terra1[02-9ac-hj-np-z]{38}(?![02-9ac-hj-np-z])/g) || []).filter(a => cohortSet.has(a));
  if (leak.length) { console.log(`audit: the public copy would name ${leak.length} cohort wallet(s) — NOT written`); process.exitCode = 1; }
  else if (process.env.CORE_OUT) { fs.mkdirSync(process.env.CORE_OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.CORE_OUT, 'audit.json'), txt + '\n'); }
  console.log('audit · GAPS:'); for (const s of out.summary) console.log('  ' + s); if (!gaps.length) console.log('  none — the archive holds everything the derive needs');
}

// ── 1.8: GAPFILL — fetch exactly what the 2026-09-30 audit said is missing, then re-derive flows and re-audit, in one run ───────
// The audit (docs/deep-history/audit.json): layers 1–3 complete where the node can serve them; cw20 99.3 % exact; BUT (1) txs found
// under keys the walk never searched (wasm.sender +81 in 40 wallets — IBC acknowledgements, ~2,300 cohort-wide; ibc_transfer.sender);
// (2) TLA / LST state never read weekly — the pre-v3 TLA staking hub (code 2580, 2023-08 → 2024-09, before dex state-history), the v3
// buckets / gauges / vAMP escrow / compounder / Alliance connectors, the five LST hubs, CAPA staking, the Lion DAO LP staking;
// (3) 3,688 layer-3 checkpoints saved the bank balances but not the delegations. Steps (each resumable, each skipped when done):
//   layer1b  every cohort wallet searched under KEYS_18 → new txs only (dedup by hash against its stored txs) as new parts
//   layer2b  the targets below at every weekly boundary from max(contract floor, first use) → archive/layer2b/<key>.jsonl.gz
//   layer3b  the delegations of every checkpoint that lacks them, written back into its row
//   then flows (all wallets, with the new txs) and the audit.
const KEYS_18 = ['wasm.sender', 'ibc_transfer.sender', 'fungible_token_packet.sender', 'wasm-erishub/bonded.receiver', 'wasm-erishub/unbonded_withdrawn.receiver',
  'wasm-erishub/unbond_queued.receiver', 'wasm-steakhub/bonded.steak_receiver', 'unbond.delegator', 'proposal_vote.voter', 'wasm.minter', 'wasm.addr', 'wasm.job_owner',
  'wasm.staker_addr', 'wasm.bidder_addr', 'wasm.player_address', 'wasm.executor'];
for (const k of KEYS_18) if (!KEYS.includes(k)) KEYS.push(k);   // newcomers walked from now on get these keys too
const TLA = { gauge: 'terra1hfksrhchkmsj4qdq33wkksrslnfles6y2l77fmmzeep0xmq24l2smsd3lj', escrow: 'terra1uqhj8agyeaz8fu6mdggfuwr3lp32jlrx5hqag4jxexde92rzkamq3l62zg',
  compounder: 'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx', hub2580: 'terra1jwyzzsaag4t0evnuukc35ysyrx9arzdde2kg9cld28alhjurtthq0prs2s',
  buckets: { stable: 'terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq', project: 'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa', bluechip: 'terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv', single: 'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k' } };
const LST_HUBS = { ampLUNA: ['terra10788fkzah89xrdm27zkj5yvhj9x3494lxawzm5qq3vvxcqz2yzaqyd3enk', { exchange_rates: {} }], arbLUNA: ['terra1r9gls56glvuc4jedsvc3uwh6vj95mqm9efc7hnweqxa2nlme5cyqxygy5m', { state: {} }],
  ampROAR: ['terra1vklefn7n6cchn0u962w3gaszr4vf52wjvd4y95t2sydwpmpdtszsqvk9wy', { state: {} }], ampCAPA: ['terra186rpfczl7l2kugdsqqedegl4es4hp624phfc7ddy8my02a4e8lgq5rlx7y', { state: {} }],
  bLUNA: ['terra1l2nd99yze5fszmhl5svyh5fky9wm4nz4etlgnztfu4e8809gd52q04n3ea', { state: {} }] };   // platform-crons config/contracts.js LST_HUBS (proven shapes)
function layer2bTargets() {
  const invF = fs.readdirSync(A('inventory')).filter(f => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop(); const I = invF ? readJson('inventory/' + invF, { contracts: {} }) : { contracts: {} };
  const first = (a) => (I.contracts[a] && I.contracts[a].first_h) || 0; const T = [];
  const add = (key, addr, q, kind) => T.push({ key, addr, q, kind, from_h: first(addr) });
  add('tla/hub2580_total_staked', TLA.hub2580, { total_staked_balances: {} }, 'tla_v2'); add('tla/hub2580_reward_distribution', TLA.hub2580, { reward_distribution: {} }, 'tla_v2'); add('tla/hub2580_whitelisted_assets', TLA.hub2580, { whitelisted_assets: {} }, 'tla_v2');
  for (const [b, a] of Object.entries(TLA.buckets)) { add(`tla/bucket_${b}_assets`, a, { whitelisted_asset_details: {} }, 'tla_v3'); add(`tla/bucket_${b}_reward_distribution`, a, { reward_distribution: {} }, 'tla_v3'); }
  for (const g of ['stable', 'project', 'bluechip', 'single']) add(`tla/gauge_${g}`, TLA.gauge, { gauge_infos: { gauge: g, time: 'next' } }, 'tla_v3');
  add('tla/escrow_total_vamp', TLA.escrow, { total_vamp: {} }, 'tla_v3'); add('tla/escrow_total_fixed', TLA.escrow, { total_fixed: {} }, 'tla_v3');
  add('tla/compounder_asset_configs', TLA.compounder, { asset_configs: {} }, 'tla_v3'); add('tla/compounder_exchange_rates', TLA.compounder, { exchange_rates: {} }, 'tla_v3'); add('tla/compounder_amplp_exchange_rates', TLA.compounder, { amplp_exchange_rates: {} }, 'tla_v3');
  for (const [a, x] of Object.entries(I.contracts)) { const code = String(x.code_id || '');
    if (code === '3120') add(`tla/connector_${a.slice(-8)}`, a, { state: {} }, 'tla_v3');
    if (code === '180') add(`liondao/lp_staking_${a.slice(-8)}`, a, { state: {} }, 'liondao');
    if (code === '1545') add(`capa/gov_${a.slice(-8)}`, a, { state: {} }, 'capa');
    if (code === '1625') add(`capa/staking_${a.slice(-8)}`, a, { state: {} }, 'capa'); }
  for (const [s, [a, q]] of Object.entries(LST_HUBS)) add(`lst/${s}`, a, q, 'lst_hub');
  return T;
}
async function layer1b() {
  const C = readJson('cohort/current.json', null); if (!C) throw new Error('no cohort');
  const man = readJson('layer1/_manifest.json', null); if (!man) throw new Error('no layer1 manifest');
  const cohort = Object.keys(C.wallets).filter(shardOk);
  // 1.9: a key the node rejects (the same error on two wallets, not a timeout) is dropped with its message and never searched again
  man.keys_dropped = man.keys_dropped || {}; const norm = (e) => String(e || '').replace(/terra1[0-9a-z]{38,58}/g, '<addr>');
  { const fails = {}, tried = {}; for (const m of Object.values(man.wallets)) for (const [k, x] of Object.entries(m.searches || {})) { if (!KEYS_18.includes(k) || !x) continue; tried[k] = (tried[k] || 0) + 1; if (x.error) { const e = norm(x.error).slice(0, 200); (fails[k] = fails[k] || {})[e] = (fails[k][e] || 0) + 1; } }
    for (const k of KEYS_18) { if (man.keys_dropped[k] || !(tried[k] >= 20)) continue; const n = Object.values(fails[k] || {}).reduce((a, b) => a + b, 0);
      if (n >= 0.95 * tried[k]) { const msg = Object.entries(fails[k]).sort((a, b) => b[1] - a[1])[0][0]; man.keys_dropped[k] = msg; console.log(`layer1b: ${k} — failed on ${n} of ${tried[k]} wallets already (${msg.slice(0, 120)}) — dropped, not retried`); } } }   // the record alone settles it
  const proven = new Set(); for (const m of Object.values(man.wallets)) for (const [k, x] of Object.entries(m.searches || {})) if (x && x.total != null && !x.error) proven.add(k);   // a key that already answered for some wallet needs no probe
  for (const key of KEYS_18) { if (man.keys_dropped[key] || proven.has(key)) continue; const errs = [];
    for (const w of cohort.slice(0, 2)) { const r = await txSearch(`${key}='${w}'`, 1); errs.push(r.error ? norm(r.error) : null); }
    if (errs.length === 2 && errs[0] && errs[0] === errs[1] && !/HTTP (0|429|502|503|504)\b/.test(errs[0])) { man.keys_dropped[key] = errs[0].slice(0, 200); console.log(`layer1b: ${key} — the node rejects this query: ${errs[0].slice(0, 160)} (dropped, not retried)`); } }
  DROPPED_KEYS = new Set(Object.keys(man.keys_dropped)); const keys = KEYS_18.filter(k => !DROPPED_KEYS.has(k));
  const todo = cohort.filter(w => !(man.wallets[w] && man.wallets[w].top18));
  console.log(`layer1b: ${todo.length} wallets not complete · ${keys.length} keys (${DROPPED_KEYS.size} dropped) · concurrency ${CONC}`);
  let done = 0, added = 0, errs = 0, settled = 0, lastCommit = Date.now(); const byKey = {};
  await pool(todo, CONC, async (w) => {
    if (overBudget()) return;
    const m0 = man.wallets[w] || (man.wallets[w] = { done: true, txs: 0, parts: 0, searches: {} }); const prev = m0.searches || {};
    const run = keys.filter(k => !(prev[k] && prev[k].total != null && !prev[k].error));   // 1.9: a key this wallet already searched in full is not searched again
    if (!run.length) { m0.top18 = true; settled++; done++; return; }
    const have = new Set(); eachTx(w, (t) => have.add(t.x)); const dir = `layer1/${w.slice(-1)}/${w}`;
    let partNo = fs.existsSync(A(dir)) ? fs.readdirSync(A(dir)).filter(f => /^part-\d+\.jsonl\.gz$/.test(f)).length : 0; let part = []; const searches = {}; let failed = 0, n = 0;
    const flush = () => { if (!part.length) return; fs.mkdirSync(A(dir), { recursive: true }); fs.writeFileSync(A(`${dir}/part-${String(partNo++).padStart(3, '0')}.jsonl.gz`), zlib.gzipSync(part.map(x => JSON.stringify(x)).join('\n') + '\n')); part = []; };
    for (const key of run) { let page = 1, got = 0, total = null, err = null;
      while (true) { if (overBudget()) return; const r = await txSearch(`${key}='${w}'`, page); if (r.error) { err = r.error; break; } total = r.total; got += r.txs.length;
        for (const t of r.txs) { if (have.has(t.hash)) continue; have.add(t.hash); const rec = shapeTx(t); rec.k = key; part.push(rec); n++; bumpA(byKey, key); if (part.length >= PART_TXS) flush(); }
        if (!r.txs.length || got >= total) break; page++; }
      searches[key] = { total, pages: page, error: err || undefined }; if (err) failed++; }
    flush(); const m = m0;
    m.txs = (m.txs || 0) + n; m.parts = partNo; Object.assign(m.searches || (m.searches = {}), searches); m.top18 = failed === 0; m.top18_added = (m.top18_added || 0) + n;
    done++; added += n; if (failed) errs++;
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); man.updated_at = new Date().toISOString(); writeJson('layer1/_manifest.json', man); commitPush(`layer1b: +${done} wallets`); }
    if (done % 100 === 0) console.log(`  … ${done}/${todo.length} wallets · +${added} txs · ${errs} with a failed search · ${minutes().toFixed(0)} min`);
  });
  man.keys = [...new Set([...(man.keys || []), ...keys])]; man.updated_at = new Date().toISOString();
  man.counts = { wallets_done: Object.values(man.wallets).filter(x => x.done).length, txs: Object.values(man.wallets).reduce((x, v) => x + (v.txs || 0), 0), top18_done: Object.values(man.wallets).filter(x => x.top18).length };
  writeJson('layer1/_manifest.json', man); commitPush(`layer1b: ${done} wallets, +${added} txs`);
  const left = cohort.filter(w => !(man.wallets[w] && man.wallets[w].top18)).length;
  console.log(`layer1b run: ${done} wallets (${settled} settled without a search — every key already searched) · +${added} new txs (${Object.entries(byKey).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · ') || 'none'}) · ${errs} with a failed search · ${left ? left + ' wallets left' : 'ALL DONE'}`);
  return { left, added };
}
async function layer2b(floors) {
  const H = readJson('layer2/heights.json', null); if (!H) throw new Error('no layer2/heights.json');
  const weeks = Object.entries(H.rows).map(([d, x]) => ({ d, h: x.h })); const T = layer2bTargets(); const man = readJson('layer2b/_manifest.json', { version: VERSION, targets: {} });
  // each target is tried once at the newest week: a question it does not answer (wrong shape / no such variant) is printed and dropped —
  // a deterministic error is never retried (law 2026-09-30), and the message says how to fix the query
  const newest = weeks[weeks.length - 1]; const live = [];
  for (const t of T) { const m = man.targets[t.key] || (man.targets[t.key] = { kind: t.kind, addr: t.addr, q: t.q, done: {} }); if (m.dropped) continue;
    if (Object.keys(m.done).length) { live.push(t); continue; }
    const r = await smartAt(t.addr, t.q, newest.h); if (r.ok) { live.push(t); continue; }
    const lastUse = t.from_h ? weeks.filter(w => w.h >= t.from_h) : weeks; const probeW = lastUse.find(w => w.h >= (floors.contract || 0));   // a retired contract answers only in its own weeks
    const r2 = probeW && probeW.d !== newest.d ? await smartAt(t.addr, t.q, probeW.h) : r;
    if (r2.ok) { live.push(t); continue; }
    if (/no such contract|not found/i.test(r2.body || '')) { m.dropped = 'no such contract'; console.log(`layer2b: ${t.key} — no such contract (dropped)`); continue; }
    m.dropped = say(r2).slice(0, 160); console.log(`layer2b: ${t.key} — does not answer ${JSON.stringify(t.q)}: ${m.dropped} (dropped — fix the query to read it)`); }
  const tasks = []; for (const t of live) { const m = man.targets[t.key]; for (const w of weeks) if (w.h >= Math.max(floors.contract || 0, (t.from_h || 0) - 120000) && !m.done[w.d]) tasks.push([t, w]); }
  console.log(`layer2b: ${T.length} targets (${live.length} answer) · ${Object.entries(T.reduce((o, t) => (o[t.kind] = (o[t.kind] || 0) + 1, o), {})).map(([k, v]) => k + ' ' + v).join(' · ')} · ${tasks.length} weekly reads to do`);
  const brk = breaker(); let halted = false; const buf = new Map(); let n = 0, ok = 0, absent = 0, bad = 0, lastCommit = Date.now();
  const flush = () => { for (const [key, rows] of buf) { const f = `layer2b/${key}.jsonl.gz`; let old = ''; try { old = zlib.gunzipSync(fs.readFileSync(A(f))).toString('utf8'); } catch { } fs.mkdirSync(path.dirname(A(f)), { recursive: true }); fs.writeFileSync(A(f), zlib.gzipSync(old + rows.map(r => JSON.stringify(r)).join('\n') + '\n')); } buf.clear(); man.updated_at = new Date().toISOString(); writeJson('layer2b/_manifest.json', man); };
  await pool(tasks, CONC, async ([t, w]) => {
    if (overBudget() || halted) return; const r = await smartAt(t.addr, t.q, w.h); n++; let row;
    if (r.ok) { ok++; row = { d: w.d, h: w.h, data: r.json && r.json.data }; }
    else if (/no such contract|not found|unknown variant|Error parsing into type/i.test(r.body || '')) { absent++; row = { d: w.d, h: w.h, absent: say(r).slice(0, 100) }; }   // not there yet / no longer / older version without this query
    else { bad++; if (brk.bad(r) && !halted) { halted = true; console.log('layer2b: 150 failures in a row — stopping'); try { fs.writeFileSync(`${MODE}_stop.txt`, '1'); } catch { } process.exitCode = 1; } return; }
    brk.ok(); (buf.get(t.key) || buf.set(t.key, []).get(t.key)).push(row); man.targets[t.key].done[w.d] = 1;
    if (n % 1000 === 0) console.log(`  … ${n}/${tasks.length} reads · ok ${ok} · not there ${absent} · failed ${bad} · ${minutes().toFixed(0)} min`);
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); flush(); commitPush(`layer2b: +${n} reads`); } });
  flush(); commitPush(`layer2b: ${ok} answers`); brk.report();
  man.contract_floor = floors.contract;   // 1.9: what the audit measures 2b against
  flush();
  const left = tasks.length - ok - absent; console.log(`layer2b run: ${n} reads · ok ${ok} · not there that week ${absent} · failed ${bad} · ${left > 0 ? left + ' left' : 'ALL DONE'}`);
  return Math.max(0, left);
}
const DEAD_STATE = /invalid denom|panic|unknown request|does not exist|pruned|failed to load state|version mismatch/i;   // 1.9: the node fails on its own state here — never retried
async function layer3b() {
  const C = readJson('cohort/current.json', null); const L3M = readJson('layer3/_manifest.json', { wallets: {} });
  const tasks = []; const files = new Map();
  for (const w of Object.keys(C.wallets).filter(shardOk)) { const f = `layer3/${w.slice(-1)}/${w}.jsonl.gz`; const rows = readJsonl(f); if (!rows) continue; const miss = rows.filter(r => r.delegations == null && !r.delegations_unreadable); if (!miss.length) continue; files.set(w, rows); for (const r of miss) tasks.push([w, r]); }
  console.log(`layer3b: ${tasks.length} checkpoints without delegations (${files.size} wallets)`);
  const brk = breaker(); let ok = 0, bad = 0, dead = 0, halted = false; const failSeen = {}; const deadAt = new Map();
  await pool(tasks, CONC, async ([w, r]) => { if (overBudget() || halted) return;
    const dh = deadAt.get(r.h); if (dh && dh.n >= 3) { r.delegations_unreadable = dh.msg; dead++; return; }   // 3 wallets failed the same way at this height — the state is gone there
    const del = ROUTE === 'rpc' ? await stateRpc('delegations', w, r.h) : await lcdAt(`/cosmos/staking/v1beta1/delegations/${w}?pagination.limit=200`, r.h);
    if (!del.ok) { if (DEAD_STATE.test(del.body || '')) { const msg = say(del).slice(0, 120); r.delegations_unreadable = msg; dead++; const x = deadAt.get(r.h) || { n: 0, msg }; x.n++; deadAt.set(r.h, x); return; }
      bad++; bumpA(failSeen, say(del).slice(0, 80)); if (brk.bad(del) && !halted) { halted = true; console.log('layer3b: 150 failures in a row — stopping'); } return; }
    brk.ok(); ok++; r.delegations = (del.json.delegation_responses || []).map(x => [x.delegation.validator_address, x.balance && x.balance.amount]); });
  for (const [w, rows] of files) gz(`layer3/${w.slice(-1)}/${w}.jsonl.gz`, rows);
  if (ok || dead) { L3M.delegations_refilled = (L3M.delegations_refilled || 0) + ok; L3M.delegations_unreadable = (L3M.delegations_unreadable || 0) + dead; writeJson('layer3/_manifest.json', L3M); commitPush(`layer3b: ${ok} delegations refilled, ${dead} unreadable`); }
  if (bad) console.log('layer3b failures: ' + Object.entries(failSeen).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${v}× ${k}`).join(' | '));
  console.log(`layer3b run: ${ok} refilled · ${dead} unreadable on this node (marked — the derive rebuilds them from delegate / undelegate events) · ${bad} failed (${bad ? 'kept as null — a later run retries them' : 'none'})`);
  return bad;
}
function gz(p, rows) { fs.mkdirSync(path.dirname(A(p)), { recursive: true }); fs.writeFileSync(A(p), zlib.gzipSync(rows.map(r => JSON.stringify(r)).join('\n') + '\n')); }
// ── 1.9: layer2c — price pools for every token the cohort held that nothing prices ──────────────────────────────────────
// The audit found 21 % of wallet-weeks held in tokens with no price series, no LP / amp / LST code and no pool layer 2 reads (layer 2 read
// only pools the cohort itself swapped or provided in). Those tokens may still trade: the DEX factories that instantiated the cohort's
// pairs (contract_info.creator) list every pair they made ({pairs:{start_after,limit}} — Astroport, Terraswap-era, White Whale share the
// shape). Every pair holding a candidate token is read MONTHLY (the first weekly boundary of each month, from the contract floor — these are
// thin, mostly dead tokens; the derive interpolates) → archive/layer2c/<pair>.jsonl.gz, rows in layer 2's pair format. Resumable.
const SERIES_SPAN = {};
async function seriesSpan(sym) { if (!(sym in SERIES_SPAN)) { const r = await getJson(`${RAW}/tla-core/main/price-history/series/${encodeURIComponent(sym)}.json`, 2, 20000); const days = r.ok && r.json.daily ? Object.keys(r.json.daily).sort() : []; SERIES_SPAN[sym] = days.length ? { from: days[0], to: days[days.length - 1] } : null; } return SERIES_SPAN[sym]; }
const NOT_PRICE_TOKEN = /LP token|amp compounder|LST/i;
async function layer2c(floors, weeks) {
  const C = readJson('cohort/current.json', null); const invF = fs.readdirSync(A('inventory')).filter(f => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop(); const I = readJson('inventory/' + invF, { contracts: {} });
  let labels = {}; try { labels = JSON.parse(fs.readFileSync(path.join(process.env.CORE_OUT || 'docs/deep-history', 'protocol-labels.json'), 'utf8')).by_code_id || {}; } catch { }
  const codeOf = (a) => (I.contracts[a] && String(I.contracts[a].code_id || '')) || null; const protoOf = (c) => (labels[c] && `${labels[c].protocol} — ${labels[c].what}`) || '';
  const man = readJson('layer2c/_manifest.json', { version: VERSION, factories: {}, pairs: {} });
  const resolve = await loadResolver(); if (!resolve) { console.log('layer2c: the token catalog / denom rule could not be loaded — skipped (every token would look unpriced)'); return 0; }
  const held = new Map(); for (const w of Object.keys(C.wallets)) { let F; try { F = JSON.parse(zlib.gunzipSync(fs.readFileSync(A(`derived/flows/${w.slice(-1)}/${w}.json.gz`))).toString('utf8')); } catch { continue; }
    for (const [d, arr] of Object.entries(F.balances || {})) { let n = 0; for (const v of arr) if (v !== '0' && !String(v).startsWith('-')) n++; if (n) held.set(d, (held.get(d) || 0) + n); } }
  const inPools = new Set(); for (const t of layer2Targets().filter(t => t.kind === 'pair')) for (const r of readJsonl(`layer2/${t.key}.jsonl.gz`) || []) if (r.data && r.data.assets) for (const a of r.data.assets) inPools.add(a[0]);
  const cand = new Map();
  for (const [d, ww] of held) { const bare = d.startsWith('cw20:') ? d.slice(5) : d; if (bare === 'uluna' || inPools.has(bare)) continue;
    const code = d.startsWith('cw20:') ? codeOf(bare) : null; if (code && NOT_PRICE_TOKEN.test(protoOf(code))) continue;
    const sym = resolve ? (resolve(d) || {}).symbol : null; if (sym && await seriesSpan(sym)) continue;
    cand.set(bare, ww); }
  const factories = new Set(); for (const x of Object.values(I.contracts)) if (PAIR_CODES.has(String(x.code_id || '')) && x.creator) factories.add(x.creator);
  const newest = weeks[weeks.length - 1]; const l2 = new Set(layer2Targets().map(t => t.addr));
  const assetOf = (ai) => ai && (ai.native_token ? ai.native_token.denom : ai.token ? ai.token.contract_addr : null);
  for (const f of factories) { const fm = man.factories[f] || (man.factories[f] = {}); if (fm.listed || fm.not_a_factory) continue;
    let start = null, pages = 0, listed = 0, err = null;
    while (pages < 400 && !overBudget()) { const r = await smartAt(f, { pairs: start ? { start_after: start, limit: 30 } : { limit: 30 } }, newest.h);
      if (!r.ok) { err = r; break; } const ps = (r.json && r.json.data && r.json.data.pairs) || []; pages++; listed += ps.length;
      for (const pr of ps) { const as = (pr.asset_infos || []).map(assetOf); const hit = as.filter(a => cand.has(a)); if (!hit.length || !pr.contract_addr || l2.has(pr.contract_addr)) continue;
        if (!man.pairs[pr.contract_addr]) man.pairs[pr.contract_addr] = { factory: f, assets: as, weight: hit.reduce((x, a) => x + cand.get(a), 0), done: {} }; }
      if (ps.length < 30) break; start = ps[ps.length - 1].asset_infos; }
    if (err) { const msg = say(err).slice(0, 140); if (/unknown variant|Error parsing|no such contract|not found/i.test(err.body || '')) fm.not_a_factory = msg; else fm.error = msg; console.log(`layer2c: ${f.slice(0, 16)}… — not listed: ${msg}`); }
    else { fm.listed = true; fm.pairs_listed = listed; fm.pages = pages; console.log(`layer2c: factory ${f.slice(0, 16)}… — ${listed} pairs listed`); } }
  const months = []; { const seen = new Set(); for (const w of weeks) { const m = w.d.slice(0, 7); if (seen.has(m)) continue; seen.add(m); if (w.h >= floors.contract) months.push(w); } }
  const P = Object.entries(man.pairs).sort((a, b) => b[1].weight - a[1].weight).slice(0, 400);
  const tasks = []; for (const [addr, pm] of P) for (const m of months) if (!pm.done[m.d]) tasks.push([addr, m]);
  console.log(`layer2c: ${cand.size} held tokens nothing prices · ${factories.size} pair creators (${Object.values(man.factories).filter(x => x.listed).length} factories listed) · ${Object.keys(man.pairs).length} pools hold them (${P.length} read) · ${tasks.length} monthly reads to do`);
  const brk = breaker(); let halted = false; const buf = new Map(); let n = 0, ok = 0, absent = 0, bad = 0, lastCommit = Date.now();
  const flush = () => { for (const [addr, rows] of buf) { const f = `layer2c/${addr}.jsonl.gz`; let old = ''; try { old = zlib.gunzipSync(fs.readFileSync(A(f))).toString('utf8'); } catch { } fs.mkdirSync(path.dirname(A(f)), { recursive: true }); fs.writeFileSync(A(f), zlib.gzipSync(old + rows.map(r => JSON.stringify(r)).join('\n') + '\n')); } buf.clear(); man.updated_at = new Date().toISOString(); man.contract_floor = floors.contract; man.candidates = cand.size; writeJson('layer2c/_manifest.json', man); };
  await pool(tasks, CONC, async ([addr, m]) => {
    if (overBudget() || halted) return; const r = await smartAt(addr, { pool: {} }, m.h); n++; let row;
    if (r.ok) { ok++; const data = r.json && r.json.data; row = { d: m.d, h: m.h, data: data ? { assets: (data.assets || []).map(a => [a.info && (a.info.native_token ? a.info.native_token.denom : a.info.token && a.info.token.contract_addr), a.amount]), total_share: data.total_share } : null }; }
    else if (/no such contract|not found|unknown variant|Error parsing into type/i.test(r.body || '')) { absent++; row = { d: m.d, h: m.h, absent: true }; }
    else { bad++; if (brk.bad(r) && !halted) { halted = true; console.log('layer2c: 150 failures in a row — stopping'); try { fs.writeFileSync(`${MODE}_stop.txt`, '1'); } catch { } process.exitCode = 1; } return; }
    brk.ok(); (buf.get(addr) || buf.set(addr, []).get(addr)).push(row); man.pairs[addr].done[m.d] = 1;
    if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); flush(); commitPush(`layer2c: +${n} reads`); } });
  flush(); commitPush(`layer2c: ${ok} pool answers`); brk.report();
  const left = tasks.length - ok - absent; console.log(`layer2c run: ${n} reads · ok ${ok} · pool not there yet ${absent} · failed ${bad} · ${left > 0 ? left + ' left' : 'ALL DONE'}`);
  return Math.max(0, left);
}
// ── 1.9: closeout (gapfill runs it too) — settle what is left, fetch the price pools, re-derive if anything new arrived, re-audit ──
async function closeout() {
  const H = readJson('layer2/heights.json', null); const weeks = H ? Object.entries(H.rows).map(([d, x]) => ({ d, h: x.h })) : [];
  const invF = fs.readdirSync(A('inventory')).filter(f => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop(); const I = readJson('inventory/' + invF, { contracts: {} });
  const samples = layer2Targets().filter(t => t.kind === 'pair').sort((a, b) => ((I.contracts[b.addr] || {}).txs || 0) - ((I.contracts[a.addr] || {}).txs || 0));   // the floor is measured on the earliest-starting busy pair (1.9)
  const pick = await chooseRoute(MODE, samples, weeks); if (!pick) return;
  const floors = { bank: pick.floor, contract: pick.wasmFloor }; console.log(`${MODE} · node floors: bank ${floors.bank.toLocaleString('en-US')} · contracts ${floors.contract.toLocaleString('en-US')}`);
  const finish = (left) => { try { fs.writeFileSync(`${MODE}_left.txt`, String(left)); } catch { } console.log(`${MODE}: stopped with work left — the next run continues (chain)`); };
  const stop = () => overBudget() || fs.existsSync(`${MODE}_stop.txt`);
  const r1 = await layer1b(); if (stop()) return finish(r1.left || 1);
  const left2 = await layer2b(floors); if (stop()) return finish(left2 || 1);
  const left3 = await layer3b(); if (stop()) return finish(left3 || 1);
  const left4 = await layer2c(floors, weeks); if (stop()) return finish(left4 || 1);
  if (r1.added) { console.log(`${MODE} · +${r1.added} txs — re-running flows`); await flowsMode(); } else console.log(`${MODE} · no new txs — flows unchanged`);
  await audit();
  const left = r1.left + left2 + left3 + left4; try { fs.writeFileSync(`${MODE}_left.txt`, '0'); } catch { }   // no self-restart after the audit: what is left failed transiently and is named above
  console.log(`${MODE}: DONE${left ? ` — ${left} items failed transiently (kept for a later run; nothing the node rejects is retried)` : ' — nothing left'}`);
}

// ── 2.0: ratios — deep, measured history of every liquid-staking rate, daily, labelled by source; gaps stay gaps ─────────────
// Owner 2026-10-01: "liquid tokens can have the ratio queried at block height … so this stops happening". Before 2.0 the ratio product held
// chain reads only from epoch 97 (2024-09); earlier days were a straight line (ampLUNA 537 days) or missing (arbLUNA / ampROAR / ampCAPA),
// and cross-chain LSTs (stLUNA …) had no ratio at all (priced as their base). Sources, best first, per day:
//   H  the hub's own rate, read AT the day's block height (state{}.exchange_rate or exchange_rates{limit:1}[0][1]) — from the contract floor
//   X  the hub's STORED rate history (exchange_rates paged at today's height — Eris keeps it), one point per stored timestamp
//   B  bond txs on that day: base received by the hub ÷ LST minted, median of the day's bonds — the only measure before the contract floor
//      (the node keeps every tx); also run on the first 45 days after the floor and compared with H, so the method is validated, not assumed
//   P  cross-chain LSTs (hub on another chain): the pool's swap quote at the day's height ({simulation} — right on stable-swap pools, where
//      reserve ratios are not), (return + commission) ÷ offer
//   S  before the floor: that pool's swap executions on the day (median)
// Output: archive/ratios/<SYM>.<M>.jsonl.gz (raw) + docs/deep-history/chain-ratios/<SYM>.json in tla-core — public chain facts, no wallet.
const nd = (d) => String(d == null ? '' : d).replace(/^(native|cw20):/, '');   // denom without a cw20: / native: prefix
const LST_DEF = { ampLUNA: { lst: 'terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct', base: 'uluna' }, arbLUNA: { lst: 'terra1se7rvuerys4kd2snt6vqswh9wugu49vhyzls8ymc02wl37g2p2ms5yz490', base: 'uluna' },
  ampROAR: { lst: 'factory/terra1vklefn7n6cchn0u962w3gaszr4vf52wjvd4y95t2sydwpmpdtszsqvk9wy/ampROAR', base: 'terra1lxx40s29qvkrcj8fsa3yzyehy7w50umdvvnls2r830rys6lu2zns63eelv' },
  ampCAPA: { lst: 'factory/terra186rpfczl7l2kugdsqqedegl4es4hp624phfc7ddy8my02a4e8lgq5rlx7y/ampCAPA', base: 'terra1t4p3u8khpd7f8qzurwyafxt648dya6mp6vur3vaapswt6m24gkuqrfdhar' },
  bLUNA: { lst: 'terra17aj4ty4sz4yhgm08na8drc0v03v2jwr3waxcqrwhajj729zhl7zqnpc0ml', base: 'uluna' } };   // platform-crons config/contracts.js LST_HUBS
const XCHAIN_LST = { stLUNA: ['LUNA'], stATOM: ['ATOM'], dATOM: ['ATOM'], rSWTH: ['SWTH'], ampWHALE: ['WHALE'], bWHALE: ['WHALE'], wstETH: ['WETH.axl', 'wETH.wh'] };   // LST symbol → base symbol(s) (token catalog)
const SRC_RANK = { H: 5, X: 4, B: 3, P: 2, S: 1 };
const DISTR_MODULE = 'terra1jv65s3grqf6v6jl3dp4t6c9t9rk99cd8pm7utl';   // the distribution module: a delegation pays the hub its pending rewards in the same tx (2.0.1)
const RATIO_METHOD_V = 2;   // 2.0.1: B / X rows made by an older method are recomputed
const GATE = { B: { refs: ['H', 'X'], max: 0.25 }, X: { refs: ['H'], max: 0.25 }, S: { refs: ['P'], max: 1.0 } };   // a source is published only within this median % of the reference, on ≥ 10 shared days
const tsToMs = (t) => t > 1e17 ? t / 1e6 : t > 1e14 ? t / 1e3 : t > 1e11 ? t : t * 1000;   // ns · µs · ms · s
const pct = (a, b) => Math.abs(a / b - 1) * 100;
const median = (xs) => { const a = xs.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
function dayHeights(weeks, top, topT) {   // the block at 00:00 UTC of every day, interpolated between the weekly boundaries (block time is steady — minutes of error, a ratio does not move in minutes)
  const rows = weeks.map(w => ({ t: Date.parse(w.d + 'T00:00:00Z'), h: w.h })); if (top && topT) rows.push({ t: topT, h: top }); const out = [];
  for (let i = 0; i + 1 < rows.length; i++) { const a = rows[i], b = rows[i + 1]; for (let t = a.t; t < b.t; t += 864e5) out.push({ d: new Date(t).toISOString().slice(0, 10), h: Math.round(a.h + (b.h - a.h) * (t - a.t) / (b.t - a.t)) }); }
  return out;
}
function parseAmt(s) { const out = []; for (const part of String(s || '').split(',')) { const m = part.trim().match(/^(\d+)(.+)$/); if (m) out.push([m[2], BigInt(m[1])]); } return out; }
// one tx → { base, lst } raw amounts the hub received / minted in it (cw20 or native / tokenfactory either side)
function bondLegs(tx, hub, def) {
  let base = 0n, lst = 0n; const baseCw = /^terra1/.test(def.base), lstCw = /^terra1/.test(def.lst);
  for (const e of tx.e || []) { const a = Object.fromEntries(e.a);
    if (!baseCw && e.t === 'transfer' && a.recipient === hub && a.sender !== DISTR_MODULE) for (const [d, n] of parseAmt(a.amount)) if (d === def.base) base += n;   // rewards paid to the hub are not bonded
    if (baseCw && /^wasm/.test(e.t) && a._contract_address === def.base && /^(send|transfer)$/.test(a.action || '') && (a.to === hub || a.contract === hub) && /^\d+$/.test(a.amount || '')) base += BigInt(a.amount);
    if (lstCw && /^wasm/.test(e.t) && a._contract_address === def.lst && a.action === 'mint' && /^\d+$/.test(a.amount || '')) lst += BigInt(a.amount);
    if (!lstCw && e.t === 'tf_mint') for (const [d, n] of parseAmt(a.amount)) if (d === def.lst) lst += n; }
  if (!lstCw && lst === 0n) for (const e of tx.e || []) if (e.t === 'coinbase') { const a = Object.fromEntries(e.a); for (const [d, n] of parseAmt(a.amount)) if (d === def.lst) lst += n; }   // the bank's coinbase repeats tf_mint — counted only when there is no tf_mint
  return { base, lst };
}
function swapLegs(tx, pair, lstD, baseD) {   // → [lst raw, base raw] of every swap in this pair between the two (fee added back: the quote before fees)
  const out = []; for (const e of tx.e || []) { const a = Object.fromEntries(e.a); if (!/^wasm/.test(e.t) || a._contract_address !== pair || a.action !== 'swap') continue;
    const off = nd(a.offer_asset || ''), ask = nd(a.ask_asset || ''); const o = BigInt(/^\d+$/.test(a.offer_amount || '') ? a.offer_amount : 0), r = BigInt(/^\d+$/.test(a.return_amount || '') ? a.return_amount : 0) + BigInt(/^\d+$/.test(a.commission_amount || '') ? a.commission_amount : 0);
    if (!(o > 0n && r > 0n)) continue; if (off === lstD && ask === baseD) out.push([o, r]); else if (off === baseD && ask === lstD) out.push([r, o]); }
  return out;
}
async function windowTxs(addr, h0, h1, pages = 2) {   // txs touching a contract in [h0, h1), oldest first — one or two pages is plenty for a day's rate
  const out = []; for (let p = 1; p <= pages; p++) { const r = await txSearch(`wasm._contract_address='${addr}' AND tx.height>=${h0} AND tx.height<${h1}`, p, 30); if (r.error) return { error: r.error, txs: out };
    for (const t of r.txs) out.push(shapeTx(t)); if (out.length >= r.total || !r.txs.length) break; } return { txs: out };
}
async function ratios() {
  const H = readJson('layer2/heights.json', null); if (!H) throw new Error('no layer2/heights.json');
  const weeks = Object.entries(H.rows).map(([d, x]) => ({ d, h: x.h })); const invF = fs.readdirSync(A('inventory')).filter(f => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop(); const I = readJson('inventory/' + invF, { contracts: {} });
  const samples = layer2Targets().filter(t => t.kind === 'pair').sort((a, b) => ((I.contracts[b.addr] || {}).txs || 0) - ((I.contracts[a.addr] || {}).txs || 0));
  const pick = await chooseRoute(MODE, samples, weeks); if (!pick) return; const floor = pick.wasmFloor;
  const top = await latestHeight(); const topT = top ? await blockAt(top) : null; const days = dayHeights(weeks, top, topT);
  const man = readJson('ratios/_manifest.json', { version: VERSION, series: {} }); const dirty = new Set();
  const S0 = (sym, m) => { const k = `${sym}.${m}`; return man.series[k] || (man.series[k] = { done: {}, dropped: null }); };
  const rows = {}; const load = (sym, m) => { const k = `${sym}.${m}`; if (!rows[k]) rows[k] = readJsonl(`ratios/${k}.jsonl.gz`) || []; return rows[k]; };
  const put = (sym, m, row) => { load(sym, m).push(row); dirty.add(`${sym}.${m}`); S0(sym, m).done[row.d] = 1; };
  const flush = () => { for (const k of dirty) gz(`ratios/${k}.jsonl.gz`, rows[k]); dirty.clear(); man.updated_at = new Date().toISOString(); man.contract_floor = floor; writeJson('ratios/_manifest.json', man); };
  let lastCommit = Date.now(); const tick = () => { if (Date.now() - lastCommit > 8 * 60000) { lastCommit = Date.now(); flush(); commitPush('ratios: progress'); } };
  const newest = days[days.length - 1]; const post = days.filter(x => x.h >= floor), pre = days.filter(x => x.h < floor), valid = post.slice(0, 45);
  console.log(`ratios · ${days.length} days (${days[0].d} → ${newest.d}) · contract floor ${floor.toLocaleString('en-US')} (${post[0] && post[0].d}) · ${pre.length} days before it`);
  // ── Terra hubs ──
  for (const [sym, def] of Object.entries(LST_DEF)) { const hub = (LST_HUBS[sym] || [])[0]; if (!hub) continue;
    // H: which question gives the rate (state first, then exchange_rates)
    const sh = S0(sym, 'H'); if (!sh.q && !sh.dropped) { const tries = [[{ state: {} }, (d) => d && (d.exchange_rate ?? d.exchange_rate_lst)], [{ exchange_rates: { limit: 1 } }, (d) => d && d.exchange_rates && d.exchange_rates[0] && d.exchange_rates[0][1]]];
      for (const [q, f] of tries) { const r = await smartAt(hub, q, newest.h); const v = r.ok ? Number(f(r.json && r.json.data)) : NaN; if (Number.isFinite(v) && v > 0) { sh.q = q; sh.f = q.state ? 'state' : 'xr'; break; } sh.last = r.ok ? 'answered without a rate: ' + JSON.stringify(r.json && r.json.data).slice(0, 80) : say(r).slice(0, 120); }
      if (!sh.q) { sh.dropped = `no rate in state{} or exchange_rates{} (${sh.last})`; console.log(`ratios · ${sym}: hub answers no rate — ${sh.dropped}`); } }
    const rateOf = (d) => d && (sh.f === 'state' ? Number(d.exchange_rate ?? d.exchange_rate_lst) : Number(d.exchange_rates && d.exchange_rates[0] && d.exchange_rates[0][1]));
    if (sh.q) { const todo = post.filter(x => !sh.done[x.d]); let ok = 0, absent = 0, bad = 0;
      await pool(todo, CONC, async (x) => { if (overBudget()) return; const r = await smartAt(hub, sh.q, x.h); const v = r.ok ? rateOf(r.json && r.json.data) : NaN;
        if (Number.isFinite(v) && v > 0) { ok++; put(sym, 'H', { d: x.d, h: x.h, r: v }); } else if (/no such contract|not found/i.test(r.body || '')) { absent++; put(sym, 'H', { d: x.d, h: x.h, absent: true }); } else bad++; tick(); });
      console.log(`ratios · ${sym} H (hub at block height): ${ok} days · not there yet ${absent} · failed ${bad}`); }
    // X: the hub's stored history, paged backwards from today
    const sx = S0(sym, 'X'); if (sx.v !== RATIO_METHOD_V) { sx.done = {}; sx.dropped = null; rows[`${sym}.X`] = []; dirty.add(`${sym}.X`); sx.v = RATIO_METHOD_V; }
    if (!sx.done.all && !sx.dropped) { const seen = new Map(); let start = null, pages = 0, err = null;
      while (pages < 400 && !overBudget()) { const r = await smartAt(hub, { exchange_rates: start == null ? { limit: 30 } : { start_after: start, limit: 30 } }, newest.h); if (!r.ok) { err = say(r).slice(0, 120); break; }
        const xs = (r.json && r.json.data && r.json.data.exchange_rates) || []; pages++; let older = null; for (const [ts, v] of xs) { const t = Number(ts); if (!seen.has(t)) seen.set(t, Number(v)); if (older == null || t < older) older = t; }
        if (!xs.length || older == null || (start != null && older >= start)) break; start = older; }
      if (!seen.size) { sx.dropped = err || 'empty'; console.log(`ratios · ${sym} X (stored history): none — ${sx.dropped}`); }
      else { const byDay = new Map(); for (const [t, v] of [...seen].sort((a, b) => a[0] - b[0])) { const d = new Date(tsToMs(t)).toISOString().slice(0, 10); if (d >= '2022' && d <= '2100') byDay.set(d, v); }
        for (const [d, v] of byDay) put(sym, 'X', { d, r: v }); sx.done.all = 1; const ks = [...byDay.keys()]; console.log(`ratios · ${sym} X (stored history): ${seen.size} points in ${pages} pages → ${byDay.size} days (${ks[0]} → ${ks[ks.length - 1]})`); } }
    // B: bond txs per day — before the floor, plus the first 45 days after it to validate against H
    const sb = S0(sym, 'B'); if (sb.v !== RATIO_METHOD_V) { sb.done = {}; rows[`${sym}.B`] = []; dirty.add(`${sym}.B`); sb.v = RATIO_METHOD_V; }   // 2.0.1: recompute
    const todoB = [...pre, ...valid].filter(x => !sb.done[x.d]); let okB = 0, noneB = 0, badB = 0;
    await pool(todoB, CONC, async (x) => { if (overBudget()) return; const i = days.indexOf(x); const h1 = (days[i + 1] || { h: x.h + 15000 }).h;
      const w = await windowTxs(hub, x.h, h1); if (w.error) { badB++; return; }
      const rs = []; for (const t of w.txs) { if (t.c) continue; const g = bondLegs(t, hub, def); if (g.base > 0n && g.lst > 0n) { const v = Number(g.base) / Number(g.lst); if (v > 0.5 && v < 20) rs.push(v); } }
      if (rs.length) { okB++; put(sym, 'B', { d: x.d, h: x.h, r: median(rs), n: rs.length }); } else { noneB++; put(sym, 'B', { d: x.d, h: x.h, none: true }); } tick(); });
    console.log(`ratios · ${sym} B (bond txs): ${okB} days with bonds · ${noneB} without · failed ${badB}`); }
  // ── cross-chain LSTs: their pool on Terra ──
  const cat = await getJson(`${RAW}/tla-core/main/token-catalog/snapshots/current.json`, 3, 30000); const bySym = new Map();
  for (const t of (cat.ok && cat.json.tokens) || []) { const e = t.effective || {}, g = t.discovered || {}; const sy = e.symbol || g.symbol; if (sy && !bySym.has(sy)) bySym.set(sy, { denom: nd(t.denom), dec: e.decimals ?? g.decimals ?? 6 }); }
  bySym.set('LUNA', { denom: 'uluna', dec: 6 });
  const factories = new Set(); for (const x of Object.values(I.contracts)) if (PAIR_CODES.has(String(x.code_id || '')) && x.creator) factories.add(x.creator);
  const wanted = Object.entries(XCHAIN_LST).map(([sy, bases]) => ({ sy, l: bySym.get(sy), b: bases.map(b => bySym.get(b)).filter(Boolean) })).filter(x => x.l && x.b.length);
  const assetOf = (ai) => ai && (ai.native_token ? ai.native_token.denom : ai.token ? ai.token.contract_addr : null);
  const cand = new Map();   // sym → [{pair, base}]
  if (wanted.some(w => !S0(w.sy, 'P').pair && !S0(w.sy, 'P').dropped)) for (const f of factories) { let start = null, pages = 0;
    while (pages < 400 && !overBudget()) { const r = await smartAt(f, { pairs: start ? { start_after: start, limit: 30 } : { limit: 30 } }, newest.h); if (!r.ok) break; const ps = (r.json && r.json.data && r.json.data.pairs) || []; pages++;
      for (const pr of ps) { const as = (pr.asset_infos || []).map(assetOf); for (const w of wanted) if (as.includes(w.l.denom)) for (const b of w.b) if (as.includes(b.denom)) (cand.get(w.sy) || cand.set(w.sy, []).get(w.sy)).push({ pair: pr.contract_addr, base: b }); }
      if (ps.length < 30) break; start = ps[ps.length - 1].asset_infos; } }
  for (const w of wanted) { const sp = S0(w.sy, 'P');
    if (!sp.pair && !sp.dropped) { let best = null; for (const c of cand.get(w.sy) || []) { const r = await smartAt(c.pair, { pool: {} }, newest.h); if (!r.ok) continue; const amt = ((r.json.data || {}).assets || []).find(a => assetOf(a.info) === c.base.denom); const dep = amt ? Number(amt.amount) : 0; if (!best || dep > best.dep) best = { ...c, dep }; }
      if (best) { sp.pair = best.pair; sp.base = best.base.denom; sp.base_dec = best.base.dec; console.log(`ratios · ${w.sy}: priced from pool ${best.pair.slice(0, 16)}… against ${[...bySym].find(([, v]) => v.denom === best.base.denom)[0]}`); }
      else { sp.dropped = 'no pool pairs it with its base'; console.log(`ratios · ${w.sy}: no pool pairs it with its base — no market rate`); continue; } }
    if (!sp.pair) continue; const lstUnit = 10n ** BigInt(w.l.dec); const q = { simulation: { offer_asset: { info: /^terra1/.test(w.l.denom) ? { token: { contract_addr: w.l.denom } } : { native_token: { denom: w.l.denom } }, amount: lstUnit.toString() } } };
    const scale = 10 ** (w.l.dec - sp.base_dec); let ok = 0, bad = 0, absent = 0, dead = 0; const why = {};
    await pool(post.filter(x => !sp.done[x.d]), CONC, async (x) => { if (overBudget()) return; const r = await smartAt(sp.pair, q, x.h);
      if (r.ok && r.json && r.json.data) { const d = r.json.data; const out = Number(d.return_amount || 0) + Number(d.commission_amount || 0); if (out > 0) { ok++; put(w.sy, 'P', { d: x.d, h: x.h, r: out / Number(lstUnit) * scale }); return; } }
      if (/no such contract|not found/i.test(r.body || '')) { absent++; put(w.sy, 'P', { d: x.d, h: x.h, absent: true }); }
      else { const m = say(r).replace(/\d{6,}/g, 'N').slice(0, 90); why[m] = (why[m] || 0) + 1; if (/Generic error|overflow|divide|insufficient|Error parsing|unknown variant|cannot|invalid|zero/i.test(r.body || '')) { dead++; put(w.sy, 'P', { d: x.d, h: x.h, err: m }); } else bad++; } tick(); });
    console.log(`ratios · ${w.sy} P (pool quote at block height): ${ok} days · not there yet ${absent} · the pool refused ${dead} (kept, not retried) · failed ${bad}${Object.keys(why).length ? ' · ' + Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${v}× ${k}`).join(' | ') : ''}`);
    const ss = S0(w.sy, 'S'); let okS = 0, noneS = 0;
    await pool([...pre, ...valid].filter(x => !ss.done[x.d]), CONC, async (x) => { if (overBudget()) return; const i = days.indexOf(x); const h1 = (days[i + 1] || { h: x.h + 15000 }).h; const wt = await windowTxs(sp.pair, x.h, h1); if (wt.error) return;
      const rs = []; for (const t of wt.txs) for (const [l, b] of swapLegs(t, sp.pair, w.l.denom, sp.base)) rs.push(Number(b) / Number(l) * scale);
      if (rs.length) { okS++; put(w.sy, 'S', { d: x.d, h: x.h, r: median(rs), n: rs.length }); } else { noneS++; put(w.sy, 'S', { d: x.d, h: x.h, none: true }); } tick(); });
    console.log(`ratios · ${w.sy} S (swap txs): ${okS} days · ${noneS} without swaps`); }
  flush(); commitPush('ratios: done');
  // ── merge per symbol: best source per day; validation where two sources overlap; publish (no wallet appears in any of it) ──
  const syms = [...new Set(Object.keys(man.series).map(k => k.split('.')[0]))]; const index = { version: VERSION, built: new Date().toISOString(), contract_floor: floor, note: 'Liquid-staking rates measured on chain, one row per day, labelled by source (H hub at block height · X hub stored history · B bond txs · P pool quote at block height · S swap txs). No interpolation: a day with no measurement is absent.', series: {} };
  const outDir = process.env.CORE_OUT ? path.join(process.env.CORE_OUT, 'chain-ratios') : null; if (outDir) fs.mkdirSync(outDir, { recursive: true });
  for (const sym of syms) { const by = {}; const lists = {};
    for (const m of Object.keys(SRC_RANK)) { const rs = (readJsonl(`ratios/${sym}.${m}.jsonl.gz`) || []).filter(r => Number.isFinite(r.r)); lists[m] = new Map(rs.map(r => [r.d, r.r])); for (const r of rs) if (!by[r.d] || SRC_RANK[m] > SRC_RANK[by[r.d][1]]) by[r.d] = [Number(r.r.toPrecision(10)), m]; }
    const cmp = (a, b) => { const ds = [...lists[a].keys()].filter(d => lists[b].has(d)); const diffs = ds.map(d => pct(lists[a].get(d), lists[b].get(d))); return ds.length ? { days: ds.length, median_pct: +median(diffs).toFixed(3), worst_pct: +Math.max(...diffs).toFixed(3) } : null; };
    const validation = {}; for (const [a, b] of [['B', 'H'], ['X', 'H'], ['S', 'P'], ['B', 'X']]) { const c = cmp(a, b); if (c) validation[`${a}_vs_${b}`] = c; }
    // 2.0.1 PUBLISH GATE — a source that disagrees with the hub (or the pool quote) where both exist never reaches the public file
    const withheld = {}; for (const [m, g] of Object.entries(GATE)) { if (!lists[m] || !lists[m].size) continue; let ok = null, why = 'no overlap with ' + g.refs.join(' / ') + ' to validate against';
      for (const ref of g.refs) { const c = validation[`${m}_vs_${ref}`]; if (c && c.days >= 10) { ok = c.median_pct <= g.max; why = `median ${c.median_pct} % vs ${ref} on ${c.days} days (limit ${g.max} %)`; break; } }
      if (!ok) { withheld[m] = why; for (const d of Object.keys(by)) if (by[d][1] === m) delete by[d];
        for (const mm of Object.keys(SRC_RANK)) if (!withheld[mm] && SRC_RANK[mm] < SRC_RANK[m]) for (const [d, v] of lists[mm]) if (!by[d]) by[d] = [Number(v.toPrecision(10)), mm]; } }
    for (const [m] of Object.entries(withheld)) for (const [d, v] of Object.entries(by)) if (v[1] === m) delete by[d];
    const ds = Object.keys(by).sort(); const counts = {}; for (const d of ds) counts[by[d][1]] = (counts[by[d][1]] || 0) + 1;
    const doc = { symbol: sym, version: VERSION, from: ds[0] || null, to: ds[ds.length - 1] || null, days: ds.length, by_source: counts, validation, withheld, dropped: Object.fromEntries(Object.keys(SRC_RANK).map(m => [m, (man.series[`${sym}.${m}`] || {}).dropped]).filter(([, v]) => v)), daily: Object.fromEntries(ds.map(d => [d, by[d]])) };
    index.series[sym] = { from: doc.from, to: doc.to, days: doc.days, by_source: counts, validation, withheld };
    console.log(`ratios · ${sym}: ${ds.length} days ${doc.from || ''} → ${doc.to || ''} · ${Object.entries(counts).map(([k, v]) => k + ' ' + v).join(' · ')}${Object.keys(validation).length ? ' · check: ' + Object.entries(validation).map(([k, v]) => `${k} median ${v.median_pct}% on ${v.days} days`).join(', ') : ''}${Object.keys(withheld).length ? ' · WITHHELD ' + Object.entries(withheld).map(([k, v]) => `${k} (${v})`).join(', ') : ''}`);
    if (outDir) fs.writeFileSync(path.join(outDir, `${sym}.json`), JSON.stringify(doc) + '\n'); }
  if (outDir) { const C = readJson('cohort/current.json', { wallets: {} }); const txt = fs.readdirSync(outDir).map(f => fs.readFileSync(path.join(outDir, f), 'utf8')).join('');
    if (Object.keys(C.wallets).some(w => txt.includes(w))) { console.log('ratios: a cohort wallet would appear in the public files — NOT written'); fs.rmSync(outDir, { recursive: true, force: true }); process.exitCode = 1; }
    else fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1) + '\n'); }
  try { fs.writeFileSync(`${MODE}_left.txt`, overBudget() ? '1' : '0'); } catch { }
  console.log(`ratios: ${overBudget() ? 'stopped at the time budget — the next run continues' : 'DONE'}`);
}

if (!RPCS.length && !['cohort', 'inventory', 'flows', 'audit'].includes(MODE)) { console.error('ARCHIVE_RPC not set'); process.exit(1); }
if (!T) console.log('note: cosmjs-types not installed — messages will not be decoded (events are still kept)');
const run = { timing, cohort, layer1, inventory, layer2, layer3, flows: flowsMode, audit, gapfill: closeout, closeout, ratios }[MODE]; if (!run) { console.error('unknown MODE ' + MODE); process.exit(1); }
await run();

// mock-audit.mjs — gate for walk.mjs MODE=audit (1.7). Builds a small archive in the REAL file shapes (cohort, layer1 parts +
// manifest, inventory, layer2 heights / rows / manifest, layer3 rows / manifest), runs the REAL flows mode on it, then the audit
// against a fake node that behaves like the real archive node did on 2026-09-30: bank state pruned below a floor ("version does not
// exist … pruned"), contract state below a higher floor ("panic: unknown request"), an unknown query answered with its variant list.
// Planted faults the audit must find: a wallet whose stored txs ≠ its manifest · one layer-2 week missing · one layer-3 month missing ·
// a genesis-style opening balance (constant drift) · a cw20 token the chain disagrees on · txs only findable under coin_received.receiver
// · an extra key (wasm.staker_addr) seen in events · a busy TLA compounding contract layer 2 never read. And: the public copy names no wallet.
// Run: node mock-audit.mjs   (needs cosmjs-types — npm i cosmjs-types@0.9.0)
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import http from 'http'; import os from 'os'; import { execFileSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const W = require('cosmjs-types/cosmwasm/wasm/v1/query'); const B = require('cosmjs-types/cosmos/bank/v1beta1/query'); const St = require('cosmjs-types/cosmos/staking/v1beta1/query');
const here = path.dirname(new URL(import.meta.url).pathname);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-audit-')); const ARC = path.join(root, 'archive'); const CORE = path.join(root, 'core'); const PUB = path.join(root, 'pub');
const wr = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof o === 'string' ? o : JSON.stringify(o)); };
const gz = (p, rows) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, zlib.gzipSync(rows.map(r => JSON.stringify(r)).join('\n') + '\n')); };
const CH = '023456789acdefghjklmnpqrstuvwxyz'; const addr = (seed, len) => { const h = require('crypto').createHash('sha256').update('mock' + seed).digest(); return 'terra1' + Array.from({ length: len }, (_, i) => CH[(h[i % 32] ^ (i >> 5)) & 31]).join(''); };
const wallets = [1, 2, 3, 4, 5, 6].map(s => addr(s, 38));
const PAIR = addr(101, 58), ROAR = addr(102, 58), AMP = addr(103, 58), COMP = addr(104, 58), LP = addr(105, 58);
// 20 Mondays from 2024-01-01; heights 100,000 apart. Bank floor 500,000 (week 5), contract floor 1,000,000 (week 10).
const weeks = Array.from({ length: 20 }, (_, i) => ({ d: new Date(Date.UTC(2024, 0, 1) + i * 7 * 864e5).toISOString().slice(0, 10), h: 100000 * (i + 1) }));
const BANK_FLOOR = 500000, WASM_FLOOR = 1000000, TOP = 2100000;
wr(`${ARC}/layer2/heights.json`, { rows: Object.fromEntries(weeks.map((w, i) => [w.d, { h: w.h, epoch: 62 + i, src: 'mock' }])) });
wr(`${ARC}/cohort/current.json`, { cut_day: '2024-05-13', wallets: Object.fromEntries(wallets.map(w => [w, ['adao']])) });
// layer 1 — every wallet: an opening native receive, cw20 moves, fees; wallet 0 also appears under wasm.staker_addr; wallet 1's manifest over-counts
let hash = 0; const tx = (h, e, extra = {}) => ({ h, x: 'H' + (++hash).toString(16).padStart(8, '0'), i: 0, c: 0, e, m: [{ type: '/cosmwasm.wasm.v1.MsgExecuteContract', value: {} }], f: { amount: ['1000uluna'] }, ...extra });
const ev = (t, o) => ({ t, a: Object.entries(o) }); const L1 = {}; const L1M = { wallets: {} };
wallets.forEach((w, k) => {
  const txs = [
    tx(150000, [ev('coin_received', { receiver: w, amount: '5000000uluna' }), ev('transfer', { recipient: w, sender: 'terra1faucetfaucetfaucetfaucetfaucetfaucet2', amount: '5000000uluna' })]),
    tx(250000, [ev('coin_spent', { spender: w, amount: '1000uluna' }), ev('wasm', { _contract_address: ROAR, action: 'transfer', from: PAIR, to: w, amount: '700' }), ev('wasm', { _contract_address: PAIR, action: 'swap' })]),
    tx(1250000, [ev('coin_spent', { spender: w, amount: '1000uluna' }), ev('wasm', { _contract_address: ROAR, action: 'transfer', from: w, to: PAIR, amount: '200' }), ev('wasm', { _contract_address: AMP, action: 'mint', to: w, amount: '300' }), ev('wasm', { _contract_address: COMP, action: 'bond', ...(k === 0 ? { staker_addr: w } : {}) })]),
  ];
  L1[w] = txs; gz(`${ARC}/layer1/${w.slice(-1)}/${w}/part-000.jsonl.gz`, txs);
  L1M.wallets[w] = { done: true, txs: k === 1 ? txs.length + 2 : txs.length, searches: { 'message.sender': { total: 2 } } };
});
wr(`${ARC}/layer1/_manifest.json`, L1M);
// inventory — codes: 392 pair (in layer 2), 1317 ROAR, 12 amp token, 3778 compounding (NOT in layer 2), 69 LP token (held by nobody)
const cinfo = (code, txs, first_h, actions) => ({ code_id: code, txs, wallets: 6, first_h, last_h: 1250000, actions });
wr(`${ARC}/inventory/2024-05-13.json`, { contracts: { [PAIR]: cinfo('392', 12, 250000, { swap: 6 }), [ROAR]: cinfo('1317', 12, 250000, { transfer: 12 }), [AMP]: cinfo('12', 6, 1250000, { mint: 6 }), [COMP]: cinfo('3778', 50, 1250000, { bond: 6 }) },
  by_code_id: { '392': { contracts: 1, txs: 12 }, '1317': { contracts: 1, txs: 12 }, '12': { contracts: 1, txs: 6 }, '3778': { contracts: 1, txs: 50 } } });
wr(`${CORE}/protocol-labels.json`, { by_code_id: { '392': { protocol: 'Astroport', what: 'pairs' }, '1317': { protocol: 'cw20 tokens', what: 'generic cw20' }, '12': { protocol: 'Eris', what: 'amp compounder tokens + LST tokens' }, '3778': { protocol: 'Eris / TLA', what: 've3 asset compounding (amp)' } } });
// layer 2 — pair rows for every readable week except one (planted gap); weeks below the contract floor are events-only
const rows2 = weeks.filter(w => w.h >= WASM_FLOOR && w.d !== weeks[14].d).map(w => ({ d: w.d, h: w.h, data: { assets: [['uluna', '1000000'], [ROAR, '9000000']], total_share: '5000' } }));
gz(`${ARC}/layer2/392/${PAIR}.jsonl.gz`, rows2); wr(`${ARC}/layer2/_manifest.json`, { targets: { [`392/${PAIR}`]: { kind: 'pair', done: Object.fromEntries(rows2.map(r => [r.d, 1])) } }, state_floor: { contract_reads_from: WASM_FLOOR } });
// layer 3 — monthly bank: the chain holds 20 LUNA MORE than the events say (a genesis-style opening balance) for wallet 2; one month missing for wallet 3
const monthly = []; { const seen = new Set(); for (const w of weeks) { const m = w.d.slice(0, 7); if (!seen.has(m)) { seen.add(m); monthly.push(w); } } }
const L3M = { wallets: {}, state_floor: { block: BANK_FLOOR } };
wallets.forEach((w, k) => { const rows = []; L3M.wallets[w] = { first_h: 150000, done: {} };
  for (const b of monthly) { if (b.h < BANK_FLOOR) continue; if (k === 3 && b === monthly[monthly.length - 1]) continue;
    const spent = (b.h >= 250000 ? 1000 : 0) + (b.h >= 1250000 ? 1000 : 0); let lun = 5000000 - spent; if (k === 2) lun += 20000000;
    rows.push({ d: b.d, h: b.h, bank: [['uluna', String(lun)]], delegations: [], unbonding: [] }); L3M.wallets[w].done[b.d] = 1; }
  gz(`${ARC}/layer3/${w.slice(-1)}/${w}.jsonl.gz`, rows); });
wr(`${ARC}/layer3/_manifest.json`, L3M);
// public files the audit fetches (token catalog, the denom-symbol rule, price series)
// the real rule when a platform-crons checkout is given (DENOM_SYMBOL_JS=…/platform-crons/lib/denom-symbol.js), else its public copy is fetched
const dsSrc = process.env.DENOM_SYMBOL_JS ? fs.readFileSync(process.env.DENOM_SYMBOL_JS, 'utf8') : await (await fetch('https://raw.githubusercontent.com/thealliancedao/platform-crons/main/lib/denom-symbol.js')).text();
wr(`${PUB}/platform-crons/main/lib/denom-symbol.js`, dsSrc);
wr(`${PUB}/tla-core/main/token-catalog/snapshots/current.json`, { tokens: [{ denom: ROAR, effective: { symbol: 'ROAR', decimals: 6 } }] });
wr(`${PUB}/tla-core/main/price-history/series/LUNA.json`, { daily: { '2022-05-28': 1, '2026-09-30': 0.05 } });
wr(`${PUB}/tla-core/main/price-history/series/ROAR.json`, { daily: { '2023-01-01': 1e-5, '2026-09-30': 1e-6 } });

// ── the fake node ──
const blockTime = (h) => Date.parse(weeks[0].d) + (h - weeks[0].h) * (7 * 864e5 / 100000);
const allTx = Object.values(L1).flat();
const hidden = wallets.slice(0, 3).map((w, k) => tx(1350000 + k, [ev('coin_received', { receiver: w, amount: '777uluna' })]));   // only under coin_received.receiver
const toRpcTx = (t) => ({ hash: t.x, height: String(t.h), index: 0, tx_result: { code: 0, gas_wanted: '1', gas_used: '1', events: t.e.map(e => ({ type: e.t, attributes: e.a.map(([key, value]) => ({ key, value })) })) }, tx: null });
const abciResp = (res, value, log) => res.end(JSON.stringify({ result: { response: log ? { code: 18, log } : { code: 0, value: Buffer.from(value).toString('base64') } } }));
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); res.setHeader('content-type', 'application/json');
  if (u.pathname.endsWith('/status')) return res.end(JSON.stringify({ result: { sync_info: { latest_block_height: String(TOP) } } }));
  if (u.pathname.endsWith('/block')) { const h = Number(u.searchParams.get('height')); return res.end(JSON.stringify({ result: { block: { header: { time: new Date(blockTime(h)).toISOString() } } } })); }
  if (u.pathname.endsWith('/tx_search')) { const q = u.searchParams.get('query').replace(/^"|"$/g, ''); const [key, v] = q.split("='"); const w = v.replace(/'$/, ''); const [type, attr] = key.split('.');
    const pool = [...allTx, ...hidden].filter(t => t.e.some(e => e.t === type && e.a.some(([k, x]) => k === attr && x === w)));
    return res.end(JSON.stringify({ result: { total_count: String(pool.length), txs: pool.map(toRpcTx) } })); }
  if (u.pathname.endsWith('/abci_query')) { const route = u.searchParams.get('path').replace(/"/g, ''); const h = Number(u.searchParams.get('height')); const data = Buffer.from(u.searchParams.get('data').slice(2), 'hex');
    if (/bank/.test(route)) { if (h < BANK_FLOOR) return abciResp(res, null, `failed to load state at height ${h}; version mismatch on immutable IAVL tree; version does not exist. Version has either been pruned, or is for a future block height`);
      return abciResp(res, B.QueryAllBalancesResponse.encode({ balances: [{ denom: 'uluna', amount: '1' }] }).finish()); }
    if (/staking/.test(route)) return abciResp(res, St.QueryDelegatorDelegationsResponse.encode({ delegationResponses: [] }).finish());
    if (/SmartContractState/.test(route)) { const q = W.QuerySmartContractStateRequest.decode(data); const msg = JSON.parse(Buffer.from(q.queryData).toString());
      if (h < WASM_FLOOR) return abciResp(res, null, 'panic: unknown request');
      const reply = (o) => abciResp(res, W.QuerySmartContractStateResponse.encode({ data: Buffer.from(JSON.stringify(o)) }).finish());
      if (msg.__audit_probe__) return abciResp(res, null, 'Error parsing into type ve3_asset_compounding::msg::QueryMsg: unknown variant `__audit_probe__`, expected one of `config`, `exchange_rates`, `user_infos`: query wasm contract failed: invalid request');
      if (msg.pool) return reply({ assets: [{ info: { native_token: { denom: 'uluna' } }, amount: '1000000' }, { info: { token: { contract_addr: ROAR } }, amount: '9000000' }], total_share: '5000' });
      if (msg.balance) { const w = msg.balance.address; const k = wallets.indexOf(w); let bal = 0; for (const t of allTx.filter(t => t.h <= h)) for (const e of t.e) { const a = Object.fromEntries(e.a); if (a._contract_address !== q.address) continue; if (a.to === w) bal += Number(a.amount); if (a.from === w) bal -= Number(a.amount); }
        if (q.address === AMP) bal += 50;   // planted: the amp token rebases / is credited outside the events we read
        return reply({ balance: String(bal) }); }
      return abciResp(res, null, 'Error parsing into type x: unknown variant'); }
  }
  // public files
  const f = path.join(PUB, u.pathname); if (fs.existsSync(f) && fs.statSync(f).isFile()) return res.end(fs.readFileSync(f)); res.statusCode = 404; res.end('{}');
});
await new Promise(r => server.listen(0, r)); const port = server.address().port; const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, ARCHIVE_DIR: ARC, CORE_OUT: CORE, NO_PUSH: '1', ARCHIVE_RPC: base, RAW_BASE: base, CONCURRENCY: '4', AUDIT_SAMPLE: '10', AUDIT_PROBE_PAGES: '3', RUNNER_TEMP: root };
const runMode = (mode) => new Promise((ok, bad) => { import('child_process').then(({ execFile }) => execFile('node', [path.join(here, 'walk.mjs')], { env: { ...env, MODE: mode }, cwd: root, maxBuffer: 1 << 24 }, (e, so, se) => e ? bad(new Error(se || so || e.message)) : ok(so))); });
let fails = 0; const check = (name, cond, got) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' — got ' + JSON.stringify(got).slice(0, 300)}`); if (!cond) fails++; };
try {
  const logF = await runMode('flows'); check('flows ran on the mock archive', /flows: 6 wallets/.test(logF), logF.slice(-300));
  const log = await runMode('audit'); console.log(log.split('\n').filter(l => /^audit|^  \[/.test(l)).join('\n'));
  const full = JSON.parse(fs.readFileSync(path.join(ARC, 'audit', new Date().toISOString().slice(0, 10) + '.json'), 'utf8')); const S = full.sections;
  const pubTxt = fs.readFileSync(path.join(CORE, 'audit.json'), 'utf8');
  check('A1 node floors measured (bank ≈ 500K, contract ≈ 1.0M)', S.node.floors.source === 'measured now' && Math.abs(S.node.floors.bank - BANK_FLOOR) <= 2000 && S.node.floors.contract >= WASM_FLOOR && S.node.floors.contract - WASM_FLOOR <= 50000, S.node.floors);
  check('A2 layer1: stored txs ≠ manifest found (1 wallet)', S.layer1.parts_txs_mismatch === 1 && S.layer1.txs === 18, S.layer1);
  check('A3 layer1: extra key wasm.staker_addr seen', (S.layer1_extra_keys['wasm.staker_addr'] || 0) === 1, S.layer1_extra_keys);
  check('A4 layer2: exactly one readable week missing; pre-floor weeks counted events-only (floor measured to ~1,000 blocks)', S.layer2.readable_missing === 1 && S.layer2.by_kind.pair.below_floor === 9 && S.layer2.by_kind.pair.readable === 10 && S.layer2.by_kind.pair.ok === 9, S.layer2);
  check('A5 layer3: one month missing (1 wallet)', S.layer3.missing === 1 && S.layer3.wallets_missing_some === 1, S.layer3);
  check('A6 flows: the opening balance classed constant_from_first_checkpoint, chain higher', S.flows.by_class.constant_from_first_checkpoint && S.flows.by_class.constant_from_first_checkpoint.pairs === 1 && S.flows.by_class.constant_from_first_checkpoint.chain_higher === 1, S.flows);
  check('A7 cw20 sample: the amp token disagrees, ROAR agrees', S.cw20_check.differ > 0 && S.cw20_check.worst_tokens.length === 1 && S.cw20_check.worst_tokens[0].token === AMP && S.cw20_check.agree > 0, S.cw20_check);
  check('A8 missed keys: coin_received.receiver finds txs not in layer 1', S.layer1_keys_probe.keys['coin_received.receiver'].not_in_archive === 3, S.layer1_keys_probe);
  check('A9 layer2 never read code 3778, with its query API', S.protocol_state_not_in_layer2.uncovered.some(r => r.code === '3778' && (r.query_api || []).includes('exchange_rates')), S.protocol_state_not_in_layer2);
  check('A10 prices: ROAR has a series, the amp token needs its exchange rate', S.prices.top.some(t => t.symbol === 'ROAR' && t.class === 'symbol + price series') && S.prices.top.some(t => t.code === '12' && /exchange rate/.test(t.class)), S.prices.top);
  check('A11 gaps list names layer1-keys, cw20-drift, layer2-tla-lst, layer2-missing', ['layer1-keys', 'cw20-drift', 'layer2-tla-lst', 'layer2-missing', 'layer3-missing'].every(id => full.gaps.some(g => g.id === id)), full.gaps.map(g => g.id));
  check('A12 the public copy names no cohort wallet (addresses are valid)', wallets.every(w => /^terra1[02-9ac-hj-np-z]{38}$/.test(w)) && !wallets.some(w => pubTxt.includes(w)), null);
  // privacy guard: a wallet planted where the public copy carries text (a contract's name in the labels) must stop the write
  const lab = JSON.parse(fs.readFileSync(path.join(CORE, 'protocol-labels.json'), 'utf8')); lab.by_code_id['3778'].what = 'owned by ' + wallets[4]; wr(path.join(CORE, 'protocol-labels.json'), lab); fs.rmSync(path.join(CORE, 'audit.json'));
  let blocked = false; try { await runMode('audit'); } catch (e) { blocked = /NOT written/.test(e.message); }
  check('A12b the guard refuses to publish a copy that names a cohort wallet', blocked && !fs.existsSync(path.join(CORE, 'audit.json')), blocked);
  check('A13 no stop file left, exit clean', !fs.existsSync(path.join(root, 'audit_stop.txt')), null);
  // node down → offline audit still completes, chain sections skipped
  lab.by_code_id['3778'].what = 've3 asset compounding (amp)'; wr(path.join(CORE, 'protocol-labels.json'), lab);
  env.ARCHIVE_RPC = 'http://127.0.0.1:9'; const logDown = await runMode('audit'); const full2 = JSON.parse(fs.readFileSync(path.join(ARC, 'audit', new Date().toISOString().slice(0, 10) + '.json'), 'utf8'));
  check('A14 node down: offline sections still run, probes skipped, floors from manifests', full2.sections.node.reachable === false && full2.sections.cw20_check.skipped && full2.sections.layer2.readable_missing === 1 && full2.sections.node.floors.source === 'manifests', full2.sections.node);
} catch (e) { console.log('FAIL  run: ' + e.message.slice(0, 1500)); fails++; }
server.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);

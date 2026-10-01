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
const PAIR = addr(101, 58), ROAR = addr(102, 58), AMP = addr(103, 58), COMP = addr(104, 58), LP = addr(105, 58), CONN = addr(106, 58);
const FACT = addr(107, 58), TOKX = addr(108, 58), PAIR2 = addr(109, 58);   // 1.9: a DEX factory, a held token nothing prices, the pool that prices it (created at 1.5M)
const BUCKETS = ['terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq', 'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa', 'terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv', 'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k'];
const HUB2580 = 'terra1jwyzzsaag4t0evnuukc35ysyrx9arzdde2kg9cld28alhjurtthq0prs2s';
const DEL_DEAD = 900000;   // 1.9: below this the node fails delegation reads with "invalid denom: : panic" (as the archive node did)
// 20 Mondays from 2024-01-01; heights 100,000 apart. Bank floor 500,000 (week 5), contract floor 1,000,000 (week 10).
const weeks = Array.from({ length: 20 }, (_, i) => ({ d: new Date(Date.UTC(2024, 0, 1) + i * 7 * 864e5).toISOString().slice(0, 10), h: 100000 * (i + 1) }));
const BANK_FLOOR = 500000, WASM_FLOOR = 1000000, TOP = 2100000, PAIR2_FROM = 1500000;
wr(`${ARC}/layer2/heights.json`, { rows: Object.fromEntries(weeks.map((w, i) => [w.d, { h: w.h, epoch: 62 + i, src: 'mock' }])) });
wr(`${ARC}/cohort/current.json`, { cut_day: '2024-05-13', wallets: Object.fromEntries(wallets.map(w => [w, ['adao']])) });
// layer 1 — every wallet: an opening native receive, cw20 moves, fees; wallet 0 also appears under wasm.staker_addr; wallet 1's manifest over-counts
let hash = 0; const tx = (h, e, extra = {}) => ({ h, x: 'H' + (++hash).toString(16).padStart(8, '0'), i: 0, c: 0, e, m: [{ type: '/cosmwasm.wasm.v1.MsgExecuteContract', value: {} }], f: { amount: ['1000uluna'] }, ...extra });
const ev = (t, o) => ({ t, a: Object.entries(o) }); const L1 = {}; const L1M = { wallets: {} };
wallets.forEach((w, k) => {
  const txs = [
    tx(150000, [ev('coin_received', { receiver: w, amount: '5000000uluna' }), ev('transfer', { recipient: w, sender: 'terra1faucetfaucetfaucetfaucetfaucetfaucet2', amount: '5000000uluna' })]),
    tx(250000, [ev('coin_spent', { spender: w, amount: '1000uluna' }), ev('wasm', { _contract_address: ROAR, action: 'transfer', from: PAIR, to: w, amount: '700' }), ev('wasm', { _contract_address: TOKX, action: 'transfer', from: PAIR2, to: w, amount: '1000' }), ev('wasm', { _contract_address: PAIR, action: 'swap' })]),
    tx(1250000, [ev('coin_spent', { spender: w, amount: '1000uluna' }), ev('wasm', { _contract_address: ROAR, action: 'transfer', from: w, to: PAIR, amount: '200' }), ev('wasm', { _contract_address: AMP, action: 'mint', to: w, amount: '300' }), ev('wasm', { _contract_address: COMP, action: 'bond', ...(k === 0 ? { depositor: w } : {}) })]),
  ];
  L1[w] = txs; gz(`${ARC}/layer1/${w.slice(-1)}/${w}/part-000.jsonl.gz`, txs);
  L1M.wallets[w] = { done: true, txs: k === 1 ? txs.length + 2 : txs.length, searches: { 'message.sender': { total: 2 } } };
});
wr(`${ARC}/layer1/_manifest.json`, L1M);
// inventory — codes: 392 pair (in layer 2), 1317 ROAR, 12 amp token, 3778 compounding (NOT in layer 2), 69 LP token (held by nobody)
const cinfo = (code, txs, first_h, actions) => ({ code_id: code, txs, wallets: 6, first_h, last_h: 1250000, actions });
wr(`${ARC}/inventory/2024-05-13.json`, { contracts: { ...Object.fromEntries(BUCKETS.map(b => [b, cinfo('4033', 30, 1300000, { 'asset/stake': 6 })])), [HUB2580]: cinfo('2580', 20, 600000, { stake: 6 }), [PAIR]: { ...cinfo('392', 12, 250000, { swap: 6 }), creator: FACT }, [ROAR]: cinfo('1317', 12, 250000, { transfer: 12 }), [AMP]: cinfo('12', 6, 1250000, { mint: 6 }), [COMP]: cinfo('3778', 50, 1250000, { bond: 6 }), [CONN]: cinfo('3120', 9, 1100000, { 'ca/claim_rewards': 3 }) },
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
    rows.push({ d: b.d, h: b.h, bank: [['uluna', String(lun)]], delegations: (k === 4 || b.h < DEL_DEAD && k < 4) ? null : [], unbonding: [] }); L3M.wallets[w].done[b.d] = 1; }
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
const acks = wallets.slice(0, 2).map((w, k) => tx(1450000 + k, [ev('wasm', { _contract_address: PAIR, action: 'acknowledge', sender: w })]));   // only under wasm.sender (a 1.8 key)
const toRpcTx = (t) => ({ hash: t.x, height: String(t.h), index: 0, tx_result: { code: 0, gas_wanted: '1', gas_used: '1', events: t.e.map(e => ({ type: e.t, attributes: e.a.map(([key, value]) => ({ key, value })) })) }, tx: null });
const abciResp = (res, value, log) => res.end(JSON.stringify({ result: { response: log ? { code: 18, log } : { code: 0, value: Buffer.from(value).toString('base64') } } }));
const NODE = { tx_search: 0 };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); res.setHeader('content-type', 'application/json');
  if (u.pathname.endsWith('/status')) return res.end(JSON.stringify({ result: { sync_info: { latest_block_height: String(TOP) } } }));
  if (u.pathname.endsWith('/block')) { const h = Number(u.searchParams.get('height')); return res.end(JSON.stringify({ result: { block: { header: { time: new Date(blockTime(h)).toISOString() } } } })); }
  if (u.pathname.endsWith('/tx_search')) { const q = u.searchParams.get('query').replace(/^"|"$/g, ''); NODE.tx_search++;
    if (/^[^=]*\//.test(q)) { res.statusCode = 500; return res.end(JSON.stringify({ jsonrpc: '2.0', id: -1, error: { code: -32603, message: 'Internal error', data: `failed to parse query: "${q}": unexpected token at "/"` } })); }   // 1.9: as the archive node did
    const [key, v] = q.split("='"); const w = v.replace(/'$/, ''); const [type, attr] = key.split('.');
    const pool = [...allTx, ...hidden, ...acks].filter(t => t.e.some(e => e.t === type && e.a.some(([k, x]) => k === attr && x === w)));
    return res.end(JSON.stringify({ result: { total_count: String(pool.length), txs: pool.map(toRpcTx) } })); }
  if (u.pathname.endsWith('/abci_query')) { const route = u.searchParams.get('path').replace(/"/g, ''); const h = Number(u.searchParams.get('height')); const data = Buffer.from(u.searchParams.get('data').slice(2), 'hex');
    if (/bank/.test(route)) { if (h < BANK_FLOOR) return abciResp(res, null, `failed to load state at height ${h}; version mismatch on immutable IAVL tree; version does not exist. Version has either been pruned, or is for a future block height`);
      return abciResp(res, B.QueryAllBalancesResponse.encode({ balances: [{ denom: 'uluna', amount: '1' }] }).finish()); }
    if (/staking/.test(route)) { if (/DelegatorDelegations/.test(route) && h < DEL_DEAD) return abciResp(res, null, 'invalid denom: : panic'); return abciResp(res, St.QueryDelegatorDelegationsResponse.encode({ delegationResponses: [] }).finish()); }
    if (/SmartContractState/.test(route)) { const q = W.QuerySmartContractStateRequest.decode(data); const msg = JSON.parse(Buffer.from(q.queryData).toString());
      if (h < WASM_FLOOR) return abciResp(res, null, 'panic: unknown request');
      const reply = (o) => abciResp(res, W.QuerySmartContractStateResponse.encode({ data: Buffer.from(JSON.stringify(o)) }).finish());
      if (msg.__audit_probe__) return abciResp(res, null, 'Error parsing into type ve3_asset_compounding::msg::QueryMsg: unknown variant `__audit_probe__`, expected one of `config`, `exchange_rates`, `user_infos`: query wasm contract failed: invalid request');
      if (q.address === FACT && msg.pairs) return reply({ pairs: msg.pairs.start_after ? [] : [{ asset_infos: [{ native_token: { denom: 'uluna' } }, { token: { contract_addr: ROAR } }], contract_addr: PAIR, liquidity_token: LP, pair_type: { xyk: {} } }, { asset_infos: [{ native_token: { denom: 'uluna' } }, { token: { contract_addr: TOKX } }], contract_addr: PAIR2, liquidity_token: addr(110, 58), pair_type: { xyk: {} } }] });
      if (q.address === PAIR2) { if (h < PAIR2_FROM) return abciResp(res, null, `query wasm contract failed: contract ${PAIR2}: no such contract`); if (msg.pool) return reply({ assets: [{ info: { native_token: { denom: 'uluna' } }, amount: '500000' }, { info: { token: { contract_addr: TOKX } }, amount: '4000000' }], total_share: '1000' }); }
      if (msg.pool) return reply({ assets: [{ info: { native_token: { denom: 'uluna' } }, amount: '1000000' }, { info: { token: { contract_addr: ROAR } }, amount: '9000000' }], total_share: '5000' });
      if (msg.balance) { const w = msg.balance.address; const k = wallets.indexOf(w); let bal = 0; for (const t of allTx.filter(t => t.h <= h)) for (const e of t.e) { const a = Object.fromEntries(e.a); if (a._contract_address !== q.address) continue; if (a.to === w) bal += Number(a.amount); if (a.from === w) bal -= Number(a.amount); }
        if (q.address === AMP) bal += 50;   // planted: the amp token rebases / is credited outside the events we read
        return reply({ balance: String(bal) }); }
      if (msg.gauge_infos) return abciResp(res, null, 'Error parsing into type ve3_gauge::QueryMsg: missing field `time`: query wasm contract failed');
      const k = Object.keys(msg)[0]; if (['state', 'total_vamp', 'total_fixed', 'asset_configs', 'exchange_rates', 'amplp_exchange_rates', 'whitelisted_asset_details', 'reward_distribution', 'total_staked_balances', 'whitelisted_assets'].includes(k)) return reply({ mock: k, h });
      return abciResp(res, null, 'Error parsing into type x: unknown variant'); }
  }
  // public files
  const f = path.join(PUB, u.pathname); if (fs.existsSync(f) && fs.statSync(f).isFile()) return res.end(fs.readFileSync(f)); res.statusCode = 404; res.end('{}');
});
await new Promise(r => server.listen(0, r)); const port = server.address().port; const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, ARCHIVE_DIR: ARC, CORE_OUT: CORE, NO_PUSH: '1', ARCHIVE_RPC: base, RAW_BASE: base, CONCURRENCY: '4', AUDIT_SAMPLE: '10', AUDIT_PROBE_PAGES: '3', RUNNER_TEMP: root };
const runWith = (file, mode, over = {}) => new Promise((ok, bad) => { import('child_process').then(({ execFile }) => execFile('node', [file], { env: { ...env, MODE: mode, ...over }, cwd: over._cwd || root, maxBuffer: 1 << 24 }, (e, so, se) => e ? bad(new Error((se || '') + (so || '') || e.message)) : ok(so))); });
const runMode = (mode) => new Promise((ok, bad) => { import('child_process').then(({ execFile }) => execFile('node', [path.join(here, 'walk.mjs')], { env: { ...env, MODE: mode }, cwd: root, maxBuffer: 1 << 24 }, (e, so, se) => e ? bad(new Error(se || so || e.message)) : ok(so))); });
let fails = 0; const check = (name, cond, got) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' — got ' + JSON.stringify(got).slice(0, 300)}`); if (!cond) fails++; };
try {
  const logF = await runMode('flows'); check('flows ran on the mock archive', /flows: 6 wallets/.test(logF), logF.slice(-300));
  const log = await runMode('audit'); console.log(log.split('\n').filter(l => /^audit|^  \[/.test(l)).join('\n'));
  const full = JSON.parse(fs.readFileSync(path.join(ARC, 'audit', new Date().toISOString().slice(0, 10) + '.json'), 'utf8')); const S = full.sections;
  const pubTxt = fs.readFileSync(path.join(CORE, 'audit.json'), 'utf8');
  check('A1 node floors measured (bank ≈ 500K, contract ≈ 1.0M)', S.node.floors.source === 'measured now' && Math.abs(S.node.floors.bank - BANK_FLOOR) <= 2000 && S.node.floors.contract >= WASM_FLOOR && S.node.floors.contract - WASM_FLOOR <= 50000, S.node.floors);
  check('A2 layer1: stored txs ≠ manifest found (1 wallet)', S.layer1.parts_txs_mismatch === 1 && S.layer1.txs === 18, S.layer1);
  check('A3 layer1: extra key wasm.depositor seen (a key no walk searches)', (S.layer1_extra_keys['wasm.depositor'] || 0) === 1, S.layer1_extra_keys);
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
  // ── 1.9 CLOSEOUT on the state the 1.8 run left in production: run the OLD 1.8 gapfill (origin/main) on a copy, then 1.9 closeout ──
  if (process.env.OLD_WALK && fs.existsSync(process.env.OLD_WALK)) {
    const ARC2 = path.join(root, 'archive2'), CORE2 = path.join(root, 'core2'), R2 = path.join(root, 'run2'); fs.cpSync(ARC, ARC2, { recursive: true }); fs.cpSync(CORE, CORE2, { recursive: true }); fs.mkdirSync(R2, { recursive: true });
    const oldDir = path.join(root, 'old'); fs.mkdirSync(oldDir, { recursive: true }); fs.copyFileSync(process.env.OLD_WALK, path.join(oldDir, 'walk.mjs')); fs.symlinkSync(path.join(here, 'node_modules'), path.join(oldDir, 'node_modules'));
    const t0 = Date.now(); const oldLog = await runWith(path.join(oldDir, 'walk.mjs'), 'gapfill', { ARCHIVE_DIR: ARC2, CORE_OUT: CORE2, CONCURRENCY: '8', _cwd: R2 });
    const ol = (re) => (oldLog.match(re) || [])[1];
    console.log(`  (the old 1.8 gapfill took ${Math.round((Date.now() - t0) / 1000)} s on 6 wallets: ${oldLog.split('\n').filter(l => /^(layer1b run|layer2b run|layer3b run)/.test(l)).join(' | ')})`);
    check('C0 the old 1.8 run reproduces production: every wallet "with a failed search", layer-2b reads failed below the real floor, delegation reads failed', Number(ol(/· (\d+) with a failed search · \d+ wallets left/)) === 6 && Number(ol(/layer2b run: .*failed (\d+)/)) > 0 && Number(ol(/layer3b run: \d+ refilled · (\d+) failed/)) > 0, oldLog.split('\n').filter(l => /run:/.test(l)));
    NODE.tx_search = 0; const t1 = Date.now();
    const cl = await runWith(path.join(here, 'walk.mjs'), 'closeout', { ARCHIVE_DIR: ARC2, CORE_OUT: CORE2, _cwd: R2 });
    const secs = Math.round((Date.now() - t1) / 1000); console.log(cl.split('\n').filter(l => /^(closeout|layer1b|layer2b|layer2c|layer3b|audit · (layer1 keys|layer2b|layer2c|delegations))/.test(l)).join('\n'));
    const L1 = JSON.parse(fs.readFileSync(path.join(ARC2, 'layer1/_manifest.json'), 'utf8')); const dk = Object.keys(L1.keys_dropped || {}).sort();
    check(`C1 layer1: the 4 keys the node rejects are dropped with its message (${dk.join(', ')}); every wallet complete; NO re-walk — all 6 settled from what 1.8 already searched (${secs} s)`, dk.length === 4 && dk.every(k => k.includes('/')) && Object.values(L1.keys_dropped).every(m => /failed to parse/.test(m)) && Object.values(L1.wallets).every(x => x.top18) && Number((cl.match(/\((\d+) settled without a search/) || [])[1]) === 6 && /\+0 new txs/.test(cl), { dk, n: NODE.tx_search, l: cl.split('\n').filter(l => /^layer1b/.test(l)) });
    const A2 = JSON.parse(fs.readFileSync(path.join(CORE2, 'audit.json'), 'utf8')); const S2 = A2.sections;
    check(`C2 layer2b: measured against the real contract floor (${S2.layer2b.contract_floor}) — nothing readable missing, the pre-floor weeks are events-only (${S2.layer2b.events_only_weeks}), none re-read`, S2.layer2b.contract_floor >= WASM_FLOOR && S2.layer2b.missing === 0 && S2.layer2b.events_only_weeks > 0 && /layer2b: .* 0 weekly reads to do/.test(cl), S2.layer2b);
    const dl = []; for (const w of wallets) { const f = path.join(ARC2, 'layer3', w.slice(-1), w + '.jsonl.gz'); if (fs.existsSync(f)) for (const r of zlib.gunzipSync(fs.readFileSync(f)).toString().trim().split('\n').map(l => JSON.parse(l))) dl.push(r); }
    const un = dl.filter(r => r.delegations_unreadable); const nul = dl.filter(r => r.delegations == null && !r.delegations_unreadable);
    check(`C3 delegations: the ${un.length} reads the node fails on ("invalid denom") are marked unreadable, all below ${DEL_DEAD}; none left null; none readable mis-marked`, un.length > 0 && un.every(r => r.h < DEL_DEAD && /invalid denom/.test(r.delegations_unreadable)) && nul.length === 0 && S2.layer3.delegations_null === 0 && S2.layer3.delegations_unreadable === un.length, { un: un.length, nul: nul.length, l3: S2.layer3 });
    const M3 = JSON.parse(fs.readFileSync(path.join(ARC2, 'layer2c/_manifest.json'), 'utf8')); const p2 = M3.pairs[PAIR2]; const r2 = fs.existsSync(path.join(ARC2, 'layer2c', PAIR2 + '.jsonl.gz')) ? zlib.gunzipSync(fs.readFileSync(path.join(ARC2, 'layer2c', PAIR2 + '.jsonl.gz'))).toString().trim().split('\n').map(l => JSON.parse(l)) : [];
    check(`C4 layer2c: the factory that created the cohort's pair is listed; the pool holding the unpriced token is found (and only it — the cohort's own pair is layer 2's); monthly reserves from the floor, "not there yet" before it existed`, M3.factories[FACT] && M3.factories[FACT].listed && Object.keys(M3.pairs).length === 1 && p2 && r2.length >= 2 && r2.some(r => r.absent && r.h < PAIR2_FROM) && r2.some(r => r.data && r.data.assets.some(a => a[0] === TOKX)) && r2.every(r => r.h >= WASM_FLOOR), { pairs: Object.keys(M3.pairs).length, rows: r2 });
    const tok = S2.prices.top.find(t => t.denom === 'cw20:' + TOKX);
    check(`C5 audit: TLA / LST state counted as covered (no "layer2-tla-lst"), no layer-1b / 2b gap; dropped keys and unreadable delegations named; the token is now priceable from a pool (${tok && tok.class})`, !A2.gaps.some(g => ['layer2-tla-lst', 'layer2b-missing', 'layer1b-incomplete'].includes(g.id)) && Object.keys(S2.layer1.keys_dropped).length === 4 && tok && /priceable from a layer-2 pool/.test(tok.class) && S2.layer2c.pools === 1, { gaps: A2.gaps.map(g => g.id), tok });
    NODE.tx_search = 0; const cl2 = await runWith(path.join(here, 'walk.mjs'), 'closeout', { ARCHIVE_DIR: ARC2, CORE_OUT: CORE2, _cwd: R2 });
    check(`C6 a second closeout has nothing to do — no key probed again, nothing read`, /layer1b: 0 wallets not complete/.test(cl2) && !/the node rejects this query/.test(cl2) && /0 weekly reads to do/.test(cl2) && /layer3b: 0 checkpoints/.test(cl2) && /0 monthly reads to do/.test(cl2) && /no new txs — flows unchanged/.test(cl2), cl2.split('\n').filter(l => /^(layer|closeout)/.test(l)));
  } else console.log('  (OLD_WALK not given — the 1.8 → 1.9 closeout reproduction is skipped)');
  // ── 1.8 gapfill on the same archive ──
  const logG = await runMode('gapfill'); console.log(logG.split('\n').filter(l => /^(gapfill|layer1b|layer2b|layer3b|flows)/.test(l)).join('\n'));
  const M1 = JSON.parse(fs.readFileSync(path.join(ARC, 'layer1/_manifest.json'), 'utf8'));
  check('F1 layer1b: every wallet searched under the 1.8 keys; the 2 IBC acks added as new parts', Object.values(M1.wallets).every(x => x.top18) && Object.values(M1.wallets).reduce((a, x) => a + (x.top18_added || 0), 0) === 2 && fs.readdirSync(path.join(ARC, 'layer1', wallets[0].slice(-1), wallets[0])).length === 2, M1.counts);
  const M2 = JSON.parse(fs.readFileSync(path.join(ARC, 'layer2b/_manifest.json'), 'utf8'));
  const g = M2.targets['tla/gauge_stable'] || {}; const conn = Object.keys(M2.targets).find(k => k.startsWith('tla/connector_'));
  check('F2 layer2b: the refused gauge question is dropped WITH its message; others read weekly from the floor', /missing field/.test(g.dropped || '') && conn && Object.keys(M2.targets[conn].done).length === 10 && Object.keys(M2.targets['lst/bLUNA'].done).length === 10, { g, conn: conn && M2.targets[conn].done });
  const row = fs.readFileSync(path.join(ARC, 'layer2b', 'tla', 'escrow_total_vamp.jsonl.gz')); const rr = zlib.gunzipSync(row).toString().trim().split('\n').map(l => JSON.parse(l));
  check('F3 layer2b rows keep the raw answer + week + height', rr.length === 10 && rr[0].data && rr[0].data.mock === 'total_vamp' && rr.every(r => r.h >= WASM_FLOOR), rr[0]);
  const l3 = zlib.gunzipSync(fs.readFileSync(path.join(ARC, 'layer3', wallets[4].slice(-1), wallets[4] + '.jsonl.gz'))).toString().trim().split('\n').map(l => JSON.parse(l));
  check('F4 layer3b: the missing delegations are refilled where the node has them; the rest marked unreadable (never retried)', l3.length && l3.every(r => Array.isArray(r.delegations) || (r.h < DEL_DEAD && r.delegations_unreadable)) && l3.some(r => Array.isArray(r.delegations)), l3);
  const fin = JSON.parse(fs.readFileSync(path.join(CORE, 'audit.json'), 'utf8'));
  check('F5 flows + audit re-ran: the audit sees layer 2b, the 1.8 keys and no missing delegations', fin.sections.layer2b.targets > 0 && fin.sections.layer2b.dropped.length === 4 && fin.sections.layer1.searched_under_1_8_keys === 6 && fin.sections.layer3.delegations_null === 0 && fin.sections.layer1.txs === 20, { l2b: fin.sections.layer2b, l1: fin.sections.layer1.txs, l3: fin.sections.layer3.delegations_null });
  check('F6 no work left → the chain stops', fs.readFileSync(path.join(root, 'gapfill_left.txt'), 'utf8') === '0', null);
  const logG2 = await runMode('gapfill'); check('F7 a second gapfill run finds nothing to do (resumable, no duplicates)', /layer1b: 0 wallets/.test(logG2) && /0 weekly reads to do/.test(logG2) && /layer3b: 0 checkpoints/.test(logG2), logG2.slice(0, 600));
  env.ARCHIVE_RPC = 'http://127.0.0.1:9'; const logDown = await runMode('audit'); const full2 = JSON.parse(fs.readFileSync(path.join(ARC, 'audit', new Date().toISOString().slice(0, 10) + '.json'), 'utf8'));
  check('A14 node down: offline sections still run, probes skipped, floors from manifests', full2.sections.node.reachable === false && full2.sections.cw20_check.skipped && full2.sections.layer2.readable_missing === 1 && full2.sections.node.floors.source === 'manifests', full2.sections.node);
} catch (e) { console.log('FAIL  run: ' + e.message.slice(0, 1500)); fails++; }
server.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);

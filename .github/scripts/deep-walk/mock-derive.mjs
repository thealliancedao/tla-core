// mock-derive.mjs — gate for walk.mjs MODE=derive (2.1). A small archive in the REAL shapes (cohort, layer-1 parts, inventory, layer-2
// heights + pair rows + manifest, layer-2b compounder rates, layer-3 checkpoints) plus the public files the derive reads (token catalog,
// the denom rule, price series, known contracts, measured LST rates). Six wallets, each planting cases the derive must get exactly right:
//   W0 an opening balance with no event (genesis airdrop) · a delegation · an undelegation whose payout happens at end-block (no tx) ·
//      staking rewards · exchange deposit + withdrawal
//   W1 a swap · LP provided · LP staked in a gauge bucket (a position) · LUNA bonded to ampLUNA · ampLUNA queued for unbond then paid out ·
//      a token nobody prices
//   W2 IBC in / out · ampLUNA from another member · Solid collateral, a borrow, a liquidation (collateral taken, debt repaid)
//   W3 / W4 exchange users (the heuristic needs ≥ EXCH_MIN wallets both ways) · W5 LP into the amp compounder 3× (rate from deposit txs
//      AND compounder state — they agree) · a checkpoint that disagrees once (re-anchored, not carried)
// Run: node mock-derive.mjs   (needs cosmjs-types — npm i cosmjs-types@0.9.0)
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import http from 'http'; import os from 'os'; import { execFile } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-derive-')); const ARC = path.join(root, 'archive'); const CORE = path.join(root, 'core'); const PUB = path.join(root, 'pub');
const wr = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof o === 'string' ? o : JSON.stringify(o)); };
const gz = (p, rows) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, zlib.gzipSync(rows.map(r => JSON.stringify(r)).join('\n') + '\n')); };
const CH = '023456789acdefghjklmnpqrstuvwxyz'; const addr = (seed, len) => { const h = require('crypto').createHash('sha256').update('mockd' + seed).digest(); return 'terra1' + Array.from({ length: len }, (_, i) => CH[(h[i % 32] ^ (i >> 5)) & 31]).join(''); };
const [W0, W1, W2, W3, W4, W5] = [1, 2, 3, 4, 5, 6].map(s => addr(s, 38)); const wallets = [W0, W1, W2, W3, W4, W5];
const EXCH = addr(50, 38), EXT = addr(51, 38), EXT2 = addr(52, 38);
const PAIR = addr(101, 58), LP = addr(102, 58), FACT = addr(103, 58), BUCKET = addr(104, 58), TOKZ = addr(105, 58);
const ROAR = 'terra1lxx40s29qvkrcj8fsa3yzyehy7w50umdvvnls2r830rys6lu2zns63eelv', AMPL = 'terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct', HUB = 'terra10788fkzah89xrdm27zkj5yvhj9x3494lxawzm5qq3vvxcqz2yzaqyd3enk';
const COMP = 'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx', AMPD = `factory/${COMP}/1/stable/amplp`;
const CUST = 'terra18uxq2k6wpsqythpakz5n6ljnuzyehrt775zkdclrtdtv6da63gmskqn7dq', MARKET = 'terra1h4cknjl5k0aysdhv0h4eqcaka620g8h69k8h0pjjccxvf9esfhws3cyqnc', SOLIDT = 'terra10aa3zdkrc7jwuf8ekl3zq7e7m42vmzqehcmu74e4egc7xkm5kr2s0muyst';
const DISTR = 'terra1jv65s3grqf6v6jl3dp4t6c9t9rk99cd8pm7utl', BONDED = 'terra1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3nln0mh';
const V1 = 'terravaloper1mockvalidator0000000000000000000000';
// 20 Mondays from 2024-01-01, heights 100,000 apart; contract floor 1,000,000 (week 10)
const weeks = Array.from({ length: 20 }, (_, i) => ({ d: new Date(Date.UTC(2024, 0, 1) + i * 7 * 864e5).toISOString().slice(0, 10), h: 100000 * (i + 1) }));
const blockTime = (h) => Date.parse(weeks[0].d + 'T00:00:00Z') + (h - weeks[0].h) * (7 * 864e5 / 100000);
wr(`${ARC}/layer2/heights.json`, { rows: Object.fromEntries(weeks.map((w, i) => [w.d, { h: w.h, epoch: 62 + i, src: 'mock' }])) });
wr(`${ARC}/cohort/current.json`, { cut_day: '2024-05-13', wallets: Object.fromEntries(wallets.map(w => [w, ['adao']])) });
let hash = 0; const ev = (t, o) => ({ t, a: Object.entries(o) });
const tx = (h, e, m = [], fee = null) => ({ h, x: 'H' + (++hash).toString(16).padStart(8, '0'), i: 0, c: 0, e, m: m.length ? m : [{ type: '/cosmwasm.wasm.v1.MsgExecuteContract', value: {} }], f: { amount: fee ? [fee] : [] } });
const send = (from, to, amt, denom = 'uluna') => [ev('coin_spent', { spender: from, amount: amt + denom }), ev('coin_received', { receiver: to, amount: amt + denom }), ev('transfer', { recipient: to, sender: from, amount: amt + denom })];
const cw = (tok, action, o) => ev('wasm', { _contract_address: tok, action, ...o });
const L1 = Object.fromEntries(wallets.map(w => [w, []])); const put = (t, ...ws) => { for (const w of ws) L1[w].push(t); };
// the IBC escrow for transfer/channel-1 (ADR-028) — the derive must recognise it as a bridge
const b32 = (() => { const crypto = require('crypto'); return (bytes) => { const C = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'; const data = []; let acc = 0, bits = 0; for (const b of bytes) { acc = ((acc << 8) | b) & 0xffff; bits += 8; while (bits >= 5) { bits -= 5; data.push((acc >> bits) & 31); } } if (bits) data.push((acc << (5 - bits)) & 31);
  const G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]; const poly = (v) => { let c = 1; for (const x of v) { const t = c >>> 25; c = (((c & 0x1ffffff) << 5) ^ x) >>> 0; for (let i = 0; i < 5; i++) if ((t >>> i) & 1) c = (c ^ G[i]) >>> 0; } return c; };
  const hrp = 'terra'; const hx = [...hrp].map(c => c.charCodeAt(0) >> 5).concat([0], [...hrp].map(c => c.charCodeAt(0) & 31)); const p = (poly([...hx, ...data, 0, 0, 0, 0, 0, 0]) ^ 1) >>> 0; return hrp + '1' + [...data, ...Array.from({ length: 6 }, (_, i) => (p >>> (5 * (5 - i))) & 31)].map(x => C[x]).join(''); }; })();
const ESC = b32(require('crypto').createHash('sha256').update(Buffer.concat([Buffer.from('ics20-1'), Buffer.from([0]), Buffer.from('transfer/channel-1')])).digest().subarray(0, 20));
// ── W0: genesis 20 LUNA (no event) · exchange in 5 · delegate 10 · undelegate 4 (paid at end-block) + 0.3 rewards · exchange out 2
put(tx(150000, send(EXCH, W0, 5000000)), W0);
put(tx(250000, [ev('coin_spent', { spender: W0, amount: '1000uluna' }), ...send(W0, BONDED, 10000000), ev('delegate', { validator: V1, amount: '10000000uluna' })], [{ type: '/cosmos.staking.v1beta1.MsgDelegate', value: { delegatorAddress: W0, validatorAddress: V1, amount: { denom: 'uluna', amount: '10000000' } } }], '1000uluna'), W0);
put(tx(420000, [ev('coin_spent', { spender: W0, amount: '1000uluna' }), ...send(DISTR, W0, 300000), ev('unbond', { validator: V1, amount: '4000000uluna', completion_time: new Date(blockTime(720000)).toISOString() })], [{ type: '/cosmos.staking.v1beta1.MsgUndelegate', value: { delegatorAddress: W0, validatorAddress: V1, amount: { denom: 'uluna', amount: '4000000' } } }], '1000uluna'), W0);
put(tx(1150000, [ev('coin_spent', { spender: W0, amount: '1000uluna' }), ...send(W0, EXCH, 2000000)], [], '1000uluna'), W0);
// ── W1: 100 LUNA from outside · swap 20 LUNA → 1800 ROAR · provide 10 LUNA + 900 ROAR → 10,000 LP · stake 6,000 LP · bond 12 LUNA → 10 ampLUNA · queue 5 ampLUNA · paid 6 LUNA · 1,000 TOKZ (unpriced)
put(tx(150000, send(EXT, W1, 100000000)), W1);
put(tx(160000, [...send(W1, PAIR, 20000000), cw(PAIR, 'swap', {}), cw(ROAR, 'transfer', { from: PAIR, to: W1, amount: '1800000000' })]), W1);
put(tx(1050000, [...send(W1, PAIR, 10000000), cw(ROAR, 'transfer_from', { from: W1, to: PAIR, amount: '900000000' }), cw(PAIR, 'provide_liquidity', {}), cw(LP, 'mint', { to: W1, amount: '10000' })]), W1);
put(tx(1100000, [cw(TOKZ, 'transfer', { from: EXT, to: W1, amount: '1000000000' })]), W1);
put(tx(1250000, [cw(LP, 'send', { from: W1, to: BUCKET, amount: '6000' }), cw(BUCKET, 'stake', {})]), W1);
put(tx(1350000, [...send(W1, HUB, 12000000), cw(HUB, 'erishub/bond', {}), cw(AMPL, 'mint', { to: W1, amount: '10000000' })]), W1);
put(tx(1450000, [cw(AMPL, 'send', { from: W1, to: HUB, amount: '5000000' }), cw(HUB, 'erishub/queue_unbond', {})]), W1);
put(tx(1750000, [...send(HUB, W1, 6000000), cw(HUB, 'erishub/withdraw_unbonded', {})]), W1);
// ── W2: IBC in 50 · 20 ampLUNA from W3 · 20 ampLUNA collateral · borrow 5 SOLID · liquidated (8 ampLUNA taken, 3 SOLID repaid) · IBC out 10
put(tx(150000, [ev('recv_packet', { packet_src_channel: 'channel-1' }), ...send(ESC, W2, 50000000)]), W2);
put(tx(1100000, [cw(AMPL, 'transfer', { from: W3, to: W2, amount: '20000000' })]), W2, W3);
put(tx(1200000, [cw(AMPL, 'send', { from: W2, to: CUST, amount: '20000000' }), cw(CUST, 'deposit_collateral', { borrower: W2, amount: '20000000' })]), W2);
put(tx(1210000, [cw(MARKET, 'borrow_stable', { borrower: W2, borrow_amount: '5000000' }), cw(SOLIDT, 'mint', { to: W2, amount: '5000000' })]), W2);
put(tx(1600000, [cw(CUST, 'liquidate_collateral', { liquidator: EXT2, borrower: W2, amount: '8000000' }), cw(MARKET, 'repay_stable', { borrower: W2, repay_amount: '3000000' })]), W2);
put(tx(1700000, [ev('send_packet', { packet_src_channel: 'channel-1' }), ...send(W2, ESC, 10000000)], [{ type: '/ibc.applications.transfer.v1.MsgTransfer', value: { sender: W2 } }]), W2);
// ── W3: 40 from the exchange · 1 back · bond 30 → 25 ampLUNA (sends 20 to W2 above)
put(tx(900000, send(EXCH, W3, 40000000)), W3);
put(tx(950000, send(W3, EXCH, 1000000)), W3);
put(tx(1060000, [...send(W3, HUB, 30000000), cw(HUB, 'erishub/bond', {}), cw(AMPL, 'mint', { to: W3, amount: '25000000' })]), W3);
// 2.1.1: a delegation as SDK 0.47 emits it — the fee is a transfer to the fee collector, the delegation itself only coin_spent (no transfer event)
const FEEC = 'terra17xpfvakm2amg962yls6f84z3kell8c5lkaeqfa';
put(tx(1500000, [ev('coin_spent', { spender: W3, amount: '1000uluna' }), ev('coin_received', { receiver: FEEC, amount: '1000uluna' }), ev('transfer', { recipient: FEEC, sender: W3, amount: '1000uluna' }), ev('coin_spent', { spender: W3, amount: '5000000uluna' }), ev('coin_received', { receiver: BONDED, amount: '5000000uluna' }), ev('delegate', { validator: V1, amount: '5000000uluna', delegator: W3 })], [{ type: '/cosmos.staking.v1beta1.MsgDelegate', value: { delegatorAddress: W3, validatorAddress: V1, amount: { denom: 'uluna', amount: '5000000' } } }], '1000uluna'), W3);
// ── W4: 3 from the exchange · 1 back
put(tx(300000, send(EXCH, W4, 3000000)), W4);
put(tx(1300000, send(W4, EXCH, 1000000)), W4);
// ── 2.1.1 plants: W4 receives 1e10 ROAR (a real-looking chain amount worth $100M at the series price — above the $25M floor and 100× the pool) →
//    under review, never valued; W5 receives a reward stream from a contract (one-way IN only) → no 'other protocol' position
const REWARDER = addr(106, 58);
put(tx(1900000, [cw(ROAR, 'transfer', { from: EXT2, to: W4, amount: '10000000000000000' })]), W4);
put(tx(1700000, [cw(ROAR, 'transfer', { from: REWARDER, to: W5, amount: '50000000' }), cw(REWARDER, 'claim', {})]), W5);
// ── W5: 10 LUNA · 6,000 LP from outside · 3 compounder deposits (2,000 LP → 1,000 amp each)
put(tx(150000, send(EXT, W5, 10000000)), W5);
put(tx(1200000, [cw(LP, 'transfer', { from: EXT, to: W5, amount: '6000' })]), W5);
for (const h of [1250000, 1450000, 1650000]) put(tx(h, [cw(LP, 'send', { from: W5, to: COMP, amount: '2000' }), cw(COMP, 'deposit', {}), ev('tf_mint', { mint_to_address: W5, amount: '1000' + AMPD }), ev('coin_received', { receiver: W5, amount: '1000' + AMPD }), ev('transfer', { recipient: W5, sender: COMP, amount: '1000' + AMPD })]), W5);
// ── 2.1.2 plant: W3 receives 1,000 WHALE + 100 bWHALE after the last checkpoint. WHALE has NO series; a WHALE/LUNA pool (2,000 LUNA + 100,000 WHALE →
//    $0.01) and a deeper WHALE/bWHALE pool (1,000,000 WHALE + 100,000 bWHALE — an LST ↔ base pair, its reserve ratio is not a price)
const WHALE = 'ibc/36A02FFC4E74DF4F64305130C3DFA1B06BEAC775648927AA44467C76A77AB8DB', BWHALE = 'ibc/' + 'B'.repeat(64), PW = addr(107, 58), PB = addr(108, 58);
put(tx(1950000, [...send(EXT, W3, 1000000000, WHALE), ...send(EXT, W3, 100000000, BWHALE)]), W3);
for (const w of wallets) gz(`${ARC}/layer1/${w.slice(-1)}/${w}/part-000.jsonl.gz`, L1[w]);
wr(`${ARC}/layer1/_manifest.json`, { wallets: Object.fromEntries(wallets.map(w => [w, { done: true, txs: L1[w].length }])) });
// inventory (code ids + creators) · known contracts · protocol labels
const ci = (code, extra = {}) => ({ code_id: code, txs: 5, wallets: 2, first_h: 100000, last_h: 1900000, ...extra });
wr(`${ARC}/inventory/2024-05-13.json`, { contracts: { [PAIR]: ci('392', { creator: FACT }), [LP]: ci('69', { creator: PAIR }), [BUCKET]: ci('4033'), [ROAR]: ci('1317'), [TOKZ]: ci('1317'), [AMPL]: ci('12'), [HUB]: ci('1257'), [COMP]: ci('3778'), [CUST]: ci('1231'), [MARKET]: ci('2413'), [SOLIDT]: ci('1220') } });
wr(`${PUB}/tla-core/main/docs/curated/known_contracts.json`, { contracts: { [HUB]: { type: 'staking', protocol: 'Eris', name: 'Eris ampLUNA Hub' } } });
wr(`${CORE}/protocol-labels.json`, { by_code_id: {} });
// layer 2: the pair weekly from the contract floor (20,000 LUNA + 1.8M ROAR; 20M LP raw — $0.0014 per raw LP; ROAR implied $0.0056 vs the series' $0.01) · layer 2b: compounder rates (2 LP per amp)
const p2 = weeks.filter(w => w.h >= 1000000).map(w => ({ d: w.d, h: w.h, data: { assets: [['uluna', '20000000000'], [ROAR, '1800000000000']], total_share: '20000000' } }));
gz(`${ARC}/layer2/392/${PAIR}.jsonl.gz`, p2);
const pw = p2.map(r => ({ ...r, data: { assets: [['uluna', '2000000000'], [WHALE, '100000000000']], total_share: '1' } })), pb = p2.map(r => ({ ...r, data: { assets: [[WHALE, '1000000000000'], [BWHALE, '100000000000']], total_share: '1' } }));
gz(`${ARC}/layer2/392/${PW}.jsonl.gz`, pw); gz(`${ARC}/layer2/392/${PB}.jsonl.gz`, pb);
wr(`${ARC}/layer2/_manifest.json`, { targets: Object.fromEntries([PAIR, PW, PB].map(a => [`392/${a}`, { kind: 'pair', done: Object.fromEntries(p2.map(r => [r.d, 1])) }])), state_floor: { contract_reads_from: 1000000 } });
gz(`${ARC}/layer2b/tla/compounder_exchange_rates.jsonl.gz`, weeks.filter(w => w.h >= 1000000).map(w => ({ d: w.d, h: w.h, data: [['stable', { token: { contract_addr: LP } }, { exchange_rate: '2.0', apr: '0.1' }]] })));
// layer 3: monthly checkpoints from February (the bank floor) — bank, delegations, unbonding
const months = []; { const seen = new Set(); for (const w of weeks) { const m = w.d.slice(0, 7); if (!seen.has(m)) { seen.add(m); months.push(w); } } }
const cp = (w, bankAt, delAt = () => [], unbAt = () => []) => { const rows = months.filter(m => m.h >= 500000).map(m => ({ d: m.d, h: m.h, bank: bankAt(m.h).filter(b => b[1] !== '0'), delegations: delAt(m.h), unbonding: unbAt(m.h) })); gz(`${ARC}/layer3/${w.slice(-1)}/${w}.jsonl.gz`, rows); };
const step = (pts) => (h) => { let v = 0; for (const [hh, x] of pts) if (h >= hh) v = x; return v; };
cp(W0, (h) => [['uluna', String(step([[0, 20000000], [150000, 25000000], [250000, 14999000], [420000, 15298000], [720000, 19298000], [1150000, 17297000]])(h))]], () => [[V1, '6000000']], (h) => h >= 420000 && h < 720000 ? [[V1, [['4000000', new Date(blockTime(720000)).toISOString()]]]] : []);
cp(W1, (h) => [['uluna', String(step([[150000, 100000000], [160000, 80000000], [1050000, 70000000], [1350000, 58000000], [1750000, 64000000]])(h))]]);
cp(W2, (h) => [['uluna', String(h >= 1700000 ? 40000000 : 50000000)]]);
cp(W3, (h) => [['uluna', String(step([[900000, 40000000], [950000, 39000000], [1060000, 9000000], [1500000, 3999000]])(h))]], (h) => h >= 1500000 ? [[V1, '5000000']] : []);
cp(W4, (h) => [['uluna', String(step([[300000, 3000000], [1300000, 2000000]])(h))]]);
cp(W5, (h) => [['uluna', String(h >= 1300000 && h < 1500000 ? 9000000 : 10000000)]], () => null);   // the April checkpoint is 1 LUNA short (unexplained) — May is back to 10
// measured LST rates (public) — ampLUNA 1.2 every day
const days = {}; for (let t = Date.parse('2023-12-01'); t <= Date.parse('2024-06-30'); t += 864e5) days[new Date(t).toISOString().slice(0, 10)] = [1.2, 'H'];
wr(`${CORE}/chain-ratios/ampLUNA.json`, { symbol: 'ampLUNA', daily: days }); wr(`${CORE}/chain-ratios/bWHALE.json`, { symbol: 'bWHALE', daily: Object.fromEntries(Object.keys(days).map(d => [d, [1.5, 'P']])) }); wr(`${CORE}/chain-ratios/index.json`, { series: {} });
// public files: denom rule, token catalog, price series (LUNA $0.5, ROAR $0.01 every day)
const dsSrc = process.env.DENOM_SYMBOL_JS ? fs.readFileSync(process.env.DENOM_SYMBOL_JS, 'utf8') : await (await fetch('https://raw.githubusercontent.com/thealliancedao/platform-crons/main/lib/denom-symbol.js')).text();
wr(`${PUB}/platform-crons/main/lib/denom-symbol.js`, dsSrc);
wr(`${PUB}/tla-core/main/token-catalog/snapshots/current.json`, { tokens: [{ denom: ROAR, effective: { symbol: 'ROAR', decimals: 6 } }, { denom: AMPL, effective: { symbol: 'ampLUNA', decimals: 6 } }, { denom: SOLIDT, effective: { symbol: 'SOLID', decimals: 6 } }, { denom: WHALE, effective: { symbol: 'WHALE', decimals: 6 } }, { denom: BWHALE, effective: { symbol: 'bWHALE', decimals: 6 } }] });
const series = (p) => ({ daily: Object.fromEntries(Object.keys(days).map(d => [d, p])) });
wr(`${PUB}/tla-core/main/price-history/series/LUNA.json`, series(0.5)); wr(`${PUB}/tla-core/main/price-history/series/ROAR.json`, series(0.01));
const server = http.createServer((req, res) => { const u = new URL(req.url, 'http://x'); const f = path.join(PUB, decodeURIComponent(u.pathname)); res.setHeader('content-type', 'application/json'); if (fs.existsSync(f) && fs.statSync(f).isFile()) return res.end(fs.readFileSync(f)); res.statusCode = 404; res.end('{}'); });
await new Promise(r => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}`;
const env = { ...process.env, ARCHIVE_DIR: ARC, CORE_OUT: CORE, NO_PUSH: '1', RAW_BASE: base, RUNNER_TEMP: root, FLOW_KEY: 'mock-secret', EXCH_MIN_WALLETS: '3', MODE: 'derive' }; delete env.ARCHIVE_RPC; delete env.RPC_URL;
const run = () => new Promise((ok, bad) => execFile('node', [path.join(here, 'walk.mjs')], { env, cwd: root, maxBuffer: 1 << 24 }, (e, so, se) => e ? bad(new Error((se || '') + (so || ''))) : ok(so)));
let fails = 0; const check = (name, cond, got) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' — got ' + JSON.stringify(got).slice(0, 400)}`); if (!cond) fails++; };
const near = (a, b, tol = 0.011) => Math.abs(a - b) <= tol; const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const H = (w) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ARC, 'derived/history', w.slice(-1), w + '.json.gz'))).toString());
const wi = (h) => weeks.findIndex(x => x.h >= h); const last = weeks.length - 1;
try {
  const log = await run(); console.log(log.split('\n').filter(l => /^derive/.test(l)).join('\n'));
  const a = H(W0), b = H(W1), c = H(W2), f = H(W5); const L = a.tokens.uluna;
  check('D1 the derive ran with no node (no ARCHIVE_RPC) and wrote every wallet', /derive: DONE/.test(log) && wallets.every(w => fs.existsSync(path.join(ARC, 'derived/history', w.slice(-1), w + '.json.gz'))), log.slice(-400));
  check(`D2 W0 opening balance (genesis, no event) carried back from the first checkpoint: weeks before it "G" (${L.src.slice(0, 7)}), the first week holds 20 LUNA; every later checkpoint exact (${JSON.stringify(a.checks.bank)})`, L.src.slice(0, 6) === 'GGGGGC' && L.bal[0] === '20000000' && a.checks.bank.compared === 3 && a.checks.bank.exact === 3, { src: L.src, b0: L.bal[0], chk: a.checks.bank });
  check(`D3 W0 the undelegation is paid at its completion time with no tx: in flight 4 LUNA (weeks ${wi(420000)}–${wi(720000) - 1}), in the bank from week ${wi(720000)}; layer-3 unbonding agrees (${JSON.stringify(a.checks.unbonding)})`, a.staking.unbonding[wi(420000)] === '4000000' && a.staking.unbonding[wi(720000)] === '0' && L.bal[wi(720000)] === '19298000' && L.bal[wi(720000) - 1] === '15298000' && a.checks.unbonding.compared === 4 && a.checks.unbonding.exact === 4, { unb: a.staking.unbonding, bal: L.bal });
  check('D4 W0 delegations from the messages: 10 LUNA, then 6; anchored on the readable checkpoints (C)', a.staking.delegated[wi(250000)] === '10000000' && a.staking.delegated[wi(500000)] === '6000000' && a.staking.src[wi(600000)] === 'C' && a.checks.delegations.exact >= 2, a.staking);
  const fl = a.flows_usd; const rawA = JSON.stringify(a);
  check(`D5 W0 exchange flows are summaries with a keyed id only (no hash, no address); net deposits = +$2.5 − $1 = ${a.net_deposits_usd[last]}; rewards and staking are not deposits`, a.exchange.length === 2 && a.exchange.every(r => /^[0-9a-f]{20}$/.test(r.k) && !('x' in r) && r.token === 'LUNA') && !rawA.includes(EXCH) && !/"H0000/.test(rawA) && near(a.net_deposits_usd[last], 1.5) && fl.reward && near(fl.reward.in[wi(420000)], 0.15) && fl.staking && fl.fee, { ex: a.exchange, nd: a.net_deposits_usd[last], fl: Object.keys(fl) });
  check(`D6 W0 value now = 17.297 LUNA in the wallet + 6 staked at $0.5 = $${a.value_usd[last]}`, near(a.value_usd[last], 11.65), a.parts);
  const lpT = b.tokens['cw20:' + LP], am = b.tokens['cw20:' + AMPL], pos = Object.values(b.positions).find(p => p.kind === 'escrow');
  check(`D7 W1 LP priced from the pool's reserves that week (4,000 LP = $${lpT && lpT.usd[last]}); 6,000 staked in the bucket is a position ($${pos && pos.usd[last]}); ampLUNA = 5 × measured 1.2 × $0.5 = $${am && am.usd[last]}`, lpT && near(lpT.usd[last], 5.6) && pos && near(pos.usd[last], 8.4) && am && near(am.usd[last], 3.0), { lpT: lpT && lpT.usd.slice(-3), pos, am: am && am.usd.slice(-2) });
  check(`D8 W1 the unbond queue holds 6 LUNA ($3) between the queue and the payout, then 0; the bond itself is not a position; value now $${b.value_usd[last]} (= 64 LUNA 32 + 900 ROAR 9 + LP 5.6 + ampLUNA 3 + staked LP 8.4)`, near(b.parts.lst_unbonding[wi(1500000)], 3) && b.parts.lst_unbonding[last] === 0 && near(b.value_usd[last], 58.0) && Object.values(b.positions).every(p => p.kind !== 'other'), { q: b.parts.lst_unbonding, v: b.value_usd[last], pos: Object.keys(b.positions) });
  check(`D9 W1 a token with no catalog entry and no pool anywhere is "no market" — counted apart, never valued, never makes the week "not fully priced"`, b.no_market_holdings[last] === 1 && b.unpriced_holdings[last] === 0 && b.checks.unpriced_flows === 0 && b.tokens['cw20:' + TOKZ].usd[last] === null, { u: b.unpriced_holdings.slice(-2), nm: b.no_market_holdings.slice(-2), f: b.checks.unpriced_flows });
  const cpos = Object.values(c.positions).find(p => p.kind === 'escrow');
  check(`D10 W2 Solid: collateral 20 → 12 ampLUNA after the liquidation ($${cpos && cpos.usd[last]}), debt 5 → 2 SOLID (−$${c.parts.solid_debt[last]}); value $${c.value_usd[last]} (= 40 LUNA 20 + 5 SOLID 5 + 7.2 − 2)`, cpos && cpos.units[last] === '12000000' && near(cpos.usd[last], 7.2) && c.solid_debt[last] === '2000000' && near(c.parts.solid_debt[last], 2) && near(c.value_usd[last], 30.2), { cpos, debt: c.solid_debt.slice(-3), v: c.value_usd[last] });
  check(`D11 W2 IBC in / out classed bridge (via the channel escrow), the member transfer member, the SOLID minted debt; net deposits = 25 + 12 − 5 = ${c.net_deposits_usd[last]}`, c.flows_usd.bridge && near(c.flows_usd.bridge.in[wi(150000)], 25) && near(c.flows_usd.bridge.out[wi(1700000)], 5) && c.flows_usd.member && c.flows_usd.debt && near(c.net_deposits_usd[last], 32) && c.received.some(r => r.class === 'member' && r.token === 'ampLUNA'), { cls: Object.keys(c.flows_usd), nd: c.net_deposits_usd[last] });
  const amp = f.tokens[AMPD];
  check(`D12 W5 amp receipts: 3,000 amp × 2 LP (compounder state, trusted because deposit txs agree) × the LP price = $${amp && amp.usd[last]}`, amp && amp.bal[last] === '3000' && near(amp.usd[last], 8.4), amp);
  check(`D13 W5 a checkpoint 1 LUNA short: that month and the month it comes back are counted off, each re-anchored (the error never carries) (${JSON.stringify(f.checks.bank)}); unreadable delegations do not break anything`, f.checks.bank.compared === 3 && f.checks.bank.off === 2 && f.checks.bank.exact === 1 && f.tokens.uluna.bal[wi(1400000)] === '9000000' && f.tokens.uluna.bal[last] === '10000000', { chk: f.checks.bank, bal: f.tokens.uluna.bal });
  const X = JSON.parse(fs.readFileSync(path.join(ARC, 'derived/exchanges.json'), 'utf8')); const pub = fs.readFileSync(path.join(CORE, 'derive.json'), 'utf8') + fs.readFileSync(path.join(CORE, 'price-check.json'), 'utf8');
  check(`D14 the exchange heuristic finds the one address 3 wallets used both ways (not the outside sender); the public files name no wallet and no exchange address`, X.heuristic.length === 1 && X.heuristic[0].address === EXCH && !wallets.some(w => pub.includes(w)) && !pub.includes(EXCH) && !pub.includes(EXT), { X, leak: wallets.filter(w => pub.includes(w)).length });
  const PC = JSON.parse(fs.readFileSync(path.join(CORE, 'price-check.json'), 'utf8')); const D = JSON.parse(fs.readFileSync(path.join(CORE, 'derive.json'), 'utf8'));
  check(`D15 the price check compares ROAR's series with its pool (${PC.symbols.ROAR && PC.symbols.ROAR.median_pct} % apart) — one pool never overrules the series`, PC.symbols.ROAR && PC.symbols.ROAR.weeks_compared > 0 && PC.symbols.ROAR.weeks_replaced_by_pools === 0 && near(PC.symbols.ROAR.median_pct, 44.44, 0.1), PC.symbols);
  check(`D16 public summary: ${D.wallets} wallets, checkpoints counted, coverage and sources reported`, D.wallets === 6 && D.checkpoint_checks.bank.compared > 0 && D.coverage.wallet_weeks > 0 && D.price_sources.lst > 0 && D.exchanges.heuristic === 1, D);
  { const e = H(W4), g = H(W5); const D2 = JSON.parse(fs.readFileSync(path.join(CORE, 'derive.json'), 'utf8'));
    check(`D19 an implausible amount (1e10 ROAR = $100M vs a pool holding ~$28K) is UNDER REVIEW — not in the wallet value ($${e.value_usd[last]} = 2 LUNA), not in net deposits ($${e.net_deposits_usd[last]}), listed with why`, near(e.value_usd[last], 1.0) && near(e.net_deposits_usd[last], 1.0) && e.under_review && e.under_review.some(r => r.token === 'ROAR' && /under review/.test(r.why)) && D2.under_review.flows >= 1 && D2.under_review.holdings_weeks >= 1, { v: e.value_usd[last], nd: e.net_deposits_usd[last], ur: e.under_review, pub: D2.under_review });
    check('D20 a reward stream out of a contract (in only, never deposited) is not an "other protocol" position', !Object.values(g.positions).some(p => p.kind === 'other'), Object.values(g.positions).map(p => p.kind)); }
  { const k = H(W3); const fee = k.flows_usd.fee, stk = k.flows_usd.staking;
    check(`D21 a delegation with no transfer event is STAKING, not a fee (fee $${fee && (sum(fee.out)).toFixed(4)}, staking out $${stk && sum(stk.out).toFixed(2)}); delegated 5 LUNA`, fee && near(sum(fee.out), 0.0005, 1e-6) && stk && near(sum(stk.out), 2.5) && k.staking.delegated[last] === '5000000' && k.checks.bank.off === 0, { fee, stk, del: k.staking.delegated.slice(-2), bank: k.checks.bank }); }
  { const k = H(W3); const wh = k.tokens[WHALE], bw = k.tokens[BWHALE];
    check(`D22 bWHALE with no WHALE series: 100 × measured 1.5 × WHALE from its LUNA pool ($0.01) = $${bw && bw.usd[last]}; WHALE itself $${wh && wh.usd[last]} — the deeper WHALE ↔ bWHALE pool is not a price (it would read $1.50)`, bw && near(bw.usd[last], 1.5) && wh && near(wh.usd[last], 10), { wh: wh && wh.usd.slice(-2), bw: bw && bw.usd.slice(-2) });
    const D3 = JSON.parse(fs.readFileSync(path.join(CORE, 'derive.json'), 'utf8'));
    check(`D23 the source is labelled (lst(base-pool) ${D3.price_sources['lst(base-pool)']}); an unpriced holding is null in the wallet file, never $0`, D3.price_sources['lst(base-pool)'] > 0 && b.tokens['cw20:' + TOKZ].usd.every(x => x === null || x === 0) && b.tokens['cw20:' + TOKZ].usd[last] === null, D3.price_sources); }
  // the guard: plant a wallet in the price check (a token symbol) → nothing public is written
  fs.rmSync(path.join(CORE, 'derive.json')); fs.rmSync(path.join(CORE, 'price-check.json'));
  const cat = JSON.parse(fs.readFileSync(`${PUB}/tla-core/main/token-catalog/snapshots/current.json`, 'utf8')); cat.tokens[0].effective.symbol = W4; wr(`${PUB}/tla-core/main/token-catalog/snapshots/current.json`, cat); wr(`${PUB}/tla-core/main/price-history/series/${W4}.json`, series(0.01));
  let blocked = false; try { await run(); } catch (e) { blocked = /NOT written/.test(e.message); }
  check('D17 the guard refuses to publish a summary that would name a cohort wallet', blocked && !fs.existsSync(path.join(CORE, 'derive.json')), blocked);
  cat.tokens[0].effective.symbol = 'ROAR'; wr(`${PUB}/tla-core/main/token-catalog/snapshots/current.json`, cat);
  await run(); const a2 = H(W0), b2 = H(W1);
  check('D18 a second run gives the same numbers (deterministic)', JSON.stringify(a2.value_usd) === JSON.stringify(a.value_usd) && JSON.stringify(b2.value_usd) === JSON.stringify(b.value_usd) && JSON.stringify(a2.exchange) === JSON.stringify(a.exchange), null);
} catch (e) { console.log('FAIL  run: ' + e.message.slice(0, 2500)); fails++; }
server.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASS'); process.exit(fails ? 1 : 0);

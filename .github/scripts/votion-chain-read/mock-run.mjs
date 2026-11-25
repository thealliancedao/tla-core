#!/usr/bin/env node
// mock-run for votion-chain-read: the whole run against a made-up node (no network), checked. Usage: node mock-run.mjs
import fs from 'fs'; import os from 'os'; import path from 'path';
import { run, namesIn, addressesIn, keysOf, VAULTS, ALSO, SKIP } from './read.mjs';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
const CFG = 'terra1' + 'c'.repeat(58), BOT = 'terra1' + 'b'.repeat(38), ADMIN = 'terra1' + 'a'.repeat(38);
const seen = []; let down = 0;
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });
async function fakeFetch(url, init) {
  seen.push({ url, method: init.method });
  const u = new URL(url); const p = u.pathname;
  if (u.host === 'node-down.test') { down++; return { ok: false, status: 503, text: async () => 'upstream down' }; }
  let m;
  if ((m = /^\/cosmos\/auth\/v1beta1\/accounts\/(terra1[0-9a-z]+)$/.exec(p))) return reply(200, { account: { '@type': '/cosmos.auth.v1beta1.BaseAccount', address: m[1], pub_key: m[1] === BOT ? { '@type': '/cosmos.crypto.secp256k1.PubKey', key: 'AAAA' } : { '@type': '/cosmos.crypto.multisig.LegacyAminoPubKey', threshold: 2, public_keys: [{}, {}, {}] } } });
  if ((m = /^\/cosmwasm\/wasm\/v1\/contract\/(terra1[0-9a-z]+)\/history$/.exec(p))) return reply(200, { entries: [{ operation: 'CONTRACT_CODE_HISTORY_OPERATION_TYPE_INIT', code_id: '3600', updated: { block_height: '100', tx_index: '2' }, msg: { owner: ADMIN } }, { operation: 'CONTRACT_CODE_HISTORY_OPERATION_TYPE_MIGRATE', code_id: '3677', updated: { block_height: '200', tx_index: '0' }, msg: {} }] });
  if ((m = /^\/cosmwasm\/wasm\/v1\/contract\/(terra1[0-9a-z]+)\/smart\/(.+)$/.exec(p))) {
    const q = JSON.parse(Buffer.from(decodeURIComponent(m[2]), 'base64').toString('utf8')); const name = Object.keys(q)[0];
    if (name === 'zz_which_queries') return reply(400, { code: 2, message: m[1] === CFG ? 'Error parsing into type cfg::QueryMsg: unknown variant `zz_which_queries`, expected `all_addresses` or `address`: query wasm contract failed: invalid request' : 'Error parsing into type vault::QueryMsg: unknown variant `zz_which_queries`, expected one of `config`, `state`, `user_info`, `exchange_rates`, `big`: query wasm contract failed: invalid request', details: [] });
    if (name === 'config') return reply(200, { data: { global_config_addr: CFG, vote_access: { wallet: BOT }, lock: 104 } });
    if (name === 'state') return reply(200, { data: { staked: '5' } });
    if (name === 'all_addresses') return reply(200, { data: [['OPERATOR', BOT]] });
    if (name === 'address') return reply(400, { code: 2, message: 'Error parsing into type cfg::QueryMsg: missing field `0`: query wasm contract failed' });
    if (name === 'big') return reply(200, { data: { rows: 'x'.repeat(20000), n: 1 } });
    return reply(400, { code: 2, message: 'unknown' });
  }
  if ((m = /^\/cosmwasm\/wasm\/v1\/contract\/(terra1[0-9a-z]+)$/.exec(p))) return reply(200, { contract_info: { code_id: '3677', creator: ADMIN, admin: ADMIN, label: 'x', created: { block_height: '100', tx_index: '2' } } });
  return reply(404, { code: 5, message: 'not found' });
}
const core = fs.mkdtempSync(path.join(os.tmpdir(), 'vcr-'));
const logs = [];
const { doc, stats } = await run({ core, noPush: true, _unpaced: true, fetch: fakeFetch, lcds: 'https://node-down.test,https://node-a.test', env: {}, log: (s) => logs.push(s) });
const file = JSON.parse(fs.readFileSync(path.join(core, 'votion/chain/vaults.json'), 'utf8'));
ok(Object.keys(file.vaults).length === VAULTS.length && Object.keys(file.also).length === ALSO.length, 'every vault and both Alliance contracts are in the file');
const v = file.vaults['arbluna-max'];
ok(v.info.code_id === '3677' && v.info.admin === ADMIN && v.info.created_height === '100', 'the contract record is kept');
ok(Array.isArray(v.history) && v.history.length === 2 && v.history[0].operation === 'init' && v.history[1].operation === 'migrate' && v.history[1].height === '200' && v.history[1].code_id === '3677', 'the code history is kept, in the contract\'s own order, with the block of each change');
ok(JSON.stringify(v.queries_listed) === JSON.stringify(['config', 'state', 'user_info', 'exchange_rates', 'big']), 'the queries the contract lists are read from its own answer');
ok(JSON.stringify(v.queries_not_sent) === JSON.stringify(['user_info', 'exchange_rates']) && !('user_info' in v.answers) && !seen.some((s) => /smart/.test(s.url) && /user_info|exchange_rates/.test(Buffer.from(decodeURIComponent(s.url.split('/smart/')[1] || ''), 'base64').toString('utf8'))), 'a query that would list depositors or a long series is never sent');
ok(v.answers.config.answer.vote_access.wallet === BOT && v.answers.state.answer.staked === '5', 'config and state are kept as the contract returned them');
ok(v.answers.big.too_long > 12000 && !v.answers.big.answer && v.answers.big.top_level.includes('rows'), 'a long answer is kept as its length and its top-level keys, not in full');
ok(file.pointed_to[CFG] && file.pointed_to[CFG].answers.all_addresses.answer[0][0] === 'OPERATOR' && /refused|missing field/.test(JSON.stringify(file.pointed_to[CFG].answers.address)), 'the settings contract a vault names is followed one step; a query that needs an argument is filed as refused');
ok(Object.keys(file.pointed_to).length === 1, 'a contract named by several vaults is followed once');
ok(file.accounts[BOT] && file.accounts[BOT].keys === 1 && file.accounts[ADMIN] && file.accounts[ADMIN].keys === 3 && file.accounts[ADMIN].threshold === 2 && !JSON.stringify(file.accounts).includes('AAAA'), 'accounts: how many keys, never the keys');
ok(seen.every((s) => s.method === 'GET'), 'only GET requests are sent');
ok(!seen.some((s) => /simulate|broadcast|\/txs/.test(s.url)), 'nothing is simulated or broadcast');
ok(down > 0 && stats.failed === 0, 'a node that is down is skipped for the next one');
ok(file.requests.sent === stats.requests && file.requests.sent <= file.requests.limit, 'the request count is on the file and within the limit');
ok(JSON.stringify(namesIn('unknown variant `q`, expected `a`: query wasm contract failed: `zzz`', 'q')) === '["a"]' && namesIn('some other error', 'q') === null, 'names: one name; none when the contract does not list them; nothing read past the contract\'s own sentence');
ok(addressesIn({ a: { b: [BOT, CFG, 'terra1short'] } }).length === 2 && keysOf({ account: { '@type': 'x.BaseAccount', pub_key: null } }).keys === 0, 'addresses are found under their key; an account that never signed has no key');
ok(['user_info', 'all_stakers', 'balance', 'exchange_rates', 'reward_indexes', 'claimable'].every((n) => SKIP.test(n)) && ['config', 'state', 'all_addresses', 'gauge_infos', 'vote_access'].every((n) => !SKIP.test(n)), 'the skip rule: people and series out, settings in');
let threw = false; try { await run({ core, noPush: true, _unpaced: true, fetch: fakeFetch, lcds: 'https://node-a.test', env: { ARCHIVE_LCD: 'https://x' }, log: () => { } }); } catch (e) { threw = /archive/.test(String(e.message)); }
ok(threw, 'refuses to run when an archive setting is present');
let threw2 = false; try { await run({ core: fs.mkdtempSync(path.join(os.tmpdir(), 'vcr-')), noPush: true, _unpaced: true, fetch: async () => ({ ok: false, status: 503, text: async () => 'down' }), lcds: 'https://node-down.test', env: {}, max: 40, log: () => { } }); } catch (e) { threw2 = /nothing written/.test(String(e.message)); }
ok(threw2, 'writes nothing when no vault could be read');
console.log(`votion-chain-read mock-run: ${pass}/${pass + fail}` + (fail ? ' — FAILED' : ''));
process.exit(fail ? 1 : 0);

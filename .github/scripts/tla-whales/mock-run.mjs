#!/usr/bin/env node
// tla-whales — the script's own check. No network: a small invented Alliance (two pools, five accounts) is served by a fake
// node, and the list the script writes is compared with what that Alliance holds. Run: node mock-run.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import { run, parseStaked, ampToLp, BUCKETS, COMPOUNDER } from './read.mjs';
let pass = 0, fail = 0; const check = (name, ok, extra) => { if (ok) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (extra !== undefined ? ' — ' + JSON.stringify(extra) : '')); } };
const A = (c) => 'terra1' + c.repeat(38), POOL1 = 'cw20:terra1' + 'p'.repeat(58), POOL2 = 'native:factory/terra1' + 'q'.repeat(58) + '/uLP', DEN1 = `factory/${COMPOUNDER}/1/stable/amplp`;
const CONTRACT = 'terra1' + 'k'.repeat(58);

function world(over = {}) {
  const core = fs.mkdtempSync(path.join(os.tmpdir(), 'whales-')); const W = (rel, o) => { const f = path.join(core, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o)); };
  W('member-data/tla-snapshot/current.json', { pools: [{ name: 'AAA-BBB', bucket: 'stable', dex: 'Astroport', status: 'active', gauge_pool_id: POOL1, staked_in_tla_usd: 10000 }, { name: 'CCC-DDD', bucket: 'stable', dex: 'Astroport', status: 'active', gauge_pool_id: POOL2, staked_in_tla_usd: 500 }] });
  W('member-data/participants/current.json', { members: [{ wallet: A('a'), name: 'alice', lp_positions: [] }, { wallet: A('e'), name: null, lp_positions: [{ position_type: 'non_amplified', pool_gauge_id: POOL2 }] }] });
  W('catalog/trusted/current.json', { addresses: [{ address: CONTRACT, label: 'Some DAO treasury', protocol: 'Some DAO', type: 'dao' }] });
  // the flow record: a (stake left: 100 shares — the chain will say 250 LP), b (stake left), c (left the pool: 0), d (only ever held amp)
  const ledger = (pools, epochs) => ({ cumulative_units_at_head: pools, epochs });
  W('tla-flows/pnl/rollup.json', { wallets: [A('a'), A('b'), A('c'), COMPOUNDER].map((address) => ({ address, v3: { as_of_epoch: 213 }, by_pool: { [POOL1]: { deposits: 3, withdraws: 1, claims: 7, claim_usd_at_event: 12.345 } } })) });
  W(`tla-flows/pnl/ledger/${A('a')}.json`, ledger({ [POOL1 + '|shares']: '100', [POOL1 + '|amplp']: '5' }, { 150: { pools: { [POOL1]: { dep: 1, units: { shares: '60' } } } }, 210: { pools: { [POOL1]: { dep: 1, units: { shares: '40' } } } } }));
  W(`tla-flows/pnl/ledger/${A('b')}.json`, ledger({ [POOL1 + '|shares']: '7' }, { 190: { pools: { [POOL1]: { dep: 2, units: { shares: '20' } } } }, 209: { pools: { [POOL1]: { wdr: 1, units: { shares: '-13' } } } } }));
  W(`tla-flows/pnl/ledger/${COMPOUNDER}.json`, ledger({ [POOL1 + '|shares']: '360' }, {}));   // the compounder shows up in the flow record too: it must never be a row
  W(`tla-flows/pnl/ledger/${A('c')}.json`, ledger({ [POOL1 + '|shares']: '0' }, { 120: { pools: { [POOL1]: { dep: 1, wdr: 1, units: { shares: '0' } } } } }));
  // the chain: POOL1 holds 1000 LP — the compounder 400, a 250, b 150, and 200 nobody in the record explains. POOL2 holds 50 — e 50.
  const chain = { totals: [{ asset: { info: { cw20: POOL1.slice(5) }, amount: '1000' }, shares: '900' }, { asset: { info: { native: POOL2.slice(7) }, amount: '50' }, shares: '50' }],
    staked: { [COMPOUNDER]: [{ asset: { info: { cw20: POOL1.slice(5) }, amount: '400' }, shares: '360' }], [A('a')]: [{ asset: { info: { cw20: POOL1.slice(5) }, amount: '250' }, shares: '225' }], [A('b')]: [{ asset: { info: { cw20: POOL1.slice(5) }, amount: '150' }, shares: '135' }], [A('e')]: [{ asset: { info: { native: POOL2.slice(7) }, amount: '50' }, shares: '50' }] },
    rates: [{ gauge: 'stable', asset: { cw20: POOL1.slice(5) }, amplp_denom: DEN1, exchange_rate: '2.5' }],
    // 160 amp tokens × 2.5 = 400 LP: d 80 (page 1), the contract 60 and a 20 (page 2)
    owners: { '': { denom_owners: [{ address: A('d'), balance: { denom: DEN1, amount: '80' } }], pagination: { next_key: 'PAGE2' } }, PAGE2: { denom_owners: [{ address: CONTRACT, balance: { denom: DEN1, amount: '60' } }, { address: A('a'), balance: { denom: DEN1, amount: '20' } }], pagination: { next_key: null } } }, ...over };
  const seen = [];
  const fetchFake = async (url) => { const u = new URL(url); seen.push(u.pathname + u.search); const J = (o, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(o) });
    const m = u.pathname.match(/\/contract\/(terra1[0-9a-z]+)\/smart\/(.+)$/);
    if (m) { const q = JSON.parse(Buffer.from(decodeURIComponent(m[2]), 'base64').toString('utf8'));
      if (q.total_staked_balances) return m[1] === BUCKETS.stable ? J({ data: chain.totals }) : J({ data: [] });
      if (q.all_staked_balances) { const a = q.all_staked_balances.address; if (chain.fail && chain.fail.includes(a)) return J({ message: 'node says no' }, 500); return J({ data: m[1] === BUCKETS.stable ? chain.staked[a] || [] : [] }); }
      if (q.amplp_exchange_rates) return J({ data: chain.rates }); return J({ message: 'unknown query' }, 400); }
    if (u.pathname.startsWith('/cosmos/bank/v1beta1/denom_owners/')) { if (chain.noPathForm) return J({ message: 'Not Implemented' }, 501); return J(chain.owners[u.searchParams.get('pagination.key') || '']); }
    if (u.pathname === '/cosmos/bank/v1beta1/denom_owners_by_query') return J(chain.owners[u.searchParams.get('pagination.key') || '']);
    return J({ message: 'not found' }, 404); };
  return { core, fetchFake, seen };
}
const go = async (over, opts = {}) => { const w = world(over); const r = await run({ core: w.core, fetch: w.fetchFake, lcds: 'https://node.test', env: {}, noPush: true, _unpaced: true, log: () => { }, ...opts }); return { ...w, ...r, file: JSON.parse(fs.readFileSync(path.join(w.core, 'tla-whales/current.json'), 'utf8')) }; };

console.log('— the pieces —');
check('a staking row without an asset or an amount is refused, not guessed', (() => { try { parseStaked([{ asset: { info: {}, amount: '1' } }]); return false; } catch { return true; } })() && (() => { try { parseStaked({}); return false; } catch { return true; } })());
check('amp tokens × the rate, in whole LP units (160 × 2.5 = 400; 3 × 0.333333333333333333 = 0)', ampToLp('160', '2.5') === 400n && ampToLp('3', '0.333333333333333333') === 0n && ampToLp('1000000', '1.000001') === 1000001n && ampToLp('5', 'abc') === null);

console.log('— the list —');
{ const R = await go(); const P = R.file.pools.find((p) => p.key === POOL1), Q = R.file.pools.find((p) => p.key === POOL2); const by = Object.fromEntries(P.holders.map((h) => [h.a, h]));
  check('both pools are listed with the name, bucket and value the snapshot gives; the larger first', R.file.pools.length === 2 && R.file.pools[0].key === POOL1 && P.name === 'AAA-BBB' && P.bucket === 'stable' && P.staked_usd === 10000 && Q.name === 'CCC-DDD');
  check('a direct staker\'s figure is the chain\'s (250 LP), not the flow record\'s (100 shares)', by[A('a')] && by[A('a')].direct_pct === 25, by[A('a')]);
  check('amp holders come from the chain\'s own list, across both pages, × the rate: d 80 → 200 LP (20%), the contract 60 → 150 LP (15%)', by[A('d')].pct === 20 && by[A('d')].amp_pct === 20 && by[CONTRACT].pct === 15 && R.seen.some((s) => /pagination\.key=PAGE2/.test(s)));
  check('an account with both a direct stake and amp tokens is one row: a = 250 + 20 × 2.5 = 300 LP (30%)', by[A('a')].lp === '300' && by[A('a')].pct === 30 && by[A('a')].amp_pct === 5);
  check('highest first: a 30% · d 20% · b 15% · the contract 15% (ties by address)', JSON.stringify(P.holders.map((h) => h.a)) === JSON.stringify([A('a'), A('d'), A('b'), CONTRACT].sort((x, y) => (by[y].pct - by[x].pct) || (x < y ? -1 : 1))) && P.holders[0].a === A('a') && P.holders[1].a === A('d'));
  check('the pool adds up, and says what it cannot explain: 80% attributed, 20% of the direct stake not attributed, 0% of the amp part; 40% of the pool is amplified', P.attributed_pct === 80 && P.not_attributed.direct_pct === 20 && P.not_attributed.amp_pct === 0 && P.amplified_pct === 40 && P.complete === true, [P.attributed_pct, P.not_attributed]);
  check('an account that left the pool (0 in the record) is not asked and not listed; the compounder is never a holder row', !by[A('c')] && !by[COMPOUNDER] && !R.seen.some((s) => s.includes(Buffer.from(JSON.stringify({ all_staked_balances: { address: A('c') } })).toString('base64'))));
  check('a name only where the account registered one, a label only where the catalog verified one; everyone else has neither', by[A('a')].name === 'alice' && by[CONTRACT].label === 'Some DAO treasury' && by[CONTRACT].kind === 'contract' && by[A('d')].name === undefined && by[A('d')].label === undefined && by[A('d')].kind === 'account');
  check('what the flow record knows of each: deposits, withdrawals, claims, since which round, and what it did in the last eight (a adding, b reducing)', by[A('a')].dep === 3 && by[A('a')].clm === 7 && by[A('a')].clm_usd === 12.35 && by[A('a')].since === 150 && by[A('a')].trend === 'adding' && by[A('b')].since === 190 && by[A('b')].trend === 'reducing' && by[A('d')].since === undefined);
  check('the round-by-round changes of the leading accounts are kept for a history line', JSON.stringify(by[A('a')].h) === JSON.stringify([[150, '60', '0'], [210, '40', '0']]) && JSON.stringify(by[A('b')].h) === JSON.stringify([[190, '20', '0'], [209, '-13', '0']]));
  check('an account known only from the lock record is asked too (the second pool: e holds all of it)', Q.holders.length === 1 && Q.holders[0].a === A('e') && Q.holders[0].pct === 100 && Q.attributed_pct === 100);
  check('the file says how it was made and what it counted', /denom_owners/.test(R.file.how.amp) && /not_attributed/.test(R.file.how.check) && R.file.counts.direct_accounts_asked === 3 && R.file.counts.amp_tokens === 1 && R.file.epoch === 213 && R.file.version === 'tla-whales-1.0.0'); }

console.log('— when the chain does not answer —');
{ const R = await go({ fail: [A('b')] }); const P = R.file.pools.find((p) => p.key === POOL1);
  check('a staker that could not be read is never shown as 0: the pool is marked incomplete, with the reason', P.complete === false && /stakers were not read/.test(P.why_incomplete.join(' ')) && !P.holders.some((h) => h.a === A('b')) && R.file.counts.direct_accounts_not_read === 1 && P.not_attributed.direct_pct === 35); }
{ const R = await go({ noPathForm: true }); const P = R.file.pools.find((p) => p.key === POOL1);
  check('a node that lacks the first form of the holders list is asked the second; the list is the same', P.holders.find((h) => h.a === A('d')).pct === 20 && R.seen.some((s) => s.startsWith('/cosmos/bank/v1beta1/denom_owners_by_query')) && P.complete === true); }
{ const R = await go({}, { max: 9 }); const P = R.file.pools.find((p) => p.key === POOL1);
  check('the request ceiling is respected, reported, and what it cut off is marked incomplete — not shown as empty', R.stats.requests <= 9 && R.file.counts.limit_reached === true && P.complete === false, [R.stats.requests, P.complete, P.why_incomplete]); }
{ let refused = false; try { const w = world(); await run({ core: w.core, fetch: w.fetchFake, lcds: 'https://node.test', env: { ARCHIVE_LCD: 'x' }, noPush: true, _unpaced: true, log: () => { } }); } catch (e) { refused = /archive setting/.test(String(e.message)); }
  check('with an archive setting present the script refuses to run', refused); }
{ let threw = false; try { const w = world(); const dead = async () => ({ ok: false, status: 503, text: async () => 'down' }); await run({ core: w.core, fetch: dead, lcds: 'https://node.test', env: {}, noPush: true, _unpaced: true, log: () => { } }); } catch (e) { threw = /nothing written/.test(String(e.message)); }
  check('when no staking contract answers, nothing is written', threw); }

console.log(`\n=== tla-whales mock run: ${pass} passed, ${fail} failed ===`); process.exit(fail ? 1 : 0);

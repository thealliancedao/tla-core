#!/usr/bin/env node
// tla-whales 1.0.0 (2026-11-27) — WHO HOLDS EACH POOL'S LIQUIDITY IN THE LIQUIDITY ALLIANCE, RIGHT NOW.
//
// The owner: "we need a TLA whale list … select an LP and it pulls up all the whales in that LP, highest to lowest … who is
// actually participating — is it all the teams that have most of the liquidity and take most of the rewards?"
//
// A pool's staked liquidity is held in two ways, and the chain can be asked for both:
//   • DIRECT   an account stakes the LP token in the bucket's staking contract. The contract has no "list everyone" query,
//              so the accounts asked are those the public flow record (tla-flows/pnl) shows with stake left in the pool.
//              Each is asked `all_staked_balances {address}` — the figure is the chain's, never the record's.
//   • AMP      an account holds the compounder's amp token for the pool (a bank denom). The chain lists every holder of a
//              denom (`denom_owners`), so this list is complete by construction. Amp tokens × the compounder's own exchange
//              rate = LP tokens.
// The check that keeps it honest: per pool, the staking contract's total = the compounder's own stake + every direct
// staker. What the accounts found do not explain is published as "not attributed" — never spread over the others.
//
// Read-only: GET requests to public nodes. Nothing is simulated, signed or sent. No archive node, no secret — the script
// refuses to run when an archive setting is present. One request at a time, at most 2 a second, at most MAX_REQUESTS a run.
// Output: tla-whales/current.json (tla-core). Addresses are the chain's; a name is shown only where the account registered
// one or the address catalog has verified it. No owner is guessed.
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
export const VERSION = 'tla-whales-1.0.1';   // 1.0.1 (2026-11-27, after the first real read: 75 pools, 21 of the 21 over $5k explained to 100%): (a) an amp holder's share is its part of the amp tokens outstanding × what the compounder HAS STAKED — on five pools the tokens × the compounder's stated rate came to more than its stake (up to 110.9%), which put those pools over 100%; both figures are now published per pool (amp_check) and the stated rate is used only for that comparison; (b) the node's working form of the holders list is remembered, so the other form is not asked 69 times; (c) a catalog label loses a trailing first name in brackets — an organisation is named, a person is not; (d) a pool the compounder holds a stake in without listing an amp token for it says so
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJsonAt = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const ADDR = /^terra1[0-9a-z]{38}([0-9a-z]{20})?$/;
export const BUCKETS = { stable: 'terra1v399cx9drllm70wxfsgvfe694tdsd9x96p9ha36w7muffe4znlusqswspq', project: 'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa',
  bluechip: 'terra14mmvqn0kthw6sre75vku263lafn5655mkjdejqjedjga4cw0qx2qlf4arv', single: 'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k' };
export const COMPOUNDER = 'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx';
const TOP_SERIES = 30, KEEP_MIN_PCT = 0.01, KEEP_MIN_ROWS = 100, HISTORY_EPOCHS = 104;
const big = (x) => { try { return /^-?\d+$/.test(String(x)) ? BigInt(x) : 0n; } catch { return 0n; } };
const keyOf = (info) => (info && info.cw20 ? 'cw20:' + info.cw20 : info && info.native ? 'native:' + info.native : null);
// a staking contract's rows: [{ asset: { info: { cw20 | native }, amount }, shares }] — anything else is refused, not guessed
export function parseStaked(data) {
  if (!Array.isArray(data)) throw new Error('staked balances: not a list');
  return data.map((row) => { const k = keyOf(row && row.asset && row.asset.info), amount = String(row && row.asset && row.asset.amount);
    if (!k || !/^\d+$/.test(amount)) throw new Error('staked balances: a row without an asset or an amount'); return { key: k, lp: big(amount), shares: row.shares != null ? big(row.shares) : null }; });
}
export const cleanLabel = (t) => String(t || '').replace(/\s*\((?:[A-Z][a-z]+)\)\s*$/, '').slice(0, 60);   // "Some DAO ops (Firstname)" → "Some DAO ops"
// amp tokens × rate → LP tokens, in whole units (rate is a decimal string; 18 places kept)
export function ampToLp(amp, rate) { const m = String(rate).match(/^(\d+)(?:\.(\d+))?$/); if (!m) return null; const frac = (m[2] || '').slice(0, 18).padEnd(18, '0'); return (big(amp) * (BigInt(m[1]) * 10n ** 18n + BigInt(frac))) / 10n ** 18n; }
const pct = (part, whole) => (whole > 0n ? Number((part * 1000000n) / whole) / 10000 : 0);

export async function run(opts = {}) {
  const env = opts.env || process.env, log = opts.log || ((s) => console.log(s)), doFetch = opts.fetch || fetch;
  const core = path.resolve(opts.core || env.CORE_DIR || '.');
  const lcds = String(opts.lcds || env.LCD_ENDPOINTS || 'https://terra-rest.publicnode.com,https://phoenix-lcd.terra.dev,https://terra-lcd.stakely.io').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const MAX = Math.min(6000, Math.max(opts._unpaced ? 5 : 50, Number(opts.max ?? env.MAX_REQUESTS) || 3000)), gap = opts._unpaced ? 0 : 500, noPush = !!(opts.noPush || env.NO_PUSH);
  for (const k of Object.keys(env)) if (/^ARCHIVE_/.test(k) && env[k]) throw new Error('an archive setting is present — this script reads public nodes only and will not run with one');

  // ── transport: one request at a time ────────────────────────────────────────────────────────────────────────────────
  let last = 0; const stats = { requests: 0, failed: 0, by_node: {} };
  async function ask(pathQ) {
    if (stats.requests >= MAX) return { ok: false, limit: true, text: 'request limit of this run reached' };
    let err = null;
    for (const base of lcds) for (let i = 0; i < 2; i++) {
      const wait = last + gap - Date.now(); if (wait > 0) await sleep(wait); last = Date.now(); stats.requests++;
      try {
        const r = await doFetch(base + pathQ, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'tla-whales/1.0' }, signal: AbortSignal.timeout(45000) });
        const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { }
        if (r.ok && j) { stats.by_node[base] = (stats.by_node[base] || 0) + 1; return { ok: true, json: j }; }
        if (j && typeof j.message === 'string' && r.status < 502) return { ok: false, answered: true, status: r.status, text: j.message };
        err = { ok: false, status: r.status, text: text.slice(0, 160) };
      } catch (e) { err = { ok: false, status: 0, text: e && e.name === 'TimeoutError' ? 'no answer in time' : 'no answer' }; }
      await sleep(opts._unpaced ? 1 : 1500);
    }
    stats.failed++; return err;
  }
  const smart = async (a, q) => { const r = await ask(`/cosmwasm/wasm/v1/contract/${a}/smart/${encodeURIComponent(Buffer.from(JSON.stringify(q)).toString('base64'))}`); return r.ok ? { ok: true, data: r.json.data } : r; };

  // ── what the repo already holds: pool names, the public flow record, registered names, verified labels ───────────────
  const snap = readJsonAt(path.join(core, 'member-data/tla-snapshot/current.json'), null); if (!snap || !Array.isArray(snap.pools)) throw new Error('the pool snapshot is unreadable');
  const meta = new Map(); for (const p of snap.pools) if (p.gauge_pool_id && !meta.has(p.gauge_pool_id)) meta.set(p.gauge_pool_id, { name: p.name, bucket: p.bucket, dex: p.dex || null, status: p.status || null, staked_usd: p.staked_in_tla_usd == null ? null : Math.round(p.staked_in_tla_usd * 100) / 100 });
  const names = new Map(); for (const m of (readJsonAt(path.join(core, 'member-data/participants/current.json'), {}).members || [])) if (m && m.wallet && m.name) names.set(m.wallet, String(m.name).slice(0, 40));
  const labels = new Map(); for (const a of (readJsonAt(path.join(core, 'catalog/trusted/current.json'), {}).addresses || [])) if (a && a.address && a.label) labels.set(a.address, { label: cleanLabel(a.label), protocol: a.protocol || null, type: a.type || null });
  const rollup = readJsonAt(path.join(core, 'tla-flows/pnl/rollup.json'), null); if (!rollup || !Array.isArray(rollup.wallets)) throw new Error('the public flow record (tla-flows/pnl/rollup.json) is unreadable');
  const ledgerDir = path.join(core, 'tla-flows/pnl/ledger'); const led = new Map();
  for (const w of rollup.wallets) { const L = readJsonAt(path.join(ledgerDir, w.address + '.json'), null); if (L) led.set(w.address, L); }
  const flowOf = new Map(rollup.wallets.map((w) => [w.address, w]));

  // ── 1. what each staking contract holds in total, and what the compounder holds of it ───────────────────────────────
  const pools = new Map(); const bucketOk = {};
  for (const [b, c] of Object.entries(BUCKETS)) {
    const t = await smart(c, { total_staked_balances: {} }); if (!t.ok) { bucketOk[b] = false; log(`  ${b}: total not read — ${t.text}`); continue; }
    for (const r of parseStaked(t.data)) pools.set(r.key, { key: r.key, bucket: b, total_lp: r.lp, total_shares: r.shares, compounder_lp: 0n, direct: new Map(), amp: new Map(), amp_denom: null, amp_rate: null, complete: true, why: [] });
    const own = await smart(c, { all_staked_balances: { address: COMPOUNDER } }); bucketOk[b] = own.ok;
    if (own.ok) for (const r of parseStaked(own.data)) { const P = pools.get(r.key); if (P) P.compounder_lp = r.lp; }
    else for (const P of pools.values()) if (P.bucket === b) { P.complete = false; P.why.push('the compounder\'s own stake was not read'); }
  }
  if (!pools.size) throw new Error('no staking contract could be read — nothing written');

  // ── 2. the amp tokens: every holder of each, from the chain's own list ──────────────────────────────────────────────
  const rates = await smart(COMPOUNDER, { amplp_exchange_rates: {} }); let ampDenoms = 0, ownersForm = null;   // which form of the holders list this node answers (0 = by path, 1 = by query)
  if (!rates.ok || !Array.isArray(rates.data)) { for (const P of pools.values()) if (P.compounder_lp > 0n) { P.complete = false; P.why.push('the compounder\'s exchange rates were not read'); } }
  else for (const r of rates.data) {
    const k = keyOf(r && r.asset), P = k && pools.get(k); if (!P || typeof r.amplp_denom !== 'string' || !(Number(r.exchange_rate) > 0)) continue;
    P.amp_denom = r.amplp_denom; P.amp_rate = String(r.exchange_rate); ampDenoms++;
    let next = null, pages = 0, ok = true;
    do {
      const q = `?pagination.limit=500${next ? '&pagination.key=' + encodeURIComponent(next) : ''}`;
      const forms = [`/cosmos/bank/v1beta1/denom_owners/${r.amplp_denom}${q}`, `/cosmos/bank/v1beta1/denom_owners_by_query${q}&denom=${encodeURIComponent(r.amplp_denom)}`]; if (ownersForm === 1) forms.reverse();
      let d = await ask(forms[0]); if (d.ok) ownersForm = ownersForm == null ? 0 : ownersForm;
      else if (!d.limit) { d = await ask(forms[1]); if (d.ok) ownersForm = ownersForm === 1 ? 0 : 1; }
      if (!d.ok) { ok = false; break; }
      for (const o of d.json.denom_owners || []) { const a = o && o.address, amt = big(o && o.balance && o.balance.amount); if (ADDR.test(a || '') && amt > 0n) P.amp.set(a, (P.amp.get(a) || 0n) + amt); }
      next = d.json.pagination && d.json.pagination.next_key ? d.json.pagination.next_key : null; pages++;
    } while (next && pages < 40);
    if (!ok || next) { P.complete = false; P.why.push('the list of amp-token holders was not read to its end'); }
  }

  // ── 3. the direct stakers: every account the public flow record shows with stake left, asked on the chain ────────────
  const want = new Map();   // bucket → Set(address)
  const addWant = (b, a) => { if (!BUCKETS[b] || !ADDR.test(a) || a === COMPOUNDER) return; (want.get(b) || want.set(b, new Set()).get(b)).add(a); };
  for (const [a, L] of led) for (const [k, v] of Object.entries(L.cumulative_units_at_head || {})) { const i = k.lastIndexOf('|'); if (k.slice(i + 1) !== 'shares' || big(v) <= 0n) continue; const P = pools.get(k.slice(0, i)); if (P) addWant(P.bucket, a); }
  for (const m of (readJsonAt(path.join(core, 'member-data/participants/current.json'), {}).members || [])) for (const p of (m && m.lp_positions) || []) if (p && p.position_type === 'non_amplified' && p.pool_gauge_id && pools.get(p.pool_gauge_id)) addWant(pools.get(p.pool_gauge_id).bucket, m.wallet);
  let asked = 0, notRead = 0;
  for (const [b, set] of want) for (const a of set) {
    const r = await smart(BUCKETS[b], { all_staked_balances: { address: a } }); asked++;
    if (!r.ok) { notRead++; for (const P of pools.values()) if (P.bucket === b && !P.why.includes('some stakers were not read')) { P.complete = false; P.why.push('some stakers were not read'); } continue; }
    for (const row of parseStaked(r.data)) { const P = pools.get(row.key); if (P && row.lp > 0n) P.direct.set(a, row.lp); }
  }

  // ── 4. the list per pool ────────────────────────────────────────────────────────────────────────────────────────────
  const head = Number((rollup.wallets[0] && rollup.wallets[0].v3 && rollup.wallets[0].v3.as_of_epoch) || 0) || null;
  const outPools = [];
  for (const P of pools.values()) {
    const m = meta.get(P.key) || {}; const rows = new Map();
    for (const [a, lp] of P.direct) rows.set(a, { a, direct: lp, amp: 0n, amp_tokens: 0n });
    // an amp holder's LP = its part of the amp tokens outstanding × what the compounder has staked in this pool (its stated rate is kept for the comparison only)
    let ampLpSum = 0n; const ampSupply = [...P.amp.values()].reduce((s, v) => s + v, 0n);
    for (const [a, t] of P.amp) { if (ampSupply <= 0n) break; const lp = (P.compounder_lp * t) / ampSupply; ampLpSum += lp; const r = rows.get(a) || rows.set(a, { a, direct: 0n, amp: 0n, amp_tokens: 0n }).get(a); r.amp = lp; r.amp_tokens = t; }
    const statedLp = P.amp_rate ? ampToLp(ampSupply, P.amp_rate) : null;
    const ampCheck = P.amp_denom && ampSupply > 0n && statedLp != null ? { amp_tokens: ampSupply.toString(), stated_rate: P.amp_rate, stated_lp: statedLp.toString(), staked_lp: P.compounder_lp.toString(), stated_over_staked: P.compounder_lp > 0n ? Number((statedLp * 1000000n) / P.compounder_lp) / 1000000 : null } : undefined;
    const directSum = [...P.direct.values()].reduce((s, v) => s + v, 0n); const directTotal = P.total_lp - P.compounder_lp;
    const list = [...rows.values()].map((r) => ({ ...r, lp: r.direct + r.amp })).sort((x, y) => (y.lp > x.lp ? 1 : y.lp < x.lp ? -1 : x.a < y.a ? -1 : 1));
    const holders = list.map((r, i) => {
      const f = flowOf.get(r.a), bp = f && f.by_pool && f.by_pool[P.key], L = led.get(r.a), lab = labels.get(r.a);
      const o = { a: r.a, kind: r.a.length > 50 ? 'contract' : 'account', name: names.get(r.a) || undefined, label: lab ? lab.label : undefined, protocol: lab && lab.protocol ? lab.protocol : undefined,
        lp: r.lp.toString(), pct: pct(r.lp, P.total_lp), direct_pct: r.direct > 0n ? pct(r.direct, P.total_lp) : undefined, amp_pct: r.amp > 0n ? pct(r.amp, P.total_lp) : undefined };
      if (bp) { o.dep = bp.deposits || 0; o.wdr = bp.withdraws || 0; o.clm = bp.claims || 0; if (bp.claim_usd_at_event) o.clm_usd = Math.round(bp.claim_usd_at_event * 100) / 100; }
      if (L && L.epochs) { const eps = Object.keys(L.epochs).map(Number).sort((x, y) => x - y); let since = null, last = null, dep8 = 0, wdr8 = 0; const h = [];
        for (const e of eps) { const x = L.epochs[e].pools && L.epochs[e].pools[P.key]; if (!x) continue; if (since == null && x.dep) since = e; last = e; if (head && e > head - 8) { dep8 += x.dep || 0; wdr8 += x.wdr || 0; }
          if (i < TOP_SERIES && (!head || e > head - HISTORY_EPOCHS) && x.units) h.push([e, x.units.shares || '0', x.units.amplp || '0']); }
        if (since != null) o.since = since; if (last != null) o.last = last; o.trend = dep8 && !wdr8 ? 'adding' : wdr8 && !dep8 ? 'reducing' : dep8 && wdr8 ? 'both' : 'holding'; if (h.length) o.h = h; }
      return o; });
    const keepN = Math.max(KEEP_MIN_ROWS, holders.findIndex((x) => x.pct < KEEP_MIN_PCT) < 0 ? holders.length : holders.findIndex((x) => x.pct < KEEP_MIN_PCT)); const kept = holders.slice(0, keepN), rest = holders.slice(keepN);
    const attributed = directSum + ampLpSum;
    outPools.push({ key: P.key, name: m.name || null, bucket: P.bucket, dex: m.dex || null, status: m.status || null, staked_usd: m.staked_usd == null ? null : m.staked_usd,
      total_lp: P.total_lp.toString(), amplified_pct: pct(P.compounder_lp, P.total_lp), amp_denom: P.amp_denom || undefined, amp_check: ampCheck, amp_token_missing: P.compounder_lp > 0n && !P.amp_denom ? true : undefined,
      holders_n: holders.length, attributed_pct: pct(attributed, P.total_lp),
      not_attributed: { direct_pct: pct(directTotal > directSum ? directTotal - directSum : 0n, P.total_lp), amp_pct: pct(P.compounder_lp > ampLpSum ? P.compounder_lp - ampLpSum : 0n, P.total_lp) },
      complete: P.complete, why_incomplete: P.why.length ? P.why : undefined, others: rest.length ? { n: rest.length, pct: Math.round(rest.reduce((s, x) => s + x.pct, 0) * 10000) / 10000 } : undefined, holders: kept });
  }
  outPools.sort((x, y) => (y.staked_usd || 0) - (x.staked_usd || 0) || (x.key < y.key ? -1 : 1));
  const limitHit = stats.requests >= MAX;
  const doc = { schemaVersion: 1, version: VERSION, capturedAt: new Date().toISOString(), epoch: head,
    how: { direct: 'accounts the public flow record (tla-flows/pnl) shows with stake left in a pool, each asked on the chain (all_staked_balances)', amp: 'every holder of the pool\'s amp token, from the chain\'s own list (bank denom_owners); each holder\'s LP = its part of the tokens outstanding × what the compounder has staked in the pool. amp_check gives, beside it, the tokens × the compounder\'s stated rate',
      check: 'per pool: the staking contract\'s total = the compounder\'s own stake + the direct stakers; what is not explained is "not_attributed" and is never spread over the others', names: 'a name is one the account registered; a label is one the address catalog has verified. Nothing else is named.', units: 'lp = LP tokens in the token\'s smallest unit; pct = share of the pool\'s staked LP' },
    counts: { pools: outPools.length, amp_tokens: ampDenoms, direct_accounts_asked: asked, direct_accounts_not_read: notRead, flow_record_wallets: rollup.wallets.length, requests: stats.requests, failed: stats.failed, limit_reached: limitHit },
    buckets_read: bucketOk, pools: outPools };

  const rel = 'tla-whales/current.json'; const write = () => { const f = path.join(core, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(doc)); };
  if (noPush) write();
  else {
    const sh = (c) => execSync(c, { cwd: core, stdio: 'pipe' }).toString(); let done = false;
    for (let i = 0; i < 5 && !done; i++) { try { sh('git fetch -q origin main && git reset -q --hard origin/main'); write(); sh(`git add ${rel}`); sh(`git commit -q -m ${JSON.stringify(`tla whales: ${outPools.length} pools, ${asked} stakers asked (${VERSION})`)}`); sh('git push -q origin HEAD:main'); done = true; } catch (e) { await sleep(3000 + i * 2000); } }
    if (!done) throw new Error('could not publish ' + rel);
  }
  const big5 = outPools.filter((p) => (p.staked_usd || 0) >= 5000); const med = big5.map((p) => p.attributed_pct).sort((a, b) => a - b)[Math.floor(big5.length / 2)];
  log(`pools ${outPools.length} · amp tokens ${ampDenoms} · stakers asked ${asked} (not read ${notRead}) · attributed (median of ${big5.length} pools over $5k): ${med}% · requests ${stats.requests} (failed ${stats.failed})${limitHit ? ' · REQUEST LIMIT REACHED' : ''}`);
  return { doc, stats };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run().catch((e) => { console.error('FATAL: ' + String(e && e.message || e)); process.exit(1); });

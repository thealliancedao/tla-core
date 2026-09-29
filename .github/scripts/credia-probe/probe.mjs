// ── Credia (Creda Finance) probe 1.1 (2026-09-28) · 1.1 (after the first run): HISTORY FIRST (it is the scarce part), the census only on
//    Credia's own lists (portfolio all_accounts / portfolios / asset_states + receipt tokens' holders — never the whole ampLUNA / arbLUNA
//    holder list), wallet answers only from Credia's contracts, and cw20s named by the configs get token_info only
// ── 1.0 (2026-09-28) — READ-ONLY, one-off (GitHub Action; the workspace cannot reach the chain).
// What the deep-history walk (SPEC-deep-history §4b/§8) needs from Credia before it is built on — the Solid probe's lessons applied:
//   A. contracts: the four documented core contracts (+ whatever their configs name, one round) → contract_info (label, code id, admin)
//      and every QUERY VARIANT each accepts (an unknown query {"__probe__":{}} makes a CosmWasm contract list them — "expected one of …")
//   B. protocol state: metrics {} (the whole platform in one answer), every config-ish variant, and each market's receipt token
//      (token_info / minter) + underlying — how supply balances and interest indices are represented
//   C. the probe wallets' own answers: every variant tried with {address} / {user} / {owner} / {account} — the shapes the reader parses
//   D. census: every list-shaped variant paged to the end (stop on an EMPTY page); the receipt tokens' all_accounts (cw20 enumerable)
//   E. history (RPC tx_search, ARCHIVE_RPC when set): every tx that touched the portfolio contract, newest first, paged — the distinct
//      action sets, up to 4 verbatim txs per action set (supply / withdraw / borrow / repay / collateral toggles / emode / liquidation …),
//      the distinct wallets seen (signers + wallet-valued attributes), first/last height; the liquidator's txs; and the take-rate
//      tribute hypothesis: add_bribe txs on the TLA bribe manager that carry a Credia contract event
// Commits ONE file: docs/fixtures/<date>/credia-probe.json. Saves after every phase (a stop at the budget keeps what it had).
import fs from 'fs';
const LCD = (process.env.LCD || 'https://terra-lcd.publicnode.com').replace(/\/$/, '');
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL || 'https://terra-rpc.publicnode.com'].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const WALLETS = (process.env.WALLETS || 'terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw').split(',').map(s => s.trim()).filter(Boolean);
const OUT = process.env.OUT || `docs/fixtures/${new Date().toISOString().slice(0, 10)}/credia-probe.json`;
const MAX_MIN = Number(process.env.MAX_MINUTES || 60), MAX_PAGES = Number(process.env.MAX_PAGES || 80), PAGE_LIMIT = 30;
const CORE = {   // docs.creda.finance/developers/contract-addresses, verified on chain 2026-07-16 (ecosystem-knowledge/credia.facts.json)
  portfolio: 'terra1y6hfmr3lxxj6srduhlfz96x7sga2984pr757a0nrfuqxa9rqxapqcjv4zz',
  oracle: 'terra1wj56ld9e9tuuw6qqr8m5ac8h953te65jcxz7c0dgekrud8lxwjgqryuwg3',
  global_config: 'terra1skhnhcj653zfkqzd4txcashg0qu4v0vnpckeztgmsm46cqn33lhsxyej6c',
  liquidator: 'terra14452q6ypfn7xaque0hu8y9420xwu3y9gq7zw8f9rc82tx7rk2hlq8a7ca3',
};
const BRIBE_MANAGER = 'terra1tuuwm8yrj54qeg0c8xu00aha9ryatyhtczq8qq2q8tntuw0auzas9037wh';
const T0 = Date.now(); const overBudget = () => (Date.now() - T0) / 60000 > MAX_MIN;
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const UA = 'thealliancedao.com credia-probe/1.1 (one-off; contact via the site)';
async function getJson(url, tries = 4, timeoutMs = 30000) { let last = null;
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok) return { ok: true, json: j }; last = { ok: false, status: r.status, body: (j && (j.message || j.error)) || t.slice(0, 400) }; if (r.status < 500 && r.status !== 429) return last; } catch (e) { last = { ok: false, status: 0, body: e.message }; }
    await sleep(1500 * (i + 1)); } return last; }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
async function smart(addr, q) { await sleep(120); const r = await getJson(`${LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${b64(q)}`); return r.ok ? { ok: true, data: r.json && r.json.data } : { ok: false, error: `HTTP ${r.status}: ${String(r.body).slice(0, 400)}` }; }
const variantsOf = (err) => { const m = String(err || '').match(/expected (?:one of )?(.+?)(?::|$| at line)/); return m ? [...m[1].matchAll(/`([a-z0-9_]+)`/g)].map(x => x[1]) : []; };
const out = { probe: 'credia-probe 1.1', ran_at: new Date().toISOString(), lcd: LCD, rpcs: RPCS.map((u, i) => (i === 0 && process.env.ARCHIVE_RPC ? 'ARCHIVE_RPC (secret)' : u)), wallets: WALLETS,
  contracts: {}, metrics: null, markets: {}, wallet_answers: {}, census: {}, history: { portfolio: null, liquidator: null, action_sets: {}, samples: [], wallets_seen: 0, first_height: null, last_height: null, tribute: null }, notes: [] };
const save = () => { try { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); out.elapsed_min = +((Date.now() - T0) / 60000).toFixed(1); fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); } catch (e) { console.error('save failed', e.message); } };
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { out.notes.push('cancelled (' + sig + ') — saved what it had'); save(); process.exit(0); });

// ── A. contracts + query variants ────────────────────────────────────────────────────────────────────────────────────────────
async function describe(addr, role) {
  const info = await getJson(`${LCD}/cosmwasm/wasm/v1/contract/${addr}`); const ci = info.ok ? info.json.contract_info : null;
  const v = await smart(addr, { __probe__: {} }); const vs = variantsOf(v.error);
  const c = { role, label: ci && ci.label, code_id: ci && ci.code_id, admin: ci && ci.admin, creator: ci && ci.creator, query_variants: vs, variants_raw_error: vs.length ? undefined : String(v.error || '').slice(0, 300), answers: {} };
  // every variant that takes no argument (config, state, metrics, markets …) — the protocol's own description of itself
  const cw20 = vs.includes('token_info');   // 1.1: a token (LST, receipt, LP) — its token_info / minter is all we need
  for (const q of (cw20 ? vs.filter(x => x === 'token_info' || x === 'minter' || x === 'marketing_info') : vs)) { if (overBudget()) break; if (/^all_/.test(q) || q === 'portfolios' || q === 'asset_states') continue;   /* lists are the census's job */ const r = await smart(addr, { [q]: {} }); if (r.ok) c.answers[q] = r.data; else if (!/missing field/.test(r.error)) c.answers[q] = { error: r.error.slice(0, 200) }; }
  c.kind = cw20 ? 'cw20' : 'contract';
  out.contracts[addr] = c; save(); console.log(`  ${role.padEnd(14)} ${addr.slice(0, 14)}… ${c.label || '?'} (code ${c.code_id}) · ${vs.length} variants: ${vs.join(', ')}`); return c;
}
for (const [role, a] of Object.entries(CORE)) await describe(a, role);
// contracts named by the core configs (one round, capped): interest-rate models, token proxies, fee collectors …
{ const named = new Set(); for (const c of Object.values(out.contracts)) for (const m of JSON.stringify(c.answers).matchAll(/"(terra1[0-9a-z]{58})"/g)) if (!out.contracts[m[1]]) named.add(m[1]);
  out.notes.push(`${named.size} further contracts named by the core configs`); let n = 0;
  for (const a of named) { if (overBudget() || n++ >= 30) break; await describe(a, 'named'); } }

// ── B. metrics + markets + receipt tokens ────────────────────────────────────────────────────────────────────────────────────
{ const r = await smart(CORE.portfolio, { metrics: {} }); out.metrics = r.ok ? r.data : { error: r.error }; save();
  const txt = JSON.stringify(out.metrics || {}); const proxies = [...new Set([...txt.matchAll(/"vproxy_addr"\s*:\s*"(terra1[0-9a-z]+)"/g)].map(m => m[1]))];
  for (const p of proxies) { if (overBudget()) break; const ti = await smart(p, { token_info: {} }); const mi = await smart(p, { minter: {} }); const vv = await smart(p, { __probe__: {} });
    out.markets[p] = { token_info: ti.ok ? ti.data : { error: ti.error }, minter: mi.ok ? mi.data : { error: mi.error }, query_variants: variantsOf(vv.error) }; }
  save(); console.log(`metrics: ${r.ok ? 'ok' : r.error} · ${proxies.length} receipt tokens`); }

// ── E. history (tx_search) ───────────────────────────────────────────────────────────────────────────────────────────────────
async function txsearch(q, perPage, page, order = 'desc') {
  for (const rpc of RPCS) { if (overBudget()) return null; const r = await getJson(`${rpc}/tx_search?query=${encodeURIComponent('"' + q + '"')}&per_page=${perPage}&page=${page}&order_by=%22${order}%22`, 2, 30000);
    if (r.ok && r.json && r.json.result) return { rpc: rpc === RPCS[0] && process.env.ARCHIVE_RPC ? 'archive' : 'public', total: Number(r.json.result.total_count), txs: r.json.result.txs }; }
  return null; }
const ROLE = Object.fromEntries(Object.entries(out.contracts).map(([a, c]) => [a, c.role === 'named' ? (c.label || a.slice(-6)) : c.role]));
const wasmOf = (t) => ((t.tx_result && t.tx_result.events) || []).filter(e => /^wasm/.test(e.type)).map(e => ({ type: e.type, attributes: (e.attributes || []).map(a => ({ key: a.key, value: a.value })) }));
const allOf = (t) => ((t.tx_result && t.tx_result.events) || []).map(e => ({ type: e.type, attributes: (e.attributes || []).map(a => ({ key: a.key, value: a.value })) }));
const actionsOf = (w) => [...new Set(w.map(e => { const c = (e.attributes.find(a => a.key === '_contract_address') || {}).value; const a = (e.attributes.find(a => a.key === 'action') || {}).value; return a ? (ROLE[c] || (c || '?').slice(-6)) + ':' + a : null; }).filter(Boolean))].sort();
const WALLET_RE = /^terra1[02-9ac-hj-np-z]{38}$/; const seen = new Set(); const keysSeen = {};
async function walk(addr, key, pagesMax) {
  const H = { txs_read: 0, total: null, via: null };
  for (let pg = 1; pg <= pagesMax && !overBudget(); pg++) {
    const r = await txsearch(`wasm._contract_address='${addr}'`, 100, pg); if (!r) { out.notes.push(`${key} tx_search stopped at page ${pg}`); break; }
    H.total = r.total; H.via = r.rpc;
    for (const t of r.txs || []) { H.txs_read++; const w = wasmOf(t); const set = actionsOf(w).join(' + ') || '(no wasm action)'; const h = Number(t.height);
      const s = out.history.action_sets[set] || (out.history.action_sets[set] = { n: 0, first_height: null, last_height: null }); s.n++; s.first_height = s.first_height == null ? h : Math.min(s.first_height, h); s.last_height = Math.max(s.last_height || 0, h);
      out.history.first_height = out.history.first_height == null ? h : Math.min(out.history.first_height, h); out.history.last_height = Math.max(out.history.last_height || 0, h);
      for (const e of allOf(t)) for (const a of e.attributes) if (WALLET_RE.test(a.value || '')) { seen.add(a.value); const k = e.type.replace(/^wasm.*/, 'wasm') + '.' + a.key; keysSeen[k] = (keysSeen[k] || 0) + 1; }
      if (out.history.samples.filter(x => x.action_set === set).length < 4) out.history.samples.push({ action_set: set, hash: t.hash, height: h, events: allOf(t).filter(e => /^(wasm|transfer|coin_received|coin_spent|message)/.test(e.type)) }); }
    if ((r.txs || []).length < 100 || pg * 100 >= r.total) break; if (pg % 5 === 0) save();
  }
  return H;
}
out.history.portfolio = await walk(CORE.portfolio, 'portfolio', MAX_PAGES); save();
out.history.liquidator = await walk(CORE.liquidator, 'liquidator', 10); save();
out.history.wallets_seen = seen.size; out.history.wallet_attribute_keys = keysSeen;
// the take-rate tribute hypothesis (credia.facts: take_rate.tribute_hypothesis): add_bribe txs on the bribe manager with a Credia event in them
{ const hits = []; let read = 0;
  for (let pg = 1; pg <= 10 && !overBudget(); pg++) { const r = await txsearch(`wasm._contract_address='${BRIBE_MANAGER}' AND wasm.action='add_bribe'`, 100, pg); if (!r) break;
    for (const t of r.txs || []) { read++; const w = wasmOf(t); const cs = new Set(w.map(e => (e.attributes.find(a => a.key === '_contract_address') || {}).value)); if ([...cs].some(c => ROLE[c])) hits.push({ hash: t.hash, height: Number(t.height), events: w }); }
    if ((r.txs || []).length < 100) break; }
  out.history.tribute = { add_bribe_txs_read: read, with_a_credia_contract: hits.length, samples: hits.slice(0, 5) }; }
save();
// ── C. the probe wallets' own answers (every variant × the usual argument names) ──────────────────────────────────────────────
for (const w of WALLETS) { out.wallet_answers[w] = {};
  for (const [addr, c] of Object.entries(out.contracts)) for (const v of (c.kind === 'cw20' ? [] : c.query_variants)) {
    if (overBudget()) break;
    for (const arg of [{ address: w }, { user: w }, { owner: w }, { account: w }, { borrower: w }, { wallet: w }]) {
      const r = await smart(addr, { [v]: arg }); if (r.ok) { out.wallet_answers[w][`${c.role}.${v} ${Object.keys(arg)[0]}`] = r.data; break; }
      if (!/missing field|unknown field|invalid type|Error parsing|expected/.test(r.error)) { out.wallet_answers[w][`${c.role}.${v} ${Object.keys(arg)[0]}`] = { error: r.error.slice(0, 200) }; break; }
    }
  }
  for (const [p] of Object.entries(out.markets)) { const r = await smart(p, { balance: { address: w } }); out.wallet_answers[w]['receipt ' + p] = r.ok ? r.data : { error: r.error.slice(0, 120) }; }
}
save();

// ── D. census: list-shaped variants paged to the end; the receipt tokens' holders ────────────────────────────────────────────
async function pageAll(addr, variant, extra = {}) {
  const rows = []; let after = null, pages = 0, err = null;
  while (!overBudget() && pages < 400) { const q = { [variant]: Object.assign({ limit: PAGE_LIMIT }, extra, after ? { start_after: after } : {}) }; const r = await smart(addr, q); pages++;
    if (!r.ok) { err = r.error.slice(0, 300); break; } const list = Array.isArray(r.data) ? r.data : (Object.values(r.data || {}).find(Array.isArray) || []);
    rows.push(...list); if (!list.length) break; const last = list[list.length - 1]; const next = typeof last === 'string' ? last : (last.address || last.owner || last.user || last.account || last.borrower || last.id || null);
    if (!next || next === after) break; after = next; }
  return { rows: rows.length, pages, complete: !err && !overBudget(), error: err || undefined, data: rows };
}
for (const [addr, c] of Object.entries(out.contracts)) for (const v of (c.kind === 'cw20' || c.role === 'named' ? [] : c.query_variants)) {
  if (/allowances|addresses$/.test(v)) continue;
  if (!/^(all_|portfolios|asset_states|positions|users|accounts|borrowers|suppliers|list_)/.test(v) && !/(portfolios|positions|accounts|users)$/.test(v)) continue;
  const res = await pageAll(addr, v); out.census[`${c.role}.${v}`] = Object.assign({ contract: addr }, res); save();
  console.log(`  census ${c.role}.${v}: ${res.rows} rows in ${res.pages} pages${res.error ? ' — ' + res.error.slice(0, 80) : ''}`);
}
for (const [p, m] of Object.entries(out.markets)) { if (!(m.query_variants || []).includes('all_accounts')) continue; const res = await pageAll(p, 'all_accounts'); out.census['receipt ' + ((m.token_info && m.token_info.symbol) || p.slice(-6)) + '.all_accounts'] = Object.assign({ contract: p }, res); save(); }

console.log(`\ncredia-probe 1.1: ${Object.keys(out.contracts).length} contracts · metrics ${out.metrics && !out.metrics.error ? 'ok' : 'FAILED'} · ${Object.keys(out.markets).length} receipt tokens`);
console.log(`  census: ${Object.entries(out.census).map(([k, v]) => k + ' ' + v.rows).join(' · ') || 'no list-shaped query'}`);
console.log(`  portfolio txs read ${out.history.portfolio && out.history.portfolio.txs_read} of ${out.history.portfolio && out.history.portfolio.total} · wallets seen ${out.history.wallets_seen} · tribute hits ${out.history.tribute && out.history.tribute.with_a_credia_contract} · action sets:`);
for (const [k, v] of Object.entries(out.history.action_sets).sort((a, b) => b[1].n - a[1].n).slice(0, 40)) console.log(`   ${v.n}× ${k}`);
console.log(`  → ${OUT} (${out.elapsed_min} min)`);

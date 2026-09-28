// ── Solid (CDP) probe 1.4 · mode "liquidations" (2026-09-28) — READ-ONLY, one-off (GitHub Action; the workspace cannot reach the chain).
// What 1.3 could not finish inside its 40-minute budget, and what the Solid card + the Solid history need before they are built on:
//   A. the census, paged to the end (LCD): overseer all_collaterals · market borrower_infos · every custody's borrowers — so the reader's
//      paging is proven on the real answer, and the gate has a recorded census to run on; plus oracle prices, whitelist, market state,
//      and token_info (decimals) of every collateral cw20 and SOLID.
//   B. liquidations (RPC tx_search, ARCHIVE_RPC when set): every tx that touched the liquidation queue, newest first, paged; the distinct
//      action sets seen in them; up to 5 verbatim txs per action set that looks like a liquidation (the event vocabulary the history needs);
//      plus direct searches for the likely action names on the overseer / queue / market / custodies.
// Commits ONE file: docs/fixtures/<date>/solid-liquidations.json. Saves after every phase (a stop at the budget keeps what it had).
import fs from 'fs';
const LCD = (process.env.LCD || 'https://terra-lcd.publicnode.com').replace(/\/$/, '');
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL || 'https://terra-rpc.publicnode.com'].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const OUT = process.env.OUT || `docs/fixtures/${new Date().toISOString().slice(0, 10)}/solid-liquidations.json`;
const MAX_MIN = Number(process.env.MAX_MINUTES || 60), MAX_PAGES = Number(process.env.MAX_PAGES || 60), PAGE_LIMIT = 30;
const S = {
  overseer: 'terra10qnsw3wn4uaxs7en2kynhet2dsyy76lmprh2ptcz85d8hu59gkuqcpndnv', market: 'terra1h4cknjl5k0aysdhv0h4eqcaka620g8h69k8h0pjjccxvf9esfhws3cyqnc',
  liquidation: 'terra188d4q69nen6vmwt7vcvz8lf54mc80cfvqtrznpmsrawftm86jkmsh4grzp', oracle: 'terra199pgv9dymcg9q8xtwsxk7yakazmvlf5ptkqh4zadcv7k0yqsal2q6tq7mv',
  collector: 'terra1uz33y5dfazxspyfdvw30dwmpa5hhm4908tetpq5t0sm0z0c63rlspfkaau', stable: 'terra10aa3zdkrc7jwuf8ekl3zq7e7m42vmzqehcmu74e4egc7xkm5kr2s0muyst',
};
const T0 = Date.now(); const overBudget = () => (Date.now() - T0) / 60000 > MAX_MIN;
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const UA = 'thealliancedao.com solid-probe/1.4 (one-off; contact via the site)';
async function getJson(url, tries = 4, timeoutMs = 30000) { let last = null;
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
      if (r.ok) return { ok: true, json: j }; last = { ok: false, status: r.status, body: (j && (j.message || j.error)) || t.slice(0, 300) }; if (r.status < 500 && r.status !== 429) return last; } catch (e) { last = { ok: false, status: 0, body: e.message }; }
    await sleep(1500 * (i + 1)); } return last; }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
async function smart(addr, q) { await sleep(120); const r = await getJson(`${LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${b64(q)}`); return r.ok ? { ok: true, data: r.json && r.json.data } : { ok: false, error: `HTTP ${r.status}: ${r.body}` }; }
const out = { probe: 'solid-probe 1.4 (liquidations + census)', ran_at: new Date().toISOString(), lcd: LCD, rpcs: RPCS.map((u, i) => (i === 0 && process.env.ARCHIVE_RPC ? 'ARCHIVE_RPC (secret)' : u)),
  contracts: S, answers: {}, token_info: {}, census: {}, liquidations: { queue_txs_read: 0, queue_total: null, action_sets: {}, samples: [], direct: {} }, notes: [] };
const save = () => { try { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); out.elapsed_min = +((Date.now() - T0) / 60000).toFixed(1); fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); } catch (e) { console.error('save failed', e.message); } };
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { out.notes.push('cancelled (' + sig + ') — saved what it had'); save(); process.exit(0); });

// ── A. state + census (LCD) ──────────────────────────────────────────────────────────────────────────────────────────
for (const [k, addr, q] of [['oracle.prices', S.oracle, { prices: {} }], ['oracle.config', S.oracle, { config: {} }], ['overseer.whitelist', S.overseer, { whitelist: {} }], ['overseer.config', S.overseer, { config: {} }],
  ['market.state', S.market, { state: {} }], ['market.config', S.market, { config: {} }], ['liquidation.config', S.liquidation, { config: {} }]]) out.answers[k] = await smart(addr, q);
const wl = (out.answers['overseer.whitelist'].ok && out.answers['overseer.whitelist'].data && out.answers['overseer.whitelist'].data.elems) || [];
for (const t of [...wl.map(e => e.collateral_token), S.stable]) { const r = await smart(t, { token_info: {} }); out.token_info[t] = r.ok ? r.data : { error: r.error }; }
save();
async function page(key, addr, qName, listKey, cursorOf) {
  const rows = []; let start_after = null, pages = 0, err = null;
  while (!overBudget() && pages < 400) { const q = { [qName]: Object.assign({ limit: PAGE_LIMIT }, start_after ? { start_after } : {}) }; const r = await smart(addr, q); pages++;
    if (!r.ok) { err = r.error; break; } const list = (r.data && r.data[listKey]) || []; rows.push(...list); if (!list.length) break; const next = cursorOf(list[list.length - 1]); if (next === start_after) break; start_after = next; }   // stop on an EMPTY page only (a contract may cap the limit below what we ask)
  out.census[key] = { contract: addr, query: qName, rows: rows.length, pages, complete: !err && !overBudget(), error: err || undefined, data: rows }; save();
  console.log(`census ${key}: ${rows.length} rows in ${pages} pages${err ? ' — ' + err : ''}`);
}
await page('overseer.all_collaterals', S.overseer, 'all_collaterals', 'all_collaterals', (x) => x.borrower);
await page('market.borrower_infos', S.market, 'borrower_infos', 'borrower_infos', (x) => x.borrower);
for (const e of wl) await page('custody.' + e.symbol + '.borrowers', e.custody_contract, 'borrowers', 'borrowers', (x) => x.borrower);
// the protocol's own borrow limit for every wallet with a loan (the census has no limit — the page and the gate check health against it)
{ const loans = ((out.census['market.borrower_infos'] || {}).data || []).filter(x => Number(x.loan_amount) > 0); out.census['overseer.borrow_limit'] = { rows: 0, data: [] };
  for (const l of loans) { if (overBudget()) break; const r = await smart(S.overseer, { borrow_limit: { borrower: l.borrower } }); out.census['overseer.borrow_limit'].data.push(r.ok ? r.data : { borrower: l.borrower, error: r.error }); out.census['overseer.borrow_limit'].rows++; }
  save(); console.log(`borrow limits: ${out.census['overseer.borrow_limit'].rows} of ${loans.length} borrowers with a loan`); }

// ── B. liquidations (RPC tx_search) ──────────────────────────────────────────────────────────────────────────────────
async function txsearch(q, perPage, page, order = 'desc') {
  for (const rpc of RPCS) { if (overBudget()) return null; const r = await getJson(`${rpc}/tx_search?query=${encodeURIComponent('"' + q + '"')}&per_page=${perPage}&page=${page}&order_by=%22${order}%22`, 2, 30000);
    if (r.ok && r.json && r.json.result) return { rpc: rpc === RPCS[0] && process.env.ARCHIVE_RPC ? 'archive' : 'public', total: Number(r.json.result.total_count), txs: r.json.result.txs }; }
  return null; }
const wasmOf = (t) => ((t.tx_result && t.tx_result.events) || []).filter(e => /^wasm/.test(e.type)).map(e => ({ type: e.type, attributes: (e.attributes || []).map(a => ({ key: a.key, value: a.value })) }));
const actionsOf = (w) => [...new Set(w.map(e => { const c = (e.attributes.find(a => a.key === '_contract_address') || {}).value; const a = (e.attributes.find(a => a.key === 'action') || {}).value; return a ? (Object.entries(S).find(([, v]) => v === c) || [(c || '?').slice(-6)])[0] + ':' + a : null; }).filter(Boolean))].sort();
const LIQ_RE = /liquidat|execute_bid|repay_stable_from/i;
for (let pg = 1; pg <= MAX_PAGES && !overBudget(); pg++) {
  const r = await txsearch(`wasm._contract_address='${S.liquidation}'`, 100, pg); if (!r) { out.notes.push('queue tx_search stopped at page ' + pg); break; }
  out.liquidations.queue_total = r.total; out.liquidations.via = r.rpc;
  for (const t of r.txs || []) { out.liquidations.queue_txs_read++; const w = wasmOf(t); const key = actionsOf(w).join(' + ') || '(no wasm action)'; const s = out.liquidations.action_sets[key] || (out.liquidations.action_sets[key] = { n: 0, first_height: null, last_height: null });
    s.n++; const h = Number(t.height); s.first_height = s.first_height == null ? h : Math.min(s.first_height, h); s.last_height = Math.max(s.last_height || 0, h);
    if (LIQ_RE.test(key) && out.liquidations.samples.filter(x => x.action_set === key).length < 5) out.liquidations.samples.push({ action_set: key, hash: t.hash, height: h, events: w }); }
  if ((r.txs || []).length < 100 || pg * 100 >= r.total) break; if (pg % 5 === 0) save();
}
save();
for (const [who, addr] of [['overseer', S.overseer], ['liquidation', S.liquidation], ['market', S.market], ...wl.map(e => ['custody.' + e.symbol, e.custody_contract])]) {
  for (const act of ['liquidate_collateral', 'execute_bid', 'repay_stable_from_liquidation', 'liquidate', 'execute_liquidation']) {
    if (overBudget()) break; const r = await txsearch(`wasm._contract_address='${addr}' AND wasm.action='${act}'`, 3, 1); if (!r || !r.total) continue;
    out.liquidations.direct[who + ':' + act] = { total: r.total, via: r.rpc };
    for (const t of (r.txs || []).slice(0, 3)) if (!out.liquidations.samples.some(x => x.hash === t.hash)) out.liquidations.samples.push({ action_set: 'direct ' + who + ':' + act, hash: t.hash, height: Number(t.height), events: wasmOf(t) });
  }
}
if (!out.liquidations.samples.length) out.notes.push('no liquidation among ' + out.liquidations.queue_txs_read + ' queue txs or the direct searches — widen MAX_PAGES / use ARCHIVE_RPC');
if (overBudget()) out.notes.push('stopped at the time budget (' + MAX_MIN + ' min)');
save();
console.log(`\nsolid-probe 1.4: census ${Object.entries(out.census).map(([k, v]) => k + ' ' + v.rows).join(' · ')}\n  queue txs read ${out.liquidations.queue_txs_read} of ${out.liquidations.queue_total} · action sets:`);
for (const [k, v] of Object.entries(out.liquidations.action_sets).sort((a, b) => b[1].n - a[1].n)) console.log(`   ${v.n}× ${k}`);
console.log(`  liquidation samples: ${out.liquidations.samples.length} → ${OUT}`);

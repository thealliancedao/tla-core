// ── Solid (CDP) discovery probe 1.3 (2026-09-28) · 1.3: saves after every contract; the time budget and a contract cap are checked per contract; only the CDP core's answers are crawled · 1.2: cw20s get token_info/minter/balance only (no sweep); the fixture is saved after every phase and on cancel; MAX_MINUTES budget (40); tx_search one try per node, 20 s, scoped to the Overseer / liquidation contract · 1.1: seeded with the Overseer config the owner read; census of every borrower ─────────────────────────────────────────────────────────────────────────────────────
// One-off, READ-ONLY on chain. Input: the owner's six test txs (2026-09-27 14:30–14:34Z: ampLUNA collateral deposit+lock, SOLID borrow,
// repay, unlock+withdraw, bLUNA deposit+lock). From them it DISCOVERS every Solid contract the flow touches (Overseer and Collector
// are only labels on explorers), then asks each contract what it answers:
//   1. txs by hash (LCD) → every wasm event's contract + action + attribute keys (the event vocabulary a capture needs)
//   2. contract info (label, code id, admin) for each discovered contract
//   3. query VARIANTS: an unknown query {"__probe__":{}} makes a CosmWasm contract list the variants it accepts ("expected one of …")
//   4. every variant tried with {} / {borrower} / {address} / {user} / {limit} for the probe wallets — the answers ARE the fixtures
//      the reader is built on (the Credia lesson: parse the real shape, never the guessed one)
//   5. history size: tx_search total_count per contract and per action (public RPC; ARCHIVE_RPC when the secret is set) — how big
//      the backfill is, and whether a liquidation has ever happened (+ up to 3 liquidation txs verbatim, for the event shape)
// Output: docs/fixtures/<date>/solid-probe.json (the workflow commits it). A failed query is recorded with its error, never dropped.
import fs from 'fs';
const LCD = (process.env.LCD || 'https://terra-lcd.publicnode.com').replace(/\/$/, '');
const RPCS = [process.env.ARCHIVE_RPC, process.env.RPC_URL || 'https://terra-rpc.publicnode.com'].map(s => String(s || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '')).filter(Boolean);
const WALLETS = (process.env.WALLETS || 'terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw').split(',').map(s => s.trim()).filter(Boolean);
const TXS = (process.env.TXS || [
  '7A7A3C1B31F8FE31ED0686460D3275941DBFF06876B1C2E1F32158CFB8F60A4C',   // ampLUNA deposit_collateral + lock_collateral
  '6379F4EC8D310BF93795D0D0BFB34B2B5D70F43C8B92C35EA044977B4FD99DDF',   // borrow_stable 2.424546 SOLID (mint_fee 12122)
  'AFFADE5420E8461D8FED350D16A31C8727D95A1EAFDF4734DA8CBCECED2E2F56',   // repay_stable (burn + Collector)
  'D185CBD8655A5F83C089D0F924CFFD8115F3A2154002B05ECC90D1A383064C13',   // unlock_collateral + withdraw_collateral
  '028DD343AA1CC1267280C6D43A9856817F2027EE2B8D5A912D0DDE7AD88F3133',   // bLUNA deposit_collateral + lock_collateral
].join(',')).split(',').map(s => s.trim()).filter(Boolean);
const OUT = process.env.OUT || `docs/fixtures/${new Date().toISOString().slice(0, 10)}/solid-probe.json`;
// 1.1: the owner's own reads (2026-09-27) — Overseer = CAPA_OVERSEER (code 1431, admin terra1t380w… = the feeshare payout address);
// its config names the rest. Seeded so every one is probed even if an explorer-free tx lookup misses it.
const SEED = {
  overseer: 'terra10qnsw3wn4uaxs7en2kynhet2dsyy76lmprh2ptcz85d8hu59gkuqcpndnv',   // CAPA_OVERSEER (named by the liquidation queue's config)
  market: 'terra1h4cknjl5k0aysdhv0h4eqcaka620g8h69k8h0pjjccxvf9esfhws3cyqnc',
  oracle_liquidation_queue: 'terra199pgv9dymcg9q8xtwsxk7yakazmvlf5ptkqh4zadcv7k0yqsal2q6tq7mv',   // the queue's oracle ≠ the Overseer's — both probed
  liquidation_queue: 'terra188d4q69nen6vmwt7vcvz8lf54mc80cfvqtrznpmsrawftm86jkmsh4grzp',
  oracle: 'terra19z3qj8lwrhla6x58jt5338e3hktfrn6x63ua4226wk2c7psh62psfghzu7',
  collector: 'terra1uz33y5dfazxspyfdvw30dwmpa5hhm4908tetpq5t0sm0z0c63rlspfkaau',
  custody_ampluna: 'terra18uxq2k6wpsqythpakz5n6ljnuzyehrt775zkdclrtdtv6da63gmskqn7dq',
  custody_bluna: 'terra1fyfrqdf58nf4fev2amrdrytq5d63njulfa7sm75c0zu4pnr693dsqlr7p9',
};
const KNOWN = { SOLID: 'terra10aa3zdkrc7jwuf8ekl3zq7e7m42vmzqehcmu74e4egc7xkm5kr2s0muyst', AMPLUNA: 'terra1ecgazyd0waaj3g7l9cmy5gulhxkps2gmxu9ghducvuypjq68mq2s5lvsct', BLUNA: 'terra17aj4ty4sz4yhgm08na8drc0v03v2jwr3waxcqrwhajj729zhl7zqnpc0ml' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const UA = 'thealliancedao.com solid-probe/1.0 (one-off; contact via the site)';
async function getJson(url, tries = 4, timeoutMs = 30000) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { } if (r.ok) return { ok: true, json: j }; last = { ok: false, status: r.status, body: (j && (j.message || j.error)) || t.slice(0, 400) }; if (r.status < 500 && r.status !== 429) return last; }
    catch (e) { last = { ok: false, status: 0, body: e.message }; }
    await sleep(1000 * (i + 1) * 2);
  }
  return last;
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
async function smart(addr, q) { await sleep(150); const r = await getJson(`${LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${b64(q)}`); return r.ok ? { ok: true, data: r.json && r.json.data } : { ok: false, error: `HTTP ${r.status}: ${r.body}` }; }
const MAX_CONTRACTS = Number(process.env.MAX_CONTRACTS || 24);
const CORE_RE = /OVERSEER|MARKET|CUSTODY|Custody|LIQUIDATION|ORACLE|oracle|COLLECTOR/;   // 1.3: only the CDP's own contracts name further contracts to follow (1.2 crawled into Capapult governance / staking / community and never finished a round)
const T0 = Date.now(); const MAX_MIN = Number(process.env.MAX_MINUTES || 40); const overBudget = () => (Date.now() - T0) / 60000 > MAX_MIN;
const save = () => { try { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); out.elapsed_min = +((Date.now() - T0) / 60000).toFixed(1); fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); } catch (e) { console.error('save failed', e.message); } };
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { out.notes.push('run cancelled (' + sig + ') — saved what it had'); save(); process.exit(0); });
const out = { probe: 'solid-probe 1.3', ran_at: new Date().toISOString(), lcd: LCD, rpcs: RPCS.map(u => u.replace(/\/\/[^@/]*@/, '//')).map((u, i) => (i === 0 && process.env.ARCHIVE_RPC ? 'ARCHIVE_RPC (secret)' : u)), wallets: WALLETS, txs: {}, contracts: {}, history: {}, liquidation_samples: [], notes: [] };

// 1. txs → contracts + actions + attribute keys
const contracts = new Map();   // addr → { actions:Set, keys:{action:Set} , seen_in:[] }
for (const h of TXS) {
  const r = await getJson(`${LCD}/cosmos/tx/v1beta1/txs/${h}`);
  if (!r.ok) { out.txs[h] = { error: `HTTP ${r.status}: ${r.body}` }; continue; }
  const tr = r.json.tx_response; const msgs = (r.json.tx && r.json.tx.body && r.json.tx.body.messages) || [];
  const evs = (tr.events || []).filter(e => /^wasm/.test(e.type)).map(e => ({ type: e.type, attributes: e.attributes.map(a => ({ key: a.key, value: a.value })) }));
  out.txs[h] = { height: Number(tr.height), timestamp: tr.timestamp, code: tr.code, messages: msgs, wasm_events: evs };
  for (const e of evs) { const at = e.attributes; const c = (at.find(a => a.key === '_contract_address') || {}).value; if (!c) continue; const x = contracts.get(c) || { actions: new Set(), keys: {}, seen_in: new Set() }; x.seen_in.add(h); const act = at.filter(a => a.key === 'action').map(a => a.value).join('+') || e.type; x.actions.add(act); x.keys[act] = [...new Set([...(x.keys[act] || []), ...at.map(a => a.key)])]; for (const a of at) if (/^terra1[0-9a-z]{38}([0-9a-z]{20})?$/.test(a.value) && !contracts.has(a.value) && a.value.length === 64 && !WALLETS.includes(a.value)) { /* addresses named in attributes (e.g. to=Collector) */ contracts.set(a.value, contracts.get(a.value) || { actions: new Set(), keys: {}, seen_in: new Set(['attribute:' + a.key]) }); } contracts.set(c, x); }
}
for (const [role, a] of Object.entries(SEED)) { const x = contracts.get(a) || { actions: new Set(), keys: {}, seen_in: new Set() }; x.seen_in.add('seed:' + role); contracts.set(a, x); }
if (process.env.OVERSEER) { const x = contracts.get(process.env.OVERSEER) || { actions: new Set(), keys: {}, seen_in: new Set() }; x.seen_in.add('seed:overseer'); contracts.set(process.env.OVERSEER, x); }
// config answers name more contracts (overseer → liquidation queue, oracle, collector …): discover to a fixed point, max 3 rounds
const probeOne = async (addr) => {
  const info = await getJson(`${LCD}/cosmwasm/wasm/v1/contract/${addr}`);
  const ci = info.ok ? info.json.contract_info : null;
  const variants = await smart(addr, { __probe__: {} });
  const vs = (() => { const m = String(variants.error || '').match(/expected (?:one of )?(.+?)(?::|$| at line)/); return m ? [...m[1].matchAll(/`([a-z0-9_]+)`/g)].map(x => x[1]) : []; })();
  const answers = {};
  if (vs.includes('token_info')) {   // 1.2: a cw20 (LunaX, wrapped tokens, SOLID) — name, decimals, minter, the probe wallets' balances; no sweep
    for (const q of [{ token_info: {} }, { minter: {} }, ...WALLETS.map(w => ({ balance: { address: w } }))]) { const r = await smart(addr, q); answers[JSON.stringify(q)] = r.ok ? r.data : { error: r.error.slice(0, 200) }; }
    return { label: ci && ci.label, code_id: ci && ci.code_id, admin: ci && ci.admin, creator: ci && ci.creator, kind: 'cw20', query_variants: vs, answers };
  }
  for (const v of vs.slice(0, 40)) {
    const tries = [{}]; for (const w of WALLETS) tries.push({ borrower: w }, { address: w }, { user: w });
    tries.push({ limit: 30 });
    for (const arg of tries) {
      const q = { [v]: arg }; const r = await smart(addr, q);
      const key = v + ' ' + JSON.stringify(arg);
      if (r.ok) { answers[key] = r.data; if (Object.keys(arg).length === 0) break; }
      else if (!/missing field|unknown field|invalid type|Error parsing/.test(r.error)) answers[key] = { error: r.error.slice(0, 300) };
    }
  }
  return { label: ci && ci.label, code_id: ci && ci.code_id, admin: ci && ci.admin, creator: ci && ci.creator, query_variants: vs, variants_raw_error: vs.length ? undefined : String(variants.error || '').slice(0, 400), answers };
};
const skip = new Set([KNOWN.AMPLUNA, KNOWN.BLUNA]);   // LST tokens: not Solid's; SOLID token kept (minter = market)
for (let round = 0; round < 3; round++) {
  let added = 0;
  for (const [addr, x] of contracts) {
    if (out.contracts[addr] || skip.has(addr)) continue;
    if (overBudget()) { out.notes.push('discovery stopped at the time budget'); break; }
    if (Object.keys(out.contracts).length >= MAX_CONTRACTS) { out.notes.push(`discovery capped at ${MAX_CONTRACTS} contracts`); break; }
    const p = await probeOne(addr); p.events = { actions: [...x.actions], attribute_keys: x.keys, seen_in: [...x.seen_in] }; out.contracts[addr] = p; added++;
    console.log(`  ${addr.slice(0, 16)}… ${p.label || '?'} (code ${p.code_id}) · ${p.query_variants.length} query variants · ${Object.keys(p.answers).length} answers`);
    save();   // 1.3: after EVERY contract — a cancelled run keeps what it read
    if (p.kind !== 'cw20' && CORE_RE.test(p.label || '')) for (const v of Object.values(p.answers)) { const s = JSON.stringify(v || {}); for (const m of s.matchAll(/"(terra1[0-9a-z]{58})"/g)) if (!contracts.has(m[1]) && !skip.has(m[1]) && !WALLETS.includes(m[1])) contracts.set(m[1], { actions: new Set(), keys: {}, seen_in: new Set(['named by ' + addr.slice(0, 16)]) }); }
  }
  save();
  if (!added || overBudget()) break;
}
// 4b. CENSUS — every borrower, from the contracts themselves (Overseer all_collaterals; any *_infos / borrowers list), paged by
//     start_after until a short page; every collateral token named gets token_info (three are not in our token catalog yet)
out.census = {};
const pageAll = async (addr, variant, keyOf) => { const rows = []; let after = null; for (let p = 0; p < 300; p++) { if (overBudget()) return { rows, pages: p, note: 'stopped at the time budget' }; const arg = { limit: 30 }; if (after) arg.start_after = after; const r = await smart(addr, { [variant]: arg }); if (!r.ok) return { rows, error: r.error.slice(0, 300), pages: p }; const list = Object.values(r.data || {}).find(Array.isArray) || []; rows.push(...list); if (list.length < 30) return { rows, pages: p + 1 }; after = keyOf(list[list.length - 1]); if (!after) return { rows, pages: p + 1, note: 'no start_after key in the last row' }; } return { rows, pages: 300, note: 'page cap' }; };
for (const [addr, c] of Object.entries(out.contracts)) for (const v of c.query_variants) {
  if (!/^(all_collaterals|borrower_infos|borrowers|all_borrowers|all_bids|bids_by_user)$/.test(v)) continue;
  const res = await pageAll(addr, v, (row) => row.borrower || row.address || row.user || row.idx || row.bid_idx || null);
  out.census[`${addr} ${v}`] = { contract_label: c.label, rows: res.rows.length, pages: res.pages, error: res.error, note: res.note, data: res.rows };
  console.log(`  census ${c.label || addr.slice(0, 12)} ${v}: ${res.rows.length} rows${res.error ? ' (error: ' + res.error.slice(0, 80) + ')' : ''}`);
  save();
}
const collTokens = new Set(); for (const c of Object.values(out.census)) for (const row of c.data || []) for (const pair of (row.collaterals || [])) if (Array.isArray(pair)) collTokens.add(pair[0]);
out.collateral_tokens = {}; for (const t of collTokens) { const ti = await smart(t, { token_info: {} }); const mi = await getJson(`${LCD}/cosmwasm/wasm/v1/contract/${t}`); out.collateral_tokens[t] = { token_info: ti.ok ? ti.data : { error: ti.error }, label: mi.ok ? mi.json.contract_info.label : null }; }
// 5. history size + liquidation samples (tx_search)
async function txsearch(q, perPage = 1, order = 'desc', page = 1) {
  for (const rpc of RPCS) { if (overBudget()) return null; const r = await getJson(`${rpc}/tx_search?query=${encodeURIComponent('"' + q + '"')}&per_page=${perPage}&page=${page}&order_by=%22${order}%22`, 1, 20000); if (r.ok && r.json && r.json.result) return { rpc: rpc === RPCS[0] && process.env.ARCHIVE_RPC ? 'archive' : 'public', total: Number(r.json.result.total_count), txs: r.json.result.txs }; }
  return null;
}
const liqActions = new Set();
save();
const core = Object.keys(out.contracts).filter(a => out.contracts[a].kind !== 'cw20');
for (const addr of core) {
  if (overBudget()) { out.notes.push('history counts stopped at the time budget'); break; }
  const all = await txsearch(`wasm._contract_address='${addr}'`); out.history[addr] = { all_txs: all ? all.total : null, via: all && all.rpc, by_action: {} };
  for (const a of out.contracts[addr].events.actions) { for (const one of a.split('+')) { const r = await txsearch(`wasm._contract_address='${addr}' AND wasm.action='${one}'`); out.history[addr].by_action[one] = r ? r.total : null; } }
  for (const v of out.contracts[addr].query_variants) if (/liquidat/.test(v)) liqActions.add(v);
}
save();
const LIQ = Object.keys(out.contracts).find(a => /LIQUIDATION/i.test(out.contracts[a].label || '')) || SEED.liquidation_queue;
{ const r = await txsearch(`wasm._contract_address='${LIQ}'`, 5, 'desc'); if (r) { out.history['liquidation_contract_recent'] = { total: r.total, via: r.rpc }; for (const t of r.txs || []) out.liquidation_samples.push({ action: 'liquidation contract tx', hash: t.hash, height: Number(t.height), events: (t.tx_result.events || []).filter(e => /^wasm/.test(e.type)).map(e => ({ type: e.type, attributes: e.attributes.map(a => ({ key: a.key, value: a.value })) })) }); } }
const OV = Object.keys(out.contracts).find(a => /OVERSEER/i.test(out.contracts[a].label || '')) || SEED.overseer;
for (const act of ['liquidate_collateral', 'liquidate', 'execute_bid', 'execute_liquidation', ...liqActions]) {
  if (overBudget()) break;
  const r = await txsearch(`wasm._contract_address='${OV}' AND wasm.action='${act}'`, 3, 'desc') || await txsearch(`wasm._contract_address='${LIQ}' AND wasm.action='${act}'`, 3, 'desc'); if (!r) continue;
  out.history['action:' + act] = { total: r.total, via: r.rpc };
  for (const t of (r.txs || []).slice(0, 3)) out.liquidation_samples.push({ action: act, hash: t.hash, height: Number(t.height), events: (t.tx_result.events || []).filter(e => /^wasm/.test(e.type)).map(e => ({ type: e.type, attributes: e.attributes.map(a => ({ key: a.key, value: a.value })) })) });
}
if (!out.liquidation_samples.length) out.notes.push('no liquidation found by action name on the RPCs searched — the event vocabulary for liquidations is still unknown');
save();
console.log(`\nsolid-probe: ${Object.keys(out.txs).length} txs · ${Object.keys(out.contracts).length} contracts · ${out.liquidation_samples.length} liquidation samples → ${OUT}`);
for (const [a, c] of Object.entries(out.contracts)) console.log(`  ${a} ${c.label || '?'} · events ${c.events.actions.join(', ') || '—'} · history ${out.history[a] && out.history[a].all_txs}`);

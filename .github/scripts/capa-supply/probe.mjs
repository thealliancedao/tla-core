// ── CAPA supply probe v2 (2026-08-24) ─────────────────────────────────────────
// v2: per-wallet `all_staked_balances{address}` (the form the ve3 asset-staking
// contract answers — org capture-engine.js:520; v1's paginated form was rejected);
// every DAO voting-module shape reported (v1 stopped at the first that answered,
// leaving power-vs-staked-balance unresolved); gov state{} and SS reserve in summary.
// One-off, READ-ONLY. Reads every custody form CAPA can sit in, for a list of
// wallets AND at collection level, and prints the numbers so the CAPA supply-map
// duty (SPEC-capa-supply-map.md) can be gated against chain truth before it is
// written. Writes nothing, commits nothing.
//
// Buckets (per SPEC, two-level):
//   CAPA total supply = liquid + gov_staked + in_hub + in_lp(non-amp + amp, per DEX)
//   in_hub (ampCAPA)  = ampCAPA liquid + TLA non-amp + TLA amp receipt held + receipt staked in ampCAPA DAO
//
// Rules from doctrine: BATCH_CONCURRENCY ≤ 5 on shared LCDs; retry with backoff;
// a failed query is reported as null ("failed"), never coerced to 0.

const LCD = process.env.LCD || 'https://terra-lcd.publicnode.com';
const WALLETS = (process.env.WALLETS || [
  'terra1sffd4efk2jpdt894r04qwmtjqrrjfc52tmj6vkzjxqhd8qqu2drs3m5vzm', // aDAO treasury
  'terra1hr8zsfpch47qygc96c8e6rzkd2t7mafqx77ulw',                     // owner fixture wallet
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

const C = {
  CAPA_TOKEN:        'terra1t4p3u8khpd7f8qzurwyafxt648dya6mp6vur3vaapswt6m24gkuqrfdhar',   // cw20
  CAPA_GOV:          'terra1sf66d5vap897xlvv2hlcp4l20y4pp42r6ala4snk8mgd246jvufqwe0cnm',   // Solid governance staking
  AMPCAPA_HUB:       'terra186rpfczl7l2kugdsqqedegl4es4hp624phfc7ddy8my02a4e8lgq5rlx7y',   // Eris ampCAPA vault
  AMPCAPA_DENOM:     'factory/terra186rpfczl7l2kugdsqqedegl4es4hp624phfc7ddy8my02a4e8lgq5rlx7y/ampCAPA',
  VE3_COMPOUNDER:    'terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx',   // asset-compounding (amplp)
  TLA_STAKE_SINGLE:  'terra1qdz5qgafx88kp5mf6m2tah8742g4u5g2cek0m3jrgssexexk7g4qw6e23k',   // ve3 asset-staking, single bucket
  TLA_STAKE_PROJECT: 'terra1awq6t7jfakg9wfjn40fk3wzwmd57mvrqtt3a39z9rmet7wdjj3ysgw3lpa',   // ve3 asset-staking, project bucket
  AMPCAPA_DAO_VOTE:  'terra1juj3ymejnug9p92upphcq0prq4e0hpw6rcu20njf8tk7n9sl2wxqldr0mt',   // DAODAO voting module (stakes the amplp receipt)
  ASTRO_PAIR:        'terra183wqgrwa2k0uvlz99j57c496gfuwgtaccrhv4stcjzv3ydacl9zq0hmf25',   // Astroport CAPA-LUNA pair
  ASTRO_LP:          'terra1cg9t08mqa88us074mpwpuu8lp5w4jwtye3vaazll45w27at52cpsq7c564',   // its cw20 LP
  SS_LP_DENOM:       'factory/terra15rzp38yq2cqy2jnewc9vgzqguf3t2q0gqpv9evg8tckrtqp8x44qezhthc/uLP', // SkeletonSwap CAPA-LUNA LP (native)
  AMPLP_AMPCAPA:     'factory/terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx/44/single/amplp',
  AMPLP_ASTRO_LP:    'factory/terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx/42/project/amplp',
  AMPLP_SS_LP:       'factory/terra1zly98gvcec54m3caxlqexce7rus6rzgplz7eketsdz7nh750h2rqvu8uzx/43/project/amplp',
};
const SS_PAIR = C.SS_LP_DENOM.split('/')[1];   // the SS pool contract mints its own LP denom

// ── transport ────────────────────────────────────────────────────────────────
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
let inflight = 0; const MAX = 4; const queue = [];
const gate = () => new Promise(r => { const t = () => { if (inflight < MAX) { inflight++; r(); } else queue.push(t); }; t(); });
const release = () => { inflight--; const n = queue.shift(); if (n) n(); };
async function get(path, tries = 5) {
  await gate();
  try {
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(LCD + path, { signal: AbortSignal.timeout(20000) });
        if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (!r.ok) return { error: j.message || ('HTTP ' + r.status) };
        return j;
      } catch (e) { if (i === tries - 1) return { error: String(e.message || e) }; await new Promise(r => setTimeout(r, 400 * 2 ** i + Math.random() * 300)); }
    }
  } finally { release(); }
}
const smart = (addr, q) => get(`/cosmwasm/wasm/v1/contract/${addr}/smart/${b64(q)}`).then(j => j.error ? j : j.data);
const bank = (addr, denom) => get(`/cosmos/bank/v1beta1/balances/${addr}/by_denom?denom=${encodeURIComponent(denom)}`).then(j => j.error ? j : (j.balance?.amount ?? null));
const supply = (denom) => get(`/cosmos/bank/v1beta1/supply/by_denom?denom=${encodeURIComponent(denom)}`).then(j => j.error ? j : (j.amount?.amount ?? null));
// The probe's second job is to LEARN unknown query shapes: try candidates in
// order, report which one answered.
async function tryShapes(addr, shapes) {
  for (const q of shapes) { const r = await smart(addr, q); if (!r || r.error) continue; return { shape: Object.keys(q)[0], data: r }; }
  return { shape: null, data: null };
}
// v2: ask EVERY shape and report each — for contracts where two shapes answer
// with different semantics (voting power vs staked balance).
async function allShapes(addr, shapes) {
  const out = {};
  for (const q of shapes) { const r = await smart(addr, q); out[Object.keys(q)[0]] = (!r || r.error) ? { error: r?.error || 'no answer' } : r; }
  return out;
}
const num = (v, dec = 6) => v == null || v.error ? null : Number(v) / 10 ** dec;
const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null) return o[k]; return null; };

// ── collection level ─────────────────────────────────────────────────────────
async function collection() {
  const out = {};
  const ti = await smart(C.CAPA_TOKEN, { token_info: {} });
  out.capa_total_supply = num(ti?.total_supply);
  const hub = await smart(C.AMPCAPA_HUB, { state: {} });
  out.hub_state_raw = hub;
  out.ampcapa_total_supply = num(await supply(C.AMPCAPA_DENOM));
  out.ampcapa_exchange_rate = hub && !hub.error ? Number(pick(hub, ['exchange_rate'])) : null;
  out.capa_in_hub = hub && !hub.error ? num(pick(hub, ['total_utoken', 'total_ustake', 'total_native'])) : null;
  const rates = await smart(C.VE3_COMPOUNDER, { amplp_exchange_rates: {} });
  out.amplp_exchange_rates_raw = rates;
  out.amplp_supply = { ampcapa: num(await supply(C.AMPLP_AMPCAPA)), astro_lp: num(await supply(C.AMPLP_ASTRO_LP)), ss_lp: num(await supply(C.AMPLP_SS_LP)) };
  out.tla_total_staked = { single: await smart(C.TLA_STAKE_SINGLE, { total_staked_balances: {} }), project: await smart(C.TLA_STAKE_PROJECT, { total_staked_balances: {} }) };
  out.ampcapa_dao_total_power = await tryShapes(C.AMPCAPA_DAO_VOTE, [{ total_power_at_height: {} }, { total_staked: {} }, { total_value: {} }]);
  out.capa_gov_totals = await tryShapes(C.CAPA_GOV, [{ state: {} }, { config: {} }, { total_staked: {} }, { info: {} }]);
  const pool = await smart(C.ASTRO_PAIR, { pool: {} });
  out.astro_pool_raw = pool;
  const lpTi = await smart(C.ASTRO_LP, { token_info: {} });
  out.astro_lp_total_supply = num(lpTi?.total_supply);
  if (pool && !pool.error && out.astro_lp_total_supply) {
    const capaSide = (pool.assets || []).find(a => JSON.stringify(a.info).includes(C.CAPA_TOKEN));
    out.astro_capa_reserve = num(capaSide?.amount);
    out.astro_capa_per_lp = out.astro_capa_reserve / out.astro_lp_total_supply;
  }
  const ssPool = await tryShapes(SS_PAIR, [{ pool: {} }, { pair: {} }, { config: {} }]);
  out.ss_pool_raw = ssPool; out.ss_lp_total_supply = num(await supply(C.SS_LP_DENOM));
  return out;
}

// ── per wallet ───────────────────────────────────────────────────────────────
async function wallet(w, col) {
  const o = { wallet: w };
  o.capa_liquid = num(pick(await smart(C.CAPA_TOKEN, { balance: { address: w } }), ['balance']));
  o.capa_gov_staked = await tryShapes(C.CAPA_GOV, [{ staker: { address: w } }, { staked_balance: { address: w } }, { stake: { address: w } }, { balance: { address: w } }, { staker_info: { staker: w } }]);
  o.ampcapa_liquid = num(await bank(w, C.AMPCAPA_DENOM));
  // TLA staking per wallet (v2): the contract answers all_staked_balances{address}
  // with every asset the wallet has staked in that bucket — cw20 LP = non-amp,
  // compounder factory denom = amplified (org capture-engine classifyStakeMechanism).
  const s1 = await smart(C.TLA_STAKE_SINGLE, { all_staked_balances: { address: w } });
  const s2 = await smart(C.TLA_STAKE_PROJECT, { all_staked_balances: { address: w } });
  o.tla_single_staked = s1 && !s1.error ? s1 : null;
  o.tla_project_staked = s2 && !s2.error ? s2 : null;
  // TLA amp: the receipt is a bank denom — held liquid, or staked in the DAO.
  o.amplp_ampcapa_liquid = num(await bank(w, C.AMPLP_AMPCAPA));
  o.amplp_astro_lp_liquid = num(await bank(w, C.AMPLP_ASTRO_LP));
  o.amplp_ss_lp_liquid = num(await bank(w, C.AMPLP_SS_LP));
  o.ampcapa_dao_staked = await allShapes(C.AMPCAPA_DAO_VOTE, [{ voting_power_at_height: { address: w } }, { staked_balance_at_height: { address: w } }, { staked_balance: { address: w } }, { claims: { address: w } }]);
  // LP held liquid (not staked anywhere)
  o.astro_lp_liquid = num(pick(await smart(C.ASTRO_LP, { balance: { address: w } }), ['balance']));
  o.ss_lp_liquid = num(await bank(w, C.SS_LP_DENOM));
  return o;
}

(async () => {
  console.log(`CAPA supply probe · LCD ${LCD} · ${new Date().toISOString()}`);
  const col = await collection();
  const ws = []; for (const w of WALLETS) ws.push(await wallet(w, col));
  const report = { probed_at: new Date().toISOString(), lcd: LCD, collection: col, wallets: ws };
  console.log('\n=== SUMMARY (null = query failed / shape unknown; 0 = confirmed empty) ===');
  console.log(`CAPA total supply       ${col.capa_total_supply}`);
  console.log(`CAPA in hub (ampCAPA)   ${col.capa_in_hub}  · ampCAPA supply ${col.ampcapa_total_supply} · rate ${col.ampcapa_exchange_rate}`);
  console.log(`Astro CAPA reserve      ${col.astro_capa_reserve} · CAPA per LP ${col.astro_capa_per_lp}`);
  console.log(`amplp supply            ${JSON.stringify(col.amplp_supply)}`);
  console.log(`gov totals              shape=${col.capa_gov_totals.shape} ${JSON.stringify(col.capa_gov_totals.data)?.slice(0, 300)}`);
  console.log(`DAO total power         shape=${col.ampcapa_dao_total_power.shape} ${JSON.stringify(col.ampcapa_dao_total_power.data)?.slice(0, 160)}`);
  console.log(`SS pool                 shape=${col.ss_pool_raw.shape} ${JSON.stringify(col.ss_pool_raw.data)?.slice(0, 300)} · SS LP supply ${col.ss_lp_total_supply}`);
  console.log(`TLA totals (single)     ${JSON.stringify(col.tla_total_staked.single)?.slice(0, 300)}`);
  console.log(`TLA totals (project)    ${JSON.stringify(col.tla_total_staked.project)?.slice(0, 400)}`);
  for (const o of ws) {
    console.log(`\n-- ${o.wallet}`);
    console.log(`  CAPA liquid                 ${o.capa_liquid}`);
    console.log(`  CAPA gov-staked             shape=${o.capa_gov_staked.shape} ${JSON.stringify(o.capa_gov_staked.data)?.slice(0, 160)}`);
    console.log(`  ampCAPA liquid              ${o.ampcapa_liquid}`);
    console.log(`  TLA single-bucket staked    ${o.tla_single_staked == null ? 'null' : JSON.stringify(o.tla_single_staked).slice(0, 300)}`);
    console.log(`  amplp receipt liquid        ampCAPA ${o.amplp_ampcapa_liquid} · astroLP ${o.amplp_astro_lp_liquid} · ssLP ${o.amplp_ss_lp_liquid}`);
    console.log(`  DAO module (all shapes)     ${JSON.stringify(o.ampcapa_dao_staked).slice(0, 400)}`);
    console.log(`  TLA project-bucket staked   ${o.tla_project_staked == null ? 'null' : JSON.stringify(o.tla_project_staked).slice(0, 300)}`);
    console.log(`  LP liquid                   astro ${o.astro_lp_liquid} · ss ${o.ss_lp_liquid}`);
  }
  const fs = await import('node:fs'); fs.writeFileSync('capa-supply-probe.json', JSON.stringify(report, null, 2));
  console.log('\nFull report written to capa-supply-probe.json (uploaded as a run artifact).');
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });

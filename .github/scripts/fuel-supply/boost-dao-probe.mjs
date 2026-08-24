// ── Boost DAO (Neutron) probe v1 (2026-08-24) ────────────────────────────────
// One-off, READ-ONLY. The FUEL whales panel on fuel-tool.html shows Terra IBC
// balances only; Boost DAO staking (the FUEL governance position of every
// member) and the DAO treasury live on NEUTRON. This probe learns the shapes
// and prints the numbers so a `fuel supply map` duty can be gated against chain
// truth before it is written — the same probe → SPEC → duty path CAPA took.
// Writes nothing, commits nothing.
//
// What it reads (every shape candidate reported, never assumed):
//   1. DAO core `dump_state` / `config` / `voting_module` / `proposal_modules`
//   2. Voting module `info`, `config`/`dao`/`denom`, `total_power_at_height`,
//      `list_stakers` (paginated) — and `claims{address}` for the first pages
//   3. Bank balances of the core (treasury) + the voting module (custody)
//   4. Supply of every FUEL-looking denom seen, to reconcile Terra IBC ↔ Neutron
// Doctrine: ≤4 in flight on a public LCD; retry with backoff; null = failed,
// never 0.
const LCDS = (process.env.LCD || 'https://neutron-rest.publicnode.com,https://rest-lb.neutron.org,https://rest.lavenderfive.com/neutron').split(',').map(s => s.trim()).filter(Boolean);
const CORE = process.env.DAO_CORE || 'neutron1ej43fvrmw40dg6xj40mmh822a8xz98rt5ad2p9tj2tgtgxw0zalsvvzm43';   // Boost DAO (owner-supplied 2026-08-24; verify via dump_state.config.name)
const TERRA_FUEL_IBC = 'ibc/4B44179AC2F0BEE50C16A673B3B886398988692885B2848A1C8AEF27148B3961';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
let LCD = null; let inflight = 0; const MAX = 4; const queue = [];
const gate = () => new Promise(r => { const t = () => { if (inflight < MAX) { inflight++; r(); } else queue.push(t); }; t(); });
const release = () => { inflight--; const n = queue.shift(); if (n) n(); };
async function get(path, tries = 4) {
  await gate();
  try {
    const bases = LCD ? [LCD] : LCDS;
    for (const base of bases) {
      for (let i = 0; i < tries; i++) {
        try {
          const r = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
          if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
          const j = await r.json();
          if (!r.ok) return { error: j.message || ('HTTP ' + r.status) };
          if (!LCD) { LCD = base; console.log('LCD answering:', base); }
          return j;
        } catch (e) { if (i === tries - 1) break; await new Promise(r => setTimeout(r, 400 * 2 ** i + Math.random() * 300)); }
      }
    }
    return { error: 'all LCDs failed for ' + path.slice(0, 60) };
  } finally { release(); }
}
const smart = (addr, q) => get(`/cosmwasm/wasm/v1/contract/${addr}/smart/${b64(q)}`).then(j => j.error ? j : j.data);
const balances = (addr) => get(`/cosmos/bank/v1beta1/balances/${addr}?pagination.limit=200`).then(j => j.error ? j : j.balances);
const supply = (denom) => get(`/cosmos/bank/v1beta1/supply/by_denom?denom=${encodeURIComponent(denom)}`).then(j => j.error ? j : j.amount);
const trace = (hash) => get(`/ibc/apps/transfer/v1/denom_traces/${hash}`).then(j => j.error ? j : j.denom_trace);
async function tryShapes(addr, shapes) { const out = {}; for (const q of shapes) { const r = await smart(addr, q); out[Object.keys(q)[0]] = (!r || r.error) ? { error: r?.error || 'no answer' } : r; } return out; }
const short = (o, n = 400) => JSON.stringify(o)?.slice(0, n);

(async () => {
  console.log(`Boost DAO probe · core ${CORE} · ${new Date().toISOString()}`);
  const report = { probed_at: new Date().toISOString(), core: CORE };

  // 1. core
  report.core_state = await tryShapes(CORE, [{ dump_state: {} }, { config: {} }, { voting_module: {} }, { proposal_modules: {} }, { info: {} }]);
  const ds = report.core_state.dump_state;
  const votingModule = (ds && !ds.error && ds.voting_module) || (report.core_state.voting_module && !report.core_state.voting_module.error ? report.core_state.voting_module : null);
  console.log(`core name: ${short(ds?.config?.name || report.core_state.config?.name, 80)} · voting_module: ${votingModule} · proposal_modules: ${short(ds?.proposal_modules, 200)}`);

  // 2. voting module
  if (votingModule) {
    report.voting = await tryShapes(votingModule, [{ info: {} }, { config: {} }, { dao: {} }, { denom: {} }, { token_contract: {} }, { total_power_at_height: {} }, { get_config: {} }]);
    console.log(`voting module info: ${short(report.voting.info, 200)} · denom: ${short(report.voting.denom, 200)} · total_power: ${short(report.voting.total_power_at_height, 120)}`);
    const stakers = []; let start = null, pages = 0, complete = false, err = null;
    while (pages < 200) {
      pages++;
      const r = await smart(votingModule, start ? { list_stakers: { limit: 30, start_after: start } } : { list_stakers: { limit: 30 } });
      if (!r || r.error) { err = r?.error; break; }
      const rows = r.stakers || [];
      for (const s of rows) stakers.push(s);
      if (rows.length < 30) { complete = true; break; }
      start = rows[rows.length - 1].address;
    }
    const sum = stakers.reduce((a, s) => a + Number(s.balance || 0), 0);
    report.stakers = { complete, pages, error: err, count: stakers.length, sum_micro: sum, sample: stakers.slice(0, 3), all: stakers };
    console.log(`list_stakers: ${stakers.length} stakers (${complete ? 'complete' : 'INCOMPLETE ' + err}) · Σ balance ${sum / 1e6} · vs total_power ${Number(report.voting.total_power_at_height?.power || 0) / 1e6}`);
    // claims shape for the top 3 stakers
    report.claims_sample = {};
    for (const s of stakers.slice(0, 3)) report.claims_sample[s.address] = await tryShapes(votingModule, [{ claims: { address: s.address } }, { voting_power_at_height: { address: s.address } }]);
    console.log(`claims sample: ${short(report.claims_sample, 500)}`);
    report.voting_bank = await balances(votingModule);
    console.log(`voting module bank: ${short(report.voting_bank, 400)}`);
  } else console.log('voting module NOT resolved — read core_state shapes in the artifact');

  // 3. treasury
  report.treasury_bank = await balances(CORE);
  console.log(`treasury (core) bank: ${short(report.treasury_bank, 600)}`);

  // 4. FUEL denom reconciliation: any denom containing "fuel" (factory or ibc) on either contract → supply + trace
  const denoms = new Set();
  for (const b of [...(Array.isArray(report.voting_bank) ? report.voting_bank : []), ...(Array.isArray(report.treasury_bank) ? report.treasury_bank : [])]) if (/fuel/i.test(b.denom) || b.denom.startsWith('ibc/')) denoms.add(b.denom);
  const vmDenom = report.voting?.denom; if (vmDenom && !vmDenom.error) { const d = vmDenom.denom || vmDenom; if (typeof d === 'string') denoms.add(d); }
  report.denoms = {};
  for (const d of denoms) report.denoms[d] = { supply: await supply(d), trace: d.startsWith('ibc/') ? await trace(d.slice(4)) : null };
  console.log(`denoms seen: ${short(report.denoms, 800)}`);
  console.log(`Terra-side FUEL IBC: ${TERRA_FUEL_IBC} — compare its Terra supply (fuel-tool) to the Neutron native supply above to size the bridged share.`);

  const fs = await import('node:fs'); fs.writeFileSync('boost-dao-probe.json', JSON.stringify(report, null, 2));
  console.log('\nFull report written to boost-dao-probe.json (run artifact).');
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });

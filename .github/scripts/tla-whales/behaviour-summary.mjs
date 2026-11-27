#!/usr/bin/env node
// tla-whales behaviour-summary 0.1.1 (2026-11-27) — COUNTS ONLY, NO WALLET NAMED, NO NODE.
// 0.1.1: the first run's figures were not fit to quote and the file did not say so — (a) the stored history names no exchange
//   address, so every transfer to an exchange sits under "external"; (b) bridge inflows in some groups are far larger than what
//   those accounts hold. The file now carries status = 'first look', lists what it found wrong with itself, says per group and
//   window whether ONE account is more than half of the bridge inflow, and gives the bridge inflow by token (token sums, no wallet).
// The owner: "shows if they are building liquidity and or selling the rewards … who is actually participating in TLA … lets get
// that process started." Before anything is published per account, this answers the question for GROUPS of accounts:
// for the accounts on the whale list (tla-whales/current.json), what does the stored wallet history (the deep-walk derive, in the
// private archive REPO — built 26 Nov from transactions already walked) say about value crossing the wallet's boundary:
//   bridge   — in from / out to another chain          exchange — in from / out to an exchange address (curated list or the derive's rule)
//   external — in from / out to another plain wallet   member   — to / from another walked wallet     registry — to / from a DAO
// each at the price of the day, per window (all time · last 52 weeks · last 12 weeks), beside the Alliance rewards the same accounts
// have claimed (the public flow record, all time).
// It reads FILES. It never calls a node — it refuses to run if a node address is present. It writes ONE public file,
// tla-whales/behaviour-summary.json: sums and counts per group, never an address; a group of fewer than MIN_GROUP accounts is withheld.
// What it does NOT say: why value moved. "Out to another chain" is not "sold" and not "the rewards" — it is every token that left.
import fs from 'fs'; import path from 'path'; import zlib from 'zlib';
export const VERSION = 'tla-whales-behaviour-0.1.1';
export const MIN_GROUP = 5; const CLASSES = ['bridge', 'exchange', 'external', 'member', 'registry']; const WINDOWS = [['all', null], ['last_52_weeks', 52], ['last_12_weeks', 12]];
const r0 = (x) => Math.round(x || 0), r1 = (x) => Math.round((x || 0) * 10) / 10;
const ADDR = /terra1[0-9a-z]{38,58}/;

export function summarise({ whales, readHistory, log = () => { } }) {
  const P = (whales.pools || []).filter((p) => p.holders && p.holders.length); const AC = whales.accounts || {}; const H = new Map();
  for (const p of P) for (const h of p.holders) { const e = H.get(h.a) || H.set(h.a, { a: h.a, kind: h.kind, usd: 0, d: 0, am: 0 }).get(h.a); const s = p.staked_usd || 0; e.usd += h.pct / 100 * s; e.d += (h.direct_pct || 0) / 100 * s; e.am += (h.amp_pct || 0) / 100 * s; }
  const all = [...H.values()].sort((x, y) => y.usd - x.usd || (x.a < y.a ? -1 : 1)); all.forEach((e, i) => { e.rank = i + 1; }); const total = all.reduce((t, e) => t + e.usd, 0);
  const cov = { holders: all.length, with_history: 0, without_history: { accounts: 0, contracts: 0 }, staked_usd: r0(total), staked_usd_with_history: 0, unreadable: 0 }; let weeksTo = null, weeksFrom = null, hv = new Set(), unpriced = 0;
  for (const e of all) { let F = null; try { F = readHistory(e.a); } catch (err) { cov.unreadable++; F = null; }
    if (!F || !Array.isArray(F.weeks) || !F.flows_usd) { cov.without_history[e.kind === 'contract' ? 'contracts' : 'accounts']++; continue; }
    cov.with_history++; cov.staked_usd_with_history += e.usd; const W = F.weeks.length; const last = F.weeks[W - 1], first = F.weeks[0]; if (!weeksTo || last > weeksTo) weeksTo = last; if (!weeksFrom || first < weeksFrom) weeksFrom = first; if (F.version) hv.add(F.version); unpriced += Number((F.checks || {}).unpriced_flows) || 0;
    e.f = {}; for (const [wn, n] of WINDOWS) { const from = n == null ? 0 : Math.max(0, W - n); const o = {}; for (const c of CLASSES) { const x = F.flows_usd[c]; let i = 0, u = 0; if (x) for (let k = from; k < W; k++) { i += Number(x.in[k]) || 0; u += Number(x.out[k]) || 0; } o[c] = { in: i, out: u }; } e.f[wn] = o; }
    e.tok = {}; const wk = F.weeks; for (const [wn, n] of WINDOWS) { const fromDay = n == null ? '' : wk[Math.max(0, W - n)]; const m = {}; for (const r of F.received || []) if (r && r.class === 'bridge' && r.usd != null && String(r.d) >= fromDay) m[r.token] = (m[r.token] || 0) + Number(r.usd); e.tok[wn] = m; } }
  cov.staked_usd_with_history = r0(cov.staked_usd_with_history); cov.staked_value_with_history_pct = total ? r1(cov.staked_usd_with_history / total * 100) : null;
  const clm = (e) => (AC[e.a] && AC[e.a].clm_usd) || 0; const held = (e) => (e.d > 0.005 && e.am > 0.005 ? 'both ways' : e.am > 0.005 ? 'amplified only' : e.d > 0.005 ? 'staked directly only' : 'no value on record');
  const GROUPS = [['all accounts with history', () => true], ['largest 10 by staked value', (e) => e.rank <= 10], ['11th to 25th', (e) => e.rank > 10 && e.rank <= 25], ['26th to 100th', (e) => e.rank > 25 && e.rank <= 100], ['all others', (e) => e.rank > 100],
    ['staked directly only', (e) => held(e) === 'staked directly only'], ['amplified only', (e) => held(e) === 'amplified only'], ['both ways', (e) => held(e) === 'both ways'],
    ['has voting power', (e) => !!(AC[e.a] && AC[e.a].vp > 0)], ['has placed bribes', (e) => !!(AC[e.a] && AC[e.a].brb_n > 0)]];
  const groups = {}; for (const [name, f] of GROUPS) { const g = all.filter((e) => e.f && f(e)); if (g.length < MIN_GROUP) { groups[name] = { accounts: g.length, withheld: `fewer than ${MIN_GROUP} accounts — figures withheld so no single account can be worked out` }; continue; }
    const o = { accounts: g.length, staked_usd: r0(g.reduce((t, e) => t + e.usd, 0)), share_of_all_staked_pct: total ? r1(g.reduce((t, e) => t + e.usd, 0) / total * 100) : null, alliance_rewards_claimed_usd_all_time: r0(g.reduce((t, e) => t + clm(e), 0)), windows: {} };
    for (const [wn] of WINDOWS) { const w = {}; for (const c of CLASSES) w[c] = { in_usd: r0(g.reduce((t, e) => t + e.f[wn][c].in, 0)), out_usd: r0(g.reduce((t, e) => t + e.f[wn][c].out, 0)) };
      const off = (e) => e.f[wn].bridge.out + e.f[wn].exchange.out - e.f[wn].bridge.in - e.f[wn].exchange.in;   // net value that left for another chain or an exchange (negative = came in)
      w.net_out_to_other_chains_and_exchanges_usd = r0(g.reduce((t, e) => t + off(e), 0)); w.accounts_net_out = g.filter((e) => off(e) > 1).length; w.accounts_net_in = g.filter((e) => off(e) < -1).length; w.accounts_neither = g.length - w.accounts_net_out - w.accounts_net_in;
      const bi = g.map((e) => e.f[wn].bridge.in), biSum = bi.reduce((t, x) => t + x, 0); w.one_account_is_over_half_of_bridge_in = biSum > 0 && Math.max(...bi) > biSum / 2;
      if (name === 'all accounts with history') { const m = {}; for (const e of g) for (const [t, v] of Object.entries(e.tok[wn])) m[t] = (m[t] || 0) + v; w.bridge_in_by_token = Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([token, v]) => ({ token: String(token).slice(0, 24), usd: r0(v) })); }
      if (wn === 'all') w.accounts_net_out_more_than_they_claimed = g.filter((e) => clm(e) > 0 && off(e) > clm(e)).length;
      o.windows[wn] = w; }
    groups[name] = o; }
  const A0 = groups['all accounts with history']; const problems = [];
  if (A0 && A0.windows && A0.windows.all.exchange.in_usd + A0.windows.all.exchange.out_usd === 0) problems.push('The stored history names no exchange address, so nothing is under "exchange": a transfer to or from an exchange is counted under "external" (another plain wallet). "Out to an exchange" cannot be told apart yet.');
  for (const [gn, g] of Object.entries(groups)) for (const [wn, w] of Object.entries(g.windows || {})) if (g.staked_usd > 0 && w.bridge.in_usd > 10 * g.staked_usd) problems.push(`"${gn}", ${wn.replace(/_/g, ' ')}: bridge inflow ($${w.bridge.in_usd.toLocaleString('en-US')}) is more than ten times what the group has staked ($${g.staked_usd.toLocaleString('en-US')})${w.one_account_is_over_half_of_bridge_in ? ', and one account is more than half of it' : ''} — whole-wallet activity (a wallet does far more than hold this liquidity), value passing through, or a price that is wrong; not checked.`);
  const doc = { schemaVersion: 1, version: VERSION, status: 'first look — NOT checked, not for quoting. It exists to show what the stored history can support before anything is shown per account.', found_wrong_with_itself: problems, built: new Date().toISOString(), whales_read_at: whales.capturedAt || null, whales_version: whales.version || null, history_weeks: { from: weeksFrom, to: weeksTo }, history_versions: [...hv].sort(),
    how: { what: 'For the accounts on the whale list, value crossing the wallet boundary in the stored wallet history, by kind and window, beside the Alliance rewards the same accounts have claimed. Sums and counts per group — no account is named.',
      classes: 'bridge = from / to another chain · exchange = from / to an exchange address · external = from / to another plain wallet · member = from / to another walked wallet · registry = from / to a DAO. Each valued at the price of the day; a flow with no price that day is not in a sum.',
      net_out: 'net_out_to_other_chains_and_exchanges_usd = bridge out + exchange out − bridge in − exchange in. Negative = more came in than went out.',
      limits: 'This is every token that crossed, not "the rewards": a transfer out is not a sale, and the data does not say why value moved. A swap on a Terra DEX stays inside the wallet and is not counted here. The history is weekly and ends at history_weeks.to; contracts on the list (they hold for others) and accounts never walked have no history and are not in any figure. Rewards claimed are all-time from the public flow record; the windows apply to the flows only.',
      withheld: `a group of fewer than ${MIN_GROUP} accounts shows its size only` },
    coverage: cov, unpriced_boundary_flows: unpriced, groups };
  const txt = JSON.stringify(doc, null, 1); if (ADDR.test(txt)) throw new Error('the summary would carry an address — NOT written');
  log(`behaviour summary: ${cov.with_history}/${cov.holders} holders with history (${cov.staked_value_with_history_pct}% of staked value) · without: ${cov.without_history.accounts} accounts, ${cov.without_history.contracts} contracts · history ${weeksFrom} → ${weeksTo}`);
  return { doc, txt };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const k of ['ARCHIVE_RPC', 'ARCHIVE_LCD', 'ARCHIVE_URL', 'LCD', 'RPC']) if (process.env[k]) { console.error(`refusing to run: ${k} is set — this job reads stored files only and must have no node address`); process.exit(1); }
  const ARCHIVE = process.env.ARCHIVE_DIR || 'archive', CORE = process.env.CORE_DIR || '.'; const whales = JSON.parse(fs.readFileSync(path.join(CORE, 'tla-whales/current.json'), 'utf8'));
  const readHistory = (a) => { const f = path.join(ARCHIVE, 'derived/history', a.slice(-1), a + '.json.gz'); if (!fs.existsSync(f)) return null; return JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8')); };
  const { txt } = summarise({ whales, readHistory, log: console.log }); fs.writeFileSync(path.join(CORE, 'tla-whales/behaviour-summary.json'), txt + '\n'); console.log('written: tla-whales/behaviour-summary.json (counts only)');
}

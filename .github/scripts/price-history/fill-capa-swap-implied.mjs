#!/usr/bin/env node
// fill-capa-swap-implied.mjs 1.0.0 (2026-11-27) — a LABELLED repair of the price oracle: CAPA on the days the oracle has none.
// The owner, on "no price" beside CAPA bribes: "we surely have token prices in our data, we have had this for months?"
// What was wrong: the oracle's past prices are CoinGecko's, and CoinGecko has NO CAPA price from 2024-04-15 to 2025-08-27
// (500 days). Every product that looks a CAPA price up in that window gets nothing — bribes placed then read "no price".
// What we do hold: price-history/reserve-implied — one LUNA↔CAPA swap a day from the two LUNA-CAPA pools, from 2025-01-07 on.
// The repair: for a day with NO CAPA in the oracle and at least one such swap,
//     CAPA usd = (LUNA paid per CAPA received, fees put back; the day's swaps weighted by their LUNA size) × the oracle's LUNA usd that day
// written as { usd, src: 'LUNA×swap(LUNA-CAPA)', repair: 'capa-swap-implied', repaired_at, samples, luna_volume }.
// It NEVER touches a day that already has a CAPA price, and writes nothing for a day with no swap (2024-04-15 → 2025-01-06 stays blank).
// Checked before it writes: on every day where the oracle HAS CoinGecko's CAPA and a swap exists, the same formula must agree with
// CoinGecko (median within 2%, nine days in ten within 5%) — otherwise it refuses.
//   node fill-capa-swap-implied.mjs --root <tla-core>            (dry run: the figures, nothing written)
//   node fill-capa-swap-implied.mjs --root <tla-core> --write
import fs from 'fs'; import path from 'path';
export const VERSION = 'capa-swap-implied-1.0.0';
export const CAPA = 'terra1t4p3u8khpd7f8qzurwyafxt648dya6mp6vur3vaapswt6m24gkuqrfdhar'; const POOLS = new Set(['LUNA-CAPA', 'CAPA-LUNA']);
/** one swap row → { day, luna_per_capa, luna } or null. Fees and spread are put back, so it is the pool's price, not the trader's. */
export function sampleOf(x) { if (!x || !POOLS.has(x.pool_name) || !x.date) return null; const off = Number(x.offer_amount), ret = Number(x.return_amount) + Number(x.commission_amount || 0) + Number(x.spread_amount || 0); if (!(off > 0) || !(ret > 0)) return null;
  if (x.offer_asset === 'uluna' && x.ask_asset === CAPA) return { day: x.date, luna_per_capa: off / ret, luna: off / 1e6 }; if (x.offer_asset === CAPA && x.ask_asset === 'uluna') return { day: x.date, luna_per_capa: ret / off, luna: ret / 1e6 }; return null; }
/** samples → Map day → { luna_per_capa (size-weighted), samples, luna_volume } */
export function byDay(samples) { const m = new Map(); for (const s of samples) { const e = m.get(s.day) || m.set(s.day, { w: 0, v: 0, n: 0 }).get(s.day); e.w += s.luna; e.v += s.luna_per_capa * s.luna; e.n++; } const out = new Map(); for (const [d, e] of m) if (e.w > 0) out.set(d, { luna_per_capa: e.v / e.w, samples: e.n, luna_volume: Math.round(e.w * 100) / 100 }); return out; }
/** months = Map 'YYYY/MM' → month doc; implied = byDay(...). Returns { fills: [{month, day, row}], check } and changes nothing. */
export function plan(months, implied, now) { const ratios = [], fills = []; const at = new Date(now || Date.now()).toISOString();
  for (const [mk, doc] of months) for (const [day, v] of Object.entries(doc.days || {})) { const im = implied.get(day), L = v && v.LUNA && typeof v.LUNA.usd === 'number' ? v.LUNA.usd : null; if (!im || !L) continue; const have = v.CAPA && typeof v.CAPA.usd === 'number' ? v.CAPA : null;
      if (have) { if (have.repair !== 'capa-swap-implied') ratios.push(im.luna_per_capa * L / have.usd); continue; }
      fills.push({ month: mk, day, row: { usd: +(im.luna_per_capa * L).toPrecision(8), src: 'LUNA×swap(LUNA-CAPA)', repair: 'capa-swap-implied', repaired_at: at, samples: im.samples, luna_volume: im.luna_volume } }); }
  ratios.sort((a, b) => a - b); const q = (p) => (ratios.length ? ratios[Math.min(ratios.length - 1, Math.floor(ratios.length * p))] : null);
  const check = { overlap_days: ratios.length, median_ratio: q(0.5) == null ? null : +q(0.5).toFixed(4), within_5pct: ratios.filter((r) => r >= 0.95 && r <= 1.05).length, within_10pct: ratios.filter((r) => r >= 0.9 && r <= 1.1).length };
  check.ok = check.overlap_days >= 60 && Math.abs(check.median_ratio - 1) <= 0.02 && check.within_5pct / check.overlap_days >= 0.9;
  fills.sort((a, b) => a.day.localeCompare(b.day)); return { fills, check, at }; }
/** apply a plan to the month docs (in memory): only blank days are written; each touched month records the repair once */
export function apply(months, p) { const touched = new Map(); for (const f of p.fills) { const doc = months.get(f.month), d = doc.days[f.day]; if (d.CAPA && typeof d.CAPA.usd === 'number') throw new Error(`refusing to overwrite an existing CAPA price on ${f.day}`); d.CAPA = f.row; touched.set(f.month, (touched.get(f.month) || 0) + 1); }
  for (const [mk, n] of touched) { const doc = months.get(mk); doc.meta = doc.meta || {}; doc.meta.repairs = (doc.meta.repairs || []).filter((r) => !(r.repair === 'capa-swap-implied' && r.at === p.at)); doc.meta.repairs.push({ repair: 'capa-swap-implied', by: VERSION, at: p.at, symbol: 'CAPA', days_filled: n, rule: 'CAPA had no price on these days (CoinGecko holds none from 2024-04-15 to 2025-08-27). Filled from price-history/reserve-implied: LUNA per CAPA in that day\'s LUNA-CAPA swaps (fees put back, weighted by size) × the oracle\'s LUNA usd. Days with a price were not touched; days with no swap stay blank.', checked_against_coingecko: p.check }); }
  return touched; }

if (import.meta.url === `file://${process.argv[1]}`) { const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; }; const root = arg('--root') || '.', write = process.argv.includes('--write'); const PH = path.join(root, 'price-history');
  const samples = []; for (const y of fs.readdirSync(path.join(PH, 'reserve-implied')).sort()) for (const f of fs.readdirSync(path.join(PH, 'reserve-implied', y)).sort()) for (const x of JSON.parse(fs.readFileSync(path.join(PH, 'reserve-implied', y, f), 'utf8'))) { const s = sampleOf(x); if (s) samples.push(s); }
  const months = new Map(); for (const y of fs.readdirSync(PH).filter((d) => /^\d{4}$/.test(d)).sort()) for (const f of fs.readdirSync(path.join(PH, y)).filter((x) => /^\d{2}\.json$/.test(x)).sort()) months.set(`${y}/${f.slice(0, 2)}`, JSON.parse(fs.readFileSync(path.join(PH, y, f), 'utf8')));
  const p = plan(months, byDay(samples)); console.log(`${samples.length} LUNA↔CAPA swaps on ${new Set(samples.map((s) => s.day)).size} days · check against CoinGecko on ${p.check.overlap_days} days: median ratio ${p.check.median_ratio}, ${p.check.within_5pct} within 5%, ${p.check.within_10pct} within 10% → ${p.check.ok ? 'OK' : 'NOT OK'}`);
  console.log(`days to fill: ${p.fills.length}${p.fills.length ? ` (${p.fills[0].day} → ${p.fills[p.fills.length - 1].day})` : ''}`); if (!p.check.ok) { console.error('refusing: the swap-implied price does not agree with CoinGecko where both exist'); process.exit(1); }
  if (!write) { console.log('dry run — nothing written (add --write)'); process.exit(0); }
  const touched = apply(months, p); for (const [mk] of touched) { const file = path.join(PH, mk + '.json'), was = fs.readFileSync(file, 'utf8'); fs.writeFileSync(file, JSON.stringify(months.get(mk), null, 2) + (was.endsWith('\n') ? '\n' : '')); } /* the files' own layout (2 spaces), so the diff is the added rows only */ console.log(`written: ${[...touched].map(([m, n]) => `${m} +${n}`).join(' · ')}`); }

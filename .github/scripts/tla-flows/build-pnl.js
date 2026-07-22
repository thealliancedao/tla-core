#!/usr/bin/env node
'use strict';
/**
 * build-pnl.js — Phase A of SPEC-portfolio-pnl (tla-core/docs/pending-changes/).
 *
 * Pure derive from committed repo data — ZERO chain access. Reads:
 *   tla-flows/events/<YYYY>/<MM>.json   (flow events, classifier v1)
 *   tla-flows/events/index.json         (known_gaps — copied verbatim)
 *   price-history/<YYYY>/<MM>.json      (daily avg USD by symbol)
 *   token-catalog/snapshots/current.json (denom → symbol/decimals)
 *   docs/curated/wallets.json           (labels, registry-first, uniform)
 * Writes:
 *   tla-flows/pnl/rollup.json
 *   tla-flows/pnl/heartbeat.json
 *
 * Phase A legs (honesty tiers per the spec):
 *   Tier M (measured): zap external inputs (deposit cost.swaps) valued at
 *     event date; swap slippage+fee ledger (spread/commission/maker legs,
 *     ask-asset denominated) valued at event date. Price lookup = exact UTC
 *     day, else nearest PRIOR day within 3 days (fallback counted in meta —
 *     method stated). No forward fill, no today's-price, ever.
 *   Unvalued (honest blank): claims (classifier v1 records no amounts —
 *     Phase B), LP share amounts (no valuation source in Phase A), legs whose
 *     token has no price on/near the event date (e.g. the CAPA hole).
 *
 * Determinism: two runs on identical inputs produce identical rollups except
 * `builtAt` (gate compares with builtAt stripped). All maps sorted.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || process.cwd();
const EVENTS_DIR = path.join(ROOT, 'tla-flows', 'events');
const PRICE_DIR = path.join(ROOT, 'price-history');
const CATALOG = path.join(ROOT, 'token-catalog', 'snapshots', 'current.json');
const WALLETS = path.join(ROOT, 'docs', 'curated', 'wallets.json');
const OUT_DIR = path.join(ROOT, 'tla-flows', 'pnl');

const PRICE_FALLBACK_DAYS = 3; // nearest prior day, method stated in spec

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function fail(msg) { console.error(`FATAL: ${msg}`); process.exit(1); }

// ── Token registry: denom → {symbol, decimals} ──────────────────────────────
function loadTokenMap() {
    const cat = readJson(CATALOG);
    const map = new Map();
    for (const t of cat.tokens || []) {
        const denom = t.denom;
        const sym = t.discovered?.symbol || null;
        const dec = Number.isFinite(t.discovered?.decimals) ? t.discovered.decimals : null;
        if (denom && sym) map.set(denom, { symbol: sym, decimals: dec ?? 6 });
    }
    if (!map.has('uluna')) fail('token catalog missing uluna — refusing to guess');
    return map;
}

// ── Labels (registry-first, uniform — no special cases) ─────────────────────
function loadLabels() {
    const out = new Map();
    try {
        const w = readJson(WALLETS);
        const entries = Array.isArray(w) ? w : (w.wallets || Object.entries(w).map(([address, v]) =>
            (typeof v === 'string' ? { address, label: v } : { address, ...v })));
        for (const e of entries) {
            const addr = e.address || e.wallet;
            const label = e.label || e.name;
            if (addr && label) out.set(addr, label);
        }
    } catch { /* labels optional — absence is not an error */ }
    return out;
}

// ── Price history: SYMBOL@date → usd ────────────────────────────────────────
function loadPrices() {
    const days = new Map(); // 'YYYY-MM-DD' → {SYM: usd}
    const months = [];
    for (const y of fs.readdirSync(PRICE_DIR).filter(d => /^\d{4}$/.test(d)).sort()) {
        for (const f of fs.readdirSync(path.join(PRICE_DIR, y)).filter(f => /^\d{2}\.json$/.test(f)).sort()) {
            const d = readJson(path.join(PRICE_DIR, y, f));
            months.push(`${y}/${f.replace('.json', '')}`);
            for (const [day, toks] of Object.entries(d.days || {})) {
                const m = {};
                for (const [sym, v] of Object.entries(toks)) if (v && typeof v.usd === 'number') m[sym] = v.usd;
                days.set(day, m);
            }
        }
    }
    return { days, months };
}

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

// returns {usd, date_used} or null. Exact day, else ≤3 days PRIOR. Never forward.
function priceAt(prices, symbol, date, meta) {
    for (let i = 0; i <= PRICE_FALLBACK_DAYS; i++) {
        const d = i === 0 ? date : addDays(date, -i);
        const day = prices.days.get(d);
        if (day && typeof day[symbol] === 'number') {
            if (i > 0) meta.price_fallback_legs++;
            return { usd: day[symbol], date_used: d };
        }
    }
    return null;
}

// ── Wallet accumulator ──────────────────────────────────────────────────────
function newWallet() {
    return {
        counts: { deposit: 0, withdraw: 0, claim: 0 },
        first_event: null, last_event: null,
        first_by_type: {}, last_by_type: {},
        eras: { fcd: false, walker: false },
        zap_inputs: {},          // SYM → {amount_display, usd_at_event, valued_legs, unvalued_legs}
        zap_inputs_unknown: {},  // denom (no symbol) → {amount_raw_sum, legs}
        fees: {},                // SYM → {spread_display, commission_display, maker_display, usd_at_event, valued_legs, unvalued_legs}
        fees_unknown_legs: 0,
        lp_amounts: { deposit_shares_raw: '0', deposit_lp_raw: '0', withdraw_lp_raw: '0', withdraw_shares_raw: '0' },
        deposits_with_cost: 0,
        claims: { count: 0, valued: false, reason: 'amounts not captured (classifier v1) — Phase B enrichment' },
    };
}

function bigAdd(aStr, bStr) { return (BigInt(aStr) + BigInt(bStr)).toString(); }

function main() {
    const tokenMap = loadTokenMap();
    const labels = loadLabels();
    const prices = loadPrices();
    const index = readJson(path.join(EVENTS_DIR, 'index.json'));

    // FCD/walker era boundary from the recorded gap (fall back to spec constant)
    const gap = (index.known_gaps || [])[0] || null;
    const fcdEndHeight = gap ? gap.from_height : 13737811;

    const meta = {
        events_read: 0, by_type: { deposit: 0, withdraw: 0, claim: 0 },
        null_user_events: { deposit: 0, withdraw: 0, claim: 0 },
        months_read: [], price_fallback_legs: 0,
        unpriced_input_legs: 0, unpriced_fee_legs: 0,
        unknown_denoms: {},
    };
    const wallets = new Map();
    const W = (addr) => { if (!wallets.has(addr)) wallets.set(addr, newWallet()); return wallets.get(addr); };

    // deterministic month order
    const monthFiles = [];
    for (const y of fs.readdirSync(EVENTS_DIR).filter(d => /^\d{4}$/.test(d)).sort()) {
        for (const f of fs.readdirSync(path.join(EVENTS_DIR, y)).filter(f => /^\d{2}\.json$/.test(f)).sort()) {
            monthFiles.push(path.join(EVENTS_DIR, y, f));
            meta.months_read.push(`${y}/${f.replace('.json', '')}`);
        }
    }
    if (monthFiles.length === 0) fail('no event month files found');

    const resolveTok = (denom) => {
        const t = tokenMap.get(denom);
        if (!t) { meta.unknown_denoms[denom] = (meta.unknown_denoms[denom] || 0) + 1; return null; }
        return t;
    };

    const valueLeg = (w, bucket, denom, amountRaw, date) => {
        // bucket: w.zap_inputs or w.fees-style accumulation for one token amount
        const amt = BigInt(amountRaw || '0');
        if (amt === 0n) return;
        const tok = resolveTok(denom);
        if (!tok) {
            const u = w.zap_inputs_unknown[denom] || (w.zap_inputs_unknown[denom] = { amount_raw_sum: '0', legs: 0 });
            u.amount_raw_sum = bigAdd(u.amount_raw_sum, amountRaw); u.legs++;
            meta.unpriced_input_legs++;
            return;
        }
        const disp = Number(amt) / 10 ** tok.decimals;
        const e = bucket[tok.symbol] || (bucket[tok.symbol] = { amount_display: 0, usd_at_event: 0, valued_legs: 0, unvalued_legs: 0 });
        e.amount_display += disp;
        const p = priceAt(prices, tok.symbol, date, meta);
        if (p) { e.usd_at_event += disp * p.usd; e.valued_legs++; }
        else { e.unvalued_legs++; meta.unpriced_input_legs++; }
    };

    for (const mf of monthFiles) {
        const events = readJson(mf);
        if (!Array.isArray(events)) fail(`${mf} is not an event array`);
        for (const e of events) {
            meta.events_read++;
            const type = e.type;
            if (!(type in meta.by_type)) continue;
            meta.by_type[type]++;
            if (!e.user) { meta.null_user_events[type]++; continue; }
            const w = W(e.user);
            const date = (e.timestamp || '').slice(0, 10);
            w.counts[type]++;
            if (!w.first_event || e.timestamp < w.first_event) w.first_event = e.timestamp;
            if (!w.last_event || e.timestamp > w.last_event) w.last_event = e.timestamp;
            if (!w.first_by_type[type] || e.timestamp < w.first_by_type[type]) w.first_by_type[type] = e.timestamp;
            if (!w.last_by_type[type] || e.timestamp > w.last_by_type[type]) w.last_by_type[type] = e.timestamp;
            if (e.height <= fcdEndHeight) w.eras.fcd = true; else w.eras.walker = true;

            if (type === 'claim') { w.claims.count++; continue; }

            // LP amounts recorded raw, per unit — NOT valued in Phase A
            if (e.amount) {
                const key = `${type}_${e.amount_unit === 'shares' ? 'shares' : 'lp'}_raw`;
                if (w.lp_amounts[key] !== undefined) w.lp_amounts[key] = bigAdd(w.lp_amounts[key], e.amount);
            }

            const swaps = e.cost && Array.isArray(e.cost.swaps) ? e.cost.swaps : null;
            if (!swaps || swaps.length === 0) continue;
            if (type === 'deposit') w.deposits_with_cost++;

            // Tier M leg 1: external inputs = offer assets that are no leg's ask
            if (type === 'deposit') {
                const asks = new Set(swaps.map(s => s.ask_asset));
                for (const s of swaps) {
                    if (asks.has(s.offer_asset)) continue; // internal hop
                    valueLeg(w, w.zap_inputs, s.offer_asset, s.offer_amount, date);
                }
            }

            // Tier M leg 2: fee ledger — spread/commission/maker in ASK asset
            for (const s of swaps) {
                const tok = resolveTok(s.ask_asset);
                const legs = [['spread', s.spread_amount], ['commission', s.commission_amount], ['maker', s.maker_fee_amount]];
                if (!tok) {
                    if (legs.some(([, v]) => v && BigInt(v) > 0n)) { w.fees_unknown_legs++; meta.unpriced_fee_legs++; }
                    continue;
                }
                const f = w.fees[tok.symbol] || (w.fees[tok.symbol] = {
                    spread_display: 0, commission_display: 0, maker_display: 0,
                    usd_at_event: 0, valued_legs: 0, unvalued_legs: 0,
                });
                let legTotal = 0;
                for (const [name, v] of legs) {
                    if (!v || BigInt(v) === 0n) continue;
                    const disp = Number(BigInt(v)) / 10 ** tok.decimals;
                    f[`${name}_display`] += disp;
                    legTotal += disp;
                }
                if (legTotal === 0) continue;
                const p = priceAt(prices, tok.symbol, date, meta);
                if (p) { f.usd_at_event += legTotal * p.usd; f.valued_legs++; }
                else { f.unvalued_legs++; meta.unpriced_fee_legs++; }
            }
        }
    }

    // ── Assemble rollup (sorted, deterministic) ─────────────────────────────
    const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
    const walletRows = [...wallets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([address, w]) => ({
            address,
            label: labels.get(address) || null,
            counts: w.counts,
            first_event: w.first_event, last_event: w.last_event,
            first_by_type: sortObj(w.first_by_type), last_by_type: sortObj(w.last_by_type),
            eras: w.eras,
            deposits_with_cost: w.deposits_with_cost,
            zap_inputs: sortObj(w.zap_inputs),
            zap_inputs_unknown: sortObj(w.zap_inputs_unknown),
            zap_input_usd_at_event: Object.values(w.zap_inputs).reduce((s, x) => s + x.usd_at_event, 0),
            fees: sortObj(w.fees),
            fees_unknown_legs: w.fees_unknown_legs,
            fees_usd_at_event: Object.values(w.fees).reduce((s, x) => s + x.usd_at_event, 0),
            lp_amounts: w.lp_amounts,
            claims: { ...w.claims },
        }));

    const totals = {
        wallets: walletRows.length,
        fees_usd_at_event: walletRows.reduce((s, r) => s + r.fees_usd_at_event, 0),
        zap_input_usd_at_event: walletRows.reduce((s, r) => s + r.zap_input_usd_at_event, 0),
        claims_recorded_unvalued: walletRows.reduce((s, r) => s + r.claims.count, 0),
    };

    // ── Honesty assertions (abort — never publish inconsistent data) ────────
    for (const t of ['deposit', 'withdraw', 'claim']) {
        const sum = walletRows.reduce((s, r) => s + r.counts[t], 0) + meta.null_user_events[t];
        if (sum !== meta.by_type[t]) fail(`${t} reconcile ${sum} != ${meta.by_type[t]}`);
    }
    const claimSum = walletRows.reduce((s, r) => s + r.counts.claim, 0);
    if (totals.claims_recorded_unvalued !== claimSum) fail('claims total mismatch');

    const builtAt = new Date().toISOString();
    const rollup = {
        schemaVersion: 1,
        spec: 'docs/pending-changes/SPEC-portfolio-pnl.md (Phase A)',
        builtAt,
        phase: 'A',
        method: {
            valuation: `usd at event UTC date from price-history daily avg; fallback nearest PRIOR day <= ${PRICE_FALLBACK_DAYS}d (counted); never forward, never build-time prices`,
            zap_inputs: 'deposit cost.swaps offer assets that are no leg ask_asset (external inputs); lower bound — direct (non-swap) provide legs are not visible to classifier v1',
            fees: 'per swap leg: spread + commission + maker, denominated in ask asset',
            claims: 'occurrence only — classifier v1 carries no amounts (Phase B)',
            lp_amounts: 'recorded raw per unit, unvalued in Phase A',
        },
        sources: {
            events_index_counts: index.by_type || null,
            events_read: meta.events_read,
            events_by_type: meta.by_type,
            null_user_events: meta.null_user_events,
            months_read: meta.months_read,
            price_history_months: prices.months,
            known_gaps: index.known_gaps || [],
            fcd_walker_boundary_height: fcdEndHeight,
        },
        pricing_meta: {
            price_fallback_legs: meta.price_fallback_legs,
            unpriced_input_legs: meta.unpriced_input_legs,
            unpriced_fee_legs: meta.unpriced_fee_legs,
            unknown_denoms: sortObj(meta.unknown_denoms),
        },
        totals,
        wallets: walletRows,
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'rollup.json'), JSON.stringify(rollup, null, 1) + '\n');
    fs.writeFileSync(path.join(OUT_DIR, 'heartbeat.json'), JSON.stringify({
        schemaVersion: 1, product: 'tla-flows/pnl', builder: 'build-pnl.js (Action one-off)',
        builtAt, status: 'ok',
        wallet_count: totals.wallets,
        events_read: meta.events_read,
        fees_usd_at_event: totals.fees_usd_at_event,
        zap_input_usd_at_event: totals.zap_input_usd_at_event,
    }, null, 1) + '\n');

    console.log(`OK: ${totals.wallets} wallets, ${meta.events_read} events`);
    console.log(`  DAO-wide fees (usd@event):      ${totals.fees_usd_at_event.toFixed(2)}`);
    console.log(`  DAO-wide zap inputs (usd@event): ${totals.zap_input_usd_at_event.toFixed(2)}`);
    console.log(`  claims recorded (unvalued):      ${totals.claims_recorded_unvalued}`);
    console.log(`  unpriced legs: inputs=${meta.unpriced_input_legs} fees=${meta.unpriced_fee_legs} fallback=${meta.price_fallback_legs}`);
}

main();

// entity-verify 1.0 (2026-10-16) — checks, on chain, who controls a contract: its admin and label (ContractInfo), and for a DAO DAO
// core its config name. Used before naming an organisation on a public page ("only if we know for sure"). Contracts only; the log
// prints whether the admin matches the expected organisation address, never anything about individual wallets.
import fs from 'fs';
const RPC = String(process.env.ARCHIVE_RPC || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\/$/, '');
const CHECKS = JSON.parse(process.env.CHECKS || '[]');   // [{address, expect_admin, org}]
const varint = (n) => { const b = []; while (n > 127) { b.push((n & 127) | 128); n >>>= 7; } b.push(n); return Buffer.from(b); };
const field = (tag, buf) => Buffer.concat([Buffer.from([tag]), varint(buf.length), buf]);
function rv(buf, i) { let x = 0, s = 0; for (;;) { const b = buf[i++]; x += (b & 127) * Math.pow(2, s); if (b < 128) return [x, i]; s += 7; } }
function fields(buf) { const out = {}; let i = 0; while (i < buf.length) { const [key, j] = rv(buf, i); i = j; const f = key >> 3, w = key & 7; if (w === 2) { const [len, k] = rv(buf, i); i = k; (out[f] = out[f] || []).push(buf.slice(i, i + len)); i += len; } else if (w === 0) { const [, k] = rv(buf, i); i = k; } else break; } return out; }
async function abci(path, data) { const r = await fetch(`${RPC}/abci_query?path=${encodeURIComponent('"' + path + '"')}&data=0x${data.toString('hex')}`, { signal: AbortSignal.timeout(30000) }); const j = await r.json(); const resp = j.result && j.result.response; if (!resp || resp.code) return null; return Buffer.from(resp.value || '', 'base64'); }
const out = [];
for (const c of CHECKS) {
  const v = await abci('/cosmwasm.wasm.v1.Query/ContractInfo', field(0x0a, Buffer.from(c.address)));
  let admin = null, label = null, creator = null, codeId = null;
  if (v) { const top = fields(v); const info = top[2] ? fields(top[2][0]) : {}; creator = info[2] ? info[2][0].toString() : null; admin = info[3] ? info[3][0].toString() : null; label = info[4] ? info[4][0].toString() : null; }
  let name = null; const cfg = await abci('/cosmwasm.wasm.v1.Query/SmartContractState', Buffer.concat([field(0x0a, Buffer.from(c.address)), field(0x12, Buffer.from(JSON.stringify({ config: {} })))]));
  if (cfg) { try { const f = fields(cfg); const j = JSON.parse(f[1][0].toString()); name = j.name || null; } catch { } }
  const row = { org: c.org, address: c.address, admin_matches: admin === c.expect_admin, admin_is_contract: admin ? admin.length > 50 : null, label, dao_name: name, checked_at: new Date().toISOString() };
  out.push(row); console.log(`${c.org}: admin matches expected = ${row.admin_matches} · label "${label}" · DAO name "${name}"`);
}
fs.mkdirSync('docs/curated/entity-verify', { recursive: true }); fs.writeFileSync('docs/curated/entity-verify/latest.json', JSON.stringify({ schemaVersion: 1, product: 'entity-verify', rule: 'A contract is named for an organisation on a public page only when its on-chain admin is that organisation\'s own DAO contract.', checks: out }, null, 1));

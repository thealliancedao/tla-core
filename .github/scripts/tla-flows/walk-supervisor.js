// walk-supervisor — auto-heal for the tla-flows archive walk chain.
//
// WHY (2026-08-06): run #15 died with "The operation was canceled." — a
// GitHub-side runner reclaim at block 18,129,229, ~72% through its chunk.
// No FATAL, no census fail, no publish throw: nothing the walker's own
// error handling (or the transient-retry hardening) can catch, because the
// process is killed from outside. The chain's only restart mechanism is the
// dying run's final self-dispatch — which never happens on a cancel — so
// the walk sits dead until a human notices. This supervisor runs on a
// schedule and re-dispatches from the failure point, exactly as the walk
// workflow's own doctrine prescribes ("A failure STOPS the chain —
// re-dispatch from the failure point").
//
// DECISION LOGIC (read-only until the single dispatch decision):
//   1. If any walk run is queued or in_progress        → healthy, exit.
//   2. List tla-flows/raw range dirs, take highest FROM.
//      a. No report.json in it → chunk died mid-run    → dispatch from_height=FROM
//         (raw parts are write-once; re-walk skips them — overlap harmless).
//      b. report.json present:
//         - report.to >= FINAL                          → walk COMPLETE, exit.
//         - else the completed chunk's self-dispatch was lost (canceled in
//           the gap between manifest and dispatch)      → dispatch from_height=report.to+1
//   3. Dispatch at most ONE run per invocation; the walk's own concurrency
//      group (cancel-in-progress: false) is the second guard.
//
// Requires: GITHUB_TOKEN with contents:read + actions:write (workflow grants it).

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'thealliancedao/tla-core';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const WORKFLOW_FILE = process.env.WORKFLOW_FILE || 'tla-flows-archive-walk.yml';
const FINAL_HEIGHT = Number(process.env.FINAL_HEIGHT || 21481530);
const RAW_ROOT = 'tla-flows/raw';
const GH_TRIES = Number(process.env.GH_TRANSIENT_TRIES || 5);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function fail(m) { console.error('FATAL: ' + m); process.exit(1); }

function ghReqOnce(method, apiPath, body, accept) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'api.github.com', path: apiPath, method, headers: { 'User-Agent': 'tla-walk-supervisor', 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': accept || 'application/vnd.github+json' } };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(d)); } catch { resolve(d); } }
        else { const e = new Error(`GitHub ${method} ${apiPath}: ${res.statusCode} ${String(d).slice(0, 140)}`); e.statusCode = res.statusCode; reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// same transient policy as the hardened walker: network / 5xx / 429 /
// 403-rate-limit retry with backoff; 4xx semantics pass through untouched.
async function ghReq(method, apiPath, body, accept) {
  let last;
  for (let a = 1; a <= GH_TRIES; a++) {
    try { return await ghReqOnce(method, apiPath, body, accept); }
    catch (e) {
      last = e;
      const sc = e.statusCode;
      const transient = !sc || sc >= 500 || sc === 429 || (sc === 403 && /rate limit/i.test(e.message));
      if (!transient || a === GH_TRIES) throw e;
      const wait = Math.min(60000, 1500 * Math.pow(2, a - 1));
      console.log(`  \u26a0 GitHub transient (${sc || String(e.message).slice(0, 50)}) \u2014 retry ${a}/${GH_TRIES - 1} in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
    }
  }
  throw last;
}

async function getJson(p) {
  try { const d = await ghReq('GET', `/repos/${GITHUB_REPO}/contents/${p}?ref=${GITHUB_BRANCH}`, null, 'application/vnd.github.raw'); return typeof d === 'string' ? JSON.parse(d) : d; }
  catch (e) { if (e.statusCode === 404) return null; throw e; }
}

// ---------------------------------------------------------------- decision
// Pure function — takes observed state, returns the action. Gated directly.
function decide({ activeRuns, latestRange, report, finalHeight }) {
  if (activeRuns > 0) return { action: 'none', reason: `walk run already queued/in_progress (${activeRuns})` };
  if (!latestRange) return { action: 'none', reason: 'no range dirs found — walk not started; nothing to heal' };
  if (!report) return { action: 'dispatch', from: latestRange.from, reason: `range ${latestRange.name} has no manifest — chunk died mid-run; re-dispatching from its FROM (write-once parts make overlap harmless)` };
  if (report.to >= finalHeight) return { action: 'none', reason: `walk COMPLETE — manifest covers to ${report.to} >= final ${finalHeight}` };
  return { action: 'dispatch', from: report.to + 1, reason: `range ${latestRange.name} completed to ${report.to} but no successor exists — self-dispatch was lost; chaining onward` };
}

async function main() {
  if (!GITHUB_TOKEN) fail('GITHUB_TOKEN missing');
  // 1. any live run?
  const [q, p] = await Promise.all([
    ghReq('GET', `/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?status=queued&per_page=1`),
    ghReq('GET', `/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?status=in_progress&per_page=1`),
  ]);
  const activeRuns = (q.total_count || 0) + (p.total_count || 0);

  // 2. highest range dir + its manifest
  const listing = await ghReq('GET', `/repos/${GITHUB_REPO}/contents/${RAW_ROOT}?ref=${GITHUB_BRANCH}`);
  const ranges = (Array.isArray(listing) ? listing : [])
    .filter((e) => e.type === 'dir' && /^\d+-\d+$/.test(e.name))
    .map((e) => { const [from, to] = e.name.split('-').map(Number); return { name: e.name, from, to }; })
    .sort((a, b) => a.from - b.from);
  const latestRange = ranges[ranges.length - 1] || null;
  const report = latestRange ? await getJson(`${RAW_ROOT}/${latestRange.name}/report.json`) : null;

  // 3. decide + act
  const d = decide({ activeRuns, latestRange, report, finalHeight: FINAL_HEIGHT });
  console.log(`supervisor: ${d.reason}`);
  if (d.action !== 'dispatch') { console.log('supervisor: no action.'); return; }
  console.log(`supervisor: dispatching ${WORKFLOW_FILE} from_height=${d.from} final_height=${FINAL_HEIGHT}`);
  await ghReq('POST', `/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
    ref: GITHUB_BRANCH,
    inputs: { from_height: String(d.from), final_height: String(FINAL_HEIGHT) },
  });
  console.log('supervisor: dispatched. \u2705');
}

if (require.main === module) main().catch((e) => fail(e.message));
module.exports = { decide };

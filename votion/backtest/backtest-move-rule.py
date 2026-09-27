#!/usr/bin/env python3
"""votion/backtest/backtest-move-rule.py — refresh votion/backtest/move-rule.json from the git history of votion/optimization/current.json.
Usage (on a tla-core clone):  git fetch --filter=blob:none --unshallow origin main   # once
                              python3 votion/backtest/backtest-move-rule.py > votion/backtest/move-rule.json
Steps: (1) every capture → per vault × bucket: activeVoted, plan, diff.isWorthChanging / rewardLoss (gain) / totalDeviation;
(2) fit the flag: search gain and deviation thresholds that reproduce isWorthChanging on every observation;
(3) casts = the captures where a max vault's activeVoted changed; score the rule at the capture before each cast."""
import json, subprocess, datetime, collections, re, sys
P = 'votion/optimization/current.json'
commits = subprocess.check_output(['git', 'log', '--format=%H', '--', P]).decode().split()[::-1]
cat = subprocess.Popen(['git', 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
def blob(c):
    cat.stdin.write((c + ':' + P + '\n').encode()); cat.stdin.flush(); h = cat.stdout.readline().split(); d = cat.stdout.read(int(h[2])); cat.stdout.read(1); return json.loads(d)
L = []
for c in commits:
    try: o = blob(c)
    except Exception: continue
    rec = {'at': o.get('capturedAt'), 'period': o.get('period'), 'voteBefore': o.get('voteBefore'), 'v': {}}
    for vk, v in (o.get('vaults') or {}).items():
        for opt in (v.get('optimizations') or []):
            d = opt.get('diff') or {}
            rec['v'][vk + '|' + opt['id']] = {'vp': opt.get('votingPower'), 'cur': opt.get('activeVoted') or {}, 'plan': {x['id']: x.get('votingPowerPercentage') for x in ((opt.get('optimization') or {}).get('votes') or [])}, 'worth': d.get('isWorthChanging'), 'gain': d.get('rewardLoss'), 'dev': d.get('totalDeviation')}
    L.append(rec)
L.sort(key=lambda x: x['at'])
obs = [(float(s['gain']), float(s['dev']), bool(s['worth'])) for x in L for s in x['v'].values() if s['worth'] is not None and s['gain'] is not None and s['dev'] is not None]
best = max(((sum(((g > gt and d > dt) == w) for g, d, w in obs), gt, dt) for gt in [0, .01, .02, .03, .04, .05, .06, .08, .1] for dt in [0, 1, 2, 3, 4, 5, 6, 8, 10]))
same = lambda a, b, t=1.0: all(abs((a.get(k) or 0) - (b.get(k) or 0)) <= t for k in set(a) | set(b))
casts = sorted({L[i]['at'] for i in range(1, len(L)) for k, s in L[i]['v'].items() if k.split('|')[0].endswith('max') and k in L[i-1]['v'] and not same(L[i-1]['v'][k]['cur'], s['cur']) and (L[i-1]['v'][k]['gain'] or 0) > 0.001})
by = collections.defaultdict(lambda: {'flagged': 0, 'moved': 0, 'moved_unflagged': 0}); T = lambda s: datetime.datetime.fromisoformat(s.replace('Z', '+00:00')); crows = []
for ca in casts:
    i = [j for j, x in enumerate(L) if x['at'] == ca][0]; p, a = L[i-1], L[i]
    crows.append({'period': int(p['period']), 'seen_at': ca, 'hours_before_deadline': round((T(p['voteBefore']) - T(ca)).total_seconds() / 3600, 1)})
    for k, s in p['v'].items():
        v = k.split('|')[0]
        if not v.endswith('max') or k not in a['v']: continue
        moved = not same(s['cur'], a['v'][k]['cur']); pred = (s['gain'] or 0) > best[1] and float(s['dev'] or 0) > best[2]
        if pred: by[v]['flagged'] += 1; by[v]['moved'] += moved
        elif moved: by[v]['moved_unflagged'] += 1
json.dump({'product': 'votion-move-rule', 'version': '1.0.0', 'generated_at': datetime.datetime.utcnow().isoformat(timespec='seconds') + 'Z',
           'rule': {'gain_usd_gt': best[1], 'deviation_pct_gt': best[2]}, 'fit': {'observations': len(obs), 'matches': best[0]},
           'track_record': {'by_vault': by, 'never_moved_unflagged': all(x['moved_unflagged'] == 0 for x in by.values())}, 'timing': {'casts': crows}}, sys.stdout, indent=1)

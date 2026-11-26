"""Build the dashboards from the store.

  --from 2026-06-01 --to 2026-11-30   limit the page to a date window (keeps the HTML small; the store keeps everything)
  Default page = every labeled message in the store, all chats, full history (filters narrow it in the page).
  --all                               also include unlabeled messages (big page; only useful before classify.py has run)
  --out name.html                     write somewhere other than board.html
  --note "text"                       extra line under the title (e.g. what window is labeled)

  python build_board.py            -> board.html         (PRIVATE: every field, every kind, per-person tone)
  python build_board.py --public   -> public_board.html  (ideas / questions / support / announcements only,
                                                          tone, stance and notable stripped, no per-person tables)
Open the result in a browser. Nothing is uploaded anywhere.
"""
import os, sys, json, sqlite3, html, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json')))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
ROLES_PATH = os.path.join(HERE, 'roles.json')
LOGO_B64 = open(os.path.join(HERE, 'logo.b64')).read().strip() if os.path.exists(os.path.join(HERE, 'logo.b64')) else ''
def _load_json(name, default):
    f = os.path.join(HERE, name)
    try: return json.load(open(f, encoding='utf-8')) if os.path.exists(f) else default
    except Exception as e: print(f"warning: {name} not readable ({e}) — ignored"); return default
OVERRIDES = {k: v for k, v in _load_json('overrides.json', {}).items() if ':' in k}     # "chat:id": {field: value, "note": "..."}
EXCLUSIONS = {k: v for k, v in _load_json('exclusions.json', {}).items() if ':' in k}   # "chat:id": "reason"
import hashlib
def manifest():
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('clf', os.path.join(HERE, 'classify.py')); m = importlib.util.module_from_spec(spec)
        os.environ.setdefault('ANTHROPIC_API_KEY', 'x'); spec.loader.exec_module(m)
        prompt, model = m.SYSTEM, m.MODEL
    except Exception as e:
        prompt, model = f'(classify.py not readable: {e})', CFG.get('model')
    return {'model': model, 'prompt_sha256': hashlib.sha256(prompt.encode()).hexdigest()[:16], 'prompt': prompt,
            'batch_size': CFG.get('batch_size'), 'min_text_chars': CFG.get('min_text_chars', 40), 'workers': CFG.get('workers'),
            'overrides': len(OVERRIDES), 'exclusions': len(EXCLUSIONS), 'public': PUBLIC}
ROLES = json.load(open(ROLES_PATH)) if os.path.exists(ROLES_PATH) else {'people': {}, 'role_colors': {}}
ALIAS = {a: n for n, p in ROLES.get('people', {}).items() for a in p.get('aliases', [])}
PUBLIC = '--public' in sys.argv
argv = sys.argv
FROM = argv[argv.index('--from')+1] if '--from' in argv else None
TO = argv[argv.index('--to')+1] if '--to' in argv else None
LABELED_ONLY = '--all' not in argv
OUT = argv[argv.index('--out')+1] if '--out' in argv else None
NOTE = argv[argv.index('--note')+1] if '--note' in argv else ''

def load():
    con = sqlite3.connect(DB)
    q = """SELECT m.chat, m.id, m.sender, m.date, m.text, m.reply_to, l.kind, l.tone, l.stance, l.targets, l.topics, l.summary, l.notable, l.stances, l.to_parent, l.addresses, l.moves, m.reactions
           FROM messages m LEFT JOIN labels l ON l.chat=m.chat AND l.id=m.id WHERE m.is_bot=0 AND length(m.text)>0 """
    args = []
    if FROM: q += " AND m.date >= ? "; args.append(FROM)
    if TO: q += " AND m.date <= ? "; args.append(TO + "~")
    if LABELED_ONLY: q += " AND l.kind IS NOT NULL "
    q += " ORDER BY m.date"
    rows = []
    parent = {}   # (chat,id) -> (sender, text) for reply context
    for chat, mid, snd, txt in con.execute("SELECT chat, id, sender, substr(text,1,160) FROM messages WHERE (chat,id) IN (SELECT chat, reply_to FROM messages WHERE reply_to IS NOT NULL)"):
        parent[(chat, mid)] = (ALIAS.get(snd or '?', snd or '?'), txt or '')
    replies = {}  # (chat,id) -> number of replies it got
    for chat, rt, n in con.execute("SELECT chat, reply_to, COUNT(*) FROM messages WHERE reply_to IS NOT NULL GROUP BY 1,2"):
        replies[(chat, rt)] = n
    for r in con.execute(q, args):
        d = {'chat': r[0], 'id': r[1], 'sender': ALIAS.get(r[2] or '?', r[2] or '?'), 'date': r[3], 'text': (r[4] or '')[:900], 'reply_to': r[5],
             'kind': r[6] or 'unlabeled', 'tone': r[7] or '', 'stance': r[8] or '', 'targets': json.loads(r[9] or '[]'),
             'topics': json.loads(r[10] or '[]'), 'summary': r[11] or '', 'notable': int(r[12] or 0), 'st': json.loads(r[13] or '{}'),
             'tp': r[14] or '', 'ad': r[15] or '', 'mv': json.loads(r[16] or '[]'),
             'url': CFG['chats'][r[0]]['tme'] + str(r[1]), 'nrep': replies.get((r[0], r[1]), 0)}
        if r[5] and (r[0], r[5]) in parent: d['rt'] = parent[(r[0], r[5])]
        if r[17]:
            try:
                rx = json.loads(r[17]); d['rx'] = [sum(x.get('n', 1) for x in rx), ''.join(x.get('e', '') for x in rx[:4]), sorted({w for x in rx for w in x.get('who', [])})[:6]]
            except Exception: pass
        if r[6] == 'chatter' and len(d['text']) < 40: d['text'] = d['text'][:40]
        key = f"{d['chat']}:{d['id']}"
        if key in EXCLUSIONS: continue
        if key in OVERRIDES:
            ov = OVERRIDES[key]; d['ov'] = ov.get('note', 'corrected by hand')
            for f in ('kind', 'tone', 'stance', 'targets', 'topics', 'summary', 'notable', 'tp', 'ad', 'mv'):
                if f in ov: d[f] = ov[f]
        if PUBLIC:
            if d['kind'] not in CFG['public_kinds']: continue
            for f in CFG['public_strip_fields']: d[f] = ''
            d['tp'] = ''; d['ad'] = ''; d['mv'] = []; d['st'] = {}
            d['text'] = d['text'][:400]
        rows.append(d)
    return rows

TEMPLATE = r"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__</title><meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0b0f;--bg2:#0f1117;--card:rgba(255,255,255,.03);--card2:rgba(255,255,255,.06);--line:rgba(255,255,255,.08);--line2:#374151;--fg:#f3f4f6;--txt:#d1d5db;--mut:#9ca3af;--dim:#6b7280;
 --acc:#22d3ee;--acc2:#67e8f9;--teal:#2dd4bf;--for:#4ade80;--against:#f87171;--mixed:#facc15;--none:#374151;--hostile:#f87171;--constr:#4ade80;--idea:#facc15;--q:#22d3ee;--crit:#fb923c;--purple:#c084fc;
 --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 Outfit,Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse 80% 50% at 20% 40%,rgba(6,182,212,.08),transparent),radial-gradient(ellipse 60% 40% at 80% 60%,rgba(45,212,191,.05),transparent)}
a{color:var(--acc);text-decoration:none}a:hover{color:var(--acc2);text-decoration:underline}
.num,.kpi b,.srow .tot,td.num,.pill,.cnt{font-family:var(--mono);font-variant-numeric:tabular-nums}
/* header — mirrors lib/site-header.js */
.sh{position:sticky;top:0;z-index:40;background:rgba(10,11,15,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.06)}
.sh-wrap{max-width:1400px;margin:0 auto;padding:.7em 1.5em;display:flex;align-items:center;gap:1.2em}
.sh-brand{display:flex;align-items:center;gap:.8em;flex:1 1 auto;min-width:0}.sh-brand>div{min-width:0}.sh-brand img{height:42px;width:auto}.sh-brand h1{margin:0;font-size:1.15em;font-weight:800;color:#fff;letter-spacing:.01em;line-height:1.1}
.sh-brand .sub{display:block;font-size:.72em;font-weight:500;color:var(--mut);margin-top:2px;white-space:normal;max-width:60ch}.sh-brand .sub b{color:var(--against);font-weight:700}
.sh-nav{display:flex;flex:1;justify-content:center;gap:.45em;flex-wrap:wrap}
.sh-tab{min-width:92px;height:2.6em;display:inline-flex;align-items:center;justify-content:center;gap:.5em;color:#fff;font-weight:700;font-size:.92em;padding:0 .9em;border-radius:.5em;background:rgba(31,41,55,.5);border:1px solid #374151;box-shadow:0 10px 15px -3px rgba(0,0,0,.3);transition:transform .15s,background .15s;white-space:nowrap;cursor:pointer;font-family:inherit}
.sh-tab:hover{background:rgba(55,65,81,.8);transform:scale(1.04)}
.sh-tab.active{background:color-mix(in srgb,var(--acc) 15%,transparent);color:var(--acc2);border-color:color-mix(in srgb,var(--acc) 60%,transparent)}
.sh-tab .cnt{font-size:.78em;font-weight:600;color:var(--mut);background:rgba(148,163,184,.15);padding:.1em .5em;border-radius:999px}.sh-tab.active .cnt{color:var(--acc2);background:color-mix(in srgb,var(--acc) 18%,transparent)}
.subnav{border-bottom:1px solid rgba(255,255,255,.06);background:rgba(10,11,15,.85)}.sub-wrap{max-width:1400px;margin:0 auto;padding:.3em 1.5em;display:flex;align-items:center;gap:.6em;flex-wrap:wrap}
.sub-lbl{font-size:.68em;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin-right:.4em}
.sh-subtab{display:inline-flex;align-items:center;gap:.45em;padding:.5em .85em;font-size:.88em;font-weight:600;color:#94a3b8;border:0;background:transparent;cursor:pointer;font-family:inherit;white-space:nowrap;border-radius:.6em;transition:color .15s,background .15s}
.sh-subtab:hover{color:#fff;background:rgba(255,255,255,.05)}.sh-subtab.active{color:var(--acc2);background:color-mix(in srgb,var(--acc) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--acc) 35%,transparent)}
.sh-subtab .cnt{font-size:.78em;color:var(--dim)}.sh-subtab.active .cnt{color:var(--acc2)}
.sh-right{flex:0 0 auto;font-size:.75em;color:var(--dim);text-align:right;line-height:1.35}
/* filter row — mirrors the sub-tab strip */
.flt{border-bottom:1px solid rgba(255,255,255,.06);background:rgba(10,11,15,.85)}
.flt-wrap{max-width:1400px;margin:0 auto;padding:.55em 1.5em;display:flex;gap:.6em;align-items:center;flex-wrap:wrap}
.flt label{display:flex;flex-direction:column;gap:2px;font-size:.68em;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}
.flt select,.flt input[type=date],.flt input[type=text]{background:var(--bg2);border:1px solid rgba(148,163,184,.35);color:var(--txt);padding:.45em .6em;border-radius:.45em;font:500 13px Outfit,sans-serif;min-width:9em;color-scheme:dark}
.flt input[type=text]{min-width:16em}.flt .chk{display:flex;align-items:center;gap:.4em;font-size:.82em;color:var(--mut);align-self:flex-end;padding-bottom:.4em;cursor:pointer}
.flt button{align-self:flex-end;background:transparent;border:1px solid rgba(148,163,184,.35);color:var(--mut);padding:.45em .9em;border-radius:.45em;cursor:pointer;font:600 12px Outfit,sans-serif}.flt button:hover{color:var(--acc2);border-color:var(--acc)}
.flt .acc{accent-color:var(--acc)}
.flt-adv{display:none;gap:.6em;align-items:center;flex-wrap:wrap;width:100%;padding-top:.4em;border-top:1px dashed rgba(255,255,255,.08)}.flt-adv.open{display:flex}
.flt-note{max-width:1400px;margin:0 auto;padding:0 1.5em .5em;font-size:.78em;color:var(--dim)}.flt-note b{color:var(--acc2);font-weight:600}
.hint{color:var(--dim);font-size:.88em;margin:-8px 0 14px}.hint b{color:var(--mut)}
.pg{display:flex;gap:.4em;margin-bottom:14px;flex-wrap:wrap}.pg button{background:transparent;border:1px solid rgba(148,163,184,.3);color:var(--mut);padding:.45em .9em;border-radius:.5em;cursor:pointer;font:600 13px Outfit,sans-serif}.pg button.on{color:var(--acc2);border-color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,transparent)}.pg button .cnt{margin-left:.4em;color:var(--dim);font-size:.85em}
.ovm{color:var(--mixed);font-size:.78em;font-weight:600;cursor:help}.rxs{color:var(--mut);font-size:.9em}
pre.prompt{white-space:pre-wrap;font:12px/1.5 var(--mono);color:var(--mut);background:var(--bg2);border:1px solid var(--line);border-radius:.5rem;padding:12px;max-height:420px;overflow:auto}.rxs b{color:#fff;font-weight:600}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.pair .msg{margin:0}@media(max-width:1000px){.pair{grid-template-columns:1fr}}
.mx{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.beh td.num{font-family:var(--mono)}.pct{display:inline-block;min-width:3.2em;text-align:right}.pct.d{color:var(--for)}.pct.p{color:var(--mixed)}.pct.n{color:var(--against)}
.mv{display:inline-block;padding:0 6px;border-radius:5px;font-size:.78em;border:1px solid rgba(148,163,184,.3);color:var(--mut);margin:1px 3px 1px 0}.mv.bad{color:var(--against);border-color:color-mix(in srgb,var(--against) 45%,transparent)}.mv.good{color:var(--for);border-color:color-mix(in srgb,var(--for) 45%,transparent)}
.chips{display:flex;gap:3px}.chips button{background:var(--bg2);border:1px solid rgba(148,163,184,.35);color:var(--mut);padding:.42em .6em;border-radius:.45em;cursor:pointer;font:600 12px Outfit,sans-serif}.chips button.on,.chips button:hover{color:var(--acc2);border-color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,transparent)}
.kpi.link{cursor:pointer}.sorter{float:right;font-size:.8em;color:var(--dim);text-transform:none;letter-spacing:0;font-weight:500}.sorter a{margin-left:8px;color:var(--mut)}.sorter a.on{color:var(--acc2)}
.trend{display:flex;gap:2px;align-items:flex-end;height:90px}.trend .m{flex:1;display:flex;flex-direction:column-reverse;min-width:0}.trend .m span{display:block}.trend .m .f{background:var(--for)}.trend .m .x{background:var(--mixed)}.trend .m .a{background:var(--against)}.trend .m .n{background:var(--none)}
.trend .m:hover span{filter:brightness(1.25)}.tlab{display:flex;justify-content:space-between;color:var(--dim);font-size:.75em;margin-top:4px}
.net{font-family:var(--mono);font-size:.8em;color:var(--mut)}.net b{color:var(--for)}.net i{color:var(--against);font-style:normal}
.rt{border-left:2px solid rgba(148,163,184,.3);color:var(--dim);font-size:.82em;padding:2px 8px;margin:2px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rt b{color:var(--mut);font-weight:600}
.msg .top .rep{color:var(--teal)}
main{max-width:1400px;margin:0 auto;padding:22px 1.5em 70px;min-width:0}
.hd{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:4px 0 16px;flex-wrap:wrap}.hd h2{margin:0;font-size:1.45em;font-weight:700;color:#fff}.hd .n{color:var(--dim);font-size:.9em}
.crumb{color:var(--dim);font-size:.9em;margin-bottom:8px}.crumb a{color:var(--mut)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}.grid.ov{grid-template-columns:1fr 1fr;margin-bottom:14px}.grid.ov2{grid-template-columns:3fr 2fr}@media(max-width:1000px){.grid.ov,.grid.ov2{grid-template-columns:1fr}}
.spark{height:110px}
.card{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:16px 18px;transition:border-color .3s,background .3s}.card:hover{border-color:rgba(45,212,191,.25)}
.card h3{margin:0 0 12px;font-size:.72em;color:var(--mut);font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;margin-bottom:14px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:12px 14px;transition:all .3s;cursor:default}.kpi:hover{background:var(--card2);border-color:rgba(45,212,191,.4);transform:translateY(-2px)}
.kpi b{display:block;font-size:1.6em;font-weight:600;color:#fff;line-height:1.1}.kpi span{display:block;color:var(--dim);font-size:.72em;text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.srow{display:grid;grid-template-columns:minmax(150px,1.4fr) 3fr 56px;gap:10px;align-items:center;padding:7px 4px;border-top:1px solid rgba(255,255,255,.05);cursor:pointer;border-radius:.4em}
.srow:hover{background:rgba(45,212,191,.07)}.srow:first-of-type{border-top:0}.srow .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fg);font-weight:500}.srow .tot{text-align:right;color:var(--mut);font-size:.85em}
.sbar{height:9px;border-radius:5px;overflow:hidden;display:flex;background:var(--none)}.sbar span{height:100%}
.leg{display:flex;gap:14px;color:var(--dim);font-size:.8em;margin:0 0 10px;flex-wrap:wrap}.leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.78em;font-weight:600;border:1px solid var(--line2);color:var(--mut);margin-right:4px;white-space:nowrap;background:rgba(255,255,255,.02)}
.tag.for{color:var(--for);border-color:color-mix(in srgb,var(--for) 50%,transparent);background:color-mix(in srgb,var(--for) 10%,transparent)}
.tag.against{color:var(--against);border-color:color-mix(in srgb,var(--against) 50%,transparent);background:color-mix(in srgb,var(--against) 10%,transparent)}
.tag.mixed{color:var(--mixed);border-color:color-mix(in srgb,var(--mixed) 50%,transparent);background:color-mix(in srgb,var(--mixed) 10%,transparent)}
.tag.hostile{color:var(--hostile);border-color:color-mix(in srgb,var(--hostile) 50%,transparent);background:color-mix(in srgb,var(--hostile) 10%,transparent)}
.tag.constructive{color:var(--constr);border-color:color-mix(in srgb,var(--constr) 50%,transparent)}
.tag.idea{color:var(--idea);border-color:color-mix(in srgb,var(--idea) 50%,transparent);background:color-mix(in srgb,var(--idea) 10%,transparent)}
.tag.question{color:var(--q);border-color:color-mix(in srgb,var(--q) 50%,transparent);background:color-mix(in srgb,var(--q) 10%,transparent)}
.tag.support{color:var(--for);border-color:color-mix(in srgb,var(--for) 50%,transparent)}.tag.criticism{color:var(--crit);border-color:color-mix(in srgb,var(--crit) 50%,transparent)}
.tag.feedback{color:var(--purple);border-color:color-mix(in srgb,var(--purple) 50%,transparent)}.tag.announcement{color:var(--teal);border-color:color-mix(in srgb,var(--teal) 50%,transparent)}
.msgs{display:flex;flex-direction:column;gap:8px}
.msg{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--none);border-radius:.75rem;padding:10px 14px;transition:background .2s,border-color .2s}.msg:hover{background:var(--card2)}
.msg.for{border-left-color:var(--for)}.msg.against{border-left-color:var(--against)}.msg.mixed{border-left-color:var(--mixed)}
.msg .top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:.8em;color:var(--dim);margin-bottom:4px}.msg .top b{color:#fff;font-size:1.05em;cursor:pointer;font-weight:600}.msg .top b:hover{color:var(--acc2)}
.msg .top .d{font-family:var(--mono);font-size:.95em}
.msg .sum{font-size:1em;color:var(--fg)}.msg .txt{color:var(--mut);font-size:.9em;white-space:pre-wrap;margin-top:4px;max-height:5.5em;overflow:hidden;position:relative;cursor:pointer}
.msg .txt.open{max-height:none}.msg .more{color:var(--dim);font-size:.78em;cursor:pointer}.msg .tags{margin-top:6px}
.msg.notable .sum::before{content:"★ ";color:var(--idea)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:1000px){.two{grid-template-columns:1fr}.sh-brand h1{font-size:1em}.sh-brand img{height:34px}.sh-right{display:none}}
.col h3{margin:0 0 10px;font-size:.95em;font-weight:700}.col h3.for{color:var(--for)}.col h3.against{color:var(--against)}
.spark{display:flex;gap:1px;align-items:flex-end;height:60px;overflow:hidden}.spark div{flex:1 1 0;min-width:0;background:var(--teal);opacity:.8;border-radius:2px 2px 0 0}.spark div:hover{opacity:1;background:var(--acc2)}
.role{display:inline-block;margin-left:6px;padding:0 6px;border-radius:5px;font-size:.72em;font-weight:700;letter-spacing:.04em;color:var(--rc);border:1px solid color-mix(in srgb,var(--rc) 45%,transparent);background:color-mix(in srgb,var(--rc) 12%,transparent);vertical-align:middle;cursor:help;text-transform:uppercase}
.cov td{font-size:.92em}.cov .bar{height:6px;background:var(--none);border-radius:3px;overflow:hidden}.cov .bar span{display:block;height:100%;background:var(--teal)}
table{width:100%;border-collapse:collapse}th{color:var(--dim);font-weight:700;font-size:.7em;text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:6px 8px}td{padding:8px;border-top:1px solid rgba(255,255,255,.05);vertical-align:middle}
tr.click{cursor:pointer}tr.click:hover{background:rgba(45,212,191,.06)}td.num{text-align:right}
.pill{display:inline-block;min-width:22px;text-align:center;padding:0 6px;border-radius:6px;font-size:.85em}.pill.for{background:rgba(74,222,128,.15);color:var(--for)}.pill.against{background:rgba(248,113,113,.15);color:var(--against)}.pill.mixed{background:rgba(250,204,21,.15);color:var(--mixed)}.pill.hostile{background:rgba(248,113,113,.15);color:var(--against)}.pill.dim{color:var(--dim)}
.empty{color:var(--dim);padding:30px;text-align:center}
.topics .tag{margin:3px 4px 3px 0;cursor:pointer}.topics .tag:hover{color:var(--acc2);border-color:var(--acc)}
.rq{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.rq input[type=text]{flex:1;min-width:280px;background:var(--bg2);border:1px solid rgba(148,163,184,.35);color:#fff;padding:.7em .9em;border-radius:.5em;font:500 15px Outfit,sans-serif}.rq input:focus{outline:0;border-color:var(--acc)}
footer{max-width:1400px;margin:0 auto;padding:10px 1.5em 30px;color:var(--dim);font-size:.78em;border-top:1px solid rgba(255,255,255,.06)}
</style></head><body>
<div class="sh"><div class="sh-wrap">
 <div class="sh-brand"><img src="data:image/png;base64,__LOGO__" alt=""><div><h1>__TITLE__</h1><span class="sub">__SUBTITLE__</span></div></div>
 <nav class="sh-nav" id="nav"></nav>
 <div class="sh-right">built __BUILT__<br>labels are model readings — open the originals</div>
</div></div>
<div class="flt"><div class="flt-wrap">
  <label>Range<span class="chips"><button data-d="7">7d</button><button data-d="30">30d</button><button data-d="90">90d</button><button data-d="365">1y</button><button data-d="0" class="on">all</button></span></label>
  <label>Chat<select id="fchat"><option value="">all chats</option></select></label>
  <label>Kind<select id="fkind"></select></label>
  <label>Person<select id="fsender"><option value="">anyone</option></select></label>
  <label>About<select id="ftarget"><option value="">anything</option></select></label>
  <label>Search<input id="fq" type="text" placeholder="word, topic, name"></label>
  <button id="more">more ▾</button><button id="reset">reset</button><button onclick="exportCsv()" title="download the messages currently in view as CSV">csv</button>
  <span class="flt-adv">
   <label>From<input id="ffrom" type="date"></label><label>To<input id="fto" type="date"></label>
   <label>Role<select id="frole"><option value="">any role</option></select></label>
   <span class="chk"><input class="acc" id="fnot" type="checkbox"> notable only</span>
   <span class="chk"><input class="acc" id="flab" type="checkbox" checked> labeled only</span>
  </span>
</div><div class="flt-note" id="fnote"></div></div>
<main id="main"></main>
<footer>Private analytics over public Telegram groups · nothing here is published · every count links to its source messages</footer>
<script>
let DATA=__DATA__; const PUBLIC=__PUBBOOL__, KINDS=__KINDS__, MIN_DATE="__MINDATE__", COVERAGE=__COVERAGE__, ROLES=__ROLES__, MANIFEST=__MANIFEST__, EXCL=__EXCL__;
const rolesOf=s=>(ROLES.people[s]||{}).roles||[];
const badge=s=>rolesOf(s).map(r=>`<span class="role" style="--rc:${esc(ROLES.colors[r]||'#9aa1ad')}" title="${esc((ROLES.people[s]||{}).verified||'')}">${esc(r)}</span>`).join('');
const PRIMARY=PUBLIC?[['overview','Overview'],['targets','Teams & people'],['qp','Questions & ideas'],['search','Search'],['about','About']]
 :[['overview','Overview'],['people','People'],['targets','Teams & topics'],['replies','Replies'],['qp','Questions & promises'],['search','Search'],['about','About']];
const SUB=[];const VIEWS=PRIMARY;
const KINDOPTS=PUBLIC?[['','any kind'],['idea','ideas'],['question','questions'],['openq','open questions'],['commitment','commitments'],['support','support'],['announcement','announcements'],['notable','★ notable']]
 :[['','any kind'],['idea','ideas'],['question','questions'],['openq','open questions (no reply)'],['commitment','commitments'],['feedback','feedback'],['support','support'],['criticism','criticism'],['announcement','announcements'],['hostile','hostile tone'],['notable','★ notable'],['reacted','reacted to (3+)']];
let view='overview', drill=null;
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uniq=a=>[...new Set(a)].sort((x,y)=>x.localeCompare(y));
function init(){
 const nav=$('#nav'); PRIMARY.forEach(([k,l])=>{const b=document.createElement('button');b.className='sh-tab';b.dataset.k=k;b.innerHTML=l+'<span class="cnt" id="c_'+k+'"></span>';b.onclick=()=>{view=k;drill=null;render();window.scrollTo({top:0});};nav.appendChild(b);});
 KINDOPTS.forEach(([v,l])=>$('#fkind').insertAdjacentHTML('beforeend',`<option value="${v}">${l}</option>`));
 $('#more').onclick=()=>{$('.flt-adv').classList.toggle('open');};
 for(const c of uniq(DATA.map(d=>d.chat))) $('#fchat').insertAdjacentHTML('beforeend',`<option>${esc(c)}</option>`);
 for(const s of uniq(DATA.map(d=>d.sender))) $('#fsender').insertAdjacentHTML('beforeend',`<option>${esc(s)}</option>`);
 for(const r of uniq(Object.values(ROLES.people).flatMap(p=>p.roles||[]))) $('#frole').insertAdjacentHTML('beforeend',`<option>${esc(r)}</option>`);
 for(const s of uniq(DATA.flatMap(d=>d.targets))) $('#ftarget').insertAdjacentHTML('beforeend',`<option>${esc(s)}</option>`);
 $('#ffrom').value=MIN_DATE;
 document.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{const d=+b.dataset.d;const mx=DATA.reduce((m,r)=>r.date>m?r.date:m,'').slice(0,10);
   if(!d){$('#ffrom').value=MIN_DATE;$('#fto').value='';}else{const t=new Date(mx);t.setUTCDate(t.getUTCDate()-d);$('#ffrom').value=t.toISOString().slice(0,10);$('#fto').value='';}
   document.querySelectorAll('.chips button').forEach(x=>x.classList.toggle('on',x===b));render();});
 document.querySelectorAll('.flt input,.flt select').forEach(e=>e.oninput=()=>{document.querySelectorAll('.chips button').forEach(x=>x.classList.remove('on'));render();});
 $('#reset').onclick=()=>{$('#fchat').value='';$('#ffrom').value=MIN_DATE;$('#fto').value='';$('#fsender').value='';$('#frole').value='';$('#ftarget').value='';$('#fkind').value='';document.querySelectorAll('.chips button').forEach(x=>x.classList.toggle('on',x.dataset.d==='0'));$('#fq').value='';$('#fnot').checked=false;$('#flab').checked=true;drill=null;render();};
 readHash();render();
}
function filtered(){
 const c=$('#fchat').value,f=$('#ffrom').value,t=$('#fto').value,s=$('#fsender').value,ro=$('#frole').value,tg=$('#ftarget').value,q=$('#fq').value.toLowerCase(),n=$('#fnot').checked,lab=$('#flab').checked,kd=$('#fkind').value;
 const kindOk=d=>!kd||(kd==='openq'?(d.kind==='question'&&!d.nrep):kd==='notable'?d.notable:kd==='hostile'?d.tone==='hostile':kd==='reacted'?(d.rx&&d.rx[0]>=3):d.kind===kd);
 return DATA.filter(d=>kindOk(d)&&(!c||d.chat===c)&&(!f||d.date>=f)&&(!t||d.date<=t+'~')&&(!s||d.sender===s)&&(!ro||rolesOf(d.sender).includes(ro))&&(!tg||d.targets.includes(tg))&&(!n||d.notable)&&(!lab||d.kind!=='unlabeled')
   &&(!q||((d.text||'')+' '+d.summary+' '+d.topics.join(' ')+' '+d.sender).toLowerCase().includes(q)));
}
function count(rows,key){const m={};rows.forEach(r=>{const v=key(r);(Array.isArray(v)?v:[v]).forEach(x=>{if(x)m[x]=(m[x]||0)+1;});});return Object.entries(m).sort((a,b)=>b[1]-a[1]);}
const stAt=(r,t)=>t?((r.st&&r.st[t])||r.stance||'none'):(r.stance||'none');   // stance toward one target (falls back to overall)
function stanceOf(rows,target){const f=target?rows.filter(r=>r.targets.includes(target)):rows;const c={for:0,against:0,mixed:0,none:0};f.forEach(r=>{const v=stAt(r,target);c[v]=(c[v]||0)+1;});return c;}
function sbar(c){const t=c.for+c.against+c.mixed+c.none||1;return `<div class="sbar" title="for ${c.for} · against ${c.against} · mixed ${c.mixed} · neutral ${c.none}"><span style="width:${100*c.for/t}%;background:var(--for)"></span><span style="width:${100*c.mixed/t}%;background:var(--mixed)"></span><span style="width:${100*c.against/t}%;background:var(--against)"></span></div>`;}
const legend=PUBLIC?`<div class="leg"><span><i style="background:var(--idea)"></i>ideas</span><span><i style="background:var(--q)"></i>questions</span><span><i style="background:var(--for)"></i>support</span><span><i style="background:var(--teal)"></i>announcements</span></div>`
 :`<div class="leg"><span><i style="background:var(--for)"></i>for / supportive</span><span><i style="background:var(--mixed)"></i>mixed</span><span><i style="background:var(--against)"></i>against / critical</span><span><i style="background:var(--none)"></i>neutral</span></div>`;
function kbar(rows){const c={idea:0,question:0,support:0,announcement:0};rows.forEach(r=>{if(c[r.kind]!==undefined)c[r.kind]++;});const t=rows.length||1;return `<div class="sbar" title="ideas ${c.idea} · questions ${c.question} · support ${c.support} · announcements ${c.announcement}"><span style="width:${100*c.idea/t}%;background:var(--idea)"></span><span style="width:${100*c.question/t}%;background:var(--q)"></span><span style="width:${100*c.support/t}%;background:var(--for)"></span><span style="width:${100*c.announcement/t}%;background:var(--teal)"></span></div>`;}
let sortBy='volume';function setSort(x){sortBy=x;render();}
function stanceList(rows,key,onclick,limit){const all=rows;if(onclick==='goPerson')rows=rows.filter(r=>r.kind!=='chatter');let items=count(rows,key);const totals=onclick==='goPerson'?Object.fromEntries(count(all,key)):null;
 const per=k=>{const sub=rows.filter(r=>(Array.isArray(key(r))?key(r):[key(r)]).includes(k));return (onclick==='goTarget'||onclick==='drillBoth')?stanceOf(sub,k):stanceOf(sub);};
 if(!PUBLIC&&sortBy!=='volume'){items=items.filter(x=>x[1]>=3).map(([k,n])=>{const c=per(k);const t=c.for+c.against+c.mixed+c.none||1;return [k,n,sortBy==='critical'?c.against/t:c.for/t];}).sort((a,b)=>b[2]-a[2]);}
 items=items.slice(0,limit||20);
 const sorter=PUBLIC?'':`<span class="sorter">sort: ${['volume','critical','supportive'].map(x=>`<a href="#" class="${sortBy===x?'on':''}" onclick="setSort('${x}');return false">${x}</a>`).join('')}</span>`;
 return sorter+legend+items.map(([k,n])=>{const sub=rows.filter(r=>(Array.isArray(key(r))?key(r):[key(r)]).includes(k));const c=(onclick==='goTarget'||onclick==='drillBoth')?stanceOf(sub,k):stanceOf(sub);
  return `<div class="srow" onclick="${onclick}('${esc(k).replace(/'/g,"\\'")}')"><div class="nm" title="${esc(k)}">${esc(k)}${onclick==='goPerson'?badge(k):''}</div>${PUBLIC?kbar(sub):sbar(c)}<div class="tot" title="${totals?'substantive posts / all posts incl. chatter':''}">${n}${totals&&totals[k]!==n?`<span style="color:var(--dim)"> / ${totals[k]}</span>`:''}</div></div>`;}).join('');}
function card(r){const txt=esc(r.text||'');const long=(r.text||'').length>420;
 return `<div class="msg ${esc(r.stance)} ${r.notable?'notable':''}"><div class="top"><b onclick="goPerson('${esc(r.sender).replace(/'/g,"\\'")}')">${esc(r.sender)}</b>${badge(r.sender)}<span class="d">${esc(r.date.slice(0,16))}</span><span>${esc(r.chat)}</span>${r.reply_to?'<span>↩ reply</span>':''}${r.nrep?`<span class="rep">${r.nrep} repl${r.nrep>1?'ies':'y'}</span>`:''}${r.rx?`<span class="rxs" title="${esc(r.rx[2].join(', '))}${r.rx[2].length?' …':''}">${esc(r.rx[1])} <b>${r.rx[0]}</b></span>`:''}<a href="${esc(r.url)}" target="_blank">open ↗</a></div>
 ${r.rt?`<div class="rt">↩ <b>${esc(r.rt[0])}</b>${r.rt[1]?': '+esc(r.rt[1]):''}</div>`:''}<div class="sum">${r.ov?`<span class="ovm" title="${esc(r.ov)}">✎ corrected</span> `:''}${esc(r.summary||(r.text||'').slice(0,140))}</div>${txt?`<div class="txt${long?'':' open'}" onclick="this.classList.toggle('open')">${txt}</div>${long?'<div class="more">click text to expand</div>':''}`:''}
 <div class="tags">${r.kind!=='unlabeled'?`<span class="tag ${esc(r.kind)}">${esc(r.kind)}</span>`:'<span class="tag">unlabeled</span>'}${r.tone?`<span class="tag ${esc(r.tone)}">${esc(r.tone)}</span>`:''}${r.stance&&r.stance!=='none'?`<span class="tag ${esc(r.stance)}">${esc(r.stance)}</span>`:''}${r.targets.map(t=>`<span class="tag" onclick="goTarget('${esc(t).replace(/'/g,"\\'")}')" style="cursor:pointer">→ ${esc(t)}</span>`).join('')}${!PUBLIC&&r.tp&&r.tp!=='none'&&r.rt?`<span class="tag ${esc(r.tp)}">${r.tp==='for'?'backs':r.tp==='against'?'against':'mixed on'} ${esc(r.rt[0])}</span>`:''}${!PUBLIC&&r.ad?`<span class="mv ${r.ad==='direct'?'good':r.ad==='none'?'bad':''}">${r.ad==='direct'?'answers':r.ad==='partial'?'partly answers':'does not answer'}</span>`:''}${(r.mv||[]).map(m=>`<span class="mv ${['ad-hominem','subject-change','dismissal','misstates-other','denies-prior'].includes(m)?'bad':['evidence','concedes'].includes(m)?'good':''}">${esc(m)}</span>`).join('')}${r.topics.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div></div>`;}
let listSort='newest';
function list(rows,max){rows=[...rows].sort((a,b)=>listSort==='reacted'?((b.rx?b.rx[0]:0)-(a.rx?a.rx[0]:0))||b.date.localeCompare(a.date):listSort==='replied'?(b.nrep-a.nrep)||b.date.localeCompare(a.date):b.date.localeCompare(a.date));const n=rows.length;rows=rows.slice(0,max||400);return rows.length?`<div class="msgs">${rows.map(card).join('')}</div>${n>rows.length?`<div class="empty">showing ${rows.length} of ${n} — narrow the filters to see the rest</div>`:''}`:'<div class="empty">nothing matches</div>';}
function goTarget(t){view='targets';drill=t;drill2=null;render();window.scrollTo(0,0);}
function goPerson(p){view='people';drill=p;drill2=null;render();window.scrollTo(0,0);}
function syncHash(){try{const h=new URLSearchParams();h.set('v',view);if(drill)h.set('d',drill);if(drill2)h.set('d2',drill2);history.replaceState(null,'','#'+h.toString());}catch(e){}}
function readHash(){try{const h=new URLSearchParams(location.hash.slice(1));if(h.get('v')&&PRIMARY.some(([k])=>k===h.get('v'))){view=h.get('v');drill=h.get('d')||null;drill2=h.get('d2')||null;}}catch(e){}}
function exportCsv(){const rows=filtered();const cols=['chat','id','date','sender','kind','tone','stance','targets','topics','summary','url','text'];
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv=[cols.join(',')].concat(rows.map(r=>cols.map(c=>q(Array.isArray(r[c])?r[c].join('; '):r[c])).join(','))).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='social-board-export.csv';a.click();}
function spark(rows){if(!rows.length)return '<div class="empty">nothing</div>';
 const ds=rows.map(r=>r.date.slice(0,10)).sort();const span=(new Date(ds.at(-1))-new Date(ds[0]))/864e5;
 const unit=span>900?'month':span>150?'week':'day';
 const key=d=>unit==='day'?d:unit==='month'?d.slice(0,7):(x=>{const t=new Date(x);t.setUTCDate(t.getUTCDate()-t.getUTCDay());return t.toISOString().slice(0,10);})(d);
 const m={};ds.forEach(d=>{const k=key(d);m[k]=(m[k]||0)+1;});const by=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
 const mx=Math.max(1,...by.map(x=>x[1]));
 return `<div class="spark">${by.map(([d,n])=>`<div title="${d}: ${n}" style="height:${Math.max(2,100*n/mx)}%"></div>`).join('')}</div><div class="n" style="color:var(--dim);font-size:12px;margin-top:4px">${ds[0]} → ${ds.at(-1)} · per ${unit} · peak ${mx}</div>`;}
let rq='';
function raised(rows){
 const lab=rows.filter(r=>r.kind!=='unlabeled');
 let h=`<div class="hd"><h2>Raised before?</h2><span class="n">has someone already suggested, asked or announced this — and when</span></div>`;
 h+=`<div class="card" style="margin-bottom:14px"><div class="rq"><input id="rq" type="text" placeholder="e.g. ampLUNA validator · wBTC bribes · move ALLY rewards · fifth director" value="${esc(rq)}">
  <span class="chk"><input class="acc" id="rqall" type="checkbox" ${window.rqall?'checked':''}> include every kind (not only ideas, questions, announcements)</span></div>
  <div style="color:var(--dim);font-size:.8em;margin-top:8px">All the words must appear in the message, its summary or its topics. Results are grouped oldest → newest so you can see who raised it first and how often it comes back.</div></div>`;
 if(!rq.trim()) return h;
 const ws=rq.toLowerCase().split(/\s+/).filter(Boolean);
 const kinds=window.rqall?null:new Set(['idea','question','announcement','feedback']);
 const hits=lab.filter(r=>(!kinds||kinds.has(r.kind))&&ws.every(w=>((r.text||'')+' '+r.summary+' '+r.topics.join(' ')).toLowerCase().includes(w))).sort((a,b)=>a.date.localeCompare(b.date));
 if(!hits.length) return h+`<div class="empty">nothing matches — try fewer or different words</div>`;
 const who=count(hits,r=>r.sender).slice(0,8), byk=count(hits,r=>r.kind), byc=count(hits,r=>r.chat);
 h+=`<div class="kpis"><div class="kpi"><b>${hits.length}</b><span>times raised</span></div><div class="kpi"><b style="font-size:1.05em">${esc(hits[0].date.slice(0,10))}</b><span>first · ${esc(hits[0].sender)}</span></div><div class="kpi"><b style="font-size:1.05em">${esc(hits.at(-1).date.slice(0,10))}</b><span>latest · ${esc(hits.at(-1).sender)}</span></div><div class="kpi"><b style="font-size:1.05em">${who.map(([s,n])=>esc(s)+' '+n).slice(0,3).join(' · ')}</b><span>raised most by</span></div></div>`;
 h+=`<div class="grid ov2" style="margin-bottom:14px"><div class="card"><h3>When it came up</h3>${spark(hits)}</div><div class="card"><h3>Where & what kind</h3><div class="leg">${byc.map(([c,n])=>`<span><b>${esc(c)}</b> ${n}</span>`).join('')}</div><div>${byk.map(([k,n])=>`<span class="tag ${esc(k)}">${esc(k)} ${n}</span>`).join(' ')}</div></div></div>`;
 h+=`<div class="msgs">${hits.slice(0,200).map(card).join('')}</div>${hits.length>200?`<div class="empty">showing 200 of ${hits.length}</div>`:''}`;
 return h;}
function trend(rows,target){
 if(!rows.length)return '<div class="empty">nothing</div>';
 const ds=rows.map(r=>r.date.slice(0,10)).sort();const span=(new Date(ds.at(-1))-new Date(ds[0]))/864e5;const unit=span>400?'month':'week';
 const key=d=>unit==='month'?d.slice(0,7):(x=>{const t=new Date(x);t.setUTCDate(t.getUTCDate()-t.getUTCDay());return t.toISOString().slice(0,10);})(d);
 const m={};rows.forEach(r=>{const k=key(r.date.slice(0,10));m[k]=m[k]||{for:0,mixed:0,against:0,none:0};m[k][stAt(r,target)]++;});
 const by=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));const mx=Math.max(1,...by.map(([,c])=>c.for+c.mixed+c.against+c.none));
 const h=`<div class="trend">${by.map(([k,c])=>`<div class="m" title="${k}: for ${c.for} · mixed ${c.mixed} · against ${c.against} · neutral ${c.none}"><span class="n" style="height:${90*c.none/mx}px"></span><span class="f" style="height:${90*c.for/mx}px"></span><span class="x" style="height:${90*c.mixed/mx}px"></span><span class="a" style="height:${90*c.against/mx}px"></span></div>`).join('')}</div><div class="tlab"><span>${by[0][0]}</span><span>per ${unit}</span><span>${by.at(-1)[0]}</span></div>`;
 const last=by.slice(-3),prev=by.slice(-6,-3);const net=a=>a.reduce((s,[,c])=>s+c.for-c.against,0),tot=a=>a.reduce((s,[,c])=>s+c.for+c.against+c.mixed+c.none,0);
 const line=prev.length?`<div class="net" style="margin-top:6px">recent ${unit}s: <b>+${last.reduce((s,[,c])=>s+c.for,0)}</b> / <i>−${last.reduce((s,[,c])=>s+c.against,0)}</i> (net ${net(last)>=0?'+':''}${net(last)}) · before that: net ${net(prev)>=0?'+':''}${net(prev)} · volume ${tot(last)} vs ${tot(prev)}</div>`:'';
 return h+line;}
const hint=t=>`<div class="hint">${t}</div>`;
const pager=(opts,cur,fn)=>`<div class="pg">${opts.map(([k,l,n])=>`<button class="${cur===k?'on':''}" onclick="${fn}('${k}')">${l}${n!==undefined?`<span class="cnt">${n}</span>`:''}</button>`).join('')}</div>`;
let qpTab='openq',srTab='raised',abTab='coverage',rpTab='matrix';function setQp(k){qpTab=k;render();}function setSr(k){srTab=k;render();}function setAb(k){abTab=k;render();}function setRp(k){rpTab=k;drill=null;render();}function setListSort(k){listSort=k;render();}
const sortBar=()=>`<span class="sorter" style="float:none;margin-left:auto">sort: ${[['newest','newest'],['reacted','most reacted'],['replied','most replied']].map(([k,l])=>`<a href="#" class="${listSort===k?'on':''}" onclick="setListSort('${k}');return false">${l}</a>`).join('')}</span>`;
const stripHd=h=>h.replace(/<div class="hd">[\s\S]*?<\/div>/,'');
function qp(rows){const lab=rows.filter(r=>r.kind!=='unlabeled');
 const oq=lab.filter(r=>r.kind==='question'&&!r.nrep),cm=lab.filter(r=>r.kind==='commitment'),id=lab.filter(r=>r.kind==='idea'),qs=lab.filter(r=>r.kind==='question'),an=lab.filter(r=>r.kind==='announcement');
 let h=`<div class="hd"><h2>${PUBLIC?'Questions & ideas':'Questions & promises'}</h2>${sortBar()}</div>`+hint('What people asked, what they proposed, what they promised. <b>Open questions</b> got no reply in the chat. <b>Commitments</b> are promises or deadlines — check them against what happened.');
 h+=pager([['openq','Open questions',oq.length],['question','All questions',qs.length],['idea','Ideas',id.length],['commitment','Commitments',cm.length],['announcement','Announcements',an.length]],qpTab,'setQp');
 const pick={openq:oq,question:qs,idea:id,commitment:cm,announcement:an}[qpTab]||oq;
 return h+list(pick,400);}
function searchPage(rows){
 let h=`<div class="hd"><h2>Search</h2>${sortBar()}</div>`+hint('<b>Raised before?</b> finds every time a topic came up and who raised it first. <b>Feed</b> is everything in view, newest first — use the filters above to narrow.');
 h+=pager([['raised','Raised before?'],['feed','Feed',rows.length],['notable','★ Notable',rows.filter(r=>r.notable).length]].concat(PUBLIC?[]:[['hostile','Hostile tone',rows.filter(r=>r.tone==='hostile').length]]),srTab,'setSr');
 if(srTab==='raised')return h+stripHd(raised(rows));
 if(srTab==='notable')return h+list(rows.filter(r=>r.notable),400);
 if(srTab==='hostile')return h+list(rows.filter(r=>r.tone==='hostile'),400);
 return h+list(rows,400);}
function about(){
 let h=`<div class="hd"><h2>About this board</h2></div>`+hint('What is in the store, how the labels are made, and what they can and cannot tell you.');
 h+=pager([['coverage','Coverage'],['method','Method & limits']],abTab,'setAb');
 if(abTab==='coverage')return h+stripHd(coverage());
 return h+`<div class="card" style="line-height:1.65;max-width:900px">
 <h3>What goes in</h3><p>Telegram Desktop HTML exports of public groups only (see Coverage). Bots and stickers are dropped. Direct messages, the council chat and any private group are never imported.</p>
 <h3>How a message gets its labels</h3><p>Messages under 40 characters are marked <i>chatter</i> by rule. Every other message is sent to a language model in batches of 25 with the message it replies to and the two messages before it. The model returns a fixed set of fields: kind (idea, question, answer, feedback, support, criticism, commitment, announcement, chatter), tone (constructive / neutral / hostile), stance toward each team or person the message is about, topics, a one-line neutral summary, and — for replies — the stance toward the person replied to, whether the reply addresses the point (fully / partly / not at all) and which observable moves it makes (counter-question, subject change, ad-hominem, misstating the other, dismissal, concession, evidence, deferral).</p>
 <h3>What the labels are not</h3><p>They are one model's reading of one message, not a verdict on a person. They do not infer intent or motive. A "does not answer" tag means the reply text does not engage the question's point — it does not say why. "Denies prior" only flags a denial; it is not checked against the record. Sarcasm, in-jokes, deleted accounts and changed display names all cause misreads.</p>
 <h3>How to use a number</h3><p>Every count links to its rows and every row links to the original message. Read the rows before quoting a count. Compare people only on the same window and the same chats. Treat anything under ~20 rows as anecdote.</p>
 <h3>Quality check</h3><p>Planned: 50 random rows a week hand-checked; the agreement rate will be shown here once there are enough checks.</p>
 <h3>This build</h3><table><tr><td>model</td><td class="num">${esc(MANIFEST.model)}</td></tr><tr><td>prompt hash</td><td class="num">${esc(MANIFEST.prompt_sha256)}</td></tr><tr><td>batch size / workers</td><td class="num">${MANIFEST.batch_size} / ${MANIFEST.workers}</td></tr><tr><td>chatter rule</td><td class="num">&lt; ${MANIFEST.min_text_chars} chars</td></tr><tr><td>messages on this page</td><td class="num">${DATA.length.toLocaleString()}</td></tr><tr><td>hand corrections (✎, original label kept)</td><td class="num">${MANIFEST.overrides}</td></tr><tr><td>excluded rows</td><td class="num">${MANIFEST.exclusions}</td></tr></table>
 ${Object.keys(EXCL).length?`<h3>Excluded rows</h3><table>${Object.entries(EXCL).map(([k,v])=>`<tr><td class="num">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`:''}
 <h3>The exact prompt</h3><pre class="prompt">${esc(MANIFEST.prompt)}</pre></div>`;}
function replies(rows){const lab=rows.filter(r=>r.kind!=='unlabeled'&&r.rt);
 let h=`<div class="hd"><h2>Replies</h2><span class="n">${lab.length} replies in view</span></div>`+hint('Built from the reply graph. <b>Backing & attacking</b>: whose replies back or go against whom. <b>How people respond</b>: when a question or criticism is put to someone, does the reply engage it, and what moves does it make. Every count opens the question → reply pairs.');
 h+=pager([['matrix','Backing & attacking'],['behaviour','How people respond']],rpTab,'setRp');
 const BAD=['ad-hominem','subject-change','dismissal','misstates-other','denies-prior'],GOOD=['evidence','concedes'];
 if(rpTab==='matrix'){
  const rel=lab.filter(r=>r.tp==='for'||r.tp==='against');if(!rel.length)return h+'<div class="empty">no reply-stance labels in view yet (they come from classify.py)</div>';
  const pairs={};rel.forEach(r=>{const k=r.sender+'\u0000'+r.rt[0];pairs[k]=pairs[k]||{for:0,against:0};pairs[k][r.tp]++;});
  const top=Object.entries(pairs).map(([k,c])=>({a:k.split('\u0000')[0],b:k.split('\u0000')[1],...c,n:c.for+c.against})).filter(x=>x.a!==x.b).sort((x,y)=>y.n-x.n);
  const per={};rel.forEach(r=>{const a=per[r.sender]=per[r.sender]||{backs:{},attacks:{},backedBy:{},attackedBy:{}};const b=per[r.rt[0]]=per[r.rt[0]]||{backs:{},attacks:{},backedBy:{},attackedBy:{}};
   if(r.tp==='for'){a.backs[r.rt[0]]=(a.backs[r.rt[0]]||0)+1;b.backedBy[r.sender]=(b.backedBy[r.sender]||0)+1;}else{a.attacks[r.rt[0]]=(a.attacks[r.rt[0]]||0)+1;b.attackedBy[r.sender]=(b.attackedBy[r.sender]||0)+1;}});
  const tops=o=>Object.entries(o).sort((x,y)=>y[1]-x[1]).slice(0,4).map(([k,n])=>`${esc(k)} <span style="color:var(--dim)">${n}</span>`).join(' · ')||'—';
  if(drill&&per[drill]){const d=per[drill];const mine=rel.filter(r=>r.sender===drill||r.rt[0]===drill);
   h+=`<div class="crumb"><a href="#" onclick="drill=null;render();return false">Backing & attacking</a> › ${esc(drill)}</div><div class="mx" style="margin-bottom:14px"><div class="card"><h3 style="color:var(--for)">${esc(drill)} backs</h3>${tops(d.backs)}</div><div class="card"><h3 style="color:var(--against)">${esc(drill)} goes against</h3>${tops(d.attacks)}</div><div class="card"><h3 style="color:var(--for)">backed by</h3>${tops(d.backedBy)}</div><div class="card"><h3 style="color:var(--against)">attacked by</h3>${tops(d.attackedBy)}</div></div>`;
   return h+`<h3 style="font-size:.95em;color:var(--mut)">the pairs — what was said (left) and the reply (right)</h3>`+pairsList(mine);}
  const row=x=>`<tr class="click" onclick="drill='${esc(x.a).replace(/'/g,"\\'")}';render()"><td>${esc(x.a)}</td><td>${esc(x.b)}</td><td class="num"><span class="pill against">${x.against||''}</span></td><td class="num"><span class="pill for">${x.for||''}</span></td></tr>`;
  h+=`<div class="grid ov"><div class="card"><h3>Who goes against whom (replies)</h3><table><tr><th>from</th><th>to</th><th class="num">against</th><th class="num">backs</th></tr>${top.filter(x=>x.against).sort((x,y)=>y.against-x.against).slice(0,25).map(row).join('')}</table></div>
  <div class="card"><h3>Who backs whom (replies)</h3><table><tr><th>from</th><th>to</th><th class="num">against</th><th class="num">backs</th></tr>${top.filter(x=>x.for).sort((x,y)=>y.for-x.for).slice(0,25).map(row).join('')}</table></div></div>`;
  return h;}
 const rel=lab.filter(r=>r.ad);if(!rel.length)return h+'<div class="empty">no reply-behaviour labels in view yet (they come from classify.py)</div>';
 const per={};rel.forEach(r=>{const p=per[r.sender]=per[r.sender]||{n:0,direct:0,partial:0,none:0,mv:{}};p.n++;p[r.ad]++;(r.mv||[]).forEach(m=>p.mv[m]=(p.mv[m]||0)+1);});
 const mvs=p=>Object.entries(p.mv).sort((a,b)=>b[1]-a[1]).map(([m,n])=>`<span class="mv ${BAD.includes(m)?'bad':GOOD.includes(m)?'good':''}">${esc(m)} ${n}</span>`).join('')||'—';
 if(drill&&per[drill]){const mine=rel.filter(r=>r.sender===drill);const p=per[drill];h+=`<div class="crumb"><a href="#" onclick="drill=null;render();return false">How people respond</a> › ${esc(drill)}</div>`;
  h+=`<div class="kpis"><div class="kpi"><b>${p.n}</b><span>replies to questions / criticism</span></div><div class="kpi"><b style="color:var(--for)">${Math.round(100*p.direct/p.n)}%</b><span>answers the point</span></div><div class="kpi"><b style="color:var(--mixed)">${Math.round(100*p.partial/p.n)}%</b><span>partly</span></div><div class="kpi"><b style="color:var(--against)">${Math.round(100*p.none/p.n)}%</b><span>does not answer</span></div></div><div class="card" style="margin-bottom:14px"><h3>moves</h3>${mvs(p)}</div>`;
  return h+pairsList(mine);}
 const rowsT=Object.entries(per).filter(([,p])=>p.n>=3).sort((a,b)=>b[1].n-a[1].n);
 h+=`<div class="card beh"><table><tr><th>person</th><th class="num">replies</th><th class="num">answers</th><th class="num">partly</th><th class="num">doesn't</th><th>moves (click the name for the pairs)</th></tr>${rowsT.map(([s,p])=>`<tr class="click" onclick="drill='${esc(s).replace(/'/g,"\\'")}';render()"><td>${esc(s)}${badge(s)}</td><td class="num">${p.n}</td><td class="num"><span class="pct d">${Math.round(100*p.direct/p.n)}%</span></td><td class="num"><span class="pct p">${Math.round(100*p.partial/p.n)}%</span></td><td class="num"><span class="pct n">${Math.round(100*p.none/p.n)}%</span></td><td>${mvs(p)}</td></tr>`).join('')}</table><div style="color:var(--dim);font-size:.8em;margin-top:8px">people with fewer than 3 labeled replies are not listed. "answers" = the reply engages the actual point of the question or criticism; it says nothing about whether the answer is right.</div></div>`;
 return h;}
function pairsList(rows){rows=[...rows].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,150);
 return rows.map(r=>{const parent=DATA.find(x=>x.chat===r.chat&&x.id===r.reply_to);return `<div class="pair">${parent?card(parent):`<div class="msg"><div class="top"><b>${esc(r.rt[0])}</b><span>(not in this page)</span></div>${r.rt[1]?`<div class="txt open">${esc(r.rt[1])}</div>`:''}</div>`}${card(r)}</div>`;}).join('')||'<div class="empty">nothing</div>';}
function coverage(){
 let h=`<div class="hd"><h2>Coverage</h2><span class="n">what is in the store (board.sqlite) — not just what is on this page</span></div>`;
 h+=`<div class="card cov"><table><tr><th>chat</th><th>first message</th><th>last message</th><th class="num">messages</th><th class="num">substantive</th><th class="num">labeled</th><th style="width:140px">labeled %</th><th class="num">on this page</th></tr>`;
 const onpage=count(DATA,r=>r.chat);
 for(const c of COVERAGE){const pct=c.subst?Math.round(100*c.labeled/c.subst):0;const op=(onpage.find(x=>x[0]===c.chat)||[0,0])[1];
  h+=`<tr><td><b>${esc(c.chat)}</b><div style="color:var(--dim);font-size:11px">${esc(c.title)}</div></td><td>${c.first}</td><td>${c.last}${c.stale?' <span class="pill against" title="no export newer than this">stale</span>':''}</td><td class="num">${c.total.toLocaleString()}</td><td class="num">${c.subst.toLocaleString()}</td><td class="num">${c.labeled.toLocaleString()}</td><td><div class="bar"><span style="width:${Math.min(100,pct)}%"></span></div><div style="font-size:11px;color:var(--dim)">${pct}%</div></td><td class="num">${op.toLocaleString()}</td></tr>`;}
 h+=`</table><div style="color:var(--dim);font-size:12px;margin-top:10px">substantive = non-bot messages of 40+ characters (the ones sent to the labeler; shorter ones are counted as chatter by rule). "stale" = last message older than the newest export by more than 7 days — export that chat again from the day after "last message".</div></div>`;
 return h;}
function overview(rows){
 const lab=rows.filter(r=>r.kind!=='unlabeled');const k=count(lab,r=>r.kind);const tone=count(lab,r=>r.tone);const g=x=>(k.find(y=>y[0]===x)||[0,0])[1];const tn=x=>(tone.find(y=>y[0]===x)||[0,0])[1];
 let h=`<div class="hd"><h2>Overview</h2><span class="n">${rows.length} messages in view · ${lab.length} labeled</span></div>`+hint('Click a tile, a team or a name. Green = supportive, amber = mixed, red = critical, grey = neutral. Everything respects the filters above.');
 const K=(v,n,l,col)=>{const go={idea:"view='qp';qpTab='idea'",question:"view='qp';qpTab='question'",openq:"view='qp';qpTab='openq'",commitment:"view='qp';qpTab='commitment'",support:"view='search';srTab='feed';$('#fkind').value='support'",criticism:"view='search';srTab='feed';$('#fkind').value='criticism'",hostile:"view='search';srTab='hostile'",notable:"view='search';srTab='notable'"}[v]||`view='${v}'`;return `<div class="kpi link" onclick="${go};drill=null;render()"><b${col?` style="color:var(--${col})"`:''}>${n}</b><span>${l}</span></div>`;};
 h+=`<div class="kpis">${K('idea',g('idea'),'ideas')}${K('question',g('question'),'questions')}${K('openq',lab.filter(r=>r.kind==='question'&&!r.nrep).length,'open questions','q')}${K('commitment',g('commitment'),'commitments','teal')}${K('support',g('support'),'support','for')}${PUBLIC?'':K('criticism',g('criticism'),'criticism','crit')}${PUBLIC?'':K('hostile',tn('hostile'),'hostile','hostile')}${K('notable',lab.filter(r=>r.notable).length,'notable')}</div>`;
 h+=`<div class="grid ov"><div class="card"><h3>Who/what is being talked about — click to drill in</h3>${stanceList(lab,r=>r.targets,'goTarget',14)}</div>`;
 if(!PUBLIC) h+=`<div class="card"><h3>Who is talking — stance of their substantive posts (chatter excluded), click for detail</h3>${stanceList(lab,r=>r.sender,'goPerson',14)}</div>`;
 const hot=[...rows].filter(r=>r.rx).sort((a,b)=>b.rx[0]-a.rx[0]).slice(0,6);
 h+=`</div><div class="grid ov2"><div class="card"><h3>Activity</h3>${spark(rows)}</div><div class="card topics"><h3>Topics</h3>${count(lab,r=>r.topics).slice(0,30).map(([t,n])=>`<span class="tag" onclick="$('#fq').value='${esc(t)}';render()">${esc(t)} <span style="color:var(--dim)">${n}</span></span>`).join('')}</div></div>`;
 if(hot.length)h+=`<div class="card" style="margin-top:14px"><h3>Most reacted to in this view</h3><div class="msgs">${hot.map(card).join('')}</div></div>`;
 return h;}
function targets(rows){
 const lab=rows.filter(r=>r.kind!=='unlabeled');
 if(!drill) return `<div class="hd"><h2>${PUBLIC?'Teams & people':'Teams & topics'}</h2><span class="n">what is being talked about</span></div>`+hint('Click a team or person to see who talks about them, how, and whether it is getting better or worse.')+`<div class="card">${stanceList(lab,r=>r.targets,'goTarget',60)}</div>`;
 const f=lab.filter(r=>r.targets.includes(drill));const c=stanceOf(f,drill);
 let h=`<div class="crumb"><a href="#" onclick="drill=null;render();return false">Teams</a> › ${esc(drill)}</div><div class="hd"><h2>${esc(drill)}</h2><span class="n">${f.length} messages about this</span></div>`;
 if(PUBLIC){const k=x=>f.filter(r=>r.kind===x);h+=`<div class="kpis"><div class="kpi"><b style="color:var(--idea)">${k('idea').length}</b><span>ideas</span></div><div class="kpi"><b style="color:var(--q)">${k('question').length}</b><span>questions</span></div><div class="kpi"><b style="color:var(--for)">${k('support').length}</b><span>support</span></div><div class="kpi"><b style="color:var(--teal)">${k('announcement').length}</b><span>announcements</span></div></div>`;
  h+=`<div class="two"><div class="col"><h3 style="color:var(--idea)">Ideas (${k('idea').length})</h3>${list(k('idea'),150)}</div><div class="col"><h3 style="color:var(--q)">Questions (${k('question').length})</h3>${list(k('question'),150)}</div></div><div class="two" style="margin-top:14px"><div class="col"><h3 style="color:var(--for)">Support (${k('support').length})</h3>${list(k('support'),100)}</div><div class="col"><h3 style="color:var(--teal)">Announcements (${k('announcement').length})</h3>${list(k('announcement'),100)}</div></div>`;return h;}
 h+=`<div class="kpis"><div class="kpi"><b style="color:var(--for)">${c.for}</b><span>for / supportive</span></div><div class="kpi"><b style="color:var(--against)">${c.against}</b><span>against / critical</span></div><div class="kpi"><b style="color:var(--mixed)">${c.mixed}</b><span>mixed</span></div><div class="kpi"><b>${c.none}</b><span>neutral</span></div>${PUBLIC?'':`<div class="kpi"><b style="color:var(--hostile)">${f.filter(r=>r.tone==='hostile').length}</b><span>hostile tone</span></div>`}</div>`;
 if(!PUBLIC) h+=`<div class="grid ov2" style="margin-bottom:14px"><div class="card"><h3>Who talks about ${esc(drill)} — and how (click a person)</h3>${stanceList(f.map(r=>({...r,stance:stAt(r,drill)})),r=>r.sender,'goPerson',15)}</div><div class="card"><h3>Is it getting better or worse — stance toward ${esc(drill)} over time</h3>${trend(f,drill)}</div></div>`;
 h+=`<div class="two"><div class="col"><h3 class="for">Supportive (${c.for})</h3>${list(f.filter(r=>stAt(r,drill)==='for'),150)}</div><div class="col"><h3 class="against">Critical (${c.against})</h3>${list(f.filter(r=>stAt(r,drill)==='against'),150)}</div></div>`;
 const mx=f.filter(r=>stAt(r,drill)==='mixed');if(mx.length)h+=`<div class="col" style="margin-top:14px"><h3 style="color:var(--mixed)">Mixed (${mx.length})</h3>${list(mx,100)}</div>`;
 return h;}
function people(rows){
 const lab=rows.filter(r=>r.kind!=='unlabeled');
 if(!drill){let h=`<div class="hd"><h2>People</h2><span class="n">click a name</span></div>`+hint('Who is talking, what kind of posts they make, who they are mostly about. Role badges come from roles.json (verified only).')+`<div class="card"><table><tr><th>person</th><th class="num">labeled</th><th class="num">ideas</th><th class="num">questions</th><th class="num">support</th><th class="num">criticism</th><th class="num">hostile</th><th class="num">constructive</th><th>mostly about</th></tr>`;
  for(const [s,n] of count(lab,r=>r.sender).slice(0,60)){const f=lab.filter(r=>r.sender===s);const k=x=>f.filter(r=>r.kind===x).length,t=x=>f.filter(r=>r.tone===x).length;
   h+=`<tr class="click" onclick="goPerson('${esc(s).replace(/'/g,"\\'")}')"><td>${esc(s)}</td><td class="num">${n}</td><td class="num">${k('idea')}</td><td class="num">${k('question')}</td><td class="num"><span class="pill for">${k('support')}</span></td><td class="num"><span class="pill against">${k('criticism')}</span></td><td class="num"><span class="pill hostile">${t('hostile')}</span></td><td class="num"><span class="pill for">${t('constructive')}</span></td><td style="color:var(--dim);font-size:12px">${count(f,r=>r.targets).slice(0,3).map(x=>esc(x[0])+' '+x[1]).join(' · ')}</td></tr>`;}
  return h+`</table></div>`;}
 const f=lab.filter(r=>r.sender===drill);const all=rows.filter(r=>r.sender===drill);const tone=count(f,r=>r.tone),k=count(f,r=>r.kind);const g=(a,x)=>(a.find(y=>y[0]===x)||[0,0])[1];
 let h=`<div class="crumb"><a href="#" onclick="drill=null;render();return false">People</a> › ${esc(drill)}</div><div class="hd"><h2>${esc(drill)}${badge(drill)}</h2><span class="n">${all.length} messages in view · ${f.length} labeled</span></div>`;
 h+=`<div class="kpis"><div class="kpi"><b>${g(k,'idea')}</b><span>ideas</span></div><div class="kpi"><b>${g(k,'question')}</b><span>questions</span></div><div class="kpi"><b style="color:var(--for)">${g(k,'support')}</b><span>support</span></div><div class="kpi"><b style="color:var(--against)">${g(k,'criticism')}</b><span>criticism</span></div><div class="kpi"><b style="color:var(--constr)">${g(tone,'constructive')}</b><span>constructive</span></div><div class="kpi"><b style="color:var(--hostile)">${g(tone,'hostile')}</b><span>hostile</span></div></div>`;
 h+=`<div class="grid ov2"><div class="card"><h3>What ${esc(drill)} talks about — and their stance (click to see those posts)</h3>${stanceList(f,r=>r.targets,'drillBoth',20)}</div><div><div class="card" style="margin-bottom:14px"><h3>Tone of their posts over time</h3>${trend(f,null)}</div><div class="card"><h3>Activity</h3>${spark(all)}</div></div></div>`;
 if(drill2){const ff=f.filter(r=>r.targets.includes(drill2));h+=`<div class="hd" style="margin-top:16px"><h2 style="font-size:15px">${esc(drill)} about ${esc(drill2)}</h2><a href="#" onclick="drill2=null;render();return false" style="font-size:12px">clear</a></div><div class="two"><div class="col"><h3 class="for">Supportive (${ff.filter(r=>stAt(r,drill2)==='for').length})</h3>${list(ff.filter(r=>stAt(r,drill2)==='for'),100)}</div><div class="col"><h3 class="against">Critical (${ff.filter(r=>stAt(r,drill2)==='against').length})</h3>${list(ff.filter(r=>stAt(r,drill2)==='against'),100)}</div></div>${ff.filter(r=>!['for','against'].includes(stAt(r,drill2))).length?`<div class="col" style="margin-top:14px"><h3 style="color:var(--mut)">Neutral / mixed</h3>${list(ff.filter(r=>!['for','against'].includes(stAt(r,drill2))),100)}</div>`:''}`;}
 else h+=`<div class="hd" style="margin-top:16px"><h2 style="font-size:15px">All posts</h2></div>${list(all,300)}`;
 return h;}
let drill2=null; function drillBoth(t){drill2=t;render();}
function render(){
 document.querySelectorAll('#nav button,#subnav button').forEach(b=>b.classList.toggle('active',b.dataset.k===view));
 let rows=filtered();const lab=rows.filter(r=>r.kind!=='unlabeled');
 const cnt={replies:lab.filter(r=>r.rt&&(r.tp==='for'||r.tp==='against'||r.ad)).length,qp:lab.filter(r=>['question','idea','commitment','announcement'].includes(r.kind)).length,search:rows.length,about:COVERAGE.length,openq:lab.filter(r=>r.kind==='question'&&!r.nrep).length,overview:rows.length,targets:uniq(lab.flatMap(r=>r.targets)).length,people:uniq(lab.map(r=>r.sender)).length,notable:lab.filter(r=>r.notable).length,hostile:lab.filter(r=>r.tone==='hostile').length,feed:rows.length,coverage:COVERAGE.length};
 KINDS.forEach(k=>cnt[k]=lab.filter(r=>r.kind===k).length);
 VIEWS.forEach(([k])=>{const e=$('#c_'+k);if(e)e.textContent=cnt[k]??'';});
 let h='';
 if(view==='overview')h=overview(rows);else if(view==='targets')h=targets(rows);else if(view==='people')h=people(rows);
 else if(view==='replies')h=replies(rows);else if(view==='qp')h=qp(rows);else if(view==='search')h=searchPage(rows);else if(view==='about')h=about();
 else if(view==='notable')h=`<div class="hd"><h2>Notable</h2><span class="n">ideas, factual claims, promises, open questions, accusations</span></div>`+list(lab.filter(r=>r.notable),400);
 else if(view==='hostile')h=`<div class="hd"><h2>Hostile tone</h2><span class="n">private — a model's reading; open the originals</span></div>`+list(lab.filter(r=>r.tone==='hostile'),400);
 else if(view==='feed')h=`<div class="hd"><h2>Feed</h2><span class="n">${rows.length} messages</span></div>`+list(rows,400);
 else if(view==='coverage')h=coverage();
 else if(view==='raised')h=raised(rows);
 else if(view==='openq')h=`<div class="hd"><h2>Open questions</h2><span class="n">questions nobody replied to in the chat — a list of things people are still waiting on</span></div>`+list(lab.filter(r=>r.kind==='question'&&!r.nrep),400);
 else if(view==='commitment')h=`<div class="hd"><h2>Commitments</h2><span class="n">promises and deadlines people gave — check them against what happened</span></div>`+list(lab.filter(r=>r.kind==='commitment'),400);
 else h=`<div class="hd"><h2>${esc(view)}</h2></div>`+list(lab.filter(r=>r.kind===view),400);
 $('#main').innerHTML=h;syncHash();
 {const act=[];const v=(id,l)=>{const e=$(id);if(e&&e.value)act.push(`<b>${l}</b> ${esc(e.options?e.options[e.selectedIndex].text:e.value)}`);};v('#fchat','chat');v('#fkind','kind');v('#fsender','person');v('#ftarget','about');v('#frole','role');v('#fq','search');v('#fto','to');if($('#ffrom').value&&$('#ffrom').value!==MIN_DATE)act.push(`<b>from</b> ${$('#ffrom').value}`);if($('#fnot').checked)act.push('<b>notable only</b>');
  $('#fnote').innerHTML=(act.length?`${rows.length.toLocaleString()} messages match · ${act.join(' · ')}`:`${rows.length.toLocaleString()} messages · all chats · all history — use the filters to narrow`);}
 const rqi=$('#rq');if(rqi){rqi.focus();rqi.setSelectionRange(rqi.value.length,rqi.value.length);let t;rqi.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{rq=rqi.value;render();},350);};const a=$('#rqall');if(a)a.onchange=()=>{window.rqall=a.checked;render();};}
}
// PUBLIC build: no message text is embedded or fetched. The page reads data/messages.json — the same verifiable dataset the
// manifest hashes (sender, date, kind, topics, summary, targets, link, reply-to name, counts) — and adapts it to the row shape above.
if(PUBLIC){fetch('data/messages.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(rows=>{
  DATA=rows.map(r=>({chat:r.chat,id:r.id,sender:r.sender,date:r.date,text:'',reply_to:r.reply_to||null,kind:r.kind,tone:'',stance:'',targets:r.targets||[],topics:r.topics||[],summary:r.summary||'',
    notable:r.notable?1:0,st:{},tp:'',ad:'',mv:[],url:r.url,nrep:r.replies||0,ov:r.corrected||'',rt:r.reply_to_sender?[r.reply_to_sender,'']:undefined,rx:r.reactions?[r.reactions,'',[]]:undefined}));
  const sub=document.querySelector('.sh-brand .sub');if(sub)sub.innerHTML=sub.innerHTML.replace(/^[\d,]+ messages/,DATA.length.toLocaleString()+' messages');
  init();}).catch(e=>{document.getElementById('main').innerHTML='<div class="card" style="margin:20px">Could not load <code>data/messages.json</code> ('+esc(e.message)+'). The board needs to be served from its folder (not opened as a file).</div>';});}
else init();
</script></body></html>"""

def ensure_schema():
    con = sqlite3.connect(DB)
    cols = [r[1] for r in con.execute("PRAGMA table_info(labels)")]
    for c in ('stances', 'to_parent', 'addresses', 'moves'):
        if c not in cols: con.execute(f"ALTER TABLE labels ADD COLUMN {c} TEXT")
    if 'reactions' not in [r[1] for r in con.execute("PRAGMA table_info(messages)")]:
        con.execute("ALTER TABLE messages ADD COLUMN reactions TEXT")
    con.commit()

def coverage():
    con = sqlite3.connect(DB)
    newest = con.execute("SELECT MAX(date) FROM messages").fetchone()[0] or ''
    out = []
    for chat, first, last, total, subst, labeled in con.execute(
        """SELECT m.chat, MIN(m.date), MAX(m.date), COUNT(*),
                  SUM(CASE WHEN m.is_bot=0 AND length(m.text)>=40 THEN 1 ELSE 0 END),
                  SUM(CASE WHEN l.kind IS NOT NULL AND m.is_bot=0 AND length(m.text)>=40 THEN 1 ELSE 0 END)
           FROM messages m LEFT JOIN labels l ON l.chat=m.chat AND l.id=m.id GROUP BY m.chat ORDER BY 4 DESC"""):
        stale = False
        try:
            stale = (datetime.date.fromisoformat(newest[:10]) - datetime.date.fromisoformat(last[:10])).days > 7
        except Exception: pass
        out.append({'chat': chat, 'title': CFG['chats'].get(chat, {}).get('title', ''), 'first': (first or '')[:10], 'last': (last or '')[:10],
                    'total': total, 'subst': subst or 0, 'labeled': labeled or 0, 'stale': stale})
    return out

def main():
    ensure_schema()
    rows = load()
    title = ('Terra social board — public view' if PUBLIC else 'Terra social board')
    out = TEMPLATE.replace('__DATA__', 'null' if PUBLIC else json.dumps(rows, ensure_ascii=False).replace('</', '<\\/')) \
        .replace('__TITLE__', title).replace('__BUILT__', datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')) \
        .replace('__SUBTITLE__', (f'{len(rows):,} messages · ' + ('ideas · questions · support · announcements only' if PUBLIC else '<b>private</b> — do not share') + ((' · ' + NOTE) if NOTE else ''))) \
        .replace('__LOGO__', LOGO_B64) \
        .replace('__MANIFEST__', json.dumps(manifest(), ensure_ascii=False).replace('</', '<\\/')) \
        .replace('__EXCL__', json.dumps(EXCLUSIONS, ensure_ascii=False).replace('</', '<\\/')) \
        .replace('__MINDATE__', (rows[0]['date'][:10] if rows else '')) \
        .replace('__PUBBOOL__', 'true' if PUBLIC else 'false').replace('__KINDS__', json.dumps(CFG['kinds'])) \
        .replace('__COVERAGE__', json.dumps(coverage(), ensure_ascii=False)) \
        .replace('__ROLES__', json.dumps({'people': ROLES.get('people', {}), 'colors': ROLES.get('role_colors', {})}, ensure_ascii=False))
    fn = OUT if (OUT and os.path.isabs(OUT)) else os.path.join(HERE, OUT or ('public_board.html' if PUBLIC else 'board.html'))
    open(fn, 'w', encoding='utf-8').write(out)
    unl = sum(1 for r in rows if r['kind'] == 'unlabeled')
    print(f"wrote {fn}  ({len(rows)} messages, {unl} unlabeled — run classify.py to label them)")

if __name__ == '__main__':
    main()

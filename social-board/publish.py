"""Build everything the PUBLIC site needs, into ./public/ (config.json → publish.out_dir):

  python publish.py

  public/index.html        the public board (ideas, questions, open questions, commitments, announcements, support —
                           no tone, no stance, no reply behaviour, no per-person tables)
  public/method.html       "How this works & how to check it" — generated from config, prompt and context card, step by step
  public/data/messages.json  the public dataset: one row per message of a public kind
                           {chat,id,date,sender,kind,topics,summary,url,replies,reactions} — no message text (the t.me link is the source)
  public/data/manifest.json  per-chat counts, first/last ids and dates, content hashes, label-set hash, prompt hash, model, built_at
  public/data/coverage.json  the Coverage table
  public/data/qa.json        the hand-check results (from qa.py), if any
  public/data/exclusions.json, overrides.json   copied verbatim (with notes), so corrections are visible

Nothing here contains message text, tone, stance, reply behaviour or any private file. Commit ./public/ to the public data repo
(or the site repo under /social/). Every build is a dated commit = the audit log.
"""
import os, re, sys, json, sqlite3, hashlib, datetime, html, subprocess, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json'), encoding='utf-8'))
PUB = CFG.get('publish', {})
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
OUT = os.path.join(HERE, PUB.get('out_dir', 'public'))
NOW = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
KINDS = CFG['public_kinds'] + ['commitment'] if 'commitment' not in CFG['public_kinds'] else CFG['public_kinds']
EXCL = {k: v for k, v in json.load(open(os.path.join(HERE, 'exclusions.json'), encoding='utf-8')).items() if ':' in k} if os.path.exists(os.path.join(HERE, 'exclusions.json')) else {}
OVER = {k: v for k, v in json.load(open(os.path.join(HERE, 'overrides.json'), encoding='utf-8')).items() if ':' in k} if os.path.exists(os.path.join(HERE, 'overrides.json')) else {}

def sha(s): return hashlib.sha256(s.encode('utf-8')).hexdigest()

def prompt_and_model():
    os.environ.setdefault('ANTHROPIC_API_KEY', 'x')
    sys.path.insert(0, HERE)
    import classify
    return classify.SYSTEM, CFG.get('model'), CFG.get('reply_model', 'claude-sonnet-5-5')

def manifest(con):
    """Per chat: counts, bounds, and a content hash that anyone with the same export can recompute (verify.py) without us publishing text."""
    out = {'built_at': NOW.isoformat(), 'chats': {}}
    for chat, in con.execute("SELECT DISTINCT chat FROM messages ORDER BY chat"):
        rows = con.execute("SELECT id, date, sender, text FROM messages WHERE chat=? AND id>0 ORDER BY id", (chat,)).fetchall()
        h = hashlib.sha256()
        for i, d, s, t in rows:
            h.update(f"{i}|{d}|{sha((t or '').strip())[:16]}\n".encode())
        lab = con.execute("SELECT id, kind, targets, topics FROM labels WHERE chat=? ORDER BY id", (chat,)).fetchall()
        lh = hashlib.sha256()
        for i, k, tg, tp in lab: lh.update(f"{i}|{k}|{tg}|{tp}\n".encode())
        subst = con.execute("SELECT COUNT(*) FROM messages WHERE chat=? AND is_bot=0 AND (length(text)>=40 OR (text LIKE '%?%' AND length(text)>=12))", (chat,)).fetchone()[0]
        out['chats'][chat] = {'title': CFG['chats'][chat]['title'], 'tme': CFG['chats'][chat]['tme'],
            'messages': len(rows), 'first_id': rows[0][0] if rows else None, 'last_id': rows[-1][0] if rows else None,
            'first_date': rows[0][1][:10] if rows else None, 'last_date': rows[-1][1][:10] if rows else None,
            'substantive': subst, 'labeled': len(lab),
            'content_sha256': h.hexdigest(), 'labels_sha256': lh.hexdigest()}
    return out

def dataset(con):
    rows = []
    q = """SELECT m.chat, m.id, m.date, m.sender, l.kind, l.topics, l.summary, m.reply_to, m.reactions,
                  (SELECT COUNT(*) FROM messages r WHERE r.chat=m.chat AND r.reply_to=m.id) AS nrep
           FROM messages m JOIN labels l ON l.chat=m.chat AND l.id=m.id
           WHERE m.is_bot=0 AND m.id>0 ORDER BY m.date"""
    for chat, mid, date, sender, kind, topics, summary, reply_to, rx, nrep in con.execute(q):
        key = f"{chat}:{mid}"
        if key in EXCL: continue
        if key in OVER and 'kind' in OVER[key]: kind = OVER[key]['kind']
        if kind not in KINDS: continue
        try: rxn = sum(x.get('n', 1) for x in json.loads(rx)) if rx else 0
        except Exception: rxn = 0
        rows.append({'chat': chat, 'id': mid, 'date': date, 'sender': sender, 'kind': kind,
                     'topics': json.loads(topics or '[]'), 'summary': (OVER.get(key, {}).get('summary') or summary or ''),
                     'url': CFG['chats'][chat]['tme'] + str(mid), 'replies': nrep, 'reactions': rxn,
                     **({'corrected': OVER[key].get('note', 'corrected by hand')} if key in OVER else {})})
    return rows

STYLE = """<style>
:root{--bg:#0a0b0f;--bg2:#0f1117;--card:rgba(255,255,255,.03);--line:rgba(255,255,255,.08);--fg:#f3f4f6;--txt:#d1d5db;--mut:#9ca3af;--dim:#6b7280;--acc:#22d3ee;--acc2:#67e8f9;--teal:#2dd4bf;--for:#4ade80;--against:#f87171;--mixed:#facc15;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.6 Outfit,Inter,-apple-system,"Segoe UI",sans-serif}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(ellipse 80% 50% at 20% 40%,rgba(6,182,212,.08),transparent),radial-gradient(ellipse 60% 40% at 80% 60%,rgba(45,212,191,.05),transparent)}
a{color:var(--acc);text-decoration:none}a:hover{color:var(--acc2);text-decoration:underline}
.sh{position:sticky;top:0;z-index:10;background:rgba(10,11,15,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.06)}
.sh-wrap{max-width:1100px;margin:0 auto;padding:.7em 1.5em;display:flex;align-items:center;gap:1em;flex-wrap:wrap}.sh img{height:40px}.sh h1{margin:0;font-size:1.1em;color:#fff;font-weight:800}.sh .sub{font-size:.75em;color:var(--mut)}
.sh nav{margin-left:auto;display:flex;gap:.4em}.sh nav a{color:#fff;font-weight:700;font-size:.9em;padding:.5em .9em;border-radius:.5em;background:rgba(31,41,55,.5);border:1px solid #374151}.sh nav a.on{background:color-mix(in srgb,var(--acc) 15%,transparent);color:var(--acc2);border-color:color-mix(in srgb,var(--acc) 60%,transparent)}
main{max-width:1100px;margin:0 auto;padding:24px 1.5em 80px}
h2{color:#fff;font-size:1.5em;margin:36px 0 10px;font-weight:700}h3{color:var(--acc2);font-size:1em;text-transform:uppercase;letter-spacing:.08em;margin:26px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:18px 22px;margin:12px 0}
.steps{counter-reset:s;list-style:none;padding:0;margin:0}.steps li{position:relative;padding:14px 0 14px 56px;border-top:1px solid rgba(255,255,255,.06)}.steps li:first-child{border-top:0}
.steps li::before{counter-increment:s;content:counter(s);position:absolute;left:0;top:12px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--acc) 15%,transparent);color:var(--acc2);font-weight:800;border:1px solid color-mix(in srgb,var(--acc) 45%,transparent)}
.steps b{color:#fff;display:block;margin-bottom:3px}
pre,code{font-family:var(--mono);font-size:.86em}pre{background:var(--bg2);border:1px solid var(--line);border-radius:.5rem;padding:12px 14px;overflow:auto;white-space:pre-wrap;color:var(--mut)}code{background:rgba(255,255,255,.06);padding:1px 6px;border-radius:4px;color:var(--fg)}
table{width:100%;border-collapse:collapse;font-size:.92em}th{text-align:left;color:var(--dim);font-size:.72em;text-transform:uppercase;letter-spacing:.08em;padding:6px 8px}td{padding:8px;border-top:1px solid rgba(255,255,255,.05)}td.num{text-align:right;font-family:var(--mono)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.kpi{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:12px 14px}.kpi b{display:block;font-size:1.5em;color:#fff;font-family:var(--mono)}.kpi span{font-size:.72em;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.78em;font-weight:600;border:1px solid #374151;color:var(--mut);margin:2px 4px 2px 0}
.flow{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap;margin:10px 0}.flow div{flex:1;min-width:150px;background:var(--bg2);border:1px solid var(--line);border-radius:.6rem;padding:10px 12px;font-size:.88em}.flow div b{display:block;color:var(--acc2);font-size:.75em;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.warn{border-left:3px solid var(--mixed);padding-left:14px;color:var(--mut)}
details summary{cursor:pointer;color:var(--acc2);font-weight:600}
footer{max-width:1100px;margin:0 auto;padding:12px 1.5em 30px;color:var(--dim);font-size:.8em;border-top:1px solid rgba(255,255,255,.06)}
</style>"""

def repo_links():
    """Where the code and the published data live: one folder in the shared tla-core repo (no separate repos)."""
    repo = PUB.get('repo', 'https://github.com/thealliancedao/tla-core').rstrip('/'); path = PUB.get('repo_path', 'social-board').strip('/')
    return f"{repo}/tree/main/{path}", f"{repo}/commits/main/{path}/public"

def private_scan(folder):
    """Refuse to leave anything in the public folder that contains a private string or an API key — the same gate make_public_repo.py uses."""
    pf = os.path.join(HERE, PUB.get('private_strings_file', 'private-strings.txt'))
    priv = [l.strip() for l in open(pf, encoding='utf-8')] if os.path.exists(pf) else []
    priv = [p for p in priv if p and not p.startswith('#')]
    key_re = re.compile(r'sk-ant-[A-Za-z0-9_\-]{10,}')
    bad = []
    for dp, _, fs in os.walk(folder):
        for f in fs:
            text = open(os.path.join(dp, f), encoding='utf-8', errors='replace').read()
            bad += [(os.path.relpath(os.path.join(dp, f), HERE), s) for s in priv if s in text]
            if key_re.search(text): bad.append((os.path.relpath(os.path.join(dp, f), HERE), 'an API key'))
    if bad:
        print("REFUSED — private content in the public build (nothing is deleted, nothing may be committed until this is fixed):")
        for f, s in bad: print(f"  {f}: contains {s!r}")
        print("  Add an exclusion/override for the message, or extend private-strings.txt, then run publish.py again.")
        sys.exit(1)

def method_page(con, man, prompt, model, reply_model, nrows, qa):
    e = html.escape
    chats = man['chats']
    ctx_path = os.path.join(HERE, 'context.md'); ctx = open(ctx_path, encoding='utf-8').read() if os.path.exists(ctx_path) else ''
    logo = open(os.path.join(HERE, 'logo.b64')).read().strip() if os.path.exists(os.path.join(HERE, 'logo.b64')) else ''
    total = sum(c['messages'] for c in chats.values()); labeled = sum(c['labeled'] for c in chats.values())
    cov = ''.join(f"<tr><td><b>{e(c['title'])}</b><div style='color:var(--dim);font-size:.8em'>{e(c['tme'])}</div></td><td>{c['first_date']}</td><td>{c['last_date']}</td><td class='num'>{c['messages']:,}</td><td class='num'>{c['substantive']:,}</td><td class='num'>{c['labeled']:,}</td><td style='font-family:var(--mono);font-size:.75em;color:var(--dim)'>{c['content_sha256'][:16]}…</td></tr>" for c in chats.values())
    qa_html = (f"<div class='kpis'><div class='kpi'><b>{qa['agreement_pct']}%</b><span>agreement</span></div><div class='kpi'><b>{qa['checked']}</b><span>rows hand-checked</span></div><div class='kpi'><b>{qa['sessions']}</b><span>check sessions</span></div><div class='kpi'><b>{e(qa['last'])}</b><span>last check</span></div></div>"
               f"<p style='color:var(--mut)'>Per field: {', '.join(f'{e(k)} {v}%' for k, v in qa.get('per_field', {}).items())}. Every checked row, the model's label and the reviewer's verdict are in <a href='data/qa.json'>data/qa.json</a>.</p>"
               if qa else "<p class='warn'>No hand-check has been published yet. The method below is complete, but treat every count as unverified until an agreement rate appears here.</p>")
    excl = ''.join(f"<tr><td class='num'>{e(k)}</td><td>{e(str(v))}</td></tr>" for k, v in EXCL.items()) or "<tr><td colspan='2' style='color:var(--dim)'>none</td></tr>"
    over = ''.join(f"<tr><td class='num'>{e(k)}</td><td>{e(', '.join(f'{a}={b}' for a, b in v.items() if a != 'note'))}</td><td>{e(str(v.get('note', '')))}</td></tr>" for k, v in OVER.items()) or "<tr><td colspan='3' style='color:var(--dim)'>none</td></tr>"
    code, data = repo_links()
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>How this works — {e(PUB.get('site_title', 'Terra social board'))}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">{STYLE}</head><body>
<div class="sh"><div class="sh-wrap"><img src="data:image/png;base64,{logo}" alt=""><div><h1>{e(PUB.get('site_title', 'Terra social board'))}</h1><div class="sub">How it works, what it is not, and how to check it yourself</div></div>
<nav><a href="index.html">Board</a><a class="on" href="method.html">Method</a><a href="data/manifest.json">Manifest</a><a href="{e(code)}">Code</a></nav></div></div>
<main>
<div class="kpis"><div class="kpi"><b>{total:,}</b><span>messages in the store</span></div><div class="kpi"><b>{labeled:,}</b><span>labeled</span></div><div class="kpi"><b>{nrows:,}</b><span>on the public board</span></div><div class="kpi"><b>{len(chats)}</b><span>public groups</span></div><div class="kpi"><b style="font-size:1em">{e(man['built_at'][:16].replace('T', ' '))} UTC</b><span>last updated</span></div></div>

<h2>What this is</h2>
<div class="card"><p>A record of what gets <b>proposed, asked, promised and announced</b> in the public Terra Telegram groups, so that anyone can see whether an idea has come up before, who raised it first, what questions never got an answer, and what was promised. Every row links to the original message on Telegram. Nothing is quoted without its link.</p>
<p>It is built by a script, not curated by a person. The script, the prompt, the model and every rule are published below and in the code repository, so the whole thing can be re-run by anyone who is a member of the same groups.</p></div>

<h2>What it is not</h2>
<div class="card"><ul><li>It is <b>not a copy of the chats</b>. The message text is not republished; the board holds a one-line neutral summary and the link.</li>
<li>It does <b>not rate people</b>. The labeling model also reads tone and stance, and those fields exist in the maintainer's private working copy — they are deliberately <b>not published</b>, because a model misreads sarcasm, in-jokes and context often enough that a public "who is hostile" table would be unfair to named people. What is public is limited to: ideas, questions, open questions, commitments, announcements, support.</li>
<li>Labels are <b>one model's reading of one message</b>. They are not a verdict and never infer motive. Read the original before quoting a count.</li>
<li>Direct messages, private groups and anything from a group whose history is not open to members are never imported.</li></ul></div>

<h2>What is in it</h2>
<div class="card"><table><tr><th>group</th><th>first</th><th>last</th><th class="num">messages</th><th class="num">substantive</th><th class="num">labeled</th><th>content hash</th></tr>{cov}</table>
<p style="color:var(--dim);font-size:.85em">"substantive" = non-bot messages of 40+ characters, or any message containing a question mark of 12+ characters; shorter messages (gm, lol, stickers) are counted as chatter by rule and never sent to the model. The content hash is computed from message ids, timestamps and a hash of each message's text — see step 5 below for how to recompute it.</p></div>

<h2>How a message gets its labels</h2>
<div class="flow"><div><b>1 · export</b>Telegram Desktop → Export chat history → HTML, text only, from the beginning of the group</div><div><b>2 · ingest</b>parsed into a local SQLite store; duplicates skipped; bots and stickers dropped; reactions and reply links kept</div><div><b>3 · rule</b>under 40 chars and no "?" → <i>chatter</i>, no model involved</div><div><b>4 · model</b>batches of {CFG.get('batch_size', 15)} messages, each with the message it replies to and the two before it; <code>{e(model)}</code> for posts, <code>{e(reply_model)}</code> for replies; temperature default; the exact prompt below</div><div><b>5 · build</b>static pages from the store; private fields stripped for the public build; this page generated from the same config</div></div>
<div class="card"><h3>Fields the model returns</h3>
<p><span class="pill">kind</span> idea · question · answer · feedback · support · criticism · commitment · announcement · chatter · other &nbsp; <span class="pill">topics</span> up to 4 short tags &nbsp; <span class="pill">summary</span> ≤ 20 words, neutral &nbsp; <span class="pill">targets</span> which teams/people the message is about &nbsp; <span class="pill">notable</span> worth a human look</p>
<p style="color:var(--dim)">Also returned but <b>not published</b>: tone, stance per target, stance toward the person replied to, whether a reply addresses the point, and observable reply moves.</p>
<h3>The exact prompt (system message), verbatim</h3><details><summary>show the prompt ({len(prompt):,} characters, sha256 {sha(prompt)[:16]}…)</summary><pre>{e(prompt)}</pre></details>
<h3>The context card the model is given with every batch</h3><p style="color:var(--dim)">Who is who, what the products are, the governance timeline and local slang — facts on the record, so the model can read "PD", "NWV" or "bribes" correctly. It is part of the prompt above and is versioned with the code.</p><details><summary>show context.md</summary><pre>{e(ctx)}</pre></details></div>

<h2>Known limits</h2>
<div class="card"><ul><li><b>Sarcasm and in-jokes</b> are the main source of wrong labels.</li><li><b>Display names change</b> and deleted accounts all read as "Deleted Account"; aliases are merged by hand in <code>roles.json</code> only when verifiable.</li><li><b>Reactions</b> come from the export, which lists only the first few reactors; totals are correct, names are partial.</li><li><b>Roles</b> (badges) are added by hand only with a proof line (on-chain, a proposal, a public announcement) and are listed in <code>roles.json</code>.</li><li>A message that the model fails to label after several tries is stored as "other" and retried on the next run.</li><li>The maintainer is a participant in these groups and a council member of Alliance DAO. That is a reason to check the work, which is why everything needed to check it is here.</li></ul></div>

<h2>Hand checks</h2><div class="card">{qa_html}</div>

<h2>Corrections and exclusions</h2>
<div class="card"><p>No label is ever edited in the database. A hand correction goes in <code>overrides.json</code> with a dated note and the row is marked ✎ on the board; the original model label stays in the store and in the manifest hash. A row is excluded only for doxxing or illegal content, never for being unflattering, and every exclusion is listed here with its reason.</p>
<h3>Overrides</h3><table><tr><th>message</th><th>change</th><th>note</th></tr>{over}</table>
<h3>Exclusions</h3><table><tr><th>message</th><th>reason</th></tr>{excl}</table></div>

<h2>Check it yourself</h2>
<div class="card"><ol class="steps">
<li><b>Be a member of the groups.</b> The eight groups are listed above with their links. Everything here comes from their public history; if you can read them, you can reproduce this.</li>
<li><b>Export a group.</b> Telegram Desktop → open the group → ⋮ → <i>Export chat history</i> → format HTML, untick photos/videos/stickers/files, leave the dates blank. Large groups export as <code>messages.html, messages2.html …</code> — keep them all in one folder.</li>
<li><b>Get the code.</b> <a href="{e(code)}">{e(code)}</a> — Python 3.10+, no other dependencies. <code>config.json</code> and <code>context.md</code> are the exact ones used for this build (compare the prompt hash above with <code>python verify.py --prompt</code>).</li>
<li><b>Ingest your export.</b> <code>python ingest.py &lt;your export folder&gt;</code>. Your store now holds the same messages ours does for that group.</li>
<li><b>Compare the content hash.</b> <code>python verify.py --manifest {e(PUB.get('site_url', ''))}data/manifest.json</code> recomputes the per-group hash from your store and prints match / mismatch, with the first differing message id if any. A match means we did not add, drop or alter a single message in that group.</li>
<li><b>Re-label a sample with your own key (optional, a few cents).</b> <code>python verify.py --relabel 50</code> picks 50 random labeled messages, labels them again with the published prompt and model using your API key, and prints the agreement with the published labels. The agreement rate you get should be close to the hand-check rate above.</li>
<li><b>Check any single count.</b> Every number on the board opens the rows behind it; every row has an <i>open ↗</i> link to the message on Telegram. If a label looks wrong, say so in the AllianceDAO group or on the forum with the message link; it goes through the correction process above and the change is visible in the next build and in the folder's commit history.</li>
<li><b>Watch the history.</b> Every build is a dated commit to <code>social-board/public/</code> in the shared tla-core repository: <a href="{e(data)}">{e(data)}</a>. A diff shows exactly which rows changed between any two builds.</li></ol></div>

<h2>Contact</h2><div class="card"><p>Maintained by {e(PUB.get('maintainer_handle', 'the maintainer'))}. Questions, corrections and challenges: {e(PUB.get('contact', ''))}.</p></div>
</main><footer>Built {e(man['built_at'])} · prompt {sha(prompt)[:16]} · model {e(model)} / {e(reply_model)} · generated by publish.py from the same configuration that produced the data</footer></body></html>"""

def main():
    con = sqlite3.connect(DB)
    prompt, model, reply_model = prompt_and_model()
    os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
    man = manifest(con)
    man['prompt_sha256'] = sha(prompt); man['model'] = model; man['reply_model'] = reply_model
    man['batch_size'] = CFG.get('batch_size'); man['min_text_chars'] = CFG.get('min_text_chars', 40)
    man['public_kinds'] = KINDS; man['exclusions'] = len(EXCL); man['overrides'] = len(OVER)
    rows = dataset(con)
    man['public_rows'] = len(rows); man['dataset_sha256'] = sha(json.dumps(rows, ensure_ascii=False, sort_keys=True))
    json.dump(rows, open(os.path.join(OUT, 'data', 'messages.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(man, open(os.path.join(OUT, 'data', 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump([{k: v for k, v in c.items() if k not in ('content_sha256', 'labels_sha256')} | {'key': k} for k, c in man['chats'].items()],
              open(os.path.join(OUT, 'data', 'coverage.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for f in ('exclusions.json', 'overrides.json'):
        if os.path.exists(os.path.join(HERE, f)): shutil.copy(os.path.join(HERE, f), os.path.join(OUT, 'data', f))
    qa = None
    qp = os.path.join(HERE, 'qa', 'summary.json')
    if os.path.exists(qp):
        qa = json.load(open(qp, encoding='utf-8')); shutil.copy(qp, os.path.join(OUT, 'data', 'qa.json'))
    open(os.path.join(OUT, 'method.html'), 'w', encoding='utf-8').write(method_page(con, man, prompt, model, reply_model, len(rows), qa))
    # the public board
    note = f"public build · last updated {man['built_at'][:16].replace('T', ' ')} UTC · <a href='method.html' style='color:inherit;text-decoration:underline'>how this works &amp; how to check it</a>"
    subprocess.check_call([sys.executable, '-I', os.path.join(HERE, 'build_board.py'), '--public', '--out', os.path.join(OUT, 'index.html'), '--note', note])
    private_scan(OUT)
    print(f"public build → {OUT}  (scanned: no private strings, no keys)\n  index.html (board), method.html, data/messages.json ({len(rows):,} rows), data/manifest.json, data/coverage.json")
    print("  publish it with: python update.py --commit   (copies public-repo/ and public/ into the tla-core checkout under social-board/ and pushes)")

if __name__ == '__main__':
    main()

"""Third-party check of a published build. Run it against YOUR OWN store (made with ingest.py from your own export).

  python verify.py --manifest https://theadao.com/social/data/manifest.json     compare content hashes per group
  python verify.py --manifest path/to/manifest.json                            (a downloaded copy works too)
  python verify.py --prompt                                                    print the sha256 of the prompt this code would send
  python verify.py --relabel 50 --manifest <url|path>                          re-label 50 random published rows with YOUR key and
                                                                               report agreement with the published labels (needs
                                                                               ANTHROPIC_API_KEY; costs cents)
What a match means: for that group, your export and the published store contain the same message ids, timestamps and text
(hash of text) over the id range in the manifest. A mismatch prints the first id that differs so you can look at it in Telegram.
Note: a group keeps changing (new messages, deletions), so compare over the manifest's id range only — the script does that.
"""
import os, sys, json, sqlite3, hashlib, random, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json'), encoding='utf-8'))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
def sha(s): return hashlib.sha256(s.encode('utf-8')).hexdigest()

def load(src):
    if src.startswith('http'):
        with urllib.request.urlopen(src, timeout=60) as r: return json.load(r)
    return json.load(open(src, encoding='utf-8'))

def arg(flag, default=None): return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default

def compare(man):
    con = sqlite3.connect(DB); ok = True
    for chat, c in man['chats'].items():
        have = con.execute("SELECT COUNT(*) FROM messages WHERE chat=?", (chat,)).fetchone()[0]
        if not have: print(f"{chat:8s} — not in your store (export that group and ingest it to compare)"); continue
        rows = con.execute("SELECT id, date, text FROM messages WHERE chat=? AND id>0 AND id>=? AND id<=? ORDER BY id", (chat, c['first_id'], c['last_id'])).fetchall()
        h = hashlib.sha256(); lines = []
        for i, d, t in rows:
            line = f"{i}|{d}|{sha((t or '').strip())[:16]}"; lines.append(line); h.update((line + "\n").encode())
        if h.hexdigest() == c['content_sha256']:
            print(f"{chat:8s} MATCH   {len(rows):,} messages, ids {c['first_id']}–{c['last_id']}")
        else:
            ok = False
            print(f"{chat:8s} DIFFERS yours {len(rows):,} vs published {c['messages']:,} messages over ids {c['first_id']}–{c['last_id']}")
            print(f"         (deleted messages, edits after the export, or a different export range all cause this; nothing here can tell which)")
    print("\nall groups match the published manifest" if ok else "\nsome groups differ — see above")

def relabel(n, man):
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key: raise SystemExit("set ANTHROPIC_API_KEY to re-label")
    sys.path.insert(0, HERE); import classify
    base = arg('--manifest')
    url = base.rsplit('/', 1)[0] + '/messages.json' if base.startswith('http') else os.path.join(os.path.dirname(base), 'messages.json')
    pub = load(url)
    sample = random.sample(pub, min(n, len(pub)))
    con = sqlite3.connect(DB); items = []; have = {}
    for r in sample:
        row = con.execute("SELECT sender, date, text, reply_to FROM messages WHERE chat=? AND id=?", (r['chat'], r['id'])).fetchone()
        if not row: continue
        items.append({'ref': f"{r['chat']}:{r['id']}", 'chat': r['chat'], 'sender': row[0], 'date': row[1], 'text': (row[2] or '')[:CFG.get('max_text_chars', 1200)], **classify.context_for(con, r['chat'], r['id'], row[3])})
        have[f"{r['chat']}:{r['id']}"] = r
    if not items: raise SystemExit("none of the sampled rows are in your store — ingest the groups first")
    out = []
    for i in range(0, len(items), CFG.get('batch_size', 15)): out += classify.call_api(items[i:i + CFG.get('batch_size', 15)])
    agree = 0; tot = 0
    for o in out:
        p = have.get(o.get('ref'));
        if not p: continue
        tot += 1; same = (o.get('kind') == p['kind']); agree += same
        if not same: print(f"  {o['ref']}: published {p['kind']}, yours {o.get('kind')}  {p['url']}")
    print(f"\nkind agreement: {agree}/{tot} = {100 * agree / max(1, tot):.0f}%  (model {classify.MODEL}; the model is not deterministic, 85–95% is normal)")

if __name__ == '__main__':
    if '--prompt' in sys.argv:
        os.environ.setdefault('ANTHROPIC_API_KEY', 'x'); sys.path.insert(0, HERE); import classify
        print("prompt sha256:", sha(classify.SYSTEM)); sys.exit(0)
    src = arg('--manifest')
    if not src: print(__doc__); sys.exit(1)
    man = load(src)
    if '--relabel' in sys.argv: relabel(int(arg('--relabel', 50)), man)
    else: compare(man)

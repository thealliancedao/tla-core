"""Ask the store a question, in plain English, with citations. PRIVATE tool — answers can quote anyone.

  python ask.py "what have I said about wBTC bribes"             (--me = only your own messages)
  python ask.py --me "my position on moving ALLY rewards"
  python ask.py "has anyone proposed an ampLUNA validator for aDAO before"
  python ask.py --draft "reply in aDAO explaining why I added CAPA to the bribe whitelist"
  python ask.py --who "Rebel Defi" "what has Rebel said about aDAO"
  python ask.py --chat adao --since 2026-10-01 "ideas raised for the website"

How it works: full-text search over the store (SQLite FTS5) picks up to --k messages (default 60) that match the
question's words; each goes to the model with sender, date, chat and a t.me link; the model answers ONLY from
those messages and cites them. --draft writes a post in your own voice using your past posts as the style sample.
Needs ANTHROPIC_API_KEY. Model: SOCIAL_BOARD_MODEL or config.json "ask_model" (default claude-sonnet-5-5).
"""
import os, sys, re, json, sqlite3, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json')))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
MODEL = os.environ.get('SOCIAL_BOARD_MODEL', CFG.get('ask_model', 'claude-sonnet-5-5'))
KEY = os.environ.get('ANTHROPIC_API_KEY')
ME = CFG.get('me', 'DeFi_Patriot')
STOP = set("the a an and or of to in on for is are was were be been have has had do does did what who how why when where which that this these those i my me we our you your it its about any has anyone ever before said say says".split())

def arg(flag, default=None):
    return sys.argv[sys.argv.index(flag)+1] if flag in sys.argv else default

def terms(q):
    ws = [w for w in re.findall(r"[a-zA-Z0-9_$]+", q.lower()) if w not in STOP and len(w) > 2]
    return ws or re.findall(r"[a-zA-Z0-9_$]+", q.lower())

def search(con, q, who=None, chat=None, since=None, k=60):
    ws = terms(q)
    # OR-query ranked by bm25; then AND-boost: rows matching more terms float up
    match = ' OR '.join(f'"{w}"' for w in ws)
    sql = """SELECT m.chat, m.id, m.sender, m.date, m.text, bm25(fts) AS rank FROM fts JOIN messages m ON m.rowid=fts.rowid
             WHERE fts MATCH ? AND m.is_bot=0 AND length(m.text)>=20 """
    args = [match]
    if who: sql += " AND m.sender=? "; args.append(who)
    if chat: sql += " AND m.chat=? "; args.append(chat)
    if since: sql += " AND m.date>=? "; args.append(since)
    sql += " ORDER BY rank LIMIT ?"; args.append(k * 3)
    rows = con.execute(sql, args).fetchall()
    def score(r):
        t = r[4].lower(); return (-sum(w in t for w in ws), r[5])
    rows.sort(key=score)
    return rows[:k]

def call(system, user, max_tokens=1500):
    body = {"model": MODEL, "max_tokens": max_tokens, "system": system, "messages": [{"role": "user", "content": user}]}
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=json.dumps(body).encode(), method='POST',
                                 headers={'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: data = json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"API error {e.code}: {e.read().decode(errors='replace')[:300]}")
    return ''.join(b.get('text', '') for b in data.get('content', []))

def main():
    if not KEY: raise SystemExit("Set ANTHROPIC_API_KEY first.")
    q = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and not sys.argv[i-1] in ('--who', '--chat', '--since', '--k')]
    if not q: raise SystemExit(__doc__)
    q = ' '.join(q)
    who = ME if '--me' in sys.argv else arg('--who')
    con = sqlite3.connect(DB)
    rows = search(con, q, who, arg('--chat'), arg('--since'), int(arg('--k', 60)))
    if not rows: raise SystemExit("nothing in the store matches those words — try other words or fewer of them")
    ctx = '\n'.join(f"[{i}] {r[2]} · {r[3][:16]} · {r[0]} · {CFG['chats'][r[0]]['tme']}{r[1]}\n{r[4][:700]}" for i, r in enumerate(rows, 1))
    if '--draft' in sys.argv:
        mine = con.execute("SELECT text FROM messages WHERE sender=? AND length(text)>200 ORDER BY date DESC LIMIT 12", (ME,)).fetchall()
        system = (f"You help {ME} draft a Telegram post. Write in HIS voice: plain, direct, first person, no corporate tone, "
                  "short paragraphs, no bullet lists unless he uses them. Use ONLY facts present in the provided messages; "
                  "if a fact is missing, leave a [fill in] marker rather than inventing it. Do not attack anyone. Keep it under 180 words unless asked.")
        user = f"STYLE SAMPLES (his past posts):\n" + '\n---\n'.join(m[0][:600] for m in mine) + f"\n\nRELEVANT MESSAGES:\n{ctx}\n\nTASK: {q}"
    else:
        system = ("You answer questions about a private archive of Terra community Telegram messages. Answer ONLY from the messages provided. "
                  "Cite every claim with the bracket numbers [n] and, at the end, list the cited messages as 'sender · date · link'. "
                  "If the messages do not answer the question, say so plainly. Quote short phrases, do not paraphrase intent. "
                  "Distinguish clearly between what a person said and what others said about them.")
        user = f"QUESTION: {q}\n\nMESSAGES ({len(rows)} best matches, newest are not necessarily first):\n{ctx}"
    print(call(system, user))
    print(f"\n({len(rows)} messages searched · model {MODEL})")

if __name__ == '__main__':
    main()

"""Ingest Telegram HTML exports into the private store (board.sqlite).

Usage:
  python ingest.py <folder-or-files...>
    Each folder is one chat export (the folder Telegram Desktop wrote: messages.html, messages2.html, ...).
    Files are grouped by their parent folder. The chat name comes from the export header; map it to a
    short key and a t.me link base in config.json ("chats").

Dedup is by (chat, message id); re-importing an overlapping export is safe and idempotent.
Bots and /commands are stored but flagged (is_bot=1) so the classifier skips them.
"""
import sys, os, json, sqlite3, glob, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tgparse import parse_files, parse_txt

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json')))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))

SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
  chat TEXT NOT NULL, id INTEGER NOT NULL, sender TEXT, date TEXT, text TEXT,
  reply_to INTEGER, media INTEGER DEFAULT 0, is_bot INTEGER DEFAULT 0, reactions TEXT,
  PRIMARY KEY (chat, id));
CREATE INDEX IF NOT EXISTS idx_msg_date ON messages(date);
CREATE INDEX IF NOT EXISTS idx_msg_sender ON messages(sender);
CREATE TABLE IF NOT EXISTS labels (
  chat TEXT NOT NULL, id INTEGER NOT NULL,
  kind TEXT, tone TEXT, stance TEXT, targets TEXT, topics TEXT, summary TEXT,
  notable INTEGER DEFAULT 0, model TEXT, labeled_at TEXT, stances TEXT, to_parent TEXT, addresses TEXT, moves TEXT,
  PRIMARY KEY (chat, id));
CREATE TABLE IF NOT EXISTS imports (file TEXT PRIMARY KEY, chat TEXT, n INTEGER, imported_at TEXT);
CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(text, content='messages', content_rowid='rowid');
CREATE TRIGGER IF NOT EXISTS fts_ai AFTER INSERT ON messages BEGIN INSERT INTO fts(rowid, text) VALUES (new.rowid, new.text); END;
"""

def chat_key(title):
    for key, c in CFG['chats'].items():
        if c['title'].lower() == (title or '').lower():
            return key
    return None

def is_bot(sender, text):
    if sender in CFG.get('bots', []): return 1
    if (text or '').startswith('/'): return 1
    return 0

def main(paths):
    con = sqlite3.connect(DB); con.executescript(SCHEMA)
    if 'reactions' not in [r[1] for r in con.execute("PRAGMA table_info(messages)")]:
        con.execute("ALTER TABLE messages ADD COLUMN reactions TEXT"); con.commit()
    # every file is parsed on its own and grouped by the chat title in its header, so a folder may hold any mix of chats
    files = []
    for p in paths:
        if os.path.isdir(p):
            files += glob.glob(os.path.join(p, '**', '*.html'), recursive=True) + glob.glob(os.path.join(p, '**', '*.txt'), recursive=True)
        else:
            files.append(p)
    files = sorted(set(files), key=lambda f: (os.path.dirname(f), int(re.sub(r'\D', '', os.path.basename(f)) or 1)))
    groups = {}
    for f in files:
        try:
            title, msgs = parse_txt(f) if f.lower().endswith('.txt') else parse_files([f])
        except Exception as e:
            print(f"!! {f}: not a Telegram export I can read ({e}). Skipped."); continue
        if not msgs: continue
        g = groups.setdefault(title, {'files': [], 'msgs': []}); g['files'].append(f); g['msgs'] += msgs
    total = 0
    for title, g in groups.items():
        files, msgs = g['files'], g['msgs']
        key = chat_key(title)
        if not key:
            print(f"!! '{title}' ({len(files)} file(s)) is not in config.json chats — add it (title + tme base) and re-run. Skipped.")
            continue
        n = 0
        for m in msgs:
            cur = con.execute(
                "INSERT OR IGNORE INTO messages(chat,id,sender,date,text,reply_to,media,is_bot,reactions) VALUES(?,?,?,?,?,?,?,?,?)",
                (key, m['id'], m['from'], m['date'], m['text'], m['reply_to'], int(m['media']), is_bot(m['from'], m['text']),
                 json.dumps(m.get('reactions') or [], ensure_ascii=False) if m.get('reactions') else None))
            n += cur.rowcount
            if cur.rowcount == 0 and m.get('reactions'):   # already stored (older export) — fill in / refresh reactions
                con.execute("UPDATE messages SET reactions=? WHERE chat=? AND id=?", (json.dumps(m['reactions'], ensure_ascii=False), key, m['id']))
        for f in files:
            con.execute("INSERT OR REPLACE INTO imports VALUES(?,?,?,datetime('now'))", (os.path.abspath(f), key, len(msgs)))
        con.commit(); total += n
        print(f"{key:10s} {title!r}: {len(msgs)} parsed, {n} new  ({msgs[0]['date'][:10]} → {msgs[-1]['date'][:10]})")
    rows = con.execute("SELECT chat, COUNT(*), MIN(date), MAX(date) FROM messages GROUP BY chat").fetchall()
    print("\nStore now holds:")
    for r in rows: print(f"  {r[0]:10s} {r[1]:7d}  {r[2][:10]} → {r[3][:10]}")
    print(f"\n{total} new messages. Next: python classify.py")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    main(sys.argv[1:])

"""OPTIONAL automation: pull new messages straight from Telegram with your own account (no HTML exports).
Not needed for the manual daily routine. Set up only once the manual flow has been verified.

One-time setup (on your own machine, never on a shared server):
  pip install telethon
  Get API_ID / API_HASH at https://my.telegram.org  (log in with your phone number → "API development tools")
  set TG_API_ID=...   set TG_API_HASH=...     (Windows)  |  export TG_API_ID=... TG_API_HASH=...  (Mac/Linux)
  python fetch_telethon.py --login            (asks for your phone + the code Telegram sends; writes tg.session)

Then:
  python fetch_telethon.py                    (fetches everything newer than what the store holds, for every chat in config.json)
  python fetch_telethon.py --backfill 2000    (also walks back N messages per chat — use once to fill history)

tg.session is a credential equal to your Telegram login. Keep it next to board.sqlite, outside any repo, and
delete it if the machine is ever shared. It can only read groups your account is a member of.
"""
import os, sys, json, sqlite3, asyncio

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json')))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
SESSION = os.path.join(HERE, 'tg')

def tme_to_entity(tme):
    # https://t.me/The_AllianceDAO/  -> 'The_AllianceDAO' ; https://t.me/c/1767997115/ -> -1001767997115
    part = tme.rstrip('/').split('t.me/')[-1]
    if part.startswith('c/'):
        return int('-100' + part.split('/')[1])
    return part.split('/')[0]

async def run(backfill):
    from telethon import TelegramClient
    api_id = int(os.environ['TG_API_ID']); api_hash = os.environ['TG_API_HASH']
    con = sqlite3.connect(DB)
    from ingest import SCHEMA, is_bot  # reuse schema + bot flag
    con.executescript(SCHEMA)
    async with TelegramClient(SESSION, api_id, api_hash) as client:
        for key, c in CFG['chats'].items():
            ent = tme_to_entity(c['tme'])
            try:
                entity = await client.get_entity(ent)
            except Exception as e:
                print(f"{key}: cannot open {ent}: {e}"); continue
            last = con.execute("SELECT MAX(id) FROM messages WHERE chat=?", (key,)).fetchone()[0] or 0
            n = 0
            kwargs = {'min_id': last} if not backfill else {'limit': backfill}
            async for m in client.iter_messages(entity, reverse=not backfill, **kwargs):
                if not m.id or (not m.message and not m.media): continue
                s = m.sender
                name = (getattr(s, 'first_name', '') or '') + (' ' + getattr(s, 'last_name', '') if getattr(s, 'last_name', None) else '')
                name = name.strip() or getattr(s, 'title', None) or getattr(s, 'username', None) or str(m.sender_id)
                date = m.date.strftime('%Y-%m-%d %H:%M:%S')
                cur = con.execute("INSERT OR IGNORE INTO messages(chat,id,sender,date,text,reply_to,media,is_bot) VALUES(?,?,?,?,?,?,?,?)",
                                  (key, m.id, name, date, m.message or '', m.reply_to_msg_id, 1 if m.media else 0, is_bot(name, m.message or '')))
                n += cur.rowcount
            con.commit()
            print(f"{key:10s} {n} new (last id was {last})")
    print("done. Next: python classify.py && python build_board.py")

if __name__ == '__main__':
    sys.path.insert(0, HERE)
    if '--login' in sys.argv:
        from telethon import TelegramClient
        with TelegramClient(SESSION, int(os.environ['TG_API_ID']), os.environ['TG_API_HASH']) as c:
            print("logged in as", c.get_me().username)
        sys.exit(0)
    bf = int(sys.argv[sys.argv.index('--backfill') + 1]) if '--backfill' in sys.argv else 0
    asyncio.run(run(bf))

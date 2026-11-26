"""Parse Telegram Desktop HTML exports (messages*.html) into message dicts.
Usage as module: parse_files([paths]) -> (chat_title, [msg,...])
msg = {id:int, from:str, date:'YYYY-MM-DD HH:MM:SS', text:str, reply_to:int|None, media:bool, reactions:[{e,n,who[]}]}
reactions: emoji, total count, and the reactor names the export shows (Telegram lists only the first few — partial).
"""
import re, os, sys, json
from html.parser import HTMLParser

VOID = {'br','img','input','meta','link','hr'}

class _P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True)
        s.msgs=[]; s.cur=None; s.stack=[]; s.capture=None; s.buf=''; s.title=None; s._title_next=False; s.rx=None
    def handle_starttag(s,tag,attrs):
        a=dict(attrs); cls=a.get('class','')
        if tag in VOID:
            if tag=='br' and s.capture=='text': s.buf+='\n'
            return
        s.stack.append((tag,cls))
        if tag=='div' and cls.strip()=='text bold' and s.title is None: s.capture='title'; s.buf=''
        if tag=='div' and 'message' in cls.split() and 'default' in cls:
            if s.cur: s.msgs.append(s.cur)
            mid=re.sub(r'\D','',a.get('id',''))
            s.cur={'id':int(mid) if mid else None,'from':None,'date':None,'text':'','reply_to':None,'media':False,'joined':'joined' in cls,'reactions':[]}
        if s.cur is None: return
        if tag=='span' and cls.strip()=='reaction': s.rx={'e':'','n':1,'who':[]}; s.cur['reactions'].append(s.rx)
        if s.rx is not None and tag=='span' and cls.strip()=='emoji': s.capture='rx_e'; s.buf=''
        if s.rx is not None and tag=='span' and cls.strip()=='count': s.capture='rx_n'; s.buf=''
        if s.rx is not None and tag=='div' and 'initials' in cls and a.get('title'): s.rx['who'].append(a['title'])
        if s.rx is not None and tag=='img' and 'userpic' in cls and a.get('title'): s.rx['who'].append(a['title'])
        if tag=='div' and 'from_name' in cls: s.capture='from'; s.buf=''
        if tag=='div' and 'date' in cls and a.get('title'): s.cur['date']=a['title']
        if tag=='div' and cls.strip()=='text': s.capture='text'; s.buf=''
        if tag=='div' and 'reply_to' in cls: s.capture='reply'
        if tag=='a' and s.capture=='reply' and a.get('href'):
            m=re.search(r'message(\d+)',a['href'])
            if m: s.cur['reply_to']=int(m.group(1))
        if tag=='div' and 'media_wrap' in cls: s.cur['media']=True
    def handle_endtag(s,tag):
        if not s.stack: return
        t,cls=s.stack.pop()
        if s.capture=='title' and tag=='div' and cls.strip()=='text bold':
            s.title=s.buf.strip(); s.capture=None; return
        if s.cur is None: return
        if tag=='span' and s.capture=='rx_e' and cls.strip()=='emoji': s.rx['e']=s.buf.strip(); s.capture=None; return
        if tag=='span' and s.capture=='rx_n' and cls.strip()=='count':
            try: s.rx['n']=int(re.sub(r'\D','',s.buf) or 1)
            except: pass
            s.capture=None; return
        if tag=='span' and cls.strip()=='reaction': s.rx=None; return
        if tag=='div' and s.capture=='from' and 'from_name' in cls:
            s.cur['from']=s.buf.strip(); s.capture=None
        elif tag=='div' and s.capture=='text' and cls.strip()=='text':
            s.cur['text']=s.buf.strip(); s.capture=None
        elif tag=='div' and s.capture=='reply' and 'reply_to' in cls:
            s.capture=None
    def handle_data(s,d):
        if s.capture in ('from','text','title','rx_e','rx_n'): s.buf+=d

def _norm_date(d):
    # '24.11.2026 05:33:12 UTC+00:00' -> '2026-11-24 05:33:12'
    m=re.match(r'(\d\d)\.(\d\d)\.(\d{4}) (\d\d:\d\d:\d\d)',d or '')
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)} {m.group(4)}" if m else (d or '')

def parse_files(paths):
    title=None; out=[]
    for f in paths:
        p=_P(); p.feed(open(f,encoding='utf-8',errors='replace').read())
        if p.cur: p.msgs.append(p.cur)
        title=title or p.title
        last=None
        for m in p.msgs:
            if m['from']: last=m['from']
            elif m['joined']: m['from']=last
            if m['id'] is None or not (m['text'] or m['media']): continue
            # forwarded messages carry 'Name  dd.mm.yyyy hh:mm:ss' in from_name; keep the name only
            m['from']=re.sub(r'\s+\d\d\.\d\d\.\d{4} \d\d:\d\d:\d\d$','',m['from'] or '').strip()
            m['date']=_norm_date(m['date'])
            del m['joined']
            out.append(m)
    return title,out

if __name__=='__main__':
    t,ms=parse_files(sys.argv[1:])
    print(json.dumps({'chat':t,'count':len(ms),'first':ms[0]['date'] if ms else None,'last':ms[-1]['date'] if ms else None}))


# ---------------------------------------------------------------------------------------------------------------
# Plain-text copy of a chat (for groups that refuse "Export chat history"): select all in Telegram Desktop, paste
# into a .txt. Lines look like:   [7/31/2026 1:14 PM] Name: text        or       [date] Name in reply to Other:
# followed by "> quoted text" lines. No message ids exist, so an id is derived from (date, sender, text); links to
# t.me cannot be built for these rows. Name the file after the chat or put the chat title on the first line as
# "# Title" so ingest can map it (otherwise the file name without extension is used as the title).
import hashlib, datetime as _dt
_TXT_HEAD = re.compile(r'^\[(\d{1,2})/(\d{1,2})/(\d{4}) (\d{1,2}):(\d{2}) (AM|PM)\] (.+?)(?: in reply to (.+?))?:\s?(.*)$')
def parse_txt(path, title=None):
    lines = open(path, encoding='utf-8', errors='replace').read().splitlines()
    if lines and lines[0].startswith('# '): title = lines[0][2:].strip(); lines = lines[1:]
    title = title or os.path.splitext(os.path.basename(path))[0]
    msgs = []; cur = None
    def flush():
        if cur is None: return
        txt = '\n'.join(l for l in cur['_lines'] if not l.startswith('> ')).strip()
        if txt == '[ Photo ]': txt = ''
        cur['text'] = txt.replace('[ Photo ]', '').strip(); cur['media'] = '[ Photo ]' in '\n'.join(cur['_lines'])
        h = hashlib.sha1((cur['date'] + '|' + cur['from'] + '|' + cur['text']).encode()).hexdigest()
        cur['id'] = -int(h[:12], 16)        # negative = synthetic, no t.me link
        del cur['_lines']; msgs.append(cur)
    for l in lines:
        m = _TXT_HEAD.match(l)
        if m:
            flush()
            mo, d, y, hh, mm, ap, who, reply_to_name, rest = m.groups()
            hh = int(hh) % 12 + (12 if ap == 'PM' else 0)
            date = f"{int(y):04d}-{int(mo):02d}-{int(d):02d} {hh:02d}:{int(mm):02d}:00"
            cur = {'from': who.strip(), 'date': date, 'reply_to': None, 'reply_to_name': reply_to_name, 'reactions': [], 'media': False, '_lines': [rest] if rest else []}
        elif cur is not None:
            cur['_lines'].append(l)
    flush()
    return title, msgs

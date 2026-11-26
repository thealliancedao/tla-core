"""Label unlabeled messages with a fixed schema using the Anthropic Messages API.

Env:  ANTHROPIC_API_KEY  (required)      SOCIAL_BOARD_MODEL (optional, overrides config.json "model")
Usage:
  python classify.py            # label everything not yet labeled (bots skipped)
  python classify.py --since 2026-11-01
  python classify.py --limit 200
  python classify.py --relabel  # drop all labels and start again (after changing the schema/prompt)
  python classify.py --estimate # how many messages are left and a rough cost/time, no API calls
  python classify.py --workers 6   # parallel API calls (default 4); lower it if you see 429s
  python classify.py --min-len 40  # messages shorter than this are marked "chatter" locally, no API call (default 40;
                                   #  anything containing a "?" and 12+ chars always goes to the model, whatever its length)
  python classify.py --chat terra  # only one chat
  python classify.py --retry-nolabel   # re-ask the few messages the model skipped last time
  python classify.py --model claude-sonnet-5-5 --only-replies   # stronger model for replies only (40% of messages)
  python classify.py --skip-replies                              # the rest with the default (cheap) model

Recommended full run (≈ $95 total, one evening; Haiku-only for everything is ≈ $12):
  python classify.py --relabel --skip-replies                          (Haiku: non-replies, ≈ $6)
  python classify.py --model claude-sonnet-5-5 --only-replies          (Sonnet: replies — stance to parent, addresses, moves)
A context card (context.md: who is who, products, prop timeline, local slang) is sent with every batch; edit it when
the ecosystem changes. The labels are only as good as that card plus the thread context — not the model's memory.

Resumable: stop it any time (Ctrl+C) and run again — it only labels what is not labeled yet.

Each message gets: kind, tone, stance, targets[], topics[], summary (<=20 words), notable (0/1).
Context given to the model: the message, its chat, the message it replies to (if any), and the two
previous messages in the chat, so sarcasm and replies are read in thread.
"""
import os, sys, json, sqlite3, time, urllib.request, urllib.error, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json')))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
MODEL = os.environ.get('SOCIAL_BOARD_MODEL', CFG.get('model'))
API = 'https://api.anthropic.com/v1/messages'
KEY = os.environ.get('ANTHROPIC_API_KEY')

CONTEXT = open(os.path.join(HERE, 'context.md'), encoding='utf-8').read() if os.path.exists(os.path.join(HERE, 'context.md')) else ''
SYSTEM = f"""You label messages from Terra (LUNA) blockchain community Telegram groups for a PRIVATE analytics board.
Be literal and conservative. Read each message in its thread context. Do not infer motives.

{CONTEXT}



Return ONLY a JSON array, one object per input message, same order, no prose, no code fences. Keep every string short
(summary <= 20 words; topics <= 4 items). Escape double quotes inside strings. Fields:
- "ref": the input ref string, copied exactly
- "kind": one of {CFG['kinds']}
    idea = proposes something new or a concrete change; question = asks something that expects an answer;
    answer = answers a question; feedback = evaluates a product/process/proposal (not a person);
    support = expresses support for a team/person/proposal; criticism = criticises a team/person/proposal;
    commitment = the author (or the team they speak for) promises or states they WILL do something, or sets a deadline
      ("we will hand over the admin key by Friday", "fix ships next week", "I'll post the proposal tomorrow");
    announcement = links or reports news/props/results; chatter = banter, gm, memes, small talk; other.
- "tone": one of {CFG['tones']}
    constructive = offers reasons, data, or a path forward; neutral = plain statement/question;
    hostile = insults, mockery, accusations of bad character, threats, or sustained personal attack.
    Strong disagreement with reasons is NOT hostile. Sarcasm aimed at a person IS hostile.
- "stance": "for" | "against" | "mixed" | "none"  — the OVERALL stance of the message
- "stances": object {{target: "for"|"against"|"mixed"|"none"}} with one entry PER target listed in "targets".
    A message can be for one target and against another ("Eris keeps Terra alive, PF is dead weight" ->
    {{"Eris Protocol": "for", "Phoenix Foundation (PF/PD)": "against"}}). Mentioning a target neutrally = "none".
- "targets": list of teams/people the message is ABOUT (not the author), from this vocabulary when it fits:
    teams {CFG['entities']['teams']}
    people {CFG['entities']['people']}
    Use other names only if clearly named in the message. Empty list if none.
- "topics": up to 4 short tags, lowercase (e.g. "votion", "bribes", "a272", "prop 4856", "admin key", "grants", "salaries", "fifth director", "creda", "solid", "liquidity", "validators", "tla")
- "to_parent": ONLY when the input has a "reply_to": the author's stance toward the PERSON they reply to:
    "for" (backs/defends/agrees with them), "against" (opposes/criticises/attacks them), "mixed", "none" (neutral or not about them). Else "none".
- "addresses": ONLY when the input has a "reply_to" that is a question, criticism or request: does this reply deal with it?
    "direct" (answers / engages the actual point), "partial" (engages part, skips the hard part), "none" (does not engage it at all). Else "".
- "moves": ONLY for replies; zero or more of, literally observable in the text (never inferred intent):
    "counter-question" (answers with a question back), "subject-change" (talks about something else),
    "ad-hominem" (goes after the asker's character/motives instead of the point), "misstates-other" (restates the other
    person's words differently from what the reply_to text actually says), "denies-prior" (denies having said/done
    something; flag only — not verified here), "dismissal" ("not worth answering", "cope", mockery instead of substance),
    "concedes" (admits a point or error), "evidence" (brings a link, number, tx, quote or document), "defers" (promises to answer later).
- "summary": <= 20 words, neutral, what the message says (not what you think of it)
- "notable": true only if a human should read it: a new idea, a specific factual claim about a team/person, a promise/commitment, a question left for someone, or a direct accusation. Chatter is never notable.
"""

REPLY_MODE = 'only' if '--only-replies' in sys.argv else 'skip' if '--skip-replies' in sys.argv else ''
if '--model' in sys.argv: MODEL = sys.argv[sys.argv.index('--model') + 1]

def where(since, chat, minlen):
    q = " WHERE l.id IS NULL AND m.is_bot=0 AND (length(m.text)>=? OR (m.text LIKE '%?%' AND length(m.text)>=12)) "; args = [minlen]
    if REPLY_MODE == 'only': q += " AND m.reply_to IS NOT NULL "
    if REPLY_MODE == 'skip': q += " AND m.reply_to IS NULL "
    if since: q += " AND m.date >= ? "; args.append(since)
    if chat: q += " AND m.chat = ? "; args.append(chat)
    return q, args

def fetch_batch(con, since, chat, minlen, limit):
    q, args = where(since, chat, minlen)
    q = "SELECT m.chat, m.id, m.sender, m.date, m.text, m.reply_to FROM messages m LEFT JOIN labels l ON l.chat=m.chat AND l.id=m.id" + q
    q += " ORDER BY m.chat, m.id LIMIT ?"; args.append(limit)
    return con.execute(q, args).fetchall()

def mark_short(con, since, chat, minlen):
    """Messages shorter than minlen (gm, lol, stickers, one-word replies) are 'chatter' by rule — no API call."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    q = " WHERE l.id IS NULL AND m.is_bot=0 AND length(m.text)>0 AND length(m.text)<? AND NOT (m.text LIKE '%?%' AND length(m.text)>=12) "; args = [minlen]
    if since: q += " AND m.date >= ? "; args.append(since)
    if chat: q += " AND m.chat = ? "; args.append(chat)
    rows = con.execute("SELECT m.chat, m.id FROM messages m LEFT JOIN labels l ON l.chat=m.chat AND l.id=m.id" + q, args).fetchall()
    con.executemany("INSERT OR IGNORE INTO labels(chat,id,kind,tone,stance,targets,topics,summary,notable,model,labeled_at,stances,to_parent,addresses,moves) VALUES(?,?,'chatter','neutral','none','[]','[]','',0,'rule:short',?,'{}','none','','[]')",
                    [(c, i, now) for c, i in rows])
    con.commit()
    return len(rows)

def context_for(con, chat, mid, reply_to):
    ctx = {}
    if reply_to:
        r = con.execute("SELECT sender, text FROM messages WHERE chat=? AND id=?", (chat, reply_to)).fetchone()
        if r: ctx['reply_to'] = {'sender': r[0], 'text': (r[1] or '')[:500]}
    prev = con.execute("SELECT sender, text FROM messages WHERE chat=? AND id<? AND is_bot=0 ORDER BY id DESC LIMIT 2", (chat, mid)).fetchall()
    ctx['previous'] = [{'sender': p[0], 'text': (p[1] or '')[:200]} for p in reversed(prev)]
    return ctx

def _parse_objects(text):
    """Return every complete JSON object found in the model's reply, in order — tolerant of prose, code fences and a cut-off tail."""
    text = text.replace('```json', '').replace('```', '')
    dec = json.JSONDecoder(); out = []; i = 0; n = len(text)
    while True:
        j = text.find('{', i)
        if j < 0: break
        try:
            obj, k = dec.raw_decode(text, j)
            if isinstance(obj, dict) and 'ref' in obj: out.append(obj)
            i = k
        except json.JSONDecodeError:
            i = j + 1
    return out

def _call_once(items, max_tokens):
    body = {
        "model": MODEL, "max_tokens": max_tokens, "system": SYSTEM,
        "messages": [{"role": "user", "content": "Label these messages. Input JSON:\n" + json.dumps(items, ensure_ascii=False) + "\n\nReply with the JSON array only."}]
    }
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method='POST', headers={
        'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    net_fails = 0; attempt = 0
    while attempt < 8:
        attempt += 1
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = json.load(r)
            text = ''.join(b.get('text', '') for b in data.get('content', []))
            return _parse_objects(text), data.get('stop_reason')
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:300]
            if e.code in (429, 500, 502, 503, 529):
                wait = 5 * (attempt + 1); print(f"  API {e.code}, retry in {wait}s: {msg}"); time.sleep(wait); continue
            raise SystemExit(f"API error {e.code}: {msg}")
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            net_fails += 1
            if net_fails % 5 == 0: print(f"  network: {e} (x{net_fails}); still retrying")
            time.sleep(min(60, 3 * net_fails))
            if net_fails < 40: attempt -= 1      # network blips do not count toward the give-up limit
            continue
    print("  giving up on this batch after repeated failures — it stays unlabeled and the next run retries it")
    return [], 'error'

def call_api(items, depth=0):
    """Label a batch; whatever the model did not return (cut-off reply, skipped refs) is re-asked in halves."""
    out, stop = _call_once(items, int(CFG.get('max_tokens', 8000)))
    got = {o['ref'] for o in out}
    missing = [it for it in items if it['ref'] not in got]
    if missing and depth < 3 and len(items) > 1:
        if stop == 'max_tokens': print(f"  reply cut off at {len(out)}/{len(items)} — re-asking the rest in smaller batches")
        half = max(1, len(missing) // 2)
        out += call_api(missing[:half], depth + 1)
        if len(missing) > half: out += call_api(missing[half:], depth + 1)
    elif missing:
        print(f"  {len(missing)} message(s) got no label from the model (stored as 'other', model 'nolabel'; `--retry-nolabel` re-asks them)")
        out += [{'ref': it['ref'], 'kind': 'other', 'tone': 'neutral', 'stance': 'none', 'targets': [], 'topics': [], 'summary': '', 'notable': False, '_nolabel': True} for it in missing]
    return out

def ensure_schema(con):
    cols = [r[1] for r in con.execute("PRAGMA table_info(labels)")]
    for c in ('stances', 'to_parent', 'addresses', 'moves'):
        if c not in cols: con.execute(f"ALTER TABLE labels ADD COLUMN {c} TEXT")
    con.commit()

def store(con, items, out):
    byref = {o.get('ref'): o for o in out if isinstance(o, dict)}
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    for it in items:
        o = byref.get(it['ref'])
        chat, mid = it['ref'].split(':')
        if not o: continue
        model_tag = 'nolabel' if o.get('_nolabel') else MODEL
        raw_t = o.get('targets', []) or []
        if isinstance(raw_t, (str, dict)): raw_t = [raw_t]
        stances = o.get('stances') if isinstance(o.get('stances'), dict) else {}
        if isinstance(o.get('stances'), list):   # tolerate [{"target": "...", "stance": "..."}]
            for x in o['stances']:
                if isinstance(x, dict) and (x.get('target') or x.get('name')): stances[str(x.get('target') or x.get('name'))] = str(x.get('stance', 'none'))
        targets = []
        for t in raw_t:                            # tolerate [{"name": "...", "stance": "..."}] as well as plain strings
            if isinstance(t, dict):
                name = t.get('name') or t.get('target') or t.get('entity')
                if not name: continue
                name = str(name)
                if t.get('stance'): stances[name] = str(t['stance'])
            else:
                name = str(t)
            if name and name not in targets: targets.append(name)
        stances = {t: str(stances.get(t, o.get('stance', 'none'))) for t in targets}   # every target gets a stance
        topics = o.get('topics', []) or []
        if isinstance(topics, str): topics = [topics]
        topics = [str(x.get('name', x)) if isinstance(x, dict) else str(x) for x in topics][:6]
        for f in ('kind', 'tone', 'stance', 'to_parent', 'addresses'):
            if isinstance(o.get(f), (list, dict)): o[f] = str(o[f][0]) if isinstance(o[f], list) and o[f] else 'none'
        moves = [str(m) for m in o['moves']] if isinstance(o.get('moves'), list) else []
        con.execute("INSERT OR REPLACE INTO labels(chat,id,kind,tone,stance,targets,topics,summary,notable,model,labeled_at,stances,to_parent,addresses,moves) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (chat, int(mid), o.get('kind', 'other'), o.get('tone', 'neutral'), o.get('stance', 'none'),
                     json.dumps(targets, ensure_ascii=False), json.dumps(topics, ensure_ascii=False),
                     str(o.get('summary') or '')[:200], 1 if o.get('notable') else 0, model_tag, now, json.dumps(stances, ensure_ascii=False),
                     o.get('to_parent') or 'none', o.get('addresses') or '', json.dumps(moves)))
    con.commit()

def main():
    args = sys.argv[1:]
    since = args[args.index('--since')+1] if '--since' in args else None
    chat = args[args.index('--chat')+1] if '--chat' in args else None
    limit = int(args[args.index('--limit')+1]) if '--limit' in args else 10**9
    workers = int(args[args.index('--workers')+1]) if '--workers' in args else int(CFG.get('workers', 4))
    minlen = int(args[args.index('--min-len')+1]) if '--min-len' in args else int(CFG.get('min_text_chars', 40))
    con = sqlite3.connect(DB)
    ensure_schema(con)
    if '--relabel' in args:
        con.execute("DELETE FROM labels"); con.commit(); print("labels cleared")
    if '--retry-nolabel' in args:
        n = con.execute("DELETE FROM labels WHERE model='nolabel'").rowcount; con.commit(); print(f"{n} unlabeled placeholders cleared — re-asking them")
    q, a = where(since, chat, minlen)
    left = con.execute("SELECT COUNT(*) FROM messages m LEFT JOIN labels l ON l.chat=m.chat AND l.id=m.id" + q, a).fetchone()[0]
    bs = CFG.get('batch_size', 25)
    calls = -(-left // bs)
    # rough sizing: ~220 input tokens per message incl. context + ~70 output; prompt ~900 tokens per call
    prompt_tok = len(SYSTEM) // 4 + 60
    tok_in, tok_out = left * 220 + calls * prompt_tok, left * 70
    PRICE = {'claude-haiku-5-5': (0.10, 0.50), 'claude-sonnet-5-5': (2.0, 10.0)}   # $ per million tokens, list price Nov 2026 — check the pricing page
    pin, pout = PRICE.get(MODEL, (None, None))
    cost = f"≈ ${tok_in/1e6*pin + tok_out/1e6*pout:,.0f} at list price" if pin else "price unknown for this model — see the pricing page"
    print(f"{left:,} messages to label (>= {minlen} chars, not yet labeled){' since '+since if since else ''}{' in '+chat if chat else ''}{' — replies only' if REPLY_MODE=='only' else ' — non-replies only' if REPLY_MODE=='skip' else ''} with {MODEL}")
    print(f"≈ {calls:,} API calls, ≈ {tok_in/1e6:.1f}M input + {tok_out/1e6:.1f}M output tokens; at ~6 s per call with {workers} workers ≈ {calls*6/workers/3600:.1f} h")
    print(f"  {cost}  (prompt ≈ {prompt_tok} tokens per call incl. context.md)")
    if '--estimate' in args: return
    if not KEY: raise SystemExit("Set ANTHROPIC_API_KEY in the environment first.")
    short = mark_short(con, since, chat, minlen)
    if short: print(f"marked {short:,} short messages (< {minlen} chars) as chatter without API calls")
    from concurrent.futures import ThreadPoolExecutor
    done = 0; t0 = time.time()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        while done < limit:
            rows = fetch_batch(con, since, chat, minlen, min(bs * workers, limit - done))
            if not rows: break
            batches = []
            for i in range(0, len(rows), bs):
                items = []
                for c, mid, sender, date, text, reply_to in rows[i:i+bs]:
                    items.append({'ref': f"{c}:{mid}", 'chat': c, 'sender': sender, 'date': date,
                                  'text': (text or '')[:CFG.get('max_text_chars', 1200)], **context_for(con, c, mid, reply_to)})
                batches.append(items)
            for items, out in zip(batches, ex.map(call_api, batches)):
                store(con, items, out)
            done += len(rows)
            rate = done / max(1, time.time() - t0)
            print(f"labeled {done:,} / {left:,}  ({rate*60:.0f}/min, ≈ {(left-done)/max(rate,0.01)/3600:.1f} h left)", flush=True)
    n = con.execute("SELECT COUNT(*) FROM labels").fetchone()[0]
    print(f"done. {n:,} labeled messages in store. Next: python build_board.py")

if __name__ == '__main__':
    main()

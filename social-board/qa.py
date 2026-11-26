"""Weekly hand check. Produces the agreement rate shown on the public Method page.

  python qa.py 50          writes qa/check-YYYY-MM-DD.csv with 50 random labeled rows (public kinds weighted in)
  → open the CSV in Excel/Numbers, fill the 'kind_ok' column with y or n (and optionally 'right_kind'), save
  python qa.py --tally     reads every filled qa/check-*.csv, writes qa/summary.json (used by publish.py)

Rules that keep this honest: the sample is random (seeded by date, so it can be regenerated), every checked row is
published with the verdict, nothing is dropped from the sample, and the summary counts only rows that were filled in.
"""
import os, sys, csv, json, glob, random, sqlite3, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json'), encoding='utf-8'))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
QA = os.path.join(HERE, 'qa'); os.makedirs(QA, exist_ok=True)

def sample(n):
    con = sqlite3.connect(DB)
    today = datetime.date.today().isoformat(); random.seed(today)
    rows = con.execute("""SELECT m.chat, m.id, m.date, m.sender, substr(m.text,1,300), l.kind, l.summary, l.tone, l.stance
                          FROM messages m JOIN labels l ON l.chat=m.chat AND l.id=m.id
                          WHERE l.kind!='chatter' AND l.model NOT IN ('rule:short','nolabel')""").fetchall()
    pick = random.sample(rows, min(n, len(rows)))
    fn = os.path.join(QA, f"check-{today}.csv")
    with open(fn, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['chat', 'id', 'date', 'sender', 'text', 'model_kind', 'model_summary', 'kind_ok (y/n)', 'right_kind', 'summary_ok (y/n)', 'note', 'url'])
        for r in pick: w.writerow(list(r[:7]) + ['', '', '', '', CFG['chats'][r[0]]['tme'] + str(r[1])])
    print(f"wrote {fn} — fill 'kind_ok' (y/n) and 'summary_ok' (y/n) for every row, then: python qa.py --tally")

def tally():
    checked = kind_ok = sum_ok = sum_n = 0; sessions = 0; last = ''; rows = []
    for fn in sorted(glob.glob(os.path.join(QA, 'check-*.csv'))):
        n_file = 0
        for r in csv.DictReader(open(fn, encoding='utf-8')):
            k = (r.get('kind_ok (y/n)') or '').strip().lower()
            if k not in ('y', 'n'): continue
            n_file += 1; checked += 1; kind_ok += (k == 'y')
            s = (r.get('summary_ok (y/n)') or '').strip().lower()
            if s in ('y', 'n'): sum_n += 1; sum_ok += (s == 'y')
            rows.append({'chat': r['chat'], 'id': int(r['id']), 'url': r['url'], 'model_kind': r['model_kind'], 'kind_ok': k == 'y', 'right_kind': r.get('right_kind') or None, 'summary_ok': (s == 'y') if s else None, 'note': r.get('note') or ''})
        if n_file: sessions += 1; last = os.path.basename(fn)[6:16]
    if not checked: raise SystemExit("no filled rows found in qa/check-*.csv")
    out = {'checked': checked, 'sessions': sessions, 'last': last, 'agreement_pct': round(100 * kind_ok / checked),
           'per_field': {'kind': round(100 * kind_ok / checked), **({'summary': round(100 * sum_ok / sum_n)} if sum_n else {})}, 'rows': rows}
    json.dump(out, open(os.path.join(QA, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{checked} rows checked over {sessions} session(s): kind agreement {out['agreement_pct']}%" + (f", summary {out['per_field']['summary']}%" if sum_n else '') + " → qa/summary.json (publish.py picks it up)")

if __name__ == '__main__':
    if '--tally' in sys.argv: tally()
    else: sample(int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 50)

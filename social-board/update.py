"""ONE command for the daily update.

  python update.py                      → shows, per chat, the last message we hold and the export window to use
  python update.py <folder-or-files>    → ingest whatever is there (HTML exports, .txt copies, zips — any mix of chats),
                                          label only the new messages, rebuild the private board, rebuild the public
                                          site folder, re-check the public code folder, and print the git commands
  python update.py <folder> --commit    → also copy the public code + public site folder into the tla-core checkout
                                          (social-board/ and social-board/public/) and commit + push. Nothing private
                                          is ever copied: only make_public_repo.py's whitelist and publish.py's output,
                                          both scanned for private strings first.
  python update.py --commit             → no new exports; just rebuild + publish what is in the store (e.g. after a
                                          relabel, a QA tally, or an override)
  flags passed through: --workers N  --model X   (labeling), --no-label (ingest + build only)

What you do in Telegram: for each chat listed, Export chat history → HTML, text only, From = the date shown, To = today.
Drop all the export folders (or the zips Telegram made) into one folder and run this on it. Overlap is harmless.

Git set-up (once): a checkout of the shared repo next to this folder (config.json → publish.repo_checkout, default
../tla-core):   git clone https://github.com/thealliancedao/tla-core ../tla-core
Credentials: whatever git already uses on this machine (Windows Credential Manager / macOS keychain). Never in a file here.
"""
import os, sys, json, sqlite3, subprocess, zipfile, tempfile, datetime, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json'), encoding='utf-8'))
DB = os.path.join(HERE, CFG.get('db', 'board.sqlite'))
PY = [sys.executable, '-I']

def run(script, *args, check=True):
    print(f"\n$ python {script} {' '.join(args)}", flush=True)
    r = subprocess.run(PY + [os.path.join(HERE, script), *args], cwd=HERE)
    if check and r.returncode != 0: raise SystemExit(f"{script} failed (exit {r.returncode}) — fix that and run update.py again; nothing is lost")

def windows():
    con = sqlite3.connect(DB) if os.path.exists(DB) else None
    print("Export windows (From = the day of our last message, To = today; overlap is fine):")
    today = datetime.date.today().isoformat()
    for key, c in CFG['chats'].items():
        last = con.execute("SELECT MAX(date) FROM messages WHERE chat=?", (key,)).fetchone()[0] if con else None
        if last:
            age = (datetime.date.today() - datetime.date.fromisoformat(last[:10])).days
            flag = '  ← stale' if age > 2 else ''
            print(f"  {c['title']:28s} last message {last[:16]} UTC  → export From {last[:10]} To {today}{flag}")
        else:
            print(f"  {c['title']:28s} nothing yet  → export from the beginning of the group")
    print("\nThen: python update.py <folder with the exports>")

def collect(paths):
    """Expand zips, accept folders/files; everything lands in one temp folder ingest.py can walk."""
    tmp = tempfile.mkdtemp(prefix='sb-update-')
    n = 0
    for p in paths:
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                for f in files:
                    src = os.path.join(root, f)
                    if f.lower().endswith('.zip'):
                        with zipfile.ZipFile(src) as z: z.extractall(os.path.join(tmp, f[:-4])); n += 1
                    elif f.lower().endswith(('.html', '.txt')):
                        d = os.path.join(tmp, os.path.relpath(root, p).replace('..', '_')); os.makedirs(d, exist_ok=True)
                        shutil.copy(src, os.path.join(d, f)); n += 1
        elif p.lower().endswith('.zip'):
            with zipfile.ZipFile(p) as z: z.extractall(os.path.join(tmp, os.path.basename(p)[:-4])); n += 1
        elif p.lower().endswith(('.html', '.txt')):
            shutil.copy(p, tmp); n += 1
    return tmp, n

PUB = CFG.get('publish', {})
CHECKOUT = os.path.normpath(os.path.join(HERE, PUB.get('repo_checkout', '../tla-core')))
REPO_PATH = PUB.get('repo_path', 'social-board').strip('/')

def sync_to_checkout():
    """Mirror public-repo/ → <checkout>/<repo_path>/ and public/ → <checkout>/<repo_path>/public/. Returns the target folder."""
    if not os.path.isdir(os.path.join(CHECKOUT, '.git')):
        raise SystemExit(f"{CHECKOUT} is not a git checkout — run once:  git clone {PUB.get('repo', 'https://github.com/thealliancedao/tla-core')} {CHECKOUT}")
    src_code = os.path.join(HERE, 'public-repo'); src_pub = os.path.join(HERE, 'public')
    if not os.path.isdir(src_code) or not os.path.isdir(src_pub): raise SystemExit("public-repo/ or public/ missing — publish.py / make_public_repo.py did not run")
    dst = os.path.join(CHECKOUT, REPO_PATH)
    os.makedirs(dst, exist_ok=True)
    for name in os.listdir(dst):                      # code files: replace everything except public/ (mirrored below)
        if name == 'public': continue
        p = os.path.join(dst, name)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for name in os.listdir(src_code): shutil.copy(os.path.join(src_code, name), os.path.join(dst, name))
    if os.path.isdir(os.path.join(dst, 'public')): shutil.rmtree(os.path.join(dst, 'public'))
    shutil.copytree(src_pub, os.path.join(dst, 'public'))
    return dst

def git_publish(msg):
    dst = sync_to_checkout()
    def g(*cmd, ok=(0,)):
        r = subprocess.run(['git', *cmd], cwd=CHECKOUT)
        if r.returncode not in ok: raise SystemExit(f"git {cmd[0]} failed in {CHECKOUT} — fix and run `python update.py --commit` again (the store is already updated)")
        return r.returncode
    g('pull', '--rebase', '--autostash')
    g('add', '-A', '--', REPO_PATH)
    if g('commit', '-m', msg, ok=(0, 1)) == 1: print("  nothing changed in the public folder — nothing to commit"); return
    if subprocess.run(['git', 'push'], cwd=CHECKOUT).returncode != 0:   # a cron may have pushed meanwhile: rebase once and retry
        g('pull', '--rebase'); g('push')
    print(f"  pushed → {PUB.get('repo', '')}/tree/main/{REPO_PATH}")

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = [a for a in sys.argv[1:] if a.startswith('--')]
    if not args and '--commit' not in flags: windows(); return
    if args:
        tmp, n = collect(args)
        if not n: raise SystemExit("no .html/.txt/.zip exports found in what you gave me")
        print(f"{n} export file(s) collected")
        run('ingest.py', tmp)
        shutil.rmtree(tmp, ignore_errors=True)
    if args and '--no-label' not in flags:
        if not os.environ.get('ANTHROPIC_API_KEY'): raise SystemExit("ANTHROPIC_API_KEY is not set in this window — set it and run again (ingest is already done)")
        extra = []
        for f in ('--workers', '--model'):
            if f in sys.argv: extra += [f, sys.argv[sys.argv.index(f) + 1]]
        reply_model = CFG.get('reply_model', 'claude-sonnet-5-5')
        run('classify.py', '--skip-replies', *extra)
        run('classify.py', '--only-replies', '--model', reply_model, *[x for x in extra if x != '--model' and not x.startswith('claude-')])
    run('build_board.py')
    run('publish.py')
    run('make_public_repo.py')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    if '--commit' in flags:
        git_publish(f"social-board: update {stamp}")
    else:
        print(f"\nTo publish: python update.py --commit   (mirrors public-repo/ and public/ into {CHECKOUT}/{REPO_PATH}/ and pushes)")
    print("\ndone. Private board: board.html — Public site folder: public/ — Public code folder: public-repo/")

if __name__ == '__main__':
    main()

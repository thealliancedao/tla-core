"""Assemble the PUBLIC code repository folder — only the files listed in config.json → publish.public_files — and refuse
if any of them contains a private string (private-strings.txt) or an API key pattern.

  python make_public_repo.py            → ./public-repo/   (update.py --commit mirrors it into tla-core/social-board/)

Never in the public repo, by construction: board.sqlite, board.html, qa/, PLAN.md, TONIGHT.md, private-strings.txt,
tg.session, any export folder. (public/ — the published board + data — sits beside the code at tla-core/social-board/public/.) The gate is a plain substring scan — keep private-strings.txt current.
"""
import os, sys, json, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'config.json'), encoding='utf-8'))
PUB = CFG.get('publish', {})
OUT = os.path.join(HERE, 'public-repo')
priv_file = os.path.join(HERE, PUB.get('private_strings_file', 'private-strings.txt'))
PRIVATE = [l.strip() for l in open(priv_file, encoding='utf-8')] if os.path.exists(priv_file) else []
PRIVATE = [p for p in PRIVATE if p and not p.startswith('#')]
KEY_RE = re.compile(r'sk-ant-[A-Za-z0-9_\-]{10,}')

def main():
    files = PUB.get('public_files', [])
    bad = []
    for f in files:
        p = os.path.join(HERE, f)
        if not os.path.exists(p): print(f"  (missing, skipped) {f}"); continue
        try: text = open(p, encoding='utf-8', errors='replace').read()
        except Exception: text = ''
        for s in PRIVATE:
            if s and s in text: bad.append((f, s))
        if KEY_RE.search(text): bad.append((f, 'an API key'))
    if bad:
        print("REFUSED — private content found:")
        for f, s in bad: print(f"  {f}: contains {s!r}")
        sys.exit(1)
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    for f in files:
        p = os.path.join(HERE, f)
        if os.path.exists(p): shutil.copy(p, os.path.join(OUT, f))
    open(os.path.join(OUT, '.gitignore'), 'w').write("board.sqlite\nboard.html\npublic_board.html\n*.locked.html\npublic-repo/\nqa/\nexports/\ntg.session*\nprivate-strings.txt\nPLAN.md\nTONIGHT.md\nPRIVATE-*\n__pycache__/\n")
    print(f"ok → {OUT}  ({len(os.listdir(OUT))} files, scanned for {len(PRIVATE)} private strings + key patterns)")

if __name__ == '__main__':
    main()

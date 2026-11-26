# Terra social board — the code

Scripts that build https://theadao.com/social/ from Telegram Desktop exports of the public Terra groups.
Everything needed to reproduce the published data is in this folder: the parser, the store, the labeling prompt and
context card, the board builder and a verifier. The published output (board, Method page, manifest, data) is in
`public/` beside it; every build is a dated commit to that folder, which is the audit log. No message text is stored here.

**Read the published Method page first** — it explains what the board is, what it is not, and the exact steps to check it:
https://theadao.com/social/method.html

## Reproduce / verify
```
python ingest.py <your export folder>                       # your own Telegram Desktop HTML export(s)
python verify.py --manifest https://theadao.com/social/data/manifest.json   # same messages? (content hash per group)
python verify.py --prompt                                    # sha256 of the prompt this code sends — compare with the manifest
python verify.py --relabel 50 --manifest <url>               # optional: re-label 50 published rows with your own key, print agreement
```
Requires Python 3.10+. `classify.py` and `verify.py --relabel` need an Anthropic API key in `ANTHROPIC_API_KEY`.

## What is published and what is not
Published (public build): ideas, questions, open questions, commitments, announcements, support — sender, date, topics,
a one-line summary and the link to the original message. Plus the manifest (counts, id ranges, content hashes, prompt hash,
model), coverage, the hand-check results, and every override/exclusion with its note.

Not published, by design: message text, tone, stance, reply behaviour, per-person tables. The model reads these for the
maintainer's working copy; they are not fair enough to put next to a person's name in public. See the Method page.

## Files
`tgparse.py` export parser · `ingest.py` store · `classify.py` labeler (prompt inside; `context.md` is the context card)
· `build_board.py` board · `publish.py` public build · `verify.py` third-party check · `qa.py` hand-check sampling
· `roles.json` verified roles · `overrides.json` / `exclusions.json` corrections log · `fetch_telethon.py` optional fetcher
· `update.py` the maintainer's one-command update (ingest → label new → build → publish → gate → commit) · `public/` the published site

# tla-flows scripts (tla-core side)

`flows-fill.js` — one-shot archive backfill; see
`docs/pending-changes/SPEC-tla-flows-fill.md`. Trigger via the
`tla-flows-fill` workflow (Actions tab, manual dispatch).

**Classifier discipline:** the `<<FLOWS CLASSIFIER v1>>` block in this script
must stay BYTE-IDENTICAL with `platform-crons/tla-flows/index.js`. Verify
after any change to either side:

```
diff <(sed -n '/SHARED CLASSIFIER/,/CLASSIFIER v1>> END/p' flows-fill.js) \
     <(sed -n '/SHARED CLASSIFIER/,/CLASSIFIER v1>> END/p' ../../../..../platform-crons/tla-flows/index.js)
```
(adjust paths to your checkouts; empty diff = correct)

## Recent changes
# Rev 1 — 2026-07-09
- Initial build. Dry-run verified on the real committed archive: 32,615
  events (15,727/4,499/12,389), 6 months 2024/08→2025/01, deterministic,
  classifier byte-identity confirmed, honest gap entry from data-derived
  archive end (13,737,810).

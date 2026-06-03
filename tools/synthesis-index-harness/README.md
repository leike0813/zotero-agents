# Synthesis Index Harness

This is a long-lived developer harness for Synthesis Index/reference algorithm
debugging. It reads the current Zotero SQLite database and the current Synthesis
plugin SQLite database, runs the cluster-first canonical dedupe experiment, and
writes results only to an isolated debug SQLite database.

It is not bundled into the Zotero plugin and does not use Host Bridge.

## Commands

```powershell
npx tsx tools/synthesis-index-harness/cli.ts snapshot `
  --zotero-db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero.sqlite" `
  --plugin-db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/state/zotero-agents.db"

npx tsx tools/synthesis-index-harness/cli.ts run `
  --zotero-db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero.sqlite" `
  --plugin-db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/state/zotero-agents.db" `
  --debug-db "artifact/synthesis-index-harness/debug.sqlite"

npx tsx tools/synthesis-index-harness/cli.ts serve `
  --zotero-db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero.sqlite" `
  --plugin-db "D:/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/state/zotero-agents.db" `
  --debug-db "artifact/synthesis-index-harness/debug.sqlite" `
  --port 8765
```

The harness requires the system `sqlite3` CLI. Real databases are read with
`sqlite3 -readonly -json`. The debug database path must not be the Zotero DB or
plugin DB path.

## Views

- `Library`: current Zotero parent items with direct Zotero titles and sidecar
  artifact coverage. Attachments and child notes are excluded.
- `References`: active raw reference occurrences joined to source paper titles.
- `Canonicals`: canonical references, active raw counts, and effective redirect
  targets. When a cluster run is loaded, this view also shows algorithm
  eligibility (`eligible`, `weak`, `excluded`) and filter reasons.
- `Cluster Runs`: debug run history.
- `Cluster Results`: analyzed clusters, cluster members, subclusters, action
  evidence, and a projected canonical list after merge. The projection can be
  viewed as redirect-only or as all review actions accepted for debugging.
  Cluster detail includes representative rationale and title-candidate
  provenance so noisy canonical/raw titles can be diagnosed directly. Member
  rows include eligibility and filter reasons, which is where bare DOI rows,
  truncated author strings, and pure publication metadata should appear.

Accept/reject/note UI state, when added or used, is debug-only and must remain in
the debug database.

## Scope

This harness runs `dedupeCanonicalReferencesClustered()` from
`src/modules/synthesis/referenceMatcher.ts`, the same canonical external dedupe
algorithm used by production `runAdvancedReferenceMatchingNow()`. Harness runs
still do not call production services, do not modify Workbench Review UI, and do
not write real `synt_reference_match_proposal` or redirect rows.

The algorithm design source is
`.codex/artifacts/advanced-reference-dedupe-cluster-algorithm.md`. In this
version, harness inputs are effective canonicals: active raw references are
aggregated through redirects, and title candidates are collected from effective
canonical rows, physical canonical rows, and raw parsed references. A previously
merged redirect target is sticky; it remains the representative unless strong
DOI/arXiv or safe exact-title evidence justifies a conservative retarget.

Representative selection is quality/stability first. Raw count is capped
support, not the primary selector, so a noisy raw-count-heavy title should not
beat a clean compatible title.

Before matching, the cluster algorithm filters canonical records by
eligibility. Excluded records do not enter blocking or merge actions; weak
records can remain visible for diagnostics/review context but are not eligible
for automatic redirects. Bibliographic containment uses structured suffix
signals such as DOI/arXiv fragments, proceedings phrases, page markers,
volume/issue/page patterns, and editor/publisher-like suffixes. Concrete venue
tokens are weak evidence only; the intended fix for new failures is improving
the classifier structure, not growing a venue-name list.

The old fixture/gold-label harness under
`.agents/skills/synthesis-reference-resolution-harness` remains useful for
benchmark evaluation. This tool is for realtime DB inspection and cluster dedupe
experiments.

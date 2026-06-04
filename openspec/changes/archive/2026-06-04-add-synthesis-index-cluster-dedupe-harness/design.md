# Design

## Algorithm

`dedupeCanonicalReferencesClustered()` consumes
`ReferenceCanonicalDedupeInput` records with optional title-candidate evidence.
The harness builds those records from effective unbound canonical references:
active raw support is aggregated through existing redirects, and title
candidates are collected from effective canonical rows, physical canonical
rows, and raw parsed references. The matcher selects the best identity/display
title before blocking, edge classification, and representative selection.

The algorithm is precision-first:

- every canonical record is classified as `eligible`, `weak`, or `excluded`
  before blocking;
- bare DOI/URL rows, pure publication metadata, and titles with too few content
  tokens are excluded from ordinary cluster matching;
- strong identifier duplicates may produce redirect actions;
- exact normalized/compact title-year subclusters may produce redirect actions
  when no conflict or danger signal exists;
- typo, weak fuzzy, and title-containment cases produce review actions;
- title-containment is classified by a structured bibliographic suffix
  classifier, author-noise checks, and semantic extension risk checks;
- semantic extension risk never produces redirect actions.
- representative selection is quality/stability first, not raw-count first.
- existing redirect targets are sticky representatives unless strong
  deterministic retarget evidence is present.

The bibliographic classifier uses a small set of core markers plus structural
patterns such as DOI/arXiv suffixes, proceedings phrases, volume/issue/page
patterns, page markers, and editor/publisher-like suffixes. Concrete venue names
are weak evidence only and must not be expanded into the primary classifier.

The output is a debug/read-model result, not production persistence. It includes
clusters, edges, actions, diagnostics, and counters.

## Harness

The harness is a repo-level developer tool under `tools/synthesis-index-harness`.
It is not bundled into the Zotero plugin and does not use Host Bridge.

It has three CLI modes:

- `snapshot`: read Zotero and plugin SQLite data and print a read model summary.
- `run`: build dedupe inputs, run the cluster algorithm, and write one debug run
  to an isolated SQLite database.
- `serve`: start a local HTTP server exposing API routes and a compact UI.

SQLite access uses the system `sqlite3` command with `-readonly -json` for real
databases. The debug database may be written through `sqlite3`, but its path must
not equal the Zotero DB path or plugin DB path.

## UI

The UI is intentionally small and diagnostic-focused. It renders library items,
raw references, canonical references, run history, and cluster results. Review
decisions in the UI are debug annotations stored only in the debug database.
Canonical and cluster result views expose eligibility and filter reasons so
bad inputs can be diagnosed without writing to the plugin database.

## Production Boundary

The harness remains isolated from production persistence: its runs and debug
decisions write only the debug database. The cluster algorithm itself is now the
production canonical external dedupe implementation through
`promote-cluster-reference-dedupe-to-production`. Refresh and workflow apply
remain guarded from all advanced dedupe functions.

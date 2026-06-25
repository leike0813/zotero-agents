# Optimize Synthesis Sidecar DB-Only Governance

## Why

Rerunning `literature-analysis` on older papers can spend a long time in the
post-note Synthesis sidecar tail. The expensive part is stale canonical
governance: each stale canonical currently performs broad repository list calls
and filters in JavaScript. On libraries with many references, proposals, review
items, and graph rows, this can block the Zotero UI after the visible note apply
has already succeeded.

The same area still has legacy file sidecars under `data/synthesis/sidecar/**`
for projection state, topic sidecar indexes, artifact state, and canonical-store
logs. Normal Workbench and governance paths should use SQLite state, leaving
files only for topic body artifacts, explicit sync/import/export transport, and
debug artifacts.

## What Changes

- Keep stale canonical governance synchronous, but replace per-canonical full
  list-and-filter checks with scoped repository queries over the current stale
  canonical set.
- Treat unchanged literature-analysis reference sidecar reruns as no-op for
  stale governance and graph/related-items invalidation.
- Store projection registry and canonical-store receipt/event/diagnostic records
  in the Synthesis repository DB instead of `sidecar/*.json` / `sidecar/*.jsonl`.
- Stop projection rebuilds from writing `sidecar/tag-index.json`,
  `sidecar/concept-kb-index.json`, or `sidecar/topic-graph-index.json`.
- Stop the generic Synthesis store initializer from creating empty domain
  directories such as `concepts/`, `tags/`, `topic-graph/`, and
  `citation-graph/`.

## Impact

- Old-paper literature-analysis reruns avoid the worst UI-blocking full-library
  scans.
- Normal Synthesis read models move toward DB-only sidecar state without
  deleting existing user files.
- Existing topic body artifacts under `topics/**` and deleted topic archives
  remain file based.
- Sync transaction manifests, durable sync transport files, and debug DB files
  remain explicit file artifacts.

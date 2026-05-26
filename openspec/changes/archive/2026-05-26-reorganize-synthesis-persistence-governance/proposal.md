## Summary

Reorganize plugin persistence around a Zotero `DataDirectory` scoped root named
`zotero-agents`, move Synthesis canonical assets out of runtime semantics,
remove Zotero note mirror from the plugin runtime path, and add explicit
governance for prefs, SQLite indexed state, file assets, TTL, integrity scans,
and one-shot migration.

## Motivation

The current persistence model mixes durable user data, runtime workspaces,
cache/logs, and indexed operational state under a `runtime` root. This makes
Synthesis canonical assets look cleanable even though they are durable user
knowledge data. Prefs and `zotero-skills.db` also lack a written ownership
contract, and the legacy Zotero note mirror still participates in runtime
recovery even though the current KG design uses canonical files plus Git Sync.

## Scope

- Use `<Zotero.DataDirectory.dir>/zotero-agents/` as the production persistence
  root.
- Introduce durable `data/synthesis/` paths for Synthesis canonical assets and
  keep cleanable runtime paths under `runtime/`.
- Rename the internal SQLite state database to `state/zotero-agents.db`.
- Remove normal runtime use of Zotero note mirror read/write/recovery paths.
- Add persistence integrity scanning and explicit cleanup APIs for SQLite-indexed
  file assets.
- Add a one-shot migration script with dry-run, apply, and verify-only modes.

## Out of Scope

- Automatic startup migration or backward-compatible reads from old runtime
  roots.
- Deleting old data during migration.
- SQLite/FTS/BM25 projection backend work.
- New npm dependencies or a development server.

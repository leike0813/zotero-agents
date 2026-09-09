## Why

`pluginStateStore.ts` is a stable process-wide storage module, but its adapter lifecycle, schema, SQL-shaped Map test double, row codecs, and unrelated table families now share more than 4,000 lines. Recent mutation-authority, literature-migration, and sequence work has made table changes require edits across distant implementation regions, while the Map adapter's delimiter-joined composite keys and no-op transactions no longer faithfully represent SQLite behavior.

## What Changes

- Keep the existing Plugin State Store interface and database ownership while moving table-specific implementation into four private family modules.
- Co-locate each family's DDL, row codecs, SQL operations, and family-level atomic behavior.
- Replace the SQL-parsing Map test double with an explicitly injected Node `node:sqlite` in-memory adapter that executes the same SQL as Zotero.
- Require Node 24 for development and CI paths that run the Node test suite.
- Correct the active Plugin State Store documentation to match the implemented tables, columns, adapters, and legacy-pref clearing behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Public store behavior, persisted schema, database paths, runtime-persistence governance, and Zotero Host mutation semantics remain unchanged, so this implementation-only change opts out of delta specs.

## Impact

The change affects the private TypeScript layout behind `src/modules/pluginStateStore.ts`, Node test setup, the Node toolchain declaration used by CI and release validation, focused store tests, and the active component documentation. It adds no dependency, migration, public export, compatibility forwarding path, or wire-format change; the readonly Harness remains a separate projection.

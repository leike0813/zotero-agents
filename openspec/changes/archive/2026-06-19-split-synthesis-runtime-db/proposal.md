## Why

Synthesis runtime writes and workflow execution ledger writes currently share `state/zotero-agents.db`. Both paths use guarded SQLite transactions with `BEGIN IMMEDIATE`, so Synthesis cache/projection work can still contend with ACP/SkillRunner task persistence even when they write unrelated tables.

## What Changes

- Add a dedicated Synthesis SQLite database at `state/synthesis.db`.
- Keep `state/zotero-agents.db` as the workflow/plugin runtime database for task rows, ACP conversation indexes, SkillRunner ledgers, workflow products, and related plugin state.
- Route all Synthesis `synt_*` repository reads/writes, reset, recover, readonly harness, and diagnostics to `state/synthesis.db`.
- Add a one-shot same-root legacy migration from old `synt_*` tables in `state/zotero-agents.db` into `state/synthesis.db` when the new DB is empty.
- Treat both live SQLite files and their WAL/SHM companions as local-only runtime state that must not be synchronized or durable-bundle exported.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-persistence-governance`: Split plugin runtime SQLite paths into workflow/plugin DB and Synthesis DB.
- `synthesis-persistence-performance`: Require Synthesis SQLite state to live in `state/synthesis.db` and migrate legacy same-root `synt_*` rows.
- `ui-readonly-harness`: Allow readonly Synthesis harnesses to use the dedicated Synthesis DB separately from the plugin runtime DB.
- `synthesis-git-sync`: Exclude both runtime SQLite databases and their WAL/SHM files from durable sync payloads.

## Impact

- Affects `runtimePersistence`, `pluginStateStore`, `synthesis/repository`, `synthesis/registry`, Synthesis reset/recover flows, readonly harness entrypoints, preferences diagnostics, durable sync filters, docs, and focused tests.
- No dependency changes.
- No automatic deletion of legacy `synt_*` rows from `state/zotero-agents.db`.

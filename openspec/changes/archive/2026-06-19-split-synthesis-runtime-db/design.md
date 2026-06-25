## Overview

This change separates SQLite write domains without renaming the existing workflow/plugin runtime DB. The new active layout is:

```text
zotero-agents/
  state/
    zotero-agents.db
    synthesis.db
  data/synthesis/**
  runtime/**
```

`zotero-agents.db` remains the existing plugin runtime ledger. `synthesis.db` becomes the only live Synthesis repository DB.

## Runtime Path Contract

`getRuntimePersistencePaths()` will continue exposing `stateDbPath` for the workflow/plugin runtime DB and will add `synthesisDbPath` for Synthesis. Existing workflow, ACP, SkillRunner, and product code should keep using `stateDbPath`.

Synthesis path helpers must stop deriving their DB from `stateDbPath`; they should call the new Synthesis-specific path. This keeps the split explicit and avoids future regressions from generic DB path reuse.

## Synthesis Migration

Repository initialization should ensure the new DB exists and then run a bounded same-root migration when needed:

- source: `<root>/state/zotero-agents.db`;
- target: `<root>/state/synthesis.db`;
- precondition: target lacks Synthesis rows/schema marker;
- copied data: allowlisted `synt_*` tables only;
- excluded data: all `plugin_*`, ACP, SkillRunner, workflow product, runtime-log, and non-Synthesis rows.

The migration must leave the old DB untouched. If the old DB has no Synthesis tables, the target initializes as a clean Synthesis DB. If copying fails, repository initialization reports a structured error instead of silently using an empty DB.

## Diagnostics and Tools

Runtime usage scan should report both SQLite files as non-cleanable state. Category cleanup remains scoped to existing runtime categories; Synthesis reset continues to go through the explicit reset confirmation flow rather than generic cleanup.

Readonly harnesses should accept separate plugin runtime DB and Synthesis DB paths. Dashboard/Assistant models read the plugin runtime DB; Synthesis models read the Synthesis DB.

## Durable Sync Boundary

Git/WebDAV durable sync remains asset-based. Live SQLite files, `*.db-wal`, and `*.db-shm` are local-only and are never included in sync bundles or exports.

# Synthesis Knowledge Graph Git Sync Design

Date: 2026-05-24

Parent design: `artifact/topic_graph_lightweight_design_20260519.md`

## Scope

Git Sync 是长期同步后端，负责同步 canonical store，不同步 SQLite projection、runtime、logs 或 agent workspace。

本域包括：

- Git adapter。
- sync worktree。
- export / import transaction。
- sensitive data redaction。
- sync lock。
- conflict gate。
- sync queue。
- conflict UI state。
- `canonical-store-changed` debounce。

本域不包括：

- hosted sync service。
- note shards。
- multi-remote / multi-branch。
- semantic merge。

## Directory Boundary

```text
local canonical store
  synthesis/

git working copy
  sync-worktree/
```

Git worktree is exchange area, not source of truth.

## Sensitive Data

Never sync:

```text
access token
Authorization header
Zotero profile secrets
ACP/agent runtime logs
skill run workspaces
SQLite projection files
diagnostics with unredacted credentials
temporary export/import directories
lock files
```

## Transaction

```text
acquire sync lock
  -> export local canonical snapshot to temp export
  -> validate temp export
  -> copy export into sync worktree
  -> git fetch / pull / merge
  -> validate merged worktree
  -> if conflict: write conflict report and stop before import
  -> commit / push when needed
  -> import validated worktree into temp local store
  -> validate temp local store
  -> atomic promote into local canonical store
  -> rebuild SQLite projections
release sync lock
```

Failure must not corrupt local canonical store.

## Validation Gate

Import gate:

```text
schema validation
manifest hash validation
path traversal validation
asset allowlist validation
tombstone validation
version compatibility validation
size / count limit validation
```

Only `synthesis/` canonical assets can be imported.

## Queue

State:

```text
idle
queued
syncing
blocked_conflict
failed_retryable
failed_permanent
disabled
```

Rules:

- single worker。
- debounce burst changes。
- one sync run at a time。
- conflict pauses remote sync。
- local work can continue while conflict is unresolved。

Internal mutation batches emit one `canonical-store-changed` event after commit. Sync consumes debounced store-change events, not individual file writes.

## Conflict

V1 file-level strategy:

- different files merge automatically。
- same file one side changed -> use changed side。
- same file both sides changed -> conflict。
- semantic merge is out of scope。

UI actions:

```text
Sync now
Pause sync
Resume sync
Resolve conflict
Retry
Open diagnostics
```

## Failure

Failure classes:

```text
failed_retryable
failed_permanent
blocked_conflict
```

Retryable failure uses backoff and should not spam toasts.

Permanent failure and conflict require visible panel / toast.

## Acceptance Criteria

- sync never writes credentials into repo。
- sync conflict does not import remote changes into local canonical store。
- failed import leaves local canonical store unchanged。
- SQLite projection is not synced。
- conflict panel uses business language rather than raw Git terminology。

## Dependencies

- Foundation。
- Stable canonical schemas for at least Tags or Topic Graph。


## Context

Git Sync is an exchange layer for the Synthesis KG canonical store. The local `synthesis/` canonical store remains the source of truth, while `sync-worktree/` is a temporary Git-backed exchange area.

The repository already has Foundation transactions, projection stale state, sanitized diagnostics conventions, and Zotero mirror recovery. This change adds Git Sync without replacing mirror recovery or introducing Node-only code in plugin runtime.

## Goals / Non-Goals

**Goals:**

- Export allowlisted canonical assets from `synthesis/` into an isolated worktree.
- Import validated canonical assets from the worktree through a failure-safe transaction.
- Keep projections, runtime files, logs, locks, diagnostics with secrets, and credentials out of Git.
- Provide a sync lock, single-worker queue, debounced store-change handling, receipts, and conflict gate.
- Expose sync status and actions in Synthesis service and Workbench state.

**Non-Goals:**

- No multi-remote or multi-branch support, semantic merge, hosted service, credential storage UI, SQLite sync, external MCP tool, or deletion/rewrite of existing Zotero mirror recovery.

## Decisions

1. **Injectable adapter boundary.**  
   `SynthesisGitSyncAdapter` owns remote operations. Core plugin code never imports `child_process` or assumes a Node Git CLI. If no adapter is configured, status is `disabled`.

2. **Allowlisted export/import.**  
   Git Sync exports only canonical domain assets under `tags/`, `topics/`, `concepts/`, `topic-graph/`, `citation-graph/`, and generated `sync/sync-manifest.json`. Local-only files such as `state/`, queue/conflict/remote state, locks, temp files, runtime workspaces, logs, and credentials are excluded.

3. **Worktree is not source of truth.**  
   `sync-worktree/` may be recreated. Import only happens after validation into a temp local store and atomic promotion into `synthesis/`.

4. **File-level conflict gate for v1.**  
   Different files merge automatically. Same file with one side changed uses the changed side. Same file with both local and remote changes enters `blocked_conflict`; the service writes a conflict report and does not import remote changes.

5. **Queue is deterministic and single-worker.**  
   Store-change bursts coalesce into one queued sync request. Manual sync bypasses debounce but still respects lock and conflict state.

6. **Projection rebuild stays explicit.**  
   Git Sync marks affected projections stale after successful import. It does not sync or create SQLite files.

## Risks / Trade-offs

- **No adapter means no remote sync in plugin runtime** -> expose a clear `disabled` state and keep core logic testable through fake adapters.
- **JSON canonical store can grow** -> validate size/count limits during import and keep projections out of Git.
- **File-level merge is conservative** -> avoids corrupting canonical assets while deferring semantic merge to a later phase.

## Migration Plan

1. Add Git Sync OpenSpec contracts and service module.
2. Initialize local sync state without enabling remote sync by default.
3. Wire Synthesis service and Workbench UI to expose status/actions.
4. Add fake-adapter tests for success, failure, conflict, validation, redaction, and queue behavior.
5. Validate OpenSpec, focused tests, TypeScript, and formatting.

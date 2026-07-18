## Why

Runtime log persistence currently mixes synchronous Node-only file access with asynchronous Zotero file APIs, so startup hydration can fail in the plugin host, flush can return before durability, and overlapping full-document writes can let an older snapshot overwrite a newer one. The pipeline needs an ordered, host-compatible persistence boundary that remains responsive for multi-megabyte retained logs without changing the stored document format.

## What Changes

- Hydrate runtime logs explicitly through Zotero/cross-runtime asynchronous file APIs before startup log producers begin.
- Cache each sanitized entry's serialized representation once and reuse it as the byte-budget and persistence source of truth.
- Persist dirty revisions through one single-flight writer with idle debounce, a bounded maximum delay, retryable failure state, and a true async flush/drain contract.
- Replace whole-document string assembly with bounded, surrogate-safe chunk writes to a same-directory temporary file followed by atomic replacement.
- Make append notifications and Task Manager refreshes consume lightweight change/summary data instead of constructing full runtime-log snapshots.
- Coordinate clear and persistence-category cleanup with pending writes so late saves cannot recreate deleted log storage.
- Preserve the existing runtime-log JSON schema, retention values, filtering, redaction, diagnostic bundle semantics, and user-visible copy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-log-pipeline`: Define host-compatible asynchronous hydration, ordered and drainable persistence, bounded atomic document writes, lightweight observation, and cleanup ordering for retained runtime logs.

## Impact

- Runtime log lifecycle and observation in `src/modules/runtimeLogManager.ts`.
- Shared runtime file persistence and cleanup coordination in `src/modules/runtimePersistence.ts`.
- Plugin startup/shutdown ordering in `src/hooks.ts`.
- Runtime Logs Task Manager rendering and clearing in `src/modules/taskManagerDialog.ts`.
- Node governance tests, Zotero core-lite host tests, test registration/domain filtering, and the testing/audit documentation.
- No dependency, external API, profiler-schema, or on-disk schema migration is introduced.

## 1. Contract and Red Tests

- [x] 1.1 Extend Core 108 for fixed-scope idempotent Git runtime/prefs cleanup, including external-path protection.
- [x] 1.2 Extend Core 159 for WebDAV autosync default-off/debounce/epoch coalescing, bounded retry delays, and pause/conflict/terminal/invalidation cancellation.
- [x] 1.3 Update Core 175, 125, 168, and 176 to require WebDAV-only client/commands/projection and the `108 methods / 1 direct consumer` inventory.
- [x] 1.4 Update Core 158 for `webdav-sync.v1` new manifests and transport-neutral legacy manifest reads; retire Core 144 Git implementation coverage and rename Core 184 for WebDAV composition.

## 2. Runtime and Service Retirement

- [x] 2.1 Add idempotent `syncRuntimeCleanup.ts` and invoke it at startup with exactly two managed directories and nine Git prefs.
- [x] 2.2 Add strict WebDAV `autoSyncEnabled`/`autoRetryEnabled` description fields and WebDAV debounce/retry/abort options.
- [x] 2.3 Move canonical-write autosync, maintenance-epoch coalescing, bounded retry, and lifecycle cancellation into the WebDAV-only runtime.
- [x] 2.4 Delete Git runtime/config/token/command modules, rename the remaining runtime fallback for WebDAV, and remove all imports/composition bindings.
- [x] 2.5 Remove seven Git service methods and three Git service options, reduce inventory to `108 / 1`, and preserve readonly disabled behavior.

## 3. Client, Workbench, and Persistence Surfaces

- [x] 3.1 Remove `sync.git` and Git DTO/command composition while preserving strict WebDAV DTO rebuilding and transport error mapping.
- [x] 3.2 Remove Git Workbench host commands, operation labels, projection fields, fast paths, app state, and i18n; use transport-neutral sync state names where shared.
- [x] 3.3 Remove Git prefs defaults/typings/hooks and keep only WebDAV configuration, credentials, manual commands, and invalidation.
- [x] 3.4 Change new durable manifests to `webdav-sync.v1`, keep schema/hash-based import compatibility, and restrict persistence integrity to `webdav-sync`.

## 4. Current-State Specs and Documentation

- [x] 4.1 Apply the delta requirements to main OpenSpec capabilities, removing retired Git capability specs and making WebDAV the current-state durable-sync capability.
- [x] 4.2 Delete all multilingual `synthesis/git-sync.md` help pages and remove Git history from Home, Index, WebDAV, and Preferences help.
- [x] 4.3 Replace the Git durable-state architecture document with WebDAV-only durable sync and update README, runtime/rebuild, state-machine, sequence, Workbench, and persistence docs.

## 5. Validation

- [x] 5.1 Run focused Core 108, 125, 126, 129, 140, 158, 159, 168, 175, 176, and 184 tests, readonly UI harness, and Synthesis invariants.
- [x] 5.2 Run contracts/engine/root TypeScript, service-boundary, targeted Prettier/ESLint, help-doc build, `git diff --check`, and production build.
- [x] 5.3 Run strict OpenSpec validation and confirm repository search has no active Git Sync runtime/API/UI/docs references; do not archive, publish, commit, or modify `reference/Skill-Runner`.

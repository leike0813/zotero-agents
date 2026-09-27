# Tasks

## 1. Contract and red tests

- [x] 1.1 Pin the matching native Pi packages at `0.84.4`; verify the lockfile resolves both exact versions.
- [x] 1.2 Add one browser-safe faux fixture and shared runtime behavior tests for ordered success, empty completion, busy rejection, structured failure, cancellation, late events, and unique terminal; verify the focused Node test fails for the missing module.
- [x] 1.3 Admit the shared behavior tests to the current Node runtime shard and Zotero core-lite suite; verify both runners discover them.

## 2. Runtime implementation

- [x] 2.1 Implement the transient `PiRuntime` interface and native event normalization in one production module; verify the shared Node behavior test passes without native SDK objects in public DTOs.
- [x] 2.2 Implement the per-session active-turn gate, abort, late-event suppression, structured failure, and idempotent disposal; verify the focused cancellation and failure tests pass.

## 3. Verification and completion

- [x] 3.1 Run the focused Node shard and real Zotero core suite; verify the faux turn runs without a Node runtime.
- [x] 3.2 Run `npm run lint:check`, `npm run build`, OpenSpec validation, and official implementation verification; verify no task-scoped failure remains.
- [x] 3.3 Sync the new capability spec and archive this completed change; verify OpenSpec reports no active C01 change.

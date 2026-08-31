## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require `client.workbench.readProgress`, forbid the direct legacy progress call, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update client contract and adapter tests to require a JSON-normalized maintenance progress projection and stable client-error normalization.
- [x] 1.3 Update service lifecycle tests so construction, background-job reads, and debug progress reads preserve running operations while explicit startup reconciliation cancels every restart orphan.

## 2. Service Query and Lifecycle Separation

- [x] 2.1 Remove reconciliation from service factory construction and all ordinary progress/debug read paths.
- [x] 2.2 Remove elapsed-time stale cancellation and make startup reconciliation cancel all persisted running operations with restart-orphan diagnostics.

## 3. Client and Workbench Migration

- [x] 3.1 Add the no-argument opaque `workbench.readProgress` contract and compose its in-process legacy port with JSON/error normalization.
- [x] 3.2 Route `refreshWorkbenchCommandProgress` through the lazily resolved client and existing Workbench adapter/runtime merge while preserving Git Sync, cadence, locks, fallback, and chrome-only publication.
- [x] 3.3 Keep the service method, migration inventory, command/mutation paths, Host Bridge, MCP, process ownership, and storage ownership unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, Workbench UI, and invariants documentation for the pure client progress read and startup-only reconciliation.
- [x] 4.2 Run contract/root typechecks; focused tests 125, 129, 144, 146, 152, 168, 175, 176, and 177; read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier/ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all implementation tasks complete.

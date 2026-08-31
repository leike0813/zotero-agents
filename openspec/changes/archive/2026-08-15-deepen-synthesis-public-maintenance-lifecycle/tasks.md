## 1. Lifecycle Interface and Execution Ownership

- [x] 1.1 Preserve the affected-row winner from repository nonterminal and terminal compare-and-set methods and lock it with atomicity tests.
- [x] 1.2 Add command-interface tests for submit insertion ownership, duplicate replay, typed operation views, and post-commit spawn failure.
- [x] 1.3 Move durable admission, dispatch, running transition, terminalization, and receipt projection into `runtime_public_maintenance_operation` behind `submit` and `read`.
- [x] 1.4 Add control tests for retry successor insert ownership, retry-key replay, continue compare-and-set ownership, and duplicate suppression.
- [x] 1.5 Move cancel, retry, continue, resume dispatch, and restart reconciliation behind `control` and `reconcile_restart`.
- [x] 1.6 Cover handler success, semantic failure, error, panic containment, spawn failure, checkpoint cancel/timeout, restart classification, and first-terminal-wins across focused and process tests.

## 2. Catalog, Context, and Runtime Wiring

- [x] 2.1 Add catalog tests for opaque resolved maintenance routes without a second handler registry or persisted implementation identity.
- [x] 2.2 Make production routing delegate maintenance submit/control/read operations to the lifecycle interface and remove phase-oriented orchestration and `MaintenanceControlResume`.
- [x] 2.3 Add execution-context tests for nesting, panic unwind restoration, worker-thread installation, checkpoint isolation, and stable operation correlation.
- [x] 2.4 Replace manual thread-local handling with a private RAII maintenance execution context and migrate the shared promotion checkpoint callers.
- [x] 2.5 Route runtime startup reconciliation through the lifecycle interface without changing shutdown ownership or repository close ordering.

## 3. Wire Adapter and Observation

- [x] 3.1 Add or update WebDAV adapter tests for strict fields, typed control/query translation, not-found projection, and unchanged public operation DTOs.
- [x] 3.2 Reduce `runtime_webdav_maintenance_surface` to wire validation and encoding, removing lifecycle persistence, classification, projection, and event ownership.
- [x] 3.3 Add lifecycle event tests for operation-level started publication, terminal-winner publication on every terminal path, duplicate suppression, and retry/continue semantics.
- [x] 3.4 Remove Host receipt-to-started inference and retain initial invocation audit behavior.
- [x] 3.5 Add cross-trace retention tests and unpin the originating trace by operation identity when any later trace carries the terminal event.

## 4. Process Evidence and Test Replacement

- [x] 4.1 Strengthen process replay evidence so concurrent submit, retry, and continue windows dispatch one worker and one Host effect.
- [x] 4.2 Preserve representative process evidence for cooperative cancel, restart no-replay, retry successor identity, and exactly-one started/terminal events.
- [x] 4.3 Replace adapter-level lifecycle implementation tests with command/process evidence while retaining narrow module-private RAII, CAS, and checkpoint race tests.
- [x] 4.4 Keep repository atomicity, catalog parity, 96-route coverage, and WebDAV-maintenance semantic surface parity tests unchanged except for ownership-neutral assertions.

## 5. Documentation and Guardrails

- [x] 5.1 Add Public Maintenance Operation, Receipt/View, Continuation, Retry Successor, and Execution Ownership to the Synthesis glossary.
- [x] 5.2 Update runtime supervision, rebuild, Workbench, and README documentation to match explicit restart classification and the deep lifecycle owner.
- [x] 5.3 Add project agent guardrails for durable dispatch winners, no startup replay, cooperative running cancel, operation-level started events, and terminal-winner publication.

## 6. Verification

- [x] 6.1 Run focused lifecycle, catalog, wire, trace, and process tests during each red-green slice.
- [x] 6.2 Run Rust formatting, checks, full sidecar tests, sidecar build, Node stage-one tests, capability/surface parity, and cross-language/runtime contract gates.
- [x] 6.3 Validate the OpenSpec change strictly and confirm no public DTO, manifest, database schema, dependency, route inventory, or unrelated dirty-worktree change was introduced.

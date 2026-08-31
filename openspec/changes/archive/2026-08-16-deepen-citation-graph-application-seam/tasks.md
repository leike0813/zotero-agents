## 1. Repository Promotion TDD

- [x] 1.1 Add a failing repository test proving graph rows/state, Citation Graph cache basis, and the private graph-operation terminal commit or roll back together.
- [x] 1.2 Implement full and source-slice graph promotion primitives that settle cache basis and the private operation in the existing SQLite transaction.
- [x] 1.3 Keep existing graph CAS, source-slice preservation, bounded window, and rollback tests green.

## 2. Basis-Bound Read Interface

- [x] 2.1 Add failing application tests for coherent basis reads, continuation rejection, endpoint closure, and metrics/layout identity.
- [x] 2.2 Add a failing application test proving a last-good graph remains readable while graph computation is blocked outside writer ownership.
- [x] 2.3 Implement the opaque read view and private read/persistence modules over the concrete `RepositoryPort` reader pool.
- [x] 2.4 Migrate runtime Graph page, continuation, neighborhood, metrics, and layout adapters to the typed application read interface.

## 3. Opaque Rebuild Attempt And Retry

- [x] 3.1 Add failing application and runtime tests for fresh attempt identity, last-good preservation, and Full/Incremental retry from current facts.
- [x] 3.2 Implement `prepare_rebuild` and consuming `finish_rebuild`, merging the runtime Citation intent and application receipt into one private graph operation.
- [x] 3.3 Preserve the no-argument retry wire while reusing only failed command mode and replanning concrete scope from current cache, Reference, and Host facts.
- [x] 3.4 Keep public maintenance checkpoint, deadline, terminal winner, event, retry/continue, and restart reconciliation ownership in runtime.

## 4. Runtime Cutover And Cleanup

- [x] 4.1 Switch production composition and Citation Graph command adapters to the deepened application interface.
- [x] 4.2 Delete `CitationGraphRepositoryPort`, its one-line delegates, duplicate internal operation logic, and production Citation Graph `RepositoryPort::owner()` escapes.
- [x] 4.3 Replace tests that inspect forwarding, owner state, operation records, or call order with application, repository, and public-route outcomes.
- [x] 4.4 Preserve the runtime-only Workbench cross-domain review projection and existing wire/capability roster.

## 5. Current-State Documentation

- [x] 5.1 Add the resolved Citation Graph domain term to `CONTEXT.md` and the new ownership invariants to project `AGENTS.md`.
- [x] 5.2 Update Citation Graph ownership, persistence, runtime, and sequence documents without adding compatibility or history prose.

## 6. Verification

- [x] 6.1 Run focused repository, application, runtime, and native process tests plus Citation Graph Node parity and surface checks.
- [x] 6.2 Run Rust formatting, workspace clippy, workspace tests, production ownership/capability checks, and strict OpenSpec validation.
- [x] 6.3 Search for stale `CitationGraphRepositoryPort`, duplicate graph-operation, and production Citation Graph owner-escape paths; confirm the approved exclusions remain unchanged.

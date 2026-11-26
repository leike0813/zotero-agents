# Tasks

## 1. Historical Topic compatibility

- [x] 1.1 Accept the legacy rendered export under a historical Topic assets directory while preserving its original bytes. Verify with the historical Unicode Topic process regression, including the HTML and metadata files.
- [x] 1.2 Keep manifest-declared files and current writes under strict representation validation. Verify with existing traversal, snapshot integrity, and canonical store tests.

## 2. Topic migration isolation

- [x] 2.1 Return per-Topic legacy preflight outcomes for source, identity, snapshot, and projection failures while keeping shared source inventory and production path errors fail-closed. Verify with canonical store and legacy migration tests.
- [x] 2.2 Persist pending Topic IDs and stable codes in repository metadata, retain graph rows and the legacy backup, and retry only topics without application state. Verify the success, failure, and success restart sequence in `native_process_lifecycle`.
- [x] 2.3 Commit recovered Topic state, projection, and pending-record removal in one repository transaction. Verify the retry restart test restores the interrupted source and clears all pending state.

## 3. Application read isolation

- [x] 3.1 Isolate invalid, absent, or per-Topic projection failures in list, workbench, and search while propagating shared repository and canonical owner errors. Verify the healthy, failed, healthy collection and pagination tests.
- [x] 3.2 Return the existing unavailable detail diagnostic with a stable code. Verify the detail test without a migrated application row.
- [x] 3.3 Advance continuation by scanned rows and report `returned` from emitted rows, including a page containing no available Topic. Verify the application topic regression suite.

## 4. Publication boundary and documentation

- [x] 4.1 Reject complete durable bundle publication while pending Topic repairs remain, and keep startup import recovery independent. Verify the process lifecycle and durable bundle tests.
- [x] 4.2 Document the local-failure boundary in `AGENTS.md`, the persistence design, and the two capability specs. Verify `git diff --check` and review the documented failure and recovery path.

## 5. Validation

- [x] 5.1 Run the affected Rust crates and process tests with the locked toolchain. Verified 584 tests passed across canonical store, repository, application, and sidecar, including 14 native process lifecycle tests.
- [x] 5.2 Run Windows `start:direct` against an isolated copy of the development data. Verify first startup and restart both reach `ready`, all 15 Topics are listed, the 7 historical export Topics remain readable, pending state clears, and source database and canonical file hashes remain unchanged.
- [x] 5.3 Run strict OpenSpec validation for this change. Verify `openspec validate isolate-synthesis-topic-migration-failures --strict` succeeds.

## Workflow follow-up

- Review the completed change and archive it after the project's normal review and delivery gates.

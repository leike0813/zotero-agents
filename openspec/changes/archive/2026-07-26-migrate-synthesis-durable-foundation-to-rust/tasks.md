## 1. Contract and TDD baseline

- [x] 1.1 Freeze the R7 durable fixture inventory for Core 203–217 and add failing Node/Rust comparison cases for DTOs, stable errors, sorted tables, canonical bytes/hashes, and receipts.
- [x] 1.2 Add failing repository tests for fresh/open/restart, exact schema/index/PRAGMA state, safe integers, strict rows, transactions, savepoints, rollback, locking, 250 ms timeout, reconciliation, and close.
- [x] 1.3 Add failing canonical tests for CAS, validation, canonical bytes/hash, writer admission, every named fault phase, rollback/forward recovery, and import batch exclusion.
- [x] 1.4 Add failing application, candidate canary, production-boundary, source/build fingerprint, packaging, license, and five-target workflow tests.

## 2. Rust repository

- [x] 2.1 Add exact bundled/backup-only `rusqlite 0.40.1`, create the `synthesis-repository` crate, and update workspace lock/provenance.
- [x] 2.2 Implement strict identity, schema/index initialization, PRAGMAs, safe-integer/value rebuilding, and complete repository DTO/error contracts.
- [x] 2.3 Implement domain CRUD and bounded reads for foundation, Workbench, Topic, Citation Graph, Reference, Tag, Concept, Topic Graph, Checkpoint, Bundle, WebDAV, and maintenance state.
- [x] 2.4 Implement `BEGIN IMMEDIATE`, nested savepoints, rollback, busy error normalization, startup reconciliation, backup, and deterministic close.
- [x] 2.5 Pass repository unit, restart, lock-contention, and Node/Rust full-table parity tests.

## 3. Rust canonical store

- [x] 3.1 Create `synthesis-canonical-store` with strict Topic identity, path derivation, snapshot rebuilding, canonical bytes/hash, and safe-tree validation.
- [x] 3.2 Implement shared global writer admission, create/update CAS, exclusive staging, file/directory fsync, journal phases, backup promotion, and durable receipt.
- [x] 3.3 Implement bounded startup rollback/forward recovery, repair-required fail-closed behavior, and all named fault injection hooks.
- [x] 3.4 Implement import batch writer leases over the same admission authority as ordinary promotion.
- [x] 3.5 Pass canonical byte/hash, unsafe-tree, CAS, concurrency, every fault-point crash/restart, and receipt parity tests.

## 4. Rust application parity

- [x] 4.1 Create `synthesis-application` with strict shared DTO/error helpers and repository, canonical, compute-worker, and remote-effect ports.
- [x] 4.2 Implement Workbench and Topic application use cases with canonical commit-point and operation lifecycle parity.
- [x] 4.3 Implement Citation Graph, Reference Refresh, and Reference Matching/Review use cases using the injected bounded compute port.
- [x] 4.4 Implement Tag Vocabulary, Concept KB, and Topic Graph use cases using existing Rust kernels through the compute port.
- [x] 4.5 Implement Knowledge Checkpoint and Durable Bundle export/import with atomic cross-domain/repository/canonical semantics.
- [x] 4.6 Implement WebDAV over an injected secret-free transport and Debug/Maintenance over bounded safe-owner ports.
- [x] 4.7 Pass the complete Core 203–217 differential fixture matrix without private-call-order or full-message assertions.

## 5. Candidate read canaries

- [x] 5.1 Compose Rust repository/canonical/application owners under independent candidate shadow roots and close them on every shutdown path.
- [x] 5.2 Add authenticated strict `workbench.chrome.read` and `topics.canonical.inspect` dispatch with bounded descriptor-only responses.
- [x] 5.3 Verify valid reads, invalid identity/payload, response bounds, compute-saturation responsiveness, restart persistence, and shutdown close.
- [x] 5.4 Audit that production `SynthesisClient`, plugin routing, and legacy Node composition do not import, advertise, or fall back to the Rust canaries.

## 6. Build, workflow, and documentation

- [x] 6.1 Extend durable cross-language checker/corpus, source/build fingerprints, and candidate smoke from fifteen compute operations to the two read canaries.
- [x] 6.2 Update Cargo lock, exact features, licenses, provenance, and candidate size reporting for bundled SQLite and all three durable crates.
- [x] 6.3 Extend the five-target workflow with repository locking, canonical fault/recovery, application parity, fingerprint, smoke, and 15/75 MiB hard gates.
- [x] 6.4 Update current-state Synthesis documents to record R6 complete, R7 shadow parity, and unchanged R8/R9 boundaries.

## 7. Acceptance

- [x] 7.1 Run pinned Rust fmt, clippy, and workspace tests plus the durable cross-language checker.
- [x] 7.2 Run the Stage-1 44-file suite, typecheck, ESLint, touched-file formatting, and production build.
- [x] 7.3 Run candidate smoke, package/license/fingerprint checks, `git diff --check`, and strict OpenSpec validation.
- [x] 7.4 Record any remote-only five-target evidence, leave the active change ready for verify, and do not archive, publish, dispatch, or cut over.

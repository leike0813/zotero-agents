## 1. Contract and red tests

- [x] 1.1 Add a sanitized minimal legacy TypeScript schema fixture and repository tests for exact detection, divergent rejection, fact mapping, freshness invalidation, backup, idempotency, and injected failure
- [x] 1.2 Add canonical adoption tests covering the four legacy source shapes, pure Topic projection, conflict rejection, and byte preservation
- [x] 1.3 Extend staged Tag tests for representative batching, atomic failure, retry, and operation accounting

## 2. Migration implementation

- [x] 2.1 Implement the exact legacy repository detector and fact-preserving legacy-to-v2 builder
- [x] 2.2 Implement verified backup and atomic SQLite publication without weakening the registered foundation migration path
- [x] 2.3 Extract and reuse pure Topic state/projection construction for canonical legacy adoption
- [x] 2.4 Integrate canonical preflight and migration into the locked Rust production startup while preserving current owner semantics

## 3. Representative acceptance

- [x] 3.1 Extend the production-route harness with configurable identities and a read-only Zotero item resolver
- [x] 3.2 Add the environment-gated representative sample test for migration, Tag bindings, lock conflict, identity mismatch, restart, backup, and source immutability
- [x] 3.3 Add a dedicated package command that runs the representative test only when the sample-root environment variable is supplied

## 4. Documentation and verification

- [x] 4.1 Update active persistence and rebuild documentation, including the actual backup location and recovery boundary
- [x] 4.2 Run OpenSpec validation, focused Rust/Node tests, formatting, clippy, build, parity checks, and the representative sample acceptance

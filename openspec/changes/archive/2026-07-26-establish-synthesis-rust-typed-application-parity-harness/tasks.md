## 1. Contract and regression tests

- [x] 1.1 Extend Core 204, 206, and 218 with typed Rust boundary, parity-corpus, and migration-evidence assertions
- [x] 1.2 Add Rust tests for typed Workbench behavior and typed Topic success, conflict, fault, admission, drain, and reopen behavior

## 2. Typed persistence adapters

- [x] 2.1 Add strict typed cache-basis and complete operation row reads/writes with explicit bounds to the Rust repository
- [x] 2.2 Add strict typed Topic state and Topic projection CRUD to the Rust repository without changing schema
- [x] 2.3 Add typed `read_current`, `promote`, and `receipt` Topic operations over the existing Rust canonical store

## 3. Typed Rust applications

- [x] 3.1 Replace the generic application state machine with `dto`, `ports`, `workbench`, and `topic` modules
- [x] 3.2 Implement Workbench fixed readiness, suppression, deterministic ordering, bounds, and public DTO projection
- [x] 3.3 Implement Topic list/detail and create/full/patch apply through a typed Structured Artifact engine port
- [x] 3.4 Implement Topic canonical commit, post-commit warnings, operation lifecycle, stopped admission, bounded drain, and reopen semantics

## 4. Candidate composition

- [x] 4.1 Compose `ServeState` from the typed Workbench owner and typed canonical owner while preserving both read-canary wire DTOs
- [x] 4.2 Remove generic application inventory/state-machine use and verify no Topic mutation HTTP capability or production route is added

## 5. Dual-execution parity harness

- [x] 5.1 Add the strict independent `synthesis-typed-application-parity-v1` corpus with fixed identities, clocks, assets, faults, and expected stable codes
- [x] 5.2 Add the development-only Rust Cargo example parity driver with independent root and strict stdout report
- [x] 5.3 Add the Node oracle checker that runs existing Node applications and Rust driver, then compares DTOs, all table rows, canonical artifacts, receipts, and reopen state
- [x] 5.4 Remove application-inventory claims from the durable-foundation checker and record separate corpus/source fingerprints

## 6. Governance and documentation

- [x] 6.1 Run the typed checker in the five-target Rust workflow without dispatching a remote run
- [x] 6.2 Correct Synthesis migration documentation to record repository/canonical parity, the Workbench/Topic typed slice, remaining clusters, and blocked R8

## 7. Verification

- [x] 7.1 Run Rust fmt, clippy, workspace tests, and the typed application checker
- [x] 7.2 Run the Stage-1 44-file suite including Core 204/206/218, TypeScript typecheck, ESLint, Prettier, production build, candidate smoke, package-size gates, and `git diff --check`
- [x] 7.3 Run strict OpenSpec validation and confirm all tasks and evidence are complete

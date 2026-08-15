## 1. Lifecycle Test Surface

- [x] 1.1 Add failing tests for reason-bearing stop precedence, typed primary/secondary failures, and idempotent terminal formation
- [x] 1.2 Add a failing process-lifecycle integration test for startup rollback, discovery ready commit, early shutdown receipt, and terminal discovery removal through the library interface

## 2. Deep Runtime Lifecycle

- [x] 2.1 Implement the typed lifecycle signal and terminal failure while preserving existing public error-code rendering
- [x] 2.2 Separate request context from resource ownership and reduce loopback transport to listener, connection, interruption, and handler-drain ownership
- [x] 2.3 Move startup rollback, readiness publication, every post-ready terminal, explicit cleanup phases, and storage-close safety into `runtime_service`

## 3. Library Ownership And Worker Tests

- [x] 3.1 Move the runtime module graph atomically into the library, expose only worker/serve entries plus serve failure, fix self-crate imports, and leave `main.rs` as the CLI adapter
- [x] 3.2 Replace path-recompiled worker-pool integration tests with private internal-seam tests while retaining real worker-executable route evidence

## 4. Governance And Documentation

- [x] 4.1 Replace source-size and incidental-main-text assertions with semantic ownership checks, and expand the durable Rust source fingerprint to the complete sidecar source tree
- [x] 4.2 Update current sidecar supervision documentation for library ownership, readiness SSOT, two-stage shutdown, and terminal-cause precedence

## 5. Verification

- [x] 5.1 Run strict OpenSpec validation plus focused Rust lifecycle, worker, HTTP governance, ownership, and fingerprint checks
- [x] 5.2 Run Rust format, warnings-denied Clippy, the complete Rust workspace test suite, sidecar build, and diff validation

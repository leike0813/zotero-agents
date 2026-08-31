## 1. Contracts and Admission State

- [x] 1.1 Extend production contracts with runtime admission state, generation-bound production admission, smoke, and activation evidence
- [x] 1.2 Extend existing contract/store tests for valid bootstrap, monotonic promotion, invalid transitions, and stable receipt bytes
- [x] 1.3 Implement the atomic runtime admission store and generation-1 bootstrap

## 2. Upgrade Coordination and Recovery

- [x] 2.1 Extend existing owner/cutover tests for matching restart, compatible build upgrade, and incompatible zero-write failure
- [x] 2.2 Extend backup, installer, and supervisor tests for verified generation pinning and pre-activation restoration
- [x] 2.3 Implement compatible-upgrade classification, pending stages, backup-copy preflight, mutation-disabled smoke, promotion, and old-Rust recovery
- [x] 2.4 Implement activation-interruption resume and keep post-promotion reconcile failure on the new generation

## 3. Rust Runtime Admission

- [x] 3.1 Extend existing Rust contract/lifecycle tests for generation validation, durable activation lookup, stale rejection, and crash-resume evidence
- [x] 3.2 Implement generation-bound production admission across runtime contract, service, and lifecycle persistence

## 4. Diagnostics and Documentation

- [x] 4.1 Extend existing lifecycle diagnostic/UI tests for the runtime-admission phase, structured reason precedence, and fingerprint evidence
- [x] 4.2 Implement stable `runtime-admission / runtime_mismatch` projection without message tokenization
- [x] 4.3 Update runtime supervision, runtime/rebuild, and persistence/files documentation to describe current runtime admission and compatible upgrade

## 5. Verification

- [x] 5.1 Run strict OpenSpec validation and focused Core 221, 223, 224, 228, 229, 231 plus runtime packaging tests
- [x] 5.2 Run synthesis contract/capability checks, TypeScript checks, and production build
- [x] 5.3 Run Rust format, clippy, workspace tests, and focused service/lifecycle tests
- [x] 5.4 Exercise upgrade, pre-activation rollback, and promotion-resume against a copied profile and verify receipt/data invariants

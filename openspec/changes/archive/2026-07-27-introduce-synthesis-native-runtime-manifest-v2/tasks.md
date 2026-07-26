## 1. Contract-first tests

- [x] 1.1 Extend Core 193 and the cross-language corpus with strict manifest v2, target, timestamp, signature, capability, and file-inventory cases.
- [x] 1.2 Extend Core 193 installer tests with native snapshots, v1-to-v2 activation, compatible rollback, quarantine, expiry, and signature policy.
- [x] 1.3 Extend Core 194 and lifecycle contract tests with native launch arguments and launch/discovery/health/handshake identity parity.
- [x] 1.4 Add workflow contract assertions for a full-SHA Rust action pin, exact toolchain parity, five targets, read-only push behavior, and native-only inventory.

## 2. Native packaging and workflow

- [x] 2.1 Implement strict runtime bundle and pointer v2 TypeScript rebuilders and language-neutral corpus checks.
- [x] 2.2 Replace Node runtime packaging, freshness, sync, XPI, fingerprint, provenance, and license inventories with native v2 behavior.
- [x] 2.3 Consolidate the five-platform GitHub workflow, repair exact Rust toolchain setup, enforce parity/smoke/15 MiB/75 MiB gates, and remove push publication.

## 3. Installer and supervisor

- [x] 3.1 Implement native packaged verification, expiry/signature policies, executable snapshots, atomic v2 activation, and corrupt-version quarantine.
- [x] 3.2 Upgrade launch/discovery/health/handshake contracts to carry native implementation, fingerprint, target, and signature identity.
- [x] 3.3 Update the supervisor and control client to launch `<binary> serve --config <path>` and validate the complete native identity without fallback.

## 4. Rust service and lifecycle

- [x] 4.1 Add Rust native lifecycle/config/discovery/health/handshake DTO rebuilders and cross-language parity.
- [x] 4.2 Refactor the Rust binary into CLI, lifecycle, HTTP, service composition, and worker-pool ownership modules.
- [x] 4.3 Implement the complete authenticated read/compute surface with bounded queueing, cancellation, replacement, fuse, and O(1) snapshots.
- [x] 4.4 Implement failure-isolated drain, lease/stdin/shutdown triggers, worker pipe EOF orphan prevention, repository/canonical close, and reopen integration.

## 5. Documentation and verification

- [x] 5.1 Update active packaging, supervision, migration, workflow, and milestone documentation to native v2 current state and R9 boundaries.
- [x] 5.2 Run OpenSpec strict validation, Rust fmt/clippy/tests, native Linux smoke, cross-language checkers, Stage-1 suite, typecheck, ESLint, Prettier, production build, package/freshness/XPI source gates, and `git diff --check`.
- [x] 5.3 Record that five-platform remote evidence remains pending; do not dispatch, publish, synchronize, archive, commit, or push.

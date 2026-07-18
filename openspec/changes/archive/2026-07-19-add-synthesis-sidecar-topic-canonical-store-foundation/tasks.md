## 1. Contract-first canonical foundation

- [x] 1.1 Add Core 205 tests for strict DTO rebuilding, canonical parity, complete snapshots, CAS, global backpressure, rollback, restart recovery, validation, persistence, HTTP auth/limits, lifecycle, and packaging boundaries.
- [x] 1.2 Add the environment-neutral Topic canonical store port, snapshot/result types, strict rebuilders, and pure inspect projection to `packages/synthesis-application`.
- [x] 1.3 Move Topic current hashes, path/section filenames, and canonical text to the shared application SSOT and retain plugin compatibility exports.
- [x] 1.4 Extend Core 129/132 coverage for unchanged production Topic current behavior.

## 2. Isolated canonical store and canary

- [x] 2.1 Implement the designated Node filesystem adapter with fixed shadow root, strict identity marker, symlink/traversal protection, complete canonical reads, and stable invalid diagnostics.
- [x] 2.2 Implement staging/fsync, expected-basis CAS, global immediate backpressure, journaled promote/receipt, rollback, restart recovery, and `repair_required` admission behavior.
- [x] 2.3 Add strict `topics.canonical.inspect` request/result handling to authenticated general RPC without worker-pool routing.
- [x] 2.4 Initialize before readiness, stop admission during shutdown, and report the strict canonical store snapshot through health and handshake.
- [x] 2.5 Extend Core 203/204 service integration coverage for restart persistence and repository/canonical owner independence.

## 3. Boundaries and packaging

- [x] 3.1 Extend application/service typecheck and static boundaries so only the designated adapter receives Topic filesystem authority.
- [x] 3.2 Include the adapter and application canonical output in runtime bundle and XPI inventories.
- [x] 3.3 Extend the runtime fingerprint with all canonical store sources and contracts.
- [x] 3.4 Extend Core 168/193 for environment isolation, exact output inventory, fingerprint invalidation, and unchanged production-disconnected imports.

## 4. Governance, documentation, and verification

- [x] 4.1 Update the migration inventory while preserving 108 methods, one direct consumer, eight engine owners, two production worker routes, and `mutationEnabled: false`.
- [x] 4.2 Update active Synthesis runtime, persistence, performance, packaging, supervision, README, and Stage 1 documentation with the shadow-only boundary and deferred Topic application work.
- [x] 4.3 Run contracts/engine/application/repository/service/root TypeScript, service boundary, Synthesis invariants, focused Core tests, Prettier/ESLint, help-doc, production build, `git diff --check`, and strict OpenSpec validation.

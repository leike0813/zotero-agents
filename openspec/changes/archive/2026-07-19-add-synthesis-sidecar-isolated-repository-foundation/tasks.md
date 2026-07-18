## 1. Contract-first repository foundation

- [x] 1.1 Add Core 203 tests for the real Node SQLite adapter, exact foundation schema, transactions, persistence, recovery, isolation, snapshots, and bounded close.
- [x] 1.2 Create the environment-neutral `packages/synthesis-repository` package with strict SQL/DTO contracts and foundation schema identity.
- [x] 1.3 Implement shared cache-basis and operation CRUD plus running-operation restart reconciliation.
- [x] 1.4 Refactor the plugin repository to reuse the shared foundation types, DDL, row rebuilding, and CRUD without changing non-foundation behavior.
- [x] 1.5 Extend Core 146 repository parity tests for the shared foundation contract and unchanged plugin bounds.

## 2. Isolated service repository

- [x] 2.1 Implement the designated `node:sqlite` main-process adapter with strict parameters/rows, WAL configuration, nested savepoints, rollback, permissions, and close.
- [x] 2.2 Implement the persistent per-profile shadow repository owner, strict identity marker, deterministic opaque repository ID, startup reconciliation, and fail-closed initialization.
- [x] 2.3 Extend health and handshake DTOs/rebuilders plus the control client with the strict O(1) repository snapshot.
- [x] 2.4 Initialize the repository before service readiness and close it through all service shutdown triggers within the existing 500 ms budget.
- [x] 2.5 Extend Core 192 and 194 for authenticated snapshot parity, corruption/no-discovery behavior, restart persistence, EOF/lease/supervisor cleanup, and no stale SQLite lock.

## 3. Boundaries and packaging

- [x] 3.1 Add the repository package typecheck and refine static boundaries so only the designated main-process adapter may import `node:sqlite`.
- [x] 3.2 Include repository package/adapter/owner outputs in the service bundle and XPI manifest checks without adding a dependency or third-party license.
- [x] 3.3 Extend the service runtime fingerprint with repository sources, package metadata, pinned runtime inputs, and lockfile.
- [x] 3.4 Extend Core 168 and 193 for environment isolation, exact bundle contents, manifest, fingerprint invalidation, and license coverage.

## 4. Governance and documentation

- [x] 4.1 Update `service-api-migration.yaml` with isolated repository status while preserving 108 methods, one direct consumer, eight production engine owners, two production workers, and `mutationEnabled: false`.
- [x] 4.2 Update Synthesis runtime, persistence, performance, packaging, supervision, README, and Stage 1 progress documentation with the WS5/WS6/WS7 boundary.
- [x] 4.3 Update help-document indexing/checks where required without publishing or synchronizing runtime prebuilds.

## 5. Verification

- [x] 5.1 Run repository/contracts/engine/service/root TypeScript checks and the focused Core 146/168/192-194/203 suites.
- [x] 5.2 Run service boundary, Synthesis invariants, package/fingerprint, targeted Prettier/ESLint, help-doc, and production build checks.
- [x] 5.3 Run `git diff --check` and strict OpenSpec validation, then record all tasks complete only after the implementation matches the artifacts.

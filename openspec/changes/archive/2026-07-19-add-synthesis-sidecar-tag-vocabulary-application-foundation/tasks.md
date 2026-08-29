## 1. Contract-first Tag application

- [x] 1.1 Add Core 210 red coverage for strict DTOs, bounds, vocabulary/staged CAS, promotion effects, index basis, lifecycle, restart, and real SQLite composition.
- [x] 1.2 Add strict private Tag request/result/state/page/effect DTO rebuilders while reusing engine and Host-effect limits.
- [x] 1.3 Add the environment-neutral application with narrow repository/compute/Host ports, one mutation lease, admission stop, and shutdown drain.

## 2. Shared Tag repository and decisions

- [x] 2.1 Consolidate Tag vocabulary, alias, abbreviation, protocol, warning, staged suggestion, and audit row contracts, strict rebuilders, DDL/indexes, and CRUD in the shared repository package.
- [x] 2.2 Add isolated Tag application state, index state, durable effect plan/receipt rows, schema metadata, and compare-and-swap repository operations.
- [x] 2.3 Consolidate deterministic normalization, hashing, entry/staged mutation decisions, warning projection, and Host-effect planning in the shared application package.
- [x] 2.4 Retain plugin repository/service compatibility and remove migrated duplicate facts without changing synchronous production validation, canonical files, imports, autosync, or public results.

## 3. Private application behavior

- [x] 3.1 Implement bounded vocabulary/staged reads, validation, full replace, entry rename/update/delete, regulator export, and per-library audit maintenance.
- [x] 3.2 Implement staged merge/update/discard/clear and atomic promotion with expected vocabulary/staged bases and index stale marking.
- [x] 3.3 Resolve legacy parent bindings before promotion and persist deterministic pending effects in the promotion transaction.
- [x] 3.4 Dispatch strict Host-effect batches after commit, persist reconciled receipts, and preserve committed vocabulary plus pending facts on unavailable or malformed Host results.
- [x] 3.5 Implement worker-backed index rebuild with expected-basis promotion and last-good preservation.

## 4. Node adapter and lifecycle

- [x] 4.1 Extend the isolated Node SQLite adapter with the shared Tag schema, CRUD, CAS, restart recovery, and bounded snapshots.
- [x] 4.2 Extend the internal compute protocol, worker, and pool with strict Tag validation/index operations without adding a public sidecar capability.
- [x] 4.3 Compose the private Tag application after repository recovery and stop/drain it before repository and worker shutdown.
- [x] 4.4 Add real Node SQLite/compiled-worker coverage for success, rollback, superseded basis, worker failure, effect failure, restart, and shutdown.

## 5. Boundaries, packaging, and governance

- [x] 5.1 Extend package TypeScript, service-boundary, environment-neutral import, and public-capability invariants for the new modules.
- [x] 5.2 Include Tag artifacts in service build, runtime bundle, XPI inventory, fingerprint, and isolated migration inventory.
- [x] 5.3 Preserve `mutationEnabled:false`, `108 methods / 1 direct consumer`, eight production engine owners, and production-disconnected composition in invariant tests.

## 6. Documentation and verification

- [x] 6.1 Update current-state Synthesis README, knowledge-graph, runtime/persistence, packaging, service migration inventory, and Stage 1 plan; correct the existing Reference Matching/Review inventory drift.
- [x] 6.2 Run focused Core suites, package/service/root TypeScript, service boundaries, Synthesis invariants, targeted Prettier/ESLint, help-doc checks, production build, runtime/XPI checks, and `git diff --check`.
- [x] 6.3 Run strict OpenSpec validation and implementation verification, resolving every critical or warning mismatch before completion.

## 1. Contract-first Topic Graph application

- [x] 1.1 Add Core 212 red coverage for strict DTOs, bounds, snapshot/restart, manifest CAS, proposal/review/delete behavior, index lifecycle, and real SQLite composition.
- [x] 1.2 Add strict private Topic Graph request/result/state DTO rebuilders while reusing engine limits and canonical row shapes.
- [x] 1.3 Add the environment-neutral application with narrow repository/compute ports, one mutation lease, admission stop, cancellation, and shutdown drain.

## 2. Shared Topic Graph repository and decisions

- [x] 2.1 Consolidate node, edge, and review-item row contracts, strict rebuilders, DDL/indexes, and CRUD in the shared repository package.
- [x] 2.2 Add isolated Topic Graph application state, manifest revision, last-good index state, stale state, schema metadata, and compare-and-swap repository operations.
- [x] 2.3 Consolidate deterministic normalization, stable edge/review identities, canonical direction, cycle checks, proposal/review decisions, and two-stage deletion in the shared application package.
- [x] 2.4 Retain plugin repository/service compatibility and remove migrated duplicate facts without changing checkpoints, canonical diagnostics, projection registry, discovery, Workbench filtering, or public results.

## 3. Private application behavior

- [x] 3.1 Implement bounded inspect/load and full snapshot replacement with strict reference validation and manifest CAS.
- [x] 3.2 Implement node/edge/materialized-topic upsert and proposal ingestion with stable IDs, low-confidence review, unsafe-relation diagnostics, and user-decision preservation.
- [x] 3.3 Implement explicit edge confirm/reject, review approve-suggested/reject, mark-delete, purge, and atomic index stale marking.
- [x] 3.4 Implement worker-backed index rebuild/read with captured-manifest promotion and last-good preservation.

## 4. Node adapter and lifecycle

- [x] 4.1 Extend the isolated Node SQLite adapter with shared Topic Graph schema, CRUD, CAS, restart recovery, and bounded snapshots.
- [x] 4.2 Extend the internal compute protocol, worker, and pool with one strict Topic Graph index operation without adding a public sidecar capability.
- [x] 4.3 Compose the private Topic Graph application after repository recovery and stop/drain it before repository and worker shutdown.
- [x] 4.4 Add real Node SQLite/compiled-worker coverage for success, rollback, superseded basis, worker failure, malformed output, restart, cancellation, and shutdown ordering.

## 5. Boundaries, packaging, and governance

- [x] 5.1 Extend package TypeScript, service-boundary, environment-neutral import, and public-capability invariants for the new modules.
- [x] 5.2 Include Topic Graph artifacts in service build, runtime bundle, XPI inventory, fingerprint, and isolated migration inventory.
- [x] 5.3 Preserve `mutationEnabled:false`, `108 methods / 1 direct consumer`, eight production engine owners, and production-disconnected composition in invariant tests.

## 6. Documentation and verification

- [x] 6.1 Update current-state Synthesis README, knowledge-graph, topics/discovery, runtime/persistence, packaging, service migration inventory, and Stage 1 WS5 plan.
- [x] 6.2 Run focused Core suites, package/service/root TypeScript, service boundaries, Synthesis invariants, targeted Prettier/ESLint, help-doc checks, production build, runtime/XPI checks, and `git diff --check`.
- [x] 6.3 Run strict OpenSpec validation and implementation verification, resolving every critical or warning mismatch before completion.

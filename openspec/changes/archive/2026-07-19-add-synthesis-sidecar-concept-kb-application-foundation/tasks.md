## 1. Contract-first Concept application

- [x] 1.1 Add Core 211 red coverage for strict DTOs, bounds, snapshot/restart, manifest CAS, proposal/review/delete behavior, index/query, lifecycle, and real SQLite composition.
- [x] 1.2 Add strict private Concept request/result/state/page DTO rebuilders while reusing Concept engine limits and canonical row shapes.
- [x] 1.3 Add the environment-neutral application with narrow repository/compute ports, one mutation lease, admission stop, cancellation, and shutdown drain.

## 2. Shared Concept repository and decisions

- [x] 2.1 Consolidate concept, sense, alias, relation, review-item, and topic-link row contracts, strict rebuilders, DDL/indexes, and CRUD in the shared repository package.
- [x] 2.2 Add isolated Concept application state, manifest revision, last-good index state, stale state, schema metadata, and compare-and-swap repository operations.
- [x] 2.3 Consolidate deterministic normalization, stable identities, manifest/index hashing, proposal matching/merge/review, review transitions, display updates, and delete-cascade decisions in the shared application package.
- [x] 2.4 Retain plugin repository/service compatibility and remove migrated duplicate facts without changing canonical files, projection registry, diagnostics, imports, autosync, or public results.

## 3. Private application behavior

- [x] 3.1 Implement bounded inspect/load and full snapshot replacement with strict reference validation and manifest CAS.
- [x] 3.2 Implement proposal creation, exact unambiguous merge, and ambiguous/low-confidence review creation with stable IDs.
- [x] 3.3 Implement review approve/merge/reject, display-text update, concept deletion cascade, and atomic index stale marking.
- [x] 3.4 Implement worker-backed index rebuild with captured-manifest promotion and last-good preservation.
- [x] 3.5 Implement bounded worker-backed candidate query with engine parity and no repository writes.

## 4. Node adapter and lifecycle

- [x] 4.1 Extend the isolated Node SQLite adapter with shared Concept schema, CRUD, CAS, restart recovery, and bounded snapshots.
- [x] 4.2 Extend the internal compute protocol, worker, and pool with strict Concept index/query operations without adding a public sidecar capability.
- [x] 4.3 Compose the private Concept application after repository recovery and stop/drain it before repository and worker shutdown.
- [x] 4.4 Add real Node SQLite/compiled-worker coverage for success, rollback, superseded basis, worker failure, malformed output, restart, cancellation, and shutdown ordering.

## 5. Boundaries, packaging, and governance

- [x] 5.1 Extend package TypeScript, service-boundary, environment-neutral import, and public-capability invariants for the new modules.
- [x] 5.2 Include Concept artifacts in service build, runtime bundle, XPI inventory, fingerprint, and isolated migration inventory.
- [x] 5.3 Preserve `mutationEnabled:false`, `108 methods / 1 direct consumer`, eight production engine owners, and production-disconnected composition in invariant tests.

## 6. Documentation and verification

- [x] 6.1 Update current-state Synthesis README, knowledge-graph, runtime/persistence, packaging, service migration inventory, and Stage 1 WS5 plan.
- [x] 6.2 Run focused Core suites, package/service/root TypeScript, service boundaries, Synthesis invariants, targeted Prettier/ESLint, help-doc checks, production build, runtime/XPI checks, and `git diff --check`.
- [x] 6.3 Run strict OpenSpec validation and implementation verification, resolving every critical or warning mismatch before completion.

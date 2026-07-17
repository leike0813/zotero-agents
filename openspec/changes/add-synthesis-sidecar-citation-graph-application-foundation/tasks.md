## 1. Contract-first Citation Graph application

- [x] 1.1 Add Core 207 coverage for strict rebuilders, bounds, full create/update CAS, unchanged/force, worker failures, last-good preservation, stable reads, mutation lifecycle, shutdown, restart, and real SQLite/worker composition.
- [x] 1.2 Add strict Citation Graph application request/result/state DTOs, bounds, canonical input hashing, and rebuilders.
- [x] 1.3 Add the environment-neutral Citation Graph application and narrow repository/compute ports with global mutation admission and shutdown semantics.

## 2. Shared repository and production parity

- [x] 2.1 Consolidate Citation Graph row types, DDL, strict rebuilding, CRUD, and canonical graph hashing into shared repository/application sources of truth.
- [x] 2.2 Convert plugin Citation Graph repository adapters to compatibility re-exports and preserve production imports and observable results.
- [x] 2.3 Extend Core 129/143/146/185/186 parity coverage for production graph hashes, row projection, layout/metrics output, and bounded reads.

## 3. Persistent shadow projection

- [x] 3.1 Increment the isolated repository schema and add Citation Graph application state plus node, edge, ownership, incoming, light/complex metrics, and layout tables.
- [x] 3.2 Implement transactional expected-basis full replacement, last-good rollback, and basis-bound metrics/layout promotion.
- [x] 3.3 Implement stable bounded inspect, slice, metrics, and layout repository reads with restart persistence.

## 4. Worker-backed application composition

- [x] 4.1 Adapt the existing compute worker pool for private build, layout, and metrics jobs while retaining the single worker, two-item queue, five-second deadline, fuse, and admission bounds.
- [x] 4.2 Implement full rebuild flow, post-commit complex metrics warning semantics, explicit metrics refresh, and explicit layout recomputation.
- [x] 4.3 Compose the application after repository recovery, stop and drain graph mutation work before repository closure, and keep health/handshake/RPC routing unchanged.
- [x] 4.4 Add real Node SQLite and compiled compute-worker integration plus worker busy/timeout/crash/invalid-result, superseded-basis, and lifecycle coverage.

## 5. Boundaries, packaging, and governance

- [x] 5.1 Extend contracts/application/repository/service TypeScript and static dependency boundaries for the new environment-neutral modules and designated Node adapters.
- [x] 5.2 Include Citation Graph application artifacts in service build, runtime bundle, XPI inventory, fingerprint, and migration inventory.
- [x] 5.3 Preserve `mutationEnabled:false`, 108 methods, one direct consumer, eight engine owners, two production worker routes, and production-disconnected composition in invariant tests.

## 6. Documentation and verification

- [x] 6.1 Update README and current-state Synthesis runtime, persistence, performance, packaging, and Stage 1 documentation for the private Citation Graph application and deferred production cutover.
- [x] 6.2 Run focused Core suites, contracts/engine/application/repository/service/root TypeScript, service boundary, Synthesis invariants, targeted Prettier/ESLint, help-doc, production build, and `git diff --check`.
- [x] 6.3 Run strict OpenSpec validation and implementation verification, resolving every critical mismatch before completion.

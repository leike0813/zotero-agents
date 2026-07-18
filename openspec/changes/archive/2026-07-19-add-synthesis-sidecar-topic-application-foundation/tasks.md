## 1. Contract-first Topic application

- [x] 1.1 Add Core 206 coverage for strict list/detail/apply DTOs, materialized asset bounds, complete/patch apply, CAS conflicts, warnings, operations, restart persistence, and dependency boundaries.
- [x] 1.2 Add strict Topic application request/result/record contracts and rebuilders.
- [x] 1.3 Add the environment-neutral Topic application, asset resolver, list/detail projections, and application ports.
- [x] 1.4 Move reusable Topic bundle validation and optimistic apply decisions from plugin composition to the application SSOT while retaining compatibility exports and Core 129/132 production parity.

## 2. Persistent shadow application composition

- [x] 2.1 Extend the canonical store port and Node adapter with strict internal complete-current reads without changing inspect output.
- [x] 2.2 Add environment-neutral Topic application state records/schema/CRUD and make the plugin repository reuse those facts.
- [x] 2.3 Extend the Node SQLite shadow repository with Topic registry, graph, concept, interest, discovery, and operation-backed application state.
- [x] 2.4 Compose Topic application after repository/canonical recovery, stop admission during shutdown, and keep it private from authenticated RPC routing.
- [x] 2.5 Implement create/full/patch optimistic apply, canonical commit-point semantics, idempotent post-commit projections, and stable warnings.
- [x] 2.6 Add real Node restart, conflict, repair-required, and post-commit failure integration coverage.

## 3. Production compatibility and boundaries

- [x] 3.1 Keep production Topic list/detail/apply composition disconnected from the strict shadow application and reuse only compatible validation/decision exports.
- [x] 3.2 Extend application/repository/service typecheck and static boundaries so shared packages remain environment-neutral and only designated adapters receive Node authority.
- [x] 3.3 Include Topic application outputs and adapters in service build, runtime bundle, fingerprint, and XPI inventories.
- [x] 3.4 Extend Core 168/193/203/204/205 for packaging, lifecycle, inventory, and production-disconnected invariants.

## 4. Governance, documentation, and verification

- [x] 4.1 Update migration inventory while preserving 108 methods, one direct consumer, eight engine owners, two production worker routes, and `mutationEnabled: false`.
- [x] 4.2 Update active Synthesis runtime, persistence, performance, packaging, README, and Stage 1 documentation; keep Topic mirror retired and production cutover deferred.
- [x] 4.3 Run contracts/engine/application/repository/service/root TypeScript, service boundary, Synthesis invariants, focused Core tests, Prettier/ESLint, help-doc, production build, `git diff --check`, and strict OpenSpec validation.

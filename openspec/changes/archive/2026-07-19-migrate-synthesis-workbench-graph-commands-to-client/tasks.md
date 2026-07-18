## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all five Citation Graph call sites to use `client.graph`, forbid the four migrated direct service methods, and retain 125 public service methods and four direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for the four Graph methods, opaque JSON normalization, algorithm and force validation, missing ports, preserved client errors, and ordinary legacy error normalization.
- [x] 1.3 Lock callback-free cache commands, manual force, automatic non-force, layout-ready and hash guards, confirmation, command single-flight, `deferStart`, 500 ms polling, surface invalidation, and stale, missing, and failed action behavior.

## 2. Graph Client Capability

- [x] 2.1 Add the environment-neutral `SynthesisGraphClient`, layout request types, supported algorithm union, and opaque JSON-safe command results without progress, streaming, or Workbench DTO contracts.
- [x] 2.2 Add four narrow in-process legacy ports with request validation, shared JSON normalization, and stable `invalid_request`, `unavailable`, and `internal` error behavior.
- [x] 2.3 Compose the four Graph ports from the existing legacy service methods without changing the public service surface or migration inventory.

## 3. Workbench Migration

- [x] 3.1 Route manual and automatic Citation Graph layout recomputation through the lazily resolved client, using forced manual requests and non-forced automatic requests while preserving readiness and hash guards.
- [x] 3.2 Route full rebuild, incremental refresh, and retry through no-argument Graph client methods without progress callbacks while preserving confirmation, single-flight, deferred start, polling, error handling, invalidation, and cache action semantics.
- [x] 3.3 Keep Graph queries, metrics refresh, other Workbench command domains, progress helpers, Host Bridge, MCP, algorithms, repositories, persistence, and public service methods unchanged.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for client-routed Graph commands and polling-owned callback-free progress.
- [x] 4.2 Run contract and root TypeScript checks; focused core tests 125, 129, 143, 144, 152, 168, 175, and 176; the read-only UI harness; service-boundary and Synthesis invariant checks; targeted Prettier and ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, remove only unrelated generated help-doc artifacts, and confirm all implementation tasks complete without altering the existing `reference/Skill-Runner` state.

## 1. Contract-first Reference Refresh application

- [x] 1.1 Add Core 208 coverage for strict DTOs, bounds, changed-only read plans, exact materialization, full/source CAS, last-good preservation, stable reads, lifecycle, restart, and real SQLite composition.
- [x] 1.2 Add strict Reference Refresh application request, result, state, page, preparation, and payload DTO rebuilders with canonical input hashing and admission bounds.
- [x] 1.3 Add the environment-neutral two-stage application and narrow repository port with single-preparation admission, discard, stop, and shutdown semantics.

## 2. Shared reference projection facts

- [x] 2.1 Consolidate artifact, raw reference, canonical, redirect, binding, review, and application-state row contracts plus DDL and strict rebuilding into shared repository sources of truth.
- [x] 2.2 Consolidate invalid-reference filtering, role normalization, lightweight canonical assignment, deterministic binding, row projection, and reference hash helpers into shared application sources of truth.
- [x] 2.3 Retain plugin compatibility imports/delegation and extend Core 121/143/146/151 parity coverage for production hashes, row projections, role normalization, binding, and bounded reads.

## 3. Persistent shadow projection

- [x] 3.1 Increment the isolated repository schema and install Reference Refresh state, artifact, source, reference, canonical, redirect, binding, review, and operation tables from shared DDL.
- [x] 3.2 Implement transactional full and source-scoped expected-basis replacement, protected-decision preservation, bounded downstream invalidation, and post-commit operation warning behavior.
- [x] 3.3 Implement stable bounded inspection, source/reference pagination, preparation operations, and restart persistence.

## 4. Private application composition

- [x] 4.1 Implement descriptor comparison, changed-only read planning, exact payload materialization, projection outside transactions, and full/source promotion.
- [x] 4.2 Implement preparation busy/discard/single-use behavior, payload-stale failures, stopping admission, and shutdown draining while reads remain responsive.
- [x] 4.3 Compose the application after repository recovery and before shutdown closure without adding Host, HTTP/RPC, `SynthesisClient`, graph, or related-effect routing.
- [x] 4.4 Add real Node SQLite integration for create/update/unchanged/force/basis mismatch, rollback, scoped retention, restart, corruption, and lifecycle behavior.

## 5. Boundaries, packaging, and governance

- [x] 5.1 Extend contracts/application/repository/service TypeScript and static dependency boundaries for the environment-neutral modules and designated Node adapter.
- [x] 5.2 Include Reference Refresh application artifacts in service build, runtime bundle, XPI inventory, fingerprint, and migration inventory.
- [x] 5.3 Preserve `mutationEnabled:false`, 108 methods, one direct consumer, eight engine owners, two production worker routes, and production-disconnected composition in invariant tests.

## 6. Documentation and verification

- [x] 6.1 Update README and current-state runtime, persistence, performance, packaging, and Stage 1 documentation for the private Reference Refresh application and deferred Host routing/matching/cutover.
- [x] 6.2 Run focused Core suites, package/service/root TypeScript, service boundaries, Synthesis invariants, targeted Prettier/ESLint, help-doc, production build, and `git diff --check`.
- [x] 6.3 Run strict OpenSpec validation and implementation verification, resolving every critical mismatch before completion.

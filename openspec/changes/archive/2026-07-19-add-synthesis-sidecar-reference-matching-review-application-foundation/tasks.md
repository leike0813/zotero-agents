## 1. Contract-first matching and review application

- [x] 1.1 Add Core 209 coverage for strict DTOs, bounded proposal reads, two-stage matching, basis rejection, review actions, lifecycle, restart, and real SQLite composition.
- [x] 1.2 Add strict matching/review request, result, state, page, preparation, decision, and lifecycle DTO rebuilders using existing matcher bounds.
- [x] 1.3 Add the environment-neutral application and narrow repository/matcher ports with single-preparation admission, discard, stop, and shutdown semantics.

## 2. Shared proposal and review facts

- [x] 2.1 Consolidate proposal row/status/kind contracts, DDL/indexes, strict rebuilding, CRUD, paging, and rejected-basis lookup into the shared repository package.
- [x] 2.2 Consolidate stable proposal/fact identifiers, basis/source hashing, matching projection, review transitions, accepted-fact commands/revocation decisions, manual audit proposals, and graph-delta projection into the shared application package.
- [x] 2.3 Retain plugin repository/service compatibility behavior and extend Core 129/143/146/151 parity coverage without duplicating matching policy.

## 3. Persistent isolated matching projection

- [x] 3.1 Add an independently versioned isolated matching/review schema for state, preparation receipts, and proposals while reusing Reference Refresh binding/redirect facts and shared DDL.
- [x] 3.2 Implement transactional expected-reference promotion, rejected-decision preservation, accepted-fact updates, downstream stale marking, and last-good preservation.
- [x] 3.3 Implement stable bounded inspect/proposal reads and restart persistence.

## 4. Private application composition

- [x] 4.1 Implement Host/reference basis capture, both strict matcher passes outside SQLite, single-use apply, and bounded matching results.
- [x] 4.2 Implement accept/reverse-accept/reject/reopen/delete/manual-target decisions, per-decision atomicity, batch partial success, and bounded aggregate deltas.
- [x] 4.3 Compose the application after repository recovery and before repository shutdown without adding Host, HTTP/RPC, `SynthesisClient`, graph, layout, or related-effect routing.
- [x] 4.4 Add real Node SQLite integration for success, malformed/oversized input, engine failure, basis supersession, busy/discard, restart, and shutdown.

## 5. Boundaries, packaging, and governance

- [x] 5.1 Extend contracts/application/repository/service TypeScript and static dependency boundaries for the environment-neutral modules and designated Node adapter.
- [x] 5.2 Include matching/review artifacts in service build, runtime bundle, XPI inventory, fingerprint, and migration inventory.
- [x] 5.3 Preserve `mutationEnabled:false`, the public method inventory, production owners/routes, refresh/matcher separation, and production-disconnected composition in invariant tests.

## 6. Documentation and verification

- [x] 6.1 Update current-state reference-resolution, runtime, persistence, packaging, README, and Stage 1 documentation, including the `retargeted` proposal state and deferred Host/WS6/WS7 work.
- [x] 6.2 Run focused Core suites, package/service/root TypeScript, service boundaries, Synthesis invariants, targeted Prettier/ESLint, help-doc, production build, and `git diff --check`.
- [x] 6.3 Run strict OpenSpec validation and implementation verification, resolving every critical or warning mismatch before completion.

## 1. OpenSpec and Docs

- [x] 1.1 Add change artifacts and delta specs for production cluster dedupe.
- [x] 1.2 Update active docs and prior active change text that still describes cluster dedupe as debug-only instead of production policy.

## 2. Production Wiring

- [x] 2.1 Build production cluster dedupe inputs with effective canonical aggregation, title candidates, sticky representatives, and accepted-binding exclusion.
- [x] 2.2 Replace external dedupe persistence with cluster action redirect/proposal handling.
- [x] 2.3 Report cluster counters in Advanced Reference Matching progress and diagnostics.

## 3. Old Algorithm Cleanup

- [x] 3.1 Remove old pairwise `dedupeCanonicalReferences()` and its dedicated candidate/result types.
- [x] 3.2 Rewrite old pairwise tests and guards to assert cluster-only production behavior.

## 4. Validation

- [x] 4.1 Run OpenSpec validation.
- [x] 4.2 Run targeted matcher/service/harness/invariant tests.
- [x] 4.3 Run TypeScript and build.

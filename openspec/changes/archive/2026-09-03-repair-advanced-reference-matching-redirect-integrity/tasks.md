## 1. Preserve Durable Reference Facts

- [x] 1.1 Add a repository behavior test for projection replacement preserving redirect endpoints and persisted revision-review Canonical References, then update the canonical deletion predicate until the targeted test passes.

## 2. Repair Existing Redirect Graphs

- [x] 2.1 Add a v2 repository migration test covering unresolvable-component removal, valid-alias retention, proposal supersession, stale derived state, repair receipt, backup reuse, and reopen idempotence.
- [x] 2.2 Advance the private redirect-graph schema marker to v3 and extend the existing transactional repair path until the migration test and existing cycle migration tests pass.

## 3. Report the Durable Trace Outcome

- [x] 3.1 Add a Dashboard behavior test for a successful pending root followed by a failed maintenance terminal, then make the trace row reuse the whole-trace outcome projection until the targeted UI test passes.

## 4. Verification

- [x] 4.1 Run targeted Synthesis repository tests, the Dashboard UI test, related Rust compile checks, TypeScript type checking, and strict OpenSpec validation; record any environment-only failures without weakening the specified behavior.

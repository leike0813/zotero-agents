## Context

R7 has durable Rust repository parity and typed Workbench/Topic parity. The complete 51-table schema already contains Citation Graph and Reference Refresh/Matching rows, but the Rust application crate exposes only Workbench and Topic. Node is the frozen behavioral oracle for the remaining private application families.

The migration must preserve isolated ownership: Node and Rust receive separate shadow roots and only an immutable fixture is shared. No public capability, `SynthesisClient` route, canonical store, Host effect, runtime manifest, or production persistence route is in scope.

## Goals / Non-Goals

**Goals:**

- Add typed, environment-neutral Rust application modules for Citation Graph, Reference Refresh, and Matching/Review.
- Keep SQL access, CAS, and transactions in typed repository methods; keep policy, projection and lifecycle admission in application modules.
- Compare deterministic public observations and complete durable snapshots against Node with a development-only differential harness.
- Preserve the 51-table schema, indexes, schema identities, and established Rust repository durability behavior.

**Non-Goals:**

- Production cutover, HTTP/RPC registration, automatic downstream execution, Host effects, canonical writes, or Node fallback.
- Schema migrations, generic application-state storage, string-based application dispatch, or an in-process replacement for existing Rust kernels.

## Decisions

### Domain modules follow the existing Topic shape

`synthesis-application` will expose `citation_graph`, `reference_refresh`, and `reference_matching` modules through its façade. Each accepts strict typed ports and keeps its own admission/lifecycle state. This preserves high cohesion and avoids an umbrella state machine. A generic command dispatcher was rejected because it would hide distinct basis, lifecycle, and promotion rules behind strings.

### Repository methods model existing table families directly

`synthesis-repository` will add records and methods for Citation Graph rows, Reference Refresh rows, Matching preparations/proposals/state, and atomic basis-guarded replacement. Parsing and policy decisions occur before the transaction; the repository accepts already typed records and performs no application projection. A JSON blob or synthetic application cache record was rejected because it would not provide 51-table parity or inspectable CAS semantics.

### Rust kernels are injected ports

Citation build, metrics, layout, and matcher computation are injected through strict ports with disabled defaults. The application never calls a Node or production fallback. This retains existing worker/pool ownership and lets the parity driver inject fixed deterministic results.

### One independent Citation/Reference corpus is the migration evidence

`synthesis-citation-reference-application-parity-v1` fixes times, operation/preparation IDs, kernel results, fault phases, and stable codes. The checker runs Node and Rust with separate mutable roots, then compares DTOs, stable normalized rows from all 51 tables, operation/cache rows, reopen observations, and the untouched canonical/journal/receipt state. Normalization is table-specific and removes only implementation-derived hashes, identifiers, or kernel detail that is already checked through public DTO and referential invariants. One corpus captures cross-family fact sharing while forbidding automatic downstream work. Separate corpora were rejected because they would miss the refresh → review → graph dependency.

## Risks / Trade-offs

- [Node policy is broader than the first Rust slice] → Freeze scenarios in the corpus and expand only from observable Core 207–209 behavior.
- [Reference transactions touch many table families] → Use one expected-basis transaction and retain last-good state on every pre-commit error.
- [Async admission can race shutdown] → Keep one explicit admission gate per module, discard prepared work on stop, and drain before repository closure.
- [Parity fixtures become a production dependency] → Keep corpus and driver as dev-only inputs and audit workflow/package inventories.

## Migration Plan

1. Add OpenSpec deltas and tests for stable observable behavior.
2. Add repository records/CAS operations and application modules with injected ports.
3. Add corpus, Rust driver, and Node checker using isolated roots.
4. Gate the five-target candidate workflow before smoke, run local quality gates, and update the R7 inventory.
5. If the candidate does not match, retain Node only as the test oracle; no deployment change or data rollback is required because mutable roots are isolated.

## Open Questions

None. The frozen Node contracts, complete schema, and prior typed parity harness establish the required compatibility boundary.

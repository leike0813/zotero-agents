## Why

The isolated Synthesis sidecar can refresh and persist reference projections, but Advanced Reference Matching and proposal review still live as plugin-local orchestration and repository logic. Moving their policy and persistence boundary into shared application and repository packages completes the remaining WS5 reference-sidecar slice while keeping production ownership and downstream effects unchanged.

## What Changes

- Add strict private Reference Matching and Review application contracts for bounded proposal reads, two-stage matching preparation/application, preparation discard, review decisions, admission stop, and shutdown.
- Consolidate match-proposal rows, DDL, CRUD, status transitions, derived binding/redirect commands, basis hashing, and graph-delta projection into shared repository/application sources of truth; designated persistence adapters execute those commands while retaining production-compatible plugin behavior.
- Extend the isolated sidecar repository with durable matching state, proposal persistence, preparation operation receipts, and compare-and-swap promotion against the active reference basis.
- Run the existing environment-neutral binding and canonical-dedupe engine passes outside SQLite; automatically persist only deterministic/high bindings and safe deterministic redirects, while preserving weaker or risky output as review proposals.
- Support the current proposal lifecycle and actions, including accepted-fact revocation, rejected-basis suppression, reverse accept, logical delete, reopen, and manual retargeting.
- Mark Citation Graph and related-items projections stale when accepted facts change without executing graph refresh, layout, Host effects, or related-items synchronization in the private application.
- Compose the application privately after repository recovery and keep HTTP/RPC, `SynthesisClient`, automatic invocation, production persistence, Host routing, and production single-writer ownership unchanged.
- Extend focused integration, parity, lifecycle, packaging, invariant, and current-state documentation coverage.

## Capabilities

### New Capabilities

- `synthesis-sidecar-reference-matching-review-application-foundation`: Defines the private two-stage Advanced Reference Matching application, durable proposal review lifecycle, compare-and-swap promotion, and production-disconnected composition.

### Modified Capabilities

None. Existing capability requirements remain unchanged; their implementations and current-state documentation gain private foundation coverage only.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the isolated Node repository and service composition, production compatibility adapters, build and bundle inventories, static boundaries, focused Core tests, and Synthesis runtime/reference-resolution documentation. It adds no dependency, public protocol method, UI, preference, matcher-policy change, production database migration, Host route, graph execution, related-items effect, or production cutover.

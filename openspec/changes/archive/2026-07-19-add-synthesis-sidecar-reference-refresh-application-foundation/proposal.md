## Why

The Synthesis sidecar now has an isolated repository and private Topic and Citation Graph applications, but reference artifacts still lack an application boundary that can plan Host reads, validate their materialization, and transactionally promote a durable shadow projection. Establishing that boundary now makes reference refresh observable and CAS-safe without moving production ownership or exposing another RPC capability.

## What Changes

- Add strict private Reference Refresh application contracts for inspection, bounded source/reference reads, two-stage prepare/apply refresh, preparation discard, admission stop, and shutdown.
- Consolidate reference artifact, canonical, redirect, binding, projection, schema, CRUD, and canonical hash facts into shared repository/application sources of truth while retaining production-compatible plugin imports and results.
- Extend the isolated sidecar repository with versioned Reference Refresh application state, durable reference projections, operation records, and transactional full/sources-scope promotion.
- Make `prepareRefresh` derive the exact changed-artifact read plan and make `applyRefresh` reject missing, extra, duplicate, stale, or mismatched payloads before any projection write.
- Preserve manual bindings, redirects, rejected proposals, and user decisions; emit canonical-revision review rows for protected stale canonicals without introducing generic review actions.
- Compose the application privately after repository recovery and keep HTTP/RPC, `SynthesisClient`, automatic invocation, production persistence, graph execution, and Host routing unchanged.
- Extend integration, parity, lifecycle, packaging, persistence, performance, invariant, and documentation coverage for the private foundation.

## Capabilities

### New Capabilities

- `synthesis-sidecar-reference-refresh-application-foundation`: Defines the private two-stage Reference Refresh application, durable shadow projection, bounded reads, preparation lifecycle, compare-and-swap promotion rules, and production-disconnected composition.

### Modified Capabilities

None. Existing capability requirements remain unchanged; their implementations and current-state documentation gain private foundation coverage only.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the isolated Node repository and service composition, build and bundle inventories, static boundary and migration checks, focused Core tests, and Synthesis runtime/persistence/performance documentation. It adds no dependency, public protocol method, UI, preference, production database migration, graph execution, or production routing change.

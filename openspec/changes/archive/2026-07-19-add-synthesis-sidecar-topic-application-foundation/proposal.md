## Why

The sidecar now owns an identity-bound Topic canonical shadow with strict CAS and recovery, but no environment-neutral application use case can assemble, read, or apply Topic results through it. WS5 needs that application boundary before repository parity or production routing can move without copying the plugin monolith into Node.

## What Changes

- Add a strict environment-neutral Topic application for bounded list, detail, and `create|update_full|update_patch` apply over materialized assets.
- Extend the canonical store port with an internal complete-current read while retaining descriptor-only authenticated inspect.
- Add a narrow Topic application state repository port and persistent Node shadow adapter for registry state, derived Topic Graph/Concept/discovery projections, and apply operation lifecycle.
- Move environment-neutral bundle validation and optimistic apply decisions to the shared application for plugin compatibility, while leaving production Topic persistence composition unchanged.
- Compose and exercise the application against the isolated Node repository/canonical roots without adding a network apply capability or changing production `SynthesisClient` routing.
- Extend static boundaries, packaging, fingerprints, inventory, documentation, and focused Core tests.

## Capabilities

### New Capabilities

- `synthesis-sidecar-topic-application-foundation`: Defines strict Topic list/detail/apply application behavior, materialized asset bounds, optimistic apply semantics, post-commit projections, and isolated Node composition.

### Modified Capabilities

- `synthesis-application-foundation`: Owns the environment-neutral Topic application and ports instead of plugin composition.
- `synthesis-sidecar-topic-canonical-store-foundation`: Adds internal complete-current reads without widening the inspect wire result.
- `synthesis-sidecar-isolated-repository-foundation`: Adds the narrow persistent Topic application state required by the isolated use case.
- `synthesis-sidecar-runtime-foundation`: Initializes the Topic application after its two shadow owners recover and closes it during shutdown.
- `synthesis-sidecar-runtime-packaging`: Includes and fingerprints Topic application and adapter artifacts.
- `synthesis-sidecar-service-boundary`: Keeps Node/filesystem/SQLite authority in designated main-process adapters.
- `synthesis-invariant-guardrails`: Preserves public method, consumer, engine-owner, worker-route, and mutation invariants.
- `synthesis-layer-doc-system`: Records the isolated application boundary and deferred production routing/cutover.

## Impact

This affects the application, contracts, repository, plugin Topic validation compatibility path, sidecar composition, runtime packaging/fingerprints, migration inventory, documentation, and focused Core tests. It does not change production Topic list/detail/apply persistence, add dependencies, touch production roots, expose a remote apply capability, restore Zotero Topic mirror behavior, change public `SynthesisClient` routing, generate runtime prebuilds, or perform WS7 single-writer cutover.

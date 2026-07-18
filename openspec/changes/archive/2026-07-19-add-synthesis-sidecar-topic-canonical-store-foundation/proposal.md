## Why

The isolated sidecar repository proves service-owned SQLite persistence, but Topic canonical files remain entirely plugin-owned and their hashing, filename, and canonical-text rules are duplicated inside plugin composition. WS5 needs a narrow shadow canonical store before Topic application routing can move without granting the sidecar production authority.

## What Changes

- Add an environment-neutral Topic canonical store port and pure snapshot/inspect projection to `packages/synthesis-application`.
- Move Topic current hashing, section filename, canonical text, and path identity rules to that shared package while retaining plugin compatibility exports.
- Add a persistent service-main-process shadow store with strict identity, complete staging, fsync, CAS promotion, journaled rollback, restart recovery, and fail-closed repair state.
- Add an authenticated general capability `topics.canonical.inspect` that exposes bounded descriptors rather than canonical payloads.
- Report a constant-time canonical-store snapshot through health and handshake, while retaining `mutationEnabled: false` and all production owners and routes.
- Extend service build, runtime packaging, fingerprint, static boundaries, governance, documentation, and focused Core tests.

## Capabilities

### New Capabilities

- `synthesis-sidecar-topic-canonical-store-foundation`: Defines the isolated Topic shadow canonical store, strict projection, CAS and recovery behavior, authenticated inspect canary, lifecycle snapshot, and packaging boundary.

### Modified Capabilities

- `synthesis-application-foundation`: Owns the environment-neutral Topic canonical port and pure canonical rules.
- `synthesis-sidecar-runtime-foundation`: Reports canonical store readiness and advertises the authenticated inspect canary.
- `synthesis-sidecar-runtime-packaging`: Includes and fingerprints the canonical application and Node adapter artifacts.
- `synthesis-sidecar-service-boundary`: Confines filesystem authority to the designated main-process adapter.
- `synthesis-invariant-guardrails`: Preserves the production method, consumer, engine, worker, and mutation invariants.
- `synthesis-layer-doc-system`: Records the shadow-only ownership boundary and later Topic application work.

## Impact

This affects the application package, plugin Topic persistence compatibility surface, sidecar contracts/server/lifecycle, one new Node filesystem adapter, runtime packaging/fingerprints, migration inventory, documentation, and focused Core tests. It does not change the production database, production canonical root, public `SynthesisClient`, workflow apply routing, UI, preferences, dependencies, or runtime prebuilds.

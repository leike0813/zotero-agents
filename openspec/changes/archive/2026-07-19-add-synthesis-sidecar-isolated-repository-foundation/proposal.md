## Why

The Synthesis sidecar now has supervised compute and transfer workers, but its main process still has no service-owned persistence boundary. Before any production repository route can move out of the plugin, the service needs a deliberately isolated SQLite foundation that proves ownership, lifecycle, restart recovery, packaging, and strict observability without gaining access to the production Synthesis database.

## What Changes

- Add an environment-neutral `packages/synthesis-repository` package as the single source of truth for the repository foundation SQL adapter contract, schema identity, and CRUD for `synt_schema_meta`, `synt_cache_basis`, and `synt_operation`.
- Make the existing plugin repository reuse the shared foundation definitions while retaining its Zotero adapter, legacy migration, remaining table families, canonical-file integration, and production ownership.
- Add a service-main-process `node:sqlite` adapter and an isolated, persistent per-profile shadow repository rooted only beneath the sidecar runtime directory.
- Initialize the shadow repository before discovery is published, reconcile persisted running operations on restart, close it within the existing shutdown budget, and fail closed on identity, schema, or migration corruption.
- Expose a strict O(1) repository snapshot through health and handshake while keeping `mutationEnabled: false`, public capabilities, the 108-method inventory, and production routing unchanged.
- Include the shared package, Node adapter, schema identity, and lockfile inputs in TypeScript, boundary, bundle, manifest, fingerprint, and license verification.
- Document the first WS5 repository slice as isolated infrastructure only; it is not a production database cutover and does not introduce a fallback route.

## Capabilities

### New Capabilities

- `synthesis-sidecar-isolated-repository-foundation`: Defines the service-owned persistent shadow repository, its three-table foundation contract, lifecycle, recovery, isolation, and observability.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Adds the strict repository snapshot to authenticated health and handshake contracts without changing public capability routing.
- `synthesis-sidecar-runtime-supervision`: Requires repository initialization before readiness and bounded closure during every supervised shutdown path.
- `synthesis-sidecar-runtime-packaging`: Requires the shared repository package and Node SQLite entrypoint to participate in bundle, manifest, fingerprint, and boundary checks.
- `synthesis-sidecar-service-boundary`: Allows `node:sqlite` only in the designated main-process adapter while preserving worker, Host, Zotero, canonical, production repository, and subprocess prohibitions.
- `synthesis-persistence-performance`: Adds persistent shadow-state restart reconciliation while preserving production database and canonical-file ownership in the plugin.
- `synthesis-invariant-guardrails`: Keeps the public method/consumer inventory and production mutation ownership unchanged while adding the isolated repository canary.
- `synthesis-layer-doc-system`: Records the WS5 foundation status and the remaining WS6/WS7 parity and cutover work.

## Impact

The change affects Synthesis contracts, the plugin repository foundation paths, a new shared package, sidecar service startup/shutdown and control-client validation, service boundary checks, runtime packaging/fingerprints, Core 146/168/192-194 plus a new Core 203 suite, governance inventory, and Synthesis runtime/persistence/packaging/performance documentation. It adds no dependency, public HTTP capability, UI, preference, database migration of production data, prebuild publication, or production `SynthesisClient` route.

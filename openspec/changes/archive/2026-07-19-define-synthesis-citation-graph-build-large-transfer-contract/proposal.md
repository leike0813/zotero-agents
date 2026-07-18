## Why

The current Citation Graph Build canary sends one monolithic JSON request and result through an 8 MiB / 250k-node RPC boundary. The measured normal and target datasets exceed that boundary by a wide margin, so a bounded, resumable transfer contract is required before production graph build can move into the sidecar worker without unbounded structured clone or repeated full-result reconstruction.

## What Changes

- Add an authenticated, service-owned Citation Graph Build transfer session with bounded canonical-JSON row pages, strict manifests, deterministic hashes, idempotent retries, TTL expiry, cancellation, and bounded concurrent staging.
- Define symmetric input and output paging contracts while keeping output publication internal to the service until a later packed-worker change provides the producer.
- Add an internal transfer client and a shared authenticated sidecar RPC transport; do not expose the transfer path through public `SynthesisClient` or Workbench composition.
- Add O(1) transfer state to health and handshake, stable transfer error codes, shutdown cleanup, runtime packaging coverage, and governance checks.
- Keep production Citation Graph Build in process. The plugin continues to own Host capture, basis recapture, database promotion, canonical files, and last-good state.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-build-large-transfer-contract`: Defines bounded Citation Graph Build input/output manifests, page validation, authenticated staging sessions, lifecycle, and cleanup.

### Modified Capabilities

- `synthesis-sidecar-runtime-foundation`: Advertises and authenticates the transfer capability and reports its O(1) snapshot.
- `synthesis-sidecar-runtime-supervision`: Retires transfer sessions on authenticated shutdown, host lease expiry, stdin EOF, and process stop.
- `synthesis-sidecar-runtime-packaging`: Includes the transfer contracts, service owner, and engine page validators in bundle and fingerprint coverage.
- `synthesis-citation-graph-build-sidecar-canary`: Adds a large-transfer staging canary without changing the production graph-build route.
- `synthesis-persistence-performance`: Establishes bounded page, session, byte, and expiry limits for large graph transfers.
- `synthesis-invariant-guardrails`: Preserves production ownership, dependency boundaries, mutation state, and service inventory.
- `synthesis-layer-doc-system`: Documents the staging topology and the still-deferred packed-worker and production routing changes.

## Impact

The change affects Synthesis contracts and engine page rebuilders, the Node-only sidecar service, internal plugin-side sidecar clients, Core 168/183/192-194/199 plus a new Core 201 suite, runtime packaging assertions, migration inventory, and Synthesis runtime documentation. It adds no dependency, schema migration, UI, public client route, production ownership change, or prebuilt runtime publication.

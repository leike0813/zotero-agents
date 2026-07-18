## Why

The isolated Synthesis sidecar can now checkpoint three knowledge domains, but it still cannot capture its complete durable corpus as a portable, independently verifiable bundle. A private export foundation is the next WS5 priority-7 slice: it establishes the shared durable contract and stable cross-storage snapshot semantics needed by later import and WebDAV changes without exposing a new public operation.

## What Changes

- Add a strict, versioned, bounded durable-bundle contract covering all 23 current Synthesis entity kinds, canonical v2 manifest/bundle encoding, deterministic chunking and hashing, and legacy v1 read/verify compatibility.
- Derive manifest and entry collection limits mechanically from the existing domain limits while retaining the four-MiB per-bundle ceiling and rejecting unknown fields, unsafe or duplicate identities, unsupported kinds, inconsistent metadata, and oversized indivisible entities.
- Add one private durable export application that captures all SQLite durable facts and Topic canonical current assets, rejects superseded or damaged cross-storage bases, builds deterministic export assets, verifies environment-neutral sources, and writes bundles before the manifest.
- Capture repository rows, Topic registry bases, and normalized aggregate bases in one transaction, then recapture and re-inspect after canonical file reads so mixed snapshots never become valid exports.
- Preserve production `durableSync.ts` public DTOs, functions, layout, progress, import preview/apply, sync-index, conflict, WebDAV, retry, credential, and Host-port behavior while delegating semantically identical contract and codec work to the shared implementation.
- Compose the private export application only after repository recovery and drain it before canonical stores and SQLite close; add no worker, route, client, Workbench, Host Bridge, MCP, import-apply, sync-index, or WebDAV capability.

## Capabilities

### New Capabilities

- `synthesis-sidecar-durable-bundle-export-foundation`: Defines the complete durable entity contract, deterministic v2 export, legacy v1 verification, stable SQLite-plus-canonical capture, sink/source ordering, and private lifecycle boundary.

### Modified Capabilities

None. Existing production durable sync, WebDAV, public API, import/apply, conflict, and sync-index requirements remain unchanged.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the isolated Node composition and service lifecycle, production durable-sync compatibility helpers, Core tests, runtime/XPI and migration inventories, fingerprints, and current-state Synthesis documentation. It adds no dependency, public protocol operation, production database write, canonical asset mutation, remote layout, release prebuild, or user-visible UI.

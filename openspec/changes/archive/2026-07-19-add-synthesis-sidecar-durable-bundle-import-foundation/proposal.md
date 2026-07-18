## Why

The isolated Synthesis sidecar can now export and strictly verify its complete durable corpus, but it cannot safely preview or apply a verified snapshot. The next WS5 priority-7 slice must establish preview-first import with pinned input, three-way conflict detection, atomic repository state changes, recoverable Topic canonical promotion, and durable sync metadata before WebDAV transport can move.

## What Changes

- Add strict import normalization for all 22 live durable entity kinds, exact sync-index contracts, deterministic base/local/remote conflict projection, and single-use preview receipts.
- Extend the private durable bundle application with `previewImport`, `applyImport`, and `discardImport` under the existing single-active admission and shutdown drain boundary.
- Add expected-basis repository import transactions, domain-owned storage for the currently absent Topic interest, discovery hint, and Related Items effect facts, projection invalidation, sync-index persistence, and a durable commit receipt.
- Extend the Topic canonical shadow to losslessly retain bounded current Markdown assets and to stage/promote a recoverable multi-Topic import batch coordinated by the repository commit receipt.
- Keep tombstones readable and reportable but block apply until a later change defines target identity and deletion semantics.
- Preserve production durable-sync public DTOs, functions, valid preview/apply results, progress, sync-index layout, WebDAV behavior, and Host boundaries while delegating semantically identical parsing, normalization, and conflict logic.
- Add no public worker, HTTP/RPC, `SynthesisClient`, Workbench, Host Bridge, MCP, WebDAV transport, credential, production database, or production canonical-root capability.

## Capabilities

### New Capabilities

- `synthesis-sidecar-durable-bundle-import-foundation`: Defines strict durable import normalization, preview receipts, conflict and overwrite policy, repository/index CAS, recoverable multi-Topic canonical promotion, lifecycle, and private capability boundaries.

### Modified Capabilities

None. Production WebDAV, public service APIs, production ownership, and cutover requirements remain unchanged.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the Node Topic canonical adapter and service recovery/lifecycle, production durable-sync compatibility helpers, runtime/XPI and migration inventories, focused Core tests, and current-state Synthesis documentation. It adds repository schema only for isolated durable owners, sync metadata, and import commit coordination; it adds no dependency, public route, release prebuild, production migration, or remote transport.

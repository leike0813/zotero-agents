## Why

The isolated Synthesis sidecar has no Topic Graph repository or application even though its environment-neutral root/unplaced index engine and production aggregate semantics already exist. Moving the transactional Topic Graph aggregate into shared application/repository foundations completes the remaining WS5 priority-6 domain slice before sync/import/export and prevents a second service-local policy and persistence source of truth.

## What Changes

- Add strict private Topic Graph application contracts for snapshot inspection/replacement, node and edge upsert, materialized-topic upsert, relation proposal ingestion, edge and review decisions, mark-delete/purge, index rebuild/read, admission stop, and shutdown.
- Consolidate Topic Graph node, edge, and review-item row contracts, DDL, CRUD, stable identities, canonical edge direction, cycle checks, proposal/review decisions, deletion behavior, and compare-and-swap behavior into shared repository/application sources of truth while retaining production-compatible plugin behavior.
- Extend the isolated Node repository with durable Topic Graph aggregate state, last-good index state, active basis, and stale markers.
- Execute Topic Graph index rebuild through one strict internal sidecar worker operation and promote an index only when its captured manifest remains active.
- Preserve the last-good aggregate and index across invalid input, transaction failure, worker failure, malformed output, cancellation, or superseded basis.
- Compose the private application only after repository recovery and stop/drain it before SQLite and worker shutdown.
- Keep checkpoint import/export, canonical diagnostics, projection registry, discovery cascade, Workbench filtering, public HTTP/RPC, `SynthesisClient`, Host Bridge, MCP, production persistence, and production ownership unchanged.
- Extend focused integration, lifecycle, packaging, invariant, migration-inventory, and current-state documentation coverage.

## Capabilities

### New Capabilities

- `synthesis-sidecar-topic-graph-application-foundation`: Defines the private isolated Topic Graph aggregate, proposal/review/deletion policy, durable manifest and last-good index lifecycle, bounded worker computation, and production-disconnected composition.

### Modified Capabilities

None. Existing production capability requirements and public methods remain unchanged; their implementations and current-state documentation gain shared foundation coverage only.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the isolated Node SQLite repository, internal worker protocol and service lifecycle, production compatibility adapters, package/build inventories, focused Core tests, and Synthesis architecture documentation. It adds no dependency, public protocol method, UI, preference, production database migration, checkpoint/import route, canonical asset delivery, WebDAV behavior, WS6 parity route, or WS7 cutover.

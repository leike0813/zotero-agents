## Why

The isolated Synthesis sidecar has no Concept KB repository or application even though its environment-neutral index/query engine and the production aggregate semantics already exist. Moving the transactional Concept KB aggregate into shared application/repository foundations is the next WS5 priority-6 slice after Tag Vocabulary and prevents a second service-local policy and persistence source of truth.

## What Changes

- Add strict private Concept KB application contracts for snapshot inspection/replacement, proposal ingestion, review transitions, display-text mutation, concept deletion, index rebuild/read, bounded candidate query, admission stop, and shutdown.
- Consolidate Concept, sense, alias, relation, review-item, and topic-concept-link row contracts, DDL, CRUD, stable identities, hashing, mutation decisions, and compare-and-swap behavior into shared repository/application sources of truth while retaining production-compatible plugin behavior.
- Extend the isolated Node repository with durable Concept KB aggregate state, last-good index state, active basis, and stale markers.
- Execute Concept index rebuild and candidate query through two strict internal sidecar worker operations; promote an index only when its captured manifest remains active, and never write repository state during query.
- Preserve the last-good aggregate and index across invalid input, transaction failure, worker failure, malformed output, cancellation, or superseded basis.
- Compose the private application only after repository recovery and stop/drain it before SQLite and worker shutdown.
- Keep checkpoint import/export, canonical asset delivery, WebDAV, generic synchronization, public HTTP/RPC, `SynthesisClient`, Workbench, Host Bridge, MCP, production persistence, and production ownership unchanged.
- Extend focused integration, lifecycle, packaging, invariant, migration-inventory, and current-state documentation coverage.

## Capabilities

### New Capabilities

- `synthesis-sidecar-concept-kb-application-foundation`: Defines the private isolated Concept KB aggregate, proposal/review policy, durable manifest and last-good index lifecycle, bounded worker computation, and production-disconnected composition.

### Modified Capabilities

None. Existing production capability requirements and public methods remain unchanged; their implementations and current-state documentation gain shared foundation coverage only.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the isolated Node SQLite repository, internal worker protocol and service lifecycle, production compatibility adapters, package/build inventories, focused Core tests, and Synthesis architecture documentation. It adds no dependency, public protocol method, UI, preference, production database migration, checkpoint/import route, canonical asset delivery, WebDAV behavior, WS6 parity route, or WS7 cutover.

## Why

Citation Graph persistence knowledge is split between a broad application repository trait, runtime owner escapes, and two overlapping internal operation records. Reads bypass the existing reader pool, while graph promotion, cache readiness, and the graph-specific terminal receipt are committed separately, weakening locality and leaving crash windows between facts that describe one graph outcome.

## What Changes

- Deepen the existing Citation Graph application module so callers use typed, basis-bound read and mutation interfaces rather than repository-shaped records and methods.
- Replace `CitationGraphRepositoryPort` with the concrete local `RepositoryPort`; keep SQLite, locks, reader transactions, and graph records inside the application implementation.
- Move graph window, neighborhood, metrics, and layout projection behind an opaque read handle that validates one graph/query basis and preserves bounded pagination.
- Replace the runtime intent plus application receipt pair with one internal graph operation whose terminal state is committed atomically with graph rows and Citation Graph cache basis.
- Keep `runtime_public_maintenance_operation` as the sole public admission, dispatch, retry/continue, running/terminal, event, and restart-reconciliation owner.
- Give each dispatched graph execution a fresh opaque attempt. Preserve the no-argument retry capability while reusing only the last failed Full/Incremental mode and rebuilding all scope and input from current durable facts and Host state.
- Remove production Citation Graph `RepositoryPort::owner()` escapes, one-line repository delegates, and tests that assert forwarding, locks, operation-record internals, or call order.
- Preserve capability names, wire DTOs, public receipts and statuses, SQLite schema and persisted formats, graph bytes/hashes, worker contracts, and Workbench behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-citation-graph-application-foundation`: Define the typed read handle, opaque rebuild attempt, fresh-state retry, reader-pool behavior, and atomic graph/cache/internal-operation promotion.
- `synthesis-native-citation-graph-surface`: Require runtime Graph reads to use the application projection interface while preserving basis-bound bounded wire behavior.
- `synthesis-reference-graph-maintenance-control`: Clarify that no-argument Citation Graph retry creates a fresh attempt, reuses only the failed command mode, and replans from current facts.
- `synthesis-persistence-performance`: Require Citation Graph reads to use bounded reader transactions and remain available while worker computation is in progress.
- `synthesis-native-production-routing`: Preserve public-maintenance lifecycle ownership while capability handlers return only typed graph outcomes.

## Impact

- Rust crates: `synthesis-application`, `synthesis-repository`, and `synthesis-sidecar`.
- Internal Rust interface: Citation Graph read DTOs/handle, opaque attempt, graph-specific repository transaction, production composition, and focused behavior tests.
- Documentation and project constraints: domain glossary, agent guidance, Citation Graph ownership, persistence, runtime, and sequence documents.
- No new crate, dependency, database table, migration, public route, public DTO, worker protocol, or alternative production adapter.

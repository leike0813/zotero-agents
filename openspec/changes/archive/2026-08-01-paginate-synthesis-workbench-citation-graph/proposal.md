## Why

The Citation Graph Workbench currently returns the complete graph in one sidecar response. Real libraries already exceed the 1 MiB RPC response limit, so a valid graph of roughly 7,500 nodes and 12,000 edges fails before the Workbench can render it, while the client hides the actionable sidecar failure behind `internal_error`.

## What Changes

- Read Citation Graph data through deterministic, repository-backed pages that remain below the existing RPC response limit.
- Apply topic, node type, role, low-signal, and search filters against the complete graph before paging.
- Let the active Graph tab load pages serially in the background, merge them incrementally, pause at a soft window limit, and resume on explicit user action.
- Add basis-bound cursors and generation guards so stale pages and neighborhood slices cannot enter a newer graph window.
- Expand a selected node's incoming, outgoing, or bidirectional one-hop neighborhood without advancing the sequential page cursor.
- Preserve complete topic exports by aggregating all required pages and returning a typed failure when an export safety limit is reached.
- Preserve stable sidecar failure codes and a bounded safe reason through the TypeScript client boundary.
- Verify additive application tables before repository readiness without changing the schema version or persisted Citation Graph format.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-native-citation-graph-surface`: Citation Graph reads become bounded, deterministic, basis-bound windows with full-graph filtering and neighborhood expansion.
- `synthesis-workbench-graph-command-client-consumer`: The Workbench consumes pages incrementally, manages window lifecycle and limits, and aggregates complete exports.
- `synthesis-sidecar-debug-observability`: Sidecar read failures retain stable public codes and safe diagnostic reasons across transport boundaries.
- `synthesis-native-runtime-upgrade`: Repository readiness idempotently verifies and restores additive application tables for existing compatible databases and fails closed on incompatible structures.

## Impact

The change affects the shared Citation Graph DTOs and contract corpus; repository queries and sidecar read/error routing; Workbench host state, iframe rendering, localization, and export behavior; focused TypeScript, UI, and Rust tests; and the Synthesis runtime ownership documentation. It does not add a public operation, raise the global RPC limit, change the Citation Graph storage format, or trigger a sidecar prebuild or release.

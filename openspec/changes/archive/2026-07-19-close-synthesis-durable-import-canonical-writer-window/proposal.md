## Why

The private durable importer persists a canonical import batch before awaiting
the repository commit, but ordinary Topic promotion can still write during that
window. A competing write can therefore leave the repository durably committed
while canonical forward promotion fails with `basis_mismatch`.

## What Changes

- Reserve canonical mutation admission for the staged import batch until that
  batch is committed, discarded, or recovered.
- Allow only the matching batch receipt to perform internal forward promotion;
  ordinary Topic promotion fails closed with `canonical_store_busy`.
- Add a deterministic concurrency regression that proves the repository wait
  window cannot be penetrated and that normal admission resumes after cleanup.
- Preserve the current store format, recovery protocol, public interfaces,
  production ownership, and private-only capability boundary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-durable-bundle-import-foundation`: Requires a staged
  canonical import batch to hold the exclusive canonical writer permit through
  commit, discard, or recovery.

## Impact

The change affects the Node Topic canonical store adapter, focused Core 215
durable-import coverage, and the existing private durable-import specification.
It adds no API, schema, dependency, RPC route, production migration, runtime
asset, or packaging target.

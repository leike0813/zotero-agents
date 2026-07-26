## Why

Host Bridge capability and MCP responses currently perform redundant JSON
serialization, UTF-8 encoding, and whole-response string assembly on Zotero's
main thread. Runtime skill and workspace operations also repeat recursive
scan/stat/copy work and can traverse dependency or VCS directories that are
not business resources.

## What Changes

- Prepare Host Bridge and MCP in-memory responses through one serialization
  boundary that encodes the body once and writes it asynchronously.
- Preserve the existing file-backed R6 transfer branch and its integrity,
  chunking, and scheduling contracts.
- Introduce operation-scoped runtime tree manifests with deterministic
  metadata, shared exclusions, observation budgets, and native file copy.
- Reuse manifests across skill checksum, catalog, result fallback, bundle, and
  copy consumers while keeping workspace fallback fresh per repair round.
- Record oversize tree and response evidence without adding a hard response or
  directory limit.

## Capabilities

### New Capabilities

- `host-http-response-delivery`: Shared, once-serialized Host Bridge and MCP
  response preparation and asynchronous delivery.
- `runtime-tree-manifest`: Deterministic operation-scoped runtime tree scanning,
  observation, and copying.

### Modified Capabilities

- `host-bridge-file-downloads`: File-backed downloads remain isolated from the
  in-memory response branch.
- `plugin-skill-registry`: Registry checksum and materialization reuse a single
  source manifest per operation.

## Impact

- Host Bridge server, embedded MCP server, runtime persistence, skill registry,
  catalog/materialization, result fallback, workflow bundles, and directory
  copy callers.
- Internal DTOs and diagnostics only; no public route, schema, CLI, preference,
  or UI change.

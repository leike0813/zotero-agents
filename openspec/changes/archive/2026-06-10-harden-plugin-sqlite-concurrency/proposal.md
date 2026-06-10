## Why

ACP skill execution and Synthesis runtime writes share `state/zotero-agents.db`.
Transient SQLite write-lock contention currently surfaces as immediate
`NS_ERROR_STORAGE_BUSY` failures during startup-path status writes.

## What Changes

- Add basic concurrency protection for plugin-owned access to the shared runtime
  SQLite database.
- Reuse one guarded mozStorage connection/coordinator per normalized DB path.
- Configure a bounded SQLite busy timeout and retry only classified busy/locked
  failures.
- Preserve existing synchronous store and repository APIs.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-persistence-governance`: plugin-owned runtime SQLite access must use
  a guarded execution path that tolerates transient busy/locked conditions.

## Impact

- Affects the plugin runtime state store and Synthesis repository adapters.
- Adds internal SQLite guard utilities and focused core tests.
- No user-facing API, schema, or dependency changes.

## Why

Topic mirror is no longer composed or exposed by any production client, Workbench, Host Bridge, MCP, or workflow path, but its three public service methods, Zotero adapter, shard codecs, recovery planner, synthetic UI state, and older requirements remain. Retiring this dormant runtime slice aligns the implementation with the newer canonical-only persistence rule and removes the last direct Zotero implementation from the Synthesis application service.

## What Changes

- **BREAKING** Remove the public `refreshMirror`, `rebuildMirrorFromCanonical`, and `recoverCanonicalFromMirror` service methods and their unused result fields.
- Remove the runtime Zotero Topic mirror adapter, shard payload builder, note-shard codecs/manifests, mirror validation, and canonical-from-shards recovery path.
- Remove synthetic Workbench anchor/mirror storage states and mirror actions while preserving root, local-index, conflict-candidate, and startup-check recovery behavior.
- Treat existing Zotero anchor/shard items as inert legacy data: normal runtime neither reads, updates, deletes, nor automatically migrates them.
- Reconcile current-state specifications, service inventory, tests, and Synthesis documentation with canonical Topic files as the only runtime persistence source.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-layer-foundation`: Strengthens canonical-only runtime persistence and makes legacy Topic mirror data explicitly inert.
- `synthesis-layer-integration`: Removes automatic mirror refresh, mirror adapter smoke, mirror projection, and lifecycle mirror warning requirements.
- `synthesis-sync-recovery`: Removes mirror validation/rebuild/shard-recovery behavior while retaining local root/index/conflict/startup recovery semantics.

## Impact

- Affects Synthesis service/foundation/recovery/UI projection code, Core 120/125/126/129/130/168 tests, service boundary inventory, and current-state documentation.
- Reduces the complete service surface from `128 methods / 1 direct consumer` to `125 / 1` without adding a contract, Host port, database migration, dependency, or external cleanup command.
- Existing Zotero mirror items remain untouched; Git/WebDAV Sync, canonical Topic files, SQLite, Topic commands, and the final full-service composition owner remain unchanged.

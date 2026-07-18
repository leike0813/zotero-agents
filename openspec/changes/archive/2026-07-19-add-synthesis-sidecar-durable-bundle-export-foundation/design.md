## Context

Production `src/modules/synthesis/durableSync.ts` already defines a v2 bundled export layout and a v1 per-entity reader, but its codec is coupled to Zotero runtime storage and reads repository tables and Topic files independently. The isolated sidecar now owns the same durable facts across SQLite plus canonical Topic current files and needs a private, stable export boundary before import or remote delivery can move. The change must preserve production bytes and public behavior, reuse existing domain schemas and canonical-store identities, remain bounded, and expose no new transport capability.

## Goals / Non-Goals

**Goals:**

- Establish one environment-neutral SSOT for all 23 durable entity kinds, exact v2 bundle and manifest shapes, canonical JSON, hashes, paths, deterministic grouping/chunking, strict verification, and bounded collection limits.
- Generate v2 only while continuing to read and verify valid legacy v1 manifests and per-entity assets.
- Capture every available SQLite durable fact and allowed Topic canonical current asset without accepting a mixed cross-storage snapshot.
- Provide a private application with source/sink ports, build/verify operations, manifest-last publication, single-active admission, and drain-before-close lifecycle.
- Keep production durable export/import, sync-index, WebDAV, conflict and progress behavior byte-compatible by delegating only semantically identical codec behavior.

**Non-Goals:**

- Import preview/apply, tombstone deletion, sync-index ownership, WebDAV transport, retry/ETag/conflict UX, autosync, credentials, or recovery journals.
- Public worker, HTTP/RPC, `SynthesisClient`, Workbench, Host Bridge, or MCP operations.
- New durable domain tables, mutation orchestration, production database/canonical-root changes, release publication, or WS6/WS7 work.

## Decisions

### 1. Put the wire contract and codec in `synthesis-contracts`

The shared module owns exact-field parsers, entity/bundle/path classification, canonical encoding, hashes, deterministic grouping and recursive chunking. It accepts injected SHA-256 and path-validation functions where environment primitives differ. Both Node and Zotero callers therefore share one protocol implementation without importing Node-only code into the plugin. Keeping another production-specific codec was rejected because it would retain two facts sources and make byte compatibility unprovable.

The allowed entity kinds are the existing 22 live kinds—Concept, Topic, Topic Graph, Reference, Review, Discovery, Tag and related-effect facts—plus `tombstone`. Tombstones remain parseable and verifiable but current-state builders do not emit them.

### 2. Derive outer limits from domain limits

The durable limits object is the only export/verify bounds source. Per-kind maxima reuse or mechanically combine existing repository contract limits; manifest asset count, total entry count and per-bundle entry count are sums or maxima derived from that map. Each bundle retains the production v2 four-MiB boundary measured with the existing canonical-text length semantics. Recursive deterministic split creates `.part-NNNN.json`; a one-entry bundle that still exceeds the limit fails. Hard-coded duplicate aggregate limits were rejected because they drift as domain limits evolve.

### 3. Parse strictly and normalize once

Manifest, v2 bundle, entry and v1 envelope readers reject unknown fields, invalid schemas, kinds and safe paths, duplicate asset paths or entity identities, collection overflow, and any count/byte/hash/content-hash disagreement. Successful verification returns a path-sorted manifest, assets and globally entity-key-sorted envelopes; diagnostics are structured and stable by code rather than relying on full message text. Coercive parsing was rejected because a verifier must not silently reinterpret remote state.

### 4. Capture SQLite facts transactionally, then prove the cross-storage basis

The repository adapter adds one read transaction that returns all durable rows, Topic registry bases and normalized aggregate bases. The application then reads only canonical-store-recognized `current` `.json`/`.md` assets, excluding nested assets, HTML and `.metadata.json`, and verifies topic/path/hash identity through the existing Topic canonical store. After file reads it captures the repository basis again and re-inspects canonical hashes. Any missing, invalid or changed fact produces validation diagnostics or `basis_superseded`; no mixed snapshot reaches the builder. Calling multiple domain applications or inventing export shadow tables was rejected because those are mutation boundaries and would not make the read atomic.

### 5. Treat indexed pages/files as inputs, not export correctness state

The repository capture and canonical store remain the only facts sources. Export adds no durable cache, migration or alternate topic format. An owner that has no rows contributes an empty collection; the exporter creates no placeholder entity.

### 6. Publish bundle assets before the manifest

`SynthesisDurableBundleSink` receives deterministic bundle writes followed by the canonical manifest text. A failure before the last write cannot create a newly verifiable complete export because the manifest is the commit marker. The application does not return an apply receipt because it changes no domain state. A filesystem rename journal was rejected as premature for a read-only foundation and would not generalize to later remote sinks.

### 7. Use one active lease and drain explicitly

`buildExport` and `readAndVerify` acquire the application's sole active lease. `stopAdmission` rejects new work; `shutdown` stops admission and waits for the active operation to settle. Node composition constructs it after repository recovery and closes it before Topic stores and SQLite. Parallel export was rejected because it adds memory pressure and cross-storage race surface without a priority-7 requirement.

### 8. Delegate production-compatible pieces only

Production retains its exported DTO names, function signatures, progress phases, preview/apply order, sync index, conflict reports and WebDAV host-port behavior. Its v2 envelope/manifest/bundle build and read/verify helpers delegate to the shared codec while Zotero adapters supply runtime hashing and safe-path checks. Compatibility tests lock existing v2 paths, canonical bytes and manifest hashes. Moving repository capture or remote delivery in this slice was rejected because it would broaden the capability boundary.

## Risks / Trade-offs

- [A full corpus can approach the derived collection bounds and require substantial memory] → Keep per-bundle 4 MiB bounds, validate counts before materializing entries where possible, and retain a private single-active lease.
- [SQLite can change while Topic files are being read] → Compare normalized repository bases before and after canonical reads and fail the entire build on any change.
- [A Topic file can be replaced between inspection and read] → Verify content against canonical identity after reading and re-inspect all captured canonical bases before building.
- [Strict parsing can reject previously tolerated malformed bundles] → Preserve only valid v1/v2 formats; return structured diagnostics and keep production preview results compatible for valid input.
- [Shared codec delegation can alter production bytes] → Keep existing field order, capabilities, domain versions, path and timestamp fallbacks; lock exact canonical texts and hashes in Core 158 and Core 214.
- [Manifest-last publication can leave orphan bundles after sink failure] → Orphans are deliberately unverifiable and later delivery/import work can add cleanup or journal semantics without weakening this foundation.

## Migration Plan

1. Add the shared contract/codec and Core 214 contract tests without changing production callers.
2. Add repository capture and canonical adapter tests, then the private application and lifecycle tests.
3. Compose the application after recovery and update packaging inventories/fingerprints.
4. Delegate compatible `durableSync.ts` behavior and run production compatibility/WebDAV/Host-port suites.
5. Update current-state documentation and strict OpenSpec validation. Rollback consists of removing the private composition and delegation; no durable schema or user data migration is introduced.

## Open Questions

None. Import, remote layout and recovery-journal decisions remain intentionally deferred to later changes.

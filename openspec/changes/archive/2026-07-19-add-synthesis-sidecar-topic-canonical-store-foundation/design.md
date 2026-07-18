## Context

The plugin currently writes production Topic current files and owns their application lifecycle. The sidecar owns an isolated repository and authenticated control plane, but no canonical-file slice. Hashing, section filenames, and canonical serialization still live in a plugin helper, which prevents a safe environment-neutral store port.

## Goals / Non-Goals

**Goals:**

- Establish a single environment-neutral Topic canonical snapshot and inspect model.
- Persist complete Topic snapshots under a private shadow root using CAS, durable staging, one global journal, rollback, and restart recovery.
- Exercise the store through an authenticated bounded inspect canary without using the worker pool.
- Preserve plugin production behavior through compatibility exports and keep all production ownership unchanged.

**Non-Goals:**

- Migrating Topic list/detail/apply, patch, graph, discovery, operation, archive, assets, Host effects, WebDAV, or public client routing.
- Reading or modifying the production Synthesis database or canonical root.
- Adding cleanup policy, fallback routing, dependencies, UI, preferences, or release prebuilds.

## Decisions

### Application owns canonical semantics

`packages/synthesis-application` owns strict Topic snapshot reconstruction, canonical JSON text, SHA-256 hashes, path identity, section filenames, inspect projection, and the store port. It reuses `packages/synthesis-engine` bounds and hashing primitives and imports no Node, Zotero, Host, or UI authority. The plugin helper becomes a compatibility re-export.

### One designated Node adapter owns filesystem authority

`apps/synthesis-service/src/topicCanonicalStoreNode.ts` is the only new file allowed to import `node:fs` and `node:path` for Topic canonical persistence. Its root is always `<profileRuntimeRoot>/shadow-canonical/<dataRootId>/`; callers cannot supply a canonical root or Topic path.

### Complete snapshots promote through a global journal

Every write validates and canonicalizes the complete manifest, artifact, metadata envelope, and section set before acquiring durable state. CAS checks happen before the first write. A single in-process admission lock returns `canonical_store_busy` immediately. Staging files and directories are fsynced before a strict journal records the transaction; current is renamed to backup, staging is renamed to current, a receipt is persisted, and only then are backup and journal removed.

### Recovery rolls back uncommitted work

Startup reads only the one global journal and never scans Topic contents. A valid receipt completes cleanup; otherwise recovery restores backup or removes an interrupted create. Malformed identity or journal data fails startup. A rollback that cannot restore a coherent state marks the owner `repair_required` and rejects later writes.

### Inspect is bounded and read-only

`topics.canonical.inspect` strictly accepts `{ topicId }`, derives its path identity, and returns `absent|ready|invalid`, three canonical file hashes, sorted section descriptors, and stable diagnostic codes. It never returns artifact or section payloads and runs in the main process under the existing general 1 MiB/50k-node limits.

### Lifecycle remains shadow-only

Health and handshake report state `ready|stopping|repair_required`, fixed store schema, and an opaque store ID. Shutdown stops canonical write admission before other owners close. `mutationEnabled: false` continues to describe production authority.

## Risks / Trade-offs

- [Synchronous filesystem work can block the control plane] -> Limit the slice to bounded complete Topic snapshots and a descriptor-only inspect canary; no production apply route uses it.
- [A crash can occur between any rename or receipt step] -> Persist a strict phase journal and recover conservatively to old current unless a matching durable receipt exists.
- [Shadow files may be mistaken for production] -> Fix the private root, retain explicit shadow naming/snapshots, expose no write capability, and document plugin production ownership.
- [Canonical validation could drift] -> Reuse engine primitives and make the plugin import the shared application rules.

## Migration Plan

1. Add strict application contracts and plugin compatibility exports.
2. Add the Node shadow store and recovery contract tests.
3. Initialize it before service readiness and expose inspect plus lifecycle snapshots.
4. Extend static boundaries, bundle/fingerprint/XPI inventories, governance, and docs.
5. Ship source only; a later approved change connects Topic application use cases.

Rollback removes the sidecar owner and capability while leaving production plugin behavior intact. Persistent shadow files remain inert and are not automatically deleted.

## Open Questions

None for this foundation change.

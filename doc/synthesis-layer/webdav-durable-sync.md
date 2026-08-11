# WebDAV Durable Sync

WebDAV is the sole durable-sync transport for Synthesis. It exchanges deterministic bundles and never copies the live SQLite database.

## Ownership

The Rust production application owns durable export/import orchestration, conflict handling, retry state, progress, and lifecycle. The plugin Host adapter owns preferences, encrypted credentials, remote URL construction, the HTTP client, and the abort signal. Rust sees only the strict, secret-free `SynthesisHostWebDavSyncPort` and the durable bundle port.

The remote collection contains immutable snapshots and one mutable `HEAD.json` pointer. Local staging lives under `runtime/synthesis/webdav-sync/**` and is disposable. Rust persists its secret-free queue, retry, conflict, and last-run state atomically in `state/native-webdav-state.json`; that file is local runtime state and never enters a durable bundle.

## Bundle Contract

New manifests advertise `webdav-sync.v1`. Readers validate schema, paths, hashes, and asset contents without using the capability string as an import gate, so an existing valid durable bundle remains readable.

The production codec delegates its v2 canonical envelope, bundle, chunk, manifest, strict v1/v2 verification, live identity, sync-index validation, and three-way classification rules to the shared durable-bundle foundation. Existing remote paths, canonical text length fields, hashes, progress, preview/apply results, preferences, credentials, and Host port wire shape remain unchanged. Production WebDAV now delegates environment-neutral HEAD/ETag, publication ordering, retry, conflict, and lifecycle policy to the shared application through adapters over its existing roots.

The retained Node/TypeScript WebDAV implementation is a differential oracle
only. Tests give it isolated roots and a disabled Host port; no production
startup, RPC route, credential access, fallback, or mutation can select it.

Durable bundles include user-owned and non-rebuildable Synthesis facts. They exclude:

- `synthesis.db`, WAL, and SHM files;
- operation and cache-basis rows;
- citation and topic graph projections, metrics, and layout;
- logs, locks, credentials, connection-test state, and temporary workspaces.

Import is always preview-first. A clean preview may write through repository and domain APIs, then marks rebuildable projections stale. Conflicts produce a durable conflict report and block application; the runtime never chooses last-writer-wins silently.

## Triggering and Retry

Manual commands are `syncWebDavNow`, `pauseWebDavSync`, `resumeWebDavSync`, `retryWebDavSync`, and `resolveWebDavSyncConflict`.

Canonical-write autosync is disabled by default. When enabled, a write schedules sync only after the library write lock has been released. The default debounce is five seconds, and writes completed within one maintenance epoch coalesce into one run.

Automatic retry is also disabled by default. When enabled, each manual or autosync trigger may retry transport failures after `60s`, `5m`, `15m`, and `30m`. Pause, disabled configuration, conflict, permanent validation failure, or composition invalidation cancels pending work. Startup does not restore hidden retry timers.

## Concurrency and Recovery

`HEAD.json` is parsed before any snapshot asset and its updates use the observed ETag. If the remote pointer changes during a run, the run fails retryably rather than overwriting the newer pointer.

The first native production clock wrote decimal Unix milliseconds into its local WebDAV state and remote HEAD. On read, Rust recognizes only that exact historical encoding for native-owned state, last-run, retry-base, and HEAD timestamps, converts it to ISO-8601, and then applies the normal strict validator. Valid local state is saved atomically in canonical form. A remote HEAD is not rewritten merely for migration; the next successful ETag-guarded publication writes the canonical timestamp. Signed, fractional, overflowing, structurally invalid, or unknown timestamp forms still fail closed, as do invalid manifests, paths, hashes, schemas, persisted state, and malformed pointers.

Shutdown stops admission, cancels pending trigger chains, and drains the one active run.

The runtime state machine is documented in [State Machines](./state-machines.md), and the complete exchange flow is documented in [Sequences](./sequences.md).

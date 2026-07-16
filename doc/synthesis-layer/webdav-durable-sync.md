# WebDAV Durable Sync

WebDAV is the sole durable-sync transport for Synthesis. It exchanges deterministic bundles and never copies the live SQLite database.

## Ownership

The application service owns durable export, import preview, conflict handling, retry state, and progress. Production composition owns preferences, encrypted credentials, remote URL construction, the HTTP client, and the abort signal. The application sees only the strict, secret-free `SynthesisHostWebDavSyncPort`.

The remote collection contains immutable snapshots and one mutable `HEAD.json` pointer. Local staging lives under `runtime/synthesis/webdav-sync/**` and is disposable.

## Bundle Contract

New manifests advertise `webdav-sync.v1`. Readers validate schema, paths, hashes, and asset contents without using the capability string as an import gate, so an existing valid durable bundle remains readable.

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

`HEAD.json` updates use the observed ETag. If the remote pointer changes during a run, the run fails retryably rather than overwriting the newer pointer. Invalid manifests, paths, hashes, schemas, and malformed pointers are terminal for that trigger.

The runtime state machine is documented in [State Machines](./state-machines.md), and the complete exchange flow is documented in [Sequences](./sequences.md).

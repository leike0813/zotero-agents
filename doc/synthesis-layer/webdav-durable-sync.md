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

The SQLite durable-import receipt is the commit witness across the repository
and canonical filesystem boundary. After that receipt commits, both live apply
and the next production acquisition use the same completion path to promote a
matching canonical batch, verify every target, and clear the receipt. A staged
batch without a receipt is pre-commit evidence and is discarded. Receipt,
batch, or target mismatch fails production acquisition before listener bind and
ready discovery; recovery preserves the conflicting evidence and does not
choose an offline repair policy.

## Triggering and Retry

Manual commands are `syncWebDavNow`, `pauseWebDavSync`, `resumeWebDavSync`, `retryWebDavSync`, and `resolveWebDavSyncConflict`.

Canonical-write autosync follows the Host configuration and is disabled by default. The production composition owns one coordinator and one worker. After an application dispatch returns, the coordinator requires both a successful mutation DTO and a non-zero repository SQL write count before it marks the durable state dirty; WebDAV failure is therefore post-commit and cannot roll back the local mutation.

The fixed autosync trigger set contains Topic apply/delete, Tag vocabulary save/update/delete/promotion/import, Concept display/review/delete, Topic Graph relation accept/reject/review, and the three Reference sidecar refresh operations. Projection rebuilds, staged-only edits, job/log writes, reads, WebDAV imports, unchanged DTOs, rejected/failed operations, and dispatches with no observed SQL write do not schedule publication. This list is maintained by the central post-commit classifier rather than by individual application handlers.

Inline mutations share a five-second trailing debounce. Concurrent Reference refresh receipt workers hold a maintenance epoch open; the debounce begins only after every participating worker has finished, and successful mutations from the epoch publish once. A manual sync, pause, retry, or conflict-resolution command cancels any pending debounce before applying its own control action.

Automatic retry is also disabled by default. When enabled, each manual or
autosync trigger may retry transport failures after `60s`, `5m`, `15m`, and
`30m`. The retry scheduler waits for the full delay and uses an interruptible
generation condition: pause, a superseding trigger, abort, or runtime shutdown
wakes the wait immediately and prevents another Host operation. Disabled
configuration, conflict, and permanent validation failure do not arm a retry.
Startup does not restore hidden retry timers.

## Concurrency and Recovery

`HEAD.json` is parsed before any snapshot asset and its updates use the observed ETag. If the remote pointer changes during a run, the run fails retryably rather than overwriting the newer pointer.

Native WebDAV state owns one in-process transaction mutex around every complete
load-normalize-patch-save transition. Sync work does not hold it across Host or
durable-bundle I/O; terminalization reloads the latest state before applying
its patch, so a concurrent pause remains authoritative. The file-backed state
store separately serializes atomic `.pending`/`.previous` replacement.

The first native production clock wrote decimal Unix milliseconds into its local WebDAV state and remote HEAD. On read, Rust recognizes only that exact historical encoding for native-owned state, last-run, retry-base, and HEAD timestamps, converts it to ISO-8601, and then applies the normal strict validator. Valid local state is saved atomically in canonical form. A remote HEAD is not rewritten merely for migration; the next successful ETag-guarded publication writes the canonical timestamp. Signed, fractional, overflowing, structurally invalid, or unknown timestamp forms still fail closed, as do invalid manifests, paths, hashes, schemas, persisted state, and malformed pointers.

Production constructs the durable application before publishing discovery.
This acquisition is the import recovery gate: successful acquisition proves
that no pending receipt/batch pair remains and that any receipt whose canonical
promotion had already completed was verified and cleared. WebDAV imports stay
outside the canonical autosync trigger set, so recovery cannot create a remote
publication loop.

Shutdown first stops the canonical autosync worker, clears pending debounce state, and aborts its WebDAV target. It then stops WebDAV admission and drains the one active WebDAV run before production application owners are released.

The runtime state machine is documented in [State Machines](./state-machines.md), and the complete exchange flow is documented in [Sequences](./sequences.md).

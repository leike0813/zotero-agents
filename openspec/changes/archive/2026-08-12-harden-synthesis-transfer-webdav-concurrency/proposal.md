## Why

Native transfer attempts and public maintenance work currently escape the service lifecycle as detached threads. Transfer reaping, cancellation, and stop can delete an active attempt's files and reset the shared byte counter before the attempt releases its reservation. WebDAV state patches independently load and save one file while retry waits use an inverted, one-second-truncated generation test, so pause, retry, sync completion, and stop can overwrite each other or perform work after cancellation.

## What Changes

- Give transfer attempts and public maintenance workers one composition-owned background-task registry with bounded cancellation and drain.
- Pin transfer sessions while an attempt is queued, executing, or publishing, and move staged-byte accounting to single-owner reservations.
- Separate logical transfer cancellation from physical cleanup so files remain available until the active attempt returns ownership.
- Serialize WebDAV durable state transactions and replace retry polling with generation-bound interruptible waits.
- Align automatic retry delays with the current specification: 60 seconds, 5 minutes, 15 minutes, and 30 minutes.
- Add Rust concurrency tests, source-fresh real-process shutdown evidence, documentation, and fifth-stage audit results.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-citation-graph-build-large-transfer-contract`: Define active-attempt pinning, logical cancellation, deferred cleanup, and exact byte ownership.
- `synthesis-sidecar-shutdown-drain`: Drain composition-owned transfer and maintenance background work before storage close.
- `synthesis-work-governance`: Make detached public maintenance work composition-owned and shutdown-cancelable.
- `synthesis-webdav-durable-sync`: Serialize state transitions and make retry waits interruptible with the specified schedule.

## Impact

The change affects Rust transfer ownership, background task startup/shutdown, WebDAV application/runtime ports, focused production-route tests, OpenSpec, runtime documentation, and the premerge audit. It changes no public client method, wire operation, reverse-Host capability, SQLite schema, dependency, release artifact, or feed.

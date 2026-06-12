# Design: Surface Refresh Concurrency Hardening

## Surface Request Generation

Each Synthesis Workbench runtime owns a monotonically increasing
`surfaceRequestSeq`. Every `sendSurface()` call allocates a metadata record:

- `requestId`
- `surface`
- `selectedTabAtRequest`
- `refreshFromService`
- `startedAt`

The host tracks the latest request id per surface. If an older request resolves
after a newer request for the same surface, it must not be posted to the iframe.
Scheduled active-surface refreshes capture the surface at scheduling time and
are dropped if the user has switched away before execution.

## Iframe Acceptance Rules

The iframe tracks the latest accepted request id per surface and keeps a
last-known-good snapshot per surface. A `synthesis:surface` payload is accepted
only if its request id is not older than the accepted id for that surface.

Accepted payloads update the global snapshot and the per-surface good snapshot.
Rejected stale payloads do not mutate `state.snapshot`.

## Error Handling

`synthesis:surface-error` carries the same request metadata plus:

- `transient`
- `code`
- `message`

Transient storage busy errors keep the last-known-good content visible and show
a surface refresh diagnostic. If no last-known-good snapshot exists, the iframe
renders an explicit diagnostic panel rather than a regular empty state.

Non-transient errors also avoid clearing last-known-good content; they are
shown as a failed surface diagnostic.

## SQLite Busy Classification

The Workbench host uses the existing SQLite busy detector for raw errors and
wrapped repository/store errors. A wrapped `storage execution failed` error
whose message or cause mentions `NS_ERROR_STORAGE_BUSY`, `SQLITE_BUSY`,
`database is locked`, or equivalent storage-busy tokens is treated as transient
for UI refresh purposes.

## Harness

Readonly harness pages reuse the original Workbench frontend and bridge
protocol. Harness-generated surface messages should preserve the new metadata
shape where the harness sends surface payloads directly, and must not add fake
data fallback for transient failures.

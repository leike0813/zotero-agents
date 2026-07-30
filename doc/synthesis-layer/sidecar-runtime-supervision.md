# Synthesis Sidecar Runtime Supervision

The plugin supervises one XPI-owned Rust process for the current Zotero
profile. Startup has five steps:

1. verify/install the packaged runtime into `current`;
2. start the reverse Host endpoint;
3. write one private session config and launch `serve --config`;
4. verify session discovery, authenticated health, and authenticated handshake;
5. publish the native client and run startup reconciliation.

There is no admission, cutover, preflight, activation, critical-smoke, runtime
generation, or online-upgrade stage.

## Session config and discovery

The launch config directly contains the production database path, canonical
root, reverse Host locator, bundle/build identity, schema/protocol identity,
and two random session tokens. Discovery is written beside that config:

```text
runtime/synthesis/service-runtime/
  profiles/<profileId>/sessions/<supervisorInstanceId>/
    config.json
    discovery.json
```

The supervisor validates discovery against the launch config, then validates
health and handshake against the discovered service instance. Successful
responses remain fenced by request ID and service instance. Recognized
application failures retain their actual error code; placeholder error-envelope
identity cannot turn them into `runtime_mismatch`.

## Production ownership

Rust opens `state/synthesis.lock` and holds an exclusive OS file lock for the
entire process lifetime. A second process targeting the same production
database fails before opening it. Releasing the process releases the lock, so
there is no PID file, owner marker, lease timeout, or stale-owner recovery.

Rust observes parent stdin. Parent-pipe EOF and authenticated `system.shutdown`
both stop the service. Forced process termination is only a bounded fallback.

## Storage startup

Rust owns production initialization. If the database, SQLite sidecars, and
canonical root are all absent, it creates the database and canonical root. If
only part exists, startup fails without creating the missing half.

No backup is created when the repository already uses the current schema. A
future schema transition must be explicitly registered in Rust; only such a
transition may create a verified migration backup immediately before a
transactional migration. Unsupported transitions fail without changing
production.

## Recovery

Unexpected process exit uses bounded in-session restart delays. Every launch
gets a new session directory and new tokens. Recovery does not inspect legacy
receipt, admission, activation, pointer, version, owner, or lease files.

## Diagnostics

The plugin separates sidecar diagnostics into two planes. Bounded failure
summaries always enter Runtime Log so production failures remain supportable.
The richer in-memory timeline retains start, success, and failure events only
when both the hard-coded Synthesis diagnostics source switch and
`__debug_mode__` are enabled; it is exposed by the top-level Synthesis Sidecar
Task Manager page and mirrored to the Zotero console. Release bundling removes
that page, its retained event store, and native debug-event construction when
either gate is disabled.

Events cover lifecycle, plugin RPC, native RPC dispatch, reverse-Host calls,
native operations, and process output boundaries. Correlation uses capability,
request ID, and operation ID. Safe metadata includes duration, HTTP status,
byte counts, page number, and aggregate counts. Credentials, authorization
headers, payloads, artifact locators, paper references, note text, and WebDAV
content are never event fields.

The launch config carries the resolved diagnostics gate into Rust. When it is
disabled, native start/success events are not constructed or serialized;
failure events remain strict diagnostic NDJSON on stderr. Stdout remains
reserved for discovery/protocol output. The supervisor reconstructs chunked
stderr lines, validates their schema, and routes them through the matching
failure or debug plane; unstructured output remains available only as a
bounded, redacted process tail while diagnostics are enabled.

Reverse-Host responses are prepared as one UTF-8 byte sequence before transfer.
The memory response writer waits for output readiness, writes at most 32 KiB,
and advances only by the byte count accepted by the stream, so a partial write
cannot leave `Content-Length` larger than the transferred body. If transfer has
started, failure closes the connection and cannot append a second HTTP
response. Native parsing distinguishes header, status, Content-Length,
truncated/trailing body, JSON, envelope, and result failures.
Reference refresh discards any preparation left by a subsequent Host-read
failure, allowing a retry in the same process. The artifact-read capability has
an explicit 8 MiB response and ten-second call budget; other reverse-Host calls
retain the 1 MiB and two-second defaults. An oversized response records both
the attempted encoded byte count and the applicable limit before the bounded
error envelope replaces it, and the nested reason survives the Rust and plugin
RPC boundaries.

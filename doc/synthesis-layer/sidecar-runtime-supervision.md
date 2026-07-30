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

The plugin owns one sidecar diagnostic sink. Normal builds retain only bounded
failure summaries. Debug builds also retain start and success events, mirror
them to the Zotero console, and expose the recent stream in Task Manager.

Events cover lifecycle, plugin RPC, native RPC dispatch, reverse-Host calls,
native operations, and process output boundaries. Correlation uses capability,
request ID, and operation ID. Safe metadata includes duration, HTTP status,
byte counts, page number, and aggregate counts. Credentials, authorization
headers, payloads, artifact locators, paper references, note text, and WebDAV
content are never event fields.

The native process writes strict diagnostic NDJSON to stderr. Stdout remains
reserved for discovery/protocol output. The supervisor reconstructs chunked
stderr lines, validates their schema, and routes them through the plugin sink;
unstructured output remains available only as a bounded, redacted process tail.

Reverse-Host responses are prepared as one UTF-8 byte sequence before transfer.
If transfer has started, failure closes the connection and cannot append a
second HTTP response. Native parsing distinguishes header, status,
Content-Length, truncated/trailing body, JSON, envelope, and result failures.
Reference refresh discards any preparation left by a subsequent Host-read
failure, allowing a retry in the same process.

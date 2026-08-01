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

The plugin has two independent observation planes. Runtime Log is a Host-owned
business audit: mutations record start and terminal, while reads and periodic
operations record failures only. A single invocation owns terminalization, so
a worker, reverse-Host, and RPC failure cannot create three incidents. Stored
details are limited to operation, trigger, stage, outcome, duration, Host
classification, and a declared public semantic status. HTTP status, byte
counts, native request identity, worker code, and trace fields are excluded.

Debug builds additionally expose `synthesis-sidecar-observation.v2` causal
traces. Optional context crosses Host RPC and reverse-Host wire envelopes, then
links supervisor/process, RPC, reverse-Host, child-worker, transfer, and durable
operation spans. The strict contract accepts only stable identity names,
duration/queue/size/count metrics, stable codes, hashes, and closed domain
facts. Advanced Matching facts are matching hash plus proposal, fact, and
warning counts. Payloads, titles, bodies, locators, identifier values, paths,
credentials, and free error text are rejected.

The trace store is process memory only. It holds at most 1,000 events and 128
events per trace, pins active traces, evicts the oldest completed trace as a
unit, and preserves a trace start, first failure, terminal, and dropped count
when a trace overflows. The Task Manager reads one snapshot when its Sidecar tab
opens and then consumes 200 ms `added`/`updated`/`evicted` batches. Existing
trace rows, selection, detail, and scroll remain mounted when their data does
not change.

The launch config carries the resolved debug gate into Rust. With the gate
closed, Host and Rust create no trace IDs or events, serialize no trace context,
parse no structured stderr, retain no stderr tail or trace store, register no
trace subscription, and publish no Sidecar UI patch. Rust reports production
failure through RPC results and supervisor process state; the Host business
audit remains available. Stdout remains reserved for discovery/protocol output.

Reverse-Host responses are prepared as one UTF-8 byte sequence before transfer.
The memory response writer waits for output readiness, writes at most 32 KiB,
and advances only by the byte count accepted by the stream, so a partial write
cannot leave `Content-Length` larger than the transferred body. If transfer has
started, failure closes the connection and cannot append a second HTTP
response. After a complete response transfer the endpoint releases connection
ownership without forcing `transport.close()`, allowing Gecko to drain bytes it
has already accepted. Transfer failure and endpoint shutdown still abort and
close owned transports. Native parsing reads exactly the declared
`Content-Length` and parses as soon as those bytes arrive; it does not wait for
peer EOF. Early EOF remains `reverse_host_response_body_truncated`, while
header, status, length, JSON, envelope, and result failures retain their own
stable codes.
Reference refresh discards any preparation left by a subsequent Host-read
failure, allowing a retry in the same process. The artifact-read capability has
an explicit 8 MiB response and ten-second call budget. Artifact descriptor scan
uses the same ten-second deadline with the ordinary 1 MiB response limit;
unlisted reverse-Host calls retain the 1 MiB and two-second defaults. An
oversized response exposes the applicable debug budget and stable code without
retaining the attempted body, and the nested stable reason survives the Rust
and plugin RPC boundaries. Retry is safe after a truncated response, timeout,
or stopped endpoint because the corresponding preparation is discarded before
another attempt.

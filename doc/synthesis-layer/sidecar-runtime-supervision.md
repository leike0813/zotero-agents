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

The strict launch-config v4 directly contains the production database path,
canonical root, reverse Host locator, bundle/build identity, schema/protocol
identity, two random session tokens, and an optional bounded startup trace
context. Discovery is written beside that config:

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

The Rust library owns the production process lifecycle through one blocking
`serve(&Path)` operation. It validates the launch config, composes resources,
binds transport, publishes readiness, runs until a terminal signal, performs
bounded cleanup, and returns one typed terminal result. The executable's
`main.rs` is only the `worker`/`serve --config` CLI adapter; request dispatch,
transport, storage, and shutdown resources remain private library details.

Rust opens `state/synthesis.lock` and holds an exclusive OS file lock for the
entire process lifetime. A second process targeting the same production
database fails before opening it. Releasing the process releases the lock, so
there is no PID file, owner marker, lease timeout, or stale-owner recovery.

Discovery publication is the readiness commit. Before that commit, an explicit
startup owner rolls back every acquired resource and keeps the first startup
failure as the terminal cause. A successful discovery write is the sole
sidecar-side readiness fact; the listening line on stdout is diagnostic. The
supervisor still verifies discovery, health, and handshake before publishing a
client connection.

Rust observes parent stdin. Parent-pipe EOF and authenticated `system.shutdown`
both request the same stopping transition. The shutdown RPC receipt means the
request was accepted and is flushed before that transition is published;
process exit is the completion signal. Normal stop reasons coalesce. If a
lifecycle failure is observed before the terminal result is formed, the first
such failure becomes primary and later lifecycle or cleanup failures remain
secondary evidence. Forced process termination is only a bounded fallback.

## Inbound HTTP ownership

The loopback listener admits at most sixteen active connections and does not
queue overflow. A connection beyond that bound receives `503
service_unavailable` without creating a handler thread. One connection owner
holds the active socket clones and each handler's lease, so normal completion,
transport failure, timeout, and panic all release the same capacity. Completed
handler threads are joined during ordinary listener polling instead of being
retained until process shutdown.

Each connection carries one HTTP/1.1 request and closes after its response. The
request line and each header line are limited to 8 KiB, the complete header
block to 64 KiB, and the body to the existing 8 MiB transport maximum.
`Content-Length` is closed and duplicate values must agree; transfer encoding
is unsupported. These transport limits precede and do not replace the 1 MiB
ordinary production-request policy. Header, body, framing, and read-timeout
failures map to `431 invalid_request`, `413 request_body_too_large`, `400
invalid_request`, and `408 request_timeout`, respectively, without entering an
application handler.

Incomplete reads have a 500 ms idle deadline and a non-resetting 30 second
total deadline; response writes have a two-second deadline. Shutdown closes the
listener, interrupts every active socket, stops work admission, and drains HTTP
handlers and composition-owned background tasks within the native 500 ms
budget. Transfer attempts and public maintenance controllers register their
thread handles and cancellation flags with that composition owner; completed
threads are reaped by the lifecycle owner while transport polling stays limited
to listener, connection, and handler-thread work. Shutdown closes background
admission, requests cancellation, and joins those tasks before deleting
transfer staging or closing repository and canonical owners. If a task misses
the deadline, shutdown reports the incomplete drain and leaves referenced
storage open. A lifecycle shutdown response is flushed before the stopping
signal is published, while parent-pipe EOF uses the same interruption and drain
path.

## Storage startup

Rust owns production initialization. If the database, SQLite sidecars, and
canonical root are all absent, it creates the database and canonical root. If
only part exists, startup fails without creating the missing half.

No backup is created when the repository already uses the current schema. The
repository migration registry has a complete ordered v1-to-v2-to-v3 chain and
applies every required step in one transaction after creating one verified
backup. A missing step fails before mutation.

The final TypeScript-owned database is adopted through a read-only schema
profile before any backup or candidate write. The classifier recognizes the
released v0.5-v0.6 and v0.7-v0.8.3 shapes plus the development planning-only
and planning-plus-screening shapes. It preserves facts present in each shape
and fills only historically absent tag-audit, planning, discovery-basis, and
discovery-outcome fields with empty defaults. Unknown tables, columns, or
incompatible known columns fail with `legacy_schema_variant_unsupported`
without changing the source, canonical tree, or backup directory. Candidate
construction and validation remain private; publication is atomic and a
failed candidate can be rebuilt on the next explicit recovery attempt.

Topic classification is also read-only and closed. Only
`materialized/has_synthesis` rows require a complete canonical projection;
`placeholder/placeholder`, `placeholder/stale`, and materialized or placeholder
`deleted` rows are preserved as graph-only facts. Canonical metadata for those
known graph-only identities may be incomplete or absent. Any other Topic state,
or canonical metadata for an identity absent from both inventories, fails before
backup or candidate construction with a stable reason code. Workbench then
shows manual-recovery guidance, diagnostics, and retry without claiming that
legacy data was replaced.

## Recovery

Unexpected process exit uses bounded in-session restart delays. Every launch
gets a new session directory and new tokens. Child exit races discovery so an
early deterministic Rust failure is published immediately instead of waiting
for discovery timeout. Unknown crashes consume the bounded retry budget and
then publish a terminal fuse. Every deadline, retry, and child callback is
scoped to one supervisor generation; a stopped or superseded generation cannot
launch a delayed attempt. Explicit Workbench recovery starts one fresh,
non-overlapping generation. Recovery does not inspect legacy receipt,
admission, activation, pointer, version, owner, or lease files.

The supervisor caches only the bounded health fields needed by Workbench:
lifecycle/recovery state, stable reason code, observation time, service and
bundle identity, restart time, and compute-pool state with active/queued counts.
Workbench may request a coalesced foreground observation every five seconds;
the supervisor's ordinary health schedule remains independent. A degraded
compute pool enters the same bounded fail/restart policy as other native health
failures. Repository paths, canonical roots, credentials, and raw error text
never enter this projection.

The public-maintenance lifecycle module owns durable admission, dispatch,
running transition, terminalization, typed receipt projection, cancel/retry/
continue control, and restart reconciliation. Every detached dispatch catches
panic and attempts durable terminalization. If the first terminal write fails,
it is retried once with a stable failure code. A post-commit spawn failure
terminalizes that same operation. Promotion checkpoints enforce the persisted
deadline, and receipt reads remain pure.
Layout has a 120-second public work deadline, a 90-second direct worker phase,
and a bounded client observation deadline beyond the public limit.

Public maintenance identity is the canonical hash of request ID, capability,
and argument source hash; acceptance time is receipt metadata and never part of
identity. The durable insert is the execution ownership boundary. Only its
winner publishes `maintenance-started`, acquires a canonical-maintenance epoch,
and spawns work. An identical request replay returns the stored pending,
running, or terminal receipt without repeating Host effects. A different
request ID is a distinct requested operation even when capability and arguments
match. Retry creates an idempotent successor whose insert winner publishes its
own started event. Continue dispatches the existing reconciled operation only
when its compare-and-set transition wins and does not republish started.

Repository open preserves operation lifecycle state for the explicit startup
reconciler. That boundary traverses stable operation-ID pages rather than a
newest-row window: public pending receipts become `continuation_required`,
public running receipts become `restart_reconciliation_failed` with
`restart_external_effect_unknown`, and other stale running operations become
`canceled` with `synthesis_operation_stale_after_restart`. Terminal receipts
remain unchanged, and startup never automatically replays maintenance work.

## Diagnostics

The plugin has two independent observation planes. Runtime Log is a Host-owned
business audit: mutations record start and invocation terminal, while reads and
periodic operations record failures only. A single invocation owns
terminalization, so a worker, reverse-Host, and RPC failure cannot create three
incidents. For public-maintenance-operation commands, `pending` and `running`
mean that the invocation successfully returned an accepted receipt; the
operation query and terminal receipt own the later business outcome. Stored
details are limited to operation, trigger, stage, outcome, duration, Host
classification, and a declared public semantic status. HTTP status, byte
counts, native request identity, worker code, and trace fields are excluded.

Startup and debug observation both use
`synthesis-sidecar-observation.v2`. Launch-config v4 can carry the parent trace
into Rust. Before discovery, Rust emits safe structured phases for config
validation, reverse-Host probing, owner acquisition, source validation and
classification, repository migration/open, canonical open, application
composition, listener bind, and discovery publication. The production
supervisor consumes only the stable phase/outcome/code projection, so a
deterministic failure such as `repository_legacy_topic_hint_invalid` remains
visible even when diagnostics are disabled. Raw stderr tails stay debug-only.

Debug builds additionally retain complete causal traces. Optional context
crosses Host RPC and reverse-Host wire envelopes, then links
supervisor/process, RPC, reverse-Host, child-worker, transfer, and durable
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
not change. An accepted public maintenance operation keeps its originating
trace active after the command RPC returns. Accepted, running, and terminal
events carry both capability and public operation ID; a failure terminal keeps
the first stable raw code. A terminal event on a later continuation trace
unpins the originating trace by operation identity. Polling traces cannot evict
the originating trace before that terminal.

Worker stdout remains the only protocol channel. The parent captures at most the
last 8 KiB of worker stderr for exit classification, maps identifiable Rust
panic evidence to `worker_panicked`, and treats other unexpected exits as
`worker_crashed`. The captured text is internal diagnostic input: it is not
copied into a public receipt, trace, Runtime Log incident, or Workbench status.

The launch config carries the resolved debug gate into Rust. With the gate
closed, Host and Rust retain no raw stderr tail or debug trace store, register
no debug trace subscription, and publish no debug Sidecar UI patch. The bounded
startup trace and safe structured startup events remain active so production
failure has an actionable phase and stable code. The Host business audit
remains available. Stdout remains reserved for discovery/protocol output.

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
failure, allowing a retry in the same process. The artifact-read and
representative-image-read capabilities have an explicit 8 MiB response and
ten-second call budget. Artifact descriptor scan
uses the same ten-second deadline with the ordinary 1 MiB response limit;
unlisted reverse-Host calls retain the 1 MiB and two-second defaults. An
oversized response exposes the applicable debug budget and stable code without
retaining the attempted body, and the nested stable reason survives the Rust
and plugin RPC boundaries. Retry is safe after a truncated response, timeout,
or stopped endpoint because the corresponding preparation is discarded before
another attempt.

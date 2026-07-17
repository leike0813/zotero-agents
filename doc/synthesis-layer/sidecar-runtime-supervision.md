# Sidecar Runtime Supervision

Plugin startup now starts the verified product-owned Synthesis runtime
non-blockingly. The launcher executes only the absolute Node executable and
service entrypoint returned by the runtime installer. It does not inspect
system Node, PATH, npm, a login shell, or the ACP process-control registry.

The service is still mutation-disabled. It does not open production
`synthesis.db`, Topic canonical files, or Host capabilities. Before listen and
discovery it opens only an identity-bound persistent shadow repository under
the profile runtime root, establishes foundation plus private Topic/Citation Graph application schemas, and
reconciles interrupted shadow operations. It then initializes isolated Topic
application state and composes a private list/detail/apply application after
repository and canonical recovery. It also opens an identity-bound Topic
canonical shadow under the same profile root and recovers only its one global
transaction journal; it does not scan Topics during startup. Identity, schema,
or malformed-journal corruption aborts startup. Health and handshake return
path-free O(1) repository and canonical-store snapshots; `mutationEnabled:
false` continues to describe production authority. No Topic or Citation Graph application method
is admitted by the HTTP router. The private Citation Graph application uses the same single compute worker but owns an immediate-fail mutation lease and persists only graph-basis-guarded shadow projections.
The default
production `SynthesisClient` routes Citation Graph layout and metrics computation
through its authenticated service-owned worker. The plugin still owns graph
reads, basis checks, promotion, and the other six production engines. Unified
Citation Graph build is also available as an authenticated internal canary, but
production build composition remains in process.

## Profile Lifecycle

Lifecycle state is scoped by a hash of the Zotero profile directory:

```text
runtime/synthesis/service-runtime/profiles/<profileId>/
  owner/owner.json
  discovery.json
  sessions/<supervisorInstanceId>/
    config.json
    lease.json
  shadow-repository/<dataRootId>/
    identity.json
    synthesis.db
  shadow-canonical/<dataRootId>/
    identity.json
    transaction.json       # only while a commit is in flight
    staging/               # only while a commit is in flight
    backup/                # only while a commit is in flight
    topics/<pathId>/current/**
```

The Node service obtains the runtime-instance owner before listening. A live
owner prevents a second service for the same profile. This lock protects only
sidecar process identity; it is not the production database or canonical-file
owner lock used by a future cutover.

The authenticated `topics.canonical.inspect` general capability reads the
shadow owner directly in the main process and exposes no payload or write
operation. Topic promotion is an internal port only; it is not advertised by
discovery and is not connected to production Topic apply.

The config contains launch-scoped secrets and is deleted by the service after
it obtains ownership. Discovery is written atomically after loopback listen and
contains only non-secret identity and endpoint fields. Readiness additionally
requires health and an authenticated protocol, bundle, schema, profile, root,
instance, capability, and mutation-mode handshake.

## Low-Interference Monitoring

Process events are primary:

- `proc.wait()` reports service exit;
- stdin EOF reports Zotero process death;
- authenticated shutdown handles controlled plugin exit.

The plugin uses one recursive deadline scheduler instead of permanent
intervals. In steady state it writes the private lease every 30 seconds and
checks loopback health every 60 seconds. Missed deadlines coalesce and do not
replay. Successful unchanged checks do not publish new supervisor snapshots or
read Workbench, operation, task, run, history, database, or domain state.

The service checks the fallback lease in its own Node event loop. Lease expiry
is 120 seconds, with a resume grace for long scheduling gaps. This fallback is
for addon-realm failure; host process death normally arrives immediately as
stdin EOF.

## Bounded Graph Compute

`compute.citation_graph_layout`, `compute.citation_graph_metrics`, the
internal-only `compute.citation_graph_build` canary, and explicit packed
transfer execution are the only worker operations. The shared pool is lazy,
runs one task, retains at most two waiting tasks across all four operations, and rejects additional work
with `worker_busy`; it is not an operation queue and writes no persistent state.
The HTTP main thread, worker, and main-thread result boundary all use the strict
operation-specific rebuilders from `packages/synthesis-engine`. Compute request and response
envelopes are each capped at 8 MiB, with 250,000 request and 50,000 response JSON
structural nodes; the shared endpoint continues to cap general and system
requests at 1 MiB. Oversized uploads are rejected before queue admission, and
oversized results are transport failures rather than worker runtime faults.

Each production layout/metrics call resolves the supervisor's current ready connection. A
missing connection fails immediately with `service_not_ready`; restart identity,
transport, or worker failures are not retried and never fall back to the local
engine. Request and service-instance identity are checked before strict result
rebuild and plugin-owned graph-basis promotion.

Each layout, metrics, or monolithic graph-build task has a five-second hard
deadline; packed transfer execution has a 30-second active deadline. Active cancellation gets 100 ms of
cooperative grace before worker termination. The worker is limited to 256 MiB
old generation, 32 MiB young generation, and a 4 MiB stack and has no database,
canonical-file, Host, Zotero, or child-process authority. Crash, OOM, hang, or
invalid output fails the active task and replaces the worker; three consecutive
runtime faults degrade compute until service restart while health, handshake,
and shutdown remain available. Health and handshake read an incrementally
maintained O(1) pool snapshot.

## Recovery and Shutdown

Transient launch, exit, or health failures restart after 1, 5, and 15 seconds.
A fourth failure before five stable ready minutes fuses automatic recovery.
Owner conflicts, unsupported or corrupt runtimes, private-file failures, and
identity incompatibility require explicit recovery.

stdout and stderr are continuously drained with bounded retained tails and do
not drive per-chunk state updates. Controlled shutdown stops compute, Topic
Topic/Citation Graph application and canonical-write admission, cancels queued and active tasks,
awaits active graph compute, then marks the repository and canonical shadow stopping and closes SQLite,
and terminates the worker within one 500 ms service budget before closing the
server. The plugin then waits within its own shutdown
budget and directly kills the service process if required; terminating that Node
process also terminates its worker threads.

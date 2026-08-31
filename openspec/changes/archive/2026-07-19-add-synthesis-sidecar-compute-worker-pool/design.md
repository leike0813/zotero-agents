## Context

The sidecar is now installed from a verified five-platform runtime bundle and is
launched by a profile-scoped supervisor. Its HTTP server currently owns only a
small authenticated system control plane. The Citation Graph layout engine has
already been extracted into `packages/synthesis-engine`, with strict request and
result rebuilders and no Node/Zotero persistence dependency. This makes layout a
useful cross-process canary, but production layout still belongs to the plugin's
in-process composition.

The implementation must preserve `108 methods / 1 direct consumer`, keep
`mutationEnabled: false`, remain within the existing 1 MiB/50k JSON wire limits,
and keep health, handshake, shutdown, host-lease expiry, and stdin-EOF handling
responsive even when compute is saturated or faulty.

## Goals / Non-Goals

**Goals:**

- Prove authenticated HTTP-to-worker execution with strict DTO validation at
  every trust boundary.
- Bound concurrency, queueing, execution time, cancellation, shutdown, and V8
  resources with constants owned by the service.
- Isolate worker crash, OOM, malformed result, and hang from the service control
  plane and replace the worker until a three-fault fuse degrades the pool.
- Package and fingerprint every runtime module and license needed by the worker.
- Keep the worker allowlist and service migration topology machine-checkable.

**Non-Goals:**

- Routing production `SynthesisClient`, Workbench, database, canonical-file, or
  any of the eight engine owners through the sidecar.
- Adding automatic in-process fallback, persistent jobs, SSE, UI, preferences,
  Host capabilities, child processes, database schema, warmup, or startup work.
- Publishing or synchronizing runtime prebuilds in this change.

## Decisions

### The service owns one lazy worker and a two-item memory queue

The pool has fixed concurrency one and accepts at most two waiting requests.
The first request lazily creates the worker; service startup performs no engine
import, warmup, or rebuild. A fourth simultaneous request fails immediately with
`worker_busy`. This is a bounded execution primitive, not a general task queue,
so it has no persistence, priority, retry, or resume semantics.

Multiple workers were rejected because the canary is intended to validate the
boundary with a small predictable footprint, and an unbounded executor was
rejected because it could transfer UI burst pressure into Node memory.

### One fixed operation crosses the worker boundary

The only operation is `citation_graph_layout.v1`, exposed as
`compute.citation_graph_layout`. The HTTP main thread rebuilds the request before
enqueue, the worker rebuilds it before execution, and the main thread rebuilds
the returned result against the request. Both request and result DTOs are
imported from `packages/synthesis-engine`; the service does not copy them.

The worker imports only the engine entry needed for layout plus Node worker
transport. It receives no profile path, tokens, DB handles, canonical paths,
Host ports, Zotero globals, or process-spawn capability.

### Deadline and cancellation are terminal task outcomes

Each layout gets a hard five-second execution deadline. Abort before dispatch
removes the queued task. Abort or timeout while active sends a cooperative
cancel signal, waits at most 100ms, then terminates and replaces the worker.
Stable result codes distinguish busy, timeout, caller cancellation, crash,
invalid worker result, and unavailable/degraded pool outcomes.

Client disconnect is translated into task cancellation. No canceled or timed-out
result is later delivered or promoted.

### Runtime faults replace the worker and feed a restart-only fuse

Unexpected exit, OOM, hang/forced termination, and invalid result fail only the
active task, leave queued tasks bounded, and replace the worker. Three
consecutive runtime faults set the pool to `degraded`; queued tasks fail with
`worker_unavailable`, no new worker is created, and recovery requires restarting
the service. Successful task completion clears the consecutive failure count.

Expected cancellation does not count as a runtime fault. Snapshot counters are
maintained incrementally so health and handshake reads are O(1).

### Shutdown has a separate 500ms total budget

The pool synchronously stops accepting work, rejects queued tasks, asks an
active task to cancel, and terminates the worker within one 500ms wall-clock
budget. Authenticated shutdown, host lease expiry, stdin EOF, and service
shutdown all await the same idempotent pool stop path before service completion.
The plugin supervisor's direct Node-process termination remains the final
process-tree guarantee because worker threads are descendants of that process.

### Packaging follows the compiled module graph explicitly

The service build emits worker and engine modules. Runtime assembly copies the
compiled service/engine graph plus the exact D3 CommonJS/ESM runtime files used
by layout (`d3-force`, `d3-dispatch`, `d3-quadtree`, and `d3-timer`) and their
license texts. No dependency is added. Fingerprints include service, engine,
worker, package versions, and the root lockfile so stale prebuilds fail closed.

## Risks / Trade-offs

- [A five-second worker deadline is below the engine's largest DTO envelope] →
  Treat this endpoint as a transport canary under the existing wire limit, not
  as a promise to serve the engine maximums.
- [Termination discards worker-local JIT state] → Keep startup lazy and replace
  only after active cancellation/faults; predictable isolation takes precedence
  over warm-cache throughput.
- [Worker thread resource limits do not eliminate all host memory pressure] →
  Retain the HTTP wire bounds, one worker, two queued requests, and V8 limits of
  256 MiB old generation, 32 MiB young generation, and 4 MiB stack.
- [A restart-only degraded fuse temporarily removes compute] → Preserve service
  health/control availability and return a stable retryable unavailable error;
  automatic fuse recovery is deferred until production operational evidence.
- [Explicit runtime file lists require maintenance when D3 changes] → Guard the
  bundle manifest, licenses, package versions, lockfile fingerprint, and build
  graph in Core packaging tests.

## Migration Plan

1. Add contracts and failing Core tests for scheduling, transport, lifecycle,
   faults, packaging, and invariants.
2. Implement the worker pool, worker entrypoint, HTTP route, and internal client.
3. Extend build, bundle, fingerprint, and boundary governance.
4. Update migration inventory and current-state documentation.
5. Run strict OpenSpec validation and the focused/full repository gates. Runtime
   prebuild publication remains a separate release action.

Rollback is source-level removal of the compute capability, pool/worker/client,
and bundle additions. Production behavior does not require data migration or
fallback because no production caller is routed to the endpoint.

## Open Questions

None. Production routing and its no-fallback policy are intentionally deferred
to `route-synthesis-citation-graph-layout-through-sidecar-worker`.

## Context

Citation Graph Build has a strict direct engine, an 8 MiB monolithic worker canary, and an authenticated canonical-JSON page staging contract. The normal profile is roughly 25 MiB of input and 72 MiB of output, so one request/result structured clone and full result reconstruction are not viable. The staging owner also retains complete page objects after writing them, so its logical disk bounds do not currently bound main-thread heap.

The service worker remains mutation-disabled and must not access the plugin database, canonical files, Host capabilities, Zotero globals, child processes, or service staging paths. Production composition, durable basis capture/recapture, and graph promotion remain plugin-owned.

## Goals / Non-Goals

**Goals:**

- Execute sealed staged input through the existing lazy single-worker pool and publish complete staged output.
- Keep the service main thread and worker transport bounded to one canonical page in flight in each direction.
- Use one graph-build semantic implementation for direct and packed adapters.
- Make failures retryable from immutable sealed input without exposing partial output.
- Prove the normal profile under the existing 256 MiB old-generation worker limit.

**Non-Goals:**

- Route production graph rebuilds through the sidecar or add automatic fallback/retry.
- Promise target/stress completion or the engine's theoretical maximum under current worker memory.
- Give the worker filesystem, repository, Host, canonical-file, or operation authority.
- Add SharedArrayBuffer data regions, compression, persistence recovery, dependencies, UI, or public client methods.

## Decisions

### Execute is an asynchronous action on the existing transfer capability

`execute` accepts a sealed session into the shared worker queue and returns the strict status immediately. Active and completed calls are idempotent. Admission errors remain synchronous stable worker errors. Once accepted, HTTP disconnect does not cancel the attempt; only session cancel or service lifecycle shutdown does.

Status adds `queued`, `executing`, and `publishing_output` plus execution attempt count and an optional structured last failure. A failed attempt returns to `input_sealed`; a session cancel removes addressability.

### The service owns files and transfers one canonical page at a time

The owner stores only descriptors and paths after upload. The executor reads and strictly rebuilds one page, transfers canonical row bytes through a task-scoped `MessagePort`, and waits for worker acknowledgement before reading the next page. Output uses the reverse acknowledgement flow. This is preferred over worker file access, which would leak path authority, and over transferring all buffers, which would permit the 1 GiB direction bound to become heap.

### One packed accumulator is the graph-build semantic SSOT

The engine adds a packed accumulator backed by a UTF-8 string table, typed scalar columns, list offset/value columns, numeric indexes, and deterministic index sorting. It validates cross-page uniqueness and references at finalize time, reconstructs the strict request only inside the worker, invokes the shared graph-build semantic kernel, and immediately paginates the result for acknowledged transfer. This avoids a monolithic request/result structured clone and repeated full-result rebuilding while preserving one semantic implementation.

The existing object engine feeds its strictly rebuilt request into that accumulator and collects emitted rows into the unchanged result DTO. The worker feeds strict pages and passes emitted rows through a canonical bounded page builder. This keeps one graph algorithm while allowing different storage/output adapters.

### Output publication is attempt-scoped and atomic

Starting an admitted attempt creates a generated attempt directory. Output pages count against existing direction and service byte limits but are not addressable through output reads. The main thread strictly rebuilds every page, derives the final manifest from observed descriptors and diagnostics, and atomically promotes the attempt directory only after all validation succeeds.

Timeout, crash, OOM, malformed output, sink failure, or cancellation tombstones the attempt and subtracts its bytes. Runtime worker failures participate in replacement and the three-failure fuse; transfer capacity/filesystem failures do not.

### Transfer execution has a separate bounded deadline

Layout, metrics, and monolithic graph build retain five seconds. Streaming transfer gets 30 seconds from activation, the existing 100 ms cooperative cancellation grace, shared FIFO one-active/two-waiting admission, existing resource limits, and the same 500 ms overall shutdown budget. A separate pool was rejected because it would double bounded runtime resources and bypass contention/fuse governance.

## Risks / Trade-offs

- **Normal succeeds but target/stress may exceed packed state or map overhead.** → Hard-gate normal only and keep larger tiers report-only until measurements justify another change.
- **A manual transfer can occupy the production layout/metrics worker for 30 seconds.** → Keep execution internal-only, explicit, FIFO-bounded, and absent from production composition.
- **Page validation and canonicalization add CPU.** → Bound every page, avoid whole-result reconstruction, and perform only trust-boundary rebuilds.
- **Direct engine refactoring can drift semantics.** → Preserve existing fixtures/bounds and compare direct, packed, and real-worker outputs in Core 183/202.

## Migration Plan

1. Add failing contract, engine, owner, pool, and real-HTTP tests.
2. Add status/action DTOs, packed accumulator, bounded page builder, and metadata-only owner.
3. Add executor and streaming worker protocol, then wire server/client/lifecycle.
4. Update packaging, governance, benchmark, and documentation and validate the normal profile.

Rollback removes `execute` advertisement/dispatch and the streaming operation. Existing staged sessions remain ephemeral and production graph state is unaffected.

## Open Questions

None. Normal acceptance, packed kernel, asynchronous execution, atomic output attempts, and the 30-second deadline are fixed for this change.

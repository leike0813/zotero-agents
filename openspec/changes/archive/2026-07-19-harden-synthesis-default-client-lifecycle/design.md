## Context

The default Synthesis client is a process-wide composition over the legacy service. Today the cache stores only a resolved client, initialization is not shared, invalidation does not own an asynchronous drain barrier, and client methods resolve the mutable global service at call time. Consequently concurrent callers can create multiple services, an invalidated initializer can republish stale state, and a retained client can resurrect the service after invalidation. The service also owns canonical-maintenance timers and WebDAV applications that are not fully drained by plugin shutdown.

The implementation must preserve the public `SynthesisClient` contract, the service's 108 public methods, the one direct production consumer boundary, storage and RPC formats, and Zotero-compatible runtime APIs.

## Goals / Non-Goals

**Goals:**

- Establish a single initialization promise per default-client generation.
- Make invalidation synchronously fail closed while retaining awaitable cleanup.
- Make composition and service cleanup idempotent and scoped to the exact owner.
- Cancel maintenance debounce work and drain admitted WebDAV applications.
- Await client cleanup before stopping the sidecar supervisor.

**Non-Goals:**

- Changing public client DTOs, service methods, routes, persistence, or dependencies.
- Adding worker parity, a general sidecar-service shutdown protocol, or a CI policy gate.
- Archiving or rewriting completed Synthesis changes and historical review reports.

## Decisions

### Cache an initialization record per generation

`defaultClient.ts` will keep a monotonically increasing generation and one record containing that generation plus the shared composition promise. All concurrent acquisition reads the same record. Initialization verifies both generation identity and lifecycle openness before publishing; a stale initializer disposes its composition and returns the standard unavailable failure.

This is preferred over caching only a resolved client because the race exists before resolution. It is preferred over silently retrying stale acquisition because invalidation can represent configuration change or plugin shutdown, where continuing a request under an unobserved owner would be unsafe.

### Separate synchronous invalidation from tracked drain

Invalidation increments the generation, detaches the cache, and synchronously asks the owned composition to abort. Its disposal promise is added to a tracked cleanup set and removed when settled. `getFreshDefaultSynthesisClient()` awaits tracked stale cleanup before creating the next generation; `shutdownDefaultSynthesisClient()` closes admission and awaits all records and cleanup promises.

This preserves the existing synchronous invalidation call shape while giving fresh acquisition and plugin shutdown an explicit asynchronous barrier.

### Bind clients to a private composition owner

`legacyComposition.ts` will return a composition containing its client and an idempotent `dispose()`. Client methods resolve only the service captured by that composition and consult its disposed guard; they never call the mutable global resolver after disposal. Global compatibility helpers may still expose the current composition, but cleanup compares the private owner token before clearing or aborting shared state.

This prevents an old generation from resurrecting a service or disposing its replacement without changing the public client contract.

### Keep service disposal outside the public object shape

`service.ts` will register an internal disposer in a `WeakMap` keyed by the returned service object. An internal helper invokes it. Runtime abort synchronously clears the canonical-maintenance debounce timer and pending state. The disposer additionally closes WebDAV admission and awaits the set of admitted application promises.

A `WeakMap` retains the exact 108-method public inventory and avoids a lifecycle method leaking into RPC or contract reflection.

### Insert client shutdown before sidecar shutdown

`hooks.ts` will add a `synthesis-client-dispose` shutdown step under the existing three-second step timeout immediately before the sidecar supervisor stop step. The client composition depends on sidecar availability, so dependency teardown follows client-before-sidecar order.

## Risks / Trade-offs

- [A stale acquisition now rejects instead of retrying transparently] → Use the established unavailable error and document generation invalidation as a hard boundary.
- [Synchronous invalidation cannot await WebDAV drain] → Abort and detach synchronously, track the asynchronous disposal promise, and make fresh acquisition and shutdown await it.
- [A rejecting cleanup could poison later lifecycle barriers] → Normalize tracked cleanup promises after preserving the original error for the initiating path where appropriate.
- [Tests could accidentally expose implementation-only disposal] → Assert observable behavior and the unchanged public method inventory rather than adding dispose to the service shape.

## Migration Plan

No data or configuration migration is required. Deploy the lifecycle coordinator, owner-scoped composition, internal service disposer, and shutdown hook together. Rollback consists of reverting these code and test changes; stored data remains compatible.

## Open Questions

None. The accepted plan resolves invalidation semantics, teardown ordering, and public-surface constraints.

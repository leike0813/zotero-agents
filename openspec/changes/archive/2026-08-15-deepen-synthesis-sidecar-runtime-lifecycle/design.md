## Context

See `proposal.md` for motivation. The executable currently declares twenty-nine private runtime modules, while the library exposes only `runtime_contract`. `runtime_service::serve` composes production resources into a thirteen-field `ServeState`; `runtime_server_loop` then publishes readiness, accepts work, understands every owner's shutdown protocol, closes storage, and formats cleanup failures. Integration tests recompile selected production files through `#[path]`, and static governance treats a source-line limit as an architecture invariant.

The existing process and wire contracts are fixed. The CLI remains `worker` or `serve --config CONFIG`; discovery v5, health, handshake, capabilities, the early shutdown receipt, public error codes, worker framing, transfer behavior, and the shared 500 ms shutdown deadline do not change.

## Goals / Non-Goals

**Goals:**

- Give callers one high-leverage production serve interface and give maintainers one locality for startup, readiness, stopping, and cleanup.
- Make the library interface the lifecycle test surface while retaining private internal seams for transport and worker-process fault simulation.
- Preserve the first lifecycle failure and retain bounded cleanup evidence without serializing arbitrary error text.
- Keep existing worker, transfer, capability, storage, and transport authorities separate inside the implementation.

**Non-Goals:**

- Change any public operation, payload, discovery field, protocol version, storage schema, migration, deadline, or supervisor policy.
- Move worker framing or capability matching into lifecycle composition.
- Add a general lifecycle trait, generic shutdown registry, new crate, dependency, queue, fallback, or compatibility wrapper.

## Decisions

### 1. Move the runtime graph to the existing library target atomically

`main.rs` retains only the `runtime_cli` executable adapter. The other runtime modules move as declarations to `lib.rs`; the library re-exports the worker entry, production serve entry, and serve terminal failure while keeping implementation modules private. All declarations move in one edit so the same source is never compiled as two different crate-local type graphs.

Alternative: create a new runtime crate. Rejected because there is one production caller, no deployment seam, and a new crate would add interface and build complexity without leverage.

### 2. Deepen the existing `runtime_service` module

The production interface is one blocking operation equivalent to `serve(&Path) -> Result<(), ServeFailure>`. It reads and validates the config path, owns composition, commits readiness, runs until a terminal signal, performs bounded cleanup, and returns one typed terminal result. The executable adapter converts that result to the existing stderr and exit behavior.

Alternative: return a start handle with separate stop and join methods. Rejected because it exposes ordering constraints already provided by parent-input closure and authenticated shutdown.

### 3. Separate resource ownership from request use

`runtime_service` owns closable resources and their dependency order. Capability dispatch receives a private request context containing only the shared handles needed to serve requests plus a stop requester. Transport receives a request dispatcher and stop observation, not a resource bag. The unused `RuntimeOwnership` reference in the current request state is removed.

Alternative: make the existing `ServeState` fields private but keep passing the whole value to transport. Rejected because transport would still depend on production-resource shape and lifecycle knowledge would remain split.

### 4. Use one reason-bearing stop signal

The stop signal combines fast atomic stopping observation with synchronized cause retention. Normal signals coalesce. A lifecycle failure promotes a pending normal stop to failure; the first lifecycle failure becomes primary; later lifecycle and cleanup failures become secondary issues. Once formed, the terminal result is immutable.

The worker pool may consume a narrow stop observation supplied by the signal, but it does not learn lifecycle causes or composition types.

### 5. Treat discovery publication as the ready commit

Composition uses an internal partial-ownership guard. Before discovery publication, every failure explicitly rolls back acquired resources and preserves the startup failure as primary. After binding the listener and completing application reconciliation, `runtime_service` atomically publishes discovery. Stdout notification remains diagnostic. Every subsequent lifecycle terminal removes discovery and enters the same cleanup implementation.

`Drop` remains a best-effort safety net; it is not the observable rollback contract because it cannot return cleanup evidence.

### 6. Keep loopback transport concrete and private

`runtime_server_loop` owns the concrete loopback listener, active-connection registry, handler threads, socket interruption, and handler drain. It reports listener exit and drain evidence to `runtime_service`; it does not publish discovery, stop application owners, close storage, or aggregate process failures. Real loopback TCP remains the local substitute, so no transport trait is introduced.

### 7. Encode cleanup dependencies explicitly

`runtime_service` runs explicit phases: stop background and application admission, stop autosync, stop compute, request transfer stop, drain background work, finalize transfer when safe, interrupt and drain HTTP handlers, stop WebDAV, release request contexts, then close canonical and repository owners only when no borrower remains. Each phase appends structured cleanup issues and never prevents a later safe phase.

Alternative: a common `ShutdownOwner` trait and registry. Rejected because the owners have different multi-phase protocols and safety preconditions; a uniform interface would hide rather than remove complexity.

### 8. Replace path-recompiled worker tests without widening production visibility

Worker-pool state-machine cases move behind a private internal worker-execution seam with the production child-process adapter and a deterministic test adapter. The existing real production-route evidence continues to exercise the actual worker executable and protocol. Lifecycle integration tests call the public serve interface. No `cfg(test)` production export or test feature is added.

### 9. Replace size proxies with ownership checks

Static governance keeps the valuable rules: worker framing, transfer staging, capability dispatch, storage opening, and lifecycle composition each have one owner. It removes the `runtime_service.rs` line-count limit and assertions against incidental `main.rs` text. The durable Rust fingerprint covers the complete sidecar source tree after `main.rs` becomes thin.

## Risks / Trade-offs

- [Moving modules from binary to library changes Rust crate resolution] → Move all declarations atomically and replace self-crate imports with `crate::runtime_contract` in the same slice.
- [A typed terminal failure could accidentally change public stderr codes] → Keep rendering in the executable adapter and add compatibility assertions for stable codes rather than full messages.
- [A stop signal can race with new work admission] → Publish stopping atomically before the run loop performs cleanup and require every admission path to observe the same stop state.
- [Partial startup cleanup can become a second state machine] → Keep it private, reuse the same typed cleanup primitives, and permit only one conversion into the complete running-resource set.
- [Worker tests could lose real-process coverage] → Keep production-route worker evidence and use the private test adapter only for deterministic pool state transitions and fault classification.

## Migration Plan

1. Add failing lifecycle and ownership tests against the agreed interfaces.
2. Introduce typed lifecycle state, stop cause, and terminal failure without changing executable rendering.
3. Separate request context and concrete transport ownership, then move cleanup orchestration into `runtime_service`.
4. Move runtime declarations into the library and reduce the executable atomically.
5. Replace path-recompiled tests and brittle static checks, update source fingerprint and current documentation.
6. Run focused tests, strict OpenSpec validation, Rust formatting/Clippy/workspace tests, architecture checks, build, and diff validation.

The change is source-only and requires no data or deployment migration. Reverting the source change restores the previous topology because wire and storage contracts remain unchanged.

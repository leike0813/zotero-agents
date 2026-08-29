## Context

See `proposal.md` for motivation. Public maintenance operations already have durable identities, receipts, retry successors, explicit continuation, promotion checkpoints, and restart classification. Their lifecycle implementation is split among production routing, a partial maintenance helper, and the WebDAV adapter. The repository exposes the required atomic insert and compare-and-set behavior through local SQLite; the production catalog statically resolves 96 routes, including 16 public maintenance capabilities.

The implementation must preserve the existing public operation DTO, database schema, production inventory, capability handlers, work deadlines, restart safety, and first-terminal-wins behavior. Repository/SQLite and background execution are local-substitutable dependencies and remain internal seams. The repository's insert primitive already reports its winner, while its nonterminal and terminal compare-and-set primitives currently discard SQLite's affected-row fact; those existing methods must retain and return that fact so lifecycle ownership is observable without adding another persistence interface.

## Goals / Non-Goals

**Goals:**

- Concentrate lifecycle knowledge behind one crate-private module interface.
- Make durable transition ownership explicit and eliminate duplicate dispatch windows.
- Give callers and tests one typed surface for submission, control, reading, and startup reconciliation.
- Make durable operation state the lifecycle source of truth and align receipt/event projection with it.
- Preserve current catalog and handler locality while improving panic-safe execution context propagation.

**Non-Goals:**

- Adding a public operation method, status, DTO field, event schema, database column, queue, or dynamic route registration.
- Changing capability-specific application behavior or automatically replaying maintenance work after restart.
- Introducing a repository trait or fake persistence implementation solely for tests.
- Reworking the entire 96-route handler interface or completing other architecture-review candidates.

## Decisions

### 1. Deepen the existing runtime maintenance module

`runtime_public_maintenance_operation` becomes the sole lifecycle owner in the `synthesis-sidecar` runtime crate. Its crate-private interface has four intention-revealing entries: `submit`, `control`, `read`, and `reconcile_restart`. Phase operations such as accept, mark-running, checkpoint, terminalize, resume, and persistence projection remain private implementation.

This placement keeps catalog dispatch, background tasks, deadlines, trace context, panic containment, and startup reconciliation together. Moving the lifecycle into the application crate would require many single-adapter runtime ports; moving it into the repository would couple process policy to SQLite.

### 2. Use durable transition winners as execution ownership

New submit and retry use `insert_operation_if_absent` ownership; continue uses the `continuation_required` to queued compare-and-set winner. The lifecycle carries the winner fact directly into dispatch. Duplicate commands return the current view without spawning, emitting lifecycle events, or repeating effects.

Retry creates and dispatches a new successor in one command. Continue resumes the same pending operation after explicit restart recovery. Startup changes accepted or queued pending operations to `continuation_required`, changes public running work to `restart_reconciliation_failed` with unknown external effect, preserves terminal rows, and never dispatches.

### 3. Divide errors at durable commit

Validation, route resolution, and persistence failures before commit remain command errors. After commit, spawn, handler, panic, timeout, cancellation, and classification failures belong to the same operation and converge through one first-terminal-wins path. If terminal persistence is itself unavailable, the result preserves the accepted operation ID and reports durable-state uncertainty.

### 4. Return a typed operation view

The external seam returns a transport-neutral `MaintenanceOperationView`, not `OperationRecord` or raw JSON. Lifecycle identity, state, phase, scope, progress, and timestamps are explicit fields. The optional capability-specific terminal receipt remains opaque and carries its existing retryability and sanitized diagnostics. Record encoding, basis JSON, source hash, diagnostics storage, and CAS ordering stay private; the WebDAV adapter owns strict request decoding and public JSON encoding.

### 5. Resolve an opaque maintenance route from the catalog

The production catalog remains the single mapping from capability and manifest policy to the existing function-pointer handler, semantic-success rule, canonical effect, and deadline metadata. It constructs an opaque resolved maintenance route used by the lifecycle. The descriptor is never persisted; explicit continuation reconstructs it from the persisted capability and current catalog. No handler enum, second registry, or dynamic trait object is added.

### 6. Keep execution context private and panic safe

The lifecycle creates a typed maintenance execution context and installs it through a private RAII thread-local guard while invoking the existing synchronous handler interface. The guard restores nested context during normal return and unwind. Promotion adapters use a narrow checkpoint bridge; raw operation identity and TLS access do not cross the lifecycle seam. Work that crosses a thread must carry an explicit checkpoint capability because TLS does not propagate.

Changing the shared handler function pointer was rejected because it would force maintenance context through roughly 80 unrelated routes and duplicate candidate-1 registry work.

### 7. Preserve cooperative cancellation

Pending cancel terminalizes immediately. Running cancel durably records `cancel_requested` and returns; the worker terminalizes canceled at the next safe promotion checkpoint. Completion and cancellation race through first-terminal-wins. A cancellation token may reduce wasted work but cannot promise synchronous interruption or effect rollback.

### 8. Make lifecycle observation operation-level

The insert winner publishes exactly one `maintenance-started` for each new operation, including a retry successor. Continue does not republish started. Every durable terminal commit winner publishes one terminal event. The Host adapter stops inferring lifecycle events from receipt state. Trace retention indexes the originating trace by operation identity so a terminal event from a later control or reconciliation trace can unpin it.

### 9. Test through the lifecycle interface

Command and process tests exercise the four lifecycle entries through the production adapter with a temporary real repository and real background owner. Repository tests retain atomic insert, compare-and-set, pagination, and terminal immutability evidence. Focused module tests cover RAII unwind restoration and promotion checkpoint terminal races that cannot be forced through the production executable. Wire tests cover strict validation and typed command translation. Process tests retain exactly-once effect, concurrent retry/continue, cancellation, restart, and cross-trace observation cases.

## Risks / Trade-offs

- **[Lifecycle module grows internally]** → Organize admission, execution, terminalization, projection, and recovery as private sections while keeping one external interface and no new production file.
- **[Existing dirty runtime changes overlap]** → Apply incremental edits against current contents, preserve unrelated lifecycle work, and run the full Rust runtime gates.
- **[A handler can omit a promotion checkpoint]** → Keep shared promotion adapters as the only effect paths and cover each shared promotion family with representative evidence rather than duplicating all capability aliases.
- **[Post-commit terminal persistence can fail]** → Preserve the stable operation ID in the uncertainty error and rely on later read/reconciliation; never report the command as unaccepted.
- **[Trace terminal can arrive under another trace]** → Maintain an operation-to-origin index in the bounded trace store and clear it from any terminal event.
- **[Static catalog semantics may change across restart]** → Continue remains explicit and fail-closed if the persisted capability no longer resolves; handler implementation is never serialized.

## Migration Plan

1. Add lifecycle interface tests that expose duplicate dispatch and terminal-observation gaps.
2. Move lifecycle transitions and projection into the maintenance module while preserving wire bytes and durable identity.
3. Route catalog-resolved maintenance commands through the new interface; remove production-client phase orchestration.
4. Reduce the WebDAV module to wire translation and migrate shared checkpoint callers.
5. Make native lifecycle events authoritative, remove Host receipt inference, and support cross-trace unpinning.
6. Run focused and full Rust, process, parity, and cross-language gates before syncing delta specs.

Rollback is code-only because no persisted schema or public contract changes. Existing operation rows remain readable by both implementations.

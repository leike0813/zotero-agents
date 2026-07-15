## Context

Replay target creation currently prepares synthetic Chat/Workflow state, while Workspace surface preparation also changes target selection. Chat `target-active` originally reached the production `setActiveAcpConversation()` path, which validated the synthetic backend id against the real registry and failed before the profile window. After introducing activation, the real Workspace path still runs `preloadAcpChatBackendsForWorkspaceInit()`: its registry refresh treated the lease-owned synthetic foreground as invalid and replaced it with a real backend before owner readiness. A cold child can also supersede the one forced diagnostics snapshot with a concurrent init/page-first build; the publication sidecar previously waited without retry after that build returned no revision. Matrix v2 then lacks a primary setup phase and derives R1 coverage from equality alone, allowing `0 === 0` to appear captured.

The implementation must preserve production selection behavior, backend-free Replay, Workspace rendering isolation, exact synthetic owner identities, and build-time elimination of all Replay-only seams.

## Goals / Non-Goals

**Goals:**

- Make target activation an explicit, idempotent part of every Replay target lifecycle.
- Activate synthetic Chat owners without reading/writing the backend registry or creating backend runtime resources.
- Restore foreground selection only while the activation lease still owns it, including failure, cancellation, repeated cleanup, and cleanup-error paths.
- Record the first failed lifecycle phase as matrix v2 primary failure and retain later cleanup failures as warnings.
- Mark unexecuted drains and measurements as `not-run`, and require positive complete semantic evidence before R1 is captured.
- Keep the activation/lease seam debug-exclusive and fully removable from production and Replay-disabled bundles.

**Non-Goals:**

- Registering `acp-replay` as a backend or weakening the production selector.
- Moving Workspace shell/tab/readiness ownership into the target.
- Changing trace NDJSON, real ACP Chat semantics, matrix schema version, or synthetic owner strings.
- Making cold transcript caches a correctness dependency.

## Decisions

### Replay target owns synthetic selection; Workspace owns presentation readiness

`AcpRuntimeReplayTarget` gains required `activate()`. The matrix runner executes create → activate for `target-active` only → Workspace prepare → profiler start → replay and R2 → drain → profiler finish → cleanup. `closed` and `open-inactive` never activate the target. This separates synthetic domain selection from shell open/tab/readiness state and gives all three targets the same lifecycle contract.

The alternative—teaching the Workspace port to activate Chat/Workflow owners—would couple a presentation port to source-specific synthetic runtimes and duplicate cleanup ownership.

### Chat synthetic activation uses an owner/token lease

The debug Replay source calls a narrow session-manager seam that accepts only an already prepared synthetic conversation. It snapshots foreground selection, publishes the synthetic owner through the existing Chat projection path without backend lookup/persistence/runtime creation, and returns an idempotent cleanup lease. The prepared runtime carries an in-memory backend descriptor so frontend options and panel availability can project that owner alongside cached real backends without registering it. While the token still owns the current foreground, ordinary backend refresh may update the real registry cache and real runtime metadata but cannot reconcile, clear, switch, or persist the foreground selection. Cleanup restores the snapshot only if both token and current owner still match; a stale lease cannot overwrite a later selection. Restoration precedes synthetic transcript/conversation/runtime cleanup.

The ordinary selector remains unchanged and fail-closed. No backend-id special case is introduced because source identity is not authorization.

### Diagnostics publication retries an idempotent request

Workspace readiness and nested-frame render acknowledgement remain presentation concerns. After the expected child and owner are ready, the diagnostics sidecar attaches its revision listener and issues a forced publication. If that asynchronous build is superseded and returns without a newer revision, the sidecar repeats the same forced publication serially at a bounded interval. It never overlaps builds, and it stops on acknowledgement, cancellation, frame replacement, unload, publication error, or timeout.

### Replay owner identity has one constructor per source

Target creation constructs and reuses Chat `backendId = acp-replay`, `conversationId = <syntheticRootId>-conversation` and Workflow `requestId = <syntheticRootId>-request`. Activation, profiling owner registration, Workspace target projection, drain and cleanup consume that identity instead of reconstructing strings independently.

### Lifecycle evidence records one primary failure

The runner tracks explicit phases: `target-activation`, `workspace-prepare`, `profile`, `replay`, `drain`, and `cleanup`. The first thrown error becomes optional structured `failure`; later cleanup errors become warnings. Drain defaults to `not-run` until entered, so earlier setup failure is not mislabeled. Profiler finish remains finally-safe when profiling began.

### Measurement capture requires executed positive evidence

R1 is captured only when replay completes, applied events are greater than zero, and the semantic counter matches exactly. Setup failure leaves R1/R2/R3 missing or not-run even when default counters are equal. Transport remains `not-applicable`, preserving backend-free semantics and v2 compatibility.

### Replay seam remains build-time cold

Synthetic activation and lease bodies stay behind the existing Debug/Replay source boundary and use release-elidable imports/markers. Production and Replay-disabled diagnostics must report zero bytes for the new markers; production Chat hot paths receive no Replay lookup or branch.

## Risks / Trade-offs

- [A stale cleanup restores an obsolete owner] → Require both activation token and selected synthetic owner match before restoration.
- [Activation partially mutates selection then throws] → Create the lease before publication and unwind it in the same finally-safe target cleanup path.
- [Cleanup error hides the actual setup/replay failure] → Preserve the first phase failure and append cleanup diagnostics as warnings.
- [Workspace restoration and selection restoration race] → Treat them as independent leases and restore each only if it still owns its state.
- [Workspace preload overwrites synthetic foreground] → Skip foreground reconciliation only while the active lease token still owns the exact selected owner; continue refreshing real backend data.
- [Cold init supersedes the forced publication] → Retry the idempotent publication serially until a post-baseline revision is rendered or the existing terminal condition occurs.
- [Tests pass with a fully fake Workspace] → Add a production-shaped Chat target-active test with an empty backend registry and the real selector boundary.
- [Replay code leaks into production] → Extend release diagnostics with stable activation/lease markers and assert zero bytes in both disabled bundles.

## Migration Plan

No persisted data migration is required. Matrix v2 readers treat `failure` as optional, and existing result files remain readable. Rollback removes the Replay-only activation seam and target lifecycle hook without changing production backend state or trace data.

## Open Questions

None.

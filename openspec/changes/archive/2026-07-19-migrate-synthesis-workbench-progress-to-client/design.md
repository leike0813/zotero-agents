## Context

`refreshWorkbenchCommandProgress` still resolves the legacy Synthesis service and calls `getSynthesisBackgroundJobRows`. That service read reaches `activeJobProgressRows`, which currently reconciles persisted `running` operations and can cancel them based on a thirty-minute timestamp threshold. The same mutation can therefore occur during service construction, ordinary Workbench polling, and debug reads. The client foundation already provides grouped, JSON-safe Workbench projections and stable error normalization, but it has no progress-specific capability.

The Workbench depends on 500 ms polling, a concurrency guard, Git Sync chrome composition, cached/runtime projection merge, snapshot locking, transient-error fallback, and command single-flight. This change must preserve those host behaviors while separating query and startup lifecycle ownership.

## Goals / Non-Goals

**Goals:**

- Make every ordinary progress/chrome/debug read side-effect-free.
- Add one narrow Workbench progress client query returning the existing opaque projection shape.
- Route production Workbench polling through that client without changing publication behavior.
- Make explicit startup reconciliation the sole owner of persisted restart-orphan cancellation.
- Preserve the 125-method public service and four-member direct-consumer boundary.

**Non-Goals:**

- Migrate commands, mutations, Host Bridge, MCP, or runtime/storage ownership.
- Add callbacks, streaming, UI DTOs, or full snapshots to the contracts package.
- Remove `getSynthesisBackgroundJobRows` or alter the service migration inventory.
- Introduce live-session timeout-based operation cancellation.

## Decisions

### 1. Add a no-argument opaque Workbench projection read

`SynthesisWorkbenchClient` gains `readProgress(): Promise<SynthesisWorkbenchProjection>`. The in-process adapter calls the existing `getSynthesisBackgroundJobRows()` port, wraps its result as `{ maintenance: { backgroundJobs } }`, and applies the shared JSON normalization and client-error normalization paths.

Alternative: expose background-job row DTOs directly. Rejected because the established Workbench contract intentionally uses opaque JSON-safe region projections and keeps UI-owned DTOs outside the contracts package.

### 2. Keep polling and publication orchestration in the Workbench host

`refreshWorkbenchCommandProgress()` lazily resolves the current default client, awaits `workbench.readProgress()`, converts it through the existing Workbench adapter, merges it into cached chrome and the active runtime snapshot, and publishes cached chrome. Git Sync composition remains a host-local fast path and continues to share the existing cadence and locks.

Alternative: put callbacks or polling cadence in the client. Rejected because scheduling, runtime merge, snapshot locks, and UI publication are host responsibilities rather than query contract semantics.

### 3. Make progress reads pure and startup reconciliation explicit

`activeJobProgressRows`, debug progress reads, and service factory construction stop invoking reconciliation. The thirty-minute stale constant and timestamp comparison are removed. `reconcileSynthesisRuntimeWorkStateOnStartup()` cancels every persisted `running` operation and records the existing restart-orphan diagnostic.

Alternative: retain timeout cancellation for live sessions. Rejected because elapsed time does not prove that an in-process operation is orphaned; only a fresh startup establishes that persisted `running` state cannot belong to the current process.

### 4. Preserve the legacy service boundary during migration

`getSynthesisBackgroundJobRows` remains public and is consumed by the in-process client composition. The service inventory is unchanged, so the public service count remains 125 and direct legacy consumers remain legacy composition, Workbench, Host Bridge, and MCP.

Alternative: remove the service method immediately. Rejected because the migration-time in-process adapter and other recorded consumers still require the legacy port.

## Risks / Trade-offs

- **A client projection merge could drop current chrome state** → Reuse the existing Workbench transport adapter plus cached/runtime merge helpers and cover exact chrome publication behavior.
- **Removing read-time reconciliation could leave an orphan visible until startup completes** → Keep reconciliation in the explicit startup lifecycle and verify it cancels every persisted running row.
- **Polling errors could change user-visible behavior after normalization** → Preserve the existing error fallback and test stable client normalization independently.
- **Static dependency boundaries could regress** → Extend the existing service-boundary and contract checks while retaining the recorded counts.

## Migration Plan

1. Add failing client, Workbench, service-purity, and startup-reconciliation assertions.
2. Remove implicit reconciliation from all ordinary read and construction paths.
3. Add and compose the narrow progress capability, then migrate Workbench polling.
4. Update current-state documentation and run focused through production validation.

Rollback restores the legacy Workbench call and read-time reconciliation code; no persisted schema or data migration is involved.

## Open Questions

None.

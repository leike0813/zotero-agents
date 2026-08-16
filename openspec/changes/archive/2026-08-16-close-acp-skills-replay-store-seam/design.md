## Context

`acpRuntimeReplayTargets` creates ACP Skills replay records with
`prepareSyntheticAcpSkillRunReplay`, writes permission state directly with
`applySyntheticAcpSkillRunReplayPermission`, and removes records with
`cleanupSyntheticAcpSkillRunReplay`. Logical-time replay inspects timers with
`inspectSyntheticAcpSkillRunReplayTimers`.

Production ACP Skills execution already uses `AcpConnectionAdapter` and the
standard permission queue via `handleAcpSkillRunPermissionRequest` and
`resolveAcpSkillRunPermissionRequest`. Replay should use those store-level
seams without taking the full `executeAcpSkillRunnerJob` path.

## Goals / Non-Goals

**Goals:**

- Remove replay vocabulary from `acpSkillRunStore` and
  `acpSkillRunWorkspaceDataPlane` exports.
- Route replay permission request/outcome through the standard permission
  queue.
- Give replay cleanup a generic hard-delete API.
- Rename the timer inspector to describe what it inspects, not who calls it.

**Non-Goals:**

- Introducing a synthetic Skills `AcpConnectionAdapter`.
- Running replay through `executeAcpSkillRunnerJob`, workspace creation, or
  skill materialization.
- Changing ACP Skills transcript update or terminal projection behavior.
- Changing the persisted skill-run record schema.

## Decisions

### Standard permission queue for replay

`permission-request` calls `handleAcpSkillRunPermissionRequest` with the
replayed request and a no-op resolver. `permission-outcome` calls
`resolveAcpSkillRunPermissionRequest` with the recorded outcome. `terminal`
first resolves any pending permission as cancelled, then writes the terminal
state through `upsertAcpSkillRun`.

### Generic hard-delete store API

`acpSkillRunStore` exposes `deleteAcpSkillRunRecords(requestIds)`. It flushes
runtime file writes, deletes persisted and in-memory records, clears selection
for deleted ids, and emits an archive workspace change. Replay cleanup uses
this API; retention and archive semantics are unchanged.

### Replay target owns record creation

`prepareSyntheticAcpSkillRunReplay` is deleted. The replay target keeps a
local `ensureRequest` helper that calls the standard `upsertAcpSkillRun` with
replay identity fields.

### Timer inspector is generic and owned by the workspace data plane

`inspectSyntheticAcpSkillRunReplayTimers` becomes
`inspectAcpSkillRunTimers` in `acpSkillRunWorkspaceDataPlane`. The
`acpSkillRunStore` re-export is removed. Production logical-time ports import
the workspace data plane directly.

## Risks / Trade-offs

- [Standard permission path adds queue behavior] -> Replay now exercises
  auto-approve checks, queue ordering, and resolution events, which is the
  intended coverage.
- [Hard delete bypasses archive] -> The new API is only used by replay
  cleanup; archive and retention keep their own paths.
- [Timer inspector rename touches release-elision manifest] -> The manifest
  markers are updated in the same change; this may clear the pre-existing
  replay-disabled bundle marker failure.

## Migration Plan

1. Add failing replay permission-queue tests and switch existing tests to the
   generic timer/cleanup seams.
2. Implement `deleteAcpSkillRunRecords`, rename the timer inspector, and
   migrate the replay target and production ports.
3. Delete the four replay-specific exports.
4. Update specs and the runtime diagnostics manifest, then run focused tests,
   type checks, and lint.

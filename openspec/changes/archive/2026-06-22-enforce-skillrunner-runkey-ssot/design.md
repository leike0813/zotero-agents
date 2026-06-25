# Design

## RunKey SSOT

`SkillRunnerRunStore.runKey` is the only UI identity for SkillRunner runs. `requestId`, `localRunId`, `taskId`, and sequence fields remain available as display and backend-protocol metadata, but UI selection, focus, open, archive, and dashboard jump actions must not derive identity from them.

`requestId` remains the backend identity for a run that has reached the backend. A pre-request run may have `runKey` without `requestId`, but once `requestId` exists, the pair `(backendId, requestId)` must map to exactly one projectable `runKey`. A second projectable `runKey` for the same backend request is treated as a store invariant violation, not as a normal merge or fallback-resolution case.

## Projection Contract

SkillRunner lightweight projections carry `runKey` without reading full run payloads. The persisted projection row key already uses `runKey`; the projection read path will restore/verify `WorkflowTaskRecord.runKey` from that row key.

## UI Model Contract

SkillRunner panel rows use `runKey` as `RunWorkspaceTaskItem.key`. Rows without `runKey` are not selectable and are excluded from the SkillRunner panel. Selected exact supplement is by `runKey` only.

## Focus Contract

Submit-time focus receives the `runKey` returned by task/run-store upsert. Interactive sidebar open performs focus regardless of whether sidebar activation created a new pane or reused an existing one.

## Cleanup

UI-side identity indexes, request/local/task/sequence resolver logic, and source tests asserting those legacy paths are removed.

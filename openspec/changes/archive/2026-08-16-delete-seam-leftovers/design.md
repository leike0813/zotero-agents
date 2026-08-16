## Context

`runConcurrency`, `resultEnvelope`, and `requestMeta` each expose one
entry point that duplicates or exposes an internal concept.

## Decisions

### Apply the deletion test

Delete the export when deleting it would not move complexity into callers.

- `isBackendBatchFullParallelProvider`: keep as a private helper in
  `runConcurrency`.
- `canonicalizeWorkflowResultJson`: remove the alias; `resultContext` imports
  `unwrapSkillRunnerResultJson`.
- `resolveInputUnitLabelFromRequest`: remove the alias; duplicate-guard and
  run-seam call `resolveTaskNameFromRequest`.

## Risks / Trade-offs

None. The three removals are behavior-preserving interface reductions.

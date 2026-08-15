## Why

Workflow terminal interpretation is split between the run and apply seams. The
run seam imports a helper owned by the apply seam, then re-derives queue,
sequence, SkillRunner, and ACP fallbacks around it. This weakens locality,
leaves the two consumers vulnerable to semantic drift, and can leave terminal
observation waiting forever when an expected queue job is missing.

## What Changes

- Introduce one synchronous, read-only Workflow Job Terminal Resolution module
  shared by the run and apply seams.
- Resolve missing, pending, local-ready, and canonical-ready states from queue,
  sequence-root, SkillRunner, ACP, and apply evidence without accepting a
  caller-supplied request-id override.
- Preserve lifecycle-store write ownership, apply reduction, subscriptions,
  cleanup, and submission-slot status sampling in their current modules.
- Settle terminal observation for a missing queue job so the apply seam can
  report the existing explicit job-missing failure instead of waiting forever.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Require one terminal-resolution seam and define
  its evidence priority, readiness classes, and missing-job liveness behavior.

## Impact

- Adds a focused module under `src/modules/workflowExecution` and injects its
  resolver into the run and apply seams.
- Reuses the existing workflow-execution seam test suite for the resolution
  decision table and caller integration coverage.
- Updates the workflow execution architecture document and project glossary.
- Does not change persistence formats, lifecycle-store write ownership,
  workflow manifests, provider protocols, or subscription ownership.

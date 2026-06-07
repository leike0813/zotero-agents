## Why

Topic synthesis and similar long-running workflows need to split one logical
workflow into multiple skill runs while preserving a shared run workspace.
The existing `skillrunner.job.v1` request contract only describes one skill run
and the workflow runtime enqueues requests as independent jobs, so it cannot
represent ordered handoffs or downstream workspace reuse.

## What Changes

- Add `skillrunner.sequence.v1` as a workflow-facing request kind for ordered
  multi-skill execution.
- Limit first-phase sequence execution to ACP backends.
- Add step workspace intent so downstream ACP skill runs can reuse the
  workflow workspace.
- Add declarative handoff passthrough and field mapping between sequence steps.
- Ensure only the declared final step reaches workflow `applyResult`.

## Impact

- Affected areas: workflow manifest schema, declarative request compiler,
  workflow execution seam, ACP skill run workspace allocation, provider request
  contracts, and focused tests.
- Existing `skillrunner.job.v1` workflows and current topic synthesis workflow
  entry points remain unchanged.

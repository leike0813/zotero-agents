# Enable Sequence Step Apply

## Why

`skillrunner.sequence.v1` currently applies workflow outputs only after the
final sequence step succeeds. Cascaded workflows can therefore lose useful
artifacts from successful upstream skills when a later skill fails before final
apply.

## What Changes

- Allow sequence steps to opt in to running a workflow `applyResult` immediately
  after that step succeeds.
- Keep step apply explicit per step; existing sequence workflows keep current
  behavior unless they declare `apply_result`.
- Record step apply status in sequence state and sequence run results.
- Update literature workbench cascades so literature-analysis and
  literature-deep-reading apply each successful skill output independently.

## Impact

- Workflow authors get an explicit step-level apply contract for sequence
  workflows.
- Runtime recovery can skip already applied steps and continue from the stored
  sequence state.
- Final workflow apply skips results already owned by the final sequence step.

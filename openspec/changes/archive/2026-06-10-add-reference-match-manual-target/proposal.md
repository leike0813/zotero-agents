# Add Reference Match Manual Target

## Why

Reference Matching review currently supports accepting the proposed target,
reverse-accepting canonical merge proposals, or rejecting the proposal. This is
not enough when the matcher found the wrong target but the user can identify the
correct one from the library or canonical reference set.

## What Changes

- Add a `Manual target` action to open Reference Matching proposals.
- Let users choose a legal target through a bounded popover with alphabetic
  navigation instead of a simple dropdown.
- Preserve the existing pending decision and `Apply pending` workflow.
- Add `manual_target` decision payload support in the Workbench host bridge and
  Synthesis service.
- Store manually retargeted proposals as `retargeted`, while creating accepted
  audit proposals and accepted binding or canonical redirect facts.
- Keep the readonly UI harness non-mutating by logging manual target actions as
  blocked DB writes.

## Impact

- Changes Synthesis Workbench UI, snapshot input, review action payloads, and
  Synthesis reference matching service behavior.
- Does not run the matcher, rebuild indexes, or introduce a new dependency.
- Chinese and non-Latin candidate titles are grouped under `#` in the picker.

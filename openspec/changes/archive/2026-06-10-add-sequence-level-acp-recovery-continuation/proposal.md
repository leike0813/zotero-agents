# Change: Add Sequence-Level ACP Recovery Continuation

## Why

`skillrunner.sequence.v1` currently executes ACP steps serially while the local
workflow loop is alive. If a non-final ACP step disconnects, is recovered, and
then succeeds, Host treats the recovered run as an isolated skill run. It cannot
identify the parent sequence state and therefore cannot launch downstream
steps. Final-step recovery can apply because the ACP run record stores the
parent workflow id, but middle-step recovery cannot continue the sequence.

## What Changes

- Add a formal state machine document for ACP sequence recovery.
- Persist Host-only sequence state for `skillrunner.sequence.v1` runs.
- Store sequence step metadata on ACP skill run records.
- Let sequence runtime return deferred state instead of failing when a step is
  recoverable.
- Route recovered non-final step success into sequence continuation.
- Keep recovered final step success on the existing workflow apply path.

## Impact

This change only affects Host orchestration and recovery. It does not alter
skill contracts, skill payloads, workspace files, final candidates, or workflow
manifest shape.

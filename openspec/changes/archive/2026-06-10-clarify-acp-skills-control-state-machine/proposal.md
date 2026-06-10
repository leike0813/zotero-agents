# Change: Clarify ACP Skills Control State Machine

## Why

ACP Skills currently conflates several user controls in places: stopping the
current prompt turn, disconnecting the ACP connection, and canceling the whole
task. This allows text returned after a prompt turn was canceled to flow into
output validation and repair.

## What Changes

- Add an ACP Skills state machine SSOT document.
- Clarify the control semantics through delta specs.
- Update the sequence recovery state machine document to reference the ACP
  Skills control semantics.
- Short-circuit output convergence after current-turn cancel or disconnect.
- Keep terminal task cancellation as the only user action that marks a run
  `canceled` and stops sequence continuation.

## Impact

This change does not modify skill contracts, payloads, workspace files, final
result schemas, or workflow manifest shape.

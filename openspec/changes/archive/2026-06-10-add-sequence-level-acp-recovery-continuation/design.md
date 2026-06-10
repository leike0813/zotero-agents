# Design: Sequence-Level ACP Recovery Continuation

## Host-Owned State

Sequence continuation state is stored in the Host plugin task context store
under a dedicated workflow sequence domain. The state contains the original
sequence request, parent workflow metadata, backend id, provider options,
current step index, step request ids, completed step outputs, and terminal
status.

No state is written into the ACP run workspace. The workspace remains owned by
the skill execution contract.

## Step Metadata

ACP step run records carry:

- `workflowId`: parent workflow id.
- `skillId`: current step skill id.
- `sequenceStepId`: sequence step id.
- `sequenceFinalStepId`: declared final step id.

This lets recovery distinguish final-step apply from middle-step continuation
without putting workflow metadata into skill-facing request payloads.

## Runtime Behavior

The sequence runtime records state before each step launch and records the ACP
`requestId` when the provider emits `request-created`. A deferred step moves
the sequence to `waiting_recovery` and returns the deferred provider result to
the queue. Failed or canceled steps mark the sequence terminal and do not start
downstream steps.

## Recovery Behavior

After recovered output validates:

- Final step: run existing workflow apply using the parent workflow id stored in
  the ACP run record.
- Non-final step: locate sequence state by step `requestId`, record the
  recovered output, rebuild handoff context from completed step outputs, and
  continue from the next step.

If a recovered non-final step has no sequence state, Host returns a clear error
instead of trying to infer or fabricate downstream orchestration.

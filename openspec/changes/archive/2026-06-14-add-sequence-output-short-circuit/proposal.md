# Change: Add Sequence Output Short Circuit

## Why

Split ACP workflows can produce a valid business terminal result before the
declared final step. Topic synthesis prepare can detect duplicate create topics
or invalid update targets and return a canceled business result, but the current
`skillrunner.sequence.v1` runtime still launches downstream steps because it
only treats provider failure, provider cancel, or deferred state as terminal.

## What Changes

- Add an optional step-level `short_circuit` declaration to
  `skillrunner.sequence.v1`.
- When a successful step output matches the declared path/value rule, terminate
  the sequence as completed and use that step output as the workflow result.
- Wire create/update topic synthesis prepare steps to short-circuit on
  `status = "canceled"`.

## Impact

This does not change ACP task cancellation, provider failures, deferred
recovery, or normal final-step apply behavior. Short-circuit is a business
terminal result, not a provider-level canceled run.

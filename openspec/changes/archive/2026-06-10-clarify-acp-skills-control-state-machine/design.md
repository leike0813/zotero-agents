# Design: ACP Skills Control State Machine

## Control Semantics

ACP Skills treats current-turn cancel, disconnect, and task cancel as separate
operations.

- Current-turn cancel calls the active ACP session cancel primitive and keeps
  the local run recoverable.
- Disconnect first stops an active prompt turn, then detaches the local ACP
  connection and keeps the run recoverable.
- Task cancel stops the active prompt turn, detaches the connection, marks the
  run `canceled`, and prevents sequence continuation.

## Runtime Guard

The ACP runner checks whether a prompt turn was stopped immediately after
`promptExistingSession()` returns. If so, it returns an interrupted or
disconnected provider response and skips output convergence, result-file
fallback, and repair.

## Documentation

`doc/acp-skills-state-machine-ssot.md` owns ACP Skills control semantics.
`doc/skillrunner-sequence-recovery-state-machine.md` references it for
sequence-step cancel/disconnect interpretation.

## Why

ACP Skills currently publishes `connected` before the adapter has initialized and attached a real ACP session. Several startup boundaries can wait forever, and task cancellation waits for backend cleanup before publishing a terminal run state. A stalled transport, initialize request, session request, or runtime configuration can therefore occupy a Host queue slot indefinitely, retain the duplicate-submission identity, and leave the UI unable to converge.

The same lifecycle gap affects sequence workflows: a terminal ACP child run can remain hidden behind a still-pending provider promise, so the parent sequence and Host submission do not settle.

## What Changes

- Bound every ACP startup phase independently to 60 seconds and make each phase cancellation-aware.
- Publish `connected` only after initialize, session attach/new, and initial runtime configuration complete.
- Make adapter close own startup cancellation and dispose resources that arrive after cancellation or timeout.
- Publish task-cancel terminal state before bounded backend cleanup, while keeping disconnect recoverable and non-terminal.
- Propagate ACP terminal state through sequence, terminal-observer, apply, and Host admission seams.
- Cover stalled startup, Windows bridge spawn, npx lease, cleanup, recovery, sequence, and queue settlement races in existing test suites.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-skills-interactive-execution`: setup ownership, connected readiness, and cancellation convergence.
- `acp-skillrunner-compatible-runner`: controller replacement, identity-safe cleanup, and bounded cancellation.
- `acp-skills-session-recovery`: recovery setup uses the same readiness and cancellation gate.
- `acp-windows-websocket-bridge`: pre-spawn cancellation and timeout behavior.
- `workflow-host-queue-management`: canceled ACP units release slots and submission identity exactly once.
- `workflow-execution-seams`: ACP and sequence terminal facts take precedence over pending provider promises.

## Impact

- Runtime code: ACP adapter/transport/npx startup, ACP run store/orchestrator/recovery, sequence runtime, workflow seams.
- Tests: existing ACP transport, npx cache, compatible runner, concurrent submission, sequence runtime, execution seam, and Host queue suites.
- Documentation: ACP Skills state-machine SSOT.
- No workflow schema, ACP wire protocol, persisted run format, duplicate-guard rule, or user preference changes.

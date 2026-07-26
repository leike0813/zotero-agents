## Why

ACP semantic trace capture currently guesses the recording root from the first observed lifecycle event. That permits implicit prompt/session paths and request-level fallbacks to claim a round, can freeze otherwise valid captures as `mid-turn-start`, and cannot reliably distinguish a selected Chat conversation from the remote session actually being recorded. Workflow capture likewise derives a root from request/job identifiers instead of the canonical top-level workflow execution.

## What Changes

- Replace event-driven root guessing with an explicit recorder control plane: arm, begin a claim attempt, atomically claim a root, record owned activity, and finish only after owned activity drains.
- Bind Chat capture only after an armed, user-initiated Connect/Reconnect succeeds, using backend, conversation, and remote session identity; ignore pre-claim and mismatched-session events.
- Bind ACP Skills capture to the canonical top-level workflow execution and complete it automatically after all concrete ACP requests become terminal.
- Add a deferred `stopping` state, activity registries, stale-attempt invalidation, structured Dashboard binding/progress/notice data, and complete root pairing validation.
- Preserve the existing trace wire schema, persistent ACP Skills run identity, Host Bridge identity, and Assistant Workspace render isolation.

## Capabilities

### Modified Capabilities

- `acp-runtime-semantic-trace`: Make capture binding explicit, session-aware, activity-complete, and root-paired.
- `workflow-execution-runtime`: Propagate canonical top-level workflow execution identity through ordinary and sequence ACP request paths and finish capture at execution idle.
- `acp-skillrunner-compatible-runner`: Keep public run identity unchanged while carrying transient recorder ownership separately.

## Impact

- Debug-only semantic trace recorder DTOs, state machine, trace validation, session adapter context, and Chat session lifecycle.
- Workflow execution seams, sequence dispatch, ACP Skills orchestration/store transient context, and terminal aggregation.
- Dashboard recorder actions/state/localization plus focused recorder, Chat, workflow, UI, replay fixture, release-elision, and documentation coverage.

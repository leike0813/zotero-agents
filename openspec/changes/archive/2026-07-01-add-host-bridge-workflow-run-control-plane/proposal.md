## Why

Host Bridge workflow control currently exposes workflow-level runs without a stable way to address the concrete skill/backend run that needs interaction. Long-running and interactive workflows therefore leave external agents unable to distinguish workflow orchestration state from the active skill run state, cancel a workflow intentionally, or reply/reconnect to ACP skill runs through a stable public handle.

## What Changes

- Add a two-level Host Bridge control model: workflow run handles identify orchestration, and skill run handles identify concrete executable runs.
- Extend workflow run status with lightweight skill run projections, current skill run identity, liveness, actions, and sequence step metadata.
- Add a lightweight active task endpoint for running, waiting, and ACP failed-retriable work.
- Add workflow run cancel intent as a Host Bridge endpoint.
- Add skill run read, reply, and connect endpoints, with reply/connect scoped to explicit skill run handles.
- Add matching `zotero-bridge` CLI commands for workflow cancellation, active tasks, and skill-run interactions.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host-bridge-workflow-control`: Add workflow/skill run handle separation, active tasks, cancel intent, and skill-run interaction endpoints.
- `host-bridge-cli-interface`: Expose the new control-plane endpoints through semantic CLI commands.
- `workflow-execution-runtime`: Ensure sequence step skill runs remain externally traceable through workflow run status.

## Impact

- Host Bridge HTTP routing, workflow control DTOs, task projection, ACP skill run integration, and CLI argument/command handling.
- Tests for Host Bridge API behavior and CLI command contracts.
- Generated Host Bridge surface docs and wrapper skill references.

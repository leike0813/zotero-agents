## Overview

The ACP SkillRunner-compatible run panel is a separate execution observer for workflow jobs, not a chat surface. It consumes host-side run snapshots and task/runtime-log state keyed by `requestId`.

## Design Decisions

- Keep ACP workflow runs out of ACP chat conversation storage.
- Use `requestId` as the primary correlation key across run store, task runtime, runtime logs, workspace, and UI.
- Implement a new lightweight dashboard page rather than extending `acp-chat` or `run-dialog`.
- Add both Dashboard Home and Zotero side-pane entry points.
- Use existing ACP adapter permission behavior; the panel observes and cancels v1 runs but does not provide interactive workflow continuation.

## Data Flow

1. Workflow execution dispatches `skillrunner.job.v1` to `AcpProvider`.
2. The orchestrator creates a workspace and emits `request-created`.
3. The orchestrator updates the ACP skill run store at each major stage.
4. Task Dashboard and the side-pane host build panel snapshots from run store, task runtime, and runtime logs.
5. `acp-skill-run.js` renders snapshots and sends actions back through postMessage.

## UI Model

The panel shows:

- Run list with status and timestamps.
- Selected run details: workspace, backend, workflow/job, requestId, agent family, skill roots, uv dependency status, repair rounds, validation status, and result path.
- Timeline/events and correlated runtime logs.
- Actions: cancel run, open workspace, copy requestId/workspace/diagnostics.

## Compatibility

The existing provider result path remains unchanged. The panel observes execution and does not change workflow request/result semantics.

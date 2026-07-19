# Workflows And Runs

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge run active`

List lightweight active workflow runtime tasks

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/tasks/active`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run active when the required operation is: List lightweight active workflow runtime tasks.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run active when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.
- run notification ack: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run active`.
- Example: `zotero-bridge run active`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/tasks/active.
- Completion evidence:
- The structured run active result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run cancel`

Request cancellation of a workflow run

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/workflows/runs/{workflowRunId}/cancel`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run cancel when the required operation is: Request cancellation of a workflow run.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run cancel when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.
- run notification ack: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run cancel`.
- Example: `zotero-bridge run cancel 'run-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `run_id` → positional 1 as `RUN_ID` (required, takes a value).
- `reason` → option `--reason` (optional, takes a value).
- `message` → option `--message` (optional, takes a value).
- CLI invocation fields:
- `run_id` (string): Workflow run id
- `reason` (string): Optional cancellation reason
- `message` (string): Optional cancellation message
- Decoded payload fields:
- `run_id` (string): Workflow run id
- `reason` (string): Optional cancellation reason
- `message` (string): Optional cancellation message

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/workflows/runs/{workflowRunId}/cancel.
- Completion evidence:
- The structured run cancel result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `workflow-control`: May change workflow control state. stateChanged=true.
- consume `workflowRunId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run get`

Read one workflow run status

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/workflows/runs/{workflowRunId}`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run get when the required operation is: Read one workflow run status.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.
- run notification ack: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run get`.
- Example: `zotero-bridge run get 'run-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `run_id` → positional 1 as `RUN_ID` (required, takes a value).
- CLI invocation fields:
- `run_id` (string): Workflow run id
- Decoded payload fields:
- `run_id` (string): Workflow run id

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/workflows/runs/{workflowRunId}.
- `skillRunId` (string)
- Completion evidence:
- The structured run get result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- consume `workflowRunId` (caller-owned): Required by the command invocation.
- produce `skillRunId` (response): Returned when the corresponding operation succeeds.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run list`

List active and recent workflow runtime tasks

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/tasks`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run list when the required operation is: List active and recent workflow runtime tasks.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run notification ack: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run list`.
- Example: `zotero-bridge run list`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (optional, takes a value).
- `backend` → option `--backend` (optional, takes a value).
- `backend-type` → option `--backend-type` (optional, takes a value).
- `request` → option `--request` (optional, takes a value).
- `run` → option `--run` (optional, takes a value).
- `state` → option `--state` (optional, takes a value).
- `active-only` → option `--active-only` (optional, flag).
- CLI invocation fields:
- `workflow` (string): Filter by workflow id
- `backend` (string): Filter by backend id
- `backend-type` (string): Filter by backend type
- `request` (string): Filter by provider request id
- `run` (string): Filter by workflow run id
- `state` (string): Filter by task state
- `active-only` (boolean): Only return active task runtime rows
- Decoded payload fields:
- `workflow` (string): Filter by workflow id
- `backend` (string): Filter by backend id
- `backend_type` (string): Filter by backend type
- `request` (string): Filter by provider request id
- `run` (string): Filter by workflow run id
- `state` (string): Filter by task state

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/tasks.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured run list result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run notification ack`

Acknowledge workflow notification inbox events

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/notifications/ack`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run notification ack when the required operation is: Acknowledge workflow notification inbox events.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run notification ack when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run notification ack`.
- Example: `zotero-bridge run notification ack --event 'event'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `event` → option `--event` (required, takes a value).
- `client-id` → option `--client-id` (optional, takes a value).
- CLI invocation fields:
- `event` (string): Notification event id
- `client-id` (string): Best-effort Host Bridge notification client id
- Decoded payload fields:
- `event` (string): Notification event id
- `client_id` (string): Best-effort Host Bridge notification client id

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/notifications/ack.
- Completion evidence:
- The structured run notification ack result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `workflow-control`: May change workflow control state. stateChanged=true.
- consume `eventId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run notification list`

List workflow notification inbox events

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/notifications`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run notification list when the required operation is: List workflow notification inbox events.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run notification list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run notification list`.
- Example: `zotero-bridge run notification list`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow-run-id` → option `--workflow-run-id` (optional, takes a value).
- `skill-run-id` → option `--skill-run-id` (optional, takes a value).
- `type` → option `--type` (optional, takes a value).
- `since-event-id` → option `--since-event-id` (optional, takes a value).
- `client-id` → option `--client-id` (optional, takes a value).
- `acknowledged` → option `--acknowledged` (optional, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- CLI invocation fields:
- `workflow-run-id` (string): Filter by workflow run id
- `skill-run-id` (string): Filter by concrete skill run id
- `type` (string): Filter by notification type
- `since-event-id` (string): Return events after this event id
- `client-id` (string): Best-effort Host Bridge notification client id
- `acknowledged` (string): Filter by acknowledgement state
- `limit` (string): Maximum number of events to return
- Decoded payload fields:
- `workflow_run_id` (string): Filter by workflow run id
- `skill_run_id` (string): Filter by concrete skill run id
- `type` (string): Filter by notification type
- `since_event_id` (string): Return events after this event id
- `client_id` (string): Best-effort Host Bridge notification client id
- `acknowledged` (string): Filter by acknowledgement state
- `limit` (string): Maximum number of events to return

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/notifications.
- `events` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured run notification list result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run notification wait`

Poll until a workflow notification is available

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/notifications`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run notification wait when the required operation is: Poll until a workflow notification is available.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run notification wait when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run notification wait`.
- Example: `zotero-bridge run notification wait`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow-run-id` → option `--workflow-run-id` (optional, takes a value).
- `skill-run-id` → option `--skill-run-id` (optional, takes a value).
- `type` → option `--type` (optional, takes a value).
- `since-event-id` → option `--since-event-id` (optional, takes a value).
- `client-id` → option `--client-id` (optional, takes a value).
- `acknowledged` → option `--acknowledged` (optional, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- `timeout-ms` → option `--timeout-ms` (optional, takes a value).
- `interval-ms` → option `--interval-ms` (optional, takes a value).
- CLI invocation fields:
- `workflow-run-id` (string): Filter by workflow run id
- `skill-run-id` (string): Filter by concrete skill run id
- `type` (string): Filter by notification type
- `since-event-id` (string): Return events after this event id
- `client-id` (string): Best-effort Host Bridge notification client id
- `acknowledged` (string): Filter by acknowledgement state
- `limit` (string): Maximum number of events to return
- `timeout-ms` (string): Maximum wait time in milliseconds
- `interval-ms` (string): Polling interval in milliseconds
- Decoded payload fields:
- `workflow_run_id` (string): Filter by workflow run id
- `skill_run_id` (string): Filter by concrete skill run id
- `type` (string): Filter by notification type
- `since_event_id` (string): Return events after this event id
- `client_id` (string): Best-effort Host Bridge notification client id
- `acknowledged` (string): Filter by acknowledgement state
- `limit` (string): Maximum number of events to return
- `timeout_ms` (string): Maximum wait time in milliseconds
- `interval_ms` (string): Polling interval in milliseconds

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/notifications.
- `events` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured run notification wait result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run permission get`

Read one Host Bridge permission request

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/permissions/{permissionRequestId}`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run permission get when the required operation is: Read one Host Bridge permission request.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run permission get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run permission get`.
- Example: `zotero-bridge run permission get 'permission-request-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `permission_request_id` → positional 1 as `PERMISSION_REQUEST_ID` (required, takes a value).
- CLI invocation fields:
- `permission_request_id` (string): Permission request id
- Decoded payload fields:
- `permission_request_id` (string): Permission request id

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/permissions/{permissionRequestId}.
- Completion evidence:
- The structured run permission get result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- consume `permissionRequestId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run permission pending`

List pending Host Bridge permission requests

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/permissions/pending`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run permission pending when the required operation is: List pending Host Bridge permission requests.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run permission pending when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run permission pending`.
- Example: `zotero-bridge run permission pending`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/permissions/pending.
- Completion evidence:
- The structured run permission pending result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run recent`

List lightweight recent workflow runtime tasks

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/tasks/recent`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run recent when the required operation is: List lightweight recent workflow runtime tasks.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run recent when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run recent`.
- Example: `zotero-bridge run recent`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (optional, takes a value).
- `backend` → option `--backend` (optional, takes a value).
- `state` → option `--state` (optional, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- CLI invocation fields:
- `workflow` (string): Filter by workflow id
- `backend` (string): Filter by backend id
- `state` (string): Filter by task state
- `limit` (string): Maximum number of tasks
- Decoded payload fields:
- `workflow` (string): Filter by workflow id
- `backend` (string): Filter by backend id
- `state` (string): Filter by task state
- `limit` (string): Maximum number of tasks

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/tasks/recent.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured run recent result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run skill connect`

Connect a recoverable ACP skill run

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/skill-runs/{skillRunId}/connect`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run skill connect when the required operation is: Connect a recoverable ACP skill run.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run skill connect when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run skill connect`.
- Example: `zotero-bridge run skill connect 'skill-run-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `skill_run_id` → positional 1 as `SKILL_RUN_ID` (required, takes a value).
- CLI invocation fields:
- `skill_run_id` (string): Opaque skill run id
- Decoded payload fields:
- `skill_run_id` (string): Opaque skill run id

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/skill-runs/{skillRunId}/connect.
- Completion evidence:
- The structured run skill connect result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `workflow-control`: May change workflow control state. stateChanged=true.
- consume `skillRunId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run skill events`

List lightweight lifecycle events for one skill run

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/skill-runs/{skillRunId}/events`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run skill events when the required operation is: List lightweight lifecycle events for one skill run.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run skill events when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run skill events`.
- Example: `zotero-bridge run skill events 'skill-run-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `skill_run_id` → positional 1 as `SKILL_RUN_ID` (required, takes a value).
- `since-updated-at` → option `--since-updated-at` (optional, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- CLI invocation fields:
- `skill_run_id` (string): Opaque skill run id
- `since-updated-at` (string): Return events after this updatedAt timestamp
- `limit` (string): Maximum number of events
- Decoded payload fields:
- `skill_run_id` (string): Opaque skill run id
- `since_updated_at` (string): Return events after this updatedAt timestamp
- `limit` (string): Maximum number of events

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/skill-runs/{skillRunId}/events.
- `events` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured run skill events result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run skill get`

Read one concrete skill run

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/skill-runs/{skillRunId}`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run skill get when the required operation is: Read one concrete skill run.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run skill get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run skill get`.
- Example: `zotero-bridge run skill get 'skill-run-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `skill_run_id` → positional 1 as `SKILL_RUN_ID` (required, takes a value).
- CLI invocation fields:
- `skill_run_id` (string): Opaque skill run id
- Decoded payload fields:
- `skill_run_id` (string): Opaque skill run id

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/skill-runs/{skillRunId}.
- Completion evidence:
- The structured run skill get result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- consume `skillRunId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run skill recent`

List recent concrete skill runs

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/skill-runs/recent`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run skill recent when the required operation is: List recent concrete skill runs.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run skill recent when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run skill recent`.
- Example: `zotero-bridge run skill recent`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `state` → option `--state` (optional, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- CLI invocation fields:
- `state` (string): Filter by skill run state
- `limit` (string): Maximum number of skill runs
- Decoded payload fields:
- `state` (string): Filter by skill run state
- `limit` (string): Maximum number of skill runs

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/skill-runs/recent.
- `skillRuns` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured run skill recent result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run skill reply`

Reply to a waiting ACP skill run

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/skill-runs/{skillRunId}/reply`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run skill reply when the required operation is: Reply to a waiting ACP skill run.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run skill reply when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run skill reply`.
- Example: `zotero-bridge run skill reply 'skill-run-id' --message 'message'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `skill_run_id` → positional 1 as `SKILL_RUN_ID` (required, takes a value).
- `message` → option `--message` (required, takes a value).
- CLI invocation fields:
- `skill_run_id` (string): Opaque skill run id
- `message` (string): Reply message
- Decoded payload fields:
- `skill_run_id` (string): Opaque skill run id
- `message` (string): Reply message

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/skill-runs/{skillRunId}/reply.
- Completion evidence:
- The structured run skill reply result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `workflow-control`: May change workflow control state. stateChanged=true.
- consume `skillRunId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge run workflow recent`

List recent workflow runs

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/workflows/runs`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use run workflow recent when the required operation is: List recent workflow runs.
- A returned runtime handle or lifecycle event must be monitored or acted on.

Avoid when:
- Do not use run workflow recent when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not substitute workflowRunId, skillRunId, permissionRequestId, or eventId for one another.

Distinguish from:
- run active: choose it only when its narrower result matches the task.
- run cancel: choose it only when its narrower result matches the task.
- run get: choose it only when its narrower result matches the task.
- run list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge run workflow recent`.
- Example: `zotero-bridge run workflow recent --workflow 'workflow'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (required, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- CLI invocation fields:
- `workflow` (string): Workflow id
- `limit` (string): Maximum number of runs
- Decoded payload fields:
- `workflow` (string): Workflow id
- `limit` (string): Maximum number of runs

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/workflows/runs.
- `runs` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured run workflow recent result and the exact invocation inputs used to obtain it.
- current lifecycle state and the exact runtime handle used

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow agent-apply`

Apply finalized self-owned agent workflow result bundles

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow agent-apply when the required operation is: Apply finalized self-owned agent workflow result bundles.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow agent-apply when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply-status: choose it only when its narrower result matches the task.
- workflow agent-run: choose it only when its narrower result matches the task.
- workflow describe: choose it only when its narrower result matches the task.
- workflow list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow agent-apply`.
- Example: `zotero-bridge workflow agent-apply 'agent-run-id' --result 'result'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `agent_run_id` → positional 1 as `AGENT_RUN_ID` (required, takes a value).
- `result` → option `--result` (required, takes a value).
- CLI invocation fields:
- `agent_run_id` (string): Agent run id returned by workflow agent-run
- `result` (string): Apply-back result mapping. Repeat for multiple request bundles.
- Decoded payload fields:
- `agent_run_id` (string): Agent run id returned by workflow agent-run
- `result` (string): Apply-back result mapping. Repeat for multiple request bundles.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply.
- `applyReceipt` (string)
- Completion evidence:
- The structured workflow agent-apply result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt
- apply receipt and per-request applied or failed state

### Approval, effects, and handles

- Approval: `conditional` at `apply-back`; Each result request is preflighted before any approval or handle consumption.
- Effect `workflow-control`: May change workflow control state. stateChanged=true.
- consume `agentRunId` (one-shot): Required by the command invocation.
- consume `agentRequestId` (caller-owned): Required by the command invocation.
- produce `applyReceipt` (response): Returned when the corresponding operation succeeds.

### Failure and recovery

- Apply-back fails after preflight or may have partially written results. Read the persisted per-request apply receipt before retrying any result. Next: `workflow agent-apply-status`. Requires: `agentRunId`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow agent-apply-status`

Read the auditable apply-back receipt for an agent run

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow agent-apply-status when the required operation is: Read the auditable apply-back receipt for an agent run.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow agent-apply-status when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply: choose it only when its narrower result matches the task.
- workflow agent-run: choose it only when its narrower result matches the task.
- workflow describe: choose it only when its narrower result matches the task.
- workflow list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow agent-apply-status`.
- Example: `zotero-bridge workflow agent-apply-status 'agent-run-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `agent_run_id` → positional 1 as `AGENT_RUN_ID` (required, takes a value).
- CLI invocation fields:
- `agent_run_id` (string): Agent run id returned by workflow agent-run
- Decoded payload fields:
- `agent_run_id` (string): Agent run id returned by workflow agent-run

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply.
- `applyReceipt` (string)
- Completion evidence:
- The structured workflow agent-apply-status result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- consume `agentRunId` (caller-owned): Required to read persisted apply status; the read does not consume it.
- produce `applyReceipt` (response): Returned when the corresponding operation succeeds.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow agent-run`

Prepare a self-owned agent workflow handoff bundle

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/workflows/agent-run`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow agent-run when the required operation is: Prepare a self-owned agent workflow handoff bundle.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow agent-run when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply: choose it only when its narrower result matches the task.
- workflow agent-apply-status: choose it only when its narrower result matches the task.
- workflow describe: choose it only when its narrower result matches the task.
- workflow list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow agent-run`.
- Example: `zotero-bridge workflow agent-run --workflow 'workflow'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (required, takes a value).
- `selection` → option `--selection` (optional, takes a value).
- `none` → option `--none` (optional, flag).
- `output-dir` → option `--output-dir` (optional, takes a value).
- CLI invocation fields:
- `workflow` (string): Workflow id to prepare for self-owned agent execution
- `selection` (string): Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin
- `none` (boolean): Prepare a no-selection workflow
- `output-dir` (string): Download the handoff zip into this directory
- Decoded payload fields:
- `workflow` (string): Workflow id to prepare for self-owned agent execution
- `selection` (string): Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin
- `output_dir` (string): Download the handoff zip into this directory

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/workflows/agent-run.
- `agentRunId` (string)
- `agentRequestId` (string)
- `fileId` (string)
- Completion evidence:
- The structured workflow agent-run result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt
- executionModes.agentOwned, agentRunId, agentRequestIds, and verified bundles

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `workflow-control`: May change workflow control state. stateChanged=true.
- consume `itemRef` (caller-owned): Required only for an explicit --selection input; --none carries no itemRef.
- produce `agentRunId` (one-shot): Returned when the corresponding operation succeeds.
- produce `agentRequestId` (response): Returned when the corresponding operation succeeds.
- produce `fileId` (short-lived): Returned when the corresponding operation succeeds.

### Failure and recovery

- Handoff preparation fails or its response is uncertain. Inspect the structured error; do not enter the Host-owned run plane. Next: `workflow describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow describe`

Describe workflow selection, option, and provider profile requirements

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/workflows/describe`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow describe when the required operation is: Describe workflow selection, option, and provider profile requirements.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow describe when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply: choose it only when its narrower result matches the task.
- workflow agent-apply-status: choose it only when its narrower result matches the task.
- workflow agent-run: choose it only when its narrower result matches the task.
- workflow list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow describe`.
- Example: `zotero-bridge workflow describe --workflow 'workflow'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (required, takes a value).
- `workflow-options` → option `--workflow-options` (optional, takes a value).
- `provider-profile` → option `--provider-profile` (optional, takes a value).
- CLI invocation fields:
- `workflow` (string): Workflow id to describe
- `workflow-options` (string): Draft workflow options JSON object, file path, @file, or '-' for stdin
- `provider-profile` (string): Draft provider profile JSON object with backendId and providerOptions
- Decoded payload fields:
- `workflow` (string): Workflow id to describe
- `workflow_options` (string): Draft workflow options JSON object, file path, @file, or '-' for stdin
- `provider_profile` (string): Draft provider profile JSON object with backendId and providerOptions

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/workflows/describe.
- Completion evidence:
- The structured workflow describe result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow list`

List loaded workflows

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/workflows`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow list when the required operation is: List loaded workflows.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply: choose it only when its narrower result matches the task.
- workflow agent-apply-status: choose it only when its narrower result matches the task.
- workflow agent-run: choose it only when its narrower result matches the task.
- workflow describe: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow list`.
- Example: `zotero-bridge workflow list`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/workflows.
- Completion evidence:
- The structured workflow list result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow requirements`

Read workflow requirements

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/workflows/requirements`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow requirements when the required operation is: Read workflow requirements.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow requirements when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply: choose it only when its narrower result matches the task.
- workflow agent-apply-status: choose it only when its narrower result matches the task.
- workflow agent-run: choose it only when its narrower result matches the task.
- workflow describe: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow requirements`.
- Example: `zotero-bridge workflow requirements`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (optional, takes a value).
- `legacy_workflow` → positional 1 as `LEGACY_WORKFLOW` (optional, takes a value).
- CLI invocation fields:
- `workflow` (string): Workflow id
- `legacy_workflow` (string)
- Decoded payload fields:
- `workflow` (string): Workflow id
- `legacy_workflow` (string)

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/workflows/requirements.
- Completion evidence:
- The structured workflow requirements result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow submit`

Submit a workflow with explicit JSON input

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/workflows/submit`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow submit when the required operation is: Submit a workflow with explicit JSON input.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow submit when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply: choose it only when its narrower result matches the task.
- workflow agent-apply-status: choose it only when its narrower result matches the task.
- workflow agent-run: choose it only when its narrower result matches the task.
- workflow describe: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow submit`.
- Example: `zotero-bridge workflow submit --workflow 'workflow'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (required, takes a value).
- `selection` → option `--selection` (optional, takes a value).
- `none` → option `--none` (optional, flag).
- `workflow-options` → option `--workflow-options` (optional, takes a value).
- `provider-profile` → option `--provider-profile` (optional, takes a value).
- CLI invocation fields:
- `workflow` (string): Workflow id to submit
- `selection` (string): Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin
- `none` (boolean): Submit a no-selection workflow
- `workflow-options` (string): Workflow options JSON object, file path, @file, or '-' for stdin
- `provider-profile` (string): Provider profile JSON object with backendId and providerOptions
- Decoded payload fields:
- `workflow` (string): Workflow id to submit
- `selection` (string): Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin
- `workflow_options` (string): Workflow options JSON object, file path, @file, or '-' for stdin
- `provider_profile` (string): Provider profile JSON object with backendId and providerOptions

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/workflows/submit.
- `workflowRunId` (string)
- Completion evidence:
- The structured workflow submit result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt
- executionModes.hostOwned and workflowRunId

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `workflow-control`: May change workflow control state. stateChanged=true.
- consume `itemRef` (caller-owned): Required only for an explicit --selection input; --none carries no itemRef.
- produce `workflowRunId` (response): Returned when the corresponding operation succeeds.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge workflow validate`

Validate workflow input without starting execution

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/workflows/validate`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use workflow validate when the required operation is: Validate workflow input without starting execution.
- The task is reusable multi-step behavior governed by a workflow contract.

Avoid when:
- Do not use workflow validate when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use agent-run for workflows that require Host-owned options or provider profiles.

Distinguish from:
- workflow agent-apply: choose it only when its narrower result matches the task.
- workflow agent-apply-status: choose it only when its narrower result matches the task.
- workflow agent-run: choose it only when its narrower result matches the task.
- workflow describe: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge workflow validate`.
- Example: `zotero-bridge workflow validate --workflow 'workflow'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow` → option `--workflow` (required, takes a value).
- `selection` → option `--selection` (optional, takes a value).
- `none` → option `--none` (optional, flag).
- `workflow-options` → option `--workflow-options` (optional, takes a value).
- `provider-profile` → option `--provider-profile` (optional, takes a value).
- CLI invocation fields:
- `workflow` (string): Workflow id to submit
- `selection` (string): Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin
- `none` (boolean): Submit a no-selection workflow
- `workflow-options` (string): Workflow options JSON object, file path, @file, or '-' for stdin
- `provider-profile` (string): Provider profile JSON object with backendId and providerOptions
- Decoded payload fields:
- `workflow` (string): Workflow id to submit
- `selection` (string): Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin
- `workflow_options` (string): Workflow options JSON object, file path, @file, or '-' for stdin
- `provider_profile` (string): Provider profile JSON object with backendId and providerOptions

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/workflows/validate.
- Completion evidence:
- The structured workflow validate result and the exact invocation inputs used to obtain it.
- executionModes, validation result, workflowRunId, agentRunId, or apply receipt

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

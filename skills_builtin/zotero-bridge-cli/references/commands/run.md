# Zotero Bridge CLI Run Commands

Use this generated reference for `run` commands after selecting the exact canonical operation.

## `zotero-bridge run active`

List lightweight active workflow runtime tasks

- Argv: `["run","active"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/active"}]`.
- Aliases: `run active`, `run`, `active`.
- Intent search: `visible`.

## `zotero-bridge run cancel`

Request cancellation of a workflow run

- Argv: `["run","cancel"]`.
- Argv bindings: `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]},{"property":"reason","kind":"option","token":"--reason","takesValue":true,"required":false,"valueNames":["REASON"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":false,"valueNames":["MESSAGE"]}]`.
- Invocation schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/runs/{workflowRunId}/cancel"}]`.
- Aliases: `run cancel`, `run`, `cancel`, `run_id`, `RUN_ID`, `reason`, `REASON`, `message`, `MESSAGE`.
- Intent search: `visible`.

## `zotero-bridge run get`

Read one workflow run status

- Argv: `["run","get"]`.
- Argv bindings: `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"skillRunId":{"type":"string"}},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"skillRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs/{workflowRunId}"}]`.
- Aliases: `run get`, `run`, `get`, `run_id`, `RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge run list`

List active and recent workflow runtime tasks

- Argv: `["run","list"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"backend-type","kind":"option","token":"--backend-type","takesValue":true,"required":false,"valueNames":["BACKEND_TYPE"]},{"property":"request","kind":"option","token":"--request","takesValue":true,"required":false,"valueNames":["REQUEST"]},{"property":"submission","kind":"option","token":"--submission","takesValue":true,"required":false,"valueNames":["SUBMISSION"]},{"property":"run","kind":"option","token":"--run","takesValue":true,"required":false,"valueNames":["RUN"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"active-only","kind":"option","token":"--active-only","takesValue":false,"required":false,"valueNames":["ACTIVE_ONLY"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend-type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"submission":{"type":"string","description":"Filter by native workflow submission id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"},"active-only":{"type":"boolean","description":"Only return active task runtime rows"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend_type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"submission":{"type":"string","description":"Filter by native workflow submission id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/tasks"}]`.
- Aliases: `run list`, `run`, `list`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `backend_type`, `backend-type`, `BACKEND_TYPE`, `request`, `REQUEST`, `submission`, `SUBMISSION`, `RUN`, `state`, `STATE`, `active_only`, `active-only`, `ACTIVE_ONLY`.
- Intent search: `visible`.

## `zotero-bridge run notification ack`

Acknowledge workflow notification inbox events

- Argv: `["run","notification","ack"]`.
- Argv bindings: `[{"property":"event","kind":"option","token":"--event","takesValue":true,"required":true,"valueNames":["EVENTS"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"event":{"type":"array","items":{"type":"string"},"description":"Notification event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":["event"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"event":{"type":"string","description":"Notification event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"eventId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/notifications/ack"}]`.
- Aliases: `run notification ack`, `run`, `notification`, `ack`, `events`, `event`, `EVENTS`, `client_id`, `client-id`, `CLIENT_ID`.
- Intent search: `visible`.

## `zotero-bridge run notification list`

List workflow notification inbox events

- Argv: `["run","notification","list"]`.
- Argv bindings: `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- Aliases: `run notification list`, `run`, `notification`, `list`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run notification wait`

Poll until a workflow notification is available

- Argv: `["run","notification","wait"]`.
- Argv bindings: `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"timeout-ms","kind":"option","token":"--timeout-ms","takesValue":true,"required":false,"valueNames":["TIMEOUT_MS"]},{"property":"interval-ms","kind":"option","token":"--interval-ms","takesValue":true,"required":false,"valueNames":["INTERVAL_MS"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout-ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval-ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout_ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval_ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- Aliases: `run notification wait`, `run`, `notification`, `wait`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`, `timeout_ms`, `timeout-ms`, `TIMEOUT_MS`, `interval_ms`, `interval-ms`, `INTERVAL_MS`.
- Intent search: `visible`.

## `zotero-bridge run permission get`

Read one Zotero-side permission request

- Argv: `["run","permission","get"]`.
- Argv bindings: `[{"property":"permission_request_id","kind":"positional","token":"PERMISSION_REQUEST_ID","position":1,"takesValue":true,"required":true,"valueNames":["PERMISSION_REQUEST_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id","position":1}},"required":["permission_request_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"permissionRequestId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/{permissionRequestId}"}]`.
- Aliases: `run permission get`, `run`, `permission`, `get`, `permission_request_id`, `PERMISSION_REQUEST_ID`.
- Intent search: `visible`.

## `zotero-bridge run permission pending`

List pending Zotero-side permission requests

- Argv: `["run","permission","pending"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/pending"}]`.
- Aliases: `run permission pending`, `run`, `permission`, `pending`.
- Intent search: `visible`.

## `zotero-bridge run recent`

List lightweight recent workflow runtime tasks

- Argv: `["run","recent"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/recent"}]`.
- Aliases: `run recent`, `run`, `recent`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run skill connect`

Connect a recoverable ACP skill run

- Argv: `["run","skill","connect"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/connect"}]`.
- Aliases: `run skill connect`, `run`, `skill`, `connect`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge run skill events`

List lightweight lifecycle events for one skill run

- Argv: `["run","skill","events"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"since-updated-at","kind":"option","token":"--since-updated-at","takesValue":true,"required":false,"valueNames":["SINCE_UPDATED_AT"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"since-updated-at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"since_updated_at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"events":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}/events"}]`.
- Aliases: `run skill events`, `run`, `skill`, `events`, `skill_run_id`, `SKILL_RUN_ID`, `since_updated_at`, `since-updated-at`, `SINCE_UPDATED_AT`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run skill get`

Read one concrete skill run

- Argv: `["run","skill","get"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}"}]`.
- Aliases: `run skill get`, `run`, `skill`, `get`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge run skill recent`

List recent concrete skill runs

- Argv: `["run","skill","recent"]`.
- Argv bindings: `[{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"skillRuns":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/recent"}]`.
- Aliases: `run skill recent`, `run`, `skill`, `recent`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run skill reply`

Reply to a waiting ACP skill run

- Argv: `["run","skill","reply"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":true,"valueNames":["MESSAGE"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"message":{"type":"string","description":"Reply message"}},"required":["skill_run_id","message"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"message":{"type":"string","description":"Reply message"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/reply"}]`.
- Aliases: `run skill reply`, `run`, `skill`, `reply`, `skill_run_id`, `SKILL_RUN_ID`, `message`, `MESSAGE`.
- Intent search: `visible`.

## `zotero-bridge run workflow recent`

List recent workflow runs

- Argv: `["run","workflow","recent"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":["workflow"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"runs":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs"}]`.
- Aliases: `run workflow recent`, `run`, `workflow`, `recent`, `WORKFLOW`, `limit`, `LIMIT`.
- Intent search: `visible`.

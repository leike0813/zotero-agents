# Zotero Bridge CLI Run 命令

选择准确的规范操作后，使用此生成参考查阅 `run` 命令。

## `zotero-bridge run active`

列出轻量级活跃 workflow 运行时 task

- Argv： `["run","active"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/active"}]`.
- 别名： `run active`, `run`, `active`.
- Intent 搜索： `visible`.

## `zotero-bridge run cancel`

请求取消一个 workflow run

- Argv： `["run","cancel"]`.
- Argv 绑定： `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]},{"property":"reason","kind":"option","token":"--reason","takesValue":true,"required":false,"valueNames":["REASON"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":false,"valueNames":["MESSAGE"]}]`.
- 调用 schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/runs/{workflowRunId}/cancel"}]`.
- 别名： `run cancel`, `run`, `cancel`, `run_id`, `RUN_ID`, `reason`, `REASON`, `message`, `MESSAGE`.
- Intent 搜索： `visible`.

## `zotero-bridge run get`

读取一个 workflow run 状态

- Argv： `["run","get"]`.
- Argv 绑定： `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"skillRunId":{"type":"string"}},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"skillRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs/{workflowRunId}"}]`.
- 别名： `run get`, `run`, `get`, `run_id`, `RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run list`

列出活跃和近期 workflow 运行时 task

- Argv： `["run","list"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"backend-type","kind":"option","token":"--backend-type","takesValue":true,"required":false,"valueNames":["BACKEND_TYPE"]},{"property":"request","kind":"option","token":"--request","takesValue":true,"required":false,"valueNames":["REQUEST"]},{"property":"run","kind":"option","token":"--run","takesValue":true,"required":false,"valueNames":["RUN"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"active-only","kind":"option","token":"--active-only","takesValue":false,"required":false,"valueNames":["ACTIVE_ONLY"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend-type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"},"active-only":{"type":"boolean","description":"Only return active task runtime rows"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend_type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/tasks"}]`.
- 别名： `run list`, `run`, `list`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `backend_type`, `backend-type`, `BACKEND_TYPE`, `request`, `REQUEST`, `RUN`, `state`, `STATE`, `active_only`, `active-only`, `ACTIVE_ONLY`.
- Intent 搜索： `visible`.

## `zotero-bridge run notification ack`

确认 workflow 通知收件箱事件

- Argv： `["run","notification","ack"]`.
- Argv 绑定： `[{"property":"event","kind":"option","token":"--event","takesValue":true,"required":true,"valueNames":["EVENTS"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"event":{"type":"array","items":{"type":"string"},"description":"Notification event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":["event"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"event":{"type":"string","description":"Notification event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"eventId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/notifications/ack"}]`.
- 别名： `run notification ack`, `run`, `notification`, `ack`, `events`, `event`, `EVENTS`, `client_id`, `client-id`, `CLIENT_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run notification list`

列出 workflow 通知收件箱事件

- Argv： `["run","notification","list"]`.
- Argv 绑定： `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- 别名： `run notification list`, `run`, `notification`, `list`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run notification wait`

轮询直至 workflow 通知可用

- Argv： `["run","notification","wait"]`.
- Argv 绑定： `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"timeout-ms","kind":"option","token":"--timeout-ms","takesValue":true,"required":false,"valueNames":["TIMEOUT_MS"]},{"property":"interval-ms","kind":"option","token":"--interval-ms","takesValue":true,"required":false,"valueNames":["INTERVAL_MS"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout-ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval-ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout_ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval_ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- 别名： `run notification wait`, `run`, `notification`, `wait`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`, `timeout_ms`, `timeout-ms`, `TIMEOUT_MS`, `interval_ms`, `interval-ms`, `INTERVAL_MS`.
- Intent 搜索： `visible`.

## `zotero-bridge run permission get`

读取一个 Zotero 端 permission request

- Argv： `["run","permission","get"]`.
- Argv 绑定： `[{"property":"permission_request_id","kind":"positional","token":"PERMISSION_REQUEST_ID","position":1,"takesValue":true,"required":true,"valueNames":["PERMISSION_REQUEST_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id","position":1}},"required":["permission_request_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"permissionRequestId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/{permissionRequestId}"}]`.
- 别名： `run permission get`, `run`, `permission`, `get`, `permission_request_id`, `PERMISSION_REQUEST_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run permission pending`

列出待处理的 Zotero 端 permission request

- Argv： `["run","permission","pending"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/pending"}]`.
- 别名： `run permission pending`, `run`, `permission`, `pending`.
- Intent 搜索： `visible`.

## `zotero-bridge run recent`

列出轻量级近期 workflow 运行时 task

- Argv： `["run","recent"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/recent"}]`.
- 别名： `run recent`, `run`, `recent`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill connect`

连接一个可恢复的 ACP Skill run

- Argv： `["run","skill","connect"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/connect"}]`.
- 别名： `run skill connect`, `run`, `skill`, `connect`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill events`

列出一个 Skill run 的轻量级生命周期事件

- Argv： `["run","skill","events"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"since-updated-at","kind":"option","token":"--since-updated-at","takesValue":true,"required":false,"valueNames":["SINCE_UPDATED_AT"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"since-updated-at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"since_updated_at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"events":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}/events"}]`.
- 别名： `run skill events`, `run`, `skill`, `events`, `skill_run_id`, `SKILL_RUN_ID`, `since_updated_at`, `since-updated-at`, `SINCE_UPDATED_AT`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill get`

读取一个具体 Skill run

- Argv： `["run","skill","get"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}"}]`.
- 别名： `run skill get`, `run`, `skill`, `get`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill recent`

列出近期具体 Skill run

- Argv： `["run","skill","recent"]`.
- Argv 绑定： `[{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"skillRuns":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/recent"}]`.
- 别名： `run skill recent`, `run`, `skill`, `recent`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill reply`

回复一个等待中的 ACP Skill run

- Argv： `["run","skill","reply"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":true,"valueNames":["MESSAGE"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"message":{"type":"string","description":"Reply message"}},"required":["skill_run_id","message"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"message":{"type":"string","description":"Reply message"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/reply"}]`.
- 别名： `run skill reply`, `run`, `skill`, `reply`, `skill_run_id`, `SKILL_RUN_ID`, `message`, `MESSAGE`.
- Intent 搜索： `visible`.

## `zotero-bridge run workflow recent`

列出近期 workflow run

- Argv： `["run","workflow","recent"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":["workflow"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"runs":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs"}]`.
- 别名： `run workflow recent`, `run`, `workflow`, `recent`, `WORKFLOW`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

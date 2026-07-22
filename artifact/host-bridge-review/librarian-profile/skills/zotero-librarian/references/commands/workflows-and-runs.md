---

# Workflows And Runs

仅在任务已被路由到此领域后才加载本手册。每张卡片将精确的 CLI/backend 事实与任务选择及证据指引结合在一起。

## `zotero-bridge run active`

列出轻量级活跃 workflow 运行时任务

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/tasks/active`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出轻量级活跃 workflow 运行时任务时，使用 run active。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run active。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。
- run notification ack：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run active`。
- 示例：`zotero-bridge run active`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/tasks/active 的稳定结果。
- 完成证据：
- 结构化的 run active 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run cancel`

请求取消一个 workflow run

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/runs/{workflowRunId}/cancel`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：请求取消一个 workflow run 时，使用 run cancel。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run cancel。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。
- run notification ack：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run cancel`。
- 示例：`zotero-bridge run cancel 'run-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `run_id` → positional 1 as `RUN_ID`（必需，接受值）。
- `reason` → option `--reason`（可选，接受值）。
- `message` → option `--message`（可选，接受值）。
- CLI 调用字段：
- `run_id` (string)：Workflow run id
- `reason` (string)：可选的取消原因
- `message` (string)：可选的取消消息
- 解码载荷字段：
- `run_id` (string)：Workflow run id
- `reason` (string)：可选的取消原因
- `message` (string)：可选的取消消息

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/runs/{workflowRunId}/cancel 的稳定结果。
- 完成证据：
- 结构化的 run cancel 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；针对所描述的 Host 拥有效果的 Zotero UI approval。
- 效果 `workflow-control`：可能更改 workflow 控制状态。stateChanged=true。
- consume `workflowRunId`（调用方拥有）：命令调用所需。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run get`

读取单个 workflow run 状态

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/workflows/runs/{workflowRunId}`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取单个 workflow run 状态时，使用 run get。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run get。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。
- run notification ack：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run get`。
- 示例：`zotero-bridge run get 'run-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `run_id` → positional 1 as `RUN_ID`（必需，接受值）。
- CLI 调用字段：
- `run_id` (string)：Workflow run id
- 解码载荷字段：
- `run_id` (string)：Workflow run id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/workflows/runs/{workflowRunId} 的稳定结果。
- `skillRunId` (string)
- 完成证据：
- 结构化的 run get 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- consume `workflowRunId`（调用方拥有）：命令调用所需。
- produce `skillRunId`（响应）：对应操作成功时返回。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run list`

列出活跃和最近的 workflow 运行时任务

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/tasks`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出活跃和最近的 workflow 运行时任务时，使用 run list。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run list。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run notification ack：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run list`。
- 示例：`zotero-bridge run list`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（可选，接受值）。
- `backend` → option `--backend`（可选，接受值）。
- `backend-type` → option `--backend-type`（可选，接受值）。
- `request` → option `--request`（可选，接受值）。
- `run` → option `--run`（可选，接受值）。
- `state` → option `--state`（可选，接受值）。
- `active-only` → option `--active-only`（可选，标志）。
- CLI 调用字段：
- `workflow` (string)：按 workflow id 过滤
- `backend` (string)：按 backend id 过滤
- `backend-type` (string)：按 backend type 过滤
- `request` (string)：按 provider request id 过滤
- `run` (string)：按 workflow run id 过滤
- `state` (string)：按任务状态过滤
- `active-only` (boolean)：仅返回活跃任务运行时行
- 解码载荷字段：
- `workflow` (string)：按 workflow id 过滤
- `backend` (string)：按 backend id 过滤
- `backend_type` (string)：按 backend type 过滤
- `request` (string)：按 provider request id 过滤
- `run` (string)：按 workflow run id 过滤
- `state` (string)：按任务状态过滤

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/tasks 的稳定结果。
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 run list 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run notification ack`

确认 workflow 通知收件箱事件

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/notifications/ack`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：确认 workflow 通知收件箱事件时，使用 run notification ack。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run notification ack。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run notification ack`。
- 示例：`zotero-bridge run notification ack --event 'event'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `event` → option `--event`（必需，接受值）。
- `client-id` → option `--client-id`（可选，接受值）。
- CLI 调用字段：
- `event` (string)：Notification event id
- `client-id` (string)：尽力而为的 Host Bridge notification client id
- 解码载荷字段：
- `event` (string)：Notification event id
- `client_id` (string)：尽力而为的 Host Bridge notification client id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/notifications/ack 的稳定结果。
- 完成证据：
- 结构化的 run notification ack 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `workflow-control`：可能更改 workflow 控制状态。stateChanged=true。
- consume `eventId`（调用方拥有）：命令调用所需。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run notification list`

列出 workflow 通知收件箱事件

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/notifications`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出 workflow 通知收件箱事件时，使用 run notification list。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run notification list。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run notification list`。
- 示例：`zotero-bridge run notification list`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow-run-id` → option `--workflow-run-id`（可选，接受值）。
- `skill-run-id` → option `--skill-run-id`（可选，接受值）。
- `type` → option `--type`（可选，接受值）。
- `since-event-id` → option `--since-event-id`（可选，接受值）。
- `client-id` → option `--client-id`（可选，接受值）。
- `acknowledged` → option `--acknowledged`（可选，接受值）。
- `limit` → option `--limit`（可选，接受值）。
- CLI 调用字段：
- `workflow-run-id` (string)：按 workflow run id 过滤
- `skill-run-id` (string)：按具体 skill run id 过滤
- `type` (string)：按通知类型过滤
- `since-event-id` (string)：返回此 event id 之后的事件
- `client-id` (string)：尽力而为的 Host Bridge notification client id
- `acknowledged` (string)：按确认状态过滤
- `limit` (string)：返回的最大事件数
- 解码载荷字段：
- `workflow_run_id` (string)：按 workflow run id 过滤
- `skill_run_id` (string)：按具体 skill run id 过滤
- `type` (string)：按通知类型过滤
- `since_event_id` (string)：返回此 event id 之后的事件
- `client_id` (string)：尽力而为的 Host Bridge notification client id
- `acknowledged` (string)：按确认状态过滤
- `limit` (string)：返回的最大事件数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/notifications 的稳定结果。
- `events` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 run notification list 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run notification wait`

轮询直到 workflow 通知可用

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/notifications`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：轮询直到 workflow 通知可用时，使用 run notification wait。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run notification wait。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run notification wait`。
- 示例：`zotero-bridge run notification wait`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow-run-id` → option `--workflow-run-id`（可选，接受值）。
- `skill-run-id` → option `--skill-run-id`（可选，接受值）。
- `type` → option `--type`（可选，接受值）。
- `since-event-id` → option `--since-event-id`（可选，接受值）。
- `client-id` → option `--client-id`（可选，接受值）。
- `acknowledged` → option `--acknowledged`（可选，接受值）。
- `limit` → option `--limit`（可选，接受值）。
- `timeout-ms` → option `--timeout-ms`（可选，接受值）。
- `interval-ms` → option `--interval-ms`（可选，接受值）。
- CLI 调用字段：
- `workflow-run-id` (string)：按 workflow run id 过滤
- `skill-run-id` (string)：按具体 skill run id 过滤
- `type` (string)：按通知类型过滤
- `since-event-id` (string)：返回此 event id 之后的事件
- `client-id` (string)：尽力而为的 Host Bridge notification client id
- `acknowledged` (string)：按确认状态过滤
- `limit` (string)：返回的最大事件数
- `timeout-ms` (string)：最大等待时间（毫秒）
- `interval-ms` (string)：轮询间隔（毫秒）
- 解码载荷字段：
- `workflow_run_id` (string)：按 workflow run id 过滤
- `skill_run_id` (string)：按具体 skill run id 过滤
- `type` (string)：按通知类型过滤
- `since_event_id` (string)：返回此 event id 之后的事件
- `client_id` (string)：尽力而为的 Host Bridge notification client id
- `acknowledged` (string)：按确认状态过滤
- `limit` (string)：返回的最大事件数
- `timeout_ms` (string)：最大等待时间（毫秒）
- `interval_ms` (string)：轮询间隔（毫秒）

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/notifications 的稳定结果。
- `events` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 run notification wait 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run permission get`

读取单个 Host Bridge permission 请求

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/permissions/{permissionRequestId}`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取单个 Host Bridge permission 请求时，使用 run permission get。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run permission get。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run permission get`。
- 示例：`zotero-bridge run permission get 'permission-request-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `permission_request_id` → positional 1 as `PERMISSION_REQUEST_ID`（必需，接受值）。
- CLI 调用字段：
- `permission_request_id` (string)：Permission request id
- 解码载荷字段：
- `permission_request_id` (string)：Permission request id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/permissions/{permissionRequestId} 的稳定结果。
- 完成证据：
- 结构化的 run permission get 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- consume `permissionRequestId`（调用方拥有）：命令调用所需。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run permission pending`

列出待处理的 Host Bridge permission 请求

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/permissions/pending`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出待处理的 Host Bridge permission 请求时，使用 run permission pending。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run permission pending。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run permission pending`。
- 示例：`zotero-bridge run permission pending`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/permissions/pending 的稳定结果。
- 完成证据：
- 结构化的 run permission pending 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run recent`

列出轻量级最近的 workflow 运行时任务

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/tasks/recent`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出轻量级最近的 workflow 运行时任务时，使用 run recent。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run recent。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run recent`。
- 示例：`zotero-bridge run recent`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（可选，接受值）。
- `backend` → option `--backend`（可选，接受值）。
- `state` → option `--state`（可选，接受值）。
- `limit` → option `--limit`（可选，接受值）。
- CLI 调用字段：
- `workflow` (string)：按 workflow id 过滤
- `backend` (string)：按 backend id 过滤
- `state` (string)：按任务状态过滤
- `limit` (string)：最大任务数
- 解码载荷字段：
- `workflow` (string)：按 workflow id 过滤
- `backend` (string)：按 backend id 过滤
- `state` (string)：按任务状态过滤
- `limit` (string)：最大任务数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/tasks/recent 的稳定结果。
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 run recent 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run skill connect`

连接一个可恢复的 ACP skill run

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/skill-runs/{skillRunId}/connect`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：连接一个可恢复的 ACP skill run 时，使用 run skill connect。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run skill connect。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run skill connect`。
- 示例：`zotero-bridge run skill connect 'skill-run-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `skill_run_id` → positional 1 as `SKILL_RUN_ID`（必需，接受值）。
- CLI 调用字段：
- `skill_run_id` (string)：不透明的 skill run id
- 解码载荷字段：
- `skill_run_id` (string)：不透明的 skill run id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/skill-runs/{skillRunId}/connect 的稳定结果。
- 完成证据：
- 结构化的 run skill connect 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `workflow-control`：可能更改 workflow 控制状态。stateChanged=true。
- consume `skillRunId`（调用方拥有）：命令调用所需。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run skill events`

列出单个 skill run 的轻量级生命周期事件

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/skill-runs/{skillRunId}/events`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出单个 skill run 的轻量级生命周期事件时，使用 run skill events。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run skill events。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run skill events`。
- 示例：`zotero-bridge run skill events 'skill-run-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `skill_run_id` → positional 1 as `SKILL_RUN_ID`（必需，接受值）。
- `since-updated-at` → option `--since-updated-at`（可选，接受值）。
- `limit` → option `--limit`（可选，接受值）。
- CLI 调用字段：
- `skill_run_id` (string)：不透明的 skill run id
- `since-updated-at` (string)：返回此 updatedAt 时间戳之后的事件
- `limit` (string)：最大事件数
- 解码载荷字段：
- `skill_run_id` (string)：不透明的 skill run id
- `since_updated_at` (string)：返回此 updatedAt 时间戳之后的事件
- `limit` (string)：最大事件数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/skill-runs/{skillRunId}/events 的稳定结果。
- `events` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 run skill events 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run skill get`

读取单个具体 skill run

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/skill-runs/{skillRunId}`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取单个具体 skill run 时，使用 run skill get。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run skill get。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run skill get`。
- 示例：`zotero-bridge run skill get 'skill-run-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `skill_run_id` → positional 1 as `SKILL_RUN_ID`（必需，接受值）。
- CLI 调用字段：
- `skill_run_id` (string)：不透明的 skill run id
- 解码载荷字段：
- `skill_run_id` (string)：不透明的 skill run id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/skill-runs/{skillRunId} 的稳定结果。
- 完成证据：
- 结构化的 run skill get 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- consume `skillRunId`（调用方拥有）：命令调用所需。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run skill recent`

列出最近的具体 skill run

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/skill-runs/recent`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出最近的具体 skill run 时，使用 run skill recent。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run skill recent。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run skill recent`。
- 示例：`zotero-bridge run skill recent`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `state` → option `--state`（可选，接受值）。
- `limit` → option `--limit`（可选，接受值）。
- CLI 调用字段：
- `state` (string)：按 skill run 状态过滤
- `limit` (string)：最大 skill run 数
- 解码载荷字段：
- `state` (string)：按 skill run 状态过滤
- `limit` (string)：最大 skill run 数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/skill-runs/recent 的稳定结果。
- `skillRuns` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 run skill recent 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run skill reply`

回复一个等待中的 ACP skill run

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/skill-runs/{skillRunId}/reply`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：回复一个等待中的 ACP skill run 时，使用 run skill reply。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run skill reply。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run skill reply`。
- 示例：`zotero-bridge run skill reply 'skill-run-id' --message 'message'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `skill_run_id` → positional 1 as `SKILL_RUN_ID`（必需，接受值）。
- `message` → option `--message`（必需，接受值）。
- CLI 调用字段：
- `skill_run_id` (string)：不透明的 skill run id
- `message` (string)：回复消息
- 解码载荷字段：
- `skill_run_id` (string)：不透明的 skill run id
- `message` (string)：回复消息

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/skill-runs/{skillRunId}/reply 的稳定结果。
- 完成证据：
- 结构化的 run skill reply 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `workflow-control`：可能更改 workflow 控制状态。stateChanged=true。
- consume `skillRunId`（调用方拥有）：命令调用所需。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge run workflow recent`

列出最近的 workflow run

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/workflows/runs`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出最近的 workflow run 时，使用 run workflow recent。
- 需要对返回的运行时 handle 或生命周期事件进行监控或响应。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 run workflow recent。
- 不要将 workflowRunId、skillRunId、permissionRequestId 或 eventId 互相替代。

区分：
- run active：仅当其更窄的结果匹配任务时才选择。
- run cancel：仅当其更窄的结果匹配任务时才选择。
- run get：仅当其更窄的结果匹配任务时才选择。
- run list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge run workflow recent`。
- 示例：`zotero-bridge run workflow recent --workflow 'workflow'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（必需，接受值）。
- `limit` → option `--limit`（可选，接受值）。
- CLI 调用字段：
- `workflow` (string)：Workflow id
- `limit` (string)：最大 run 数
- 解码载荷字段：
- `workflow` (string)：Workflow id
- `limit` (string)：最大 run 数

### 结果与证据

- 交付方式：`cursor`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/workflows/runs 的稳定结果。
- `runs` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- 完成证据：
- 结构化的 run workflow recent 结果及用于获取它的确切调用输入。
- 当前生命周期状态及所使用的确切运行时 handle

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow agent-apply`

应用已最终确定的自拥有 agent workflow 结果包

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：应用已最终确定的自拥有 agent workflow 结果包时，使用 workflow agent-apply。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow agent-apply。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。
- workflow list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow agent-apply`。
- 示例：`zotero-bridge workflow agent-apply 'agent-run-id' --result 'result'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `agent_run_id` → positional 1 as `AGENT_RUN_ID`（必需，接受值）。
- `result` → option `--result`（必需，接受值）。
- CLI 调用字段：
- `agent_run_id` (string)：由 workflow agent-run 返回的 Agent run id
- `result` (string)：Apply-back 结果映射。多个请求包时重复使用。
- 解码载荷字段：
- `agent_run_id` (string)：由 workflow agent-run 返回的 Agent run id
- `result` (string)：Apply-back 结果映射。多个请求包时重复使用。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply 的稳定结果。
- `applyReceipt` (string)
- 完成证据：
- 结构化的 workflow agent-apply 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt
- apply receipt 及每个请求的 applied 或 failed 状态

### Approval、效果与 handle

- Approval：`conditional` at `apply-back`；每个结果请求在任何 approval 或 handle 消费之前进行预检。
- 效果 `workflow-control`：可能更改 workflow 控制状态。stateChanged=true。
- consume `agentRunId`（一次性）：命令调用所需。
- consume `agentRequestId`（调用方拥有）：命令调用所需。
- produce `applyReceipt`（响应）：对应操作成功时返回。

### 失败与恢复

- Apply-back 在预检后失败或可能已部分写入结果。在重试任何结果之前，读取已持久化的每个请求的 apply receipt。下一步：`workflow agent-apply-status`。需要：`agentRunId`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow agent-apply-status`

读取 agent run 的可审计 apply-back receipt

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取 agent run 的可审计 apply-back receipt 时，使用 workflow agent-apply-status。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow agent-apply-status。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。
- workflow list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow agent-apply-status`。
- 示例：`zotero-bridge workflow agent-apply-status 'agent-run-id'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `agent_run_id` → positional 1 as `AGENT_RUN_ID`（必需，接受值）。
- CLI 调用字段：
- `agent_run_id` (string)：由 workflow agent-run 返回的 Agent run id
- 解码载荷字段：
- `agent_run_id` (string)：由 workflow agent-run 返回的 Agent run id

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply 的稳定结果。
- `applyReceipt` (string)
- 完成证据：
- 结构化的 workflow agent-apply-status 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- consume `agentRunId`（调用方拥有）：读取已持久化 apply 状态所需；读取操作本身不会消费它。
- produce `applyReceipt`（响应）：对应操作成功时返回。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow agent-run`

准备自拥有 agent workflow 交接包

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/agent-run`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：准备自拥有 agent workflow 交接包时，使用 workflow agent-run。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow agent-run。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。
- workflow list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow agent-run`。
- 示例：`zotero-bridge workflow agent-run --workflow 'workflow'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（必需，接受值）。
- `selection` → option `--selection`（可选，接受值）。
- `none` → option `--none`（可选，标志）。
- `output-dir` → option `--output-dir`（可选，接受值）。
- CLI 调用字段：
- `workflow` (string)：为自拥有 agent 执行准备的 Workflow id
- `selection` (string)：Workflow selection item refs，以 JSON 数组、文件路径、@file 或 '-'（标准输入）形式提供
- `none` (boolean)：准备一个无选择的 workflow
- `output-dir` (string)：将交接 zip 下载到此目录
- 解码载荷字段：
- `workflow` (string)：为自拥有 agent 执行准备的 Workflow id
- `selection` (string)：Workflow selection item refs，以 JSON 数组、文件路径、@file 或 '-'（标准输入）形式提供
- `output_dir` (string)：将交接 zip 下载到此目录

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/agent-run 的稳定结果。
- `agentRunId` (string)
- `agentRequestId` (string)
- `fileId` (string)
- 完成证据：
- 结构化的 workflow agent-run 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt
- executionModes.agentOwned、agentRunId、agentRequestIds 及已验证的包

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `workflow-control`：可能更改 workflow 控制状态。stateChanged=true。
- consume `itemRef`（调用方拥有）：仅在显式 --selection 输入时需要；--none 不携带 itemRef。
- produce `agentRunId`（一次性）：对应操作成功时返回。
- produce `agentRequestId`（响应）：对应操作成功时返回。
- produce `fileId`（短期有效）：对应操作成功时返回。

### 失败与恢复

- 交接准备失败或其响应不确定。检查结构化错误；不要进入 Host 拥有的 run 平面。下一步：`workflow describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow describe`

描述 workflow 选择和 workflow 选项

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/describe`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：描述 workflow 选择和 workflow 选项时，使用 workflow describe。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow describe。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow list：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow describe`。
- 示例：`zotero-bridge workflow describe --workflow 'workflow'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（必需，接受值）。
- `workflow-options` → option `--workflow-options`（可选，接受值）。
- CLI 调用字段：
- `workflow` (string)：要描述的 Workflow id
- `workflow-options` (string)：Draft workflow options JSON 对象、文件路径、@file 或 '-'（标准输入）
- 解码载荷字段：
- `workflow` (string)：要描述的 Workflow id
- `workflow_options` (string)：Draft workflow options JSON 对象、文件路径、@file 或 '-'（标准输入）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/describe 的稳定结果。
- 完成证据：
- 结构化的 workflow describe 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow list`

列出已加载的 workflow

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/workflows`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出已加载的 workflow 时，使用 workflow list。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow list。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow list`。
- 示例：`zotero-bridge workflow list`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/workflows 的稳定结果。
- 完成证据：
- 结构化的 workflow list 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow profile describe`

描述单个 backend 的 provider profile 契约

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/provider-profiles/describe`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：描述单个 backend 的 provider profile 契约时，使用 workflow profile describe。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow profile describe。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow profile describe`。
- 示例：`zotero-bridge workflow profile describe --backend 'backend'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `backend` → option `--backend`（必需，接受值）。
- CLI 调用字段：
- `backend` (string)：已配置的 backend id，其 provider profile 将被描述
- 解码载荷字段：
- `backend` (string)：已配置的 backend id，其 provider profile 将被描述

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/provider-profiles/describe 的稳定结果。
- 完成证据：
- 结构化的 workflow profile describe 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow profile list`

列出已配置的 backend provider profile

### Backend 与新鲜度

- 目标：`endpoint:GET /bridge/v1/workflows/provider-profiles`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：列出已配置的 backend provider profile 时，使用 workflow profile list。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow profile list。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow profile list`。
- 示例：`zotero-bridge workflow profile list`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- 无命令参数。
- CLI 调用字段：
- 无结构化字段。
- 解码载荷字段：
- 无结构化字段。

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 GET /bridge/v1/workflows/provider-profiles 的稳定结果。
- 完成证据：
- 结构化的 workflow profile list 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow profile validate`

验证并规范化单个 backend provider profile

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/provider-profiles/validate`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：验证并规范化单个 backend provider profile 时，使用 workflow profile validate。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow profile validate。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow profile validate`。
- 示例：`zotero-bridge workflow profile validate`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `provider-profile` → option `--provider-profile`（可选，接受值）。
- CLI 调用字段：
- `provider-profile` (string)：Provider profile JSON 对象；省略时使用 ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE
- 解码载荷字段：
- `provider_profile` (string)：Provider profile JSON 对象；省略时使用 ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/provider-profiles/validate 的稳定结果。
- 完成证据：
- 结构化的 workflow profile validate 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow requirements`

读取 workflow 需求

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/requirements`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：读取 workflow 需求时，使用 workflow requirements。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow requirements。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow requirements`。
- 示例：`zotero-bridge workflow requirements`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（可选，接受值）。
- `legacy_workflow` → positional 1 as `LEGACY_WORKFLOW`（可选，接受值）。
- CLI 调用字段：
- `workflow` (string)：Workflow id
- `legacy_workflow` (string)
- 解码载荷字段：
- `workflow` (string)：Workflow id
- `legacy_workflow` (string)

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/requirements 的稳定结果。
- 完成证据：
- 结构化的 workflow requirements 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow submit`

使用显式 JSON 输入提交 workflow

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/submit`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：使用显式 JSON 输入提交 workflow 时，使用 workflow submit。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow submit。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow submit`。
- 示例：`zotero-bridge workflow submit --workflow 'workflow'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（必需，接受值）。
- `selection` → option `--selection`（可选，接受值）。
- `none` → option `--none`（可选，标志）。
- `workflow-options` → option `--workflow-options`（可选，接受值）。
- `provider-profile` → option `--provider-profile`（可选，接受值）。
- CLI 调用字段：
- `workflow` (string)：要提交的 Workflow id
- `selection` (string)：Workflow selection item refs，以 JSON 数组、文件路径、@file 或 '-'（标准输入）形式提供
- `none` (boolean)：提交一个无选择的 workflow
- `workflow-options` (string)：Workflow options JSON 对象、文件路径、@file 或 '-'（标准输入）
- `provider-profile` (string)：包含 backendId 和 providerOptions 的 Provider profile JSON 对象
- 解码载荷字段：
- `workflow` (string)：要提交的 Workflow id
- `selection` (string)：Workflow selection item refs，以 JSON 数组、文件路径、@file 或 '-'（标准输入）形式提供
- `workflow_options` (string)：Workflow options JSON 对象、文件路径、@file 或 '-'（标准输入）
- `provider_profile` (string)：包含 backendId 和 providerOptions 的 Provider profile JSON 对象

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/submit 的稳定结果。
- `workflowRunId` (string)
- 完成证据：
- 结构化的 workflow submit 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt
- executionModes.hostOwned 和 workflowRunId

### Approval、效果与 handle

- Approval：`zotero-ui-required` at `before-command`；针对所描述的 Host 拥有效果的 Zotero UI approval。
- 效果 `workflow-control`：可能更改 workflow 控制状态。stateChanged=true。
- consume `itemRef`（调用方拥有）：仅在显式 --selection 输入时需要；--none 不携带 itemRef。
- produce `workflowRunId`（响应）：对应操作成功时返回。

### 失败与恢复

- 操作失败或完成状态不确定。在重复操作之前检查 stateChanged 和 handleConsumed。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

## `zotero-bridge workflow validate`

验证 workflow 输入而不启动执行

### Backend 与新鲜度

- 目标：`endpoint:POST /bridge/v1/workflows/validate`。
- 新鲜度：本次调用的实时 Host Bridge 响应。

### 选择此命令

使用场景：
- 当所需操作为：验证 workflow 输入而不启动执行时，使用 workflow validate。
- 任务是由 workflow 契约治理的可复用多步骤行为。

避免场景：
- 当任务需要不同的同级结果、控制平面或新鲜度保证时，不要使用 workflow validate。
- 对于需要 Host 拥有选项或 provider profile 的 workflow，不要使用 agent-run。

区分：
- workflow agent-apply：仅当其更窄的结果匹配任务时才选择。
- workflow agent-apply-status：仅当其更窄的结果匹配任务时才选择。
- workflow agent-run：仅当其更窄的结果匹配任务时才选择。
- workflow describe：仅当其更窄的结果匹配任务时才选择。

### 调用与载荷

- 标准 argv：`zotero-bridge workflow validate`。
- 示例：`zotero-bridge workflow validate --workflow 'workflow'`。
- 前置条件：
- 在依赖实时结果之前，验证确切的 CLI 身份和可达的 Host Bridge。
- 精确 argv 绑定：
- `workflow` → option `--workflow`（必需，接受值）。
- `selection` → option `--selection`（可选，接受值）。
- `none` → option `--none`（可选，标志）。
- `workflow-options` → option `--workflow-options`（可选，接受值）。
- CLI 调用字段：
- `workflow` (string)：要验证的 Workflow id
- `selection` (string)：Workflow selection item refs，以 JSON 数组、文件路径、@file 或 '-'（标准输入）形式提供
- `none` (boolean)：验证一个无选择的 workflow
- `workflow-options` (string)：Workflow options JSON 对象、文件路径、@file 或 '-'（标准输入）
- 解码载荷字段：
- `workflow` (string)：要验证的 Workflow id
- `selection` (string)：Workflow selection item refs，以 JSON 数组、文件路径、@file 或 '-'（标准输入）形式提供
- `workflow_options` (string)：Workflow options JSON 对象、文件路径、@file 或 '-'（标准输入）

### 结果与证据

- 交付方式：`none`。
- 稳定结果字段：
- `result` (object)：来自 POST /bridge/v1/workflows/validate 的稳定结果。
- 完成证据：
- 结构化的 workflow validate 结果及用于获取它的确切调用输入。
- executionModes、验证结果、workflowRunId、agentRunId 或 apply receipt

### Approval、效果与 handle

- Approval：`none` at `none`；无需 Host Bridge UI approval；provider 运行时仍可能请求其自身的权限。
- 效果 `none`：读取状态而不更改 Host 拥有的数据。stateChanged=false。
- 无类型化 handle 转换。

### 失败与恢复

- 读取失败或返回不完整的证据。检查错误并仅在 retryable 为 true 时重试。下一步：`surface describe`。
- 保留结构化错误信封，并在继续之前检查 retryable、stateChanged 和 handleConsumed。

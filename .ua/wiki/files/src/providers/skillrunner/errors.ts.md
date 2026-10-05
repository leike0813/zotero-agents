
# src/providers/skillrunner/errors.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/errors.ts -->

SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。
源码：[src/providers/skillrunner/errors.ts](../../../../../../src/providers/skillrunner/errors.ts)

## 符号（5）
<!-- node: function:src/providers/skillrunner/errors.ts:formatSkillRunnerHttpErrorMessage -->
<!-- node: function:src/providers/skillrunner/errors.ts:isSkillRunnerAuthOrConfigError -->
<!-- node: function:src/providers/skillrunner/errors.ts:isSkillRunnerBackendRecoverableError -->
<!-- node: class:src/providers/skillrunner/errors.ts:SkillRunnerHttpError -->
<!-- node: class:src/providers/skillrunner/errors.ts:SkillRunnerTerminalRunError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| formatSkillRunnerHttpErrorMessage | 函数 | 86–93 | 简单 | formatting、error-message、skillrunner、exported | 0 | 把 HTTP 错误格式化为包含状态码与响应摘要的用户可读文案。 |
| isSkillRunnerAuthOrConfigError | 函数 | 69–72 | 简单 | classification、auth、skillrunner、exported | 0 | 判定错误是否属于认证或配置类（401/403/400 等），这类错误需要用户介入而非自动重试。 |
| isSkillRunnerBackendRecoverableError | 函数 | 74–80 | 简单 | classification、health、skillrunner、exported | 0 | 判定后端错误是否可恢复，用于决定是否触发健康注册表的退避与自动禁用。 |
| SkillRunnerHttpError | 类 | 10–31 | 简单 | error-type、http、skillrunner、exported | 0 | 携带 status / statusText / path / url / body 的 SkillRunner HTTP 错误，供上层按状态码分类处理。 |
| SkillRunnerTerminalRunError | 类 | 33–52 | 简单 | error-type、terminal、skillrunner、exported | 0 | 表示运行已进入不可恢复终态的错误，携带失败发生的阶段与状态信息。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [dashboardActions.ts](../../modules/dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [managementClient.ts](managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [skillRunnerAutoReplyObserver.ts](../../modules/skillRunner/run/skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerHandshake.ts](../../modules/skillRunner/connection/skillRunnerHandshake.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshake.ts | SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。 |
| [skillRunnerRecoverableState.ts](../../modules/skillRunner/run/skillRunnerRecoverableState.ts.md) | src/modules/skillRunner/run/skillRunnerRecoverableState.ts | 可恢复状态判定：判断哪些 SkillRunner 任务已具备恢复条件、哪些失败属于不可恢复，是重启恢复决策的最小判定单元。 |
| [skillRunnerRunDialog.ts](../../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerSessionSyncManager.ts](../../modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |
| [skillRunnerTaskReconciler.ts](../../modules/skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| formatSkillRunnerHttpErrorMessage | 函数 | 86–93 | 把 HTTP 错误格式化为包含状态码与响应摘要的用户可读文案。 |
| isSkillRunnerAuthOrConfigError | 函数 | 69–72 | 判定错误是否属于认证或配置类（401/403/400 等），这类错误需要用户介入而非自动重试。 |
| isSkillRunnerBackendRecoverableError | 函数 | 74–80 | 判定后端错误是否可恢复，用于决定是否触发健康注册表的退避与自动禁用。 |
| SkillRunnerHttpError | 类 | 10–31 | 携带 status / statusText / path / url / body 的 SkillRunner HTTP 错误，供上层按状态码分类处理。 |
| SkillRunnerTerminalRunError | 类 | 33–52 | 表示运行已进入不可恢复终态的错误，携带失败发生的阶段与状态信息。 |

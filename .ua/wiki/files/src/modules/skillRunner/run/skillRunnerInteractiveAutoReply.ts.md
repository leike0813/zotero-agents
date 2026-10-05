
# src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts -->

交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。
源码：[src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts)

## 符号（4）
<!-- node: function:src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts:buildSkillRunnerRunRecordRequestPayload -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts:isSkillRunnerInteractiveAutoReplyRequested -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts:normalizeBoolean -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts:shouldEnableSkillRunnerAutoReplyForRun -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSkillRunnerRunRecordRequestPayload | 函数 | 51–92 | 中等 | skillrunner、auto-reply、serialization、core | 0 | 构造 run 记录的请求载荷，把自动回复开关写入持久化的请求元数据。 |
| isSkillRunnerInteractiveAutoReplyRequested | 函数 | 94–105 | 简单 | skillrunner、auto-reply、parsing | 1 | 从请求元数据中读取用户是否显式请求了自动回复。 |
| normalizeBoolean | 函数 | 23–35 | 简单 | utility、normalization、parsing | 1 | 把松散的布尔输入（字符串、数字、缺省）归一化为真/假/未指定三态。 |
| shouldEnableSkillRunnerAutoReplyForRun | 函数 | 107–130 | 简单 | skillrunner、auto-reply、policy、core | 0 | 综合全局开关与请求级标记判定某次 run 是否启用自动回复。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](../../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [provider.ts](../../../providers/skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerAutoReplyObserver.ts](skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerForegroundContinuation.ts](skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workflowSettings.ts](../../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunnerRunRecordRequestPayload | 函数 | 51–92 | 构造 run 记录的请求载荷，把自动回复开关写入持久化的请求元数据。 |
| isSkillRunnerInteractiveAutoReplyRequested | 函数 | 94–105 | 从请求元数据中读取用户是否显式请求了自动回复。 |
| shouldEnableSkillRunnerAutoReplyForRun | 函数 | 107–130 | 综合全局开关与请求级标记判定某次 run 是否启用自动回复。 |

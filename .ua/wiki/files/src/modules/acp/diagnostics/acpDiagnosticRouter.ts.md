
# src/modules/acp/diagnostics/acpDiagnosticRouter.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpDiagnosticRouter.ts -->

诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。
源码：[src/modules/acp/diagnostics/acpDiagnosticRouter.ts](../../../../../../../src/modules/acp/diagnostics/acpDiagnosticRouter.ts)

## 符号（1）
<!-- node: function:src/modules/acp/diagnostics/acpDiagnosticRouter.ts:recordAcpRuntimeDiagnostic -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| recordAcpRuntimeDiagnostic | 函数 | 11–51 | 中等 | 诊断、路由、runtime-log | 0 | 记录一条 ACP 运行时诊断：投影证据、warn/error 写 runtime log，并通知可选的 debug 审计 sink。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpDiagnostics.ts](acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| recordAcpRuntimeDiagnostic | 函数 | 11–51 | 记录一条 ACP 运行时诊断：投影证据、warn/error 写 runtime log，并通知可选的 debug 审计 sink。 |

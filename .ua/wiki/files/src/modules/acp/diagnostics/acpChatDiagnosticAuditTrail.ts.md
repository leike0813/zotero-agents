
# src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts -->

ACP Chat 诊断审计轨迹：按 backendId+conversationId 组织 owner，把 warn/error 级诊断证据写入审计文件，并管理 owner 的激活、刷盘与丢弃。
源码：[src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts](../../../../../../../src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts)

## 符号（2）
<!-- node: function:src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts:appendAcpChatDiagnosticAudit -->
<!-- node: function:src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts:recordAuditWarning -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpChatDiagnosticAudit | 函数 | 94–127 | 中等 | 审计、acp-chat、诊断 | 0 | 把一条诊断证据追加到 owner 对应的审计文件，owner 未激活时静默丢弃以控制噪声。 |
| recordAuditWarning | 函数 | 37–66 | 中等 | 审计、容错、诊断 | 0 | 审计写入自身的告警路径：在 debug 模式下把溢出或写入失败回落到 runtime log，避免诊断失败掩盖原始问题。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAuditAppendCore.ts](acpAuditAppendCore.ts.md) | src/modules/acp/diagnostics/acpAuditAppendCore.ts | 审计日志追加的公共内核：基于 bufferedWriteCoordinator 提供带 owner 维度的 NDJSON 追加、刷盘、丢弃，并统一处理溢出与写入失败事件。 |
| [acpDiagnostics.ts](acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendAcpChatDiagnosticAudit | 函数 | 94–127 | 把一条诊断证据追加到 owner 对应的审计文件，owner 未激活时静默丢弃以控制噪声。 |

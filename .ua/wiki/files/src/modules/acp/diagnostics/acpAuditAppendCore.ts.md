
# src/modules/acp/diagnostics/acpAuditAppendCore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpAuditAppendCore.ts -->

审计日志追加的公共内核：基于 bufferedWriteCoordinator 提供带 owner 维度的 NDJSON 追加、刷盘、丢弃，并统一处理溢出与写入失败事件。
源码：[src/modules/acp/diagnostics/acpAuditAppendCore.ts](../../../../../../../src/modules/acp/diagnostics/acpAuditAppendCore.ts)

## 符号（1）
<!-- node: function:src/modules/acp/diagnostics/acpAuditAppendCore.ts:createAcpAuditAppendCore -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createAcpAuditAppendCore](../../../../../symbols/src/modules/acp/diagnostics/acpAuditAppendCore.ts/createAcpAuditAppendCore.md) | 函数 | 47–140 | 中等 | 工厂函数、审计、缓冲写 | 2 | 为一个 owner 创建审计追加器实例：绑定日志路径、缓冲上限与溢出/失败回调，实现 Chat 与 Skills 共用的追加语义。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bufferedWriteCoordinator.ts](../../bufferedWriteCoordinator.ts.md) | src/modules/bufferedWriteCoordinator.ts | 带缓冲的写入协调器：按 key 合并短时间内的重复写入、施加字节与条数上限并支持显式 flush/discard，避免高频 IO 打爆文件系统。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatDiagnosticAuditTrail.ts](acpChatDiagnosticAuditTrail.ts.md) | src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts | ACP Chat 诊断审计轨迹：按 backendId+conversationId 组织 owner，把 warn/error 级诊断证据写入审计文件，并管理 owner 的激活、刷盘与丢弃。 |
| [acpSkillRunAuditTrail.ts](../skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createAcpAuditAppendCore](../../../../../symbols/src/modules/acp/diagnostics/acpAuditAppendCore.ts/createAcpAuditAppendCore.md) | 函数 | 47–140 | 为一个 owner 创建审计追加器实例：绑定日志路径、缓冲上限与溢出/失败回调，实现 Chat 与 Skills 共用的追加语义。 |

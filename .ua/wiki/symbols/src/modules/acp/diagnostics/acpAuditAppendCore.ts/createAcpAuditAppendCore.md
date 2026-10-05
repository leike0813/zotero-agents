
# createAcpAuditAppendCore
<!-- node: function:src/modules/acp/diagnostics/acpAuditAppendCore.ts:createAcpAuditAppendCore -->

为一个 owner 创建审计追加器实例：绑定日志路径、缓冲上限与溢出/失败回调，实现 Chat 与 Skills 共用的追加语义。
类型：函数  
复杂度：中等  
入边数：2  
标签：工厂函数、审计、缓冲写  
所属文件：[src/modules/acp/diagnostics/acpAuditAppendCore.ts](../../../../../../files/src/modules/acp/diagnostics/acpAuditAppendCore.ts.md)
源码：[src/modules/acp/diagnostics/acpAuditAppendCore.ts:47](../../../../../../../../src/modules/acp/diagnostics/acpAuditAppendCore.ts#L47)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [appendAcpChatDiagnosticAudit](../../../../../../files/src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts.md) | src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts:94–127 | 把一条诊断证据追加到 owner 对应的审计文件，owner 未激活时静默丢弃以控制噪声。 |
| [initializeAcpSkillRunAuditTrail](../../../../../../files/src/modules/acp/skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts:354–391 | 初始化 run 的审计目录与写入器：按 debug 模式决定工件粒度并生成 README。 |

## 调用

该符号没有记录对外调用。

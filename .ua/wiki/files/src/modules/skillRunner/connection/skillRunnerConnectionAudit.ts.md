
# src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts -->

连接审计的读取门面：把 connection governor 的核心快照与连接审计事件存储合并为单一诊断快照。
源码：[src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts)

## 符号（1）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts:getSkillRunnerConnectionGovernorSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getSkillRunnerConnectionGovernorSnapshot | 函数 | 14–39 | 简单 | diagnostics、snapshot、skillrunner | 0 | 合并 governor 核心快照与审计事件统计，输出带超时、迟到结算与跳过原因的完整连接诊断视图。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerConnectionAuditStore.ts](skillRunnerConnectionAuditStore.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts | SkillRunner 连接审计事件的内存存储：按 governor 实例保留有界事件流与分类计数，供调试开关打开时查询连接排队、超时、跳过与迟到结算等行为。 |
| [skillRunnerConnectionGovernor.ts](skillRunnerConnectionGovernor.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getSkillRunnerConnectionGovernorSnapshot | 函数 | 14–39 | 合并 governor 核心快照与审计事件统计，输出带超时、迟到结算与跳过原因的完整连接诊断视图。 |

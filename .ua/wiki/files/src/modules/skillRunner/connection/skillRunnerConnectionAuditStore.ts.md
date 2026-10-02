
# src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts -->

SkillRunner 连接审计事件的内存存储：按 governor 实例保留有界事件流与分类计数，供调试开关打开时查询连接排队、超时、跳过与迟到结算等行为。
源码：[src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts)

## 符号（3）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts:readSkillRunnerConnectionAudit -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts:recordSkillRunnerConnectionAuditEvent -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts:resetSkillRunnerConnectionAudit -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| readSkillRunnerConnectionAudit | 函数 | 113–133 | 简单 | diagnostics、snapshot、query | 1 | 读取指定 governor 的审计事件与聚合计数，构造只读快照供诊断消费。 |
| recordSkillRunnerConnectionAuditEvent | 函数 | 77–111 | 中等 | diagnostics、event-store、metrics | 0 | 记录一条连接审计事件：按类型累加分类计数、追加时间戳与后端/泳道上下文，并裁剪超出上限的旧事件。 |
| resetSkillRunnerConnectionAudit | 函数 | 135–137 | 简单 | diagnostics、cleanup、test | 0 | 清空审计事件与计数，供测试与调试会话重置使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerConnectionGovernor.ts](skillRunnerConnectionGovernor.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerConnectionAudit.ts](skillRunnerConnectionAudit.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts | 连接审计的读取门面：把 connection governor 的核心快照与连接审计事件存储合并为单一诊断快照。 |
| [skillRunnerConnectionGovernor.ts](skillRunnerConnectionGovernor.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| readSkillRunnerConnectionAudit | 函数 | 113–133 | 读取指定 governor 的审计事件与聚合计数，构造只读快照供诊断消费。 |
| recordSkillRunnerConnectionAuditEvent | 函数 | 77–111 | 记录一条连接审计事件：按类型累加分类计数、追加时间戳与后端/泳道上下文，并裁剪超出上限的旧事件。 |
| resetSkillRunnerConnectionAudit | 函数 | 135–137 | 清空审计事件与计数，供测试与调试会话重置使用。 |

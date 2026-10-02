
# src/modules/acp/skillRun/acpSkillOutputConvergence.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillOutputConvergence.ts -->

Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。
源码：[src/modules/acp/skillRun/acpSkillOutputConvergence.ts](../../../../../../../src/modules/acp/skillRun/acpSkillOutputConvergence.ts)

## 符号（4）
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputConvergence.ts:convergeAcpSkillTurnOutput -->
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputConvergence.ts:extractAcpSkillTurnJsonCandidate -->
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputConvergence.ts:extractBalancedJsonObject -->
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputConvergence.ts:writeAcpSkillRunnerResultEnvelope -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [convergeAcpSkillTurnOutput](../../../../../symbols/src/modules/acp/skillRun/acpSkillOutputConvergence.ts/convergeAcpSkillTurnOutput.md) | 函数 | 119–200 | 复杂 | acp、output、convergence、entry-point | 1 | 把多轮 Skill 输出的 JSON 片段收敛为单一终态对象，判定 execution mode 并补齐缺失字段。 |
| extractAcpSkillTurnJsonCandidate | 函数 | 73–97 | 中等 | acp、output、parsing、extraction | 0 | 从单轮 Skill 输出中提取 JSON 候选，依次尝试围栏代码块与配平括号两种策略。 |
| extractBalancedJsonObject | 函数 | 39–71 | 中等 | acp、output、json、parsing | 0 | 在自由文本中扫描配平括号，抽取第一个完整 JSON 对象候选，用于收敛 Agent 混杂文本输出。 |
| writeAcpSkillRunnerResultEnvelope | 函数 | 202–210 | 简单 | acp、output、serialization | 0 | 把收敛后的结果写成 runner result envelope，供下游展示与持久化消费。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillOutputValidator.ts](acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [convergeAcpSkillTurnOutput](../../../../../symbols/src/modules/acp/skillRun/acpSkillOutputConvergence.ts/convergeAcpSkillTurnOutput.md) | 函数 | 119–200 | 把多轮 Skill 输出的 JSON 片段收敛为单一终态对象，判定 execution mode 并补齐缺失字段。 |
| extractAcpSkillTurnJsonCandidate | 函数 | 73–97 | 从单轮 Skill 输出中提取 JSON 候选，依次尝试围栏代码块与配平括号两种策略。 |
| writeAcpSkillRunnerResultEnvelope | 函数 | 202–210 | 把收敛后的结果写成 runner result envelope，供下游展示与持久化消费。 |

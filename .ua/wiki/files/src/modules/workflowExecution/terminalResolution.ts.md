
# src/modules/workflowExecution/terminalResolution.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/terminalResolution.ts -->

工作流作业终态解析：把 ACP SkillRun、SkillRunner run store 与序列状态三个来源的观测归一到统一的作业槽位状态和终态结论。

规模：327 行
源码：[src/modules/workflowExecution/terminalResolution.ts](../../../../../../src/modules/workflowExecution/terminalResolution.ts)

## 符号（4）
<!-- node: function:src/modules/workflowExecution/terminalResolution.ts:normalizeJobState -->
<!-- node: function:src/modules/workflowExecution/terminalResolution.ts:resolveProviderTerminalCascade -->
<!-- node: function:src/modules/workflowExecution/terminalResolution.ts:resolveSequenceSlotStatus -->
<!-- node: function:src/modules/workflowExecution/terminalResolution.ts:resolveWorkflowJobTerminalResolution -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeJobState | 函数 | 39–52 | 简单 | normalization、state-machine、utility | 0 | 把后端上报的原始作业状态字符串归一为受控的槽位状态枚举。 |
| resolveProviderTerminalCascade | 函数 | 61–123 | 中等 | state-resolution、provider、workflow | 0 | 级联解析 Provider 侧终态：结合 ACP SkillRun 与 SkillRunner run 记录，判断作业是否已到达终态以及对应的结果证据。 |
| resolveSequenceSlotStatus | 函数 | 125–156 | 中等 | sequence、state-resolution、workflow | 0 | 从序列运行状态中解析单步的槽位状态，用于序列工作流中每个 step 的进度与终态判定。 |
| resolveWorkflowJobTerminalResolution | 函数 | 158–327 | 复杂 | workflow、terminal-state、entry-point | 0 | 工作流作业终态解析入口：协调 provider 终态、序列槽位与状态存储，产出 missing/pending/local-ready/canonical-ready 等终态结论。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [contracts.ts](contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [sequenceStateStore.ts](sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |
| [skillRunnerRunStore.ts](../skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |
| [runSeam.ts](runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveWorkflowJobTerminalResolution | 函数 | 158–327 | 工作流作业终态解析入口：协调 provider 终态、序列槽位与状态存储，产出 missing/pending/local-ready/canonical-ready 等终态结论。 |

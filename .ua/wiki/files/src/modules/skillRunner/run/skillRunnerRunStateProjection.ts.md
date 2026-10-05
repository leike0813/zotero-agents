
# src/modules/skillRunner/run/skillRunnerRunStateProjection.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerRunStateProjection.ts -->

把运行状态与待处理 owner 投影为 UI 可直接消费的组合视图，包含等待归属方、是否应清除 pending 以及状态机违规信息。
源码：[src/modules/skillRunner/run/skillRunnerRunStateProjection.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerRunStateProjection.ts)

## 符号（1）
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStateProjection.ts:projectSkillRunnerRunState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| projectSkillRunnerRunState | 函数 | 31–76 | 中等 | projection、state、view-model | 0 | 综合状态、pending owner 与终态判定，输出运行状态的投影结果供面板渲染。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerProviderStateMachine.ts](skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| projectSkillRunnerRunState | 函数 | 31–76 | 综合状态、pending owner 与终态判定，输出运行状态的投影结果供面板渲染。 |


# src/modules/skillRunner/run/skillRunnerExecutionMode.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerExecutionMode.ts -->

SkillRunner 执行模式解析：把请求中的模式字段规整为已知取值，并为缺省情形给出稳定的默认模式。
源码：[src/modules/skillRunner/run/skillRunnerExecutionMode.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerExecutionMode.ts)

## 符号（2）
<!-- node: function:src/modules/skillRunner/run/skillRunnerExecutionMode.ts:normalizeSkillRunnerExecutionMode -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerExecutionMode.ts:resolveSkillRunnerExecutionModeFromRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeSkillRunnerExecutionMode | 函数 | 7–21 | 简单 | skillrunner、执行模式、validation | 0 | 规整执行模式字符串，非法值回落到默认模式。 |
| resolveSkillRunnerExecutionModeFromRequest | 函数 | 23–40 | 简单 | skillrunner、执行模式、cache | 0 | 从请求对象解析执行模式，兼容旧字段名并做兜底归一。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunForeground.ts](../../acp/skillRun/acpSkillRunForeground.ts.md) | src/modules/acp/skillRun/acpSkillRunForeground.ts | 把指定 skill run 拉到前台：按执行模式选择 run、更新记录中的前台标记，并打开 Assistant Workspace 侧边栏。 |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| normalizeSkillRunnerExecutionMode | 函数 | 7–21 | 规整执行模式字符串，非法值回落到默认模式。 |
| resolveSkillRunnerExecutionModeFromRequest | 函数 | 23–40 | 从请求对象解析执行模式，兼容旧字段名并做兜底归一。 |

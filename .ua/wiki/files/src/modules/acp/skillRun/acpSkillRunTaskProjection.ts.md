
# src/modules/acp/skillRun/acpSkillRunTaskProjection.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunTaskProjection.ts -->

把 ACP Skill run 摘要投影为统一的工作流任务行，使 skill run 能与普通工作流任务在同一 Dashboard/队列中呈现。
源码：[src/modules/acp/skillRun/acpSkillRunTaskProjection.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunTaskProjection.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTaskProjection.ts:mapAcpSkillRunSummaryToWorkflowTask -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunTaskProjection.ts:resolveAcpSkillRunWorkflowTaskState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| mapAcpSkillRunSummaryToWorkflowTask | 函数 | 35–78 | 简单 | projection、acp、skill-run、adapter | 0 | 把 skill run 摘要转换为工作流任务行 DTO，使两类任务在同一队列与 Dashboard 中同构呈现。 |
| resolveAcpSkillRunWorkflowTaskState | 函数 | 9–33 | 简单 | mapping、acp、skill-run、workflow | 0 | 把 ACP skill run 状态解析为统一的工作流任务状态枚举。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [taskRuntime.ts](../../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActiveTasks.ts](../../dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mapAcpSkillRunSummaryToWorkflowTask | 函数 | 35–78 | 把 skill run 摘要转换为工作流任务行 DTO，使两类任务在同一队列与 Dashboard 中同构呈现。 |
| resolveAcpSkillRunWorkflowTaskState | 函数 | 9–33 | 把 ACP skill run 状态解析为统一的工作流任务状态枚举。 |

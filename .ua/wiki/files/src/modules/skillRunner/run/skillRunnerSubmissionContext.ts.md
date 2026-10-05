
# src/modules/skillRunner/run/skillRunnerSubmissionContext.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerSubmissionContext.ts -->

提交上下文小模块：归一化用户提交文本并解析对应的 Skill 展示名，供 run 记录与 UI 共用。
源码：[src/modules/skillRunner/run/skillRunnerSubmissionContext.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerSubmissionContext.ts)

## 符号（1）
<!-- node: function:src/modules/skillRunner/run/skillRunnerSubmissionContext.ts:resolveSkillRunnerSkillDisplay -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveSkillRunnerSkillDisplay | 函数 | 14–28 | 简单 | skillrunner、ui-projection、utility | 0 | 按 skill 标识解析展示名与描述，未注册时回退到标识本身。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [sequenceRuntime.ts](../../workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [sequenceStateStore.ts](../../workflowExecution/sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveSkillRunnerSkillDisplay | 函数 | 14–28 | 按 skill 标识解析展示名与描述，未注册时回退到标识本身。 |

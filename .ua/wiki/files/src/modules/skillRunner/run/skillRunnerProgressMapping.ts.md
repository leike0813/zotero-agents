
# src/modules/skillRunner/run/skillRunnerProgressMapping.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/run](../../../../../modules/src/modules/skillRunner/run.md)
<!-- node: file:src/modules/skillRunner/run/skillRunnerProgressMapping.ts -->

把 SkillRunner 事件流中的进度事件映射为 jobQueue 的 JobState、生命周期阶段与提交阶段，是后端事件语义与插件任务状态之间的翻译层。
源码：[src/modules/skillRunner/run/skillRunnerProgressMapping.ts](../../../../../../../src/modules/skillRunner/run/skillRunnerProgressMapping.ts)

## 符号（3）
<!-- node: function:src/modules/skillRunner/run/skillRunnerProgressMapping.ts:mapSkillRunnerProgressLifecycle -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerProgressMapping.ts:mapSkillRunnerSequenceStepProgressState -->
<!-- node: function:src/modules/skillRunner/run/skillRunnerProgressMapping.ts:mapSkillRunnerSubmitPhase -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| mapSkillRunnerProgressLifecycle | 函数 | 33–55 | 简单 | mapping、state、lifecycle | 0 | 把请求创建、上传、就绪等事件映射为 uploading/running 等生命周期阶段。 |
| mapSkillRunnerSequenceStepProgressState | 函数 | 7–31 | 简单 | mapping、state、workflow | 0 | 按 sequence-step 事件类型映射 JobState，并在 deferred 事件下进一步依据后端状态细分。 |
| mapSkillRunnerSubmitPhase | 函数 | 57–73 | 简单 | mapping、state、ui | 0 | 推导任务提交阶段，用于在 UI 上区分准备、提交与等待后端确认。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [manager.ts](../../../jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runSeam.ts](../../workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mapSkillRunnerProgressLifecycle | 函数 | 33–55 | 把请求创建、上传、就绪等事件映射为 uploading/running 等生命周期阶段。 |
| mapSkillRunnerSequenceStepProgressState | 函数 | 7–31 | 按 sequence-step 事件类型映射 JobState，并在 deferred 事件下进一步依据后端状态细分。 |
| mapSkillRunnerSubmitPhase | 函数 | 57–73 | 推导任务提交阶段，用于在 UI 上区分准备、提交与等待后端确认。 |

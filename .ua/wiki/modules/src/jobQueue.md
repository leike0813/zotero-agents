
# src/jobQueue
> 目录聚合页：3 个文件、4 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/jobQueue/manager.ts](../../files/src/jobQueue/manager.ts.md) | 文件 | 2 | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [src/jobQueue/workflowSubmissionQueue.ts](../../files/src/jobQueue/workflowSubmissionQueue.ts.md) | 文件 | 2 | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [src/jobQueue/workflowSubmissionQueueContracts.ts](../../files/src/jobQueue/workflowSubmissionQueueContracts.ts.md) | 文件 | 0 | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/skillRunner/run](modules/skillRunner/run.md) | 4 |
| [src/modules](modules.md) | 3 |

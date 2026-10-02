
# src/modules/skillRunner/surface/skillRunnerSidebarModel.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/surface](../../../../../modules/src/modules/skillRunner/surface.md)
<!-- node: file:src/modules/skillRunner/surface/skillRunnerSidebarModel.ts -->

SkillRunner 侧边栏的展示模型：把工作区任务按上下文相关性分组为运行中/已完成/待处理区块，并挑选应默认聚焦的任务键。
源码：[src/modules/skillRunner/surface/skillRunnerSidebarModel.ts](../../../../../../../src/modules/skillRunner/surface/skillRunnerSidebarModel.ts)

## 符号（4）
<!-- node: function:src/modules/skillRunner/surface/skillRunnerSidebarModel.ts:buildSkillRunnerSidebarSections -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerSidebarModel.ts:countWaitingSkillRunnerTasks -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerSidebarModel.ts:isSkillRunnerTaskRelatedToContext -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerSidebarModel.ts:pickSkillRunnerSidebarFocusedTaskKey -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSkillRunnerSidebarSections | 函数 | 207–356 | 复杂 | view-model、grouping、sidebar、ui | 0 | 构建侧边栏分区列表，按上下文相关性把任务分配到进行中、待处理与已完成区块。 |
| countWaitingSkillRunnerTasks | 函数 | 358–371 | 简单 | metrics、sidebar、badge | 0 | 统计等待用户处理的任务数量，用于侧边栏 attention 徽标。 |
| isSkillRunnerTaskRelatedToContext | 函数 | 133–147 | 简单 | filtering、sidebar、ui | 1 | 判断任务是否与当前文献上下文相关，用于过滤侧边栏中无关的运行。 |
| pickSkillRunnerSidebarFocusedTaskKey | 函数 | 149–205 | 中等 | selection、sidebar、ui | 1 | 挑选侧边栏应默认聚焦的任务键，优先当前选中项，其次最近活跃的待处理任务。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowSubmissionQueueContracts.ts](../../../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerRunDialog.ts](skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunnerSidebarSections | 函数 | 207–356 | 构建侧边栏分区列表，按上下文相关性把任务分配到进行中、待处理与已完成区块。 |
| countWaitingSkillRunnerTasks | 函数 | 358–371 | 统计等待用户处理的任务数量，用于侧边栏 attention 徽标。 |
| isSkillRunnerTaskRelatedToContext | 函数 | 133–147 | 判断任务是否与当前文献上下文相关，用于过滤侧边栏中无关的运行。 |
| pickSkillRunnerSidebarFocusedTaskKey | 函数 | 149–205 | 挑选侧边栏应默认聚焦的任务键，优先当前选中项，其次最近活跃的待处理任务。 |


# src/modules/taskDashboardSnapshot.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/taskDashboardSnapshot.ts -->

Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。
源码：[src/modules/taskDashboardSnapshot.ts](../../../../../src/modules/taskDashboardSnapshot.ts)

## 符号（6）
<!-- node: function:src/modules/taskDashboardSnapshot.ts:appendSyntheticBackend -->
<!-- node: function:src/modules/taskDashboardSnapshot.ts:mergeDashboardTaskRows -->
<!-- node: function:src/modules/taskDashboardSnapshot.ts:mergeRecordMap -->
<!-- node: function:src/modules/taskDashboardSnapshot.ts:normalizeDashboardBackends -->
<!-- node: function:src/modules/taskDashboardSnapshot.ts:normalizeDashboardTabKey -->
<!-- node: function:src/modules/taskDashboardSnapshot.ts:projectDashboardQueuedRows -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendSyntheticBackend | 函数 | 43–67 | 简单 | normalization、placeholder、dashboard | 0 | 为缺少后端定义的历史记录补出占位后端项，保证表格不出现悬空后端列。 |
| mergeDashboardTaskRows | 函数 | 98–120 | 简单 | merge、deduplication、dashboard、exported | 0 | 合并活动任务行与历史任务行，消解同一任务的重复条目并按更新时间排序。 |
| mergeRecordMap | 函数 | 84–96 | 简单 | merge、utility、internal | 0 | 按 key 合并两组记录映射并保留后写入者，用于叠加多来源任务。 |
| normalizeDashboardBackends | 函数 | 69–82 | 简单 | normalization、backend、dashboard、exported | 0 | 归一化后端实例列表：过滤非法类型、补齐 auth 结构并与任务记录中出现的后端合并。 |
| normalizeDashboardTabKey | 函数 | 179–232 | 中等 | normalization、tab、dashboard、exported | 0 | 归一化 Dashboard 后端标签页键，保证类型与 id 的比较在跨版本运行时稳定。 |
| projectDashboardQueuedRows | 函数 | 143–177 | 简单 | projection、queue、dashboard、exported | 0 | 把工作流提交队列的排队单元投影为 Dashboard 任务行，使尚未真正入队的任务也可见。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [taskDashboardHistory.ts](taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskRuntime.ts](taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [workflowSubmissionQueueContracts.ts](../jobQueue/workflowSubmissionQueueContracts.ts.md) | src/jobQueue/workflowSubmissionQueueContracts.ts | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardRuntime.ts](dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [skillRunnerRunDialog.ts](skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mergeDashboardTaskRows | 函数 | 98–120 | 合并活动任务行与历史任务行，消解同一任务的重复条目并按更新时间排序。 |
| normalizeDashboardBackends | 函数 | 69–82 | 归一化后端实例列表：过滤非法类型、补齐 auth 结构并与任务记录中出现的后端合并。 |
| normalizeDashboardTabKey | 函数 | 179–232 | 归一化 Dashboard 后端标签页键，保证类型与 id 的比较在跨版本运行时稳定。 |
| projectDashboardQueuedRows | 函数 | 143–177 | 把工作流提交队列的排队单元投影为 Dashboard 任务行，使尚未真正入队的任务也可见。 |

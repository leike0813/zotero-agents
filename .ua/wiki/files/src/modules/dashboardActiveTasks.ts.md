
# src/modules/dashboardActiveTasks.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/dashboardActiveTasks.ts -->

Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。
源码：[src/modules/dashboardActiveTasks.ts](../../../../../src/modules/dashboardActiveTasks.ts)

## 符号（6）
<!-- node: function:src/modules/dashboardActiveTasks.ts:countDashboardHumanAttentionTasks -->
<!-- node: function:src/modules/dashboardActiveTasks.ts:filterDashboardActiveTasks -->
<!-- node: function:src/modules/dashboardActiveTasks.ts:getVisibleAcpSkillRunRequestIds -->
<!-- node: function:src/modules/dashboardActiveTasks.ts:isAcpSkillRunTask -->
<!-- node: function:src/modules/dashboardActiveTasks.ts:isVisibleDashboardActiveTask -->
<!-- node: function:src/modules/dashboardActiveTasks.ts:projectDashboardActiveTasks -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| countDashboardHumanAttentionTasks | 函数 | 140–151 | 简单 | metrics、attention、dashboard、task | 0 | 统计需要人工关注的任务数（等待审批、等待输入、失败重试）。 |
| filterDashboardActiveTasks | 函数 | 99–106 | 简单 | filtering、dashboard、task、projection | 0 | 按当前筛选条件过滤活跃任务列表。 |
| getVisibleAcpSkillRunRequestIds | 函数 | 37–44 | 简单 | acp、skill-run、filtering、dashboard | 0 | 收集当前可见的 ACP skill run requestId 集合，用于 owner 过滤。 |
| isAcpSkillRunTask | 函数 | 16–29 | 简单 | predicate、acp、skill-run、task | 0 | 判定任务记录是否为 ACP skill run。 |
| isVisibleDashboardActiveTask | 函数 | 46–61 | 简单 | filtering、visibility、dashboard、task | 0 | 判定任务是否属于当前 Dashboard 可见范围（按 scope 与 owner 过滤）。 |
| projectDashboardActiveTasks | 函数 | 108–138 | 简单 | projection、dashboard、task、view-model | 0 | 把活跃任务记录投影为 Dashboard 行模型，含进度、状态与可执行操作。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStatus.ts](acp/skillRun/acpSkillRunStatus.ts.md) | src/modules/acp/skillRun/acpSkillRunStatus.ts | ACP Skill Run 状态机判定集合：集中回答某状态是否终态、活跃、可恢复，以及终态后能否继续对话与 prompt 失败是否可重试。 |
| [acpSkillRunStore.ts](acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunTaskProjection.ts](acp/skillRun/acpSkillRunTaskProjection.ts.md) | src/modules/acp/skillRun/acpSkillRunTaskProjection.ts | 把 ACP Skill run 摘要投影为统一的工作流任务行，使 skill run 能与普通工作流任务在同一 Dashboard/队列中呈现。 |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [taskRuntime.ts](taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [dashboardActions.ts](dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [hostBridgeWorkflowControl.ts](hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [workspaceTab.ts](workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| countDashboardHumanAttentionTasks | 函数 | 140–151 | 统计需要人工关注的任务数（等待审批、等待输入、失败重试）。 |
| filterDashboardActiveTasks | 函数 | 99–106 | 按当前筛选条件过滤活跃任务列表。 |
| getVisibleAcpSkillRunRequestIds | 函数 | 37–44 | 收集当前可见的 ACP skill run requestId 集合，用于 owner 过滤。 |
| isAcpSkillRunTask | 函数 | 16–29 | 判定任务记录是否为 ACP skill run。 |
| isVisibleDashboardActiveTask | 函数 | 46–61 | 判定任务是否属于当前 Dashboard 可见范围（按 scope 与 owner 过滤）。 |
| projectDashboardActiveTasks | 函数 | 108–138 | 把活跃任务记录投影为 Dashboard 行模型，含进度、状态与可执行操作。 |

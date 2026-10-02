
# src/modules/taskRetentionPolicy.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/taskRetentionPolicy.ts -->

任务记录保留策略的单一事实源，导出统一的保留时长常量，供 Host Bridge operation store、Dashboard history 等持久化层共同引用。
源码：[src/modules/taskRetentionPolicy.ts](../../../../../src/modules/taskRetentionPolicy.ts)

## 符号（1）
<!-- node: function:src/modules/taskRetentionPolicy.ts:getTaskHistoryRetentionConfig -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getTaskHistoryRetentionConfig | 函数 | 5–10 | 简单 | 保留策略、单一事实源、配置 | 0 | 返回任务历史保留时长与容量上限的唯一配置来源，供各持久化层共享。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeOperationStore.ts](hostBridge/server/hostBridgeOperationStore.ts.md) | src/modules/hostBridge/server/hostBridgeOperationStore.ts | Host Bridge 服务端操作存储：基于 pluginStateStore 记录 Bridge 操作的 view 与 receipt，并按任务保留策略清理过期记录。 |
| [hostBridgeWorkflowAgentRunStore.ts](hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [runtimePersistenceGovernance.ts](runtimePersistenceGovernance.ts.md) | src/modules/runtimePersistenceGovernance.ts | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [taskDashboardHistory.ts](taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getTaskHistoryRetentionConfig | 函数 | 5–10 | 返回任务历史保留时长与容量上限的唯一配置来源，供各持久化层共享。 |

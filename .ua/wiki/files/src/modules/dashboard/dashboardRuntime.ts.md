
# src/modules/dashboard/dashboardRuntime.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/dashboard](../../../../modules/src/modules/dashboard.md)
<!-- node: file:src/modules/dashboard/dashboardRuntime.ts -->

Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。
源码：[src/modules/dashboard/dashboardRuntime.ts](../../../../../../src/modules/dashboard/dashboardRuntime.ts)

## 符号（2）
<!-- node: function:src/modules/dashboard/dashboardRuntime.ts:createTaskDashboardRuntime -->
<!-- node: function:src/modules/dashboard/dashboardRuntime.ts:shouldDashboardReadBackendRows -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createTaskDashboardRuntime | 函数 | 147–934 | 复杂 | factory、runtime、dashboard、caching | 0 | 构造 Task Dashboard 运行时：按 signature 判定是否需要重建快照，并串接后端读取、工作流摘要与页面挂载。 |
| shouldDashboardReadBackendRows | 函数 | 94–113 | 简单 | decision、caching、backend、dashboard | 0 | 判定当前是否需要重读后端行，依据 signature 变化与首次加载状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](../acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [backgroundRefreshGovernance.ts](../backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [dashboardActions.ts](dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardFrame.ts](dashboardFrame.ts.md) | src/modules/dashboard/dashboardFrame.ts | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |
| [dashboardSnapshot.ts](dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [debugMode.ts](../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [displayName.ts](../../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [registry.ts](../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [skillRunnerBackendHealthRegistry.ts](../skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [taskDashboardHistory.ts](../taskDashboardHistory.ts.md) | src/modules/taskDashboardHistory.ts | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [taskDashboardSnapshot.ts](../taskDashboardSnapshot.ts.md) | src/modules/taskDashboardSnapshot.ts | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |
| [taskRuntime.ts](../taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [workflowRuntime.ts](../workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettings.ts](../workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSubmissionQueue.ts](../../jobQueue/workflowSubmissionQueue.ts.md) | src/jobQueue/workflowSubmissionQueue.ts | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [workflowVisibility.ts](../workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardHost.ts](../dashboardHost.ts.md) | src/modules/dashboardHost.ts | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createTaskDashboardRuntime | 函数 | 147–934 | 构造 Task Dashboard 运行时：按 signature 判定是否需要重建快照，并串接后端读取、工作流摘要与页面挂载。 |

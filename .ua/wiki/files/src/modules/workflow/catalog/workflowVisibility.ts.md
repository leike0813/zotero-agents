
# src/modules/workflow/catalog/workflowVisibility.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/workflowVisibility.ts -->

工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。
源码：[src/modules/workflow/catalog/workflowVisibility.ts](../../../../../../../src/modules/workflow/catalog/workflowVisibility.ts)

## 符号（3）
<!-- node: function:src/modules/workflow/catalog/workflowVisibility.ts:getVisibleLoadedWorkflowEntries -->
<!-- node: function:src/modules/workflow/catalog/workflowVisibility.ts:isWorkflowDebugOnly -->
<!-- node: function:src/modules/workflow/catalog/workflowVisibility.ts:isWorkflowVisible -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [getVisibleLoadedWorkflowEntries](../../../../../symbols/src/modules/workflow/catalog/workflowVisibility.ts/getVisibleLoadedWorkflowEntries.md) | 函数 | 26–28 | 简单 | workflow、catalog、filter | 2 | 从已加载工作流注册表中筛出当前可见的条目。 |
| isWorkflowDebugOnly | 函数 | 15–17 | 简单 | predicate、workflow、visibility | 1 | 判断工作流是否标记为 debug_only。 |
| isWorkflowVisible | 函数 | 19–24 | 简单 | predicate、workflow、visibility、debug-mode | 1 | 结合 debug_only 标记与全局 debug 开关判定工作流是否可见。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowRuntime.ts](workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantReadonlyPublication.ts](../../harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardReadonlyModel.ts](../../harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [dashboardRuntime.ts](../../dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [dashboardSnapshot.ts](../../dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hostBridgeWorkflowControl.ts](../../hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [workflowDebugProbe.ts](../ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowMenu.ts](../ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowSettingsDialog.ts](../settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [getVisibleLoadedWorkflowEntries](../../../../../symbols/src/modules/workflow/catalog/workflowVisibility.ts/getVisibleLoadedWorkflowEntries.md) | 函数 | 26–28 | 从已加载工作流注册表中筛出当前可见的条目。 |
| isWorkflowDebugOnly | 函数 | 15–17 | 判断工作流是否标记为 debug_only。 |
| isWorkflowVisible | 函数 | 19–24 | 结合 debug_only 标记与全局 debug 开关判定工作流是否可见。 |


# src/modules/dashboardHost.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/dashboardHost.ts -->

任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。
源码：[src/modules/dashboardHost.ts](../../../../../src/modules/dashboardHost.ts)

## 符号（3）
<!-- node: function:src/modules/dashboardHost.ts:mountTaskDashboardRuntime -->
<!-- node: function:src/modules/dashboardHost.ts:openTaskDashboard -->
<!-- node: function:src/modules/dashboardHost.ts:resetTaskDashboardHostForTests -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| mountTaskDashboardRuntime | 函数 | 117–127 | 简单 | dashboard、ui-host、factory | 0 | 把 Dashboard 运行时挂载到指定 DOM 根节点并返回句柄，供侧边栏等嵌入式宿主复用。 |
| openTaskDashboard | 函数 | 36–115 | 中等 | entry-point、dashboard、ui-host | 0 | 打开任务 Dashboard 的统一入口，按参数区分嵌入式挂载与独立弹窗两条路径，并在窗口失效时回退到单例运行时。 |
| resetTaskDashboardHostForTests | 函数 | 129–138 | 简单 | test、cleanup、dashboard | 0 | 清理模块级 Dashboard 单例状态，供测试隔离使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardRuntime.ts](dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [locale.ts](../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [window.ts](../utils/window.ts.md) | src/utils/window.ts | 判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [synthesisWorkbenchTab.ts](synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [testRuntimeCleanup.ts](testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [workspaceTab.ts](workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| mountTaskDashboardRuntime | 函数 | 117–127 | 把 Dashboard 运行时挂载到指定 DOM 根节点并返回句柄，供侧边栏等嵌入式宿主复用。 |
| openTaskDashboard | 函数 | 36–115 | 打开任务 Dashboard 的统一入口，按参数区分嵌入式挂载与独立弹窗两条路径，并在窗口失效时回退到单例运行时。 |
| resetTaskDashboardHostForTests | 函数 | 129–138 | 清理模块级 Dashboard 单例状态，供测试隔离使用。 |

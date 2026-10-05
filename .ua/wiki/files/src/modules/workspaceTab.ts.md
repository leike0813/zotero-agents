
# src/modules/workspaceTab.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/workspaceTab.ts -->

工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。
源码：[src/modules/workspaceTab.ts](../../../../../src/modules/workspaceTab.ts)

## 符号（14）
<!-- node: function:src/modules/workspaceTab.ts:buildWorkspaceShellLabels -->
<!-- node: function:src/modules/workspaceTab.ts:cleanupWorkspaceTab -->
<!-- node: function:src/modules/workspaceTab.ts:createManagementHost -->
<!-- node: function:src/modules/workspaceTab.ts:createWorkspaceBrowser -->
<!-- node: function:src/modules/workspaceTab.ts:handleAction -->
<!-- node: function:src/modules/workspaceTab.ts:installBridge -->
<!-- node: function:src/modules/workspaceTab.ts:installWorkspaceSidebarTaskPopover -->
<!-- node: function:src/modules/workspaceTab.ts:mountDashboardRuntimeIfReady -->
<!-- node: function:src/modules/workspaceTab.ts:mountSynthesisRuntimeIfReady -->
<!-- node: function:src/modules/workspaceTab.ts:openZoteroSkillsWorkspaceTab -->
<!-- node: function:src/modules/workspaceTab.ts:postAttention -->
<!-- node: function:src/modules/workspaceTab.ts:postSnapshot -->
<!-- node: function:src/modules/workspaceTab.ts:scheduleWorkspaceHandshake -->
<!-- node: function:src/modules/workspaceTab.ts:syncWorkspaceTabSelectionState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildWorkspaceShellLabels | 函数 | 109–166 | 中等 | i18n、labels、workspace | 0 | 汇总工作台外壳所需的全部本地化文案（标签、菜单与错误提示）。 |
| cleanupWorkspaceTab | 函数 | 775–790 | 简单 | cleanup、lifecycle、workspace | 0 | 工作台关闭时的完整清理：停止握手、卸载页面运行时并释放 bridge 与监听。 |
| createManagementHost | 函数 | 264–374 | 中等 | dom、overlay、workspace | 0 | 创建管理型页面（Dashboard / Synthesis）共用的承载宿主与遮罩层。 |
| createWorkspaceBrowser | 函数 | 192–211 | 简单 | dom、browser、workspace | 0 | 创建并初始化工作台主 browser 元素，注入插件样式后返回容器信息。 |
| handleAction | 函数 | 701–773 | 中等 | dispatch、actions、workspace | 0 | 工作台宿主动作分发器：按 action 类型路由到 Dashboard、Synthesis、侧边栏或文档跳转。 |
| installBridge | 函数 | 417–433 | 简单 | bridge、injection、workspace | 0 | 向工作台 iframe 注入宿主 bridge，使页面可以回调宿主能力。 |
| installWorkspaceSidebarTaskPopover | 函数 | 485–501 | 简单 | toolbar、popover、integration | 0 | 在工作台工具栏安装任务气泡，并按活动任务变化触发刷新。 |
| mountDashboardRuntimeIfReady | 函数 | 642–669 | 简单 | lifecycle、dashboard、deferred-init | 0 | 页面握手就绪后按需挂载 Dashboard 控制器，避免页面未就绪时提前初始化。 |
| mountSynthesisRuntimeIfReady | 函数 | 677–694 | 简单 | lifecycle、synthesis、deferred-init | 0 | 页面握手就绪后按需挂载 Synthesis 工作台控制器。 |
| openZoteroSkillsWorkspaceTab | 函数 | 822–921 | 中等 | entry-point、tab、workspace、exported | 0 | 打开（或聚焦）Zotero Agents 工作台标签页的主入口，负责创建标签、注入内容与完成握手。 |
| postAttention | 函数 | 458–473 | 简单 | attention、badge、workspace | 0 | 统计需要人工关注的任务数并更新工作台入口上的角标提示。 |
| postSnapshot | 函数 | 539–562 | 简单 | publication、signature、performance | 0 | 按 region signature 判断后投递快照给页面，避免无变化时重复传输。 |
| scheduleWorkspaceHandshake | 函数 | 604–640 | 简单 | handshake、retry、workspace | 0 | 调度宿主与工作台页面的握手重试，直到页面确认 ready 或达到重试上限。 |
| syncWorkspaceTabSelectionState | 函数 | 508–521 | 简单 | selection、sync、workspace | 0 | 把当前选中的工作台标签同步到页面侧，保证选中态在重载后不丢失。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](acp/skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [backgroundRefreshGovernance.ts](backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [dashboardActiveTasks.ts](dashboardActiveTasks.ts.md) | src/modules/dashboardActiveTasks.ts | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [dashboardHost.ts](dashboardHost.ts.md) | src/modules/dashboardHost.ts | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |
| [docsUrl.ts](../utils/docsUrl.ts.md) | src/utils/docsUrl.ts | 帮助中心文档链接构造：按用户 locale 选择 GitHub Pages 或本地站点基址，处理 zh-CN 前缀拼接与 debug 模式下的本地回退。 |
| [helpCenterTab.ts](helpCenterTab.ts.md) | src/modules/helpCenterTab.ts | 帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。 |
| [locale.ts](../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [synthesisWorkbenchTab.ts](synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [taskRuntime.ts](taskRuntime.ts.md) | src/modules/taskRuntime.ts | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [workspaceToolbarTaskPopover.ts](workspaceToolbarTaskPopover.ts.md) | src/modules/workspaceToolbarTaskPopover.ts | Zotero 主窗口工具栏的任务气泡：用 XUL 元素实现悬停/点击展开的任务列表弹层，按状态渲染 LED 色调、显示可见任务行并支持直接打开对应工作台。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| openZoteroSkillsWorkspaceTab | 函数 | 822–921 | 打开（或聚焦）Zotero Agents 工作台标签页的主入口，负责创建标签、注入内容与完成握手。 |

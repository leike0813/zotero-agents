
# src/modules/dashboardToolbarButton.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/dashboardToolbarButton.ts -->

Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。
源码：[src/modules/dashboardToolbarButton.ts](../../../../../src/modules/dashboardToolbarButton.ts)

## 符号（8）
<!-- node: function:src/modules/dashboardToolbarButton.ts:applyToolbarButtonStyling -->
<!-- node: function:src/modules/dashboardToolbarButton.ts:ensureDashboardOnlyToolbarButton -->
<!-- node: function:src/modules/dashboardToolbarButton.ts:ensureDashboardToolbarButton -->
<!-- node: function:src/modules/dashboardToolbarButton.ts:ensureExecuteWorkflowToolbarButton -->
<!-- node: function:src/modules/dashboardToolbarButton.ts:ensureSkillRunnerToolbarButton -->
<!-- node: function:src/modules/dashboardToolbarButton.ts:removeDashboardToolbarButton -->
<!-- node: function:src/modules/dashboardToolbarButton.ts:syncToolbarButtonIconFill -->
<!-- node: function:src/modules/dashboardToolbarButton.ts:updateAssistantToolbarAttention -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyToolbarButtonStyling | 函数 | 116–130 | 简单 | ui、styling、toolbar | 1 | 为工具栏按钮统一设置图标 URI、尺寸与 tooltip 等样式属性。 |
| ensureDashboardOnlyToolbarButton | 函数 | 256–304 | 中等 | ui、toolbar、dashboard | 0 | 在只暴露 Dashboard 能力的精简工具栏上注入对应的导航按钮。 |
| ensureDashboardToolbarButton | 函数 | 395–404 | 简单 | entry-point、ui、toolbar、dashboard | 1 | 对外暴露的工具栏装配入口，确保 Dashboard 按钮在指定窗口存在。 |
| ensureExecuteWorkflowToolbarButton | 函数 | 185–254 | 中等 | ui、toolbar、workflow、menu | 0 | 创建或复用「执行工作流」工具栏按钮，插入到工作流搜索框之后，并在点击时触发工作流菜单。 |
| ensureSkillRunnerToolbarButton | 函数 | 306–367 | 中等 | ui、toolbar、skillrunner、migration | 0 | 创建或复用 SkillRunner 工具栏按钮，并清理历史遗留的旧版 attention 按钮。 |
| removeDashboardToolbarButton | 函数 | 406–423 | 简单 | ui、toolbar、cleanup | 1 | 从窗口工具栏移除已注入的 Dashboard 按钮，用于窗口关闭或插件卸载场景。 |
| syncToolbarButtonIconFill | 函数 | 132–167 | 中等 | ui、theme、toolbar、icon | 0 | 按窗口主题与状态同步按钮图标的填充色，使图标在浅色/深色主题下都可辨识。 |
| updateAssistantToolbarAttention | 函数 | 369–393 | 简单 | ui、toolbar、assistant、badge | 0 | 根据等待用户处理的 Assistant 任务数量更新工具栏按钮的 attention 徽标。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [locale.ts](../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [workflowMenu.ts](workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workspaceToolbarTaskPopover.ts](workspaceToolbarTaskPopover.ts.md) | src/modules/workspaceToolbarTaskPopover.ts | Zotero 主窗口工具栏的任务气泡：用 XUL 元素实现悬停/点击展开的任务列表弹层，按状态渲染 LED 色调、显示可见任务行并支持直接打开对应工作台。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyToolbarButtonStyling | 函数 | 116–130 | 为工具栏按钮统一设置图标 URI、尺寸与 tooltip 等样式属性。 |
| ensureDashboardToolbarButton | 函数 | 395–404 | 对外暴露的工具栏装配入口，确保 Dashboard 按钮在指定窗口存在。 |
| removeDashboardToolbarButton | 函数 | 406–423 | 从窗口工具栏移除已注入的 Dashboard 按钮，用于窗口关闭或插件卸载场景。 |
| syncToolbarButtonIconFill | 函数 | 132–167 | 按窗口主题与状态同步按钮图标的填充色，使图标在浅色/深色主题下都可辨识。 |
| updateAssistantToolbarAttention | 函数 | 369–393 | 根据等待用户处理的 Assistant 任务数量更新工具栏按钮的 attention 徽标。 |

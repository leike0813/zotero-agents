
# src/modules/workspaceToolbarTaskPopover.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/workspaceToolbarTaskPopover.ts -->

Zotero 主窗口工具栏的任务气泡：用 XUL 元素实现悬停/点击展开的任务列表弹层，按状态渲染 LED 色调、显示可见任务行并支持直接打开对应工作台。
源码：[src/modules/workspaceToolbarTaskPopover.ts](../../../../../src/modules/workspaceToolbarTaskPopover.ts)

## 符号（11）
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:closePopover -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:installWorkspaceToolbarTaskPopover -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:isActivationInsidePopoverRuntime -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:listVisibleRows -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:openPopover -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:openTaskFromPopover -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:positionPopover -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:renderPopover -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:resolveTaskLedTone -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:uninstallWorkspaceToolbarTaskPopover -->
<!-- node: function:src/modules/workspaceToolbarTaskPopover.ts:xulLed -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| closePopover | 函数 | 581–594 | 简单 | popover、cleanup、xul | 0 | 关闭任务弹层并清理相关定时器与事件。 |
| installWorkspaceToolbarTaskPopover | 函数 | 635–704 | 中等 | toolbar、installation、integration、exported | 0 | 在 Zotero 主窗口工具栏创建锚点并注册后台刷新定时器，完成弹层安装。 |
| isActivationInsidePopoverRuntime | 函数 | 345–353 | 简单 | event-handling、popover、defensive | 0 | 判定激活动作是否发生在弹层自身运行时内，避免自关闭。 |
| listVisibleRows | 函数 | 248–263 | 简单 | filtering、visibility、task-ui | 0 | 从活动任务中筛出工具栏可见行，按需排除 ACP Skill Run 等隐藏任务。 |
| openPopover | 函数 | 552–579 | 简单 | popover、lifecycle、xul | 0 | 以锚点元素打开任务弹层并注册外部点击关闭逻辑。 |
| openTaskFromPopover | 函数 | 290–313 | 简单 | navigation、popover、task-ui | 0 | 从弹层中的任务行打开对应工作台，并把该任务设为当前焦点。 |
| positionPopover | 函数 | 362–370 | 简单 | layout、positioning、popover | 0 | 按锚点位置与列宽约束计算弹层坐标，避免超出窗口边界。 |
| renderPopover | 函数 | 372–550 | 复杂 | render、xul、popover | 0 | 重建弹层内容：渲染状态 LED、任务名、后端与操作入口，并同步弹层尺寸。 |
| resolveTaskLedTone | 函数 | 154–197 | 中等 | presentation、state、visual | 0 | 按任务状态解析 LED 色调，使运行中/等待/失败在工具栏上可快速区分。 |
| uninstallWorkspaceToolbarTaskPopover | 函数 | 706–721 | 简单 | toolbar、cleanup、integration、exported | 0 | 卸载工具栏任务气泡：移除锚点、注销刷新定时器并关闭弹层。 |
| xulLed | 函数 | 199–228 | 简单 | xul、component、visual | 0 | 构造带色调的 XUL 状态指示灯元素。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backgroundRefreshGovernance.ts](backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [locale.ts](../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardToolbarButton.ts](dashboardToolbarButton.ts.md) | src/modules/dashboardToolbarButton.ts | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [workspaceTab.ts](workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| installWorkspaceToolbarTaskPopover | 函数 | 635–704 | 在 Zotero 主窗口工具栏创建锚点并注册后台刷新定时器，完成弹层安装。 |
| uninstallWorkspaceToolbarTaskPopover | 函数 | 706–721 | 卸载工具栏任务气泡：移除锚点、注销刷新定时器并关闭弹层。 |

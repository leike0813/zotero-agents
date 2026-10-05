
# src/sidebar/components/ActionControls.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/ActionControls.tsx -->

面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。
源码：[src/sidebar/components/ActionControls.tsx](../../../../../../src/sidebar/components/ActionControls.tsx)

## 符号（6）
<!-- node: function:src/sidebar/components/ActionControls.tsx:ExecutionDisplayModeAction -->
<!-- node: function:src/sidebar/components/ActionControls.tsx:optionLabel -->
<!-- node: function:src/sidebar/components/ActionControls.tsx:PanelAction -->
<!-- node: function:src/sidebar/components/ActionControls.tsx:PanelActionButton -->
<!-- node: function:src/sidebar/components/ActionControls.tsx:PanelActionSwitch -->
<!-- node: function:src/sidebar/components/ActionControls.tsx:SelectControl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ExecutionDisplayModeAction | 函数 | 103–169 | 中等 | component、ui-control、view-mode、preact | 0 | 执行展示模式动作控件，把模式选择投影为分段选项。 |
| optionLabel | 函数 | 201–208 | 简单 | projection、ui-control、label、utility | 1 | 把选项 DTO 投影为展示文案，缺省回落到选项值。 |
| [PanelAction](../../../../symbols/src/sidebar/components/ActionControls.tsx/PanelAction.md) | 函数 | 171–190 | 简单 | component、dispatch、ui-control、preact | 2 | 动作分发组件：按动作类型选择按钮、开关或下拉控件渲染。 |
| PanelActionButton | 函数 | 21–43 | 简单 | component、ui-control、action-dispatch、preact | 1 | 面板动作按钮，按 DTO 中的 tone 与 disabled 状态渲染并派发动作。 |
| PanelActionSwitch | 函数 | 45–99 | 中等 | component、toggle、ui-control、preact | 1 | 开关型动作控件，用于后端连接、展示模式等二态切换。 |
| SelectControl | 函数 | 210–269 | 中等 | component、ui-control、form-control、preact | 1 | 通用下拉选择控件，负责选项值与文案映射并回报选择结果。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [BannerRegion.tsx](BannerRegion.tsx.md) | src/sidebar/components/BannerRegion.tsx | Workspace 顶部横幅区域：渲染后端连接状态徽章与指示灯 LED，并把 banner 上可执行动作交给 ActionControls 派发。 |
| [ContextDrawerRegion.tsx](ContextDrawerRegion.tsx.md) | src/sidebar/components/ContextDrawerRegion.tsx | 上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。 |
| [DetailsDrawerRegion.tsx](DetailsDrawerRegion.tsx.md) | src/sidebar/components/DetailsDrawerRegion.tsx | 详情抽屉区域：把详情区块投影为分节条目渲染，并内嵌 Hint 区域呈现说明文本。 |
| [HintRegion.tsx](HintRegion.tsx.md) | src/sidebar/components/HintRegion.tsx | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [PermissionDrawerRegion.tsx](PermissionDrawerRegion.tsx.md) | src/sidebar/components/PermissionDrawerRegion.tsx | 权限请求抽屉区域：列出待审批的权限请求项及选项按钮，并组合 Hint 区域给出补充说明。 |
| [ReplyRegion.tsx](ReplyRegion.tsx.md) | src/sidebar/components/ReplyRegion.tsx | 回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。 |
| [ToolbarRegion.tsx](ToolbarRegion.tsx.md) | src/sidebar/components/ToolbarRegion.tsx | 工具栏区域：组合视图模式切换与面板级操作按钮，作为非 transcript 的固定 chrome 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [PanelAction](../../../../symbols/src/sidebar/components/ActionControls.tsx/PanelAction.md) | 函数 | 171–190 | 动作分发组件：按动作类型选择按钮、开关或下拉控件渲染。 |
| SelectControl | 函数 | 210–269 | 通用下拉选择控件，负责选项值与文案映射并回报选择结果。 |


# src/sidebar/components/ContextDrawerRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/ContextDrawerRegion.tsx -->

上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。
源码：[src/sidebar/components/ContextDrawerRegion.tsx](../../../../../../src/sidebar/components/ContextDrawerRegion.tsx)

## 符号（6）
<!-- node: function:src/sidebar/components/ContextDrawerRegion.tsx:MainStatusBadge -->
<!-- node: function:src/sidebar/components/ContextDrawerRegion.tsx:sectionTasks -->
<!-- node: function:src/sidebar/components/ContextDrawerRegion.tsx:StatusAxis -->
<!-- node: function:src/sidebar/components/ContextDrawerRegion.tsx:WorkspaceGroup -->
<!-- node: function:src/sidebar/components/ContextDrawerRegion.tsx:WorkspaceTask -->
<!-- node: function:src/sidebar/components/ContextDrawerRegion.tsx:WorkspaceTaskAction -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| MainStatusBadge | 函数 | 102–122 | 简单 | component、badge、status-indicator、preact | 0 | 主状态徽章：展示分组/面板级汇总状态。 |
| sectionTasks | 函数 | 389–398 | 简单 | projection、grouping、drawer、utility | 1 | 按 section 归类任务，供抽屉分区渲染。 |
| StatusAxis | 函数 | 124–136 | 简单 | component、layout、task-status、preact | 0 | 状态轴容器：为任务列表提供状态列对齐基准。 |
| WorkspaceGroup | 函数 | 307–387 | 中等 | component、task-grouping、drawer、preact | 0 | 任务分组：按分组键聚合任务并提供分组级折叠与汇总状态。 |
| [WorkspaceTask](../../../../symbols/src/sidebar/components/ContextDrawerRegion.tsx/WorkspaceTask.md) | 函数 | 138–305 | 复杂 | component、task-status、row、preact | 1 | 单个工作区任务行：状态徽章、文案、进度与动作的完整呈现。 |
| WorkspaceTaskAction | 函数 | 66–100 | 中等 | component、action-dispatch、task-status、preact | 1 | 任务级操作按钮组：把任务 DTO 的动作列表渲染为可点击控件。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ActionControls.tsx](ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [BannerRegion.tsx](BannerRegion.tsx.md) | src/sidebar/components/BannerRegion.tsx | Workspace 顶部横幅区域：渲染后端连接状态徽章与指示灯 LED，并把 banner 上可执行动作交给 ActionControls 派发。 |
| [HintRegion.tsx](HintRegion.tsx.md) | src/sidebar/components/HintRegion.tsx | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |

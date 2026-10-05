
# src/sidebar/components/BannerRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/BannerRegion.tsx -->

Workspace 顶部横幅区域：渲染后端连接状态徽章与指示灯 LED，并把 banner 上可执行动作交给 ActionControls 派发。
源码：[src/sidebar/components/BannerRegion.tsx](../../../../../../src/sidebar/components/BannerRegion.tsx)

## 符号（2）
<!-- node: function:src/sidebar/components/BannerRegion.tsx:BannerIndicator -->
<!-- node: function:src/sidebar/components/BannerRegion.tsx:BannerStatusBadge -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| BannerIndicator | 函数 | 57–102 | 中等 | component、status-indicator、region、preact | 0 | 横幅指示器：组合 LED 状态点、状态文案与可执行动作。 |
| BannerStatusBadge | 函数 | 27–55 | 简单 | component、status-indicator、badge、preact | 1 | 横幅状态徽章：按色调渲染状态点与文案。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ActionControls.tsx](ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
| [ContextDrawerRegion.tsx](ContextDrawerRegion.tsx.md) | src/sidebar/components/ContextDrawerRegion.tsx | 上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。 |

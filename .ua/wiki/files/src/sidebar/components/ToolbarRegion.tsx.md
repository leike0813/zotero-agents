
# src/sidebar/components/ToolbarRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/ToolbarRegion.tsx -->

工具栏区域：组合视图模式切换与面板级操作按钮，作为非 transcript 的固定 chrome 区域。
源码：[src/sidebar/components/ToolbarRegion.tsx](../../../../../../src/sidebar/components/ToolbarRegion.tsx)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ActionControls.tsx](ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |

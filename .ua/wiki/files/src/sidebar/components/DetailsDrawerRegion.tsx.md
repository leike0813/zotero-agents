
# src/sidebar/components/DetailsDrawerRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/DetailsDrawerRegion.tsx -->

详情抽屉区域：把详情区块投影为分节条目渲染，并内嵌 Hint 区域呈现说明文本。
源码：[src/sidebar/components/DetailsDrawerRegion.tsx](../../../../../../src/sidebar/components/DetailsDrawerRegion.tsx)

## 符号（2）
<!-- node: function:src/sidebar/components/DetailsDrawerRegion.tsx:DetailsEntry -->
<!-- node: function:src/sidebar/components/DetailsDrawerRegion.tsx:DetailsSection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| DetailsEntry | 函数 | 24–44 | 简单 | component、detail-projection、drawer、preact | 1 | 详情条目：渲染键值对文本与可选操作。 |
| DetailsSection | 函数 | 46–106 | 中等 | component、drawer、section、preact | 0 | 详情区块：组合标题、多个条目与内嵌 hint 区域。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ActionControls.tsx](ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [HintRegion.tsx](HintRegion.tsx.md) | src/sidebar/components/HintRegion.tsx | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |

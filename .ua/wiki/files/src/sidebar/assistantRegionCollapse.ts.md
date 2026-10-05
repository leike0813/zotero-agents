
# src/sidebar/assistantRegionCollapse.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/assistantRegionCollapse.ts -->

Assistant Workspace 区域折叠控制器：按区域可见性自动决定折叠阶段，并维护用户覆盖态，折叠只切换容器 class 与 data 属性。
源码：[src/sidebar/assistantRegionCollapse.ts](../../../../../src/sidebar/assistantRegionCollapse.ts)

## 符号（5）
<!-- node: function:src/sidebar/assistantRegionCollapse.ts:autoCollapsed -->
<!-- node: function:src/sidebar/assistantRegionCollapse.ts:createRegionCollapseController -->
<!-- node: function:src/sidebar/assistantRegionCollapse.ts:effectiveCollapsed -->
<!-- node: function:src/sidebar/assistantRegionCollapse.ts:nextOverride -->
<!-- node: function:src/sidebar/assistantRegionCollapse.ts:resolveAutoStage -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| autoCollapsed | 函数 | 76–81 | 简单 | collapse、ui-state、pure-function、utility | 0 | 判断区域在给定自动阶段下是否应处于折叠态。 |
| createRegionCollapseController | 函数 | 122–246 | 中等 | collapse、controller、entry-point、ui-state、resize-observer | 1 | 创建区域折叠控制器：挂 ResizeObserver 推导自动阶段、绑定折叠把手，并且只切换容器 class 与根节点 data 属性。 |
| effectiveCollapsed | 函数 | 83–89 | 简单 | collapse、ui-state、pure-function、utility | 0 | 结合用户覆盖与自动阶段得出区域的最终折叠态。 |
| nextOverride | 函数 | 94–100 | 简单 | collapse、state-transition、ui-state、utility | 1 | 点击折叠把手时计算新的用户覆盖值；切回自动建议值即清除覆盖。 |
| resolveAutoStage | 函数 | 57–74 | 简单 | collapse、state-machine、hysteresis、ui-state | 1 | 按视口高度与上一阶段解出自动折叠阶段，使用 enter/exit 双阈值形成迟滞区间防止抖动。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceAcpChild.js](assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| createRegionCollapseController | src/sidebar/assistantRegionCollapse.ts | 创建区域折叠控制器：挂 ResizeObserver 推导自动阶段、绑定折叠把手，并且只切换容器 class 与根节点 data 属性。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| autoCollapsed | 函数 | 76–81 | 判断区域在给定自动阶段下是否应处于折叠态。 |
| createRegionCollapseController | 函数 | 122–246 | 创建区域折叠控制器：挂 ResizeObserver 推导自动阶段、绑定折叠把手，并且只切换容器 class 与根节点 data 属性。 |
| effectiveCollapsed | 函数 | 83–89 | 结合用户覆盖与自动阶段得出区域的最终折叠态。 |
| nextOverride | 函数 | 94–100 | 点击折叠把手时计算新的用户覆盖值；切回自动建议值即清除覆盖。 |
| resolveAutoStage | 函数 | 57–74 | 按视口高度与上一阶段解出自动折叠阶段，使用 enter/exit 双阈值形成迟滞区间防止抖动。 |

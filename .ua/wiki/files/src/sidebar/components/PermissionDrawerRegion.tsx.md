
# src/sidebar/components/PermissionDrawerRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/PermissionDrawerRegion.tsx -->

权限请求抽屉区域：列出待审批的权限请求项及选项按钮，并组合 Hint 区域给出补充说明。
源码：[src/sidebar/components/PermissionDrawerRegion.tsx](../../../../../../src/sidebar/components/PermissionDrawerRegion.tsx)

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

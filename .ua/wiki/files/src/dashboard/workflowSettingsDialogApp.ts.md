
# src/dashboard/workflowSettingsDialogApp.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/workflowSettingsDialogApp.ts -->

独立工作流设置对话框的页面入口：建立 workflow-settings-dialog postMessage 通道，接收宿主快照后投影为 selection 并交给对话框区域渲染。
源码：[src/dashboard/workflowSettingsDialogApp.ts](../../../../../src/dashboard/workflowSettingsDialogApp.ts)

## 符号（2）
<!-- node: function:src/dashboard/workflowSettingsDialogApp.ts:bootstrapWorkflowSettingsDialogApp -->
<!-- node: function:src/dashboard/workflowSettingsDialogApp.ts:sendWorkflowSettingsDialogAction -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bootstrapWorkflowSettingsDialogApp | 函数 | 50–104 | 中等 | bootstrap、entry-point、wiring | 0 | 对话框引导：绑定宿主 init/snapshot 消息、创建 selection 投影与 Preact 渲染入口，并向上发送 ready 声明。 |
| sendWorkflowSettingsDialogAction | 函数 | 25–48 | 简单 | message-protocol、action-dispatch | 0 | 把设置对话框动作封装为 postMessage 信封投递到 parent/top/opener，并按引用去重。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardWireContract.ts](../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [WorkflowSettingsDialogRegion.tsx](components/WorkflowSettingsDialogRegion.tsx.md) | src/dashboard/components/WorkflowSettingsDialogRegion.tsx | 独立的工作流设置对话框区域：复用 WorkflowOptionsRegion 的共享表单引擎渲染 schema 字段，并额外提供执行单元预览与宿主队列选项两张卡片。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [WorkflowSettingsDialogRegion.tsx](components/WorkflowSettingsDialogRegion.tsx.md) | src/dashboard/components/WorkflowSettingsDialogRegion.tsx | 独立的工作流设置对话框区域：复用 WorkflowOptionsRegion 的共享表单引擎渲染 schema 字段，并额外提供执行单元预览与宿主队列选项两张卡片。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bootstrapWorkflowSettingsDialogApp | 函数 | 50–104 | 对话框引导：绑定宿主 init/snapshot 消息、创建 selection 投影与 Preact 渲染入口，并向上发送 ready 声明。 |
| sendWorkflowSettingsDialogAction | 函数 | 25–48 | 把设置对话框动作封装为 postMessage 信封投递到 parent/top/opener，并按引用去重。 |

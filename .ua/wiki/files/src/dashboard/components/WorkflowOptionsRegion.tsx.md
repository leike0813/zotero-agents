
# src/dashboard/components/WorkflowOptionsRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/WorkflowOptionsRegion.tsx -->

Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。
源码：[src/dashboard/components/WorkflowOptionsRegion.tsx](../../../../../../src/dashboard/components/WorkflowOptionsRegion.tsx)

## 符号（10）
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:coerceWorkflowBoolean -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:createWorkflowSettingsDraft -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:CustomSelectIsland -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:isProviderConditionalWorkflowFieldVisible -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:normalizeWorkflowTypeValue -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:validateWorkflowNumberFieldValue -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:WorkflowFieldRow -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:workflowOptionsDraftResetKey -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:WorkflowOptionsRegion -->
<!-- node: function:src/dashboard/components/WorkflowOptionsRegion.tsx:WorkflowSettingsSection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| coerceWorkflowBoolean | 函数 | 228–243 | 简单 | validation、normalization | 0 | 把 wire 侧的真假值形态（布尔、"true"/"false"、数字）统一收敛为布尔。 |
| createWorkflowSettingsDraft | 函数 | 405–420 | 简单 | factory、draft-state | 0 | 由持久化设置记录创建可编辑草稿，深拷贝各选项分组以隔离宿主状态。 |
| CustomSelectIsland | 函数 | 477–643 | 复杂 | component、imperative-island、select | 0 | 受控 select 的命令式 island：复用共享 CustomSelect 并在宿主枚举更新时保持已打开菜单与滚动位置。 |
| isProviderConditionalWorkflowFieldVisible | 函数 | 276–291 | 简单 | predicate、form-visibility | 0 | 按当前 provider 选项判断某个条件字段是否应显示，避免展示无效配置项。 |
| normalizeWorkflowTypeValue | 函数 | 248–270 | 中等 | validation、normalization | 0 | 归一化工作流类型取值，剔除未知类型并保留可选项列表的兼容性映射。 |
| validateWorkflowNumberFieldValue | 函数 | 367–403 | 中等 | validation、form | 0 | 校验数值字段输入：区分正整数/非负整数语义，给出可展示的错误文案。 |
| WorkflowFieldRow | 函数 | 645–1002 | 复杂 | component、form、field | 0 | 单个设置字段行：按 schema 类型分发到 select/开关/数值/文本输入，并处理提交、失焦校验与错误提示。 |
| workflowOptionsDraftResetKey | 函数 | 437–448 | 简单 | draft-state、state-key | 0 | 生成草稿重置键：只有切换工作流或后端这类结构变化才会让草稿回到基线。 |
| [WorkflowOptionsRegion](../../../../symbols/src/dashboard/components/WorkflowOptionsRegion.tsx/WorkflowOptionsRegion.md) | 函数 | 1075–1216 | 复杂 | component、memo、region | 1 | memo 化的工作流选项区域组件：按 signature 相等判断重渲染，驱动分区表单并把草稿变更回传宿主。 |
| WorkflowSettingsSection | 函数 | 1004–1073 | 中等 | component、form、section | 1 | 设置分区容器：渲染分区标题、说明与字段列表，并注册字段提交回调。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [customSelect.tsx](../../shared/customSelect.tsx.md) | src/shared/customSelect.tsx | 插件各 HTML 页面共用的纯 DOM 下拉控件：Zotero 对话框窗口无法弹出原生 select 弹层，因此提供完全受控的单选与多选实现，保留被淘汰 vendor 组件的 .custom-select* class 契约。 |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](../dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [dashboardPanelModel.ts](../dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](../dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |
| [WorkflowSettingsDialogRegion.tsx](WorkflowSettingsDialogRegion.tsx.md) | src/dashboard/components/WorkflowSettingsDialogRegion.tsx | 独立的工作流设置对话框区域：复用 WorkflowOptionsRegion 的共享表单引擎渲染 schema 字段，并额外提供执行单元预览与宿主队列选项两张卡片。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [equalBySignature](../../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | src/shared/regionEquality.ts | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| coerceWorkflowBoolean | 函数 | 228–243 | 把 wire 侧的真假值形态（布尔、"true"/"false"、数字）统一收敛为布尔。 |
| createWorkflowSettingsDraft | 函数 | 405–420 | 由持久化设置记录创建可编辑草稿，深拷贝各选项分组以隔离宿主状态。 |
| CustomSelectIsland | 函数 | 477–643 | 受控 select 的命令式 island：复用共享 CustomSelect 并在宿主枚举更新时保持已打开菜单与滚动位置。 |
| isProviderConditionalWorkflowFieldVisible | 函数 | 276–291 | 按当前 provider 选项判断某个条件字段是否应显示，避免展示无效配置项。 |
| normalizeWorkflowTypeValue | 函数 | 248–270 | 归一化工作流类型取值，剔除未知类型并保留可选项列表的兼容性映射。 |
| validateWorkflowNumberFieldValue | 函数 | 367–403 | 校验数值字段输入：区分正整数/非负整数语义，给出可展示的错误文案。 |
| WorkflowFieldRow | 函数 | 645–1002 | 单个设置字段行：按 schema 类型分发到 select/开关/数值/文本输入，并处理提交、失焦校验与错误提示。 |
| workflowOptionsDraftResetKey | 函数 | 437–448 | 生成草稿重置键：只有切换工作流或后端这类结构变化才会让草稿回到基线。 |
| [WorkflowOptionsRegion](../../../../symbols/src/dashboard/components/WorkflowOptionsRegion.tsx/WorkflowOptionsRegion.md) | 函数 | 1075–1216 | memo 化的工作流选项区域组件：按 signature 相等判断重渲染，驱动分区表单并把草稿变更回传宿主。 |
| WorkflowSettingsSection | 函数 | 1004–1073 | 设置分区容器：渲染分区标题、说明与字段列表，并注册字段提交回调。 |

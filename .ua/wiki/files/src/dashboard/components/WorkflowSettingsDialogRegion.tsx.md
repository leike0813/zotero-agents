
# src/dashboard/components/WorkflowSettingsDialogRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/WorkflowSettingsDialogRegion.tsx -->

独立的工作流设置对话框区域：复用 WorkflowOptionsRegion 的共享表单引擎渲染 schema 字段，并额外提供执行单元预览与宿主队列选项两张卡片。
源码：[src/dashboard/components/WorkflowSettingsDialogRegion.tsx](../../../../../../src/dashboard/components/WorkflowSettingsDialogRegion.tsx)

## 符号（7）
<!-- node: function:src/dashboard/components/WorkflowSettingsDialogRegion.tsx:createWorkflowSettingsDialogDraft -->
<!-- node: function:src/dashboard/components/WorkflowSettingsDialogRegion.tsx:ExecutionUnitPreviewCard -->
<!-- node: function:src/dashboard/components/WorkflowSettingsDialogRegion.tsx:HostQueueOptionsCard -->
<!-- node: function:src/dashboard/components/WorkflowSettingsDialogRegion.tsx:narrowSchemaEntries -->
<!-- node: function:src/dashboard/components/WorkflowSettingsDialogRegion.tsx:projectWorkflowSettingsDialogSelection -->
<!-- node: function:src/dashboard/components/WorkflowSettingsDialogRegion.tsx:WorkflowSettingsDialogRegion -->
<!-- node: function:src/dashboard/components/WorkflowSettingsDialogRegion.tsx:workflowSettingsDialogStructureKey -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createWorkflowSettingsDialogDraft | 函数 | 232–248 | 简单 | factory、draft-state | 0 | 由宿主快照创建对话框草稿，深拷贝执行选项各分组以隔离持久化状态。 |
| ExecutionUnitPreviewCard | 函数 | 360–397 | 中等 | component、card、preview | 0 | 执行单元预览卡：展示当前执行上下文解析出的单元标识与关键选项，回显解析失败原因。 |
| HostQueueOptionsCard | 函数 | 409–503 | 中等 | component、card、form | 0 | 宿主队列选项卡：编辑并发、排队策略等宿主侧执行参数并在变更时提交草稿。 |
| narrowSchemaEntries | 函数 | 129–141 | 简单 | validation、narrowing | 0 | 从 wire 的 unknown schema 槽位收窄出字段条目列表，丢弃结构不完整的项。 |
| projectWorkflowSettingsDialogSelection | 函数 | 152–218 | 复杂 | projection、workflow、dialog | 0 | 投影设置对话框 selection：当前工作流、执行上下文预览、队列卡可见性、已解析的全部文案与字段 schema。 |
| [WorkflowSettingsDialogRegion](../../../../symbols/src/dashboard/components/WorkflowSettingsDialogRegion.tsx/WorkflowSettingsDialogRegion.md) | 函数 | 514–893 | 复杂 | component、memo、region、dialog | 1 | memo 化的设置对话框区域组件：按 signature 相等判断重渲染，组合分区表单、预览卡与队列卡并把保存/应用动作回传宿主。 |
| workflowSettingsDialogStructureKey | 函数 | 266–306 | 中等 | state-key、schema-driven | 0 | 由 schema 分区与字段结构生成结构键，结构不变时保留草稿与已注册提交回调。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [WorkflowOptionsRegion.tsx](WorkflowOptionsRegion.tsx.md) | src/dashboard/components/WorkflowOptionsRegion.tsx | Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowSettingsDialogApp.ts](../workflowSettingsDialogApp.ts.md) | src/dashboard/workflowSettingsDialogApp.ts | 独立工作流设置对话框的页面入口：建立 workflow-settings-dialog postMessage 通道，接收宿主快照后投影为 selection 并交给对话框区域渲染。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [equalBySignature](../../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | src/shared/regionEquality.ts | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |
| [WorkflowOptionsRegion.tsx](WorkflowOptionsRegion.tsx.md) | src/dashboard/components/WorkflowOptionsRegion.tsx | Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createWorkflowSettingsDialogDraft | 函数 | 232–248 | 由宿主快照创建对话框草稿，深拷贝执行选项各分组以隔离持久化状态。 |
| ExecutionUnitPreviewCard | 函数 | 360–397 | 执行单元预览卡：展示当前执行上下文解析出的单元标识与关键选项，回显解析失败原因。 |
| HostQueueOptionsCard | 函数 | 409–503 | 宿主队列选项卡：编辑并发、排队策略等宿主侧执行参数并在变更时提交草稿。 |
| projectWorkflowSettingsDialogSelection | 函数 | 152–218 | 投影设置对话框 selection：当前工作流、执行上下文预览、队列卡可见性、已解析的全部文案与字段 schema。 |
| [WorkflowSettingsDialogRegion](../../../../symbols/src/dashboard/components/WorkflowSettingsDialogRegion.tsx/WorkflowSettingsDialogRegion.md) | 函数 | 514–893 | memo 化的设置对话框区域组件：按 signature 相等判断重渲染，组合分区表单、预览卡与队列卡并把保存/应用动作回传宿主。 |
| workflowSettingsDialogStructureKey | 函数 | 266–306 | 由 schema 分区与字段结构生成结构键，结构不变时保留草稿与已注册提交回调。 |


# src/shared/customSelect.tsx
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/customSelect.tsx -->

插件各 HTML 页面共用的纯 DOM 下拉控件：Zotero 对话框窗口无法弹出原生 select 弹层，因此提供完全受控的单选与多选实现，保留被淘汰 vendor 组件的 .custom-select* class 契约。
源码：[src/shared/customSelect.tsx](../../../../../src/shared/customSelect.tsx)

## 符号（4）
<!-- node: function:src/shared/customSelect.tsx:CustomMultiSelect -->
<!-- node: function:src/shared/customSelect.tsx:CustomSelect -->
<!-- node: function:src/shared/customSelect.tsx:multiSelectTriggerText -->
<!-- node: function:src/shared/customSelect.tsx:useOutsideClickClose -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CustomMultiSelect | 函数 | 223–312 | 复杂 | component、select、draft-state | 0 | 完全受控的多选下拉：打开期间在内部 draft 上勾选，关闭时一次性以新数组通知父级。 |
| CustomSelect | 函数 | 96–189 | 复杂 | component、select | 0 | 完全受控的单选下拉：渲染触发器与浮层菜单，处理键盘切换、外部点击关闭与下方空间不足时向上翻转。 |
| multiSelectTriggerText | 函数 | 203–221 | 简单 | presentation、select | 0 | 由多选值集合生成触发器文案：单值直显、少量值并列、超出上限折叠为计数。 |
| useOutsideClickClose | 函数 | 60–81 | 中等 | hook、event-handler | 0 | 自定义 hook：监听文档点击与 Esc，在点击外部或按下 Escape 时关闭下拉菜单并在卸载时清理监听。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [BackendManagerRegion.tsx](../dashboard/components/BackendManagerRegion.tsx.md) | src/dashboard/components/BackendManagerRegion.tsx | 后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。 |
| [RuntimeLogsRegion.tsx](../dashboard/components/RuntimeLogsRegion.tsx.md) | src/dashboard/components/RuntimeLogsRegion.tsx | Dashboard 的 Runtime Logs 面板：日志级别复选、后端/工作流多选下拉、诊断模式开关、上下文范围 chips、预算行、复制与清空操作，以及带详情面板的日志表。 |
| [SynthesisSidecarRegion.tsx](../dashboard/components/SynthesisSidecarRegion.tsx.md) | src/dashboard/components/SynthesisSidecarRegion.tsx | Dashboard 的 Synthesis Sidecar trace 面板：汇总卡、trace 搜索过滤、命令式 trace 表 island，以及因果 trace 详情面板（span 树 + 复制）。所有筛选与选中状态都是页面本地 UI state，不产生宿主往返。 |
| [WorkflowOptionsRegion.tsx](../dashboard/components/WorkflowOptionsRegion.tsx.md) | src/dashboard/components/WorkflowOptionsRegion.tsx | Dashboard 的工作流选项面板：内联工作流设置表单引擎，按 schema 渲染分区与字段，支持自定义 select、布尔开关、数值校验与 provider 条件字段的可见性判定。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| CustomMultiSelect | 函数 | 223–312 | 完全受控的多选下拉：打开期间在内部 draft 上勾选，关闭时一次性以新数组通知父级。 |
| CustomSelect | 函数 | 96–189 | 完全受控的单选下拉：渲染触发器与浮层菜单，处理键盘切换、外部点击关闭与下方空间不足时向上翻转。 |

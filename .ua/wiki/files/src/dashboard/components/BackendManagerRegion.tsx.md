
# src/dashboard/components/BackendManagerRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/BackendManagerRegion.tsx -->

后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。
源码：[src/dashboard/components/BackendManagerRegion.tsx](../../../../../../src/dashboard/components/BackendManagerRegion.tsx)

## 符号（11）
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:AcpActions -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:AcpRow -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:ArgEditor -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:BackendManagerAcpPresetDialogRegion -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:BackendManagerBodyRegion -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:BackendManagerFooterRegion -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:BackendManagerGenericHttpPresetDialogRegion -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:BackendManagerHeaderRegion -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:EnvEditor -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:HttpActions -->
<!-- node: function:src/dashboard/components/BackendManagerRegion.tsx:HttpRow -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpActions | 函数 | 476–506 | 简单 | component、action-dispatch | 0 | ACP 后端行的操作按钮组：打开预设对话框、刷新运行时选项、持久化探针结果等宿主动作入口。 |
| AcpRow | 函数 | 552–606 | 中等 | component、form、row | 0 | 单条 ACP 后端草稿行：组合命令字段、token 输入、参数与环境变量编辑器以及对应操作按钮。 |
| ArgEditor | 函数 | 339–397 | 中等 | component、form、editor | 0 | 命令参数键值对编辑器：增删行、编辑键值，并把变更以行 patch 形式回传，不触发整行重渲染。 |
| BackendManagerAcpPresetDialogRegion | 函数 | 1027–1226 | 复杂 | component、dialog、acp、preset | 0 | ACP 预设对话框区域：由命令、隔离环境变量与 npx 参数推导预设 profile id、显示名与预览，提交后落盘为后端配置。 |
| BackendManagerBodyRegion | 函数 | 720–802 | 中等 | component、region、scroll | 0 | 后端管理对话框的主体区域：按 provider 渲染后端行列表，并在切换 provider 时恢复滚动位置。 |
| BackendManagerFooterRegion | 函数 | 802–968 | 中等 | component、region、action-dispatch | 0 | 后端管理对话框的 footer 区域：脏标记提示、保存与取消动作，把草稿回传宿主。 |
| BackendManagerGenericHttpPresetDialogRegion | 函数 | 1226–1348 | 中等 | component、dialog、preset | 0 | 通用 HTTP 预设对话框区域：编辑预设的基础 URL、请求头与鉴权，生成并提交 HTTP 后端预设。 |
| BackendManagerHeaderRegion | 函数 | 692–720 | 简单 | component、region | 0 | 后端管理对话框的 header 区域：标题、提供方切换与新增后端入口。 |
| EnvEditor | 函数 | 399–474 | 中等 | component、form、editor | 0 | 环境变量编辑器：管理键值条目并按平台推断路径分隔符，为 ACP 预设的隔离环境变量生成提供输入。 |
| HttpActions | 函数 | 508–550 | 中等 | component、action-dispatch | 0 | 通用 HTTP 后端行的操作按钮组：打开 HTTP 预设对话框与保存/刷新等动作入口。 |
| HttpRow | 函数 | 608–671 | 中等 | component、form、row | 0 | 单条通用 HTTP 后端草稿行：组合 URL、鉴权与请求头编辑区及其操作按钮。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [customSelect.tsx](../../shared/customSelect.tsx.md) | src/shared/customSelect.tsx | 插件各 HTML 页面共用的纯 DOM 下拉控件：Zotero 对话框窗口无法弹出原生 select 弹层，因此提供完全受控的单选与多选实现，保留被淘汰 vendor 组件的 .custom-select* class 契约。 |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManagerApp.ts](../backendManagerApp.ts.md) | src/dashboard/backendManagerApp.ts | 后端管理对话框页面的 controller 与引导入口：持有宿主 postMessage 通道，把 BackendManagerSnapshot 投影成草稿与视图，并按"文本编辑不重渲染、结构编辑才重渲染"的规则驱动区域刷新。 |
| [backendManagerRenderer.ts](../backendManagerRenderer.ts.md) | src/dashboard/backendManagerRenderer.ts | 后端管理对话框的 chrome renderer：在页面根容器下建立 header/body/footer 与两个预设对话框共五个 managed mount，每个 mount 挂独立 Preact root，使单个区域重渲染不会清空兄弟区域。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [equalBySignature](../../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | src/shared/regionEquality.ts | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| BackendManagerAcpPresetDialogRegion | 函数 | 1027–1226 | ACP 预设对话框区域：由命令、隔离环境变量与 npx 参数推导预设 profile id、显示名与预览，提交后落盘为后端配置。 |
| BackendManagerBodyRegion | 函数 | 720–802 | 后端管理对话框的主体区域：按 provider 渲染后端行列表，并在切换 provider 时恢复滚动位置。 |
| BackendManagerFooterRegion | 函数 | 802–968 | 后端管理对话框的 footer 区域：脏标记提示、保存与取消动作，把草稿回传宿主。 |
| BackendManagerGenericHttpPresetDialogRegion | 函数 | 1226–1348 | 通用 HTTP 预设对话框区域：编辑预设的基础 URL、请求头与鉴权，生成并提交 HTTP 后端预设。 |
| BackendManagerHeaderRegion | 函数 | 692–720 | 后端管理对话框的 header 区域：标题、提供方切换与新增后端入口。 |

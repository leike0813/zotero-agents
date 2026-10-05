
# src/dashboard/backendManagerApp.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/backendManagerApp.ts -->

后端管理对话框页面的 controller 与引导入口：持有宿主 postMessage 通道，把 BackendManagerSnapshot 投影成草稿与视图，并按"文本编辑不重渲染、结构编辑才重渲染"的规则驱动区域刷新。
源码：[src/dashboard/backendManagerApp.ts](../../../../../src/dashboard/backendManagerApp.ts)

## 符号（6）
<!-- node: function:src/dashboard/backendManagerApp.ts:bootstrapBackendManagerApp -->
<!-- node: function:src/dashboard/backendManagerApp.ts:cleanRow -->
<!-- node: function:src/dashboard/backendManagerApp.ts:createBackendManagerController -->
<!-- node: function:src/dashboard/backendManagerApp.ts:defaultAcpPresetDialogState -->
<!-- node: function:src/dashboard/backendManagerApp.ts:sendBackendManagerAction -->
<!-- node: function:src/dashboard/backendManagerApp.ts:statusText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bootstrapBackendManagerApp | 函数 | 651–683 | 中等 | bootstrap、entry-point、wiring | 0 | 页面引导：接管 #backend-manager-root、绑定宿主消息监听、创建 controller 与 renderer，并向上发送 ready 声明。 |
| cleanRow | 函数 | 85–112 | 中等 | validation、normalization | 0 | 清洗一条草稿行：补齐缺失字段、归一化布尔与空值，使 wire 数据能安全进入草稿状态。 |
| createBackendManagerController | 函数 | 195–649 | 复杂 | controller、state-management、projection、dashboard | 0 | 后端管理页的核心 controller：订阅宿主 snapshot/init/select-provider 消息，维护草稿行、预设对话框与脏标记，投影视图并决定是否触发区域重渲染。 |
| defaultAcpPresetDialogState | 函数 | 156–170 | 简单 | factory、default-state | 0 | 构造 ACP 预设对话框的初始状态：空命令、空环境变量映射、npx 可用性未探测。 |
| sendBackendManagerAction | 函数 | 45–58 | 简单 | message-protocol、action-dispatch | 0 | 把后端管理动作封装为 postMessage 信封，投递到 window.parent/top/opener 并按引用去重。 |
| statusText | 函数 | 178–193 | 简单 | projection、status | 0 | 由后端行的探测结果推导状态文案与可用动作，覆盖 ACP 探针与 SkillRunner 模型缓存两条路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [BackendManagerRegion.tsx](components/BackendManagerRegion.tsx.md) | src/dashboard/components/BackendManagerRegion.tsx | 后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。 |
| [backendManagerRenderer.ts](backendManagerRenderer.ts.md) | src/dashboard/backendManagerRenderer.ts | 后端管理对话框的 chrome renderer：在页面根容器下建立 header/body/footer 与两个预设对话框共五个 managed mount，每个 mount 挂独立 Preact root，使单个区域重渲染不会清空兄弟区域。 |
| [dashboardWireContract.ts](../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManagerRenderer.ts](backendManagerRenderer.ts.md) | src/dashboard/backendManagerRenderer.ts | 后端管理对话框的 chrome renderer：在页面根容器下建立 header/body/footer 与两个预设对话框共五个 managed mount，每个 mount 挂独立 Preact root，使单个区域重渲染不会清空兄弟区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bootstrapBackendManagerApp | 函数 | 651–683 | 页面引导：接管 #backend-manager-root、绑定宿主消息监听、创建 controller 与 renderer，并向上发送 ready 声明。 |
| createBackendManagerController | 函数 | 195–649 | 后端管理页的核心 controller：订阅宿主 snapshot/init/select-provider 消息，维护草稿行、预设对话框与脏标记，投影视图并决定是否触发区域重渲染。 |
| sendBackendManagerAction | 函数 | 45–58 | 把后端管理动作封装为 postMessage 信封，投递到 window.parent/top/opener 并按引用去重。 |

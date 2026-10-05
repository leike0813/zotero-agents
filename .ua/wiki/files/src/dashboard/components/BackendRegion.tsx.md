
# src/dashboard/components/BackendRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/BackendRegion.tsx -->

Dashboard 的 Backend 面板：把旧实现中三套按后端类型分支的渲染器（generic / SkillRunner / ACP）合并为一个参数化区域，共享同一套任务表外壳，并附通用后端的绑定日志区与 SkillRunner 管理子视图。
源码：[src/dashboard/components/BackendRegion.tsx](../../../../../../src/dashboard/components/BackendRegion.tsx)

## 符号（7）
<!-- node: function:src/dashboard/components/BackendRegion.tsx:AcpTaskRowCells -->
<!-- node: function:src/dashboard/components/BackendRegion.tsx:BackendRegion -->
<!-- node: function:src/dashboard/components/BackendRegion.tsx:BackendToolbar -->
<!-- node: function:src/dashboard/components/BackendRegion.tsx:GenericTaskRowCells -->
<!-- node: function:src/dashboard/components/BackendRegion.tsx:isDashboardTaskTerminal -->
<!-- node: function:src/dashboard/components/BackendRegion.tsx:SkillRunnerTaskRowCells -->
<!-- node: function:src/dashboard/components/BackendRegion.tsx:TaskTable -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpTaskRowCells | 函数 | 441–499 | 中等 | component、table、row | 0 | ACP 后端的任务行单元格：按 ACP 会话/requestId 语义呈现任务并派发取消与打开动作。 |
| BackendRegion | 函数 | 682–773 | 中等 | component、memo、region | 1 | memo 化的 Backend 区域组件：按 signature 相等判断重渲染，组合工具栏、任务表、日志区与 SkillRunner 管理子视图。 |
| BackendToolbar | 函数 | 600–676 | 中等 | component、toolbar、action-dispatch | 0 | 后端面板工具栏：后端切换、刷新与加载失败提示入口，把用户操作回传为宿主动作。 |
| GenericTaskRowCells | 函数 | 315–382 | 中等 | component、table、row | 0 | 通用 HTTP 后端的任务行单元格：展示任务状态、耗时、请求标识与取消/打开日志操作。 |
| isDashboardTaskTerminal | 函数 | 170–185 | 简单 | predicate、task-state | 0 | 判定 Dashboard 任务是否已处于终态，用于禁用取消按钮并决定行内可用操作。 |
| SkillRunnerTaskRowCells | 函数 | 384–439 | 中等 | component、table、row | 0 | SkillRunner 后端的任务行单元格：以 runKey/requestId 语义呈现任务，并提供取消队列与打开运行的操作。 |
| TaskTable | 函数 | 209–287 | 中等 | component、table、task-table | 0 | 共享任务表外壳：表头、分页与行分发，按 backendType 选择对应的行内单元格组件渲染。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](../dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [dashboardPanelModel.ts](../dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](../dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [equalBySignature](../../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | src/shared/regionEquality.ts | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| BackendRegion | 函数 | 682–773 | memo 化的 Backend 区域组件：按 signature 相等判断重渲染，组合工具栏、任务表、日志区与 SkillRunner 管理子视图。 |
| isDashboardTaskTerminal | 函数 | 170–185 | 判定 Dashboard 任务是否已处于终态，用于禁用取消按钮并决定行内可用操作。 |

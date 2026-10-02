
# src/sidebar/assistantPanelRenderer.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/assistantPanelRenderer.js -->

面板 chrome 的命令式 DOM 渲染器：管理 toolbar/banner/plan 等托管挂载点、区域标记与 overlay 关闭，并向宿主派发面板 action。
源码：[src/sidebar/assistantPanelRenderer.js](../../../../../src/sidebar/assistantPanelRenderer.js)

## 符号（5）
<!-- node: function:src/sidebar/assistantPanelRenderer.js:adoptPanelRegions -->
<!-- node: function:src/sidebar/assistantPanelRenderer.js:installOverlayDismiss -->
<!-- node: function:src/sidebar/assistantPanelRenderer.js:managedMount -->
<!-- node: function:src/sidebar/assistantPanelRenderer.js:markRegion -->
<!-- node: function:src/sidebar/assistantPanelRenderer.js:shouldManageRegion -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| adoptPanelRegions | 函数 | 94–133 | 中等 | region-management、entry-point、imperative-dom、assistant-workspace | 1 | 接管面板内所有受管区域：完成容器标记、挂载点准备与 overlay 关闭安装。 |
| installOverlayDismiss | 函数 | 80–92 | 简单 | event-handler、overlay、cleanup、imperative-dom | 1 | 为浮层安装点击外部关闭与 Escape 关闭监听，返回清理函数避免重复绑定。 |
| managedMount | 函数 | 54–67 | 简单 | region-management、dom-management、imperative-dom、factory | 1 | 获取或创建区域托管容器，确保同一区域重复渲染复用同一 DOM 根。 |
| markRegion | 函数 | 37–45 | 简单 | dom-management、region-marking、imperative-dom、utility | 0 | 在托管容器上打上区域标记属性，供后续挂载接管与测试定位使用。 |
| shouldManageRegion | 函数 | 47–52 | 简单 | region-management、guard、imperative-dom、utility | 0 | 判断某个区域是否应由本渲染器接管，跳过非托管或被外部占用的挂载点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantPanelModel.js](assistantPanelModel.js.md) | src/sidebar/assistantPanelModel.js | Assistant Workspace 面板的纯投影模型：把工作区 snapshot 归一化为面板 DTO，包含状态/应用态语义、精确工作区字段、任务与分组、抽屉区块与空态 chrome。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceAcpChild.js](assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| adoptPanelRegions | 函数 | 94–133 | 接管面板内所有受管区域：完成容器标记、挂载点准备与 overlay 关闭安装。 |
| managedMount | 函数 | 54–67 | 获取或创建区域托管容器，确保同一区域重复渲染复用同一 DOM 根。 |
| markRegion | 函数 | 37–45 | 在托管容器上打上区域标记属性，供后续挂载接管与测试定位使用。 |
| shouldManageRegion | 函数 | 47–52 | 判断某个区域是否应由本渲染器接管，跳过非托管或被外部占用的挂载点。 |

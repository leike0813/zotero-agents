
# src/sidebar/assistantWorkspaceApp.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/assistantWorkspaceApp.js -->

Assistant Workspace 侧边栏页面的构建入口，仅引入 shell 模块以触发其副作用完成挂载。
源码：[src/sidebar/assistantWorkspaceApp.js](../../../../../src/sidebar/assistantWorkspaceApp.js)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceShell.js](assistantWorkspaceShell.js.md) | src/sidebar/assistantWorkspaceShell.js | Assistant Workspace 生产版 shell：管理三个标签页的子 iframe 装载、宿主 ready 握手与重试、快照发布缓存与 ACK 确认、surface 配置下发，以及抽屉开合与 payload scope 同步。 |

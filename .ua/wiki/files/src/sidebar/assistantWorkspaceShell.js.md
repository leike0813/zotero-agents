
# src/sidebar/assistantWorkspaceShell.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/assistantWorkspaceShell.js -->

Assistant Workspace 生产版 shell：管理三个标签页的子 iframe 装载、宿主 ready 握手与重试、快照发布缓存与 ACK 确认、surface 配置下发，以及抽屉开合与 payload scope 同步。
源码：[src/sidebar/assistantWorkspaceShell.js](../../../../../src/sidebar/assistantWorkspaceShell.js)

## 符号（13）
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:acceptChildPublicationAck -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:acceptChildReady -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:cacheChildPublication -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:clearChildPayloadState -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:ensureHostReady -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:forwardPendingChildPublications -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:postPublicationToChild -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:postSurfaceConfigurationToChild -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:postToHost -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:requestAllChildrenReady -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:setActiveTab -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:traceAction -->
<!-- node: function:src/sidebar/assistantWorkspaceShell.js:validAcpChildEnvelope -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acceptChildPublicationAck | 函数 | 472–509 | 简单 | publication、ack、shell | 0 | 接收子页面 ACK 并据此清理缓存，同时用文档 generation 丢弃过期页面的确认。 |
| acceptChildReady | 函数 | 620–643 | 简单 | handshake、publication、shell | 0 | 处理子页面 ready：记录文档代次、投递 surface 配置并冲刷待发布快照。 |
| cacheChildPublication | 函数 | 414–433 | 简单 | publication、cache、performance | 0 | 按 deliveryKey 缓存待下发的 publication，使同一快照不重复跨进程传输。 |
| clearChildPayloadState | 函数 | 604–618 | 简单 | state、isolation、shell | 0 | 切换 owner 时清空子页面 payload 状态，避免跨 owner 显示陈旧 transcript。 |
| ensureHostReady | 函数 | 205–255 | 中等 | handshake、retry、shell | 0 | 驱动宿主 ready 握手，在超时前重试并把失败状态记录到 actionTrace。 |
| forwardPendingChildPublications | 函数 | 435–470 | 简单 | publication、delivery、shell | 0 | 把缓存的 publication 按子页面就绪状态逐个投递，是快照可靠送达的关键路径。 |
| postPublicationToChild | 函数 | 521–530 | 简单 | publication、transport、shell | 0 | 把单个 publication 投递到指定子页面 iframe。 |
| postSurfaceConfigurationToChild | 函数 | 549–564 | 简单 | configuration、publication、shell | 0 | 向子页面下发 surface 配置（执行显示模式、虚拟滚动开关与 action 注册表）。 |
| postToHost | 函数 | 120–169 | 中等 | bridge、transport、diagnostics | 0 | 向宿主窗口投递消息，附带 trace 与 payload 摘要以便诊断，并处理宿主未就绪时的排队。 |
| requestAllChildrenReady | 函数 | 381–385 | 简单 | handshake、orchestration、shell | 0 | 批量请求所有子页面进入 ready 状态，用于首屏与恢复场景。 |
| setActiveTab | 函数 | 651–674 | 简单 | tab、state、shell | 0 | 切换活动标签页，关闭非活动页面的抽屉并同步 scopeKey。 |
| traceAction | 函数 | 74–92 | 简单 | diagnostics、observability、shell | 0 | 记录一条 action trace 并对数量设上限，供 harness 观察 shell 行为。 |
| validAcpChildEnvelope | 函数 | 257–299 | 中等 | validation、boundary、shell | 0 | 校验来自 ACP 子页面的消息信封结构，阻止非法载荷进入 shell 状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWireContract.ts](../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceApp.js](assistantWorkspaceApp.js.md) | src/sidebar/assistantWorkspaceApp.js | Assistant Workspace 侧边栏页面的构建入口，仅引入 shell 模块以触发其副作用完成挂载。 |

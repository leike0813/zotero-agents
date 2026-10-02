
# src/modules/notificationHub.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/notificationHub.ts -->

插件内通知中心：接收各模块投递的通知事件，按展示分组与去重键抑制重复提示，并提供有界事件列表与按客户端确认。
源码：[src/modules/notificationHub.ts](../../../../../src/modules/notificationHub.ts)

## 符号（4）
<!-- node: function:src/modules/notificationHub.ts:acknowledgeNotificationHubEvents -->
<!-- node: function:src/modules/notificationHub.ts:appendNotificationHubEvent -->
<!-- node: function:src/modules/notificationHub.ts:eventMatches -->
<!-- node: function:src/modules/notificationHub.ts:listNotificationHubEvents -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acknowledgeNotificationHubEvents | 函数 | 269–301 | 中等 | 通知、确认、多窗口 | 0 | 按客户端标识确认通知事件，使多窗口各自记录已读状态而不互相影响。 |
| [appendNotificationHubEvent](../../../symbols/src/modules/notificationHub.ts/appendNotificationHubEvent.md) | 函数 | 143–206 | 复杂 | 通知、去重、事件中心 | 1 | 追加一条通知事件：按去重键复用既有事件、按展示分组抑制窗口抑制重复提示，并维护有界历史。 |
| eventMatches | 函数 | 208–228 | 简单 | 过滤、通知、utility | 1 | 按类型、来源、owner 等过滤条件判断事件是否命中查询条件。 |
| listNotificationHubEvents | 函数 | 246–267 | 简单 | 通知、分页、查询 | 0 | 按过滤条件与起始位置分页返回通知事件列表。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [feedbackSeam.ts](workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [hostBridgeNotificationInbox.ts](hostBridge/server/hostBridgeNotificationInbox.ts.md) | src/modules/hostBridge/server/hostBridgeNotificationInbox.ts | Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acknowledgeNotificationHubEvents | 函数 | 269–301 | 按客户端标识确认通知事件，使多窗口各自记录已读状态而不互相影响。 |
| [appendNotificationHubEvent](../../../symbols/src/modules/notificationHub.ts/appendNotificationHubEvent.md) | 函数 | 143–206 | 追加一条通知事件：按去重键复用既有事件、按展示分组抑制窗口抑制重复提示，并维护有界历史。 |
| listNotificationHubEvents | 函数 | 246–267 | 按过滤条件与起始位置分页返回通知事件列表。 |

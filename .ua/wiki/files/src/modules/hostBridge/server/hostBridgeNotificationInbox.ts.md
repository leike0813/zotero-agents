
# src/modules/hostBridge/server/hostBridgeNotificationInbox.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts -->

Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。
源码：[src/modules/hostBridge/server/hostBridgeNotificationInbox.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeNotificationInbox.ts)

## 符号（13）
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:acknowledgeHostBridgeNotificationEvents -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:hostBridgeEventFromHub -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:insertNotification -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:listHostBridgeNotificationEvents -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:projectSkillRunNotification -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:projectTaskNotifications -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:projectWorkflowRunNotifications -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:pruneHostBridgeNotificationInbox -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:severityFromNotificationType -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:skillRunEventType -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:skillRunSummary -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:workflowEventType -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeNotificationInbox.ts:workflowSummary -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acknowledgeHostBridgeNotificationEvents | 函数 | 410–415 | 简单 | 确认、通知、幂等 | 0 | 确认指定通知事件，避免 Agent 重复处理同一事件。 |
| hostBridgeEventFromHub | 函数 | 103–141 | 简单 | 事件投影、通知、脱敏 | 0 | 把 notificationHub 事件转换为 Host Bridge 事件骨架，剔除不可对外暴露的内部字段。 |
| insertNotification | 函数 | 143–177 | 简单 | 通知、有界队列、去重 | 0 | 将通知插入有界事件列表，重复事件按 ID 合并而不重复占用容量。 |
| listHostBridgeNotificationEvents | 函数 | 379–408 | 简单 | 查询、分页、通知 | 0 | 按游标与过滤条件列出通知事件，保持分页稳定。 |
| projectSkillRunNotification | 函数 | 321–358 | 中等 | 投影、skillrun、通知 | 0 | 把 skill run 状态变化投影为通知事件，含终态与失败原因。 |
| projectTaskNotifications | 函数 | 360–377 | 简单 | 投影、通知、批量 | 0 | 批量投影任务级通知事件。 |
| projectWorkflowRunNotifications | 函数 | 287–319 | 简单 | 投影、工作流、通知 | 0 | 把工作流运行状态变化投影为通知事件。 |
| pruneHostBridgeNotificationInbox | 函数 | 417–419 | 简单 | 剪枝、有界队列、通知 | 0 | 按容量与时间窗剪枝通知收件箱。 |
| severityFromNotificationType | 函数 | 179–192 | 简单 | 通知、分级、host-bridge | 0 | 按通知类型映射严重级别，驱动 Agent 侧是否需要立即处理。 |
| skillRunEventType | 函数 | 219–242 | 简单 | skillrun、事件映射、通知 | 0 | 把 skill run 领域事件名映射为稳定的通知类型字符串。 |
| skillRunSummary | 函数 | 267–285 | 简单 | 摘要、skillrun、通知 | 0 | 为 skill run 通知生成一行紧凑摘要。 |
| workflowEventType | 函数 | 194–217 | 简单 | 工作流、事件映射、通知 | 0 | 把工作流领域事件名映射为 Host Bridge 侧稳定的通知类型字符串。 |
| workflowSummary | 函数 | 244–265 | 简单 | 摘要、工作流、通知 | 0 | 为工作流通知生成一行紧凑摘要，供 Agent 低成本扫读。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](../workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [notificationHub.ts](../../notificationHub.ts.md) | src/modules/notificationHub.ts | 插件内通知中心：接收各模块投递的通知事件，按展示分组与去重键抑制重复提示，并提供有界事件列表与按客户端确认。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowActivityRoutes.ts](routes/hostBridgeWorkflowActivityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
| [hostBridgeWorkflowControl.ts](../workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acknowledgeHostBridgeNotificationEvents | 函数 | 410–415 | 确认指定通知事件，避免 Agent 重复处理同一事件。 |
| listHostBridgeNotificationEvents | 函数 | 379–408 | 按游标与过滤条件列出通知事件，保持分页稳定。 |
| projectSkillRunNotification | 函数 | 321–358 | 把 skill run 状态变化投影为通知事件，含终态与失败原因。 |
| projectTaskNotifications | 函数 | 360–377 | 批量投影任务级通知事件。 |
| projectWorkflowRunNotifications | 函数 | 287–319 | 把工作流运行状态变化投影为通知事件。 |
| pruneHostBridgeNotificationInbox | 函数 | 417–419 | 按容量与时间窗剪枝通知收件箱。 |

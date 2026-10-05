
# src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server/routes](../../../../../../modules/src/modules/hostBridge/server/routes.md)
<!-- node: file:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts -->

Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。
源码：[src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts](../../../../../../../../src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts)

## 符号（35）
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:agentRunApplyErrorResponse -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:controlPlaneErrorResponse -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleAckNotifications -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleAgentRunWorkflow -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleApplyAgentRunWorkflow -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleCancelWorkflowQueueUnit -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleCancelWorkflowRun -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleChangeAgentRunLifecycle -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleDescribeProviderProfile -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleDescribeWorkflow -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleGetWorkflowRun -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleGetWorkflowSubmission -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListActiveTasks -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListNotifications -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListPendingPermissions -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListProviderProfiles -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListRecentSkillRuns -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListTasks -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListWorkflowQueue -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListWorkflowRuns -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleListWorkflows -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleRefreshProviderProfile -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleSkillRun -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleSubmitWorkflow -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleValidateProviderProfile -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleValidateWorkflow -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleWorkflowDefaults -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:handleWorkflowRequirements -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:matchHostBridgeWorkflowActivityRoute -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:parseHostBridgeNotificationFilters -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:parseOptionalBoolean -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:parseWorkflowTaskFilters -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:skillRunPathParts -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:workflowValidationErrorCode -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts:workflowValidationErrorDetails -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| agentRunApplyErrorResponse | 函数 | 276–320 | 简单 | 错误映射、agent-run、工作流 | 0 | 把 agent run 应用工作流失败映射为响应，保留可区分的失败原因。 |
| controlPlaneErrorResponse | 函数 | 156–274 | 复杂 | 错误映射、工作流、控制面 | 0 | 把工作流控制面异常统一映射为响应，覆盖校验失败、冲突与内部错误。 |
| handleAckNotifications | 函数 | 1064–1104 | 简单 | 通知、确认、幂等 | 0 | 批量确认通知事件，重复确认按幂等处理。 |
| handleAgentRunWorkflow | 函数 | 1261–1336 | 中等 | agent-run、工作流、执行 | 0 | 在 agent run 上下文中执行工作流，透传 run 作用域的授权与预算。 |
| handleApplyAgentRunWorkflow | 函数 | 598–698 | 中等 | 工作流、agent-run、执行 | 0 | 为 Agent run 应用工作流，校验前置条件并返回运行标识。 |
| handleCancelWorkflowQueueUnit | 函数 | 1234–1259 | 简单 | 队列、取消、工作流 | 0 | 取消排队中的工作流队列单元。 |
| handleCancelWorkflowRun | 函数 | 727–762 | 简单 | 工作流、取消、运行 | 0 | 取消指定工作流运行，并返回取消是否已被受理。 |
| handleChangeAgentRunLifecycle | 函数 | 700–725 | 简单 | agent-run、生命周期、工作流 | 0 | 变更 agent run 的生命周期状态（暂停、恢复、终止）。 |
| handleDescribeProviderProfile | 函数 | 1544–1596 | 简单 | provider-profile、查询、脱敏 | 0 | 返回 provider profile 的详细配置，凭据字段脱敏。 |
| handleDescribeWorkflow | 函数 | 529–596 | 中等 | 工作流、查询、描述 | 0 | 返回单个工作流的详细定义、输入输出与需求声明。 |
| handleGetWorkflowRun | 函数 | 764–823 | 中等 | 工作流、运行、查询 | 0 | 读取工作流运行详情，包括步骤状态与产出物清单。 |
| handleGetWorkflowSubmission | 函数 | 1193–1232 | 简单 | 工作流、提交、查询 | 0 | 读取工作流提交单元的详情与处理进度。 |
| handleListActiveTasks | 函数 | 939–973 | 简单 | 任务、列表、运行态 | 0 | 列出当前活跃任务及其占用资源。 |
| handleListNotifications | 函数 | 1042–1062 | 简单 | 通知、分页、列表 | 0 | 分页列出 Host Bridge 通知事件。 |
| handleListPendingPermissions | 函数 | 975–1009 | 简单 | 权限、审批、列表 | 0 | 列出待审批权限请求，供 Agent 感知阻塞点。 |
| handleListProviderProfiles | 函数 | 1513–1542 | 简单 | provider-profile、列表、host-bridge | 0 | 列出 provider profile 目录。 |
| handleListRecentSkillRuns | 函数 | 1106–1143 | 简单 | skillrun、列表、host-bridge | 0 | 列出最近的 skill run 记录及其终态。 |
| handleListTasks | 函数 | 864–898 | 简单 | 任务、分页、列表 | 0 | 按过滤条件分页列出任务记录。 |
| handleListWorkflowQueue | 函数 | 1145–1191 | 中等 | 队列、工作流、列表 | 0 | 列出工作流队列单元，含排队原因与优先级。 |
| handleListWorkflowRuns | 函数 | 825–862 | 简单 | 工作流、分页、列表 | 0 | 分页列出工作流运行记录。 |
| handleListWorkflows | 函数 | 511–527 | 简单 | 工作流、查询、列表 | 0 | 列出可用工作流目录及其基础元信息。 |
| handleRefreshProviderProfile | 函数 | 1649–1699 | 中等 | provider-profile、刷新、连通性 | 0 | 刷新 provider profile，向后端发起连通性验证并回写结果。 |
| handleSkillRun | 函数 | 1817–1944 | 复杂 | skillrun、执行、agent-facing | 0 | 触发并跟踪 skill run：构造运行请求、登记 run 记录并返回可查询的运行句柄。 |
| handleSubmitWorkflow | 函数 | 1338–1442 | 复杂 | 工作流、提交、受理 | 0 | 提交工作流执行请求：校验定义与输入，按需排队并返回受理回执。 |
| handleValidateProviderProfile | 函数 | 1598–1647 | 简单 | provider-profile、校验、host-bridge | 0 | 校验 provider profile 配置合法性。 |
| handleValidateWorkflow | 函数 | 1444–1511 | 中等 | 工作流、校验、只读 | 0 | 只读校验工作流定义与输入，返回逐项校验问题而不执行。 |
| handleWorkflowDefaults | 函数 | 1701–1746 | 简单 | 工作流、默认值、配置 | 0 | 返回工作流默认参数与运行默认设置。 |
| handleWorkflowRequirements | 函数 | 1748–1815 | 中等 | 工作流、需求、权限 | 0 | 返回工作流的宿主能力与权限需求声明，供 Agent 事前判断可行性。 |
| matchHostBridgeWorkflowActivityRoute | 函数 | 426–509 | 中等 | 路由匹配、工作流、host-bridge | 1 | 把请求路径与方法映射到工作流/活动处理器，未匹配时返回空。 |
| parseHostBridgeNotificationFilters | 函数 | 368–395 | 简单 | 过滤、解析、通知 | 0 | 解析通知事件过滤条件（类型、严重级、是否已确认）。 |
| parseOptionalBoolean | 函数 | 355–366 | 简单 | 解析、查询参数、host-bridge | 0 | 解析可选布尔查询参数，非法字面量不被静默当作 false。 |
| parseWorkflowTaskFilters | 函数 | 322–353 | 简单 | 过滤、解析、任务 | 0 | 解析任务列表过滤条件（状态、类型、游标），非法值给出明确错误。 |
| skillRunPathParts | 函数 | 415–424 | 简单 | 路由解析、skillrun、host-bridge | 0 | 从请求路径中解析 skill run 相关路径段，格式不符时返回空。 |
| workflowValidationErrorCode | 函数 | 108–136 | 简单 | 错误码、工作流、校验 | 0 | 把工作流校验异常映射为稳定错误码，供 Agent 判断可否重试。 |
| workflowValidationErrorDetails | 函数 | 138–154 | 简单 | 错误详情、工作流、校验 | 0 | 提取工作流校验错误的细节字段，保留定位问题所需的最小信息。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeNotificationInbox.ts](../hostBridgeNotificationInbox.ts.md) | src/modules/hostBridge/server/hostBridgeNotificationInbox.ts | Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。 |
| [hostBridgePagination.ts](../hostBridgePagination.ts.md) | src/modules/hostBridge/server/hostBridgePagination.ts | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [hostBridgePermissionManager.ts](../../permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeProtocol.ts](../hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeRouteContract.ts](../hostBridgeRouteContract.ts.md) | src/modules/hostBridge/server/hostBridgeRouteContract.ts | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [hostBridgeWorkflowControl.ts](../../workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [hostHttpRequestReader.ts](../hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](../hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| matchHostBridgeWorkflowActivityRoute | 函数 | 426–509 | 把请求路径与方法映射到工作流/活动处理器，未匹配时返回空。 |

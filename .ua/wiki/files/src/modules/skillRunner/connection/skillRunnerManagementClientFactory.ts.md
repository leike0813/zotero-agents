
# src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts -->

SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。
源码：[src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts)

## 符号（1）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts:buildSkillRunnerManagementClient -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSkillRunnerManagementClient | 函数 | 23–92 | 中等 | factory、client、auth、skillrunner | 0 | 为指定后端构建管理客户端，绑定鉴权读取与写回逻辑，鉴权保存失败时降级为提示而不抛出。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [managementAuth.ts](../../../backends/managementAuth.ts.md) | src/backends/managementAuth.ts | 后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。 |
| [managementClient.ts](../../../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](../../dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerSessionSyncManager.ts](../run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunnerManagementClient | 函数 | 23–92 | 为指定后端构建管理客户端，绑定鉴权读取与写回逻辑，鉴权保存失败时降级为提示而不抛出。 |

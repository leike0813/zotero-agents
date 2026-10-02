
# src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server/routes](../../../../../../modules/src/modules/hostBridge/server/routes.md)
<!-- node: file:src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts -->

Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。
源码：[src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts](../../../../../../../../src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts)

## 符号（5）
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts:getCacheStatus -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts:getIndexStatus -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts:invalidateCache -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts:maintenanceStatus -->
<!-- node: function:src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts:matchHostBridgeSynthesisRoute -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getCacheStatus | 函数 | 40–82 | 简单 | 缓存、状态、只读 | 0 | 返回 sidecar 缓存命中与失效状态，作为只读诊断视图。 |
| getIndexStatus | 函数 | 84–109 | 简单 | 索引、状态、引用图谱 | 0 | 返回 library index 与引用索引的构建状态与基础版本。 |
| invalidateCache | 函数 | 111–201 | 中等 | 缓存失效、maintenance、审批 | 0 | 执行缓存失效：校验审批与 scope 后向 sidecar 提交 maintenance 操作，并按 typed receipt 返回受理或终态。 |
| maintenanceStatus | 函数 | 29–38 | 简单 | maintenance、状态、synthesis | 0 | 返回 Synthesis public maintenance 操作的当前状态视图。 |
| matchHostBridgeSynthesisRoute | 函数 | 203–226 | 简单 | 路由匹配、synthesis、host-bridge | 1 | 把请求路径映射到 Synthesis 处理器。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaultClient.ts](../../../synthesisClient/defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [hostBridgeCapabilityRegistry.ts](../../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgePermissionManager.ts](../../permissions/hostBridgePermissionManager.ts.md) | src/modules/hostBridge/permissions/hostBridgePermissionManager.ts | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [hostBridgeProtocol.ts](../hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeRouteContract.ts](../hostBridgeRouteContract.ts.md) | src/modules/hostBridge/server/hostBridgeRouteContract.ts | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [hostHttpRequestReader.ts](../hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](../hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| matchHostBridgeSynthesisRoute | 函数 | 203–226 | 把请求路径映射到 Synthesis 处理器。 |

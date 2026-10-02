
# src/modules/hostBridge/server
> 目录聚合页：13 个文件、126 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts](../../../../files/src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts.md) | 文件 | 3 | 广告主机检测：探测 Host Bridge 在网络上可被外部访问的地址，剔除不可用或明显不合法的 IPv4 候选，供远程后端生成可达连接配置。 |
| [src/modules/hostBridge/server/hostBridgeAuth.ts](../../../../files/src/modules/hostBridge/server/hostBridgeAuth.ts.md) | 文件 | 12 | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [src/modules/hostBridge/server/hostBridgeCapabilityContract.ts](../../../../files/src/modules/hostBridge/server/hostBridgeCapabilityContract.ts.md) | 文件 | 13 | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [src/modules/hostBridge/server/hostBridgeFileRegistry.ts](../../../../files/src/modules/hostBridge/server/hostBridgeFileRegistry.ts.md) | 文件 | 16 | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [src/modules/hostBridge/server/hostBridgeMutationAdapter.ts](../../../../files/src/modules/hostBridge/server/hostBridgeMutationAdapter.ts.md) | 文件 | 3 | canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。 |
| [src/modules/hostBridge/server/hostBridgeNotificationInbox.ts](../../../../files/src/modules/hostBridge/server/hostBridgeNotificationInbox.ts.md) | 文件 | 13 | Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。 |
| [src/modules/hostBridge/server/hostBridgeOperationStore.ts](../../../../files/src/modules/hostBridge/server/hostBridgeOperationStore.ts.md) | 文件 | 4 | Host Bridge 服务端操作存储：基于 pluginStateStore 记录 Bridge 操作的 view 与 receipt，并按任务保留策略清理过期记录。 |
| [src/modules/hostBridge/server/hostBridgePagination.ts](../../../../files/src/modules/hostBridge/server/hostBridgePagination.ts.md) | 文件 | 7 | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [src/modules/hostBridge/server/hostBridgeProtocol.ts](../../../../files/src/modules/hostBridge/server/hostBridgeProtocol.ts.md) | 文件 | 2 | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [src/modules/hostBridge/server/hostBridgeRouteContract.ts](../../../../files/src/modules/hostBridge/server/hostBridgeRouteContract.ts.md) | 文件 | 0 | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [src/modules/hostBridge/server/hostBridgeServer.ts](../../../../files/src/modules/hostBridge/server/hostBridgeServer.ts.md) | 文件 | 33 | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [src/modules/hostBridge/server/hostHttpRequestReader.ts](../../../../files/src/modules/hostBridge/server/hostHttpRequestReader.ts.md) | 文件 | 13 | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [src/modules/hostBridge/server/runtimeHttpResponse.ts](../../../../files/src/modules/hostBridge/server/runtimeHttpResponse.ts.md) | 文件 | 7 | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |

## 子目录
- [routes](server/routes.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 12 |
| [src/utils](../../utils.md) | 8 |
| [src/modules/hostBridge/server/routes](server/routes.md) | 5 |
| [src/modules/hostBridge/workflow](workflow.md) | 4 |
| [src/modules/zoteroHost](../zoteroHost.md) | 3 |
| [src/workflows](../../workflows.md) | 3 |
| [contracts/host-bridge/schemas](../../../contracts/host-bridge/schemas.md) | 2 |
| [src/modules/hostBridge/permissions](permissions.md) | 2 |
| [contracts/host-bridge](../../../contracts/host-bridge.md) | 1 |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 1 |
| [src/modules/acp/diagnostics](../acp/diagnostics.md) | 1 |
| [src/modules/hostBridge/cli](cli.md) | 1 |
| [src/schemas](../../schemas.md) | 1 |
| [src/shared](../../shared.md) | 1 |

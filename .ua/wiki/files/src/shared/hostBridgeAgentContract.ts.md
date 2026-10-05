
# src/shared/hostBridgeAgentContract.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/hostBridgeAgentContract.ts -->

跨边界共享的 Host Bridge agent 契约常量：agent surface 版本与宿主协议标识的最小投影，插件运行时与发布脚本共用。
源码：[src/shared/hostBridgeAgentContract.ts](../../../../../src/shared/hostBridgeAgentContract.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-agent-surface.ts](../../scripts/host-bridge/host-bridge-agent-surface.ts.md) | scripts/host-bridge/host-bridge-agent-surface.ts | 定义 Host Bridge agent-facing surface 的组装模型：把命令契约与共享契约投影为 skill/reference 文档的 agent 视角结构。 |
| [hostBridgeProtocol.ts](../modules/hostBridge/server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |

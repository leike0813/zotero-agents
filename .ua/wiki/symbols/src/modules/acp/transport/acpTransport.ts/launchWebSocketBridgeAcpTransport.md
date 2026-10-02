
# launchWebSocketBridgeAcpTransport
<!-- node: function:src/modules/acp/transport/acpTransport.ts:launchWebSocketBridgeAcpTransport -->

通过本地 WebSocket bridge sidecar 建立 ACP 会话：等待 ready、连接 WebSocket、把 stdout/stdin 转成可读可写流。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、websocket、sidecar、transport  
所属文件：[src/modules/acp/transport/acpTransport.ts](../../../../../../files/src/modules/acp/transport/acpTransport.ts.md)
源码：[src/modules/acp/transport/acpTransport.ts:1949](../../../../../../../../src/modules/acp/transport/acpTransport.ts#L1949)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [launchAcpTransport](../../../../../../files/src/modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts:2599–2620 | ACP transport 的统一启动入口：按运行时能力选择 Node 管道、浏览器子进程或 WebSocket bridge 三种传输路径。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureAcpWebSocketBridgeService](../../../../../../files/src/modules/acp/transport/acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts:341–351 | 幂等地确保 bridge sidecar 已就绪：未运行时启动并返回共享句柄，供 transport 复用。 |


# src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/reverseHost](../../../../../modules/src/modules/synthesis/reverseHost.md)
<!-- node: file:src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts -->

反向宿主 Broker：校验 sidecar 携带的 authorization token 与 service instance 绑定后，把 host-call 分派到对应 capability handler，并强制有界 deadline 与观测事件记录。
源码：[src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts](../../../../../../../src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [synthesisSidecarTrace.ts](../sidecar/synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |
| [timingSafeEqual.ts](../../../utils/timingSafeEqual.ts.md) | src/utils/timingSafeEqual.ts | 字符串定长时间安全比较：长度不等直接返回 false，等长时以累积异或差值避免逐字符短路。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReverseHostEndpoint.ts](synthesisReverseHostEndpoint.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts | 反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。 |
| [synthesisReverseHostHandlers.ts](synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisReverseHostBroker](../../../../../symbols/globals.md) | 函数 | 102–270 | 创建反向宿主 broker：绑定 profile/service instance、执行 token 鉴权、按 capability 路由到 handler，并把每次调用的结果与失败写入 sidecar trace。 |


# src/modules/synthesis/reverseHost
> 目录聚合页：3 个文件、4 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts](../../../../files/src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts.md) | 文件 | 0 | 反向宿主 Broker：校验 sidecar 携带的 authorization token 与 service instance 绑定后，把 host-call 分派到对应 capability handler，并强制有界 deadline 与观测事件记录。 |
| [src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts](../../../../files/src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts.md) | 文件 | 0 | 反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。 |
| [src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts](../../../../files/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts.md) | 文件 | 4 | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/synthesis](../synthesis.md) | 6 |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 4 |
| [src/modules/synthesis/sidecar](sidecar.md) | 4 |
| [src/modules/hostBridge/server](../hostBridge/server.md) | 2 |
| [src/utils](../../utils.md) | 2 |
| [src/modules](../../modules.md) | 1 |
| [src/modules/synthesis/production](production.md) | 1 |

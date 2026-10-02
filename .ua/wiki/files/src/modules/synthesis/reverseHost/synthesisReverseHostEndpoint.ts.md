
# src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/reverseHost](../../../../../modules/src/modules/synthesis/reverseHost.md)
<!-- node: file:src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts -->

反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。
源码：[src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts](../../../../../../../src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostHttpRequestReader.ts](../../hostBridge/server/hostHttpRequestReader.ts.md) | src/modules/hostBridge/server/hostHttpRequestReader.ts | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [runtimeHttpResponse.ts](../../hostBridge/server/runtimeHttpResponse.ts.md) | src/modules/hostBridge/server/runtimeHttpResponse.ts | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |
| [sidecarObservability.ts](../../../../packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [synthesisReverseHostBroker.ts](synthesisReverseHostBroker.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts | 反向宿主 Broker：校验 sidecar 携带的 authorization token 与 service instance 绑定后，把 host-call 分派到对应 capability handler，并强制有界 deadline 与观测事件记录。 |
| [synthesisSidecarTrace.ts](../sidecar/synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisProductionOwner.ts](../production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisReverseHostEndpoint](../../../../../symbols/globals.md) | 函数 | 215–447 | 创建反向宿主端点：绑定 loopback 监听、生成随机授权 token、发布 locator，并在停止时按序关闭 socket 与 broker。 |
| [handleSynthesisReverseHostHttpRequest](../../../../../symbols/globals.md) | 函数 | 48–100 | 纯函数式处理一次已解析的 HTTP 请求：校验路径与方法、鉴权后调用 broker，并把结果编码为带观测事件的 JSON 响应。 |


# src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts -->

sidecar 计算客户端：把 citation graph 的 build / layout / metrics 三类重计算请求通过 worker capability 路由到 sidecar，统一施加各阶段 deadline 并归一化错误。
源码：[src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphBuild.ts](../../../../packages/synthesis-engine/src/citationGraphBuild.ts.md) | packages/synthesis-engine/src/citationGraphBuild.ts | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |
| [index.ts](../../../../packages/synthesis-engine/src/index.ts.md) | packages/synthesis-engine/src/index.ts | Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。 |
| [sidecarSystem.ts](../../../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisSidecarRpcClient.ts](synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisSidecarComputeClient](../../../../../symbols/globals.md) | 函数 | 45–131 | 创建计算客户端，提供 citation graph build、layout、metrics 三类调用入口，各自绑定对应 deadline 并把响应重建为契约结果。 |
| [SynthesisSidecarComputeClientError](../../../../../symbols/globals.md) | 类 | 35–43 | 计算客户端错误类型，携带契约内的稳定错误码以便调用方区分超时、busy 与失败。 |

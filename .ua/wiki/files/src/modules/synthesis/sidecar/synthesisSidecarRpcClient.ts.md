
# src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts -->

sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。
源码：[src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarObservability.ts](../../../../packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [sidecarSystem.ts](../../../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisSidecarTrace.ts](synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [nativeComposition.ts](../../synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [synthesisProductionOwner.ts](../production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisProductionRpcPolicy.ts](../production/synthesisProductionRpcPolicy.ts.md) | src/modules/synthesis/production/synthesisProductionRpcPolicy.ts | 生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。 |
| [synthesisReverseHostHandlers.ts](../reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |
| [synthesisSidecarComputeClient.ts](synthesisSidecarComputeClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts | sidecar 计算客户端：把 citation graph 的 build / layout / metrics 三类重计算请求通过 worker capability 路由到 sidecar，统一施加各阶段 deadline 并归一化错误。 |
| [synthesisSidecarTransferClient.ts](synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |
| [synthesisSidecarWorkbenchClient.ts](synthesisSidecarWorkbenchClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts | sidecar 工作台客户端：提供 operational chrome 读取这一条短 deadline 调用，把 workbench 契约结果从 RPC 响应中重建出来。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisSidecarRpcClient](../../../../../symbols/globals.md) | 函数 | 184–411 | 创建 RPC 客户端：生成单调 request id、校验 capability 合法性、执行带 deadline 的调用并把每次调用的 trace 事件写入观测通道。 |
| [SynthesisSidecarRpcError](../../../../../symbols/globals.md) | 类 | 42–50 | RPC 错误类型，携带契约错误码与可审计的失败详情，供上层做重试与分类。 |

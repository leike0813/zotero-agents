
# src/modules/synthesis/production/synthesisProductionRpcPolicy.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/production](../../../../../modules/src/modules/synthesis/production.md)
<!-- node: file:src/modules/synthesis/production/synthesisProductionRpcPolicy.ts -->

生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。
源码：[src/modules/synthesis/production/synthesisProductionRpcPolicy.ts](../../../../../../../src/modules/synthesis/production/synthesisProductionRpcPolicy.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [operations.json](../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json.md) | packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json | 生产客户端契约 v1 的操作目录，枚举每个 RPC operation 的标识、请求字段、终态形态与超时语义，是 synthesisProductionRpcPolicy 等客户端策略的事实来源。 |
| [sidecarSystem.ts](../../../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisSidecarRpcClient.ts](../sidecar/synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [nativeComposition.ts](../../synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [synthesisProductionOwner.ts](synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisReverseHostHandlers.ts](../reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |
| [synthesisSidecarBusinessAudit.ts](../sidecar/synthesisSidecarBusinessAudit.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts | sidecar 业务审计：以 started/succeeded/failed 三态记录每个生产 operation，依据 manifest 的语义成功字段与失败分类写入 runtime 日志，形成跨进程的业务级证据链。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [synthesisProductionOperationDeadlineMs](../../../../../symbols/globals.md) | 函数 | 128–132 | 返回指定 capability 的一次 RPC 调用 deadline，并允许 manifest 中的 override 覆盖默认值。 |
| [synthesisProductionOperationPolicy](../../../../../symbols/globals.md) | 函数 | 144–153 | 返回 capability 的完整操作策略（请求面、结果面、工作模型与 receipt 类型）。 |
| [synthesisProductionOperationWorkDeadlineMs](../../../../../symbols/globals.md) | 函数 | 134–142 | 解析 capability 的长任务工作 deadline，与单次传输 deadline 区分开。 |
| [synthesisProductionTransportDeadlineMs](../../../../../symbols/globals.md) | 函数 | 155–162 | 在 transport 级错误预算内按已用时间收窄本次传输 deadline，保证重试不会突破总预算。 |

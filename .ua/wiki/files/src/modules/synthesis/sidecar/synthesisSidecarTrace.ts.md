
# src/modules/synthesis/sidecar/synthesisSidecarTrace.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarTrace.ts -->

sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。
源码：[src/modules/synthesis/sidecar/synthesisSidecarTrace.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarTrace.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardWireContract.ts](../../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [sidecarObservability.ts](../../../../packages/synthesis-contracts/src/sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [nativeComposition.ts](../../synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [synthesisProductionOwner.ts](../production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisReverseHostBroker.ts](../reverseHost/synthesisReverseHostBroker.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts | 反向宿主 Broker：校验 sidecar 携带的 authorization token 与 service instance 绑定后，把 host-call 分派到对应 capability handler，并强制有界 deadline 与观测事件记录。 |
| [synthesisReverseHostEndpoint.ts](../reverseHost/synthesisReverseHostEndpoint.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts | 反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。 |
| [synthesisSidecarControlClient.ts](synthesisSidecarControlClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts | sidecar 控制面客户端：读取 discovery、执行健康与握手探测并校验协议/能力/上限，分普通控制与生产控制两条 profile 支撑 Supervisor 生命周期判定。 |
| [synthesisSidecarRpcClient.ts](synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [synthesisSidecarRuntimeSupervisor.ts](synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisWorkbenchTab.ts](../workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisSidecarTraceContext](../../../../../symbols/globals.md) | 函数 | 257–269 | 创建 trace 上下文，生成 traceId 并携带 profile、instance 与调用来源等身份事实。 |
| [readSynthesisSidecarTraceSnapshot](../../../../../symbols/globals.md) | 函数 | 307–324 | 读取当前 trace 快照并投影为 Dashboard wire 契约结构，标记长时间无更新的 trace 为 stale。 |
| [recordSynthesisSidecarTraceEvent](../../../../../symbols/globals.md) | 函数 | 271–300 | 记录一条 sidecar 观测事件：按契约重建事件结构后交由 retainEvent 归档，未启用诊断时静默跳过。 |
| [subscribeSynthesisSidecarTracePatches](../../../../../symbols/globals.md) | 函数 | 326–330 | 订阅 trace patch 推送，返回取消订阅函数。 |

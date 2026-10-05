
# src/modules/synthesisClient/nativeComposition.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesisClient](../../../../modules/src/modules/synthesisClient.md)
<!-- node: file:src/modules/synthesisClient/nativeComposition.ts -->

原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。
源码：[src/modules/synthesisClient/nativeComposition.ts](../../../../../../src/modules/synthesisClient/nativeComposition.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [clientPortAdapter.ts](clientPortAdapter.ts.md) | src/modules/synthesisClient/clientPortAdapter.ts | Synthesis 客户端 Port 适配器：把抽象的 `SynthesisClientPort` 调用翻译为契约重建 + 受控执行，是 UI 与原生实现之间的统一入参校验与错误归一化边界。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [synthesisProductionRpcPolicy.ts](../synthesis/production/synthesisProductionRpcPolicy.ts.md) | src/modules/synthesis/production/synthesisProductionRpcPolicy.ts | 生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。 |
| [synthesisSidecarBusinessAudit.ts](../synthesis/sidecar/synthesisSidecarBusinessAudit.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts | sidecar 业务审计：以 started/succeeded/failed 三态记录每个生产 operation，依据 manifest 的语义成功字段与失败分类写入 runtime 日志，形成跨进程的业务级证据链。 |
| [synthesisSidecarRpcClient.ts](../synthesis/sidecar/synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [synthesisSidecarRuntimeSupervisor.ts](../synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisSidecarTrace.ts](../synthesis/sidecar/synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |
| [synthesisSidecarTransferClient.ts](../synthesis/sidecar/synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaultClient.ts](defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [healthGate.ts](../../../scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createNativeSynthesisClientComposition](../../../../symbols/globals.md) | 函数 | 625–659 | 创建原生合成客户端组合：把原生 Port 接到 clientPortAdapter 上，返回完整的 SynthesisClient 实现。 |
| [createReadyNativeSynthesisClientComposition](../../../../symbols/globals.md) | 函数 | 661–671 | 创建要求 sidecar 已就绪的客户端组合，未就绪时直接失败而不做等待或降级。 |

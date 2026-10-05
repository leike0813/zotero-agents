
# src/modules/synthesis/sidecar
> 目录聚合页：10 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts.md) | 文件 | 0 | sidecar 业务审计：以 started/succeeded/failed 三态记录每个生产 operation，依据 manifest 的语义成功字段与失败分类写入 runtime 日志，形成跨进程的业务级证据链。 |
| [src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts.md) | 文件 | 0 | sidecar 计算客户端：把 citation graph 的 build / layout / metrics 三类重计算请求通过 worker capability 路由到 sidecar，统一施加各阶段 deadline 并归一化错误。 |
| [src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts.md) | 文件 | 0 | sidecar 控制面客户端：读取 discovery、执行健康与握手探测并校验协议/能力/上限，分普通控制与生产控制两条 profile 支撑 Supervisor 生命周期判定。 |
| [src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts.md) | 文件 | 0 | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts.md) | 文件 | 0 | sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。 |
| [src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts.md) | 文件 | 0 | sidecar 运行时 manifest 加载层：从插件打包资源中读取目标平台的 bundle，计算文件摘要并按契约重建 manifest，只接受通过校验的运行时。 |
| [src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | 文件 | 0 | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [src/modules/synthesis/sidecar/synthesisSidecarTrace.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarTrace.ts.md) | 文件 | 0 | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |
| [src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts.md) | 文件 | 0 | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |
| [src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts](../../../../files/src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts.md) | 文件 | 0 | sidecar 工作台客户端：提供 operational chrome 读取这一条短 deadline 调用，把 workbench 契约结果从 RPC 响应中重建出来。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 18 |
| [src/modules](../../modules.md) | 8 |
| [src/platform](../../platform.md) | 6 |
| [src/utils](../../utils.md) | 5 |
| [packages/synthesis-engine/src](../../../packages/synthesis-engine/src.md) | 3 |
| [packages/synthesis-contracts/contract-set/synthesis-production-client-v1](../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1.md) | 1 |
| [src/modules/synthesis/production](production.md) | 1 |
| [src/shared](../../shared.md) | 1 |

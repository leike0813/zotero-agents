
# src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts -->

sidecar 工作台客户端：提供 operational chrome 读取这一条短 deadline 调用，把 workbench 契约结果从 RPC 响应中重建出来。
源码：[src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarSystem.ts](../../../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisSidecarRpcClient.ts](synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [workbench.ts](../../../../packages/synthesis-contracts/src/workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisSidecarWorkbenchClient](../../../../../symbols/globals.md) | 函数 | 22–59 | 创建工作台客户端，暴露读取 operational chrome 的方法并施加 1 秒短 deadline。 |
| [SynthesisSidecarWorkbenchClientError](../../../../../symbols/globals.md) | 类 | 15–20 | 工作台客户端错误类型，携带 sidecar 契约错误码供工作台区分不可用与失败。 |


# src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts -->

sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。
源码：[src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../../../packages/synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [citationGraphBuildTransfer.ts](../../../../packages/synthesis-engine/src/citationGraphBuildTransfer.ts.md) | packages/synthesis-engine/src/citationGraphBuildTransfer.ts | 引用图谱构建的传输封装：分页 artifact 与 manifest 的构建与重建，供 engine 与 sidecar 之间搬运图谱页。 |
| [common.ts](../../../../packages/synthesis-contracts/src/common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [sidecarSystem.ts](../../../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [sidecarTransfer.ts](../../../../packages/synthesis-contracts/src/sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts | sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。 |
| [synthesisSidecarRpcClient.ts](synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [nativeComposition.ts](../../synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [synthesisReverseHostHandlers.ts](../reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisSidecarContentTransferClient](../../../../../symbols/globals.md) | 函数 | 240–249 | 创建面向内容产物的传输客户端包装，固定使用内容传输编码与版本。 |
| [createSynthesisSidecarTransferClient](../../../../../symbols/globals.md) | 函数 | 216–238 | 创建传输客户端工厂，绑定 RPC 连接并返回 manifest/page/status 三个能力入口。 |
| [SynthesisSidecarTransferClientError](../../../../../symbols/globals.md) | 类 | 43–48 | 传输客户端错误类型，携带稳定错误码以区分摘要不符、分页中断与 sidecar 失败。 |

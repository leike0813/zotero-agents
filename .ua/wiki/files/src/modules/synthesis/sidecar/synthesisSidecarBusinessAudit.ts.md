
# src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts -->

sidecar 业务审计：以 started/succeeded/failed 三态记录每个生产 operation，依据 manifest 的语义成功字段与失败分类写入 runtime 日志，形成跨进程的业务级证据链。
源码：[src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [operations.json](../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json.md) | packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json | 生产客户端契约 v1 的操作目录，枚举每个 RPC operation 的标识、请求字段、终态形态与超时语义，是 synthesisProductionRpcPolicy 等客户端策略的事实来源。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [sidecarSystem.ts](../../../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisProductionRpcPolicy.ts](../production/synthesisProductionRpcPolicy.ts.md) | src/modules/synthesis/production/synthesisProductionRpcPolicy.ts | 生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。 |
| [workbench.ts](../../../../packages/synthesis-contracts/src/workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [nativeComposition.ts](../../synthesisClient/nativeComposition.ts.md) | src/modules/synthesisClient/nativeComposition.ts | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [beginSynthesisSidecarBusinessAudit](../../../../../symbols/globals.md) | 函数 | 141–236 | 开始一次业务审计：记录开始事件并返回结算回调，在终态时写出成功/失败日志与关联 trace 事实。 |

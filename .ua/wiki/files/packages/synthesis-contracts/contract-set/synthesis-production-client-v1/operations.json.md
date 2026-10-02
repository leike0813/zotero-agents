
# packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-production-client-v1](../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-production-client-v1.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json -->

生产客户端契约 v1 的操作目录，枚举每个 RPC operation 的标识、请求字段、终态形态与超时语义，是 synthesisProductionRpcPolicy 等客户端策略的事实来源。
源码：[packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json](../../../../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisProductionRpcPolicy.ts](../../../../src/modules/synthesis/production/synthesisProductionRpcPolicy.ts.md) | src/modules/synthesis/production/synthesisProductionRpcPolicy.ts | 生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。 |
| [synthesisSidecarBusinessAudit.ts](../../../../src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts | sidecar 业务审计：以 started/succeeded/failed 三态记录每个生产 operation，依据 manifest 的语义成功字段与失败分类写入 runtime 日志，形成跨进程的业务级证据链。 |

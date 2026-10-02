
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json

语言：json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json -->

定义可观测性协议的 JSON Schema，统一 trace 上下文、身份、指标与事实字段，承载 sidecar 运行时观测事件。

规模：138 行
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

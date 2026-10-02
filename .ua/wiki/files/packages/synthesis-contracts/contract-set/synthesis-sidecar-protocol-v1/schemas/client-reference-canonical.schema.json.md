
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json

语言：json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json -->

定义 canonical Reference 客户端协议的 JSON Schema，约束文献索引请求与结果、排序请求以及刷新/匹配回执结构。

规模：800 行
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [transfer.schema.json](transfer.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json | 定义数据传输面协议的 JSON Schema，涵盖分页描述符（引用输入/输出、内容页）、库节点、引用行、图节点与解析边及归属信息。 |

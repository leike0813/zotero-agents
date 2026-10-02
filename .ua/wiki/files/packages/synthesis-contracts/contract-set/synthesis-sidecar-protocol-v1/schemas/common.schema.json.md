
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json

语言：json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json -->

协议集共用基础 JSON Schema，提供 identifier、sha256、sidecarError、opaqueCanonicalJson 与 canonicalTextChunk 等跨域通用定义。

规模：119 行
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-topic-workbench.schema.json](client-topic-workbench.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json | 定义 Topic Workbench 客户端 surface 协议的 JSON Schema，是本协议集中最大的 DTO 契约，约束主题记录、列表分页结果、主题上下文与更新意图。 |
| [reverse-host.schema.json](reverse-host.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json | 定义 sidecar 反向调用 Zotero 宿主能力的通道协议 JSON Schema，包含库条目引用、库快照请求/引用/标识与结构化诊断。 |
| [topic-domain.schema.json](topic-domain.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json | 定义 topic domain 领域模型的 JSON Schema，是主题、解析器、摘要引用、已解析文献与产物元数据等领域实体的公共结构来源。 |

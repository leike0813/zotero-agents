
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json

语言：json
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](../../../../../../modules/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas.md)
<!-- node: config:packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json -->

定义 topic domain 领域模型的 JSON Schema，是主题、解析器、摘要引用、已解析文献与产物元数据等领域实体的公共结构来源。

规模：1206 行
源码：[packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json](../../../../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](../../../src/protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client-artifact-library-debug.schema.json](client-artifact-library-debug.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-artifact-library-debug.schema.json | 定义 Artifact Library 客户端读取与调试快照的 JSON Schema，约束产物筛选、分页调试视图、导出状态以及文献质量与作者等字段。 |
| [client-topic-workbench.schema.json](client-topic-workbench.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json | 定义 Topic Workbench 客户端 surface 协议的 JSON Schema，是本协议集中最大的 DTO 契约，约束主题记录、列表分页结果、主题上下文与更新意图。 |
| [client-workflow-review.schema.json](client-workflow-review.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-workflow-review.schema.json | 定义工作流审阅客户端协议的 JSON Schema，约束审阅请求、结构化主题与时间线内容、注册表覆盖行以及缺失产物诊断。 |

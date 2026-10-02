
# packages/synthesis-contracts/src/tags.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/tags.ts -->

标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。
源码：[packages/synthesis-contracts/src/tags.ts](../../../../../../packages/synthesis-contracts/src/tags.ts)

## 符号（5）
<!-- node: function:packages/synthesis-contracts/src/tags.ts:rebuildAuditTags -->
<!-- node: function:packages/synthesis-contracts/src/tags.ts:rebuildSynthesisTagCapabilityResult -->
<!-- node: function:packages/synthesis-contracts/src/tags.ts:rebuildTagAuditStagingEntries -->
<!-- node: function:packages/synthesis-contracts/src/tags.ts:rebuildTagRegulationVerifiedCommitDto -->
<!-- node: function:packages/synthesis-contracts/src/tags.ts:rebuildTagVocabularyRegulatorExportDto -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildAuditTags | 函数 | 262–282 | 简单 | validation、audit、tag-vocabulary | 0 | 收敛审计行中的标签集合，去重并限制数量。 |
| rebuildSynthesisTagCapabilityResult | 函数 | 615–626 | 简单 | contract、rebuild、capability | 0 | 重建标签能力结果，声明导入、审计与词表动作集合。 |
| rebuildTagAuditStagingEntries | 函数 | 284–375 | 中等 | contract、rebuild、audit | 0 | 重建标签审计 staging 条目，校验批次、行数与字节上限。 |
| rebuildTagRegulationVerifiedCommitDto | 函数 | 377–435 | 中等 | contract、rebuild、audit、durable-write | 0 | 重建标签治理 verified commit 记录，绑定 basis 哈希与证据。 |
| rebuildTagVocabularyRegulatorExportDto | 函数 | 55–83 | 简单 | contract、rebuild、tag-vocabulary | 0 | 重建词表 regulator 导出 DTO，供外部治理工具消费。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [itemRef.ts](itemRef.ts.md) | packages/synthesis-contracts/src/itemRef.ts | Zotero 条目引用合约：校验 libraryId 与 itemKey 的组合，提供稳定的比较函数、键构造函数与批量重建，供跨边界传递 portable refs。 |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisTagCapabilityResult | 函数 | 615–626 | 重建标签能力结果，声明导入、审计与词表动作集合。 |
| rebuildTagAuditStagingEntries | 函数 | 284–375 | 重建标签审计 staging 条目，校验批次、行数与字节上限。 |
| rebuildTagRegulationVerifiedCommitDto | 函数 | 377–435 | 重建标签治理 verified commit 记录，绑定 basis 哈希与证据。 |
| rebuildTagVocabularyRegulatorExportDto | 函数 | 55–83 | 重建词表 regulator 导出 DTO，供外部治理工具消费。 |

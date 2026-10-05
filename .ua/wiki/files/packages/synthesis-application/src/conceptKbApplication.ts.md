
# packages/synthesis-application/src/conceptKbApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/conceptKbApplication.ts -->

概念知识库（Concept KB）应用层：管理概念、义项、别名、关系与审阅项的快照读写，接收 topic synthesis 产出的概念卡片 proposal 并用 token 重叠做合并。
源码：[packages/synthesis-application/src/conceptKbApplication.ts](../../../../../../packages/synthesis-application/src/conceptKbApplication.ts)

## 符号（7）
<!-- node: function:packages/synthesis-application/src/conceptKbApplication.ts:createSynthesisConceptKbApplication -->
<!-- node: function:packages/synthesis-application/src/conceptKbApplication.ts:hashSynthesisConceptKbSnapshot -->
<!-- node: function:packages/synthesis-application/src/conceptKbApplication.ts:mergeProposal -->
<!-- node: function:packages/synthesis-application/src/conceptKbApplication.ts:proposalMatches -->
<!-- node: function:packages/synthesis-application/src/conceptKbApplication.ts:readSynthesisConceptKbApplicationSnapshot -->
<!-- node: function:packages/synthesis-application/src/conceptKbApplication.ts:source -->
<!-- node: function:packages/synthesis-application/src/conceptKbApplication.ts:synthesisConceptKbStateRecordsFromSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisConceptKbApplication | 函数 | 520–931 | 复杂 | 工厂函数、概念知识库、命令集合、核心 | 0 | 概念知识库应用工厂：提供快照读取、整体替换、ingest 提案、审阅决策、显示名更新、删除、索引重建与查询等命令，并维护状态记录与索引发布。 |
| hashSynthesisConceptKbSnapshot | 函数 | 150–156 | 简单 | hash、canonical-json、basis、概念知识库 | 1 | 对概念知识库快照取 canonical JSON 哈希，作为知识检查点使用的 conceptManifest basis。 |
| mergeProposal | 函数 | 375–514 | 复杂 | proposal-合并、概念知识库、实体ID、核心 | 0 | 把单个概念卡片 proposal 合并进现有快照：按候选匹配结果决定新建、更新义项/别名/关系，并稳定生成各类实体 ID。 |
| proposalMatches | 函数 | 330–373 | 中等 | 匹配、token-重叠、概念知识库 | 0 | 对 proposal 标签与现有概念标签做 token 重叠评分，返回最佳匹配概念与义项候选。 |
| readSynthesisConceptKbApplicationSnapshot | 函数 | 168–235 | 复杂 | 读取、快照、概念知识库、repository | 0 | 从 repository 行读取并重建概念知识库快照，逐类装配概念、义项、别名、关系、审阅项与主题链接。 |
| source | 函数 | 266–296 | 中等 | 溯源、proposal、概念知识库 | 0 | 从 proposal 中提取来源元信息（topic、paper ref、语言与时间戳），用于概念实体的溯源与去重。 |
| synthesisConceptKbStateRecordsFromSnapshot | 函数 | 237–264 | 中等 | 快照、repository-记录、转换 | 0 | 把领域快照转换为 repository 状态记录集合，供替换写入时保持行结构稳定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [conceptKb.ts](../../synthesis-repository/src/conceptKb.ts.md) | packages/synthesis-repository/src/conceptKb.ts | 概念知识库持久化仓储：维护概念、义项、别名、关系、审阅项与主题-概念链接表，并支持概念状态整体替换与索引提升。 |
| [conceptKbApplication.ts](../../synthesis-contracts/src/conceptKbApplication.ts.md) | packages/synthesis-contracts/src/conceptKbApplication.ts | 概念知识库应用层合约（1155 行，全批最大合约文件）：逐字段重建概念、义项、别名、关系、proposal、审阅项与主题链接，并定义 replace/ingest/review/delete/query 等请求与 mutation 结果。 |
| [conceptKbIndex.ts](../../synthesis-engine/src/conceptKbIndex.ts.md) | packages/synthesis-engine/src/conceptKbIndex.ts | Synthesis 概念知识库索引引擎：把概念、义项、别名、来源等 canonical 行编译为可 checkpoint 的索引与查询结果，并提供进程内引擎工厂。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [knowledgeCheckpointApplication.ts](knowledgeCheckpointApplication.ts.md) | packages/synthesis-application/src/knowledgeCheckpointApplication.ts | 知识检查点（knowledge checkpoint）应用层：跨概念库、标签词表与主题图三类 basis 计算知识载荷哈希、生成差异预览，并在用户覆盖决定后以 expectedBases 做原子替换。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisConceptKbApplication | 函数 | 520–931 | 概念知识库应用工厂：提供快照读取、整体替换、ingest 提案、审阅决策、显示名更新、删除、索引重建与查询等命令，并维护状态记录与索引发布。 |
| hashSynthesisConceptKbSnapshot | 函数 | 150–156 | 对概念知识库快照取 canonical JSON 哈希，作为知识检查点使用的 conceptManifest basis。 |
| readSynthesisConceptKbApplicationSnapshot | 函数 | 168–235 | 从 repository 行读取并重建概念知识库快照，逐类装配概念、义项、别名、关系、审阅项与主题链接。 |
| synthesisConceptKbStateRecordsFromSnapshot | 函数 | 237–264 | 把领域快照转换为 repository 状态记录集合，供替换写入时保持行结构稳定。 |

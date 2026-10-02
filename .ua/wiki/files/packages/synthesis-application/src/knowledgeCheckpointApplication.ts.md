
# packages/synthesis-application/src/knowledgeCheckpointApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/knowledgeCheckpointApplication.ts -->

知识检查点（knowledge checkpoint）应用层：跨概念库、标签词表与主题图三类 basis 计算知识载荷哈希、生成差异预览，并在用户覆盖决定后以 expectedBases 做原子替换。
源码：[packages/synthesis-application/src/knowledgeCheckpointApplication.ts](../../../../../../packages/synthesis-application/src/knowledgeCheckpointApplication.ts)

## 符号（6）
<!-- node: function:packages/synthesis-application/src/knowledgeCheckpointApplication.ts:createSynthesisKnowledgeCheckpointApplication -->
<!-- node: function:packages/synthesis-application/src/knowledgeCheckpointApplication.ts:decisionOverrides -->
<!-- node: function:packages/synthesis-application/src/knowledgeCheckpointApplication.ts:diffRows -->
<!-- node: function:packages/synthesis-application/src/knowledgeCheckpointApplication.ts:diffSynthesisKnowledgeCheckpointPayload -->
<!-- node: class:packages/synthesis-application/src/knowledgeCheckpointApplication.ts:SynthesisKnowledgeCheckpointApplicationError -->
<!-- node: function:packages/synthesis-application/src/knowledgeCheckpointApplication.ts:verifyCheckpoint -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisKnowledgeCheckpointApplication | 函数 | 347–498 | 复杂 | 工厂函数、知识检查点、用户决策、核心 | 0 | 知识检查点应用工厂：捕获三类知识 basis、生成差异预览，并在用户覆盖决定后以 expectedBases 做条件替换。 |
| decisionOverrides | 函数 | 249–345 | 复杂 | 用户决策、校验、知识检查点 | 0 | 把用户对各计数族的覆盖决定合并进检查点载荷，拒绝与实际差异矛盾的 override。 |
| diffRows | 函数 | 147–164 | 简单 | 差异比较、有界、纯函数 | 0 | 对实体 ID 行集合求差，生成 added/removed 两个有界 ID 列表供差异视图使用。 |
| diffSynthesisKnowledgeCheckpointPayload | 函数 | 170–247 | 复杂 | 差异比较、知识检查点、纯函数 | 0 | 比较两个知识载荷并按计数族生成差异结构，标注新增、删除与变更的实体 ID 列表。 |
| SynthesisKnowledgeCheckpointApplicationError | 类 | 51–65 | 简单 | 错误类型、知识检查点、诊断 | 0 | 知识检查点应用层错误类型，携带错误码与受影响的 basis 字段，用于 basis_mismatch 与 override 非法上报。 |
| verifyCheckpoint | 函数 | 125–141 | 简单 | 校验、basis、知识检查点 | 0 | 校验捕获的 basis 与载荷是否自洽，检测到哈希不一致即以 basis_mismatch 失败。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [conceptKbApplication.ts](conceptKbApplication.ts.md) | packages/synthesis-application/src/conceptKbApplication.ts | 概念知识库（Concept KB）应用层：管理概念、义项、别名、关系与审阅项的快照读写，接收 topic synthesis 产出的概念卡片 proposal 并用 token 重叠做合并。 |
| [knowledgeCheckpoint.ts](../../synthesis-contracts/src/knowledgeCheckpoint.ts.md) | packages/synthesis-contracts/src/knowledgeCheckpoint.ts | 知识检查点合约：定义三类知识 basis（标签修订、概念清单、主题图）、载荷结构与计数族，并重建检查点对象与 apply 请求。 |
| [tagVocabularyApplication.ts](tagVocabularyApplication.ts.md) | packages/synthesis-application/src/tagVocabularyApplication.ts | 标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。 |
| [topicGraphApplication.ts](topicGraphApplication.ts.md) | packages/synthesis-application/src/topicGraphApplication.ts | 主题图应用层：维护主题间关系图谱的节点、边与审阅项，接收 topic graph relation proposal，检测反向更宽路径等冲突后决定合并或转审阅。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisKnowledgeCheckpointApplication | 函数 | 347–498 | 知识检查点应用工厂：捕获三类知识 basis、生成差异预览，并在用户覆盖决定后以 expectedBases 做条件替换。 |
| diffSynthesisKnowledgeCheckpointPayload | 函数 | 170–247 | 比较两个知识载荷并按计数族生成差异结构，标注新增、删除与变更的实体 ID 列表。 |
| SynthesisKnowledgeCheckpointApplicationError | 类 | 51–65 | 知识检查点应用层错误类型，携带错误码与受影响的 basis 字段，用于 basis_mismatch 与 override 非法上报。 |

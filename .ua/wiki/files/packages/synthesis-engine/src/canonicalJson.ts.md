
# packages/synthesis-engine/src/canonicalJson.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/canonicalJson.ts -->

synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。
源码：[packages/synthesis-engine/src/canonicalJson.ts](../../../../../../packages/synthesis-engine/src/canonicalJson.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-native-worker-transfer-parity.ts](../../../scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts.md) | scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts | 原生 worker 传输一致性检查：校验 citation graph build 的输入/输出分页与 transfer manifest 在引擎与 sidecar 之间的归属一致。 |
| [citationGraphBuild.ts](citationGraphBuild.ts.md) | packages/synthesis-engine/src/citationGraphBuild.ts | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |
| [citationGraphBuildTransfer.ts](citationGraphBuildTransfer.ts.md) | packages/synthesis-engine/src/citationGraphBuildTransfer.ts | 引用图谱构建的传输封装：分页 artifact 与 manifest 的构建与重建，供 engine 与 sidecar 之间搬运图谱页。 |
| [citationGraphProjection.ts](../../synthesis-application/src/citationGraphProjection.ts.md) | packages/synthesis-application/src/citationGraphProjection.ts | 引用图谱 repository 记录与契约 DTO 之间的纯投影层：把节点、边、来源归属、light metrics 行映射为可校验的应用视图，并提供基于 canonical JSON 的行哈希。 |
| [conceptKbApplication.ts](../../synthesis-application/src/conceptKbApplication.ts.md) | packages/synthesis-application/src/conceptKbApplication.ts | 概念知识库（Concept KB）应用层：管理概念、义项、别名、关系与审阅项的快照读写，接收 topic synthesis 产出的概念卡片 proposal 并用 token 重叠做合并。 |
| [foundation.ts](../../../src/modules/synthesis/foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [index.ts](index.ts.md) | packages/synthesis-engine/src/index.ts | Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。 |
| [knowledgeCheckpointApplication.ts](../../synthesis-application/src/knowledgeCheckpointApplication.ts.md) | packages/synthesis-application/src/knowledgeCheckpointApplication.ts | 知识检查点（knowledge checkpoint）应用层：跨概念库、标签词表与主题图三类 basis 计算知识载荷哈希、生成差异预览，并在用户覆盖决定后以 expectedBases 做原子替换。 |
| [knowledgeCheckpointCompatibility.ts](../../synthesis-application/src/knowledgeCheckpointCompatibility.ts.md) | packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts | 知识检查点的兼容归一化工具：把非安全整数或负数的计数折叠为 0 并按键排序，再对记录集取 canonical 哈希生成稳定签名。 |
| [referenceMatcher.ts](referenceMatcher.ts.md) | packages/synthesis-engine/src/referenceMatcher.ts | 参考文献匹配引擎：从原始引文文本抽取标识符、归一化标题、聚类去重并按策略解析为 canonical reference，是引用图谱与引用分析的前置计算核心。 |
| [referenceMatchingReviewApplication.ts](../../synthesis-application/src/referenceMatchingReviewApplication.ts.md) | packages/synthesis-application/src/referenceMatchingReviewApplication.ts | 参考文献匹配审阅应用层：驱动 reference matcher 引擎产出绑定/去重提案，维护提案状态机（待审、已接受、已丢弃），并把用户决策投影为 mutation 结果。 |
| [referenceProjection.ts](../../synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [referenceRefreshApplication.ts](../../synthesis-application/src/referenceRefreshApplication.ts.md) | packages/synthesis-application/src/referenceRefreshApplication.ts | 参考文献刷新应用层：按 source 描述符判定增量或全量刷新计划，合并新旧 source/artifact/raw reference 行，并以 basis 哈希守卫 repository 投影替换。 |
| [tagVocabularyApplication.ts](../../synthesis-application/src/tagVocabularyApplication.ts.md) | packages/synthesis-application/src/tagVocabularyApplication.ts | 标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。 |
| [topicCanonical.ts](../../synthesis-application/src/topicCanonical.ts.md) | packages/synthesis-application/src/topicCanonical.ts | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |
| [topicGraphApplication.ts](../../synthesis-application/src/topicGraphApplication.ts.md) | packages/synthesis-application/src/topicGraphApplication.ts | 主题图应用层：维护主题间关系图谱的节点、边与审阅项，接收 topic graph relation proposal，检测反向更宽路径等冲突后决定合并或转审阅。 |
| [topicStructuredArtifact.ts](topicStructuredArtifact.ts.md) | packages/synthesis-engine/src/topicStructuredArtifact.ts | 主题结构化产物引擎：校验 topic analysis manifest 与 synthesis report 深度、组装主题 artifact 并应用章节补丁，是主题产物装配的契约入口。 |

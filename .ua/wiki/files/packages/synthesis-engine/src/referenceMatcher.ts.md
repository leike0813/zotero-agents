
# packages/synthesis-engine/src/referenceMatcher.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/referenceMatcher.ts -->

参考文献匹配引擎：从原始引文文本抽取标识符、归一化标题、聚类去重并按策略解析为 canonical reference，是引用图谱与引用分析的前置计算核心。
源码：[packages/synthesis-engine/src/referenceMatcher.ts](../../../../../../packages/synthesis-engine/src/referenceMatcher.ts)

## 符号（12）
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:buildReferenceMatcherIndex -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:chooseClusterRepresentative -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:connectedComponents -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:dedupeCanonicalReferencesClustered -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:evaluateReferenceResolutionFixture -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:extractReferenceIdentifiersFromText -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:normalizedTitle -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:normalizeReferenceIdentifier -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:resolveReferenceWithPolicy -->
<!-- node: class:packages/synthesis-engine/src/referenceMatcher.ts:SynthesisReferenceMatcherContractError -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:titleSimilarity -->
<!-- node: function:packages/synthesis-engine/src/referenceMatcher.ts:titleVariants -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildReferenceMatcherIndex | 函数 | 2549–2609 | 中等 | engine、index、reference-matching | 0 | 构建引用匹配索引：抽取标识符、生成标题变体与候选对，产出可供查询的结构化索引。 |
| chooseClusterRepresentative | 函数 | 1289–1316 | 简单 | clustering、deduplication、canonical | 0 | 按代表排序规则从簇内选出 canonical 代表文献，并生成需人工复核的 retarget 候选。 |
| connectedComponents | 函数 | 1686–1731 | 简单 | clustering、graph、deduplication | 0 | 在去重候选边上求连通分量，形成潜在重复文献簇。 |
| dedupeCanonicalReferencesClustered | 函数 | 1824–2471 | 复杂 | deduplication、clustering、engine | 0 | 对全部参考文献执行聚类去重，产出 canonical 记录与簇间去重边。 |
| evaluateReferenceResolutionFixture | 函数 | 2972–3076 | 中等 | evaluation、fixture、testing | 0 | 在 fixture 上批量评估解析结果，输出匹配率与失败样本。 |
| extractReferenceIdentifiersFromText | 函数 | 383–400 | 简单 | parsing、identifier、extraction | 0 | 从引文原始文本中抽取 DOI、arXiv、ISBN 等强标识符，并标记已知噪声信号。 |
| normalizedTitle | 函数 | 454–467 | 简单 | normalization、title、similarity | 0 | 归一化标题文本：去重音、折叠空白、统一标点，作为标题相似度比较的基础。 |
| normalizeReferenceIdentifier | 函数 | 329–351 | 简单 | normalization、identifier、reference-matching | 0 | 归一化单一参考文献标识符（DOI、arXiv、ISBN 等）并按类型排序去重。 |
| resolveReferenceWithPolicy | 函数 | 2845–2960 | 中等 | engine、resolution、policy | 0 | 按给定匹配策略解析单条引文到 canonical reference，返回解析证据与置信来源。 |
| SynthesisReferenceMatcherContractError | 类 | 3174–3181 | 简单 | error-type、contract、reference-matching | 0 | 引用匹配契约错误类型，承载标识符、标题变体与策略配置的失败原因。 |
| titleSimilarity | 函数 | 618–650 | 简单 | similarity、scoring、title | 0 | 结合 token Dice 与噪声惩罚计算标题相似度，输出 0..1 的可比分数。 |
| titleVariants | 函数 | 524–558 | 简单 | title、variants、similarity | 0 | 由归一化标题生成书目标题后缀变体集合，用于容忍截断与副标题差异。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [cli.ts](../../../tools/synthesis-index-harness/cli.ts.md) | tools/synthesis-index-harness/cli.ts | Synthesis 索引 Harness 命令行工具：只读提取 Zotero 库与插件调试数据库条目，构建 canonical reference 聚类输入并跑引用匹配，结果写入调试库，同时提供只读 HTTP 查询服务。 |
| [referenceMatchingReviewApplication.ts](../../synthesis-application/src/referenceMatchingReviewApplication.ts.md) | packages/synthesis-application/src/referenceMatchingReviewApplication.ts | 参考文献匹配审阅应用层：驱动 reference matcher 引擎产出绑定/去重提案，维护提案状态机（待审、已接受、已丢弃），并把用户决策投影为 mutation 结果。 |
| [referenceProjection.ts](../../synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildReferenceMatcherIndex | 函数 | 2549–2609 | 构建引用匹配索引：抽取标识符、生成标题变体与候选对，产出可供查询的结构化索引。 |
| dedupeCanonicalReferencesClustered | 函数 | 1824–2471 | 对全部参考文献执行聚类去重，产出 canonical 记录与簇间去重边。 |
| evaluateReferenceResolutionFixture | 函数 | 2972–3076 | 在 fixture 上批量评估解析结果，输出匹配率与失败样本。 |
| extractReferenceIdentifiersFromText | 函数 | 383–400 | 从引文原始文本中抽取 DOI、arXiv、ISBN 等强标识符，并标记已知噪声信号。 |
| normalizeReferenceIdentifier | 函数 | 329–351 | 归一化单一参考文献标识符（DOI、arXiv、ISBN 等）并按类型排序去重。 |
| resolveReferenceWithPolicy | 函数 | 2845–2960 | 按给定匹配策略解析单条引文到 canonical reference，返回解析证据与置信来源。 |
| SynthesisReferenceMatcherContractError | 类 | 3174–3181 | 引用匹配契约错误类型，承载标识符、标题变体与策略配置的失败原因。 |


# packages/synthesis-engine/src
> 目录聚合页：9 个文件、92 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [packages/synthesis-engine/src/canonicalJson.ts](../../../files/packages/synthesis-engine/src/canonicalJson.ts.md) | 文件 | 0 | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [packages/synthesis-engine/src/citationGraphBuild.ts](../../../files/packages/synthesis-engine/src/citationGraphBuild.ts.md) | 文件 | 28 | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |
| [packages/synthesis-engine/src/citationGraphBuildTransfer.ts](../../../files/packages/synthesis-engine/src/citationGraphBuildTransfer.ts.md) | 文件 | 13 | 引用图谱构建的传输封装：分页 artifact 与 manifest 的构建与重建，供 engine 与 sidecar 之间搬运图谱页。 |
| [packages/synthesis-engine/src/conceptKbIndex.ts](../../../files/packages/synthesis-engine/src/conceptKbIndex.ts.md) | 文件 | 8 | Synthesis 概念知识库索引引擎：把概念、义项、别名、来源等 canonical 行编译为可 checkpoint 的索引与查询结果，并提供进程内引擎工厂。 |
| [packages/synthesis-engine/src/index.ts](../../../files/packages/synthesis-engine/src/index.ts.md) | 文件 | 8 | Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。 |
| [packages/synthesis-engine/src/referenceMatcher.ts](../../../files/packages/synthesis-engine/src/referenceMatcher.ts.md) | 文件 | 12 | 参考文献匹配引擎：从原始引文文本抽取标识符、归一化标题、聚类去重并按策略解析为 canonical reference，是引用图谱与引用分析的前置计算核心。 |
| [packages/synthesis-engine/src/tagVocabulary.ts](../../../files/packages/synthesis-engine/src/tagVocabulary.ts.md) | 文件 | 8 | 标签词表引擎：校验 canonical 标签、别名与缩写并计算标签索引结果，输出可被引用与主题图谱消费的词表事实。 |
| [packages/synthesis-engine/src/topicGraphIndex.ts](../../../files/packages/synthesis-engine/src/topicGraphIndex.ts.md) | 文件 | 5 | 主题关系图索引引擎：把主题节点与边编译为有界索引结果，支持分批 checkpoint，控制节点数、边数与字符串长度上限。 |
| [packages/synthesis-engine/src/topicStructuredArtifact.ts](../../../files/packages/synthesis-engine/src/topicStructuredArtifact.ts.md) | 文件 | 10 | 主题结构化产物引擎：校验 topic analysis manifest 与 synthesis report 深度、组装主题 artifact 并应用章节补丁，是主题产物装配的契约入口。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../synthesis-contracts/src.md) | 6 |

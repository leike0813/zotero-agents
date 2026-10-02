
# packages/synthesis-repository/src
> 目录聚合页：10 个文件、50 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [packages/synthesis-repository/src/citationGraph.ts](../../../files/packages/synthesis-repository/src/citationGraph.ts.md) | 文件 | 6 | 引用图谱持久化仓储：定义节点、边、来源归属、incoming group、light/complex metrics 与 layout 行的 canonical 重建与 upsert，并负责图谱状态整体替换与索引提升。 |
| [packages/synthesis-repository/src/conceptKb.ts](../../../files/packages/synthesis-repository/src/conceptKb.ts.md) | 文件 | 4 | 概念知识库持久化仓储：维护概念、义项、别名、关系、审阅项与主题-概念链接表，并支持概念状态整体替换与索引提升。 |
| [packages/synthesis-repository/src/durableBundle.ts](../../../files/packages/synthesis-repository/src/durableBundle.ts.md) | 文件 | 1 | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [packages/synthesis-repository/src/durableBundleImport.ts](../../../files/packages/synthesis-repository/src/durableBundleImport.ts.md) | 文件 | 5 | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [packages/synthesis-repository/src/index.ts](../../../files/packages/synthesis-repository/src/index.ts.md) | 文件 | 12 | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [packages/synthesis-repository/src/knowledgeCheckpoint.ts](../../../files/packages/synthesis-repository/src/knowledgeCheckpoint.ts.md) | 文件 | 2 | 知识检查点仓储：捕获并整体替换各领域（概念、标签、主题图谱）的 active basis 集合，用于判断索引是否需要重建。 |
| [packages/synthesis-repository/src/referenceMatchingReview.ts](../../../files/packages/synthesis-repository/src/referenceMatchingReview.ts.md) | 文件 | 6 | 引用匹配审阅仓储：持久化匹配提案、匹配状态与 preparation 阶段结果，提供分页查询、状态流转与已拒绝提案判定。 |
| [packages/synthesis-repository/src/referenceRefresh.ts](../../../files/packages/synthesis-repository/src/referenceRefresh.ts.md) | 文件 | 4 | 引用刷新仓储：维护 raw/canonical reference、artifact、source 与 binding 行的 canonical 重建，并支持按来源删除与整体投影替换。 |
| [packages/synthesis-repository/src/tagVocabulary.ts](../../../files/packages/synthesis-repository/src/tagVocabulary.ts.md) | 文件 | 6 | 标签词表持久化仓储：维护词条、别名、缩写、协议、告警、staged suggestion、审计与 effect 行，支持词表状态替换与索引提升。 |
| [packages/synthesis-repository/src/topicGraph.ts](../../../files/packages/synthesis-repository/src/topicGraph.ts.md) | 文件 | 4 | 主题关系图持久化仓储：维护应用状态、图节点、图边与审阅项表，提供状态整体替换和索引提升。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../synthesis-contracts/src.md) | 4 |

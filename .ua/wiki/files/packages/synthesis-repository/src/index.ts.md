
# packages/synthesis-repository/src/index.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/index.ts -->

Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。
源码：[packages/synthesis-repository/src/index.ts](../../../../../../packages/synthesis-repository/src/index.ts)

## 符号（12）
<!-- node: function:packages/synthesis-repository/src/index.ts:commitSynthesisCitationGraphPromotion -->
<!-- node: function:packages/synthesis-repository/src/index.ts:createSynthesisRepositoryFoundationStore -->
<!-- node: function:packages/synthesis-repository/src/index.ts:ensureSynthesisRepositoryFoundationSchema -->
<!-- node: function:packages/synthesis-repository/src/index.ts:ensureSynthesisTopicApplicationRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/index.ts:listSynthesisOperations -->
<!-- node: function:packages/synthesis-repository/src/index.ts:purgeSynthesisDeletedTopicArtifacts -->
<!-- node: function:packages/synthesis-repository/src/index.ts:rebuildSynthesisCacheBasisRow -->
<!-- node: function:packages/synthesis-repository/src/index.ts:rebuildSynthesisOperationStatus -->
<!-- node: function:packages/synthesis-repository/src/index.ts:softDeleteSynthesisTopicApplicationState -->
<!-- node: function:packages/synthesis-repository/src/index.ts:updateSynthesisOperationStatus -->
<!-- node: function:packages/synthesis-repository/src/index.ts:upsertSynthesisOperation -->
<!-- node: function:packages/synthesis-repository/src/index.ts:upsertSynthesisTopicApplicationState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| commitSynthesisCitationGraphPromotion | 函数 | 846–896 | 中等 | transaction、citation-graph、promotion | 0 | 在单个事务内提交引用图谱索引提升与 operation 终态。 |
| createSynthesisRepositoryFoundationStore | 函数 | 1188–1723 | 复杂 | factory、repository、bootstrap | 0 | 创建仓储基础 store 工厂，绑定连接、schema 初始化与共享类型出口。 |
| ensureSynthesisRepositoryFoundationSchema | 函数 | 382–487 | 中等 | schema、migration、sqlite | 0 | 建立仓储基础 schema：operation、cache basis 与元数据表及其索引。 |
| ensureSynthesisTopicApplicationRepositorySchema | 函数 | 489–550 | 中等 | schema、migration、topic | 0 | 建立主题 application state、projection 与已删除产物墓碑表。 |
| listSynthesisOperations | 函数 | 898–952 | 中等 | query、persistence、operation | 0 | 按状态、类型与时间窗分页查询 operation 记录。 |
| purgeSynthesisDeletedTopicArtifacts | 函数 | 1161–1182 | 简单 | persistence、cleanup、topic | 0 | 清理已过保留期的已删除主题产物墓碑行。 |
| rebuildSynthesisCacheBasisRow | 函数 | 321–345 | 简单 | contract、rebuild、cache-basis | 0 | 重建 cache basis 行，规范化领域键、basis 哈希与更新时刻。 |
| rebuildSynthesisOperationStatus | 函数 | 286–299 | 简单 | contract、validation、operation | 0 | 重建 operation 状态枚举值，拒绝未知状态字符串。 |
| softDeleteSynthesisTopicApplicationState | 函数 | 1107–1159 | 中等 | persistence、topic、soft-delete | 0 | 对主题 application state 执行软删除，保留墓碑以支持恢复与审计。 |
| updateSynthesisOperationStatus | 函数 | 816–844 | 简单 | persistence、state-machine、operation | 0 | 以 compare-and-set 语义推进 operation 状态，仅允许合法状态迁移。 |
| upsertSynthesisOperation | 函数 | 756–804 | 简单 | persistence、operation、upsert | 0 | 写入或更新一条 operation 记录，承载公共维护与图谱操作的执行身份。 |
| upsertSynthesisTopicApplicationState | 函数 | 987–1029 | 简单 | persistence、topic、state | 0 | 写入主题 application state 行，维护当前生效主题的身份与快照哈希。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraph.ts](citationGraph.ts.md) | packages/synthesis-repository/src/citationGraph.ts | 引用图谱持久化仓储：定义节点、边、来源归属、incoming group、light/complex metrics 与 layout 行的 canonical 重建与 upsert，并负责图谱状态整体替换与索引提升。 |
| [conceptKb.ts](conceptKb.ts.md) | packages/synthesis-repository/src/conceptKb.ts | 概念知识库持久化仓储：维护概念、义项、别名、关系、审阅项与主题-概念链接表，并支持概念状态整体替换与索引提升。 |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-repository/src/durableBundle.ts | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [durableBundleImport.ts](durableBundleImport.ts.md) | packages/synthesis-repository/src/durableBundleImport.ts | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [knowledgeCheckpoint.ts](knowledgeCheckpoint.ts.md) | packages/synthesis-repository/src/knowledgeCheckpoint.ts | 知识检查点仓储：捕获并整体替换各领域（概念、标签、主题图谱）的 active basis 集合，用于判断索引是否需要重建。 |
| [referenceMatchingReview.ts](referenceMatchingReview.ts.md) | packages/synthesis-repository/src/referenceMatchingReview.ts | 引用匹配审阅仓储：持久化匹配提案、匹配状态与 preparation 阶段结果，提供分页查询、状态流转与已拒绝提案判定。 |
| [referenceRefresh.ts](referenceRefresh.ts.md) | packages/synthesis-repository/src/referenceRefresh.ts | 引用刷新仓储：维护 raw/canonical reference、artifact、source 与 binding 行的 canonical 重建，并支持按来源删除与整体投影替换。 |
| [schemaVersion.ts](../../synthesis-contracts/src/schemaVersion.ts.md) | packages/synthesis-contracts/src/schemaVersion.ts | 只导出 repository foundation schema 版本常量的单行版本锚点，供仓库与合约两侧对齐迁移版本。 |
| [tagVocabulary.ts](tagVocabulary.ts.md) | packages/synthesis-repository/src/tagVocabulary.ts | 标签词表持久化仓储：维护词条、别名、缩写、协议、告警、staged suggestion、审计与 effect 行，支持词表状态替换与索引提升。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-repository/src/topicGraph.ts | 主题关系图持久化仓储：维护应用状态、图节点、图边与审阅项表，提供状态整体替换和索引提升。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraph.ts](citationGraph.ts.md) | packages/synthesis-repository/src/citationGraph.ts | 引用图谱持久化仓储：定义节点、边、来源归属、incoming group、light/complex metrics 与 layout 行的 canonical 重建与 upsert，并负责图谱状态整体替换与索引提升。 |
| [citationGraphApplication.ts](../../synthesis-application/src/citationGraphApplication.ts.md) | packages/synthesis-application/src/citationGraphApplication.ts | 引用图谱（Citation Graph）应用层唯一 owner：把宿主读取事实、图构建引擎、指标/布局引擎与 repository 记录编排成 slice/metrics/layout/rebuild 四类读取与变更视图，并负责私有 rebuild attempt 的生命周期收敛。 |
| [conceptKb.ts](conceptKb.ts.md) | packages/synthesis-repository/src/conceptKb.ts | 概念知识库持久化仓储：维护概念、义项、别名、关系、审阅项与主题-概念链接表，并支持概念状态整体替换与索引提升。 |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-repository/src/durableBundle.ts | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [durableBundleImport.ts](durableBundleImport.ts.md) | packages/synthesis-repository/src/durableBundleImport.ts | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [index.ts](../../synthesis-application/src/index.ts.md) | packages/synthesis-application/src/index.ts | synthesis-application 包的 barrel 入口：重导出全部应用层模块，并额外实现 Workbench 运行期 chrome 读取（运行中/失败作业与缓存描述符）。 |
| [knowledgeCheckpoint.ts](knowledgeCheckpoint.ts.md) | packages/synthesis-repository/src/knowledgeCheckpoint.ts | 知识检查点仓储：捕获并整体替换各领域（概念、标签、主题图谱）的 active basis 集合，用于判断索引是否需要重建。 |
| [referenceMatchingReview.ts](referenceMatchingReview.ts.md) | packages/synthesis-repository/src/referenceMatchingReview.ts | 引用匹配审阅仓储：持久化匹配提案、匹配状态与 preparation 阶段结果，提供分页查询、状态流转与已拒绝提案判定。 |
| [referenceRefresh.ts](referenceRefresh.ts.md) | packages/synthesis-repository/src/referenceRefresh.ts | 引用刷新仓储：维护 raw/canonical reference、artifact、source 与 binding 行的 canonical 重建，并支持按来源删除与整体投影替换。 |
| [referenceRefreshApplication.ts](../../synthesis-application/src/referenceRefreshApplication.ts.md) | packages/synthesis-application/src/referenceRefreshApplication.ts | 参考文献刷新应用层：按 source 描述符判定增量或全量刷新计划，合并新旧 source/artifact/raw reference 行，并以 basis 哈希守卫 repository 投影替换。 |
| [sqliteReadonly.ts](../../../src/modules/harness/sqliteReadonly.ts.md) | src/modules/harness/sqliteReadonly.ts | Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。 |
| [tagVocabulary.ts](tagVocabulary.ts.md) | packages/synthesis-repository/src/tagVocabulary.ts | 标签词表持久化仓储：维护词条、别名、缩写、协议、告警、staged suggestion、审计与 effect 行，支持词表状态替换与索引提升。 |
| [topicApplication.ts](../../synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-repository/src/topicGraph.ts | 主题关系图持久化仓储：维护应用状态、图节点、图边与审阅项表，提供状态整体替换和索引提升。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| commitSynthesisCitationGraphPromotion | 函数 | 846–896 | 在单个事务内提交引用图谱索引提升与 operation 终态。 |
| createSynthesisRepositoryFoundationStore | 函数 | 1188–1723 | 创建仓储基础 store 工厂，绑定连接、schema 初始化与共享类型出口。 |
| ensureSynthesisRepositoryFoundationSchema | 函数 | 382–487 | 建立仓储基础 schema：operation、cache basis 与元数据表及其索引。 |
| ensureSynthesisTopicApplicationRepositorySchema | 函数 | 489–550 | 建立主题 application state、projection 与已删除产物墓碑表。 |
| listSynthesisOperations | 函数 | 898–952 | 按状态、类型与时间窗分页查询 operation 记录。 |
| purgeSynthesisDeletedTopicArtifacts | 函数 | 1161–1182 | 清理已过保留期的已删除主题产物墓碑行。 |
| rebuildSynthesisCacheBasisRow | 函数 | 321–345 | 重建 cache basis 行，规范化领域键、basis 哈希与更新时刻。 |
| rebuildSynthesisOperationStatus | 函数 | 286–299 | 重建 operation 状态枚举值，拒绝未知状态字符串。 |
| softDeleteSynthesisTopicApplicationState | 函数 | 1107–1159 | 对主题 application state 执行软删除，保留墓碑以支持恢复与审计。 |
| updateSynthesisOperationStatus | 函数 | 816–844 | 以 compare-and-set 语义推进 operation 状态，仅允许合法状态迁移。 |
| upsertSynthesisOperation | 函数 | 756–804 | 写入或更新一条 operation 记录，承载公共维护与图谱操作的执行身份。 |
| upsertSynthesisTopicApplicationState | 函数 | 987–1029 | 写入主题 application state 行，维护当前生效主题的身份与快照哈希。 |

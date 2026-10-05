
# packages/synthesis-repository/src/conceptKb.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/conceptKb.ts -->

概念知识库持久化仓储：维护概念、义项、别名、关系、审阅项与主题-概念链接表，并支持概念状态整体替换与索引提升。
源码：[packages/synthesis-repository/src/conceptKb.ts](../../../../../../packages/synthesis-repository/src/conceptKb.ts)

## 符号（4）
<!-- node: function:packages/synthesis-repository/src/conceptKb.ts:ensureSynthesisConceptKbApplicationRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/conceptKb.ts:promoteSynthesisConceptKbIndex -->
<!-- node: function:packages/synthesis-repository/src/conceptKb.ts:rebuildSynthesisConceptApplicationStateRow -->
<!-- node: function:packages/synthesis-repository/src/conceptKb.ts:replaceSynthesisConceptKbState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureSynthesisConceptKbApplicationRepositorySchema | 函数 | 314–375 | 中等 | schema、migration、sqlite | 0 | 确保概念知识库仓储 schema 存在并覆盖全部概念相关表。 |
| promoteSynthesisConceptKbIndex | 函数 | 654–681 | 简单 | persistence、index、promotion | 0 | 提升概念知识库索引为已发布状态，使新的索引结果可被查询。 |
| rebuildSynthesisConceptApplicationStateRow | 函数 | 169–185 | 简单 | contract、rebuild、concept-kb | 0 | 重建概念知识库 application state 行，规范化快照哈希与统计字段。 |
| replaceSynthesisConceptKbState | 函数 | 614–652 | 简单 | transaction、persistence、concept-kb | 0 | 在单个写事务内替换概念、义项、别名、关系、审阅与主题链接行。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKbApplication.ts](../../synthesis-application/src/conceptKbApplication.ts.md) | packages/synthesis-application/src/conceptKbApplication.ts | 概念知识库（Concept KB）应用层：管理概念、义项、别名、关系与审阅项的快照读写，接收 topic synthesis 产出的概念卡片 proposal 并用 token 重叠做合并。 |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-repository/src/durableBundle.ts | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [durableBundleImport.ts](durableBundleImport.ts.md) | packages/synthesis-repository/src/durableBundleImport.ts | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [knowledgeCheckpoint.ts](knowledgeCheckpoint.ts.md) | packages/synthesis-repository/src/knowledgeCheckpoint.ts | 知识检查点仓储：捕获并整体替换各领域（概念、标签、主题图谱）的 active basis 集合，用于判断索引是否需要重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureSynthesisConceptKbApplicationRepositorySchema | 函数 | 314–375 | 确保概念知识库仓储 schema 存在并覆盖全部概念相关表。 |
| promoteSynthesisConceptKbIndex | 函数 | 654–681 | 提升概念知识库索引为已发布状态，使新的索引结果可被查询。 |
| rebuildSynthesisConceptApplicationStateRow | 函数 | 169–185 | 重建概念知识库 application state 行，规范化快照哈希与统计字段。 |
| replaceSynthesisConceptKbState | 函数 | 614–652 | 在单个写事务内替换概念、义项、别名、关系、审阅与主题链接行。 |

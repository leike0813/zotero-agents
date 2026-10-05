
# packages/synthesis-repository/src/citationGraph.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/citationGraph.ts -->

引用图谱持久化仓储：定义节点、边、来源归属、incoming group、light/complex metrics 与 layout 行的 canonical 重建与 upsert，并负责图谱状态整体替换与索引提升。
源码：[packages/synthesis-repository/src/citationGraph.ts](../../../../../../packages/synthesis-repository/src/citationGraph.ts)

## 符号（6）
<!-- node: function:packages/synthesis-repository/src/citationGraph.ts:ensureSynthesisCitationGraphApplicationRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/citationGraph.ts:promoteSynthesisCitationGraphComplexMetrics -->
<!-- node: function:packages/synthesis-repository/src/citationGraph.ts:promoteSynthesisCitationGraphLayout -->
<!-- node: function:packages/synthesis-repository/src/citationGraph.ts:rebuildSynthesisCitationGraphApplicationStateRow -->
<!-- node: function:packages/synthesis-repository/src/citationGraph.ts:replaceSynthesisCitationGraphApplicationState -->
<!-- node: function:packages/synthesis-repository/src/citationGraph.ts:replaceSynthesisCitationGraphRows -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureSynthesisCitationGraphApplicationRepositorySchema | 函数 | 422–453 | 简单 | schema、migration、sqlite | 0 | 确保引用图谱 projection 与 application 仓储 schema 存在且与当前版本一致。 |
| promoteSynthesisCitationGraphComplexMetrics | 函数 | 715–743 | 简单 | persistence、metrics、promotion | 0 | 将暂存的复杂指标行提升为已发布事实。 |
| promoteSynthesisCitationGraphLayout | 函数 | 745–766 | 简单 | persistence、layout、promotion | 0 | 将暂存的布局行提升为已发布事实，供 workbench 渲染消费。 |
| rebuildSynthesisCitationGraphApplicationStateRow | 函数 | 318–334 | 简单 | contract、rebuild、citation-graph | 0 | 重建引用图谱 application state 行，规范化图谱身份、模式版本与统计字段。 |
| replaceSynthesisCitationGraphApplicationState | 函数 | 653–683 | 简单 | persistence、state、citation-graph | 0 | 整体替换引用图谱 application state 行，保持与 projection 的一致提交。 |
| replaceSynthesisCitationGraphRows | 函数 | 685–713 | 简单 | transaction、persistence、citation-graph | 0 | 在单个写事务内整体替换引用图谱的节点、边、来源归属与指标行。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphProjection.ts](../../synthesis-application/src/citationGraphProjection.ts.md) | packages/synthesis-application/src/citationGraphProjection.ts | 引用图谱 repository 记录与契约 DTO 之间的纯投影层：把节点、边、来源归属、light metrics 行映射为可校验的应用视图，并提供基于 canonical JSON 的行哈希。 |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureSynthesisCitationGraphApplicationRepositorySchema | 函数 | 422–453 | 确保引用图谱 projection 与 application 仓储 schema 存在且与当前版本一致。 |
| promoteSynthesisCitationGraphComplexMetrics | 函数 | 715–743 | 将暂存的复杂指标行提升为已发布事实。 |
| promoteSynthesisCitationGraphLayout | 函数 | 745–766 | 将暂存的布局行提升为已发布事实，供 workbench 渲染消费。 |
| rebuildSynthesisCitationGraphApplicationStateRow | 函数 | 318–334 | 重建引用图谱 application state 行，规范化图谱身份、模式版本与统计字段。 |
| replaceSynthesisCitationGraphApplicationState | 函数 | 653–683 | 整体替换引用图谱 application state 行，保持与 projection 的一致提交。 |
| replaceSynthesisCitationGraphRows | 函数 | 685–713 | 在单个写事务内整体替换引用图谱的节点、边、来源归属与指标行。 |

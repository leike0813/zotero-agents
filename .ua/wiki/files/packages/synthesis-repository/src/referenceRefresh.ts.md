
# packages/synthesis-repository/src/referenceRefresh.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-repository/src](../../../../modules/packages/synthesis-repository/src.md)
<!-- node: file:packages/synthesis-repository/src/referenceRefresh.ts -->

引用刷新仓储：维护 raw/canonical reference、artifact、source 与 binding 行的 canonical 重建，并支持按来源删除与整体投影替换。
源码：[packages/synthesis-repository/src/referenceRefresh.ts](../../../../../../packages/synthesis-repository/src/referenceRefresh.ts)

## 符号（4）
<!-- node: function:packages/synthesis-repository/src/referenceRefresh.ts:ensureSynthesisReferenceRefreshRepositorySchema -->
<!-- node: function:packages/synthesis-repository/src/referenceRefresh.ts:listSynthesisReferenceArtifacts -->
<!-- node: function:packages/synthesis-repository/src/referenceRefresh.ts:rebuildSynthesisReferenceApplicationStateRow -->
<!-- node: function:packages/synthesis-repository/src/referenceRefresh.ts:replaceSynthesisReferenceProjection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureSynthesisReferenceRefreshRepositorySchema | 函数 | 314–439 | 中等 | schema、migration、sqlite | 0 | 确保引用刷新 schema 存在，覆盖 raw/canonical/artifact/binding 各类表。 |
| listSynthesisReferenceArtifacts | 函数 | 454–470 | 简单 | query、persistence、reference | 0 | 按来源与状态查询引用产物行，供刷新与复核使用。 |
| rebuildSynthesisReferenceApplicationStateRow | 函数 | 184–199 | 简单 | contract、rebuild、reference | 0 | 重建引用刷新 application state 行，规范化刷新 basis 与统计。 |
| replaceSynthesisReferenceProjection | 函数 | 525–774 | 复杂 | transaction、persistence、projection | 0 | 在事务内整体替换引用 projection 行，避免出现半更新状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-repository/src/durableBundle.ts | Durable bundle 仓储：把仓储层的引用、审阅、主题 basis 与草稿事实投影为可导出的 durable bundle 仓储状态。 |
| [durableBundleImport.ts](durableBundleImport.ts.md) | packages/synthesis-repository/src/durableBundleImport.ts | Durable bundle 导入仓储：按 sync index 与 commit receipt 校验导入事实，逐条 upsert 领域对象并更新各领域 basis，完成 durable 状态导入。 |
| [index.ts](index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [referenceProjection.ts](../../synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [referenceRefreshApplication.ts](../../synthesis-application/src/referenceRefreshApplication.ts.md) | packages/synthesis-application/src/referenceRefreshApplication.ts | 参考文献刷新应用层：按 source 描述符判定增量或全量刷新计划，合并新旧 source/artifact/raw reference 行，并以 basis 哈希守卫 repository 投影替换。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureSynthesisReferenceRefreshRepositorySchema | 函数 | 314–439 | 确保引用刷新 schema 存在，覆盖 raw/canonical/artifact/binding 各类表。 |
| listSynthesisReferenceArtifacts | 函数 | 454–470 | 按来源与状态查询引用产物行，供刷新与复核使用。 |
| rebuildSynthesisReferenceApplicationStateRow | 函数 | 184–199 | 重建引用刷新 application state 行，规范化刷新 basis 与统计。 |
| replaceSynthesisReferenceProjection | 函数 | 525–774 | 在事务内整体替换引用 projection 行，避免出现半更新状态。 |

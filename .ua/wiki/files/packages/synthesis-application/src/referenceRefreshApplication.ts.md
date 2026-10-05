
# packages/synthesis-application/src/referenceRefreshApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/referenceRefreshApplication.ts -->

参考文献刷新应用层：按 source 描述符判定增量或全量刷新计划，合并新旧 source/artifact/raw reference 行，并以 basis 哈希守卫 repository 投影替换。
源码：[packages/synthesis-application/src/referenceRefreshApplication.ts](../../../../../../packages/synthesis-application/src/referenceRefreshApplication.ts)

## 符号（3）
<!-- node: function:packages/synthesis-application/src/referenceRefreshApplication.ts:createSynthesisReferenceRefreshApplication -->
<!-- node: function:packages/synthesis-application/src/referenceRefreshApplication.ts:mergeByKey -->
<!-- node: function:packages/synthesis-application/src/referenceRefreshApplication.ts:sourceRecord -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisReferenceRefreshApplication | 函数 | 182–748 | 复杂 | 工厂函数、参考文献、刷新、核心、命令集合 | 0 | 参考文献刷新应用工厂：提供 prepare、page、apply 与 inspect 命令，比较 source 描述符决定刷新范围并以输入哈希守卫投影替换。 |
| mergeByKey | 函数 | 163–176 | 简单 | 合并、去重、参考文献 | 1 | 按业务键合并多来源的行集合，新键追加、已有键以更新值覆盖并保持稳定顺序。 |
| sourceRecord | 函数 | 117–145 | 中等 | 来源记录、参考文献、组装 | 0 | 由 artifact 描述信息构建 source 记录，计算来源哈希并抽取该来源可贡献的原始引用条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [index.ts](../../synthesis-repository/src/index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |
| [referenceProjection.ts](referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [referenceRefresh.ts](../../synthesis-repository/src/referenceRefresh.ts.md) | packages/synthesis-repository/src/referenceRefresh.ts | 引用刷新仓储：维护 raw/canonical reference、artifact、source 与 binding 行的 canonical 重建，并支持按来源删除与整体投影替换。 |
| [referenceRefreshApplication.ts](../../synthesis-contracts/src/referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts | 参考文献刷新应用契约：prepare/apply/page 请求，以及条目、描述符与文献质量快照的严格重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisReferenceRefreshApplication | 函数 | 182–748 | 参考文献刷新应用工厂：提供 prepare、page、apply 与 inspect 命令，比较 source 描述符决定刷新范围并以输入哈希守卫投影替换。 |

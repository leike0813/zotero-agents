
# packages/synthesis-application/src/citationGraphProjection.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/citationGraphProjection.ts -->

引用图谱 repository 记录与契约 DTO 之间的纯投影层：把节点、边、来源归属、light metrics 行映射为可校验的应用视图，并提供基于 canonical JSON 的行哈希。
源码：[packages/synthesis-application/src/citationGraphProjection.ts](../../../../../../packages/synthesis-application/src/citationGraphProjection.ts)

## 符号（4）
<!-- node: function:packages/synthesis-application/src/citationGraphProjection.ts:hashSynthesisCitationGraphRows -->
<!-- node: function:packages/synthesis-application/src/citationGraphProjection.ts:hashSynthesisCitationLightMetricsRows -->
<!-- node: function:packages/synthesis-application/src/citationGraphProjection.ts:projectSynthesisCitationGraphBuildRecords -->
<!-- node: function:packages/synthesis-application/src/citationGraphProjection.ts:projectSynthesisCitationGraphDefaultRecords -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| hashSynthesisCitationGraphRows | 函数 | 17–43 | 中等 | hash、canonical-json、basis、引用图谱 | 0 | 对节点、边与 light metrics 行取 canonical JSON 哈希，作为引用图谱 basis 身份。 |
| hashSynthesisCitationLightMetricsRows | 函数 | 45–62 | 简单 | hash、指标、canonical-json | 0 | 单独对 light metrics 行计算 canonical 哈希，使指标刷新可以在图未变的条件下独立判定。 |
| projectSynthesisCitationGraphBuildRecords | 函数 | 144–263 | 复杂 | 投影、引用图谱、构建结果、有界 | 0 | 将图构建引擎结果投影为 node/edge/ownership/incoming-group/light-metrics 等 repository 行集合，按 kind 分类并施加规模上限。 |
| projectSynthesisCitationGraphDefaultRecords | 函数 | 98–142 | 中等 | 投影、默认状态、引用图谱 | 0 | 在没有构建结果时生成引用图谱的默认行集合（空图状态与初始坐标），供首次加载或重置后使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [citationGraph.ts](../../synthesis-repository/src/citationGraph.ts.md) | packages/synthesis-repository/src/citationGraph.ts | 引用图谱持久化仓储：定义节点、边、来源归属、incoming group、light/complex metrics 与 layout 行的 canonical 重建与 upsert，并负责图谱状态整体替换与索引提升。 |
| [citationGraphBuild.ts](../../synthesis-engine/src/citationGraphBuild.ts.md) | packages/synthesis-engine/src/citationGraphBuild.ts | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphApplication.ts](citationGraphApplication.ts.md) | packages/synthesis-application/src/citationGraphApplication.ts | 引用图谱（Citation Graph）应用层唯一 owner：把宿主读取事实、图构建引擎、指标/布局引擎与 repository 记录编排成 slice/metrics/layout/rebuild 四类读取与变更视图，并负责私有 rebuild attempt 的生命周期收敛。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| hashSynthesisCitationGraphRows | 函数 | 17–43 | 对节点、边与 light metrics 行取 canonical JSON 哈希，作为引用图谱 basis 身份。 |
| hashSynthesisCitationLightMetricsRows | 函数 | 45–62 | 单独对 light metrics 行计算 canonical 哈希，使指标刷新可以在图未变的条件下独立判定。 |
| projectSynthesisCitationGraphBuildRecords | 函数 | 144–263 | 将图构建引擎结果投影为 node/edge/ownership/incoming-group/light-metrics 等 repository 行集合，按 kind 分类并施加规模上限。 |
| projectSynthesisCitationGraphDefaultRecords | 函数 | 98–142 | 在没有构建结果时生成引用图谱的默认行集合（空图状态与初始坐标），供首次加载或重置后使用。 |

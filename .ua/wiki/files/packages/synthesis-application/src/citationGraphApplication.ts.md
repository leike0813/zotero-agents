
# packages/synthesis-application/src/citationGraphApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/citationGraphApplication.ts -->

引用图谱（Citation Graph）应用层唯一 owner：把宿主读取事实、图构建引擎、指标/布局引擎与 repository 记录编排成 slice/metrics/layout/rebuild 四类读取与变更视图，并负责私有 rebuild attempt 的生命周期收敛。
源码：[packages/synthesis-application/src/citationGraphApplication.ts](../../../../../../packages/synthesis-application/src/citationGraphApplication.ts)

## 符号（6）
<!-- node: function:packages/synthesis-application/src/citationGraphApplication.ts:boundDefaultLayoutProjection -->
<!-- node: function:packages/synthesis-application/src/citationGraphApplication.ts:createSynthesisCitationGraphApplication -->
<!-- node: function:packages/synthesis-application/src/citationGraphApplication.ts:layoutSlice -->
<!-- node: function:packages/synthesis-application/src/citationGraphApplication.ts:metricRequest -->
<!-- node: function:packages/synthesis-application/src/citationGraphApplication.ts:projectMetricsRecords -->
<!-- node: function:packages/synthesis-application/src/citationGraphApplication.ts:projectSlice -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundDefaultLayoutProjection | 函数 | 785–809 | 简单 | 布局、默认投影、有界 | 0 | 为缺少已发布布局的图构造有界的默认坐标投影，保证窗口请求在缓存缺失时仍有可渲染结果。 |
| createSynthesisCitationGraphApplication | 函数 | 218–668 | 复杂 | 工厂函数、引用图谱、attempt-生命周期、编排、核心 | 0 | 引用图谱应用工厂：绑定 repository、构建/指标/布局引擎端口，提供 slice、metrics、layout 与 rebuild 四组命令，并用私有 graph attempt 收敛成功、失败、取消与 basis mismatch。 |
| layoutSlice | 函数 | 742–783 | 中等 | 布局、引用图谱、只读、缓存 | 0 | 读取引用图谱布局记录，按算法与窗口默认值裁剪坐标视图，缓存未就绪时回落到默认布局投影。 |
| metricRequest | 函数 | 135–157 | 简单 | 指标、请求构造、引用图谱 | 0 | 构造指标计算请求并按 preset 归一化 scope 与目标集合，交给 metrics 引擎执行。 |
| projectMetricsRecords | 函数 | 159–194 | 中等 | 投影、指标、引用图谱 | 0 | 把 repository 中的 complex metrics 行投影为契约 DTO，并按 sourceStructureVersion 过滤过期记录。 |
| projectSlice | 函数 | 670–740 | 中等 | 投影、引用图谱、分页、只读 | 0 | 按 scope 投影引用图谱切片：校验 basis、读取节点/边/来源归属分页并组装为 slice 视图，不持有 writer。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphApplication.ts](../../synthesis-contracts/src/citationGraphApplication.ts.md) | packages/synthesis-contracts/src/citationGraphApplication.ts | 引用图谱应用层合约：定义 slice/metrics/layout/rebuild/refresh-metrics 请求与 inspect、mutation 结果的判别式重建函数，施加统一的字段精确性与规模上限。 |
| [citationGraphBuild.ts](../../synthesis-engine/src/citationGraphBuild.ts.md) | packages/synthesis-engine/src/citationGraphBuild.ts | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |
| [citationGraphProjection.ts](citationGraphProjection.ts.md) | packages/synthesis-application/src/citationGraphProjection.ts | 引用图谱 repository 记录与契约 DTO 之间的纯投影层：把节点、边、来源归属、light metrics 行映射为可校验的应用视图，并提供基于 canonical JSON 的行哈希。 |
| [index.ts](../../synthesis-engine/src/index.ts.md) | packages/synthesis-engine/src/index.ts | Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。 |
| [index.ts](../../synthesis-repository/src/index.ts.md) | packages/synthesis-repository/src/index.ts | Synthesis 仓储基础层：建立 SQLite schema 基线，提供 operation 状态、cache basis、主题 application state/projection 与已删除产物墓碑的读写，并作为仓储模块的统一出口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisCitationGraphApplication | 函数 | 218–668 | 引用图谱应用工厂：绑定 repository、构建/指标/布局引擎端口，提供 slice、metrics、layout 与 rebuild 四组命令，并用私有 graph attempt 收敛成功、失败、取消与 basis mismatch。 |

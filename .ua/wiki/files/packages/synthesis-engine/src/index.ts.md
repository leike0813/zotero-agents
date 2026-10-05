
# packages/synthesis-engine/src/index.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/index.ts -->

Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。
源码：[packages/synthesis-engine/src/index.ts](../../../../../../packages/synthesis-engine/src/index.ts)

## 符号（8）
<!-- node: function:packages/synthesis-engine/src/index.ts:computeMetricsComponents -->
<!-- node: function:packages/synthesis-engine/src/index.ts:computeMetricsPagerank -->
<!-- node: function:packages/synthesis-engine/src/index.ts:computeSynthesisCitationGraphMetrics -->
<!-- node: function:packages/synthesis-engine/src/index.ts:rebuildSynthesisCitationGraphLayoutRequest -->
<!-- node: function:packages/synthesis-engine/src/index.ts:rebuildSynthesisCitationGraphLayoutResult -->
<!-- node: function:packages/synthesis-engine/src/index.ts:rebuildSynthesisCitationGraphMetricsRequest -->
<!-- node: function:packages/synthesis-engine/src/index.ts:rebuildSynthesisCitationGraphMetricsResult -->
<!-- node: class:packages/synthesis-engine/src/index.ts:SynthesisCitationGraphLayoutContractError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| computeMetricsComponents | 函数 | 1003–1055 | 中等 | algorithm、metrics、components | 0 | 计算引用图谱的连通分量与规模分布，作为复杂度指标的一部分。 |
| computeMetricsPagerank | 函数 | 934–1001 | 中等 | algorithm、metrics、pagerank | 0 | 以有界迭代计算引用图谱 PageRank，处理悬挂节点与收敛判定。 |
| computeSynthesisCitationGraphMetrics | 函数 | 1091–1270 | 中等 | engine、metrics、compute | 0 | 汇总 PageRank 与连通分量计算，产出完整的引用图谱指标结果。 |
| rebuildSynthesisCitationGraphLayoutRequest | 函数 | 264–351 | 中等 | contract、validation、layout | 1 | 校验并重建引用图谱布局请求，约束算法、迭代次数与节点规模上限。 |
| rebuildSynthesisCitationGraphLayoutResult | 函数 | 353–419 | 中等 | contract、validation、layout | 0 | 重建布局结果契约，校验节点坐标、边引用与布局身份字段。 |
| rebuildSynthesisCitationGraphMetricsRequest | 函数 | 539–642 | 中等 | contract、validation、metrics | 0 | 校验并重建引用图谱指标请求，限制指标类型与返回规模。 |
| rebuildSynthesisCitationGraphMetricsResult | 函数 | 700–914 | 复杂 | contract、validation、metrics | 0 | 重建引用图谱指标结果契约，校验逐节点指标数值有限且引用合法。 |
| SynthesisCitationGraphLayoutContractError | 类 | 73–80 | 简单 | error-type、contract、citation-graph | 0 | 引用图谱布局契约错误类型，用于在布局/指标请求非法时给出结构化失败。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraph.ts](../../../src/modules/synthesis/citationGraph.ts.md) | src/modules/synthesis/citationGraph.ts | Citation Graph 投影层：把文献与引用输入归一为稳定 reference key，去重合并 canonical paper 后调用 synthesis-engine 计算统一引用图谱。 |
| [citationGraphApplication.ts](../../synthesis-application/src/citationGraphApplication.ts.md) | packages/synthesis-application/src/citationGraphApplication.ts | 引用图谱（Citation Graph）应用层唯一 owner：把宿主读取事实、图构建引擎、指标/布局引擎与 repository 记录编排成 slice/metrics/layout/rebuild 四类读取与变更视图，并负责私有 rebuild attempt 的生命周期收敛。 |
| [smoke-synthesis-rust-sidecar-worker.ts](../../../scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts.md) | scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts | Rust sidecar worker 冒烟脚本：拉起 sidecar 的 worker 子进程，校验 provenance 指纹并对 worker 协议做一次 layout 请求往返。 |
| [synthesisSidecarComputeClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts | sidecar 计算客户端：把 citation graph 的 build / layout / metrics 三类重计算请求通过 worker capability 路由到 sidecar，统一施加各阶段 deadline 并归一化错误。 |
| [topicApplication.ts](../../synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| computeSynthesisCitationGraphMetrics | 函数 | 1091–1270 | 汇总 PageRank 与连通分量计算，产出完整的引用图谱指标结果。 |
| rebuildSynthesisCitationGraphLayoutRequest | 函数 | 264–351 | 校验并重建引用图谱布局请求，约束算法、迭代次数与节点规模上限。 |
| rebuildSynthesisCitationGraphLayoutResult | 函数 | 353–419 | 重建布局结果契约，校验节点坐标、边引用与布局身份字段。 |
| rebuildSynthesisCitationGraphMetricsRequest | 函数 | 539–642 | 校验并重建引用图谱指标请求，限制指标类型与返回规模。 |
| rebuildSynthesisCitationGraphMetricsResult | 函数 | 700–914 | 重建引用图谱指标结果契约，校验逐节点指标数值有限且引用合法。 |
| SynthesisCitationGraphLayoutContractError | 类 | 73–80 | 引用图谱布局契约错误类型，用于在布局/指标请求非法时给出结构化失败。 |

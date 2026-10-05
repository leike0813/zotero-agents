
# packages/synthesis-engine/src/citationGraphBuild.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/citationGraphBuild.ts -->

引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。
源码：[packages/synthesis-engine/src/citationGraphBuild.ts](../../../../../../packages/synthesis-engine/src/citationGraphBuild.ts)

## 符号（28）
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:aggregateSynthesisCitationGraphBuildEdges -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:assertJsonSafe -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:boundsWithDefaults -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:buildNode -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:canonicalizeResultValue -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:computeRebuiltSynthesisCitationGraphBuild -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:computeSynthesisCitationGraphBuild -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:createInProcessSynthesisCitationGraphBuildEngine -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:mergeNodeMetadata -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildAggregateEdge -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildBuildNode -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildLibraryNode -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildLightMetric -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildOwnership -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildReference -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildResolvedEdge -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildRoleEvidence -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildScope -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildSynthesisCitationGraphBuildDiagnostics -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildSynthesisCitationGraphBuildRequest -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:rebuildSynthesisCitationGraphBuildResult -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:requiredString -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:resultArrayKey -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:sameScope -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:selectPrimaryRole -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:stringList -->
<!-- node: class:packages/synthesis-engine/src/citationGraphBuild.ts:SynthesisCitationGraphBuildContractError -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuild.ts:targetKind -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| aggregateSynthesisCitationGraphBuildEdges | 函数 | 843–903 | 中等 | citation-graph、compute、aggregation | 0 | 把已解析边聚合为图谱边，去重、合并权重并裁剪到上限。 |
| assertJsonSafe | 函数 | 162–200 | 简单 | validation、serialization、guard | 0 | 断言 JSON 值可安全序列化，命中不安全结构即失败。 |
| boundsWithDefaults | 函数 | 303–320 | 简单 | citation-graph、validation、defaults | 0 | 按上下界收敛构建参数，缺省值由协议默认值补齐。 |
| buildNode | 函数 | 790–811 | 简单 | citation-graph、compute、construction | 0 | 构建单个图节点记录，合并已有元数据。 |
| canonicalizeResultValue | 函数 | 1122–1178 | 中等 | canonical-json、serialization、citation-graph | 0 | 把计算结果收敛为 canonical JSON 值，供哈希与传输复用。 |
| computeRebuiltSynthesisCitationGraphBuild | 函数 | 922–1087 | 中等 | citation-graph、compute、engine | 0 | 在重建后的输入上重新计算图谱，用于 basis 校验后的重放。 |
| computeSynthesisCitationGraphBuild | 函数 | 911–920 | 简单 | citation-graph、compute、engine | 0 | 执行图谱构建计算，产出节点、边、归属与指标页。 |
| createInProcessSynthesisCitationGraphBuildEngine | 函数 | 1457–1469 | 简单 | engine、factory、citation-graph | 0 | 创建进程内图谱构建引擎，绑定纯计算函数与契约错误类型。 |
| mergeNodeMetadata | 函数 | 767–788 | 简单 | citation-graph、compute、merge | 0 | 合并重复节点的元数据，按确定性规则取舍冲突字段。 |
| rebuildAggregateEdge | 函数 | 507–547 | 简单 | contract、rebuild、citation-graph | 0 | 重建聚合边行，含成员集合、权重与角色证据。 |
| rebuildBuildNode | 函数 | 440–463 | 简单 | contract、rebuild、citation-graph | 0 | 重建图谱构建节点行，含目标类型、角色与权重。 |
| rebuildLibraryNode | 函数 | 336–358 | 简单 | contract、rebuild、citation-graph | 0 | 重建库节点行，含库键、标识与去重统计。 |
| rebuildLightMetric | 函数 | 578–614 | 简单 | contract、rebuild、metrics | 0 | 重建轻量指标行，记录度量名、值与统计窗口。 |
| rebuildOwnership | 函数 | 549–576 | 简单 | contract、rebuild、citation-graph | 0 | 重建归属行，记录主体到资源的引用归属证据。 |
| rebuildReference | 函数 | 360–414 | 中等 | contract、rebuild、citation-graph | 0 | 重建参考文献行，含标识、描述符与引用计数。 |
| rebuildResolvedEdge | 函数 | 465–494 | 简单 | contract、rebuild、citation-graph | 0 | 重建已解析边行，含两端节点、方向与解析依据。 |
| rebuildRoleEvidence | 函数 | 496–505 | 简单 | contract、rebuild、validation | 0 | 重建 RoleEvidence 契约对象，校验字段集合与边界后返回规范结构。 |
| rebuildScope | 函数 | 322–334 | 简单 | contract、rebuild、citation-graph | 0 | 重建引用图谱构建 scope，限定库、主题范围与统计窗口。 |
| rebuildSynthesisCitationGraphBuildDiagnostics | 函数 | 655–682 | 简单 | contract、rebuild、diagnostics | 1 | 重建构建诊断，保留稳定失败码与截断信息。 |
| rebuildSynthesisCitationGraphBuildRequest | 函数 | 684–765 | 中等 | contract、rebuild、citation-graph | 0 | 重建图谱构建请求，校验 scope、输入页与上下界。 |
| rebuildSynthesisCitationGraphBuildResult | 函数 | 1180–1455 | 复杂 | contract、rebuild、citation-graph | 0 | 重建图谱构建结果，校验各页元数据、行数与基础不变量。 |
| requiredString | 函数 | 227–241 | 简单 | validation、contract、parsing | 0 | 读取必填字符串字段，缺失、超长或含非法字符时抛出契约错误。 |
| resultArrayKey | 函数 | 1100–1120 | 简单 | utility、canonical-json、citation-graph | 0 | 为结果数组生成稳定键，保证多次计算输出可逐位比对。 |
| sameScope | 函数 | 1089–1098 | 简单 | utility、citation-graph、cache | 0 | 判断两个构建 scope 是否等价，用于结果缓存命中。 |
| selectPrimaryRole | 函数 | 813–833 | 简单 | citation-graph、compute、ranking | 0 | 按角色优先级挑选节点的主角色。 |
| stringList | 函数 | 271–287 | 简单 | validation、contract、parsing | 0 | 收敛字符串列表，限制条目数量并逐项校验。 |
| SynthesisCitationGraphBuildContractError | 类 | 141–148 | 简单 | error-handling、contract、diagnostics | 0 | 引用图谱构建契约错误，携带字段路径与失败原因码。 |
| targetKind | 函数 | 289–301 | 简单 | validation、topic-graph、parsing | 0 | 收敛图谱目标类型枚举，拒未知取值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-native-worker-transfer-parity.ts](../../../scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts.md) | scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts | 原生 worker 传输一致性检查：校验 citation graph build 的输入/输出分页与 transfer manifest 在引擎与 sidecar 之间的归属一致。 |
| [citationGraph.ts](../../../src/modules/synthesis/citationGraph.ts.md) | src/modules/synthesis/citationGraph.ts | Citation Graph 投影层：把文献与引用输入归一为稳定 reference key，去重合并 canonical paper 后调用 synthesis-engine 计算统一引用图谱。 |
| [citationGraphApplication.ts](../../synthesis-application/src/citationGraphApplication.ts.md) | packages/synthesis-application/src/citationGraphApplication.ts | 引用图谱（Citation Graph）应用层唯一 owner：把宿主读取事实、图构建引擎、指标/布局引擎与 repository 记录编排成 slice/metrics/layout/rebuild 四类读取与变更视图，并负责私有 rebuild attempt 的生命周期收敛。 |
| [citationGraphBuildTransfer.ts](citationGraphBuildTransfer.ts.md) | packages/synthesis-engine/src/citationGraphBuildTransfer.ts | 引用图谱构建的传输封装：分页 artifact 与 manifest 的构建与重建，供 engine 与 sidecar 之间搬运图谱页。 |
| [citationGraphProjection.ts](../../synthesis-application/src/citationGraphProjection.ts.md) | packages/synthesis-application/src/citationGraphProjection.ts | 引用图谱 repository 记录与契约 DTO 之间的纯投影层：把节点、边、来源归属、light metrics 行映射为可校验的应用视图，并提供基于 canonical JSON 的行哈希。 |
| [synthesisSidecarComputeClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts | sidecar 计算客户端：把 citation graph 的 build / layout / metrics 三类重计算请求通过 worker capability 路由到 sidecar，统一施加各阶段 deadline 并归一化错误。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| aggregateSynthesisCitationGraphBuildEdges | 函数 | 843–903 | 把已解析边聚合为图谱边，去重、合并权重并裁剪到上限。 |
| computeRebuiltSynthesisCitationGraphBuild | 函数 | 922–1087 | 在重建后的输入上重新计算图谱，用于 basis 校验后的重放。 |
| computeSynthesisCitationGraphBuild | 函数 | 911–920 | 执行图谱构建计算，产出节点、边、归属与指标页。 |
| createInProcessSynthesisCitationGraphBuildEngine | 函数 | 1457–1469 | 创建进程内图谱构建引擎，绑定纯计算函数与契约错误类型。 |
| rebuildSynthesisCitationGraphBuildDiagnostics | 函数 | 655–682 | 重建构建诊断，保留稳定失败码与截断信息。 |
| rebuildSynthesisCitationGraphBuildRequest | 函数 | 684–765 | 重建图谱构建请求，校验 scope、输入页与上下界。 |
| rebuildSynthesisCitationGraphBuildResult | 函数 | 1180–1455 | 重建图谱构建结果，校验各页元数据、行数与基础不变量。 |
| SynthesisCitationGraphBuildContractError | 类 | 141–148 | 引用图谱构建契约错误，携带字段路径与失败原因码。 |

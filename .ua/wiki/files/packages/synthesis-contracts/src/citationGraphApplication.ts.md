
# packages/synthesis-contracts/src/citationGraphApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/citationGraphApplication.ts -->

引用图谱应用层合约：定义 slice/metrics/layout/rebuild/refresh-metrics 请求与 inspect、mutation 结果的判别式重建函数，施加统一的字段精确性与规模上限。
源码：[packages/synthesis-contracts/src/citationGraphApplication.ts](../../../../../../packages/synthesis-contracts/src/citationGraphApplication.ts)

## 符号（8）
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildLayoutScope -->
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildSynthesisCitationGraphApplicationInspectResult -->
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildSynthesisCitationGraphApplicationLayoutRequest -->
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildSynthesisCitationGraphApplicationMetricsRequest -->
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildSynthesisCitationGraphApplicationMutationResult -->
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildSynthesisCitationGraphApplicationRebuildRequest -->
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildSynthesisCitationGraphApplicationRefreshMetricsRequest -->
<!-- node: function:packages/synthesis-contracts/src/citationGraphApplication.ts:rebuildSynthesisCitationGraphApplicationSliceRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildLayoutScope | 函数 | 317–356 | 中等 | 布局、归一化、引用图谱、有界 | 1 | 归一化布局请求的算法、节点/边上限与窗口默认值，为布局引擎提供确定的作用域。 |
| rebuildSynthesisCitationGraphApplicationInspectResult | 函数 | 433–497 | 复杂 | 合约、引用图谱、inspect、校验、核心 | 0 | 重建引用图谱 inspect 结果：校验节点、边与布局行的字段精确性、整数范围与唯一 ID 约束。 |
| rebuildSynthesisCitationGraphApplicationLayoutRequest | 函数 | 358–386 | 中等 | 合约、布局、请求校验、引用图谱 | 0 | 重建布局请求，绑定算法枚举与 layout scope，拒绝未知算法名。 |
| rebuildSynthesisCitationGraphApplicationMetricsRequest | 函数 | 273–315 | 中等 | 合约、指标、引用图谱、请求校验 | 0 | 重建引用图谱指标请求：按 preset 归一化 scope、目标集合与期望图哈希。 |
| rebuildSynthesisCitationGraphApplicationMutationResult | 函数 | 499–546 | 中等 | 合约、变更结果、引用图谱、校验 | 0 | 重建引用图谱变更结果：统一 status 枚举、图/指标哈希与诊断列表，供 wire 层直接编码。 |
| rebuildSynthesisCitationGraphApplicationRebuildRequest | 函数 | 388–421 | 中等 | 合约、rebuild、请求校验、引用图谱 | 0 | 重建图重建请求：校验 mode、幂等键与期望图哈希，确保公开操作 ID 不进入应用层。 |
| rebuildSynthesisCitationGraphApplicationRefreshMetricsRequest | 函数 | 423–431 | 简单 | 合约、指标刷新、请求校验 | 0 | 重建指标刷新请求，只接受图哈希与期望图哈希两个字段，确保刷新不改变图身份。 |
| rebuildSynthesisCitationGraphApplicationSliceRequest | 函数 | 221–271 | 中等 | 合约、引用图谱、请求校验、有界 | 0 | 重建引用图谱切片请求：校验 scope、paperRefs 与期望 basis 哈希，并施加分页与集合规模上限。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphApplication.ts](../../synthesis-application/src/citationGraphApplication.ts.md) | packages/synthesis-application/src/citationGraphApplication.ts | 引用图谱（Citation Graph）应用层唯一 owner：把宿主读取事实、图构建引擎、指标/布局引擎与 repository 记录编排成 slice/metrics/layout/rebuild 四类读取与变更视图，并负责私有 rebuild attempt 的生命周期收敛。 |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildLayoutScope | 函数 | 317–356 | 归一化布局请求的算法、节点/边上限与窗口默认值，为布局引擎提供确定的作用域。 |
| rebuildSynthesisCitationGraphApplicationInspectResult | 函数 | 433–497 | 重建引用图谱 inspect 结果：校验节点、边与布局行的字段精确性、整数范围与唯一 ID 约束。 |
| rebuildSynthesisCitationGraphApplicationLayoutRequest | 函数 | 358–386 | 重建布局请求，绑定算法枚举与 layout scope，拒绝未知算法名。 |
| rebuildSynthesisCitationGraphApplicationMetricsRequest | 函数 | 273–315 | 重建引用图谱指标请求：按 preset 归一化 scope、目标集合与期望图哈希。 |
| rebuildSynthesisCitationGraphApplicationMutationResult | 函数 | 499–546 | 重建引用图谱变更结果：统一 status 枚举、图/指标哈希与诊断列表，供 wire 层直接编码。 |
| rebuildSynthesisCitationGraphApplicationRebuildRequest | 函数 | 388–421 | 重建图重建请求：校验 mode、幂等键与期望图哈希，确保公开操作 ID 不进入应用层。 |
| rebuildSynthesisCitationGraphApplicationRefreshMetricsRequest | 函数 | 423–431 | 重建指标刷新请求，只接受图哈希与期望图哈希两个字段，确保刷新不改变图身份。 |
| rebuildSynthesisCitationGraphApplicationSliceRequest | 函数 | 221–271 | 重建引用图谱切片请求：校验 scope、paperRefs 与期望 basis 哈希，并施加分页与集合规模上限。 |

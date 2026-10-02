
# scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts -->

原生 worker 传输一致性检查：校验 citation graph build 的输入/输出分页与 transfer manifest 在引擎与 sidecar 之间的归属一致。
源码：[scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts](../../../../../scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts)

## 符号（2）
<!-- node: function:scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts:checkSynthesisNativeWorkerTransferParity -->
<!-- node: function:scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts:inspectSynthesisNativeWorkerTransferOwnership -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkSynthesisNativeWorkerTransferParity | 函数 | 128–255 | 中等 | entry-point、test、worker | 0 | 检查入口：运行 worker 传输一致性检查并在不一致时失败。 |
| inspectSynthesisNativeWorkerTransferOwnership | 函数 | 35–126 | 中等 | test、worker、transfer | 0 | 检查 citation graph build 各类分页与 transfer manifest 的归属声明是否唯一。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../packages/synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [citationGraphBuild.ts](../../packages/synthesis-engine/src/citationGraphBuild.ts.md) | packages/synthesis-engine/src/citationGraphBuild.ts | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |
| [citationGraphBuildTransfer.ts](../../packages/synthesis-engine/src/citationGraphBuildTransfer.ts.md) | packages/synthesis-engine/src/citationGraphBuildTransfer.ts | 引用图谱构建的传输封装：分页 artifact 与 manifest 的构建与重建，供 engine 与 sidecar 之间搬运图谱页。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkSynthesisNativeWorkerTransferParity | 函数 | 128–255 | 检查入口：运行 worker 传输一致性检查并在不一致时失败。 |
| inspectSynthesisNativeWorkerTransferOwnership | 函数 | 35–126 | 检查 citation graph build 各类分页与 transfer manifest 的归属声明是否唯一。 |

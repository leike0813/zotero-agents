
# packages/synthesis-engine/src/citationGraphBuildTransfer.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/citationGraphBuildTransfer.ts -->

引用图谱构建的传输封装：分页 artifact 与 manifest 的构建与重建，供 engine 与 sidecar 之间搬运图谱页。
源码：[packages/synthesis-engine/src/citationGraphBuildTransfer.ts](../../../../../../packages/synthesis-engine/src/citationGraphBuildTransfer.ts)

## 符号（13）
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:assertDescriptorSequence -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:buildSynthesisCitationGraphBuildTransferManifest -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:buildSynthesisCitationGraphBuildTransferPage -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:buildSynthesisCitationGraphBuildTransferPageArtifact -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:exactFields -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:joinCanonicalRowBytes -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:manifestBody -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:pageKind -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:rebuildDescriptor -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:rebuildHeader -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:rebuildRows -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:rebuildSynthesisCitationGraphBuildTransferManifest -->
<!-- node: function:packages/synthesis-engine/src/citationGraphBuildTransfer.ts:rebuildSynthesisCitationGraphBuildTransferPageArtifact -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertDescriptorSequence | 函数 | 236–264 | 简单 | validation、transfer、guard | 0 | 断言分页描述符序号连续且覆盖完整，防止丢页。 |
| buildSynthesisCitationGraphBuildTransferManifest | 函数 | 443–460 | 简单 | transfer、build、citation-graph | 1 | 构建图谱构建传输 manifest，聚合页清单与校验和。 |
| buildSynthesisCitationGraphBuildTransferPage | 函数 | 280–290 | 简单 | transfer、build、citation-graph | 0 | 构建图谱构建传输页，序列化页头与行数据。 |
| buildSynthesisCitationGraphBuildTransferPageArtifact | 函数 | 292–314 | 简单 | transfer、build、serialization | 0 | 构建传输页 artifact，产出可直接落盘的 canonical 表示。 |
| exactFields | 函数 | 84–97 | 简单 | validation、contract、guard | 0 | 校验对象字段集合与契约完全一致，多余或缺失字段均判为契约错误。 |
| joinCanonicalRowBytes | 函数 | 339–353 | 简单 | serialization、canonical-json、transfer | 0 | 把行数组按 canonical 编码连接为单段字节串。 |
| manifestBody | 函数 | 266–278 | 简单 | transfer、serialization、contract | 0 | 收敛传输 manifest 的公共字段部分。 |
| pageKind | 函数 | 113–123 | 简单 | validation、transfer、parsing | 0 | 收敛传输页 kind 枚举并校验归属。 |
| rebuildDescriptor | 函数 | 220–234 | 简单 | transfer、rebuild、pagination | 0 | 重建分页描述符，校验页号、偏移与行数。 |
| rebuildHeader | 函数 | 133–174 | 简单 | transfer、rebuild、citation-graph | 0 | 重建传输页头，校验页序、来源与校验和。 |
| rebuildRows | 函数 | 176–204 | 简单 | transfer、rebuild、citation-graph | 0 | 重建传输页行数组，逐行按 kind 收敛并限制数量。 |
| rebuildSynthesisCitationGraphBuildTransferManifest | 函数 | 462–496 | 简单 | transfer、rebuild、citation-graph | 0 | 重建传输 manifest，校验版本、页集合与顺序。 |
| rebuildSynthesisCitationGraphBuildTransferPageArtifact | 函数 | 322–337 | 简单 | transfer、rebuild、serialization | 0 | 重建传输页 artifact 并校验其 canonical 结构。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [citationGraphBuild.ts](citationGraphBuild.ts.md) | packages/synthesis-engine/src/citationGraphBuild.ts | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-native-worker-transfer-parity.ts](../../../scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts.md) | scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts | 原生 worker 传输一致性检查：校验 citation graph build 的输入/输出分页与 transfer manifest 在引擎与 sidecar 之间的归属一致。 |
| [smoke-synthesis-rust-durable-candidate.ts](../../../scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts.md) | scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts | Rust sidecar durable candidate 冒烟脚本：以真实子进程启动 sidecar，覆盖 loopback 转发、reverse host fixture、饱和、布局与 citation graph build 等生产路径。 |
| [synthesisSidecarTransferClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSynthesisCitationGraphBuildTransferManifest | 函数 | 443–460 | 构建图谱构建传输 manifest，聚合页清单与校验和。 |
| buildSynthesisCitationGraphBuildTransferPage | 函数 | 280–290 | 构建图谱构建传输页，序列化页头与行数据。 |
| buildSynthesisCitationGraphBuildTransferPageArtifact | 函数 | 292–314 | 构建传输页 artifact，产出可直接落盘的 canonical 表示。 |
| rebuildSynthesisCitationGraphBuildTransferManifest | 函数 | 462–496 | 重建传输 manifest，校验版本、页集合与顺序。 |
| rebuildSynthesisCitationGraphBuildTransferPageArtifact | 函数 | 322–337 | 重建传输页 artifact 并校验其 canonical 结构。 |

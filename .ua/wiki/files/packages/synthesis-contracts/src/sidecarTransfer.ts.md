
# packages/synthesis-contracts/src/sidecarTransfer.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarTransfer.ts -->

sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。
源码：[packages/synthesis-contracts/src/sidecarTransfer.ts](../../../../../../packages/synthesis-contracts/src/sidecarTransfer.ts)

## 符号（31）
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:assetDescriptor -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:boundedString -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:descriptorKinds -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:exactFields -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:exactOptionalFields -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:execution -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:graphDiagnostics -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:graphTargetKind -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:inputHeader -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:jsonNodes -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:optionalString -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:outputHeader -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:progress -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildAggregateEdge -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildGraphNode -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildLibraryNode -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildLightMetric -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildOwnership -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildReference -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildResolvedEdge -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildRoleEvidence -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarOutputTransferReference -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarTransferAction -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarTransferManifest -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarTransferPage -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarTransferPageDescriptor -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarTransferSnapshot -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:rebuildSynthesisSidecarTransferStatus -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:scope -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:sessionAction -->
<!-- node: function:packages/synthesis-contracts/src/sidecarTransfer.ts:stringArray -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assetDescriptor | 函数 | 643–669 | 简单 | transfer、contract、asset | 0 | 重建资产描述符，记录路径、大小与内容哈希。 |
| boundedString | 函数 | 436–446 | 简单 | validation、contract、parsing | 0 | 读取有长度上限的字符串字段，超限时抛出契约错误。 |
| descriptorKinds | 函数 | 671–681 | 简单 | validation、transfer、parsing | 0 | 收敛传输描述符的 kind 枚举。 |
| exactFields | 函数 | 395–408 | 简单 | validation、contract、guard | 0 | 校验对象字段集合与契约完全一致，多余或缺失字段均判为契约错误。 |
| exactOptionalFields | 函数 | 410–424 | 简单 | validation、contract、guard | 0 | 校验可选字段的存在性与类型，允许缺省但不允许非法值。 |
| execution | 函数 | 1415–1455 | 简单 | validation、transfer、parsing | 0 | 收敛执行证据：执行 ID、模式与时间戳。 |
| graphDiagnostics | 函数 | 563–606 | 简单 | validation、diagnostics、citation-graph | 0 | 重建图谱相关诊断，限制条数并保留稳定失败码。 |
| graphTargetKind | 函数 | 955–964 | 简单 | validation、topic-graph、parsing | 0 | 收敛图谱目标类型枚举。 |
| inputHeader | 函数 | 608–622 | 简单 | transfer、pagination、contract | 0 | 重建传输输入页头，校验页序、来源与计数。 |
| jsonNodes | 函数 | 478–493 | 简单 | utility、serialization、metrics | 0 | 统计 JSON 值的节点总数，作为体积与复杂度上限的判定依据。 |
| optionalString | 函数 | 534–543 | 简单 | validation、contract、parsing | 0 | 读取可选字符串字段。 |
| outputHeader | 函数 | 624–641 | 简单 | transfer、pagination、contract | 0 | 重建传输输出页头，校验页序、总量与校验和。 |
| progress | 函数 | 1385–1402 | 简单 | validation、transfer、parsing | 0 | 收敛传输进度字段：已完成、总量与单位。 |
| rebuildAggregateEdge | 函数 | 1096–1139 | 简单 | contract、rebuild、citation-graph | 0 | 重建聚合边行，含成员集合、权重与角色证据。 |
| rebuildGraphNode | 函数 | 1025–1049 | 简单 | contract、rebuild、citation-graph | 0 | 重建图谱节点行，含目标类型、角色与度量。 |
| rebuildLibraryNode | 函数 | 930–953 | 简单 | contract、rebuild、data-model | 0 | 重建库节点行：库键、标识与统计量。 |
| rebuildLightMetric | 函数 | 1164–1209 | 简单 | contract、rebuild、metrics | 0 | 重建轻量指标行，记录度量名、值与统计窗口。 |
| rebuildOwnership | 函数 | 1141–1162 | 简单 | contract、rebuild、citation-graph | 0 | 重建归属行：主体到资源的所有权证据。 |
| rebuildReference | 函数 | 973–1023 | 中等 | contract、rebuild、reference-management | 0 | 重建参考文献行，含描述符、版本与证据。 |
| rebuildResolvedEdge | 函数 | 1051–1082 | 简单 | contract、rebuild、citation-graph | 0 | 重建已解析边行，含两端节点、方向与解析依据。 |
| rebuildRoleEvidence | 函数 | 1084–1094 | 简单 | contract、rebuild、validation | 0 | 重建 RoleEvidence 契约对象，校验字段集合与边界后返回规范结构。 |
| rebuildSynthesisSidecarOutputTransferReference | 函数 | 1289–1302 | 简单 | contract、rebuild、transfer | 0 | 重建输出传输引用，绑定 manifest 标识与页范围。 |
| rebuildSynthesisSidecarTransferAction | 函数 | 1324–1383 | 中等 | contract、rebuild、transfer | 0 | 重建传输会话动作，区分提交、取消与继续。 |
| rebuildSynthesisSidecarTransferManifest | 函数 | 714–928 | 复杂 | contract、rebuild、transfer | 0 | 重建传输 manifest，校验版本、页集合、资产与输入输出头。 |
| rebuildSynthesisSidecarTransferPage | 函数 | 1211–1287 | 中等 | contract、rebuild、transfer | 0 | 重建传输页结果，校验页元数据、行数组与校验和。 |
| rebuildSynthesisSidecarTransferPageDescriptor | 函数 | 683–712 | 简单 | contract、rebuild、transfer | 0 | 重建传输分页描述符，校验页号、偏移与行数。 |
| [rebuildSynthesisSidecarTransferSnapshot](../../../../symbols/packages/synthesis-contracts/src/sidecarTransfer.ts/rebuildSynthesisSidecarTransferSnapshot.md) | 函数 | 1510–1530 | 简单 | contract、rebuild、transfer | 2 | 重建传输顶层快照，收敛 manifest、状态与输出引用。 |
| rebuildSynthesisSidecarTransferStatus | 函数 | 1457–1508 | 中等 | contract、rebuild、transfer | 0 | 重建传输状态快照，聚合进度、执行证据与诊断。 |
| scope | 函数 | 545–561 | 简单 | validation、transfer、parsing | 0 | 收敛传输 scope 定义，限定本次搬运覆盖的库与主题范围。 |
| sessionAction | 函数 | 1304–1322 | 简单 | validation、transfer、parsing | 0 | 收敛传输会话动作枚举。 |
| stringArray | 函数 | 517–532 | 简单 | validation、contract、parsing | 0 | 收敛字符串数组，限制长度并逐项做边界校验。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [exportDelivery.ts](exportDelivery.ts.md) | packages/synthesis-contracts/src/exportDelivery.ts | 宿主导出交付合约：校验导出条目集合（数量、单条与总体字节上限、控制字符、路径形状），并定义导出请求、传输请求与运行工作区物化请求/结果。 |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisSidecarTransferClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisSidecarOutputTransferReference | 函数 | 1289–1302 | 重建输出传输引用，绑定 manifest 标识与页范围。 |
| rebuildSynthesisSidecarTransferAction | 函数 | 1324–1383 | 重建传输会话动作，区分提交、取消与继续。 |
| rebuildSynthesisSidecarTransferManifest | 函数 | 714–928 | 重建传输 manifest，校验版本、页集合、资产与输入输出头。 |
| rebuildSynthesisSidecarTransferPage | 函数 | 1211–1287 | 重建传输页结果，校验页元数据、行数组与校验和。 |
| rebuildSynthesisSidecarTransferPageDescriptor | 函数 | 683–712 | 重建传输分页描述符，校验页号、偏移与行数。 |
| [rebuildSynthesisSidecarTransferSnapshot](../../../../symbols/packages/synthesis-contracts/src/sidecarTransfer.ts/rebuildSynthesisSidecarTransferSnapshot.md) | 函数 | 1510–1530 | 重建传输顶层快照，收敛 manifest、状态与输出引用。 |
| rebuildSynthesisSidecarTransferStatus | 函数 | 1457–1508 | 重建传输状态快照，聚合进度、执行证据与诊断。 |

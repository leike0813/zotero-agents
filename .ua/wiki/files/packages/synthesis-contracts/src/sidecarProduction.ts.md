
# packages/synthesis-contracts/src/sidecarProduction.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarProduction.ts -->

生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。
源码：[packages/synthesis-contracts/src/sidecarProduction.ts](../../../../../../packages/synthesis-contracts/src/sidecarProduction.ts)

## 符号（13）
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:boundedString -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:exactFields -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:orderedOperationalCapabilities -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:productionRuntimeIdentity -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:productionSnapshots -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:rebuildSynthesisProductionDiscovery -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:rebuildSynthesisProductionHandshakeResult -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:rebuildSynthesisProductionHealth -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:rebuildSynthesisReverseHostCall -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:rebuildSynthesisReverseHostPayload -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:rebuildSynthesisReverseHostResult -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:runtimeTarget -->
<!-- node: function:packages/synthesis-contracts/src/sidecarProduction.ts:safeInteger -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundedString | 函数 | 410–423 | 简单 | validation、contract、parsing | 0 | 读取有长度上限的字符串字段，超限时抛出契约错误。 |
| exactFields | 函数 | 395–408 | 简单 | validation、contract、guard | 0 | 校验对象字段集合与契约完全一致，多余或缺失字段均判为契约错误。 |
| orderedOperationalCapabilities | 函数 | 465–476 | 简单 | capability-registry、sidecar、ordering | 0 | 按协议要求的顺序排列生产运行时能力列表。 |
| productionRuntimeIdentity | 函数 | 478–519 | 简单 | sidecar、production-runtime、identity | 0 | 重建生产运行时身份：实现、平台目标与 bundle 指纹。 |
| productionSnapshots | 函数 | 521–559 | 简单 | sidecar、production-runtime、projection | 0 | 收敛生产运行时在各 owner 上的快照集合。 |
| rebuildSynthesisProductionDiscovery | 函数 | 561–652 | 中等 | contract、rebuild、sidecar、discovery | 0 | 重建生产发现记录，包含端点、身份、能力与快照。 |
| rebuildSynthesisProductionHandshakeResult | 函数 | 695–751 | 中等 | contract、rebuild、handshake | 0 | 重建生产握手结果，校验协议版本、能力交集与身份匹配。 |
| rebuildSynthesisProductionHealth | 函数 | 654–693 | 简单 | contract、rebuild、observability | 0 | 重建生产健康结果，区分存活、就绪与降级状态。 |
| rebuildSynthesisReverseHostCall | 函数 | 1042–1106 | 中等 | contract、rebuild、reverse-host | 0 | 重建 reverse-host 调用描述，绑定载荷、超时与 deadline。 |
| rebuildSynthesisReverseHostPayload | 函数 | 753–918 | 中等 | contract、rebuild、reverse-host | 0 | 重建 reverse-host 载荷，校验 capability、参数与体积上限。 |
| rebuildSynthesisReverseHostResult | 函数 | 920–1040 | 中等 | contract、rebuild、reverse-host | 0 | 重建 reverse-host 结果，区分成功、受限拒绝与传输失败。 |
| runtimeTarget | 函数 | 450–463 | 简单 | validation、sidecar、parsing | 0 | 收敛 sidecar 运行时目标三元组标识。 |
| safeInteger | 函数 | 433–448 | 简单 | validation、contract、parsing | 0 | 读取安全整数范围内的整数字段并校验边界。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [exportDelivery.ts](exportDelivery.ts.md) | packages/synthesis-contracts/src/exportDelivery.ts | 宿主导出交付合约：校验导出条目集合（数量、单条与总体字节上限、控制字符、路径形状），并定义导出请求、传输请求与运行工作区物化请求/结果。 |
| [hostRead.ts](hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts | 宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。 |
| [librarySnapshot.ts](librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts | Zotero 文献库快照契约：定义快照请求、条目、完成证据与分页结果的 schema 常量、范围/顺序/批量上限，并提供对应的严格重建函数。 |
| [relatedItemsEffect.ts](relatedItemsEffect.ts.md) | packages/synthesis-contracts/src/relatedItemsEffect.ts | 宿主 related-items 批量 effect 契约：定义批次与诊断条数上限，重建 effect 请求、逐条 receipt 与批次结果。 |
| [representativeImageRead.ts](representativeImageRead.ts.md) | packages/synthesis-contracts/src/representativeImageRead.ts | 宿主代表图读取契约：限制内容字节与诊断条数，重建读取请求以及 available / unavailable 两态结果。 |
| [schemaVersion.ts](schemaVersion.ts.md) | packages/synthesis-contracts/src/schemaVersion.ts | 只导出 repository foundation schema 版本常量的单行版本锚点，供仓库与合约两侧对齐迁移版本。 |
| [sidecarObservability.ts](sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [sidecarRuntimeBundle.ts](sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [sidecarTransfer.ts](sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts | sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。 |
| [tagEffect.ts](tagEffect.ts.md) | packages/synthesis-contracts/src/tagEffect.ts | 宿主标签 effect 契约：staged binding 解析请求与结果，以及标签 effect 批次请求、逐条 receipt 与批次结果重建。 |
| [webDavSyncPort.ts](webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-cross-language-contracts.ts](../../../scripts/synthesis/check-synthesis-cross-language-contracts.ts.md) | scripts/synthesis/check-synthesis-cross-language-contracts.ts | 跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisProductionDiscovery | 函数 | 561–652 | 重建生产发现记录，包含端点、身份、能力与快照。 |
| rebuildSynthesisProductionHandshakeResult | 函数 | 695–751 | 重建生产握手结果，校验协议版本、能力交集与身份匹配。 |
| rebuildSynthesisProductionHealth | 函数 | 654–693 | 重建生产健康结果，区分存活、就绪与降级状态。 |
| rebuildSynthesisReverseHostCall | 函数 | 1042–1106 | 重建 reverse-host 调用描述，绑定载荷、超时与 deadline。 |
| rebuildSynthesisReverseHostPayload | 函数 | 753–918 | 重建 reverse-host 载荷，校验 capability、参数与体积上限。 |
| rebuildSynthesisReverseHostResult | 函数 | 920–1040 | 重建 reverse-host 结果，区分成功、受限拒绝与传输失败。 |

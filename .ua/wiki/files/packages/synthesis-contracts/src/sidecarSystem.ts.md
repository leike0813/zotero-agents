
# packages/synthesis-contracts/src/sidecarSystem.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarSystem.ts -->

sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。
源码：[packages/synthesis-contracts/src/sidecarSystem.ts](../../../../../../packages/synthesis-contracts/src/sidecarSystem.ts)

## 符号（13）
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:isSynthesisSidecarProductionClientCapability -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildNativeRuntimeIdentity -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildSynthesisSidecarCallEnvelope -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildSynthesisSidecarCallRequest -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildSynthesisSidecarComputePoolSnapshot -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildSynthesisSidecarForwardResult -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildSynthesisSidecarHandshakeResult -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildSynthesisSidecarHealth -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:rebuildSynthesisSidecarRepositorySnapshot -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:requireBoundedString -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:requireCapabilities -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:requireExactFields -->
<!-- node: function:packages/synthesis-contracts/src/sidecarSystem.ts:requireHash -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isSynthesisSidecarProductionClientCapability | 函数 | 894–903 | 简单 | capability-registry、type-guard、sidecar | 0 | 判断给定标识是否属于生产客户端能力集合。 |
| rebuildNativeRuntimeIdentity | 函数 | 1074–1133 | 中等 | contract、rebuild、sidecar、identity | 0 | 重建 native runtime 身份，校验实现标识、平台目标与 bundle 哈希。 |
| rebuildSynthesisSidecarCallEnvelope | 函数 | 806–854 | 简单 | contract、rebuild、protocol | 0 | 重建 sidecar 调用 envelope，校验 capability、参数 schema 与幂等键。 |
| rebuildSynthesisSidecarCallRequest | 函数 | 856–868 | 简单 | contract、rebuild、protocol | 0 | 重建 sidecar 调用请求，聚合 envelope、trace context 与 deadline。 |
| rebuildSynthesisSidecarComputePoolSnapshot | 函数 | 928–991 | 中等 | contract、rebuild、worker-pool | 0 | 重建 compute pool 快照，校验 worker 数、队列深度与容量。 |
| rebuildSynthesisSidecarForwardResult | 函数 | 774–785 | 简单 | contract、rebuild、sidecar | 0 | 重建 sidecar 转发结果，记录上游状态、延迟与失败原因。 |
| rebuildSynthesisSidecarHandshakeResult | 函数 | 1188–1254 | 中等 | contract、rebuild、handshake | 0 | 重建 sidecar 握手结果，校验协议版本与能力匹配。 |
| rebuildSynthesisSidecarHealth | 函数 | 1135–1186 | 中等 | contract、rebuild、observability | 0 | 重建 sidecar 健康结果，区分存活、就绪与不可用及稳定原因码。 |
| rebuildSynthesisSidecarRepositorySnapshot | 函数 | 993–1020 | 简单 | contract、rebuild、repository | 0 | 重建 repository 快照，校验 schema 版本、库路径与 owner 状态。 |
| requireBoundedString | 函数 | 787–804 | 简单 | validation、contract、guard | 0 | 断言给定值是长度受限的字符串，否则抛出协议错误。 |
| requireCapabilities | 函数 | 1055–1072 | 简单 | validation、capability-registry、guard | 0 | 断言能力列表非空、已排序且不含重复项。 |
| requireExactFields | 函数 | 1022–1039 | 简单 | validation、contract、guard | 0 | 断言字段集合与契约完全一致。 |
| requireHash | 函数 | 1041–1053 | 简单 | validation、contract、guard | 0 | 断言字段是合法的内容哈希串。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [schemaVersion.ts](schemaVersion.ts.md) | packages/synthesis-contracts/src/schemaVersion.ts | 只导出 repository foundation schema 版本常量的单行版本锚点，供仓库与合约两侧对齐迁移版本。 |
| [sidecarCanonicalStore.ts](sidecarCanonicalStore.ts.md) | packages/synthesis-contracts/src/sidecarCanonicalStore.ts | 主题 canonical store 快照的 schema 版本与快照重建函数，是 sidecar 与仓库之间的一致性锚点。 |
| [sidecarObservability.ts](sidecarObservability.ts.md) | packages/synthesis-contracts/src/sidecarObservability.ts | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [sidecarRuntimeBundle.ts](sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarTransfer.ts](sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts | sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-artifact-library-debug-surface-parity.ts](../../../scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts.md) | scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts | 产物库 debug surface 一致性检查：比对 production surface 语料与 sidecar system 契约，确认 debug 面板所需的每个 operation 都被声明。 |
| [check-synthesis-citation-graph-surface-parity.ts](../../../scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts.md) | scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts | 引用图谱 surface 一致性检查：校验引用图谱相关 operation 在契约、语料与基线 fixture 三侧齐备。 |
| [check-synthesis-concept-topic-graph-surface-parity.ts](../../../scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts.md) | scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts | 概念-主题图谱 surface 一致性检查：校验概念知识库与主题关系图谱 operation 的跨语言契约覆盖情况。 |
| [check-synthesis-cross-language-contracts.ts](../../../scripts/synthesis/check-synthesis-cross-language-contracts.ts.md) | scripts/synthesis/check-synthesis-cross-language-contracts.ts | 跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。 |
| [check-synthesis-native-runtime-contract-parity.ts](../../../scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts.md) | scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts | 原生运行时契约一致性检查：比对 Rust 侧运行时 bundle 指针、launch config 与 discovery schema 是否与 TS 契约对齐。 |
| [check-synthesis-production-capabilities.ts](../../../scripts/synthesis/check-synthesis-production-capabilities.ts.md) | scripts/synthesis/check-synthesis-production-capabilities.ts | 生产 capability 契约检查：验证 sidecar system 声明的 capability 集合、operation policy、语义成功规则与 CLI 暴露面一致。 |
| [check-synthesis-reference-canonical-surface-parity.ts](../../../scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts.md) | scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts | canonical reference surface 一致性检查：校验引用 canonical 化相关 operation 在契约与语料侧的覆盖与边界。 |
| [check-synthesis-tag-surface-parity.ts](../../../scripts/synthesis/check-synthesis-tag-surface-parity.ts.md) | scripts/synthesis/check-synthesis-tag-surface-parity.ts | 标签 surface 一致性检查：校验标签词表相关 operation 的契约、语料与基线一致。 |
| [check-synthesis-topic-workbench-surface-parity.ts](../../../scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts.md) | scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts | 主题工作台 surface 一致性检查：校验 workbench 消费的 operation 集合与 sidecar 契约声明齐备。 |
| [check-synthesis-webdav-maintenance-surface-parity.ts](../../../scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts.md) | scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts | WebDAV 维护 surface 一致性检查：校验 public maintenance operation 的 capability、路由与语料声明一致。 |
| [package-synthesis-sidecar-runtime.ts](../../../scripts/synthesis/package-synthesis-sidecar-runtime.ts.md) | scripts/synthesis/package-synthesis-sidecar-runtime.ts | Synthesis sidecar runtime 的打包 CLI：按平台目标收集 Rust 构建产物、清单与指针文件，组装成可分发的 bundle 目录。 |
| [sidecarLifecycle.ts](sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts | sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。 |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [sidecarRuntimeBundle.ts](sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarTransfer.ts](sidecarTransfer.ts.md) | packages/synthesis-contracts/src/sidecarTransfer.ts | sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。 |
| [smoke-synthesis-rust-durable-candidate.ts](../../../scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts.md) | scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts | Rust sidecar durable candidate 冒烟脚本：以真实子进程启动 sidecar，覆盖 loopback 转发、reverse host fixture、饱和、布局与 citation graph build 等生产路径。 |
| [synthesisProductionRpcPolicy.ts](../../../src/modules/synthesis/production/synthesisProductionRpcPolicy.ts.md) | src/modules/synthesis/production/synthesisProductionRpcPolicy.ts | 生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。 |
| [synthesisSidecarBusinessAudit.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts | sidecar 业务审计：以 started/succeeded/failed 三态记录每个生产 operation，依据 manifest 的语义成功字段与失败分类写入 runtime 日志，形成跨进程的业务级证据链。 |
| [synthesisSidecarComputeClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts | sidecar 计算客户端：把 citation graph 的 build / layout / metrics 三类重计算请求通过 worker capability 路由到 sidecar，统一施加各阶段 deadline 并归一化错误。 |
| [synthesisSidecarRpcClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [synthesisSidecarTransferClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts | sidecar 内容传输客户端：按 manifest/page 协议分页拉取大体积产物（topic 资产、引用图谱构建结果），校验 canonical JSON 摘要，并在本地消费输出 JSON。 |
| [synthesisSidecarWorkbenchClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts | sidecar 工作台客户端：提供 operational chrome 读取这一条短 deadline 调用，把 workbench 契约结果从 RPC 响应中重建出来。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isSynthesisSidecarProductionClientCapability | 函数 | 894–903 | 判断给定标识是否属于生产客户端能力集合。 |
| rebuildSynthesisSidecarCallEnvelope | 函数 | 806–854 | 重建 sidecar 调用 envelope，校验 capability、参数 schema 与幂等键。 |
| rebuildSynthesisSidecarCallRequest | 函数 | 856–868 | 重建 sidecar 调用请求，聚合 envelope、trace context 与 deadline。 |
| rebuildSynthesisSidecarComputePoolSnapshot | 函数 | 928–991 | 重建 compute pool 快照，校验 worker 数、队列深度与容量。 |
| rebuildSynthesisSidecarForwardResult | 函数 | 774–785 | 重建 sidecar 转发结果，记录上游状态、延迟与失败原因。 |
| rebuildSynthesisSidecarHandshakeResult | 函数 | 1188–1254 | 重建 sidecar 握手结果，校验协议版本与能力匹配。 |
| rebuildSynthesisSidecarHealth | 函数 | 1135–1186 | 重建 sidecar 健康结果，区分存活、就绪与不可用及稳定原因码。 |
| rebuildSynthesisSidecarRepositorySnapshot | 函数 | 993–1020 | 重建 repository 快照，校验 schema 版本、库路径与 owner 状态。 |

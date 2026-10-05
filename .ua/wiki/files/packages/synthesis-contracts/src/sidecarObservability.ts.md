
# packages/synthesis-contracts/src/sidecarObservability.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarObservability.ts -->

sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。
源码：[packages/synthesis-contracts/src/sidecarObservability.ts](../../../../../../packages/synthesis-contracts/src/sidecarObservability.ts)

## 符号（3）
<!-- node: function:packages/synthesis-contracts/src/sidecarObservability.ts:exactKeys -->
<!-- node: function:packages/synthesis-contracts/src/sidecarObservability.ts:rebuildSynthesisSidecarObservationEvent -->
<!-- node: function:packages/synthesis-contracts/src/sidecarObservability.ts:rebuildSynthesisSidecarTraceContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [exactKeys](../../../../symbols/packages/synthesis-contracts/src/sidecarObservability.ts/exactKeys.md) | 函数 | 121–134 | 简单 | validation、contract、guard | 2 | 校验对象键集合与契约完全一致，阻止未声明字段混入 wire 数据。 |
| rebuildSynthesisSidecarObservationEvent | 函数 | 194–320 | 中等 | contract、rebuild、observability | 0 | 重建 observation 事件，校验来源、边界、结局与 identity/metric/fact 键。 |
| rebuildSynthesisSidecarTraceContext | 函数 | 161–192 | 简单 | contract、rebuild、observability | 1 | 重建 trace context，校验 traceId、spanId 与父链路关系。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-cross-language-contracts.ts](../../../scripts/synthesis/check-synthesis-cross-language-contracts.ts.md) | scripts/synthesis/check-synthesis-cross-language-contracts.ts | 跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。 |
| [dashboardWireContract.ts](../../../src/shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [sidecarLifecycle.ts](sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts | sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。 |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesisReverseHostEndpoint.ts](../../../src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts | 反向宿主 HTTP 端点：在 loopback 上自建最小 HTTP 服务器，解析 `/synthesis/v1/host-call` 请求并转交 broker 处置，同时提供无 socket 的纯函数请求处理入口。 |
| [synthesisSidecarRpcClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts | sidecar 通用 RPC 客户端：向 `/synthesis/v1/call` 发送 capability 调用信封，实现有界响应读取、协议/传输错误分层与组合取消信号，是控制、计算、传输与工作台客户端的共同底座。 |
| [synthesisSidecarRuntimeSupervisor.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisSidecarTrace.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarTrace.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarTrace.ts | sidecar trace 通道：维护按 trace 聚合的有界事件缓冲，按 patch 间隔批量发布订阅者通知，并把观测事件投影为 Dashboard 使用的 wire 快照。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisSidecarObservationEvent | 函数 | 194–320 | 重建 observation 事件，校验来源、边界、结局与 identity/metric/fact 键。 |
| rebuildSynthesisSidecarTraceContext | 函数 | 161–192 | 重建 trace context，校验 traceId、spanId 与父链路关系。 |

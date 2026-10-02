
# src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts -->

ACP 运行时性能基线治理：脱敏采集元数据与环境信息、汇总 profiler 快照并构造可冻结的基线记录。
源码：[src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts)

## 符号（7）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts:buildAcpRuntimeGovernanceBaselineRecord -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts:sanitizeAcpRuntimeCaptureMetadata -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts:sanitizeLabels -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts:sanitizeMetric -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts:sanitizeProfile -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts:sanitizeSnapshot -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts:summarizeAcpRuntimePerformanceSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpRuntimeGovernanceBaselineRecord | 函数 | 441–466 | 简单 | baseline、governance、record、acp | 0 | 构造并深冻结治理基线记录，附带 schema 版本以便后续演进识别。 |
| sanitizeAcpRuntimeCaptureMetadata | 函数 | 196–210 | 简单 | sanitization、privacy、diagnostics、baseline | 0 | 脱敏采集元数据，移除主机名、路径等可识别信息后再进入基线。 |
| sanitizeLabels | 函数 | 225–249 | 简单 | sanitization、metrics、labels、diagnostics | 0 | 清洗指标标签，剔除高基数字段以免基线体积与噪声膨胀。 |
| sanitizeMetric | 函数 | 251–283 | 简单 | sanitization、metrics、diagnostics、privacy | 0 | 对单条性能指标做数值与标签脱敏，保留可比的统计量。 |
| sanitizeProfile | 函数 | 285–318 | 简单 | sanitization、profiler、privacy、diagnostics | 0 | 对整个 profile 做递归脱敏，移除原始时间戳与调用点细节。 |
| sanitizeSnapshot | 函数 | 320–349 | 简单 | sanitization、snapshot、diagnostics、privacy | 0 | 对完整运行时快照做顶层脱敏，是所有基线写出的统一入口。 |
| summarizeAcpRuntimePerformanceSnapshot | 函数 | 358–428 | 中等 | summarization、performance、baseline、reporting | 0 | 将 profiler 快照汇总为人类可读的基线摘要（分位数、热点 profile、风险分组）。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [zoteroRuntimeVersion.ts](../../../shared/zoteroRuntimeVersion.ts.md) | src/shared/zoteroRuntimeVersion.ts | 把 Zotero 版本号解析为受支持的主版本（7 / 9 / 10），用于兼容性分支与诊断输出。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [record-acp-runtime-governance-baseline.ts](../../../../scripts/record-acp-runtime-governance-baseline.ts.md) | scripts/record-acp-runtime-governance-baseline.ts | 录制 ACP 运行时性能治理基线，把当前 profiler 快照渲染成 Markdown 基线文件，用于后续回归对比。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpRuntimeGovernanceBaselineRecord | 函数 | 441–466 | 构造并深冻结治理基线记录，附带 schema 版本以便后续演进识别。 |
| sanitizeAcpRuntimeCaptureMetadata | 函数 | 196–210 | 脱敏采集元数据，移除主机名、路径等可识别信息后再进入基线。 |
| summarizeAcpRuntimePerformanceSnapshot | 函数 | 358–428 | 将 profiler 快照汇总为人类可读的基线摘要（分位数、热点 profile、风险分组）。 |

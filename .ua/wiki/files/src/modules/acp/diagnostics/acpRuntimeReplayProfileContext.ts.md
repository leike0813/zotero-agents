
# src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts -->

回放 profiling 上下文槽位：保存当前 requestId、来源种类与 surface，使深层性能记录无需逐层传参即可归因到正确的回放样本。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts)

## 符号（1）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts:setAcpRuntimeReplayProfileContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| setAcpRuntimeReplayProfileContext | 函数 | 12–16 | 简单 | 回放、上下文、profiler | 1 | 设置当前回放 profiling 上下文（requestId、来源与 surface），使深层性能记录可归因到具体样本。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpRuntimeSemanticTrace.ts](acpRuntimeSemanticTrace.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts | 语义 trace 的数据模型与 NDJSON 编解码：定义 trace schema、单调时钟、限额常量、完整性校验与解析加载，是录制端与回放端共享的格式契约。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| setAcpRuntimeReplayProfileContext | 函数 | 12–16 | 设置当前回放 profiling 上下文（requestId、来源与 surface），使深层性能记录可归因到具体样本。 |

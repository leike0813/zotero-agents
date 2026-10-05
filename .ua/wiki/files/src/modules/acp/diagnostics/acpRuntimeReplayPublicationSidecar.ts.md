
# src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts -->

回放的发布侧车：在独立 window 上下文里监听 Assistant Workspace 消息，跨 epoch 排空发布队列并等待 workspace 就绪，使回放期间的 UI 事件可被完整捕获与归因。
源码：[src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts](../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts)

## 符号（3）
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts:drainAcpRuntimeReplayPublication -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts:drainAcpRuntimeReplayPublicationEpoch -->
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts:waitAcpRuntimeReplayWorkspaceReadiness -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| drainAcpRuntimeReplayPublication | 函数 | 200–421 | 复杂 | 回放、事件发布、主流程 | 0 | 回放发布的总排空流程：按 epoch 循环派发事件、等待 workspace 消费并处理取消信号。 |
| drainAcpRuntimeReplayPublicationEpoch | 函数 | 63–146 | 复杂 | 回放、事件发布、顺序保证 | 0 | 排空一个发布 epoch 内的全部消息，保证同一 epoch 的发布事件按序离开侧车再进入下一 epoch。 |
| waitAcpRuntimeReplayWorkspaceReadiness | 函数 | 148–179 | 中等 | 回放、就绪等待、诊断 | 0 | 轮询等待 workspace 达到 ready 状态，超时返回可诊断的 readiness 详情。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProfiler.ts](acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [assistantWireContract.ts](../../../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimeReplayProductionPorts.ts](acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts | 回放的生产端口实现：把 profiler、logical time、workspace 与 no-op 端口绑定到真实运行时模块（性能 profiler、消息流、workspace 侧边栏），使回放走真实代码路径。 |

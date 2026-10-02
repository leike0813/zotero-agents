
# src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts -->

静默终态 assistant 文本收集器：在不产生可见 transcript 的场景下收集终局 assistant 文本，供结果校验使用。
源码：[src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts](../../../../../../../src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts)

## 符号（1）
<!-- node: function:src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts:createAcpSilentTerminalAssistantCollector -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createAcpSilentTerminalAssistantCollector | 函数 | 10–51 | 简单 | acp、文本收集、factory | 0 | 创建静默收集器：累积 assistant 文本分片，在硬边界或终止事件处封口并返回最终文本。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTranscriptBoundary.ts](acpTranscriptBoundary.ts.md) | src/modules/acp/transport/acpTranscriptBoundary.ts | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createAcpSilentTerminalAssistantCollector | 函数 | 10–51 | 创建静默收集器：累积 assistant 文本分片，在硬边界或终止事件处封口并返回最终文本。 |


# src/modules/acp/transport/acpTranscriptBoundary.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpTranscriptBoundary.ts -->

ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。
源码：[src/modules/acp/transport/acpTranscriptBoundary.ts](../../../../../../../src/modules/acp/transport/acpTranscriptBoundary.ts)

## 符号（3）
<!-- node: function:src/modules/acp/transport/acpTranscriptBoundary.ts:classifyAcpTranscriptSemanticUpdate -->
<!-- node: function:src/modules/acp/transport/acpTranscriptBoundary.ts:classifyAcpTranscriptSessionUpdate -->
<!-- node: function:src/modules/acp/transport/acpTranscriptBoundary.ts:normalizeAcpSessionUpdateKind -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| classifyAcpTranscriptSemanticUpdate | 函数 | 39–73 | 简单 | acp、transcript、utility | 1 | 进一步区分语义更新对 assistant 文本段的影响，判断其是否构成新的消息边界。 |
| classifyAcpTranscriptSessionUpdate | 函数 | 23–37 | 简单 | acp、transcript、utility | 0 | 把 session update 归类为 transcript 消息边界更新、语义更新或无需展示的更新。 |
| normalizeAcpSessionUpdateKind | 函数 | 17–21 | 简单 | acp、transcript、validation | 0 | 把 sessionUpdate 的原始字符串规整为已知 kind，未知值归为 other。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatTranscriptMirror.ts](../chat/acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpExecutionProgress.ts](acpExecutionProgress.ts.md) | src/modules/acp/transport/acpExecutionProgress.ts | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [acpRuntimeReplayProfiler.ts](../diagnostics/acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts | ACP 运行时回放 profiler 的核心：回放语义 trace 为矩阵运行，度量各阶段的时延与指标，按接受阈值判定通过与否，并渲染/保存可对比的 Markdown 矩阵工件。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSilentTerminalAssistantCollector.ts](acpSilentTerminalAssistantCollector.ts.md) | src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts | 静默终态 assistant 文本收集器：在不产生可见 transcript 的场景下收集终局 assistant 文本，供结果校验使用。 |
| [acpSkillRunTranscriptMirror.ts](../skillRun/acpSkillRunTranscriptMirror.ts.md) | src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts | ACP Skill Run 的 transcript 镜像层：把 session update 事件折叠为 transcript 条目、维护 live 镜像与冷 full mirror LRU 缓存，并提供分页读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| classifyAcpTranscriptSemanticUpdate | 函数 | 39–73 | 进一步区分语义更新对 assistant 文本段的影响，判断其是否构成新的消息边界。 |
| classifyAcpTranscriptSessionUpdate | 函数 | 23–37 | 把 session update 归类为 transcript 消息边界更新、语义更新或无需展示的更新。 |
| normalizeAcpSessionUpdateKind | 函数 | 17–21 | 把 sessionUpdate 的原始字符串规整为已知 kind，未知值归为 other。 |

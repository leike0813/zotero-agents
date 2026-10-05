
# src/modules/acp/chat/acpReasoningEffortFallback.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpReasoningEffortFallback.ts -->

推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。
源码：[src/modules/acp/chat/acpReasoningEffortFallback.ts](../../../../../../../src/modules/acp/chat/acpReasoningEffortFallback.ts)

## 符号（2）
<!-- node: function:src/modules/acp/chat/acpReasoningEffortFallback.ts:applyAcpReasoningEffortWithFallback -->
<!-- node: function:src/modules/acp/chat/acpReasoningEffortFallback.ts:isKiloEffortInvalidParametersFallback -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyAcpReasoningEffortWithFallback | 函数 | 38–64 | 中等 | 容错、模型设置、acp-chat | 0 | 应用推理强度并返回 applied / unavailable / fallback 三态结果，把可降级错误与真实失败区分开。 |
| isKiloEffortInvalidParametersFallback | 函数 | 17–36 | 简单 | 容错、错误分类、协议 | 0 | 判定失败是否属于「该后端不接受 effort 参数」这一可降级情形，要求 agent family、category 与错误码同时匹配。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAgentFamilyResolver.ts](../skillRun/acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyAcpReasoningEffortWithFallback | 函数 | 38–64 | 应用推理强度并返回 applied / unavailable / fallback 三态结果，把可降级错误与真实失败区分开。 |

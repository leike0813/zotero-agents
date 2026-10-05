
# src/modules/acp/diagnostics/acpDiagnostics.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpDiagnostics.ts -->

ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。
源码：[src/modules/acp/diagnostics/acpDiagnostics.ts](../../../../../../../src/modules/acp/diagnostics/acpDiagnostics.ts)

## 符号（4）
<!-- node: function:src/modules/acp/diagnostics/acpDiagnostics.ts:buildAcpErrorDiagnostic -->
<!-- node: function:src/modules/acp/diagnostics/acpDiagnostics.ts:describeAcpError -->
<!-- node: function:src/modules/acp/diagnostics/acpDiagnostics.ts:projectAcpDiagnosticEvidence -->
<!-- node: function:src/modules/acp/diagnostics/acpDiagnostics.ts:serializeAcpError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpErrorDiagnostic | 函数 | 183–213 | 中等 | 诊断、错误处理、工具函数 | 0 | 构造可直接进入诊断列表的错误条目，统一时间戳、级别与所属 surface。 |
| describeAcpError | 函数 | 113–145 | 中等 | 错误处理、诊断、协议 | 0 | 把任意错误规整为可读描述，识别 JSON-RPC 错误、ACP 协议错误与普通异常三类形态。 |
| projectAcpDiagnosticEvidence | 函数 | 50–73 | 简单 | 诊断、脱敏、投影 | 1 | 把 AcpDiagnosticsEntry 投影为脱敏后的证据记录，裁剪长文本并归一化级别。 |
| serializeAcpError | 函数 | 147–181 | 中等 | 错误处理、序列化、诊断 | 0 | 把错误序列化为有界 JSON 文本，剥离 stack 噪声并保留 code/data 等可行动信息。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatDiagnosticAuditTrail.ts](acpChatDiagnosticAuditTrail.ts.md) | src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts | ACP Chat 诊断审计轨迹：按 backendId+conversationId 组织 owner，把 warn/error 级诊断证据写入审计文件，并管理 owner 的激活、刷盘与丢弃。 |
| [acpChatSkillInjection.ts](../chat/acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpChatTranscriptMirror.ts](../chat/acpChatTranscriptMirror.ts.md) | src/modules/acp/chat/acpChatTranscriptMirror.ts | ACP Chat 的 transcript 镜像层：把 ACP session update 投影为 conversation item，维护 live/streaming 状态，并按 owner 提供有界分页读取、LRU 缓存与后台 hydrate 调度。 |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpDiagnosticRouter.ts](acpDiagnosticRouter.ts.md) | src/modules/acp/diagnostics/acpDiagnosticRouter.ts | 诊断事件路由：把 Chat 与 Skills 两个 surface 的诊断条目投影为证据记录，按级别决定是否写入 runtime log 或转发到调试审计 sink。 |
| [acpMessageStream.ts](../transport/acpMessageStream.ts.md) | src/modules/acp/transport/acpMessageStream.ts | ACP NDJSON 消息流：把子进程 stdout/stderr 按行切分并解析为 JSON-RPC 消息，向上提供异步迭代接口。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunAuditTrail.ts](../skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpErrorDiagnostic | 函数 | 183–213 | 构造可直接进入诊断列表的错误条目，统一时间戳、级别与所属 surface。 |
| describeAcpError | 函数 | 113–145 | 把任意错误规整为可读描述，识别 JSON-RPC 错误、ACP 协议错误与普通异常三类形态。 |
| projectAcpDiagnosticEvidence | 函数 | 50–73 | 把 AcpDiagnosticsEntry 投影为脱敏后的证据记录，裁剪长文本并归一化级别。 |
| serializeAcpError | 函数 | 147–181 | 把错误序列化为有界 JSON 文本，剥离 stack 噪声并保留 code/data 等可行动信息。 |

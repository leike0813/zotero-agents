
# src/modules/acp/skillRun/acpStartupPromptPreambles.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpStartupPromptPreambles.ts -->

ACP 会话启动提示前缀：解析内置指令文件并把宿主环境说明以可读前言形式插入首轮 prompt。
源码：[src/modules/acp/skillRun/acpStartupPromptPreambles.ts](../../../../../../../src/modules/acp/skillRun/acpStartupPromptPreambles.ts)

## 符号（3）
<!-- node: function:src/modules/acp/skillRun/acpStartupPromptPreambles.ts:buildAcpStartupPromptPreamble -->
<!-- node: function:src/modules/acp/skillRun/acpStartupPromptPreambles.ts:prependAcpStartupPromptPreamble -->
<!-- node: function:src/modules/acp/skillRun/acpStartupPromptPreambles.ts:resolveAcpStartupInstructionFile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpStartupPromptPreamble | 函数 | 39–66 | 简单 | acp、prompt、factory | 0 | 根据 profile 与宿主信息拼装启动前言文本，说明 Zotero 宿主与可用能力。 |
| prependAcpStartupPromptPreamble | 函数 | 68–81 | 简单 | acp、prompt、utility | 0 | 把启动前言前置到用户 prompt 之前，已存在前言时不重复插入。 |
| resolveAcpStartupInstructionFile | 函数 | 21–33 | 简单 | acp、prompt、utility | 0 | 解析启动指令模板文件路径，缺失或不可读时返回 undefined 以静默跳过前言。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePromptTemplates.ts](acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpStartupPromptPreamble | 函数 | 39–66 | 根据 profile 与宿主信息拼装启动前言文本，说明 Zotero 宿主与可用能力。 |
| prependAcpStartupPromptPreamble | 函数 | 68–81 | 把启动前言前置到用户 prompt 之前，已存在前言时不重复插入。 |
| resolveAcpStartupInstructionFile | 函数 | 21–33 | 解析启动指令模板文件路径，缺失或不可读时返回 undefined 以静默跳过前言。 |

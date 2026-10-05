
# src/modules/acp/chat/acpSessionConfigOptions.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpSessionConfigOptions.ts -->

ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。
源码：[src/modules/acp/chat/acpSessionConfigOptions.ts](../../../../../../../src/modules/acp/chat/acpSessionConfigOptions.ts)

## 符号（7）
<!-- node: function:src/modules/acp/chat/acpSessionConfigOptions.ts:findAcpSessionConfigOptionByCategory -->
<!-- node: function:src/modules/acp/chat/acpSessionConfigOptions.ts:flattenSelectOptions -->
<!-- node: function:src/modules/acp/chat/acpSessionConfigOptions.ts:hasAcpRuntimeOptionSelectors -->
<!-- node: function:src/modules/acp/chat/acpSessionConfigOptions.ts:normalizeAcpSessionConfigOptions -->
<!-- node: function:src/modules/acp/chat/acpSessionConfigOptions.ts:normalizeAcpSkillRuntimeSelection -->
<!-- node: function:src/modules/acp/chat/acpSessionConfigOptions.ts:normalizeSelectableOptions -->
<!-- node: function:src/modules/acp/chat/acpSessionConfigOptions.ts:resolveAcpRuntimeOptionsState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| findAcpSessionConfigOptionByCategory | 函数 | 110–120 | 简单 | 查找、模型选择、工具函数 | 0 | 按 category 查找会话配置选项，找不到时返回 undefined 而不抛出。 |
| flattenSelectOptions | 函数 | 122–150 | 中等 | 模型选择、数据整形、ui | 0 | 把嵌套的 select option 树摊平为线性列表，并保留分组归属信息供 UI 渲染。 |
| hasAcpRuntimeOptionSelectors | 函数 | 481–495 | 简单 | 读模型、ui、工具函数 | 0 | 判断当前会话是否暴露可选的运行时选项，用于决定 UI 是否显示模型/模式选择器。 |
| normalizeAcpSessionConfigOptions | 函数 | 69–108 | 中等 | 归一化、模型选择、acp-chat | 0 | 把 ACP session/config 原始选项归一为统一的 AcpSessionConfigOption 结构，丢弃后端特有噪声。 |
| normalizeAcpSkillRuntimeSelection | 函数 | 252–307 | 复杂 | 归一化、模型选择、acp-chat | 0 | 归一化 skill 运行的运行时选择（mode/model/effort），容忍后端只返回部分字段的情况。 |
| normalizeSelectableOptions | 函数 | 165–187 | 中等 | 归一化、模型选择、数据整形 | 0 | 归一化可选项集合：去重、裁剪非法 id，并按后端返回顺序保留稳定次序。 |
| resolveAcpRuntimeOptionsState | 函数 | 339–473 | 复杂 | 读模型、模型选择、推理强度 | 0 | 由 config options 与缓存状态推导完整运行时选项读模型，含 current id 与 reasoningEffort 的来源判定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpModelOptionFolding.ts](acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendProbe.ts](../transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](../skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunStore.ts](../skillRun/acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [provider.ts](../../../providers/acp/provider.ts.md) | src/providers/acp/provider.ts | ACP Provider：把工作流请求转交 ACP 后端执行，负责模型选项折叠、SkillRun 编排调用与运行时选项归一。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| findAcpSessionConfigOptionByCategory | 函数 | 110–120 | 按 category 查找会话配置选项，找不到时返回 undefined 而不抛出。 |
| hasAcpRuntimeOptionSelectors | 函数 | 481–495 | 判断当前会话是否暴露可选的运行时选项，用于决定 UI 是否显示模型/模式选择器。 |
| normalizeAcpSessionConfigOptions | 函数 | 69–108 | 把 ACP session/config 原始选项归一为统一的 AcpSessionConfigOption 结构，丢弃后端特有噪声。 |
| normalizeAcpSkillRuntimeSelection | 函数 | 252–307 | 归一化 skill 运行的运行时选择（mode/model/effort），容忍后端只返回部分字段的情况。 |
| resolveAcpRuntimeOptionsState | 函数 | 339–473 | 由 config options 与缓存状态推导完整运行时选项读模型，含 current id 与 reasoningEffort 的来源判定。 |

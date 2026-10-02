
# src/modules/acp/chat/acpChatSkillInjection.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpChatSkillInjection.ts -->

ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。
源码：[src/modules/acp/chat/acpChatSkillInjection.ts](../../../../../../../src/modules/acp/chat/acpChatSkillInjection.ts)

## 符号（8）
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:appendAcpChatPreparationDiagnostic -->
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:materializeAcpChatInjectedSkills -->
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:materializeAcpChatWorkspaceInstructions -->
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:normalizeAcpChatInjectedSkillTargets -->
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:readAcpChatInjectedSkillsManifest -->
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:resolveManagedAcpChatInjectedSkillDir -->
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:withAcpChatWorkspacePreparationLock -->
<!-- node: function:src/modules/acp/chat/acpChatSkillInjection.ts:writeAcpChatInjectedSkillsManifest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpChatPreparationDiagnostic | 函数 | 114–130 | 中等 | acp、diagnostics、observability | 0 | 把工作区准备过程中的阶段、耗时与错误追加到诊断记录，便于排障。 |
| materializeAcpChatInjectedSkills | 函数 | 361–575 | 复杂 | acp、chat、skill-injection、entry-point | 0 | ACP Chat Skill 注入主流程：解析注入计划、物化目标 Skill 目录、更新 manifest 并输出注入结果。 |
| materializeAcpChatWorkspaceInstructions | 函数 | 144–218 | 复杂 | acp、chat、materialization、prompt | 0 | 物化 ACP Chat 工作区指令文件（AGENTS 等），并在缺失托管块时幂等补写。 |
| normalizeAcpChatInjectedSkillTargets | 函数 | 253–278 | 中等 | acp、chat、validation、normalization | 0 | 归一化注入 Skill 目标列表，去重并剔除越界或非法的路径项。 |
| readAcpChatInjectedSkillsManifest | 函数 | 299–329 | 中等 | acp、chat、manifest、persistence | 0 | 读取已注入 Skill 的 manifest，用于判断历史注入状态与增量物化。 |
| resolveManagedAcpChatInjectedSkillDir | 函数 | 224–251 | 中等 | acp、chat、path-resolution、filesystem | 1 | 解析注入 Skill 的受管目录位置，必要时创建目录并保证落在 runtime 根之下。 |
| withAcpChatWorkspacePreparationLock | 函数 | 101–112 | 简单 | acp、chat、concurrency、mutex | 1 | 以串行锁包裹 chat 工作区准备流程，避免并发会话重复物化注入内容。 |
| writeAcpChatInjectedSkillsManifest | 函数 | 331–359 | 中等 | acp、chat、manifest、persistence | 1 | 原子写入注入 Skill manifest，记录来源、版本与物化时间。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAgentFamilyResolver.ts](../skillRun/acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [acpDiagnostics.ts](../diagnostics/acpDiagnostics.ts.md) | src/modules/acp/diagnostics/acpDiagnostics.ts | ACP 诊断数据模型：定义证据记录结构与有界投影规则，并把任意异常序列化为脱敏、可归档的诊断载荷。 |
| [acpRuntimePromptTemplates.ts](../skillRun/acpRuntimePromptTemplates.ts.md) | src/modules/acp/skillRun/acpRuntimePromptTemplates.ts | ACP 运行时 prompt 模板管理：把内置 prompt 模板物化到 runtime 目录并提供按 key 读取/解析的能力。 |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [hostBridgePluginSkillBundle.ts](../../hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendAcpChatPreparationDiagnostic | 函数 | 114–130 | 把工作区准备过程中的阶段、耗时与错误追加到诊断记录，便于排障。 |
| materializeAcpChatInjectedSkills | 函数 | 361–575 | ACP Chat Skill 注入主流程：解析注入计划、物化目标 Skill 目录、更新 manifest 并输出注入结果。 |
| materializeAcpChatWorkspaceInstructions | 函数 | 144–218 | 物化 ACP Chat 工作区指令文件（AGENTS 等），并在缺失托管块时幂等补写。 |
| normalizeAcpChatInjectedSkillTargets | 函数 | 253–278 | 归一化注入 Skill 目标列表，去重并剔除越界或非法的路径项。 |
| readAcpChatInjectedSkillsManifest | 函数 | 299–329 | 读取已注入 Skill 的 manifest，用于判断历史注入状态与增量物化。 |
| resolveManagedAcpChatInjectedSkillDir | 函数 | 224–251 | 解析注入 Skill 的受管目录位置，必要时创建目录并保证落在 runtime 根之下。 |
| withAcpChatWorkspacePreparationLock | 函数 | 101–112 | 以串行锁包裹 chat 工作区准备流程，避免并发会话重复物化注入内容。 |
| writeAcpChatInjectedSkillsManifest | 函数 | 331–359 | 原子写入注入 Skill manifest，记录来源、版本与物化时间。 |

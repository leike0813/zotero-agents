
# src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts -->

Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。
源码：[src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts)

## 符号（5）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts:buildAcpSkillRunPrompt -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts:materializeAcpRunExecutionInstructions -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts:renderHermesSkillList -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts:resolveRunnerEntrypointPrompt -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts:resolveSkillInvokeLine -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpSkillRunPrompt | 函数 | 256–326 | 复杂 | acp、prompt、builder、entry-point | 0 | 构建 ACP Skill run 的最终 prompt：组合家族规则、共享 Skill 目录、工作区路径与输入参数。 |
| materializeAcpRunExecutionInstructions | 函数 | 226–254 | 中等 | acp、materialization、prompt | 0 | 把执行指令物化到运行工作区文件，供 Agent 侧按需读取而非塞进首轮 prompt。 |
| renderHermesSkillList | 函数 | 69–100 | 中等 | acp、prompt、skill、renderer | 1 | 渲染可调用 Skill 清单章节，逐条给出调用语法与用途说明。 |
| resolveRunnerEntrypointPrompt | 函数 | 168–187 | 中等 | acp、prompt、entry-point | 0 | 解析 runner 入口的提示模板来源，区分内置模板与 Skill 自带入口提示。 |
| resolveSkillInvokeLine | 函数 | 102–113 | 简单 | acp、prompt、skill | 0 | 为单个 Skill 生成一行调用指令，含引擎与参数占位。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAgentFamilyResolver.ts](acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [acpSharedSkillCatalog.ts](acpSharedSkillCatalog.ts.md) | src/modules/acp/skillRun/acpSharedSkillCatalog.ts | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |
| [acpSkillPatchTemplates.ts](acpSkillPatchTemplates.ts.md) | src/modules/acp/skillRun/acpSkillPatchTemplates.ts | Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。 |
| [acpSkillRunnerWorkspace.ts](acpSkillRunnerWorkspace.ts.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts | Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpSkillRunPrompt | 函数 | 256–326 | 构建 ACP Skill run 的最终 prompt：组合家族规则、共享 Skill 目录、工作区路径与输入参数。 |
| materializeAcpRunExecutionInstructions | 函数 | 226–254 | 把执行指令物化到运行工作区文件，供 Agent 侧按需读取而非塞进首轮 prompt。 |

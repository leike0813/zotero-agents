
# src/modules/acp/skillRun/acpAgentFamilyResolver.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpAgentFamilyResolver.ts -->

agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。
源码：[src/modules/acp/skillRun/acpAgentFamilyResolver.ts](../../../../../../../src/modules/acp/skillRun/acpAgentFamilyResolver.ts)

## 符号（6）
<!-- node: function:src/modules/acp/skillRun/acpAgentFamilyResolver.ts:buildAcpChatSkillInjectionPlan -->
<!-- node: function:src/modules/acp/skillRun/acpAgentFamilyResolver.ts:buildAcpSkillInjectionPlan -->
<!-- node: function:src/modules/acp/skillRun/acpAgentFamilyResolver.ts:defaultAcpSkillRootsForFamily -->
<!-- node: function:src/modules/acp/skillRun/acpAgentFamilyResolver.ts:normalizeAcpProjectSkillRoot -->
<!-- node: function:src/modules/acp/skillRun/acpAgentFamilyResolver.ts:normalizeFamily -->
<!-- node: function:src/modules/acp/skillRun/acpAgentFamilyResolver.ts:resolveAcpAgentFamily -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpChatSkillInjectionPlan | 函数 | 169–229 | 复杂 | acp、chat、skill-injection、planner | 0 | 为 ACP Chat 构造 Skill 注入计划，汇总家族默认根、项目根与去重后的注入目标。 |
| buildAcpSkillInjectionPlan | 函数 | 231–279 | 中等 | acp、skill-run、planner、skill-injection | 0 | 为 ACP Skills 构造注入计划，与 Chat 计划区分运行目录与提示呈现方式。 |
| defaultAcpSkillRootsForFamily | 函数 | 122–146 | 中等 | acp、agent-family、path-resolution | 1 | 返回指定家族默认的 Skill 搜索根目录列表，合并项目内与用户级路径。 |
| normalizeAcpProjectSkillRoot | 函数 | 148–167 | 中等 | acp、path-normalization、security | 0 | 归一化项目内 Skill 根目录为便携路径形式，剔除相对路径与越界路径。 |
| normalizeFamily | 函数 | 32–65 | 中等 | acp、agent-family、normalization | 0 | 把原始 family 名称归一化为受支持枚举，未知值回落到默认家族。 |
| resolveAcpAgentFamily | 函数 | 79–120 | 中等 | acp、agent-family、resolution | 1 | 按后端类型、命令与参数特征判定 Agent 所属家族，是 skill run 差异化行为的判定入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatSkillInjection.ts](../chat/acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [acpReasoningEffortFallback.ts](../chat/acpReasoningEffortFallback.ts.md) | src/modules/acp/chat/acpReasoningEffortFallback.ts | 推理强度设置的容错层：设置 thought_level 失败时识别特定后端的 -32602 参数错误，判定为可降级而非硬失败。 |
| [acpRuntimeDependencyWrapper.ts](acpRuntimeDependencyWrapper.ts.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts | Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。 |
| [acpSkillMaterializer.ts](acpSkillMaterializer.ts.md) | src/modules/acp/skillRun/acpSkillMaterializer.ts | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunPromptBuilder.ts](acpSkillRunPromptBuilder.ts.md) | src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [acpThinProxySkillMaterializer.ts](acpThinProxySkillMaterializer.ts.md) | src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpChatSkillInjectionPlan | 函数 | 169–229 | 为 ACP Chat 构造 Skill 注入计划，汇总家族默认根、项目根与去重后的注入目标。 |
| buildAcpSkillInjectionPlan | 函数 | 231–279 | 为 ACP Skills 构造注入计划，与 Chat 计划区分运行目录与提示呈现方式。 |
| defaultAcpSkillRootsForFamily | 函数 | 122–146 | 返回指定家族默认的 Skill 搜索根目录列表，合并项目内与用户级路径。 |
| normalizeAcpProjectSkillRoot | 函数 | 148–167 | 归一化项目内 Skill 根目录为便携路径形式，剔除相对路径与越界路径。 |
| resolveAcpAgentFamily | 函数 | 79–120 | 按后端类型、命令与参数特征判定 Agent 所属家族，是 skill run 差异化行为的判定入口。 |

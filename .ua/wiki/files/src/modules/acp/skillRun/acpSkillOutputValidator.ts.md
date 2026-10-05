
# src/modules/acp/skillRun/acpSkillOutputValidator.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillOutputValidator.ts -->

Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。
源码：[src/modules/acp/skillRun/acpSkillOutputValidator.ts](../../../../../../../src/modules/acp/skillRun/acpSkillOutputValidator.ts)

## 符号（3）
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputValidator.ts:buildAcpSkillOutputRepairPrompt -->
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputValidator.ts:readWorkspaceArtifactText -->
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputValidator.ts:validateAcpSkillFinalPayload -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpSkillOutputRepairPrompt | 函数 | 156–188 | 中等 | acp、validation、prompt、repair | 0 | 依据校验错误生成修复提示，引导 Agent 重交符合 schema 的产物。 |
| readWorkspaceArtifactText | 函数 | 31–46 | 简单 | acp、validation、filesystem | 0 | 从工作区读取产物文本，规范化路径并拒绝越界访问。 |
| [validateAcpSkillFinalPayload](../../../../../symbols/src/modules/acp/skillRun/acpSkillOutputValidator.ts/validateAcpSkillFinalPayload.md) | 函数 | 55–154 | 复杂 | acp、validation、schema、entry-point | 3 | 按 schema 资产与产物 manifest 校验 Skill 终态载荷，输出结构化字段级错误列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
| [artifactManifest.ts](../../workflowExecution/artifactManifest.ts.md) | src/modules/workflowExecution/artifactManifest.ts | 工作流执行产物清单：归一化执行产生的文件/笔记产物条目，形成可校验的 artifact manifest，供结果上下文与 Attachment 导入消费。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillOutputConvergence.ts](acpSkillOutputConvergence.ts.md) | src/modules/acp/skillRun/acpSkillOutputConvergence.ts | Skill 输出收敛层：在多次运行输出之间做校验与归一，判断产物是否已稳定收敛并给出终态结论。 |
| [acpSkillResultFileFallback.ts](acpSkillResultFileFallback.ts.md) | src/modules/acp/skillRun/acpSkillResultFileFallback.ts | Skill 结果文件回退：当 Agent 未直接给出结构化结果时，从落盘结果文件回读并按校验器语义归一。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpSkillOutputRepairPrompt | 函数 | 156–188 | 依据校验错误生成修复提示，引导 Agent 重交符合 schema 的产物。 |
| [validateAcpSkillFinalPayload](../../../../../symbols/src/modules/acp/skillRun/acpSkillOutputValidator.ts/validateAcpSkillFinalPayload.md) | 函数 | 55–154 | 按 schema 资产与产物 manifest 校验 Skill 终态载荷，输出结构化字段级错误列表。 |

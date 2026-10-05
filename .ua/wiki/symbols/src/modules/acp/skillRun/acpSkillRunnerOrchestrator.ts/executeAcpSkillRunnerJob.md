
# executeAcpSkillRunnerJob
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:executeAcpSkillRunnerJob -->

Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、orchestrator、skill-run、entry-point、state-machine  
所属文件：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md)
源码：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593](../../../../../../../../src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts#L593)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [AcpProvider](../../../../../../files/src/providers/acp/provider.ts.md) | src/providers/acp/provider.ts:27–252 | ACP 协议 Provider 实现：声明支持的请求种类与运行时选项 schema，折叠 provider 作用域的模型选择，并委托 ACP SkillRunner 编排器执行任务。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildAcpRuntimeDependencyPlan](../acpRuntimeDependencyWrapper.ts/buildAcpRuntimeDependencyPlan.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:369–491 | 构建 ACP 运行时的依赖方案：探测工具链、决定是否用 uv 包装并生成最终启动配置与失败信息。 |
| [materializeAcpSkill](../acpSkillMaterializer.ts/materializeAcpSkill.md) | src/modules/acp/skillRun/acpSkillMaterializer.ts:37–109 | 把指定 Skill 目录物化到运行工作区：复制文件、注入资源 manifest，并按家族决定是否生成薄代理 Skill。 |
| [convergeAcpSkillTurnOutput](../acpSkillOutputConvergence.ts/convergeAcpSkillTurnOutput.md) | src/modules/acp/skillRun/acpSkillOutputConvergence.ts:119–200 | 把多轮 Skill 输出的 JSON 片段收敛为单一终态对象，判定 execution mode 并补齐缺失字段。 |
| [validateAcpSkillFinalPayload](../acpSkillOutputValidator.ts/validateAcpSkillFinalPayload.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts:55–154 | 按 schema 资产与产物 manifest 校验 Skill 终态载荷，输出结构化字段级错误列表。 |
| [resolveAcpSkillResultFileFallback](../acpSkillResultFileFallback.ts/resolveAcpSkillResultFileFallback.md) | src/modules/acp/skillRun/acpSkillResultFileFallback.ts:83–158 | 当 Agent 未直接返回结构化结果时，按候选路径回读结果文件并归一为标准载荷。 |
| [runPrompt](runPrompt.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:374–532 | 向 ACP 发送 prompt 并消费 session update 流，边流边处理权限请求、计划更新与 transcript 事件。 |
| [createAcpSkillRunnerWorkspace](../acpSkillRunnerWorkspace.ts/createAcpSkillRunnerWorkspace.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:163–227 | 创建或复用 Skill runner 工作区，分配命名空间并准备输入、输出与临时目录。 |

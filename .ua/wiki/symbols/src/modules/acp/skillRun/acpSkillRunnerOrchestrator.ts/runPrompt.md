
# runPrompt
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:runPrompt -->

向 ACP 发送 prompt 并消费 session update 流，边流边处理权限请求、计划更新与 transcript 事件。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、transcript、streaming、protocol  
所属文件：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md)
源码：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:374](../../../../../../../../src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts#L374)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeAcpSkillRunnerJob](executeAcpSkillRunnerJob.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [classifyAcpPromptFailure](classifyAcpPromptFailure.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:292–347 | 把 prompt 失败按类型归类（连接、权限、协议、用户中止等），输出结构化分类与建议动作。 |
| [createAssistantTurnAccumulator](createAssistantTurnAccumulator.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:227–280 | 创建 assistant 轮次累加器，按协议语义维护稳定的 assistant text segment 与工具调用轨迹。 |


# createAssistantTurnAccumulator
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:createAssistantTurnAccumulator -->

创建 assistant 轮次累加器，按协议语义维护稳定的 assistant text segment 与工具调用轨迹。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、transcript、protocol、accumulator  
所属文件：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md)
源码：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:227](../../../../../../../../src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts#L227)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runPrompt](runPrompt.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:374–532 | 向 ACP 发送 prompt 并消费 session update 流，边流边处理权限请求、计划更新与 transcript 事件。 |

## 调用

该符号没有记录对外调用。

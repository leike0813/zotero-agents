
# classifyAcpPromptFailure
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:classifyAcpPromptFailure -->

把 prompt 失败按类型归类（连接、权限、协议、用户中止等），输出结构化分类与建议动作。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、error、classification  
所属文件：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md)
源码：[src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:292](../../../../../../../../src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts#L292)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runPrompt](runPrompt.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:374–532 | 向 ACP 发送 prompt 并消费 session update 流，边流边处理权限请求、计划更新与 transcript 事件。 |

## 调用

该符号没有记录对外调用。

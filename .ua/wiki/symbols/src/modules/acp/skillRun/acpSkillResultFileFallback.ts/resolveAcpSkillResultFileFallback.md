
# resolveAcpSkillResultFileFallback
<!-- node: function:src/modules/acp/skillRun/acpSkillResultFileFallback.ts:resolveAcpSkillResultFileFallback -->

当 Agent 未直接返回结构化结果时，按候选路径回读结果文件并归一为标准载荷。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、fallback、output、entry-point  
所属文件：[src/modules/acp/skillRun/acpSkillResultFileFallback.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillResultFileFallback.ts.md)
源码：[src/modules/acp/skillRun/acpSkillResultFileFallback.ts:83](../../../../../../../../src/modules/acp/skillRun/acpSkillResultFileFallback.ts#L83)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeAcpSkillRunnerJob](../acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |

## 调用

该符号没有记录对外调用。

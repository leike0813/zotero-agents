
# validateAcpSkillFinalPayload
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputValidator.ts:validateAcpSkillFinalPayload -->

按 schema 资产与产物 manifest 校验 Skill 终态载荷，输出结构化字段级错误列表。
类型：函数  
复杂度：复杂  
入边数：3  
标签：acp、validation、schema、entry-point  
所属文件：[src/modules/acp/skillRun/acpSkillOutputValidator.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillOutputValidator.ts.md)
源码：[src/modules/acp/skillRun/acpSkillOutputValidator.ts:55](../../../../../../../../src/modules/acp/skillRun/acpSkillOutputValidator.ts#L55)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [convergeAcpSkillTurnOutput](../acpSkillOutputConvergence.ts/convergeAcpSkillTurnOutput.md) | src/modules/acp/skillRun/acpSkillOutputConvergence.ts:119–200 | 把多轮 Skill 输出的 JSON 片段收敛为单一终态对象，判定 execution mode 并补齐缺失字段。 |
| [buildAcpSkillOutputRepairPrompt](../../../../../../files/src/modules/acp/skillRun/acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts:156–188 | 依据校验错误生成修复提示，引导 Agent 重交符合 schema 的产物。 |
| [executeAcpSkillRunnerJob](../acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |

## 调用

该符号没有记录对外调用。

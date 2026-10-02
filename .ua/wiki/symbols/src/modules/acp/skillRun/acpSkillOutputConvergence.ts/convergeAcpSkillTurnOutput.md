
# convergeAcpSkillTurnOutput
<!-- node: function:src/modules/acp/skillRun/acpSkillOutputConvergence.ts:convergeAcpSkillTurnOutput -->

把多轮 Skill 输出的 JSON 片段收敛为单一终态对象，判定 execution mode 并补齐缺失字段。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、output、convergence、entry-point  
所属文件：[src/modules/acp/skillRun/acpSkillOutputConvergence.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillOutputConvergence.ts.md)
源码：[src/modules/acp/skillRun/acpSkillOutputConvergence.ts:119](../../../../../../../../src/modules/acp/skillRun/acpSkillOutputConvergence.ts#L119)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeAcpSkillRunnerJob](../acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validateAcpSkillFinalPayload](../acpSkillOutputValidator.ts/validateAcpSkillFinalPayload.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts:55–154 | 按 schema 资产与产物 manifest 校验 Skill 终态载荷，输出结构化字段级错误列表。 |


# materializeAcpSkill
<!-- node: function:src/modules/acp/skillRun/acpSkillMaterializer.ts:materializeAcpSkill -->

把指定 Skill 目录物化到运行工作区：复制文件、注入资源 manifest，并按家族决定是否生成薄代理 Skill。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、materialization、skill、entry-point  
所属文件：[src/modules/acp/skillRun/acpSkillMaterializer.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillMaterializer.ts.md)
源码：[src/modules/acp/skillRun/acpSkillMaterializer.ts:37](../../../../../../../../src/modules/acp/skillRun/acpSkillMaterializer.ts#L37)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeAcpSkillRunnerJob](../acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildAcpSharedSkillCatalog](../../../../../../files/src/modules/acp/skillRun/acpSharedSkillCatalog.ts.md) | src/modules/acp/skillRun/acpSharedSkillCatalog.ts:201–223 | 对外的共享 Skill 目录构建入口，包裹实现并附加诊断与稳定性保证。 |

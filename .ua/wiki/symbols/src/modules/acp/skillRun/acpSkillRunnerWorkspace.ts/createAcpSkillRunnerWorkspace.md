
# createAcpSkillRunnerWorkspace
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:createAcpSkillRunnerWorkspace -->

创建或复用 Skill runner 工作区，分配命名空间并准备输入、输出与临时目录。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、workspace、entry-point、filesystem  
所属文件：[src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts](../../../../../../files/src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts.md)
源码：[src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:163](../../../../../../../../src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts#L163)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeAcpSkillRunnerJob](../acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [registerAcpWorkflowWorkspaceForReuse](../../../../../../files/src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts.md) | src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:137–157 | 把工作区注册到可复用登记表，供后续同 requestId 的运行复用。 |

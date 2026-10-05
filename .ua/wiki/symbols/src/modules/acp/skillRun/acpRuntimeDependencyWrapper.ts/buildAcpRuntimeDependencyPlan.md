
# buildAcpRuntimeDependencyPlan
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:buildAcpRuntimeDependencyPlan -->

构建 ACP 运行时的依赖方案：探测工具链、决定是否用 uv 包装并生成最终启动配置与失败信息。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、runtime、planner、entry-point  
所属文件：[src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts](../../../../../../files/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts.md)
源码：[src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:369](../../../../../../../../src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts#L369)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeAcpSkillRunnerJob](../acpSkillRunnerOrchestrator.ts/executeAcpSkillRunnerJob.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts:593–3253 | Skill run 编排主流程：准备工作区与依赖、建立会话、运行 prompt、处理权限与交互、收敛与校验产物并在失败时执行恢复。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [resolveAcpAgentFamily](../../../../../../files/src/modules/acp/skillRun/acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts:79–120 | 按后端类型、命令与参数特征判定 Agent 所属家族，是 skill run 差异化行为的判定入口。 |
| [defaultAcpRuntimeDependencyProbe](defaultAcpRuntimeDependencyProbe.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:184–236 | 默认依赖探测实现：依次尝试 uv 与系统 Python，汇总可用工具链。 |

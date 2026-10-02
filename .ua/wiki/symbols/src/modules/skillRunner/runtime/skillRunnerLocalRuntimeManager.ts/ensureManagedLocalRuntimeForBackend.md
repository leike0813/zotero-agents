
# ensureManagedLocalRuntimeForBackend
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:ensureManagedLocalRuntimeForBackend -->

确保某后端对应的托管运行时处于可用状态：必要时自动部署或重启，并在成功后刷新模型缓存与健康状态。
类型：函数  
复杂度：复杂  
入边数：1  
标签：service、lifecycle、auto-heal、skillrunner  
所属文件：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md)
源码：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:4765](../../../../../../../../src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts#L4765)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runManagedRuntimeAutoEnsureTick](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:2893–2933 | 自动保活循环的单次 tick：检查已注册后端对应运行时是否存活，必要时触发重新部署或拉起。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [acquireLeaseIfNeeded](acquireLeaseIfNeeded.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:2266–2390 | 在需要变更本地运行时前获取租约，避免多窗口并发部署互相破坏安装目录。 |
| [deployAndConfigureLocalSkillRunner](deployAndConfigureLocalSkillRunner.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:3126–3700 | 一键部署的主流程：解析版本、下载发行资产、展开安装目录、写入配置与后端注册信息，并按阶段写入部署调试日志。 |

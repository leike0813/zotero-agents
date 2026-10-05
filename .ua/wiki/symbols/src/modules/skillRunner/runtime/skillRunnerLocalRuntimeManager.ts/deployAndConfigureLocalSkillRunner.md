
# deployAndConfigureLocalSkillRunner
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:deployAndConfigureLocalSkillRunner -->

一键部署的主流程：解析版本、下载发行资产、展开安装目录、写入配置与后端注册信息，并按阶段写入部署调试日志。
类型：函数  
复杂度：复杂  
入边数：1  
标签：deployment、entry-point、download、skillrunner  
所属文件：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md)
源码：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:3126](../../../../../../../../src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts#L3126)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureManagedLocalRuntimeForBackend](ensureManagedLocalRuntimeForBackend.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:4765–5011 | 确保某后端对应的托管运行时处于可用状态：必要时自动部署或重启，并在成功后刷新模型缓存与健康状态。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildManagedInstallLayoutDetails](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:616–663 | 计算托管安装的目录布局（根目录、二进制、profile、skills 等）并返回各路径明细。 |
| [probeReleaseAssets](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:1316–1369 | 探测目标版本的发行资产是否存在且与当前平台架构匹配，缺失时给出明确原因。 |

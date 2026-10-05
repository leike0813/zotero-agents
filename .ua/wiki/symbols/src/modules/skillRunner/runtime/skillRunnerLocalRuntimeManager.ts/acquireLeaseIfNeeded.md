
# acquireLeaseIfNeeded
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:acquireLeaseIfNeeded -->

在需要变更本地运行时前获取租约，避免多窗口并发部署互相破坏安装目录。
类型：函数  
复杂度：复杂  
入边数：1  
标签：concurrency、lease、lifecycle  
所属文件：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md)
源码：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:2266](../../../../../../../../src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts#L2266)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureManagedLocalRuntimeForBackend](ensureManagedLocalRuntimeForBackend.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:4765–5011 | 确保某后端对应的托管运行时处于可用状态：必要时自动部署或重启，并在成功后刷新模型缓存与健康状态。 |

## 调用

该符号没有记录对外调用。

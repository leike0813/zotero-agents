
# pollStatusUntilRunning
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:pollStatusUntilRunning -->

轮询运行时状态直到进入 running，超时或失败时返回带原因的结果。
类型：函数  
复杂度：中等  
入边数：2  
标签：polling、lifecycle、resilience  
所属文件：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md)
源码：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:2825](../../../../../../../../src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts#L2825)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [heartbeatLease](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:2392–2497 | 周期性续租并探测租约持有者存活状态，失效时主动释放以免阻塞其他窗口。 |
| [startLocalRuntime](../../../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:4715–4746 | 启动本地运行时进程并进入轮询等待就绪。 |

## 调用

该符号没有记录对外调用。

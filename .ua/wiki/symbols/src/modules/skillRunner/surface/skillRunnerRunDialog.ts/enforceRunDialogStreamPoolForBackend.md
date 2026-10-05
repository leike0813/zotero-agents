
# enforceRunDialogStreamPoolForBackend
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:enforceRunDialogStreamPoolForBackend -->

对每个后端维持有界的事件流并发，超出时淘汰最久未聚焦或已降级的流。
类型：函数  
复杂度：中等  
入边数：2  
标签：concurrency、resource-management、event-stream  
所属文件：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md)
源码：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts:4060](../../../../../../../../src/modules/skillRunner/surface/skillRunnerRunDialog.ts#L4060)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [shutdownRunDialogRuntime](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:4090–4121 | 关闭运行工作台运行时：停止所有观察器、清理宿主状态并排空后台任务。 |
| [startRunObserver](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:2654–3381 | 为运行条目启动事件观察：接入后端事件流、维护 pending 交互、驱动工作区快照刷新，并在断流时按策略恢复。 |

## 调用

该符号没有记录对外调用。

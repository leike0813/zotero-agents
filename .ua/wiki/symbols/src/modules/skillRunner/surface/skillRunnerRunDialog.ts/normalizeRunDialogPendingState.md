
# normalizeRunDialogPendingState
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:normalizeRunDialogPendingState -->

把后端上报的 pending 交互规范化为统一结构，覆盖用户交互、鉴权与权限等各类待处理形态。
类型：函数  
复杂度：复杂  
入边数：1  
标签：normalization、state、interaction、skillrunner  
所属文件：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md)
源码：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts:1180](../../../../../../../../src/modules/skillRunner/surface/skillRunnerRunDialog.ts#L1180)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [startRunObserver](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:2654–3381 | 为运行条目启动事件观察：接入后端事件流、维护 pending 交互、驱动工作区快照刷新，并在断流时按策略恢复。 |

## 调用

该符号没有记录对外调用。

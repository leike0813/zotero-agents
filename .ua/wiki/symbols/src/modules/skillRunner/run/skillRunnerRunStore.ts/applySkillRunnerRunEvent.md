
# applySkillRunnerRunEvent
<!-- node: function:src/modules/skillRunner/run/skillRunnerRunStore.ts:applySkillRunnerRunEvent -->

事件应用内核：校验状态迁移合法性、更新 run 记录并派生对应的事件与投影副作用。
类型：函数  
复杂度：复杂  
入边数：2  
标签：skillrunner、events、state-machine、core  
所属文件：[src/modules/skillRunner/run/skillRunnerRunStore.ts](../../../../../../files/src/modules/skillRunner/run/skillRunnerRunStore.ts.md)
源码：[src/modules/skillRunner/run/skillRunnerRunStore.ts:845](../../../../../../../../src/modules/skillRunner/run/skillRunnerRunStore.ts#L845)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [recordSkillRunnerProgress](../../../../../../files/src/modules/skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts:1222–1317 | 记录一次进度事件并更新 run 的 apply 阶段，是 transcript 高频更新路径的写入入口。 |
| [settleSkillRunnerRun](../../../../../../files/src/modules/skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts:1347–1381 | 把 run 收敛到终态，记录结果与耗时并停止后续事件写入。 |

## 调用

该符号没有记录对外调用。


# streamEventLoop
<!-- node: function:src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:streamEventLoop -->

会话事件流的主循环：持续读取 SSE 帧、更新会话状态、发出变更通知，并在断流或终止态时按策略决定重连或退出。
类型：函数  
复杂度：复杂  
入边数：1  
标签：event-stream、loop、synchronization、skillrunner  
所属文件：[src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts](../../../../../../files/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md)
源码：[src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:291](../../../../../../../../src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts#L291)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensureSkillRunnerSessionSync](../../../../../../files/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:380–420 | 确保指定会话存在一条活跃同步：已存在则复用，否则创建会话记录、加载快照并启动事件流循环。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [consumeEventHistory](../../../../../../files/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:243–289 | 消费快照之后的历史事件以补齐期间遗漏的状态变化，按事件顺序应用并跳过已覆盖部分。 |
| [shouldDisconnectEventStream](../../../../../../files/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts:157–164 | 判断会话是否已进入需要断开事件流的终止状态集合。 |

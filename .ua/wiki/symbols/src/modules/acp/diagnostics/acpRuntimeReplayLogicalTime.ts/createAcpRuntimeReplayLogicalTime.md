
# createAcpRuntimeReplayLogicalTime
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts:createAcpRuntimeReplayLogicalTime -->

创建逻辑时间实例：提供定时器登记、到期推进、剩余时间恢复与全局巡检，使回放可以确定性推进各 domain 的挂起任务。
类型：函数  
复杂度：复杂  
入边数：1  
标签：回放、逻辑时间、定时器  
所属文件：[src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts](../../../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts.md)
源码：[src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts:49](../../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts#L49)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createAcpRuntimeReplayProductionLogicalTimePort](../../../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts:48–138 | 构造基于真实 workspace 定时器域的逻辑时间端口，把插件实际的 persist/emit 定时器纳入回放调度。 |

## 调用

该符号没有记录对外调用。

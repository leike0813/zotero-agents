
# transition
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:transition -->

状态机迁移内核：校验允许的迁移路径并落盘，非法迁移直接拒绝。
类型：函数  
复杂度：简单  
入边数：4  
标签：host-bridge、agent-run、state-machine、validation、core  
所属文件：[src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md)
源码：[src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:176](../../../../../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts#L176)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [abandonHostBridgeAgentRunRecord](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:292–313 | 放弃一条 run 记录并释放其占用的文件与租约资源。 |
| [createHostBridgeAgentRunRecord](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:201–219 | 创建一条新的 agent run 记录并置为 pending，是 durable insert 的唯一赢家入口。 |
| [finishHostBridgeAgentRunRecord](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:315–330 | 把 run 记录推进到终结态并写入终态证据，供后续查询与重放判定使用。 |
| [markExpired](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:221–235 | 把超时未续期的 run 记录标记为 expired，使其不再参与续接与重放。 |

## 调用

该符号没有记录对外调用。

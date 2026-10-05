
# createAcpChatWorkspaceOwner
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createAcpChatWorkspaceOwner -->

构造 ACP Chat 工作区 owner 描述（backend + conversation）。
类型：函数  
复杂度：简单  
入边数：2  
标签：factory、owner、acp、assistant  
所属文件：[src/modules/assistant/publication/assistantWorkspacePublication.ts](../../../../../../files/src/modules/assistant/publication/assistantWorkspacePublication.ts.md)
源码：[src/modules/assistant/publication/assistantWorkspacePublication.ts:1153](../../../../../../../../src/modules/assistant/publication/assistantWorkspacePublication.ts#L1153)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [parseAssistantWorkspaceActionOwner](../../../../../../files/src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:126–169 | 解析 action 载荷中的 owner 描述，判定其归属 domain（ACP Chat / ACP Skills / SkillRunner）。 |
| [postSnapshotForTab](../../../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:539–593 | 把当前快照投递到指定 tab，并附带发布序号供前端去重。 |

## 调用

该符号没有记录对外调用。

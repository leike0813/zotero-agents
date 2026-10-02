
# getAcpChatWorkspaceReadModel
<!-- node: function:src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:getAcpChatWorkspaceReadModel -->

生成当前 owner 的完整 workspace read model，含 banner、toolbar、reply、permission 等区域的签名输入。
类型：函数  
复杂度：复杂  
入边数：1  
标签：读模型、workspace、投影  
所属文件：[src/modules/acp/chat/acpChatWorkspaceDataPlane.ts](../../../../../../files/src/modules/acp/chat/acpChatWorkspaceDataPlane.ts.md)
源码：[src/modules/acp/chat/acpChatWorkspaceDataPlane.ts:204](../../../../../../../../src/modules/acp/chat/acpChatWorkspaceDataPlane.ts#L204)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [getOrCreateSessionRuntime](../../../../../../files/src/modules/acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts:598–652 | 按 backendId+conversationId 惰性创建会话 runtime，是所有会话操作的唯一入口。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [listAcpChatSessions](../../../../../../files/src/modules/acp/chat/acpConversationStore.ts.md) | src/modules/acp/chat/acpConversationStore.ts:617–623 | 列出全部会话，是 workspace 会话列表导航的唯一数据来源。 |

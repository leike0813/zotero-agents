
# createAcpSkillsWorkspaceOwner
<!-- node: function:src/modules/assistant/publication/assistantWorkspacePublication.ts:createAcpSkillsWorkspaceOwner -->

构造 ACP Skills 工作区 owner 描述（requestId）。
类型：函数  
复杂度：简单  
入边数：2  
标签：factory、owner、acp、skill-run  
所属文件：[src/modules/assistant/publication/assistantWorkspacePublication.ts](../../../../../../files/src/modules/assistant/publication/assistantWorkspacePublication.ts.md)
源码：[src/modules/assistant/publication/assistantWorkspacePublication.ts:1170](../../../../../../../../src/modules/assistant/publication/assistantWorkspacePublication.ts#L1170)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [prepareAcpSkillsOwnerNavigation](../../../../../../files/src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:449–544 | 在切换 skill run owner 前准备导航状态，确保 owner-first 首屏不被历史快照阻塞。 |
| [parseAssistantWorkspaceActionOwner](../../../../../../files/src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts:126–169 | 解析 action 载荷中的 owner 描述，判定其归属 domain（ACP Chat / ACP Skills / SkillRunner）。 |

## 调用

该符号没有记录对外调用。

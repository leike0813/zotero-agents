
# readWorkspaceOwnerRegions
<!-- node: function:src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:readWorkspaceOwnerRegions -->

读取指定 owner 的各区域可见内容，供 skeleton adapter 复用。
类型：函数  
复杂度：简单  
入边数：2  
标签：projection、regions、workspace、shared  
所属文件：[src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts](../../../../../../files/src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts.md)
源码：[src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts:60](../../../../../../../../src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts#L60)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readAcpChatWorkspaceRegions](../../../../../../files/src/modules/acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts:248–508 | 读取 ACP Chat 工作区全部区域的可见内容（transcript、toolbar、banner、hint、reply、drawer 等），作为发布快照的唯一来源。 |
| [readAcpSkillRunWorkspaceRegions](../../../../../../files/src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts:193–447 | 读取 ACP Skills 工作区各区域可见内容，产出可发布快照。 |

## 调用

该符号没有记录对外调用。


# getAssistantExecutionDisplayMode
<!-- node: function:src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:getAssistantExecutionDisplayMode -->

读取当前显示模式，首次访问时从插件首选项加载。
类型：函数  
复杂度：简单  
入边数：5  
标签：assistant、显示策略、query  
所属文件：[src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts](../../../../../../files/src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts.md)
源码：[src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts:37](../../../../../../../../src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts#L37)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readAcpChatTranscriptRegion](../../../../../../files/src/modules/acp/chat/acpChatWorkspaceSurface.ts.md) | src/modules/acp/chat/acpChatWorkspaceSurface.ts:206–246 | 单独读取 ACP Chat 的 transcript 区域，与其它区域解耦以保证 transcript-only 更新不重建 chrome。 |
| [acpChatWorkspaceSurfaceContext](../../../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:365–377 | 解析当前 ACP Chat surface 上下文（owner 与 backend 范围）。 |
| [assistantWorkspaceAcpRuntimeConfiguration](../../../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:608–615 | 构造 ACP 运行时相关的发布配置（profiler 开关、schema 版本与采样参数）。 |
| [scheduleAcpChatPublications](../../../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:406–423 | 把 ACP Chat 快照变化合入发布调度队列。 |
| [setAssistantWorkspaceExecutionDisplayMode](../../../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:854–896 | 切换工作区执行态的展示模式（紧凑/完整），仅影响非 transcript 区域。 |

## 调用

该符号没有记录对外调用。

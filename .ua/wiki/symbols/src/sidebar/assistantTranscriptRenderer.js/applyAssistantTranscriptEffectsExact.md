
# applyAssistantTranscriptEffectsExact
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:applyAssistantTranscriptEffectsExact -->

精确增量路径：只对 delta 涉及的条目做追加、更新与删除，并保持行身份稳定。
类型：函数  
复杂度：复杂  
入边数：2  
标签：incremental-update、delta、transcript、performance  
所属文件：[src/sidebar/assistantTranscriptRenderer.js](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md)
源码：[src/sidebar/assistantTranscriptRenderer.js:2361](../../../../../../src/sidebar/assistantTranscriptRenderer.js#L2361)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyAssistantTranscriptEffects](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:2491–2493 | transcript 效果应用入口，按需走精确路径或宽松路径。 |
| [createAssistantWorkspaceAcpChildRuntime](../assistantWorkspaceAcpChild.js/createAssistantWorkspaceAcpChildRuntime.md) | src/sidebar/assistantWorkspaceAcpChild.js:1142–1870 | ACP 子运行时装配入口：管理 owner 生命周期、分页读取调度、transcript 快照发布与区域渲染协调。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [renderAssistantTranscriptItemIfChanged](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:2168–2210 | 仅在签名变化时重建该行的 DOM，是 transcript-only 更新的关键门禁。 |

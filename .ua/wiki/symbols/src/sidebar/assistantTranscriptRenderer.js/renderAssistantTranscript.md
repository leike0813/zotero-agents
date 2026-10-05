
# renderAssistantTranscript
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:renderAssistantTranscript -->

Transcript 区域总渲染入口：装载容器、驱动虚拟窗口、处理滚动与粘滞，并保持与 chrome 完全解耦。
类型：函数  
复杂度：复杂  
入边数：1  
标签：entry-point、virtual-scroll、transcript、renderer、performance  
所属文件：[src/sidebar/assistantTranscriptRenderer.js](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md)
源码：[src/sidebar/assistantTranscriptRenderer.js:2495](../../../../../../src/sidebar/assistantTranscriptRenderer.js#L2495)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createAssistantWorkspaceAcpChildRuntime](../assistantWorkspaceAcpChild.js/createAssistantWorkspaceAcpChildRuntime.md) | src/sidebar/assistantWorkspaceAcpChild.js:1142–1870 | ACP 子运行时装配入口：管理 owner 生命周期、分页读取调度、transcript 快照发布与区域渲染协调。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildVirtualTranscriptDomDescriptors](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:1067–1119 | 把虚拟窗口条目转换为 DOM 描述列表，附带行键、工具展示与权限展示元数据。 |
| [buildVirtualTranscriptWindow](buildVirtualTranscriptWindow.md) | src/sidebar/assistantTranscriptRenderer.js:733–894 | 根据滚动位置计算当前应渲染的虚拟行窗口，输出可渲染的条目描述与边缘占位。 |
| [installAssistantTranscriptStickiness](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:1382–1436 | 安装底部粘滞逻辑：仅在用户已贴近底部时保持跟随，避免打断向上翻阅。 |
| [scheduleVirtualTranscriptRender](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:1219–1236 | 用 animation frame 合并滚动引发的多次渲染请求，避免同帧重复布局。 |

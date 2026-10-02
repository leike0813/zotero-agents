
# buildVirtualTranscriptWindow
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:buildVirtualTranscriptWindow -->

根据滚动位置计算当前应渲染的虚拟行窗口，输出可渲染的条目描述与边缘占位。
类型：函数  
复杂度：复杂  
入边数：1  
标签：virtual-scroll、windowing、transcript、performance  
所属文件：[src/sidebar/assistantTranscriptRenderer.js](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md)
源码：[src/sidebar/assistantTranscriptRenderer.js:733](../../../../../../src/sidebar/assistantTranscriptRenderer.js#L733)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [renderAssistantTranscript](renderAssistantTranscript.md) | src/sidebar/assistantTranscriptRenderer.js:2495–2697 | Transcript 区域总渲染入口：装载容器、驱动虚拟窗口、处理滚动与粘滞，并保持与 chrome 完全解耦。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildVirtualTranscriptLoadingGap](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:518–602 | 构造加载间隙占位 DOM：按分页请求状态放置 spinner 位置，支持 owner 作用域隔离。 |
| [maybeRequestVirtualTranscriptPages](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:930–958 | 按可见窗口与边界余量决定是否发起分页请求，避免滚动抖动引发过量读取。 |

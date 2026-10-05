
# createAssistantWorkspaceAcpChildRuntime
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createAssistantWorkspaceAcpChildRuntime -->

ACP 子运行时装配入口：管理 owner 生命周期、分页读取调度、transcript 快照发布与区域渲染协调。
类型：函数  
复杂度：复杂  
入边数：1  
标签：entry-point、runtime、assistant-workspace、orchestration、transcript  
所属文件：[src/sidebar/assistantWorkspaceAcpChild.js](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md)
源码：[src/sidebar/assistantWorkspaceAcpChild.js:1142](../../../../../../src/sidebar/assistantWorkspaceAcpChild.js#L1142)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [boot](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:1872–1879 | 引导 ACP 子运行时，绑定宿主 bridge 键并启动初始 owner 加载。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyAssistantTranscriptEffects](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:2491–2493 | transcript 效果应用入口，按需走精确路径或宽松路径。 |
| [applyAssistantTranscriptEffectsExact](../assistantTranscriptRenderer.js/applyAssistantTranscriptEffectsExact.md) | src/sidebar/assistantTranscriptRenderer.js:2361–2489 | 精确增量路径：只对 delta 涉及的条目做追加、更新与删除，并保持行身份稳定。 |
| [renderAssistantTranscript](../assistantTranscriptRenderer.js/renderAssistantTranscript.md) | src/sidebar/assistantTranscriptRenderer.js:2495–2697 | Transcript 区域总渲染入口：装载容器、驱动虚拟窗口、处理滚动与粘滞，并保持与 chrome 完全解耦。 |
| [resetAssistantTranscriptVirtualState](../../../../files/src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js:164–174 | 重置 transcript 虚拟状态缓存，用于 owner 切换等全量失效场景。 |
| [applyOwnerNavigationUiTransition](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:1066–1075 | owner 切换时先发布新 owner 的 loading-first 空快照，保证首屏不被旧 owner 阻塞。 |
| [createClient](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:886–987 | 封装与宿主之间的出站调用：面板动作发送、transcript 读取与 owner 切换请求。 |
| [createController](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:989–1008 | 创建控制层，串联接收器、客户端与区域渲染协调器。 |
| [createPageRequest](createPageRequest.md) | src/sidebar/assistantWorkspaceAcpChild.js:359–416 | 构造 transcript 分页读取请求，绑定 owner 键、页码与 cursor。 |
| [createReceiver](createReceiver.md) | src/sidebar/assistantWorkspaceAcpChild.js:591–884 | 创建宿主消息接收器：分类 shell bridge 与 ACP child 消息，完成 wire 校验后分派到运行时状态。 |

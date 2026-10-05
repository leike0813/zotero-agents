
# createPageRequest
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createPageRequest -->

构造 transcript 分页读取请求，绑定 owner 键、页码与 cursor。
类型：函数  
复杂度：中等  
入边数：2  
标签：pagination、transcript、request、assistant-workspace  
所属文件：[src/sidebar/assistantWorkspaceAcpChild.js](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md)
源码：[src/sidebar/assistantWorkspaceAcpChild.js:359](../../../../../../src/sidebar/assistantWorkspaceAcpChild.js#L359)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createAssistantWorkspaceAcpChildRuntime](createAssistantWorkspaceAcpChildRuntime.md) | src/sidebar/assistantWorkspaceAcpChild.js:1142–1870 | ACP 子运行时装配入口：管理 owner 生命周期、分页读取调度、transcript 快照发布与区域渲染协调。 |
| [createClient](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:886–987 | 封装与宿主之间的出站调用：面板动作发送、transcript 读取与 owner 切换请求。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validatePageMetadata](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:435–463 | 校验分页元数据的序号连续性与 basis 一致性，不一致时使整次读取失败。 |

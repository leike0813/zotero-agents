
# createReceiver
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:createReceiver -->

创建宿主消息接收器：分类 shell bridge 与 ACP child 消息，完成 wire 校验后分派到运行时状态。
类型：函数  
复杂度：复杂  
入边数：1  
标签：event-handler、wire-contract、dispatch、acp  
所属文件：[src/sidebar/assistantWorkspaceAcpChild.js](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md)
源码：[src/sidebar/assistantWorkspaceAcpChild.js:591](../../../../../../src/sidebar/assistantWorkspaceAcpChild.js#L591)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createAssistantWorkspaceAcpChildRuntime](createAssistantWorkspaceAcpChildRuntime.md) | src/sidebar/assistantWorkspaceAcpChild.js:1142–1870 | ACP 子运行时装配入口：管理 owner 生命周期、分页读取调度、transcript 快照发布与区域渲染协调。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validPublicationEnvelope](validPublicationEnvelope.md) | src/sidebar/assistantWorkspaceAcpChild.js:178–247 | 校验 publication envelope：schema 版本、shell bridge 键与内层 payload 形状。 |

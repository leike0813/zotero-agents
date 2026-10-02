
# validPublicationEnvelope
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:validPublicationEnvelope -->

校验 publication envelope：schema 版本、shell bridge 键与内层 payload 形状。
类型：函数  
复杂度：复杂  
入边数：1  
标签：validation、wire-contract、envelope、acp  
所属文件：[src/sidebar/assistantWorkspaceAcpChild.js](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md)
源码：[src/sidebar/assistantWorkspaceAcpChild.js:178](../../../../../../src/sidebar/assistantWorkspaceAcpChild.js#L178)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createReceiver](createReceiver.md) | src/sidebar/assistantWorkspaceAcpChild.js:591–884 | 创建宿主消息接收器：分类 shell bridge 与 ACP child 消息，完成 wire 校验后分派到运行时状态。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validPublicationPayload](validPublicationPayload.md) | src/sidebar/assistantWorkspaceAcpChild.js:89–176 | 按共享契约校验 publication payload 的字段集合，剔除禁止字段并拒绝未知键。 |


# planMutationBatch
<!-- node: function:src/sidebar/assistantWorkspaceAcpChild.js:planMutationBatch -->

把一批宿主 mutation 归并为有序计划，逐项检查身份与 revision 前置条件。
类型：函数  
复杂度：复杂  
入边数：1  
标签：mutation、batching、validation、broker  
所属文件：[src/sidebar/assistantWorkspaceAcpChild.js](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md)
源码：[src/sidebar/assistantWorkspaceAcpChild.js:469](../../../../../../src/sidebar/assistantWorkspaceAcpChild.js#L469)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createController](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:989–1008 | 创建控制层，串联接收器、客户端与区域渲染协调器。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [commitMutationBatch](../../../../files/src/sidebar/assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js:546–589 | 提交已规划的 mutation 批次，按 durable insert winner 语义决定谁真正执行。 |

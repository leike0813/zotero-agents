
# rebuildSynthesisKnowledgeCheckpointPayload
<!-- node: function:packages/synthesis-contracts/src/knowledgeCheckpoint.ts:rebuildSynthesisKnowledgeCheckpointPayload -->

重建知识检查点载荷：校验各计数族的哈希与实体数量上限，输出可比较的规范化载荷。
类型：函数  
复杂度：复杂  
入边数：1  
标签：合约、知识检查点、载荷、有界  
所属文件：[packages/synthesis-contracts/src/knowledgeCheckpoint.ts](../../../../../files/packages/synthesis-contracts/src/knowledgeCheckpoint.ts.md)
源码：[packages/synthesis-contracts/src/knowledgeCheckpoint.ts:219](../../../../../../../packages/synthesis-contracts/src/knowledgeCheckpoint.ts#L219)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisKnowledgeCheckpoint](../../../../../files/packages/synthesis-contracts/src/knowledgeCheckpoint.ts.md) | packages/synthesis-contracts/src/knowledgeCheckpoint.ts:335–374 | 重建完整检查点对象：绑定 contractVersion、basis、载荷与 payloadHash，阻断版本或哈希不匹配的检查点。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildCountFamily](../../../../../files/packages/synthesis-contracts/src/knowledgeCheckpoint.ts.md) | packages/synthesis-contracts/src/knowledgeCheckpoint.ts:283–303 | 重建单个计数族：校验实体数量、摘要哈希与实体 ID 列表的规模上限与去重约束。 |


# validateLivePayload
<!-- node: function:packages/synthesis-contracts/src/durableBundleImport.ts:validateLivePayload -->

校验 live envelope 内每个实体的载荷：字段精确性、标量类型、哈希形状与条目数量上限。
类型：函数  
复杂度：复杂  
入边数：1  
标签：校验、导入、durable-bundle、有界  
所属文件：[packages/synthesis-contracts/src/durableBundleImport.ts](../../../../../files/packages/synthesis-contracts/src/durableBundleImport.ts.md)
源码：[packages/synthesis-contracts/src/durableBundleImport.ts:382](../../../../../../../packages/synthesis-contracts/src/durableBundleImport.ts#L382)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeLiveEnvelope](../../../../../files/packages/synthesis-contracts/src/durableBundleImport.ts.md) | packages/synthesis-contracts/src/durableBundleImport.ts:441–495 | 规范化 live envelope：按 schema 版本解码条目、补齐缺省字段并按实体键稳定排序。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validatePayloadScalars](../../../../../files/packages/synthesis-contracts/src/durableBundleImport.ts.md) | packages/synthesis-contracts/src/durableBundleImport.ts:355–380 | 校验载荷中的标量字段（哈希、路径、大小、版本）形状与取值范围，是完整载荷校验的第一道关。 |

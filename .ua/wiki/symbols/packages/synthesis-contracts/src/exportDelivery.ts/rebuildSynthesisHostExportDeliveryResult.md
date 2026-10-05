
# rebuildSynthesisHostExportDeliveryResult
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:rebuildSynthesisHostExportDeliveryResult -->

重建导出交付结果：统一 status、已写入条目与诊断列表，确保 wire 层可直接编码而不二次校验。
类型：函数  
复杂度：复杂  
入边数：1  
标签：合约、交付结果、校验  
所属文件：[packages/synthesis-contracts/src/exportDelivery.ts](../../../../../files/packages/synthesis-contracts/src/exportDelivery.ts.md)
源码：[packages/synthesis-contracts/src/exportDelivery.ts:486](../../../../../../../packages/synthesis-contracts/src/exportDelivery.ts#L486)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisReverseHostResult](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:920–1040 | 重建 reverse-host 结果，区分成功、受限拒绝与传输失败。 |

## 调用

该符号没有记录对外调用。


# rebuildDescriptor
<!-- node: function:packages/synthesis-contracts/src/exportDelivery.ts:rebuildDescriptor -->

重建导出条目描述符：校验 displayName、相对路径、字节长度与 MIME 形状，拒绝控制字符与超长字段。
类型：函数  
复杂度：复杂  
入边数：1  
标签：合约、校验、导出交付、核心  
所属文件：[packages/synthesis-contracts/src/exportDelivery.ts](../../../../../files/packages/synthesis-contracts/src/exportDelivery.ts.md)
源码：[packages/synthesis-contracts/src/exportDelivery.ts:279](../../../../../../../packages/synthesis-contracts/src/exportDelivery.ts#L279)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildEntries](../../../../../files/packages/synthesis-contracts/src/exportDelivery.ts.md) | packages/synthesis-contracts/src/exportDelivery.ts:186–225 | 重建导出条目集合：校验条目数量上限、逐条描述符合法性与总体字节预算，输出带诊断的聚合结果。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [requiredTrimmedString](../../../../../files/packages/synthesis-contracts/src/exportDelivery.ts.md) | packages/synthesis-contracts/src/exportDelivery.ts:128–146 | 校验并裁剪必填字符串字段：拒绝空串、控制字符与超长输入，命中即返回 invalid_request。 |

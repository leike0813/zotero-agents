
# rebuildPageFields
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildPageFields -->

归一化通用分页字段（limit、cursor、total、hasMore），非法取值统一收敛到允许区间。
类型：函数  
复杂度：中等  
入边数：2  
标签：分页、归一化、有界  
所属文件：[packages/synthesis-contracts/src/hostRead.ts](../../../../../files/packages/synthesis-contracts/src/hostRead.ts.md)
源码：[packages/synthesis-contracts/src/hostRead.ts:285](../../../../../../../packages/synthesis-contracts/src/hostRead.ts#L285)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisHostArtifactScanPageRequest](../../../../../files/packages/synthesis-contracts/src/hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts:411–460 | 重建 artifact 扫描分页请求：归一化 artifact 类型过滤、游标与分页上限，避免全库无界扫描。 |
| [rebuildSynthesisHostPageRequest](../../../../../files/packages/synthesis-contracts/src/hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts:313–338 | 重建宿主分页读取请求：校验库 ID、排序字段与分页参数，拒绝越界 limit。 |

## 调用

该符号没有记录对外调用。

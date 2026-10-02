
# extractDigestRepresentativeImageDescriptor
<!-- node: function:src/modules/synthesis/digestRepresentativeImage.ts:extractDigestRepresentativeImageDescriptor -->

从 digest note HTML 中定位代表图标签，解析尺寸、来源与路径属性并产出描述符。
类型：函数  
复杂度：中等  
入边数：2  
标签：digest、解析、html、描述符  
所属文件：[src/modules/synthesis/digestRepresentativeImage.ts](../../../../../files/src/modules/synthesis/digestRepresentativeImage.ts.md)
源码：[src/modules/synthesis/digestRepresentativeImage.ts:71](../../../../../../../src/modules/synthesis/digestRepresentativeImage.ts#L71)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [projectDigestRepresentativeImageForUi](../../../../../files/src/modules/synthesis/digestRepresentativeImage.ts.md) | src/modules/synthesis/digestRepresentativeImage.ts:131–162 | 把代表图描述符投影为 UI 消费的精简结构，剔除仅内部使用的字段。 |
| [createZoteroSynthesisRepresentativeImageReadPort](../representativeImageReadAdapter.ts/createZoteroSynthesisRepresentativeImageReadPort.md) | src/modules/synthesis/representativeImageReadAdapter.ts:128–249 | 构造代表图读取 port：定位 digest 条目、读取附件字节并以 base64 返回，失败时给出结构化诊断。 |

## 调用

该符号没有记录对外调用。

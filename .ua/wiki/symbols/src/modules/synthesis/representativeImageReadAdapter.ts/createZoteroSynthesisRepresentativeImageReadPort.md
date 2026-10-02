
# createZoteroSynthesisRepresentativeImageReadPort
<!-- node: function:src/modules/synthesis/representativeImageReadAdapter.ts:createZoteroSynthesisRepresentativeImageReadPort -->

构造代表图读取 port：定位 digest 条目、读取附件字节并以 base64 返回，失败时给出结构化诊断。
类型：函数  
复杂度：复杂  
入边数：1  
标签：port-实现、代表图、base64、诊断  
所属文件：[src/modules/synthesis/representativeImageReadAdapter.ts](../../../../../files/src/modules/synthesis/representativeImageReadAdapter.ts.md)
源码：[src/modules/synthesis/representativeImageReadAdapter.ts:128](../../../../../../../src/modules/synthesis/representativeImageReadAdapter.ts#L128)

## 语言要点

base64 编码手写实现，避免依赖 Node Buffer 在插件沙箱中的可用性。

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSynthesisReverseHostHandlers](../reverseHost/synthesisReverseHostHandlers.ts/createSynthesisReverseHostHandlers.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:139–293 | 构造 reverse host 的基础 handler 集合，把 sidecar 回调分派到各 host port 并重建契约结果。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [extractDigestRepresentativeImageDescriptor](../digestRepresentativeImage.ts/extractDigestRepresentativeImageDescriptor.md) | src/modules/synthesis/digestRepresentativeImage.ts:71–129 | 从 digest note HTML 中定位代表图标签，解析尺寸、来源与路径属性并产出描述符。 |
